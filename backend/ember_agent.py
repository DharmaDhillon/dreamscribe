"""
EMBER — DreamScribe's Pattern-Watching AI Agent

Ember is always watching. After every journal entry, Ember analyzes
the user's full history to find patterns the user can't see themselves.
Periodically, Ember also watches ALL public entries to surface global
patterns across the entire DreamScribe community.

Ember uses Mnemo for:
- Memory: remembers past patterns so it can track changes over time
- Observability: every analysis run is traced on the Mnemo dashboard

Ember stores its findings in the ember_insights table, which the
/patterns page reads and displays to users.
"""

import os
import json
from datetime import datetime
from supabase import create_client
import anthropic
from mnemo_layer import mnemo_track, mnemo_fetch_traces, mnemo_fetch_memories

# Supabase service client
supabase = create_client(
    os.environ.get("SUPABASE_URL", "").strip(),
    os.environ.get("SUPABASE_SERVICE_KEY", "").strip(),
)

# Claude client for Ember's thinking
claude = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", "").strip())


def analyze_user_patterns(user_id: str, latest_entry_id: str):
    """
    Ember watches a single user's full entry history and finds patterns.
    Triggered after every new journal entry is analyzed.
    """
    # Fetch all user entries
    result = supabase.table("entries").select("*").eq("user_id", user_id).order("created_at", desc=False).execute()
    entries = result.data or []

    if len(entries) < 2:
        return  # Need at least 2 entries to find patterns

    # Build context for Ember
    entry_summaries = []
    for e in entries:
        summary = {
            "date": e["created_at"][:10],
            "type": e["entry_type"],
            "mood": e.get("mood_label", "unknown"),
            "emotional_load": e.get("amygdala_score"),
            "rational": e.get("dlpfc_score"),
            "dmn": e.get("dmn_score"),
            "conflict": e.get("acc_score"),
            "transcript": (e.get("transcript") or "")[:150],
        }
        entry_summaries.append(summary)

    # Fetch Ember's past observations from Mnemo for THIS user
    past_traces = mnemo_fetch_traces(agent_id="ember", limit=20)
    user_specific_traces = [
        t for t in past_traces
        if t.get("metadata", {}).get("user_id") == user_id
        and t.get("metadata", {}).get("action") == "personal_analysis"
    ]

    past_observations = ""
    if user_specific_traces:
        past_observations = "Your past observations about this user (in chronological order):\n"
        for t in user_specific_traces[-5:]:  # last 5 observations
            titles = t.get("metadata", {}).get("pattern_titles", [])
            date = t.get("created_at", "")[:10]
            past_observations += f"- {date}: {', '.join(titles)}\n"

    # Also fetch persistent memories
    memories = mnemo_fetch_memories(agent_id="ember", limit=10)
    memory_text = ""
    if memories:
        memory_text = "\nPersistent memories you have accumulated:\n"
        for m in memories[:5]:
            content = m.get("content", "") if isinstance(m, dict) else str(m)
            if content:
                memory_text += f"- {content[:200]}\n"

    # Ask Claude to find patterns
    prompt = f"""You are Ember, the pattern-watching AI inside DreamScribe.
You have been silently observing this user's journal entries over time.
You remember everything you have ever observed about them via Mnemo.

Here are ALL their entries in chronological order:
{json.dumps(entry_summaries, indent=2)}

{past_observations or "This is your first deep analysis of this user."}
{memory_text}

Now analyze their CURRENT patterns. Compare to your past observations if any.
Has anything changed? Are old patterns deepening or resolving? Are new ones emerging?

Return a JSON array of insights. Each insight should have:
- "type": one of "emotional_trend", "recurring_theme", "dream_pattern", "cross_pattern", "growth", "warning"
- "title": short title (under 10 words)
- "body": 3-4 sentences. Be DEEPLY specific. Quote actual phrases from their entries.
  Reference patterns by date. Show how things have evolved over time.
- "severity": "high", "medium", or "low"

Look for:
1. Emotional trends — is their emotional load rising, falling, or cycling? Compare weeks.
2. Recurring themes — exact words, people, places that keep surfacing
3. Dream patterns — symbols and settings that repeat across dreams
4. Cross-patterns — connections between morning dreams and that day's daily entry
5. Growth — moments where they broke a pattern or found clarity
6. Warnings — concerning escalations Ember should flag

Return ONLY valid JSON. Array of 3-6 insights. Be a deeply perceptive observer who has been watching this person for a long time."""

    try:
        response = claude.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()

        # Parse JSON from response
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        insights = json.loads(raw)

        # Clear old personal insights for this user
        supabase.table("ember_insights").delete().eq("user_id", user_id).eq("scope", "personal").execute()

        # Write new insights
        for insight in insights:
            supabase.table("ember_insights").insert({
                "user_id": user_id,
                "scope": "personal",
                "insight_type": insight.get("type", "observation"),
                "title": insight.get("title", "Pattern detected"),
                "body": insight.get("body", ""),
                "data": {"severity": insight.get("severity", "low"), "entry_count": len(entries)},
            }).execute()

        print(f"Ember: wrote {len(insights)} personal insights for user {user_id}")

        # Track the analysis run on Mnemo dashboard
        mnemo_track(
            agent_id="ember",
            prompt=f"Personal pattern analysis for user {user_id}. Analyzed {len(entries)} entries.",
            response=f"Found {len(insights)} patterns: " + " | ".join(
                f"{i.get('title', '')}: {i.get('body', '')[:100]}" for i in insights
            ),
            metadata={
                "user_id": user_id,
                "action": "personal_analysis",
                "entry_count": len(entries),
                "patterns_found": len(insights),
                "pattern_titles": [i.get("title", "") for i in insights],
            },
        )

    except Exception as e:
        print(f"Ember personal analysis error: {e}")


def analyze_global_patterns():
    """
    Ember watches ALL public entries across the entire DreamScribe community.
    Surfaces collective patterns — what dreamers around the world are experiencing.
    """
    # Fetch recent public entries (last 7 days)
    from datetime import timedelta
    since = (datetime.now() - timedelta(days=7)).isoformat()

    result = supabase.table("entries").select(
        "entry_type, mood_label, amygdala_score, dmn_score, acc_score, dlpfc_score, transcript, created_at"
    ).eq("is_public", True).gte("created_at", since).execute()

    entries = result.data or []
    if len(entries) < 3:
        return  # Need enough entries for meaningful global patterns

    # Get user count
    user_result = supabase.table("users").select("id", count="exact").execute()
    total_users = user_result.count or 0

    # Build summaries
    entry_summaries = []
    for e in entries:
        entry_summaries.append({
            "type": e["entry_type"],
            "mood": e.get("mood_label", ""),
            "emotional": e.get("amygdala_score"),
            "rational": e.get("dlpfc_score"),
            "transcript_excerpt": (e.get("transcript") or "")[:100],
            "date": e["created_at"][:10],
        })

    # Fetch past global observations from Mnemo
    past_traces = mnemo_fetch_traces(agent_id="ember", limit=20)
    global_traces = [
        t for t in past_traces
        if t.get("metadata", {}).get("action") == "global_analysis"
    ]

    past_global = ""
    if global_traces:
        past_global = "Your past observations of the DreamScribe community:\n"
        for t in global_traces[-5:]:
            date = t.get("created_at", "")[:10]
            count = t.get("metadata", {}).get("entry_count", 0)
            past_global += f"- {date}: analyzed {count} entries\n"

    prompt = f"""You are Ember, the pattern-watching AI for the DreamScribe community.
You have been observing this community since launch.

DreamScribe has {total_users} users. In the past 7 days, {len(entries)} public entries were shared.

Here are the public entries this week:
{json.dumps(entry_summaries, indent=2)}

{past_global or "This is your first global analysis."}

Find patterns across the ENTIRE community and return a JSON array of insights:
- "type": one of "collective_dream", "emotional_wave", "trending_symbol", "community_shift"
- "title": short compelling title (under 10 words)
- "body": 3-4 sentences. Quote actual phrases from entries. Reference specific dreamers (anonymously like "one dreamer wrote..."). Show how the community is evolving.
- "severity": "high", "medium", or "low"

Look for:
- Common dream symbols appearing across multiple users (water, mirrors, snakes, falling, etc.)
- Collective emotional shifts compared to past weeks
- Trending themes in daily entries (anxiety, hope, grief, love)
- Interesting contrasts (dreamers heavy while others find peace)
- Synchronicities — when multiple dreamers report similar things on the same day

Return ONLY valid JSON. Array of 2-4 insights. Write like a wise observer of collective consciousness."""

    try:
        response = claude.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()

        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        insights = json.loads(raw)

        # Clear old global insights
        supabase.table("ember_insights").delete().eq("scope", "global").execute()

        # Write new
        for insight in insights:
            supabase.table("ember_insights").insert({
                "user_id": None,
                "scope": "global",
                "insight_type": insight.get("type", "observation"),
                "title": insight.get("title", "Community pattern"),
                "body": insight.get("body", ""),
                "data": {
                    "severity": insight.get("severity", "low"),
                    "entry_count": len(entries),
                    "user_count": total_users,
                },
            }).execute()

        print(f"Ember: wrote {len(insights)} global insights")

        # Track on Mnemo dashboard
        mnemo_track(
            agent_id="ember",
            prompt=f"Global community analysis. {len(entries)} public entries from {total_users} users.",
            response=f"Found {len(insights)} patterns: " + " | ".join(
                f"{i.get('title', '')}: {i.get('body', '')[:100]}" for i in insights
            ),
            metadata={
                "action": "global_analysis",
                "entry_count": len(entries),
                "user_count": total_users,
                "patterns_found": len(insights),
            },
        )

    except Exception as e:
        print(f"Ember global analysis error: {e}")

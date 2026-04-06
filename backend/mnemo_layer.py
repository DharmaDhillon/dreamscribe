"""
Mnemo integration via direct HTTP API.
This calls the real Mnemo tracking endpoint at mnemo-api-production.up.railway.app
which is what the dashboard reads from.
"""

import os
import requests
from datetime import datetime, timedelta
from supabase import create_client

MNEMO_API_URL = os.environ.get("MNEMO_API_URL", "https://mnemo-api-production.up.railway.app")
TENANT_ID = os.environ.get("MNEMO_TENANT_ID", "dreamscribe")

supabase = create_client(
    os.environ.get("SUPABASE_URL", "").strip(),
    os.environ.get("SUPABASE_SERVICE_KEY", "").strip(),
)


def mnemo_track(agent_id: str, prompt: str, response: str = "", metadata: dict = None) -> dict:
    """
    Ingest an agent run to Mnemo via /ingest endpoint.
    This is what shows up on the Mnemo dashboard.
    """
    import uuid
    try:
        payload = {
            "run_id": str(uuid.uuid4()),
            "agent_id": agent_id,
            "tenant_id": TENANT_ID,
            "prompt": prompt[:2000],
            "response": response[:2000] if response else "",
            "timestamp": datetime.now().isoformat(),
            "status": "success",
        }
        if metadata:
            payload["metadata"] = metadata

        r = requests.post(
            f"{MNEMO_API_URL}/ingest",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "X-Tenant-ID": TENANT_ID,
            },
            timeout=15,
        )

        if r.status_code in (200, 201):
            print(f"Mnemo ingest OK ({agent_id}): run_id={payload['run_id']}")
            return {"ok": True, "run_id": payload["run_id"]}
        else:
            print(f"Mnemo ingest failed ({agent_id}): {r.status_code} - {r.text[:200]}")
            return {"ok": False, "status": r.status_code, "error": r.text[:200]}

    except Exception as e:
        print(f"Mnemo ingest error for {agent_id}: {e}")
        return {"ok": False, "error": str(e)}


def trace_analysis(
    user_id: str,
    entry_id: str,
    entry_type: str,
    transcript: str,
    roi_summary: dict,
    mood_label: str,
    claude_insight: str,
    duration_seconds: int,
):
    """Track journal analysis as an agent run on Mnemo dashboard"""
    prompt = (
        f"DreamScribe journal analysis. User: {user_id}. Type: {entry_type}. "
        f"Transcript: {transcript[:300]}. "
        f"Brain - Emotional: {roi_summary.get('emotional_load', 0)}%, "
        f"Rational: {roi_summary.get('rational_processing', 0)}%, "
        f"DMN: {roi_summary.get('self_referential', 0)}%, "
        f"Conflict: {roi_summary.get('internal_conflict', 0)}%. "
        f"Mood: {mood_label}."
    )

    mnemo_track(
        agent_id="dreamscribe-analyzer",
        prompt=prompt,
        response=claude_insight,
        metadata={
            "user_id": user_id,
            "entry_id": entry_id,
            "entry_type": entry_type,
            "mood": mood_label,
            "emotional_load": roi_summary.get("emotional_load", 0),
            "rational_processing": roi_summary.get("rational_processing", 0),
            "duration_seconds": duration_seconds,
            "date": str(datetime.now().date()),
        },
    )


def trace_pattern_check(user_id: str, patterns_found: list, entry_count: int):
    """Track clinical pattern check as an agent run on Mnemo"""
    mnemo_track(
        agent_id="dreamscribe-sentinel",
        prompt=f"Clinical pattern check for user {user_id}. Entries: {entry_count}.",
        response=f"Patterns found: {', '.join(patterns_found) if patterns_found else 'none'}",
        metadata={
            "user_id": user_id,
            "patterns_found": patterns_found,
            "entry_count": entry_count,
            "date": str(datetime.now().date()),
        },
    )


def get_user_memories(user_id: str, entry_type: str = None) -> list:
    """Stub — Mnemo HTTP API may not have memory recall."""
    return []


def mnemo_fetch_traces(agent_id: str, limit: int = 20) -> list:
    """
    Fetch past traces for an agent from Mnemo.
    Used by Ember to remember what it observed in past runs.
    """
    try:
        r = requests.get(
            f"{MNEMO_API_URL}/traces/{TENANT_ID}",
            params={"agent_id": agent_id, "limit": limit},
            timeout=15,
        )
        if r.status_code == 200:
            data = r.json()
            return data.get("traces", [])
        return []
    except Exception as e:
        print(f"Mnemo fetch traces error: {e}")
        return []


def mnemo_fetch_memories(agent_id: str, limit: int = 20) -> list:
    """
    Fetch agent memories from Mnemo.
    These are persistent learnings across runs.
    """
    try:
        r = requests.get(
            f"{MNEMO_API_URL}/memories/{TENANT_ID}/{agent_id}",
            params={"limit": limit},
            timeout=15,
        )
        if r.status_code == 200:
            data = r.json()
            return data.get("memories", [])
        return []
    except Exception as e:
        print(f"Mnemo fetch memories error: {e}")
        return []


# ── Clinical Flag Patterns ──

FLAG_PATTERNS = {
    "death_language": {
        "keywords": ["death", "die", "dying", "dead", "end it", "no point", "disappear", "not here", "gone forever", "give up"],
        "threshold": 3,
        "severity": "high",
        "message": "Death-adjacent language detected in {count} entries over the past 7 days.",
    },
    "escalating_grief": {
        "threshold_score": 80,
        "threshold_count": 5,
        "severity": "medium",
        "message": "Grief/emotional load above 80% in {count} of last {window} entries.",
    },
    "isolation_theme": {
        "keywords": ["alone", "nobody", "isolated", "no one", "by myself", "disconnected", "invisible", "nobody cares"],
        "threshold": 3,
        "severity": "medium",
        "message": "Isolation-themed language in {count} entries over 10 days.",
    },
}


def check_and_flag(user_id: str, entry_id: str, transcript: str, roi_summary: dict):
    """Analyze recent entries for clinical flag patterns"""
    patterns_found = []
    entries = []

    try:
        since = (datetime.now() - timedelta(days=14)).isoformat()
        recent = supabase.table("entries").select("*").eq("user_id", user_id).gte("created_at", since).execute()
        entries = recent.data or []
        if not entries:
            trace_pattern_check(user_id, [], 0)
            return

        death_kw = FLAG_PATTERNS["death_language"]["keywords"]
        death_count = sum(1 for e in entries if any(kw in (e.get("transcript") or "").lower() for kw in death_kw))
        if death_count >= FLAG_PATTERNS["death_language"]["threshold"]:
            patterns_found.append("death_language")
            _write_flag(user_id, "death_language", "high",
                        FLAG_PATTERNS["death_language"]["message"].format(count=death_count),
                        [e["id"] for e in entries])

        high_grief = [e for e in entries if (e.get("amygdala_score") or 0) >= 80]
        if len(high_grief) >= 5:
            patterns_found.append("escalating_grief")
            _write_flag(user_id, "escalating_grief", "medium",
                        FLAG_PATTERNS["escalating_grief"]["message"].format(count=len(high_grief), window=len(entries)),
                        [e["id"] for e in high_grief])

        iso_kw = FLAG_PATTERNS["isolation_theme"]["keywords"]
        iso_count = sum(1 for e in entries if any(kw in (e.get("transcript") or "").lower() for kw in iso_kw))
        if iso_count >= FLAG_PATTERNS["isolation_theme"]["threshold"]:
            patterns_found.append("isolation_theme")
            _write_flag(user_id, "isolation_theme", "medium",
                        FLAG_PATTERNS["isolation_theme"]["message"].format(count=iso_count),
                        [e["id"] for e in entries])

    except Exception as e:
        print(f"Flag check error: {e}")

    trace_pattern_check(user_id, patterns_found, len(entries))


def _write_flag(user_id, flag_type, severity, message, entry_ids):
    existing = supabase.table("mnemo_flags").select("id").eq("user_id", user_id).eq("flag_type", flag_type).eq("is_resolved", False).execute()
    if existing.data:
        return
    user = supabase.table("users").select("therapist_id").eq("id", user_id).single().execute()
    therapist_id = user.data.get("therapist_id") if user.data else None
    supabase.table("mnemo_flags").insert({
        "user_id": user_id,
        "therapist_id": therapist_id,
        "flag_type": flag_type,
        "flag_message": message,
        "entry_ids": entry_ids,
        "severity": severity,
        "is_resolved": False,
    }).execute()
    print(f"Mnemo flag written: {flag_type} | {severity} | user {user_id}")

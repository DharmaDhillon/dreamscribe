import anthropic
import os

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))


def build_daily_prompt(
    transcript: str,
    roi_summary: dict,
    moments: dict,
    duration: int,
    memories: list,
) -> str:
    memory_context = (
        "\n".join([f"- {m.get('memory', m.get('content', str(m)))}" for m in memories[:8]])
        if memories
        else "No prior entries yet."
    )

    return f"""You are a deeply perceptive emotional analyst \
for DreamScribe, a voice journal that reads brain activity.

The user recorded a {duration}s DAILY journal entry.

Transcript: "{transcript}"

Brain activation (TRIBE v2 neural output):
- Emotional load (amygdala): {roi_summary['emotional_load']}%
- Rational processing (dlPFC): {roi_summary['rational_processing']}%
- Self-referential thinking (DMN): {roi_summary['self_referential']}%
- Internal conflict (ACC): {roi_summary['internal_conflict']}%
- Mental fatigue: {roi_summary['mental_fatigue']}%

Peak emotional moment: {moments['peak']['time']} — \
"{moments['peak']['quote']}"

Calmest moment: {moments['calm']['time']} — \
"{moments['calm']['quote']}"

What you know about this user from past entries:
{memory_context}

Write 3-4 sentences in second person. Warm and wise \
like a deeply perceptive friend. Name what they were \
feeling that they couldn't name themselves. Be specific \
about the neural signals. End with one gentle, \
actionable nudge for tomorrow."""


def build_dream_prompt(
    transcript: str,
    roi_summary: dict,
    moments: dict,
    duration: int,
    dream_memories: list,
) -> str:
    memory_context = (
        "\n".join(
            [f"- {m.get('memory', m.get('content', str(m)))}" for m in dream_memories[:8]]
        )
        if dream_memories
        else "No prior dream entries yet."
    )

    return f"""You are a Jungian dream analyst and neuroscientist \
for DreamScribe, a voice journal that reads brain activity.

The user recorded a DREAM journal entry immediately after waking.

Dream transcript: "{transcript}"

Dream neural activation (TRIBE v2 output):
- Fear/threat response (amygdala): {roi_summary['emotional_load']}%
- Dream narrative (DMN): {roi_summary['self_referential']}%
- Emotional memory (hippocampus): {roi_summary['emotional_memory']}%
- Sensory vividness (visual cortex): {roi_summary['visual_vividness']}%
- Conflict/resolution (ACC): {roi_summary['internal_conflict']}%

Peak activation moment: {moments['peak']['time']} — \
"{moments['peak']['quote']}"

Recurring symbols from past dreams:
{memory_context}

Write 3-4 sentences. Identify the emotional core of this dream. \
Connect symbols to past dream patterns if they exist. \
End with one question for the user to sit with today."""


def build_cross_analysis_prompt(
    dream_roi: dict,
    dream_quote: str,
    daily_roi: dict,
    daily_quote: str,
    memories: list,
) -> str:
    memory_context = (
        "\n".join(
            [f"- {m.get('memory', m.get('content', str(m)))}" for m in memories[:6]]
        )
        if memories
        else ""
    )

    return f"""You are a neural pattern analyst for DreamScribe.

The user has BOTH a dream entry and a daily entry today.

Dream neural summary:
- Fear response: {dream_roi.get('emotional_load', 0)}%
- Dream narrative: {dream_roi.get('self_referential', 0)}%
- Conflict: {dream_roi.get('internal_conflict', 0)}%
Dream peak moment: "{dream_quote}"

Daily neural summary:
- Emotional load: {daily_roi.get('emotional_load', 0)}%
- Rational processing: {daily_roi.get('rational_processing', 0)}%
- Conflict: {daily_roi.get('internal_conflict', 0)}%
Daily peak moment: "{daily_quote}"

User pattern memory:
{memory_context}

In 3-4 sentences, find the thread connecting what their \
subconscious showed in the dream with what their conscious \
mind experienced during the day. Be specific and direct. \
Name the pattern. This is the most important insight of \
their day."""


def get_insight(prompt: str) -> str:
    """Call Claude API and return insight text"""
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text

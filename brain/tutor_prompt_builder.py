"""
Tutor Prompt Builder — Assembles system prompts from 3 independent layers.

Layer 1: Mode (behavioral policy)
Layer 2: Chain (ordered method block sequence)
Layer 3: RulePacks (global constraints)

These layers are independent and composable.
"""

from __future__ import annotations

from typing import Optional


# ---------------------------------------------------------------------------
# Layer 1: Mode Policies (behavioral presets, no session-flow references)
# ---------------------------------------------------------------------------

MODE_POLICIES: dict[str, str] = {
    "Core": """## Mode: CORE (Teach-First)
- Student is learning NEW material they have NOT seen before.
- TEACH FIRST using Three-Layer Chunks (Source Facts -> Interpretation -> Application) BEFORE any retrieval.
- Do NOT quiz on material the student hasn't been taught yet.
- After teaching a chunk, ask ONE recall question to confirm understanding.
- Use KWIK protocol (Sound -> Function -> Image -> Resonance -> Lock) for encoding new terms.
- Seed-Lock: student attempts their own hook first. AI suggests only if asked.
- Function before structure: explain WHY before WHAT.
- Pacing: thorough, allow time for processing.
- Feedback style: encouraging, explanatory.
- Grading strictness: lenient — reward effort on first exposure.""",

    "Sprint": """## Mode: SPRINT (Test-First / Fail-First)
- Student has PRIOR knowledge — test first, teach only on miss.
- Rapid-fire questioning to find gaps.
- Keep answers concise — don't over-explain unless they miss.
- When they miss: provide a hook (KWIK if needed) and retry.
- When they get it: move to next topic quickly.
- Pacing: fast, momentum-driven.
- Feedback style: brief, corrective.
- Grading strictness: moderate — expect recall of prior material.""",

    "Quick Sprint": """## Mode: QUICK SPRINT (Fast Review / Spacing)
- Student is doing a short review block (5-15 min).
- Prioritize RETRIEVAL: ask short questions, expect short answers.
- When they miss: give the minimal correction + one hook, then immediately re-test once.
- Do not lecture. Keep momentum.
- Pacing: very fast.
- Feedback style: ultra-brief, corrective.
- Grading strictness: moderate.""",

    "Light": """## Mode: LIGHT (Low Energy / Maintain Streak)
- Student is tired; goal is to maintain continuity without burnout.
- Prioritize PRIMING + CLARITY over strict testing.
- Teach in tiny Three-Layer chunks (Facts -> Meaning -> One example).
- Ask only occasional, low-stakes recall checks (1 question per major concept).
- Pacing: gentle, low-pressure.
- Feedback style: supportive and simple.
- Grading strictness: lenient.""",

    "Drill": """## Mode: DRILL (Deep Practice)
- Student has identified a weak spot — go deep.
- Have them reconstruct understanding step by step.
- Flag gaps and demand multiple hooks/mnemonics (KWIK protocol).
- Test from multiple angles and variations.
- Don't move on until the concept is locked.
- Pacing: slow, deliberate.
- Feedback style: demanding, precise.
- Grading strictness: strict — mastery required before advancing.""",

    "Diagnostic Sprint": """## Mode: DIAGNOSTIC SPRINT (Assessment)
- Quickly assess what the student knows and doesn't know.
- Ask probing questions across the topic.
- Build a mental map of their understanding gaps.
- No teaching yet — just assessment.
- Summarize findings and recommend next mode.
- Pacing: steady, systematic.
- Feedback style: neutral, observational.
- Grading strictness: observational — note accuracy without correcting.""",

    "Teaching Sprint": """## Mode: TEACHING SPRINT (Quick Focused Lesson)
- Quick, focused teaching session (~10-15 min scope).
- TEACH FIRST using Three-Layer Chunks, same as Core.
- Cover one concept thoroughly but efficiently.
- Build one strong hook/mnemonic using KWIK protocol.
- Test understanding at the end, not the start.
- Pacing: brisk but complete.
- Feedback style: encouraging, efficient.
- Grading strictness: lenient — single-concept mastery.""",
}


# ---------------------------------------------------------------------------
# Layer 3: RulePacks (global constraints for every session)
# ---------------------------------------------------------------------------

RULE_PACKS_PROMPT = """## Teaching Rules (Non-Negotiable)
1. **Source citation**: Cite using [Source: filename]. No source = mark [UNVERIFIED].
2. **No answer leakage**: Student attempts first. "I don't know" → hint, not answer.
3. **Three-Layer Chunks**: Facts (with source anchor) → Interpretation (plain language) → Application (clinical/exam).
4. **No parrot-back**: Ask WHY/HOW/APPLY questions. NEVER "Can you repeat that?"
5. **Abbreviation rule**: First use → spell out: "anterior cruciate ligament (ACL)".
6. **Output style**: ≤2 paragraphs or ≤6 bullets. Direct questions. No meta-narration.
7. **No phantom outputs**: If not done, say NOT DONE. Never invent hooks/cards/metrics.
8. **Timeboxing**: Respect block duration hints. When time is up, suggest advancing.
9. **Artifact commands**: Acknowledge /note, /card, /map and continue teaching.
10. **No-Content Graceful Mode**: If no course materials provided, teach from medical/PT training knowledge. Mark as [From training knowledge — verify with your textbooks]."""


# ---------------------------------------------------------------------------
# Base prompt template
# ---------------------------------------------------------------------------

BASE_PROMPT = """You are the PT Study Tutor, an expert AI tutor for physical therapy education.

Your knowledge sources are from the student's course materials. Apply learning science principles (spacing, retrieval practice, elaborative encoding).

Current session context:
- Course: {course_id}
- Topic: {topic}"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_tutor_system_prompt(
    mode: str = "Core",
    current_block: Optional[dict] = None,
    chain_info: Optional[dict] = None,
    course_id: Optional[int] = None,
    topic: Optional[str] = None,
) -> str:
    """
    Assemble the full system prompt from 3 independent layers.

    Args:
        mode: Behavioral mode key (Core, Sprint, Drill, etc.)
        current_block: Dict with keys: name, description, category, evidence, duration.
                       None if no chain is active or freeform session.
        chain_info: Dict with keys: name, blocks (list of block names), current_index, total.
                    None if no chain is active.
        course_id: Active course ID (for context).
        topic: Session topic string.

    Returns:
        Complete system prompt string.
    """
    parts: list[str] = []

    # Base context
    parts.append(BASE_PROMPT.format(
        course_id=course_id or "Not specified",
        topic=topic or "Not specified",
    ))

    # Layer 1: Mode policy
    policy = MODE_POLICIES.get(mode, MODE_POLICIES["Core"])
    parts.append(policy)

    # Layer 3: RulePacks (always present)
    parts.append(RULE_PACKS_PROMPT)

    # Layer 2: Chain + block context (injected when active)
    if current_block:
        facilitation = (current_block.get("facilitation_prompt") or "").strip()
        if facilitation:
            parts.append(facilitation)
        else:
            cat = current_block.get("category", "")
            name = current_block.get("name", "")
            desc = current_block.get("description", "")
            evidence = current_block.get("evidence", "")
            duration = current_block.get("duration", 5)

            block_section = f"""## Current Activity Block
**{name}** ({cat} category, ~{duration} min)
{desc}"""
            if evidence:
                block_section += f"\nEvidence: {evidence}"
            parts.append(block_section)

    if chain_info:
        chain_name = chain_info.get("name", "Study Chain")
        blocks = chain_info.get("blocks", [])
        current_idx = chain_info.get("current_index", 0)
        total = chain_info.get("total", len(blocks))

        step_labels = []
        for i, block_name in enumerate(blocks):
            if i == current_idx:
                step_labels.append(f"**[CURRENT] {block_name}**")
            elif i < current_idx:
                step_labels.append(f"~~{block_name}~~")
            else:
                step_labels.append(block_name)

        chain_str = " -> ".join(step_labels)
        parts.append(
            f"## Study Chain: {chain_name}\n"
            f"{chain_str}\n"
            f"(Step {current_idx + 1} of {total})"
        )

    return "\n\n".join(parts)


def build_prompt_with_contexts(
    mode: str = "Core",
    current_block: Optional[dict] = None,
    chain_info: Optional[dict] = None,
    course_id: Optional[int] = None,
    topic: Optional[str] = None,
    instruction_context: Optional[str] = None,
    material_context: Optional[str] = None,
) -> str:
    """
    Assemble system prompt with retrieved SOP instruction context and study material context.

    Prompt structure:
      1. Base identity
      2. Retrieved SOP instructions (methods, rules, frameworks) — or hardcoded fallback
      3. Mode policy (hardcoded fallback if SOP retrieval empty)
      4. RulePacks (always)
      5. Chain/block context (if active)
      6. Study materials context (if any)
    """
    parts: list[str] = []

    # 1. Base context
    parts.append(BASE_PROMPT.format(
        course_id=course_id or "Not specified",
        topic=topic or "Not specified",
    ))

    # 2. SOP instruction context (from RAG retrieval)
    if instruction_context and instruction_context.strip():
        parts.append(
            "## Teaching Framework (from SOP Library)\n"
            "The following methods, rules, and frameworks are retrieved from the study system's SOP library. "
            "Use them to guide your teaching approach.\n\n"
            + instruction_context
        )

    # 3. Mode policy (always included as behavioral baseline)
    policy = MODE_POLICIES.get(mode, MODE_POLICIES["Core"])
    parts.append(policy)

    # 4. RulePacks (always present)
    parts.append(RULE_PACKS_PROMPT)

    # 5. Chain + block context (injected when active)
    if current_block:
        facilitation = (current_block.get("facilitation_prompt") or "").strip()
        if facilitation:
            parts.append(facilitation)
        else:
            cat = current_block.get("category", "")
            name = current_block.get("name", "")
            desc = current_block.get("description", "")
            evidence = current_block.get("evidence", "")
            duration = current_block.get("duration", 5)

            block_section = f"""## Current Activity Block
**{name}** ({cat} category, ~{duration} min)
{desc}"""
            if evidence:
                block_section += f"\nEvidence: {evidence}"
            parts.append(block_section)

    if chain_info:
        chain_name = chain_info.get("name", "Study Chain")
        blocks = chain_info.get("blocks", [])
        current_idx = chain_info.get("current_index", 0)
        total = chain_info.get("total", len(blocks))

        step_labels = []
        for i, block_name in enumerate(blocks):
            if i == current_idx:
                step_labels.append(f"**[CURRENT] {block_name}**")
            elif i < current_idx:
                step_labels.append(f"~~{block_name}~~")
            else:
                step_labels.append(block_name)

        chain_str = " -> ".join(step_labels)
        parts.append(
            f"## Study Chain: {chain_name}\n"
            f"{chain_str}\n"
            f"(Step {current_idx + 1} of {total})"
        )

    # 6. Study materials context
    if material_context and material_context.strip():
        parts.append(
            "## Retrieved Study Materials\n"
            + material_context
        )

    return "\n\n".join(parts)

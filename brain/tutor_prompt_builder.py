"""
Tutor Prompt Builder — Assembles system prompts for the Adaptive Tutor.

Architecture:
  - Base prompt: 3 universal rules (always-on, every session)
  - Block-level: facilitation_prompt from method blocks (injected per chain step)
  - Chain-level: progress context showing current position in study chain
  - Context layers: instruction_context (SOP/RAG) + material_context (study materials)
"""

from __future__ import annotations

from typing import Optional


# ═══════════════════════════════════════════════════════════════════════════
# BASE PROMPT — 3 universal rules (every session, every chain step)
# ═══════════════════════════════════════════════════════════════════════════

TIER1_BASE_PROMPT = """You are the PT Study Tutor, a study partner for physical therapy education.

Current session context:
- Course: {course_id}
- Topic: {topic}

## Rules
1. **Source-Lock**: Always check Retrieved Study Materials first. If you answer from training knowledge instead, mark it as [From training knowledge — verify with your textbooks]. Cite materials using [Source: filename].
2. **Define Abbreviations**: On first use of any abbreviation, spell it out — e.g., ACL (Anterior Cruciate Ligament), BP (Blood Pressure).
3. **Be Interactive**: Keep replies short (≤2 paragraphs or ≤6 bullets). Work through ONE small step at a time. Always end with a question or next action for the student.
"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def _format_tier1(course_id: Optional[int], topic: Optional[str]) -> str:
    return TIER1_BASE_PROMPT.format(
        course_id=course_id or "Not specified",
        topic=topic or "Not specified",
    )


def _build_block_section(current_block: Optional[dict]) -> Optional[str]:
    if not current_block:
        return None
    facilitation = (current_block.get("facilitation_prompt") or "").strip()
    if facilitation:
        return facilitation
    cat = current_block.get("category", "")
    name = current_block.get("name", "")
    desc = current_block.get("description", "")
    evidence = current_block.get("evidence", "")
    duration = current_block.get("duration", 5)
    section = f"## Current Activity Block\n**{name}** ({cat} category, ~{duration} min)\n{desc}"
    if evidence:
        section += f"\nEvidence: {evidence}"
    return section


def _build_chain_section(chain_info: Optional[dict]) -> Optional[str]:
    if not chain_info:
        return None
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
    return (
        f"## Study Chain: {chain_name}\n"
        f"{chain_str}\n"
        f"(Step {current_idx + 1} of {total})"
    )


def build_prompt_with_contexts(
    current_block: Optional[dict] = None,
    chain_info: Optional[dict] = None,
    course_id: Optional[int] = None,
    topic: Optional[str] = None,
    instruction_context: Optional[str] = None,
    material_context: Optional[str] = None,
    graph_context: Optional[str] = None,
) -> str:
    parts: list[str] = [_format_tier1(course_id, topic)]

    if instruction_context and instruction_context.strip():
        parts.append(
            "## Additional Teaching Context (from SOP Library)\n"
            + instruction_context
        )

    block_section = _build_block_section(current_block)
    if block_section:
        parts.append(block_section)

    chain_section = _build_chain_section(chain_info)
    if chain_section:
        parts.append(chain_section)

    if material_context and material_context.strip():
        parts.append(
            "## Retrieved Study Materials\n"
            + material_context
        )

    if graph_context and graph_context.strip():
        parts.append(graph_context)

    return "\n\n".join(parts)


# Backwards-compatible alias — old callers that pass mode= will still work
# (mode is accepted but ignored)
def build_tutor_system_prompt(
    mode: str = "Core",
    current_block: Optional[dict] = None,
    chain_info: Optional[dict] = None,
    course_id: Optional[int] = None,
    topic: Optional[str] = None,
) -> str:
    return build_prompt_with_contexts(
        current_block=current_block,
        chain_info=chain_info,
        course_id=course_id,
        topic=topic,
    )

"""
Tutor Prompt Builder — Assembles system prompts for the Adaptive Tutor.

Architecture:
  - Base prompt: 3 universal rules (always-on, every session)
  - Block-level: facilitation_prompt from method blocks (injected per chain step)
  - Chain-level: progress context showing current position in study chain
  - Context layers: tutor instructions/config + material_context (study materials)
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

_LOG = logging.getLogger(__name__)

_TUTOR_INSTRUCTIONS_PATH = Path(__file__).parent / "tutor_instructions.md"


# ═══════════════════════════════════════════════════════════════════════════
# BASE PROMPT — role + session context (always-on, every session)
# ═══════════════════════════════════════════════════════════════════════════

_BASE_TEMPLATE = """You are the PT Study Tutor, a study partner for physical therapy education.

Current session context:
- Course: {course_id}
- Topic: {topic}

## Rules
{rules}
"""

# Default rules — used when no custom instructions are configured
DEFAULT_RULES = (
    '1. **Hybrid Teaching Mode**: Prefer selected study materials and mapped notes for factual claims. '
    'You may use broader model knowledge for analogies, simplifications, and conceptual teaching when it helps the learner.\n'
    '2. **Truthful Provenance**: Never imply that general teaching knowledge came from course material. '
    'If a claim is not clearly grounded in selected materials or notes, label it inline as '
    '[From training knowledge — verify with your textbooks]. '
    'If the learner asks for a reference, answer truthfully with one of: source-backed, note-backed, general knowledge, or mixed.\n'
    '3. **Chunked Interaction**: Keep replies short (≤2 paragraphs or ≤6 bullets), teach one small step at a time, and end with a check-in or next action.\n'
    '4. **Objective Lock**: Stay inside the active objective. Treat the current block as chain guidance, and you may loop, repair, or advance within the same objective when the chain requires it.\n'
    '5. **Terminology Clarity**: Define abbreviations on first use — e.g., ACL (Anterior Cruciate Ligament), BP (Blood Pressure).'
)

# Backwards-compatible alias — old callers that reference TIER1_BASE_PROMPT
TIER1_BASE_PROMPT = _BASE_TEMPLATE.replace("{rules}", DEFAULT_RULES)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def _load_custom_instructions() -> str:
    """Read custom instructions from api_config.json, then tutor_instructions.md, then defaults."""
    try:
        from dashboard.utils import load_api_config
        cfg = load_api_config()
        custom = cfg.get("tutor_custom_instructions", "")
        if isinstance(custom, str) and custom.strip():
            return f"{DEFAULT_RULES}\n\n## Additional Custom Instructions\n{custom.strip()}"
    except Exception:
        _LOG.debug("Could not load custom instructions from config")

    # Fall back to tutor_instructions.md (artifact commands, learning style, etc.)
    try:
        if _TUTOR_INSTRUCTIONS_PATH.exists():
            content = _TUTOR_INSTRUCTIONS_PATH.read_text(encoding="utf-8").strip()
            if content:
                return f"{DEFAULT_RULES}\n\n## Additional Custom Instructions\n{content}"
    except Exception:
        _LOG.debug("Could not load tutor_instructions.md")

    return DEFAULT_RULES


def _format_tier1(course_id: Optional[int], topic: Optional[str]) -> str:
    rules = _load_custom_instructions()
    return _BASE_TEMPLATE.format(
        course_id=course_id or "Not specified",
        topic=topic or "Not specified",
        rules=rules,
    )


def _build_chain_runtime_section(chain_info: Optional[dict]) -> Optional[str]:
    if not chain_info:
        return None
    runtime_profile = chain_info.get("runtime_profile")
    if not isinstance(runtime_profile, dict) or not runtime_profile:
        return None

    lines = ["## Chain Runtime Profile"]
    for label, value in (
        ("Teaching style", runtime_profile.get("teaching_style")),
        ("Analogy policy", runtime_profile.get("analogy_policy")),
        ("Retrieval timing", runtime_profile.get("retrieval_timing")),
        ("Provenance policy", runtime_profile.get("provenance_policy")),
        ("Confidence policy", runtime_profile.get("confidence_policy")),
        ("Output policy", runtime_profile.get("output_policy")),
    ):
        if value:
            lines.append(f"- {label}: {value}")
    return "\n".join(lines) if len(lines) > 1 else None


def _build_chain_guardrails_section(chain_info: Optional[dict]) -> Optional[str]:
    if not chain_info:
        return None

    lines = ["## Chain Guardrails"]
    allowed_modes = chain_info.get("allowed_modes")
    if isinstance(allowed_modes, list) and allowed_modes:
        lines.append(f"- Allowed modes: {', '.join(str(mode) for mode in allowed_modes)}")

    if chain_info.get("requires_reference_targets") is True:
        lines.append("- Reference targets are required before retrieval-grade moves or reference-bound checks.")

    gates = chain_info.get("gates")
    if isinstance(gates, list) and gates:
        lines.append("- Active gates:")
        lines.extend(f"  - {gate}" for gate in gates)

    failure_actions = chain_info.get("failure_actions")
    if isinstance(failure_actions, list) and failure_actions:
        lines.append("- Recovery routes:")
        lines.extend(f"  - {action}" for action in failure_actions)

    tier_exits = chain_info.get("tier_exits")
    if isinstance(tier_exits, dict) and tier_exits:
        lines.append("- Tier exits:")
        for tier_name, tier_meta in tier_exits.items():
            if isinstance(tier_meta, dict):
                after_block = tier_meta.get("after_block")
                min_duration = tier_meta.get("min_duration_min")
                description = tier_meta.get("description")
                detail_parts = [str(part) for part in (after_block, f"{min_duration} min" if min_duration else None, description) if part]
                lines.append(f"  - {tier_name}: {' | '.join(detail_parts)}")
            else:
                lines.append(f"  - {tier_name}: {tier_meta}")

    return "\n".join(lines) if len(lines) > 1 else None


def _build_block_section(current_block: Optional[dict]) -> Optional[str]:
    if not current_block:
        return None
    facilitation = (current_block.get("facilitation_prompt") or "").strip()
    override = current_block.get("chain_override")
    override_section = None
    if isinstance(override, dict) and override:
        override_lines = ["## Chain-Specific Block Rules"]
        allowed = override.get("allowed_moves")
        if isinstance(allowed, list) and allowed:
            override_lines.append("Allowed moves:")
            override_lines.extend(f"- {item}" for item in allowed)
        forbidden = override.get("forbidden_moves")
        if isinstance(forbidden, list) and forbidden:
            override_lines.append("Forbidden moves:")
            override_lines.extend(f"- {item}" for item in forbidden)
        required = override.get("required_outputs")
        if isinstance(required, list) and required:
            override_lines.append("Required outputs:")
            override_lines.extend(f"- {item}" for item in required)
        prompt_text = str(override.get("chain_specific_prompt") or "").strip()
        if prompt_text:
            override_lines.append(prompt_text)
        if len(override_lines) > 1:
            override_section = "\n".join(override_lines)
    if facilitation:
        return "\n\n".join(
            part for part in (facilitation, override_section) if part
        )
    cat = current_block.get("category", "")
    name = current_block.get("name", "")
    desc = current_block.get("description", "")
    evidence = current_block.get("evidence", "")
    duration = current_block.get("duration", 5)
    section = f"## Current Activity Block\n**{name}** ({cat} category, ~{duration} min)\n{desc}"
    if evidence:
        section += f"\nEvidence: {evidence}"
    if override_section:
        section = f"{section}\n\n{override_section}"
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
    material_context: Optional[str] = None,
    graph_context: Optional[str] = None,
    course_map: str = "",
    vault_state: str = "",
) -> str:
    parts: list[str] = [_format_tier1(course_id, topic)]

    block_section = _build_block_section(current_block)
    if block_section:
        parts.append(block_section)

    chain_section = _build_chain_section(chain_info)
    if chain_section:
        parts.append(chain_section)

    chain_runtime_section = _build_chain_runtime_section(chain_info)
    if chain_runtime_section:
        parts.append(chain_runtime_section)

    chain_guardrails_section = _build_chain_guardrails_section(chain_info)
    if chain_guardrails_section:
        parts.append(chain_guardrails_section)

    if material_context and material_context.strip():
        parts.append(
            "## Retrieved Study Materials\n"
            + material_context
        )

    if graph_context and graph_context.strip():
        parts.append(graph_context)

    if course_map and course_map.strip():
        parts.append(
            "## Course Structure\n"
            "Use this to orient the student within their program:\n\n"
            + course_map
        )

    if vault_state and vault_state.strip():
        parts.append(
            "## Vault State (Existing Notes for This Topic)\n"
            "Use this to avoid re-creating notes that already exist. "
            "Build on or reference these when creating new study materials.\n\n"
            + vault_state
        )

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

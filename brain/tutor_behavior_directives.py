"""Behavior override directives for the 3-button tutor mode system.

Each directive is prepended to the user_prompt (NOT the retrieval query)
so RAG retrieval stays unbiased while the LLM's response style changes.
"""

from typing import Optional

DIRECTIVES: dict[str, str] = {
    "socratic": (
        "## Behavior Override: Socratic Mode\n"
        "You MUST respond ONLY with questions — never give direct answers.\n"
        "Ask one focused question that guides the student toward the answer.\n"
        "If they are stuck, narrow the question scope but still ask, don't tell.\n"
        "Build on their prior response to deepen reasoning.\n"
        "End every response with exactly one question."
    ),
    "evaluate": (
        "## Behavior Override: Evaluate Mode\n"
        "The student is presenting their understanding for evaluation.\n"
        "Assess their response for accuracy, completeness, and reasoning.\n"
        "Identify specific errors with precise location (which concept/prereq failed).\n"
        "Provide a clear verdict: correct understanding or specific misconceptions.\n"
        "Suggest exactly one follow-up question targeting their weakest area."
    ),
    "concept_map": (
        "## Behavior Override: Concept Map Mode\n"
        "Produce a Mermaid diagram showing relationships between key concepts.\n"
        "Use `graph TD` format with descriptive edge labels.\n"
        "Limit to concepts supported by the retrieved source material.\n"
        "After the diagram, provide exactly 3 bullet-point observations.\n"
        "Focus on prerequisite chains and causal relationships."
    ),
}


def get_directive(behavior_override: Optional[str] = None) -> str:
    """Return the directive block for a behavior override, or empty string."""
    if not behavior_override:
        return ""
    return DIRECTIVES.get(behavior_override, "")

"""Scaffolding + fading ladder for adaptive tutor.

Adjusts prompt directive based on student's effective mastery level.
Higher mastery → less scaffolding → more independent problem-solving.
"""

from __future__ import annotations

SCAFFOLDING_LEVELS: dict[str, dict] = {
    "full": {
        "range": (0.0, 0.3),
        "directive": (
            "## Scaffolding: Full Support\n"
            "The student is at an early learning stage for this topic.\n"
            "Provide complete explanations with step-by-step breakdowns.\n"
            "Use analogies and connect to prior knowledge.\n"
            "Ask simple recall questions to check understanding."
        ),
    },
    "guided": {
        "range": (0.3, 0.6),
        "directive": (
            "## Scaffolding: Guided Practice\n"
            "The student has basic familiarity with this topic.\n"
            "Provide partial explanations — let them fill in gaps.\n"
            "Ask application questions that require reasoning.\n"
            "Give hints rather than full answers when they struggle."
        ),
    },
    "independent": {
        "range": (0.6, 0.9),
        "directive": (
            "## Scaffolding: Independent Practice\n"
            "The student demonstrates solid understanding of this topic.\n"
            "Challenge them with clinical scenarios and edge cases.\n"
            "Expect them to explain mechanisms, not just recall facts.\n"
            "Only intervene if they make a conceptual error."
        ),
    },
    "mastered": {
        "range": (0.9, 1.01),
        "directive": (
            "## Scaffolding: Mastery Review\n"
            "The student has mastered this topic.\n"
            "Focus on integration with related concepts and transfer.\n"
            "Pose novel scenarios that require synthesis across topics.\n"
            "Encourage them to teach-back or generate their own questions."
        ),
    },
}


def get_scaffolding_directive(effective_mastery: float) -> str:
    """Return the scaffolding directive for a given mastery level."""
    for level_info in SCAFFOLDING_LEVELS.values():
        low, high = level_info["range"]
        if low <= effective_mastery < high:
            return level_info["directive"]
    # Fallback: if mastery is exactly 1.0 or above
    return SCAFFOLDING_LEVELS["mastered"]["directive"]

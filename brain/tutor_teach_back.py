"""Teach-back gate module (Phase 6 — Feynman Technique).

The student explains a concept as if teaching a novice. The LLM acts as a
confused listener, asks probing questions, and emits a structured rubric
that maps deficiencies to skill_id/edge_id. Weak rubric scores block
mastery threshold crossing even if quiz accuracy is high.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Optional

_LOG = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Rubric schema
# ---------------------------------------------------------------------------

TEACH_BACK_RUBRIC_SCHEMA = {
    "overall_rating": "pass | partial | fail",
    "accuracy_score": "0-3 (0=major errors, 3=fully correct)",
    "breadth_score": "0-3 (0=missing most concepts, 3=comprehensive)",
    "synthesis_score": "0-3 (0=no connections, 3=clear integration)",
    "misconceptions": ["list of specific errors found"],
    "gaps": [{"skill_id": "concept missed", "edge_id": "relationship missed or null"}],
    "strengths": ["what the student explained well"],
    "next_focus": "single concept to review next",
    "confidence": 0.85,
}

# ---------------------------------------------------------------------------
# Prompt suffix — appended to system_prompt for teach_back mode
# ---------------------------------------------------------------------------

TEACH_BACK_PROMPT_SUFFIX = """

## Teach-Back Evaluation Contract

You are acting as a NOVICE LISTENER. The student is teaching you this topic.

Rules for your behavior:
- Do NOT explain concepts yourself — only the student teaches
- Ask naive "I don't understand" questions to probe their explanation
- If they use jargon, ask them to simplify
- If they skip a prerequisite, ask "but why does that happen?"
- If they make an error, express confusion rather than correcting them

After your conversational response, you MUST emit a structured rubric inside HTML comment markers on its own line:

<!-- TEACH_BACK_RUBRIC: {"overall_rating":"pass|partial|fail","accuracy_score":0-3,"breadth_score":0-3,"synthesis_score":0-3,"misconceptions":["error1"],"gaps":[{"skill_id":"concept","edge_id":"relation or null"}],"strengths":["strength1"],"next_focus":"concept to review","confidence":0.85} -->

Scoring guide:
- accuracy_score: 0=major factual errors, 1=some errors, 2=minor issues, 3=fully correct
- breadth_score: 0=covered <25% of key concepts, 1=25-50%, 2=50-75%, 3=>75%
- synthesis_score: 0=listed facts only, 1=some connections, 2=good integration, 3=teaches causal chains
- overall_rating: "pass" if all scores ≥ 2, "fail" if any score = 0, "partial" otherwise
- gaps[].skill_id MUST name the specific concept that was missed or wrong
- gaps[].edge_id names the prerequisite relationship missed (null if not a prereq issue)
- Emit exactly ONE rubric marker per response
"""

# ---------------------------------------------------------------------------
# Parser
# ---------------------------------------------------------------------------

_RUBRIC_PATTERN = re.compile(
    r"<!--\s*TEACH_BACK_RUBRIC:\s*(\{.*?\})\s*-->",
    re.DOTALL,
)

_REQUIRED_KEYS = {"overall_rating", "accuracy_score", "breadth_score", "synthesis_score", "confidence"}
_VALID_RATINGS = {"pass", "fail", "partial"}
_SCORE_RANGE = range(0, 4)  # 0, 1, 2, 3


def parse_teach_back_rubric(response_text: str) -> Optional[dict]:
    """Extract and parse teach-back rubric JSON from LLM response.

    Returns parsed dict or None if no valid rubric found.
    """
    match = _RUBRIC_PATTERN.search(response_text)
    if not match:
        return None

    raw = match.group(1)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        _LOG.warning("Teach-back rubric JSON parse error: %s — raw: %s", exc, raw[:200])
        return None

    if not isinstance(data, dict):
        _LOG.warning("Teach-back rubric JSON is not a dict")
        return None

    return data


def validate_teach_back_rubric(data: dict) -> tuple[bool, list[str]]:
    """Validate rubric structure. Returns (is_valid, list of issues)."""
    issues: list[str] = []

    for key in _REQUIRED_KEYS:
        if key not in data:
            issues.append(f"Missing required field: {key}")

    rating = data.get("overall_rating")
    if rating and rating not in _VALID_RATINGS:
        issues.append(f"Invalid overall_rating: {rating}")

    for score_key in ("accuracy_score", "breadth_score", "synthesis_score"):
        score = data.get(score_key)
        if score is not None:
            if not isinstance(score, int):
                issues.append(f"{score_key} must be an integer")
            elif score not in _SCORE_RANGE:
                issues.append(f"{score_key} out of range (0-3): {score}")

    confidence = data.get("confidence")
    if confidence is not None:
        if not isinstance(confidence, (int, float)):
            issues.append("confidence must be a number")
        elif not (0.0 <= confidence <= 1.0):
            issues.append(f"confidence out of range: {confidence}")

    # Gaps should be a list of dicts with skill_id
    gaps = data.get("gaps")
    if gaps is not None:
        if not isinstance(gaps, list):
            issues.append("gaps must be a list")
        else:
            for i, gap in enumerate(gaps):
                if isinstance(gap, dict) and not gap.get("skill_id"):
                    issues.append(f"gaps[{i}].skill_id is required")

    return (len(issues) == 0, issues)


def strip_teach_back_marker(response_text: str) -> str:
    """Remove teach-back rubric HTML comment from visible response text."""
    return _RUBRIC_PATTERN.sub("", response_text).rstrip()


# ---------------------------------------------------------------------------
# Mastery gate
# ---------------------------------------------------------------------------

TEACH_BACK_MASTERY_THRESHOLD = 0.6  # Minimum effective mastery to allow teach-back


def check_teach_back_gate(effective_mastery: float) -> bool:
    """Return True if student's mastery is high enough for teach-back."""
    return effective_mastery >= TEACH_BACK_MASTERY_THRESHOLD


def rubric_blocks_mastery(rubric: dict) -> bool:
    """Return True if the rubric is too weak to allow mastery crossing.

    A student cannot cross the mastery threshold (0.95+) if their
    teach-back rubric shows any score below 2 or overall_rating != "pass".
    """
    if rubric.get("overall_rating") != "pass":
        return True
    for score_key in ("accuracy_score", "breadth_score", "synthesis_score"):
        score = rubric.get(score_key, 0)
        if isinstance(score, int) and score < 2:
            return True
    return False

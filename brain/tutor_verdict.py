"""Evaluate verdict parser for the tutor system.

When behavior_override == "evaluate", the LLM is instructed to emit a
structured verdict JSON inside HTML comment markers. This module parses
and validates that verdict.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Optional

_LOG = logging.getLogger(__name__)

VERDICT_JSON_SCHEMA = {
    "verdict": "pass | fail | partial",
    "error_location": {
        "type": "concept | prerequisite | reasoning | recall",
        "node": "skill/concept name where error occurred",
        "prereq_from": "upstream prerequisite (if prereq failure)",
        "prereq_to": "downstream concept affected",
    },
    "error_type": "misconception | incomplete | reversed_causality | missing_link",
    "why_wrong": "1-2 sentence explanation of the specific error",
    "next_hint": "targeted hint to guide correction",
    "next_question": "follow-up question targeting weakest area",
    "confidence": 0.85,
    "citations": ["source references from retrieved material"],
}

VERDICT_PROMPT_SUFFIX = """

## Evaluation Output Contract

After your conversational response, you MUST emit a structured verdict inside HTML comment markers on its own line. The format is:

<!-- VERDICT_JSON: {"verdict":"pass|fail|partial","error_location":{"type":"concept|prerequisite|reasoning|recall","node":"concept name","prereq_from":"upstream prereq or null","prereq_to":"downstream concept or null"},"error_type":"misconception|incomplete|reversed_causality|missing_link|null","why_wrong":"explanation or null","next_hint":"hint text","next_question":"follow-up question","confidence":0.85,"citations":["ref1"]} -->

Rules:
- verdict is REQUIRED: "pass", "fail", or "partial"
- If verdict is "fail", error_location.node MUST be non-null
- confidence is 0.0-1.0
- citations should reference retrieved material
- Emit exactly ONE verdict marker per response
"""

_VERDICT_PATTERN = re.compile(
    r"<!--\s*VERDICT_JSON:\s*(\{.*?\})\s*-->",
    re.DOTALL,
)

_REQUIRED_KEYS = {"verdict", "next_hint", "next_question", "confidence"}
_VALID_VERDICTS = {"pass", "fail", "partial"}


def parse_verdict(response_text: str) -> Optional[dict]:
    """Extract and parse verdict JSON from LLM response.

    Returns parsed dict or None if no valid verdict found.
    """
    match = _VERDICT_PATTERN.search(response_text)
    if not match:
        return None

    raw = match.group(1)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        _LOG.warning("Verdict JSON parse error: %s — raw: %s", exc, raw[:200])
        return None

    if not isinstance(data, dict):
        _LOG.warning("Verdict JSON is not a dict")
        return None

    return data


def validate_verdict(data: dict) -> tuple[bool, list[str]]:
    """Validate verdict structure. Returns (is_valid, list of issues)."""
    issues: list[str] = []

    for key in _REQUIRED_KEYS:
        if key not in data:
            issues.append(f"Missing required field: {key}")

    verdict_val = data.get("verdict")
    if verdict_val and verdict_val not in _VALID_VERDICTS:
        issues.append(f"Invalid verdict value: {verdict_val}")

    confidence = data.get("confidence")
    if confidence is not None:
        if not isinstance(confidence, (int, float)):
            issues.append("confidence must be a number")
        elif not (0.0 <= confidence <= 1.0):
            issues.append(f"confidence out of range: {confidence}")

    if verdict_val == "fail":
        error_loc = data.get("error_location")
        if not error_loc or not isinstance(error_loc, dict):
            issues.append("error_location required when verdict is fail")
        elif not error_loc.get("node"):
            issues.append("error_location.node required when verdict is fail")

    return (len(issues) == 0, issues)


def strip_verdict_marker(response_text: str) -> str:
    """Remove the verdict HTML comment from visible response text."""
    return _VERDICT_PATTERN.sub("", response_text).rstrip()


# ---------------------------------------------------------------------------
# M7: Concept Map output contract
# ---------------------------------------------------------------------------

CONCEPT_MAP_PROMPT_SUFFIX = """

## Concept Map Output Contract

You MUST structure your response as follows:
1. First, output a Mermaid diagram using `graph TD` format with descriptive edge labels
2. Then output exactly 3 bullet-point observations about the concept relationships
3. Finally, emit structured metadata inside HTML comment markers:

<!-- CONCEPT_MAP: {"nodes":["Node1","Node2"],"edges":[{"from":"Node1","to":"Node2","label":"causes"}],"topic":"main topic","note_count":3} -->

Rules:
- Use `graph TD` (top-down) Mermaid format
- Limit nodes to concepts supported by retrieved source material
- Edge labels should describe the relationship type (causes, requires, inhibits, etc.)
- Emit exactly ONE concept map marker per response
"""

_CONCEPT_MAP_PATTERN = re.compile(
    r"<!--\s*CONCEPT_MAP:\s*(\{.*?\})\s*-->",
    re.DOTALL,
)

_MERMAID_PATTERN = re.compile(
    r"```mermaid\s*\n(.*?)```",
    re.DOTALL,
)


def parse_concept_map(response_text: str) -> Optional[dict]:
    """Extract concept map metadata and Mermaid code from LLM response.

    Returns dict with 'mermaid' (str) and 'metadata' (dict) keys, or None.
    """
    mermaid_match = _MERMAID_PATTERN.search(response_text)
    meta_match = _CONCEPT_MAP_PATTERN.search(response_text)

    if not mermaid_match and not meta_match:
        return None

    result: dict = {}

    if mermaid_match:
        result["mermaid"] = mermaid_match.group(1).strip()

    if meta_match:
        try:
            result["metadata"] = json.loads(meta_match.group(1))
        except json.JSONDecodeError as exc:
            _LOG.warning("Concept map JSON parse error: %s", exc)
            result["metadata"] = None
    else:
        result["metadata"] = None

    return result if result else None


def strip_concept_map_marker(response_text: str) -> str:
    """Remove concept map HTML comment from visible response text."""
    return _CONCEPT_MAP_PATTERN.sub("", response_text).rstrip()

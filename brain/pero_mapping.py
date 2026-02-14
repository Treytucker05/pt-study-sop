"""PERO Stage Mapping — maps PEIRRO categories to PERO learning stages.

PERO collapses the 6 PEIRRO categories into 4 cognitive stages:
  P (Priming)      — activate prior knowledge, set expectations
  E (Encoding)     — create meaning, build hooks, attach structure
  R (Retrieval)    — test recall, practice retrieval, apply to cases
  O (Overlearning) — close loop, capture artifacts, reflect

The "Interrogate" PEIRRO category is NOT a PERO stage. Methods in that
category are mapped to Encoding (structure-building) or Retrieval
(case-based application) based on each method's cognitive intent.

YAML categories are NEVER renamed. This mapping is computed at runtime.

Usage:
    from pero_mapping import get_pero_stage, get_pero_sequence
    stage = get_pero_stage("Brain Dump", "prepare")
    sequence = get_pero_sequence(["Brain Dump", "KWIK Hook", "Sprint Quiz"])
"""

from __future__ import annotations

from typing import Optional


# ---------------------------------------------------------------------------
# PERO Stage Definitions
# ---------------------------------------------------------------------------

PERO_STAGES = ("P", "E", "R", "O")

PERO_LABELS = {
    "P": "Priming",
    "E": "Encoding",
    "R": "Retrieval",
    "O": "Overlearning",
}

# Canonical stage ordering for validation (earlier index = earlier stage)
PERO_ORDER = {stage: i for i, stage in enumerate(PERO_STAGES)}


# ---------------------------------------------------------------------------
# Category → Default PERO Stage (when no method-specific override exists)
# ---------------------------------------------------------------------------
#
# | PEIRRO category | Default PERO | Rationale                           |
# |-----------------|--------------|-------------------------------------|
# | prepare         | P (Priming)  | Prior knowledge activation          |
# | encode          | E (Encoding) | Meaning-making, hook creation       |
# | retrieve        | R (Retrieval)| Testing recall, strengthening paths |
# | interrogate     | E (Encoding) | Default: structure-building intent  |
# | refine          | R (Retrieval)| Post-retrieval error correction     |
# | overlearn       | O (Overlearn)| Artifact capture, reflection        |

_CATEGORY_DEFAULT: dict[str, str] = {
    "prepare": "P",
    "encode": "E",
    "retrieve": "R",
    "interrogate": "E",  # default; overridden per method below
    "refine": "R",       # repair is post-retrieval
    "overlearn": "O",
}


# ---------------------------------------------------------------------------
# Method-Specific Overrides
# ---------------------------------------------------------------------------
# Some methods don't match their category's default PERO stage.
#
# "interrogate" methods split based on cognitive intent:
#   - Structure-building (analogy, comparison, illness scripts) → Encoding
#   - Case-based application (clinical app, case walkthrough) → Retrieval
#
# "prepare" Pre-Test is diagnostic retrieval → flagged as P with exception

_METHOD_OVERRIDES: dict[str, dict] = {
    # --- interrogate → Retrieval (case-based application) ---
    "Clinical Application": {"pero": "R", "subtag": "application"},
    "Case Walkthrough":     {"pero": "R", "subtag": "application"},
    # --- interrogate → Encoding (structure-building) — matches category default ---
    "Analogy Bridge":          {"pero": "E", "subtag": "elaboration"},
    "Cross-Topic Link":        {"pero": "E", "subtag": "integration"},
    "Side-by-Side Comparison": {"pero": "E", "subtag": "discrimination"},
    "Illness Script Builder":  {"pero": "E", "subtag": "schema-building"},
    # --- prepare with diagnostic retrieval exception ---
    "Pre-Test": {"pero": "P", "subtag": "diagnostic-retrieval", "exception": True},
    # --- refine with repair subtags ---
    "Error Autopsy": {"pero": "R", "subtag": "repair"},
    "Mastery Loop":  {"pero": "R", "subtag": "successive-relearning"},
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_pero_stage(method_name: str, category: str = "") -> str:
    """Return the PERO stage letter (P/E/R/O) for a method.

    Checks method-specific overrides first, then falls back to category default.
    """
    override = _METHOD_OVERRIDES.get(method_name)
    if override:
        return override["pero"]
    return _CATEGORY_DEFAULT.get(category, "E")


def get_pero_info(method_name: str, category: str = "") -> dict:
    """Return full PERO mapping info for a method.

    Returns dict with keys: pero, label, subtag, exception, category.
    """
    override = _METHOD_OVERRIDES.get(method_name)
    if override:
        stage = override["pero"]
        return {
            "pero": stage,
            "label": PERO_LABELS[stage],
            "subtag": override.get("subtag", ""),
            "exception": override.get("exception", False),
            "category": category,
        }
    stage = _CATEGORY_DEFAULT.get(category, "E")
    return {
        "pero": stage,
        "label": PERO_LABELS[stage],
        "subtag": "",
        "exception": False,
        "category": category,
    }


def get_pero_sequence(
    blocks: list[dict],
) -> list[dict]:
    """Compute the PERO stage sequence for a list of blocks.

    Args:
        blocks: list of dicts with at least "name" and "category" keys.

    Returns:
        list of dicts: {name, category, pero, label, subtag, exception}
    """
    result = []
    for block in blocks:
        name = block.get("name", "")
        cat = block.get("category", "")
        info = get_pero_info(name, cat)
        result.append({
            "name": name,
            "category": cat,
            **info,
        })
    return result


def get_stage_coverage(blocks: list[dict]) -> dict[str, bool]:
    """Return which PERO stages are covered by a block list.

    Returns dict like {"P": True, "E": True, "R": False, "O": True}.
    """
    stages_seen: set[str] = set()
    for block in blocks:
        name = block.get("name", "")
        cat = block.get("category", "")
        stages_seen.add(get_pero_stage(name, cat))
    return {stage: stage in stages_seen for stage in PERO_STAGES}


def get_exception_flags(blocks: list[dict]) -> list[str]:
    """Return exception flag descriptions for blocks with special handling."""
    flags = []
    for block in blocks:
        name = block.get("name", "")
        info = _METHOD_OVERRIDES.get(name, {})
        if info.get("exception"):
            flags.append(f"{name}: {info.get('subtag', 'exception')}")
    return flags

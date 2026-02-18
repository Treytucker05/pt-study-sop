"""
Selector Bridge for CP-MSS v1.0.

This module bridges the control-plane selector (brain.selector)
with the adaptive tutor API.
"""

from __future__ import annotations

from typing import Optional

try:
    from brain.selector import select_chain
except ModuleNotFoundError:
    # Test harnesses that add brain/ directly to sys.path import selector_bridge
    # as a top-level module, so this fallback keeps both contexts working.
    from selector import select_chain

_POLICY_VERSION = "v1.0"


def _build_chain_catalog() -> dict[str, dict[str, object]]:
    """Return static chain metadata used by API/tests."""
    return {
        "C-FE-STD": {
            "chain_name": "Standard First Exposure",
            "selected_blocks": [
                "PRIME",
                "CALIBRATE",
                "ENCODE",
                "REFERENCE",
                "RETRIEVE",
                "OVERLEARN",
            ],
        },
        "C-FE-MIN": {
            "chain_name": "Minimal / Low Energy",
            "selected_blocks": [
                "PRIME",
                "CALIBRATE",
                "ENCODE",
                "REFERENCE",
                "RETRIEVE",
                "OVERLEARN",
            ],
        },
        "C-FE-PRO": {
            "chain_name": "Procedure / Lab",
            "selected_blocks": [
                "PRIME",
                "CALIBRATE",
                "ENCODE",
                "REFERENCE",
                "RETRIEVE",
                "OVERLEARN",
            ],
        },
    }


_CHAIN_CATALOG = _build_chain_catalog()


def get_policy_version() -> str:
    """Return selector policy version."""
    return _POLICY_VERSION


def reload_chain_catalog() -> int:
    """
    Reload chain metadata catalog and return number of known chains.

    Kept as explicit API so callers/tests can verify selector metadata readiness.
    """
    global _CHAIN_CATALOG
    _CHAIN_CATALOG = _build_chain_catalog()
    return len(_CHAIN_CATALOG)


def _resolve_chain_metadata(chain_id: str) -> tuple[str, list[str]]:
    chain = _CHAIN_CATALOG.get(chain_id) or _CHAIN_CATALOG["C-FE-STD"]
    chain_name = str(chain["chain_name"])
    selected_blocks = [str(x) for x in list(chain["selected_blocks"])]
    return chain_name, selected_blocks


def run_selector(
    assessment_mode: str,
    stage: str = "first_exposure",
    energy: str = "medium",
    time_available: int = 40,
    class_type: Optional[str] = None,
    prior_exposure_band: str = "new",
    prior_rsr: Optional[float] = None,
    prior_calibration_gap: Optional[float] = None,
    recent_errors: Optional[list] = None,
) -> dict:
    """
    Run the selector and adapt output to tutor API contract.
    """

    # Determine dominant error from recent errors
    dominant_error = None
    if recent_errors:
        dominant_error = recent_errors[0]

    # Call the core selector
    chain_id, _knob_overrides = select_chain(
        assessment_mode=assessment_mode,
        time_available_min=time_available,
        energy=energy,
        dominant_error=dominant_error,
    )

    chain_name, selected_blocks = _resolve_chain_metadata(chain_id)

    # Build deterministic numeric score tuple for telemetry/tests
    mode_score_map = {
        "definition": 1,
        "classification": 2,
        "recognition": 3,
        "mechanism": 4,
        "computation": 5,
        "procedure": 6,
        "spatial": 7,
        "synthesis": 8,
    }
    stage_score_map = {
        "first_exposure": 1,
        "review": 2,
        "exam_prep": 3,
        "consolidation": 4,
    }
    energy_score_map = {"low": 1, "medium": 2, "high": 3}
    prior_exposure_score_map = {
        "new": 1,
        "familiar": 2,
        "moderate": 2,
        "mastered": 3,
    }
    error_score_map = {
        "Confusion": 1,
        "Speed": 2,
        "Rule": 3,
        "Procedure": 4,
        "Recall": 5,
    }

    score_tuple = [
        float(mode_score_map.get(assessment_mode, 0)),
        float(stage_score_map.get(stage, 0)),
        float(energy_score_map.get(energy, 0)),
        float(max(0, int(time_available))),
        float(prior_exposure_score_map.get(prior_exposure_band, 0)),
        float(error_score_map.get(str(dominant_error), 0)),
        float(prior_rsr if prior_rsr is not None else 0.0),
        float(
            prior_calibration_gap if prior_calibration_gap is not None else 0.0
        ),
    ]

    dependency_fix_applied = False
    if "REFERENCE" in selected_blocks and "RETRIEVE" in selected_blocks:
        dependency_fix_applied = (
            selected_blocks.index("REFERENCE") < selected_blocks.index("RETRIEVE")
        )

    return {
        "chain_id": chain_id,
        "chain_name": chain_name,
        "selected_blocks": selected_blocks,
        "score_tuple": score_tuple,
        "selector_policy_version": get_policy_version(),
        "dependency_fix_applied": dependency_fix_applied,
    }

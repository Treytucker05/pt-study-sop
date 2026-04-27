# brain/selector.py

"""
Control Plane Modular Study System (CP-MSS v2.0)
Chain Selector - Deterministic Router

Routes to a chain template and exposes chain metadata derived from the actual
library definitions instead of a hand-maintained shadow catalog.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover - repo runtime installs PyYAML
    yaml = None

_REPO_ROOT = Path(__file__).resolve().parents[1]
_CHAINS_DIR = _REPO_ROOT / "sop" / "library" / "chains"
_METHODS_DIR = _REPO_ROOT / "sop" / "library" / "methods"
_REFERENCE_TARGET_METHODS = {"M-REF-003", "M-REF-004"}

_FALLBACK_CHAIN_CATALOG: dict[str, dict[str, Any]] = {
    "C-FE-STD": {
        "chain_id": "C-FE-STD",
        "chain_name": "Trey's Favorite: Start Here",
        "block_method_ids": [
            "M-PRE-010",
            "M-PRE-008",
            "M-ENC-008",
            "M-CAL-001",
            "M-ENC-010",
            "M-REF-003",
            "M-REF-004",
            "M-RET-007",
        ],
        "selected_blocks": ["PRIME", "TEACH", "CALIBRATE", "ENCODE", "REFERENCE", "RETRIEVE"],
        "stage_sequence": [
            "PRIME",
            "PRIME",
            "TEACH",
            "CALIBRATE",
            "ENCODE",
            "REFERENCE",
            "REFERENCE",
            "RETRIEVE",
        ],
        "requires_reference_targets": True,
        "dependency_fix_applied": False,
    },
    "C-FE-MIN": {
        "chain_id": "C-FE-MIN",
        "chain_name": "First Exposure: Minimal",
        "block_method_ids": [
            "M-PRE-010",
            "M-PRE-008",
            "M-REF-003",
            "M-RET-001",
            "M-OVR-001",
        ],
        "selected_blocks": ["PRIME", "REFERENCE", "RETRIEVE", "OVERLEARN"],
        "stage_sequence": ["PRIME", "PRIME", "REFERENCE", "RETRIEVE", "OVERLEARN"],
        "requires_reference_targets": True,
        "dependency_fix_applied": False,
    },
    "C-FE-PRO": {
        "chain_id": "C-FE-PRO",
        "chain_name": "First Exposure: Procedure",
        "block_method_ids": [
            "M-PRE-010",
            "M-PRE-008",
            "M-TEA-001",
            "M-ENC-011",
            "M-REF-003",
            "M-INT-005",
            "M-RET-007",
        ],
        "selected_blocks": ["PRIME", "TEACH", "ENCODE", "REFERENCE", "RETRIEVE"],
        "stage_sequence": [
            "PRIME",
            "PRIME",
            "TEACH",
            "ENCODE",
            "REFERENCE",
            "ENCODE",
            "RETRIEVE",
        ],
        "requires_reference_targets": True,
        "dependency_fix_applied": False,
    },
}


def _safe_yaml_load(path: Path) -> dict[str, Any]:
    if yaml is None or not path.exists():
        return {}
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


# 2026-04-21 vault hardening introduced richer operational stages
# (ORIENT, EXPLAIN, INTERROGATE, CONSOLIDATE, PLAN). For routing purposes
# the selector collapses them onto the legacy 7-stage runtime vocabulary
# so downstream consumers (dashboard, chain certification, golden flows)
# continue to see PRIME / TEACH / CALIBRATE / ENCODE / REFERENCE /
# RETRIEVE / OVERLEARN. The richer taxonomy remains visible in the YAML
# specs themselves for human readers and the validator.
_STAGE_RUNTIME_EQUIVALENT = {
    "PLAN": "PRIME",
    "ORIENT": "PRIME",
    "PRIME": "PRIME",
    "TEACH": "TEACH",
    "EXPLAIN": "TEACH",
    "CALIBRATE": "CALIBRATE",
    "ENCODE": "ENCODE",
    "INTERROGATE": "REFERENCE",
    "REFERENCE": "REFERENCE",
    "CONSOLIDATE": "REFERENCE",
    "RETRIEVE": "RETRIEVE",
    "OVERLEARN": "OVERLEARN",
}


def _normalize_control_stage(raw_stage: Any, raw_category: Any = None) -> str:
    stage = str(raw_stage or "").strip().upper()
    if stage:
        return _STAGE_RUNTIME_EQUIVALENT.get(stage, stage)

    category = str(raw_category or "").strip().lower()
    legacy = {
        "plan": "PRIME",
        "orient": "PRIME",
        "prime": "PRIME",
        "teach": "TEACH",
        "explain": "TEACH",
        "calibrate": "CALIBRATE",
        "prepare": "PRIME",
        "encode": "ENCODE",
        "interrogate": "REFERENCE",
        "reference": "REFERENCE",
        "consolidate": "REFERENCE",
        "retrieve": "RETRIEVE",
        "refine": "OVERLEARN",
        "overlearn": "OVERLEARN",
    }.get(category, "ENCODE")
    return legacy


def _summarize_stage_truth(blocks: list[dict[str, Any]]) -> dict[str, Any]:
    stage_sequence = [
        _normalize_control_stage(block.get("control_stage"), block.get("category"))
        for block in blocks
    ]
    selected_blocks: list[str] = []
    for stage in stage_sequence:
        if stage not in selected_blocks:
            selected_blocks.append(stage)
    return {
        "stage_sequence": stage_sequence,
        "selected_blocks": selected_blocks,
        "stage_coverage": {
            stage: stage in stage_sequence
            for stage in (
                "PRIME",
                "TEACH",
                "CALIBRATE",
                "ENCODE",
                "REFERENCE",
                "RETRIEVE",
                "OVERLEARN",
            )
        },
    }


def _enforce_reference_dependency(block_method_ids: list[str]) -> tuple[list[str], bool]:
    first_retrieve_idx = next(
        (idx for idx, method_id in enumerate(block_method_ids) if method_id.startswith("M-RET-")),
        None,
    )
    if first_retrieve_idx is None:
        return list(block_method_ids), False

    first_reference_idx = next(
        (idx for idx, method_id in enumerate(block_method_ids) if method_id in _REFERENCE_TARGET_METHODS),
        None,
    )
    if first_reference_idx is not None and first_reference_idx < first_retrieve_idx:
        return list(block_method_ids), False

    stripped = [method_id for method_id in block_method_ids if method_id not in _REFERENCE_TARGET_METHODS]
    insert_at = next(
        (idx for idx, method_id in enumerate(stripped) if method_id.startswith("M-RET-")),
        len(stripped),
    )
    fixed = stripped[:insert_at] + sorted(_REFERENCE_TARGET_METHODS) + stripped[insert_at:]
    return fixed, True


@lru_cache(maxsize=1)
def _load_method_stage_map() -> dict[str, str]:
    stage_map: dict[str, str] = {}
    if yaml is None or not _METHODS_DIR.exists():
        return stage_map

    for path in sorted(_METHODS_DIR.glob("*.yaml")):
        data = _safe_yaml_load(path)
        method_id = str(data.get("id") or "").strip()
        if not method_id:
            continue
        stage_map[method_id] = _normalize_control_stage(
            data.get("control_stage"),
            data.get("category"),
        )
    return stage_map


@lru_cache(maxsize=1)
def get_chain_catalog() -> dict[str, dict[str, Any]]:
    method_stage_map = _load_method_stage_map()
    catalog: dict[str, dict[str, Any]] = {}

    if yaml is None or not _CHAINS_DIR.exists():
        return dict(_FALLBACK_CHAIN_CATALOG)

    for path in sorted(_CHAINS_DIR.glob("*.yaml")):
        data = _safe_yaml_load(path)
        chain_id = str(data.get("id") or "").strip()
        chain_name = str(data.get("name") or "").strip()
        block_method_ids = [
            str(method_id).strip()
            for method_id in (data.get("blocks") or [])
            if str(method_id or "").strip()
        ]
        if not chain_id or not chain_name or not block_method_ids:
            continue

        stage_blocks = [
            {
                "name": method_id,
                "control_stage": method_stage_map.get(method_id) or "ENCODE",
            }
            for method_id in block_method_ids
        ]
        stage_truth = _summarize_stage_truth(stage_blocks)
        requires_reference_targets = bool(data.get("requires_reference_targets"))
        _, dependency_fix_applied = _enforce_reference_dependency(block_method_ids)

        catalog[chain_id] = {
            "chain_id": chain_id,
            "chain_name": chain_name,
            "block_method_ids": block_method_ids,
            "stage_sequence": stage_truth["stage_sequence"],
            "selected_blocks": stage_truth["selected_blocks"],
            "stage_coverage": stage_truth["stage_coverage"],
            "context_tags": data.get("context_tags") if isinstance(data.get("context_tags"), dict) else {},
            "allowed_modes": list(data.get("allowed_modes") or []),
            "runtime_profile": data.get("runtime_profile") if isinstance(data.get("runtime_profile"), dict) else {},
            "requires_reference_targets": requires_reference_targets,
            "dependency_fix_applied": dependency_fix_applied if requires_reference_targets else False,
        }

    return catalog or dict(_FALLBACK_CHAIN_CATALOG)


def reload_chain_catalog() -> int:
    _load_method_stage_map.cache_clear()
    get_chain_catalog.cache_clear()
    return len(get_chain_catalog())


def get_chain_metadata(chain_id: str) -> dict[str, Any] | None:
    chain = get_chain_catalog().get(str(chain_id or "").strip())
    return dict(chain) if isinstance(chain, dict) else None


def _route_chain_id(
    assessment_mode: str,
    time_available_min: int,
    energy: str,
    dominant_error: str | None = None,
) -> tuple[str, dict[str, Any]]:
    chain_id = "C-FE-STD"
    overrides: dict[str, Any] = {}

    if energy == "low" or time_available_min < 25:
        return "C-FE-MIN", {"retrieval_support": "minimal", "timed": "off"}

    if assessment_mode == "procedure":
        chain_id = "C-FE-PRO"
    elif assessment_mode in ["definition", "recognition"]:
        chain_id = "C-FE-MIN"
    elif assessment_mode in ["computation", "spatial"]:
        chain_id = "C-FE-STD"
        overrides["retrieval_support"] = "guided"
    else:
        chain_id = "C-FE-STD"

    if dominant_error == "Confusion":
        overrides["near_miss_intensity"] = "high"
    elif dominant_error == "Speed":
        overrides["timed"] = "hard"
    elif dominant_error == "Rule":
        overrides["near_miss_intensity"] = "high"
    elif dominant_error == "Procedure":
        chain_id = "C-FE-PRO"

    if chain_id not in get_chain_catalog():
        fallback_chain = "C-FE-STD" if "C-FE-STD" in get_chain_catalog() else next(iter(get_chain_catalog()), chain_id)
        chain_id = fallback_chain

    return chain_id, overrides


def select_chain(assessment_mode, time_available_min, energy, dominant_error=None):
    """
    Deterministic Router for CP-MSS v2.0.

    Inputs:
        - assessment_mode: str - Learning goal (procedure, classification, mechanism, etc.)
        - time_available_min: int - Time budget in minutes
        - energy: str - User energy level (low, medium, high)
        - dominant_error: str|None - Recent error pattern (Confusion, Speed, Rule, Procedure, Recall)

    Output:
        - tuple: (chain_id, knob_overrides)
    """
    return _route_chain_id(
        assessment_mode=assessment_mode,
        time_available_min=time_available_min,
        energy=energy,
        dominant_error=dominant_error,
    )


def select_chain_from_request(data: dict) -> tuple:
    """
    Convenience wrapper that extracts knobs from a request dict.

    Expected keys in data:
        - assessment_mode: str (default: 'mechanism')
        - time_available_min: int (default: 45)
        - energy: str (default: 'medium')
        - recent_errors: list (default: [])
    """
    mode = data.get("assessment_mode", "mechanism")
    time_min = data.get("time_available_min", 45)
    energy = data.get("energy", "medium")
    error_history = data.get("recent_errors", [])
    dominant_error = error_history[0] if error_history else None

    return select_chain(mode, time_min, energy, dominant_error)

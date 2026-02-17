#!/usr/bin/env python3
"""Deterministic selector policy for CP-MSS chain routing.

This module is tooling-side (sop/tools) and mirrors control-plane policy rules
in an executable, testable form.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

POLICY_VERSION = "v1.0"

REFERENCE_TARGET_METHODS = ("M-REF-003", "M-REF-004")


@dataclass(frozen=True)
class SelectorInput:
    assessment_mode: str
    stage: str
    energy: str
    time_available: int
    class_type: str | None = None
    prior_exposure_band: str = "new"
    prior_rsr: float | None = None
    prior_calibration_gap: float | None = None
    unresolved_error_hist: dict[str, int] | None = None
    selector_policy_version: str = POLICY_VERSION


@dataclass(frozen=True)
class SelectionResult:
    chain_id: str
    chain_name: str
    selected_blocks: list[str]
    dependency_fix_applied: bool
    score_tuple: tuple[int, int, int, int, int]
    selector_policy_version: str


def _to_int(value: Any, fallback: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def load_chain_catalog(chains_dir: Path) -> list[dict[str, Any]]:
    chains: list[dict[str, Any]] = []
    for path in sorted(chains_dir.glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        if not isinstance(data, dict):
            continue
        data["_path"] = str(path)
        chains.append(data)
    return chains


def _preferred_first_exposure_chain(mode: str) -> str | None:
    mapping = {
        "definition": "C-FE-001",
        "classification": "C-FE-001",
        "recognition": "C-FE-001",
        "mechanism": "C-DP-001",
        "computation": "C-DP-001",
        "procedure": "C-DP-001",
        "spatial": "C-DA-001",
        "synthesis": "C-SW-001",
    }
    return mapping.get(mode)


def _score_chain(chain: dict[str, Any], selector_input: SelectorInput) -> tuple[int, int, int, int, int]:
    tags = chain.get("context_tags") or {}
    if not isinstance(tags, dict):
        tags = {}

    allowed_modes = chain.get("allowed_modes") or []
    if not isinstance(allowed_modes, list):
        allowed_modes = []

    chain_mode_exact = 1 if selector_input.assessment_mode in {str(m) for m in allowed_modes} else 0

    chain_class = str(tags.get("class_type") or "").strip()
    if not chain_class:
        chain_class_exact = 1 if selector_input.class_type in (None, "", "general") else 0
    else:
        chain_class_exact = 1 if selector_input.class_type == chain_class else 0

    chain_time = _to_int(tags.get("time_available"), 0)
    if chain_time <= selector_input.time_available:
        # Prefer closest non-negative fit.
        time_fit = 10_000 - (selector_input.time_available - chain_time)
    else:
        # Penalize overtime fits.
        time_fit = -(chain_time - selector_input.time_available)

    chain_energy = str(tags.get("energy") or "").strip()
    chain_energy_exact = 1 if chain_energy == selector_input.energy else 0

    chain_priority = 0
    if selector_input.stage == "first_exposure":
        preferred = _preferred_first_exposure_chain(selector_input.assessment_mode)
        if preferred and str(chain.get("id", "")) == preferred:
            chain_priority = 10

    return (chain_mode_exact, chain_class_exact, time_fit, chain_energy_exact, chain_priority)


def enforce_reference_dependency(blocks: list[str]) -> tuple[list[str], bool]:
    """Ensure RETRIEVE blocks do not run before reference target producers."""
    first_retrieve_idx = None
    for idx, block_id in enumerate(blocks):
        if str(block_id).startswith("M-RET-"):
            first_retrieve_idx = idx
            break

    if first_retrieve_idx is None:
        return list(blocks), False

    first_reference_idx = None
    for idx, block_id in enumerate(blocks):
        if block_id in REFERENCE_TARGET_METHODS:
            first_reference_idx = idx
            break

    if first_reference_idx is not None and first_reference_idx < first_retrieve_idx:
        return list(blocks), False

    stripped = [b for b in blocks if b not in REFERENCE_TARGET_METHODS]
    insert_at = next(i for i, b in enumerate(stripped) if str(b).startswith("M-RET-"))
    fixed = stripped[:insert_at] + list(REFERENCE_TARGET_METHODS) + stripped[insert_at:]
    return fixed, True


def select_chain(chains: list[dict[str, Any]], selector_input: SelectorInput) -> SelectionResult:
    """Deterministically select one chain from the provided catalog."""
    candidates: list[dict[str, Any]] = []
    for chain in chains:
        tags = chain.get("context_tags") or {}
        if not isinstance(tags, dict):
            continue
        chain_stage = str(tags.get("stage") or "").strip()
        if chain_stage and chain_stage != selector_input.stage:
            continue

        allowed_modes = chain.get("allowed_modes") or []
        if selector_input.assessment_mode not in {str(m) for m in allowed_modes}:
            continue

        candidates.append(chain)

    if not candidates:
        raise ValueError(
            f"No candidate chains for stage='{selector_input.stage}', "
            f"assessment_mode='{selector_input.assessment_mode}'"
        )

    scored: list[tuple[tuple[int, int, int, int, int], dict[str, Any]]] = [
        (_score_chain(chain, selector_input), chain) for chain in candidates
    ]

    # Descending score tuple with lexicographic chain_id tie-break.
    scored.sort(
        key=lambda item: (
            -item[0][0],
            -item[0][1],
            -item[0][2],
            -item[0][3],
            -item[0][4],
            str(item[1].get("id", "")),
        )
    )
    score, chosen = scored[0]

    blocks = [str(b) for b in (chosen.get("blocks") or [])]
    requires_reference_targets = bool(chosen.get("requires_reference_targets"))
    if requires_reference_targets:
        blocks, dependency_fix_applied = enforce_reference_dependency(blocks)
    else:
        dependency_fix_applied = False

    return SelectionResult(
        chain_id=str(chosen.get("id", "")),
        chain_name=str(chosen.get("name", "")),
        selected_blocks=blocks,
        dependency_fix_applied=dependency_fix_applied,
        score_tuple=score,
        selector_policy_version=selector_input.selector_policy_version,
    )


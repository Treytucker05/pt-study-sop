#!/usr/bin/env python3
"""Tests for deterministic selector policy."""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure sop/tools/ is importable
TOOLS_DIR = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS_DIR))

from selector_policy import SelectorInput, enforce_reference_dependency, select_chain


def _chain(
    chain_id: str,
    *,
    modes: list[str],
    stage: str = "first_exposure",
    energy: str = "high",
    time_available: int = 40,
    blocks: list[str] | None = None,
    class_type: str | None = None,
    requires_reference_targets: bool = True,
) -> dict:
    tags = {"stage": stage, "energy": energy, "time_available": time_available}
    if class_type:
        tags["class_type"] = class_type
    return {
        "id": chain_id,
        "name": chain_id,
        "blocks": blocks or ["M-PRE-001", "M-RET-001"],
        "allowed_modes": modes,
        "requires_reference_targets": requires_reference_targets,
        "context_tags": tags,
    }


def test_dependency_enforcement_inserts_reference_targets_before_retrieve() -> None:
    fixed, changed = enforce_reference_dependency(["M-PRE-001", "M-RET-001", "M-OVR-001"])
    assert changed is True
    assert fixed[:4] == ["M-PRE-001", "M-REF-003", "M-REF-004", "M-RET-001"]


def test_selector_is_deterministic_for_identical_inputs() -> None:
    chains = [
        _chain("C-FE-001", modes=["definition", "classification", "recognition"]),
        _chain("C-AD-001", modes=["definition", "classification", "recognition"]),
    ]
    selector_input = SelectorInput(
        assessment_mode="definition",
        stage="first_exposure",
        energy="high",
        time_available=40,
        class_type="general",
    )

    first = select_chain(chains, selector_input)
    second = select_chain(chains, selector_input)
    third = select_chain(chains, selector_input)

    assert first.chain_id == second.chain_id == third.chain_id
    assert first.selected_blocks == second.selected_blocks == third.selected_blocks


def test_selector_uses_lexicographic_tie_break() -> None:
    chains = [
        _chain("C-ZZ-999", modes=["definition"], requires_reference_targets=False, blocks=["M-PRE-001"]),
        _chain("C-AA-001", modes=["definition"], requires_reference_targets=False, blocks=["M-PRE-001"]),
    ]
    selector_input = SelectorInput(
        assessment_mode="definition",
        stage="first_exposure",
        energy="high",
        time_available=40,
    )
    result = select_chain(chains, selector_input)
    assert result.chain_id == "C-AA-001"


def test_selector_prefers_first_exposure_mode_mapping() -> None:
    chains = [
        _chain("C-FE-001", modes=["classification", "definition", "recognition"]),
        _chain("C-DA-001", modes=["spatial"]),
        _chain("C-SW-001", modes=["synthesis"]),
    ]
    selector_input = SelectorInput(
        assessment_mode="spatial",
        stage="first_exposure",
        energy="high",
        time_available=40,
    )
    result = select_chain(chains, selector_input)
    assert result.chain_id == "C-DA-001"


def test_selector_accepts_cold_start_null_inputs() -> None:
    chains = [
        _chain("C-FE-001", modes=["definition"], requires_reference_targets=False, blocks=["M-PRE-001"]),
    ]
    selector_input = SelectorInput(
        assessment_mode="definition",
        stage="first_exposure",
        energy="medium",
        time_available=25,
        prior_rsr=None,
        prior_calibration_gap=None,
        unresolved_error_hist=None,
    )
    result = select_chain(chains, selector_input)
    assert result.chain_id == "C-FE-001"
    assert result.selector_policy_version == "v1.0"


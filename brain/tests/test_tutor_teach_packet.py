"""Unit tests for TEACH packet assembly in api_tutor_turns."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dashboard.api_tutor_turns import _build_teach_context


def test_build_teach_context_includes_wave3_runtime_fields():
    teach_context = _build_teach_context(
        session={"topic": "Neuro Week 7", "unknowns": ["[[Neural Crest]]"]},
        block_info={
            "name": "Story Spine",
            "control_stage": "TEACH",
        },
        chain_info={
            "runtime_profile": {
                "assessment_mode": "procedure",
            }
        },
        content_filter={},
        map_of_contents={
            "objective_ids": ["OBJ-6"],
            "path": "Courses/Neuro/Week 7/_Map of Contents.md",
        },
        objective_scope="single_focus",
        focus_objective_id="OBJ-6",
        selected_material_labels=["Week7.pdf"],
    )

    assert teach_context is not None
    assert teach_context["concept_type"] == "procedure"
    assert teach_context["depth_start"] == "L0"
    assert teach_context["depth_ceiling"] == "L4"
    assert teach_context["depth_path"] == ["L0", "L3", "L4"]
    assert teach_context["fallback_depths"] == ["L1", "L2"]
    assert teach_context["first_bridge"] == "story"
    assert teach_context["required_close_artifact"] == "mini_process_flow"
    assert teach_context["close_artifact_status"] == "pending"
    assert teach_context["function_confirmation_gate"]["mode"] == "low_friction_function_confirmation"
    assert teach_context["function_confirmation_gate"]["state"] == "pending"
    assert teach_context["function_confirmation_gate"]["unlocks"] == "L4_precision"
    assert teach_context["function_confirmation_gate"]["teach_back_default_gate"] == "false"
    assert teach_context["mnemonic_slot_policy"]["mode"] == "kwik_lite"
    assert teach_context["mnemonic_slot_policy"]["position"] == "post_artifact_pre_full_calibrate"


def test_build_teach_context_skips_for_non_teach_blocks():
    assert (
        _build_teach_context(
            session={"topic": "Week 7"},
            block_info={"name": "One-Page Anchor", "control_stage": "REFERENCE"},
            chain_info={"runtime_profile": {}},
            content_filter={},
            map_of_contents=None,
            objective_scope="module_all",
            focus_objective_id="",
            selected_material_labels=[],
        )
        is None
    )

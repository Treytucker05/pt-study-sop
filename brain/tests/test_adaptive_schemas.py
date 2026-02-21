"""Tests for adaptive mastery system schemas and validators (Phase 0)."""
from __future__ import annotations

import pytest


# ---------------------------------------------------------------------------
# Task 0.1 — Skill schema
# ---------------------------------------------------------------------------

class TestSkillSchema:
    """Skill is the atomic unit of mastery; skill_id is mandatory."""

    def test_valid_skill_accepted(self):
        from brain.adaptive.schemas import Skill, validate_skill

        skill = Skill(
            skill_id="cardio_co_determinants",
            name="Determinants of Cardiac Output",
            description="Preload, afterload, contractility, HR",
            prereqs=["cardio_heart_anatomy"],
            tags=["cardiovascular", "hemodynamics"],
            system="cardiovascular",
        )
        result = validate_skill(skill)
        assert result.valid is True
        assert result.errors == []

    def test_minimal_skill_accepted(self):
        """Only skill_id and name are required."""
        from brain.adaptive.schemas import Skill, validate_skill

        skill = Skill(skill_id="neuro_umn", name="Upper Motor Neuron")
        result = validate_skill(skill)
        assert result.valid is True

    def test_missing_skill_id_rejected(self):
        """skill_id is the primary key — must be present and non-empty."""
        from brain.adaptive.schemas import Skill, validate_skill

        skill = Skill(skill_id="", name="Bad Skill")
        result = validate_skill(skill)
        assert result.valid is False
        assert any("skill_id" in e for e in result.errors)

    def test_missing_name_rejected(self):
        from brain.adaptive.schemas import Skill, validate_skill

        skill = Skill(skill_id="valid_id", name="")
        result = validate_skill(skill)
        assert result.valid is False
        assert any("name" in e for e in result.errors)

    def test_skill_id_no_spaces(self):
        """skill_id must be a slug (snake_case, no spaces)."""
        from brain.adaptive.schemas import Skill, validate_skill

        skill = Skill(skill_id="has spaces", name="Test")
        result = validate_skill(skill)
        assert result.valid is False
        assert any("skill_id" in e for e in result.errors)

    def test_skill_to_dict_roundtrip(self):
        from brain.adaptive.schemas import Skill, skill_from_dict

        skill = Skill(
            skill_id="msk_rom",
            name="Range of Motion",
            prereqs=["msk_joint_anatomy"],
            tags=["musculoskeletal"],
        )
        d = skill.to_dict()
        assert d["skill_id"] == "msk_rom"
        assert d["prereqs"] == ["msk_joint_anatomy"]

        restored = skill_from_dict(d)
        assert restored.skill_id == skill.skill_id
        assert restored.prereqs == skill.prereqs

    def test_skill_from_dict_missing_skill_id_raises(self):
        from brain.adaptive.schemas import skill_from_dict

        with pytest.raises((KeyError, ValueError)):
            skill_from_dict({"name": "No ID"})


# ---------------------------------------------------------------------------
# Task 0.2 — Typed relation vocabulary
# ---------------------------------------------------------------------------

# 20 sample edges covering all 8 relation types, drawn from PT curriculum
SAMPLE_EDGES = [
    # requires (A requires B to be understood first)
    ("cardio_co_determinants", "requires", "cardio_heart_anatomy"),
    ("neuro_corticospinal", "requires", "neuro_umn"),
    ("pulm_ventilation", "requires", "pulm_lung_anatomy"),
    # part_of (A is a sub-concept of B)
    ("cardio_preload", "part_of", "cardio_co_determinants"),
    ("neuro_umn", "part_of", "neuro_motor_system"),
    # causes (A physiologically causes B)
    ("cardio_increased_preload", "causes", "cardio_increased_sv"),
    ("neuro_umn_lesion", "causes", "neuro_spasticity"),
    ("pulm_airway_obstruction", "causes", "pulm_increased_resistance"),
    # inhibits (A suppresses or blocks B)
    ("cardio_vagal_tone", "inhibits", "cardio_hr_increase"),
    ("neuro_gaba", "inhibits", "neuro_excitatory_transmission"),
    # increases (A raises the value/activity of B)
    ("cardio_exercise", "increases", "cardio_hr"),
    ("cardio_sympathetic", "increases", "cardio_contractility"),
    # decreases (A lowers the value/activity of B)
    ("cardio_beta_blockers", "decreases", "cardio_hr"),
    ("pulm_bronchospasm", "decreases", "pulm_airflow"),
    # compares_to (A and B are contrasted/compared)
    ("neuro_umn", "compares_to", "neuro_lmn"),
    ("cardio_systole", "compares_to", "cardio_diastole"),
    ("msk_concentric", "compares_to", "msk_eccentric"),
    # defines (A gives the formal definition of B)
    ("cardio_co_formula", "defines", "cardio_co_determinants"),
    ("neuro_dermatome_def", "defines", "neuro_dermatome"),
    ("pulm_fev1_def", "defines", "pulm_fev1"),
]


class TestEdgeTypes:
    """Each edge maps to exactly one type from the frozen vocabulary."""

    def test_all_eight_types_exist(self):
        from brain.adaptive.schemas import EdgeType

        expected = {
            "requires", "part_of", "causes", "inhibits",
            "increases", "decreases", "compares_to", "defines",
        }
        assert {e.value for e in EdgeType} == expected

    def test_sample_edges_each_map_to_one_type(self):
        from brain.adaptive.schemas import EdgeType

        valid_types = {e.value for e in EdgeType}
        for src, rel, tgt in SAMPLE_EDGES:
            assert rel in valid_types, f"Edge ({src})-[{rel}]->({tgt}) has unknown type"

    def test_20_sample_edges(self):
        assert len(SAMPLE_EDGES) == 20

    def test_direction_rules_defined(self):
        """Every edge type has a direction rule (directed or undirected)."""
        from brain.adaptive.schemas import EDGE_DIRECTION

        expected_types = {
            "requires", "part_of", "causes", "inhibits",
            "increases", "decreases", "compares_to", "defines",
        }
        assert set(EDGE_DIRECTION.keys()) == expected_types
        for etype, direction in EDGE_DIRECTION.items():
            assert direction in ("directed", "undirected"), (
                f"{etype} has invalid direction: {direction}"
            )

    def test_compares_to_is_undirected(self):
        from brain.adaptive.schemas import EDGE_DIRECTION

        assert EDGE_DIRECTION["compares_to"] == "undirected"

    def test_requires_is_directed(self):
        from brain.adaptive.schemas import EDGE_DIRECTION

        assert EDGE_DIRECTION["requires"] == "directed"

    def test_edge_validation_valid(self):
        from brain.adaptive.schemas import Edge, validate_edge

        edge = Edge(
            source="cardio_preload",
            relation="part_of",
            target="cardio_co_determinants",
        )
        result = validate_edge(edge)
        assert result.valid is True

    def test_edge_validation_unknown_type_rejected(self):
        from brain.adaptive.schemas import Edge, validate_edge

        edge = Edge(source="a", relation="unknown_relation", target="b")
        result = validate_edge(edge)
        assert result.valid is False
        assert any("relation" in e for e in result.errors)


# ---------------------------------------------------------------------------
# Task 0.3 — Epitome artifact
# ---------------------------------------------------------------------------

class TestEpitomeArtifact:
    """Epitome = Elaboration Theory summary for a topic cluster."""

    def test_valid_epitome_accepted(self):
        from brain.adaptive.schemas import Epitome, validate_epitome

        ep = Epitome(
            epitome_id="cardio_hemodynamics",
            topic="Hemodynamics",
            mechanism="Blood flow governed by pressure gradients and resistance (Ohm's analog)",
            simplest_case="CO = HR x SV; flow = delta_P / R",
            boundaries="Breaks down in turbulent flow or extreme vasoconstriction",
            example="Exercise: increased HR + increased venous return → increased CO",
            core_node_ids=[
                "cardio_co_determinants",
                "cardio_preload",
                "cardio_afterload",
                "cardio_contractility",
                "cardio_hr",
            ],
        )
        result = validate_epitome(ep)
        assert result.valid is True

    def test_missing_mechanism_rejected(self):
        from brain.adaptive.schemas import Epitome, validate_epitome

        ep = Epitome(
            epitome_id="bad",
            topic="Test",
            mechanism="",
            simplest_case="x",
            boundaries="y",
            example="",
            core_node_ids=["a", "b", "c"],
        )
        result = validate_epitome(ep)
        assert result.valid is False
        assert any("mechanism" in e for e in result.errors)

    def test_missing_example_rejected(self):
        from brain.adaptive.schemas import Epitome, validate_epitome

        ep = Epitome(
            epitome_id="bad",
            topic="Test",
            mechanism="Some mechanism",
            simplest_case="x",
            boundaries="y",
            example="",
            core_node_ids=["a", "b", "c"],
        )
        result = validate_epitome(ep)
        assert result.valid is False
        assert any("example" in e for e in result.errors)

    def test_too_few_core_nodes_rejected(self):
        """Epitome must link to 3-7 core nodes."""
        from brain.adaptive.schemas import Epitome, validate_epitome

        ep = Epitome(
            epitome_id="small",
            topic="Test",
            mechanism="Mech",
            simplest_case="x",
            boundaries="y",
            example="Example",
            core_node_ids=["a", "b"],  # only 2
        )
        result = validate_epitome(ep)
        assert result.valid is False
        assert any("core_node_ids" in e for e in result.errors)

    def test_too_many_core_nodes_rejected(self):
        from brain.adaptive.schemas import Epitome, validate_epitome

        ep = Epitome(
            epitome_id="big",
            topic="Test",
            mechanism="Mech",
            simplest_case="x",
            boundaries="y",
            example="Example",
            core_node_ids=[f"n{i}" for i in range(8)],  # 8 > 7
        )
        result = validate_epitome(ep)
        assert result.valid is False
        assert any("core_node_ids" in e for e in result.errors)


# ---------------------------------------------------------------------------
# Task 0.4 — Advance Organizer artifact
# ---------------------------------------------------------------------------

class TestAdvanceOrganizerArtifact:
    """Advance Organizer = big-picture map skeleton for a topic cluster."""

    def test_valid_organizer_accepted(self):
        from brain.adaptive.schemas import AdvanceOrganizer, validate_advance_organizer

        ao = AdvanceOrganizer(
            organizer_id="cardio_overview",
            topic="Cardiovascular System",
            anchor_concepts=[
                "Heart anatomy", "Cardiac output", "Preload",
                "Afterload", "Contractility",
            ],
            edges=[
                ("cardio_preload", "part_of", "cardio_co_determinants"),
                ("cardio_afterload", "part_of", "cardio_co_determinants"),
                ("cardio_contractility", "part_of", "cardio_co_determinants"),
            ],
            what_changes_what="Preload, afterload, and contractility independently modulate SV → CO.",
        )
        result = validate_advance_organizer(ao)
        assert result.valid is True

    def test_fewer_than_5_anchors_rejected(self):
        from brain.adaptive.schemas import AdvanceOrganizer, validate_advance_organizer

        ao = AdvanceOrganizer(
            organizer_id="small",
            topic="Test",
            anchor_concepts=["a", "b", "c", "d"],  # only 4
            edges=[("a", "requires", "b")],
            what_changes_what="Stuff",
        )
        result = validate_advance_organizer(ao)
        assert result.valid is False
        assert any("anchor" in e.lower() for e in result.errors)

    def test_no_edges_rejected(self):
        from brain.adaptive.schemas import AdvanceOrganizer, validate_advance_organizer

        ao = AdvanceOrganizer(
            organizer_id="flat",
            topic="Test",
            anchor_concepts=["a", "b", "c", "d", "e"],
            edges=[],
            what_changes_what="Nothing",
        )
        result = validate_advance_organizer(ao)
        assert result.valid is False
        assert any("edge" in e.lower() for e in result.errors)

    def test_more_than_10_anchors_accepted(self):
        """Upper bound is 10 anchors — more should be warned but not rejected."""
        from brain.adaptive.schemas import AdvanceOrganizer, validate_advance_organizer

        ao = AdvanceOrganizer(
            organizer_id="large",
            topic="Test",
            anchor_concepts=[f"concept_{i}" for i in range(12)],
            edges=[("a", "requires", "b")],
            what_changes_what="Lots of things",
        )
        result = validate_advance_organizer(ao)
        # Still valid but may have warnings — validator should not reject
        assert result.valid is True


# ---------------------------------------------------------------------------
# Task 0.5 — Pedagogical move library
# ---------------------------------------------------------------------------

class TestPedagogicalMoves:
    """Tutor outputs only allowed move types per learning phase."""

    def test_all_six_move_types_exist(self):
        from brain.adaptive.schemas import MoveType

        expected = {"hint", "analogy", "metacognitive_prompt",
                    "evaluate_work", "teach_back", "synthesis"}
        assert {m.value for m in MoveType} == expected

    def test_phase_move_map_covers_all_phases(self):
        """Every learning phase has at least one allowed move."""
        from brain.adaptive.schemas import PHASE_ALLOWED_MOVES

        expected_phases = {"prime", "encode", "retrieve", "overlearn"}
        assert set(PHASE_ALLOWED_MOVES.keys()) == expected_phases
        for phase, moves in PHASE_ALLOWED_MOVES.items():
            assert len(moves) >= 1, f"Phase {phase} has no allowed moves"

    def test_teach_back_only_in_retrieve_and_overlearn(self):
        """teach_back is a gate — only allowed in retrieve/overlearn phases."""
        from brain.adaptive.schemas import PHASE_ALLOWED_MOVES

        for phase in ("prime", "encode"):
            assert "teach_back" not in PHASE_ALLOWED_MOVES[phase], (
                f"teach_back should not be allowed in {phase} phase"
            )
        for phase in ("retrieve", "overlearn"):
            assert "teach_back" in PHASE_ALLOWED_MOVES[phase]

    def test_validate_move_accepts_allowed(self):
        from brain.adaptive.schemas import validate_move

        result = validate_move("encode", "hint")
        assert result.valid is True

    def test_validate_move_rejects_disallowed(self):
        from brain.adaptive.schemas import validate_move

        result = validate_move("prime", "teach_back")
        assert result.valid is False
        assert any("teach_back" in e for e in result.errors)


# ---------------------------------------------------------------------------
# Task 0.6 — Mastery thresholds policy
# ---------------------------------------------------------------------------

class TestMasteryThresholds:
    """Configurable thresholds drive unlock decisions."""

    def test_default_config_loads(self):
        from brain.adaptive.schemas import MasteryConfig, default_mastery_config

        cfg = default_mastery_config()
        assert isinstance(cfg, MasteryConfig)
        assert 0 < cfg.unlock_threshold <= 1.0
        assert 0 < cfg.mastered_threshold <= 1.0

    def test_095_threshold_unlocks_at_095(self):
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig(unlock_threshold=0.95, mastered_threshold=0.98)
        assert 0.96 >= cfg.unlock_threshold  # unlocks
        assert 0.94 < cfg.unlock_threshold    # does not unlock (0.94 < 0.95)

    def test_098_threshold_blocks_at_096(self):
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig(unlock_threshold=0.98, mastered_threshold=0.99)
        assert 0.96 < cfg.unlock_threshold  # still locked

    def test_same_mastery_different_thresholds_different_decisions(self):
        """Core requirement: same mastery values yield different unlock decisions."""
        from brain.adaptive.schemas import MasteryConfig, is_unlocked

        mastery_value = 0.96

        cfg_low = MasteryConfig(unlock_threshold=0.95, mastered_threshold=0.98)
        cfg_high = MasteryConfig(unlock_threshold=0.98, mastered_threshold=0.99)

        assert is_unlocked(mastery_value, cfg_low) is True
        assert is_unlocked(mastery_value, cfg_high) is False

    def test_config_validates_thresholds_in_range(self):
        from brain.adaptive.schemas import MasteryConfig, validate_mastery_config

        bad = MasteryConfig(unlock_threshold=1.5, mastered_threshold=0.5)
        result = validate_mastery_config(bad)
        assert result.valid is False

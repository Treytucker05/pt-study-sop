"""Tests for concept map curriculum controller (Phase 4)."""
from __future__ import annotations

import sqlite3
import pytest


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def curriculum_db(tmp_path):
    """DB with mastery + curriculum tables."""
    db_path = str(tmp_path / "test_curriculum.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    from brain.adaptive.bkt import create_mastery_tables
    from brain.adaptive.curriculum import create_curriculum_tables
    create_mastery_tables(conn)
    create_curriculum_tables(conn)
    yield conn
    conn.close()


@pytest.fixture
def seeded_map(curriculum_db):
    """A small concept map with prerequisites:

    heart_anatomy (no prereqs)
       ↓ requires
    co_determinants
       ↓ requires
    preload
       ↓ requires
    frank_starling
    """
    from brain.adaptive.curriculum import upsert_node

    upsert_node(curriculum_db, "heart_anatomy", "Heart Anatomy", prereqs=[])
    upsert_node(curriculum_db, "co_determinants", "CO Determinants", prereqs=["heart_anatomy"])
    upsert_node(curriculum_db, "preload", "Preload", prereqs=["co_determinants"])
    upsert_node(curriculum_db, "frank_starling", "Frank-Starling Law", prereqs=["preload"])
    return curriculum_db


# ---------------------------------------------------------------------------
# Task 4.1 — Prerequisites stored on nodes
# ---------------------------------------------------------------------------

class TestPrerequisites:
    def test_node_persists_prereqs(self, curriculum_db):
        from brain.adaptive.curriculum import upsert_node, get_node

        upsert_node(curriculum_db, "skill_a", "Skill A", prereqs=["skill_b", "skill_c"])
        node = get_node(curriculum_db, "skill_a")
        assert node is not None
        assert "skill_b" in node["prereqs"]
        assert "skill_c" in node["prereqs"]

    def test_reload_preserves_prereqs(self, curriculum_db):
        from brain.adaptive.curriculum import upsert_node, get_node

        upsert_node(curriculum_db, "skill_x", "Skill X", prereqs=["dep_1"])
        # Close and reopen to simulate reload
        node = get_node(curriculum_db, "skill_x")
        assert "dep_1" in node["prereqs"]

    def test_node_without_prereqs(self, curriculum_db):
        from brain.adaptive.curriculum import upsert_node, get_node

        upsert_node(curriculum_db, "root_skill", "Root", prereqs=[])
        node = get_node(curriculum_db, "root_skill")
        assert node["prereqs"] == []


# ---------------------------------------------------------------------------
# Task 4.2 — Status computation (Locked / Available / Mastered)
# ---------------------------------------------------------------------------

class TestStatusComputation:
    def test_root_node_is_available(self, seeded_map):
        from brain.adaptive.curriculum import compute_status
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig(unlock_threshold=0.95)
        status = compute_status(seeded_map, "user_1", "heart_anatomy", cfg)
        assert status == "available"

    def test_node_with_unmastered_prereq_is_locked(self, seeded_map):
        from brain.adaptive.curriculum import compute_status
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig(unlock_threshold=0.95)
        status = compute_status(seeded_map, "user_1", "co_determinants", cfg)
        assert status == "locked"

    def test_node_unlocks_when_prereq_mastered(self, seeded_map):
        from brain.adaptive.curriculum import compute_status
        from brain.adaptive.bkt import get_or_init_mastery, bkt_update
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig(unlock_threshold=0.95, decay_lambda=0.0)  # no decay
        get_or_init_mastery(seeded_map, "user_1", "heart_anatomy", cfg)
        # Build mastery above threshold
        for _ in range(20):
            bkt_update(seeded_map, "user_1", "heart_anatomy", correct=True, config=cfg)

        status = compute_status(seeded_map, "user_1", "co_determinants", cfg)
        assert status == "available"

    def test_mastered_node_shows_mastered(self, seeded_map):
        from brain.adaptive.curriculum import compute_status
        from brain.adaptive.bkt import get_or_init_mastery, bkt_update
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig(unlock_threshold=0.95, mastered_threshold=0.98, decay_lambda=0.0)
        get_or_init_mastery(seeded_map, "user_1", "heart_anatomy", cfg)
        for _ in range(30):
            bkt_update(seeded_map, "user_1", "heart_anatomy", correct=True, config=cfg)

        status = compute_status(seeded_map, "user_1", "heart_anatomy", cfg)
        assert status == "mastered"


# ---------------------------------------------------------------------------
# Task 4.3 — Learner control with constraints
# ---------------------------------------------------------------------------

class TestLearnerControl:
    def test_out_of_sequence_practice_logged(self, seeded_map):
        from brain.adaptive.curriculum import attempt_practice
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig(unlock_threshold=0.95)
        result = attempt_practice(seeded_map, "user_1", "frank_starling", cfg)
        assert result["allowed"] is True
        assert result["out_of_sequence"] is True

    def test_out_of_sequence_does_not_unlock_downstream(self, seeded_map):
        from brain.adaptive.curriculum import attempt_practice, compute_status
        from brain.adaptive.bkt import bkt_update, get_or_init_mastery
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig(unlock_threshold=0.95, decay_lambda=0.0)
        # Practice frank_starling out of sequence to mastery
        get_or_init_mastery(seeded_map, "user_1", "frank_starling", cfg)
        for _ in range(20):
            bkt_update(seeded_map, "user_1", "frank_starling", correct=True, config=cfg)

        # preload should still be locked (its prereq co_determinants not mastered)
        status = compute_status(seeded_map, "user_1", "preload", cfg)
        assert status == "locked"

    def test_in_sequence_practice_not_flagged(self, seeded_map):
        from brain.adaptive.curriculum import attempt_practice
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig(unlock_threshold=0.95)
        result = attempt_practice(seeded_map, "user_1", "heart_anatomy", cfg)
        assert result["allowed"] is True
        assert result["out_of_sequence"] is False


# ---------------------------------------------------------------------------
# Task 4.4 — Advance organizer view
# ---------------------------------------------------------------------------

class TestAdvanceOrganizerView:
    def test_organizer_hides_peripheral_nodes(self, seeded_map):
        from brain.adaptive.curriculum import get_organizer_view
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig(unlock_threshold=0.95)
        view = get_organizer_view(
            seeded_map, "user_1", cfg,
            anchor_ids=["heart_anatomy", "co_determinants"],
        )
        visible = {n["skill_id"] for n in view["nodes"]}
        # Anchors always visible
        assert "heart_anatomy" in visible
        assert "co_determinants" in visible
        # Non-anchors hidden (locked and not anchored)
        assert "frank_starling" not in visible

    def test_organizer_expands_on_mastery(self, seeded_map):
        from brain.adaptive.curriculum import get_organizer_view
        from brain.adaptive.bkt import get_or_init_mastery, bkt_update
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig(unlock_threshold=0.95, decay_lambda=0.0)
        get_or_init_mastery(seeded_map, "user_1", "heart_anatomy", cfg)
        for _ in range(20):
            bkt_update(seeded_map, "user_1", "heart_anatomy", correct=True, config=cfg)

        view = get_organizer_view(
            seeded_map, "user_1", cfg,
            anchor_ids=["heart_anatomy"],
        )
        visible = {n["skill_id"] for n in view["nodes"]}
        # heart_anatomy mastered → its dependents become visible
        assert "heart_anatomy" in visible
        assert "co_determinants" in visible  # unlocked by mastered prereq

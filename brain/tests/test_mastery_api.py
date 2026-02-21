"""Tests for mastery API endpoints (M5)."""

import json
import sqlite3
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from adaptive.bkt import bkt_update, create_mastery_tables, get_effective_mastery
from adaptive.curriculum import create_curriculum_tables, upsert_node
from adaptive.schemas import MasteryConfig
from adaptive.telemetry import create_telemetry_tables, emit_evaluate_work


@pytest.fixture
def db_conn():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    create_mastery_tables(conn)
    create_telemetry_tables(conn)
    create_curriculum_tables(conn)
    return conn


@pytest.fixture
def config():
    return MasteryConfig()


class TestMasterySchema:
    def test_get_mastery_returns_float(self, db_conn, config):
        mastery = get_effective_mastery(db_conn, "user1", "skill_a", config)
        assert isinstance(mastery, float)
        assert 0.0 <= mastery <= 1.0

    def test_bkt_update_changes_mastery(self, db_conn, config):
        before = get_effective_mastery(db_conn, "user1", "skill_a", config)
        bkt_update(db_conn, "user1", "skill_a", True, config)
        after = get_effective_mastery(db_conn, "user1", "skill_a", config)
        assert after > before

    def test_bkt_update_from_verdict(self, db_conn, config):
        """Simulate what api_tutor.py does after a verdict."""
        skill_id = "Cardiac Output"
        # Correct verdict → mastery up
        new_mastery = bkt_update(db_conn, "default", skill_id, True, config)
        assert new_mastery > config.prior_mastery

    def test_practice_event_recorded(self, db_conn, config):
        event_id = emit_evaluate_work(db_conn, "user1", "skill_a", True, "session-1")
        assert event_id > 0
        cur = db_conn.execute("SELECT * FROM practice_events WHERE id = ?", (event_id,))
        row = cur.fetchone()
        assert row is not None
        assert row["source"] == "evaluate_work"


class TestMasteryDashboard:
    def test_multiple_skills(self, db_conn, config):
        bkt_update(db_conn, "user1", "skill_a", True, config)
        bkt_update(db_conn, "user1", "skill_b", False, config)

        cur = db_conn.execute(
            "SELECT DISTINCT skill_id FROM skill_mastery WHERE user_id = ?", ("user1",)
        )
        skills = [r[0] for r in cur.fetchall()]
        assert len(skills) == 2
        assert "skill_a" in skills
        assert "skill_b" in skills

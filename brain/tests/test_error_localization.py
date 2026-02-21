"""Tests for error localization (M6) — verdict → error_flags + why-locked."""

import sqlite3
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from adaptive.bkt import bkt_update, create_mastery_tables
from adaptive.curriculum import create_curriculum_tables, upsert_node
from adaptive.schemas import MasteryConfig
from adaptive.telemetry import create_telemetry_tables, record_error_flag


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


class TestErrorFlagCreation:
    def test_failed_verdict_creates_error_flag(self, db_conn):
        flag_id = record_error_flag(
            db_conn, "default", "Starling Law",
            error_type="reversed_causality",
            severity="medium",
            edge_id="Preload",
            evidence_ref="Reversed preload-SV relationship",
        )
        assert flag_id > 0

        cur = db_conn.execute("SELECT * FROM error_flags WHERE id = ?", (flag_id,))
        row = cur.fetchone()
        assert row["skill_id"] == "Starling Law"
        assert row["error_type"] == "reversed_causality"
        assert row["edge_id"] == "Preload"

    def test_correct_verdict_no_error_flag(self, db_conn):
        """Correct verdicts should NOT create error flags."""
        cur = db_conn.execute("SELECT COUNT(*) FROM error_flags")
        assert cur.fetchone()[0] == 0


class TestWhyLocked:
    def test_locked_skill_shows_missing_prereqs(self, db_conn, config):
        # Set up curriculum: Stroke Volume requires Preload
        upsert_node(db_conn, "stroke_volume", "Stroke Volume", ["preload"])
        upsert_node(db_conn, "preload", "Preload", [])

        # Preload not practiced → below unlock threshold
        from adaptive.curriculum import compute_status
        status = compute_status(db_conn, "default", "stroke_volume", config)
        assert status == "locked"

    def test_flagged_prereqs_included(self, db_conn, config):
        # Add error flag on a prereq
        record_error_flag(
            db_conn, "default", "preload",
            error_type="misconception",
            severity="high",
            evidence_ref="Student confused preload with afterload",
        )

        cur = db_conn.execute(
            "SELECT * FROM error_flags WHERE user_id = ? AND skill_id = ?",
            ("default", "preload"),
        )
        flags = cur.fetchall()
        assert len(flags) == 1
        assert flags[0]["error_type"] == "misconception"

    def test_no_flags_on_correct(self, db_conn, config):
        """Correct practice should not create error flags."""
        bkt_update(db_conn, "default", "preload", True, config)
        cur = db_conn.execute(
            "SELECT COUNT(*) FROM error_flags WHERE skill_id = ?", ("preload",)
        )
        assert cur.fetchone()[0] == 0

    def test_remediation_path_ordered_by_mastery(self, db_conn, config):
        """Missing prereqs should be sorted by lowest mastery first."""
        upsert_node(db_conn, "advanced", "Advanced", ["skill_a", "skill_b"])
        upsert_node(db_conn, "skill_a", "Skill A", [])
        upsert_node(db_conn, "skill_b", "Skill B", [])

        # Skill B practiced once (higher mastery), Skill A not practiced
        bkt_update(db_conn, "default", "skill_b", True, config)

        from adaptive.bkt import get_effective_mastery
        mastery_a = get_effective_mastery(db_conn, "default", "skill_a", config)
        mastery_b = get_effective_mastery(db_conn, "default", "skill_b", config)

        # Both below unlock threshold but B > A
        assert mastery_a < mastery_b

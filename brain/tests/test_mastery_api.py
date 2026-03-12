"""Tests for mastery API endpoints (M5)."""

import json
import sqlite3
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import config as app_config
import db_setup
from adaptive.bkt import bkt_update, create_mastery_tables, get_effective_mastery
from adaptive.curriculum import create_curriculum_tables, upsert_node
from adaptive.schemas import MasteryConfig
from adaptive.telemetry import create_telemetry_tables, emit_evaluate_work
from dashboard.app import create_app


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


@pytest.fixture
def mastery_api_client(tmp_path, monkeypatch):
    db_file = tmp_path / "mastery_api.db"
    monkeypatch.setenv("PT_STUDY_DB", str(db_file))
    monkeypatch.setattr(app_config, "DB_PATH", str(db_file))
    monkeypatch.setattr(db_setup, "DB_PATH", str(db_file))
    db_setup.init_database()

    app = create_app()
    app.config["TESTING"] = True

    return app.test_client(), str(db_file)


def _seed_mastery_api_db(db_path: str) -> None:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    config = MasteryConfig()

    create_mastery_tables(conn)
    create_telemetry_tables(conn)
    create_curriculum_tables(conn)

    upsert_node(conn, "preload", "Preload", [])
    upsert_node(conn, "stroke_volume", "Stroke Volume", ["preload"])

    bkt_update(conn, "default", "preload", True, config)
    bkt_update(conn, "default", "stroke_volume", False, config)

    conn.execute(
        """
        INSERT INTO error_flags (user_id, skill_id, error_type, severity, evidence_ref)
        VALUES (?, ?, ?, ?, ?)
        """,
        ("default", "preload", "misconception", "high", "api-test"),
    )
    conn.commit()
    conn.close()


class TestMasteryApiEndpoints:
    def test_dashboard_endpoint_returns_200_with_live_connection_shape(
        self,
        mastery_api_client,
    ):
        client, db_path = mastery_api_client
        _seed_mastery_api_db(db_path)

        response = client.get("/api/mastery/dashboard")

        assert response.status_code == 200
        payload = response.get_json()
        assert payload["count"] >= 2
        skills = {row["skill_id"]: row for row in payload["skills"]}
        assert "preload" in skills
        assert "stroke_volume" in skills
        assert skills["preload"]["name"] == "Preload"

    def test_get_mastery_endpoint_returns_200_with_live_connection_shape(
        self,
        mastery_api_client,
    ):
        client, db_path = mastery_api_client
        _seed_mastery_api_db(db_path)

        response = client.get("/api/mastery/preload")

        assert response.status_code == 200
        payload = response.get_json()
        assert payload["skill_id"] == "preload"
        assert isinstance(payload["effective_mastery"], float)
        assert "last_practiced_at" in payload

    def test_why_locked_endpoint_includes_flagged_prereqs(self, mastery_api_client):
        client, db_path = mastery_api_client
        _seed_mastery_api_db(db_path)

        response = client.get("/api/mastery/stroke_volume/why-locked")

        assert response.status_code == 200
        payload = response.get_json()
        assert payload["skill_id"] == "stroke_volume"
        assert "flagged_prereqs" in payload
        assert any(
            prereq["skill_id"] == "preload" and prereq["flags"]
            for prereq in payload["flagged_prereqs"]
        )

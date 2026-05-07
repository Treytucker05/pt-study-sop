"""Tests for scholar.anomaly_runner (SCHOLAR-003).

Covers throttle, toggle, anomaly filtering, and proposal insertion.
Uses an isolated temp DB and monkeypatches ``get_method_anomalies`` so
no real method library state is required.

Run: ``uv run pytest brain/tests/test_scholar_anomaly_runner.py -v``
"""

from __future__ import annotations

import importlib
import os
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))


_TEST_SCHEMA = """
CREATE TABLE IF NOT EXISTS scholar_proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    filepath TEXT,
    title TEXT,
    proposal_type TEXT,
    status TEXT,
    created_at TEXT,
    reviewed_at TEXT,
    reviewer_notes TEXT,
    superseded_by INTEGER,
    content_hash TEXT,
    content TEXT,
    cluster_id TEXT,
    proposal_kind TEXT,
    structured_changes TEXT,
    apply_status TEXT,
    applied_at TEXT,
    apply_error TEXT
);
CREATE TABLE IF NOT EXISTS scholar_scan_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    session_id TEXT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    anomalies_found INTEGER DEFAULT 0,
    proposals_created INTEGER DEFAULT 0,
    skip_reason TEXT,
    error_text TEXT
);
"""


@pytest.fixture
def db_conn(tmp_path, monkeypatch):
    """Yield a temp-DB connection wired so ``run_scan`` uses it via the
    explicit ``conn`` param. Avoids depending on global config.
    """
    db_path = tmp_path / "anomaly_runner_test.db"
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.executescript(_TEST_SCHEMA)
    conn.commit()
    yield conn
    conn.close()


@pytest.fixture(autouse=True)
def _reset_env(monkeypatch):
    monkeypatch.delenv("SCHOLAR_AUTO_SCAN_ENABLED", raising=False)
    monkeypatch.delenv("SCHOLAR_AUTO_SCAN_MIN_INTERVAL_HOURS", raising=False)
    yield


@pytest.fixture
def runner_module():
    # Reload to ensure a clean module state per test (especially after
    # env var changes).
    if "scholar.anomaly_runner" in sys.modules:
        importlib.reload(sys.modules["scholar.anomaly_runner"])
    from scholar import anomaly_runner

    return anomaly_runner


# ────────────────────────────────────────────────────────────────────────
# Toggle gate
# ────────────────────────────────────────────────────────────────────────


class TestToggle:
    def test_disabled_via_env_skips_scan(
        self, db_conn, runner_module, monkeypatch
    ):
        monkeypatch.setenv("SCHOLAR_AUTO_SCAN_ENABLED", "0")
        result = runner_module.run_scan(session_id="s1", conn=db_conn)
        assert result["skip_reason"] == "disabled"
        assert result["anomalies_found"] == 0
        assert result["proposals_created"] == 0


# ────────────────────────────────────────────────────────────────────────
# Throttle gate
# ────────────────────────────────────────────────────────────────────────


class TestThrottle:
    def test_recent_scan_skips_with_throttled(
        self, db_conn, runner_module, monkeypatch
    ):
        # Pre-seed a recent successful scan
        recent = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat(
            timespec="seconds"
        )
        db_conn.execute(
            "INSERT INTO scholar_scan_log "
            "(user_id, session_id, started_at, finished_at) VALUES "
            "(?, ?, ?, ?)",
            ("default", "earlier", recent, recent),
        )
        db_conn.commit()
        result = runner_module.run_scan(session_id="s2", conn=db_conn)
        assert result["skip_reason"] == "throttled"

    def test_old_scan_does_not_throttle(
        self, db_conn, runner_module, monkeypatch
    ):
        old = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat(
            timespec="seconds"
        )
        db_conn.execute(
            "INSERT INTO scholar_scan_log "
            "(user_id, session_id, started_at, finished_at) VALUES "
            "(?, ?, ?, ?)",
            ("default", "earlier", old, old),
        )
        db_conn.commit()
        # Patch get_method_anomalies to return empty so the scan completes
        # cleanly without trying to read method tables.
        monkeypatch.setattr(
            runner_module, "get_method_anomalies", lambda: {}
        )
        result = runner_module.run_scan(session_id="s3", conn=db_conn)
        assert result["skip_reason"] is None


# ────────────────────────────────────────────────────────────────────────
# Anomaly filtering — never_rated and underused are dropped
# ────────────────────────────────────────────────────────────────────────


class TestAnomalyFiltering:
    def test_never_rated_does_not_create_proposals(
        self, db_conn, runner_module, monkeypatch
    ):
        # All anomalies are never_rated — the queue would flood without
        # filtering. Should produce zero proposals.
        monkeypatch.setattr(
            runner_module,
            "get_method_anomalies",
            lambda: {
                "never_rated": [
                    {"type": "block", "id": 1, "name": "M1"},
                    {"type": "block", "id": 2, "name": "M2"},
                    {"type": "chain", "id": 99, "name": "C99"},
                ],
                "underused": [],
                "low_performers": [],
                "high_variance": [],
            },
        )
        result = runner_module.run_scan(session_id="s4", conn=db_conn)
        assert result["skip_reason"] is None
        assert result["anomalies_found"] == 0
        assert result["proposals_created"] == 0

    def test_low_performer_creates_proposal(
        self, db_conn, runner_module, monkeypatch
    ):
        monkeypatch.setattr(
            runner_module,
            "get_method_anomalies",
            lambda: {
                "never_rated": [],
                "underused": [],
                "low_performers": [
                    {
                        "type": "block",
                        "id": 7,
                        "name": "Cardio Drill",
                        "category": "drills",
                    }
                ],
                "high_variance": [],
            },
        )
        result = runner_module.run_scan(session_id="s5", conn=db_conn)
        assert result["proposals_created"] == 1
        # Verify the row landed and is structured
        cur = db_conn.execute(
            "SELECT proposal_kind, target_table_from_json(structured_changes) "
            "FROM scholar_proposals WHERE id = (SELECT MAX(id) FROM scholar_proposals)"
        ) if False else db_conn.execute(
            "SELECT proposal_kind, structured_changes "
            "FROM scholar_proposals ORDER BY id DESC LIMIT 1"
        )
        row = cur.fetchone()
        assert row["proposal_kind"] == "structured"
        import json
        sc = json.loads(row["structured_changes"])
        assert sc["target_table"] == "method_blocks"
        assert sc["target_id"] == 7

    def test_high_variance_creates_proposal(
        self, db_conn, runner_module, monkeypatch
    ):
        monkeypatch.setattr(
            runner_module,
            "get_method_anomalies",
            lambda: {
                "never_rated": [],
                "underused": [],
                "low_performers": [],
                "high_variance": [
                    {"type": "block", "id": 3, "name": "Renal Quiz"}
                ],
            },
        )
        result = runner_module.run_scan(session_id="s6", conn=db_conn)
        assert result["proposals_created"] == 1


class TestEmpty:
    def test_no_anomalies_at_all_creates_zero_proposals(
        self, db_conn, runner_module, monkeypatch
    ):
        monkeypatch.setattr(
            runner_module, "get_method_anomalies", lambda: {}
        )
        result = runner_module.run_scan(session_id="s7", conn=db_conn)
        assert result["proposals_created"] == 0
        assert result["skip_reason"] is None

    def test_get_method_anomalies_returns_none_handled(
        self, db_conn, runner_module, monkeypatch
    ):
        # When method tables don't exist, get_method_anomalies returns None.
        monkeypatch.setattr(
            runner_module, "get_method_anomalies", lambda: None
        )
        result = runner_module.run_scan(session_id="s8", conn=db_conn)
        assert result["proposals_created"] == 0

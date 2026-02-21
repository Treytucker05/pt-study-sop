"""Phase 9: Measurement Loop tests.

Task 9.1 — Metrics dashboard: per-skill mastery trajectory, hint dependence,
           time-to-correct, error flag recurrence, retention outcomes
Task 9.2 — Session toggles: config validation, persistence, deterministic logging
"""

import json
import sqlite3
import sys
import time
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from adaptive.metrics import SkillMetrics, compute_dashboard_metrics, compute_skill_metrics
from adaptive.session_config import (
    VALID_FADING_MODES,
    VALID_RAG_MODES,
    VALID_THRESHOLDS,
    SessionConfig,
    ensure_config_column,
    load_session_config,
    save_session_config,
    validate_session_config,
)
from adaptive.telemetry import (
    create_telemetry_tables,
    emit_attempt,
    emit_hint,
    emit_evaluate_work,
    record_error_flag,
)
from adaptive.bkt import create_mastery_tables


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def db():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    create_telemetry_tables(conn)
    create_mastery_tables(conn)
    # Minimal tutor_sessions table for session config tests
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tutor_sessions (
            id INTEGER PRIMARY KEY,
            session_id TEXT NOT NULL UNIQUE,
            phase TEXT DEFAULT 'first_pass',
            status TEXT DEFAULT 'active',
            started_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    return conn


@pytest.fixture
def populated_db(db):
    """DB with practice events for 'Preload' skill."""
    user = "u1"
    skill = "Preload"
    # 5 attempts: 3 correct, 2 wrong
    for correct in [True, True, False, True, False]:
        emit_attempt(db, user, skill, correct, latency_ms=1500)
    # 2 hints
    emit_hint(db, user, skill, 1)
    emit_hint(db, user, skill, 2)
    # 1 evaluate_work
    emit_evaluate_work(db, user, skill, True)
    # 1 error flag
    record_error_flag(db, user, skill, "misconception", evidence_ref="confused terms")
    return db


# =========================================================================
# Task 9.1: Metrics computation
# =========================================================================

class TestSkillMetrics:
    def test_empty_skill_returns_defaults(self, db):
        m = compute_skill_metrics(db, "u1", "NonExistent")
        assert m.event_count == 0
        assert m.accuracy == 0.0
        assert m.hint_dependence == 0.0
        assert m.error_flag_count == 0

    def test_event_counts_correct(self, populated_db):
        m = compute_skill_metrics(populated_db, "u1", "Preload")
        # 5 attempts + 2 hints + 1 evaluate_work = 8
        assert m.event_count == 8

    def test_accuracy_computed(self, populated_db):
        m = compute_skill_metrics(populated_db, "u1", "Preload")
        # 3 correct attempts + 1 correct evaluate_work = 4 correct out of 8
        # (hints are correct=False)
        assert 0.0 < m.accuracy < 1.0

    def test_hint_dependence_computed(self, populated_db):
        m = compute_skill_metrics(populated_db, "u1", "Preload")
        # 2 hints out of (5 attempts + 1 evaluate_work + 2 hints) = 2/8 = 0.25
        assert m.hint_dependence > 0.0
        assert m.hint_dependence <= 1.0

    def test_avg_latency_computed(self, populated_db):
        m = compute_skill_metrics(populated_db, "u1", "Preload")
        # Only attempts have latency_ms=1500
        assert m.avg_latency_ms is not None

    def test_error_flags_counted(self, populated_db):
        m = compute_skill_metrics(populated_db, "u1", "Preload")
        assert m.error_flag_count == 1
        assert "misconception" in m.recent_error_types

    def test_mastery_trajectory_populated(self, populated_db):
        m = compute_skill_metrics(populated_db, "u1", "Preload")
        # Should have trajectory from attempt + evaluate_work events
        assert len(m.mastery_trajectory) > 0
        # Trajectory should be list of floats
        assert all(isinstance(v, float) for v in m.mastery_trajectory)

    def test_mastery_trajectory_max_20(self, db):
        """Trajectory is capped at 20 data points."""
        for i in range(30):
            emit_attempt(db, "u1", "Preload", correct=(i % 3 != 0))
        m = compute_skill_metrics(db, "u1", "Preload")
        assert len(m.mastery_trajectory) <= 20

    def test_to_dict_serializable(self, populated_db):
        m = compute_skill_metrics(populated_db, "u1", "Preload")
        d = m.to_dict()
        # Must be JSON-serializable
        serialized = json.dumps(d)
        assert "Preload" in serialized


class TestDashboardMetrics:
    def test_returns_all_practiced_skills(self, populated_db):
        # Add a second skill
        emit_attempt(populated_db, "u1", "Afterload", True)
        metrics = compute_dashboard_metrics(populated_db, "u1")
        skill_ids = {m["skill_id"] for m in metrics}
        assert "Preload" in skill_ids
        assert "Afterload" in skill_ids

    def test_empty_user_returns_empty(self, db):
        metrics = compute_dashboard_metrics(db, "nobody")
        assert metrics == []

    def test_after_one_session_metrics_populate(self, populated_db):
        """Verification: after one session, metrics populate."""
        metrics = compute_dashboard_metrics(populated_db, "u1")
        assert len(metrics) > 0
        m = metrics[0]
        assert m["event_count"] > 0
        assert "mastery_trajectory" in m
        assert "hint_dependence" in m


# =========================================================================
# Task 9.2: Session toggles
# =========================================================================

class TestSessionConfig:
    def test_defaults(self):
        cfg = SessionConfig()
        assert cfg.mastery_threshold == 0.95
        assert cfg.rag_mode == "graph_rag"
        assert cfg.fading_mode == "adaptive"
        assert cfg.pruning_enabled is True

    def test_from_dict(self):
        cfg = SessionConfig.from_dict({
            "mastery_threshold": 0.98,
            "rag_mode": "vector_only",
            "fading_mode": "fixed",
            "pruning_enabled": False,
        })
        assert cfg.mastery_threshold == 0.98
        assert cfg.rag_mode == "vector_only"
        assert cfg.fading_mode == "fixed"
        assert cfg.pruning_enabled is False

    def test_from_dict_partial(self):
        cfg = SessionConfig.from_dict({"mastery_threshold": 0.98})
        assert cfg.mastery_threshold == 0.98
        assert cfg.rag_mode == "graph_rag"  # default

    def test_to_json_roundtrip(self):
        cfg = SessionConfig(mastery_threshold=0.98, rag_mode="vector_only")
        raw = cfg.to_json()
        restored = SessionConfig.from_json(raw)
        assert restored.mastery_threshold == 0.98
        assert restored.rag_mode == "vector_only"

    def test_from_json_null_returns_default(self):
        cfg = SessionConfig.from_json(None)
        assert cfg.mastery_threshold == 0.95

    def test_from_json_invalid_returns_default(self):
        cfg = SessionConfig.from_json("{bad json")
        assert cfg.mastery_threshold == 0.95


class TestSessionConfigValidation:
    def test_valid_default_config(self):
        ok, issues = validate_session_config(SessionConfig())
        assert ok, f"Default config should be valid: {issues}"

    def test_valid_alternate_config(self):
        cfg = SessionConfig(
            mastery_threshold=0.98,
            rag_mode="vector_only",
            fading_mode="fixed",
            pruning_enabled=False,
        )
        ok, issues = validate_session_config(cfg)
        assert ok, f"Alternate config should be valid: {issues}"

    def test_invalid_threshold_rejected(self):
        cfg = SessionConfig(mastery_threshold=0.80)
        ok, issues = validate_session_config(cfg)
        assert not ok
        assert any("mastery_threshold" in i for i in issues)

    def test_invalid_rag_mode_rejected(self):
        cfg = SessionConfig(rag_mode="semantic_search")
        ok, issues = validate_session_config(cfg)
        assert not ok
        assert any("rag_mode" in i for i in issues)

    def test_invalid_fading_mode_rejected(self):
        cfg = SessionConfig(fading_mode="random")
        ok, issues = validate_session_config(cfg)
        assert not ok
        assert any("fading_mode" in i for i in issues)

    def test_all_valid_thresholds(self):
        for threshold in VALID_THRESHOLDS:
            cfg = SessionConfig(mastery_threshold=threshold)
            ok, _ = validate_session_config(cfg)
            assert ok, f"Threshold {threshold} should be valid"

    def test_all_valid_rag_modes(self):
        for mode in VALID_RAG_MODES:
            cfg = SessionConfig(rag_mode=mode)
            ok, _ = validate_session_config(cfg)
            assert ok, f"RAG mode {mode} should be valid"

    def test_all_valid_fading_modes(self):
        for mode in VALID_FADING_MODES:
            cfg = SessionConfig(fading_mode=mode)
            ok, _ = validate_session_config(cfg)
            assert ok, f"Fading mode {mode} should be valid"


class TestSessionConfigPersistence:
    def test_save_and_load(self, db):
        db.execute(
            "INSERT INTO tutor_sessions (session_id, started_at) VALUES ('s1', datetime('now'))"
        )
        db.commit()

        cfg = SessionConfig(mastery_threshold=0.98, rag_mode="vector_only")
        save_session_config(db, "s1", cfg)

        loaded = load_session_config(db, "s1")
        assert loaded.mastery_threshold == 0.98
        assert loaded.rag_mode == "vector_only"

    def test_load_missing_session_returns_default(self, db):
        cfg = load_session_config(db, "nonexistent")
        assert cfg.mastery_threshold == 0.95

    def test_load_null_config_returns_default(self, db):
        db.execute(
            "INSERT INTO tutor_sessions (session_id, started_at) VALUES ('s2', datetime('now'))"
        )
        db.commit()
        cfg = load_session_config(db, "s2")
        assert cfg.mastery_threshold == 0.95

    def test_config_deterministic(self, db):
        """Session log shows active configuration deterministically."""
        db.execute(
            "INSERT INTO tutor_sessions (session_id, started_at) VALUES ('s3', datetime('now'))"
        )
        db.commit()

        cfg = SessionConfig(
            mastery_threshold=0.98,
            rag_mode="vector_only",
            fading_mode="fixed",
            pruning_enabled=False,
        )
        save_session_config(db, "s3", cfg)

        # Load twice — must be identical
        c1 = load_session_config(db, "s3")
        c2 = load_session_config(db, "s3")
        assert c1.to_dict() == c2.to_dict()

    def test_overwrite_config(self, db):
        db.execute(
            "INSERT INTO tutor_sessions (session_id, started_at) VALUES ('s4', datetime('now'))"
        )
        db.commit()

        save_session_config(db, "s4", SessionConfig(mastery_threshold=0.95))
        save_session_config(db, "s4", SessionConfig(mastery_threshold=0.98))

        loaded = load_session_config(db, "s4")
        assert loaded.mastery_threshold == 0.98

    def test_ensure_column_idempotent(self, db):
        ensure_config_column(db)
        ensure_config_column(db)
        cur = db.execute("PRAGMA table_info(tutor_sessions)")
        cols = {r[1] for r in cur.fetchall()}
        assert "experiment_config_json" in cols

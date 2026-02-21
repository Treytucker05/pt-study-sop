"""Tests for adaptive mastery telemetry (Phase 2)."""
from __future__ import annotations

import sqlite3
import time
import pytest


# ---------------------------------------------------------------------------
# DB fixture
# ---------------------------------------------------------------------------

@pytest.fixture
def telem_db(tmp_path):
    """SQLite DB with telemetry tables."""
    db_path = str(tmp_path / "test_telemetry.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    from brain.adaptive.telemetry import create_telemetry_tables
    create_telemetry_tables(conn)
    yield conn
    conn.close()


# ---------------------------------------------------------------------------
# Task 2.1 — PracticeEvent schema
# ---------------------------------------------------------------------------

class TestPracticeEventSchema:
    def test_valid_event_accepted(self):
        from brain.adaptive.telemetry import PracticeEvent, validate_practice_event

        evt = PracticeEvent(
            user_id="user_1",
            skill_id="cardio_co_determinants",
            timestamp=1708000000.0,
            correct=True,
            confidence=0.8,
            latency_ms=3200,
            hint_level=0,
            item_format="mcq",
            source="tutor",
            session_id="sess_001",
        )
        result = validate_practice_event(evt)
        assert result.valid is True

    def test_missing_skill_id_rejected(self):
        from brain.adaptive.telemetry import PracticeEvent, validate_practice_event

        evt = PracticeEvent(
            user_id="user_1",
            skill_id="",
            timestamp=1708000000.0,
            correct=True,
        )
        result = validate_practice_event(evt)
        assert result.valid is False
        assert any("skill_id" in e for e in result.errors)

    def test_missing_user_id_rejected(self):
        from brain.adaptive.telemetry import PracticeEvent, validate_practice_event

        evt = PracticeEvent(
            user_id="",
            skill_id="neuro_umn",
            timestamp=1708000000.0,
            correct=False,
        )
        result = validate_practice_event(evt)
        assert result.valid is False
        assert any("user_id" in e for e in result.errors)

    def test_invalid_confidence_rejected(self):
        from brain.adaptive.telemetry import PracticeEvent, validate_practice_event

        evt = PracticeEvent(
            user_id="user_1",
            skill_id="neuro_umn",
            timestamp=1708000000.0,
            correct=True,
            confidence=1.5,  # out of range
        )
        result = validate_practice_event(evt)
        assert result.valid is False
        assert any("confidence" in e for e in result.errors)


# ---------------------------------------------------------------------------
# Task 2.2 — DB table + indexes
# ---------------------------------------------------------------------------

class TestPracticeEventsTable:
    def test_insert_and_query(self, telem_db):
        from brain.adaptive.telemetry import record_event, PracticeEvent

        evt = PracticeEvent(
            user_id="user_1",
            skill_id="cardio_co",
            timestamp=1708000000.0,
            correct=True,
            confidence=0.9,
            latency_ms=2000,
            hint_level=0,
            item_format="free_recall",
            source="tutor",
            session_id="sess_001",
        )
        record_event(telem_db, evt)

        cur = telem_db.execute(
            "SELECT * FROM practice_events WHERE skill_id = ?",
            ("cardio_co",),
        )
        rows = cur.fetchall()
        assert len(rows) == 1
        assert rows[0]["correct"] == 1
        assert rows[0]["confidence"] == 0.9

    def test_query_by_skill_returns_expected(self, telem_db):
        from brain.adaptive.telemetry import record_event, PracticeEvent, query_events

        for i in range(3):
            record_event(telem_db, PracticeEvent(
                user_id="user_1",
                skill_id="neuro_umn",
                timestamp=1708000000.0 + i,
                correct=i % 2 == 0,
            ))
        record_event(telem_db, PracticeEvent(
            user_id="user_1",
            skill_id="other_skill",
            timestamp=1708000000.0,
            correct=True,
        ))

        rows = query_events(telem_db, user_id="user_1", skill_id="neuro_umn")
        assert len(rows) == 3


# ---------------------------------------------------------------------------
# Task 2.3 — Instrument attempts + hints
# ---------------------------------------------------------------------------

class TestEventEmitter:
    def test_attempt_event(self, telem_db):
        from brain.adaptive.telemetry import emit_attempt, query_events

        emit_attempt(
            telem_db,
            user_id="user_1",
            skill_id="cardio_preload",
            correct=True,
            confidence=0.85,
            latency_ms=4500,
            session_id="sess_002",
        )

        rows = query_events(telem_db, user_id="user_1", skill_id="cardio_preload")
        assert len(rows) == 1
        assert rows[0]["source"] == "attempt"

    def test_hint_event(self, telem_db):
        from brain.adaptive.telemetry import emit_hint, query_events

        emit_hint(
            telem_db,
            user_id="user_1",
            skill_id="cardio_preload",
            hint_level=2,
            session_id="sess_002",
        )

        rows = query_events(telem_db, user_id="user_1", skill_id="cardio_preload")
        assert len(rows) == 1
        assert rows[0]["source"] == "hint"
        assert rows[0]["hint_level"] == 2

    def test_evaluate_work_event(self, telem_db):
        from brain.adaptive.telemetry import emit_evaluate_work, query_events

        emit_evaluate_work(
            telem_db,
            user_id="user_1",
            skill_id="neuro_umn",
            correct=False,
            session_id="sess_003",
        )

        rows = query_events(telem_db, user_id="user_1", skill_id="neuro_umn")
        assert len(rows) == 1
        assert rows[0]["source"] == "evaluate_work"

    def test_teach_back_event(self, telem_db):
        from brain.adaptive.telemetry import emit_teach_back, query_events

        emit_teach_back(
            telem_db,
            user_id="user_1",
            skill_id="msk_rom",
            correct=True,
            session_id="sess_004",
        )

        rows = query_events(telem_db, user_id="user_1", skill_id="msk_rom")
        assert len(rows) == 1
        assert rows[0]["source"] == "teach_back"

    def test_one_attempt_produces_exactly_one_event(self, telem_db):
        from brain.adaptive.telemetry import emit_attempt, query_events

        emit_attempt(
            telem_db,
            user_id="user_1",
            skill_id="unique_skill",
            correct=True,
        )

        all_rows = telem_db.execute("SELECT COUNT(*) as cnt FROM practice_events").fetchone()
        assert all_rows["cnt"] == 1


# ---------------------------------------------------------------------------
# Task 2.4 — Error flags table
# ---------------------------------------------------------------------------

class TestErrorFlags:
    def test_write_error_flag(self, telem_db):
        from brain.adaptive.telemetry import record_error_flag

        record_error_flag(
            telem_db,
            user_id="user_1",
            skill_id="cardio_co",
            edge_id="cardio_preload__part_of__cardio_co",
            error_type="prereq_gap",
            severity="high",
            evidence_ref="eval_sess_003_turn_5",
        )

        cur = telem_db.execute("SELECT * FROM error_flags WHERE skill_id = ?", ("cardio_co",))
        rows = cur.fetchall()
        assert len(rows) == 1
        assert rows[0]["error_type"] == "prereq_gap"
        assert rows[0]["edge_id"] == "cardio_preload__part_of__cardio_co"

    def test_error_flag_links_to_correct_skill(self, telem_db):
        from brain.adaptive.telemetry import record_error_flag

        record_error_flag(
            telem_db,
            user_id="user_1",
            skill_id="neuro_lmn",
            error_type="concept_gap",
            severity="medium",
        )

        cur = telem_db.execute("SELECT skill_id FROM error_flags")
        row = cur.fetchone()
        assert row["skill_id"] == "neuro_lmn"

    def test_error_flag_nullable_edge(self, telem_db):
        """edge_id is nullable — not all errors are edge-specific."""
        from brain.adaptive.telemetry import record_error_flag

        record_error_flag(
            telem_db,
            user_id="user_1",
            skill_id="cardio_hr",
            error_type="calculation",
            severity="low",
        )

        cur = telem_db.execute("SELECT edge_id FROM error_flags WHERE skill_id = ?", ("cardio_hr",))
        row = cur.fetchone()
        assert row["edge_id"] is None

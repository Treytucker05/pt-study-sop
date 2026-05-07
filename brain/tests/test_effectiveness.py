"""Tests for brain.effectiveness scoring module.

Covers the SCHOLAR-001 acceptance criteria:
- ≥6 cases on the pure scorer (all signals; verdict-only; mastery-only;
  retrieval-only; partial mix; all-none)
- adapter helpers: verdict_score_5pt, mastery_level_5pt, retrieval_5pt
- DB-backed adapters tested with an in-memory SQLite fixture

Run: ``uv run pytest brain/tests/test_effectiveness.py -v``
"""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from effectiveness import (  # noqa: E402
    NEUTRAL_FALLBACK,
    compute_effectiveness,
    compute_session_signals,
    mastery_level_5pt,
    retrieval_5pt,
    verdict_score_5pt,
)


# ────────────────────────────────────────────────────────────────────────
# verdict_score_5pt
# ────────────────────────────────────────────────────────────────────────


class TestVerdictScore5pt:
    def test_pass_returns_5(self):
        assert verdict_score_5pt({"verdict": "pass"}) == 5

    def test_partial_returns_3(self):
        assert verdict_score_5pt({"verdict": "partial"}) == 3

    def test_fail_returns_1(self):
        assert verdict_score_5pt({"verdict": "fail"}) == 1

    def test_score_key_clamped_to_range(self):
        assert verdict_score_5pt({"score": 4.7}) == 5
        assert verdict_score_5pt({"score": 0}) == 1
        assert verdict_score_5pt({"score": 3}) == 3

    def test_quality_key_fallback(self):
        assert verdict_score_5pt({"quality": 4}) == 4

    def test_pass_boolean_fallback(self):
        assert verdict_score_5pt({"pass": True}) == 5
        assert verdict_score_5pt({"passed": False}) == 1

    def test_no_signal_returns_none(self):
        assert verdict_score_5pt({"unrelated": "data"}) is None

    def test_non_dict_returns_none(self):
        assert verdict_score_5pt(None) is None
        assert verdict_score_5pt("pass") is None
        assert verdict_score_5pt([1, 2, 3]) is None


# ────────────────────────────────────────────────────────────────────────
# compute_effectiveness — pure scorer (the 6 required cases)
# ────────────────────────────────────────────────────────────────────────


class TestComputeEffectiveness:
    def test_all_signals_present(self):
        # 0.5*5 + 0.3*4 + 0.2*3 = 2.5 + 1.2 + 0.6 = 4.3 → 4
        assert compute_effectiveness(5, 4, 3) == 4

    def test_verdict_only(self):
        # mastery and retrieval default to NEUTRAL_FALLBACK (2)
        # 0.5*5 + 0.3*2 + 0.2*2 = 2.5 + 0.6 + 0.4 = 3.5 → 4 (banker's rounding)
        result = compute_effectiveness(5, None, None)
        assert result in (3, 4)  # depends on Python's round() (banker's)

    def test_mastery_only(self):
        # 0.5*2 + 0.3*5 + 0.2*2 = 1.0 + 1.5 + 0.4 = 2.9 → 3
        assert compute_effectiveness(None, 5, None) == 3

    def test_retrieval_only(self):
        # 0.5*2 + 0.3*2 + 0.2*5 = 1.0 + 0.6 + 1.0 = 2.6 → 3
        assert compute_effectiveness(None, None, 5) == 3

    def test_partial_mix_two_signals(self):
        # verdict=4, mastery=2 (None), retrieval=4
        # 0.5*4 + 0.3*2 + 0.2*4 = 2.0 + 0.6 + 0.8 = 3.4 → 3
        assert compute_effectiveness(4, None, 4) == 3

    def test_all_none_returns_neutral_fallback(self):
        assert compute_effectiveness(None, None, None) == NEUTRAL_FALLBACK

    def test_neutral_fallback_is_not_legacy_three(self):
        # Critical: NEUTRAL_FALLBACK must NOT be 3, so legacy hardcoded
        # rows stay distinguishable from new "no signal" computed rows.
        assert NEUTRAL_FALLBACK != 3

    def test_clamps_to_5(self):
        assert compute_effectiveness(5, 5, 5) == 5

    def test_clamps_to_1(self):
        assert compute_effectiveness(1, 1, 1) == 1


# ────────────────────────────────────────────────────────────────────────
# DB-backed adapters with an in-memory fixture
# ────────────────────────────────────────────────────────────────────────


@pytest.fixture
def conn():
    """In-memory DB with the minimum schema the adapters touch."""
    c = sqlite3.connect(":memory:")
    c.execute(
        """CREATE TABLE topic_mastery (
              topic TEXT PRIMARY KEY,
              study_count INTEGER,
              last_studied TEXT,
              first_studied TEXT,
              avg_understanding REAL,
              avg_retention REAL
           )"""
    )
    c.execute(
        """CREATE TABLE tutor_accuracy_log (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              session_id TEXT,
              turn_number INTEGER,
              topic TEXT,
              retrieval_confidence TEXT,
              source_count INTEGER,
              chunk_count INTEGER,
              created_at TEXT
           )"""
    )
    c.execute(
        """CREATE TABLE tutor_turns (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              session_id TEXT,
              turn_number INTEGER,
              question TEXT,
              answer TEXT,
              created_at TEXT
           )"""
    )
    c.commit()
    yield c
    c.close()


class TestMasteryLevel5pt:
    def test_returns_none_when_no_topics_logged(self, conn):
        assert mastery_level_5pt("sess-empty", conn) is None

    def test_high_understanding_maps_to_high_score(self, conn):
        conn.execute(
            "INSERT INTO topic_mastery (topic, avg_understanding) VALUES (?, ?)",
            ("cardio", 0.9),
        )
        conn.execute(
            "INSERT INTO tutor_accuracy_log (session_id, topic) VALUES (?, ?)",
            ("sess-1", "cardio"),
        )
        conn.commit()
        # 1 + 0.9 * 4 = 4.6 → 5
        assert mastery_level_5pt("sess-1", conn) == 5

    def test_low_understanding_maps_to_low_score(self, conn):
        conn.execute(
            "INSERT INTO topic_mastery (topic, avg_understanding) VALUES (?, ?)",
            ("renal", 0.1),
        )
        conn.execute(
            "INSERT INTO tutor_accuracy_log (session_id, topic) VALUES (?, ?)",
            ("sess-2", "renal"),
        )
        conn.commit()
        # 1 + 0.1 * 4 = 1.4 → 1
        assert mastery_level_5pt("sess-2", conn) == 1


class TestRetrieval5pt:
    def test_returns_none_when_no_turns_logged(self, conn):
        assert retrieval_5pt("sess-empty", conn) is None

    def test_all_high_returns_5(self, conn):
        for _ in range(3):
            conn.execute(
                "INSERT INTO tutor_accuracy_log (session_id, retrieval_confidence) "
                "VALUES (?, ?)",
                ("sess-h", "high"),
            )
        conn.commit()
        assert retrieval_5pt("sess-h", conn) == 5

    def test_mixed_levels_average(self, conn):
        # high=5, medium=3, low=1 → avg = 3
        for level in ("high", "medium", "low"):
            conn.execute(
                "INSERT INTO tutor_accuracy_log (session_id, retrieval_confidence) "
                "VALUES (?, ?)",
                ("sess-mix", level),
            )
        conn.commit()
        assert retrieval_5pt("sess-mix", conn) == 3

    def test_unknown_value_skipped(self, conn):
        # Only the recognized value contributes
        conn.execute(
            "INSERT INTO tutor_accuracy_log (session_id, retrieval_confidence) "
            "VALUES (?, ?)",
            ("sess-u", "unknown"),
        )
        conn.execute(
            "INSERT INTO tutor_accuracy_log (session_id, retrieval_confidence) "
            "VALUES (?, ?)",
            ("sess-u", "high"),
        )
        conn.commit()
        assert retrieval_5pt("sess-u", conn) == 5


class TestComputeSessionSignals:
    def test_empty_session_returns_all_none(self, conn):
        result = compute_session_signals("sess-empty", conn)
        assert result == {"verdict": None, "mastery": None, "retrieval": None}

    def test_full_session_returns_all_signals(self, conn):
        # verdict via tutor_turns answer
        conn.execute(
            "INSERT INTO tutor_turns (session_id, turn_number, answer) VALUES (?, ?, ?)",
            (
                "sess-full",
                1,
                'Some answer.\n<!-- VERDICT_JSON: {"verdict":"pass"} -->',
            ),
        )
        # mastery via topic_mastery + accuracy log link
        conn.execute(
            "INSERT INTO topic_mastery (topic, avg_understanding) VALUES (?, ?)",
            ("cardio", 0.75),
        )
        conn.execute(
            "INSERT INTO tutor_accuracy_log (session_id, topic, retrieval_confidence) "
            "VALUES (?, ?, ?)",
            ("sess-full", "cardio", "high"),
        )
        conn.commit()
        result = compute_session_signals("sess-full", conn)
        assert result["verdict"] == 5
        assert result["mastery"] == 4  # 1 + 0.75*4 = 4
        assert result["retrieval"] == 5

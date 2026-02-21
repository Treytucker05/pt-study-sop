"""Tests for Bayesian Knowledge Tracing + forgetting curve (Phase 3)."""
from __future__ import annotations

import math
import sqlite3
import time
import pytest


# ---------------------------------------------------------------------------
# DB fixture
# ---------------------------------------------------------------------------

@pytest.fixture
def bkt_db(tmp_path):
    """SQLite DB with mastery tables."""
    db_path = str(tmp_path / "test_bkt.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    from brain.adaptive.bkt import create_mastery_tables
    create_mastery_tables(conn)
    yield conn
    conn.close()


# ---------------------------------------------------------------------------
# Task 3.1 — skill_mastery table
# ---------------------------------------------------------------------------

class TestMasteryTable:
    def test_new_skill_initializes_with_defaults(self, bkt_db):
        from brain.adaptive.bkt import get_or_init_mastery
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig()
        m = get_or_init_mastery(bkt_db, "user_1", "cardio_co", cfg)
        assert m["p_mastery_latent"] == pytest.approx(cfg.prior_mastery)
        assert m["p_learn"] == pytest.approx(cfg.p_learn)
        assert m["p_guess"] == pytest.approx(cfg.p_guess)
        assert m["p_slip"] == pytest.approx(cfg.p_slip)

    def test_get_existing_mastery(self, bkt_db):
        from brain.adaptive.bkt import get_or_init_mastery
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig()
        m1 = get_or_init_mastery(bkt_db, "user_1", "neuro_umn", cfg)
        m2 = get_or_init_mastery(bkt_db, "user_1", "neuro_umn", cfg)
        assert m1["id"] == m2["id"]


# ---------------------------------------------------------------------------
# Task 3.2 — Pure BKT update
# ---------------------------------------------------------------------------

class TestBKTUpdate:
    def test_correct_streak_increases_mastery(self, bkt_db):
        from brain.adaptive.bkt import get_or_init_mastery, bkt_update
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig()
        get_or_init_mastery(bkt_db, "user_1", "skill_a", cfg)

        # 5 correct answers
        for _ in range(5):
            bkt_update(bkt_db, "user_1", "skill_a", correct=True, config=cfg)

        m = get_or_init_mastery(bkt_db, "user_1", "skill_a", cfg)
        assert m["p_mastery_latent"] > cfg.prior_mastery

    def test_incorrect_streak_slows_mastery(self, bkt_db):
        from brain.adaptive.bkt import get_or_init_mastery, bkt_update
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig()
        get_or_init_mastery(bkt_db, "user_1", "skill_b", cfg)

        # 3 correct to build mastery
        for _ in range(3):
            bkt_update(bkt_db, "user_1", "skill_b", correct=True, config=cfg)
        m_after_correct = get_or_init_mastery(bkt_db, "user_1", "skill_b", cfg)

        # Then 3 incorrect — mastery should decrease or at least slow
        for _ in range(3):
            bkt_update(bkt_db, "user_1", "skill_b", correct=False, config=cfg)
        m_after_incorrect = get_or_init_mastery(bkt_db, "user_1", "skill_b", cfg)

        assert m_after_incorrect["p_mastery_latent"] < m_after_correct["p_mastery_latent"]

    def test_bkt_update_returns_new_mastery(self, bkt_db):
        from brain.adaptive.bkt import get_or_init_mastery, bkt_update
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig()
        get_or_init_mastery(bkt_db, "user_1", "skill_c", cfg)

        new_p = bkt_update(bkt_db, "user_1", "skill_c", correct=True, config=cfg)
        assert 0.0 < new_p <= 1.0


# ---------------------------------------------------------------------------
# Task 3.3 — Forgetting curve (effective mastery)
# ---------------------------------------------------------------------------

class TestForgettingCurve:
    def test_effective_mastery_equals_latent_when_recent(self):
        from brain.adaptive.bkt import compute_effective_mastery
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig(decay_lambda=0.05)
        # Just practiced (0 seconds ago)
        p_eff = compute_effective_mastery(0.9, delta_seconds=0, config=cfg)
        assert p_eff == pytest.approx(0.9)

    def test_effective_mastery_decreases_over_time(self):
        from brain.adaptive.bkt import compute_effective_mastery
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig(decay_lambda=0.05)
        p_latent = 0.9

        p_recent = compute_effective_mastery(p_latent, delta_seconds=3600, config=cfg)  # 1 hour
        p_old = compute_effective_mastery(p_latent, delta_seconds=86400 * 7, config=cfg)  # 1 week

        assert p_recent < p_latent
        assert p_old < p_recent

    def test_latent_stays_stable_while_effective_decays(self, bkt_db):
        """Core requirement: latent doesn't change without practice."""
        from brain.adaptive.bkt import get_or_init_mastery, bkt_update, compute_effective_mastery
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig(decay_lambda=0.05)
        get_or_init_mastery(bkt_db, "user_1", "skill_d", cfg)

        # Build mastery
        for _ in range(5):
            bkt_update(bkt_db, "user_1", "skill_d", correct=True, config=cfg)

        m = get_or_init_mastery(bkt_db, "user_1", "skill_d", cfg)
        p_latent = m["p_mastery_latent"]

        # Simulate 7 days of inactivity
        p_eff = compute_effective_mastery(p_latent, delta_seconds=86400 * 7, config=cfg)
        assert p_latent > p_eff
        assert p_latent == pytest.approx(m["p_mastery_latent"])  # latent unchanged

    def test_adjusting_lambda_changes_decay_rate(self):
        from brain.adaptive.bkt import compute_effective_mastery
        from brain.adaptive.schemas import MasteryConfig

        delta = 86400  # 1 day
        p_latent = 0.9

        cfg_slow = MasteryConfig(decay_lambda=0.01)
        cfg_fast = MasteryConfig(decay_lambda=0.1)

        p_slow = compute_effective_mastery(p_latent, delta_seconds=delta, config=cfg_slow)
        p_fast = compute_effective_mastery(p_latent, delta_seconds=delta, config=cfg_fast)

        assert p_slow > p_fast


# ---------------------------------------------------------------------------
# Task 3.4 — Decision policy uses effective mastery
# ---------------------------------------------------------------------------

class TestDecisionPolicy:
    def test_same_latent_different_availability_after_inactivity(self, bkt_db):
        from brain.adaptive.bkt import get_or_init_mastery, bkt_update, get_effective_mastery
        from brain.adaptive.schemas import MasteryConfig, is_unlocked

        cfg = MasteryConfig(unlock_threshold=0.95, decay_lambda=0.05)
        get_or_init_mastery(bkt_db, "user_1", "skill_e", cfg)

        # Build mastery above threshold
        for _ in range(15):
            bkt_update(bkt_db, "user_1", "skill_e", correct=True, config=cfg)

        m = get_or_init_mastery(bkt_db, "user_1", "skill_e", cfg)
        p_latent = m["p_mastery_latent"]

        # Recent: should be unlocked
        p_eff_recent = get_effective_mastery(bkt_db, "user_1", "skill_e", cfg, now_offset=0)
        assert is_unlocked(p_eff_recent, cfg) is True

        # After long inactivity: may no longer be unlocked
        p_eff_old = get_effective_mastery(bkt_db, "user_1", "skill_e", cfg, now_offset=86400 * 30)
        # Effective mastery should be lower
        assert p_eff_old < p_eff_recent


# ---------------------------------------------------------------------------
# Task 3.5 — Parameter configuration
# ---------------------------------------------------------------------------

class TestParameterConfig:
    def test_custom_priors_used(self, bkt_db):
        from brain.adaptive.bkt import get_or_init_mastery
        from brain.adaptive.schemas import MasteryConfig

        cfg = MasteryConfig(prior_mastery=0.3, p_learn=0.4, p_guess=0.1, p_slip=0.05)
        m = get_or_init_mastery(bkt_db, "user_1", "custom_skill", cfg)
        assert m["p_mastery_latent"] == pytest.approx(0.3)
        assert m["p_learn"] == pytest.approx(0.4)
        assert m["p_guess"] == pytest.approx(0.1)
        assert m["p_slip"] == pytest.approx(0.05)

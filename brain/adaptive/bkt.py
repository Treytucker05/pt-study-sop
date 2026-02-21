"""Bayesian Knowledge Tracing with time-aware forgetting curve.

Phase 3: student model that tracks per-skill mastery using BKT updates
and exponential decay for effective mastery.

BKT model:
  P(L_n | obs) = P(L_n-1) * P(obs | L) / P(obs)
  Then: P(L_n) = P(L_n | obs) + (1 - P(L_n | obs)) * P(T)

Forgetting curve:
  P_effective = P_latent * exp(-lambda * delta_t_hours)
"""
from __future__ import annotations

import math
import sqlite3
import time

from brain.adaptive.schemas import MasteryConfig


# ---------------------------------------------------------------------------
# Task 3.1 — skill_mastery table
# ---------------------------------------------------------------------------

def create_mastery_tables(conn: sqlite3.Connection) -> None:
    """Create the skill_mastery table (idempotent)."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS skill_mastery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            skill_id TEXT NOT NULL,
            p_mastery_latent REAL NOT NULL,
            p_learn REAL NOT NULL,
            p_guess REAL NOT NULL,
            p_slip REAL NOT NULL,
            last_practiced_at REAL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, skill_id)
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_skill_mastery_user_skill
        ON skill_mastery(user_id, skill_id)
    """)
    conn.commit()


def get_or_init_mastery(
    conn: sqlite3.Connection,
    user_id: str,
    skill_id: str,
    config: MasteryConfig,
) -> sqlite3.Row:
    """Get existing mastery row or initialize with config defaults."""
    cur = conn.execute(
        "SELECT * FROM skill_mastery WHERE user_id = ? AND skill_id = ?",
        (user_id, skill_id),
    )
    row = cur.fetchone()
    if row is not None:
        return row

    conn.execute(
        """INSERT INTO skill_mastery
           (user_id, skill_id, p_mastery_latent, p_learn, p_guess, p_slip, last_practiced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (user_id, skill_id, config.prior_mastery,
         config.p_learn, config.p_guess, config.p_slip, time.time()),
    )
    conn.commit()

    cur = conn.execute(
        "SELECT * FROM skill_mastery WHERE user_id = ? AND skill_id = ?",
        (user_id, skill_id),
    )
    return cur.fetchone()


# ---------------------------------------------------------------------------
# Task 3.2 — Pure BKT update
# ---------------------------------------------------------------------------

def _bkt_posterior(p_l: float, p_g: float, p_s: float, correct: bool) -> float:
    """Compute P(L_n | observation) using Bayes' rule.

    P(correct | L) = 1 - p_slip
    P(correct | ~L) = p_guess
    """
    if correct:
        p_obs_given_l = 1.0 - p_s
        p_obs_given_not_l = p_g
    else:
        p_obs_given_l = p_s
        p_obs_given_not_l = 1.0 - p_g

    numerator = p_l * p_obs_given_l
    denominator = numerator + (1.0 - p_l) * p_obs_given_not_l

    if denominator == 0:
        return p_l
    return numerator / denominator


def bkt_update(
    conn: sqlite3.Connection,
    user_id: str,
    skill_id: str,
    correct: bool,
    config: MasteryConfig,
) -> float:
    """Apply one BKT update step. Returns updated latent mastery.

    Steps:
      1. Compute posterior P(L_n | obs)
      2. Account for learning: P(L_n) = posterior + (1 - posterior) * P(T)
      3. Persist to DB
    """
    row = get_or_init_mastery(conn, user_id, skill_id, config)
    p_l = row["p_mastery_latent"]
    p_g = row["p_guess"]
    p_s = row["p_slip"]
    p_t = row["p_learn"]

    # Step 1: posterior
    posterior = _bkt_posterior(p_l, p_g, p_s, correct)

    # Step 2: learning transition
    new_p = posterior + (1.0 - posterior) * p_t

    # Clamp to (0, 1)
    new_p = max(0.001, min(0.999, new_p))

    # Step 3: persist
    now = time.time()
    conn.execute(
        """UPDATE skill_mastery
           SET p_mastery_latent = ?, last_practiced_at = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ? AND skill_id = ?""",
        (new_p, now, user_id, skill_id),
    )
    conn.commit()
    return new_p


# ---------------------------------------------------------------------------
# Task 3.3 — Forgetting curve (effective mastery)
# ---------------------------------------------------------------------------

def compute_effective_mastery(
    p_latent: float,
    delta_seconds: float,
    config: MasteryConfig,
) -> float:
    """Compute effective mastery with exponential decay.

    p_effective = p_latent * exp(-lambda * delta_hours)

    When delta_seconds=0, returns p_latent exactly.
    """
    if delta_seconds <= 0:
        return p_latent

    delta_hours = delta_seconds / 3600.0
    decay = math.exp(-config.decay_lambda * delta_hours)
    return p_latent * decay


# ---------------------------------------------------------------------------
# Task 3.4 — Decision policy using effective mastery
# ---------------------------------------------------------------------------

def get_effective_mastery(
    conn: sqlite3.Connection,
    user_id: str,
    skill_id: str,
    config: MasteryConfig,
    now_offset: float = 0,
) -> float:
    """Get the effective mastery for a skill, accounting for time decay.

    now_offset: seconds to add to 'now' (for testing future scenarios).
    """
    row = get_or_init_mastery(conn, user_id, skill_id, config)
    p_latent = row["p_mastery_latent"]
    last_practiced = row["last_practiced_at"] or time.time()

    now = time.time() + now_offset
    delta = max(0, now - last_practiced)

    return compute_effective_mastery(p_latent, delta, config)

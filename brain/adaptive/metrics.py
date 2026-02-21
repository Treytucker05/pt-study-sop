"""Measurement loop metrics for n-of-1 optimization.

Computes per-skill mastery trajectory, hint dependence, time-to-correct,
error flag recurrence, and retention outcomes from telemetry data.
"""

from __future__ import annotations

import sqlite3
from dataclasses import asdict, dataclass, field
from typing import Optional


@dataclass
class SkillMetrics:
    """Metrics snapshot for a single skill."""

    skill_id: str
    effective_mastery: float = 0.0
    event_count: int = 0
    correct_count: int = 0
    accuracy: float = 0.0
    hint_dependence: float = 0.0  # hints / total attempts in window
    avg_latency_ms: Optional[float] = None
    error_flag_count: int = 0
    recent_error_types: list[str] = field(default_factory=list)
    mastery_trajectory: list[float] = field(default_factory=list)
    retention_score: Optional[float] = None  # effective_mastery after gap

    def to_dict(self) -> dict:
        return asdict(self)


def compute_skill_metrics(
    conn: sqlite3.Connection,
    user_id: str,
    skill_id: str,
    window_events: int = 20,
) -> SkillMetrics:
    """Compute metrics for a single skill from telemetry data.

    Args:
        conn: database connection
        user_id: learner ID
        skill_id: skill to compute metrics for
        window_events: rolling window size for hint dependence
    """
    metrics = SkillMetrics(skill_id=skill_id)

    # Event counts
    cur = conn.execute(
        """SELECT COUNT(*), SUM(correct), AVG(latency_ms)
           FROM practice_events
           WHERE user_id = ? AND skill_id = ?""",
        (user_id, skill_id),
    )
    row = cur.fetchone()
    if row and row[0]:
        metrics.event_count = row[0]
        metrics.correct_count = row[1] or 0
        metrics.accuracy = metrics.correct_count / max(metrics.event_count, 1)
        metrics.avg_latency_ms = row[2]

    # Hint dependence: hints / attempts in recent window
    cur = conn.execute(
        """SELECT source FROM practice_events
           WHERE user_id = ? AND skill_id = ?
           ORDER BY timestamp DESC LIMIT ?""",
        (user_id, skill_id, window_events),
    )
    recent_sources = [r[0] for r in cur.fetchall()]
    if recent_sources:
        hint_count = sum(1 for s in recent_sources if s == "hint")
        attempt_count = sum(1 for s in recent_sources if s in ("attempt", "evaluate_work", "teach_back"))
        total = hint_count + attempt_count
        metrics.hint_dependence = hint_count / max(total, 1)

    # Error flag recurrence
    cur = conn.execute(
        """SELECT error_type FROM error_flags
           WHERE user_id = ? AND skill_id = ?
           ORDER BY created_at DESC LIMIT 10""",
        (user_id, skill_id),
    )
    flags = cur.fetchall()
    metrics.error_flag_count = len(flags)
    metrics.recent_error_types = [r[0] for r in flags]

    # Mastery trajectory: last N mastery values from practice events
    # We approximate by tracking correct/incorrect streaks
    cur = conn.execute(
        """SELECT correct, timestamp FROM practice_events
           WHERE user_id = ? AND skill_id = ? AND source IN ('attempt', 'evaluate_work')
           ORDER BY timestamp ASC""",
        (user_id, skill_id),
    )
    events = cur.fetchall()
    if events:
        running = 0.1  # prior
        trajectory = []
        for evt in events:
            correct = bool(evt[0])
            if correct:
                running = min(1.0, running + 0.15)
            else:
                running = max(0.0, running - 0.05)
            trajectory.append(round(running, 3))
        metrics.mastery_trajectory = trajectory[-20:]  # last 20 points

    # Effective mastery (current)
    try:
        from adaptive.bkt import get_effective_mastery
        from adaptive.schemas import MasteryConfig

        metrics.effective_mastery = get_effective_mastery(
            conn, user_id, skill_id, MasteryConfig()
        )
    except Exception:
        pass

    # Retention: if last practice was >24h ago, effective mastery shows retention
    cur = conn.execute(
        """SELECT MAX(timestamp) FROM practice_events
           WHERE user_id = ? AND skill_id = ?""",
        (user_id, skill_id),
    )
    last_row = cur.fetchone()
    if last_row and last_row[0]:
        import time

        gap_hours = (time.time() - last_row[0]) / 3600
        if gap_hours > 24:
            metrics.retention_score = metrics.effective_mastery

    return metrics


def compute_dashboard_metrics(
    conn: sqlite3.Connection,
    user_id: str,
) -> list[dict]:
    """Compute metrics for all practiced skills."""
    cur = conn.execute(
        "SELECT DISTINCT skill_id FROM practice_events WHERE user_id = ?",
        (user_id,),
    )
    skill_ids = [r[0] for r in cur.fetchall()]
    return [compute_skill_metrics(conn, user_id, sid).to_dict() for sid in skill_ids]

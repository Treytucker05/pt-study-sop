"""Practice event telemetry for the adaptive mastery system.

Phase 2: capture every practice action as a structured event for
downstream BKT updates and error analysis.
"""
from __future__ import annotations

import sqlite3
import time
from dataclasses import dataclass, field
from typing import List, Optional

from brain.adaptive.schemas import ValidationResult


# ---------------------------------------------------------------------------
# Task 2.1 — PracticeEvent schema
# ---------------------------------------------------------------------------

@dataclass
class PracticeEvent:
    """A single practice observation."""

    user_id: str
    skill_id: str
    timestamp: float  # Unix epoch seconds
    correct: bool
    confidence: Optional[float] = None  # 0.0-1.0, self-reported
    latency_ms: Optional[int] = None
    hint_level: int = 0
    item_format: str = ""  # mcq, free_recall, cloze, etc.
    source: str = ""  # attempt, hint, evaluate_work, teach_back
    session_id: str = ""


def validate_practice_event(evt: PracticeEvent) -> ValidationResult:
    """Validate a PracticeEvent instance."""
    errors: list[str] = []

    if not evt.user_id:
        errors.append("user_id is required and cannot be empty")
    if not evt.skill_id:
        errors.append("skill_id is required and cannot be empty")
    if evt.confidence is not None and not (0.0 <= evt.confidence <= 1.0):
        errors.append(f"confidence must be in [0, 1], got {evt.confidence}")

    return ValidationResult(valid=len(errors) == 0, errors=errors)


# ---------------------------------------------------------------------------
# Task 2.2 — DB tables + indexes
# ---------------------------------------------------------------------------

def create_telemetry_tables(conn: sqlite3.Connection) -> None:
    """Create telemetry tables (idempotent)."""
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS practice_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            skill_id TEXT NOT NULL,
            timestamp REAL NOT NULL,
            correct INTEGER NOT NULL,
            confidence REAL,
            latency_ms INTEGER,
            hint_level INTEGER DEFAULT 0,
            item_format TEXT DEFAULT '',
            source TEXT DEFAULT '',
            session_id TEXT DEFAULT '',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_practice_events_user_skill_ts
        ON practice_events(user_id, skill_id, timestamp)
    """)

    # Task 2.4 — Error flags table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS error_flags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            skill_id TEXT NOT NULL,
            edge_id TEXT,
            error_type TEXT NOT NULL,
            severity TEXT NOT NULL DEFAULT 'medium',
            timestamp REAL NOT NULL DEFAULT (strftime('%s', 'now')),
            evidence_ref TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_error_flags_user_skill
        ON error_flags(user_id, skill_id)
    """)

    conn.commit()


# ---------------------------------------------------------------------------
# Task 2.2 — Record and query events
# ---------------------------------------------------------------------------

def record_event(conn: sqlite3.Connection, evt: PracticeEvent) -> int:
    """Insert a practice event into the DB. Returns the row id."""
    cur = conn.execute(
        """INSERT INTO practice_events
           (user_id, skill_id, timestamp, correct, confidence,
            latency_ms, hint_level, item_format, source, session_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            evt.user_id, evt.skill_id, evt.timestamp,
            int(evt.correct), evt.confidence,
            evt.latency_ms, evt.hint_level, evt.item_format,
            evt.source, evt.session_id,
        ),
    )
    conn.commit()
    return cur.lastrowid


def query_events(
    conn: sqlite3.Connection,
    user_id: str,
    skill_id: str,
) -> list[sqlite3.Row]:
    """Query practice events for a user+skill, ordered by timestamp."""
    cur = conn.execute(
        """SELECT * FROM practice_events
           WHERE user_id = ? AND skill_id = ?
           ORDER BY timestamp""",
        (user_id, skill_id),
    )
    return cur.fetchall()


# ---------------------------------------------------------------------------
# Task 2.3 — Convenience emitters
# ---------------------------------------------------------------------------

def emit_attempt(
    conn: sqlite3.Connection,
    user_id: str,
    skill_id: str,
    correct: bool,
    confidence: Optional[float] = None,
    latency_ms: Optional[int] = None,
    item_format: str = "",
    session_id: str = "",
) -> int:
    """Emit an attempt event."""
    return record_event(conn, PracticeEvent(
        user_id=user_id,
        skill_id=skill_id,
        timestamp=time.time(),
        correct=correct,
        confidence=confidence,
        latency_ms=latency_ms,
        item_format=item_format,
        source="attempt",
        session_id=session_id,
    ))


def emit_hint(
    conn: sqlite3.Connection,
    user_id: str,
    skill_id: str,
    hint_level: int,
    session_id: str = "",
) -> int:
    """Emit a hint-request event."""
    return record_event(conn, PracticeEvent(
        user_id=user_id,
        skill_id=skill_id,
        timestamp=time.time(),
        correct=False,
        hint_level=hint_level,
        source="hint",
        session_id=session_id,
    ))


def emit_evaluate_work(
    conn: sqlite3.Connection,
    user_id: str,
    skill_id: str,
    correct: bool,
    session_id: str = "",
) -> int:
    """Emit an evaluate-work event."""
    return record_event(conn, PracticeEvent(
        user_id=user_id,
        skill_id=skill_id,
        timestamp=time.time(),
        correct=correct,
        source="evaluate_work",
        session_id=session_id,
    ))


def emit_teach_back(
    conn: sqlite3.Connection,
    user_id: str,
    skill_id: str,
    correct: bool,
    session_id: str = "",
) -> int:
    """Emit a teach-back event."""
    return record_event(conn, PracticeEvent(
        user_id=user_id,
        skill_id=skill_id,
        timestamp=time.time(),
        correct=correct,
        source="teach_back",
        session_id=session_id,
    ))


# ---------------------------------------------------------------------------
# Task 2.4 — Error flags
# ---------------------------------------------------------------------------

def record_error_flag(
    conn: sqlite3.Connection,
    user_id: str,
    skill_id: str,
    error_type: str,
    severity: str = "medium",
    edge_id: Optional[str] = None,
    evidence_ref: Optional[str] = None,
) -> int:
    """Record an error flag linking a failure to a specific skill/edge."""
    cur = conn.execute(
        """INSERT INTO error_flags
           (user_id, skill_id, edge_id, error_type, severity, evidence_ref)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (user_id, skill_id, edge_id, error_type, severity, evidence_ref),
    )
    conn.commit()
    return cur.lastrowid

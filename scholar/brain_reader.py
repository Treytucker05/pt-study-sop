#!/usr/bin/env python3
"""
READ-ONLY access to Brain SQLite data for Scholar auditing.
Scholar NEVER writes to Brain - this is a one-way data flow.

Design constraints (per scholar/CHARTER.md):
- READ-ONLY: No INSERT/UPDATE/DELETE operations
- Graceful degradation: Return empty results if DB/table missing
- Safe JSON parsing: Handle malformed citations_json

Usage:
    python brain_reader.py  # Run connectivity test
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Generator, Optional, List, Dict


def get_db_path() -> Path:
    """
    Locate brain/data/pt_study.db relative to this file.
    
    Path resolution:
        scholar/brain_reader.py -> ../brain/data/pt_study.db
    """
    this_file = Path(__file__).resolve()
    repo_root = this_file.parent.parent  # scholar/ -> repo root
    db_path = repo_root / "brain" / "data" / "pt_study.db"
    return db_path


@contextmanager
def _get_connection() -> Generator[Optional[sqlite3.Connection], None, None]:
    """
    Context manager for read-only database connections.
    
    Uses Row factory for dict-like access.
    Yields None if DB missing.
    """
    db_path = get_db_path()
    
    if not db_path.exists():
        yield None
        return
    
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def _rows_to_dicts(rows: Optional[List[sqlite3.Row]]) -> List[Dict[str, Any]]:
    """Convert sqlite3.Row objects to plain dicts."""
    if not rows:
        return []
    return [dict(row) for row in rows]


def _table_exists(conn: sqlite3.Connection, table_name: str) -> bool:
    """Check if a table exists in the database."""
    cursor = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (table_name,)
    )
    return cursor.fetchone() is not None


def _date_n_days_ago(days: int) -> str:
    """Return ISO date string for N days ago."""
    cutoff = datetime.now() - timedelta(days=days)
    return cutoff.strftime("%Y-%m-%d")


# ---------------------------------------------------------------------------
# Dataclass for typed session records
# ---------------------------------------------------------------------------

@dataclass
class SessionRecord:
    """Immutable session record from Brain DB."""
    id: int
    session_date: str
    session_time: str
    duration_minutes: int
    study_mode: str
    main_topic: Optional[str]
    target_exam: Optional[str]
    source_lock: Optional[str]
    wrap_phase_reached: Optional[str]
    anki_cards_count: Optional[int]
    understanding_level: Optional[int]
    retention_confidence: Optional[int]
    system_performance: Optional[int]
    off_source_drift: Optional[str]
    source_snippets_used: Optional[str]
    what_worked: Optional[str]
    what_needs_fixing: Optional[str]
    gaps_identified: Optional[str]
    weak_anchors: Optional[str]
    created_at: str
    _raw: Dict[str, Any] = None

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "SessionRecord":
        """Create SessionRecord from database row."""
        raw = dict(row)
        return cls(
            id=raw.get("id") or 0,
            session_date=raw.get("session_date", ""),
            session_time=raw.get("session_time", ""),
            duration_minutes=raw.get("duration_minutes") or raw.get("time_spent_minutes") or 0,
            study_mode=raw.get("study_mode", ""),
            main_topic=raw.get("main_topic") or raw.get("topic"),
            target_exam=raw.get("target_exam"),
            source_lock=raw.get("source_lock"),
            wrap_phase_reached=raw.get("wrap_phase_reached"),
            anki_cards_count=raw.get("anki_cards_count"),
            understanding_level=raw.get("understanding_level"),
            retention_confidence=raw.get("retention_confidence"),
            system_performance=raw.get("system_performance"),
            off_source_drift=raw.get("off_source_drift"),
            source_snippets_used=raw.get("source_snippets_used"),
            what_worked=raw.get("what_worked"),
            what_needs_fixing=raw.get("what_needs_fixing"),
            gaps_identified=raw.get("gaps_identified"),
            weak_anchors=raw.get("weak_anchors"),
            created_at=raw.get("created_at", ""),
            _raw=raw
        )


# ---------------------------------------------------------------------------
# Public API: Session queries
# ---------------------------------------------------------------------------

def get_recent_sessions(days: int = 7) -> List[Dict[str, Any]]:
    """
    Fetch sessions from the last N days.
    
    Args:
        days: Number of days to look back (default 7)
        
    Returns:
        List of session dicts, newest first. Empty list if DB/table missing.
    """
    with _get_connection() as conn:
        if conn is None:
            return []
        
        if not _table_exists(conn, "sessions"):
            return []
        
        cutoff_date = _date_n_days_ago(days)
        cursor = conn.execute(
            """
            SELECT *
            FROM sessions
            WHERE session_date >= ?
            ORDER BY session_date DESC, session_time DESC
            """,
            (cutoff_date,)
        )
        return _rows_to_dicts(cursor.fetchall())


def get_all_sessions() -> List[SessionRecord]:
    """
    Fetch all sessions ordered by date (newest first).
    """
    with _get_connection() as conn:
        if conn is None:
            return []
        
        if not _table_exists(conn, "sessions"):
            return []
        
        cursor = conn.execute(
            "SELECT * FROM sessions ORDER BY session_date DESC, session_time DESC"
        )
        return [SessionRecord.from_row(row) for row in cursor.fetchall()]


def get_session_by_id(session_id: int) -> Optional[SessionRecord]:
    """
    Lookup a session by its database ID.
    
    Args:
        session_id: Database ID of the session
        
    Returns:
        SessionRecord or None if not found.
    """
    with _get_connection() as conn:
        if conn is None:
            return None
        
        if not _table_exists(conn, "sessions"):
            return None
        
        cursor = conn.execute(
            "SELECT * FROM sessions WHERE id = ?",
            (session_id,)
        )
        row = cursor.fetchone()
        return SessionRecord.from_row(row) if row else None


def get_sessions_in_range(start_date: str, end_date: str) -> List[SessionRecord]:
    """
    Fetch sessions within a date range (inclusive).
    Dates should be in YYYY-MM-DD format.
    """
    with _get_connection() as conn:
        if conn is None:
            return []
        
        if not _table_exists(conn, "sessions"):
            return []
        
        cursor = conn.execute(
            """
            SELECT * FROM sessions 
            WHERE session_date >= ? AND session_date <= ?
            ORDER BY session_date DESC, session_time DESC
            """,
            (start_date, end_date)
        )
        return [SessionRecord.from_row(row) for row in cursor.fetchall()]


def get_sessions_by_mode(study_mode: str) -> List[SessionRecord]:
    """
    Fetch all sessions with a specific study mode (Core, Sprint, Drill).
    """
    with _get_connection() as conn:
        if conn is None:
            return []
        
        if not _table_exists(conn, "sessions"):
            return []
        
        cursor = conn.execute(
            "SELECT * FROM sessions WHERE study_mode = ? ORDER BY session_date DESC",
            (study_mode,)
        )
        return [SessionRecord.from_row(row) for row in cursor.fetchall()]


def get_low_understanding_sessions(threshold: int = 2) -> List[SessionRecord]:
    """
    Fetch sessions where understanding_level is at or below threshold.
    """
    with _get_connection() as conn:
        if conn is None:
            return []
        
        if not _table_exists(conn, "sessions"):
            return []
        
        cursor = conn.execute(
            """
            SELECT * FROM sessions 
            WHERE understanding_level IS NOT NULL AND understanding_level <= ?
            ORDER BY understanding_level ASC, session_date DESC
            """,
            (threshold,)
        )
        return [SessionRecord.from_row(row) for row in cursor.fetchall()]


def get_sessions_without_wrap() -> List[SessionRecord]:
    """
    Fetch sessions where WRAP phase was not reached.
    """
    with _get_connection() as conn:
        if conn is None:
            return []
        
        if not _table_exists(conn, "sessions"):
            return []
        
        cursor = conn.execute(
            """
            SELECT * FROM sessions 
            WHERE wrap_phase_reached IS NOT NULL 
              AND LOWER(wrap_phase_reached) IN ('no', 'n', 'false', '0')
            ORDER BY session_date DESC
            """
        )
        return [SessionRecord.from_row(row) for row in cursor.fetchall()]


# ---------------------------------------------------------------------------
# Public API: Tutor turns queries
# ---------------------------------------------------------------------------

def get_recent_tutor_turns(days: int = 7) -> List[Dict[str, Any]]:
    """
    Fetch tutor_turns from the last N days.
    
    Returns:
        List of turn dicts, newest first. Empty list if table missing.
    """
    with _get_connection() as conn:
        if conn is None:
            return []
        
        if not _table_exists(conn, "tutor_turns"):
            return []
        
        cutoff_date = _date_n_days_ago(days)
        cursor = conn.execute(
            """
            SELECT *
            FROM tutor_turns
            WHERE DATE(created_at) >= ?
            ORDER BY created_at DESC
            """,
            (cutoff_date,)
        )
        return _rows_to_dicts(cursor.fetchall())


def get_turns_for_session(session_id: str) -> List[Dict[str, Any]]:
    """
    Get all tutor turns for a specific session_id.
    
    Args:
        session_id: The session identifier (string, e.g., "sess-20260109-143022")
        
    Returns:
        List of turn dicts ordered by turn_number. Empty if no turns/table.
    """
    with _get_connection() as conn:
        if conn is None:
            return []
        
        if not _table_exists(conn, "tutor_turns"):
            return []
        
        cursor = conn.execute(
            """
            SELECT *
            FROM tutor_turns
            WHERE session_id = ?
            ORDER BY turn_number ASC
            """,
            (session_id,)
        )
        return _rows_to_dicts(cursor.fetchall())


def get_unverified_answers(days: int = 7) -> List[Dict[str, Any]]:
    """
    Fetch tutor turns where unverified=1 from the last N days.
    
    These are answers that were not grounded in RAG sources - 
    important for Scholar to audit for accuracy risks.
    """
    with _get_connection() as conn:
        if conn is None:
            return []
        
        if not _table_exists(conn, "tutor_turns"):
            return []
        
        cutoff_date = _date_n_days_ago(days)
        cursor = conn.execute(
            """
            SELECT *
            FROM tutor_turns
            WHERE unverified = 1
              AND DATE(created_at) >= ?
            ORDER BY created_at DESC
            """,
            (cutoff_date,)
        )
        return _rows_to_dicts(cursor.fetchall())


# ---------------------------------------------------------------------------
# Public API: Metrics calculation
# ---------------------------------------------------------------------------

def _safe_parse_json(json_str: Optional[str]) -> Any:
    """Safely parse JSON, returning empty list on failure."""
    if not json_str:
        return []
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError):
        return []


def calculate_session_metrics(session_id: str) -> Dict[str, Any]:
    """
    Calculate aggregated metrics for a session.
    
    Returns:
        Dict with:
        - turns_count: Number of tutor turns
        - avg_question_length: Average chars in questions
        - avg_answer_length: Average chars in answers
        - unverified_ratio: Fraction of unverified answers (0.0-1.0)
        - duration_minutes: Session duration (from sessions table)
        - citations_count: Total citations across all turns
    """
    metrics = {
        "session_id": session_id,
        "turns_count": 0,
        "avg_question_length": 0.0,
        "avg_answer_length": 0.0,
        "unverified_ratio": 0.0,
        "duration_minutes": None,
        "citations_count": 0,
    }
    
    # Get turns for this session
    turns = get_turns_for_session(session_id)
    if not turns:
        return metrics
    
    metrics["turns_count"] = len(turns)
    
    # Calculate averages
    total_q_len = 0
    total_a_len = 0
    unverified_count = 0
    total_citations = 0
    
    for turn in turns:
        question = turn.get("question") or ""
        answer = turn.get("answer") or ""
        total_q_len += len(question)
        total_a_len += len(answer)
        
        if turn.get("unverified"):
            unverified_count += 1
        
        citations = _safe_parse_json(turn.get("citations_json"))
        if isinstance(citations, list):
            total_citations += len(citations)
    
    n = len(turns)
    metrics["avg_question_length"] = round(total_q_len / n, 1)
    metrics["avg_answer_length"] = round(total_a_len / n, 1)
    metrics["unverified_ratio"] = round(unverified_count / n, 3)
    metrics["citations_count"] = total_citations
    
    return metrics


# ---------------------------------------------------------------------------
# Utility: Summary for Scholar workflows
# ---------------------------------------------------------------------------

def get_audit_summary(days: int = 7) -> Dict[str, Any]:
    """
    Generate a high-level summary for Scholar audit workflows.
    
    Returns:
        Dict with:
        - db_exists: Whether the database file exists
        - sessions_count: Number of sessions in period
        - turns_count: Number of tutor turns in period
        - unverified_count: Number of unverified answers
        - coverage: Date range covered
    """
    db_path = get_db_path()
    
    summary = {
        "db_exists": db_path.exists(),
        "db_path": str(db_path),
        "sessions_count": 0,
        "turns_count": 0,
        "unverified_count": 0,
        "date_range_start": _date_n_days_ago(days),
        "date_range_end": datetime.now().strftime("%Y-%m-%d"),
    }
    
    if not summary["db_exists"]:
        return summary
    
    sessions = get_recent_sessions(days)
    turns = get_recent_tutor_turns(days)
    unverified = get_unverified_answers(days)
    
    summary["sessions_count"] = len(sessions)
    summary["turns_count"] = len(turns)
    summary["unverified_count"] = len(unverified)
    
    return summary


def get_session_count() -> int:
    """Return total number of sessions in the database."""
    with _get_connection() as conn:
        if conn is None:
            return 0
        
        if not _table_exists(conn, "sessions"):
            return 0
        
        cursor = conn.execute("SELECT COUNT(*) FROM sessions")
        return cursor.fetchone()[0]


def get_study_mode_distribution() -> Dict[str, int]:
    """Return count of sessions per study mode."""
    with _get_connection() as conn:
        if conn is None:
            return {}
        
        if not _table_exists(conn, "sessions"):
            return {}
        
        cursor = conn.execute(
            """
            SELECT study_mode, COUNT(*) as count 
            FROM sessions 
            WHERE study_mode IS NOT NULL 
            GROUP BY study_mode
            """
        )
        return {row["study_mode"]: row["count"] for row in cursor.fetchall()}


def get_average_metrics() -> Dict[str, float]:
    """
    Return average understanding, retention, and system performance.
    """
    with _get_connection() as conn:
        if conn is None:
            return {"avg_understanding": 0, "avg_retention": 0, "avg_performance": 0, "avg_duration_minutes": 0}
        
        if not _table_exists(conn, "sessions"):
            return {"avg_understanding": 0, "avg_retention": 0, "avg_performance": 0, "avg_duration_minutes": 0}
        
        cursor = conn.execute(
            """
            SELECT 
                AVG(understanding_level) as avg_understanding,
                AVG(retention_confidence) as avg_retention,
                AVG(system_performance) as avg_performance,
                AVG(duration_minutes) as avg_duration
            FROM sessions
            WHERE understanding_level IS NOT NULL
            """
        )
        row = cursor.fetchone()
        return {
            "avg_understanding": round(row["avg_understanding"] or 0, 2),
            "avg_retention": round(row["avg_retention"] or 0, 2),
            "avg_performance": round(row["avg_performance"] or 0, 2),
            "avg_duration_minutes": round(row["avg_duration"] or 0, 1)
        }


# ---------------------------------------------------------------------------
# CLI for quick testing
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("Scholar Brain Reader - Diagnostic")
    print("=" * 50)
    
    db_path = get_db_path()
    print(f"Database path: {db_path}")
    print(f"Database exists: {db_path.exists()}")
    
    if not db_path.exists():
        print("\n[WARN] Database not found. Run Brain setup first.")
        exit(0)
    
    print("\n--- Audit Summary (last 7 days) ---")
    summary = get_audit_summary(7)
    for k, v in summary.items():
        print(f"  {k}: {v}")
    
    print("\n--- Recent Sessions (last 7 days) ---")
    sessions = get_recent_sessions(7)
    print(f"  Found {len(sessions)} session(s)")
    for s in sessions[:3]:
        print(f"    - {s.get('session_date')} | {s.get('main_topic', s.get('topic', 'N/A'))}")
    
    print("\n--- Tutor Turns Status ---")
    with _get_connection() as conn:
        if conn and _table_exists(conn, "tutor_turns"):
            print("  tutor_turns table: EXISTS")
            turns = get_recent_tutor_turns(7)
            print(f"  Recent turns: {len(turns)}")
        else:
            print("  tutor_turns table: NOT FOUND")
    
    print("\n--- Average Metrics ---")
    metrics = get_average_metrics()
    for k, v in metrics.items():
        print(f"  {k}: {v}")
    
    print("\n[OK] Brain reader operational")

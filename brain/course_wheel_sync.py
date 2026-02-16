from __future__ import annotations

import sqlite3
from datetime import datetime
from typing import Any, Optional

from db_setup import get_connection, init_database


def _ensure_courses_table(cur: sqlite3.Cursor) -> None:
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT,
            term TEXT,
            instructor TEXT,
            default_study_mode TEXT,
            delivery_format TEXT,
            time_budget_per_week_minutes INTEGER DEFAULT 0,
            color TEXT,
            last_scraped_at TEXT,
            created_at TEXT NOT NULL
        )
        """
    )


def _ensure_wheel_courses_table(cur: sqlite3.Cursor) -> None:
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS wheel_courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER,
            name TEXT NOT NULL,
            active INTEGER DEFAULT 1,
            position INTEGER DEFAULT 0,
            total_sessions INTEGER DEFAULT 0,
            total_minutes INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cur.execute("PRAGMA table_info(wheel_courses)")
    cols = {row[1] for row in cur.fetchall()}
    if "course_id" not in cols:
        cur.execute("ALTER TABLE wheel_courses ADD COLUMN course_id INTEGER")


def _require_course_name(cur: sqlite3.Cursor, course_id: int) -> str:
    cur.execute("SELECT name FROM courses WHERE id = ?", (course_id,))
    row = cur.fetchone()
    if not row:
        raise ValueError(f"Course {course_id} not found")
    return str(row[0] or "").strip() or f"Course {course_id}"


def ensure_course_in_wheel(
    course_id: int,
    *,
    name: Optional[str] = None,
    active: bool = True,
) -> dict[str, Any]:
    """
    Ensure the given course has a linked wheel_courses row.
    Returns link metadata for diagnostics and API responses.
    """
    if not isinstance(course_id, int):
        course_id = int(course_id)
    if course_id <= 0:
        raise ValueError("course_id must be a positive integer")

    init_database()
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    try:
        _ensure_courses_table(cur)
        _ensure_wheel_courses_table(cur)

        course_name = (name or "").strip() or _require_course_name(cur, course_id)

        cur.execute(
            """
            SELECT id, position FROM wheel_courses
            WHERE course_id = ?
            ORDER BY id ASC
            LIMIT 1
            """,
            (course_id,),
        )
        row = cur.fetchone()

        if row:
            wheel_id = int(row["id"])
            cur.execute(
                """
                UPDATE wheel_courses
                SET name = ?, active = ?
                WHERE id = ?
                """,
                (course_name, 1 if active else 0, wheel_id),
            )
        else:
            cur.execute(
                """
                SELECT id, position FROM wheel_courses
                WHERE course_id IS NULL AND lower(name) = ?
                ORDER BY id ASC
                LIMIT 1
                """,
                (course_name.lower(),),
            )
            legacy_row = cur.fetchone()
            if legacy_row:
                wheel_id = int(legacy_row["id"])
                cur.execute(
                    """
                    UPDATE wheel_courses
                    SET course_id = ?, name = ?, active = ?
                    WHERE id = ?
                    """,
                    (course_id, course_name, 1 if active else 0, wheel_id),
                )
            else:
                cur.execute("SELECT COALESCE(MAX(position), -1) + 1 FROM wheel_courses")
                next_position = int(cur.fetchone()[0])
                cur.execute(
                    """
                    INSERT INTO wheel_courses (
                        course_id, name, active, position, total_sessions,
                        total_minutes, created_at
                    )
                    VALUES (?, ?, ?, ?, 0, 0, ?)
                    """,
                    (
                        course_id,
                        course_name,
                        1 if active else 0,
                        next_position,
                        datetime.now().isoformat(),
                    ),
                )
                wheel_id = int(cur.lastrowid)

        conn.commit()

        cur.execute(
            """
            SELECT id, course_id, name, active, position, total_sessions, total_minutes, created_at
            FROM wheel_courses
            WHERE id = ?
            """,
            (wheel_id,),
        )
        linked = cur.fetchone()
        if not linked:
            raise RuntimeError(f"Failed to read wheel link for course {course_id}")

        return {
            "wheel_id": int(linked["id"]),
            "course_id": int(linked["course_id"]) if linked["course_id"] is not None else None,
            "name": linked["name"],
            "active": bool(linked["active"]),
            "position": int(linked["position"]) if linked["position"] is not None else None,
            "total_sessions": int(linked["total_sessions"] or 0),
            "total_minutes": int(linked["total_minutes"] or 0),
            "created_at": linked["created_at"],
        }
    finally:
        conn.close()


def get_course_wheel_link(course_id: int) -> Optional[dict[str, Any]]:
    """Read current wheel link metadata for a course, if present."""
    if not isinstance(course_id, int):
        course_id = int(course_id)
    if course_id <= 0:
        return None

    init_database()
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    try:
        _ensure_wheel_courses_table(cur)
        cur.execute(
            """
            SELECT id, course_id, name, active, position, total_sessions, total_minutes, created_at
            FROM wheel_courses
            WHERE course_id = ?
            ORDER BY id ASC
            LIMIT 1
            """,
            (course_id,),
        )
        row = cur.fetchone()
        if not row:
            return None

        return {
            "wheel_id": int(row["id"]),
            "course_id": int(row["course_id"]) if row["course_id"] is not None else None,
            "name": row["name"],
            "active": bool(row["active"]),
            "position": int(row["position"]) if row["position"] is not None else None,
            "total_sessions": int(row["total_sessions"] or 0),
            "total_minutes": int(row["total_minutes"] or 0),
            "created_at": row["created_at"],
        }
    finally:
        conn.close()

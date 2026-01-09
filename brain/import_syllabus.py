#!/usr/bin/env python3
"""
Import a course syllabus into the Brain database.

This script maps a single structured syllabus file into:
- `courses`      -> one row per course
- `course_events` -> one row per lecture/reading/quiz/exam/assignment

The expected input format is JSON, for example:

{
  "name": "PT Anatomy I",
  "code": "PTA101",
  "term": "Spring 2026",
  "instructor": "Dr. Smith",
  "default_study_mode": "Core",
  "time_budget_per_week_minutes": 900,
  "events": [
    {
      "type": "lecture",
      "title": "Week 1 – Intro to Pelvis",
      "date": "2026-01-13",
      "due_date": null,
      "weight": 0.0,
      "raw_text": "Lecture, slides 01-Intro, read Ch. 1"
    },
    {
      "type": "exam",
      "title": "Exam 1 – Pelvis & Hip",
      "date": "2026-02-10",
      "due_date": "2026-02-10",
      "weight": 0.3,
      "raw_text": "Covers weeks 1–3, Chapters 1–5"
    }
  ]
}

Usage:
    cd brain
    python import_syllabus.py path/to/PTA101_syllabus.json

By default this script will:
- Upsert the course (matching on code + term when provided).
- Append new course_events for this course.
Use --replace-events to delete existing events for this course first.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from db_setup import get_connection, init_database


def upsert_course(course_data: Dict[str, Any]) -> int:
    """Insert or update a course row, returning its id."""
    init_database()
    conn = get_connection()
    cur = conn.cursor()

    # Normalize possibly-null fields to empty strings before stripping to
    # avoid 'NoneType has no attribute strip' errors when JSON uses null.
    name = str(course_data.get("name") or "").strip()
    code = str(course_data.get("code") or "").strip() or None
    term = str(course_data.get("term") or "").strip() or None
    instructor = str(course_data.get("instructor") or "").strip() or None
    default_mode = (
        str(course_data.get("default_study_mode") or "Core").strip() or "Core"
    )
    time_budget = int(course_data.get("time_budget_per_week_minutes", 0) or 0)
    now = datetime.now().isoformat(timespec="seconds")

    # Try to find an existing course by code+term (preferred), then by name.
    course_id: Optional[int] = None
    if code and term:
        cur.execute(
            """
            SELECT id FROM courses
            WHERE code = ? AND term = ?
            """,
            (code, term),
        )
        row = cur.fetchone()
        if row:
            course_id = row[0]
    if course_id is None and name:
        cur.execute(
            """
            SELECT id FROM courses
            WHERE name = ?
            """,
            (name,),
        )
        row = cur.fetchone()
        if row:
            course_id = row[0]

    if course_id is None:
        # Insert new course
        cur.execute(
            """
            INSERT INTO courses (
                name, code, term, instructor,
                default_study_mode,
                time_budget_per_week_minutes,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (name, code, term, instructor, default_mode, time_budget, now),
        )
        course_id = cur.lastrowid
        print(f"[OK] Created new course '{name}' (id={course_id})")
    else:
        # Update existing course metadata (non-destructive)
        cur.execute(
            """
            UPDATE courses
            SET name = COALESCE(?, name),
                code = COALESCE(?, code),
                term = COALESCE(?, term),
                instructor = COALESCE(?, instructor),
                default_study_mode = COALESCE(?, default_study_mode),
                time_budget_per_week_minutes =
                    CASE WHEN ? > 0 THEN ? ELSE time_budget_per_week_minutes END
            WHERE id = ?
            """,
            (
                name or None,
                code,
                term,
                instructor,
                default_mode,
                time_budget,
                time_budget,
                course_id,
            ),
        )
        print(f"[OK] Updated existing course '{name}' (id={course_id})")

    conn.commit()
    conn.close()
    return int(course_id)


def import_events(course_id: int, events: Any, replace: bool = False) -> int:
    """Import course_events rows for a given course id."""
    if not isinstance(events, list):
        raise ValueError("Expected 'events' to be a list.")

    init_database()
    conn = get_connection()
    cur = conn.cursor()

    if replace:
        cur.execute("DELETE FROM course_events WHERE course_id = ?", (course_id,))
        print(f"[INFO] Existing events cleared for course_id={course_id}")

    inserted = 0
    now = datetime.now().isoformat(timespec="seconds")
    for ev in events:
        if not isinstance(ev, dict):
            continue
        ev_type = (ev.get("type") or "other").strip()
        title = (ev.get("title") or "").strip()
        if not title:
            continue
        date = (ev.get("date") or "").strip() or None
        due_date = (ev.get("due_date") or "").strip() or None
        weight = float(ev.get("weight", 0.0) or 0.0)
        raw_text = (ev.get("raw_text") or "").strip()

        cur.execute(
            """
            INSERT INTO course_events (
                course_id, type, title, date, due_date,
                weight, raw_text, status, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            """,
            (course_id, ev_type, title, date, due_date, weight, raw_text, now),
        )
        inserted += 1

    conn.commit()
    conn.close()
    print(f"[OK] Imported {inserted} event(s) for course_id={course_id}")
    return inserted


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import a structured course syllabus into the Brain database."
    )
    parser.add_argument(
        "syllabus_path",
        help="Path to a JSON syllabus file (see module docstring for schema).",
    )
    parser.add_argument(
        "--replace-events",
        action="store_true",
        help="Delete existing course_events for this course before inserting.",
    )
    args = parser.parse_args()

    path = Path(args.syllabus_path)
    if not path.exists():
        raise SystemExit(f"[ERROR] Syllabus file not found: {path}")

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise SystemExit(f"[ERROR] Failed to parse JSON: {exc}")

    if not isinstance(data, dict):
        raise SystemExit("[ERROR] Syllabus JSON must be an object at the top level.")

    course_id = upsert_course(data)
    events = data.get("events", [])
    import_events(course_id, events, replace=args.replace_events)

    print("\n[DONE] Syllabus import complete.")


if __name__ == "__main__":
    main()


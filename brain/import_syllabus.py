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
from typing import Any, Dict, List, Optional, Tuple

from db_setup import get_connection, init_database

# Prefer completed events, then earliest created_at when resolving duplicates
STATUS_PRIORITY = {"completed": 3, "pending": 2, "cancelled": 1}


def _normalize_str(value: Any) -> str:
    return str(value or "").strip()


def _normalize_event_input(ev: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize inbound event payload to a consistent shape."""
    ev_type = _normalize_str(ev.get("type") or "other") or "other"
    title = _normalize_str(ev.get("title"))
    date = _normalize_str(ev.get("date")) or None
    due_date = _normalize_str(ev.get("due_date")) or None
    weight = float(ev.get("weight", 0.0) or 0.0)
    raw_text = _normalize_str(ev.get("raw_text"))
    status = _normalize_str(ev.get("status") or "pending") or "pending"

    return {
        "type": ev_type,
        "title": title,
        "date": date,
        "due_date": due_date,
        "weight": weight,
        "raw_text": raw_text,
        "status": status,
    }


def _event_dedupe_key(
    course_id: int, ev: Dict[str, Any]
) -> Tuple[int, str, str, str, str, float, str]:
    """Key used to detect duplicate course_events rows."""
    return (
        int(course_id),
        (_normalize_str(ev.get("type")) or "other").lower(),
        (_normalize_str(ev.get("title"))).lower(),
        _normalize_str(ev.get("date")),
        _normalize_str(ev.get("due_date")),
        round(float(ev.get("weight", 0.0) or 0.0), 4),
        (_normalize_str(ev.get("raw_text"))).lower(),
    )


def _load_existing_event_keys(cur, course_id: int) -> set:
    cur.execute(
        """
        SELECT course_id, type, title, date, due_date, weight, raw_text
        FROM course_events
        WHERE course_id = ?
        """,
        (course_id,),
    )
    rows = cur.fetchall()
    keys = set()
    for row in rows:
        existing = {
            "type": row[1],
            "title": row[2],
            "date": row[3],
            "due_date": row[4],
            "weight": row[5],
            "raw_text": row[6],
        }
        keys.add(_event_dedupe_key(row[0], existing))
    return keys


def _parse_created_at(value: Optional[str]) -> datetime:
    try:
        return datetime.fromisoformat(value) if value else datetime.max
    except Exception:
        return datetime.max


def _normalize_course_key(
    name: Any, code: Any, term: Any
) -> Optional[Tuple[str, str, str]]:
    name_norm = _normalize_str(name).lower()
    code_norm = _normalize_str(code).lower()
    term_norm = _normalize_str(term).lower()
    if not (name_norm and code_norm and term_norm):
        return None
    return (name_norm, code_norm, term_norm)


def merge_duplicate_courses(
    target_key: Optional[Tuple[str, str, str]] = None,
) -> Dict[str, Any]:
    """Merge duplicate courses by normalized (name, code, term) key."""
    init_database()
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT id, name, code, term, created_at FROM courses")
    rows = cur.fetchall()

    groups: Dict[Tuple[str, str, str], List[Dict[str, Any]]] = {}
    for row in rows:
        key = _normalize_course_key(row[1], row[2], row[3])
        if not key:
            continue
        if target_key and key != target_key:
            continue
        groups.setdefault(key, []).append(
            {
                "id": int(row[0]),
                "name": row[1],
                "code": row[2],
                "term": row[3],
                "created_at": row[4],
            }
        )

    merge_details = []
    update_tables = [
        "course_events",
        "scraped_events",
        "topics",
        "study_tasks",
        "rag_docs",
        "tutor_turns",
        "card_drafts",
    ]

    for key, items in groups.items():
        if len(items) < 2:
            continue
        items.sort(
            key=lambda item: (_parse_created_at(item.get("created_at")), item["id"])
        )
        keep = items[0]
        merged_ids = []
        for dup in items[1:]:
            dup_id = dup["id"]
            for table in update_tables:
                cur.execute(
                    f"UPDATE {table} SET course_id = ? WHERE course_id = ?",
                    (keep["id"], dup_id),
                )
            cur.execute("DELETE FROM courses WHERE id = ?", (dup_id,))
            merged_ids.append(dup_id)

        merge_details.append(
            {
                "key": {"name": key[0], "code": key[1], "term": key[2]},
                "kept_id": keep["id"],
                "merged_ids": merged_ids,
            }
        )

    conn.commit()
    conn.close()

    return {
        "merged_count": len(merge_details),
        "details": merge_details,
    }


def _prefer_event(
    existing: Dict[str, Any], candidate: Dict[str, Any]
) -> Dict[str, Any]:
    """Choose which event to keep when duplicates share the same key."""
    existing_status = (_normalize_str(existing.get("status")) or "pending").lower()
    candidate_status = (_normalize_str(candidate.get("status")) or "pending").lower()
    existing_score = STATUS_PRIORITY.get(existing_status, 1)
    candidate_score = STATUS_PRIORITY.get(candidate_status, 1)

    if candidate_score > existing_score:
        return candidate
    if candidate_score < existing_score:
        return existing

    existing_created = _parse_created_at(existing.get("created_at"))
    candidate_created = _parse_created_at(candidate.get("created_at"))
    return candidate if candidate_created < existing_created else existing


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

    # Try to find an existing course by code+term+name (preferred), then code+term, then name.
    course_id: Optional[int] = None
    if name and code and term:
        cur.execute(
            """
            SELECT id FROM courses
            WHERE lower(name) = ? AND lower(code) = ? AND lower(term) = ?
            """,
            (name.lower(), code.lower(), term.lower()),
        )
        row = cur.fetchone()
        if row:
            course_id = row[0]
    if course_id is None and code and term:
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

    normalized_events: List[Dict[str, Any]] = []
    for ev in events:
        if not isinstance(ev, dict):
            continue
        normalized = _normalize_event_input(ev)
        if not normalized.get("title"):
            continue
        normalized_events.append(normalized)

    if replace:
        cur.execute("DELETE FROM course_events WHERE course_id = ?", (course_id,))
        print(f"[INFO] Existing events cleared for course_id={course_id}")
        existing_keys = set()
    else:
        existing_keys = _load_existing_event_keys(cur, course_id)

    inserted = 0
    skipped = 0
    now = datetime.now().isoformat(timespec="seconds")
    for ev in normalized_events:
        key = _event_dedupe_key(course_id, ev)
        if key in existing_keys:
            skipped += 1
            continue
        existing_keys.add(key)

        cur.execute(
            """
            INSERT INTO course_events (
                course_id, type, title, date, due_date,
                weight, raw_text, status, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
            """,
            (
                course_id,
                ev["type"],
                ev["title"],
                ev["date"],
                ev["due_date"],
                ev["weight"],
                ev["raw_text"],
                now,
                now,
            ),
        )

        inserted += 1

    conn.commit()
    conn.close()
    if skipped:
        print(f"[INFO] Skipped {skipped} duplicate event(s) for course_id={course_id}")
    print(f"[OK] Imported {inserted} event(s) for course_id={course_id}")
    return inserted


def dedupe_course_events(
    course_id: Optional[int] = None,
    apply: bool = False,
    verbose: bool = False,
) -> Dict[str, Any]:
    """
    Remove duplicate course_events rows (e.g., when the same JSON was imported twice).

    - course_id: limit dedupe to a specific course (optional)
    - apply: when False, perform a dry run
    - verbose: when True, list kept/deleted ids for inspection
    """

    init_database()
    conn = get_connection()
    cur = conn.cursor()

    where_clause = ""
    params: Tuple[Any, ...] = ()
    if course_id is not None:
        where_clause = " WHERE course_id = ?"
        params = (course_id,)

    cur.execute(
        f"""
        SELECT id, course_id, type, title, date, due_date, weight, raw_text, status, created_at
        FROM course_events{where_clause}
        ORDER BY course_id, id
        """,
        params,
    )
    rows = cur.fetchall()
    events = [
        {
            "id": row[0],
            "course_id": row[1],
            "type": row[2],
            "title": row[3],
            "date": row[4],
            "due_date": row[5],
            "weight": row[6],
            "raw_text": row[7],
            "status": row[8],
            "created_at": row[9],
        }
        for row in rows
    ]

    winners: Dict[Tuple[int, str, str, str, str, float, str], Dict[str, Any]] = {}
    duplicates: List[Dict[str, Any]] = []

    for ev in events:
        key = _event_dedupe_key(ev["course_id"], ev)
        if key not in winners:
            winners[key] = ev
            continue

        preferred = _prefer_event(winners[key], ev)
        if preferred["id"] == winners[key]["id"]:
            duplicates.append(ev)
        else:
            duplicates.append(winners[key])
            winners[key] = ev

    deleted_ids: List[int] = []
    if apply and duplicates:
        deleted_ids = [ev["id"] for ev in duplicates]
        cur.executemany(
            "DELETE FROM course_events WHERE id = ?",
            [(row_id,) for row_id in deleted_ids],
        )
        conn.commit()

    conn.close()

    if verbose:
        print(f"[INFO] Examined {len(events)} event(s)")
        print(f"[INFO] Unique keys: {len(winners)}")
        print(f"[INFO] Duplicate candidates: {len(duplicates)}")
        if deleted_ids:
            print(f"[INFO] Deleted ids: {sorted(deleted_ids)}")

    return {
        "course_filter": course_id,
        "total_events": len(events),
        "unique_events": len(winners),
        "duplicates_found": len(duplicates),
        "deleted": len(deleted_ids),
        "deleted_ids": sorted(deleted_ids),
        "kept_ids": sorted(ev["id"] for ev in winners.values()),
    }


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

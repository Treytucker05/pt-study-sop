"""
Tutor project-shell routes.

This module introduces the course-keyed Tutor shell foundation:
  - GET /api/tutor/project-shell
  - PUT /api/tutor/project-shell/state
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from typing import Any

from flask import jsonify, request

from db_setup import get_connection

from dashboard.api_tutor import tutor_bp  # noqa: E402

VALID_SHELL_MODES = {"studio", "tutor"}
VALID_BOARD_SCOPES = {"session", "project", "overall"}


def _normalize_shell_mode(value: Any) -> str:
    return "tutor" if value == "tutor" else "studio"


def _require_course(conn: sqlite3.Connection, course_id: int) -> sqlite3.Row | None:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, name, code, term, instructor, default_study_mode, delivery_format
        FROM courses
        WHERE id = ?
        """,
        (course_id,),
    )
    return cur.fetchone()


def _require_course_session(
    conn: sqlite3.Connection,
    course_id: int,
    session_id: str,
) -> sqlite3.Row | None:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, session_id, course_id, phase, topic, status, turn_count, started_at, ended_at
        FROM tutor_sessions
        WHERE session_id = ? AND course_id = ?
        """,
        (session_id, course_id),
    )
    return cur.fetchone()


def _normalize_json_dict(value: Any, *, field_name: str) -> dict[str, Any] | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError(f"{field_name} must be an object")
    return value


def _normalize_json_object_list(value: Any, *, field_name: str) -> list[dict[str, Any]]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError(f"{field_name} must be a list of objects")
    normalized: list[dict[str, Any]] = []
    for item in value:
        if not isinstance(item, dict):
            raise ValueError(f"{field_name} must contain only objects")
        normalized.append(item)
    return normalized


def _normalize_optional_string(value: Any, *, field_name: str) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a string")
    return value


def _normalize_int_list(value: Any, *, field_name: str) -> list[int]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError(f"{field_name} must be a list of integers")
    deduped: list[int] = []
    seen: set[int] = set()
    for raw in value:
        if isinstance(raw, bool):
            raise ValueError(f"{field_name} must contain only integers")
        try:
            parsed = int(raw)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{field_name} must contain only integers") from exc
        if parsed in seen:
            continue
        seen.add(parsed)
        deduped.append(parsed)
    return deduped


def _normalize_material_ids(value: Any) -> list[int]:
    return _normalize_int_list(value, field_name="selected_material_ids")


def _normalize_runtime_state(value: Any) -> dict[str, Any]:
    if value is None:
        return {
            "active_memory_capsule_id": None,
            "compaction_telemetry": None,
            "direct_note_save_status": None,
        }
    if not isinstance(value, dict):
        raise ValueError("runtime_state must be an object")

    raw_active_memory_capsule_id = value.get("active_memory_capsule_id")
    if raw_active_memory_capsule_id is None:
        active_memory_capsule_id = None
    elif isinstance(raw_active_memory_capsule_id, bool):
        raise ValueError("runtime_state.active_memory_capsule_id must be an integer")
    else:
        try:
            active_memory_capsule_id = int(raw_active_memory_capsule_id)
        except (TypeError, ValueError) as exc:
            raise ValueError(
                "runtime_state.active_memory_capsule_id must be an integer"
            ) from exc

    return {
        "active_memory_capsule_id": active_memory_capsule_id,
        "compaction_telemetry": _normalize_json_dict(
            value.get("compaction_telemetry"),
            field_name="runtime_state.compaction_telemetry",
        ),
        "direct_note_save_status": _normalize_json_dict(
            value.get("direct_note_save_status"),
            field_name="runtime_state.direct_note_save_status",
        ),
    }


def _serialize_workspace_state(row: sqlite3.Row | None) -> dict[str, Any]:
    if row is None:
        return {
            "active_tutor_session_id": None,
            "last_mode": "studio",
            "active_board_scope": "project",
            "active_board_id": None,
            "viewer_state": None,
            "panel_layout": [],
            "document_tabs": [],
            "active_document_tab_id": None,
            "runtime_state": None,
            "tutor_chain_id": None,
            "tutor_custom_block_ids": [],
            "prime_packet_promoted_objects": [],
            "polish_packet_promoted_notes": [],
            "selected_material_ids": [],
            "revision": 0,
            "updated_at": None,
        }
    viewer_state = None
    if row["viewer_state_json"]:
        try:
            parsed_viewer_state = json.loads(row["viewer_state_json"])
            viewer_state = parsed_viewer_state if isinstance(parsed_viewer_state, dict) else None
        except json.JSONDecodeError:
            viewer_state = None
    selected_material_ids: list[int] = []
    if row["selected_material_ids_json"]:
        try:
            parsed_ids = json.loads(row["selected_material_ids_json"])
            if isinstance(parsed_ids, list):
                selected_material_ids = [int(item) for item in parsed_ids]
        except (TypeError, ValueError, json.JSONDecodeError):
            selected_material_ids = []
    panel_layout: list[dict[str, Any]] = []
    if "panel_layout_json" in row.keys() and row["panel_layout_json"]:
        try:
            parsed_layout = json.loads(row["panel_layout_json"])
            if isinstance(parsed_layout, list):
                panel_layout = [item for item in parsed_layout if isinstance(item, dict)]
        except json.JSONDecodeError:
            panel_layout = []
    document_tabs: list[dict[str, Any]] = []
    if "document_tabs_json" in row.keys() and row["document_tabs_json"]:
        try:
            parsed_tabs = json.loads(row["document_tabs_json"])
            if isinstance(parsed_tabs, list):
                document_tabs = [item for item in parsed_tabs if isinstance(item, dict)]
        except json.JSONDecodeError:
            document_tabs = []
    runtime_state = {
        "active_memory_capsule_id": None,
        "compaction_telemetry": None,
        "direct_note_save_status": None,
    }
    if "runtime_state_json" in row.keys() and row["runtime_state_json"]:
        try:
            runtime_state = _normalize_runtime_state(json.loads(row["runtime_state_json"]))
        except (TypeError, ValueError, json.JSONDecodeError):
            runtime_state = {
                "active_memory_capsule_id": None,
                "compaction_telemetry": None,
                "direct_note_save_status": None,
            }
    tutor_custom_block_ids: list[int] = []
    if "tutor_custom_block_ids_json" in row.keys() and row["tutor_custom_block_ids_json"]:
        try:
            parsed_tutor_block_ids = json.loads(row["tutor_custom_block_ids_json"])
            tutor_custom_block_ids = _normalize_int_list(
                parsed_tutor_block_ids,
                field_name="tutor_custom_block_ids",
            )
        except (TypeError, ValueError, json.JSONDecodeError):
            tutor_custom_block_ids = []
    prime_packet_promoted_objects: list[dict[str, Any]] = []
    if row["prime_packet_promoted_objects_json"]:
        try:
            parsed_objects = json.loads(row["prime_packet_promoted_objects_json"])
            if isinstance(parsed_objects, list):
                prime_packet_promoted_objects = [
                    item for item in parsed_objects if isinstance(item, dict)
                ]
        except json.JSONDecodeError:
            prime_packet_promoted_objects = []
    polish_packet_promoted_notes: list[dict[str, Any]] = []
    if "polish_packet_promoted_notes_json" in row.keys() and row["polish_packet_promoted_notes_json"]:
        try:
            parsed_notes = json.loads(row["polish_packet_promoted_notes_json"])
            if isinstance(parsed_notes, list):
                polish_packet_promoted_notes = [
                    item for item in parsed_notes if isinstance(item, dict)
                ]
        except json.JSONDecodeError:
            polish_packet_promoted_notes = []
    return {
        "active_tutor_session_id": row["active_tutor_session_id"],
        "last_mode": _normalize_shell_mode(row["last_mode"]),
        "active_board_scope": row["active_board_scope"] or "project",
        "active_board_id": row["active_board_id"],
        "viewer_state": viewer_state,
        "panel_layout": panel_layout,
        "document_tabs": document_tabs,
        "active_document_tab_id": row["active_document_tab_id"],
        "runtime_state": runtime_state,
        "tutor_chain_id": row["tutor_chain_id"] if "tutor_chain_id" in row.keys() else None,
        "tutor_custom_block_ids": tutor_custom_block_ids,
        "prime_packet_promoted_objects": prime_packet_promoted_objects,
        "polish_packet_promoted_notes": polish_packet_promoted_notes,
        "selected_material_ids": selected_material_ids,
        "revision": int(row["revision"] or 0),
        "updated_at": row["updated_at"],
    }


def _ensure_wheel_courses_schema(cur: sqlite3.Cursor) -> None:
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
    columns = {row[1] for row in cur.fetchall()}
    if "course_id" not in columns:
        cur.execute("ALTER TABLE wheel_courses ADD COLUMN course_id INTEGER")


def _event_scheduled_date(row: sqlite3.Row | dict[str, Any]) -> str | None:
    if isinstance(row, sqlite3.Row):
        due_date = row["due_date"] if "due_date" in row.keys() else None
        base_date = row["date"] if "date" in row.keys() else None
        scheduled_date = row["scheduled_date"] if "scheduled_date" in row.keys() else None
    else:
        due_date = row.get("due_date")
        base_date = row.get("date")
        scheduled_date = row.get("scheduled_date")
    return str(scheduled_date or due_date or base_date or "").strip() or None


def _event_sort_key(row: sqlite3.Row | dict[str, Any]) -> tuple[int, str]:
    scheduled = _event_scheduled_date(row)
    return (0 if scheduled else 1, scheduled or "9999-12-31")


def _serialize_hub_event(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    if isinstance(row, sqlite3.Row):
        record = dict(row)
    else:
        record = dict(row)
    return {
        "id": int(record["id"]),
        "course_id": int(record["course_id"]),
        "course_name": record.get("course_name") or record.get("course") or "",
        "course_code": record.get("course_code"),
        "title": record.get("title") or "",
        "type": record.get("type") or "other",
        "scheduled_date": _event_scheduled_date(record),
        "status": record.get("status") or "pending",
    }


def _format_resume_label(last_mode: str | None, topic: str | None) -> str:
    if _normalize_shell_mode(last_mode) == "studio":
        return "Resume Studio Workspace"
    if topic:
        return "Resume Tutor Session"
    return "Resume Tutor"


def _format_action_label(kind: str) -> str:
    if kind == "resume_session":
        return "RESUME"
    if kind == "planner_task":
        return "OPEN SCHEDULE"
    if kind == "exam":
        return "OPEN EXAM"
    if kind == "assignment":
        return "OPEN EVENT"
    if kind == "wheel_course":
        return "OPEN PROJECT"
    return "OPEN"


@tutor_bp.route("/hub", methods=["GET"])
def get_tutor_hub():
    today = datetime.now(timezone.utc).date().isoformat()

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()
        _ensure_wheel_courses_schema(cur)
        conn.commit()

        cur.execute(
            """
            SELECT
                c.id,
                c.name,
                c.code,
                COUNT(DISTINCT r.id) AS material_count,
                CASE WHEN w.id IS NULL THEN 0 ELSE 1 END AS wheel_linked,
                COALESCE(w.active, 0) AS wheel_active,
                w.position AS wheel_position
            FROM courses c
            LEFT JOIN wheel_courses w ON w.course_id = c.id
            LEFT JOIN rag_docs r ON r.course_id = c.id
                AND COALESCE(r.enabled, 1) = 1
                AND COALESCE(r.corpus, 'materials') = 'materials'
            WHERE c.term IS NOT NULL
               OR c.id IN (SELECT DISTINCT course_id FROM rag_docs WHERE course_id IS NOT NULL)
               OR c.id IN (SELECT DISTINCT course_id FROM wheel_courses WHERE course_id IS NOT NULL)
            GROUP BY c.id, w.id
            ORDER BY c.name
            """
        )
        course_rows = list(cur.fetchall())

        cur.execute(
            """
            SELECT
                session_id,
                course_id,
                phase,
                topic,
                status,
                turn_count,
                started_at,
                ended_at
            FROM tutor_sessions
            WHERE course_id IS NOT NULL
            ORDER BY datetime(started_at) DESC, id DESC
            """
        )
        latest_session_by_course: dict[int, dict[str, Any]] = {}
        active_session_by_course: dict[int, dict[str, Any]] = {}
        session_counts: dict[int, int] = {}
        for row in cur.fetchall():
            record = dict(row)
            course_id = int(record["course_id"])
            session_counts[course_id] = session_counts.get(course_id, 0) + 1
            latest_session_by_course.setdefault(course_id, record)
            if record.get("status") == "active" and course_id not in active_session_by_course:
                active_session_by_course[course_id] = record

        cur.execute(
            """
            SELECT
                ce.id,
                ce.course_id,
                ce.course,
                ce.type,
                ce.title,
                ce.date,
                ce.due_date,
                COALESCE(ce.status, 'pending') AS status,
                c.name AS course_name,
                c.code AS course_code
            FROM course_events ce
            LEFT JOIN courses c ON c.id = ce.course_id
            WHERE ce.course_id IS NOT NULL
              AND COALESCE(ce.status, 'pending') = 'pending'
            ORDER BY
                CASE WHEN COALESCE(ce.due_date, ce.date) IS NULL THEN 1 ELSE 0 END,
                COALESCE(ce.due_date, ce.date) ASC,
                ce.id ASC
            """
        )
        pending_event_rows = list(cur.fetchall())
        next_due_by_course: dict[int, dict[str, Any]] = {}
        pending_event_count_by_course: dict[int, int] = {}
        assignments: list[dict[str, Any]] = []
        tests: list[dict[str, Any]] = []
        for row in pending_event_rows:
            course_id = int(row["course_id"])
            next_due_by_course.setdefault(course_id, dict(row))
            pending_event_count_by_course[course_id] = pending_event_count_by_course.get(course_id, 0) + 1
            event_type = str(row["type"] or "").strip().lower()
            serialized = _serialize_hub_event(row)
            if event_type in {"assignment", "project"} and len(assignments) < 2:
                assignments.append(serialized)
            elif event_type in {"quiz", "exam"} and len(tests) < 2:
                tests.append(serialized)
            if len(assignments) >= 2 and len(tests) >= 2:
                continue

        cur.execute(
            """
            SELECT
                course_id,
                SUM(CASE WHEN status = 'captured' THEN 1 ELSE 0 END) AS captured_item_count,
                SUM(CASE WHEN status = 'promoted' THEN 1 ELSE 0 END) AS promoted_item_count
            FROM studio_items
            WHERE course_id IS NOT NULL
              AND deleted_at IS NULL
            GROUP BY course_id
            """
        )
        studio_counts_by_course = {
            int(row["course_id"]): {
                "captured_item_count": int(row["captured_item_count"] or 0),
                "promoted_item_count": int(row["promoted_item_count"] or 0),
            }
            for row in cur.fetchall()
            if row["course_id"] is not None
        }

        cur.execute(
            """
            SELECT
                p.course_id,
                p.active_tutor_session_id,
                p.last_mode,
                p.active_board_scope,
                p.active_board_id,
                p.updated_at,
                c.name AS course_name,
                c.code AS course_code,
                s.topic AS active_topic,
                s.status AS active_status
            FROM project_workspace_state p
            LEFT JOIN courses c ON c.id = p.course_id
            LEFT JOIN tutor_sessions s
                ON s.session_id = p.active_tutor_session_id
               AND s.course_id = p.course_id
            ORDER BY
                CASE WHEN s.status = 'active' THEN 0 ELSE 1 END,
                datetime(COALESCE(p.updated_at, '1970-01-01T00:00:00')) DESC,
                p.id DESC
            """
        )
        workspace_rows = list(cur.fetchall())
        resume_row = workspace_rows[0] if workspace_rows else None
        fallback_session = None
        if resume_row is not None:
            fallback_session = latest_session_by_course.get(int(resume_row["course_id"]))
        resume_candidate = {
            "can_resume": bool(
                resume_row
                and resume_row["active_tutor_session_id"]
                and resume_row["active_status"] == "active"
            ),
            "course_id": int(resume_row["course_id"]) if resume_row else None,
            "course_name": resume_row["course_name"] if resume_row else None,
            "course_code": resume_row["course_code"] if resume_row else None,
            "session_id": resume_row["active_tutor_session_id"] if resume_row else None,
            "last_mode": resume_row["last_mode"] if resume_row else None,
            "board_scope": resume_row["active_board_scope"] if resume_row else None,
            "board_id": resume_row["active_board_id"] if resume_row else None,
            "topic": (
                resume_row["active_topic"]
                if resume_row and resume_row["active_topic"]
                else (fallback_session["topic"] if fallback_session else None)
            ),
            "updated_at": resume_row["updated_at"] if resume_row else None,
            "action_label": _format_resume_label(
                resume_row["last_mode"] if resume_row else None,
                (
                    resume_row["active_topic"]
                    if resume_row and resume_row["active_topic"]
                    else (fallback_session["topic"] if fallback_session else None)
                ),
            ),
        }

        cur.execute(
            """
            SELECT
                t.id,
                t.course_id,
                t.course_event_id,
                t.scheduled_date,
                t.status,
                t.priority,
                t.anchor_text,
                c.name AS course_name,
                c.code AS course_code,
                ce.title AS event_title,
                ce.type AS event_type
            FROM study_tasks t
            LEFT JOIN courses c ON c.id = t.course_id
            LEFT JOIN course_events ce ON ce.id = t.course_event_id
            WHERE COALESCE(t.status, 'pending') IN ('pending', 'in_progress')
              AND t.scheduled_date IS NOT NULL
              AND t.scheduled_date <= ?
            ORDER BY
                t.scheduled_date ASC,
                COALESCE(t.priority, 0) DESC,
                t.id ASC
            LIMIT 1
            """,
            (today,),
        )
        planner_task = cur.fetchone()

        cur.execute(
            """
            SELECT
                w.course_id,
                c.name AS course_name,
                c.code AS course_code,
                w.position,
                w.total_sessions,
                w.total_minutes
            FROM wheel_courses w
            LEFT JOIN courses c ON c.id = w.course_id
            WHERE w.active = 1
            ORDER BY w.position ASC
            LIMIT 2
            """
        )
        wheel_rows = list(cur.fetchall())
        current_wheel = wheel_rows[0] if wheel_rows else None
        next_wheel = wheel_rows[1] if len(wheel_rows) > 1 else None
        cur.execute("SELECT COUNT(*) AS total_active FROM wheel_courses WHERE active = 1")
        total_active_wheel = int((cur.fetchone()["total_active"] or 0))

        recommended_action: dict[str, Any] | None = None
        if resume_candidate["can_resume"] and resume_candidate["session_id"]:
            recommended_action = {
                "kind": "resume_session",
                "title": resume_candidate["topic"] or "Resume Tutor Session",
                "reason": f"Resume {resume_candidate['course_name'] or 'Tutor'} where you left off.",
                "course_id": resume_candidate["course_id"],
                "course_name": resume_candidate["course_name"],
                "course_code": resume_candidate["course_code"],
                "session_id": resume_candidate["session_id"],
                "course_event_id": None,
                "event_type": None,
                "shell_mode": "tutor",
                "action_label": _format_action_label("resume_session"),
            }
        elif planner_task is not None:
            recommended_action = {
                "kind": "planner_task",
                "title": planner_task["event_title"] or planner_task["anchor_text"] or "Planner review",
                "reason": f"Planner task due {planner_task['scheduled_date']}.",
                "course_id": int(planner_task["course_id"]) if planner_task["course_id"] is not None else None,
                "course_name": planner_task["course_name"],
                "course_code": planner_task["course_code"],
                "session_id": None,
                "course_event_id": int(planner_task["course_event_id"]) if planner_task["course_event_id"] is not None else None,
                "event_type": planner_task["event_type"],
                "shell_mode": "studio",
                "action_label": _format_action_label("planner_task"),
            }
        elif tests:
            top_test = tests[0]
            recommended_action = {
                "kind": "exam",
                "title": top_test["title"],
                "reason": f"Upcoming {top_test['type']} for {top_test['course_name']}.",
                "course_id": top_test["course_id"],
                "course_name": top_test["course_name"],
                "course_code": top_test["course_code"],
                "session_id": None,
                "course_event_id": top_test["id"],
                "event_type": top_test["type"],
                "shell_mode": "studio",
                "action_label": _format_action_label("exam"),
            }
        elif assignments:
            top_assignment = assignments[0]
            recommended_action = {
                "kind": "assignment",
                "title": top_assignment["title"],
                "reason": f"Upcoming {top_assignment['type']} for {top_assignment['course_name']}.",
                "course_id": top_assignment["course_id"],
                "course_name": top_assignment["course_name"],
                "course_code": top_assignment["course_code"],
                "session_id": None,
                "course_event_id": top_assignment["id"],
                "event_type": top_assignment["type"],
                "shell_mode": "studio",
                "action_label": _format_action_label("assignment"),
            }
        elif current_wheel is not None:
            recommended_action = {
                "kind": "wheel_course",
                "title": current_wheel["course_name"] or "Current wheel course",
                "reason": "No active resume or urgent deadline is blocking the next study block.",
                "course_id": int(current_wheel["course_id"]) if current_wheel["course_id"] is not None else None,
                "course_name": current_wheel["course_name"],
                "course_code": current_wheel["course_code"],
                "session_id": None,
                "course_event_id": None,
                "event_type": None,
                "shell_mode": "studio",
                "action_label": _format_action_label("wheel_course"),
            }

        class_projects: list[dict[str, Any]] = []
        for course_row in course_rows:
            course_id = int(course_row["id"])
            active_session = active_session_by_course.get(course_id)
            latest_session = latest_session_by_course.get(course_id)
            next_due = next_due_by_course.get(course_id)
            studio_counts = studio_counts_by_course.get(
                course_id,
                {"captured_item_count": 0, "promoted_item_count": 0},
            )
            class_projects.append(
                {
                    "course_id": course_id,
                    "course_name": course_row["name"],
                    "course_code": course_row["code"],
                    "material_count": int(course_row["material_count"] or 0),
                    "recent_session_count": int(session_counts.get(course_id, 0)),
                    "last_studied_at": latest_session["started_at"] if latest_session else None,
                    "pending_event_count": int(pending_event_count_by_course.get(course_id, 0)),
                    "captured_item_count": int(studio_counts["captured_item_count"]),
                    "promoted_item_count": int(studio_counts["promoted_item_count"]),
                    "wheel_linked": bool(course_row["wheel_linked"]),
                    "wheel_active": bool(course_row["wheel_active"]),
                    "wheel_position": course_row["wheel_position"],
                    "active_session": {
                        "session_id": active_session["session_id"],
                        "topic": active_session["topic"],
                        "status": active_session["status"],
                        "turn_count": int(active_session["turn_count"] or 0),
                        "started_at": active_session["started_at"],
                    }
                    if active_session
                    else None,
                    "next_due_event": _serialize_hub_event(next_due) if next_due else None,
                }
            )

        class_projects.sort(
            key=lambda item: (
                0 if item["active_session"] else 1,
                _event_sort_key(item["next_due_event"] or {}),
                0 if item["wheel_active"] else 1,
                str(item["course_name"] or "").lower(),
            )
        )

        return jsonify(
            {
                "recommended_action": recommended_action,
                "resume_candidate": resume_candidate,
                "upcoming_assignments": assignments,
                "upcoming_tests": tests,
                "class_projects": class_projects,
                "study_wheel": {
                    "current_course_id": int(current_wheel["course_id"]) if current_wheel and current_wheel["course_id"] is not None else None,
                    "current_course_name": current_wheel["course_name"] if current_wheel else None,
                    "current_course_code": current_wheel["course_code"] if current_wheel else None,
                    "current_position": int(current_wheel["position"]) if current_wheel and current_wheel["position"] is not None else None,
                    "total_sessions": int(current_wheel["total_sessions"] or 0) if current_wheel else 0,
                    "total_minutes": int(current_wheel["total_minutes"] or 0) if current_wheel else 0,
                    "total_active_courses": total_active_wheel,
                    "next_course_id": int(next_wheel["course_id"]) if next_wheel and next_wheel["course_id"] is not None else None,
                    "next_course_name": next_wheel["course_name"] if next_wheel else None,
                    "next_course_code": next_wheel["course_code"] if next_wheel else None,
                },
            }
        )
    finally:
        conn.close()


@tutor_bp.route("/project-shell", methods=["GET"])
def get_project_shell():
    raw_course_id = request.args.get("course_id")
    if raw_course_id is None:
        return jsonify({"error": "course_id is required"}), 400
    try:
        course_id = int(raw_course_id)
    except (TypeError, ValueError):
        return jsonify({"error": "course_id must be an integer"}), 400

    requested_session_id = request.args.get("session_id")

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        course_row = _require_course(conn, course_id)
        if course_row is None:
            return jsonify({"error": "course not found"}), 404

        cur = conn.cursor()
        cur.execute(
            """
            SELECT course_id, active_tutor_session_id, last_mode, active_board_scope,
                   active_board_id, viewer_state_json, panel_layout_json, document_tabs_json,
                   active_document_tab_id, runtime_state_json, tutor_chain_id, tutor_custom_block_ids_json,
                   prime_packet_promoted_objects_json,
                   polish_packet_promoted_notes_json,
                   selected_material_ids_json,
                   revision, updated_at
            FROM project_workspace_state
            WHERE course_id = ?
            """,
            (course_id,),
        )
        state_row = cur.fetchone()
        workspace_state = _serialize_workspace_state(state_row)

        active_session = None
        resolved_session_id = requested_session_id or workspace_state["active_tutor_session_id"]
        if resolved_session_id:
            session_row = _require_course_session(conn, course_id, str(resolved_session_id))
            if session_row is None and requested_session_id:
                return jsonify({"error": "session not found for course"}), 404
            if session_row is not None:
                active_session = dict(session_row)

        cur.execute(
            """
            SELECT session_id, course_id, phase, topic, status, turn_count, started_at, ended_at
            FROM tutor_sessions
            WHERE course_id = ?
            ORDER BY datetime(started_at) DESC, id DESC
            LIMIT 10
            """,
            (course_id,),
        )
        recent_sessions = [dict(row) for row in cur.fetchall()]

        cur.execute(
            """
            SELECT
                COUNT(*) AS total_items,
                SUM(CASE WHEN status = 'captured' THEN 1 ELSE 0 END) AS captured_items,
                SUM(CASE WHEN status = 'promoted' THEN 1 ELSE 0 END) AS promoted_items
            FROM studio_items
            WHERE course_id = ? AND deleted_at IS NULL
            """,
            (course_id,),
        )
        studio_counts = cur.fetchone()

        cur.execute(
            """
            SELECT
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_sessions,
                COUNT(*) AS session_count
            FROM tutor_sessions
            WHERE course_id = ?
            """,
            (course_id,),
        )
        session_counts = cur.fetchone()

        cur.execute(
            """
            SELECT COUNT(*) AS pending_events
            FROM course_events
            WHERE course_id = ? AND COALESCE(status, 'pending') = 'pending'
            """,
            (course_id,),
        )
        pending_events = cur.fetchone()

        response = {
            "course": dict(course_row),
            "workspace_state": workspace_state,
            "continuation": {
                "can_resume": active_session is not None,
                "active_tutor_session_id": active_session["session_id"] if active_session else None,
                "last_mode": workspace_state["last_mode"],
            },
            "active_session": active_session,
            "recent_sessions": recent_sessions,
            "counts": {
                "active_sessions": int((session_counts["active_sessions"] or 0) if session_counts else 0),
                "session_count": int((session_counts["session_count"] or 0) if session_counts else 0),
                "studio_total_items": int((studio_counts["total_items"] or 0) if studio_counts else 0),
                "studio_captured_items": int((studio_counts["captured_items"] or 0) if studio_counts else 0),
                "studio_promoted_items": int((studio_counts["promoted_items"] or 0) if studio_counts else 0),
                "pending_schedule_events": int((pending_events["pending_events"] or 0) if pending_events else 0),
            },
        }
        return jsonify(response)
    finally:
        conn.close()


@tutor_bp.route("/project-shell/state", methods=["PUT"])
def save_project_shell_state():
    data = request.get_json(silent=True) or {}
    raw_course_id = data.get("course_id")
    if raw_course_id is None:
        return jsonify({"error": "course_id is required"}), 400
    try:
        course_id = int(raw_course_id)
    except (TypeError, ValueError):
        return jsonify({"error": "course_id must be an integer"}), 400

    last_mode = data.get("last_mode", "studio")
    if last_mode not in VALID_SHELL_MODES:
        return jsonify({"error": f"last_mode must be one of {sorted(VALID_SHELL_MODES)}"}), 400

    active_board_scope = data.get("active_board_scope", "project")
    if active_board_scope not in VALID_BOARD_SCOPES:
        return jsonify(
            {"error": f"active_board_scope must be one of {sorted(VALID_BOARD_SCOPES)}"}
        ), 400

    active_tutor_session_id = data.get("active_tutor_session_id")
    if active_tutor_session_id is not None and not isinstance(active_tutor_session_id, str):
        return jsonify({"error": "active_tutor_session_id must be a string"}), 400

    active_board_id = data.get("active_board_id")
    if active_board_id is not None:
        try:
            active_board_id = int(active_board_id)
        except (TypeError, ValueError):
            return jsonify({"error": "active_board_id must be an integer"}), 400

    try:
        viewer_state = _normalize_json_dict(data.get("viewer_state"), field_name="viewer_state")
        panel_layout = _normalize_json_object_list(
            data.get("panel_layout"),
            field_name="panel_layout",
        )
        document_tabs = _normalize_json_object_list(
            data.get("document_tabs"),
            field_name="document_tabs",
        )
        active_document_tab_id = _normalize_optional_string(
            data.get("active_document_tab_id"),
            field_name="active_document_tab_id",
        )
        runtime_state = _normalize_runtime_state(data.get("runtime_state"))
        raw_tutor_chain_id = data.get("tutor_chain_id")
        if raw_tutor_chain_id is None:
            tutor_chain_id = None
        elif isinstance(raw_tutor_chain_id, bool):
            raise ValueError("tutor_chain_id must be an integer")
        else:
            try:
                tutor_chain_id = int(raw_tutor_chain_id)
            except (TypeError, ValueError) as exc:
                raise ValueError("tutor_chain_id must be an integer") from exc
        tutor_custom_block_ids = _normalize_int_list(
            data.get("tutor_custom_block_ids"),
            field_name="tutor_custom_block_ids",
        )
        prime_packet_promoted_objects = _normalize_json_object_list(
            data.get("prime_packet_promoted_objects"),
            field_name="prime_packet_promoted_objects",
        )
        polish_packet_promoted_notes = _normalize_json_object_list(
            data.get("polish_packet_promoted_notes"),
            field_name="polish_packet_promoted_notes",
        )
        selected_material_ids = _normalize_material_ids(data.get("selected_material_ids"))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    raw_revision = data.get("revision")
    if raw_revision is None:
        requested_revision = None
    else:
        try:
            requested_revision = int(raw_revision)
        except (TypeError, ValueError):
            return jsonify({"error": "revision must be an integer"}), 400

    now = datetime.now(timezone.utc).isoformat()

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        course_row = _require_course(conn, course_id)
        if course_row is None:
            return jsonify({"error": "course not found"}), 404

        if active_tutor_session_id:
            session_row = _require_course_session(conn, course_id, active_tutor_session_id)
            if session_row is None:
                return jsonify({"error": "active_tutor_session_id must belong to the selected course"}), 400

        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, revision
            FROM project_workspace_state
            WHERE course_id = ?
            """,
            (course_id,),
        )
        existing = cur.fetchone()
        current_revision = int(existing["revision"]) if existing is not None else 0
        if requested_revision is not None and requested_revision != current_revision:
            return (
                jsonify(
                    {
                        "error": "revision conflict",
                        "code": "REVISION_CONFLICT",
                        "expected_revision": current_revision,
                    }
                ),
                409,
            )

        new_revision = current_revision + 1
        payload = (
            active_tutor_session_id,
            last_mode,
            active_board_scope,
            active_board_id,
            json.dumps(viewer_state) if viewer_state is not None else None,
            json.dumps(panel_layout),
            json.dumps(document_tabs),
            active_document_tab_id,
            json.dumps(runtime_state),
            tutor_chain_id,
            json.dumps(tutor_custom_block_ids),
            json.dumps(prime_packet_promoted_objects),
            json.dumps(polish_packet_promoted_notes),
            json.dumps(selected_material_ids),
            new_revision,
            now,
            course_id,
        )
        cur.execute(
            """
            INSERT INTO project_workspace_state (
                active_tutor_session_id,
                last_mode,
                active_board_scope,
                active_board_id,
                viewer_state_json,
                panel_layout_json,
                document_tabs_json,
                active_document_tab_id,
                runtime_state_json,
                tutor_chain_id,
                tutor_custom_block_ids_json,
                prime_packet_promoted_objects_json,
                polish_packet_promoted_notes_json,
                selected_material_ids_json,
                revision,
                updated_at,
                course_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(course_id) DO UPDATE SET
                active_tutor_session_id = excluded.active_tutor_session_id,
                last_mode = excluded.last_mode,
                active_board_scope = excluded.active_board_scope,
                active_board_id = excluded.active_board_id,
                viewer_state_json = excluded.viewer_state_json,
                panel_layout_json = excluded.panel_layout_json,
                document_tabs_json = excluded.document_tabs_json,
                active_document_tab_id = excluded.active_document_tab_id,
                runtime_state_json = excluded.runtime_state_json,
                tutor_chain_id = excluded.tutor_chain_id,
                tutor_custom_block_ids_json = excluded.tutor_custom_block_ids_json,
                prime_packet_promoted_objects_json = excluded.prime_packet_promoted_objects_json,
                polish_packet_promoted_notes_json = excluded.polish_packet_promoted_notes_json,
                selected_material_ids_json = excluded.selected_material_ids_json,
                revision = excluded.revision,
                updated_at = excluded.updated_at
            """,
            payload,
        )
        conn.commit()

        cur.execute(
            """
            SELECT course_id, active_tutor_session_id, last_mode, active_board_scope,
                   active_board_id, viewer_state_json, panel_layout_json, document_tabs_json,
                   active_document_tab_id, runtime_state_json, tutor_chain_id, tutor_custom_block_ids_json,
                   prime_packet_promoted_objects_json,
                   polish_packet_promoted_notes_json,
                   selected_material_ids_json,
                   revision, updated_at
            FROM project_workspace_state
            WHERE course_id = ?
            """,
            (course_id,),
        )
        state_row = cur.fetchone()
        return jsonify(
            {
                "course_id": course_id,
                "workspace_state": _serialize_workspace_state(state_row),
            }
        )
    finally:
        conn.close()

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

VALID_SHELL_MODES = {"studio", "tutor", "schedule", "publish"}
VALID_BOARD_SCOPES = {"session", "project", "overall"}


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


def _normalize_material_ids(value: Any) -> list[int]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError("selected_material_ids must be a list of integers")
    deduped: list[int] = []
    seen: set[int] = set()
    for raw in value:
        if isinstance(raw, bool):
            raise ValueError("selected_material_ids must contain only integers")
        try:
            parsed = int(raw)
        except (TypeError, ValueError) as exc:
            raise ValueError("selected_material_ids must contain only integers") from exc
        if parsed in seen:
            continue
        seen.add(parsed)
        deduped.append(parsed)
    return deduped


def _serialize_workspace_state(row: sqlite3.Row | None) -> dict[str, Any]:
    if row is None:
        return {
            "active_tutor_session_id": None,
            "last_mode": "studio",
            "active_board_scope": "project",
            "active_board_id": None,
            "viewer_state": None,
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
    return {
        "active_tutor_session_id": row["active_tutor_session_id"],
        "last_mode": row["last_mode"] or "studio",
        "active_board_scope": row["active_board_scope"] or "project",
        "active_board_id": row["active_board_id"],
        "viewer_state": viewer_state,
        "selected_material_ids": selected_material_ids,
        "revision": int(row["revision"] or 0),
        "updated_at": row["updated_at"],
    }


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
                   active_board_id, viewer_state_json, selected_material_ids_json,
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
                selected_material_ids_json,
                revision,
                updated_at,
                course_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(course_id) DO UPDATE SET
                active_tutor_session_id = excluded.active_tutor_session_id,
                last_mode = excluded.last_mode,
                active_board_scope = excluded.active_board_scope,
                active_board_id = excluded.active_board_id,
                viewer_state_json = excluded.viewer_state_json,
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
                   active_board_id, viewer_state_json, selected_material_ids_json,
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

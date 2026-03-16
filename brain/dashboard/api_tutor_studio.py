"""
Tutor Studio backend routes.

This module provides the first normalized Studio commands:
  - POST /api/tutor/studio/capture
  - GET  /api/tutor/studio/restore
  - POST /api/tutor/studio/promote
  - PATCH /api/tutor/studio/items/<item_id>
  - GET  /api/tutor/studio/items/<item_id>/revisions
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any

from flask import jsonify, request

from db_setup import get_connection

from dashboard.api_tutor import tutor_bp  # noqa: E402
from dashboard.api_tutor_projects import (  # noqa: E402
    _require_course as _require_project_course,
    _require_course_session,
    _serialize_workspace_state,
)

VALID_ITEM_SCOPES = {"session", "project"}
VALID_ITEM_STATUSES = {"captured", "boarded", "promoted", "archived"}
VALID_PROMOTION_MODES = {"copy", "move"}
TRUTHY_QUERY_VALUES = {"1", "true", "yes", "on"}


def _require_course(conn: sqlite3.Connection, course_id: int) -> sqlite3.Row | None:
    return _require_project_course(conn, course_id)


def _load_json(raw: Any) -> Any:
    if raw in (None, ""):
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def _dump_json(value: Any, *, field_name: str) -> str | None:
    if value is None:
        return None
    try:
        return json.dumps(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be JSON serializable") from exc


def _serialize_item(row: sqlite3.Row) -> dict[str, Any]:

    return {
        "id": int(row["id"]),
        "course_id": int(row["course_id"]),
        "tutor_session_id": row["tutor_session_id"],
        "scope": row["scope"],
        "item_type": row["item_type"],
        "source_kind": row["source_kind"],
        "title": row["title"],
        "body_markdown": row["body_markdown"],
        "source_path": row["source_path"],
        "source_locator": _load_json(row["source_locator_json"]),
        "payload": _load_json(row["payload_json"]),
        "status": row["status"],
        "promoted_from_id": row["promoted_from_id"],
        "version": int(row["version"] or 1),
        "deleted_at": row["deleted_at"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _record_action(
    conn: sqlite3.Connection,
    *,
    course_id: int,
    tutor_session_id: str | None,
    action_type: str,
    destination_kind: str | None,
    request_id: str,
    details: dict[str, Any],
    status: str = "completed",
    idempotency_key: str | None = None,
) -> None:
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO studio_actions (
            idempotency_key,
            course_id,
            tutor_session_id,
            action_type,
            destination_kind,
            request_id,
            status,
            details_json,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            idempotency_key or f"{action_type}:{request_id}",
            course_id,
            tutor_session_id,
            action_type,
            destination_kind,
            request_id,
            status,
            json.dumps(details),
            datetime.now(timezone.utc).isoformat(),
        ),
    )


def _insert_revision(
    conn: sqlite3.Connection,
    *,
    studio_item_id: int,
    revision: int,
    body_markdown: str | None,
    payload_json: str | None,
    source_locator_json: str | None,
) -> None:
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO studio_item_revisions (
            studio_item_id,
            revision,
            body_markdown,
            payload_json,
            source_locator_json,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            studio_item_id,
            revision,
            body_markdown,
            payload_json,
            source_locator_json,
            datetime.now(timezone.utc).isoformat(),
        ),
    )


def _ensure_revision_snapshot(conn: sqlite3.Connection, row: sqlite3.Row) -> None:
    cur = conn.cursor()
    revision = int(row["version"] or 1)
    cur.execute(
        """
        SELECT 1
        FROM studio_item_revisions
        WHERE studio_item_id = ? AND revision = ?
        LIMIT 1
        """,
        (int(row["id"]), revision),
    )
    if cur.fetchone() is not None:
        return
    _insert_revision(
        conn,
        studio_item_id=int(row["id"]),
        revision=revision,
        body_markdown=row["body_markdown"],
        payload_json=row["payload_json"],
        source_locator_json=row["source_locator_json"],
    )


def _serialize_revision(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "revision": int(row["revision"]),
        "body_markdown": row["body_markdown"],
        "payload": _load_json(row["payload_json"]),
        "source_locator": _load_json(row["source_locator_json"]),
        "created_at": row["created_at"],
    }


def _resolve_update_action_type(current_status: str, next_status: str | None) -> str:
    if next_status is None or next_status == current_status:
        return "update"
    if current_status == "archived" and next_status in {"captured", "boarded"}:
        return "restore"
    if next_status == "boarded":
        return "board"
    if next_status == "archived":
        return "archive"
    return "update"


def _validate_status_transition(current_status: str, next_status: str) -> bool:
    if next_status == current_status:
        return True
    allowed: dict[str, set[str]] = {
        "captured": {"boarded", "archived"},
        "boarded": {"archived"},
        "archived": {"captured", "boarded"},
        "promoted": set(),
    }
    return next_status in allowed.get(current_status, set())


def _serialize_learning_objective(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": int(row["id"]),
        "courseId": int(row["course_id"]),
        "moduleId": row["module_id"],
        "loCode": row["lo_code"],
        "title": row["title"],
        "status": row["status"],
        "lastSessionId": row["last_session_id"],
        "lastSessionDate": row["last_session_date"],
        "nextAction": row["next_action"],
        "groupName": row["group_name"],
        "managedByTutor": bool(row["managed_by_tutor"]) if row["managed_by_tutor"] is not None else False,
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def _serialize_card_draft(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": int(row["id"]),
        "sessionId": row["session_id"],
        "tutorSessionId": row["tutor_session_id"],
        "courseId": int(row["resolved_course_id"]) if row["resolved_course_id"] is not None else None,
        "deckName": row["deck_name"],
        "cardType": row["card_type"],
        "front": row["front"],
        "back": row["back"],
        "tags": row["tags"] or "",
        "status": row["status"],
        "createdAt": row["created_at"],
    }


def _serialize_activity_item(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": record["id"],
        "kind": record["kind"],
        "title": record["title"],
        "subtitle": record.get("subtitle"),
        "status": record.get("status"),
        "created_at": record["created_at"],
        "tutor_session_id": record.get("tutor_session_id"),
    }


def _build_shell_snapshot(
    conn: sqlite3.Connection,
    *,
    course_id: int,
) -> dict[str, Any]:
    cur = conn.cursor()
    cur.execute("SELECT * FROM project_workspace_state WHERE course_id = ?", (course_id,))
    state_row = cur.fetchone()
    workspace_state = _serialize_workspace_state(state_row)

    active_session = None
    resolved_session_id = workspace_state["active_tutor_session_id"]
    if resolved_session_id:
        session_row = _require_course_session(conn, course_id, str(resolved_session_id))
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

    return {
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


@tutor_bp.route("/studio/overview", methods=["GET"])
def get_studio_overview():
    raw_course_id = request.args.get("course_id")
    if raw_course_id is None:
        return jsonify({"error": "course_id is required"}), 400
    try:
        course_id = int(raw_course_id)
    except (TypeError, ValueError):
        return jsonify({"error": "course_id must be an integer"}), 400

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        course_row = _require_course(conn, course_id)
        if course_row is None:
            return jsonify({"error": "course not found"}), 404

        cur = conn.cursor()
        shell = _build_shell_snapshot(conn, course_id=course_id)

        cur.execute(
            """
            SELECT
                id,
                title,
                source_path,
                folder_path,
                file_type,
                file_size,
                course_id,
                COALESCE(enabled, 1) AS enabled,
                extraction_error,
                checksum,
                created_at,
                updated_at
            FROM rag_docs
            WHERE course_id = ?
              AND COALESCE(enabled, 1) = 1
              AND COALESCE(corpus, 'materials') = 'materials'
            ORDER BY LOWER(COALESCE(title, source_path, '')), id
            """,
            (course_id,),
        )
        materials = [dict(row) for row in cur.fetchall()]

        cur.execute(
            """
            SELECT
                id,
                course_id,
                module_id,
                lo_code,
                title,
                status,
                last_session_id,
                last_session_date,
                next_action,
                group_name,
                managed_by_tutor,
                created_at,
                updated_at
            FROM learning_objectives
            WHERE course_id = ?
            ORDER BY LOWER(COALESCE(group_name, '')), LOWER(COALESCE(lo_code, '')), id
            """,
            (course_id,),
        )
        objectives = [_serialize_learning_objective(row) for row in cur.fetchall()]

        cur.execute("PRAGMA table_info(card_drafts)")
        card_draft_columns = {str(row[1]) for row in cur.fetchall()}
        tutor_session_column = "cd.tutor_session_id AS tutor_session_id," if "tutor_session_id" in card_draft_columns else "NULL AS tutor_session_id,"
        session_join_ref = "COALESCE(NULLIF(cd.tutor_session_id, ''), cd.session_id)" if "tutor_session_id" in card_draft_columns else "cd.session_id"
        cur.execute(
            f"""
            SELECT
                cd.id,
                cd.session_id,
                {tutor_session_column}
                COALESCE(cd.course_id, ts.course_id) AS resolved_course_id,
                cd.deck_name,
                cd.card_type,
                cd.front,
                cd.back,
                cd.tags,
                cd.status,
                cd.created_at
            FROM card_drafts cd
            LEFT JOIN tutor_sessions ts
              ON ts.session_id = {session_join_ref}
            WHERE COALESCE(cd.course_id, ts.course_id) = ?
            ORDER BY datetime(cd.created_at) DESC, cd.id DESC
            LIMIT 50
            """,
            (course_id,),
        )
        draft_items = [_serialize_card_draft(row) for row in cur.fetchall()]
        draft_counts: dict[str, int] = {
            "total": len(draft_items),
            "draft": 0,
            "approved": 0,
            "synced": 0,
            "rejected": 0,
        }
        for item in draft_items:
            status = str(item["status"] or "").lower()
            if status in draft_counts:
                draft_counts[status] += 1

        cur.execute(
            """
            SELECT *
            FROM studio_items
            WHERE course_id = ?
              AND scope = 'project'
              AND status = 'promoted'
              AND deleted_at IS NULL
            ORDER BY datetime(COALESCE(updated_at, created_at)) DESC, id DESC
            LIMIT 25
            """,
            (course_id,),
        )
        vault_items = [_serialize_item(row) for row in cur.fetchall()]

        cur.execute(
            """
            SELECT id, action_type, destination_kind, tutor_session_id, status, created_at
            FROM studio_actions
            WHERE course_id = ?
            ORDER BY datetime(created_at) DESC, id DESC
            LIMIT 10
            """,
            (course_id,),
        )
        studio_activity = [
            _serialize_activity_item(
                {
                    "id": f"action:{row['id']}",
                    "kind": "studio_action",
                    "title": str(row["action_type"] or "").replace("_", " ").upper(),
                    "subtitle": row["destination_kind"],
                    "status": row["status"],
                    "created_at": row["created_at"],
                    "tutor_session_id": row["tutor_session_id"],
                }
            )
            for row in cur.fetchall()
        ]

        session_activity = [
            _serialize_activity_item(
                {
                    "id": f"session:{session['session_id']}",
                    "kind": "session",
                    "title": session["topic"] or "Tutor Session",
                    "subtitle": str(session["phase"] or "").replace("_", " ").upper(),
                    "status": session["status"],
                    "created_at": session["started_at"],
                    "tutor_session_id": session["session_id"],
                }
            )
            for session in shell["recent_sessions"][:10]
        ]
        recent_activity = sorted(
            [*studio_activity, *session_activity],
            key=lambda item: item["created_at"] or "",
            reverse=True,
        )[:20]

        return jsonify(
            {
                "course": dict(course_row),
                "shell": shell,
                "materials": materials,
                "objectives": objectives,
                "card_drafts": {
                    "items": draft_items,
                    "counts": draft_counts,
                },
                "vault_resources": {
                    "items": vault_items,
                    "counts": {
                        "total": len(vault_items),
                    },
                },
                "recent_activity": recent_activity,
            }
        )
    finally:
        conn.close()


@tutor_bp.route("/studio/capture", methods=["POST"])
def capture_studio_item():
    data = request.get_json(silent=True) or {}
    raw_course_id = data.get("course_id")
    if raw_course_id is None:
        return jsonify({"error": "course_id is required"}), 400
    try:
        course_id = int(raw_course_id)
    except (TypeError, ValueError):
        return jsonify({"error": "course_id must be an integer"}), 400

    scope = data.get("scope", "session")
    if scope not in VALID_ITEM_SCOPES:
        return jsonify({"error": f"scope must be one of {sorted(VALID_ITEM_SCOPES)}"}), 400

    item_type = str(data.get("item_type") or "").strip()
    if not item_type:
        return jsonify({"error": "item_type is required"}), 400

    status = data.get("status", "captured")
    if status not in VALID_ITEM_STATUSES:
        return jsonify({"error": f"status must be one of {sorted(VALID_ITEM_STATUSES)}"}), 400

    tutor_session_id = data.get("tutor_session_id")
    if tutor_session_id is not None and not isinstance(tutor_session_id, str):
        return jsonify({"error": "tutor_session_id must be a string"}), 400
    if scope == "session" and not tutor_session_id:
        return jsonify({"error": "tutor_session_id is required for session-scoped items"}), 400

    source_locator = data.get("source_locator")
    if source_locator is not None and not isinstance(source_locator, dict):
        return jsonify({"error": "source_locator must be an object"}), 400

    payload = data.get("payload")
    request_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        if _require_course(conn, course_id) is None:
            return jsonify({"error": "course not found"}), 404
        if tutor_session_id and _require_course_session(conn, course_id, tutor_session_id) is None:
            return jsonify({"error": "tutor_session_id must belong to the selected course"}), 400

        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO studio_items (
                course_id,
                tutor_session_id,
                scope,
                item_type,
                source_kind,
                title,
                body_markdown,
                source_path,
                source_locator_json,
                payload_json,
                status,
                version,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                course_id,
                tutor_session_id,
                scope,
                item_type,
                data.get("source_kind"),
                data.get("title"),
                data.get("body_markdown"),
                data.get("source_path"),
                json.dumps(source_locator) if source_locator is not None else None,
                json.dumps(payload) if payload is not None else None,
                status,
                1,
                now,
                now,
            ),
        )
        item_id = int(cur.lastrowid)
        _insert_revision(
            conn,
            studio_item_id=item_id,
            revision=1,
            body_markdown=data.get("body_markdown"),
            payload_json=json.dumps(payload) if payload is not None else None,
            source_locator_json=json.dumps(source_locator) if source_locator is not None else None,
        )
        _record_action(
            conn,
            course_id=course_id,
            tutor_session_id=tutor_session_id,
            action_type="capture",
            destination_kind=scope,
            request_id=request_id,
            details={"item_id": item_id, "item_type": item_type, "status": status},
            idempotency_key=str(data.get("idempotency_key") or f"capture:{request_id}"),
        )
        conn.commit()

        cur.execute("SELECT * FROM studio_items WHERE id = ?", (item_id,))
        row = cur.fetchone()
        assert row is not None
        return jsonify({"request_id": request_id, "item": _serialize_item(row)}), 201
    finally:
        conn.close()


@tutor_bp.route("/studio/restore", methods=["GET"])
def restore_studio_items():
    raw_course_id = request.args.get("course_id")
    if raw_course_id is None:
        return jsonify({"error": "course_id is required"}), 400
    try:
        course_id = int(raw_course_id)
    except (TypeError, ValueError):
        return jsonify({"error": "course_id must be an integer"}), 400

    scope = request.args.get("scope")
    if scope and scope not in VALID_ITEM_SCOPES:
        return jsonify({"error": f"scope must be one of {sorted(VALID_ITEM_SCOPES)}"}), 400

    tutor_session_id = request.args.get("tutor_session_id")
    include_archived = str(request.args.get("include_archived") or "").strip().lower() in TRUTHY_QUERY_VALUES

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        if _require_course(conn, course_id) is None:
            return jsonify({"error": "course not found"}), 404
        if tutor_session_id and _require_course_session(conn, course_id, tutor_session_id) is None:
            return jsonify({"error": "tutor_session_id must belong to the selected course"}), 400

        conditions = ["course_id = ?", "deleted_at IS NULL"]
        params: list[Any] = [course_id]
        if not include_archived:
            conditions.append("status != 'archived'")
        if scope:
            conditions.append("scope = ?")
            params.append(scope)
        if tutor_session_id:
            conditions.append("(tutor_session_id = ? OR (scope = 'project' AND tutor_session_id IS NULL))")
            params.append(tutor_session_id)

        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT *
            FROM studio_items
            WHERE {' AND '.join(conditions)}
            ORDER BY datetime(created_at) DESC, id DESC
            """,
            tuple(params),
        )
        items = [_serialize_item(row) for row in cur.fetchall()]
        counts = {
            "total": len(items),
            "captured": sum(1 for item in items if item["status"] == "captured"),
            "boarded": sum(1 for item in items if item["status"] == "boarded"),
            "promoted": sum(1 for item in items if item["status"] == "promoted"),
            "archived": sum(1 for item in items if item["status"] == "archived"),
        }
        return jsonify({"course_id": course_id, "items": items, "counts": counts})
    finally:
        conn.close()


@tutor_bp.route("/studio/items/<int:item_id>", methods=["PATCH"])
def update_studio_item(item_id: int):
    data = request.get_json(silent=True) or {}
    editable_fields = {"title", "body_markdown", "payload", "source_locator", "status"}
    provided_fields = editable_fields.intersection(data.keys())
    if not provided_fields:
        return jsonify({"error": "at least one editable field is required"}), 400

    request_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM studio_items WHERE id = ? AND deleted_at IS NULL", (item_id,))
        current_row = cur.fetchone()
        if current_row is None:
            return jsonify({"error": "studio item not found"}), 404

        updates: dict[str, Any] = {}

        if "title" in data:
            updates["title"] = None if data["title"] is None else str(data["title"])

        if "body_markdown" in data:
            updates["body_markdown"] = (
                None if data["body_markdown"] is None else str(data["body_markdown"])
            )

        try:
            if "payload" in data:
                updates["payload_json"] = _dump_json(data.get("payload"), field_name="payload")
            if "source_locator" in data:
                updates["source_locator_json"] = _dump_json(
                    data.get("source_locator"),
                    field_name="source_locator",
                )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        next_status: str | None = None
        if "status" in data:
            next_status = str(data.get("status") or "").strip().lower()
            if next_status not in VALID_ITEM_STATUSES:
                return jsonify({"error": f"status must be one of {sorted(VALID_ITEM_STATUSES)}"}), 400
            current_status = str(current_row["status"] or "").strip().lower()
            if not _validate_status_transition(current_status, next_status):
                return (
                    jsonify(
                        {
                            "error": "invalid status transition",
                            "current_status": current_status,
                            "next_status": next_status,
                        }
                    ),
                    400,
                )
            updates["status"] = next_status

        _ensure_revision_snapshot(conn, current_row)
        next_version = int(current_row["version"] or 1) + 1
        updates["version"] = next_version
        updates["updated_at"] = now

        columns = list(updates.keys())
        values = [updates[column] for column in columns]
        values.append(item_id)
        cur.execute(
            f"""
            UPDATE studio_items
            SET {', '.join(f"{column} = ?" for column in columns)}
            WHERE id = ?
            """,
            tuple(values),
        )

        cur.execute("SELECT * FROM studio_items WHERE id = ?", (item_id,))
        updated_row = cur.fetchone()
        assert updated_row is not None

        _insert_revision(
            conn,
            studio_item_id=item_id,
            revision=next_version,
            body_markdown=updated_row["body_markdown"],
            payload_json=updated_row["payload_json"],
            source_locator_json=updated_row["source_locator_json"],
        )

        _record_action(
            conn,
            course_id=int(updated_row["course_id"]),
            tutor_session_id=updated_row["tutor_session_id"],
            action_type=_resolve_update_action_type(str(current_row["status"] or ""), next_status),
            destination_kind=updated_row["scope"],
            request_id=request_id,
            details={
                "item_id": item_id,
                "changed_fields": sorted(provided_fields),
                "previous_status": current_row["status"],
                "next_status": updated_row["status"],
                "version": next_version,
            },
            idempotency_key=f"update:{request_id}",
        )
        conn.commit()

        return jsonify({"request_id": request_id, "item": _serialize_item(updated_row)})
    finally:
        conn.close()


@tutor_bp.route("/studio/items/<int:item_id>/revisions", methods=["GET"])
def get_studio_item_revisions(item_id: int):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM studio_items WHERE id = ? AND deleted_at IS NULL", (item_id,))
        item_row = cur.fetchone()
        if item_row is None:
            return jsonify({"error": "studio item not found"}), 404

        cur.execute(
            """
            SELECT id, revision, body_markdown, payload_json, source_locator_json, created_at
            FROM studio_item_revisions
            WHERE studio_item_id = ?
            ORDER BY revision DESC, id DESC
            """,
            (item_id,),
        )
        revisions = [_serialize_revision(row) for row in cur.fetchall()]

        current_revision = int(item_row["version"] or 1)
        if not any(revision["revision"] == current_revision for revision in revisions):
            revisions.insert(
                0,
                {
                    "revision": current_revision,
                    "body_markdown": item_row["body_markdown"],
                    "payload": _load_json(item_row["payload_json"]),
                    "source_locator": _load_json(item_row["source_locator_json"]),
                    "created_at": item_row["updated_at"] or item_row["created_at"],
                },
            )

        return jsonify({"item_id": item_id, "revisions": revisions})
    finally:
        conn.close()


@tutor_bp.route("/studio/promote", methods=["POST"])
def promote_studio_item():
    data = request.get_json(silent=True) or {}
    raw_item_id = data.get("item_id")
    if raw_item_id is None:
        return jsonify({"error": "item_id is required"}), 400
    try:
        item_id = int(raw_item_id)
    except (TypeError, ValueError):
        return jsonify({"error": "item_id must be an integer"}), 400

    promotion_mode = data.get("promotion_mode", "copy")
    if promotion_mode not in VALID_PROMOTION_MODES:
        return jsonify({"error": f"promotion_mode must be one of {sorted(VALID_PROMOTION_MODES)}"}), 400

    target_scope = data.get("target_scope", "project")
    if target_scope != "project":
        return jsonify({"error": "target_scope must be 'project' in v1"}), 400

    request_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM studio_items WHERE id = ? AND deleted_at IS NULL", (item_id,))
        source_row = cur.fetchone()
        if source_row is None:
            return jsonify({"error": "studio item not found"}), 404

        if promotion_mode == "copy":
            cur.execute(
                """
                INSERT INTO studio_items (
                    course_id,
                    tutor_session_id,
                    scope,
                    item_type,
                    source_kind,
                    title,
                    body_markdown,
                    source_path,
                    source_locator_json,
                    payload_json,
                    status,
                    promoted_from_id,
                    version,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    source_row["course_id"],
                    None,  # project-scope items are session-independent
                    target_scope,
                    source_row["item_type"],
                    source_row["source_kind"],
                    source_row["title"],
                    source_row["body_markdown"],
                    source_row["source_path"],
                    source_row["source_locator_json"],
                    source_row["payload_json"],
                    "promoted",
                    item_id,
                    1,
                    now,
                    now,
                ),
            )
            promoted_item_id = int(cur.lastrowid)
            _insert_revision(
                conn,
                studio_item_id=promoted_item_id,
                revision=1,
                body_markdown=source_row["body_markdown"],
                payload_json=source_row["payload_json"],
                source_locator_json=source_row["source_locator_json"],
            )
        else:
            promoted_item_id = item_id
            next_version = int(source_row["version"] or 1) + 1
            cur.execute(
                """
                UPDATE studio_items
                SET scope = ?, status = 'promoted', version = ?, updated_at = ?,
                    tutor_session_id = NULL
                WHERE id = ?
                """,
                (target_scope, next_version, now, item_id),
            )
            _insert_revision(
                conn,
                studio_item_id=item_id,
                revision=next_version,
                body_markdown=source_row["body_markdown"],
                payload_json=source_row["payload_json"],
                source_locator_json=source_row["source_locator_json"],
            )

        _record_action(
            conn,
            course_id=int(source_row["course_id"]),
            tutor_session_id=source_row["tutor_session_id"],
            action_type="promote",
            destination_kind=target_scope,
            request_id=request_id,
            details={
                "source_item_id": item_id,
                "promoted_item_id": promoted_item_id,
                "promotion_mode": promotion_mode,
            },
            idempotency_key=str(data.get("idempotency_key") or f"promote:{request_id}"),
        )
        conn.commit()

        cur.execute("SELECT * FROM studio_items WHERE id = ?", (promoted_item_id,))
        promoted_row = cur.fetchone()
        assert promoted_row is not None
        return jsonify({"request_id": request_id, "item": _serialize_item(promoted_row)})
    finally:
        conn.close()

"""
Tutor Studio backend routes.

This module provides the first normalized Studio commands:
  - POST /api/tutor/studio/capture
  - GET  /api/tutor/studio/restore
  - POST /api/tutor/studio/promote
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

VALID_ITEM_SCOPES = {"session", "project"}
VALID_ITEM_STATUSES = {"captured", "boarded", "promoted", "archived"}
VALID_PROMOTION_MODES = {"copy", "move"}


def _require_course(conn: sqlite3.Connection, course_id: int) -> sqlite3.Row | None:
    cur = conn.cursor()
    cur.execute("SELECT id, name, code FROM courses WHERE id = ?", (course_id,))
    return cur.fetchone()


def _require_course_session(
    conn: sqlite3.Connection,
    course_id: int,
    session_id: str,
) -> sqlite3.Row | None:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, session_id, course_id, topic, status, started_at, ended_at
        FROM tutor_sessions
        WHERE session_id = ? AND course_id = ?
        """,
        (session_id, course_id),
    )
    return cur.fetchone()


def _serialize_item(row: sqlite3.Row) -> dict[str, Any]:
    def _load_json(raw: Any) -> Any:
        if raw in (None, ""):
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None

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

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        if _require_course(conn, course_id) is None:
            return jsonify({"error": "course not found"}), 404
        if tutor_session_id and _require_course_session(conn, course_id, tutor_session_id) is None:
            return jsonify({"error": "tutor_session_id must belong to the selected course"}), 400

        conditions = ["course_id = ?", "deleted_at IS NULL"]
        params: list[Any] = [course_id]
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
            "promoted": sum(1 for item in items if item["status"] == "promoted"),
        }
        return jsonify({"course_id": course_id, "items": items, "counts": counts})
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

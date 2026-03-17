"""
Artifact route handlers extracted from api_tutor.py.

This module holds:
  - create_artifact (POST /session/<id>/artifact)
  - finalize_session_artifacts (POST /session/<id>/finalize)
  - sync_session_graph (POST /session/<id>/sync-graph)
  - delete_artifacts (DELETE /session/<id>/artifacts)

Functions here may depend on:
  - ``dashboard.api_tutor_utils`` (constants, validators)
  - ``dashboard.api_tutor_vault`` (vault helpers -- late imports)
  - ``dashboard.api_tutor_turns`` (session/turn DB helpers -- late imports)
  - ``dashboard.api_tutor`` (late import for ``tutor_bp``)
"""

from __future__ import annotations

import json
import logging
import sys
import uuid
from datetime import datetime

from flask import jsonify, request

from db_setup import get_connection

from dashboard.api_tutor_utils import (
    _prime_assessment_violations,
    _record_tutor_delete_telemetry,
)

from dashboard.api_tutor_vault import (
    _finalize_structured_notes_for_session,
    _vault_read_note,
    _sync_graph_for_paths,
    _delete_artifact_obsidian_files,
)

_LOG = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Test-monkeypatch bridge
# ---------------------------------------------------------------------------
# Tests patch ``dashboard.api_tutor._vault_read_note`` (etc.) to inject fakes.
# Since those functions now live in vault/utils sub-modules, internal callers
# must look them up from the *parent* module so patches take effect.  The
# ``_mp(name)`` helper returns the version sitting on ``dashboard.api_tutor``
# (the patched one, if any), falling back to this module's own definition when
# the parent module is not yet imported (e.g. during early module load).
# ---------------------------------------------------------------------------

def _mp(name: str):
    """Return the possibly-monkeypatched version of *name* from api_tutor."""
    parent = sys.modules.get("dashboard.api_tutor")
    if parent is not None:
        fn = getattr(parent, name, None)
        if fn is not None:
            return fn
    return globals()[name]


def _session_not_active_response(session: dict):
    return (
        jsonify(
            {
                "error": "Tutor session is not active",
                "code": "SESSION_NOT_ACTIVE",
                "status": session.get("status"),
            }
        ),
        400,
    )


def _delete_session_owned_artifact_rows(conn, *, session_id: str, artifact: dict) -> None:
    if not isinstance(artifact, dict):
        return

    art_type = str(artifact.get("type") or "").strip().lower()
    cur = conn.cursor()

    if art_type == "note":
        raw_quick_note_id = artifact.get("quick_note_id")
        quick_note_id = None
        try:
            if raw_quick_note_id is not None:
                quick_note_id = int(raw_quick_note_id)
        except (TypeError, ValueError):
            quick_note_id = None

        if quick_note_id is not None:
            cur.execute(
                "DELETE FROM quick_notes WHERE id = ? AND tutor_session_id = ?",
                (quick_note_id, session_id),
            )
            return

        cur.execute(
            """
            DELETE FROM quick_notes
            WHERE tutor_session_id = ?
              AND note_type = 'tutor'
              AND title = ?
              AND content = ?
            """,
            (
                session_id,
                str(artifact.get("title") or ""),
                str(artifact.get("content") or ""),
            ),
        )
        return

    if art_type == "card":
        raw_card_id = artifact.get("card_id")
        try:
            card_id = int(raw_card_id)
        except (TypeError, ValueError):
            return

        cur.execute(
            "DELETE FROM card_drafts WHERE id = ? AND tutor_session_id = ?",
            (card_id, session_id),
        )


# ---------------------------------------------------------------------------
# Route handlers -- registered on tutor_bp from the main api_tutor module.
# ---------------------------------------------------------------------------

from dashboard.api_tutor import tutor_bp  # noqa: E402


# ---------------------------------------------------------------------------
# POST /api/tutor/session/<id>/artifact -- Create note/card/map mid-session
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/<session_id>/artifact", methods=["POST"])
def create_artifact(session_id: str):
    from dashboard.api_tutor_turns import (
        _get_tutor_session,
        _active_control_stage_for_session,
    )

    data = request.get_json(silent=True) or {}
    artifact_type = data.get("type")
    content = data.get("content", "")
    title = data.get("title", "")

    # Map alias types to canonical storage types
    _ARTIFACT_TYPE_ALIASES = {"table": "note", "structured_map": "map"}
    if artifact_type in _ARTIFACT_TYPE_ALIASES:
        artifact_type = _ARTIFACT_TYPE_ALIASES[artifact_type]

    if artifact_type not in ("note", "card", "map", "structured_notes"):
        return jsonify(
            {
                "error": "type must be 'note', 'card', 'map', 'table', 'structured_map', or 'structured_notes'"
            }
        ), 400

    conn = get_connection()
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404
    if str(session.get("status") or "").lower() != "active":
        conn.close()
        return _session_not_active_response(session)

    active_stage = _active_control_stage_for_session(conn, session)
    if active_stage == "PRIME":
        prime_violations = _prime_assessment_violations(data)
        if prime_violations:
            conn.close()
            return (
                jsonify(
                    {
                        "error": "validation_failed",
                        "code": "PRIME_ASSESSMENT_BLOCKED",
                        "details": [
                            f"prime_guardrail: {msg}" for msg in prime_violations
                        ],
                    }
                ),
                400,
            )

    if artifact_type == "structured_notes":
        payload = data.get("artifact")
        if not isinstance(payload, dict):
            payload = data.get("payload")
        if not isinstance(payload, dict):
            payload = data
        result, errors = _mp("_finalize_structured_notes_for_session")(
            conn=conn,
            session_id=session_id,
            session_row=session,
            artifact_payload=payload,
        )
        conn.close()
        if errors:
            return jsonify({"error": "validation_failed", "details": errors}), 400
        return jsonify(result), 201

    result: dict[str, object] = {"type": artifact_type, "session_id": session_id}
    front: str | None = None

    if artifact_type == "card":
        front = data.get("front", title)
        back = data.get("back", content)
        tags = data.get("tags", "tutor")

        # Auto-generate a descriptive title when front is generic or empty
        if not front or front.strip().lower().startswith("tutor flashcard"):
            topic = str(session.get("topic") or "").strip()
            # Extract first meaningful concept from back content
            first_concept = ""
            if back:
                for line in str(back).splitlines():
                    stripped = line.strip().lstrip("#-*> ").strip()
                    if len(stripped) >= 5:
                        first_concept = stripped[:80]
                        break
            if topic and first_concept:
                front = f"{topic}: {first_concept}"
            elif topic:
                front = topic
            elif first_concept:
                front = first_concept

        cur = conn.cursor()
        cur.execute(
            """INSERT INTO card_drafts
               (session_id, tutor_session_id, course_id, front, back, tags, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)""",
            (
                session_id,
                session_id,
                session.get("course_id"),
                front,
                back,
                tags,
                datetime.now().isoformat(),
            ),
        )
        result["card_id"] = cur.lastrowid
        conn.commit()

    elif artifact_type == "note":
        result["content"] = content
        result["title"] = title
        result["status"] = "created"
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT MAX(position) FROM quick_notes WHERE note_type = 'tutor'"
            )
            max_pos = cur.fetchone()[0] or 0
            now_str = datetime.now().isoformat()
            cur.execute(
                """INSERT INTO quick_notes (title, content, note_type, tutor_session_id, position, created_at, updated_at)
                   VALUES (?, ?, 'tutor', ?, ?, ?, ?)""",
                (title, content, session_id, max_pos + 1, now_str, now_str),
            )
            result["quick_note_id"] = cur.lastrowid
            result["session_owned"] = True
            conn.commit()
        except Exception:
            pass

    elif artifact_type == "map":
        result["mermaid"] = content
        result["status"] = "created"
        result["session_owned"] = True

    cur = conn.cursor()
    existing_artifacts = session.get("artifacts_json")
    artifacts = []
    if existing_artifacts:
        try:
            artifacts = json.loads(existing_artifacts)
        except (json.JSONDecodeError, TypeError):
            pass

    artifact_entry = {
        "type": artifact_type,
        "title": front if artifact_type == "card" else title,
        "created_at": datetime.now().isoformat(),
    }
    if artifact_type in ("note", "card", "map"):
        artifact_entry["session_owned"] = True
    if artifact_type in ("note", "map"):
        artifact_entry["content"] = content
    if artifact_type == "note" and result.get("quick_note_id") is not None:
        artifact_entry["quick_note_id"] = result["quick_note_id"]
    if artifact_type == "card" and result.get("card_id") is not None:
        artifact_entry["card_id"] = result["card_id"]
    artifacts.append(artifact_entry)

    cur.execute(
        "UPDATE tutor_sessions SET artifacts_json = ? WHERE session_id = ?",
        (json.dumps(artifacts), session_id),
    )
    conn.commit()
    conn.close()

    return jsonify(result), 201


# ---------------------------------------------------------------------------
# POST /api/tutor/session/<id>/finalize -- Write structured tutor artifacts
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/<session_id>/finalize", methods=["POST"])
def finalize_session_artifacts(session_id: str):
    from dashboard.api_tutor_turns import _get_tutor_session

    data = request.get_json(silent=True) or {}
    payload = data.get("artifact")
    if not isinstance(payload, dict):
        payload = data.get("payload")
    if not isinstance(payload, dict):
        return jsonify({"error": "artifact payload is required"}), 400

    conn = get_connection()
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404
    if str(session.get("status") or "").lower() != "active":
        conn.close()
        return _session_not_active_response(session)

    result, errors = _mp("_finalize_structured_notes_for_session")(
        conn=conn,
        session_id=session_id,
        session_row=session,
        artifact_payload=payload,
    )
    conn.close()
    if errors:
        return jsonify({"error": "validation_failed", "details": errors}), 400
    return jsonify(result), 201


# ---------------------------------------------------------------------------
# POST /api/tutor/session/<id>/sync-graph -- Re-sync graph for session notes
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/<session_id>/sync-graph", methods=["POST"])
def sync_session_graph(session_id: str):
    from dashboard.api_tutor_turns import _get_tutor_session

    data = request.get_json(silent=True) or {}
    raw_paths = data.get("paths")

    conn = get_connection()
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404
    if str(session.get("status") or "").lower() != "active":
        conn.close()
        return _session_not_active_response(session)

    paths: list[str] = []
    if isinstance(raw_paths, list):
        paths = [str(p).strip() for p in raw_paths if str(p or "").strip()]
    else:
        artifacts_json = session.get("artifacts_json")
        if artifacts_json:
            try:
                artifacts = json.loads(artifacts_json)
            except (json.JSONDecodeError, TypeError):
                artifacts = []
            if isinstance(artifacts, list):
                for artifact in artifacts:
                    if not isinstance(artifact, dict):
                        continue
                    path = artifact.get("path")
                    if isinstance(path, str) and path.strip():
                        paths.append(path.strip())
                    session_path = artifact.get("session_path")
                    if isinstance(session_path, str) and session_path.strip():
                        paths.append(session_path.strip())
                    concept_paths = artifact.get("concept_paths")
                    if isinstance(concept_paths, list):
                        paths.extend(
                            str(cp).strip()
                            for cp in concept_paths
                            if isinstance(cp, str) and cp.strip()
                        )

    dedup_paths: list[str] = []
    seen_paths: set[str] = set()
    for path in paths:
        if path in seen_paths:
            continue
        seen_paths.add(path)
        dedup_paths.append(path)

    if not dedup_paths:
        conn.close()
        return jsonify({"error": "No note paths available for graph sync"}), 400

    notes_by_path: dict[str, str] = {}
    for path in dedup_paths:
        note_res = _mp("_vault_read_note")(path)
        if note_res.get("success"):
            notes_by_path[path] = str(note_res.get("content") or "")

    if not notes_by_path:
        conn.close()
        return jsonify({"error": "No readable notes found for graph sync"}), 400

    graph_sync = _mp("_sync_graph_for_paths")(conn=conn, notes_by_path=notes_by_path)
    conn.close()
    return jsonify(
        {
            "session_id": session_id,
            "requested_paths": dedup_paths,
            "synced_paths": list(notes_by_path.keys()),
            "graph_sync": graph_sync,
        }
    )


# ---------------------------------------------------------------------------
# DELETE /api/tutor/session/<id>/artifacts -- Delete artifact entries by index
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/<session_id>/artifacts", methods=["DELETE"])
def delete_artifacts(session_id: str):
    from dashboard.api_tutor_turns import _get_tutor_session

    route_name = "DELETE /api/tutor/session/<id>/artifacts"
    request_id = str(uuid.uuid4())
    data = request.get_json(silent=True) or {}
    indexes = data.get("indexes")
    if not isinstance(indexes, list) or not all(isinstance(i, int) for i in indexes):
        requested_count = len(indexes) if isinstance(indexes, list) else 0
        _record_tutor_delete_telemetry(
            request_id=request_id,
            route=route_name,
            session_id=session_id,
            status="invalid_request",
            requested_count=requested_count,
            deleted_count=0,
            skipped_count=requested_count,
            failed_count=1,
            details={"reason": "indexes must be a list of integers"},
        )
        return jsonify({"error": "indexes must be a list of integers"}), 400

    conn = get_connection()
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        requested_count = len(indexes)
        _record_tutor_delete_telemetry(
            request_id=request_id,
            route=route_name,
            session_id=session_id,
            status="session_not_found",
            requested_count=requested_count,
            deleted_count=0,
            skipped_count=requested_count,
            failed_count=1,
            details={"reason": "session_not_found"},
        )
        return jsonify({"error": "Session not found"}), 404
    if str(session.get("status") or "").lower() != "active":
        conn.close()
        requested_count = len(indexes)
        _record_tutor_delete_telemetry(
            request_id=request_id,
            route=route_name,
            session_id=session_id,
            status="session_not_active",
            requested_count=requested_count,
            deleted_count=0,
            skipped_count=requested_count,
            failed_count=1,
            details={"reason": "session_not_active", "session_status": session.get("status")},
        )
        return _session_not_active_response(session)

    existing = session.get("artifacts_json")
    artifacts = []
    if existing:
        try:
            artifacts = json.loads(existing)
        except (json.JSONDecodeError, TypeError):
            pass
    if not isinstance(artifacts, list):
        artifacts = []

    requested_indexes = list(indexes)
    normalized_indexes = sorted(set(indexes))
    valid_indexes: list[int] = []
    skipped_indexes: list[int] = []

    # Collect Obsidian paths from artifacts being removed, then delete
    deleted_paths: list[str] = []
    for i in normalized_indexes:
        if 0 <= i < len(artifacts):
            valid_indexes.append(i)
            art = artifacts[i]
            if isinstance(art, dict):
                _delete_session_owned_artifact_rows(
                    conn, session_id=session_id, artifact=art
                )
                deleted_paths.extend(_mp("_delete_artifact_obsidian_files")(art))
        else:
            skipped_indexes.append(i)

    # Remove by index (descending so indices stay valid)
    for i in sorted(valid_indexes, reverse=True):
        if 0 <= i < len(artifacts):
            artifacts.pop(i)

    cur = conn.cursor()
    cur.execute(
        "UPDATE tutor_sessions SET artifacts_json = ? WHERE session_id = ?",
        (json.dumps(artifacts), session_id),
    )
    conn.commit()
    conn.close()

    applied_count = len(valid_indexes)
    _LOG.info(
        "tutor_delete_artifacts request_id=%s session_id=%s requested=%d applied=%d skipped=%d",
        request_id,
        session_id,
        len(requested_indexes),
        applied_count,
        len(skipped_indexes),
    )

    response_payload = {
        "deleted": applied_count,
        "session_id": session_id,
        "request_id": request_id,
        "requested_count": len(requested_indexes),
        "applied_count": applied_count,
        "skipped_indexes": skipped_indexes,
        "obsidian_deleted": deleted_paths,
    }
    _record_tutor_delete_telemetry(
        request_id=request_id,
        route=route_name,
        session_id=session_id,
        status="partial_success" if skipped_indexes else "deleted",
        requested_count=len(requested_indexes),
        deleted_count=applied_count,
        skipped_count=len(skipped_indexes),
        failed_count=0,
        details={
            "skipped_indexes": skipped_indexes,
            "obsidian_deleted_count": len(deleted_paths),
        },
    )
    return jsonify(response_payload)

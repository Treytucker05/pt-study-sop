"""
Tutor workflow routes for the staged Tutor redesign scaffold.
"""

from __future__ import annotations

import json
import re
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from flask import jsonify, request

from db_setup import get_connection

from dashboard.api_tutor import tutor_bp  # noqa: E402

VALID_WORKFLOW_STAGES = {"launch", "priming", "tutor", "polish", "final_sync"}
VALID_WORKFLOW_STATUSES = {
    "launch_ready",
    "priming_in_progress",
    "priming_complete",
    "tutor_in_progress",
    "tutor_complete",
    "polish_in_progress",
    "polish_complete",
    "stored",
    "abandoned",
    "error",
}
VALID_NOTE_MODES = {"exact", "editable"}
VALID_FEEDBACK_SENTIMENTS = {"liked", "disliked"}
_UNSET = object()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _json_dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def _json_loads(value: Any, default: Any) -> Any:
    if not value:
        return default
    try:
        parsed = json.loads(value)
    except (TypeError, ValueError, json.JSONDecodeError):
        return default
    return parsed if isinstance(parsed, type(default)) else default


def _normalize_stage(value: Any, *, default: str) -> str:
    stage = str(value or "").strip().lower()
    return stage if stage in VALID_WORKFLOW_STAGES else default


def _normalize_status(value: Any, *, default: str) -> str:
    status = str(value or "").strip().lower()
    return status if status in VALID_WORKFLOW_STATUSES else default


def _normalize_list(value: Any, *, field_name: str) -> list[Any]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError(f"{field_name} must be a list")
    return value


def _normalize_dict(value: Any, *, field_name: str) -> dict[str, Any] | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError(f"{field_name} must be an object")
    return value


def _normalize_text(value: Any) -> str | None:
    text = str(value or "").strip()
    return text or None


def _normalize_int(value: Any, *, field_name: str) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be an integer") from exc


def _normalize_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    items: list[str] = []
    for item in value:
        text = _normalize_text(item)
        if text:
            items.append(text)
    return items


def _normalize_objective_list(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    items: list[dict[str, Any]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        title = _normalize_text(item.get("title"))
        if not title:
            continue
        items.append(
            {
                "title": title,
                "lo_code": _normalize_text(item.get("lo_code")),
            }
        )
    return items


def _fetch_material_rows(conn: sqlite3.Connection, material_ids: list[int]) -> list[sqlite3.Row]:
    if not material_ids:
        return []
    placeholders = ",".join("?" for _ in material_ids)
    cur = conn.cursor()
    cur.execute(
        f"""
        SELECT id, title, source_path, folder_path, course_id, file_type, content
        FROM rag_docs
        WHERE id IN ({placeholders}) AND COALESCE(corpus, 'materials') = 'materials'
        ORDER BY title COLLATE NOCASE, id
        """,
        tuple(material_ids),
    )
    return list(cur.fetchall())


def _build_source_inventory_item(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": int(row["id"]),
        "title": row["title"] or f"Material {row['id']}",
        "source_path": row["source_path"],
        "folder_path": row["folder_path"],
        "course_id": row["course_id"],
        "content_type": row["file_type"],
    }


def _merge_source_inventory(
    source_inventory: list[dict[str, Any]], material_rows: list[sqlite3.Row]
) -> list[dict[str, Any]]:
    inventory_by_id: dict[int, dict[str, Any]] = {}
    ordered_ids: list[int] = []
    for item in source_inventory:
        if not isinstance(item, dict):
            continue
        material_id = _normalize_int(item.get("id"), field_name="source_inventory.id")
        if material_id is None:
            continue
        normalized = dict(item)
        if not _normalize_text(normalized.get("title")):
            normalized["title"] = f"Material {material_id}"
        inventory_by_id[material_id] = normalized
        if material_id not in ordered_ids:
            ordered_ids.append(material_id)
    for row in material_rows:
        material_id = int(row["id"])
        existing = inventory_by_id.get(material_id) or {}
        merged = {
            **_build_source_inventory_item(row),
            **existing,
        }
        if "priming_output" in existing:
            merged["priming_output"] = existing["priming_output"]
        inventory_by_id[material_id] = merged
        if material_id not in ordered_ids:
            ordered_ids.append(material_id)
    return [inventory_by_id[material_id] for material_id in ordered_ids if material_id in inventory_by_id]


def _build_priming_aggregate(source_inventory: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    summaries: list[dict[str, Any]] = []
    concepts: list[dict[str, Any]] = []
    terminology: list[dict[str, Any]] = []
    root_explanations: list[dict[str, Any]] = []
    identified_gaps: list[dict[str, Any]] = []
    learning_objectives: list[dict[str, Any]] = []
    for item in source_inventory:
        if not isinstance(item, dict):
            continue
        priming_output = item.get("priming_output")
        if not isinstance(priming_output, dict):
            continue
        material_id = _normalize_int(item.get("id"), field_name="source_inventory.id")
        if material_id is None:
            continue
        title = _normalize_text(item.get("title")) or f"Material {material_id}"
        summary = _normalize_text(priming_output.get("summary"))
        if summary:
            summaries.append({"material_id": material_id, "title": title, "summary": summary})
        for concept in _normalize_string_list(priming_output.get("concepts")):
            concepts.append({"material_id": material_id, "title": title, "concept": concept})
        for term in _normalize_string_list(priming_output.get("terminology")):
            terminology.append({"material_id": material_id, "title": title, "term": term})
        root_explanation = _normalize_text(priming_output.get("root_explanation"))
        if root_explanation:
            root_explanations.append(
                {"material_id": material_id, "title": title, "text": root_explanation}
            )
        for gap in _normalize_string_list(priming_output.get("gaps")):
            identified_gaps.append({"material_id": material_id, "title": title, "gap": gap})
        for objective in _normalize_objective_list(priming_output.get("learning_objectives")):
            learning_objectives.append({"material_id": material_id, **objective})
    return {
        "summaries": summaries,
        "concepts": concepts,
        "terminology": terminology,
        "root_explanations": root_explanations,
        "identified_gaps": identified_gaps,
        "learning_objectives": learning_objectives,
    }


def _get_workflow_row(conn: sqlite3.Connection, workflow_id: str) -> sqlite3.Row | None:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            tw.workflow_id,
            tw.course_id,
            tw.course_event_id,
            tw.assignment_title,
            tw.study_unit,
            tw.topic,
            tw.due_date,
            tw.current_stage,
            tw.status,
            tw.active_tutor_session_id,
            tw.created_at,
            tw.updated_at,
            c.name AS course_name,
            c.code AS course_code
        FROM tutor_workflows tw
        LEFT JOIN courses c ON c.id = tw.course_id
        WHERE tw.workflow_id = ?
        """,
        (workflow_id,),
    )
    return cur.fetchone()


def _serialize_workflow(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "workflow_id": row["workflow_id"],
        "course_id": row["course_id"],
        "course_name": row["course_name"],
        "course_code": row["course_code"],
        "course_event_id": row["course_event_id"],
        "assignment_title": row["assignment_title"],
        "study_unit": row["study_unit"],
        "topic": row["topic"],
        "due_date": row["due_date"],
        "current_stage": row["current_stage"],
        "status": row["status"],
        "active_tutor_session_id": row["active_tutor_session_id"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _serialize_priming_bundle(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {
        "id": row["id"],
        "workflow_id": row["workflow_id"],
        "course_id": row["course_id"],
        "study_unit": row["study_unit"],
        "topic": row["topic"],
        "selected_material_ids": _json_loads(row["selected_material_ids_json"], []),
        "selected_paths": _json_loads(row["selected_paths_json"], []),
        "source_inventory": _json_loads(row["source_inventory_json"], []),
        "priming_method": row["priming_method"],
        "priming_chain_id": row["priming_chain_id"],
        "learning_objectives": _json_loads(row["learning_objectives_json"], []),
        "concepts": _json_loads(row["concepts_json"], []),
        "concept_graph": _json_loads(row["concept_graph_json"], {}),
        "terminology": _json_loads(row["terminology_json"], []),
        "root_explanations": _json_loads(row["root_explanations_json"], []),
        "summaries": _json_loads(row["summaries_json"], []),
        "identified_gaps": _json_loads(row["identified_gaps_json"], []),
        "confidence_flags": _json_loads(row["confidence_flags_json"], {}),
        "readiness_status": row["readiness_status"],
        "readiness_blockers": _json_loads(row["readiness_blockers_json"], []),
        "recommended_tutor_strategy": _json_loads(row["recommended_tutor_strategy_json"], {}),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _serialize_captured_note(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "workflow_id": row["workflow_id"],
        "tutor_session_id": row["tutor_session_id"],
        "stage": row["stage"],
        "note_mode": row["note_mode"],
        "title": row["title"],
        "content": row["content"],
        "source_turn_id": row["source_turn_id"],
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _serialize_feedback_event(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "workflow_id": row["workflow_id"],
        "tutor_session_id": row["tutor_session_id"],
        "stage": row["stage"],
        "source_type": row["source_type"],
        "source_id": row["source_id"],
        "sentiment": row["sentiment"],
        "issue_type": row["issue_type"],
        "message": row["message"],
        "handoff_to_polish": bool(row["handoff_to_polish"]),
        "created_at": row["created_at"],
    }


def _serialize_stage_time_log(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "workflow_id": row["workflow_id"],
        "stage": row["stage"],
        "start_ts": row["start_ts"],
        "end_ts": row["end_ts"],
        "seconds_active": int(row["seconds_active"] or 0),
        "pause_count": int(row["pause_count"] or 0),
        "notes": _json_loads(row["notes_json"], []),
        "trigger_source": row["trigger_source"],
        "created_at": row["created_at"],
    }


def _serialize_memory_capsule(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "workflow_id": row["workflow_id"],
        "tutor_session_id": row["tutor_session_id"],
        "stage": row["stage"],
        "capsule_version": int(row["capsule_version"] or 0),
        "summary_text": row["summary_text"],
        "current_objective": row["current_objective"],
        "study_unit": row["study_unit"],
        "concept_focus": _json_loads(row["concept_focus_json"], []),
        "weak_points": _json_loads(row["weak_points_json"], []),
        "unresolved_questions": _json_loads(row["unresolved_questions_json"], []),
        "exact_notes": _json_loads(row["exact_notes_json"], []),
        "editable_notes": _json_loads(row["editable_notes_json"], []),
        "feedback": _json_loads(row["feedback_json"], []),
        "card_requests": _json_loads(row["card_requests_json"], []),
        "artifact_refs": _json_loads(row["artifact_refs_json"], []),
        "source_turn_ids": _json_loads(row["source_turn_ids_json"], []),
        "created_at": row["created_at"],
    }


def _serialize_card_draft_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "sessionId": row["session_id"],
        "deckName": row["deck_name"],
        "cardType": row["card_type"],
        "front": row["front"],
        "back": row["back"],
        "tags": row["tags"],
        "status": row["status"],
        "createdAt": row["created_at"],
    }


def _extract_json_payload(raw_text: str) -> dict[str, Any]:
    content = (raw_text or "").strip()
    if not content:
        return {}
    try:
        parsed = json.loads(content)
        return parsed if isinstance(parsed, dict) else {}
    except (TypeError, ValueError, json.JSONDecodeError):
        pass

    match = re.search(r"\{[\s\S]*\}", content)
    if not match:
        return {}
    try:
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, dict) else {}
    except (TypeError, ValueError, json.JSONDecodeError):
        return {}


def _serialize_polish_bundle(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {
        "id": row["id"],
        "workflow_id": row["workflow_id"],
        "tutor_session_id": row["tutor_session_id"],
        "priming_bundle_id": row["priming_bundle_id"],
        "exact_notes": _json_loads(row["exact_notes_json"], []),
        "editable_notes": _json_loads(row["editable_notes_json"], []),
        "summaries": _json_loads(row["summaries_json"], []),
        "feedback_queue": _json_loads(row["feedback_queue_json"], []),
        "card_requests": _json_loads(row["card_requests_json"], []),
        "reprime_requests": _json_loads(row["reprime_requests_json"], []),
        "studio_payload": _json_loads(row["studio_payload_json"], {}),
        "publish_targets": _json_loads(row["publish_targets_json"], {}),
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _serialize_publish_result(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "workflow_id": row["workflow_id"],
        "polish_bundle_id": row["polish_bundle_id"],
        "obsidian_results": _json_loads(row["obsidian_results_json"], []),
        "anki_results": _json_loads(row["anki_results_json"], []),
        "brain_index_payload": _json_loads(row["brain_index_payload_json"], {}),
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _update_workflow_state(
    conn: sqlite3.Connection,
    workflow_id: str,
    *,
    current_stage: str | None = None,
    status: str | None = None,
    active_tutor_session_id: Any = _UNSET,
) -> None:
    updates = ["updated_at = ?"]
    values: list[Any] = [_now_iso()]
    if current_stage is not None:
        updates.append("current_stage = ?")
        values.append(current_stage)
    if status is not None:
        updates.append("status = ?")
        values.append(status)
    if active_tutor_session_id is not _UNSET:
        updates.append("active_tutor_session_id = ?")
        values.append(active_tutor_session_id)
    values.append(workflow_id)
    conn.execute(f"UPDATE tutor_workflows SET {', '.join(updates)} WHERE workflow_id = ?", values)


def _load_workflow_detail(conn: sqlite3.Connection, workflow_id: str) -> dict[str, Any] | None:
    workflow_row = _get_workflow_row(conn, workflow_id)
    if workflow_row is None:
        return None
    cur = conn.cursor()
    cur.execute("SELECT * FROM tutor_priming_bundles WHERE workflow_id = ?", (workflow_id,))
    priming_row = cur.fetchone()
    cur.execute("SELECT * FROM tutor_captured_notes WHERE workflow_id = ? ORDER BY id ASC", (workflow_id,))
    notes = [_serialize_captured_note(row) for row in cur.fetchall()]
    cur.execute("SELECT * FROM tutor_feedback_events WHERE workflow_id = ? ORDER BY id ASC", (workflow_id,))
    feedback = [_serialize_feedback_event(row) for row in cur.fetchall()]
    cur.execute("SELECT * FROM tutor_stage_time_logs WHERE workflow_id = ? ORDER BY id ASC", (workflow_id,))
    time_logs = [_serialize_stage_time_log(row) for row in cur.fetchall()]
    cur.execute("SELECT * FROM tutor_memory_capsules WHERE workflow_id = ? ORDER BY capsule_version ASC", (workflow_id,))
    capsules = [_serialize_memory_capsule(row) for row in cur.fetchall()]
    cur.execute("SELECT * FROM tutor_polish_bundles WHERE workflow_id = ?", (workflow_id,))
    polish_row = cur.fetchone()
    cur.execute("SELECT * FROM tutor_publish_results WHERE workflow_id = ? ORDER BY id ASC", (workflow_id,))
    publish_results = [_serialize_publish_result(row) for row in cur.fetchall()]
    return {
        "workflow": _serialize_workflow(workflow_row),
        "priming_bundle": _serialize_priming_bundle(priming_row),
        "captured_notes": notes,
        "feedback_events": feedback,
        "stage_time_logs": time_logs,
        "memory_capsules": capsules,
        "polish_bundle": _serialize_polish_bundle(polish_row),
        "publish_results": publish_results,
    }


def _delete_workflow_related_rows(
    conn: sqlite3.Connection, workflow_id: str
) -> dict[str, int]:
    cur = conn.cursor()
    deleted_counts: dict[str, int] = {}
    delete_order = [
        ("publish_results", "DELETE FROM tutor_publish_results WHERE workflow_id = ?"),
        ("polish_bundles", "DELETE FROM tutor_polish_bundles WHERE workflow_id = ?"),
        ("memory_capsules", "DELETE FROM tutor_memory_capsules WHERE workflow_id = ?"),
        ("stage_time_logs", "DELETE FROM tutor_stage_time_logs WHERE workflow_id = ?"),
        ("feedback_events", "DELETE FROM tutor_feedback_events WHERE workflow_id = ?"),
        ("captured_notes", "DELETE FROM tutor_captured_notes WHERE workflow_id = ?"),
        ("priming_bundles", "DELETE FROM tutor_priming_bundles WHERE workflow_id = ?"),
    ]
    for label, sql in delete_order:
        cur.execute(sql, (workflow_id,))
        deleted_counts[label] = int(cur.rowcount or 0)
    return deleted_counts


@tutor_bp.route("/workflows", methods=["GET"])
def list_tutor_workflows():
    course_id = request.args.get("course_id")
    status = request.args.get("status")
    stage = request.args.get("stage")
    include_drafts = request.args.get("include_drafts", "false").lower() == "true"
    try:
        parsed_limit = max(1, min(int(request.args.get("limit", "20")), 100))
        parsed_course_id = int(course_id) if course_id else None
    except ValueError:
        return jsonify({"error": "Invalid workflow list filters"}), 400
    where_parts: list[str] = []
    values: list[Any] = []
    if parsed_course_id is not None:
        where_parts.append("tw.course_id = ?")
        values.append(parsed_course_id)
    if status:
        where_parts.append("tw.status = ?")
        values.append(status)
    if stage:
        where_parts.append("tw.current_stage = ?")
        values.append(stage)
    if not include_drafts:
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        where_parts.append(
            "NOT (tw.course_id IS NULL AND tw.topic IS NULL"
            " AND tw.status = 'priming_in_progress'"
            " AND tw.created_at < ?)"
        )
        values.append(cutoff)
    where_sql = f"WHERE {' AND '.join(where_parts)}" if where_parts else ""
    values.append(parsed_limit)
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT
                tw.workflow_id,
                tw.course_id,
                tw.course_event_id,
                tw.assignment_title,
                tw.study_unit,
                tw.topic,
                tw.due_date,
                tw.current_stage,
                tw.status,
                tw.active_tutor_session_id,
                tw.created_at,
                tw.updated_at,
                c.name AS course_name,
                c.code AS course_code
            FROM tutor_workflows tw
            LEFT JOIN courses c ON c.id = tw.course_id
            {where_sql}
            ORDER BY datetime(tw.updated_at) DESC, tw.id DESC
            LIMIT ?
            """,
            values,
        )
        items = [_serialize_workflow(row) for row in cur.fetchall()]
    finally:
        conn.close()
    return jsonify({"items": items, "count": len(items)})


@tutor_bp.route("/workflows", methods=["POST"])
def create_tutor_workflow():
    data = request.get_json(silent=True) or {}
    workflow_id = str(uuid.uuid4())
    now = _now_iso()
    try:
        course_id = _normalize_int(data.get("course_id"), field_name="course_id")
        course_event_id = _normalize_int(data.get("course_event_id"), field_name="course_event_id")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        conn.execute(
            """
            INSERT INTO tutor_workflows (
                workflow_id, course_id, course_event_id, assignment_title, study_unit,
                topic, due_date, current_stage, status, active_tutor_session_id,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                workflow_id,
                course_id,
                course_event_id,
                _normalize_text(data.get("assignment_title")),
                _normalize_text(data.get("study_unit")),
                _normalize_text(data.get("topic")),
                _normalize_text(data.get("due_date")),
                _normalize_stage(data.get("current_stage"), default="launch"),
                _normalize_status(data.get("status"), default="launch_ready"),
                _normalize_text(data.get("active_tutor_session_id")),
                now,
                now,
            ),
        )
        conn.commit()
        workflow_row = _get_workflow_row(conn, workflow_id)
    finally:
        conn.close()
    return jsonify({"workflow": _serialize_workflow(workflow_row)})


@tutor_bp.route("/workflows/<workflow_id>", methods=["GET"])
def get_tutor_workflow(workflow_id: str):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        payload = _load_workflow_detail(conn, workflow_id)
    finally:
        conn.close()
    if payload is None:
        return jsonify({"error": "Workflow not found"}), 404
    return jsonify(payload)


@tutor_bp.route("/workflows/<workflow_id>", methods=["DELETE"])
def delete_tutor_workflow(workflow_id: str):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404

        deleted_related = _delete_workflow_related_rows(conn, workflow_id)
        cur = conn.cursor()
        cur.execute("DELETE FROM tutor_workflows WHERE workflow_id = ?", (workflow_id,))
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return jsonify(
        {
            "deleted": True,
            "workflow_id": workflow_id,
            "related_records_deleted": deleted_related,
        }
    )


@tutor_bp.route("/workflows/<workflow_id>/stage", methods=["PATCH"])
def update_tutor_workflow_stage(workflow_id: str):
    data = request.get_json(silent=True) or {}
    active_tutor_session_id: Any = _UNSET
    if "active_tutor_session_id" in data:
        active_tutor_session_id = _normalize_text(data.get("active_tutor_session_id"))
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
        _update_workflow_state(
            conn,
            workflow_id,
            current_stage=_normalize_stage(data.get("current_stage"), default="launch"),
            status=_normalize_status(data.get("status"), default="launch_ready"),
            active_tutor_session_id=active_tutor_session_id,
        )
        conn.commit()
        workflow_row = _get_workflow_row(conn, workflow_id)
    finally:
        conn.close()
    return jsonify({"workflow": _serialize_workflow(workflow_row)})


@tutor_bp.route("/workflows/<workflow_id>/priming-bundle", methods=["PUT"])
def upsert_tutor_priming_bundle(workflow_id: str):
    data = request.get_json(silent=True) or {}
    now = _now_iso()
    try:
        course_id = _normalize_int(data.get("course_id"), field_name="course_id")
        selected_material_ids = _normalize_list(data.get("selected_material_ids"), field_name="selected_material_ids")
        selected_paths = _normalize_list(data.get("selected_paths"), field_name="selected_paths")
        source_inventory = _normalize_list(data.get("source_inventory"), field_name="source_inventory")
        learning_objectives = _normalize_list(data.get("learning_objectives"), field_name="learning_objectives")
        concepts = _normalize_list(data.get("concepts"), field_name="concepts")
        terminology = _normalize_list(data.get("terminology"), field_name="terminology")
        root_explanations = _normalize_list(data.get("root_explanations"), field_name="root_explanations")
        summaries = _normalize_list(data.get("summaries"), field_name="summaries")
        identified_gaps = _normalize_list(data.get("identified_gaps"), field_name="identified_gaps")
        readiness_blockers = _normalize_list(data.get("readiness_blockers"), field_name="readiness_blockers")
        concept_graph = _normalize_dict(data.get("concept_graph"), field_name="concept_graph") or {}
        confidence_flags = _normalize_dict(data.get("confidence_flags"), field_name="confidence_flags") or {}
        recommended_tutor_strategy = _normalize_dict(
            data.get("recommended_tutor_strategy"),
            field_name="recommended_tutor_strategy",
        ) or {}
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    readiness_status = str(data.get("readiness_status") or "draft").strip().lower() or "draft"
    workflow_status = "priming_complete" if readiness_status == "ready" else "priming_in_progress"
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
        cur = conn.cursor()
        cur.execute("SELECT id FROM tutor_priming_bundles WHERE workflow_id = ?", (workflow_id,))
        existing = cur.fetchone()
        params = (
            course_id,
            _normalize_text(data.get("study_unit")),
            _normalize_text(data.get("topic")),
            _json_dumps(selected_material_ids),
            _json_dumps(selected_paths),
            _json_dumps(source_inventory),
            _normalize_text(data.get("priming_method")),
            _normalize_text(data.get("priming_chain_id")),
            _json_dumps(learning_objectives),
            _json_dumps(concepts),
            _json_dumps(concept_graph),
            _json_dumps(terminology),
            _json_dumps(root_explanations),
            _json_dumps(summaries),
            _json_dumps(identified_gaps),
            _json_dumps(confidence_flags),
            readiness_status,
            _json_dumps(readiness_blockers),
            _json_dumps(recommended_tutor_strategy),
            now,
        )
        if existing is None:
            conn.execute(
                """
                INSERT INTO tutor_priming_bundles (
                    workflow_id, course_id, study_unit, topic, selected_material_ids_json,
                    selected_paths_json, source_inventory_json, priming_method, priming_chain_id,
                    learning_objectives_json, concepts_json, concept_graph_json, terminology_json,
                    root_explanations_json, summaries_json, identified_gaps_json,
                    confidence_flags_json, readiness_status, readiness_blockers_json,
                    recommended_tutor_strategy_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (workflow_id, *params[:-1], now, now),
            )
        else:
            conn.execute(
                """
                UPDATE tutor_priming_bundles
                SET
                    course_id = ?,
                    study_unit = ?,
                    topic = ?,
                    selected_material_ids_json = ?,
                    selected_paths_json = ?,
                    source_inventory_json = ?,
                    priming_method = ?,
                    priming_chain_id = ?,
                    learning_objectives_json = ?,
                    concepts_json = ?,
                    concept_graph_json = ?,
                    terminology_json = ?,
                    root_explanations_json = ?,
                    summaries_json = ?,
                    identified_gaps_json = ?,
                    confidence_flags_json = ?,
                    readiness_status = ?,
                    readiness_blockers_json = ?,
                    recommended_tutor_strategy_json = ?,
                    updated_at = ?
                WHERE workflow_id = ?
                """,
                (*params, workflow_id),
            )
        _update_workflow_state(conn, workflow_id, current_stage="priming", status=workflow_status)
        conn.commit()
        cur.execute("SELECT * FROM tutor_priming_bundles WHERE workflow_id = ?", (workflow_id,))
        bundle_row = cur.fetchone()
    finally:
        conn.close()
    return jsonify({"priming_bundle": _serialize_priming_bundle(bundle_row)})


@tutor_bp.route("/workflows/<workflow_id>/notes", methods=["POST"])
def capture_tutor_workflow_note(workflow_id: str):
    data = request.get_json(silent=True) or {}
    note_mode = str(data.get("note_mode") or "").strip().lower()
    if note_mode not in VALID_NOTE_MODES:
        return jsonify({"error": "note_mode must be 'exact' or 'editable'"}), 400
    content = _normalize_text(data.get("content"))
    if not content:
        return jsonify({"error": "content is required"}), 400
    try:
        source_turn_id = _normalize_int(data.get("source_turn_id"), field_name="source_turn_id")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    now = _now_iso()
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO tutor_captured_notes (
                workflow_id, tutor_session_id, stage, note_mode, title, content,
                source_turn_id, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                workflow_id,
                _normalize_text(data.get("tutor_session_id")),
                _normalize_stage(data.get("stage"), default="tutor"),
                note_mode,
                _normalize_text(data.get("title")),
                content,
                source_turn_id,
                str(data.get("status") or "captured").strip() or "captured",
                now,
                now,
            ),
        )
        note_id = cur.lastrowid
        conn.commit()
        cur.execute("SELECT * FROM tutor_captured_notes WHERE id = ?", (note_id,))
        note_row = cur.fetchone()
    finally:
        conn.close()
    return jsonify({"note": _serialize_captured_note(note_row)})


@tutor_bp.route("/workflows/<workflow_id>/feedback", methods=["POST"])
def capture_tutor_workflow_feedback(workflow_id: str):
    data = request.get_json(silent=True) or {}
    sentiment = str(data.get("sentiment") or "").strip().lower()
    if sentiment not in VALID_FEEDBACK_SENTIMENTS:
        return jsonify({"error": "sentiment must be 'liked' or 'disliked'"}), 400
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO tutor_feedback_events (
                workflow_id, tutor_session_id, stage, source_type, source_id, sentiment,
                issue_type, message, handoff_to_polish, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                workflow_id,
                _normalize_text(data.get("tutor_session_id")),
                _normalize_stage(data.get("stage"), default="tutor"),
                _normalize_text(data.get("source_type")) or "turn",
                _normalize_text(data.get("source_id")),
                sentiment,
                _normalize_text(data.get("issue_type")),
                _normalize_text(data.get("message")),
                1 if bool(data.get("handoff_to_polish", True)) else 0,
                _now_iso(),
            ),
        )
        feedback_id = cur.lastrowid
        conn.commit()
        cur.execute("SELECT * FROM tutor_feedback_events WHERE id = ?", (feedback_id,))
        feedback_row = cur.fetchone()
    finally:
        conn.close()
    return jsonify({"feedback": _serialize_feedback_event(feedback_row)})


@tutor_bp.route("/workflows/<workflow_id>/stage-time", methods=["POST"])
def log_tutor_workflow_stage_time(workflow_id: str):
    data = request.get_json(silent=True) or {}
    try:
        notes = _normalize_list(data.get("notes"), field_name="notes")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO tutor_stage_time_logs (
                workflow_id, stage, start_ts, end_ts, seconds_active, pause_count,
                notes_json, trigger_source, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                workflow_id,
                _normalize_stage(data.get("stage"), default="tutor"),
                _normalize_text(data.get("start_ts")) or _now_iso(),
                _normalize_text(data.get("end_ts")),
                int(data.get("seconds_active") or 0),
                int(data.get("pause_count") or 0),
                _json_dumps(notes),
                _normalize_text(data.get("trigger_source")),
                _now_iso(),
            ),
        )
        log_id = cur.lastrowid
        conn.commit()
        cur.execute("SELECT * FROM tutor_stage_time_logs WHERE id = ?", (log_id,))
        log_row = cur.fetchone()
    finally:
        conn.close()
    return jsonify({"stage_time_log": _serialize_stage_time_log(log_row)})


@tutor_bp.route("/workflows/<workflow_id>/memory-capsules", methods=["POST"])
def create_tutor_memory_capsule(workflow_id: str):
    data = request.get_json(silent=True) or {}
    try:
        concept_focus = _normalize_list(data.get("concept_focus"), field_name="concept_focus")
        weak_points = _normalize_list(data.get("weak_points"), field_name="weak_points")
        unresolved_questions = _normalize_list(
            data.get("unresolved_questions"),
            field_name="unresolved_questions",
        )
        exact_notes = _normalize_list(data.get("exact_notes"), field_name="exact_notes")
        editable_notes = _normalize_list(data.get("editable_notes"), field_name="editable_notes")
        feedback = _normalize_list(data.get("feedback"), field_name="feedback")
        card_requests = _normalize_list(data.get("card_requests"), field_name="card_requests")
        artifact_refs = _normalize_list(data.get("artifact_refs"), field_name="artifact_refs")
        source_turn_ids = _normalize_list(data.get("source_turn_ids"), field_name="source_turn_ids")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
        cur = conn.cursor()
        cur.execute(
            "SELECT COALESCE(MAX(capsule_version), 0) AS max_version FROM tutor_memory_capsules WHERE workflow_id = ?",
            (workflow_id,),
        )
        next_version = int((cur.fetchone()["max_version"] or 0) + 1)
        cur.execute(
            """
            INSERT INTO tutor_memory_capsules (
                workflow_id, tutor_session_id, stage, capsule_version, summary_text,
                current_objective, study_unit, concept_focus_json, weak_points_json,
                unresolved_questions_json, exact_notes_json, editable_notes_json,
                feedback_json, card_requests_json, artifact_refs_json,
                source_turn_ids_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                workflow_id,
                _normalize_text(data.get("tutor_session_id")),
                _normalize_stage(data.get("stage"), default="tutor"),
                next_version,
                _normalize_text(data.get("summary_text")),
                _normalize_text(data.get("current_objective")),
                _normalize_text(data.get("study_unit")),
                _json_dumps(concept_focus),
                _json_dumps(weak_points),
                _json_dumps(unresolved_questions),
                _json_dumps(exact_notes),
                _json_dumps(editable_notes),
                _json_dumps(feedback),
                _json_dumps(card_requests),
                _json_dumps(artifact_refs),
                _json_dumps(source_turn_ids),
                _now_iso(),
            ),
        )
        capsule_id = cur.lastrowid
        conn.commit()
        cur.execute("SELECT * FROM tutor_memory_capsules WHERE id = ?", (capsule_id,))
        capsule_row = cur.fetchone()
    finally:
        conn.close()
    return jsonify({"memory_capsule": _serialize_memory_capsule(capsule_row)})


@tutor_bp.route("/workflows/<workflow_id>/polish-bundle", methods=["PUT"])
def upsert_tutor_polish_bundle(workflow_id: str):
    data = request.get_json(silent=True) or {}
    try:
        priming_bundle_id = _normalize_int(data.get("priming_bundle_id"), field_name="priming_bundle_id")
        exact_notes = _normalize_list(data.get("exact_notes"), field_name="exact_notes")
        editable_notes = _normalize_list(data.get("editable_notes"), field_name="editable_notes")
        summaries = _normalize_list(data.get("summaries"), field_name="summaries")
        feedback_queue = _normalize_list(data.get("feedback_queue"), field_name="feedback_queue")
        card_requests = _normalize_list(data.get("card_requests"), field_name="card_requests")
        reprime_requests = _normalize_list(data.get("reprime_requests"), field_name="reprime_requests")
        studio_payload = _normalize_dict(data.get("studio_payload"), field_name="studio_payload") or {}
        publish_targets = _normalize_dict(data.get("publish_targets"), field_name="publish_targets") or {}
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    status = str(data.get("status") or "draft").strip().lower() or "draft"
    workflow_status = "polish_complete" if status in {"ready", "complete", "approved"} else "polish_in_progress"
    now = _now_iso()

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
        cur = conn.cursor()
        cur.execute("SELECT id FROM tutor_polish_bundles WHERE workflow_id = ?", (workflow_id,))
        existing = cur.fetchone()
        params = (
            _normalize_text(data.get("tutor_session_id")),
            priming_bundle_id,
            _json_dumps(exact_notes),
            _json_dumps(editable_notes),
            _json_dumps(summaries),
            _json_dumps(feedback_queue),
            _json_dumps(card_requests),
            _json_dumps(reprime_requests),
            _json_dumps(studio_payload),
            _json_dumps(publish_targets),
            status,
            now,
        )
        if existing is None:
            conn.execute(
                """
                INSERT INTO tutor_polish_bundles (
                    workflow_id, tutor_session_id, priming_bundle_id, exact_notes_json,
                    editable_notes_json, summaries_json, feedback_queue_json,
                    card_requests_json, reprime_requests_json, studio_payload_json,
                    publish_targets_json, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (workflow_id, *params[:-1], now, now),
            )
        else:
            conn.execute(
                """
                UPDATE tutor_polish_bundles
                SET
                    tutor_session_id = ?,
                    priming_bundle_id = ?,
                    exact_notes_json = ?,
                    editable_notes_json = ?,
                    summaries_json = ?,
                    feedback_queue_json = ?,
                    card_requests_json = ?,
                    reprime_requests_json = ?,
                    studio_payload_json = ?,
                    publish_targets_json = ?,
                    status = ?,
                    updated_at = ?
                WHERE workflow_id = ?
                """,
                (*params, workflow_id),
            )
        _update_workflow_state(conn, workflow_id, current_stage="polish", status=workflow_status)
        conn.commit()
        cur.execute("SELECT * FROM tutor_polish_bundles WHERE workflow_id = ?", (workflow_id,))
        polish_row = cur.fetchone()
    finally:
        conn.close()
    return jsonify({"polish_bundle": _serialize_polish_bundle(polish_row)})


@tutor_bp.route("/workflows/<workflow_id>/publish-result", methods=["POST"])
def create_tutor_publish_result(workflow_id: str):
    data = request.get_json(silent=True) or {}
    try:
        polish_bundle_id = _normalize_int(data.get("polish_bundle_id"), field_name="polish_bundle_id")
        obsidian_results = _normalize_list(data.get("obsidian_results"), field_name="obsidian_results")
        anki_results = _normalize_list(data.get("anki_results"), field_name="anki_results")
        brain_index_payload = _normalize_dict(data.get("brain_index_payload"), field_name="brain_index_payload") or {}
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    status = str(data.get("status") or "pending").strip().lower() or "pending"
    now = _now_iso()
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO tutor_publish_results (
                workflow_id, polish_bundle_id, obsidian_results_json, anki_results_json,
                brain_index_payload_json, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                workflow_id,
                polish_bundle_id,
                _json_dumps(obsidian_results),
                _json_dumps(anki_results),
                _json_dumps(brain_index_payload),
                status,
                now,
                now,
            ),
        )
        publish_id = cur.lastrowid
        _update_workflow_state(
            conn,
            workflow_id,
            current_stage="final_sync",
            status="stored" if status in {"completed", "stored", "success"} else "polish_complete",
        )
        conn.commit()
        cur.execute("SELECT * FROM tutor_publish_results WHERE id = ?", (publish_id,))
        publish_row = cur.fetchone()
    finally:
        conn.close()
    return jsonify({"publish_result": _serialize_publish_result(publish_row)})


@tutor_bp.route("/workflows/<workflow_id>/priming-assist", methods=["POST"])
def run_tutor_priming_assist(workflow_id: str):
    data = request.get_json(silent=True) or {}
    try:
        material_ids = [
            material_id
            for material_id in (
                _normalize_int(item, field_name="material_ids[]")
                for item in _normalize_list(data.get("material_ids"), field_name="material_ids")
            )
            if material_id is not None
        ]
        source_inventory = [
            item
            for item in _normalize_list(data.get("source_inventory"), field_name="source_inventory")
            if isinstance(item, dict)
        ]
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if not material_ids:
        return jsonify({"error": "material_ids is required"}), 400

    study_unit = _normalize_text(data.get("study_unit"))
    topic = _normalize_text(data.get("topic"))
    priming_method = _normalize_text(data.get("priming_method")) or "summary_first"
    priming_chain_id = _normalize_text(data.get("priming_chain_id")) or "ingest_objectives_concepts_summary_gaps"

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
        material_rows = _fetch_material_rows(conn, material_ids)
    finally:
        conn.close()

    found_ids = {int(row["id"]) for row in material_rows}
    missing_ids = [material_id for material_id in material_ids if material_id not in found_ids]
    if missing_ids:
        return jsonify({"error": f"Materials not found: {', '.join(str(item) for item in missing_ids)}"}), 404

    from llm_provider import call_llm

    merged_inventory = _merge_source_inventory(source_inventory, material_rows)
    inventory_by_id = {
        int(item["id"]): item for item in merged_inventory if isinstance(item, dict) and item.get("id") is not None
    }
    failures: list[dict[str, Any]] = []
    for row in material_rows:
        material_id = int(row["id"])
        content = str(row["content"] or "").replace("\ufffd", "").strip()
        if not content:
            failures.append({"material_id": material_id, "error": "Material content is empty"})
            continue
        content_excerpt = content[:12000]
        system_prompt = """You are Priming Assist for a study workflow.
Extract source-linked PRIME artifacts from the provided material.
Do not invent facts and do not use external knowledge.
Return STRICT JSON only:
{
  "summary": "markdown-ready string",
  "concepts": ["string"],
  "terminology": ["string"],
  "root_explanation": "string",
  "gaps": ["string"],
  "learning_objectives": [
    {
      "title": "string",
      "lo_code": "string or null"
    }
  ]
}
"""
        user_prompt = (
            f"Workflow study unit: {study_unit or workflow_row['study_unit'] or 'Unspecified'}\n"
            f"Workflow topic: {topic or workflow_row['topic'] or 'Unspecified'}\n"
            f"Priming method: {priming_method}\n"
            f"Priming chain: {priming_chain_id}\n"
            f"Material title: {row['title'] or f'Material {material_id}'}\n"
            f"Material source path: {row['source_path'] or 'Unknown'}\n\n"
            "Artifact guidance:\n"
            "- summary = concise material-grounded PRIME summary with short markdown-friendly section labels and short paragraphs; avoid one giant paragraph\n"
            "- concepts = high-signal study spine nodes, not trivia; return concise strings only with no numbering or bullets\n"
            "- terminology = key terms for the selected material; each entry should use 'Term :: concise material-grounded definition'\n"
            "- root_explanation = a real hierarchical map, not prose; prefer a fenced ```mermaid``` flowchart or mindmap block, otherwise return an ASCII tree in a fenced text block\n"
            "- gaps = unresolved ambiguities or missing support in the material; return concise strings only with no numbering or bullets\n"
            "- learning_objectives = instructor-aligned or material-grounded objectives for this slice; keep titles concise and source-grounded\n"
            "- keep all outputs readable in a study workspace with headings, paragraphs, and visible structure where applicable\n\n"
            f"Material content:\n{content_excerpt}"
        )
        result = call_llm(system_prompt=system_prompt, user_prompt=user_prompt, timeout=60)
        if not result.get("success"):
            failures.append(
                {
                    "material_id": material_id,
                    "error": result.get("error") or "Priming assist failed",
                }
            )
            continue
        content_raw = str(result.get("content") or "")
        parsed = _extract_json_payload(content_raw)
        if not parsed:
            failures.append({"material_id": material_id, "error": "Priming assist returned invalid JSON"})
            continue
        inventory_item = inventory_by_id.get(material_id) or _build_source_inventory_item(row)
        inventory_item["priming_output"] = {
            "material_id": material_id,
            "title": row["title"] or f"Material {material_id}",
            "source_path": row["source_path"],
            "summary": _normalize_text(parsed.get("summary")),
            "concepts": _normalize_string_list(parsed.get("concepts")),
            "terminology": _normalize_string_list(parsed.get("terminology")),
            "root_explanation": _normalize_text(parsed.get("root_explanation")),
            "gaps": _normalize_string_list(parsed.get("gaps")),
            "learning_objectives": _normalize_objective_list(parsed.get("learning_objectives")),
            "char_count": len(content),
            "extraction_lossy": False,
            "updated_at": _now_iso(),
        }
        inventory_by_id[material_id] = inventory_item

    source_inventory_response = [
        inventory_by_id[int(item["id"])]
        for item in merged_inventory
        if isinstance(item, dict) and _normalize_int(item.get("id"), field_name="source_inventory.id") is not None
    ]
    aggregate = _build_priming_aggregate(source_inventory_response)
    payload: dict[str, Any] = {
        "source_inventory": source_inventory_response,
        "aggregate": aggregate,
    }
    if failures:
        payload["failures"] = failures
    return jsonify(payload)


@tutor_bp.route("/workflows/<workflow_id>/polish-assist", methods=["POST"])
def run_tutor_polish_assist(workflow_id: str):
    data = request.get_json(silent=True) or {}
    action = str(data.get("action") or "").strip().lower()
    input_text = _normalize_text(data.get("input_text")) or ""
    question = _normalize_text(data.get("question"))
    max_cards = _normalize_int(data.get("max_cards"), field_name="max_cards") or 6
    if action not in {"summarize", "qa", "rewrite_note", "draft_cards"}:
        return jsonify({"error": "Unsupported polish assist action"}), 400
    if action in {"summarize", "rewrite_note", "draft_cards"} and not input_text:
        return jsonify({"error": "input_text is required"}), 400
    if action == "qa" and not question:
        return jsonify({"error": "question is required"}), 400

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
    finally:
        conn.close()

    from llm_provider import call_llm

    if action == "summarize":
        system_prompt = """You are Polish Assist for a study workflow.
Turn the provided workflow material into a tight final study summary.
Do not add new facts.
Return STRICT JSON only:
{"text":"string"}
"""
        user_prompt = f"Summarize this workflow output into a final study summary:\n\n{input_text}"
    elif action == "qa":
        system_prompt = """You are Polish Assist for a study workflow.
Answer only from the provided workflow material.
If the answer is not supported, say so directly.
Return STRICT JSON only:
{"text":"string"}
"""
        user_prompt = f"Context:\n{input_text}\n\nQuestion:\n{question}"
    elif action == "rewrite_note":
        system_prompt = """You are Polish Assist for a study workflow.
Rewrite the provided editable note for clarity and study value.
Preserve meaning. Do not add new facts.
Return STRICT JSON only:
{"text":"string"}
"""
        user_prompt = f"Rewrite this editable note:\n\n{input_text}"
    else:
        system_prompt = """You are Polish Assist for a study workflow.
Generate high-quality Anki-ready card candidates from the provided workflow material.
Return STRICT JSON only:
{
  "text": "short optional note",
  "cards": [
    {
      "front": "string",
      "back": "string",
      "deck_name": "string",
      "tags": "string",
      "card_type": "basic"
    }
  ]
}
Do not exceed the requested card count.
"""
        user_prompt = (
            f"Generate up to {max_cards} flashcard candidates from this workflow material:\n\n"
            f"{input_text}"
        )

    result = call_llm(system_prompt=system_prompt, user_prompt=user_prompt, timeout=60)
    if not result.get("success"):
        return jsonify({"error": result.get("error") or "Polish assist failed"}), 502

    content = str(result.get("content") or "")
    parsed = _extract_json_payload(content)
    text = _normalize_text(parsed.get("text")) if parsed else None
    cards = parsed.get("cards") if isinstance(parsed.get("cards"), list) else []
    normalized_cards: list[dict[str, Any]] = []
    for card in cards[:max_cards]:
        if not isinstance(card, dict):
            continue
        front = _normalize_text(card.get("front"))
        back = _normalize_text(card.get("back"))
        if not front or not back:
            continue
        normalized_cards.append(
            {
                "front": front,
                "back": back,
                "deck_name": _normalize_text(card.get("deck_name")) or "Trey::Tutor Workflow",
                "tags": _normalize_text(card.get("tags")) or "tutor workflow",
                "card_type": _normalize_text(card.get("card_type")) or "basic",
            }
        )

    if not text:
        text = content.strip()

    return jsonify(
        {
            "result": {
                "text": text,
                "cards": normalized_cards,
                "raw": parsed or {"content": content},
            }
        }
    )


@tutor_bp.route("/workflows/<workflow_id>/card-drafts", methods=["POST"])
def create_tutor_workflow_card_drafts(workflow_id: str):
    data = request.get_json(silent=True) or {}
    try:
        cards = _normalize_list(data.get("cards"), field_name="cards")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
    finally:
        conn.close()

    from anki_sync import create_card_draft

    created_ids: list[int] = []
    errors: list[dict[str, Any]] = []
    for index, card in enumerate(cards):
        if not isinstance(card, dict):
            errors.append({"index": index, "error": "Card must be an object"})
            continue
        front = _normalize_text(card.get("front"))
        back = _normalize_text(card.get("back"))
        if not front or not back:
            errors.append({"index": index, "error": "Card front and back are required"})
            continue
        draft_id = create_card_draft(
            front=front,
            back=back,
            card_type=_normalize_text(card.get("card_type")) or "basic",
            deck_name=_normalize_text(card.get("deck_name")) or "Trey::Tutor Workflow",
            tags=_normalize_text(card.get("tags")) or "tutor workflow",
            session_id=workflow_row["active_tutor_session_id"],
            course_id=workflow_row["course_id"],
            status=_normalize_text(card.get("status")) or "approved",
            source_citation=f"workflow:{workflow_id}",
        )
        if draft_id is None:
            errors.append({"index": index, "error": "Card draft creation failed"})
            continue
        created_ids.append(int(draft_id))

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        drafts: list[dict[str, Any]] = []
        if created_ids:
            placeholders = ",".join("?" for _ in created_ids)
            cur = conn.cursor()
            cur.execute(
                f"""
                SELECT id, session_id, deck_name, card_type, front, back, tags, status, created_at
                FROM card_drafts
                WHERE id IN ({placeholders})
                ORDER BY id ASC
                """,
                tuple(created_ids),
            )
            drafts = [_serialize_card_draft_row(row) for row in cur.fetchall()]
    finally:
        conn.close()

    return jsonify({"drafts": drafts, "errors": errors})


@tutor_bp.route("/workflows/analytics/summary", methods=["GET"])
def get_tutor_workflow_analytics_summary():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                tw.workflow_id,
                tw.course_id,
                tw.status,
                COALESCE(c.name, tw.assignment_title, tw.study_unit, tw.topic, 'Unassigned') AS course_name
            FROM tutor_workflows tw
            LEFT JOIN courses c ON c.id = tw.course_id
            ORDER BY tw.created_at DESC
            """
        )
        workflow_rows = cur.fetchall()

        cur.execute(
            """
            SELECT workflow_id, stage, seconds_active
            FROM tutor_stage_time_logs
            ORDER BY id ASC
            """
        )
        stage_rows = cur.fetchall()

        cur.execute(
            """
            SELECT workflow_id, note_mode
            FROM tutor_captured_notes
            ORDER BY id ASC
            """
        )
        note_rows = cur.fetchall()

        cur.execute(
            """
            SELECT workflow_id, sentiment
            FROM tutor_feedback_events
            ORDER BY id ASC
            """
        )
        feedback_rows = cur.fetchall()

        cur.execute("SELECT workflow_id FROM tutor_memory_capsules ORDER BY id ASC")
        capsule_rows = cur.fetchall()

        cur.execute(
            """
            SELECT workflow_id, priming_method, priming_chain_id, source_inventory_json
            FROM tutor_priming_bundles
            ORDER BY id ASC
            """
        )
        priming_rows = cur.fetchall()

        cur.execute(
            """
            SELECT workflow_id, reprime_requests_json, studio_payload_json
            FROM tutor_polish_bundles
            ORDER BY id ASC
            """
        )
        polish_rows = cur.fetchall()

        cur.execute(
            """
            SELECT workflow_id, status, obsidian_results_json, anki_results_json, brain_index_payload_json, updated_at
            FROM tutor_publish_results
            ORDER BY updated_at DESC, id DESC
            """
        )
        publish_rows = cur.fetchall()
    finally:
        conn.close()

    totals = {
        "workflows": len(workflow_rows),
        "stored": 0,
        "active": 0,
        "exact_notes": 0,
        "editable_notes": 0,
        "feedback_liked": 0,
        "feedback_disliked": 0,
        "memory_capsules": len(capsule_rows),
        "publish_successes": 0,
        "publish_failures": 0,
        "source_linked_workflows": 0,
        "reprime_requests": 0,
        "studio_artifacts": 0,
    }
    stage_seconds: dict[str, int] = {
        "launch": 0,
        "priming": 0,
        "tutor": 0,
        "polish": 0,
        "final_sync": 0,
    }
    course_rollups: dict[str, dict[str, Any]] = {}
    workflow_seconds: dict[str, int] = {}
    method_counts: dict[str, int] = {}
    chain_counts: dict[str, int] = {}
    learner_snapshot = {
        "label": None,
        "confidence": None,
        "evidence": [],
        "source_workflow_id": None,
        "updated_at": None,
    }
    learner_snapshot_history: list[dict[str, Any]] = []

    for row in workflow_rows:
        status = str(row["status"] or "").strip().lower()
        workflow_id = str(row["workflow_id"])
        if status == "stored":
            totals["stored"] += 1
        elif status not in {"abandoned", "error"}:
            totals["active"] += 1
        course_key = f"{row['course_id'] or 'none'}::{row['course_name'] or 'Unassigned'}"
        if course_key not in course_rollups:
            course_rollups[course_key] = {
                "course_id": row["course_id"],
                "course_name": row["course_name"] or "Unassigned",
                "workflow_count": 0,
                "stored_count": 0,
                "total_stage_seconds": 0,
            }
        course_rollups[course_key]["workflow_count"] += 1
        if status == "stored":
            course_rollups[course_key]["stored_count"] += 1
        workflow_seconds[workflow_id] = 0

    for row in stage_rows:
        stage = _normalize_stage(row["stage"], default="tutor")
        seconds_active = int(row["seconds_active"] or 0)
        stage_seconds[stage] = stage_seconds.get(stage, 0) + seconds_active
        workflow_id = str(row["workflow_id"])
        workflow_seconds[workflow_id] = workflow_seconds.get(workflow_id, 0) + seconds_active

    workflow_to_course_key = {
        str(row["workflow_id"]): f"{row['course_id'] or 'none'}::{row['course_name'] or 'Unassigned'}"
        for row in workflow_rows
    }
    for workflow_id, total_seconds in workflow_seconds.items():
        course_key = workflow_to_course_key.get(workflow_id)
        if course_key and course_key in course_rollups:
            course_rollups[course_key]["total_stage_seconds"] += total_seconds

    for row in note_rows:
        note_mode = str(row["note_mode"] or "").strip().lower()
        if note_mode == "exact":
            totals["exact_notes"] += 1
        elif note_mode == "editable":
            totals["editable_notes"] += 1

    for row in feedback_rows:
        sentiment = str(row["sentiment"] or "").strip().lower()
        if sentiment == "liked":
            totals["feedback_liked"] += 1
        elif sentiment == "disliked":
            totals["feedback_disliked"] += 1

    for row in priming_rows:
        method = _normalize_text(row["priming_method"])
        chain_id = _normalize_text(row["priming_chain_id"])
        if method:
            method_counts[method] = method_counts.get(method, 0) + 1
        if chain_id:
            chain_counts[chain_id] = chain_counts.get(chain_id, 0) + 1
        source_inventory = _json_loads(row["source_inventory_json"], [])
        if isinstance(source_inventory, list) and any(
            isinstance(item, dict) and isinstance(item.get("priming_output"), dict)
            for item in source_inventory
        ):
            totals["source_linked_workflows"] += 1

    for row in polish_rows:
        reprime_requests = _json_loads(row["reprime_requests_json"], [])
        studio_payload = _json_loads(row["studio_payload_json"], {})
        if isinstance(reprime_requests, list):
            totals["reprime_requests"] += len(reprime_requests)
        artifacts = studio_payload.get("artifacts") if isinstance(studio_payload, dict) else []
        if isinstance(artifacts, list):
            totals["studio_artifacts"] += len(
                [item for item in artifacts if isinstance(item, dict) or isinstance(item, str)]
            )

    for row in publish_rows:
        obsidian_results = _json_loads(row["obsidian_results_json"], [])
        anki_results = _json_loads(row["anki_results_json"], [])
        for result in [*obsidian_results, *anki_results]:
            if not isinstance(result, dict):
                continue
            success = result.get("success")
            status = str(result.get("status") or "").strip().lower()
            if success is True or status in {"success", "completed", "stored", "ok", "synced"}:
                totals["publish_successes"] += 1
            elif success is False or status in {"failed", "error", "partial_failure"}:
                totals["publish_failures"] += 1

        payload = _json_loads(row["brain_index_payload_json"], {})
        snapshot = payload.get("learner_archetype_snapshot")
        if isinstance(snapshot, dict):
            evidence_value = snapshot.get("evidence")
            evidence = []
            if isinstance(evidence_value, list):
                evidence = [str(item) for item in evidence_value]
            normalized_snapshot = {
                "label": _normalize_text(snapshot.get("label")),
                "confidence": _normalize_text(snapshot.get("confidence")),
                "evidence": evidence,
                "source_workflow_id": row["workflow_id"],
                "updated_at": row["updated_at"],
            }
            learner_snapshot_history.append(normalized_snapshot)
            if learner_snapshot["label"] is None:
                learner_snapshot = normalized_snapshot

    top_courses = sorted(
        course_rollups.values(),
        key=lambda item: (int(item["total_stage_seconds"]), int(item["workflow_count"])),
        reverse=True,
    )[:5]
    priming_methods = [
        {"label": label, "count": count}
        for label, count in sorted(method_counts.items(), key=lambda item: item[1], reverse=True)
    ]
    priming_chains = [
        {"label": label, "count": count}
        for label, count in sorted(chain_counts.items(), key=lambda item: item[1], reverse=True)
    ]

    return jsonify(
        {
            "totals": totals,
            "stage_seconds": stage_seconds,
            "top_courses": top_courses,
            "methods": {
                "priming_methods": priming_methods,
                "priming_chains": priming_chains,
            },
            "learner_snapshot": learner_snapshot,
            "learner_snapshot_history": learner_snapshot_history[:5],
        }
    )

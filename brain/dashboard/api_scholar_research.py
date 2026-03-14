from __future__ import annotations

from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from db_setup import get_connection
from product_ops import DEFAULT_WORKSPACE_ID, log_product_event
from scholar_research import (
    get_investigation,
    list_findings,
    list_investigations,
    list_questions,
    start_investigation_run,
    submit_question_answer,
)

scholar_research_bp = Blueprint("scholar_research_api", __name__, url_prefix="/api")


@scholar_research_bp.route("/scholar/investigations", methods=["GET"])
def get_scholar_investigations():
    limit = request.args.get("limit", default=20, type=int)
    return jsonify(list_investigations(limit=limit or 20))


@scholar_research_bp.route("/scholar/investigations", methods=["POST"])
def post_scholar_investigation():
    payload = request.get_json(silent=True) or {}
    title = str(payload.get("title") or payload.get("query_text") or "").strip()
    query_text = str(payload.get("query_text") or "").strip()
    rationale = str(payload.get("rationale") or "").strip()
    audience_type = str(payload.get("audience_type") or "learner").strip() or "learner"
    mode = str(payload.get("mode") or "brain").strip() or "brain"
    requested_by = str(payload.get("requested_by") or "ui").strip() or "ui"

    if not query_text:
        return jsonify({"error": "query_text is required"}), 400
    if not rationale:
        return jsonify({"error": "rationale is required"}), 400

    try:
        result = start_investigation_run(
            title=title,
            query_text=query_text,
            rationale=rationale,
            audience_type=audience_type,
            mode=mode,
            requested_by=requested_by,
        )
        conn = get_connection()
        try:
            log_product_event(
                conn,
                event_type="scholar_investigation_created",
                source=requested_by,
                metadata={
                    "investigationId": result.get("investigation_id"),
                    "audienceType": audience_type,
                    "mode": mode,
                },
                workspace_id=DEFAULT_WORKSPACE_ID,
            )
        finally:
            conn.close()
        return jsonify(result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@scholar_research_bp.route("/scholar/investigations/<string:investigation_id>", methods=["GET"])
def get_scholar_investigation_detail(investigation_id: str):
    result = get_investigation(investigation_id)
    if not result:
        return jsonify({"error": "Investigation not found"}), 404
    return jsonify(result)


@scholar_research_bp.route("/scholar/research/questions", methods=["GET"])
def get_scholar_research_questions():
    status = request.args.get("status", default="all", type=str)
    limit = request.args.get("limit", default=100, type=int)
    return jsonify(list_questions(status=status, limit=limit or 100))


@scholar_research_bp.route(
    "/scholar/research/questions/<string:question_id>/answer", methods=["POST"]
)
def answer_scholar_research_question(question_id: str):
    payload = request.get_json(silent=True) or {}
    answer = str(payload.get("answer") or "").strip()
    source = str(payload.get("source") or "ui").strip() or "ui"
    if not answer:
        return jsonify({"error": "answer is required"}), 400
    try:
        result = submit_question_answer(question_id, answer, source=source)
        conn = get_connection()
        try:
            log_product_event(
                conn,
                event_type="scholar_question_answered",
                source=source,
                metadata={"questionId": question_id},
                workspace_id=DEFAULT_WORKSPACE_ID,
            )
        finally:
            conn.close()
        return jsonify(result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except LookupError as exc:
        return jsonify({"error": str(exc)}), 404
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@scholar_research_bp.route("/scholar/research/findings", methods=["GET"])
def get_scholar_research_findings():
    investigation_id = request.args.get("investigation_id", default=None, type=str)
    limit = request.args.get("limit", default=50, type=int)
    return jsonify(list_findings(investigation_id=investigation_id, limit=limit or 50))


@scholar_research_bp.route("/scholar/export", methods=["GET"])
def export_scholar_research():
    conn = get_connection()
    try:
        payload = {
            "exportedAt": datetime.now(timezone.utc).isoformat(),
            "investigations": list_investigations(limit=200),
            "questions": list_questions(status="all", limit=400),
            "findings": list_findings(limit=400),
        }
        log_product_event(
            conn,
            event_type="scholar_exported",
            source="scholar.export",
            metadata={
                "investigationCount": len(payload["investigations"]),
                "questionCount": len(payload["questions"]),
                "findingCount": len(payload["findings"]),
            },
            workspace_id=DEFAULT_WORKSPACE_ID,
        )
        return jsonify(payload)
    finally:
        conn.close()

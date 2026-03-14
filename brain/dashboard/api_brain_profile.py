"""Brain learner-profile API endpoints."""

from __future__ import annotations

from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from db_setup import get_connection
from learner_profile import (
    DEFAULT_USER_ID,
    get_profile_claims,
    get_profile_history,
    get_profile_questions,
    get_profile_summary,
    submit_profile_feedback,
)
from product_ops import DEFAULT_WORKSPACE_ID, log_product_event

brain_profile_bp = Blueprint(
    "brain_profile",
    __name__,
    url_prefix="/api/brain/profile",
)


def _wants_force_refresh() -> bool:
    raw = str(request.args.get("force", "")).strip().lower()
    return raw in {"1", "true", "yes", "on"}


def _get_user_id_from_request() -> str:
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        return str(data.get("userId") or DEFAULT_USER_ID)
    return str(request.args.get("userId") or DEFAULT_USER_ID)


@brain_profile_bp.route("", methods=["GET"])
@brain_profile_bp.route("/", methods=["GET"])
def brain_profile_summary():
    conn = get_connection()
    try:
        return jsonify(
            get_profile_summary(
                conn,
                user_id=_get_user_id_from_request(),
                force_refresh=_wants_force_refresh(),
            )
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        conn.close()


@brain_profile_bp.route("/claims", methods=["GET"])
def brain_profile_claims():
    conn = get_connection()
    try:
        return jsonify(
            get_profile_claims(
                conn,
                user_id=_get_user_id_from_request(),
                force_refresh=_wants_force_refresh(),
            )
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        conn.close()


@brain_profile_bp.route("/questions", methods=["GET"])
def brain_profile_questions():
    conn = get_connection()
    try:
        return jsonify(
            get_profile_questions(
                conn,
                user_id=_get_user_id_from_request(),
                force_refresh=_wants_force_refresh(),
            )
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        conn.close()


@brain_profile_bp.route("/history", methods=["GET"])
def brain_profile_history():
    conn = get_connection()
    try:
        limit = request.args.get("limit", default=12, type=int) or 12
        return jsonify(
            get_profile_history(
                conn,
                user_id=_get_user_id_from_request(),
                limit=max(1, min(limit, 50)),
            )
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        conn.close()


@brain_profile_bp.route("/export", methods=["GET"])
def brain_profile_export():
    conn = get_connection()
    try:
        user_id = _get_user_id_from_request()
        summary = get_profile_summary(
            conn,
            user_id=user_id,
            force_refresh=_wants_force_refresh(),
        )
        claims = get_profile_claims(
            conn,
            user_id=user_id,
            force_refresh=False,
        )
        questions = get_profile_questions(
            conn,
            user_id=user_id,
            force_refresh=False,
        )
        history = get_profile_history(conn, user_id=user_id, limit=24)
        log_product_event(
            conn,
            event_type="brain_exported",
            source="brain.profile.export",
            metadata={"snapshotId": summary.get("snapshotId")},
            user_id=user_id,
            workspace_id=DEFAULT_WORKSPACE_ID,
        )
        return jsonify(
            {
                "exportedAt": datetime.now(timezone.utc).isoformat(),
                "userId": user_id,
                "summary": summary,
                "hybridArchetype": summary.get("hybridArchetype"),
                "profileSummary": summary.get("profileSummary"),
                "claimsOverview": summary.get("claimsOverview"),
                "reliabilityTiers": summary.get("reliabilityTiers") or [],
                "claims": claims.get("claims") or [],
                "questions": questions.get("questions") or [],
                "history": history.get("history") or [],
            }
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        conn.close()


@brain_profile_bp.route("/feedback", methods=["POST"])
def brain_profile_feedback():
    data = request.get_json(silent=True) or {}
    conn = get_connection()
    try:
        user_id = str(data.get("userId") or DEFAULT_USER_ID)
        result = submit_profile_feedback(
            conn,
            payload=data,
            user_id=user_id,
        )
        log_product_event(
            conn,
            event_type="brain_feedback_submitted",
            source=str(data.get("source") or "ui"),
            metadata={
                "responseType": data.get("responseType"),
                "questionId": data.get("questionId"),
                "claimKey": data.get("claimKey"),
            },
            user_id=user_id,
            workspace_id=DEFAULT_WORKSPACE_ID,
        )
        return jsonify(result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        conn.close()

"""Brain learner-profile API endpoints."""

from __future__ import annotations

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


@brain_profile_bp.route("/feedback", methods=["POST"])
def brain_profile_feedback():
    data = request.get_json(silent=True) or {}
    conn = get_connection()
    try:
        result = submit_profile_feedback(
            conn,
            payload=data,
            user_id=str(data.get("userId") or DEFAULT_USER_ID),
        )
        return jsonify(result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        conn.close()

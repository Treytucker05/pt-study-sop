from __future__ import annotations

from flask import Blueprint, jsonify, request

from db_setup import get_connection
from learner_profile import DEFAULT_USER_ID
from product_ops import (
    DEFAULT_WORKSPACE_ID,
    build_outcome_report,
    build_product_analytics,
    get_privacy_settings,
    list_feature_flags,
    log_product_event,
    reset_personalization,
    update_privacy_settings,
)

product_bp = Blueprint("product_api", __name__, url_prefix="/api/product")


def _get_user_id_from_request() -> str:
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        return str(data.get("userId") or DEFAULT_USER_ID)
    return str(request.args.get("userId") or DEFAULT_USER_ID)


def _get_workspace_id_from_request() -> str:
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        return str(data.get("workspaceId") or DEFAULT_WORKSPACE_ID)
    return str(request.args.get("workspaceId") or DEFAULT_WORKSPACE_ID)


@product_bp.route("/events", methods=["POST"])
def post_product_event():
    payload = request.get_json(silent=True) or {}
    event_type = str(payload.get("eventType") or "").strip()
    source = str(payload.get("source") or "ui").strip() or "ui"
    metadata = payload.get("metadata")
    if not event_type:
        return jsonify({"error": "eventType is required"}), 400

    conn = get_connection()
    try:
        event = log_product_event(
            conn,
            event_type=event_type,
            source=source,
            metadata=metadata if isinstance(metadata, dict) else {},
            user_id=_get_user_id_from_request(),
            workspace_id=_get_workspace_id_from_request(),
        )
        return jsonify(event)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        conn.close()


@product_bp.route("/analytics", methods=["GET"])
def get_product_analytics():
    conn = get_connection()
    try:
        return jsonify(
            build_product_analytics(
                conn,
                user_id=_get_user_id_from_request(),
                workspace_id=_get_workspace_id_from_request(),
            )
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        conn.close()


@product_bp.route("/outcome-report", methods=["GET"])
def get_product_outcome_report():
    conn = get_connection()
    try:
        report = build_outcome_report(
            conn,
            user_id=_get_user_id_from_request(),
            workspace_id=_get_workspace_id_from_request(),
        )
        log_product_event(
            conn,
            event_type="outcome_report_exported",
            source="product.outcome_report",
            metadata={"headline": report.get("headline")},
            user_id=_get_user_id_from_request(),
            workspace_id=_get_workspace_id_from_request(),
        )
        return jsonify(report)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        conn.close()


@product_bp.route("/privacy", methods=["GET"])
def get_product_privacy():
    conn = get_connection()
    try:
        return jsonify(
            get_privacy_settings(
                conn,
                user_id=_get_user_id_from_request(),
                workspace_id=_get_workspace_id_from_request(),
            )
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        conn.close()


@product_bp.route("/privacy", methods=["POST"])
def post_product_privacy():
    payload = request.get_json(silent=True) or {}
    conn = get_connection()
    try:
        return jsonify(
            update_privacy_settings(
                conn,
                payload,
                user_id=_get_user_id_from_request(),
                workspace_id=_get_workspace_id_from_request(),
            )
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        conn.close()


@product_bp.route("/privacy/reset-personalization", methods=["POST"])
def post_reset_product_personalization():
    conn = get_connection()
    try:
        return jsonify(
            reset_personalization(
                conn,
                user_id=_get_user_id_from_request(),
                workspace_id=_get_workspace_id_from_request(),
            )
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        conn.close()


@product_bp.route("/feature-flags", methods=["GET"])
def get_product_feature_flags():
    conn = get_connection()
    try:
        return jsonify(
            {
                "userId": _get_user_id_from_request(),
                "workspaceId": _get_workspace_id_from_request(),
                "flags": list_feature_flags(conn),
            }
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        conn.close()

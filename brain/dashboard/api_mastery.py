"""Mastery API Blueprint — endpoints for BKT mastery tracking.

Endpoints:
  GET  /api/mastery/<skill_id>          — Effective mastery + status + history
  GET  /api/mastery/dashboard           — All skills with mastery states
  POST /api/mastery/event               — Record practice event + BKT update
  GET  /api/mastery/<skill_id>/why-locked — Why a skill is locked (M6)
"""

from __future__ import annotations

import json
import logging
from typing import Any

from flask import Blueprint, jsonify, request

from db_setup import get_connection

mastery_bp = Blueprint("mastery", __name__, url_prefix="/api/mastery")
_LOG = logging.getLogger(__name__)

# Default BKT config — matches adaptive.schemas.MasteryConfig defaults
_DEFAULT_USER_ID = "default"


def _get_default_config():
    from adaptive.schemas import MasteryConfig
    return MasteryConfig()


@mastery_bp.route("/<skill_id>", methods=["GET"])
def get_mastery(skill_id: str):
    """Get effective mastery + status for a single skill."""
    from adaptive.bkt import get_effective_mastery, get_or_init_mastery
    from adaptive.curriculum import compute_status

    conn = get_connection()
    config = _get_default_config()
    user_id = request.args.get("user_id", _DEFAULT_USER_ID)

    try:
        effective = get_effective_mastery(conn, user_id, skill_id, config)
        status = compute_status(conn, user_id, skill_id, config)
        row = get_or_init_mastery(conn, user_id, skill_id, config)

        return jsonify({
            "skill_id": skill_id,
            "effective_mastery": round(effective, 4),
            "status": status,
            "p_mastery_latent": row["p_mastery_latent"],
            "last_practiced_at": row.get("last_practiced_at"),
        })
    finally:
        conn.close()


@mastery_bp.route("/dashboard", methods=["GET"])
def mastery_dashboard():
    """Get all skills with their mastery states."""
    from adaptive.bkt import get_effective_mastery
    from adaptive.curriculum import compute_status

    conn = get_connection()
    config = _get_default_config()
    user_id = request.args.get("user_id", _DEFAULT_USER_ID)

    try:
        cur = conn.execute("SELECT DISTINCT skill_id FROM skill_mastery WHERE user_id = ?", (user_id,))
        skill_ids = [r[0] for r in cur.fetchall()]

        # Also include curriculum nodes not yet practiced
        cur2 = conn.execute("SELECT skill_id, name FROM curriculum_nodes")
        curriculum = {r[0]: r[1] for r in cur2.fetchall()}
        all_ids = list(set(skill_ids) | set(curriculum.keys()))

        skills: list[dict[str, Any]] = []
        for sid in sorted(all_ids):
            effective = get_effective_mastery(conn, user_id, sid, config)
            status = compute_status(conn, user_id, sid, config)
            skills.append({
                "skill_id": sid,
                "name": curriculum.get(sid, sid),
                "effective_mastery": round(effective, 4),
                "status": status,
            })

        return jsonify({"skills": skills, "count": len(skills)})
    finally:
        conn.close()


@mastery_bp.route("/event", methods=["POST"])
def record_practice_event():
    """Record a practice event and update BKT."""
    from adaptive.bkt import bkt_update
    from adaptive.telemetry import emit_attempt

    data = request.get_json(silent=True) or {}
    skill_id = data.get("skill_id")
    correct = data.get("correct", False)
    user_id = data.get("user_id", _DEFAULT_USER_ID)
    session_id = data.get("session_id", "")

    if not skill_id:
        return jsonify({"error": "skill_id is required"}), 400

    conn = get_connection()
    config = _get_default_config()

    try:
        new_mastery = bkt_update(conn, user_id, skill_id, correct, config)
        event_id = emit_attempt(conn, user_id, skill_id, correct, session_id)

        return jsonify({
            "skill_id": skill_id,
            "correct": correct,
            "new_mastery": round(new_mastery, 4),
            "event_id": event_id,
        })
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# M6: Error Localization — "why-locked" endpoint
# ---------------------------------------------------------------------------

@mastery_bp.route("/<skill_id>/why-locked", methods=["GET"])
def why_locked(skill_id: str):
    """Explain why a skill is locked — missing prereqs, flagged edges, remediation path."""
    from adaptive.bkt import get_effective_mastery
    from adaptive.curriculum import compute_status, get_node

    conn = get_connection()
    config = _get_default_config()
    user_id = request.args.get("user_id", _DEFAULT_USER_ID)

    try:
        status = compute_status(conn, user_id, skill_id, config)
        node = get_node(conn, skill_id)

        if not node:
            return jsonify({
                "skill_id": skill_id,
                "status": "locked",
                "reason": "Skill not found in curriculum",
                "missing_prereqs": [],
                "flagged_prereqs": [],
                "recent_error_flags": [],
                "remediation_path": [],
            })

        prereqs = node.get("prereqs", [])
        missing: list[dict] = []
        flagged: list[dict] = []

        for prereq_id in prereqs:
            mastery = get_effective_mastery(conn, user_id, prereq_id, config)
            prereq_status = compute_status(conn, user_id, prereq_id, config)

            if mastery < config.unlock_threshold:
                missing.append({
                    "skill_id": prereq_id,
                    "effective_mastery": round(mastery, 4),
                    "status": prereq_status,
                    "needed": config.unlock_threshold,
                })

            # Check error flags on this prereq
            cur = conn.execute(
                """SELECT error_type, severity, evidence_ref, created_at
                   FROM error_flags
                   WHERE user_id = ? AND skill_id = ?
                   ORDER BY created_at DESC LIMIT 5""",
                (user_id, prereq_id),
            )
            flags = [dict(r) for r in cur.fetchall()]
            if flags:
                flagged.append({
                    "skill_id": prereq_id,
                    "flags": flags,
                })

        # Recent error flags on the skill itself
        cur2 = conn.execute(
            """SELECT error_type, severity, edge_id, evidence_ref, created_at
               FROM error_flags
               WHERE user_id = ? AND skill_id = ?
               ORDER BY created_at DESC LIMIT 10""",
            (user_id, skill_id),
        )
        recent_flags = [dict(r) for r in cur2.fetchall()]

        # Build remediation path: missing prereqs sorted by mastery (lowest first)
        remediation = sorted(missing, key=lambda m: m["effective_mastery"])

        return jsonify({
            "skill_id": skill_id,
            "status": status,
            "missing_prereqs": missing,
            "flagged_prereqs": flagged,
            "recent_error_flags": recent_flags,
            "remediation_path": [m["skill_id"] for m in remediation],
        })
    finally:
        conn.close()

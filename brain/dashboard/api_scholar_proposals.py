"""Scholar proposals API (SCHOLAR-002).

Closes the Scholar feedback loop's API half: structured proposals submitted
by Scholar's research/anomaly agents, listed in the UI, decided (approve or
reject) by the user. The actual apply-to-method_blocks step lives in
SCHOLAR-006 — this module's ``decide`` endpoint sets ``status`` and stamps
``reviewed_at`` but defers ``apply_status`` to the applier.

Endpoints:
- ``POST /api/scholar/proposals``
- ``GET /api/scholar/proposals?status=<pending|approved|rejected|all>``
- ``POST /api/scholar/proposals/<id>/decide``

Schema additions used here (added in db_setup.py via SCHOLAR-002 migration):
- proposal_kind, structured_changes, apply_status, applied_at, apply_error
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from flask import Blueprint, jsonify, request

from db_setup import get_connection

scholar_proposals_bp = Blueprint("scholar_proposals_api", __name__, url_prefix="/api")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _row_to_dict(row: Any) -> dict:
    """Convert a sqlite3.Row to a plain dict, parsing structured_changes JSON
    for callers' convenience.
    """
    if row is None:
        return {}
    d = dict(row)
    raw = d.get("structured_changes")
    if isinstance(raw, str) and raw:
        try:
            d["structured_changes"] = json.loads(raw)
        except json.JSONDecodeError:
            # Leave as-is; caller can still read the raw string.
            pass
    return d


# ────────────────────────────────────────────────────────────────────────
# POST /api/scholar/proposals
# ────────────────────────────────────────────────────────────────────────


@scholar_proposals_bp.route("/scholar/proposals", methods=["POST"])
def post_scholar_proposal():
    """Insert a new proposal. Required: ``proposal_type``, ``rationale``.
    Optional: ``proposal_kind`` (default ``structured``), ``target_table``,
    ``target_id``, ``field_changes`` (dict, serialized to JSON in
    ``structured_changes``), ``cluster_id``, ``title``.
    """
    payload = request.get_json(silent=True) or {}

    proposal_type = str(payload.get("proposal_type") or "").strip()
    rationale = str(payload.get("rationale") or "").strip()
    if not proposal_type:
        return jsonify({"error": "proposal_type is required"}), 400
    if not rationale:
        return jsonify({"error": "rationale is required"}), 400

    proposal_kind = str(payload.get("proposal_kind") or "structured").strip() or "structured"
    title = str(payload.get("title") or "").strip() or None
    cluster_id = payload.get("cluster_id")
    cluster_id = str(cluster_id).strip() if cluster_id else None

    structured_changes = None
    target_table = payload.get("target_table")
    target_id = payload.get("target_id")
    field_changes = payload.get("field_changes")
    if proposal_kind == "structured":
        # For structured proposals, require enough info to act on later.
        if not target_table or target_id is None or not isinstance(field_changes, dict):
            return (
                jsonify(
                    {
                        "error": (
                            "structured proposals require target_table, "
                            "target_id, and field_changes (object)"
                        )
                    }
                ),
                400,
            )
        structured_changes = json.dumps(
            {
                "target_table": str(target_table),
                "target_id": target_id,
                "field_changes": field_changes,
            }
        )

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO scholar_proposals
               (filename, filepath, title, proposal_type, status,
                created_at, content_hash, content, cluster_id,
                proposal_kind, structured_changes,
                apply_status, applied_at, apply_error)
               VALUES (?, ?, ?, ?, 'pending',
                       ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)""",
            (
                # filename/filepath are legacy markdown fields; null for
                # structured proposals, kept nullable for back-compat.
                None,
                None,
                title or proposal_type,
                proposal_type,
                _now_iso(),
                None,  # content_hash (legacy markdown)
                rationale,  # reuse the legacy `content` column for the
                # human-readable rationale text so existing tooling keeps
                # working
                cluster_id,
                proposal_kind,
                structured_changes,
            ),
        )
        new_id = cur.lastrowid
        conn.commit()
        return jsonify({"id": new_id, "status": "pending"}), 200
    finally:
        conn.close()


# ────────────────────────────────────────────────────────────────────────
# GET /api/scholar/proposals?status=...
# ────────────────────────────────────────────────────────────────────────


@scholar_proposals_bp.route("/scholar/proposals", methods=["GET"])
def list_scholar_proposals():
    status_filter = (request.args.get("status") or "pending").strip().lower()
    valid_filters = {"pending", "approved", "rejected", "all"}
    if status_filter not in valid_filters:
        return (
            jsonify(
                {"error": f"status must be one of {sorted(valid_filters)}"}
            ),
            400,
        )

    import sqlite3

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()
        if status_filter == "all":
            cur.execute(
                "SELECT * FROM scholar_proposals ORDER BY created_at DESC"
            )
        else:
            cur.execute(
                "SELECT * FROM scholar_proposals WHERE status = ? "
                "ORDER BY created_at DESC",
                (status_filter,),
            )
        rows = cur.fetchall()
        return jsonify([_row_to_dict(r) for r in rows]), 200
    finally:
        conn.close()


# ────────────────────────────────────────────────────────────────────────
# POST /api/scholar/proposals/<id>/decide
# ────────────────────────────────────────────────────────────────────────


@scholar_proposals_bp.route(
    "/scholar/proposals/<int:proposal_id>/decide", methods=["POST"]
)
def decide_scholar_proposal(proposal_id: int):
    """Approve or reject a pending proposal.

    SCHOLAR-002 stops at marking ``status`` and stamping ``reviewed_at``.
    SCHOLAR-006 will hook in here to call the applier on ``approve``.
    """
    payload = request.get_json(silent=True) or {}
    decision = str(payload.get("decision") or "").strip().lower()
    reviewer_notes = payload.get("reviewer_notes")
    reviewer_notes = (
        str(reviewer_notes).strip() if reviewer_notes else None
    )

    if decision not in {"approve", "reject"}:
        return (
            jsonify({"error": "decision must be 'approve' or 'reject'"}),
            400,
        )

    new_status = "approved" if decision == "approve" else "rejected"

    import sqlite3

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM scholar_proposals WHERE id = ?", (proposal_id,)
        )
        row = cur.fetchone()
        if row is None:
            return jsonify({"error": f"proposal {proposal_id} not found"}), 404
        if row["status"] != "pending":
            return (
                jsonify(
                    {
                        "error": (
                            f"proposal is already {row['status']}; "
                            "only pending proposals can be decided"
                        )
                    }
                ),
                409,
            )

        cur.execute(
            """UPDATE scholar_proposals
                  SET status = ?,
                      reviewed_at = ?,
                      reviewer_notes = ?
                WHERE id = ?""",
            (new_status, _now_iso(), reviewer_notes, proposal_id),
        )
        conn.commit()

        # SCHOLAR-006 hook point — when decision is approve and proposal
        # is structured, the applier should fire here. Wired in T6.

        cur.execute(
            "SELECT * FROM scholar_proposals WHERE id = ?", (proposal_id,)
        )
        updated = cur.fetchone()
        return jsonify(_row_to_dict(updated)), 200
    finally:
        conn.close()

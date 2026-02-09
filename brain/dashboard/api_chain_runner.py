"""Flask Blueprint for chain runner API endpoints.

POST /api/chain-run          — Start a chain run
GET  /api/chain-run/<id>     — Get run result
GET  /api/chain-run/history  — List past runs
"""

from __future__ import annotations

import json

from flask import Blueprint, jsonify, request

from db_setup import get_connection
from chain_runner import run_chain

chain_runner_bp = Blueprint("chain_runner", __name__, url_prefix="/api")


@chain_runner_bp.route("/chain-run", methods=["POST"])
def start_chain_run():
    """Execute a chain run synchronously."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    chain_id = data.get("chain_id")
    topic = data.get("topic")
    if not chain_id or not topic:
        return jsonify({"error": "chain_id and topic are required"}), 400

    course_id = data.get("course_id")
    source_doc_ids = data.get("source_doc_ids")
    options = data.get("options", {})

    try:
        result = run_chain(
            chain_id=chain_id,
            topic=topic,
            course_id=course_id,
            source_doc_ids=source_doc_ids,
            options=options,
        )
    except Exception as e:
        return jsonify({"error": f"Chain run failed: {str(e)}"}), 500

    status_code = 200 if result.get("status") == "completed" else 500
    return jsonify(result), status_code


@chain_runner_bp.route("/chain-run/<int:run_id>", methods=["GET"])
def get_chain_run(run_id: int):
    """Retrieve a chain run result by ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT cr.id, cr.chain_id, cr.session_id, cr.topic, cr.course_id,
                  cr.status, cr.current_step, cr.total_steps,
                  cr.run_state_json, cr.artifacts_json,
                  cr.started_at, cr.completed_at, cr.error_message,
                  mc.name as chain_name
           FROM chain_runs cr
           LEFT JOIN method_chains mc ON cr.chain_id = mc.id
           WHERE cr.id = ?""",
        (run_id,),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Run not found"}), 404

    return jsonify(_row_to_dict(row, cursor.description))


@chain_runner_bp.route("/chain-run/history", methods=["GET"])
def get_chain_run_history():
    """List past chain runs with summary info."""
    limit = request.args.get("limit", 50, type=int)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT cr.id, cr.chain_id, cr.topic, cr.status,
                  cr.current_step, cr.total_steps,
                  cr.started_at, cr.completed_at,
                  mc.name as chain_name
           FROM chain_runs cr
           LEFT JOIN method_chains mc ON cr.chain_id = mc.id
           ORDER BY cr.started_at DESC
           LIMIT ?""",
        (limit,),
    )
    rows = cursor.fetchall()
    cols = [d[0] for d in cursor.description]
    conn.close()

    result = []
    for row in rows:
        item = dict(zip(cols, row))
        result.append(item)

    return jsonify(result)


def _row_to_dict(row, description) -> dict:
    """Convert a sqlite3 row to dict, parsing JSON fields."""
    cols = [d[0] for d in description]
    d = dict(zip(cols, row))
    for key in ("run_state_json", "artifacts_json"):
        if d.get(key):
            try:
                d[key] = json.loads(d[key])
            except (json.JSONDecodeError, TypeError):
                pass
    return d

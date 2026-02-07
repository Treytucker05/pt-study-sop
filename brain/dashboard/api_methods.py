"""
API Blueprint for the Composable Method Library.

Endpoints:
  GET/POST           /api/methods           — list / create method blocks
  GET/PUT/DELETE      /api/methods/<id>      — single block CRUD
  GET/POST           /api/chains            — list / create chains
  GET/PUT/DELETE      /api/chains/<id>       — single chain CRUD
  POST               /api/methods/<id>/rate  — rate a method block
  POST               /api/chains/<id>/rate   — rate a chain
  GET                /api/methods/analytics  — method effectiveness analytics
"""

from flask import Blueprint, jsonify, request
import json
from db_setup import get_connection

methods_bp = Blueprint("methods", __name__, url_prefix="/api")


# ---------------------------------------------------------------------------
# Method Blocks
# ---------------------------------------------------------------------------

@methods_bp.route("/methods", methods=["GET"])
def list_methods():
    """List all method blocks. Optional ?category= filter."""
    conn = get_connection()
    cursor = conn.cursor()
    category = request.args.get("category")
    if category:
        cursor.execute(
            "SELECT * FROM method_blocks WHERE category = ? ORDER BY category, name",
            (category,),
        )
    else:
        cursor.execute("SELECT * FROM method_blocks ORDER BY category, name")
    columns = [desc[0] for desc in cursor.description]
    rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
    conn.close()
    # Parse JSON fields
    for row in rows:
        row["tags"] = _parse_json(row.get("tags"))
    return jsonify(rows)


@methods_bp.route("/methods/<int:method_id>", methods=["GET"])
def get_method(method_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM method_blocks WHERE id = ?", (method_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Method not found"}), 404
    columns = [desc[0] for desc in cursor.description]
    result = dict(zip(columns, row))
    result["tags"] = _parse_json(result.get("tags"))
    return jsonify(result)


@methods_bp.route("/methods", methods=["POST"])
def create_method():
    data = request.get_json()
    if not data or not data.get("name") or not data.get("category"):
        return jsonify({"error": "name and category are required"}), 400

    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO method_blocks (name, category, description, default_duration_min, energy_cost, best_stage, tags, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                data["name"],
                data["category"],
                data.get("description"),
                data.get("default_duration_min", 5),
                data.get("energy_cost", "medium"),
                data.get("best_stage"),
                json.dumps(data.get("tags", [])),
            ),
        )
        new_id = cursor.lastrowid
        conn.commit()
        return jsonify({"id": new_id, "name": data["name"]}), 201
    finally:
        conn.close()


@methods_bp.route("/methods/<int:method_id>", methods=["PUT"])
def update_method(method_id: int):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Build dynamic SET clause
    fields = []
    values = []
    for key in ("name", "category", "description", "default_duration_min", "energy_cost", "best_stage"):
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])
    if "tags" in data:
        fields.append("tags = ?")
        values.append(json.dumps(data["tags"]))

    if not fields:
        return jsonify({"error": "No valid fields to update"}), 400

    conn = get_connection()
    try:
        cursor = conn.cursor()
        values.append(method_id)
        cursor.execute(
            f"UPDATE method_blocks SET {', '.join(fields)} WHERE id = ?",
            values,
        )
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Method not found"}), 404
        return jsonify({"id": method_id, "updated": True})
    finally:
        conn.close()


@methods_bp.route("/methods/<int:method_id>", methods=["DELETE"])
def delete_method(method_id: int):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM method_blocks WHERE id = ?", (method_id,))
        conn.commit()
        deleted = cursor.rowcount > 0
        if not deleted:
            return jsonify({"error": "Method not found"}), 404
        return "", 204
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Method Chains
# ---------------------------------------------------------------------------

@methods_bp.route("/chains", methods=["GET"])
def list_chains():
    """List all chains. Optional ?template=1 filter."""
    conn = get_connection()
    cursor = conn.cursor()
    template = request.args.get("template")
    if template is not None:
        cursor.execute(
            "SELECT * FROM method_chains WHERE is_template = ? ORDER BY name",
            (int(template),),
        )
    else:
        cursor.execute("SELECT * FROM method_chains ORDER BY name")
    columns = [desc[0] for desc in cursor.description]
    rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
    conn.close()
    for row in rows:
        row["block_ids"] = _parse_json(row.get("block_ids"))
        row["context_tags"] = _parse_json(row.get("context_tags"))
    return jsonify(rows)


@methods_bp.route("/chains/<int:chain_id>", methods=["GET"])
def get_chain(chain_id: int):
    """Get single chain with expanded blocks."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM method_chains WHERE id = ?", (chain_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Chain not found"}), 404
    columns = [desc[0] for desc in cursor.description]
    result = dict(zip(columns, row))
    result["block_ids"] = _parse_json(result.get("block_ids"))
    result["context_tags"] = _parse_json(result.get("context_tags"))

    # Expand blocks
    block_ids = result["block_ids"] or []
    if block_ids:
        placeholders = ",".join("?" * len(block_ids))
        cursor.execute(
            f"SELECT * FROM method_blocks WHERE id IN ({placeholders})",
            block_ids,
        )
        block_cols = [desc[0] for desc in cursor.description]
        blocks_map = {}
        for b_row in cursor.fetchall():
            block = dict(zip(block_cols, b_row))
            block["tags"] = _parse_json(block.get("tags"))
            blocks_map[block["id"]] = block
        # Maintain order from block_ids
        result["blocks"] = [blocks_map[bid] for bid in block_ids if bid in blocks_map]
    else:
        result["blocks"] = []

    conn.close()
    return jsonify(result)


@methods_bp.route("/chains", methods=["POST"])
def create_chain():
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "name is required"}), 400

    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO method_chains (name, description, block_ids, context_tags, is_template, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                data["name"],
                data.get("description"),
                json.dumps(data.get("block_ids", [])),
                json.dumps(data.get("context_tags", {})),
                data.get("is_template", 0),
            ),
        )
        new_id = cursor.lastrowid
        conn.commit()
        return jsonify({"id": new_id, "name": data["name"]}), 201
    finally:
        conn.close()


@methods_bp.route("/chains/<int:chain_id>", methods=["PUT"])
def update_chain(chain_id: int):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    fields = []
    values = []
    for key in ("name", "description", "is_template"):
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])
    if "block_ids" in data:
        fields.append("block_ids = ?")
        values.append(json.dumps(data["block_ids"]))
    if "context_tags" in data:
        fields.append("context_tags = ?")
        values.append(json.dumps(data["context_tags"]))

    if not fields:
        return jsonify({"error": "No valid fields to update"}), 400

    conn = get_connection()
    try:
        cursor = conn.cursor()
        values.append(chain_id)
        cursor.execute(
            f"UPDATE method_chains SET {', '.join(fields)} WHERE id = ?",
            values,
        )
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Chain not found"}), 404
        return jsonify({"id": chain_id, "updated": True})
    finally:
        conn.close()


@methods_bp.route("/chains/<int:chain_id>", methods=["DELETE"])
def delete_chain(chain_id: int):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM method_chains WHERE id = ?", (chain_id,))
        conn.commit()
        deleted = cursor.rowcount > 0
        if not deleted:
            return jsonify({"error": "Chain not found"}), 404
        return "", 204
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Ratings
# ---------------------------------------------------------------------------

@methods_bp.route("/methods/<int:method_id>/rate", methods=["POST"])
def rate_method(method_id: int):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Validate rating bounds
    for field in ("effectiveness", "engagement"):
        val = data.get(field)
        if val is not None and (not isinstance(val, (int, float)) or val < 1 or val > 5):
            return jsonify({"error": f"{field} must be between 1 and 5"}), 400

    conn = get_connection()
    try:
        cursor = conn.cursor()

        # Verify method exists
        cursor.execute("SELECT id FROM method_blocks WHERE id = ?", (method_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Method not found"}), 404

        cursor.execute(
            """
            INSERT INTO method_ratings (method_block_id, session_id, effectiveness, engagement, notes, context, rated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                method_id,
                data.get("session_id"),
                data.get("effectiveness"),
                data.get("engagement"),
                data.get("notes"),
                json.dumps(data.get("context", {})),
            ),
        )
        conn.commit()
        new_id = cursor.lastrowid
        return jsonify({"id": new_id, "rated": True}), 201
    finally:
        conn.close()


@methods_bp.route("/chains/<int:chain_id>/rate", methods=["POST"])
def rate_chain(chain_id: int):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Validate rating bounds
    for field in ("effectiveness", "engagement"):
        val = data.get(field)
        if val is not None and (not isinstance(val, (int, float)) or val < 1 or val > 5):
            return jsonify({"error": f"{field} must be between 1 and 5"}), 400

    conn = get_connection()
    try:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM method_chains WHERE id = ?", (chain_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Chain not found"}), 404

        cursor.execute(
            """
            INSERT INTO method_ratings (chain_id, session_id, effectiveness, engagement, notes, context, rated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                chain_id,
                data.get("session_id"),
                data.get("effectiveness"),
                data.get("engagement"),
                data.get("notes"),
                json.dumps(data.get("context", {})),
            ),
        )
        conn.commit()
        new_id = cursor.lastrowid
        return jsonify({"id": new_id, "rated": True}), 201
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

@methods_bp.route("/methods/analytics", methods=["GET"])
def method_analytics():
    """Method effectiveness analytics: avg ratings, usage counts, best contexts."""
    conn = get_connection()
    cursor = conn.cursor()

    # Method block stats
    cursor.execute("""
        SELECT
            mb.id, mb.name, mb.category,
            COUNT(mr.id) as usage_count,
            ROUND(AVG(mr.effectiveness), 1) as avg_effectiveness,
            ROUND(AVG(mr.engagement), 1) as avg_engagement
        FROM method_blocks mb
        LEFT JOIN method_ratings mr ON mr.method_block_id = mb.id
        GROUP BY mb.id
        ORDER BY avg_effectiveness DESC NULLS LAST
    """)
    block_cols = [desc[0] for desc in cursor.description]
    block_stats = [dict(zip(block_cols, row)) for row in cursor.fetchall()]

    # Chain stats
    cursor.execute("""
        SELECT
            mc.id, mc.name, mc.is_template,
            COUNT(mr.id) as usage_count,
            ROUND(AVG(mr.effectiveness), 1) as avg_effectiveness,
            ROUND(AVG(mr.engagement), 1) as avg_engagement
        FROM method_chains mc
        LEFT JOIN method_ratings mr ON mr.chain_id = mc.id
        GROUP BY mc.id
        ORDER BY avg_effectiveness DESC NULLS LAST
    """)
    chain_cols = [desc[0] for desc in cursor.description]
    chain_stats = [dict(zip(chain_cols, row)) for row in cursor.fetchall()]

    # Recent ratings
    cursor.execute("""
        SELECT mr.*, mb.name as method_name, mc.name as chain_name
        FROM method_ratings mr
        LEFT JOIN method_blocks mb ON mr.method_block_id = mb.id
        LEFT JOIN method_chains mc ON mr.chain_id = mc.id
        ORDER BY mr.rated_at DESC
        LIMIT 20
    """)
    rating_cols = [desc[0] for desc in cursor.description]
    recent_ratings = [dict(zip(rating_cols, row)) for row in cursor.fetchall()]
    for r in recent_ratings:
        r["context"] = _parse_json(r.get("context"))

    conn.close()
    return jsonify({
        "block_stats": block_stats,
        "chain_stats": chain_stats,
        "recent_ratings": recent_ratings,
    })


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_json(value):
    """Safely parse a JSON string, returning the original value on failure."""
    if value is None:
        return None
    if isinstance(value, (list, dict)):
        return value
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return value

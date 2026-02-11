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
    for row in rows:
        for json_field in ("tags", "inputs", "outputs", "failure_modes", "variants", "scoring_hooks"):
            row[json_field] = _parse_json(row.get(json_field))
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
    for json_field in ("tags", "inputs", "outputs", "failure_modes", "variants", "scoring_hooks"):
        result[json_field] = _parse_json(result.get(json_field))
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
            INSERT INTO method_blocks (name, category, description, default_duration_min, energy_cost, best_stage, tags, evidence, inputs, outputs, strategy_label, failure_modes, variants, scoring_hooks, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                data["name"],
                data["category"],
                data.get("description"),
                data.get("default_duration_min", 5),
                data.get("energy_cost", "medium"),
                data.get("best_stage"),
                json.dumps(data.get("tags", [])),
                data.get("evidence"),
                json.dumps(data.get("inputs", [])),
                json.dumps(data.get("outputs", [])),
                data.get("strategy_label"),
                json.dumps(data.get("failure_modes", [])),
                json.dumps(data.get("variants", [])),
                json.dumps(data.get("scoring_hooks", [])),
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

    fields = []
    values = []
    for key in ("name", "category", "description", "default_duration_min", "energy_cost", "best_stage", "evidence", "strategy_label"):
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])
    for json_key in ("tags", "inputs", "outputs", "failure_modes", "variants", "scoring_hooks"):
        if json_key in data:
            fields.append(f"{json_key} = ?")
            values.append(json.dumps(data[json_key]))

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
    """Get single chain with expanded blocks and ruleset."""
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
        result["blocks"] = [blocks_map[bid] for bid in block_ids if bid in blocks_map]
    else:
        result["blocks"] = []

    ruleset_id = result.get("ruleset_id")
    if ruleset_id:
        cursor.execute("SELECT * FROM rulesets WHERE id = ?", (ruleset_id,))
        rs_row = cursor.fetchone()
        if rs_row:
            rs_cols = [desc[0] for desc in cursor.description]
            ruleset = dict(zip(rs_cols, rs_row))
            ruleset["rules_json"] = _parse_json(ruleset.get("rules_json"))
            result["ruleset"] = ruleset

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


@methods_bp.route("/chains/<int:chain_id>/run", methods=["POST"])
def run_chain_endpoint(chain_id: int):
    from chain_runner import run_chain
    
    data = request.get_json() or {}
    topic = data.get("topic")
    if not topic:
        return jsonify({"error": "topic is required"}), 400
    
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
        
        status_code = 200 if result["status"] == "completed" else 500
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"error": str(e), "status": "failed"}), 500


@methods_bp.route("/chain-runs", methods=["GET"])
def list_chain_runs():
    conn = get_connection()
    cursor = conn.cursor()
    
    limit = request.args.get("limit", 20, type=int)
    status = request.args.get("status")
    
    query = "SELECT cr.*, mc.name as chain_name FROM chain_runs cr LEFT JOIN method_chains mc ON cr.chain_id = mc.id WHERE 1=1"
    params = []
    
    if status:
        query += " AND cr.status = ?"
        params.append(status)
    
    query += " ORDER BY cr.started_at DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    columns = [desc[0] for desc in cursor.description]
    rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
    conn.close()
    
    for row in rows:
        row["artifacts_json"] = _parse_json(row.get("artifacts_json"))
        row["run_state_json"] = _parse_json(row.get("run_state_json"))
    
    return jsonify(rows)


@methods_bp.route("/chain-runs/<int:run_id>", methods=["GET"])
def get_chain_run(run_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT cr.*, mc.name as chain_name FROM chain_runs cr LEFT JOIN method_chains mc ON cr.chain_id = mc.id WHERE cr.id = ?",
        (run_id,),
    )
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return jsonify({"error": "Chain run not found"}), 404
    
    columns = [desc[0] for desc in cursor.description]
    result = dict(zip(columns, row))
    result["artifacts_json"] = _parse_json(result.get("artifacts_json"))
    result["run_state_json"] = _parse_json(result.get("run_state_json"))
    
    return jsonify(result)


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
# RuleSets (V2 architecture - tutor behavior constraints)
# ---------------------------------------------------------------------------

@methods_bp.route("/rulesets", methods=["GET"])
def list_rulesets():
    conn = get_connection()
    cursor = conn.cursor()
    scope = request.args.get("scope")
    active_only = request.args.get("active", "1") == "1"
    
    query = "SELECT * FROM rulesets WHERE 1=1"
    params = []
    if scope:
        query += " AND scope = ?"
        params.append(scope)
    if active_only:
        query += " AND is_active = 1"
    query += " ORDER BY name"
    
    cursor.execute(query, params)
    columns = [desc[0] for desc in cursor.description]
    rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
    conn.close()
    for row in rows:
        row["rules_json"] = _parse_json(row.get("rules_json"))
    return jsonify(rows)


@methods_bp.route("/rulesets/<int:ruleset_id>", methods=["GET"])
def get_ruleset(ruleset_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rulesets WHERE id = ?", (ruleset_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "RuleSet not found"}), 404
    columns = [desc[0] for desc in cursor.description]
    result = dict(zip(columns, row))
    result["rules_json"] = _parse_json(result.get("rules_json"))
    return jsonify(result)


@methods_bp.route("/rulesets", methods=["POST"])
def create_ruleset():
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "name is required"}), 400

    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO rulesets (name, description, scope, rules_json, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                data["name"],
                data.get("description"),
                data.get("scope", "chain"),
                json.dumps(data.get("rules_json", [])),
                1 if data.get("is_active", True) else 0,
            ),
        )
        new_id = cursor.lastrowid
        conn.commit()
        return jsonify({"id": new_id, "name": data["name"]}), 201
    finally:
        conn.close()


@methods_bp.route("/rulesets/<int:ruleset_id>", methods=["PUT"])
def update_ruleset(ruleset_id: int):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    fields = []
    values = []
    for key in ("name", "description", "scope", "is_active"):
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key] if key != "is_active" else (1 if data[key] else 0))
    if "rules_json" in data:
        fields.append("rules_json = ?")
        values.append(json.dumps(data["rules_json"]))
    
    fields.append("updated_at = datetime('now')")

    if len(fields) == 1:
        return jsonify({"error": "No valid fields to update"}), 400

    conn = get_connection()
    try:
        cursor = conn.cursor()
        values.append(ruleset_id)
        cursor.execute(
            f"UPDATE rulesets SET {', '.join(fields)} WHERE id = ?",
            values,
        )
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "RuleSet not found"}), 404
        return jsonify({"id": ruleset_id, "updated": True})
    finally:
        conn.close()


@methods_bp.route("/rulesets/<int:ruleset_id>", methods=["DELETE"])
def delete_ruleset(ruleset_id: int):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM rulesets WHERE id = ?", (ruleset_id,))
        conn.commit()
        deleted = cursor.rowcount > 0
        if not deleted:
            return jsonify({"error": "RuleSet not found"}), 404
        return "", 204
    finally:
        conn.close()


@methods_bp.route("/chains/<int:chain_id>/attach-ruleset", methods=["POST"])
def attach_ruleset_to_chain(chain_id: int):
    data = request.get_json()
    ruleset_id = data.get("ruleset_id") if data else None
    
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE method_chains SET ruleset_id = ? WHERE id = ?",
            (ruleset_id, chain_id),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Chain not found"}), 404
        return jsonify({"chain_id": chain_id, "ruleset_id": ruleset_id})
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# User Scoring Weights (multi-objective chain ranking)
# ---------------------------------------------------------------------------

DEFAULT_WEIGHTS = {
    "learning_gain_weight": 0.20,
    "time_cost_weight": 0.15,
    "error_rate_weight": 0.15,
    "hint_dependence_weight": 0.10,
    "confidence_calibration_weight": 0.15,
    "cognitive_strain_weight": 0.10,
    "artifact_quality_weight": 0.15,
}


@methods_bp.route("/scoring/weights/<user_id>", methods=["GET"])
def get_user_weights(user_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_scoring_weights WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return jsonify({"user_id": user_id, **DEFAULT_WEIGHTS, "is_default": True})
    columns = [desc[0] for desc in cursor.description]
    result = dict(zip(columns, row))
    result["is_default"] = False
    return jsonify(result)


@methods_bp.route("/scoring/weights/<user_id>", methods=["PUT"])
def update_user_weights(user_id: str):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    weight_keys = list(DEFAULT_WEIGHTS.keys())
    weights = {k: data.get(k, DEFAULT_WEIGHTS[k]) for k in weight_keys}
    
    total = sum(weights.values())
    if abs(total - 1.0) > 0.01:
        return jsonify({"error": f"Weights must sum to 1.0, got {total:.2f}"}), 400

    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM user_scoring_weights WHERE user_id = ?", (user_id,))
        exists = cursor.fetchone()
        
        if exists:
            set_clause = ", ".join(f"{k} = ?" for k in weight_keys)
            cursor.execute(
                f"UPDATE user_scoring_weights SET {set_clause}, updated_at = datetime('now') WHERE user_id = ?",
                (*weights.values(), user_id),
            )
        else:
            cols = ", ".join(["user_id"] + weight_keys)
            placeholders = ", ".join(["?"] * (len(weight_keys) + 1))
            cursor.execute(
                f"INSERT INTO user_scoring_weights ({cols}, created_at) VALUES ({placeholders}, datetime('now'))",
                (user_id, *weights.values()),
            )
        
        conn.commit()
        return jsonify({"user_id": user_id, **weights, "updated": True})
    finally:
        conn.close()


@methods_bp.route("/scoring/compute", methods=["POST"])
def compute_composite_score():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    user_id = data.get("user_id", "default")
    hooks = data.get("hooks", {})
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_scoring_weights WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        columns = [desc[0] for desc in cursor.description]
        weights_row = dict(zip(columns, row))
        weights = {k: weights_row.get(k, v) for k, v in DEFAULT_WEIGHTS.items()}
    else:
        weights = DEFAULT_WEIGHTS
    
    hook_mapping = {
        "learning_gain": "learning_gain_weight",
        "time_cost": "time_cost_weight",
        "error_rate": "error_rate_weight",
        "hint_dependence": "hint_dependence_weight",
        "confidence_calibration": "confidence_calibration_weight",
        "cognitive_strain": "cognitive_strain_weight",
        "artifact_quality": "artifact_quality_weight",
    }
    
    composite = 0.0
    breakdown = {}
    for hook_name, weight_key in hook_mapping.items():
        hook_value = hooks.get(hook_name, 0.0)
        weight = weights[weight_key]
        contribution = hook_value * weight
        composite += contribution
        breakdown[hook_name] = {"value": hook_value, "weight": weight, "contribution": contribution}
    
    return jsonify({
        "composite_score": round(composite, 4),
        "breakdown": breakdown,
        "weights_source": "custom" if row else "default",
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

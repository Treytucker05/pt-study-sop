"""
Tutor accuracy feedback loop endpoint.

Provides per-topic retrieval quality aggregation from the
``tutor_accuracy_log`` table so the frontend can display how
well the retrieval pipeline is performing for each topic.
"""

from __future__ import annotations

import sqlite3

from flask import jsonify, request

from db_setup import get_connection


def _register_accuracy_routes(tutor_bp):
    """Register accuracy routes on the shared tutor blueprint."""

    @tutor_bp.route("/accuracy-profile", methods=["GET"])
    def accuracy_profile():
        """Aggregate per-topic retrieval quality from tutor_accuracy_log.

        Query params:
            session_id  (optional) — filter to a single session
            limit       (optional) — max topics returned (default 50)

        Returns JSON:
            { "topics": [ { topic, turns, high, medium, low,
                            avg_sources, avg_chunks } ] }
        """
        filter_session = request.args.get("session_id")
        limit = min(int(request.args.get("limit", 50)), 200)

        conn = get_connection()
        conn.row_factory = sqlite3.Row

        where_parts = ["topic IS NOT NULL AND topic != ''"]
        params: list = []
        if filter_session:
            where_parts.append("session_id = ?")
            params.append(filter_session)

        where_sql = " AND ".join(where_parts)

        cur = conn.cursor()
        cur.execute(
            f"""SELECT
                    topic,
                    COUNT(*) AS turns,
                    SUM(CASE WHEN retrieval_confidence = 'high' THEN 1 ELSE 0 END) AS high,
                    SUM(CASE WHEN retrieval_confidence = 'medium' THEN 1 ELSE 0 END) AS medium,
                    SUM(CASE WHEN retrieval_confidence = 'low' THEN 1 ELSE 0 END) AS low,
                    ROUND(AVG(source_count), 1) AS avg_sources,
                    ROUND(AVG(chunk_count), 1) AS avg_chunks
                FROM tutor_accuracy_log
                WHERE {where_sql}
                GROUP BY topic
                ORDER BY turns DESC
                LIMIT ?""",
            (*params, limit),
        )
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()

        return jsonify({"topics": rows})


# Auto-register when imported from api_tutor.py
def _init(tutor_bp):
    _register_accuracy_routes(tutor_bp)

"""Generic database table viewer/editor API."""

import sqlite3
from flask import Blueprint, jsonify, request
from config import DB_PATH

data_bp = Blueprint("data", __name__)


def _get_tables() -> list[str]:
    """Return all user table names from the database."""
    conn = sqlite3.connect(DB_PATH, timeout=30)
    try:
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).fetchall()
        return [r[0] for r in rows]
    finally:
        conn.close()


def _validate_table(name: str) -> str | None:
    """Return the table name if it exists, else None."""
    tables = _get_tables()
    if name in tables:
        return name
    return None


@data_bp.route("/api/data/tables", methods=["GET"])
def list_tables():
    return jsonify(_get_tables())


@data_bp.route("/api/data/tables/<name>", methods=["GET"])
def table_schema(name: str):
    if not _validate_table(name):
        return jsonify({"error": f"Table '{name}' not found"}), 404
    conn = sqlite3.connect(DB_PATH, timeout=30)
    try:
        cols = conn.execute(f"PRAGMA table_info([{name}])").fetchall()
        schema = [
            {"cid": c[0], "name": c[1], "type": c[2], "notnull": c[3], "default": c[4], "pk": c[5]}
            for c in cols
        ]
        count = conn.execute(f"SELECT COUNT(*) FROM [{name}]").fetchone()[0]
        return jsonify({"table": name, "columns": schema, "row_count": count})
    finally:
        conn.close()


@data_bp.route("/api/data/tables/<name>/rows", methods=["GET"])
def table_rows(name: str):
    if not _validate_table(name):
        return jsonify({"error": f"Table '{name}' not found"}), 404

    limit = min(int(request.args.get("limit", 100)), 500)
    offset = int(request.args.get("offset", 0))

    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    try:
        # Find the PK column name — SQLite aliases rowid to INTEGER PRIMARY KEY
        # columns, so SELECT rowid,* may not produce a 'rowid' key in the dict.
        pk_col = None
        for c in conn.execute(f"PRAGMA table_info([{name}])").fetchall():
            if c[5]:  # pk flag
                pk_col = c[1]
                break

        rows = conn.execute(
            f"SELECT rowid, * FROM [{name}] LIMIT ? OFFSET ?", (limit, offset)
        ).fetchall()
        data = []
        for r in rows:
            d = dict(r)
            if "rowid" not in d and pk_col and pk_col in d:
                d["rowid"] = d[pk_col]
            data.append(d)
        count = conn.execute(f"SELECT COUNT(*) FROM [{name}]").fetchone()[0]
        return jsonify({"rows": data, "total": count, "limit": limit, "offset": offset})
    finally:
        conn.close()


@data_bp.route("/api/data/tables/<name>/rows/<int:row_id>", methods=["PATCH"])
def update_row(name: str, row_id: int):
    if not _validate_table(name):
        return jsonify({"error": f"Table '{name}' not found"}), 404

    updates = request.get_json()
    if not updates:
        return jsonify({"error": "No update data provided"}), 400

    # Get valid column names to prevent injection via field names
    conn = sqlite3.connect(DB_PATH, timeout=30)
    try:
        cols = conn.execute(f"PRAGMA table_info([{name}])").fetchall()
        valid_cols = {c[1] for c in cols}

        set_clauses = []
        values = []
        for col, val in updates.items():
            if col == "rowid":
                continue
            if col not in valid_cols:
                return jsonify({"error": f"Invalid column: {col}"}), 400
            set_clauses.append(f"[{col}] = ?")
            values.append(val)

        if not set_clauses:
            return jsonify({"error": "No valid columns to update"}), 400

        values.append(row_id)
        sql = f"UPDATE [{name}] SET {', '.join(set_clauses)} WHERE rowid = ?"
        conn.execute(sql, values)
        conn.commit()

        return jsonify({"updated": True, "rowid": row_id})
    finally:
        conn.close()


@data_bp.route("/api/data/tables/<name>/rows/<int:row_id>", methods=["DELETE"])
def delete_row(name: str, row_id: int):
    if not _validate_table(name):
        return jsonify({"error": f"Table '{name}' not found"}), 404

    conn = sqlite3.connect(DB_PATH, timeout=30)
    try:
        cursor = conn.execute(f"DELETE FROM [{name}] WHERE rowid = ?", (row_id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Row not found"}), 404
        return jsonify({"deleted": True, "rowid": row_id})
    finally:
        conn.close()


@data_bp.route("/api/data/tables/<name>/rows/bulk-delete", methods=["POST"])
def bulk_delete_rows(name: str):
    if not _validate_table(name):
        return jsonify({"error": f"Table '{name}' not found"}), 404

    body = request.get_json()
    ids = body.get("ids", []) if body else []
    if not ids:
        return jsonify({"error": "No IDs provided"}), 400

    conn = sqlite3.connect(DB_PATH, timeout=30)
    try:
        placeholders = ",".join("?" for _ in ids)
        cursor = conn.execute(
            f"DELETE FROM [{name}] WHERE rowid IN ({placeholders})", ids
        )
        conn.commit()
        return jsonify({"deleted": cursor.rowcount})
    finally:
        conn.close()

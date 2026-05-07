"""Apply approved Scholar proposals to the Methods catalog (SCHOLAR-006).

The decide endpoint (``api_scholar_proposals.py``) calls ``apply`` after
flipping a pending proposal to ``approved``. This module owns the rules
for what's editable and writes the change to ``method_blocks``.

Apply outcomes are recorded back on the proposal row:
- ``apply_status='applied'`` + ``applied_at=now`` on success
- ``apply_status='failed'`` + ``apply_error=<text>`` on any rejection;
  the proposal stays at ``status='approved'`` so the audit trail is
  preserved (only the apply step failed)

v1 limitations (documented in the SCHOLAR-006 PRD):
- Only ``proposal_kind == 'structured'`` proposals apply automatically.
  Markdown proposals are skipped (apply_status stays NULL).
- Only ``target_table == 'method_blocks'`` is supported. Other targets
  fail with ``unsupported target_table``.
- Forbidden columns: ``id``, ``created_at``, ``method_id``, ``category``.
  ``category`` is excluded for now to avoid silent control-stage drift;
  re-categorization can ship in v2 with a dedicated proposal type.
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from typing import Any

FORBIDDEN_FIELDS: frozenset[str] = frozenset(
    {"id", "created_at", "method_id", "category"}
)
SUPPORTED_TARGET_TABLES: frozenset[str] = frozenset({"method_blocks"})


class ApplyError(Exception):
    """Raised when a proposal cannot be applied; the message is stored
    verbatim in ``scholar_proposals.apply_error``.
    """


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _mark_applied(
    conn: sqlite3.Connection, proposal_id: int
) -> None:
    cur = conn.cursor()
    cur.execute(
        """UPDATE scholar_proposals
              SET apply_status = 'applied',
                  applied_at = ?,
                  apply_error = NULL
            WHERE id = ?""",
        (_now_iso(), proposal_id),
    )
    conn.commit()


def _mark_failed(
    conn: sqlite3.Connection, proposal_id: int, error: str
) -> None:
    cur = conn.cursor()
    cur.execute(
        """UPDATE scholar_proposals
              SET apply_status = 'failed',
                  apply_error = ?
            WHERE id = ?""",
        (error, proposal_id),
    )
    conn.commit()


def _parse_structured_changes(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw:
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ApplyError(f"structured_changes JSON malformed: {exc}") from exc
        if not isinstance(parsed, dict):
            raise ApplyError("structured_changes must decode to an object")
        return parsed
    raise ApplyError("structured_changes is empty or unreadable")


def _validate_columns_exist(
    conn: sqlite3.Connection, table: str, fields: list[str]
) -> None:
    cur = conn.cursor()
    cur.execute(f"PRAGMA table_info({table})")
    existing = {row[1] for row in cur.fetchall()}
    missing = [f for f in fields if f not in existing]
    if missing:
        raise ApplyError(
            f"unknown columns on {table}: {', '.join(missing)}"
        )


def _target_row_exists(
    conn: sqlite3.Connection, table: str, target_id: Any
) -> bool:
    cur = conn.cursor()
    cur.execute(f"SELECT 1 FROM {table} WHERE id = ?", (target_id,))
    return cur.fetchone() is not None


def apply(
    proposal_row: dict[str, Any],
    *,
    conn: sqlite3.Connection,
) -> dict[str, Any]:
    """Apply a (just-approved) proposal. Returns a summary dict.

    The caller is responsible for the connection. Errors are logged on
    the proposal row via ``apply_status='failed'``; this function does
    not re-raise — it always returns a summary so the decide endpoint
    can return a structured response.
    """
    proposal_id = int(proposal_row["id"])
    kind = proposal_row.get("proposal_kind")

    summary: dict[str, Any] = {
        "proposal_id": proposal_id,
        "applied": False,
        "skipped": False,
        "error": None,
    }

    # Markdown / unstructured proposals are out of scope for v1 — leave
    # apply_status NULL and signal "skipped" so the caller can render
    # informational UI.
    if kind != "structured":
        summary["skipped"] = True
        summary["error"] = f"proposal_kind={kind!r} not auto-applied in v1"
        return summary

    try:
        changes = _parse_structured_changes(
            proposal_row.get("structured_changes")
        )
        target_table = str(changes.get("target_table") or "")
        target_id = changes.get("target_id")
        field_changes = changes.get("field_changes")

        if target_table not in SUPPORTED_TARGET_TABLES:
            raise ApplyError(
                f"unsupported target_table {target_table!r}; "
                f"v1 supports {sorted(SUPPORTED_TARGET_TABLES)}"
            )
        if target_id is None:
            raise ApplyError("target_id missing")
        if not isinstance(field_changes, dict) or not field_changes:
            raise ApplyError(
                "field_changes must be a non-empty object"
            )

        forbidden = sorted(set(field_changes) & FORBIDDEN_FIELDS)
        if forbidden:
            raise ApplyError(
                f"forbidden fields in field_changes: {forbidden}"
            )

        _validate_columns_exist(
            conn, target_table, list(field_changes.keys())
        )

        if not _target_row_exists(conn, target_table, target_id):
            raise ApplyError(
                f"{target_table} row id={target_id} does not exist"
            )

        # Build the UPDATE statement. JSON-encode dict/list values so
        # they round-trip cleanly into TEXT columns the methods catalog
        # uses for structured fields.
        set_clauses: list[str] = []
        values: list[Any] = []
        for col, val in field_changes.items():
            set_clauses.append(f"{col} = ?")
            if isinstance(val, (dict, list)):
                values.append(json.dumps(val))
            else:
                values.append(val)
        values.append(target_id)

        cur = conn.cursor()
        cur.execute(
            f"UPDATE {target_table} SET {', '.join(set_clauses)} "
            f"WHERE id = ?",
            values,
        )
        conn.commit()
        if cur.rowcount == 0:
            raise ApplyError(
                f"{target_table} row id={target_id} update affected 0 rows"
            )

        _mark_applied(conn, proposal_id)
        summary["applied"] = True
        return summary
    except ApplyError as exc:
        _mark_failed(conn, proposal_id, str(exc))
        summary["error"] = str(exc)
        return summary
    except sqlite3.Error as exc:
        message = f"sqlite error: {exc}"
        _mark_failed(conn, proposal_id, message)
        summary["error"] = message
        return summary


__all__ = [
    "FORBIDDEN_FIELDS",
    "SUPPORTED_TARGET_TABLES",
    "ApplyError",
    "apply",
]

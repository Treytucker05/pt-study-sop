"""Scholar anomaly scanner — auto-trigger after Tutor session-end (SCHOLAR-003).

Wraps ``scholar.brain_reader.get_method_anomalies`` with:
- Per-user throttle (default: max once per 6 hours)
- Toggle via env var ``SCHOLAR_AUTO_SCAN_ENABLED`` (default ``1``)
- Filtering: ``never_rated`` and ``underused`` are dropped from proposal
  generation per the SCHOLAR-003 PRD; only ``low_performers`` and
  ``high_variance`` produce proposals
- Direct DB writes to ``scholar_proposals`` (mirrors the schema used by
  ``brain/dashboard/api_scholar_proposals.py`` POST endpoint) — no HTTP
  hop so a Flask process restarting mid-scan can't strand a queue

Exposes a single public entry point:

    >>> from scholar.anomaly_runner import run_scan
    >>> run_scan(session_id="abc", user_id="default")
    {"started_at": "...", "skip_reason": None, "anomalies_found": 3,
     "proposals_created": 2, "scan_log_id": 42}

When called from a Tutor session-end daemon thread, wrap with try/except
so a runner failure never propagates back to the request response.
"""

from __future__ import annotations

import json
import os
import sqlite3
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

# Make ``scholar.brain_reader`` and ``brain/config`` resolvable regardless
# of how the caller's sys.path is set up.
_REPO_ROOT = Path(__file__).resolve().parent.parent
_BRAIN_DIR = _REPO_ROOT / "brain"
for _path in (str(_REPO_ROOT), str(_BRAIN_DIR)):
    if _path not in sys.path:
        sys.path.insert(0, _path)

from scholar.brain_reader import get_method_anomalies  # noqa: E402

DEFAULT_USER_ID = "default"
DEFAULT_THROTTLE_HOURS = 6
ENV_ENABLED = "SCHOLAR_AUTO_SCAN_ENABLED"
ENV_THROTTLE_HOURS = "SCHOLAR_AUTO_SCAN_MIN_INTERVAL_HOURS"

# Categories that flow into proposals. Per Challenge audit, ``never_rated``
# and ``underused`` are dropped — they would flood the queue with noise.
ACTIONABLE_CATEGORIES: tuple[str, ...] = ("low_performers", "high_variance")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat(timespec="seconds")


def _is_enabled() -> bool:
    return os.environ.get(ENV_ENABLED, "1").strip().lower() not in {
        "0",
        "false",
        "no",
        "off",
    }


def _throttle_hours() -> float:
    try:
        return float(os.environ.get(ENV_THROTTLE_HOURS, DEFAULT_THROTTLE_HOURS))
    except (TypeError, ValueError):
        return float(DEFAULT_THROTTLE_HOURS)


def _last_scan_started_at(
    conn: sqlite3.Connection, user_id: str
) -> datetime | None:
    cur = conn.cursor()
    cur.execute(
        """SELECT started_at FROM scholar_scan_log
            WHERE user_id = ? AND skip_reason IS NULL
         ORDER BY started_at DESC LIMIT 1""",
        (user_id,),
    )
    row = cur.fetchone()
    if not row or not row[0]:
        return None
    try:
        return datetime.fromisoformat(row[0])
    except ValueError:
        return None


def _log_scan_start(
    conn: sqlite3.Connection,
    *,
    user_id: str,
    session_id: str | None,
    skip_reason: str | None = None,
) -> int:
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO scholar_scan_log
              (user_id, session_id, started_at, skip_reason)
           VALUES (?, ?, ?, ?)""",
        (user_id, session_id, _now_iso(), skip_reason),
    )
    conn.commit()
    return int(cur.lastrowid or 0)


def _log_scan_finish(
    conn: sqlite3.Connection,
    *,
    scan_log_id: int,
    anomalies_found: int,
    proposals_created: int,
    error_text: str | None = None,
) -> None:
    cur = conn.cursor()
    cur.execute(
        """UPDATE scholar_scan_log
              SET finished_at = ?,
                  anomalies_found = ?,
                  proposals_created = ?,
                  error_text = ?
            WHERE id = ?""",
        (
            _now_iso(),
            anomalies_found,
            proposals_created,
            error_text,
            scan_log_id,
        ),
    )
    conn.commit()


def _filter_actionable(
    anomalies: dict[str, list[dict[str, Any]]],
) -> list[tuple[str, dict[str, Any]]]:
    """Flatten the anomalies dict into ``[(category, item), ...]`` keeping
    only actionable categories. ``never_rated`` and ``underused`` are
    dropped — they don't carry a "this is broken" signal.
    """
    out: list[tuple[str, dict[str, Any]]] = []
    for category in ACTIONABLE_CATEGORIES:
        for item in anomalies.get(category, []) or []:
            out.append((category, item))
    return out


def _proposal_for_anomaly(
    category: str, item: dict[str, Any]
) -> dict[str, Any] | None:
    """Translate one anomaly into a proposal payload. Returns ``None`` if
    the item shape can't drive a structured change (e.g., chain-level
    anomaly — chain edits are out of scope for v1).
    """
    if item.get("type") not in (None, "block"):
        # Only block-level anomalies become structured proposals in v1.
        # Chain-level findings can ship in v2 once chain shape edits are
        # in scope.
        return None
    target_id = item.get("id")
    if not isinstance(target_id, int):
        return None

    name = item.get("name") or f"method_block_{target_id}"
    rationale = (
        f"Auto-detected by Scholar anomaly scanner: category={category}. "
        f"Method '{name}' (id {target_id}) flagged for review. "
        "Refine the facilitation_prompt in the next research run."
    )
    return {
        "proposal_type": "method_block_edit",
        "proposal_kind": "structured",
        "title": f"Auto: review {name}",
        "rationale": rationale,
        "target_table": "method_blocks",
        "target_id": target_id,
        "field_changes": {
            # Placeholder — Scholar v1.1 will populate with an LLM-suggested
            # rewrite. For now flag it so a human reviews.
            "facilitation_prompt": (
                "<auto-flagged for review; Scholar v1.1 will fill in "
                "a suggested rewrite>"
            )
        },
    }


def _insert_proposal(
    conn: sqlite3.Connection,
    *,
    payload: dict[str, Any],
    cluster_id: str,
) -> int:
    """Insert a proposal row (mirrors the column shape used by the API's
    POST endpoint). Returns new row id.

    Note: ``scholar_proposals.filename`` is ``NOT NULL UNIQUE`` and
    ``filepath`` is ``NOT NULL`` (legacy markdown-shaped). Structured
    proposals don't have a real file; we synthesize a unique sentinel
    name so the constraints stay satisfied without changing the schema.
    """
    cur = conn.cursor()
    structured_changes = json.dumps(
        {
            "target_table": payload["target_table"],
            "target_id": payload["target_id"],
            "field_changes": payload["field_changes"],
        }
    )
    synth_filename = f"structured-{uuid.uuid4().hex}.json"
    synth_filepath = f"(structured)/{synth_filename}"
    cur.execute(
        """INSERT INTO scholar_proposals
           (filename, filepath, title, proposal_type, status,
            created_at, content_hash, content, cluster_id,
            proposal_kind, structured_changes,
            apply_status, applied_at, apply_error)
           VALUES (?, ?, ?, ?, 'pending',
                   ?, NULL, ?, ?, ?, ?, NULL, NULL, NULL)""",
        (
            synth_filename,
            synth_filepath,
            payload["title"],
            payload["proposal_type"],
            _now_iso(),
            payload["rationale"],  # reuse legacy `content` for rationale
            cluster_id,
            payload["proposal_kind"],
            structured_changes,
        ),
    )
    conn.commit()
    return int(cur.lastrowid or 0)


def run_scan(
    *,
    session_id: str | None = None,
    user_id: str = DEFAULT_USER_ID,
    conn: sqlite3.Connection | None = None,
) -> dict[str, Any]:
    """Run one scan. Throttle and toggle gates are checked before any
    work. Returns a summary dict suitable for logging/inspection.
    """
    own_conn = conn is None
    if conn is None:
        from db_setup import get_connection  # noqa: PLC0415

        conn = get_connection()

    summary: dict[str, Any] = {
        "started_at": _now_iso(),
        "skip_reason": None,
        "anomalies_found": 0,
        "proposals_created": 0,
        "scan_log_id": 0,
    }

    try:
        # Toggle gate
        if not _is_enabled():
            summary["skip_reason"] = "disabled"
            summary["scan_log_id"] = _log_scan_start(
                conn,
                user_id=user_id,
                session_id=session_id,
                skip_reason="disabled",
            )
            return summary

        # Throttle gate
        last_started = _last_scan_started_at(conn, user_id)
        if last_started is not None:
            min_interval = timedelta(hours=_throttle_hours())
            if _now() - last_started < min_interval:
                summary["skip_reason"] = "throttled"
                summary["scan_log_id"] = _log_scan_start(
                    conn,
                    user_id=user_id,
                    session_id=session_id,
                    skip_reason="throttled",
                )
                return summary

        # Real scan begins.
        scan_log_id = _log_scan_start(
            conn, user_id=user_id, session_id=session_id
        )
        summary["scan_log_id"] = scan_log_id

        anomalies = get_method_anomalies()
        if not anomalies:
            _log_scan_finish(
                conn,
                scan_log_id=scan_log_id,
                anomalies_found=0,
                proposals_created=0,
            )
            return summary

        actionable = _filter_actionable(anomalies)
        summary["anomalies_found"] = len(actionable)

        if not actionable:
            _log_scan_finish(
                conn,
                scan_log_id=scan_log_id,
                anomalies_found=0,
                proposals_created=0,
            )
            return summary

        cluster_id = f"scan_{scan_log_id}_{uuid.uuid4().hex[:8]}"
        created = 0
        for category, item in actionable:
            payload = _proposal_for_anomaly(category, item)
            if payload is None:
                continue
            try:
                _insert_proposal(conn, payload=payload, cluster_id=cluster_id)
                created += 1
            except sqlite3.Error:
                # Skip the bad row; don't kill the whole scan.
                continue

        summary["proposals_created"] = created
        _log_scan_finish(
            conn,
            scan_log_id=scan_log_id,
            anomalies_found=len(actionable),
            proposals_created=created,
        )
        return summary
    finally:
        if own_conn:
            conn.close()


__all__ = [
    "ACTIONABLE_CATEGORIES",
    "ENV_ENABLED",
    "ENV_THROTTLE_HOURS",
    "run_scan",
]

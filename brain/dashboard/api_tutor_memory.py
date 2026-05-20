"""
Tutor memory: teach legs, working summaries, compaction, polish drafts (#163–#166).
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from typing import Any, Optional

from flask import jsonify, request

from db_setup import get_connection

from dashboard.api_tutor import tutor_bp  # noqa: E402
from dashboard.api_tutor_utils import _ensure_selector_columns

_MEMORY_SCHEMA_ENSURED = False
RECENCY_TAIL_K = 8


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_tutor_memory_schema(conn: sqlite3.Connection) -> None:
    global _MEMORY_SCHEMA_ENSURED
    _ensure_selector_columns(conn)
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(tutor_sessions)")
    ts_cols = {row[1] for row in cur.fetchall()}
    if "workflow_id" not in ts_cols:
        cur.execute("ALTER TABLE tutor_sessions ADD COLUMN workflow_id TEXT")

    cur.execute(
        """CREATE TABLE IF NOT EXISTS tutor_working_summaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tutor_session_id TEXT NOT NULL,
            version INTEGER NOT NULL,
            summary_text TEXT NOT NULL,
            trigger_source TEXT NOT NULL DEFAULT 'manual',
            created_at TEXT NOT NULL,
            UNIQUE (tutor_session_id, version)
        )"""
    )
    cur.execute(
        """CREATE INDEX IF NOT EXISTS idx_tutor_working_summaries_session
           ON tutor_working_summaries (tutor_session_id, version DESC)"""
    )
    cur.execute(
        """CREATE TABLE IF NOT EXISTS tutor_polish_drafts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id TEXT NOT NULL,
            tutor_session_id TEXT,
            teach_leg_label TEXT,
            kind TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft',
            content_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"""
    )
    cur.execute(
        """CREATE INDEX IF NOT EXISTS idx_tutor_polish_drafts_workflow
           ON tutor_polish_drafts (workflow_id, kind, status)"""
    )
    conn.commit()
    _MEMORY_SCHEMA_ENSURED = True


def _session_content_filter(session: dict) -> dict:
    from dashboard.api_tutor_turns import _parse_content_filter_json

    return _parse_content_filter_json(
        session.get("content_filter_json"),
        session_id=session.get("session_id"),
    )


def _teach_leg_label(session: dict) -> str:
    content_filter = _session_content_filter(session)
    return (
        str(content_filter.get("teach_leg_label") or "").strip()
        or str(session.get("topic") or "").strip()
        or "Teach leg"
    )


def _list_teach_legs(conn: sqlite3.Connection, workflow_id: str) -> list[dict[str, Any]]:
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        """SELECT session_id, topic, status, turn_count, started_at, ended_at, content_filter_json
           FROM tutor_sessions
           WHERE workflow_id = ?
           ORDER BY started_at ASC, session_id ASC""",
        (workflow_id,),
    )
    legs: list[dict[str, Any]] = []
    for row in cur.fetchall():
        session = dict(row)
        content_filter = _session_content_filter(session)
        if content_filter.get("session_kind") != "tutor":
            continue
        legs.append(
            {
                "session_id": session["session_id"],
                "teach_leg_label": _teach_leg_label(session),
                "topic": session.get("topic"),
                "status": session.get("status"),
                "turn_count": int(session.get("turn_count") or 0),
                "started_at": session.get("started_at"),
                "ended_at": session.get("ended_at"),
                "is_active": False,
            }
        )
    cur.execute(
        "SELECT active_tutor_session_id FROM tutor_workflows WHERE workflow_id = ?",
        (workflow_id,),
    )
    active_row = cur.fetchone()
    active_id = active_row["active_tutor_session_id"] if active_row else None
    if active_id:
        for leg in legs:
            if leg["session_id"] == active_id:
                leg["is_active"] = True
                leg["status"] = "active"
    return legs


def _get_session_turns_filtered(
    conn: sqlite3.Connection,
    session_id: str,
    *,
    mode: str | None = None,
    limit: int | None = None,
) -> list[dict[str, Any]]:
    from dashboard.api_tutor_turns import _get_tutor_session

    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    sql = """SELECT id, turn_number, question, answer, interaction_mode, created_at
             FROM tutor_turns
             WHERE tutor_session_id = ?"""
    params: list[Any] = [session_id]
    if mode in ("general", "tutor"):
        sql += " AND COALESCE(interaction_mode, 'tutor') = ?"
        params.append(mode)
    sql += " ORDER BY turn_number ASC"
    if limit is not None:
        sql += " LIMIT ?"
        params.append(limit)
    cur.execute(sql, params)
    return [dict(row) for row in cur.fetchall()]


def _latest_working_summary(conn: sqlite3.Connection, session_id: str) -> dict[str, Any] | None:
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        """SELECT id, tutor_session_id, version, summary_text, trigger_source, created_at
           FROM tutor_working_summaries
           WHERE tutor_session_id = ?
           ORDER BY version DESC
           LIMIT 1""",
        (session_id,),
    )
    row = cur.fetchone()
    return dict(row) if row else None


def _generate_working_summary_text(tutor_turns: list[dict[str, Any]]) -> str:
    """Build working summary from tutor-tagged turns (LLM when available)."""
    if not tutor_turns:
        return "No tutor-tagged turns to summarize yet."

    lines: list[str] = []
    for turn in tutor_turns[-12:]:
        question = str(turn.get("question") or "").strip()
        answer = str(turn.get("answer") or "").strip()
        if question:
            lines.append(f"Q: {question}")
        if answer:
            lines.append(f"A: {answer[:1200]}")
    transcript = "\n".join(lines).strip()
    if not transcript:
        return "Teach leg summary (empty transcript)."

    try:
        import llm_provider

        system_prompt = (
            "Summarize this tutor teach-leg transcript for continuing instruction. "
            "Preserve objectives, misconceptions, and next steps. Under 800 words."
        )
        result = llm_provider.chat_completion(
            system_prompt=system_prompt,
            user_prompt=transcript,
            model_hint="fast",
        )
        text = str(result or "").strip()
        if text:
            return text
    except Exception:
        pass

    return transcript[:4000]


def compact_tutor_session(
    conn: sqlite3.Connection,
    session_id: str,
    *,
    trigger_source: str = "manual",
) -> dict[str, Any]:
    from dashboard.api_tutor_turns import _get_tutor_session

    session = _get_tutor_session(conn, session_id)
    if not session:
        raise ValueError("Session not found")

    tutor_turns = _get_session_turns_filtered(conn, session_id, mode="tutor")
    all_turn_count = len(_get_session_turns_filtered(conn, session_id))
    summary_text = _generate_working_summary_text(tutor_turns)

    cur = conn.cursor()
    cur.execute(
        "SELECT COALESCE(MAX(version), 0) FROM tutor_working_summaries WHERE tutor_session_id = ?",
        (session_id,),
    )
    next_version = int(cur.fetchone()[0] or 0) + 1
    created_at = _now_iso()
    cur.execute(
        """INSERT INTO tutor_working_summaries
           (tutor_session_id, version, summary_text, trigger_source, created_at)
           VALUES (?, ?, ?, ?, ?)""",
        (session_id, next_version, summary_text, trigger_source, created_at),
    )
    summary_row = {
        "id": cur.lastrowid,
        "tutor_session_id": session_id,
        "version": next_version,
        "summary_text": summary_text,
        "trigger_source": trigger_source,
        "created_at": created_at,
    }

    workflow_id = session.get("workflow_id")
    draft = None
    if workflow_id:
        draft = _upsert_polish_draft(
            conn,
            workflow_id=str(workflow_id),
            tutor_session_id=session_id,
            teach_leg_label=_teach_leg_label(session),
            kind="checkpoint",
            markdown=summary_text,
        )

    conn.commit()
    return {
        "working_summary": summary_row,
        "tutor_turn_count": len(tutor_turns),
        "transcript_turn_count": all_turn_count,
        "polish_draft": draft,
    }


def _upsert_polish_draft(
    conn: sqlite3.Connection,
    *,
    workflow_id: str,
    tutor_session_id: str | None,
    teach_leg_label: str,
    kind: str,
    markdown: str,
) -> dict[str, Any]:
    now = _now_iso()
    content_json = json.dumps({"markdown": markdown}, ensure_ascii=False)
    cur = conn.cursor()
    cur.execute(
        """SELECT id FROM tutor_polish_drafts
           WHERE workflow_id = ? AND tutor_session_id IS ? AND kind = ? AND status = 'draft'
           ORDER BY id DESC LIMIT 1""",
        (workflow_id, tutor_session_id, kind),
    )
    existing = cur.fetchone()
    if existing:
        draft_id = int(existing[0])
        cur.execute(
            """UPDATE tutor_polish_drafts
               SET content_json = ?, teach_leg_label = ?, updated_at = ?
               WHERE id = ?""",
            (content_json, teach_leg_label, now, draft_id),
        )
    else:
        cur.execute(
            """INSERT INTO tutor_polish_drafts
               (workflow_id, tutor_session_id, teach_leg_label, kind, status, content_json, created_at, updated_at)
               VALUES (?, ?, ?, ?, 'draft', ?, ?, ?)""",
            (
                workflow_id,
                tutor_session_id,
                teach_leg_label,
                kind,
                content_json,
                now,
                now,
            ),
        )
        draft_id = int(cur.lastrowid)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT * FROM tutor_polish_drafts WHERE id = ?", (draft_id,)
    ).fetchone()
    return _serialize_polish_draft_row(row)


def _serialize_polish_draft_row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row)
    try:
        data["content"] = json.loads(data.pop("content_json") or "{}")
    except (TypeError, json.JSONDecodeError):
        data["content"] = {}
    return data


def _list_polish_drafts(conn: sqlite3.Connection, workflow_id: str) -> list[dict[str, Any]]:
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        """SELECT * FROM tutor_polish_drafts
           WHERE workflow_id = ?
           ORDER BY updated_at DESC, id DESC""",
        (workflow_id,),
    )
    return [_serialize_polish_draft_row(row) for row in cur.fetchall()]


def approve_polish_draft(conn: sqlite3.Connection, workflow_id: str, draft_id: int) -> dict[str, Any]:
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM tutor_polish_drafts WHERE id = ? AND workflow_id = ?",
        (draft_id, workflow_id),
    )
    row = cur.fetchone()
    if not row:
        raise ValueError("Draft not found")
    draft = _serialize_polish_draft_row(row)
    markdown = str((draft.get("content") or {}).get("markdown") or "").strip()
    label = str(draft.get("teach_leg_label") or "Teach leg").strip()
    note_title = f"{label} — {draft.get('kind', 'digest').title()}"

    now = _now_iso()
    cur.execute(
        """INSERT INTO tutor_captured_notes
           (workflow_id, tutor_session_id, stage, note_mode, title, content, status, created_at, updated_at)
           VALUES (?, ?, 'tutor', 'editable', ?, ?, 'approved', ?, ?)""",
        (
            workflow_id,
            draft.get("tutor_session_id"),
            note_title,
            markdown,
            now,
            now,
        ),
    )
    cur.execute(
        "UPDATE tutor_polish_drafts SET status = 'approved', updated_at = ? WHERE id = ?",
        (_now_iso(), draft_id),
    )
    conn.commit()
    return {"draft_id": draft_id, "status": "approved", "note_id": cur.lastrowid}


def build_prompt_turn_history(
    conn: sqlite3.Connection,
    session_id: str,
    *,
    tail_k: int = RECENCY_TAIL_K,
) -> tuple[list[dict[str, str]], dict[str, Any] | None]:
    """Return (history_messages, working_summary_meta) for send_turn."""
    summary = _latest_working_summary(conn, session_id)
    if not summary:
        from dashboard.api_tutor_turns import _get_session_turns

        turns = _get_session_turns(conn, session_id, limit=20)
        history = []
        for turn in turns:
            if turn.get("question"):
                history.append({"role": "user", "content": turn["question"]})
            if turn.get("answer"):
                history.append({"role": "assistant", "content": turn["answer"]})
        return history, None

    tail_turns = _get_session_turns_filtered(conn, session_id, mode="tutor", limit=None)
    if len(tail_turns) > tail_k:
        tail_turns = tail_turns[-tail_k:]

    history = [
        {
            "role": "system",
            "content": (
                "Working summary for this teach leg (older turns are summarized):\n"
                f"{summary['summary_text']}"
            ),
        }
    ]
    for turn in tail_turns:
        if turn.get("question"):
            history.append({"role": "user", "content": str(turn["question"])})
        if turn.get("answer"):
            history.append({"role": "assistant", "content": str(turn["answer"])})
    return history, summary


@tutor_bp.route("/workflows/<workflow_id>/teach-legs", methods=["GET"])
def list_workflow_teach_legs(workflow_id: str):
    conn = get_connection()
    try:
        _ensure_tutor_memory_schema(conn)
        legs = _list_teach_legs(conn, workflow_id)
    finally:
        conn.close()
    return jsonify({"workflow_id": workflow_id, "teach_legs": legs, "count": len(legs)})


@tutor_bp.route("/session/<session_id>/compact", methods=["POST"])
def compact_session(session_id: str):
    from dashboard.api_tutor_turns import _get_tutor_session

    payload = request.get_json(silent=True) or {}
    trigger = str(payload.get("trigger_source") or "manual").strip() or "manual"
    conn = get_connection()
    try:
        _ensure_tutor_memory_schema(conn)
        session = _get_tutor_session(conn, session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404
        result = compact_tutor_session(conn, session_id, trigger_source=trigger)
    except ValueError as exc:
        conn.close()
        return jsonify({"error": str(exc)}), 404
    finally:
        conn.close()
    return jsonify({"session_id": session_id, **result})


@tutor_bp.route("/workflows/<workflow_id>/polish-drafts", methods=["GET"])
def list_workflow_polish_drafts(workflow_id: str):
    conn = get_connection()
    try:
        _ensure_tutor_memory_schema(conn)
        drafts = _list_polish_drafts(conn, workflow_id)
    finally:
        conn.close()
    return jsonify({"workflow_id": workflow_id, "drafts": drafts, "count": len(drafts)})


@tutor_bp.route("/workflows/<workflow_id>/polish-drafts/<int:draft_id>/approve", methods=["POST"])
def approve_workflow_polish_draft(workflow_id: str, draft_id: int):
    conn = get_connection()
    try:
        _ensure_tutor_memory_schema(conn)
        result = approve_polish_draft(conn, workflow_id, draft_id)
    except ValueError as exc:
        conn.close()
        return jsonify({"error": str(exc)}), 404
    finally:
        conn.close()
    return jsonify(result)


def on_teach_session_end(
    conn: sqlite3.Connection,
    session_id: str,
    *,
    workflow_id: str | None,
) -> None:
    """Create final polish draft when a teach leg ends."""
    from dashboard.api_tutor_turns import _get_tutor_session

    _ensure_tutor_memory_schema(conn)
    session = _get_tutor_session(conn, session_id)
    if not session:
        return
    resolved_workflow = workflow_id or session.get("workflow_id")
    if not resolved_workflow:
        return
    content_filter = _session_content_filter(session)
    if content_filter.get("session_kind") != "tutor":
        return
    summary = _latest_working_summary(conn, session_id)
    markdown = (
        summary["summary_text"]
        if summary
        else _generate_working_summary_text(
            _get_session_turns_filtered(conn, session_id, mode="tutor")
        )
    )
    _upsert_polish_draft(
        conn,
        workflow_id=str(resolved_workflow),
        tutor_session_id=session_id,
        teach_leg_label=_teach_leg_label(session),
        kind="final",
        markdown=markdown,
    )
    conn.commit()

"""
Tutor API Blueprint — Flask endpoints for the Adaptive Tutor system.

Endpoints:
  POST   /api/tutor/session              — Create tutor session
  GET    /api/tutor/session/<id>          — Get session with history
  POST   /api/tutor/session/<id>/turn     — Send message, SSE stream response
  POST   /api/tutor/session/<id>/end      — End session, create Brain record
  POST   /api/tutor/session/<id>/artifact — Create note/card/map mid-session
  GET    /api/tutor/sessions              — List sessions
  GET    /api/tutor/content-sources       — Get available courses + folders
  POST   /api/tutor/chain                 — Create/extend session chain
  GET    /api/tutor/chain/<id>            — Get chain with linked sessions
  POST   /api/tutor/embed                 — Trigger embedding for rag_docs
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime
from typing import Optional

from flask import Blueprint, Response, jsonify, request

from db_setup import DB_PATH, get_connection

tutor_bp = Blueprint("tutor", __name__, url_prefix="/api/tutor")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _gen_session_id() -> str:
    """Generate a unique tutor session ID."""
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    short = uuid.uuid4().hex[:6]
    return f"tutor-{ts}-{short}"


def _get_tutor_session(conn, session_id: str) -> Optional[dict]:
    """Fetch a tutor_sessions row as dict."""
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM tutor_sessions WHERE session_id = ?", (session_id,))
    row = cur.fetchone()
    return dict(row) if row else None


def _get_session_turns(conn, session_id: str, limit: int = 50) -> list[dict]:
    """Fetch recent tutor_turns for a session."""
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        """SELECT id, turn_number, question, answer, citations_json,
                  phase, artifacts_json, created_at
           FROM tutor_turns
           WHERE tutor_session_id = ?
           ORDER BY turn_number ASC
           LIMIT ?""",
        (session_id, limit),
    )
    return [dict(r) for r in cur.fetchall()]


# ---------------------------------------------------------------------------
# POST /api/tutor/session — Create a new tutor session
# ---------------------------------------------------------------------------

@tutor_bp.route("/session", methods=["POST"])
def create_session():
    data = request.get_json(silent=True) or {}

    course_id = data.get("course_id")
    phase = data.get("phase", "first_pass")
    mode = data.get("mode", "Core")
    topic = data.get("topic", "")
    content_filter = data.get("content_filter")

    session_id = _gen_session_id()
    now = datetime.now().isoformat()

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO tutor_sessions
           (session_id, course_id, phase, mode, topic, content_filter_json, status, turn_count, started_at)
           VALUES (?, ?, ?, ?, ?, ?, 'active', 0, ?)""",
        (
            session_id,
            course_id,
            phase,
            mode,
            topic,
            json.dumps(content_filter) if content_filter else None,
            now,
        ),
    )
    conn.commit()
    conn.close()

    return jsonify({
        "session_id": session_id,
        "phase": phase,
        "mode": mode,
        "topic": topic,
        "status": "active",
        "started_at": now,
    }), 201


# ---------------------------------------------------------------------------
# GET /api/tutor/session/<id> — Get session + history
# ---------------------------------------------------------------------------

@tutor_bp.route("/session/<session_id>", methods=["GET"])
def get_session(session_id: str):
    conn = get_connection()
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    turns = _get_session_turns(conn, session_id)
    conn.close()

    # Parse JSON fields
    for turn in turns:
        for field in ("citations_json", "artifacts_json"):
            if turn.get(field):
                try:
                    turn[field] = json.loads(turn[field])
                except (json.JSONDecodeError, TypeError):
                    pass

    session["turns"] = turns
    if session.get("content_filter_json"):
        try:
            session["content_filter"] = json.loads(session["content_filter_json"])
        except (json.JSONDecodeError, TypeError):
            session["content_filter"] = None

    return jsonify(session)


# ---------------------------------------------------------------------------
# POST /api/tutor/session/<id>/turn — Send a message, SSE stream response
# ---------------------------------------------------------------------------

@tutor_bp.route("/session/<session_id>/turn", methods=["POST"])
def send_turn(session_id: str):
    data = request.get_json(silent=True) or {}
    question = data.get("message", "").strip()
    if not question:
        return jsonify({"error": "message is required"}), 400

    conn = get_connection()
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    if session["status"] != "active":
        conn.close()
        return jsonify({"error": "Session is not active"}), 400

    # Load previous turns for chat history
    turns = _get_session_turns(conn, session_id, limit=20)
    conn.close()

    # Detect artifact commands
    from tutor_chains import detect_artifact_command
    artifact_cmd = detect_artifact_command(question)

    # Parse content filter for retriever
    content_filter = None
    if session.get("content_filter_json"):
        try:
            content_filter = json.loads(session["content_filter_json"])
        except (json.JSONDecodeError, TypeError):
            pass

    folder_paths = None
    if content_filter and content_filter.get("folders"):
        folder_paths = content_filter["folders"]

    # Build retriever + chain
    from tutor_rag import get_retriever
    from tutor_chains import build_first_pass_chain
    from tutor_streaming import stream_tutor_response, format_sse_error, extract_citations

    retriever = get_retriever(
        course_id=session.get("course_id"),
        folder_paths=folder_paths,
    )

    chain = build_first_pass_chain(
        retriever=retriever,
        mode=session.get("mode", "Core"),
        course_id=session.get("course_id"),
        topic=session.get("topic"),
    )

    # Build chat history for LangChain
    from langchain_core.messages import HumanMessage, AIMessage
    chat_history = []
    for turn in turns:
        if turn.get("question"):
            chat_history.append(HumanMessage(content=turn["question"]))
        if turn.get("answer"):
            chat_history.append(AIMessage(content=turn["answer"]))

    input_dict = {
        "question": question,
        "chat_history": chat_history,
    }

    turn_number = session["turn_count"] + 1

    def generate():
        full_response = ""
        citations = []

        try:
            for chunk_str in stream_tutor_response(chain, input_dict, session_id):
                full_response_part = chunk_str
                yield chunk_str

                # Accumulate response text from SSE chunks
                if chunk_str.startswith("data: "):
                    data_part = chunk_str.split("data: ", 1)[1].split("\n")[0]
                    if data_part != "[DONE]":
                        try:
                            parsed = json.loads(data_part)
                            if parsed.get("type") == "token":
                                full_response += parsed.get("content", "")
                            elif parsed.get("type") == "done":
                                citations = parsed.get("citations", [])
                        except (json.JSONDecodeError, KeyError):
                            pass
        except Exception as e:
            yield format_sse_error(str(e))
            full_response = f"[Error: {e}]"

        # After streaming completes, log the turn
        try:
            db_conn = get_connection()
            cur = db_conn.cursor()
            now = datetime.now().isoformat()

            cur.execute(
                """INSERT INTO tutor_turns
                   (session_id, tutor_session_id, course_id, mode, turn_number,
                    question, answer, citations_json, phase, artifacts_json, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    session_id,
                    session_id,
                    session.get("course_id"),
                    session.get("mode"),
                    turn_number,
                    question,
                    full_response,
                    json.dumps(citations) if citations else None,
                    session.get("phase"),
                    json.dumps({"command": artifact_cmd}) if artifact_cmd else None,
                    now,
                ),
            )

            # Update turn count
            cur.execute(
                "UPDATE tutor_sessions SET turn_count = ? WHERE session_id = ?",
                (turn_number, session_id),
            )

            db_conn.commit()
            db_conn.close()
        except Exception:
            pass

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ---------------------------------------------------------------------------
# POST /api/tutor/session/<id>/end — End session
# ---------------------------------------------------------------------------

@tutor_bp.route("/session/<session_id>/end", methods=["POST"])
def end_session(session_id: str):
    conn = get_connection()
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    now = datetime.now()
    cur = conn.cursor()

    # Create a Brain session record
    brain_session_id = None
    try:
        cur.execute(
            """INSERT INTO sessions
               (session_date, session_time, main_topic, study_mode,
                created_at, time_spent_minutes, duration_minutes)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                now.strftime("%Y-%m-%d"),
                now.strftime("%H:%M:%S"),
                session.get("topic") or "Tutor Session",
                f"Tutor-{session.get('mode', 'Core')}",
                now.isoformat(),
                session.get("turn_count", 0) * 2,  # rough estimate
                session.get("turn_count", 0) * 2,
            ),
        )
        brain_session_id = cur.lastrowid
    except Exception:
        pass

    # Update tutor_sessions
    cur.execute(
        """UPDATE tutor_sessions
           SET status = 'completed', ended_at = ?, brain_session_id = ?
           WHERE session_id = ?""",
        (now.isoformat(), brain_session_id, session_id),
    )

    conn.commit()
    conn.close()

    return jsonify({
        "session_id": session_id,
        "status": "completed",
        "brain_session_id": brain_session_id,
        "ended_at": now.isoformat(),
    })


# ---------------------------------------------------------------------------
# POST /api/tutor/session/<id>/artifact — Create artifact mid-session
# ---------------------------------------------------------------------------

@tutor_bp.route("/session/<session_id>/artifact", methods=["POST"])
def create_artifact(session_id: str):
    data = request.get_json(silent=True) or {}
    artifact_type = data.get("type")  # note, card, map
    content = data.get("content", "")
    title = data.get("title", "")

    if artifact_type not in ("note", "card", "map"):
        return jsonify({"error": "type must be 'note', 'card', or 'map'"}), 400

    conn = get_connection()
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    result = {"type": artifact_type, "session_id": session_id}

    if artifact_type == "card":
        front = data.get("front", title)
        back = data.get("back", content)
        tags = data.get("tags", "tutor")

        cur = conn.cursor()
        cur.execute(
            """INSERT INTO card_drafts
               (session_id, tutor_session_id, course_id, front, back, tags, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)""",
            (
                session_id,
                session_id,
                session.get("course_id"),
                front,
                back,
                tags,
                datetime.now().isoformat(),
            ),
        )
        result["card_id"] = cur.lastrowid
        conn.commit()

    elif artifact_type == "note":
        # Write to Obsidian via local REST API if available
        result["content"] = content
        result["title"] = title
        result["status"] = "created"

    elif artifact_type == "map":
        result["mermaid"] = content
        result["status"] = "created"

    # Track in session artifacts
    cur = conn.cursor()
    existing_artifacts = session.get("artifacts_json")
    artifacts = []
    if existing_artifacts:
        try:
            artifacts = json.loads(existing_artifacts)
        except (json.JSONDecodeError, TypeError):
            pass

    artifacts.append({
        "type": artifact_type,
        "title": title,
        "created_at": datetime.now().isoformat(),
    })

    cur.execute(
        "UPDATE tutor_sessions SET artifacts_json = ? WHERE session_id = ?",
        (json.dumps(artifacts), session_id),
    )
    conn.commit()
    conn.close()

    return jsonify(result), 201


# ---------------------------------------------------------------------------
# GET /api/tutor/sessions — List sessions
# ---------------------------------------------------------------------------

@tutor_bp.route("/sessions", methods=["GET"])
def list_sessions():
    course_id = request.args.get("course_id", type=int)
    status = request.args.get("status")
    limit = request.args.get("limit", 20, type=int)

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    conditions = []
    params: list = []

    if course_id is not None:
        conditions.append("course_id = ?")
        params.append(course_id)
    if status:
        conditions.append("status = ?")
        params.append(status)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    cur.execute(
        f"""SELECT id, session_id, course_id, phase, mode, topic, status,
                   turn_count, started_at, ended_at
            FROM tutor_sessions
            {where}
            ORDER BY started_at DESC
            LIMIT ?""",
        params + [limit],
    )

    sessions = [dict(r) for r in cur.fetchall()]
    conn.close()

    return jsonify(sessions)


# ---------------------------------------------------------------------------
# GET /api/tutor/content-sources — Available courses + folders + doc counts
# ---------------------------------------------------------------------------

@tutor_bp.route("/content-sources", methods=["GET"])
def content_sources():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Courses with rag_docs
    cur.execute(
        """SELECT c.id, c.name, c.code, COUNT(r.id) as doc_count
           FROM courses c
           LEFT JOIN rag_docs r ON r.course_id = c.id AND COALESCE(r.enabled, 1) = 1
           GROUP BY c.id
           ORDER BY c.name"""
    )
    courses = [dict(r) for r in cur.fetchall()]

    # Count system-level docs (course_id IS NULL) — SOP, methods, chains
    cur.execute(
        """SELECT COUNT(*) FROM rag_docs
           WHERE course_id IS NULL AND COALESCE(enabled, 1) = 1"""
    )
    system_doc_count = cur.fetchone()[0]

    # Add a virtual "System / SOP" entry for null-course docs
    if system_doc_count > 0:
        courses.insert(0, {
            "id": None,
            "name": "System / SOP",
            "code": "SOP",
            "doc_count": system_doc_count,
        })

    # Distinct folder paths from rag_docs (include null course_id docs)
    cur.execute(
        """SELECT DISTINCT folder_path, course_id, COUNT(*) as doc_count
           FROM rag_docs
           WHERE COALESCE(enabled, 1) = 1 AND folder_path IS NOT NULL AND folder_path != ''
           GROUP BY folder_path, course_id
           ORDER BY folder_path"""
    )
    folders = [dict(r) for r in cur.fetchall()]

    # Total docs
    cur.execute("SELECT COUNT(*) FROM rag_docs WHERE COALESCE(enabled, 1) = 1")
    total_docs = cur.fetchone()[0]

    conn.close()

    return jsonify({
        "courses": courses,
        "folders": folders,
        "total_docs": total_docs,
    })


# ---------------------------------------------------------------------------
# POST /api/tutor/chain — Create/extend session chain
# ---------------------------------------------------------------------------

@tutor_bp.route("/chain", methods=["POST"])
def create_chain():
    data = request.get_json(silent=True) or {}
    chain_name = data.get("chain_name")
    course_id = data.get("course_id")
    topic = data.get("topic", "")
    session_ids = data.get("session_ids", [])

    if not topic:
        return jsonify({"error": "topic is required"}), 400

    conn = get_connection()
    cur = conn.cursor()
    now = datetime.now().isoformat()

    cur.execute(
        """INSERT INTO session_chains
           (chain_name, course_id, topic, session_ids_json, status, created_at)
           VALUES (?, ?, ?, ?, 'active', ?)""",
        (chain_name, course_id, topic, json.dumps(session_ids), now),
    )
    chain_id = cur.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        "id": chain_id,
        "chain_name": chain_name,
        "topic": topic,
        "session_ids": session_ids,
    }), 201


# ---------------------------------------------------------------------------
# GET /api/tutor/chain/<id> — Get chain with linked sessions
# ---------------------------------------------------------------------------

@tutor_bp.route("/chain/<int:chain_id>", methods=["GET"])
def get_chain(chain_id: int):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT * FROM session_chains WHERE id = ?", (chain_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Chain not found"}), 404

    chain = dict(row)
    session_ids = []
    if chain.get("session_ids_json"):
        try:
            session_ids = json.loads(chain["session_ids_json"])
        except (json.JSONDecodeError, TypeError):
            pass

    # Fetch linked sessions
    sessions = []
    for sid in session_ids:
        s = _get_tutor_session(conn, sid)
        if s:
            sessions.append(s)

    chain["sessions"] = sessions
    conn.close()

    return jsonify(chain)


# ---------------------------------------------------------------------------
# POST /api/tutor/embed — Trigger embedding for rag_docs
# ---------------------------------------------------------------------------

@tutor_bp.route("/embed", methods=["POST"])
def trigger_embed():
    data = request.get_json(silent=True) or {}
    course_id = data.get("course_id")
    folder_path = data.get("folder_path")

    try:
        from tutor_rag import embed_rag_docs
        result = embed_rag_docs(course_id=course_id, folder_path=folder_path)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# POST /api/tutor/sync-vault — Sync an Obsidian vault folder into RAG
# ---------------------------------------------------------------------------

@tutor_bp.route("/sync-vault", methods=["POST"])
def sync_vault():
    data = request.get_json(silent=True) or {}
    vault_path = data.get("vault_path", "").strip()
    course_id = data.get("course_id")

    if not vault_path:
        return jsonify({"error": "vault_path is required"}), 400

    try:
        from rag_notes import sync_folder_to_rag
        sync_result = sync_folder_to_rag(vault_path, corpus="study")

        # Run embeddings on newly synced docs
        embedded = 0
        try:
            from tutor_rag import embed_rag_docs
            embed_result = embed_rag_docs()
            embedded = embed_result.get("embedded", 0)
        except Exception:
            pass

        return jsonify({
            "processed": sync_result.get("processed", 0),
            "embedded": embedded,
            "errors": sync_result.get("errors", []),
        })
    except FileNotFoundError:
        return jsonify({"error": f"Vault path not found: {vault_path}"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

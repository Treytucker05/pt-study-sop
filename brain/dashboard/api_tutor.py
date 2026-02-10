"""
Tutor API Blueprint — Flask endpoints for the Adaptive Tutor system.

Endpoints:
  POST   /api/tutor/session              — Create tutor session
  GET    /api/tutor/session/<id>          — Get session with history
  POST   /api/tutor/session/<id>/turn     — Send message, SSE stream response
  POST   /api/tutor/session/<id>/end      — End session, create Brain record
  POST   /api/tutor/session/<id>/artifact — Create note/card/map mid-session
  POST   /api/tutor/session/<id>/advance-block — Advance to next block in chain
  GET    /api/tutor/sessions              — List sessions
  GET    /api/tutor/content-sources       — Get available courses + materials
  GET    /api/tutor/chains/templates      — Get template chains with resolved blocks
  POST   /api/tutor/chain                 — Create/extend session chain
  GET    /api/tutor/chain/<id>            — Get chain with linked sessions
  POST   /api/tutor/embed                 — Trigger embedding for rag_docs
  POST   /api/tutor/materials/upload      — Upload study material
  GET    /api/tutor/materials             — List materials library
  PUT    /api/tutor/materials/<id>        — Update material metadata
  DELETE /api/tutor/materials/<id>        — Delete material + file + embeddings
"""

from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from flask import Blueprint, Response, jsonify, request

from db_setup import DB_PATH, get_connection

tutor_bp = Blueprint("tutor", __name__, url_prefix="/api/tutor")

UPLOADS_DIR = Path(__file__).parent.parent / "data" / "uploads"


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


def _resolve_chain_blocks(conn, chain_id: int) -> list[dict]:
    """Resolve a method_chain's block_ids JSON into block detail dicts."""
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT block_ids FROM method_chains WHERE id = ?", (chain_id,))
    row = cur.fetchone()
    if not row or not row["block_ids"]:
        return []

    try:
        block_ids = json.loads(row["block_ids"])
    except (json.JSONDecodeError, TypeError):
        return []

    if not block_ids:
        return []

    placeholders = ",".join("?" * len(block_ids))
    cur.execute(
        f"""SELECT id, name, category, description, default_duration_min, evidence, facilitation_prompt
            FROM method_blocks WHERE id IN ({placeholders})""",
        block_ids,
    )
    block_map = {r["id"]: dict(r) for r in cur.fetchall()}

    # Preserve chain order
    return [block_map[bid] for bid in block_ids if bid in block_map]


def _build_chain_info(conn, chain_id: int, current_index: int) -> tuple[Optional[dict], Optional[dict]]:
    """
    Build block_info and chain_info dicts for prompt builder.
    Returns (block_info, chain_info) — either may be None.
    """
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT id, name, description FROM method_chains WHERE id = ?", (chain_id,))
    chain_row = cur.fetchone()
    if not chain_row:
        return None, None

    blocks = _resolve_chain_blocks(conn, chain_id)
    if not blocks:
        return None, None

    # Current block info
    block_info = None
    if 0 <= current_index < len(blocks):
        b = blocks[current_index]
        block_info = {
            "name": b["name"],
            "description": b.get("description", ""),
            "category": b.get("category", ""),
            "evidence": b.get("evidence", ""),
            "duration": b.get("default_duration_min", 5),
            "facilitation_prompt": b.get("facilitation_prompt", ""),
        }

    # Chain overview
    chain_info = {
        "name": chain_row["name"],
        "blocks": [b["name"] for b in blocks],
        "current_index": current_index,
        "total": len(blocks),
    }

    return block_info, chain_info


def _format_dual_context(dual: dict) -> tuple[str, str]:
    """
    Format dual context dicts into (material_context_text, instruction_context_text).
    """
    material_parts = []
    for d in (dual.get("materials") or []):
        source = (d.metadata or {}).get("source", "Unknown")
        material_parts.append(f"[Source: {source}]\n{d.page_content}")
    material_text = "\n\n---\n\n".join(material_parts) if material_parts else ""

    instruction_parts = []
    for d in (dual.get("instructions") or []):
        source = (d.metadata or {}).get("source", "Unknown")
        instruction_parts.append(f"[SOP: {source}]\n{d.page_content}")
    instruction_text = "\n\n---\n\n".join(instruction_parts) if instruction_parts else ""

    return material_text, instruction_text


def _sanitize_filename(name: str) -> str:
    """Make a filename safe for disk storage."""
    import re
    safe = re.sub(r'[^\w\s\-.]', '', name)
    safe = re.sub(r'\s+', '_', safe)
    return safe[:200]


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
    method_chain_id = data.get("method_chain_id")

    session_id = _gen_session_id()
    now = datetime.now().isoformat()

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO tutor_sessions
           (session_id, course_id, phase, mode, topic, content_filter_json,
            status, turn_count, method_chain_id, current_block_index, started_at)
           VALUES (?, ?, ?, ?, ?, ?, 'active', 0, ?, 0, ?)""",
        (
            session_id,
            course_id,
            phase,
            mode,
            topic,
            json.dumps(content_filter) if content_filter else None,
            method_chain_id,
            now,
        ),
    )

    # If a method chain is selected, create first block transition
    first_block_name = None
    if method_chain_id:
        blocks = _resolve_chain_blocks(conn, method_chain_id)
        if blocks:
            first_block = blocks[0]
            first_block_name = first_block["name"]
            cur.execute(
                """INSERT INTO tutor_block_transitions
                   (tutor_session_id, block_id, block_index, started_at)
                   VALUES (?, ?, 0, ?)""",
                (session_id, first_block["id"], now),
            )

    conn.commit()
    conn.close()

    return jsonify({
        "session_id": session_id,
        "phase": phase,
        "mode": mode,
        "topic": topic,
        "status": "active",
        "method_chain_id": method_chain_id,
        "current_block_index": 0,
        "current_block_name": first_block_name,
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

    # Include chain block info if chain is active
    if session.get("method_chain_id"):
        blocks = _resolve_chain_blocks(conn, session["method_chain_id"])
        session["chain_blocks"] = blocks

    conn.close()

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

    # Build chain/block context if method chain is active
    block_info = None
    chain_info = None
    if session.get("method_chain_id"):
        current_idx = session.get("current_block_index", 0) or 0
        block_info, chain_info = _build_chain_info(conn, session["method_chain_id"], current_idx)

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

    # Extract material_ids from content filter (new dual-library approach)
    material_ids = None
    if content_filter and content_filter.get("material_ids"):
        material_ids = content_filter["material_ids"]

    # Legacy support: folder_paths
    folder_paths = None
    if content_filter and content_filter.get("folders"):
        folder_paths = content_filter["folders"]

    # Read model override from content_filter
    model_override = None
    if content_filter and content_filter.get("model"):
        model_override = content_filter["model"]

    # Read web search preference
    enable_web_search = bool(content_filter and content_filter.get("web_search"))

    # Resolve provider selection
    model_str = (str(model_override).strip() if model_override else "")
    model_lower = model_str.lower()
    provider = os.environ.get("TUTOR_PROVIDER", "").strip().lower() or None
    codex_model: Optional[str] = None

    if provider is None:
        if model_lower in ("codex", "codex-cli", "chatgpt"):
            provider = "codex"
        elif "/" in model_str:
            provider = "openrouter"
        elif model_str:
            provider = "codex"
            codex_model = model_str
        else:
            provider = "codex"

    # Guard: if UI selects an OpenRouter-style model (contains "/") but OpenRouter
    # isn't configured, fail fast with a readable SSE error instead of attempting
    # OpenAI with an incompatible model id (e.g. "google/gemini-*").
    if provider == "openrouter" and not (os.environ.get("OPENROUTER_API_KEY") or "").strip():
        def _unconfigured():
            from tutor_streaming import format_sse_error
            yield format_sse_error(
                "OpenRouter is not configured (OPENROUTER_API_KEY missing). "
                "Select Codex or set OPENROUTER_API_KEY in brain/.env, then restart the dashboard."
            )

        return Response(
            _unconfigured(),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-store",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            },
        )

    # Build LangChain chain only for API-backed providers
    chain = None
    input_dict = None
    if provider != "codex":
        from tutor_rag import get_retriever
        from tutor_chains import build_tutor_chain

        retriever = get_retriever(
            course_id=session.get("course_id"),
            folder_paths=folder_paths,
            material_ids=material_ids,
        )

        chain = build_tutor_chain(
            retriever=retriever,
            mode=session.get("mode", "Core"),
            course_id=session.get("course_id"),
            topic=session.get("topic"),
            model=model_override,
            chain_id=session.get("method_chain_id"),
            current_block_index=session.get("current_block_index", 0) or 0,
            block_info=block_info,
            chain_info=chain_info,
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

        from tutor_streaming import (
            format_sse_chunk,
            format_sse_done,
            format_sse_error,
            extract_citations,
            stream_tutor_response,
        )

        if provider == "codex":
            try:
                from llm_provider import stream_chatgpt_responses, call_codex_json
                from tutor_rag import keyword_search_dual
                from tutor_prompt_builder import build_prompt_with_contexts
                from tutor_chains import FIRST_PASS_ADDENDUM

                # Dual search: materials + SOP instructions
                dual = keyword_search_dual(
                    question,
                    course_id=session.get("course_id"),
                    material_ids=material_ids,
                    k_materials=4,
                    k_instructions=2,
                )
                material_text, instruction_text = _format_dual_context(dual)

                # Graceful mode when no materials
                if not material_text:
                    material_text = (
                        "No course-specific materials were retrieved for this topic. "
                        "Teach from your medical/PT training knowledge. "
                        "Mark such content as [From training knowledge — verify with your textbooks] "
                        "so the student knows to cross-reference."
                    )

                system_prompt = build_prompt_with_contexts(
                    mode=session.get("mode", "Core"),
                    current_block=block_info,
                    chain_info=chain_info,
                    course_id=session.get("course_id"),
                    topic=session.get("topic"),
                    instruction_context=instruction_text,
                    material_context=None,  # material context goes in user prompt
                )

                if not block_info:
                    system_prompt += "\n\n" + FIRST_PASS_ADDENDUM

                system_prompt += (
                    "\n\n## Tooling\n"
                    "Do not run shell commands or attempt to read local files. "
                    "Answer as a tutor only."
                )

                # Limit history to last 6 turns, truncate answers for speed
                recent_turns = turns[-6:] if len(turns) > 6 else turns
                history_lines: list[str] = []
                for t in recent_turns:
                    if t.get("question"):
                        history_lines.append(f"User: {t['question']}")
                    if t.get("answer"):
                        ans = t["answer"]
                        if len(ans) > 400:
                            ans = ans[:400] + "..."
                        history_lines.append(f"Assistant: {ans}")
                history_text = "\n".join(history_lines).strip() or "(no prior turns)"

                user_prompt = f"""## Retrieved Context
{material_text}

## Chat History
{history_text}

## Current Question
{question}

Remember: cite source documents using [Source: filename] when you use them."""

                # Primary: stream via ChatGPT backend API (fast)
                use_streaming = True
                try:
                    api_model = None
                    url_citations = []
                    for chunk in stream_chatgpt_responses(
                        system_prompt, user_prompt,
                        model=codex_model or "gpt-5.1",
                        timeout=120,
                        web_search=enable_web_search,
                    ):
                        if chunk.get("type") == "delta":
                            full_response += chunk.get("text", "")
                            yield format_sse_chunk(chunk.get("text", ""))
                        elif chunk.get("type") == "web_search":
                            yield format_sse_chunk(
                                "", chunk_type=f"web_search_{chunk['status']}"
                            )
                        elif chunk.get("type") == "error":
                            raise RuntimeError(chunk.get("error", "ChatGPT API failed"))
                        elif chunk.get("type") == "done":
                            api_model = chunk.get("model")
                            url_citations = chunk.get("url_citations", [])
                except Exception as stream_err:
                    # Fallback: Codex CLI (slower but reliable)
                    if not full_response:
                        use_streaming = False
                        result = call_codex_json(
                            system_prompt,
                            user_prompt,
                            model=codex_model,
                            timeout=120,
                            isolated=True,
                        )
                        if not result.get("success"):
                            raise RuntimeError(result.get("error") or "Codex failed")
                        full_response = (result.get("content") or "").strip()
                        max_chars = 220
                        for i in range(0, len(full_response), max_chars):
                            yield format_sse_chunk(full_response[i : i + max_chars])
                    else:
                        raise stream_err

                citations = extract_citations(full_response)
                # Merge document citations with web URL citations
                all_citations = citations
                if url_citations:
                    for uc in url_citations:
                        all_citations.append({
                            "source": uc.get("title") or uc.get("url", ""),
                            "url": uc.get("url", ""),
                            "index": len(all_citations) + 1,
                        })
                yield format_sse_done(citations=all_citations, model=api_model)

            except Exception as e:
                yield format_sse_error(str(e))
                full_response = f"[Error: {e}]"
                citations = []
        else:
            try:
                for chunk_str in stream_tutor_response(chain, input_dict, session_id):
                    yield chunk_str

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
                citations = []

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

            cur.execute(
                "UPDATE tutor_sessions SET turn_count = ? WHERE session_id = ?",
                (turn_number, session_id),
            )

            if session.get("method_chain_id"):
                cur.execute(
                    """UPDATE tutor_block_transitions
                       SET turn_count = turn_count + 1
                       WHERE tutor_session_id = ? AND ended_at IS NULL""",
                    (session_id,),
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
# POST /api/tutor/session/<id>/advance-block — Advance to next block in chain
# ---------------------------------------------------------------------------

@tutor_bp.route("/session/<session_id>/advance-block", methods=["POST"])
def advance_block(session_id: str):
    conn = get_connection()
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    chain_id = session.get("method_chain_id")
    if not chain_id:
        conn.close()
        return jsonify({"error": "Session has no method chain"}), 400

    blocks = _resolve_chain_blocks(conn, chain_id)
    current_idx = session.get("current_block_index", 0) or 0

    if current_idx >= len(blocks) - 1:
        conn.close()
        return jsonify({
            "block_index": current_idx,
            "block_name": blocks[current_idx]["name"] if blocks else "",
            "block_description": blocks[current_idx].get("description", "") if blocks else "",
            "is_last": True,
            "complete": True,
        })

    now = datetime.now().isoformat()
    cur = conn.cursor()

    cur.execute(
        """UPDATE tutor_block_transitions
           SET ended_at = ?
           WHERE tutor_session_id = ? AND ended_at IS NULL""",
        (now, session_id),
    )

    next_idx = current_idx + 1
    next_block = blocks[next_idx]

    cur.execute(
        "UPDATE tutor_sessions SET current_block_index = ? WHERE session_id = ?",
        (next_idx, session_id),
    )

    cur.execute(
        """INSERT INTO tutor_block_transitions
           (tutor_session_id, block_id, block_index, started_at)
           VALUES (?, ?, ?, ?)""",
        (session_id, next_block["id"], next_idx, now),
    )

    conn.commit()
    conn.close()

    return jsonify({
        "block_index": next_idx,
        "block_name": next_block["name"],
        "block_description": next_block.get("description", ""),
        "is_last": next_idx >= len(blocks) - 1,
    })


# ---------------------------------------------------------------------------
# GET /api/tutor/chains/templates — Template chains with resolved blocks
# ---------------------------------------------------------------------------

@tutor_bp.route("/chains/templates", methods=["GET"])
def get_template_chains():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        """SELECT id, name, description, block_ids, context_tags
           FROM method_chains
           WHERE is_template = 1
           ORDER BY name"""
    )
    chains = [dict(r) for r in cur.fetchall()]

    result = []
    for chain in chains:
        blocks = _resolve_chain_blocks(conn, chain["id"])
        context_tags = ""
        if chain.get("context_tags"):
            try:
                tags_obj = json.loads(chain["context_tags"])
                if isinstance(tags_obj, dict):
                    context_tags = ", ".join(f"{k}:{v}" for k, v in tags_obj.items())
                elif isinstance(tags_obj, str):
                    context_tags = tags_obj
            except (json.JSONDecodeError, TypeError):
                context_tags = chain["context_tags"] or ""

        result.append({
            "id": chain["id"],
            "name": chain["name"],
            "description": chain.get("description", ""),
            "blocks": [
                {
                    "id": b["id"],
                    "name": b["name"],
                    "category": b.get("category", ""),
                    "duration": b.get("default_duration_min", 5),
                }
                for b in blocks
            ],
            "context_tags": context_tags,
        })

    conn.close()
    return jsonify(result)


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

    cur.execute(
        """UPDATE tutor_block_transitions
           SET ended_at = ?
           WHERE tutor_session_id = ? AND ended_at IS NULL""",
        (now.isoformat(), session_id),
    )

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
                session.get("turn_count", 0) * 2,
                session.get("turn_count", 0) * 2,
            ),
        )
        brain_session_id = cur.lastrowid
    except Exception:
        pass

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
# DELETE /api/tutor/session/<id> — Delete a tutor session and its turns
# ---------------------------------------------------------------------------

@tutor_bp.route("/session/<session_id>", methods=["DELETE"])
def delete_session(session_id: str):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT id FROM tutor_sessions WHERE session_id = ?", (session_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    cur.execute("DELETE FROM tutor_turns WHERE tutor_session_id = ?", (session_id,))
    cur.execute("DELETE FROM tutor_block_transitions WHERE tutor_session_id = ?", (session_id,))
    cur.execute("DELETE FROM tutor_sessions WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()

    return jsonify({"deleted": True, "session_id": session_id})


# ---------------------------------------------------------------------------
# POST /api/tutor/session/<id>/artifact — Create artifact mid-session
# ---------------------------------------------------------------------------

@tutor_bp.route("/session/<session_id>/artifact", methods=["POST"])
def create_artifact(session_id: str):
    data = request.get_json(silent=True) or {}
    artifact_type = data.get("type")
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
        result["content"] = content
        result["title"] = title
        result["status"] = "created"

    elif artifact_type == "map":
        result["mermaid"] = content
        result["status"] = "created"

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
                   turn_count, method_chain_id, current_block_index,
                   started_at, ended_at
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
# GET /api/tutor/content-sources — Available courses + materials summary
# ---------------------------------------------------------------------------

@tutor_bp.route("/content-sources", methods=["GET"])
def content_sources():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Academic courses only
    cur.execute(
        """SELECT c.id, c.name, c.code, COUNT(r.id) as doc_count
           FROM courses c
           LEFT JOIN rag_docs r ON r.course_id = c.id AND COALESCE(r.enabled, 1) = 1 AND COALESCE(r.corpus, 'materials') = 'materials'
           WHERE c.term IS NOT NULL
              OR c.id IN (SELECT DISTINCT course_id FROM rag_docs WHERE course_id IS NOT NULL)
           GROUP BY c.id
           ORDER BY c.name"""
    )
    courses = [dict(r) for r in cur.fetchall()]

    # Total materials (not instructions)
    cur.execute(
        """SELECT COUNT(*) FROM rag_docs
           WHERE COALESCE(enabled, 1) = 1
             AND COALESCE(corpus, 'materials') = 'materials'"""
    )
    total_materials = cur.fetchone()[0]

    # Total instructions
    cur.execute(
        """SELECT COUNT(*) FROM rag_docs
           WHERE COALESCE(enabled, 1) = 1
             AND corpus = 'instructions'"""
    )
    total_instructions = cur.fetchone()[0]

    conn.close()

    openrouter_enabled = bool((os.environ.get("OPENROUTER_API_KEY") or "").strip())

    return jsonify({
        "courses": courses,
        "total_materials": total_materials,
        "total_instructions": total_instructions,
        "total_docs": total_materials + total_instructions,
        "openrouter_enabled": openrouter_enabled,
    })


# ---------------------------------------------------------------------------
# POST /api/tutor/materials/upload — Upload study material
# ---------------------------------------------------------------------------

@tutor_bp.route("/materials/upload", methods=["POST"])
def upload_material():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No filename"}), 400

    from text_extractor import get_file_type, extract_text, SUPPORTED_EXTENSIONS

    ext = Path(file.filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        return jsonify({"error": f"Unsupported file type: {ext}. Supported: {', '.join(SUPPORTED_EXTENSIONS)}"}), 400

    file_type = get_file_type(file.filename)
    title = request.form.get("title", Path(file.filename).stem)
    course_id = request.form.get("course_id", type=int)
    tags = request.form.get("tags", "")

    # Save to disk
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    file_uuid = uuid.uuid4().hex[:12]
    safe_name = _sanitize_filename(file.filename)
    disk_name = f"{file_uuid}_{safe_name}"
    disk_path = UPLOADS_DIR / disk_name
    file.save(str(disk_path))

    file_size = disk_path.stat().st_size

    # Extract text
    extraction = extract_text(str(disk_path))
    content = extraction["content"]
    extraction_error = extraction["error"]

    # Insert into rag_docs
    import hashlib
    checksum = hashlib.sha256(content.encode("utf-8")).hexdigest() if content else ""

    conn = get_connection()
    cur = conn.cursor()
    now = datetime.now().isoformat()

    cur.execute(
        """INSERT INTO rag_docs
           (source_path, content, checksum, corpus, title, file_path, file_size,
            file_type, doc_type, topic_tags, course_id, enabled,
            extraction_error, created_at, updated_at)
           VALUES (?, ?, ?, 'materials', ?, ?, ?, ?, 'upload', ?, ?, 1, ?, ?, ?)""",
        (
            str(disk_path),
            content,
            checksum,
            title,
            str(disk_path),
            file_size,
            file_type,
            tags,
            course_id,
            extraction_error,
            now,
            now,
        ),
    )
    material_id = cur.lastrowid
    conn.commit()

    # Attempt embedding (non-blocking — don't fail the upload if embedding fails)
    embedded = False
    if content and not extraction_error:
        try:
            from tutor_rag import embed_rag_docs
            result = embed_rag_docs(corpus="materials")
            embedded = result.get("embedded", 0) > 0
        except Exception:
            pass

    conn.close()

    return jsonify({
        "id": material_id,
        "title": title,
        "file_type": file_type,
        "file_size": file_size,
        "course_id": course_id,
        "extraction_error": extraction_error,
        "embedded": embedded,
        "char_count": len(content) if content else 0,
    }), 201


# ---------------------------------------------------------------------------
# GET /api/tutor/materials — List materials library
# ---------------------------------------------------------------------------

@tutor_bp.route("/materials", methods=["GET"])
def list_materials():
    course_id = request.args.get("course_id", type=int)
    file_type = request.args.get("file_type")
    enabled = request.args.get("enabled", type=int)

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    conditions = ["COALESCE(corpus, 'materials') = 'materials'"]
    params: list = []

    if course_id is not None:
        conditions.append("course_id = ?")
        params.append(course_id)
    if file_type:
        conditions.append("file_type = ?")
        params.append(file_type)
    if enabled is not None:
        conditions.append("COALESCE(enabled, 1) = ?")
        params.append(enabled)

    where = " AND ".join(conditions)

    cur.execute(
        f"""SELECT id, title, file_type, file_size, course_id, topic_tags,
                   COALESCE(enabled, 1) as enabled, extraction_error,
                   created_at, updated_at
            FROM rag_docs
            WHERE {where}
            ORDER BY created_at DESC""",
        params,
    )

    materials = [dict(r) for r in cur.fetchall()]
    conn.close()

    return jsonify(materials)


# ---------------------------------------------------------------------------
# PUT /api/tutor/materials/<id> — Update material metadata
# ---------------------------------------------------------------------------

@tutor_bp.route("/materials/<int:material_id>", methods=["PUT"])
def update_material(material_id: int):
    data = request.get_json(silent=True) or {}

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT id FROM rag_docs WHERE id = ? AND COALESCE(corpus, 'materials') = 'materials'", (material_id,))
    if not cur.fetchone():
        conn.close()
        return jsonify({"error": "Material not found"}), 404

    updates = []
    params: list = []

    for field in ("title", "course_id", "topic_tags"):
        if field in data:
            updates.append(f"{field} = ?")
            params.append(data[field])

    if "enabled" in data:
        updates.append("enabled = ?")
        params.append(1 if data["enabled"] else 0)

    if not updates:
        conn.close()
        return jsonify({"error": "No fields to update"}), 400

    updates.append("updated_at = ?")
    params.append(datetime.now().isoformat())
    params.append(material_id)

    cur.execute(
        f"UPDATE rag_docs SET {', '.join(updates)} WHERE id = ?",
        params,
    )
    conn.commit()
    conn.close()

    return jsonify({"id": material_id, "updated": True})


# ---------------------------------------------------------------------------
# DELETE /api/tutor/materials/<id> — Delete material + file + ChromaDB chunks
# ---------------------------------------------------------------------------

@tutor_bp.route("/materials/<int:material_id>", methods=["DELETE"])
def delete_material(material_id: int):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        "SELECT id, file_path FROM rag_docs WHERE id = ? AND COALESCE(corpus, 'materials') = 'materials'",
        (material_id,),
    )
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Material not found"}), 404

    file_path = row["file_path"]

    # Get chroma_ids for deletion
    cur.execute("SELECT chroma_id FROM rag_embeddings WHERE rag_doc_id = ?", (material_id,))
    chroma_ids = [r["chroma_id"] for r in cur.fetchall() if r["chroma_id"]]

    # Delete from ChromaDB
    if chroma_ids:
        try:
            from tutor_rag import init_vectorstore, COLLECTION_MATERIALS
            vs = init_vectorstore(COLLECTION_MATERIALS)
            vs._collection.delete(ids=chroma_ids)
        except Exception:
            pass

    # Delete embeddings from SQLite
    cur.execute("DELETE FROM rag_embeddings WHERE rag_doc_id = ?", (material_id,))

    # Delete rag_docs row
    cur.execute("DELETE FROM rag_docs WHERE id = ?", (material_id,))

    conn.commit()
    conn.close()

    # Delete file from disk
    if file_path:
        try:
            p = Path(file_path)
            if p.exists():
                p.unlink()
        except Exception:
            pass

    return jsonify({"deleted": True}), 200


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

    sessions = []
    for sid in session_ids:
        s = _get_tutor_session(conn, sid)
        if s:
            sessions.append(s)

    chain["sessions"] = sessions
    conn.close()

    return jsonify(chain)


# ---------------------------------------------------------------------------
# GET /api/tutor/blocks — All method blocks for chain builder
# ---------------------------------------------------------------------------

@tutor_bp.route("/blocks", methods=["GET"])
def get_method_blocks():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        """SELECT id, name, category, description, default_duration_min, energy_cost
           FROM method_blocks
           ORDER BY category, name"""
    )
    blocks = [dict(r) for r in cur.fetchall()]
    conn.close()

    return jsonify(blocks)


# ---------------------------------------------------------------------------
# POST /api/tutor/blocks/chain — Create ad-hoc chain from custom block list
# ---------------------------------------------------------------------------

@tutor_bp.route("/blocks/chain", methods=["POST"])
def create_custom_chain():
    data = request.get_json(silent=True) or {}
    block_ids = data.get("block_ids", [])
    name = data.get("name", "Custom Chain")

    if not block_ids or not isinstance(block_ids, list):
        return jsonify({"error": "block_ids is required (non-empty list)"}), 400

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """INSERT INTO method_chains (name, description, block_ids, context_tags, is_template, created_at)
           VALUES (?, 'User-built custom chain', ?, '{}', 0, datetime('now'))""",
        (name, json.dumps(block_ids)),
    )
    chain_id = cur.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"id": chain_id, "name": name, "block_ids": block_ids}), 201


# ---------------------------------------------------------------------------
# POST /api/tutor/embed — Trigger embedding for rag_docs
# ---------------------------------------------------------------------------

@tutor_bp.route("/embed", methods=["POST"])
def trigger_embed():
    data = request.get_json(silent=True) or {}
    course_id = data.get("course_id")
    folder_path = data.get("folder_path")
    corpus = data.get("corpus")

    try:
        from tutor_rag import embed_rag_docs
        result = embed_rag_docs(course_id=course_id, folder_path=folder_path, corpus=corpus)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

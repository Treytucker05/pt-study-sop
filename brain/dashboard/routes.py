
import os
import re
import json
import sqlite3
import subprocess
import tempfile
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Tuple
from flask import (
    Blueprint,
    render_template,
    jsonify,
    request,
    send_file,
    Response,
)
from werkzeug.utils import secure_filename

from config import (
    DATA_DIR,
    STUDY_RAG_DIR,
    SESSION_LOGS_DIR,
    SCORE_MIN,
    SCORE_MAX,
    STALE_DAYS,
    FRESH_DAYS,
    WEAK_THRESHOLD,
    STRONG_THRESHOLD,
)
from db_setup import DB_PATH, init_database, get_connection
# Use import directly for items in brain/ folder (root of execution)
from ingest_session import parse_session_log, validate_session_data, insert_session
from generate_resume import generate_resume
from tutor_api_types import TutorQueryV1, TutorSourceSelector, TutorTurnResponse
from tutor_engine import process_tutor_turn, log_tutor_turn, create_card_draft_from_turn
from import_syllabus import upsert_course, import_events
from rag_notes import (
    ingest_document,
    ingest_url_document,
    sync_folder_to_rag,
    sync_runtime_catalog,
    index_repo_to_rag,
    search_rag_docs,
)

# Dashboard modules
from dashboard.utils import allowed_file, load_api_config, save_api_config
from dashboard.stats import build_stats, get_mastery_stats
from dashboard.scholar import (
    build_scholar_stats,
    generate_ai_answer,
    run_scholar_orchestrator,
    generate_weekly_digest,
    generate_implementation_bundle,
    get_latest_insights,
    check_proposal_similarity,
    MAX_CONTEXT_CHARS,
)
from dashboard.syllabus import fetch_all_courses_and_events, attach_event_analytics
from dashboard.calendar import get_calendar_data
from dashboard.cli import get_all_sessions

dashboard_bp = Blueprint('dashboard', __name__)

# Ensure directories exist (run once at module level is okay, or in app factory)
# We can do it here just to be safe if blueprint is imported
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(SESSION_LOGS_DIR, exist_ok=True)

PROJECT_FILES_DIR = Path(DATA_DIR) / "project_files"
os.makedirs(PROJECT_FILES_DIR, exist_ok=True)

STUDY_RAG_PATH = Path(STUDY_RAG_DIR)
os.makedirs(STUDY_RAG_PATH, exist_ok=True)


def insert_session_data(data):
    """
    Validate and insert using the v9.1 ingest pipeline.
    Returns (ok: bool, message: str).
    """
    is_valid, error = validate_session_data(data)
    if not is_valid:
        return False, f"Validation failed: {error}"
    return insert_session(data)


@dashboard_bp.route("/")
def index():
    return render_template('dashboard.html')


@dashboard_bp.route("/favicon.ico")
def favicon():
    return "", 204


@dashboard_bp.route("/api/stats")
def api_stats():
    return jsonify(build_stats())


@dashboard_bp.route("/api/scholar")
def api_scholar():
    return jsonify(build_scholar_stats())


@dashboard_bp.route("/api/scholar/digest")
def api_scholar_digest():
    """Generate weekly digest of Scholar outputs from the past 7 days."""
    result = generate_weekly_digest(days=7)
    save_param = request.args.get("save", "true").strip().lower()
    should_save = save_param not in {"0", "false", "no"}
    if result.get("ok") and result.get("digest") and should_save:
        try:
            saved = _save_digest_artifacts(result["digest"], digest_type="weekly")
            result["saved"] = True
            result.update(saved)
        except Exception as e:
            result["saved"] = False
            result["save_error"] = str(e)
    return jsonify(result)


@dashboard_bp.route("/api/scholar/insights")
def api_scholar_insights():
    """Get key Scholar insights for dashboard overview display."""
    result = get_latest_insights()
    return jsonify(result)


@dashboard_bp.route("/api/brain/status", methods=["GET"])
def api_brain_status():
    """Get brain database status and statistics."""
    from pathlib import Path
    
    conn = get_connection()
    cur = conn.cursor()
    
    # Get counts
    cur.execute("SELECT COUNT(*) FROM sessions")
    session_count = cur.fetchone()[0]
    
    cur.execute("SELECT COUNT(*) FROM course_events")
    event_count = cur.fetchone()[0]
    
    # Check if rag_docs table exists
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='rag_docs'")
    rag_table_exists = cur.fetchone() is not None
    rag_count = 0
    if rag_table_exists:
        cur.execute("SELECT COUNT(*) FROM rag_docs")
        rag_count = cur.fetchone()[0]
    
    # Check if card_drafts table exists
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='card_drafts'")
    card_table_exists = cur.fetchone() is not None
    pending_cards = 0
    if card_table_exists:
        cur.execute("SELECT COUNT(*) FROM card_drafts WHERE status IN ('draft', 'approved')")
        pending_cards = cur.fetchone()[0]
    
    # Get DB file size
    db_path = Path(__file__).parent.parent / "data" / "pt_study.db"
    db_size_mb = db_path.stat().st_size / (1024 * 1024) if db_path.exists() else 0
    
    conn.close()
    
    return jsonify({
        "ok": True,
        "stats": {
            "sessions": session_count,
            "events": event_count,
            "rag_documents": rag_count,
            "pending_cards": pending_cards,
            "db_size_mb": round(db_size_mb, 2)
        }
    })


@dashboard_bp.route("/api/sync/pending", methods=["GET"])
def api_sync_pending():
    """List all staged events from Blackboard scraper and syllabus imports."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT s.id, s.course_id, c.name as course_name, s.type, s.title, s.date, s.due_date, s.raw_text, s.source_url, s.scraped_at, s.status
        FROM scraped_events s
        JOIN courses c ON s.course_id = c.id
        WHERE s.status NOT IN ('approved', 'ignored')
        ORDER BY s.scraped_at DESC
    """)
    rows = cur.fetchall()
    conn.close()
    
    pending = [
        {
            "id": r[0],
            "course_id": r[1],
            "course_name": r[2],
            "type": r[3],
            "title": r[4],
            "date": r[5],
            "due_date": r[6],
            "raw_text": r[7],
            "source_url": r[8],
            "scraped_at": r[9],
            "status": r[10]
        } for r in rows
    ]
    return jsonify({"ok": True, "items": pending})


@dashboard_bp.route("/api/sync/resolve", methods=["POST"])
def api_sync_resolve():
    """Approve, Ignore, or Update a staged item."""
    data = request.get_json() or {}
    staged_id = data.get("id")
    action = data.get("action") # 'approve', 'ignore'
    
    if not staged_id or not action:
        return jsonify({"ok": False, "message": "Missing staged_id or action"}), 400
        
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        if action == "ignore":
            cur.execute("UPDATE scraped_events SET status='ignored' WHERE id=?", (staged_id,))
        elif action == "approve":
            # Get the staged item
            cur.execute("SELECT * FROM scraped_events WHERE id=?", (staged_id,))
            item = cur.fetchone()
            if not item:
                return jsonify({"ok": False, "message": "Staged item not found"}), 404
            
            # Map columns by index (see CREATE TABLE in db_setup)
            # 0=id, 1=course_id, 2=type, 3=title, 4=date, 5=due_date, 6=raw_text, 7=source_url, 8=scraped_at, 9=status
            c_id, e_type, title, e_date, d_date, r_text, s_url = item[1], item[2], item[3], item[4], item[5], item[6], item[7]
            
            if e_type == 'material':
                # Create as Topic
                cur.execute("INSERT INTO topics (course_id, name, created_at) VALUES (?, ?, ?)",
                            (c_id, title, datetime.now().isoformat()))
                topic_id = cur.lastrowid
                # Add to RAG Docs if URL exists
                if s_url:
                    cur.execute("""
                        INSERT INTO rag_docs (source_path, course_id, doc_type, content, created_at, enabled)
                        VALUES (?, ?, 'web_link', ?, ?, 1)
                    """, (s_url, c_id, f"Title: {title}", datetime.now().isoformat()))
            else:
                # Create as Course Event
                cur.execute("""
                    INSERT INTO course_events (course_id, type, title, date, due_date, raw_text, created_at, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
                """, (c_id, e_type, title, e_date, d_date, r_text, datetime.now().isoformat()))
            
            # Mark staged item as approved
            cur.execute("UPDATE scraped_events SET status='approved' WHERE id=?", (staged_id,))
            
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"ok": False, "message": str(e)}), 500
    finally:
        conn.close()


DIGEST_BULLET_PREFIX_RE = re.compile(r'^\s*(?:[-*]|\u2022|\u00b7|\u00e2\u20ac\u00a2)\s*')


def _extract_digest_bullets(content: str, labels: List[str]) -> List[str]:
    lines = content.splitlines()
    in_section = False
    bullets = []
    for line in lines:
        stripped = line.strip()
        if not in_section:
            for label in labels:
                if label.lower() in stripped.lower():
                    in_section = True
                    break
            if in_section:
                continue
        else:
            if not stripped:
                continue
            if stripped.startswith("#") or stripped.startswith("---"):
                break
            if re.match(r'^\d+\.\s+', stripped) and not DIGEST_BULLET_PREFIX_RE.match(stripped):
                break
            if DIGEST_BULLET_PREFIX_RE.match(stripped):
                bullets.append(DIGEST_BULLET_PREFIX_RE.sub("", stripped).strip())
    return bullets


def _parse_resolved_questions(content: str) -> List[Tuple[str, str]]:
    resolved = []
    current_q = None
    current_a = None
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("Q:"):
            if current_q and current_a:
                resolved.append((current_q, current_a))
            current_q = stripped.replace("Q:", "").strip()
            current_a = None
            continue
        if stripped.startswith("A:"):
            answer = stripped.replace("A:", "").strip()
            if answer and answer.lower() not in ["(pending)", "(none)", ""]:
                current_a = answer
            else:
                current_a = None
            continue
        if current_q and current_a and stripped:
            current_a += " " + stripped
        elif current_q and not current_a and stripped and not stripped.startswith("A:"):
            current_q += " " + stripped
    if current_q and current_a:
        resolved.append((current_q, current_a))
    return resolved


def _save_digest_artifacts(digest_content: str, digest_type: str = "strategic") -> dict:
    import hashlib

    repo_root = Path(__file__).parent.parent.parent.resolve()
    digests_dir = repo_root / "scholar" / "outputs" / "digests"
    digests_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    if digest_type == "weekly":
        filename = f"weekly_digest_{timestamp}.md"
    elif digest_type and digest_type != "strategic":
        filename = f"{digest_type}_digest_{timestamp}.md"
    else:
        digest_type = "strategic"
        filename = f"strategic_digest_{timestamp}.md"
    filepath = digests_dir / filename
    filepath.write_text(digest_content, encoding="utf-8")

    # Build plan update draft from digest content
    plan_updates_dir = repo_root / "scholar" / "outputs" / "plan_updates"
    plan_updates_dir.mkdir(parents=True, exist_ok=True)
    plan_update_filename = f"plan_update_{timestamp}.md"
    plan_update_path = plan_updates_dir / plan_update_filename

    resolved_questions = []
    orchestrator_runs = repo_root / "scholar" / "outputs" / "orchestrator_runs"
    resolved_files = sorted(
        orchestrator_runs.glob("questions_resolved_*.md"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if resolved_files:
        try:
            resolved_content = resolved_files[0].read_text(encoding="utf-8")
            resolved_questions = _parse_resolved_questions(resolved_content)
        except Exception:
            resolved_questions = []

    priority_actions = _extract_digest_bullets(digest_content, ["Top 3 Priority Actions", "Priority Actions"])
    proposal_signals = _extract_digest_bullets(digest_content, ["Proposals Review", "Proposal Review", "Proposals"])
    research_recs = _extract_digest_bullets(digest_content, ["Research Recommendations", "Research Recommendation"])
    health_notes = _extract_digest_bullets(digest_content, ["System Health Assessment", "System Health"])

    plan_lines = [
        f"# Plan Update Draft - {timestamp}",
        "",
        f"Source Digest: {filename}",
        f"Digest Type: {digest_type}",
        f"Created: {datetime.now().isoformat()}",
        "",
        "## Priority Actions (from digest)",
    ]
    if priority_actions:
        plan_lines.extend([f"- {item}" for item in priority_actions])
    else:
        plan_lines.append("- (none found)")
    plan_lines.extend([
        "",
        "## Proposal Signals (from digest)",
    ])
    if proposal_signals:
        plan_lines.extend([f"- {item}" for item in proposal_signals])
    else:
        plan_lines.append("- (none found)")
    plan_lines.extend([
        "",
        "## Research Follow-ups (from digest)",
    ])
    if research_recs:
        plan_lines.extend([f"- {item}" for item in research_recs])
    else:
        plan_lines.append("- (none found)")
    plan_lines.extend([
        "",
        "## System Health Notes (from digest)",
    ])
    if health_notes:
        plan_lines.extend([f"- {item}" for item in health_notes])
    else:
        plan_lines.append("- (none found)")
    plan_lines.extend([
        "",
        "## Answered Questions (latest)",
    ])
    if resolved_questions:
        for q, a in resolved_questions[:10]:
            plan_lines.append(f"- Q: {q}")
            plan_lines.append(f"  A: {a}")
    else:
        plan_lines.append("- (none found)")
    plan_lines.extend([
        "",
        "## Proposal Seeds (from answered questions)",
    ])
    if resolved_questions:
        for q, a in resolved_questions[:10]:
            plan_lines.append(f"- Seed: {q} -> {a}")
    else:
        plan_lines.append("- (none found)")
    plan_lines.extend([
        "",
        "## Plan Targets",
        "- `sop/MASTER_PLAN_PT_STUDY.md`",
        "- `sop/gpt-knowledge/M0-planning.md`",
        "",
        "## Draft Plan Edits (human-in-the-loop)",
        "- (fill in concrete edits to plan files, then apply manually)",
        "",
    ])
    plan_update_path.write_text("\n".join(plan_lines), encoding="utf-8")

    # Build proposal seed file to review before RFC drafting
    proposal_seeds_dir = repo_root / "scholar" / "outputs" / "proposal_seeds"
    proposal_seeds_dir.mkdir(parents=True, exist_ok=True)
    proposal_seed_filename = f"proposal_seeds_{timestamp}.md"
    proposal_seed_path = proposal_seeds_dir / proposal_seed_filename
    seed_lines = [
        f"# Proposal Seeds - {timestamp}",
        "",
        f"Source Digest: {filename}",
    ]
    if resolved_questions:
        seed_lines.append("## Seeds")
        for q, a in resolved_questions[:15]:
            seed_lines.append(f"- Q: {q}")
            seed_lines.append(f"  A: {a}")
    else:
        seed_lines.append("## Seeds")
        seed_lines.append("- (none found)")
    proposal_seed_path.write_text("\n".join(seed_lines), encoding="utf-8")

    # Extract title from first markdown heading or first line
    heading_match = re.match(r'^#+ +(.+)', digest_content, re.MULTILINE)
    if heading_match:
        title = heading_match.group(1).strip()
    else:
        first_line = digest_content.split('\n')[0].strip()
        title = first_line[:100] if first_line else "Untitled Digest"

    # Generate content hash (MD5)
    content_hash = hashlib.md5(digest_content.encode('utf-8')).hexdigest()
    created_at = datetime.now().isoformat()

    # Store in database
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO scholar_digests (filename, filepath, title, digest_type, created_at, content_hash)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (filename, str(filepath.relative_to(repo_root)), title, digest_type, created_at, content_hash)
    )
    conn.commit()
    digest_id = cur.lastrowid
    conn.close()

    return {
        "id": digest_id,
        "file": str(filepath.relative_to(repo_root)),
        "plan_update_file": str(plan_update_path.relative_to(repo_root)),
        "proposal_seed_file": str(proposal_seed_path.relative_to(repo_root)),
        "message": f"Digest saved to {filename}",
        "digest_type": digest_type,
    }


@dashboard_bp.route("/api/scholar/digest/save", methods=["POST"])
def api_scholar_save_digest():
    """Save AI Strategic Digest to scholar outputs and database."""
    payload = request.get_json() or {}
    digest_content = payload.get("digest", "").strip()
    digest_type = (payload.get("digest_type") or "strategic").strip().lower()
    if not digest_content:
        return jsonify({"ok": False, "message": "No digest content"}), 400

    result = _save_digest_artifacts(digest_content, digest_type=digest_type)
    return jsonify({
        "ok": True,
        **result,
    })


@dashboard_bp.route("/api/scholar/digests", methods=["GET"])
def api_scholar_list_digests():
    """List saved digests from database."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, filename, title, digest_type, created_at, content_hash
        FROM scholar_digests
        ORDER BY created_at DESC
        """
    )
    rows = cur.fetchall()
    conn.close()
    
    digests = [
        {
            "id": row[0],
            "filename": row[1],
            "title": row[2],
            "digest_type": row[3],
            "created_at": row[4],
            "content_hash": row[5]
        }
        for row in rows
    ]
    
    return jsonify({"ok": True, "digests": digests, "count": len(digests)})


@dashboard_bp.route("/api/scholar/digests/<int:digest_id>", methods=["GET"])
def api_scholar_get_digest(digest_id):
    """Get a single digest by ID, including its content."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, filename, filepath, title, digest_type, created_at, content_hash
        FROM scholar_digests WHERE id = ?
        """,
        (digest_id,)
    )
    row = cur.fetchone()
    conn.close()
    
    if not row:
        return jsonify({"ok": False, "message": "Digest not found"}), 404
    
    # Read content from file
    repo_root = Path(__file__).parent.parent.parent.resolve()
    filepath = repo_root / row[2]
    content = ""
    if filepath.exists():
        content = filepath.read_text(encoding="utf-8")
    
    return jsonify({
        "ok": True,
        "digest": {
            "id": row[0],
            "filename": row[1],
            "filepath": row[2],
            "title": row[3],
            "digest_type": row[4],
            "created_at": row[5],
            "content_hash": row[6],
            "content": content
        }
    })


@dashboard_bp.route("/api/scholar/digests/<int:digest_id>", methods=["DELETE"])
def api_scholar_delete_digest(digest_id):
    """Delete a digest by ID (removes from DB and filesystem)."""
    conn = get_connection()
    cur = conn.cursor()
    
    # Get filepath first
    cur.execute("SELECT filepath FROM scholar_digests WHERE id = ?", (digest_id,))
    row = cur.fetchone()
    
    if not row:
        conn.close()
        return jsonify({"ok": False, "message": "Digest not found"}), 404
    
    # Delete from database
    cur.execute("DELETE FROM scholar_digests WHERE id = ?", (digest_id,))
    conn.commit()
    conn.close()
    
    # Delete file if it exists
    repo_root = Path(__file__).parent.parent.parent.resolve()
    filepath = repo_root / row[0]
    if filepath.exists():
        filepath.unlink()

    return jsonify({"ok": True, "message": "Digest deleted"})


@dashboard_bp.route("/api/scholar/implementation-bundle", methods=["POST"])
def api_scholar_implementation_bundle():
    """Generate an implementation bundle from approved proposals with safety checks."""
    result = generate_implementation_bundle()
    status_code = 200 if result.get("ok") else 400
    return jsonify(result), status_code


@dashboard_bp.route("/api/mastery")
def api_mastery():
    """Get topic mastery statistics for identifying weak areas and relearning needs."""
    return jsonify(get_mastery_stats())


@dashboard_bp.route("/api/trends")
def api_trends():
    """Get trend data for session metrics over time."""
    from dashboard.stats import get_trend_data
    days = request.args.get("days", 30, type=int)
    # Clamp to reasonable range
    days = max(7, min(days, 90))
    return jsonify(get_trend_data(days))


@dashboard_bp.route("/api/scholar/api-key", methods=["GET", "POST"])
def api_scholar_api_key():
    if request.method == "GET":
        config = load_api_config()
        api_provider = config.get("api_provider", "openrouter")
        if api_provider == "openrouter":
            api_key = config.get("openrouter_api_key", "")
        else:
            api_key = config.get("openai_api_key", "")
        
        return jsonify({
            "ok": True,
            "has_key": bool(api_key),
            "key_preview": f"{api_key[:7]}..." if api_key else None,
            "api_provider": api_provider,
            "model": config.get("model", "openrouter/auto"),
        })
    else:
        try:
            data = request.get_json()
            if not data or "api_key" not in data:
                return jsonify({"ok": False, "message": "Missing 'api_key' field"}), 400
            
            api_key = data["api_key"].strip()
            if not api_key:
                return jsonify({"ok": False, "message": "API key cannot be empty"}), 400
            
            config = load_api_config()
            api_provider = data.get("api_provider", "openrouter")
            model = data.get("model", "openrouter/auto")
            
            if api_provider == "openrouter":
                config["openrouter_api_key"] = api_key
            else:
                config["openai_api_key"] = api_key
            
            config["api_provider"] = api_provider
            config["model"] = model
            save_api_config(config)
            
            return jsonify({
                "ok": True,
                "message": f"API key saved successfully ({api_provider})",
                "key_preview": f"{api_key[:7]}...",
                "api_provider": api_provider,
                "model": model,
            })
        except Exception as e:
            return jsonify({"ok": False, "message": f"Error saving API key: {e}"}), 500


@dashboard_bp.route("/api/scholar/questions/clarify", methods=["POST"])
def api_scholar_clarify_question():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"ok": False, "message": "Missing JSON body"}), 400
            
        # Support "messages" (chat history) or single "clarifying_question"
        scholar_question = data.get("scholar_question", "")
        
        history = data.get("messages", [])
        user_message = ""
        if "clarifying_question" in data:
            user_message = data["clarifying_question"]
        elif history:
            user_message = history[-1]["content"] if history[-1]["role"] == "user" else ""
            
        if not user_message:
             return jsonify({"ok": False, "message": "No question provided"}), 400
        
        # Load Scholar context
        repo_root = Path(__file__).parent.parent.parent.resolve()
        
        # Build system context
        context_parts = []
        context_parts.append(f"Primary Scholar Question being discussed: {scholar_question}")
        
        # Search repo RAG for relevant context
        try:
            search_query = user_message if user_message else scholar_question
            rag_results = search_rag_docs(search_query, limit=3, corpus="repo")
            if rag_results:
                rag_snippets = []
                for r in rag_results:
                    source = r.get("source_path", "unknown")
                    snippet = r.get("snippet", "")[:500]
                    rag_snippets.append(f"[{source}]: {snippet}")
                if rag_snippets:
                    context_parts.append("\n--- Repo Context ---\n" + "\n\n".join(rag_snippets))
        except Exception:
            pass  # Continue without RAG if search fails
        
        # Load docs
        for doc_name in ["PEIRRO.md", "KWIK.md", "M6-wrap.md"]:
             doc_path = repo_root / "sop" / "gpt-knowledge" / doc_name
             if doc_path.exists():
                 try:
                     context_parts.append(f"\n--- {doc_name} ---\n{doc_path.read_text(encoding='utf-8')[:1000]}...")
                 except: pass

        system_context = "\n".join(context_parts)
        
        # If using history, pass it to generate_ai_answer if it supported list, 
        # but generate_ai_answer takes (question, context).
        # We'll prepend history to context or modify generate_ai_answer.
        # For now, let's construct a prompt with history.
        
        full_prompt = user_message
        if history:
            # Limit history to last 10 messages and truncate each message
            history_limited = history[-11:-1] if len(history) > 10 else history[:-1]
            history_text = "\\n".join([f"{m['role'].upper()}: {m['content'][:500]}" for m in history_limited])
            if history_text:
                full_prompt = f"Conversation History:\\n{history_text}\\n\\nCurrent Question: {user_message}"
        
        # Truncate system_context if too long
        if len(system_context) > MAX_CONTEXT_CHARS:
            system_context = system_context[:MAX_CONTEXT_CHARS] + "\\n[... truncated ...]"

        answer, error = generate_ai_answer(full_prompt, system_context)
        
        if error:
            return jsonify({"ok": False, "message": error}), 400
        
        return jsonify({
            "ok": True,
            "clarification": answer,
            "scholar_question": scholar_question,
        })
    except Exception as e:
        return jsonify({"ok": False, "message": f"Error generating clarification: {e}"}), 500


@dashboard_bp.route("/api/scholar/questions/generate", methods=["POST"])
def api_scholar_generate_answer():
    try:
        data = request.get_json()
        if not data:
             return jsonify({"ok": False, "message": "Missing JSON body"}), 400

        # Handle "messages" list for chat mode
        messages = data.get("messages", [])
        question = data.get("question", "")
        
        # If messages provided but no question, assume last user message is question
        if messages and not question:
            last_msg = messages[-1]
            if last_msg["role"] == "user":
                question = last_msg["content"]
        
        if not question:
            return jsonify({"ok": False, "message": "Missing 'question' or 'messages' field"}), 400
        
        context = data.get("context", "")
        
        # Search repo RAG for relevant context
        rag_context = ""
        try:
            rag_results = search_rag_docs(question, limit=3, corpus="repo")
            if rag_results:
                rag_snippets = []
                for r in rag_results:
                    source = r.get("source_path", "unknown")
                    snippet = r.get("snippet", "")[:500]
                    rag_snippets.append(f"[{source}]: {snippet}")
                if rag_snippets:
                    rag_context = "\n\n--- Repo Context ---\n" + "\n\n".join(rag_snippets)
        except Exception:
            pass  # Continue without RAG if search fails
        
        # Load Scholar context
        repo_root = Path(__file__).parent.parent.parent.resolve()
        peirro_doc = repo_root / "sop" / "gpt-knowledge" / "PEIRRO.md"
        kwik_doc = repo_root / "sop" / "gpt-knowledge" / "KWIK.md"
        
        additional_context = ""
        if peirro_doc.exists():
            try:
                peirro_content = peirro_doc.read_text(encoding="utf-8")[:500]
                additional_context += f"\nPEIRRO Framework: {peirro_content}\n"
            except: pass
        if kwik_doc.exists():
            try:
                kwik_content = kwik_doc.read_text(encoding="utf-8")[:500]
                additional_context += f"\nKWIK Framework: {kwik_content}\n"
            except: pass
        
        full_context = context + additional_context + rag_context
        
        # Append history to context if available (limit to last 10 messages to avoid overflow)
        if messages:
             history_msgs = messages[:-1] if messages[-1].get("role") == "user" else messages
             # Limit history to avoid token overflow
             history_msgs = history_msgs[-10:] if len(history_msgs) > 10 else history_msgs
             history_str = "\\n".join([f"{m['role'].upper()}: {m['content'][:500]}" for m in history_msgs])
             if history_str:
                 full_context += f"\\n\\nPrevious Conversation:\\n{history_str}"
        
        # Truncate total context if too long
        if len(full_context) > MAX_CONTEXT_CHARS:
            full_context = full_context[:MAX_CONTEXT_CHARS] + "\\n[... truncated ...]"
        
        api_key_override = data.get("api_key")
        api_provider_override = data.get("api_provider")
        model_override = data.get("model")

        answer, error = generate_ai_answer(
            question,
            full_context,
            api_key_override=api_key_override,
            api_provider_override=api_provider_override,
            model_override=model_override,
        )
        
        if error:
            return jsonify({"ok": False, "message": error}), 400
        
        return jsonify({
            "ok": True,
            "answer": answer,
            "question": question,
        })
    except Exception as e:
        return jsonify({"ok": False, "message": f"Error generating answer: {e}"}), 500


def _extract_resolved_questions(content):
    resolved = []
    if not content:
        return resolved
    current_q = None
    current_a = None
    for line in content.splitlines():
        line_stripped = line.strip()
        if line_stripped.startswith("Q:"):
            if current_q and current_a:
                resolved.append((current_q, current_a))
            current_q = line_stripped.replace("Q:", "").strip()
            current_a = None
            continue
        if line_stripped.startswith("A:"):
            answer = line_stripped.replace("A:", "").strip()
            if answer and answer.lower() not in ["(pending)", "(none)", ""]:
                current_a = answer
            else:
                current_a = None
            continue
        if current_q and current_a and line_stripped:
            current_a += " " + line_stripped
        elif current_q and not current_a and line_stripped and not line_stripped.startswith("A:"):
            current_q += " " + line_stripped
    if current_q and current_a:
        resolved.append((current_q, current_a))
    return resolved


def _write_questions_resolved(run_dir: Path, source_file: Path, content: str):
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    resolved_path = run_dir / f"questions_resolved_{timestamp}.md"
    resolved = _extract_resolved_questions(content)
    lines = [
        f"# Questions Resolved - {timestamp}",
        f"Source: {source_file.name}",
        f"Resolved Count: {len(resolved)}",
        "",
        "## Resolved",
    ]
    if resolved:
        for q, a in resolved:
            lines.append(f"Q: {q}")
            lines.append(f"A: {a}")
            lines.append("")
    else:
        lines.append("(none)")
    resolved_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    return resolved_path


@dashboard_bp.route("/api/scholar/questions/answer", methods=["POST"])
def api_scholar_answer_single():
    """Save a single answer by question index."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"ok": False, "message": "No data provided"}), 400
        
        question_index = data.get("question_index")
        answer_text = data.get("answer", "").strip()
        
        if question_index is None:
            return jsonify({"ok": False, "message": "Missing 'question_index'"}), 400
        if not answer_text:
            return jsonify({"ok": False, "message": "Answer cannot be empty"}), 400
        
        repo_root = Path(__file__).parent.parent.parent.resolve()
        orchestrator_runs = repo_root / "scholar" / "outputs" / "orchestrator_runs"
        
        # Find the questions file with unanswered questions
        question_files = sorted(
            orchestrator_runs.glob("questions_needed_*.md"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )
        
        if not question_files:
            return jsonify({"ok": False, "message": "No questions file found"}), 404
        
        # Find file with unanswered questions - check for Q: format OR list format
        target_file = question_files[0]
        for q_file in question_files[:5]:
            try:
                content = q_file.read_text(encoding="utf-8").strip()
                if not content or content == "(none)":
                    continue
                    
                if "Q:" in content:
                    # Q:/A: format - check for unanswered
                    lines = content.split("\n")
                    for i, line in enumerate(lines):
                        if line.strip().startswith("Q:"):
                            if i + 1 >= len(lines) or not lines[i + 1].strip().startswith("A:") or lines[i + 1].replace("A:", "").strip().lower() in ["(pending)", "(none)", ""]:
                                target_file = q_file
                                break
                else:
                    # List format (bullets or numbers) - check for non-empty content
                    for line in content.split("\n"):
                        line = line.strip()
                        if line and not line.startswith("#") and line != "(none)":
                            target_file = q_file
                            break
            except:
                continue
        
        content = target_file.read_text(encoding="utf-8")
        lines = content.split("\n")
        
        # Detect format: Q:/A: vs list format
        uses_qa_format = "Q:" in content
        
        # Find and update the specific UNANSWERED question by index
        unanswered_count = 0
        updated = False
        new_lines = []
        i = 0
        
        if uses_qa_format:
            # Q:/A: format
            while i < len(lines):
                line = lines[i]
                if line.strip().startswith("Q:"):
                    # Check if this question is unanswered
                    is_unanswered = True
                    if i + 1 < len(lines) and lines[i + 1].strip().startswith("A:"):
                        answer_line = lines[i + 1].replace("A:", "").strip().lower()
                        if answer_line and answer_line not in ["(pending)", "(none)", ""]:
                            is_unanswered = False
                    
                    new_lines.append(line)
                    
                    if is_unanswered and unanswered_count == question_index:
                        # This is the unanswered question we want to update
                        if i + 1 < len(lines) and lines[i + 1].strip().startswith("A:"):
                            new_lines.append(f"A: {answer_text}")
                            i += 1  # Skip old A: line
                        else:
                            new_lines.append(f"A: {answer_text}")
                        updated = True
                    
                    if is_unanswered:
                        unanswered_count += 1
                else:
                    new_lines.append(line)
                i += 1
        else:
            # List format (bullets or numbered) - convert to Q:/A: format on first answer
            while i < len(lines):
                line = lines[i]
                stripped = line.strip()
                
                # Check if this is a question line (bullet, numbered, or plain text, not header/blank)
                is_question_line = False
                if stripped and not stripped.startswith("#") and stripped != "(none)":
                    # Remove bullet/number prefix
                    clean_line = re.sub(r"^[-*•]\s*", "", stripped)
                    clean_line = re.sub(r"^\d+\.\s*", "", clean_line)
                    if clean_line:
                        is_question_line = True
                
                if is_question_line:
                    clean_question = re.sub(r"^[-*•]\s*", "", stripped)
                    clean_question = re.sub(r"^\d+\.\s*", "", clean_question)
                    
                    if unanswered_count == question_index:
                        # Convert this question to Q:/A: format with answer
                        new_lines.append(f"Q: {clean_question}")
                        new_lines.append(f"A: {answer_text}")
                        updated = True
                    else:
                        # Convert to Q:/A: format with pending answer
                        new_lines.append(f"Q: {clean_question}")
                        new_lines.append("A: (pending)")
                    unanswered_count += 1
                else:
                    new_lines.append(line)
                i += 1
        
        if not updated:
            return jsonify({"ok": False, "message": f"Question index {question_index} not found (checked {unanswered_count} unanswered questions)"}), 404
        
        # Atomic write
        new_content = "\n".join(new_lines)
        fd, tmp_path = tempfile.mkstemp(suffix='.md', dir=str(target_file.parent))
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as tmp_file:
                tmp_file.write(new_content)
            os.replace(tmp_path, str(target_file))
        except Exception:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass
            raise
        resolved_path = _write_questions_resolved(orchestrator_runs, target_file, new_content)

        return jsonify({
            "ok": True,
            "message": f"Answer saved for question {question_index + 1}",
            "resolved_file": resolved_path.name,
        })
    except Exception as e:
        return jsonify({"ok": False, "message": f"Error saving answer: {e}"}), 500


@dashboard_bp.route("/api/scholar/questions", methods=["POST"])
def api_scholar_answer_questions():
    """Update the questions_needed file with answers."""
    try:
        data = request.get_json()
        if not data or "answers" not in data:
            return jsonify({"ok": False, "message": "Missing 'answers' array"}), 400
        
        answers = data["answers"]
        repo_root = Path(__file__).parent.parent.parent.resolve()
        orchestrator_runs = repo_root / "scholar" / "outputs" / "orchestrator_runs"
        
        # Find the questions file with unanswered questions (check recent files)
        question_files = sorted(
            orchestrator_runs.glob("questions_needed_*.md"), 
            key=lambda p: p.stat().st_mtime, 
            reverse=True
        )
        
        if not question_files:
            return jsonify({"ok": False, "message": "No questions file found"}), 404
        
        # This logic finds the file to update - simplified from original for brevity but robust enough
        target_questions_file = question_files[0]
        
        # Check if we should use an older file that has unanswered questions
        for q_file in question_files[:3]:
            try:
                content = q_file.read_text(encoding="utf-8").strip()
                if content and content != "(none)":
                    has_unanswered = False
                    if "Q:" in content:
                        lines = content.split("\n")
                        for i, line in enumerate(lines):
                            if line.strip().startswith("Q:"):
                                # Check if next line is A:
                                if i + 1 >= len(lines) or not lines[i+1].strip().startswith("A:") or lines[i+1].replace("A:", "").strip().lower() in ["(pending)", "(none)", ""]:
                                    has_unanswered = True
                                    break
                    elif content and not content.startswith("#"):
                        has_unanswered = True
                    
                    if has_unanswered:
                        target_questions_file = q_file
                        break
            except:
                continue
        
        latest_questions_file = target_questions_file
        current_content = latest_questions_file.read_text(encoding="utf-8")
        
        # Update logic
        if "Q:" in current_content:
            lines = current_content.split("\n")
            answered_content = []
            answer_index = 0
            
            for line in lines:
                if line.strip().startswith("Q:"):
                    answered_content.append(line)
                elif line.strip().startswith("A:"):
                    if answer_index < len(answers) and answers[answer_index]:
                        answered_content.append(f"A: {answers[answer_index]}")
                    else:
                        answered_content.append(line)
                    answer_index += 1
                elif line.strip() and not line.strip().startswith("Q:") and not line.strip().startswith("A:"):
                    answered_content.append(line)
                else:
                    answered_content.append(line)
            
            while answer_index < len(answers):
                if answers[answer_index]:
                    answered_content.append(f"\nQ: (Additional question {answer_index + 1})")
                    answered_content.append(f"A: {answers[answer_index]}")
                answer_index += 1
        else:
            original_questions = [q.strip() for q in current_content.split("\n") 
                                if q.strip() and q.strip() != "(none)" 
                                and not q.strip().startswith("#")]
            
            answered_content = []
            for i, question in enumerate(original_questions):
                clean_question = re.sub(r"^[-*•]\s*", "", question)
                clean_question = re.sub(r"^\d+\.\s*", "", clean_question)
                if clean_question:
                    answered_content.append(f"Q: {clean_question}")
                    if i < len(answers) and answers[i]:
                        answered_content.append(f"A: {answers[i]}")
                    else:
                        answered_content.append(f"A: (pending)")
                    answered_content.append("")
        
        # Atomic write: temp file + rename to prevent corruption on crash
        content = "\n".join(answered_content)
        fd, tmp_path = tempfile.mkstemp(suffix='.md', dir=str(latest_questions_file.parent))
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as tmp_file:
                tmp_file.write(content)
            # Atomic rename (on same filesystem)
            os.replace(tmp_path, str(latest_questions_file))
        except Exception:
            # Clean up temp file if rename failed
            try:
                os.unlink(tmp_path)
            except Exception:
                pass
            raise
        resolved_path = _write_questions_resolved(orchestrator_runs, latest_questions_file, content)

        return jsonify({
            "ok": True,
            "message": f"Answers saved to {latest_questions_file.name}",
            "resolved_file": resolved_path.name,
        })
    except Exception as e:
        return jsonify({"ok": False, "message": f"Error saving answers: {e}"}), 500


@dashboard_bp.route("/api/scholar/run", methods=["POST"])
def api_scholar_run():
    try:
        result = run_scholar_orchestrator()
        return jsonify(result)
    except Exception as e:
        return jsonify({"ok": False, "message": f"Error starting Scholar run: {e}"}), 500


@dashboard_bp.route("/api/scholar/run/status/<run_id>")
def api_scholar_run_status(run_id):
    repo_root = Path(__file__).parent.parent.parent.resolve()
    run_dir = repo_root / "scholar" / "outputs" / "orchestrator_runs"
    
    log_path = run_dir / f"unattended_{run_id}.log"
    final_path = run_dir / f"unattended_final_{run_id}.md"
    pid_path = run_dir / f"unattended_{run_id}.pid"
    running_marker = run_dir / f"unattended_{run_id}.running"

    def _read_tail_text(path: Path, max_bytes: int = 12000) -> str:
        try:
            with open(path, "rb") as f:
                try:
                    f.seek(0, 2)
                    size = f.tell()
                    f.seek(max(0, size - max_bytes), 0)
                except Exception:
                    pass
                data = f.read()
            return data.decode("utf-8", errors="replace")
        except Exception:
            return ""

    def _pid_is_running(pid: int) -> bool:
        if pid <= 0:
            return False
        if os.name == "nt":
            try:
                # tasklist returns header + row when PID exists
                proc = subprocess.run(
                    ["tasklist", "/FI", f"PID eq {pid}"],
                    capture_output=True,
                    text=True,
                    timeout=3,
                )
                out = (proc.stdout or "")
                # When not found, tasklist prints: "INFO: No tasks are running which match the specified criteria."
                if "No tasks are running" in out:
                    return False
                return re.search(rf"\b{re.escape(str(pid))}\b", out) is not None
            except Exception:
                return False
        try:
            os.kill(pid, 0)
            return True
        except Exception:
            return False
    
    status = {
        "run_id": run_id,
        "running": False,
        "completed": False,
        "has_final": final_path.exists(),
        "log_size": 0,
        "log_tail": "",
        "log_mtime": None,
        "seconds_since_log_update": None,
        "pid": None,
        "pid_stale": False,
        "stalled": False,
        "error": False,
        "error_message": None,
    }

    if log_path.exists():
        try:
            st = log_path.stat()
            status["log_size"] = st.st_size
            status["log_mtime"] = datetime.fromtimestamp(st.st_mtime).isoformat()
            status["seconds_since_log_update"] = int((datetime.now() - datetime.fromtimestamp(st.st_mtime)).total_seconds())
        except Exception:
            pass
        status["log_tail"] = _read_tail_text(log_path, max_bytes=16000)
        
        # Detect error marker in log
        if "===== SCHOLAR RUN ERROR =====" in status["log_tail"]:
            status["error"] = True
            status["running"] = False
            # Extract error message
            try:
                error_start = status["log_tail"].find("===== SCHOLAR RUN ERROR =====")
                error_section = status["log_tail"][error_start:error_start + 500]
                for line in error_section.split("\n"):
                    if line.startswith("Error:"):
                        status["error_message"] = line.replace("Error:", "").strip()
                        break
            except Exception:
                pass

    # Prefer PID-based running detection when available
    if pid_path.exists():
        try:
            pid_txt = pid_path.read_text(encoding="utf-8").strip()
            pid = int(pid_txt)
            status["pid"] = pid
            status["running"] = _pid_is_running(pid)
            if not status["running"]:
                status["pid_stale"] = True
        except Exception:
            pass

    # Multi-agent marker (no PID file)
    if running_marker.exists():
        status["running"] = True

    # Completion detection
    tail = status.get("log_tail", "") or ""
    if "===== Scholar Run Completed" in tail or final_path.exists():
        status["completed"] = True
        status["running"] = False
    elif status["log_tail"]:
        # Fallback heuristic when no PID available
        if status["pid"] is None:
            status["running"] = ("ERROR:" not in tail)

    # Stalled signal for UI (no log changes for 10+ minutes while running)
    if status.get("running") and isinstance(status.get("seconds_since_log_update"), int):
        status["stalled"] = status["seconds_since_log_update"] >= 600

    # If PID is stale and we have neither completion marker nor final, this likely exited unexpectedly.
    # Clear stale PID file so UI doesn't keep presenting a "running" affordance.
    if status.get("pid_stale") and (not status.get("completed")) and (not final_path.exists()):
        try:
            pid_path.unlink()
            status["pid_stale"] = False
            status["pid"] = None
        except Exception:
            pass
    
    if final_path.exists():
        status["completed"] = True
        status["running"] = False
        try:
            final_content = final_path.read_text(encoding="utf-8")
            status["final_summary"] = final_content[:500]
        except:
            pass
    
    return jsonify(status)


@dashboard_bp.route("/api/scholar/run/latest-final")
def api_scholar_latest_final():
    repo_root = Path(__file__).parent.parent.parent.resolve()
    run_dir = repo_root / "scholar" / "outputs" / "orchestrator_runs"
    final_files = sorted(run_dir.glob("unattended_final_*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not final_files:
        return jsonify({"ok": False, "message": "No unattended_final file found"}), 404
    path = final_files[0]
    try:
        content = path.read_text(encoding="utf-8")
    except Exception:
        content = path.read_text(encoding="utf-8", errors="replace")
    # Keep payload bounded
    max_chars = 120000
    if len(content) > max_chars:
        content = content[:max_chars] + "\n\n[... truncated ...]"
    return jsonify({
        "ok": True,
        "file": str(path.relative_to(repo_root)).replace("\\", "/"),
        "modified": datetime.fromtimestamp(path.stat().st_mtime).isoformat(),
        "content": content,
    })


@dashboard_bp.route("/api/scholar/run/cancel/<run_id>", methods=["POST"])
def api_scholar_cancel_run(run_id):
    repo_root = Path(__file__).parent.parent.parent.resolve()
    run_dir = repo_root / "scholar" / "outputs" / "orchestrator_runs"
    pid_path = run_dir / f"unattended_{run_id}.pid"
    if not pid_path.exists():
        # Treat as a successful no-op: either the run finished/stopped already, or it was started
        # before PID tracking existed, or the PID file was cleaned up after detecting staleness.
        return jsonify({
            "ok": True,
            "message": "No PID file found for this run (it likely already finished/stopped).",
        })
    try:
        pid = int(pid_path.read_text(encoding="utf-8").strip())
    except Exception:
        return jsonify({"ok": False, "message": "Invalid PID file."}), 400

    try:
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True, text=True, timeout=5)
        else:
            os.kill(pid, 15)
        try:
            pid_path.unlink()
        except Exception:
            pass
        return jsonify({"ok": True, "message": f"Cancel requested for PID {pid}."})
    except Exception as e:
        # If it's already gone, treat cancel as a cleanup.
        try:
            if os.name == "nt":
                proc = subprocess.run(["tasklist", "/FI", f"PID eq {pid}"], capture_output=True, text=True, timeout=3)
                if "No tasks are running" in (proc.stdout or ""):
                    try:
                        pid_path.unlink()
                    except Exception:
                        pass
                    return jsonify({"ok": True, "message": f"PID {pid} is not running; cleared stale PID file."})
        except Exception:
            pass
        return jsonify({"ok": False, "message": f"Failed to cancel run: {e}"}), 500


@dashboard_bp.route("/api/scholar/safe-mode", methods=["POST"])
def api_scholar_safe_mode():
    try:
        data = request.get_json()
        if "safe_mode" not in data:
            return jsonify({"ok": False, "message": "Missing 'safe_mode' field"}), 400
        
        repo_root = Path(__file__).parent.parent.parent.resolve()
        manifest_path = repo_root / "scholar" / "inputs" / "audit_manifest.json"
        
        if not manifest_path.exists():
            return jsonify({"ok": False, "message": "audit_manifest.json not found"}), 404
        
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        
        manifest["safe_mode"] = bool(data["safe_mode"])
        
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        
        return jsonify({
            "ok": True, 
            "message": f"Safe mode set to {manifest['safe_mode']}",
            "safe_mode": manifest["safe_mode"]
        })
    except Exception as e:
        return jsonify({"ok": False, "message": f"Error updating safe_mode: {e}"}), 500


@dashboard_bp.route("/api/scholar/multi-agent", methods=["POST"])
def api_scholar_multi_agent():
    try:
        data = request.get_json() or {}
        if "enabled" not in data:
            return jsonify({"ok": False, "message": "Missing 'enabled' field"}), 400

        repo_root = Path(__file__).parent.parent.parent.resolve()
        manifest_path = repo_root / "scholar" / "inputs" / "audit_manifest.json"

        if not manifest_path.exists():
            return jsonify({"ok": False, "message": "audit_manifest.json not found"}), 404

        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        if "multi_agent" not in manifest:
            manifest["multi_agent"] = {}

        manifest["multi_agent"]["enabled"] = bool(data["enabled"])

        if "max_concurrency" in data:
            try:
                max_conc = int(data["max_concurrency"])
                max_conc = max(1, min(max_conc, 6))
                manifest["multi_agent"]["max_concurrency"] = max_conc
            except Exception:
                return jsonify({"ok": False, "message": "Invalid max_concurrency"}), 400

        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

        return jsonify({
            "ok": True,
            "message": f"Multi-agent set to {manifest['multi_agent']['enabled']}",
            "enabled": manifest["multi_agent"]["enabled"],
            "max_concurrency": manifest["multi_agent"].get("max_concurrency", 4),
        })
    except Exception as e:
        return jsonify({"ok": False, "message": f"Error updating multi_agent: {e}"}), 500


@dashboard_bp.route("/api/scholar/proposal/<filename>")
def api_scholar_proposal_get(filename):
    """Get the content of a proposal file."""
    try:
        repo_root = Path(__file__).parent.parent.parent.resolve()
        proposal_path = repo_root / "scholar" / "outputs" / "promotion_queue" / filename
        
        if not proposal_path.exists():
            return jsonify({"ok": False, "message": "Proposal not found"}), 404
        
        content = proposal_path.read_text(encoding="utf-8")
        
        return jsonify({
            "ok": True,
            "filename": filename,
            "content": content,
            "path": str(proposal_path)
        })
    except Exception as e:
        return jsonify({"ok": False, "message": f"Error reading proposal: {e}"}), 500


def update_proposal_status_in_markdown(filepath: Path, new_status: str) -> bool:
    """
    Update the Status: field inside a markdown proposal file.
    
    Args:
        filepath: Path to the markdown file
        new_status: New status value (e.g., "approved", "rejected")
    
    Returns:
        True if Status line was found and updated, False otherwise
    """
    try:
        content = filepath.read_text(encoding="utf-8")
        lines = content.split("\n")
        updated = False
        
        for i, line in enumerate(lines):
            # Match "Status:" at start of line (case-insensitive, with optional whitespace)
            if re.match(r'^Status\s*:', line, re.IGNORECASE):
                lines[i] = f"Status: {new_status}"
                updated = True
                break
        
        if updated:
            filepath.write_text("\n".join(lines), encoding="utf-8")
        
        return updated
    except Exception:
        return False


def _extract_proposal_title(content: str) -> str:
    """Extract title from first markdown heading or first line."""
    # Try to find first heading
    match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    if match:
        return match.group(1).strip()[:200]
    # Fallback to first non-empty line
    for line in content.split("\n"):
        line = line.strip()
        if line:
            return line[:200]
    return "Untitled Proposal"

def _get_git_head(repo_root: Path) -> str:
    try:
        result = subprocess.run(
            ["git", "-C", str(repo_root), "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return "unknown"


def _extract_target_paths(content: str, repo_root: Path) -> list:
    targets = set()
    if not content:
        return []
    for line in content.splitlines():
        for match in re.findall(r'([A-Za-z0-9_\-./]+)', line):
            if not match.startswith(("sop/", "brain/", "dist/")):
                continue
            candidate = repo_root / match
            if candidate.exists():
                targets.add(match)
    return sorted(targets)


def _hash_file(path: Path) -> str:
    import hashlib
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _write_proposal_metadata(dest: Path, content: str, repo_root: Path, status: str, reviewed_at: str, title: str, content_hash: str) -> None:
    meta = {
        "filename": dest.name,
        "status": status,
        "reviewed_at": reviewed_at,
        "title": title,
        "content_hash": content_hash,
        "head_commit": _get_git_head(repo_root),
        "target_files": [],
        "target_hashes": {},
    }
    targets = _extract_target_paths(content, repo_root)
    meta["target_files"] = targets
    for rel_path in targets:
        try:
            meta["target_hashes"][rel_path] = _hash_file(repo_root / rel_path)
        except Exception:
            continue
    meta_path = dest.with_suffix(dest.suffix + ".meta.json")
    try:
        meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    except Exception:
        pass


@dashboard_bp.route("/api/scholar/proposal/<filename>/action", methods=["POST"])
def api_scholar_proposal_action(filename):
    """Approve or reject a proposal, update database and markdown Status field."""
    try:
        import hashlib
        
        data = request.get_json() or {}
        action = data.get("action", "").lower()
        reviewer_notes = data.get("reviewer_notes", "")
        
        if action not in ("approve", "reject"):
            return jsonify({"ok": False, "message": "Action must be 'approve' or 'reject'"}), 400
        
        repo_root = Path(__file__).parent.parent.parent.resolve()
        promotion_queue = repo_root / "scholar" / "outputs" / "promotion_queue"
        proposal_path = promotion_queue / filename
        
        if not proposal_path.exists():
            return jsonify({"ok": False, "message": "Proposal not found"}), 404
        
        # Read content for database insert
        content = proposal_path.read_text(encoding="utf-8")
        title = _extract_proposal_title(content)
        content_hash = hashlib.md5(content.encode("utf-8")).hexdigest()
        
        # Determine proposal_type from filename pattern (e.g., "sop_update_", "research_")
        proposal_type = "unknown"
        fname_lower = filename.lower()
        if "sop" in fname_lower or "update" in fname_lower:
            proposal_type = "sop_update"
        elif "research" in fname_lower:
            proposal_type = "research"
        elif "friction" in fname_lower or "alert" in fname_lower:
            proposal_type = "friction_alert"
        elif "insight" in fname_lower or "digest" in fname_lower:
            proposal_type = "insight"
        
        # Set status based on action
        new_status = "approved" if action == "approve" else "rejected"
        reviewed_at = datetime.now().isoformat()
        
        # Update Status field in markdown before moving
        update_proposal_status_in_markdown(proposal_path, new_status)
        
        # Determine destination and move file
        if action == "approve":
            dest_dir = repo_root / "scholar" / "outputs" / "proposals" / "approved"
        else:
            dest_dir = repo_root / "scholar" / "outputs" / "proposals" / "rejected"
        
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / filename
        proposal_path.rename(dest)
        _write_proposal_metadata(dest, content, repo_root, new_status, reviewed_at, title, content_hash)
        
        # Insert or update in database
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO scholar_proposals 
                (filename, filepath, title, proposal_type, status, created_at, reviewed_at, reviewer_notes, content_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(filename) DO UPDATE SET
                filepath = excluded.filepath,
                status = excluded.status,
                reviewed_at = excluded.reviewed_at,
                reviewer_notes = excluded.reviewer_notes
            """,
            (
                filename,
                str(dest.relative_to(repo_root)),
                title,
                proposal_type,
                new_status,
                reviewed_at,  # created_at (on conflict, not updated)
                reviewed_at,
                reviewer_notes,
                content_hash
            )
        )
        conn.commit()
        conn.close()
        
        message = f"Proposal {new_status} and moved to {dest.relative_to(repo_root)}"
        
        return jsonify({
            "ok": True,
            "action": action,
            "status": new_status,
            "reviewed_at": reviewed_at,
            "message": message
        })
    except Exception as e:
        return jsonify({"ok": False, "message": f"Error processing proposal: {e}"}), 500


@dashboard_bp.route("/api/scholar/proposals/check-similar", methods=["GET"])
def api_scholar_check_similar():
    """Check for similar existing proposals to warn about duplicates.
    
    Query params:
        title (required): Title of the candidate proposal
        scope (optional): Scope text to include in similarity check
    
    Returns:
        List of similar proposals with similarity scores (> 0.5)
    """
    try:
        title = request.args.get("title", "").strip()
        scope = request.args.get("scope", "").strip()
        
        if not title:
            return jsonify({"ok": False, "message": "title parameter is required"}), 400
        
        similar = check_proposal_similarity(title, scope)
        
        return jsonify({
            "ok": True,
            "query": {"title": title, "scope": scope},
            "similar_proposals": similar,
            "has_duplicates": len(similar) > 0
        })
    except Exception as e:
        return jsonify({"ok": False, "message": f"Error checking similarity: {e}"}), 500


@dashboard_bp.route("/api/scholar/execute-via-ai", methods=["POST"])
def api_scholar_execute_via_ai():
    repo_root = Path(__file__).parent.parent.parent.resolve()
    run_dir = repo_root / "scholar" / "outputs" / "orchestrator_runs"
    run_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    log_path = run_dir / f"unattended_{timestamp}.log"
    final_path = run_dir / f"unattended_final_{timestamp}.md"
    questions_path = run_dir / f"questions_needed_{timestamp}.md"
    
    # Simple preservation check (last file only)
    existing_questions_to_preserve = []
    question_files = sorted(run_dir.glob("questions_needed_*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    if question_files:
        try:
            content = question_files[0].read_text(encoding="utf-8")
            # Minimal extraction for speed (assumes not empty and not answered)
            if "Q:" not in content and content != "(none)":
                 for line in content.split("\n"):
                    if line.strip() and not line.strip().startswith(("#", "A:")):
                         existing_questions_to_preserve.append(line.strip())
        except:
            pass

    execution_request = run_dir / f"_ai_execution_request_{timestamp}.md"
    request_content = f"# Scholar Execution Request - {timestamp}\n\n"
    request_content += f"Run ID: {timestamp}\n"
    request_content += f"Log: {log_path.relative_to(repo_root)}\n"
    request_content += f"Final: {final_path.relative_to(repo_root)}\n"
    
    execution_request.write_text(request_content, encoding="utf-8")
    
    return jsonify({
        "ok": True,
        "message": "Scholar execution requested via AI assistant",
        "run_id": timestamp,
        "execution_request_file": str(execution_request.relative_to(repo_root)),
    })


@dashboard_bp.route("/api/resume")
def api_resume():
    resume_md = generate_resume()
    if not resume_md:
        return Response("No sessions found.", mimetype="text/plain")
    return Response(resume_md, mimetype="text/plain")


@dashboard_bp.route("/api/resume/download")
def api_resume_download():
    resume_md = generate_resume()
    if not resume_md:
        return Response("No sessions found.", mimetype="text/plain")

    temp_path = Path("session_resume.md")
    temp_path.write_text(resume_md, encoding="utf-8")
    return send_file(
        temp_path,
        as_attachment=True,
        download_name="session_resume.md",
        mimetype="text/markdown",
    )


@dashboard_bp.route("/api/upload", methods=["POST"])
def api_upload():
    if "file" not in request.files:
        return jsonify({"ok": False, "message": "No file part in request."}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"ok": False, "message": "No selected file."}), 400
    if not allowed_file(file.filename):
        return (
            jsonify({"ok": False, "message": "Unsupported file type. Use .md/.txt."}),
            400,
        )

    filename = secure_filename(file.filename)
    dest_path = Path(SESSION_LOGS_DIR) / filename

    try:
        file.save(dest_path)
    except Exception as exc:
        return jsonify({"ok": False, "message": f"Failed to save file: {exc}"}), 500

    try:
        data = parse_session_log(dest_path)
    except Exception as exc:
        return (
            jsonify({"ok": False, "message": f"Parse error: {exc}"}),
            400,
        )

    ok, msg = insert_session_data(data)
    status = 200 if ok else 400
    return jsonify({"ok": ok, "message": msg, "filename": filename}), status


@dashboard_bp.route("/api/quick_session", methods=["POST"])
def api_quick_session():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"ok": False, "message": "No JSON data provided."}), 400

        # Validate required fields
        required_fields = ["topic", "study_mode", "time_spent_minutes", "understanding_level"]
        for field in required_fields:
            if field not in data or data[field] in [None, ""]:
                return jsonify({"ok": False, "message": f"Missing required field: {field}"}), 400

        main_topic = (data.get("topic") or data.get("main_topic") or "").strip()
        duration_val = data.get("time_spent_minutes") or data.get("duration_minutes")
        if not main_topic:
            return jsonify({"ok": False, "message": "Missing required field: topic"}), 400
        if duration_val in [None, ""]:
            return jsonify({"ok": False, "message": "Missing required field: time_spent_minutes"}), 400

        # Map to v9.1 schema fields
        session_data = {
            "session_date": data.get("session_date", datetime.now().strftime("%Y-%m-%d")),
            "session_time": data.get("session_time", datetime.now().strftime("%H:%M")),
            "duration_minutes": int(duration_val),
            "study_mode": data["study_mode"],
            "target_exam": data.get("target_exam", "").strip(),
            "source_lock": data.get("source_lock", "").strip(),
            "plan_of_attack": data.get("plan_of_attack", "").strip(),
            "main_topic": main_topic,
            "subtopics": data.get("subtopics", "").strip(),
            "frameworks_used": data.get("frameworks_used", "").strip(),
            "gated_platter_triggered": data.get("gated_platter_triggered", "No"),
            "wrap_phase_reached": data.get("wrap_phase_reached", "No"),
            "anki_cards_count": int(data.get("anki_cards_count", 0)),
            "region_covered": data.get("region_covered", "").strip(),
            "landmarks_mastered": data.get("landmarks_mastered", "").strip(),
            "muscles_attached": data.get("muscles_attached", "").strip(),
            "oian_completed_for": data.get("oian_completed_for", "").strip(),
            "rollback_events": data.get("rollback_events", "").strip(),
            "drawing_used": data.get("drawing_used", "").strip(),
            "drawings_completed": data.get("drawings_completed", "").strip(),
            "understanding_level": int(data["understanding_level"]),
            "retention_confidence": int(data.get("retention_confidence", 3)),
            "system_performance": int(data.get("system_performance", 3)),
            "calibration_check": data.get("calibration_check", "").strip(),
            "anchors_locked": data.get("anchors_locked", "").strip(),
            "anchors_mastery": data.get("anchors_mastery", "").strip(),
            "what_worked": data.get("what_worked", "").strip(),
            "what_needs_fixing": data.get("what_needs_fixing", "").strip(),
            "gaps_identified": data.get("gaps_identified", "").strip(),
            "notes_insights": data.get("notes_insights", "").strip(),
            "next_topic": data.get("next_topic", "").strip(),
            "next_focus": data.get("next_focus", "").strip(),
            "next_materials": data.get("next_materials", "").strip(),
            # WRAP v9.2 fields
            "anki_cards_text": data.get("anki_cards_text", "").strip(),
            "glossary_entries": data.get("glossary_entries", "").strip(),
            "wrap_watchlist": data.get("wrap_watchlist", "").strip(),
            "clinical_links": data.get("clinical_links", "").strip(),
            "next_session_plan": data.get("next_session_plan", "").strip(),
            "spaced_reviews": data.get("spaced_reviews", "").strip(),
            "runtime_notes": data.get("runtime_notes", "").strip(),
            "errors_conceptual": data.get("errors_conceptual", "").strip(),
            "errors_discrimination": data.get("errors_discrimination", "").strip(),
            "errors_recall": data.get("errors_recall", "").strip(),
            "created_at": datetime.now().isoformat(),
            "schema_version": "9.2",
        }

        # Validate score ranges
        for score_field in ["understanding_level", "retention_confidence", "system_performance"]:
            score = session_data[score_field]
            if score < SCORE_MIN or score > SCORE_MAX:
                return jsonify({"ok": False, "message": f"{score_field} must be between {SCORE_MIN} and {SCORE_MAX}"}), 400

        # Insert into database
        ok, msg = insert_session_data(session_data)
        status = 200 if ok else 400
        return jsonify({"ok": ok, "message": msg}), status

    except ValueError as e:
        return jsonify({"ok": False, "message": f"Invalid number format: {e}"}), 400
    except Exception as e:
        return jsonify({"ok": False, "message": f"Server error: {e}"}), 500


@dashboard_bp.route("/api/sessions", methods=["POST"])
def api_create_session():
    """Create a new session from JSON payload (Fast Entry)."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"ok": False, "error": "Missing JSON body"}), 400
        
        # Build session data from fast entry format
        session_data = {
            "session_date": data.get("date") or datetime.now().strftime("%Y-%m-%d"),
            "time_of_day": data.get("time") or datetime.now().strftime("%H:%M"),
            "study_mode": data.get("study_mode", "Core"),
            "time_spent_minutes": int(data.get("time_spent_minutes", 30)),
            "main_topic": data.get("topic", "General Study"),
            "subtopics": data.get("subtopics", ""),
            "understanding_level": int(data.get("understanding_level", 3)),
            "retention_confidence": int(data.get("retention_confidence", 3)),
            "system_performance": int(data.get("system_performance", 3)),
            "frameworks_used": data.get("frameworks_used", ""),
            "anchors_locked": data.get("anchors_locked", ""),
            "anchors_mastery": data.get("anchors_mastery", ""),
            "what_worked": data.get("what_worked", ""),
            "what_needs_fixing": data.get("what_needs_fixing", ""),
            "notes_insights": data.get("notes_insights", ""),
            "next_session_priority": data.get("next_session_priority", ""),
            # WRAP v9.2 fields
            "anki_cards_text": data.get("anki_cards_text", ""),
            "glossary_entries": data.get("glossary_entries", ""),
            "wrap_watchlist": data.get("wrap_watchlist", ""),
            "clinical_links": data.get("clinical_links", ""),
            "next_session_plan": data.get("next_session_plan", ""),
            "spaced_reviews": data.get("spaced_reviews", ""),
            "runtime_notes": data.get("runtime_notes", ""),
            "errors_conceptual": data.get("errors_conceptual", ""),
            "errors_discrimination": data.get("errors_discrimination", ""),
            "errors_recall": data.get("errors_recall", ""),
            # Required metadata fields
            "created_at": datetime.now().isoformat(),
            "schema_version": "9.2",
        }
        
        # Validate required fields
        if not session_data["main_topic"]:
            return jsonify({"ok": False, "error": "Topic is required"}), 400
        
        # Insert into database
        ok, msg = insert_session_data(session_data)
        if ok:
            return jsonify({"ok": True, "message": msg})
        else:
            return jsonify({"ok": False, "error": msg}), 400
            
    except ValueError as e:
        return jsonify({"ok": False, "error": f"Invalid value: {e}"}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": f"Server error: {e}"}), 500


@dashboard_bp.route("/api/sessions/<int:session_id>", methods=["GET"])
def api_get_session(session_id):
    """Get a single session by ID for editing."""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    row = cur.fetchone()
    conn.close()
    
    if not row:
        return jsonify({"ok": False, "error": "Session not found"}), 404
    
    session = dict(row)
    return jsonify({"ok": True, "session": session})


@dashboard_bp.route("/api/sessions/<int:session_id>", methods=["PUT"])
def api_update_session(session_id):
    """Update a session by ID."""
    conn = get_connection()
    cur = conn.cursor()
    
    # Check session exists
    cur.execute("SELECT id, source_path FROM sessions WHERE id = ?", (session_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify({"ok": False, "error": "Session not found"}), 404
    
    source_path = row[1] if len(row) > 1 else None
    
    data = request.get_json() or {}
    
    # Build update query dynamically
    updatable_fields = [
        'session_date', 'session_time', 'time_spent_minutes', 'duration_minutes',
        'study_mode', 'topic', 'main_topic', 'target_exam', 'source_lock',
        'plan_of_attack', 'subtopics', 'frameworks_used', 'sop_modules_used',
        'engines_used', 'region_covered', 'landmarks_mastered', 'muscles_attached',
        'understanding_level', 'retention_confidence', 'system_performance',
        'what_worked', 'what_needs_fixing', 'gaps_identified', 'notes_insights',
        'next_topic', 'next_focus', 'next_materials',
        # WRAP v9.2 fields
        'anki_cards_text', 'glossary_entries', 'wrap_watchlist', 'clinical_links',
        'next_session_plan', 'spaced_reviews', 'runtime_notes',
        'errors_conceptual', 'errors_discrimination', 'errors_recall'
    ]
    
    updates = []
    values = []
    for field in updatable_fields:
        if field in data:
            updates.append(f"{field} = ?")
            values.append(data[field])
    
    if not updates:
        conn.close()
        return jsonify({"ok": False, "error": "No fields to update"}), 400
    
    # Ensure main_topic is synced with topic
    if 'topic' in data and 'main_topic' not in data:
        updates.append("main_topic = ?")
        values.append(data['topic'])
    
    values.append(session_id)
    
    try:
        cur.execute(f"UPDATE sessions SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()
        
        # If source_path exists, sync changes back to markdown file
        if source_path and os.path.exists(source_path):
            try:
                # Get updated session data
                conn.row_factory = sqlite3.Row
                cur = conn.cursor()
                cur.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
                updated_row = cur.fetchone()
                if updated_row:
                    from session_sync import session_to_markdown
                    from db_setup import compute_file_checksum, mark_file_ingested
                    
                    session_dict = dict(updated_row)
                    md_content = session_to_markdown(session_dict)
                    with open(source_path, 'w', encoding='utf-8') as f:
                        f.write(md_content)
                    
                    # Update checksum tracking
                    new_checksum = compute_file_checksum(source_path)
                    mark_file_ingested(conn, source_path, new_checksum, session_id)
            except Exception as sync_err:
                # Log but don't fail the update
                print(f"[WARN] Could not sync to markdown: {sync_err}")
        
        conn.close()
        return jsonify({"ok": True, "message": "Session updated"})
    except Exception as e:
        conn.close()
        return jsonify({"ok": False, "error": str(e)}), 500


@dashboard_bp.route("/api/sessions/<int:session_id>", methods=["DELETE"])
def api_delete_session(session_id):
    """Delete a session by ID."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM sessions WHERE id = ?", (session_id,))
    if not cur.fetchone():
        conn.close()
        return jsonify({"ok": False, "message": "Session not found"}), 404
    cur.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "message": "Session deleted"})


# --------------------------------------------------------------------------
#  Sync / Ingestion Management Routes
# --------------------------------------------------------------------------

@dashboard_bp.route("/api/sync/status", methods=["GET"])
def api_sync_status():
    """Get ingestion tracking status from ingested_files table."""
    conn = get_connection()
    cur = conn.cursor()
    
    # Total files tracked
    cur.execute("SELECT COUNT(*) FROM ingested_files")
    total_files = cur.fetchone()[0]
    
    # Files with valid sessions (session_id IS NOT NULL)
    cur.execute("SELECT COUNT(*) FROM ingested_files WHERE session_id IS NOT NULL")
    valid_sessions = cur.fetchone()[0]
    
    # Files that failed validation (session_id IS NULL)
    cur.execute("SELECT COUNT(*) FROM ingested_files WHERE session_id IS NULL")
    failed_validation = cur.fetchone()[0]
    
    # Last sync timestamp
    cur.execute("SELECT MAX(ingested_at) FROM ingested_files")
    last_sync = cur.fetchone()[0]
    
    conn.close()
    
    return jsonify({
        "ok": True,
        "files_tracked": total_files,
        "valid_sessions": valid_sessions,
        "failed_validation": failed_validation,
        "last_sync": last_sync
    })


@dashboard_bp.route("/api/sync/run", methods=["POST"])
def api_sync_run():
    """Trigger a sync/re-ingestion of all .md files in session_logs/."""
    from ingest_session import ingest_file
    
    payload = request.get_json() or {}
    force = payload.get("force", False)
    
    # Get all .md files in session_logs directory
    if not os.path.exists(SESSION_LOGS_DIR):
        return jsonify({
            "ok": False,
            "error": f"Session logs directory not found: {SESSION_LOGS_DIR}"
        }), 404
    
    md_files = [
        os.path.join(SESSION_LOGS_DIR, f) 
        for f in os.listdir(SESSION_LOGS_DIR) 
        if f.endswith('.md') and not f.startswith('TEMPLATE') and not f.startswith('SAMPLE')
    ]
    
    ingested = 0
    skipped = 0
    errors = 0
    error_files = []
    
    for filepath in md_files:
        try:
            result = ingest_file(filepath, force=force)
            if result:
                # ingest_file returns True for both ingested and skipped (unchanged)
                # We can't easily distinguish, but let's count as ingested for now
                ingested += 1
            else:
                errors += 1
                error_files.append(os.path.basename(filepath))
        except Exception as e:
            errors += 1
            error_files.append(f"{os.path.basename(filepath)}: {str(e)}")
    
    return jsonify({
        "ok": True,
        "ingested": ingested,
        "skipped": skipped,
        "errors": errors,
        "error_files": error_files if error_files else None,
        "force": force
    })


@dashboard_bp.route("/api/sync/clear-tracking", methods=["POST"])
def api_sync_clear_tracking():
    """Clear all ingestion tracking records (for reset)."""
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("DELETE FROM ingested_files")
        deleted_count = cur.rowcount
        conn.commit()
        conn.close()
        
        return jsonify({
            "ok": True,
            "message": f"Cleared {deleted_count} ingestion tracking records"
        })
    except Exception as e:
        conn.close()
        return jsonify({
            "ok": False,
            "error": str(e)
        }), 500


@dashboard_bp.route("/api/tutor/session/start", methods=["POST"])
def api_tutor_session_start():
    """Start a new Tutor session."""
    payload = request.get_json() or {}
    session_id = payload.get("session_id") or datetime.now().strftime(
        "sess-%Y%m%d-%H%M%S"
    )
    mode = payload.get("mode", "Core")
    course_id = payload.get("course_id")
    
    return jsonify({
        "ok": True, 
        "session_id": session_id,
        "mode": mode,
        "course_id": course_id,
        "message": f"Tutor session started in {mode} mode"
    })


@dashboard_bp.route("/api/tutor/rag-docs", methods=["GET"])
def api_tutor_list_rag_docs():
    """List RAG documents for Source-Lock selection in the Tutor UI."""
    init_database()
    limit = int(request.args.get("limit") or 200)
    limit = max(1, min(limit, 1000))
    search = (request.args.get("search") or "").strip()
    doc_type = (request.args.get("doc_type") or "").strip()
    corpus = (request.args.get("corpus") or "").strip().lower()

    conditions: list[str] = []
    params: list[object] = []

    if doc_type:
        conditions.append("doc_type = ?")
        params.append(doc_type)

    if corpus:
        conditions.append("COALESCE(corpus, 'runtime') = ?")
        params.append(corpus)

    if search:
        like = f"%{search}%"
        conditions.append("(source_path LIKE ? OR topic_tags LIKE ? OR content LIKE ?)")
        params.extend([like, like, like])

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        f"""
        SELECT id, source_path, doc_type, topic_tags, course_id, created_at, updated_at,
               COALESCE(corpus, 'runtime') as corpus, COALESCE(folder_path, '') as folder_path,
               COALESCE(enabled, 1) as enabled
        FROM rag_docs
        WHERE {where_clause}
        ORDER BY id DESC
        LIMIT ?
        """,
        (*params, limit),
    )
    rows = cur.fetchall()
    conn.close()

    docs = [
        {
            "id": int(r["id"]),
            "source_path": r["source_path"],
            "doc_type": r["doc_type"],
            "topic_tags": r["topic_tags"] or "",
            "course_id": r["course_id"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
            "corpus": r["corpus"],
            "folder_path": r["folder_path"],
            "enabled": int(r["enabled"]),
        }
        for r in rows
    ]

    return jsonify({"ok": True, "docs": docs})


@dashboard_bp.route("/api/tutor/project-files/upload", methods=["POST"])
def api_tutor_upload_project_file():
    """Deprecated: file uploads are disabled (Study RAG is folder-synced)."""
    return jsonify({
        "ok": False,
        "message": "File uploads are disabled. Drop files into brain/data/study_rag and click Sync. Use 'Add Link' for YouTube/URLs.",
    }), 410


@dashboard_bp.route("/api/tutor/study/config")
def api_tutor_study_config():
    """Return the Study RAG folder configuration."""
    return jsonify({
        "ok": True,
        "root": str(STUDY_RAG_PATH),
        "exists": os.path.exists(STUDY_RAG_PATH),
    })


@dashboard_bp.route("/api/tutor/study/config", methods=["POST"])
def api_tutor_update_study_config():
    """Update the Study RAG folder path."""
    payload = request.get_json() or {}
    new_path = payload.get("path", "").strip()
    
    if not new_path:
        return jsonify({"ok": False, "message": "Path is required"}), 400
    
    # Expand and normalize the path
    expanded_path = os.path.abspath(os.path.expanduser(os.path.expandvars(new_path)))
    
    # Check if path exists
    if not os.path.exists(expanded_path):
        return jsonify({
            "ok": False, 
            "message": f"Path does not exist: {expanded_path}",
            "expanded_path": expanded_path
        }), 400
    
    if not os.path.isdir(expanded_path):
        return jsonify({
            "ok": False, 
            "message": f"Path is not a directory: {expanded_path}"
        }), 400
    
    # Save to api_config.json
    config = load_api_config()
    config["study_rag_path"] = expanded_path
    save_api_config(config)
    
    # Update the global STUDY_RAG_PATH
    global STUDY_RAG_PATH
    STUDY_RAG_PATH = Path(expanded_path)
    
    return jsonify({
        "ok": True,
        "root": str(STUDY_RAG_PATH),
        "exists": True,
        "message": f"Study RAG path updated to: {expanded_path}"
    })


@dashboard_bp.route("/api/tutor/study/sync", methods=["POST"])
def api_tutor_sync_study_folder():
    """Sync the Study RAG drop-folder into rag_docs."""
    try:
        result = sync_folder_to_rag(str(STUDY_RAG_PATH), corpus="study")
        return jsonify({
            "ok": True,
            "root": result.get("root"),
            "processed": result.get("processed", 0),
            "errors": result.get("errors", []),
            "message": f"Synced Study folder. Files processed: {result.get('processed', 0)}",
        })
    except Exception as exc:
        return jsonify({"ok": False, "message": f"Study sync failed: {exc}"}), 500


@dashboard_bp.route("/api/tutor/study/folders", methods=["GET"])
def api_tutor_list_study_folders():
    """List Study RAG folders (relative) with enabled status and doc counts."""
    init_database()
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        """
        SELECT COALESCE(folder_path, '') as folder_path,
               COUNT(*) as doc_count,
               MIN(COALESCE(enabled, 1)) as enabled
        FROM rag_docs
        WHERE COALESCE(corpus, 'runtime') = 'study'
        GROUP BY COALESCE(folder_path, '')
        ORDER BY folder_path
        """
    )
    rows = cur.fetchall()
    conn.close()
    folders = [
        {
            "folder_path": r["folder_path"],
            "doc_count": int(r["doc_count"]),
            "enabled": int(r["enabled"]),
        }
        for r in rows
    ]
    return jsonify({"ok": True, "root": str(STUDY_RAG_PATH), "folders": folders})


@dashboard_bp.route("/api/tutor/study/folders/set", methods=["POST"])
def api_tutor_set_study_folder_enabled():
    """Enable/disable a Study folder (applies recursively)."""
    payload = request.get_json() or {}
    folder_path = (payload.get("folder_path") or "").strip().replace("\\", "/")
    enabled = 1 if payload.get("enabled") in (True, 1, "1", "true", "True") else 0

    init_database()
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    if folder_path:
        like_prefix = folder_path.rstrip("/") + "/%"
        cur.execute(
            """
            UPDATE rag_docs
            SET enabled = ?, updated_at = ?
            WHERE COALESCE(corpus, 'runtime') = 'study'
              AND (COALESCE(folder_path, '') = ? OR COALESCE(folder_path, '') LIKE ?)
            """,
            (enabled, datetime.now().isoformat(timespec="seconds"), folder_path, like_prefix),
        )
    else:
        cur.execute(
            """
            UPDATE rag_docs
            SET enabled = ?, updated_at = ?
            WHERE COALESCE(corpus, 'runtime') = 'study'
            """,
            (enabled, datetime.now().isoformat(timespec="seconds")),
        )

    conn.commit()
    conn.close()
    return jsonify({"ok": True, "message": f"Study folder '{folder_path or '[root]'}' set to enabled={enabled}"})


@dashboard_bp.route("/api/rag/index-repo", methods=["POST"])
def api_rag_index_repo():
    """Index repository files (sop/, brain/, docs/) into rag_docs for RAG search."""
    try:
        repo_root = Path(__file__).parent.parent.parent.resolve()
        result = index_repo_to_rag(str(repo_root))
        return jsonify({
            "ok": result.get("ok", False),
            "processed": result.get("processed", 0),
            "chunks_created": result.get("chunks_created", 0),
            "errors": result.get("errors", []),
            "message": f"Indexed {result.get('processed', 0)} files into {result.get('chunks_created', 0)} chunks.",
        })
    except Exception as exc:
        return jsonify({"ok": False, "message": f"Repo indexing failed: {exc}"}), 500


@dashboard_bp.route("/api/rag/search", methods=["GET"])
def api_rag_search():
    """Search RAG documents for relevant content."""
    query = request.args.get("q", "").strip()
    corpus = request.args.get("corpus")  # Optional: filter by corpus
    limit = request.args.get("limit", 5, type=int)
    
    if not query:
        return jsonify({"ok": False, "message": "Missing query parameter 'q'"}), 400
    
    try:
        results = search_rag_docs(query, limit=limit, corpus=corpus)
        return jsonify({
            "ok": True,
            "query": query,
            "count": len(results),
            "results": results,
        })
    except Exception as exc:
        return jsonify({"ok": False, "message": f"Search failed: {exc}"}), 500


@dashboard_bp.route("/api/tutor/runtime/items", methods=["GET"])
def api_tutor_list_runtime_items():
    """List Runtime catalog items (systems/engines) with enable toggles."""
    init_database()

    # Ensure runtime catalog exists at least once
    repo_root = Path(__file__).parent.parent.parent.resolve()
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        """
        SELECT COUNT(*) as n
        FROM rag_docs
        WHERE COALESCE(corpus, 'runtime') = 'runtime'
          AND source_path LIKE 'runtime://%'
        """
    )
    n = int(cur.fetchone()["n"])
    conn.close()
    if n == 0:
        try:
            sync_runtime_catalog(str(repo_root))
        except Exception:
            # If it fails, still return an empty list.
            pass

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, source_path, folder_path, content, COALESCE(enabled, 1) as enabled
        FROM rag_docs
        WHERE COALESCE(corpus, 'runtime') = 'runtime'
          AND source_path LIKE 'runtime://%'
        ORDER BY COALESCE(folder_path, ''), source_path
        """
    )
    rows = cur.fetchall()
    conn.close()

    items = []
    for r in rows:
        source_path = r["source_path"] or ""
        key = source_path.replace("runtime://", "", 1)
        content = (r["content"] or "").strip()
        # description = second paragraph-ish; for UI keep short
        desc = ""
        parts = [p.strip() for p in content.split("\n\n") if p.strip()]
        if len(parts) >= 2:
            desc = parts[1]
        elif parts:
            desc = parts[0]
        if len(desc) > 240:
            desc = desc[:237].rstrip() + "..."
        items.append({
            "id": int(r["id"]),
            "key": key,
            "group": (r["folder_path"] or "Runtime"),
            "enabled": int(r["enabled"]),
            "description": desc,
        })

    return jsonify({"ok": True, "items": items})


@dashboard_bp.route("/api/tutor/runtime/items/set", methods=["POST"])
def api_tutor_set_runtime_item_enabled():
    payload = request.get_json() or {}
    try:
        doc_id = int(payload.get("id"))
    except Exception:
        return jsonify({"ok": False, "message": "id must be an integer"}), 400
    enabled = 1 if payload.get("enabled") in (True, 1, "1", "true", "True") else 0

    init_database()
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE rag_docs
        SET enabled = ?, updated_at = ?
        WHERE id = ?
          AND COALESCE(corpus, 'runtime') = 'runtime'
        """,
        (enabled, datetime.now().isoformat(timespec="seconds"), doc_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "message": f"Runtime item {doc_id} set to enabled={enabled}"})


@dashboard_bp.route("/api/tutor/links/add", methods=["POST"])
def api_tutor_add_link_doc():
    """Add a URL (e.g., YouTube link) into rag_docs for Source-Lock selection."""
    payload = request.get_json() or {}
    url = (payload.get("url") or "").strip()
    if not url:
        return jsonify({"ok": False, "message": "url is required"}), 400
    if not (url.startswith("http://") or url.startswith("https://")):
        return jsonify({"ok": False, "message": "url must start with http:// or https://"}), 400

    doc_type = (payload.get("doc_type") or "youtube").strip().lower() or "youtube"
    allowed_doc_types = {
        "note",
        "textbook",
        "transcript",
        "slide",
        "other",
        "powerpoint",
        "pdf",
        "txt",
        "mp4",
        "youtube",
    }
    if doc_type not in allowed_doc_types:
        doc_type = "youtube"

    raw_tags = (payload.get("tags") or "").strip()
    tags: list[str] = ["link"]
    if raw_tags:
        tags.extend([t.strip() for t in re.split(r"[,\n]", raw_tags) if t.strip()])

    course_id_raw = (payload.get("course_id") or "").strip()
    course_id = None
    if course_id_raw:
        try:
            course_id = int(course_id_raw)
        except ValueError:
            return jsonify({"ok": False, "message": "course_id must be an integer"}), 400

    try:
        doc_id = ingest_url_document(
            url=url,
            doc_type=doc_type,
            course_id=course_id,
            topic_tags=tags,
            content=(payload.get("content") or "").strip(),
            corpus="study",
            folder_path="links",
        )
    except Exception as exc:
        return jsonify({"ok": False, "message": f"Ingest failed: {exc}"}), 500

    return jsonify({
        "ok": True,
        "doc_id": doc_id,
        "doc_type": doc_type,
        "tags": tags,
        "message": f"Added link and ingested as RAG doc {doc_id}",
    })


@dashboard_bp.route("/api/tutor/session/turn", methods=["POST"])
def api_tutor_session_turn():
    """Process a Tutor conversation turn using Codex + RAG."""
    payload = request.get_json() or {}
    try:
        # Build source selector from payload
        sources = TutorSourceSelector(
            allowed_doc_ids=payload.get("sources", {}).get("allowed_doc_ids", []),
            allowed_kinds=payload.get("sources", {}).get("allowed_kinds", []),
            disallowed_doc_ids=payload.get("sources", {}).get(
                "disallowed_doc_ids", []
            ),
        )
        
        # Build query object
        query = TutorQueryV1(
            user_id=payload.get("user_id", "default"),
            session_id=payload.get("session_id"),
            course_id=payload.get("course_id"),
            topic_id=payload.get("topic_id"),
            mode=payload.get("mode", "Core"),
            question=payload.get("question", ""),
            plan_snapshot_json=payload.get("plan_snapshot_json", "{}"),
            sources=sources,
            notes_context_ids=payload.get("notes_context_ids", []),
        )
        
        if not query.question.strip():
            return jsonify({"ok": False, "message": "Question cannot be empty"}), 400
        
    except Exception as exc:
        return jsonify({"ok": False, "message": f"Invalid TutorQuery payload: {exc}"}), 400

    # Process the turn through the Tutor engine
    try:
        response = process_tutor_turn(query)
        
        # Log the turn to database
        turn_id = log_tutor_turn(query, response)
        
        # Convert citations to dict format
        citations_list = [
            {
                "doc_id": c.doc_id,
                "source_path": c.source_path,
                "doc_type": c.doc_type,
                "snippet": c.snippet
            }
            for c in response.citations
        ]
        
        return jsonify({
            "ok": True,
            "session_id": response.session_id,
            "turn_id": turn_id,
            "answer": response.answer,
            "citations": citations_list,
            "unverified": response.unverified,
            "summary": json.loads(response.summary_json) if response.summary_json else None
        })
        
    except Exception as exc:
        return jsonify({
            "ok": False, 
            "message": f"Tutor error: {exc}",
            "session_id": query.session_id or "error"
        }), 500


@dashboard_bp.route("/api/tutor/card-draft", methods=["POST"])
def api_tutor_create_card_draft():
    """Create a card draft from a Tutor turn."""
    payload = request.get_json() or {}
    
    turn_id = payload.get("turn_id")
    front = payload.get("front", "").strip()
    back = payload.get("back", "").strip()
    hook = payload.get("hook", "").strip() or None
    tags = payload.get("tags", "").strip() or None
    
    if not turn_id:
        return jsonify({"ok": False, "message": "turn_id is required"}), 400
    if not front or not back:
        return jsonify({"ok": False, "message": "front and back are required"}), 400
    
    try:
        card_id = create_card_draft_from_turn(turn_id, front, back, hook, tags)
        return jsonify({
            "ok": True,
            "card_id": card_id,
            "message": "Card draft created"
        })
    except Exception as exc:
        return jsonify({"ok": False, "message": f"Error creating card: {exc}"}), 500


@dashboard_bp.route("/api/syllabus/import", methods=["POST"])
def api_syllabus_import():
    payload = request.get_json() or {}
    try:
        course_data = {
            "name": (payload.get("name") or "").strip(),
            "code": (payload.get("code") or "").strip(),
            "term": (payload.get("term") or "").strip(),
            "instructor": (payload.get("instructor") or "").strip(),
            "default_study_mode": (payload.get("default_study_mode") or "Core").strip()
            or "Core",
            "time_budget_per_week_minutes": int(
                payload.get("time_budget_per_week_minutes") or 0
            ),
        }
        event = {
            "type": (payload.get("event_type") or "other").strip(),
            "title": (payload.get("event_title") or "").strip(),
            "date": (payload.get("event_date") or "").strip() or None,
            "due_date": (payload.get("event_due_date") or "").strip() or None,
            "weight": float(payload.get("event_weight") or 0.0),
            "raw_text": (payload.get("event_raw_text") or "").strip(),
        }
        if not event["title"]:
            return (
                jsonify({"ok": False, "message": "Event title is required."}),
                400,
            )

        course_id = upsert_course(course_data)
        inserted = import_events(course_id, [event], replace=False)
        return jsonify(
            {
                "ok": True,
                "course_id": course_id,
                "events_added": inserted,
                "message": f"Course saved and {inserted} event(s) added.",
            }
        )
    except Exception as exc:
        return (
            jsonify({"ok": False, "message": f"Syllabus import failed: {exc}"}),
            400,
        )


@dashboard_bp.route("/api/syllabus/import_bulk", methods=["POST"])
def api_syllabus_import_bulk():
    payload = request.get_json() or {}
    print(f"[DEBUG] api_syllabus_import_bulk payload type: {type(payload)}")
    
    try:
        # Handle list of courses (bulk)
        if isinstance(payload, list):
             print(f"[DEBUG] Received list of {len(payload)} courses")
             total_events = 0
             course_ids = []
             for course_data in payload:
                 if not isinstance(course_data, dict): continue
                 try:
                     cid = upsert_course(course_data)
                     events = course_data.get("events") or []
                     inserted = import_events(cid, events, replace=False)
                     total_events += inserted
                     course_ids.append(cid)
                 except Exception as e:
                     print(f"[ERROR] Failed to import course: {e}")
             
             return jsonify({
                 "ok": True,
                 "courses_processed": len(course_ids),
                 "events_added": total_events,
                 "message": f"Bulk import processed {len(course_ids)} courses and {total_events} events."
             })
             
        # Handle single course (original behavior but safer)
        if "name" in payload:
            print(f"[DEBUG] Received single course: {payload.get('name')}")
            course_id = upsert_course(payload)
            events = payload.get("events") or []
            inserted = import_events(course_id, events, replace=False)
            return jsonify(
                {
                    "ok": True,
                    "course_id": course_id,
                    "events_added": inserted,
                    "message": f"Bulk syllabus import complete: {inserted} event(s) added.",
                }
            )
        else:
             print("[DEBUG] Payload missing 'name', and is not a list.")
             return jsonify({"ok": False, "message": "Invalid JSON: Expected course object or list of courses."}), 400
             
    except Exception as exc:
        print(f"[ERROR] api_syllabus_import_bulk exception: {exc}")
        import traceback
        traceback.print_exc()
        return (
            jsonify({"ok": False, "message": f"Bulk syllabus import failed: {exc}"}),
            400,
        )


@dashboard_bp.route("/api/syllabus/courses")
def api_syllabus_courses():
    courses, events = fetch_all_courses_and_events()
    if not courses:
        return jsonify({"courses": [], "summary": {}})

    # Basic per-course counts
    events_by_course = {}
    for ev in events:
        cid = ev["course_id"]
        events_by_course.setdefault(cid, []).append(ev)

    today = datetime.now().date()
    summary_courses = []
    for c in courses:
        course_events = events_by_course.get(c["id"], [])
        total_events = len(course_events)
        upcoming_7 = 0
        upcoming_30 = 0
        exams_count = 0

        for ev in course_events:
            ev_type = (ev.get("type") or "").lower()
            date_str = ev.get("date") or ev.get("due_date")
            ev_date = None
            if date_str:
                try:
                    ev_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                except Exception:
                    ev_date = None

            if ev_type == "exam":
                exams_count += 1

            if ev_date and ev_date >= today:
                delta = (ev_date - today).days
                if delta <= 7:
                    upcoming_7 += 1
                if delta <= 30:
                    upcoming_30 += 1

        summary_courses.append(
            {
                **c,
                "events_total": total_events,
                "upcoming_7_days": upcoming_7,
                "upcoming_30_days": upcoming_30,
                "exams_count": exams_count,
            }
        )

    overall_summary = {
        "courses_count": len(courses),
        "events_count": len(events),
    }

    return jsonify(
        {
            "courses": summary_courses,
            "summary": overall_summary,
        }
    )


@dashboard_bp.route("/api/syllabus/study-tasks")
def api_syllabus_study_tasks():
    """
    Get study tasks - readings, topics, and ongoing items that span multiple days.
    These are better visualized as a to-do list rather than calendar events.
    """
    filter_status = request.args.get("filter", "active")  # active, all, completed
    
    courses, events = fetch_all_courses_and_events()
    
    # Build course lookup for names and colors
    course_lookup = {c["id"]: c for c in courses}
    
    # Filter for readings and topics (ongoing study items)
    study_types = ["reading", "other"]  # Types that span time
    study_tasks = []
    
    from datetime import datetime
    today = datetime.now().date()
    
    for ev in events:
        # Include readings, topics, and items without specific dates
        is_study_type = ev.get("type") in study_types
        has_date_range = ev.get("date") and ev.get("due_date") and ev.get("date") != ev.get("due_date")
        no_specific_date = not ev.get("date") and not ev.get("due_date")
        
        if is_study_type or has_date_range or no_specific_date:
            course = course_lookup.get(ev.get("course_id"), {})
            status = ev.get("status", "pending")
            
            # Calculate time context
            start_date = ev.get("date")
            end_date = ev.get("due_date") or ev.get("date")
            
            is_overdue = False
            is_current = False
            days_remaining = None
            
            if end_date:
                try:
                    end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
                    days_remaining = (end_dt - today).days
                    is_overdue = days_remaining < 0 and status != "completed"
                    
                    if start_date:
                        start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
                        is_current = start_dt <= today <= end_dt
                    else:
                        is_current = days_remaining >= 0 and days_remaining <= 7
                except:
                    pass
            
            task = {
                "id": ev["id"],
                "title": ev["title"],
                "type": ev["type"],
                "course_name": course.get("name", "Unknown"),
                "course_color": course.get("color"),
                "status": status,
                "start_date": start_date,
                "end_date": end_date,
                "raw_text": ev.get("raw_text", ""),
                "is_overdue": is_overdue,
                "is_current": is_current,
                "days_remaining": days_remaining,
            }
            
            # Apply filter
            if filter_status == "active" and status == "completed":
                continue
            elif filter_status == "completed" and status != "completed":
                continue
            
            study_tasks.append(task)
    
    # Sort: overdue first, then current, then by end date
    def sort_key(t):
        if t["is_overdue"]:
            return (0, t.get("end_date") or "9999")
        if t["is_current"]:
            return (1, t.get("end_date") or "9999")
        return (2, t.get("end_date") or "9999")
    
    study_tasks.sort(key=sort_key)
    
    # Calculate stats
    total = len([e for e in events if e.get("type") in study_types or not e.get("date")])
    completed = len([e for e in events if e.get("status") == "completed" and (e.get("type") in study_types or not e.get("date"))])
    in_progress = len([t for t in study_tasks if t["is_current"] and t["status"] != "completed"])
    pending = total - completed - in_progress
    
    return jsonify({
        "ok": True,
        "tasks": study_tasks,
        "stats": {
            "total": total,
            "pending": pending,
            "in_progress": in_progress,
            "completed": completed,
            "progress_pct": round(completed / total * 100) if total > 0 else 0,
        }
    })


@dashboard_bp.route("/api/syllabus/events")
def api_syllabus_events():
    course_id_raw = request.args.get("course_id")
    try:
        course_id = int(course_id_raw) if course_id_raw else None
    except ValueError:
        return jsonify({"ok": False, "message": "Invalid course_id"}), 400

    courses, events = fetch_all_courses_and_events()
    if course_id is not None:
        events = [ev for ev in events if ev["course_id"] == course_id]

    raw_sessions = get_all_sessions()
    sessions = [dict(s) for s in raw_sessions]

    enriched_events = attach_event_analytics(events, sessions)

    return jsonify(
        {
            "ok": True,
            "events": enriched_events,
            "thresholds": {
                "weak": WEAK_THRESHOLD,
                "strong": STRONG_THRESHOLD,
                "stale_days": STALE_DAYS,
                "fresh_days": FRESH_DAYS,
            },
        }
    )


# Default color palette for courses (12 professional colors)
COURSE_COLOR_PALETTE = [
    "#EF4444",  # Red
    "#F97316",  # Orange
    "#F59E0B",  # Amber
    "#84CC16",  # Lime
    "#10B981",  # Emerald
    "#06B6D4",  # Cyan
    "#3B82F6",  # Blue
    "#6366F1",  # Indigo
    "#8B5CF6",  # Violet
    "#EC4899",  # Pink
    "#64748B",  # Slate
    "#78716C",  # Stone
]


@dashboard_bp.route("/api/syllabus/course/<int:course_id>/color", methods=["PATCH"])
def api_update_course_color(course_id):
    """Update the color of a course."""
    payload = request.get_json() or {}
    color = payload.get("color", "").strip()
    
    # Validate hex color format
    if color and not (color.startswith("#") and len(color) == 7):
        return jsonify({"ok": False, "message": "Invalid color format. Use #RRGGBB"}), 400
    
    init_database()
    conn = get_connection()
    cur = conn.cursor()
    
    # Check course exists
    cur.execute("SELECT id FROM courses WHERE id = ?", (course_id,))
    if not cur.fetchone():
        conn.close()
        return jsonify({"ok": False, "message": "Course not found"}), 404
    
    # Update color
    cur.execute("UPDATE courses SET color = ? WHERE id = ?", (color or None, course_id))
    conn.commit()
    conn.close()
    
    return jsonify({"ok": True, "message": "Course color updated", "color": color or None})


@dashboard_bp.route("/api/syllabus/event/<int:event_id>/status", methods=["PATCH"])
def api_update_event_status(event_id):
    """Update the status of a course event (pending/completed/cancelled)."""
    payload = request.get_json() or {}
    status = payload.get("status", "").strip().lower()
    
    valid_statuses = ["pending", "completed", "cancelled"]
    if status not in valid_statuses:
        return jsonify({
            "ok": False, 
            "message": f"Invalid status. Use one of: {', '.join(valid_statuses)}"
        }), 400
    
    init_database()
    conn = get_connection()
    cur = conn.cursor()
    
    # Check event exists
    cur.execute("SELECT id, course_id, title FROM course_events WHERE id = ?", (event_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify({"ok": False, "message": "Event not found"}), 404
    
    event_title = row[2]
    
    # Update status
    cur.execute("UPDATE course_events SET status = ? WHERE id = ?", (status, event_id))
    conn.commit()
    conn.close()
    
    return jsonify({
        "ok": True, 
        "message": f"Event '{event_title}' marked as {status}",
        "status": status
    })


@dashboard_bp.route("/api/syllabus/event/<int:event_id>", methods=["PUT", "PATCH", "DELETE"])
def api_update_event(event_id):
    """Update or delete a course event."""
    init_database()
    conn = get_connection()
    cur = conn.cursor()
    
    # Check event exists
    cur.execute("SELECT id, course_id, title FROM course_events WHERE id = ?", (event_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify({"ok": False, "message": "Event not found"}), 404

    if request.method == "DELETE":
        try:
            cur.execute("DELETE FROM course_events WHERE id = ?", (event_id,))
            conn.commit()
            conn.close()
            return jsonify({"ok": True, "message": "Event deleted successfully", "event_id": event_id})
        except Exception as e:
            conn.close()
            return jsonify({"ok": False, "message": f"Failed to delete event: {e}"}), 500

    payload = request.get_json() or {}
    
    # Build update query dynamically based on provided fields
    update_fields = []
    update_values = []
    
    if "title" in payload:
        update_fields.append("title = ?")
        update_values.append(payload["title"].strip())
    if "event_type" in payload:
        valid_types = ["lecture", "reading", "quiz", "exam", "assignment", "other"]
        if payload["event_type"] not in valid_types:
            conn.close()
            return jsonify({"ok": False, "message": f"Invalid event_type. Use one of: {', '.join(valid_types)}"}), 400
        update_fields.append("event_type = ?")
        update_values.append(payload["event_type"])
    if "course_id" in payload:
        try:
            new_course_id = int(payload["course_id"])
        except Exception:
            conn.close()
            return jsonify({"ok": False, "message": "Invalid course_id"}), 400
        # Validate course exists
        cur.execute("SELECT id FROM courses WHERE id = ?", (new_course_id,))
        if not cur.fetchone():
            conn.close()
            return jsonify({"ok": False, "message": "Course not found"}), 404
        update_fields.append("course_id = ?")
        update_values.append(new_course_id)
    if "date" in payload:
        update_fields.append("date = ?")
        update_values.append(payload["date"])
    if "due_date" in payload:
        update_fields.append("due_date = ?")
        update_values.append(payload["due_date"])
    if "weight" in payload:
        update_fields.append("weight = ?")
        update_values.append(payload["weight"])
    if "raw_text" in payload:
        update_fields.append("raw_text = ?")
        update_values.append(payload["raw_text"])
    if "status" in payload:
        valid_statuses = ["pending", "completed", "cancelled"]
        if payload["status"] not in valid_statuses:
            conn.close()
            return jsonify({"ok": False, "message": f"Invalid status. Use one of: {', '.join(valid_statuses)}"}), 400
        update_fields.append("status = ?")
        update_values.append(payload["status"])
    
    if not update_fields:
        conn.close()
        return jsonify({"ok": False, "message": "No fields to update"}), 400
    
    update_values.append(event_id)
    query = f"UPDATE course_events SET {', '.join(update_fields)} WHERE id = ?"
    cur.execute(query, update_values)
    conn.commit()
    conn.close()
    
    return jsonify({
        "ok": True,
        "message": "Event updated successfully",
        "event_id": event_id
    })


@dashboard_bp.route("/api/syllabus/event/<int:event_id>/schedule_reviews", methods=["POST"])
def api_schedule_m6_reviews(event_id):
    """
    Schedule M6-based spaced repetition reviews for a course event.
    Creates study_tasks at: +1 day, +3 days, +7 days from today.
    """
    payload = request.get_json() or {}
    base_date_str = payload.get("base_date")  # Optional: start from this date
    
    init_database()
    conn = get_connection()
    cur = conn.cursor()
    
    # Get event details
    cur.execute(
        "SELECT id, course_id, title FROM course_events WHERE id = ?", 
        (event_id,)
    )
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify({"ok": False, "message": "Event not found"}), 404
    
    _, course_id, event_title = row
    
    # Determine base date
    if base_date_str:
        try:
            base_date = datetime.strptime(base_date_str, "%Y-%m-%d").date()
        except ValueError:
            conn.close()
            return jsonify({"ok": False, "message": "Invalid date format (use YYYY-MM-DD)"}), 400
    else:
        base_date = datetime.now().date()
    
    # M6-wrap intervals: 1 day, 3 days, 7 days
    intervals = [
        (1, 10, "Review 1: Quick recall (24h)"),
        (3, 15, "Review 2: Mixed questions (3 days)"),
        (7, 20, "Review 3: Self-test/teach-back (7 days)"),
    ]
    
    now = datetime.now().isoformat(timespec="seconds")
    created_tasks = []
    
    for days_offset, minutes, note_template in intervals:
        scheduled_date = (base_date + timedelta(days=days_offset)).isoformat()
        notes = f"{note_template} - {event_title}"
        
        cur.execute(
            """
            INSERT INTO study_tasks (
                course_id, course_event_id, scheduled_date, 
                planned_minutes, status, notes, created_at
            )
            VALUES (?, ?, ?, ?, 'pending', ?, ?)
            """,
            (course_id, event_id, scheduled_date, minutes, notes, now)
        )
        created_tasks.append({
            "id": cur.lastrowid,
            "scheduled_date": scheduled_date,
            "planned_minutes": minutes,
            "notes": notes,
        })
    
    conn.commit()
    conn.close()
    
    return jsonify({
        "ok": True,
        "message": f"Scheduled {len(created_tasks)} M6 review sessions for '{event_title}'",
        "tasks": created_tasks,
    })


@dashboard_bp.route("/api/syllabus/colors/palette")
def api_color_palette():
    """Return the default color palette for courses."""
    return jsonify({
        "ok": True,
        "palette": COURSE_COLOR_PALETTE,
    })


@dashboard_bp.route("/api/calendar/data")
def api_calendar_data():
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")
    course_id_raw = request.args.get("course_id")
    event_type = request.args.get("event_type")

    today = datetime.now().date()
    start_date = (
        datetime.strptime(start_date_str, "%Y-%m-%d").date()
        if start_date_str
        else today - timedelta(days=7)
    )
    end_date = (
        datetime.strptime(end_date_str, "%Y-%m-%d").date()
        if end_date_str
        else today + timedelta(days=60)
    )

    try:
        course_id = int(course_id_raw) if course_id_raw else None
    except ValueError:
        course_id = None

    result = get_calendar_data(start_date, end_date, course_id, event_type)
    return jsonify(result)


@dashboard_bp.route("/api/calendar/plan_session", methods=["POST"])
def api_calendar_plan_session():
    payload = request.get_json() or {}
    try:
        course_id = payload.get("course_id")
        topic_id = payload.get("topic_id")
        course_event_id = payload.get("course_event_id")
        scheduled_date = payload.get("scheduled_date", "").strip()
        planned_minutes = int(payload.get("planned_minutes") or 60)
        notes = (payload.get("notes") or "").strip()

        if not scheduled_date:
            return jsonify({"ok": False, "message": "scheduled_date is required"}), 400

        try:
            datetime.strptime(scheduled_date, "%Y-%m-%d")
        except ValueError:
            return jsonify({"ok": False, "message": "Invalid date format (use YYYY-MM-DD)"}), 400

        init_database()
        conn = get_connection()
        cur = conn.cursor()

        now = datetime.now().isoformat(timespec="seconds")
        cur.execute(
            """
            INSERT INTO study_tasks (
                course_id, topic_id, course_event_id,
                scheduled_date, planned_minutes, status, notes,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
            """,
            (course_id, topic_id, course_event_id, scheduled_date, planned_minutes, notes, now),
        )
        task_id = cur.lastrowid
        conn.commit()
        conn.close()

        return jsonify(
            {
                "ok": True,
                "task_id": task_id,
                "message": f"Planned session created for {scheduled_date}",
            }
        )
    except Exception as exc:
        return jsonify({"ok": False, "message": f"Failed to create planned session: {exc}"}), 400


# ---------------------------------------------------------------------------
# Card Draft Endpoints (Tutor -> Anki pipeline)
# ---------------------------------------------------------------------------

@dashboard_bp.route("/api/cards/draft", methods=["POST"])
def api_create_card_draft():
    """
    Create a new card draft from Tutor.
    
    Expected JSON payload:
        session_id: str (e.g., "sess-20260109-143022")
        course_id: int (optional)
        topic_id: int (optional)
        deck_name: str (default "PT Study::Default")
        card_type: str ("basic", "cloze", "image_occlusion")
        front: str (required)
        back: str (required)
        tags: str (comma-separated, optional)
        source_citation: str (optional)
    
    Returns:
        JSON with ok, card_id, message
    """
    payload = request.get_json() or {}
    
    try:
        # Required fields
        front = (payload.get("front") or "").strip()
        back = (payload.get("back") or "").strip()
        
        if not front or not back:
            return jsonify({"ok": False, "message": "front and back are required"}), 400
        
        # Optional fields with defaults
        session_id = payload.get("session_id")
        course_id = payload.get("course_id")
        topic_id = payload.get("topic_id")
        deck_name = payload.get("deck_name", "PT Study::Default")
        card_type = payload.get("card_type", "basic")
        tags = payload.get("tags", "")
        source_citation = payload.get("source_citation", "")
        
        # Validate card_type
        valid_types = ("basic", "cloze", "image_occlusion")
        if card_type not in valid_types:
            return jsonify({
                "ok": False, 
                "message": f"card_type must be one of: {', '.join(valid_types)}"
            }), 400
        
        init_database()
        conn = get_connection()
        cur = conn.cursor()
        
        now = datetime.now().isoformat(timespec="seconds")
        cur.execute(
            """
            INSERT INTO card_drafts (
                session_id, course_id, topic_id, deck_name,
                card_type, front, back, tags, source_citation,
                status, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            """,
            (session_id, course_id, topic_id, deck_name,
             card_type, front, back, tags, source_citation, now)
        )
        card_id = cur.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            "ok": True,
            "card_id": card_id,
            "message": "Card draft created"
        })
        
    except Exception as exc:
        return jsonify({"ok": False, "message": f"Failed to create card draft: {exc}"}), 400


@dashboard_bp.route("/api/cards/drafts", methods=["GET"])
def api_list_card_drafts():
    """
    List card drafts with optional filtering.
    
    Query params:
        status: Filter by status (pending, approved, rejected, synced)
        course_id: Filter by course
        limit: Max results (default 100)
    
    Returns:
        JSON with ok, drafts (list), count
    """
    try:
        status_filter = request.args.get("status")
        course_id = request.args.get("course_id")
        limit = int(request.args.get("limit", 100))
        
        init_database()
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        query = "SELECT * FROM card_drafts WHERE 1=1"
        params = []
        
        if status_filter:
            query += " AND status = ?"
            params.append(status_filter)
        
        if course_id:
            query += " AND course_id = ?"
            params.append(int(course_id))
        
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        
        cur.execute(query, params)
        rows = cur.fetchall()
        conn.close()
        
        drafts = [dict(row) for row in rows]
        
        return jsonify({
            "ok": True,
            "drafts": drafts,
            "count": len(drafts)
        })
        
    except Exception as exc:
        return jsonify({"ok": False, "message": f"Failed to list drafts: {exc}"}), 400


@dashboard_bp.route("/api/cards/drafts/<int:draft_id>", methods=["PATCH"])
def api_update_card_draft(draft_id: int):
    """
    Update a card draft (approve, reject, edit).
    
    Expected JSON payload:
        status: "approved" | "rejected" | "pending"
        front: str (optional - update content)
        back: str (optional - update content)
        tags: str (optional)
    
    Returns:
        JSON with ok, message
    """
    payload = request.get_json() or {}
    
    try:
        init_database()
        conn = get_connection()
        cur = conn.cursor()
        
        # Check draft exists
        cur.execute("SELECT id, status FROM card_drafts WHERE id = ?", (draft_id,))
        row = cur.fetchone()
        
        if not row:
            conn.close()
            return jsonify({"ok": False, "message": "Draft not found"}), 404
        
        current_status = row[1]
        
        # Build update query dynamically
        updates = []
        params = []
        
        if "status" in payload:
            new_status = payload["status"]
            valid_statuses = ("pending", "approved", "rejected", "synced")
            if new_status not in valid_statuses:
                conn.close()
                return jsonify({
                    "ok": False,
                    "message": f"status must be one of: {', '.join(valid_statuses)}"
                }), 400
            updates.append("status = ?")
            params.append(new_status)
        
        if "front" in payload:
            updates.append("front = ?")
            params.append(payload["front"])
        
        if "back" in payload:
            updates.append("back = ?")
            params.append(payload["back"])
        
        if "tags" in payload:
            updates.append("tags = ?")
            params.append(payload["tags"])
        
        if not updates:
            conn.close()
            return jsonify({"ok": False, "message": "No fields to update"}), 400
        
        query = f"UPDATE card_drafts SET {', '.join(updates)} WHERE id = ?"
        params.append(draft_id)
        
        cur.execute(query, params)
        conn.commit()
        conn.close()
        
        return jsonify({
            "ok": True,
            "message": f"Draft {draft_id} updated"
        })
        
    except Exception as exc:
        return jsonify({"ok": False, "message": f"Failed to update draft: {exc}"}), 400


@dashboard_bp.route("/api/cards/drafts/pending", methods=["GET"])
def api_pending_card_drafts():
    """
    Get count and list of pending card drafts ready for review.
    
    Returns:
        JSON with ok, pending_count, drafts (list)
    """
    try:
        init_database()
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        cur.execute(
            """
            SELECT * FROM card_drafts 
            WHERE status = 'pending' 
            ORDER BY created_at DESC
            LIMIT 50
            """
        )
        rows = cur.fetchall()
        
        cur.execute("SELECT COUNT(*) FROM card_drafts WHERE status = 'pending'")
        total_pending = cur.fetchone()[0]
        
        conn.close()
        
        drafts = [dict(row) for row in rows]
        
        return jsonify({
            "ok": True,
            "pending_count": total_pending,
            "drafts": drafts
        })
        
    except Exception as exc:
        return jsonify({"ok": False, "message": f"Failed to get pending drafts: {exc}"}), 400


@dashboard_bp.route("/api/cards/sync", methods=["POST"])
def api_sync_cards_to_anki():
    """
    Sync approved card drafts to Anki via Anki Connect.
    
    Expected JSON payload (optional):
        dry_run: bool (default False) - Preview without syncing
    
    Returns:
        JSON with ok, synced_count, errors, message
    """
    payload = request.get_json() or {}
    dry_run = payload.get("dry_run", False)
    
    try:
        # Import anki_sync module
        import sys
        from pathlib import Path
        brain_path = Path(__file__).parent.parent
        if str(brain_path) not in sys.path:
            sys.path.insert(0, str(brain_path))
        
        from anki_sync import sync_pending_cards
        
        result = sync_pending_cards(dry_run=dry_run)
        
        return jsonify({
            "ok": True,
            "synced_count": result.get("synced", 0),
            "errors": result.get("errors", []),
            "message": f"Synced {result.get('synced', 0)} cards to Anki"
        })
        
    except ImportError as exc:
        return jsonify({
            "ok": False,
            "message": f"Anki sync module not available: {exc}"
        }), 500
    except Exception as exc:
        return jsonify({"ok": False, "message": f"Sync failed: {exc}"}), 400


# ============================================================================
# GOOGLE CALENDAR INTEGRATION
# ============================================================================

@dashboard_bp.route('/api/gcal/status', methods=['GET'])
def gcal_status():
    """Check Google Calendar authentication status"""
    from .gcal import check_auth_status
    return jsonify(check_auth_status())


@dashboard_bp.route('/api/gcal/auth/start', methods=['GET'])
def gcal_auth_start():
    """Start Google Calendar OAuth flow"""
    from .gcal import get_auth_url
    url, state = get_auth_url()
    if url:
        return jsonify({'auth_url': url, 'state': state})
    else:
        return jsonify({'error': state}), 400


@dashboard_bp.route('/api/gcal/oauth/callback', methods=['GET'])
def gcal_oauth_callback():
    """Handle OAuth callback from Google"""
    from .gcal import complete_oauth
    code = request.args.get('code')
    if not code:
        return "Missing authorization code", 400
    
    success, message = complete_oauth(code)
    if success:
        # Return HTML that closes popup and notifies parent
        return """
        <html>
        <body>
        <script>
            if (window.opener) {
                window.opener.postMessage({type: 'gcal-auth-success'}, '*');
            }
            window.close();
        </script>
        <p>Successfully connected! You can close this window.</p>
        </body>
        </html>
        """
    else:
        return f"<html><body><p>Error: {message}</p></body></html>", 400


@dashboard_bp.route('/api/gcal/sync', methods=['POST'])
def gcal_sync():
    """Manually sync Google Calendar events to database"""
    from .gcal import sync_to_database
    data = request.get_json() or {}
    course_id = data.get('course_id')
    result = sync_to_database(course_id)
    return jsonify(result)


@dashboard_bp.route('/api/gcal/revoke', methods=['POST'])
def gcal_revoke():
    """Revoke Google Calendar authentication"""
    from .gcal import revoke_auth
    revoke_auth()
    return jsonify({'success': True})


@dashboard_bp.route('/api/gtasks/sync', methods=['POST'])
def gtasks_sync():
    """Manually sync Google Tasks to database"""
    from .gcal import sync_tasks_to_database
    data = request.get_json() or {}
    course_id = data.get('course_id')
    result = sync_tasks_to_database(course_id)
    return jsonify(result)


@dashboard_bp.route('/api/gtasks/lists', methods=['GET'])
def gtasks_lists():
    """Get all Google Task lists"""
    from .gcal import fetch_task_lists
    lists, error = fetch_task_lists()
    if error:
        return jsonify({'error': error}), 400
    return jsonify({'task_lists': lists})

@dashboard_bp.route('/api/scraper/run', methods=['POST'])
def api_scraper_run():
    """
    Triggers the Blackboard scraper as a subprocess.
    Returns immediately with a status message, as scraping takes time.
    """
    try:
        # Resolve path to script: ../../scripts/scrape_blackboard.py relative to routes.py
        # Actually routes.py is in brain/dashboard/, scripts/ is at root/scripts/
        # base_dir (brain/) -> parent (root/) -> scripts/
        current_dir = os.path.dirname(os.path.abspath(__file__))
        brain_dir = os.path.dirname(current_dir)
        root_dir = os.path.dirname(brain_dir)
        script_path = os.path.join(root_dir, 'scripts', 'scrape_blackboard.py')
        
        if not os.path.exists(script_path):
            return jsonify({'ok': False, 'message': f'Script not found at {script_path}'}), 404
            
        # Run in separate process (fire and forget for this simple implementation)
        # We could use Popen to let it run in background
        subprocess.Popen([sys.executable, script_path], cwd=root_dir, shell=True)
        
        return jsonify({
            'ok': True, 
            'message': 'Scraper started in background. Check Sync Inbox in a few minutes.'
        })
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500

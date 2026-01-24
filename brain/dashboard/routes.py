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
from db_setup import (
    DB_PATH,
    init_database,
    get_connection,
    compute_file_checksum,
    is_file_ingested,
    mark_file_ingested,
    remove_ingested_file,
    get_ingested_session_id,
)

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
    build_ralph_summary,
    load_proposal_running_sheet,
    run_proposal_sheet_build,
    MAX_CONTEXT_CHARS,
)
from dashboard.syllabus import fetch_all_courses_and_events, attach_event_analytics
from dashboard.calendar import get_calendar_data
from dashboard.cli import get_all_sessions

dashboard_bp = Blueprint("dashboard", __name__)

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
    Validate and insert using the v9.3 ingest pipeline.
    Returns (ok: bool, message: str).
    """
    is_valid, error = validate_session_data(data)
    if not is_valid:
        return False, f"Validation failed: {error}"
    return insert_session(data)


@dashboard_bp.route("/")
def index():
    """Serve the React dashboard from /static/dist/index.html."""
    return serve_react_app()


@dashboard_bp.route("/brain")
@dashboard_bp.route("/calendar")
@dashboard_bp.route("/scholar")
@dashboard_bp.route("/tutor")
def react_pages():
    """Serve React app for client-side routes."""
    return serve_react_app()


def serve_react_app():
    """Serve the React build if present; otherwise fall back to legacy Flask."""
    import os
    from flask import send_from_directory, current_app

    static_folder = current_app.static_folder or ""
    dist_index = os.path.join(static_folder, "dist", "index.html")

    if os.path.exists(dist_index):
        return send_from_directory(os.path.join(static_folder, "dist"), "index.html")

    return render_template("dashboard.html")


@dashboard_bp.route("/old-dashboard")
def old_dashboard():
    """Legacy dashboard for reference."""
    return render_template("dashboard.html")


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


@dashboard_bp.route("/api/scholar/ralph")
def api_scholar_ralph():
    """Get Ralph run summary and progress details."""
    return jsonify(build_ralph_summary())


@dashboard_bp.route("/api/scholar/proposal-sheet", methods=["GET"])
def api_scholar_proposal_sheet():
    """Get the proposal running sheet summary."""
    return jsonify(load_proposal_running_sheet())


@dashboard_bp.route("/api/scholar/proposal-sheet/rebuild", methods=["POST"])
def api_scholar_proposal_sheet_rebuild():
    """Rebuild the proposal running sheet for final check."""
    return jsonify(run_proposal_sheet_build())


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
    cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='card_drafts'"
    )
    card_table_exists = cur.fetchone() is not None
    pending_cards = 0
    if card_table_exists:
        cur.execute(
            "SELECT COUNT(*) FROM card_drafts WHERE status IN ('draft', 'approved')"
        )
        pending_cards = cur.fetchone()[0]

    # Get DB file size
    db_path = Path(__file__).parent.parent / "data" / "pt_study.db"
    db_size_mb = db_path.stat().st_size / (1024 * 1024) if db_path.exists() else 0

    conn.close()

    return jsonify(
        {
            "ok": True,
            "stats": {
                "sessions": session_count,
                "events": event_count,
                "rag_documents": rag_count,
                "pending_cards": pending_cards,
                "db_size_mb": round(db_size_mb, 2),
            },
        }
    )


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
            "status": r[10],
        }
        for r in rows
    ]
    return jsonify({"ok": True, "items": pending})


@dashboard_bp.route("/api/sync/resolve", methods=["POST"])
def api_sync_resolve():
    """Approve, Ignore, or Update a staged item."""
    data = request.get_json() or {}
    staged_id = data.get("id")
    action = data.get("action")  # 'approve', 'ignore'

    if not staged_id or not action:
        return jsonify({"ok": False, "message": "Missing staged_id or action"}), 400

    conn = get_connection()
    cur = conn.cursor()

    try:
        if action == "ignore":
            cur.execute(
                "UPDATE scraped_events SET status='ignored' WHERE id=?", (staged_id,)
            )
        elif action == "approve":
            # Get the staged item
            cur.execute("SELECT * FROM scraped_events WHERE id=?", (staged_id,))
            item = cur.fetchone()
            if not item:
                return jsonify({"ok": False, "message": "Staged item not found"}), 404

            # Map columns by index (see CREATE TABLE in db_setup)
            # 0=id, 1=course_id, 2=type, 3=title, 4=date, 5=due_date, 6=raw_text, 7=source_url, 8=scraped_at, 9=status
            c_id, e_type, title, e_date, d_date, r_text, s_url = (
                item[1],
                item[2],
                item[3],
                item[4],
                item[5],
                item[6],
                item[7],
            )

            if e_type == "material":
                # Create as Topic
                cur.execute(
                    "INSERT INTO topics (course_id, name, created_at) VALUES (?, ?, ?)",
                    (c_id, title, datetime.now().isoformat()),
                )
                topic_id = cur.lastrowid
                # Add to RAG Docs if URL exists
                if s_url:
                    cur.execute(
                        """
                        INSERT INTO rag_docs (source_path, course_id, doc_type, content, created_at, enabled)
                        VALUES (?, ?, 'web_link', ?, ?, 1)
                    """,
                        (s_url, c_id, f"Title: {title}", datetime.now().isoformat()),
                    )
            else:
                # Create as Course Event
                cur.execute(
                    """
                    INSERT INTO course_events (
                        course_id, type, title, date, due_date, raw_text, created_at, updated_at, status
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
                """,
                    (
                        c_id,
                        e_type,
                        title,
                        e_date,
                        d_date,
                        r_text,
                        datetime.now().isoformat(),
                        datetime.now().isoformat(),
                    ),
                )

            # Mark staged item as approved
            cur.execute(
                "UPDATE scraped_events SET status='approved' WHERE id=?", (staged_id,)
            )

        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"ok": False, "message": str(e)}), 500
    finally:
        conn.close()


DIGEST_BULLET_PREFIX_RE = re.compile(
    r"^\s*(?:[-*]|\u2022|\u00b7|\u00e2\u20ac\u00a2)\s*"
)


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
            if re.match(r"^\d+\.\s+", stripped) and not DIGEST_BULLET_PREFIX_RE.match(
                stripped
            ):
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

    priority_actions = _extract_digest_bullets(
        digest_content, ["Top 3 Priority Actions", "Priority Actions"]
    )
    proposal_signals = _extract_digest_bullets(
        digest_content, ["Proposals Review", "Proposal Review", "Proposals"]
    )
    research_recs = _extract_digest_bullets(
        digest_content, ["Research Recommendations", "Research Recommendation"]
    )
    health_notes = _extract_digest_bullets(
        digest_content, ["System Health Assessment", "System Health"]
    )

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
    plan_lines.extend(
        [
            "",
            "## Proposal Signals (from digest)",
        ]
    )
    if proposal_signals:
        plan_lines.extend([f"- {item}" for item in proposal_signals])
    else:
        plan_lines.append("- (none found)")
    plan_lines.extend(
        [
            "",
            "## Research Follow-ups (from digest)",
        ]
    )
    if research_recs:
        plan_lines.extend([f"- {item}" for item in research_recs])
    else:
        plan_lines.append("- (none found)")
    plan_lines.extend(
        [
            "",
            "## System Health Notes (from digest)",
        ]
    )
    if health_notes:
        plan_lines.extend([f"- {item}" for item in health_notes])
    else:
        plan_lines.append("- (none found)")
    plan_lines.extend(
        [
            "",
            "## Answered Questions (latest)",
        ]
    )
    if resolved_questions:
        for q, a in resolved_questions[:10]:
            plan_lines.append(f"- Q: {q}")
            plan_lines.append(f"  A: {a}")
    else:
        plan_lines.append("- (none found)")
    plan_lines.extend(
        [
            "",
            "## Proposal Seeds (from answered questions)",
        ]
    )
    if resolved_questions:
        for q, a in resolved_questions[:10]:
            plan_lines.append(f"- Seed: {q} -> {a}")
    else:
        plan_lines.append("- (none found)")
    plan_lines.extend(
        [
            "",
            "## Plan Targets",
            "- `sop/MASTER_PLAN_PT_STUDY.md`",
            "- `sop/gpt-knowledge/M0-planning.md`",
            "",
            "## Draft Plan Edits (human-in-the-loop)",
            "- (fill in concrete edits to plan files, then apply manually)",
            "",
        ]
    )
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
    heading_match = re.match(r"^#+ +(.+)", digest_content, re.MULTILINE)
    if heading_match:
        title = heading_match.group(1).strip()
    else:
        first_line = digest_content.split("\n")[0].strip()
        title = first_line[:100] if first_line else "Untitled Digest"

    # Generate content hash (MD5)
    content_hash = hashlib.md5(digest_content.encode("utf-8")).hexdigest()
    created_at = datetime.now().isoformat()

    # Store in database
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO scholar_digests (filename, filepath, title, digest_type, created_at, content_hash)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            filename,
            str(filepath.relative_to(repo_root)),
            title,
            digest_type,
            created_at,
            content_hash,
        ),
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
    return jsonify(
        {
            "ok": True,
            **result,
        }
    )


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
            "content_hash": row[5],
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
        (digest_id,),
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

    return jsonify(
        {
            "ok": True,
            "digest": {
                "id": row[0],
                "filename": row[1],
                "filepath": row[2],
                "title": row[3],
                "digest_type": row[4],
                "created_at": row[5],
                "content_hash": row[6],
                "content": content,
            },
        }
    )


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

        return jsonify(
            {
                "ok": True,
                "has_key": bool(api_key),
                "key_preview": f"{api_key[:7]}..." if api_key else None,
                "api_provider": api_provider,
                "model": config.get("model", "openrouter/auto"),
            }
        )
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

            return jsonify(
                {
                    "ok": True,
                    "message": f"API key saved successfully ({api_provider})",
                    "key_preview": f"{api_key[:7]}...",
                    "api_provider": api_provider,
                    "model": model,
                }
            )
        except Exception as e:
            return jsonify({"ok": False, "message": f"Error saving API key: {e}"}), 500


@dashboard_bp.route("/api/gcal/calendars", methods=["GET"])
def gcal_calendars():
    from .gcal import fetch_calendar_list, resolve_calendar_selection

    config = load_api_config()
    gcal_config = config.get("google_calendar", {})
    if not isinstance(gcal_config, dict):
        gcal_config = {}

    calendars, error = fetch_calendar_list()
    if error:
        return jsonify({"ok": False, "error": error}), 400

    selected_ids, default_calendar_id, sync_all, calendar_meta = (
        resolve_calendar_selection(gcal_config, calendars)
    )

    return jsonify(
        {
            "ok": True,
            "calendars": [
                {
                    "id": cal.get("id"),
                    "summary": cal.get("summary"),
                    "primary": cal.get("primary"),
                    "access_role": cal.get("accessRole"),
                    "time_zone": cal.get("timeZone"),
                }
                for cal in calendars
            ],
            "selected_ids": selected_ids,
            "default_calendar_id": default_calendar_id,
            "sync_all": sync_all,
            "calendar_meta": calendar_meta,
        }
    )


@dashboard_bp.route("/api/gcal/config", methods=["GET", "POST"])
def gcal_config():
    config = load_api_config()
    gcal_config = config.get("google_calendar", {})
    if not isinstance(gcal_config, dict):
        gcal_config = {}

    if request.method == "GET":
        return jsonify({"ok": True, "google_calendar": gcal_config})

    payload = request.get_json() or {}
    calendar_ids = payload.get("calendar_ids") or []
    default_calendar_id = payload.get("default_calendar_id") or "primary"
    sync_all_calendars = bool(payload.get("sync_all_calendars"))

    gcal_config["calendar_ids"] = calendar_ids
    gcal_config["default_calendar_id"] = default_calendar_id
    gcal_config["sync_all_calendars"] = sync_all_calendars
    config["google_calendar"] = gcal_config
    save_api_config(config)

    return jsonify({"ok": True, "google_calendar": gcal_config})


@dashboard_bp.route("/api/gcal/status", methods=["GET"])
def gcal_status():
    """Check Google Calendar authentication status"""
    from .gcal import check_auth_status

    return jsonify(check_auth_status())


@dashboard_bp.route("/api/gcal/auth/start", methods=["GET"])
def gcal_auth_start():
    """Start Google Calendar OAuth flow"""
    from .gcal import get_auth_url

    url, state = get_auth_url()
    if url:
        return jsonify({"auth_url": url, "state": state})
    else:
        return jsonify({"error": state}), 400


@dashboard_bp.route("/api/gcal/sync", methods=["POST"])
def gcal_sync():
    """Manually sync Google Calendar events to database"""
    from .gcal import sync_bidirectional

    data = request.get_json() or {}
    course_id = data.get("course_id")
    calendar_ids = data.get("calendar_ids")
    if calendar_ids is not None and not isinstance(calendar_ids, list):
        calendar_ids = None
    try:
        result = sync_bidirectional(course_id=course_id, calendar_ids=calendar_ids)
        return jsonify(result)
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@dashboard_bp.route("/api/gcal/revoke", methods=["POST"])
def gcal_revoke():
    """Revoke Google Calendar authentication"""
    from .gcal import revoke_auth

    revoke_auth()
    return jsonify({"success": True})


@dashboard_bp.route("/api/gtasks/sync", methods=["POST"])
def gtasks_sync():
    """Manually sync Google Tasks to database"""
    from .gcal import sync_tasks_to_database

    data = request.get_json() or {}
    course_id = data.get("course_id")
    result = sync_tasks_to_database(course_id)
    return jsonify(result)


@dashboard_bp.route("/api/gtasks/lists", methods=["GET"])
def gtasks_lists():
    """Get all Google Task lists"""
    from .gcal import fetch_task_lists

    lists, error = fetch_task_lists()
    if error:
        return jsonify({"error": error}), 400
    return jsonify({"task_lists": lists})


@dashboard_bp.route("/api/scraper/run", methods=["POST"])
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
        script_path = os.path.join(root_dir, "scripts", "scrape_blackboard.py")

        if not os.path.exists(script_path):
            return jsonify(
                {"ok": False, "message": f"Script not found at {script_path}"}
            ), 404

        # Run in separate process (fire and forget for this simple implementation)
        # We could use Popen to let it run in background
        subprocess.Popen([sys.executable, script_path], cwd=root_dir, shell=True)

        return jsonify(
            {
                "ok": True,
                "message": "Scraper started in background. Check Sync Inbox in a few minutes.",
            }
        )
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


@dashboard_bp.route("/api/syllabus/import_bulk", methods=["POST"])
def api_syllabus_import_bulk():
    """Import a full syllabus JSON (course + events) from ChatGPT output."""
    data = request.get_json()
    if not data:
        return jsonify({"ok": False, "message": "No JSON data provided"}), 400

    # Validate required fields
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"ok": False, "message": "Course name is required"}), 400

    try:
        # Upsert course (creates or updates)
        course_id = upsert_course(data)

        # Import events if provided
        events = data.get("events", [])
        inserted = 0
        if events:
            inserted = import_events(course_id, events, replace=False)

        return jsonify({
            "ok": True,
            "message": f"Imported course '{name}' with {inserted} event(s)",
            "course_id": course_id,
            "events_imported": inserted
        })
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500

import os
import re
import json
import sys
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
from course_wheel_sync import get_course_wheel_link
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
    """Serve the React build from static/dist."""
    import os
    from flask import send_from_directory, current_app

    static_folder = current_app.static_folder or ""
    dist_index = os.path.join(static_folder, "dist", "index.html")

    if os.path.exists(dist_index):
        return send_from_directory(os.path.join(static_folder, "dist"), "index.html")

    return "Dashboard build not found. Run Start_Dashboard.bat or run 'npm run build' in dashboard_rebuild (outputs directly to brain/static/dist).", 404


@dashboard_bp.route("/old-dashboard")
def old_dashboard():
    """Legacy dashboard removed - now returns 404."""
    return "Legacy dashboard has been removed.", 404


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
    """Fetch latest Scholar digest from the database (fast, DB-first).

    Pass ?refresh=true to regenerate the weekly digest before querying.
    """
    # Optionally regenerate digest before fetching
    if request.args.get("refresh", "").lower() == "true":
        try:
            generate_weekly_digest(days=7)
        except Exception:
            pass  # Best-effort refresh; still return DB state below

    try:
        from dashboard.scholar import get_scholar_run_status
        run_status = get_scholar_run_status()
    except Exception:
        run_status = None

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT id, filename, filepath, title, digest_type, created_at, content_hash, content, cluster_id
            FROM scholar_digests
            ORDER BY created_at DESC
            LIMIT 1
            """
        )
        row = cur.fetchone()
    except Exception as e:
        conn.close()
        return jsonify({"ok": False, "error": str(e), "run_status": run_status}), 500
    conn.close()

    if not row:
        return jsonify(
            {
                "ok": True,
                "digest": None,
                "message": "No digest yet. Run Scholar.",
                "run_status": run_status,
            }
        )

    content = row["content"] or ""
    if not content:
        repo_root = Path(__file__).parent.parent.parent.resolve()
        filepath = repo_root / row["filepath"]
        if filepath.exists():
            content = filepath.read_text(encoding="utf-8")

    return jsonify(
        {
            "ok": True,
            "digest": content,
            "digest_id": row["id"],
            "title": row["title"],
            "digest_type": row["digest_type"],
            "created_at": row["created_at"],
            "filename": row["filename"],
            "content_hash": row["content_hash"],
            "cluster_id": row["cluster_id"],
            "run_status": run_status,
        }
    )


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


@dashboard_bp.route("/api/scholar/proposals/sync", methods=["POST"])
def api_scholar_proposals_sync():
    """Scan scholar/outputs/proposals/*.md, upsert to scholar_proposals table."""
    import hashlib
    from pathlib import Path

    proposals_dir = Path(__file__).parent.parent.parent / "scholar" / "outputs" / "proposals"
    if not proposals_dir.exists():
        return jsonify({"synced": 0, "error": "proposals directory not found"}), 404

    conn = get_connection()
    cur = conn.cursor()
    synced = 0
    errors = []

    for md_file in sorted(proposals_dir.glob("*.md")):
        try:
            content = md_file.read_text(encoding="utf-8", errors="replace")
            content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()

            # Extract title from first heading
            title = md_file.stem.replace("-", " ").replace("_", " ").title()
            for line in content.split("\n"):
                line = line.strip()
                if line.startswith("# "):
                    title = line[2:].strip()
                    break

            # Extract type from filename pattern (e.g., "fix-*", "add-*", "improve-*")
            fname_lower = md_file.stem.lower()
            if fname_lower.startswith("fix"):
                ptype = "fix"
            elif fname_lower.startswith("add"):
                ptype = "feature"
            elif fname_lower.startswith("improve"):
                ptype = "improvement"
            else:
                ptype = "general"

            cur.execute(
                """INSERT INTO scholar_proposals (filename, filepath, title, proposal_type, content_hash, created_at)
                   VALUES (?, ?, ?, ?, ?, datetime('now'))
                   ON CONFLICT(filename) DO UPDATE SET
                     filepath = excluded.filepath,
                     title = excluded.title,
                     content_hash = excluded.content_hash
                   WHERE content_hash != excluded.content_hash""",
                (md_file.name, str(md_file), title, ptype, content_hash),
            )
            synced += 1
        except Exception as e:
            errors.append(f"{md_file.name}: {e}")

    conn.commit()
    conn.close()
    return jsonify({"synced": synced, "errors": errors})


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
    from config import DB_PATH
    _db_path = Path(DB_PATH)
    db_size_mb = _db_path.stat().st_size / (1024 * 1024) if _db_path.exists() else 0

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
    """List all staged events awaiting approval (from course_events with approval_status)."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT ce.id, ce.course_id, c.name as course_name, ce.type, ce.title,
               ce.date, ce.due_date, ce.raw_text, ce.source_url,
               ce.created_at, ce.approval_status
        FROM course_events ce
        LEFT JOIN courses c ON ce.course_id = c.id
        WHERE COALESCE(ce.approval_status, 'approved') NOT IN ('approved', 'ignored')
        ORDER BY ce.created_at DESC
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
    """Approve or Ignore a staged item (updates course_events.approval_status)."""
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
                "UPDATE course_events SET approval_status='ignored' WHERE id=?",
                (staged_id,),
            )
        elif action == "approve":
            cur.execute(
                "SELECT id, type, source_url, course_id, title FROM course_events WHERE id=?",
                (staged_id,),
            )
            item = cur.fetchone()
            if not item:
                return jsonify({"ok": False, "message": "Staged item not found"}), 404

            e_type, s_url, c_id, title = item[1], item[2], item[3], item[4]

            # For material-type approvals, add to RAG docs if URL exists
            if e_type == "material" and s_url:
                cur.execute(
                    """
                    INSERT INTO rag_docs (source_path, course_id, doc_type, content, created_at, enabled)
                    VALUES (?, ?, 'web_link', ?, ?, 1)
                """,
                    (s_url, c_id, f"Title: {title}", datetime.now().isoformat()),
                )

            cur.execute(
                "UPDATE course_events SET approval_status='approved' WHERE id=?",
                (staged_id,),
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
            "- `sop/library/00-overview.md`",
            "- `sop/library/05-session-flow.md`",
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
        INSERT INTO scholar_digests (filename, filepath, title, digest_type, created_at, content_hash, content)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            filename,
            str(filepath.relative_to(repo_root)),
            title,
            digest_type,
            created_at,
            content_hash,
            digest_content,
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
        SELECT id, filename, title, digest_type, created_at, content_hash, cluster_id
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
            "cluster_id": row[6],
        }
        for row in rows
    ]

    return jsonify({"ok": True, "digests": digests, "count": len(digests)})


@dashboard_bp.route("/api/scholar/digests/<int:digest_id>", methods=["GET"])
def api_scholar_get_digest(digest_id):
    """Get a single digest by ID, including its content."""
    conn = get_connection()
    cur = conn.cursor()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, filename, filepath, title, digest_type, created_at, content_hash, content, cluster_id
        FROM scholar_digests WHERE id = ?
        """,
        (digest_id,),
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"ok": False, "message": "Digest not found"}), 404

    # DB-first: use content from DB, fallback to file
    content = row["content"] or ""
    if not content:
        repo_root = Path(__file__).parent.parent.parent.resolve()
        filepath = repo_root / row["filepath"]
        if filepath.exists():
            content = filepath.read_text(encoding="utf-8")

    return jsonify(
        {
            "ok": True,
            "digest": {
                "id": row["id"],
                "filename": row["filename"],
                "filepath": row["filepath"],
                "title": row["title"],
                "digest_type": row["digest_type"],
                "created_at": row["created_at"],
                "content_hash": row["content_hash"],
                "content": content,
                "cluster_id": row["cluster_id"],
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


@dashboard_bp.route("/api/scholar/clusters", methods=["POST"])
def api_scholar_cluster():
    """Cluster digests and proposals by title keyword similarity.

    Simple keyword-based clustering: extracts significant words from titles,
    groups items sharing keywords into clusters. No ML dependencies needed.
    """
    import re as _re
    from collections import defaultdict

    STOP_WORDS = {
        "the", "a", "an", "and", "or", "of", "in", "to", "for", "is", "on",
        "at", "by", "with", "from", "as", "it", "that", "this", "be", "are",
        "was", "were", "been", "has", "have", "had", "do", "does", "did",
        "will", "would", "could", "should", "may", "might", "can", "shall",
        "not", "no", "but", "if", "so", "up", "out", "about", "into",
        "over", "after", "under", "between", "through", "during", "before",
        "study", "review", "analysis", "digest", "proposal", "strategic",
        "summary", "report", "overview", "notes",
    }

    def _extract_keywords(title: str) -> set:
        if not title:
            return set()
        words = _re.findall(r"[a-z]+", title.lower())
        return {w for w in words if len(w) > 2 and w not in STOP_WORDS}

    conn = get_connection()
    cur = conn.cursor()

    # Fetch all digests and proposals with titles
    cur.execute("SELECT id, title, cluster_id FROM scholar_digests")
    digests = [{"id": r[0], "title": r[1], "cluster_id": r[2], "table": "scholar_digests"} for r in cur.fetchall()]

    cur.execute("SELECT id, title, cluster_id FROM scholar_proposals")
    proposals = [{"id": r[0], "title": r[1], "cluster_id": r[2], "table": "scholar_proposals"} for r in cur.fetchall()]

    all_items = digests + proposals

    # Build keyword → items index
    keyword_items: dict = defaultdict(list)
    item_keywords: dict = {}
    for item in all_items:
        kws = _extract_keywords(item["title"] or "")
        item_keywords[f"{item['table']}:{item['id']}"] = kws
        for kw in kws:
            keyword_items[kw].append(f"{item['table']}:{item['id']}")

    # Union-find clustering: items sharing 2+ keywords are in same cluster
    parent: dict = {}

    def find(x: str) -> str:
        while parent.get(x, x) != x:
            parent[x] = parent.get(parent[x], parent[x])
            x = parent[x]
        return x

    def union(a: str, b: str) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    # For each pair of items, union if they share 2+ keywords
    keys = list(item_keywords.keys())
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            shared = item_keywords[keys[i]] & item_keywords[keys[j]]
            if len(shared) >= 2:
                union(keys[i], keys[j])

    # Build clusters
    clusters: dict = defaultdict(list)
    for item in all_items:
        key = f"{item['table']}:{item['id']}"
        root = find(key)
        clusters[root].append(item)

    # Assign cluster_id labels and update DB
    cluster_map: dict = {}
    cluster_idx = 0
    for root, members in clusters.items():
        if len(members) < 2:
            # Singletons get no cluster
            continue
        # Name cluster after most common keyword
        all_kws: dict = defaultdict(int)
        for m in members:
            for kw in item_keywords.get(f"{m['table']}:{m['id']}", set()):
                all_kws[kw] += 1
        label = max(all_kws, key=all_kws.get) if all_kws else f"cluster-{cluster_idx}"
        cluster_idx += 1
        cluster_map[root] = label

    # Update DB with cluster assignments
    updated = 0
    for root, members in clusters.items():
        label = cluster_map.get(root)
        for m in members:
            cur.execute(
                f"UPDATE {m['table']} SET cluster_id = ? WHERE id = ?",
                (label, m["id"]),
            )
            updated += 1

    conn.commit()
    conn.close()

    # Build response
    result_clusters = []
    for root, label in cluster_map.items():
        members = clusters[root]
        result_clusters.append({
            "cluster_id": label,
            "count": len(members),
            "items": [
                {"table": m["table"], "id": m["id"], "title": m["title"]}
                for m in members
            ],
        })

    return jsonify({
        "ok": True,
        "clusters": result_clusters,
        "total_clustered": sum(c["count"] for c in result_clusters),
        "total_items": len(all_items),
        "updated": updated,
    })


@dashboard_bp.route("/api/scholar/clusters", methods=["GET"])
def api_scholar_clusters_list():
    """List current cluster assignments."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT id, title, digest_type, cluster_id FROM scholar_digests WHERE cluster_id IS NOT NULL"
    )
    digests = [{"id": r[0], "title": r[1], "type": r[2], "cluster_id": r[3], "source": "digest"} for r in cur.fetchall()]

    cur.execute(
        "SELECT id, title, proposal_type, cluster_id FROM scholar_proposals WHERE cluster_id IS NOT NULL"
    )
    proposals = [{"id": r[0], "title": r[1], "type": r[2], "cluster_id": r[3], "source": "proposal"} for r in cur.fetchall()]

    conn.close()

    # Group by cluster_id
    from collections import defaultdict as _dd
    grouped: dict = _dd(list)
    for item in digests + proposals:
        grouped[item["cluster_id"]].append(item)

    clusters = [
        {"cluster_id": cid, "count": len(items), "items": items}
        for cid, items in sorted(grouped.items())
    ]

    return jsonify({"ok": True, "clusters": clusters})


@dashboard_bp.route("/api/scholar/implementation-bundle", methods=["POST"])
def api_scholar_implementation_bundle():
    """Generate an implementation bundle from approved proposals with safety checks."""
    result = generate_implementation_bundle()
    status_code = 200 if result.get("ok") else 400
    return jsonify(result), status_code


@dashboard_bp.route("/api/scholar/run", methods=["POST"])
def api_scholar_run():
    """Trigger a full Scholar orchestration run."""
    from dashboard.scholar import run_scholar_orchestrator_tracking, get_scholar_run_status
    import threading
    
    data = request.get_json() or {}
    triggered_by = data.get('triggered_by', 'ui')
    
    # Check if a run is already in progress
    current_status = get_scholar_run_status()
    if current_status.get('status') == 'running':
        return jsonify({
            'ok': False,
            'message': 'A run is already in progress',
            'current_run': current_status
        }), 409
    
    # Start run in background thread (don't block request)
    def run_async():
        run_scholar_orchestrator_tracking(save_outputs=True, triggered_by=triggered_by)
    
    thread = threading.Thread(target=run_async)
    thread.daemon = True
    thread.start()
    
    # Return current status (will show 'running')
    return jsonify({
        'ok': True,
        'message': 'Scholar run started',
        'status': get_scholar_run_status()
    })


@dashboard_bp.route("/api/scholar/run/status", methods=["GET"])
def api_scholar_run_status():
    """Get the current/latest run status."""
    from dashboard.scholar import get_scholar_run_status
    return jsonify(get_scholar_run_status())


@dashboard_bp.route("/api/scholar/run/history", methods=["GET"])
def api_scholar_run_history():
    """Get run history."""
    from dashboard.scholar import get_scholar_run_history
    limit = request.args.get('limit', 10, type=int)
    return jsonify({
        'ok': True,
        'runs': get_scholar_run_history(limit)
    })


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
        from llm_provider import _load_codex_auth
        auth = _load_codex_auth()
        config = load_api_config()

        return jsonify(
            {
                "ok": True,
                "has_key": auth is not None,
                "key_preview": "codex-oauth" if auth else None,
                "api_provider": "codex",
                "model": config.get("model", "default"),
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
            api_provider = data.get("api_provider", "codex")
            model = data.get("model", "default")

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
        wheel_link = get_course_wheel_link(course_id)

        # Import events if provided
        events = data.get("events", [])
        inserted = 0
        if events:
            inserted = import_events(course_id, events, replace=False)

        return jsonify({
            "ok": True,
            "message": f"Imported course '{name}' with {inserted} event(s)",
            "course_id": course_id,
            "events_imported": inserted,
            "wheel_linked": bool(wheel_link),
            "wheel_active": bool(wheel_link["active"]) if wheel_link else None,
            "wheel_position": wheel_link["position"] if wheel_link else None,
        })
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


# ==============================================================================
# SOP Explorer API
# ==============================================================================

SOP_MANIFEST_PATH = Path(__file__).parent.parent.parent / "sop" / "sop_index.v1.json"
_sop_allowlist: set = set()
_sop_allowlist_loaded = False


def _load_sop_allowlist() -> set:
    """Load and cache the SOP file allowlist from manifest."""
    global _sop_allowlist, _sop_allowlist_loaded
    if _sop_allowlist_loaded:
        return _sop_allowlist

    if not SOP_MANIFEST_PATH.exists():
        _sop_allowlist_loaded = True
        return _sop_allowlist

    try:
        with open(SOP_MANIFEST_PATH, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        # Extract all paths from manifest
        for group in manifest.get("groups", []):
            for section in group.get("sections", []):
                for item in section.get("items", []):
                    path = item.get("path", "")
                    if path and item.get("type") != "dir":
                        _sop_allowlist.add(path)

        _sop_allowlist_loaded = True
    except Exception:
        _sop_allowlist_loaded = True

    return _sop_allowlist


def _is_sop_path_allowed(path: str) -> bool:
    """Check if a path is allowed to be served."""
    if not path:
        return False
    # Security checks
    if ".." in path.split("/"):
        return False
    if "\\" in path:
        return False
    if path.startswith("/") or path.startswith("~"):
        return False
    # Must be in allowlist
    allowlist = _load_sop_allowlist()
    return path in allowlist


@dashboard_bp.route("/api/sop/index")
def api_sop_index():
    """Return the SOP manifest JSON."""
    if not SOP_MANIFEST_PATH.exists():
        return jsonify({"ok": False, "message": "SOP manifest not found"}), 404

    try:
        with open(SOP_MANIFEST_PATH, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        return jsonify(manifest)
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


@dashboard_bp.route("/api/sop/file")
def api_sop_file():
    """Return allowlisted SOP file content."""
    path = request.args.get("path", "").strip()

    if not _is_sop_path_allowed(path):
        return jsonify({"ok": False, "message": "File not found"}), 404

    # Resolve full path
    repo_root = Path(__file__).parent.parent.parent
    full_path = repo_root / path.replace("/", os.sep)

    if not full_path.exists() or not full_path.is_file():
        return jsonify({"ok": False, "message": "File not found"}), 404

    # Optional size limit (5MB)
    if full_path.stat().st_size > 5 * 1024 * 1024:
        return jsonify({"ok": False, "message": "File too large"}), 413

    try:
        content = full_path.read_text(encoding="utf-8")

        # Determine content type
        suffix = full_path.suffix.lower()
        content_type_map = {
            ".md": "text/markdown",
            ".json": "application/json",
            ".txt": "text/plain",
        }
        content_type = content_type_map.get(suffix, "text/plain")

        return jsonify({
            "ok": True,
            "path": path,
            "content_type": content_type,
            "content": content,
        })
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


@dashboard_bp.route("/api/sop/explain", methods=["POST"])
def api_sop_explain():
    """
    Return a hierarchical breakdown + explanation for a SOP excerpt.

    This is designed to support progressive disclosure in the Tutor SOP Explorer:
    users select a heading, we explain that section into groups/subgroups/concepts.
    """
    data = request.get_json() or {}
    path = (data.get("path") or "").strip()
    heading = (data.get("heading") or "").strip()
    level = int(data.get("level") or 0)
    excerpt = (data.get("excerpt") or "").strip()
    mode = (data.get("mode") or "teach").strip()

    if not _is_sop_path_allowed(path):
        return jsonify({"ok": False, "message": "File not found"}), 404
    if not excerpt:
        return jsonify({"ok": False, "message": "Missing excerpt"}), 400

    repo_root = Path(__file__).parent.parent.parent.resolve()
    try:
        from dashboard.sop_explainer import explain_sop_excerpt

        result = explain_sop_excerpt(
            repo_root=repo_root,
            sop_path=path,
            heading=heading,
            level=level,
            excerpt=excerpt,
            mode=mode,
        )
        status_code = 200 if result.get("ok") else 400
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500

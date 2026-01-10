#!/usr/bin/env python3
"""
Sync DB session records back to markdown files.

Provides functions to:
- Convert a session dict to canonical markdown format (matching TEMPLATE.md)
- Determine the filepath for a session's .md file
- Write DB changes back to .md files
- Delete session .md files

Part of PT Study Brain v9.1.
"""

import os
import re
import sqlite3
from datetime import datetime
from pathlib import Path

from db_setup import DB_PATH, get_connection, compute_file_checksum, mark_file_ingested
from config import SESSION_LOGS_DIR


def slugify(text: str, max_len: int = 50) -> str:
    """
    Convert text to a filesystem-safe slug.
    
    Args:
        text: The text to slugify.
        max_len: Maximum length of the slug.
    
    Returns:
        A lowercase, underscore-separated slug.
    """
    if not text:
        return "untitled"
    # Remove common punctuation, replace spaces with underscores
    slug = re.sub(r"[^\w\s-]", "", text)
    slug = re.sub(r"[-\s]+", "_", slug).strip("_")
    slug = slug[:max_len].rstrip("_")
    return slug or "untitled"


def session_to_markdown(session: dict) -> str:
    """
    Convert a session dict (from DB row) to canonical markdown format.
    
    The output matches TEMPLATE.md v9.1 format so files are parseable
    by ingest_session.py on re-import.
    
    Args:
        session: Dict containing session fields from the DB.
    
    Returns:
        Full markdown content as a string.
    """
    # Helper to format a field value, handling None/empty
    def f(val, default=""):
        if val is None:
            return default
        if isinstance(val, int):
            return str(val) if val != 0 else default
        return str(val).strip() if str(val).strip() else default
    
    # Helper for yes/no fields
    def yn(val):
        if not val:
            return ""
        val_str = str(val).strip().lower()
        if val_str.startswith("y"):
            return "Yes"
        if val_str.startswith("n"):
            return "No"
        return str(val).strip()
    
    # Helper for optional numbered list (anchors)
    def numbered_list(text):
        if not text:
            return ""
        lines = [line.strip() for line in text.strip().split("\n") if line.strip()]
        if not lines:
            return ""
        result = []
        for i, line in enumerate(lines, 1):
            # Remove existing numbering if present
            clean = re.sub(r"^\d+\.\s*", "", line)
            result.append(f"{i}. {clean}")
        return "\n".join(result)
    
    # Helper for bullet list (weak anchors)
    def bullet_list(text):
        if not text:
            return ""
        lines = [line.strip() for line in text.strip().split("\n") if line.strip()]
        if not lines:
            return ""
        result = []
        for line in lines:
            # Remove existing bullet if present
            clean = re.sub(r"^[-*]\s*", "", line)
            result.append(f"- {clean}")
        return "\n".join(result)
    
    # Extract fields with defaults
    session_date = f(session.get("session_date"), "YYYY-MM-DD")
    session_time = f(session.get("session_time"), "")
    duration = session.get("duration_minutes") or session.get("time_spent_minutes") or 0
    study_mode = f(session.get("study_mode"), "Core")
    
    target_exam = f(session.get("target_exam"))
    source_lock = f(session.get("source_lock"))
    plan_of_attack = f(session.get("plan_of_attack"))
    
    main_topic = f(session.get("main_topic") or session.get("topic"))
    subtopics = f(session.get("subtopics"))
    
    frameworks_used = f(session.get("frameworks_used"))
    sop_modules_used = f(session.get("sop_modules_used"))
    engines_used = f(session.get("engines_used"))
    core_learning_modules_used = f(session.get("core_learning_modules_used"))
    gated_platter = yn(session.get("gated_platter_triggered"))
    wrap_reached = yn(session.get("wrap_phase_reached"))
    anki_count = session.get("anki_cards_count") or 0
    off_source_drift = yn(session.get("off_source_drift"))
    source_snippets = yn(session.get("source_snippets_used"))
    prompt_drift = yn(session.get("prompt_drift"))
    prompt_drift_notes = f(session.get("prompt_drift_notes"))
    
    # Anatomy-specific
    region_covered = f(session.get("region_covered"))
    landmarks_mastered = f(session.get("landmarks_mastered"))
    muscles_attached = f(session.get("muscles_attached"))
    oian_completed = f(session.get("oian_completed_for"))
    rollback_events = yn(session.get("rollback_events"))
    drawing_used = yn(session.get("drawing_used"))
    drawings_completed = f(session.get("drawings_completed"))
    
    # Ratings
    understanding = session.get("understanding_level")
    retention = session.get("retention_confidence")
    system_perf = session.get("system_performance")
    calibration = f(session.get("calibration_check"))
    
    # Anchors
    anchors_locked = numbered_list(session.get("anchors_locked"))
    weak_anchors = bullet_list(session.get("weak_anchors"))
    
    # Reflection
    what_worked = f(session.get("what_worked"))
    what_needs_fixing = f(session.get("what_needs_fixing"))
    gaps_identified = f(session.get("gaps_identified"))
    notes_insights = f(session.get("notes_insights"))
    
    # Next session
    next_topic = f(session.get("next_topic"))
    next_focus = f(session.get("next_focus"))
    next_materials = f(session.get("next_materials"))
    
    # Build markdown content matching TEMPLATE.md format
    md = f"""# Session Log - {session_date}

## Session Info
- Date: {session_date}
- Time: {session_time}
- Duration: {duration} minutes
- Study Mode: {study_mode}

## Planning Phase
- Target Exam/Block: {target_exam if target_exam else "Not recorded"}
- Source-Lock: {source_lock if source_lock else "Not recorded"}
- Plan of Attack: {plan_of_attack if plan_of_attack else "Not recorded"}

## Topic Coverage
- Main Topic: {main_topic}
- Subtopics: {subtopics if subtopics else "Not recorded"}

## Execution Details
- Frameworks Used: {frameworks_used if frameworks_used else "Not recorded"}
- SOP Modules Used: {sop_modules_used if sop_modules_used else "Not recorded"}
- Engines Used: {engines_used if engines_used else "Not recorded"}
- Core Learning Modules Used: {core_learning_modules_used if core_learning_modules_used else "Not recorded"}
- Gated Platter Triggered: {gated_platter if gated_platter else "Not recorded"}
- WRAP Phase Reached: {wrap_reached if wrap_reached else "Not recorded"}
- Anki Cards Created: {anki_count}
- Off-source drift? (Y/N): {off_source_drift if off_source_drift else "Not recorded"}
- Source snippets used? (Y/N): {source_snippets if source_snippets else "Not recorded"}
- Prompt Drift? (Y/N): {prompt_drift if prompt_drift else "Not recorded"}
- Prompt Drift Notes: {prompt_drift_notes if prompt_drift_notes else "Not recorded"}

## Anatomy-Specific
- Region Covered: {region_covered if region_covered else "Not recorded"}
- Landmarks Mastered: {landmarks_mastered if landmarks_mastered else "Not recorded"}
- Muscles Attached: {muscles_attached if muscles_attached else "Not recorded"}
- OIAN Completed For: {oian_completed if oian_completed else "Not recorded"}
- Rollback Events: {rollback_events if rollback_events else "Not recorded"}
- Drawing Used: {drawing_used if drawing_used else "Not recorded"}
- Drawings Completed: {drawings_completed if drawings_completed else "Not recorded"}

## Ratings (1-5 scale)
- Understanding Level: {understanding if understanding else "Not recorded"}
- Retention Confidence: {retention if retention else "Not recorded"}
- System Performance: {system_perf if system_perf else "Not recorded"}
- Calibration Check: {calibration if calibration else "Not recorded"}

## Anchors Locked
{anchors_locked if anchors_locked else "Not recorded"}

## Weak Anchors (for WRAP cards)
{weak_anchors if weak_anchors else "Not recorded"}

## Reflection

### What Worked
{what_worked if what_worked else "Not recorded."}

### What Needs Fixing
{what_needs_fixing if what_needs_fixing else "Not recorded."}

### Gaps Identified
{gaps_identified if gaps_identified else "Not recorded."}

### Notes/Insights
{notes_insights if notes_insights else "Not recorded."}

## Next Session Priority
- Topic: {next_topic if next_topic else "Not recorded"}
- Focus: {next_focus if next_focus else "Not recorded"}
- Materials Needed: {next_materials if next_materials else "Not recorded"}
"""
    return md


def get_session_filepath(session: dict, source_path: str = None) -> str:
    """
    Determine the filepath for a session's markdown file.
    
    Priority:
    1. Use source_path if provided and valid
    2. Construct from session_date and topic: brain/session_logs/{date}_{topic_slug}.md
    
    Args:
        session: Dict containing session fields from the DB.
        source_path: Optional source filepath from ingested_files table.
    
    Returns:
        Absolute filepath for the session's .md file.
    """
    # If source_path is provided and looks valid, use it
    if source_path:
        # Make sure it's an absolute path
        if os.path.isabs(source_path):
            return source_path
        else:
            # Treat as relative to session logs dir
            return os.path.join(SESSION_LOGS_DIR, source_path)
    
    # Construct from date and topic
    session_date = session.get("session_date", "unknown")
    topic = session.get("main_topic") or session.get("topic") or "session"
    topic_slug = slugify(topic)
    
    filename = f"{session_date}_{topic_slug}.md"
    return os.path.join(SESSION_LOGS_DIR, filename)


def get_session_by_id(session_id: int, conn=None) -> tuple:
    """
    Fetch a session from the DB by ID.
    
    Args:
        session_id: The session's primary key.
        conn: Optional existing connection.
    
    Returns:
        Tuple of (session_dict, source_path) or (None, None) if not found.
    """
    close_conn = False
    if conn is None:
        conn = get_connection()
        close_conn = True
    
    cursor = conn.cursor()
    
    # Get session data
    cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    row = cursor.fetchone()
    
    if not row:
        if close_conn:
            conn.close()
        return None, None
    
    columns = [description[0] for description in cursor.description]
    session = dict(zip(columns, row))
    
    # Get source path from ingested_files table
    cursor.execute(
        "SELECT filepath FROM ingested_files WHERE session_id = ?",
        (session_id,)
    )
    source_row = cursor.fetchone()
    source_path = source_row[0] if source_row else None
    
    if close_conn:
        conn.close()
    
    return session, source_path


def sync_session_to_file(session_id: int) -> dict:
    """
    Sync a session from the DB to its markdown file.
    
    1. Fetch session from DB by ID
    2. Generate markdown using session_to_markdown()
    3. Write to filepath from get_session_filepath()
    4. Update checksum in ingested_files table
    
    Args:
        session_id: The session's primary key.
    
    Returns:
        Dict with {ok: bool, message: str, filepath: str (if ok)}
    """
    try:
        conn = get_connection()
        
        # Fetch session
        session, source_path = get_session_by_id(session_id, conn)
        
        if not session:
            conn.close()
            return {"ok": False, "message": f"Session {session_id} not found"}
        
        # Generate markdown
        md_content = session_to_markdown(session)
        
        # Determine filepath
        filepath = get_session_filepath(session, source_path)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        # Write file
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(md_content)
        
        # Update checksum in ingested_files table
        checksum = compute_file_checksum(filepath)
        mark_file_ingested(conn, filepath, checksum, session_id)
        
        conn.close()
        
        return {
            "ok": True,
            "message": f"Session synced to {filepath}",
            "filepath": filepath,
            "checksum": checksum,
        }
        
    except Exception as exc:
        return {"ok": False, "message": f"Sync failed: {exc}"}


def delete_session_file(session: dict, source_path: str = None) -> bool:
    """
    Delete the markdown file for a session from disk.
    
    Args:
        session: Dict containing session fields.
        source_path: Optional source filepath from ingested_files table.
    
    Returns:
        True if file was deleted or didn't exist, False on error.
    """
    try:
        filepath = get_session_filepath(session, source_path)
        
        if os.path.exists(filepath):
            os.remove(filepath)
            print(f"[OK] Deleted session file: {filepath}")
        else:
            print(f"[INFO] Session file not found (already deleted?): {filepath}")
        
        return True
        
    except Exception as exc:
        print(f"[ERROR] Failed to delete session file: {exc}")
        return False


# CLI interface for testing
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Sync session DB records to markdown files."
    )
    parser.add_argument(
        "session_id",
        type=int,
        help="Session ID to sync (from sessions.id column)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print markdown without writing to file"
    )
    
    args = parser.parse_args()
    
    session, source_path = get_session_by_id(args.session_id)
    
    if not session:
        print(f"[ERROR] Session {args.session_id} not found")
        exit(1)
    
    if args.dry_run:
        print("=" * 60)
        print(f"Session ID: {args.session_id}")
        print(f"Source path: {source_path}")
        print(f"Target path: {get_session_filepath(session, source_path)}")
        print("=" * 60)
        print(session_to_markdown(session))
    else:
        result = sync_session_to_file(args.session_id)
        if result["ok"]:
            print(f"[OK] {result['message']}")
        else:
            print(f"[ERROR] {result['message']}")
            exit(1)

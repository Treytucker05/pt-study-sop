"""Session sync utilities for bidirectional DB <-> markdown sync."""

import os
import re
from pathlib import Path
from datetime import datetime


def slugify(text: str) -> str:
    """Convert text to filesystem-safe slug."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '_', text)
    return text[:50]


def get_session_filepath(session: dict, logs_dir: str = None) -> str:
    """Get the markdown file path for a session."""
    if logs_dir is None:
        logs_dir = os.path.join(os.path.dirname(__file__), 'session_logs')
    
    # Use source_path if available and exists
    if session.get('source_path') and os.path.exists(session['source_path']):
        return session['source_path']
    
    # Otherwise reconstruct from date and topic
    date = session.get('session_date', '')
    topic = session.get('main_topic') or session.get('topic') or 'session'
    filename = f"{date}_{slugify(topic)}.md"
    return os.path.join(logs_dir, filename)


def _format_field(value, default: str = "Not recorded") -> str:
    """Format a field value, returning default if empty/None."""
    if value is None or value == '':
        return default
    return str(value)


def _format_yes_no(value, default: str = "Not recorded") -> str:
    """Format a Yes/No field from various representations."""
    if value is None or value == '':
        return default
    v = str(value).strip().lower()
    if v in ('yes', 'y', 'true', '1'):
        return 'Yes'
    if v in ('no', 'n', 'false', '0'):
        return 'No'
    return str(value)


def _format_rating(value, default: str = "Not recorded") -> str:
    """Format a 1-5 rating value."""
    if value is None or value == '':
        return default
    try:
        rating = int(value)
        if 1 <= rating <= 5:
            return str(rating)
    except (ValueError, TypeError):
        pass
    return str(value)


def _format_anchors(anchors_text: str) -> str:
    """Format anchors_locked text into numbered list."""
    if not anchors_text or anchors_text.strip() == '':
        return "1. [None recorded]"
    
    # If already formatted as numbered list, return as-is
    if re.match(r'^\d+\.', anchors_text.strip()):
        return anchors_text.strip()
    
    # Split by semicolons or newlines and format
    lines = []
    items = re.split(r'[;\n]', anchors_text)
    for i, item in enumerate(items, 1):
        item = item.strip()
        if item:
            lines.append(f"{i}. {item}")
    
    return '\n'.join(lines) if lines else "1. [None recorded]"


def _format_weak_anchors(weak_text: str) -> str:
    """Format weak_anchors text into bullet list."""
    if not weak_text or weak_text.strip() == '':
        return "- None recorded"
    
    # If already formatted as bullet list, return as-is
    if weak_text.strip().startswith('- '):
        return weak_text.strip()
    
    # Split by semicolons or newlines and format
    lines = []
    items = re.split(r'[;\n]', weak_text)
    for item in items:
        item = item.strip()
        if item:
            lines.append(f"- {item}")
    
    return '\n'.join(lines) if lines else "- None recorded"


def session_to_markdown(session: dict) -> str:
    """Convert a session DB record to canonical markdown format.
    
    Args:
        session: Dictionary containing session data from the database.
                 Keys should match the sessions table columns.
    
    Returns:
        String containing the formatted markdown following TEMPLATE.md structure.
    """
    # Helper to get field with fallback
    def get(key, default="Not recorded"):
        return _format_field(session.get(key), default)
    
    # Build markdown sections
    md_parts = []
    
    # Header
    session_date = get('session_date', 'YYYY-MM-DD')
    md_parts.append(f"# Session Log - {session_date}")
    md_parts.append("")
    
    # Session Info
    md_parts.append("## Session Info")
    md_parts.append(f"- Date: {session_date}")
    md_parts.append(f"- Time: {get('session_time', 'HH:MM')}")
    
    # Duration - prefer duration_minutes, fallback to time_spent_minutes
    duration = session.get('duration_minutes') or session.get('time_spent_minutes')
    duration_str = f"{duration} minutes" if duration else "Not recorded"
    md_parts.append(f"- Duration: {duration_str}")
    md_parts.append(f"- Study Mode: {get('study_mode', 'Core')}")
    md_parts.append("")
    
    # Planning Phase
    md_parts.append("## Planning Phase")
    md_parts.append(f"- Target Exam/Block: {get('target_exam')}")
    md_parts.append(f"- Source-Lock: {get('source_lock')}")
    md_parts.append(f"- Plan of Attack: {get('plan_of_attack')}")
    md_parts.append("")
    
    # Topic Coverage
    md_parts.append("## Topic Coverage")
    md_parts.append(f"- Main Topic: {get('main_topic') or get('topic')}")
    md_parts.append(f"- Subtopics: {get('subtopics')}")
    md_parts.append("")
    
    # Execution Details
    md_parts.append("## Execution Details")
    md_parts.append(f"- Frameworks Used: {get('frameworks_used')}")
    md_parts.append(f"- SOP Modules Used: {get('sop_modules_used')}")
    md_parts.append(f"- Engines Used: {get('engines_used')}")
    md_parts.append(f"- Core Learning Modules Used: {get('core_learning_modules_used')}")
    md_parts.append(f"- Gated Platter Triggered: {_format_yes_no(session.get('gated_platter_triggered'))}")
    md_parts.append(f"- WRAP Phase Reached: {_format_yes_no(session.get('wrap_phase_reached'))}")
    
    anki_count = session.get('anki_cards_count')
    anki_str = str(anki_count) if anki_count is not None else "0"
    md_parts.append(f"- Anki Cards Created: {anki_str}")
    
    md_parts.append(f"- Off-source drift? (Y/N): {_format_yes_no(session.get('off_source_drift'))}")
    md_parts.append(f"- Source snippets used? (Y/N): {_format_yes_no(session.get('source_snippets_used'))}")
    md_parts.append(f"- Prompt Drift? (Y/N): {_format_yes_no(session.get('prompt_drift'))}")
    md_parts.append(f"- Prompt Drift Notes: {get('prompt_drift_notes')}")
    md_parts.append("")
    
    # Anatomy-Specific
    md_parts.append("## Anatomy-Specific")
    md_parts.append(f"- Region Covered: {get('region_covered')}")
    md_parts.append(f"- Landmarks Mastered: {get('landmarks_mastered')}")
    md_parts.append(f"- Muscles Attached: {get('muscles_attached')}")
    md_parts.append(f"- OIAN Completed For: {get('oian_completed_for')}")
    md_parts.append(f"- Rollback Events: {_format_yes_no(session.get('rollback_events'))}")
    md_parts.append(f"- Drawing Used: {_format_yes_no(session.get('drawing_used'))}")
    md_parts.append(f"- Drawings Completed: {get('drawings_completed')}")
    md_parts.append("")
    
    # Ratings
    md_parts.append("## Ratings (1-5 scale)")
    md_parts.append(f"- Understanding Level: {_format_rating(session.get('understanding_level'))}")
    md_parts.append(f"- Retention Confidence: {_format_rating(session.get('retention_confidence'))}")
    md_parts.append(f"- System Performance: {_format_rating(session.get('system_performance'))}")
    md_parts.append(f"- Calibration Check: {get('calibration_check')}")
    md_parts.append("")
    
    # Anchors Locked
    md_parts.append("## Anchors Locked")
    md_parts.append(_format_anchors(session.get('anchors_locked', '')))
    md_parts.append("")
    
    # Weak Anchors
    md_parts.append("## Weak Anchors (for WRAP cards)")
    md_parts.append(_format_weak_anchors(session.get('weak_anchors', '')))
    md_parts.append("")
    
    # Reflection
    md_parts.append("## Reflection")
    md_parts.append("")
    md_parts.append("### What Worked")
    md_parts.append(get('what_worked', '[Not recorded]'))
    md_parts.append("")
    md_parts.append("### What Needs Fixing")
    md_parts.append(get('what_needs_fixing', '[Not recorded]'))
    md_parts.append("")
    md_parts.append("### Gaps Identified")
    md_parts.append(get('gaps_identified', '[Not recorded]'))
    md_parts.append("")
    md_parts.append("### Notes/Insights")
    md_parts.append(get('notes_insights', '[Not recorded]'))
    md_parts.append("")
    
    # Next Session Priority
    md_parts.append("## Next Session Priority")
    md_parts.append(f"- Topic: {get('next_topic')}")
    md_parts.append(f"- Focus: {get('next_focus')}")
    md_parts.append(f"- Materials Needed: {get('next_materials')}")
    md_parts.append("")
    
    return '\n'.join(md_parts)


def markdown_to_session(md_content: str) -> dict:
    """Parse markdown content into a session dictionary.
    
    This is a convenience wrapper that can be used for round-trip testing
    or for parsing markdown files into session records.
    
    Args:
        md_content: Raw markdown content following TEMPLATE.md format.
    
    Returns:
        Dictionary with session fields ready for database insertion.
    
    Note:
        For full parsing, use ingest_session.parse_session_log() instead.
        This is a simplified parser for basic round-trip operations.
    """
    # Import the main parser to avoid duplication
    try:
        from ingest_session import parse_session_log
        return parse_session_log(md_content)
    except ImportError:
        # Fallback: basic parsing
        session = {}
        
        # Extract date from header
        date_match = re.search(r'^# Session Log - (\d{4}-\d{2}-\d{2})', md_content, re.MULTILINE)
        if date_match:
            session['session_date'] = date_match.group(1)
        
        # Extract key fields using simple patterns
        patterns = {
            'session_time': r'^- Time:\s*(.+)$',
            'study_mode': r'^- Study Mode:\s*(.+)$',
            'main_topic': r'^- Main Topic:\s*(.+)$',
            'subtopics': r'^- Subtopics:\s*(.+)$',
            'understanding_level': r'^- Understanding Level:\s*(\d)',
            'retention_confidence': r'^- Retention Confidence:\s*(\d)',
            'system_performance': r'^- System Performance:\s*(\d)',
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, md_content, re.MULTILINE)
            if match:
                session[key] = match.group(1).strip()
        
        return session


# CLI entry point for testing
if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python session_sync.py <session_id>")
        print("       Exports a session from DB to markdown and prints to stdout.")
        sys.exit(1)
    
    session_id = int(sys.argv[1])
    
    from db_setup import get_connection
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    row = cursor.fetchone()
    
    if not row:
        print(f"Session {session_id} not found.")
        sys.exit(1)
    
    # Convert row to dict
    columns = [desc[0] for desc in cursor.description]
    session = dict(zip(columns, row))
    
    # Generate markdown
    md = session_to_markdown(session)
    print(md)
    
    conn.close()

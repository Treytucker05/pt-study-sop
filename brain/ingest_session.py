#!/usr/bin/env python3
"""
Ingest session log markdown files into the PT Study Brain database.
Parses v9.1 template format.
"""

import sqlite3
import os
import re
import sys
from pathlib import Path
from datetime import datetime

from db_setup import (
    DB_PATH, compute_file_checksum, is_file_ingested, 
    mark_file_ingested, remove_ingested_file, get_ingested_session_id
)

def parse_markdown_session(filepath):
    """
    Lightweight parser for the simplified session markdown used in tests.
    Accepts mixed casing on labels and normalizes Yes/No and study mode casing.
    Raises ValueError when a required field (Date) is missing.
    """
    text = Path(filepath).read_text(encoding="utf-8")

    def grab(pattern, default=""):
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        return match.group(1).strip() if match else default

    def grab_block(pattern, default=""):
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        return match.group(1).strip() if match else default

    def grab_int(pattern):
        val = grab(pattern, "")
        return int(val) if val.isdigit() else 0

    def normalize_yes_no(val):
        val = val.strip()
        if not val:
            return ""
        return "Yes" if val.lower().startswith("y") else "No" if val.lower().startswith("n") else val

    session_date = grab(r"-\s*Date:\s*(.+)")
    if not session_date:
        raise ValueError("Date not found in session log")

    data = {
        "session_date": session_date,
        "session_time": grab(r"-\s*Time:\s*(.+)"),
        "topic": grab(r"-\s*Topic:\s*(.+)"),
        "study_mode": grab(r"-\s*Study\s+Mode:\s*(.+)").title(),
        "time_spent_minutes": grab_int(r"-\s*Time\s+Spent:\s*(\d+)"),
        "frameworks_used": grab(r"-\s*Frameworks\s+Used:\s*(.+)"),
        "sop_modules_used": grab(r"-\s*SOP\s+Modules\s+Used:\s*(.+)"),
        "engines_used": grab(r"-\s*Engines\s+Used:\s*(.+)"),
        "core_learning_modules_used": grab(r"-\s*Core\s+Learning\s+Modules\s+Used:\s*(.+)"),
        "gated_platter_triggered": normalize_yes_no(grab(r"-\s*Gated\s+Platter\s+Triggered:\s*(.+)")),
        "wrap_phase_reached": normalize_yes_no(grab(r"-\s*WRAP\s+Phase\s+Reached:\s*(.+)")),
        "anki_cards_count": grab_int(r"-\s*Anki\s+Cards\s+Created:\s*(\d+)"),
        "understanding_level": grab_int(r"-\s*Understanding\s+Level:\s*(\d+)"),
        "retention_confidence": grab_int(r"-\s*Retention\s+Confidence:\s*(\d+)"),
        "system_performance": grab_int(r"-\s*System\s+Performance:\s*(\d+)"),
        "prompt_drift": normalize_yes_no(grab(r"-\s*Prompt\s+Drift\?\s*\(Y/N\):\s*(.+)")),
        "prompt_drift_notes": grab(r"-\s*Prompt\s+Drift\s+Notes:\s*(.+)"),
        "what_worked": grab_block(r"###\s*What Worked\s*(.+?)(?=###|$)", ""),
        "what_needs_fixing": grab_block(r"###\s*What Needs Fixing\s*(.+?)(?=###|$)", ""),
        "notes_insights": grab_block(r"###\s*Notes/Insights\s*(.+?)(?=###|$)", ""),
    }

    return data

def parse_session_log(filepath):
    """
    Parse a session log markdown file and extract all fields.
    Returns a dictionary of session data.
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    data = {}
    
    # Helper function to extract value after a label
    def extract_field(pattern, text, default=''):
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            value = match.group(1).strip()
            # Clean up common placeholder patterns
            if value.startswith('[') and value.endswith(']'):
                return ''
            if value in ['YYYY-MM-DD', 'HH:MM', 'X']:
                return ''
            return value
        return default
    
    # Helper to extract section content
    def extract_section(header, text):
        pattern = rf'###\s*{header}\s*\n(.*?)(?=\n###|\n##|\Z)'
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            content = match.group(1).strip()
            if content.startswith('[') and content.endswith(']'):
                return ''
            return content
        return ''
    
    # Session Info
    data['session_date'] = extract_field(r'-\s*Date:\s*(.+)', content)
    data['session_time'] = extract_field(r'-\s*Time:\s*(.+)', content)
    
    duration_str = extract_field(r'-\s*Duration:\s*(\d+)', content)
    data['duration_minutes'] = int(duration_str) if duration_str else 0
    data['time_spent_minutes'] = data['duration_minutes']
    
    data['study_mode'] = extract_field(r'-\s*Study Mode:\s*(.+)', content)
    
    # Planning Phase
    data['target_exam'] = extract_field(r'-\s*Target Exam/Block:\s*(.+)', content)
    data['source_lock'] = extract_field(r'-\s*Source-Lock:\s*(.+)', content)
    data['plan_of_attack'] = extract_field(r'-\s*Plan of Attack:\s*(.+)', content)
    
    # Topic Coverage
    data['main_topic'] = extract_field(r'-\s*Main Topic:\s*(.+)', content)
    data['topic'] = data.get('main_topic') or ''
    data['subtopics'] = extract_field(r'-\s*Subtopics:\s*(.+)', content)
    
    # Execution Details
    data['frameworks_used'] = extract_field(r'-\s*Frameworks Used:\s*(.+)', content)
    data['sop_modules_used'] = extract_field(r'-\s*SOP Modules Used:\s*(.+)', content)
    data['engines_used'] = extract_field(r'-\s*Engines Used:\s*(.+)', content)
    data['core_learning_modules_used'] = extract_field(r'-\s*Core Learning Modules Used:\s*(.+)', content)
    data['gated_platter_triggered'] = extract_field(r'-\s*Gated Platter Triggered:\s*(.+)', content)
    data['wrap_phase_reached'] = extract_field(r'-\s*WRAP Phase Reached:\s*(.+)', content)

    cards_str = extract_field(r'-\s*Anki Cards Created:\s*(\d+)', content)
    data['anki_cards_count'] = int(cards_str) if cards_str else 0
    data['off_source_drift'] = extract_field(r'-\s*Off-source drift\?\s*\(Y/N\):\s*(.+)', content)
    data['source_snippets_used'] = extract_field(r'-\s*Source snippets used\?\s*\(Y/N\):\s*(.+)', content)
    data['prompt_drift'] = extract_field(r'-\s*Prompt Drift\?\s*\(Y/N\):\s*(.+)', content)
    data['prompt_drift_notes'] = extract_field(r'-\s*Prompt Drift Notes:\s*(.+)', content)
    
    # Anatomy-Specific
    data['region_covered'] = extract_field(r'-\s*Region Covered:\s*(.+)', content)
    data['landmarks_mastered'] = extract_field(r'-\s*Landmarks Mastered:\s*(.+)', content)
    data['muscles_attached'] = extract_field(r'-\s*Muscles Attached:\s*(.+)', content)
    data['oian_completed_for'] = extract_field(r'-\s*OIAN Completed For:\s*(.+)', content)
    data['rollback_events'] = extract_field(r'-\s*Rollback Events:\s*(.+)', content)
    data['drawing_used'] = extract_field(r'-\s*Drawing Used:\s*(.+)', content)
    data['drawings_completed'] = extract_field(r'-\s*Drawings Completed:\s*(.+)', content)
    
    # Ratings
    understanding_str = extract_field(r'-\s*Understanding Level:\s*(\d+)', content)
    data['understanding_level'] = int(understanding_str) if understanding_str else None
    
    retention_str = extract_field(r'-\s*Retention Confidence:\s*(\d+)', content)
    data['retention_confidence'] = int(retention_str) if retention_str else None
    
    system_str = extract_field(r'-\s*System Performance:\s*(\d+)', content)
    data['system_performance'] = int(system_str) if system_str else None
    
    data['calibration_check'] = extract_field(r'-\s*Calibration Check:\s*(.+)', content)
    
    # Anchors Locked - extract numbered list
    anchors_match = re.search(r'## Anchors Locked\s*\n(.*?)(?=\n##|\Z)', content, re.DOTALL)
    if anchors_match:
        anchors_text = anchors_match.group(1).strip()
        # Extract numbered items
        anchors = re.findall(r'\d+\.\s*(.+)', anchors_text)
        # Filter out placeholder items
        anchors = [a for a in anchors if not (a.startswith('[') and ']' in a)]
        data['anchors_locked'] = '\n'.join(anchors) if anchors else ''
    else:
        data['anchors_locked'] = ''

    # Weak Anchors section
    weak_match = re.search(r'## Weak Anchors.*?\n(.*?)(?=\n##|\Z)', content, re.DOTALL | re.IGNORECASE)
    if weak_match:
        weak_text = weak_match.group(1).strip()
        weak_items = [w.strip('- ').strip() for w in weak_text.splitlines() if w.strip()]
        data['weak_anchors'] = '\n'.join(weak_items)
    else:
        data['weak_anchors'] = ''
    
    # Reflection sections
    data['what_worked'] = extract_section('What Worked', content)
    data['what_needs_fixing'] = extract_section('What Needs Fixing', content)
    data['gaps_identified'] = extract_section('Gaps Identified', content)
    data['notes_insights'] = extract_section('Notes/Insights', content)
    
    # WRAP v9.2 Fields - parse both inline and section formats
    # Anki Cards text (distinct from anki_cards_count)
    data['anki_cards_text'] = extract_field(r'-\s*Anki Cards:\s*(.+)', content) or extract_section('Anki Cards', content) or None
    
    # Glossary entries
    data['glossary_entries'] = extract_field(r'-\s*Glossary:\s*(.+)', content) or extract_section('Glossary', content) or None
    
    # Wrap Watchlist
    data['wrap_watchlist'] = extract_field(r'-\s*Wrap Watchlist:\s*(.+)', content) or extract_section('Wrap Watchlist', content) or None
    
    # Clinical Links
    data['clinical_links'] = extract_field(r'-\s*Clinical Links:\s*(.+)', content) or extract_section('Clinical Links', content) or None
    
    # Next Session Plan (full plan text, distinct from next_topic/next_focus)
    data['next_session_plan'] = extract_field(r'-\s*Next Session:\s*(.+)', content) or extract_section('Next Session', content) or None
    
    # Spaced Reviews
    data['spaced_reviews'] = extract_field(r'-\s*Spaced Reviews:\s*(.+)', content) or extract_section('Spaced Reviews', content) or None
    
    # Runtime Notes
    data['runtime_notes'] = extract_field(r'-\s*Runtime Notes:\s*(.+)', content) or extract_section('Runtime Notes', content) or None
    
    # Error tracking fields - look for sub-items under Errors section
    errors_section = extract_section('Errors', content)
    if errors_section:
        # Parse sub-fields from Errors section
        data['errors_conceptual'] = extract_field(r'-\s*Conceptual:\s*(.+)', errors_section) or None
        data['errors_discrimination'] = extract_field(r'-\s*Discrimination:\s*(.+)', errors_section) or None
        data['errors_recall'] = extract_field(r'-\s*Recall:\s*(.+)', errors_section) or None
    else:
        # Try inline format directly
        data['errors_conceptual'] = extract_field(r'-\s*Conceptual:\s*(.+)', content) or None
        data['errors_discrimination'] = extract_field(r'-\s*Discrimination:\s*(.+)', content) or None
        data['errors_recall'] = extract_field(r'-\s*Recall:\s*(.+)', content) or None
    
    # Next Session Priority
    data['next_topic'] = extract_field(r'-\s*Topic:\s*(.+)', content.split('## Next Session')[-1] if '## Next Session' in content else '')
    data['next_focus'] = extract_field(r'-\s*Focus:\s*(.+)', content.split('## Next Session')[-1] if '## Next Session' in content else '')
    data['next_materials'] = extract_field(r'-\s*Materials Needed:\s*(.+)', content.split('## Next Session')[-1] if '## Next Session' in content else '')
    
    # Metadata
    data['created_at'] = datetime.now().isoformat()
    data['schema_version'] = '9.1'
    
    return data

def normalize_topic_name(topic):
    """
    Normalize topic name for consistent mastery tracking.
    Lowercase and strip whitespace.
    """
    if not topic:
        return ""
    return topic.strip().lower()


def update_topic_mastery(topic, understanding, retention, session_date):
    """
    Update topic_mastery table after a session is ingested.
    Uses UPSERT pattern to increment study_count and recalculate averages.
    
    Args:
        topic: The main topic studied (will be normalized)
        understanding: Understanding level (1-5) or None
        retention: Retention confidence (1-5) or None  
        session_date: ISO date string (YYYY-MM-DD)
    """
    normalized_topic = normalize_topic_name(topic)
    if not normalized_topic:
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if topic exists
        cursor.execute(
            "SELECT study_count, avg_understanding, avg_retention, first_studied FROM topic_mastery WHERE topic = ?",
            (normalized_topic,)
        )
        existing = cursor.fetchone()
        
        if existing:
            old_count, old_avg_u, old_avg_r, first_studied = existing
            new_count = old_count + 1
            
            # Recalculate running averages (handle None values)
            if understanding is not None:
                if old_avg_u is not None:
                    new_avg_u = (old_avg_u * old_count + understanding) / new_count
                else:
                    new_avg_u = float(understanding)
            else:
                new_avg_u = old_avg_u
            
            if retention is not None:
                if old_avg_r is not None:
                    new_avg_r = (old_avg_r * old_count + retention) / new_count
                else:
                    new_avg_r = float(retention)
            else:
                new_avg_r = old_avg_r
            
            cursor.execute(
                """
                UPDATE topic_mastery 
                SET study_count = ?, last_studied = ?, avg_understanding = ?, avg_retention = ?
                WHERE topic = ?
                """,
                (new_count, session_date, new_avg_u, new_avg_r, normalized_topic)
            )
        else:
            # New topic - insert
            cursor.execute(
                """
                INSERT INTO topic_mastery (topic, study_count, last_studied, first_studied, avg_understanding, avg_retention)
                VALUES (?, 1, ?, ?, ?, ?)
                """,
                (
                    normalized_topic,
                    session_date,
                    session_date,
                    float(understanding) if understanding is not None else None,
                    float(retention) if retention is not None else None
                )
            )
        
        conn.commit()
    except Exception as e:
        print(f"[WARN] Failed to update topic mastery: {e}")
    finally:
        conn.close()


def validate_session_data(data):
    """
    Validate required fields are present.
    Returns (is_valid, error_message).
    """
    # Normalize aliases/fallbacks
    if not data.get('topic') and data.get('main_topic'):
        data['topic'] = data['main_topic']
    if not data.get('main_topic') and data.get('topic'):
        data['main_topic'] = data['topic']
    if 'time_spent_minutes' not in data and 'duration_minutes' in data:
        data['time_spent_minutes'] = data.get('duration_minutes', 0)
    # Normalize study mode casing
    if data.get('study_mode'):
        data['study_mode'] = data['study_mode'].title()

    required = ['session_date', 'topic', 'study_mode']
    missing = [f for f in required if not data.get(f)]
    
    if missing:
        return False, f"Missing required fields: {', '.join(missing)}"
    
    # Validate date format
    try:
        datetime.strptime(data['session_date'], '%Y-%m-%d')
    except ValueError:
        return False, f"Invalid date format: {data['session_date']} (expected YYYY-MM-DD)"
    
    # Validate study mode
    valid_modes = ['Core', 'Sprint', 'Drill', 'Diagnostic Sprint', 'Teaching Sprint']
    if data['study_mode'] not in valid_modes:
        return False, f"Invalid study mode: {data['study_mode']} (expected one of: {', '.join(valid_modes)})"
    
    # Validate duration
    if data.get('duration_minutes', 0) < 0:
        return False, f"Duration must be non-negative minutes (got {data.get('duration_minutes')})"
    
    # Validate ratings are 1-5 when present
    rating_fields = {
        'Understanding Level': data.get('understanding_level'),
        'Retention Confidence': data.get('retention_confidence'),
        'System Performance': data.get('system_performance'),
    }
    for label, value in rating_fields.items():
        if value is not None:
            if value < 1 or value > 5:
                return False, f"{label} must be between 1 and 5 (got {value})"

    return True, None

def insert_session(data):
    """
    Insert a session record into the database.
    Returns (success, message).
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        columns = [
            'session_date', 'session_time', 'time_spent_minutes', 'duration_minutes', 'study_mode',
            'target_exam', 'source_lock', 'plan_of_attack',
            'topic', 'main_topic', 'subtopics',
            'frameworks_used', 'sop_modules_used', 'engines_used', 'core_learning_modules_used', 'gated_platter_triggered', 'wrap_phase_reached', 'anki_cards_count',
            'off_source_drift', 'source_snippets_used', 'prompt_drift', 'prompt_drift_notes',
            'region_covered', 'landmarks_mastered', 'muscles_attached', 'oian_completed_for',
            'rollback_events', 'drawing_used', 'drawings_completed',
            'understanding_level', 'retention_confidence', 'system_performance', 'calibration_check',
            'anchors_locked', 'weak_anchors',
            'what_worked', 'what_needs_fixing', 'gaps_identified', 'notes_insights',
            'next_topic', 'next_focus', 'next_materials',
            'created_at', 'schema_version', 'source_path',
            # WRAP v9.2 fields
            'anki_cards_text', 'glossary_entries', 'wrap_watchlist', 'clinical_links',
            'next_session_plan', 'spaced_reviews', 'runtime_notes',
            'errors_conceptual', 'errors_discrimination', 'errors_recall'
        ]
        placeholders = ", ".join(["?"] * len(columns))
        values = (
            data.get('session_date'),
            data.get('session_time', ''),
            data.get('time_spent_minutes', data.get('duration_minutes', 0)),
            data.get('duration_minutes', data.get('time_spent_minutes', 0)),
            data.get('study_mode'),
            data.get('target_exam', ''),
            data.get('source_lock', ''),
            data.get('plan_of_attack', ''),
            data.get('topic'),
            data.get('main_topic'),
            data.get('subtopics', ''),
            data.get('frameworks_used', ''),
            data.get('sop_modules_used', ''),
            data.get('engines_used', ''),
            data.get('core_learning_modules_used', ''),
            data.get('gated_platter_triggered', ''),
            data.get('wrap_phase_reached', ''),
            data.get('anki_cards_count', 0),
            data.get('off_source_drift', ''),
            data.get('source_snippets_used', ''),
            data.get('prompt_drift', ''),
            data.get('prompt_drift_notes', ''),
            data.get('region_covered', ''),
            data.get('landmarks_mastered', ''),
            data.get('muscles_attached', ''),
            data.get('oian_completed_for', ''),
            data.get('rollback_events', ''),
            data.get('drawing_used', ''),
            data.get('drawings_completed', ''),
            data.get('understanding_level'),
            data.get('retention_confidence'),
            data.get('system_performance'),
            data.get('calibration_check', ''),
            data.get('anchors_locked', ''),
            data.get('weak_anchors', ''),
            data.get('what_worked', ''),
            data.get('what_needs_fixing', ''),
            data.get('gaps_identified', ''),
            data.get('notes_insights', ''),
            data.get('next_topic', ''),
            data.get('next_focus', ''),
            data.get('next_materials', ''),
            data.get('created_at'),
            data.get('schema_version', '9.2'),
            data.get('source_path', ''),
            # WRAP v9.2 fields
            data.get('anki_cards_text'),
            data.get('glossary_entries'),
            data.get('wrap_watchlist'),
            data.get('clinical_links'),
            data.get('next_session_plan'),
            data.get('spaced_reviews'),
            data.get('runtime_notes'),
            data.get('errors_conceptual'),
            data.get('errors_discrimination'),
            data.get('errors_recall')
        )
        cursor.execute(f'''INSERT INTO sessions ({", ".join(columns)}) VALUES ({placeholders})''', values)
        
        conn.commit()
        session_id = cursor.lastrowid
        conn.close()
        
        # Update topic mastery tracking
        topic = data.get('main_topic') or data.get('topic')
        if topic:
            update_topic_mastery(
                topic=topic,
                understanding=data.get('understanding_level'),
                retention=data.get('retention_confidence'),
                session_date=data.get('session_date')
            )
        
        return True, f"Session ingested successfully (ID: {session_id})"
        
    except sqlite3.IntegrityError as e:
        conn.close()
        if 'UNIQUE constraint' in str(e):
            return True, "Session already exists (skipped duplicate)"
        return False, f"Database error: {e}"
    except Exception as e:
        conn.close()
        return False, f"Error: {e}"

def ingest_file(filepath, force=False):
    """
    Main function to ingest a session log file.
    
    Args:
        filepath: Path to the session log markdown file.
        force: If True, bypass checksum tracking and force re-ingestion.
    
    Returns:
        bool: True if successful (or skipped), False on error.
    """
    # Normalize the filepath for consistent tracking
    filepath = os.path.abspath(filepath)
    filename = os.path.basename(filepath)
    
    print(f"\n[INFO] Processing: {filename}")
    
    if not os.path.exists(filepath):
        print(f"[ERROR] File not found: {filepath}")
        return False
    
    # Compute checksum for tracking
    checksum = compute_file_checksum(filepath)
    
    # Check if already ingested (unless force flag is set)
    if not force:
        conn = sqlite3.connect(DB_PATH)
        already_ingested, existing_session_id = is_file_ingested(conn, filepath, checksum)
        
        if already_ingested:
            conn.close()
            print(f"[SKIP] Already ingested (unchanged): {filename}")
            return True
        
        # Check if file exists but with different checksum (modified file)
        old_session_id = get_ingested_session_id(conn, filepath)
        if old_session_id:
            print(f"[INFO] File modified since last ingestion, re-ingesting...")
            # Delete the old session record
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sessions WHERE id = ?", (old_session_id,))
            remove_ingested_file(conn, filepath)
            conn.commit()
        conn.close()
    
    # Parse the file
    try:
        data = parse_session_log(filepath)
    except Exception as e:
        print(f"[ERROR] Failed to parse file: {e}")
        return False
    
    # Store the source path for bidirectional sync
    data['source_path'] = filepath
    
    # Validate
    is_valid, error = validate_session_data(data)
    if not is_valid:
        print(f"[ERROR] Validation failed: {error}")
        # Track the file anyway to skip on future runs (with session_id=None to indicate failure)
        conn = sqlite3.connect(DB_PATH)
        mark_file_ingested(conn, filepath, checksum, None)
        conn.close()
        return False
    
    # Preview parsed data
    print(f"[INFO] Parsed session:")
    print(f"       Date: {data['session_date']}")
    print(f"       Topic: {data['main_topic']}")
    print(f"       Mode: {data['study_mode']}")
    print(f"       Duration: {data['duration_minutes']} min")
    if data.get('target_exam'):
        print(f"       Exam: {data['target_exam']}")
    if data.get('region_covered'):
        print(f"       Region: {data['region_covered']}")
    if data.get('landmarks_mastered'):
        print(f"       Landmarks: {data['landmarks_mastered'][:50]}...")
    
    # Insert
    success, message = insert_session(data)
    if success:
        print(f"[OK] {message}")
        # Mark file as ingested for future runs
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM sessions WHERE session_date = ? AND main_topic = ? ORDER BY id DESC LIMIT 1",
            (data['session_date'], data['main_topic'])
        )
        result = cursor.fetchone()
        session_id = result[0] if result else None
        mark_file_ingested(conn, filepath, checksum, session_id)
        conn.close()
    else:
        print(f"[ERROR] {message}")
    
    return success

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Ingest session log files')
    parser.add_argument('filepath', help='Path to the session log markdown file')
    parser.add_argument('--force', '-f', action='store_true', 
                        help='Force re-ingestion, bypassing checksum tracking')
    args = parser.parse_args()
    
    success = ingest_file(args.filepath, force=args.force)
    sys.exit(0 if success else 1)

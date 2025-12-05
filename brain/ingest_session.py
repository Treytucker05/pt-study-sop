#!/usr/bin/env python3
"""
Ingest session log markdown files into the PT Study Brain database.
Parses v9.1 template format.
"""

import sqlite3
import os
import re
import sys
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'pt_study.db')

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
    
    data['study_mode'] = extract_field(r'-\s*Study Mode:\s*(.+)', content)
    
    # Planning Phase
    data['target_exam'] = extract_field(r'-\s*Target Exam/Block:\s*(.+)', content)
    data['source_lock'] = extract_field(r'-\s*Source-Lock:\s*(.+)', content)
    data['plan_of_attack'] = extract_field(r'-\s*Plan of Attack:\s*(.+)', content)
    
    # Topic Coverage
    data['main_topic'] = extract_field(r'-\s*Main Topic:\s*(.+)', content)
    data['subtopics'] = extract_field(r'-\s*Subtopics:\s*(.+)', content)
    
    # Execution Details
    data['frameworks_used'] = extract_field(r'-\s*Frameworks Used:\s*(.+)', content)
    data['gated_platter_triggered'] = extract_field(r'-\s*Gated Platter Triggered:\s*(.+)', content)
    data['wrap_phase_reached'] = extract_field(r'-\s*WRAP Phase Reached:\s*(.+)', content)
    
    cards_str = extract_field(r'-\s*Anki Cards Created:\s*(\d+)', content)
    data['anki_cards_count'] = int(cards_str) if cards_str else 0
    
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
    
    # Reflection sections
    data['what_worked'] = extract_section('What Worked', content)
    data['what_needs_fixing'] = extract_section('What Needs Fixing', content)
    data['gaps_identified'] = extract_section('Gaps Identified', content)
    data['notes_insights'] = extract_section('Notes/Insights', content)
    
    # Next Session Priority
    data['next_topic'] = extract_field(r'-\s*Topic:\s*(.+)', content.split('## Next Session')[-1] if '## Next Session' in content else '')
    data['next_focus'] = extract_field(r'-\s*Focus:\s*(.+)', content.split('## Next Session')[-1] if '## Next Session' in content else '')
    data['next_materials'] = extract_field(r'-\s*Materials Needed:\s*(.+)', content.split('## Next Session')[-1] if '## Next Session' in content else '')
    
    # Metadata
    data['created_at'] = datetime.now().isoformat()
    data['schema_version'] = '9.1'
    
    return data

def validate_session_data(data):
    """
    Validate required fields are present.
    Returns (is_valid, error_message).
    """
    required = ['session_date', 'main_topic', 'study_mode']
    missing = [f for f in required if not data.get(f)]
    
    if missing:
        return False, f"Missing required fields: {', '.join(missing)}"
    
    # Validate date format
    try:
        datetime.strptime(data['session_date'], '%Y-%m-%d')
    except ValueError:
        return False, f"Invalid date format: {data['session_date']} (expected YYYY-MM-DD)"
    
    # Validate study mode
    valid_modes = ['Core', 'Sprint', 'Drill']
    if data['study_mode'] not in valid_modes:
        return False, f"Invalid study mode: {data['study_mode']} (expected one of: {', '.join(valid_modes)})"
    
    return True, None

def insert_session(data):
    """
    Insert a session record into the database.
    Returns (success, message).
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO sessions (
                session_date, session_time, duration_minutes, study_mode,
                target_exam, source_lock, plan_of_attack,
                main_topic, subtopics,
                frameworks_used, gated_platter_triggered, wrap_phase_reached, anki_cards_count,
                region_covered, landmarks_mastered, muscles_attached, oian_completed_for,
                rollback_events, drawing_used, drawings_completed,
                understanding_level, retention_confidence, system_performance, calibration_check,
                anchors_locked,
                what_worked, what_needs_fixing, gaps_identified, notes_insights,
                next_topic, next_focus, next_materials,
                created_at, schema_version
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('session_date'),
            data.get('session_time', ''),
            data.get('duration_minutes', 0),
            data.get('study_mode'),
            data.get('target_exam', ''),
            data.get('source_lock', ''),
            data.get('plan_of_attack', ''),
            data.get('main_topic'),
            data.get('subtopics', ''),
            data.get('frameworks_used', ''),
            data.get('gated_platter_triggered', ''),
            data.get('wrap_phase_reached', ''),
            data.get('anki_cards_count', 0),
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
            data.get('what_worked', ''),
            data.get('what_needs_fixing', ''),
            data.get('gaps_identified', ''),
            data.get('notes_insights', ''),
            data.get('next_topic', ''),
            data.get('next_focus', ''),
            data.get('next_materials', ''),
            data.get('created_at'),
            data.get('schema_version', '9.1')
        ))
        
        conn.commit()
        session_id = cursor.lastrowid
        conn.close()
        return True, f"Session ingested successfully (ID: {session_id})"
        
    except sqlite3.IntegrityError as e:
        conn.close()
        if 'UNIQUE constraint' in str(e):
            return False, "Session already exists (duplicate date/time/topic)"
        return False, f"Database error: {e}"
    except Exception as e:
        conn.close()
        return False, f"Error: {e}"

def ingest_file(filepath):
    """
    Main function to ingest a session log file.
    """
    print(f"\n[INFO] Processing: {filepath}")
    
    if not os.path.exists(filepath):
        print(f"[ERROR] File not found: {filepath}")
        return False
    
    # Parse the file
    try:
        data = parse_session_log(filepath)
    except Exception as e:
        print(f"[ERROR] Failed to parse file: {e}")
        return False
    
    # Validate
    is_valid, error = validate_session_data(data)
    if not is_valid:
        print(f"[ERROR] Validation failed: {error}")
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
    else:
        print(f"[ERROR] {message}")
    
    return success

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python ingest_session.py <session_log.md>")
        print("       python ingest_session.py brain/session_logs/2025-12-04_anatomy.md")
        sys.exit(1)
    
    filepath = sys.argv[1]
    success = ingest_file(filepath)
    sys.exit(0 if success else 1)

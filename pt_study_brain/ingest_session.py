#!/usr/bin/env python3
"""
Session log ingestion script for PT Study Brain.
Parses markdown session logs and inserts data into the database.
"""

import sys
import re
import sqlite3
from datetime import datetime
from pathlib import Path
from db_setup import get_connection, DB_PATH


def parse_markdown_session(file_path):
    """
    Parse a markdown session log file and extract structured data.
    
    Expected format:
    # Session Log - [Date]
    
    ## Session Info
    - Date: YYYY-MM-DD
    - Time: HH:MM
    - Topic: ...
    - Study Mode: Sprint/Core/Drill
    - Time Spent: ... minutes
    
    ## Execution Details
    - Frameworks Used: ...
    - Gated Platter Triggered: Yes/No
    - WRAP Phase Reached: Yes/No
    - Anki Cards Created: ...
    
    ## Ratings
    - Understanding Level: X/5
    - Retention Confidence: X/5
    - System Performance: X/5
    
    ## Reflection
    ### What Worked
    ...
    
    ### What Needs Fixing
    ...
    
    ### Notes/Insights
    ...
    """
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    data = {}
    
    # Parse session info section
    date_match = re.search(r'Date:\s*(\d{4}-\d{2}-\d{2})', content)
    time_match = re.search(r'Time:\s*(\d{2}:\d{2})', content)
    topic_match = re.search(r'Topic:\s*(.+?)(?:\n|$)', content)
    mode_match = re.search(r'Study Mode:\s*(Sprint|Core|Drill)', content, re.IGNORECASE)
    time_spent_match = re.search(r'Time Spent:\s*(\d+)\s*minutes?', content, re.IGNORECASE)
    
    # Parse execution details
    frameworks_match = re.search(r'Frameworks Used:\s*(.+?)(?:\n|$)', content)
    gated_match = re.search(r'Gated Platter Triggered:\s*(Yes|No)', content, re.IGNORECASE)
    wrap_match = re.search(r'WRAP Phase Reached:\s*(Yes|No)', content, re.IGNORECASE)
    anki_match = re.search(r'Anki Cards Created:\s*(\d+)', content)
    
    # Parse ratings
    understanding_match = re.search(r'Understanding Level:\s*(\d)', content)
    retention_match = re.search(r'Retention Confidence:\s*(\d)', content)
    performance_match = re.search(r'System Performance:\s*(\d)', content)
    
    # Parse reflection sections
    what_worked_match = re.search(r'###\s*What Worked\s*\n(.*?)(?=###|\Z)', content, re.DOTALL)
    what_fixing_match = re.search(r'###\s*What Needs Fixing\s*\n(.*?)(?=###|\Z)', content, re.DOTALL)
    notes_match = re.search(r'###\s*Notes/Insights\s*\n(.*?)(?=###|\Z)', content, re.DOTALL)
    
    # Required fields
    if not date_match:
        raise ValueError("Date not found in session log")
    if not time_match:
        raise ValueError("Time not found in session log")
    if not topic_match:
        raise ValueError("Topic not found in session log")
    if not mode_match:
        raise ValueError("Study Mode not found in session log")
    if not time_spent_match:
        raise ValueError("Time Spent not found in session log")
    
    data['session_date'] = date_match.group(1)
    data['session_time'] = time_match.group(1)
    data['topic'] = topic_match.group(1).strip()
    data['study_mode'] = mode_match.group(1).capitalize()
    data['time_spent_minutes'] = int(time_spent_match.group(1))
    
    # Optional fields with defaults
    data['frameworks_used'] = frameworks_match.group(1).strip() if frameworks_match else ""
    data['gated_platter_triggered'] = gated_match.group(1).capitalize() if gated_match else "No"
    data['wrap_phase_reached'] = wrap_match.group(1).capitalize() if wrap_match else "No"
    data['anki_cards_count'] = int(anki_match.group(1)) if anki_match else 0
    
    data['understanding_level'] = int(understanding_match.group(1)) if understanding_match else None
    data['retention_confidence'] = int(retention_match.group(1)) if retention_match else None
    data['system_performance'] = int(performance_match.group(1)) if performance_match else None
    
    data['what_worked'] = what_worked_match.group(1).strip() if what_worked_match else ""
    data['what_needs_fixing'] = what_fixing_match.group(1).strip() if what_fixing_match else ""
    data['notes_insights'] = notes_match.group(1).strip() if notes_match else ""
    
    data['created_at'] = datetime.now().isoformat()
    
    return data


def insert_session(data):
    """
    Insert session data into the database.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO sessions (
                session_date, session_time, topic, study_mode, time_spent_minutes,
                frameworks_used, gated_platter_triggered, wrap_phase_reached,
                anki_cards_count, understanding_level, retention_confidence,
                system_performance, what_worked, what_needs_fixing, notes_insights,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['session_date'],
            data['session_time'],
            data['topic'],
            data['study_mode'],
            data['time_spent_minutes'],
            data['frameworks_used'],
            data['gated_platter_triggered'],
            data['wrap_phase_reached'],
            data['anki_cards_count'],
            data['understanding_level'],
            data['retention_confidence'],
            data['system_performance'],
            data['what_worked'],
            data['what_needs_fixing'],
            data['notes_insights'],
            data['created_at']
        ))
        
        conn.commit()
        session_id = cursor.lastrowid
        print("[OK] Session ingested successfully!")
        print(f"  ID: {session_id}")
        print(f"  Date: {data['session_date']} {data['session_time']}")
        print(f"  Topic: {data['topic']}")
        print(f"  Mode: {data['study_mode']}")
        
    except sqlite3.IntegrityError:
        print("[ERROR] A session with this date/time/topic already exists.")
        print(f"  Date: {data['session_date']} {data['session_time']}")
        print(f"  Topic: {data['topic']}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Error inserting session: {e}")
        sys.exit(1)
    finally:
        conn.close()


def main():
    if len(sys.argv) < 2:
        print("Usage: python ingest_session.py <path_to_session_log.md>")
        print("\nExample:")
        print("  python ingest_session.py session_logs/2025-12-01_shoulder_anatomy.md")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    # Check if file exists
    if not Path(file_path).exists():
        print(f"[ERROR] File not found: {file_path}")
        sys.exit(1)
    
    print(f"[INFO] Reading session log: {file_path}")
    
    try:
        # Parse the markdown file
        data = parse_markdown_session(file_path)
        
        # Insert into database
        insert_session(data)
        
    except ValueError as e:
        print(f"[ERROR] Parsing error: {e}")
        print("\nMake sure your session log follows the expected markdown format.")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()

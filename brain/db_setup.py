#!/usr/bin/env python3
"""
Database setup and schema initialization for PT Study Brain v9.1.
"""

import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'pt_study.db')

def init_database():
    """
    Initialize the SQLite database with the sessions table (v9.1 schema).
    """
    # Ensure data directory exists
    data_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create sessions table with v9.1 schema
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            
            -- Session Info
            session_date TEXT NOT NULL,
            session_time TEXT NOT NULL,
            duration_minutes INTEGER NOT NULL,
            study_mode TEXT NOT NULL,
            
            -- Planning Phase (v9.1)
            target_exam TEXT,
            source_lock TEXT,
            plan_of_attack TEXT,
            
            -- Topic Coverage
            main_topic TEXT NOT NULL,
            subtopics TEXT,
            
            -- Execution Details
            frameworks_used TEXT,
            gated_platter_triggered TEXT,
            wrap_phase_reached TEXT,
            anki_cards_count INTEGER,
            
            -- Anatomy-Specific (v9.1)
            region_covered TEXT,
            landmarks_mastered TEXT,
            muscles_attached TEXT,
            oian_completed_for TEXT,
            rollback_events TEXT,
            drawing_used TEXT,
            drawings_completed TEXT,
            
            -- Ratings
            understanding_level INTEGER,
            retention_confidence INTEGER,
            system_performance INTEGER,
            calibration_check TEXT,
            
            -- Anchors
            anchors_locked TEXT,
            
            -- Reflection
            what_worked TEXT,
            what_needs_fixing TEXT,
            gaps_identified TEXT,
            notes_insights TEXT,
            
            -- Next Session
            next_topic TEXT,
            next_focus TEXT,
            next_materials TEXT,
            
            -- Metadata
            created_at TEXT NOT NULL,
            schema_version TEXT DEFAULT '9.1',
            
            UNIQUE(session_date, session_time, main_topic)
        )
    ''')
    
    # Create indexes for common queries
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_session_date 
        ON sessions(session_date)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_main_topic 
        ON sessions(main_topic)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_study_mode 
        ON sessions(study_mode)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_target_exam 
        ON sessions(target_exam)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_region_covered 
        ON sessions(region_covered)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_understanding 
        ON sessions(understanding_level)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_retention 
        ON sessions(retention_confidence)
    ''')
    
    conn.commit()
    conn.close()
    
    print(f"[OK] Database initialized at: {DB_PATH}")
    print(f"[OK] Schema version: 9.1")

def migrate_from_v8():
    """
    Migrate data from v8 schema to v9.1 schema if needed.
    Maps old column names to new ones.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if migration is needed by looking for old columns
    cursor.execute("PRAGMA table_info(sessions)")
    columns = [col[1] for col in cursor.fetchall()]
    
    # If 'topic' exists but 'main_topic' doesn't, we need to migrate
    if 'topic' in columns and 'main_topic' not in columns:
        print("[INFO] Migrating from v8 schema to v9.1...")
        
        # Rename old table
        cursor.execute("ALTER TABLE sessions RENAME TO sessions_v8")
        
        # Create new table
        init_database()
        
        # Copy data with column mapping
        cursor.execute('''
            INSERT INTO sessions (
                session_date, session_time, duration_minutes, study_mode,
                main_topic, frameworks_used, gated_platter_triggered,
                wrap_phase_reached, anki_cards_count, understanding_level,
                retention_confidence, system_performance, what_worked,
                what_needs_fixing, notes_insights, created_at
            )
            SELECT 
                session_date, session_time, time_spent_minutes, study_mode,
                topic, frameworks_used, gated_platter_triggered,
                wrap_phase_reached, anki_cards_count, understanding_level,
                retention_confidence, system_performance, what_worked,
                what_needs_fixing, notes_insights, created_at
            FROM sessions_v8
        ''')
        
        conn.commit()
        print(f"[OK] Migrated {cursor.rowcount} sessions to v9.1 schema")
        
        # Keep old table as backup
        print("[INFO] Old table preserved as 'sessions_v8'")
    else:
        print("[INFO] No migration needed - already on v9.1 schema or fresh database")
    
    conn.close()

def get_connection():
    """
    Get a database connection.
    """
    return sqlite3.connect(DB_PATH)

def get_schema_version():
    """
    Get the current schema version from the database.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT schema_version FROM sessions LIMIT 1")
        result = cursor.fetchone()
        version = result[0] if result else "unknown"
    except:
        version = "pre-9.1"
    
    conn.close()
    return version

if __name__ == '__main__':
    print("PT Study Brain - Database Setup")
    print("=" * 40)
    
    if os.path.exists(DB_PATH):
        print(f"[INFO] Existing database found at: {DB_PATH}")
        version = get_schema_version()
        print(f"[INFO] Current schema version: {version}")
        
        if version != "9.1":
            response = input("Migrate to v9.1 schema? (y/n): ")
            if response.lower() == 'y':
                migrate_from_v8()
            else:
                print("[INFO] Skipping migration")
    else:
        print("[INFO] No existing database found")
        init_database()

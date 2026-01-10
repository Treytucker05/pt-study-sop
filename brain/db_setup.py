#!/usr/bin/env python3
"""
Database setup and schema initialization for PT Study Brain v9.1.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "pt_study.db")

def init_database():
    """
    Initialize the SQLite database with the sessions table (v9.1 schema)
    plus additive planning/RAG tables.
    """
    # Ensure data directory exists
    data_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # ------------------------------------------------------------------
    # Core sessions table (v9.1 schema – unchanged)
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            -- Session Info
            session_date TEXT NOT NULL,
            session_time TEXT NOT NULL,
            time_spent_minutes INTEGER NOT NULL DEFAULT 0,
            duration_minutes INTEGER DEFAULT 0,
            study_mode TEXT NOT NULL,
            topic TEXT,

            -- Planning Phase (v9.1)
            target_exam TEXT,
            source_lock TEXT,
            plan_of_attack TEXT,

            -- Topic Coverage
            main_topic TEXT,
            subtopics TEXT,

            -- Execution Details
            frameworks_used TEXT,
            sop_modules_used TEXT,
            engines_used TEXT,
            core_learning_modules_used TEXT,
            gated_platter_triggered TEXT,
            wrap_phase_reached TEXT,
            anki_cards_count INTEGER,
            off_source_drift TEXT,
            source_snippets_used TEXT,
            prompt_drift TEXT,
            prompt_drift_notes TEXT,

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
            weak_anchors TEXT,

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
    """
    )
    # Ensure all columns exist (migration for older databases)
    cursor.execute("PRAGMA table_info(sessions)")
    existing_columns = {col[1] for col in cursor.fetchall()}
    
    # Define all required columns with their types (from CREATE TABLE above)
    required_columns = {
        "id": "INTEGER PRIMARY KEY AUTOINCREMENT",
        "session_date": "TEXT NOT NULL",
        "session_time": "TEXT NOT NULL",
        "time_spent_minutes": "INTEGER NOT NULL DEFAULT 0",
        "duration_minutes": "INTEGER DEFAULT 0",
        "study_mode": "TEXT NOT NULL",
        "topic": "TEXT",
        "target_exam": "TEXT",
        "source_lock": "TEXT",
        "plan_of_attack": "TEXT",
        "main_topic": "TEXT",
        "subtopics": "TEXT",
        "frameworks_used": "TEXT",
        "sop_modules_used": "TEXT",
        "engines_used": "TEXT",
        "core_learning_modules_used": "TEXT",
        "gated_platter_triggered": "TEXT",
        "wrap_phase_reached": "TEXT",
        "anki_cards_count": "INTEGER",
        "off_source_drift": "TEXT",
        "source_snippets_used": "TEXT",
        "prompt_drift": "TEXT",
        "prompt_drift_notes": "TEXT",
        "region_covered": "TEXT",
        "landmarks_mastered": "TEXT",
        "muscles_attached": "TEXT",
        "oian_completed_for": "TEXT",
        "rollback_events": "TEXT",
        "drawing_used": "TEXT",
        "drawings_completed": "TEXT",
        "understanding_level": "INTEGER",
        "retention_confidence": "INTEGER",
        "system_performance": "INTEGER",
        "calibration_check": "TEXT",
        "anchors_locked": "TEXT",
        "weak_anchors": "TEXT",
        "what_worked": "TEXT",
        "what_needs_fixing": "TEXT",
        "gaps_identified": "TEXT",
        "notes_insights": "TEXT",
        "next_topic": "TEXT",
        "next_focus": "TEXT",
        "next_materials": "TEXT",
        "created_at": "TEXT NOT NULL",
        "schema_version": "TEXT DEFAULT '9.1'",
    }
    
    # Add missing columns (skip id and constraints that can't be added via ALTER TABLE)
    added_count = 0
    for col_name, col_type in required_columns.items():
        if col_name not in existing_columns and col_name != "id":
            # Simplify type for ALTER TABLE (avoid NOT NULL on existing tables with data)
            if "INTEGER" in col_type:
                if "DEFAULT 0" in col_type:
                    sql_type = "INTEGER DEFAULT 0"
                else:
                    sql_type = "INTEGER"
            elif "DEFAULT '9.1'" in col_type:
                sql_type = "TEXT DEFAULT '9.1'"
            else:
                sql_type = "TEXT"
            
            try:
                cursor.execute(f"ALTER TABLE sessions ADD COLUMN {col_name} {sql_type}")
                added_count += 1
                print(f"[INFO] Added missing column: {col_name}")
            except sqlite3.OperationalError:
                # Column might already exist - skip silently
                pass
    
    if added_count > 0:
        print(f"[INFO] Added {added_count} missing column(s) to sessions table")

    # ------------------------------------------------------------------
    # Additive tables for courses, events, topics, study tasks, and RAG
    # ------------------------------------------------------------------

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT,
            term TEXT,
            instructor TEXT,
            default_study_mode TEXT,
            time_budget_per_week_minutes INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS course_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            type TEXT NOT NULL, -- lecture/reading/quiz/exam/assignment/other
            title TEXT NOT NULL,
            date TEXT,          -- primary calendar date (e.g., lecture date)
            due_date TEXT,      -- for quizzes/exams/assignments
            weight REAL DEFAULT 0.0,
            raw_text TEXT,      -- syllabus snippet or notes
            status TEXT DEFAULT 'pending', -- pending/completed/cancelled
            created_at TEXT NOT NULL,
            FOREIGN KEY(course_id) REFERENCES courses(id)
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS topics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER,
            name TEXT NOT NULL,
            description TEXT,
            source_lock TEXT,          -- canonical sources for this topic
            default_frameworks TEXT,   -- e.g. \"H1, M2\"
            rag_doc_ids TEXT,          -- comma-separated IDs in rag_docs
            created_at TEXT NOT NULL,
            FOREIGN KEY(course_id) REFERENCES courses(id)
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS study_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER,
            topic_id INTEGER,
            course_event_id INTEGER,
            scheduled_date TEXT,        -- when you intend to study
            planned_minutes INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending', -- pending/in_progress/completed/deferred
            actual_session_id INTEGER,  -- link back to sessions.id when done
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT,
            FOREIGN KEY(course_id) REFERENCES courses(id),
            FOREIGN KEY(topic_id) REFERENCES topics(id),
            FOREIGN KEY(course_event_id) REFERENCES course_events(id),
            FOREIGN KEY(actual_session_id) REFERENCES sessions(id)
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS rag_docs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_path TEXT NOT NULL,
            course_id INTEGER,
            topic_tags TEXT,        -- comma-separated topic names/ids
            doc_type TEXT,          -- textbook/slide/transcript/note/other
            content TEXT NOT NULL,  -- plain text content used for retrieval
            checksum TEXT,          -- content checksum for change detection
            metadata_json TEXT,     -- JSON blob with page/section/etc.
            created_at TEXT NOT NULL,
            updated_at TEXT,
            FOREIGN KEY(course_id) REFERENCES courses(id)
        )
    """
    )

    # Additive migration for courses table (color column for UI)
    cursor.execute("PRAGMA table_info(courses)")
    course_cols = {col[1] for col in cursor.fetchall()}
    if "color" not in course_cols:
        try:
            cursor.execute("ALTER TABLE courses ADD COLUMN color TEXT")
            print("[INFO] Added 'color' column to courses table")
        except sqlite3.OperationalError:
            pass

    # Additive migration for newer RAG features (safe on existing DBs)
    cursor.execute("PRAGMA table_info(rag_docs)")
    rag_cols = {col[1] for col in cursor.fetchall()}

    # NOTE: Keep defaults loose to avoid NOT NULL migration issues.
    if "corpus" not in rag_cols:
        try:
            cursor.execute("ALTER TABLE rag_docs ADD COLUMN corpus TEXT")
        except sqlite3.OperationalError:
            pass
    if "folder_path" not in rag_cols:
        try:
            cursor.execute("ALTER TABLE rag_docs ADD COLUMN folder_path TEXT")
        except sqlite3.OperationalError:
            pass
    if "enabled" not in rag_cols:
        try:
            cursor.execute("ALTER TABLE rag_docs ADD COLUMN enabled INTEGER DEFAULT 1")
        except sqlite3.OperationalError:
            pass

    # Backfill corpus/enabled defaults for older rows.
    try:
        cursor.execute("UPDATE rag_docs SET corpus = COALESCE(corpus, 'runtime')")
        cursor.execute("UPDATE rag_docs SET enabled = COALESCE(enabled, 1)")
    except sqlite3.OperationalError:
        # Column might not exist in some edge cases; ignore.
        pass

    # Indexes for common queries on sessions
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_session_date
        ON sessions(session_date)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_main_topic
        ON sessions(main_topic)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_study_mode
        ON sessions(study_mode)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_target_exam
        ON sessions(target_exam)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_region_covered
        ON sessions(region_covered)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_understanding
        ON sessions(understanding_level)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_retention
        ON sessions(retention_confidence)
    """
    )

    # Indexes for planning and RAG tables
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_course_events_course
        ON course_events(course_id)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_course_events_dates
        ON course_events(date, due_date)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_topics_course
        ON topics(course_id)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_study_tasks_schedule
        ON study_tasks(scheduled_date, status)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_rag_docs_path
        ON rag_docs(source_path)
    """
    )

    # Indexes for new corpus/folder toggles
    try:
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_rag_docs_corpus
            ON rag_docs(corpus)
        """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_rag_docs_folder
            ON rag_docs(folder_path)
        """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_rag_docs_enabled
            ON rag_docs(enabled)
        """
        )
    except sqlite3.OperationalError:
        pass
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_rag_docs_course
        ON rag_docs(course_id)
    """
    )

    # ------------------------------------------------------------------
    # Tutor turns table (tracks individual Q&A within a Tutor session)
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tutor_turns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,        -- e.g., "sess-20260109-143022"
            course_id INTEGER,
            topic_id INTEGER,
            mode TEXT,                        -- Core/Sprint/Drill
            turn_number INTEGER DEFAULT 1,
            question TEXT NOT NULL,
            answer TEXT,
            citations_json TEXT,              -- JSON array of citation objects
            unverified INTEGER DEFAULT 0,     -- 1 if answer was unverified
            source_lock_active INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY(course_id) REFERENCES courses(id),
            FOREIGN KEY(topic_id) REFERENCES topics(id)
        )
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_turns_session
        ON tutor_turns(session_id)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_turns_created
        ON tutor_turns(created_at)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_turns_topic
        ON tutor_turns(topic_id)
    """
    )

    # ------------------------------------------------------------------
    # Topic Mastery tracking table (for relearning/weak area detection)
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS topic_mastery (
            topic TEXT PRIMARY KEY,
            study_count INTEGER DEFAULT 1,
            last_studied TEXT,
            first_studied TEXT,
            avg_understanding REAL,
            avg_retention REAL
        )
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_topic_mastery_count
        ON topic_mastery(study_count)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_topic_mastery_last_studied
        ON topic_mastery(last_studied)
    """
    )

    # ------------------------------------------------------------------
    # Anki Card Drafts table (for Tutor WRAP phase)
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS card_drafts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,              -- Link to Tutor session
            course_id INTEGER,
            topic_id INTEGER,
            deck_name TEXT DEFAULT 'PT_Study',
            card_type TEXT DEFAULT 'basic', -- basic, cloze, reversed
            front TEXT NOT NULL,
            back TEXT NOT NULL,
            tags TEXT,                    -- comma-separated
            source_citation TEXT,         -- RAG source attribution
            status TEXT DEFAULT 'draft',  -- draft, approved, synced, rejected
            anki_note_id INTEGER,         -- filled after sync
            created_at TEXT NOT NULL,
            synced_at TEXT,
            FOREIGN KEY(course_id) REFERENCES courses(id),
            FOREIGN KEY(topic_id) REFERENCES topics(id)
        )
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_card_drafts_session
        ON card_drafts(session_id)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_card_drafts_status
        ON card_drafts(status)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_card_drafts_course
        ON card_drafts(course_id)
    """
    )

    # Add google_event_id to course_events if not exists (for GCal sync)
    cursor.execute("PRAGMA table_info(course_events)")
    ce_columns = {col[1] for col in cursor.fetchall()}
    if 'google_event_id' not in ce_columns:
        try:
            cursor.execute("ALTER TABLE course_events ADD COLUMN google_event_id TEXT")
        except sqlite3.OperationalError:
            pass  # Column might already exist

    conn.commit()
    conn.close()

    print(f"[OK] Database initialized at: {DB_PATH}")
    print("[OK] Schema version: 9.1 + planning/RAG extensions")

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

if __name__ == "__main__":
    print("PT Study Brain - Database Setup")
    print("=" * 40)

    if os.path.exists(DB_PATH):
        print(f"[INFO] Existing database found at: {DB_PATH}")
        version = get_schema_version()
        print(f"[INFO] Current schema version: {version}")

        if version != "9.1":
            response = input("Migrate to v9.1 schema? (y/n): ")
            if response.lower() == "y":
                migrate_from_v8()
            else:
                print("[INFO] Skipping migration")
    else:
        print("[INFO] No existing database found")

    # Always run init_database() to ensure schema is fully up to date
    # (adds any missing columns and creates new planning/RAG tables).
    init_database()

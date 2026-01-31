#!/usr/bin/env python3
"""
Database setup and schema initialization for PT Study Brain v9.4.
"""

import sqlite3
import os
import sys

from config import DB_PATH


def init_database():
    """
    Initialize the SQLite database with the sessions table (v9.3 schema)
    plus additive planning/RAG tables.
    """
    # Ensure data directory exists
    data_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # ------------------------------------------------------------------
    # Core sessions table (v9.3 schema)
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
            anchors_mastery TEXT,
            confusions TEXT,
            concepts TEXT,
            issues TEXT,

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
            schema_version TEXT DEFAULT '9.4',
            source_path TEXT,  -- Path to the source markdown file
            raw_input TEXT,    -- Raw plain-text intake (LLM or manual)

            -- WRAP Enhancement v9.2 fields
            anki_cards_text TEXT,          -- Semicolon-separated card titles or key Q-A pairs
            glossary_entries TEXT,         -- Short definitions of new or complex terms
            wrap_watchlist TEXT,           -- Specific recurring confusions to target in next reviews
            clinical_links TEXT,           -- Clinical correlations added during session
            next_session_plan TEXT,        -- Planned focus or materials for continuity
            spaced_reviews TEXT,           -- Explicit dates for 24h, 3d, 7d reviews
            runtime_notes TEXT,            -- Meta-notes about study behavior, KWIK rules, SOP adherence
            errors_conceptual TEXT,        -- List of conceptual errors
            errors_discrimination TEXT,    -- List of X vs Y confusions
            errors_recall TEXT,            -- List of recall failures

            -- Logging Schema v9.3 fields
            calibration_gap INTEGER,
            rsr_percent INTEGER,
            cognitive_load TEXT,
            transfer_check TEXT,
            buckets TEXT,
            confusables_interleaved TEXT,
            exit_ticket_blurt TEXT,
            exit_ticket_muddiest TEXT,
            exit_ticket_next_action TEXT,
            retrospective_status TEXT,
            tracker_json TEXT,
            enhanced_json TEXT,

            -- Session Ledger v9.4 fields
            covered TEXT,
            not_covered TEXT,
            artifacts_created TEXT,
            timebox_min INTEGER,

            -- Error classification v9.4 fields
            error_classification TEXT,
            error_severity TEXT,
            error_recurrence TEXT,

            -- Enhanced v9.4 fields
            errors_by_type TEXT,
            errors_by_severity TEXT,
            error_patterns TEXT,
            spacing_algorithm TEXT,
            rsr_adaptive_adjustment TEXT,
            adaptive_multipliers TEXT,

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
        "confusions": "TEXT",
        "concepts": "TEXT",
        "issues": "TEXT",
        "anchors_mastery": "TEXT",
        "what_worked": "TEXT",
        "what_needs_fixing": "TEXT",
        "gaps_identified": "TEXT",
        "notes_insights": "TEXT",
        "next_topic": "TEXT",
        "next_focus": "TEXT",
        "next_materials": "TEXT",
        "created_at": "TEXT NOT NULL",
        "schema_version": "TEXT DEFAULT '9.4'",
        "source_path": "TEXT",
        "raw_input": "TEXT",
        # WRAP Enhancement v9.2 fields
        "anki_cards_text": "TEXT",
        "glossary_entries": "TEXT",
        "wrap_watchlist": "TEXT",
        "clinical_links": "TEXT",
        "next_session_plan": "TEXT",
        "spaced_reviews": "TEXT",
        "runtime_notes": "TEXT",
        "errors_conceptual": "TEXT",
        "errors_discrimination": "TEXT",
        "errors_recall": "TEXT",
        # Logging Schema v9.3 fields
        "calibration_gap": "INTEGER",
        "rsr_percent": "INTEGER",
        "cognitive_load": "TEXT",
        "transfer_check": "TEXT",
        "buckets": "TEXT",
        "confusables_interleaved": "TEXT",
        "exit_ticket_blurt": "TEXT",
        "exit_ticket_muddiest": "TEXT",
        "exit_ticket_next_action": "TEXT",
        "retrospective_status": "TEXT",
        "tracker_json": "TEXT",
        "enhanced_json": "TEXT",
        # Session Ledger v9.4 fields
        "covered": "TEXT",
        "not_covered": "TEXT",
        "artifacts_created": "TEXT",
        "timebox_min": "INTEGER",
        # Error classification v9.4 fields
        "error_classification": "TEXT",
        "error_severity": "TEXT",
        "error_recurrence": "TEXT",
        # Enhanced v9.4 fields
        "errors_by_type": "TEXT",
        "errors_by_severity": "TEXT",
        "error_patterns": "TEXT",
        "spacing_algorithm": "TEXT",
        "rsr_adaptive_adjustment": "TEXT",
        "adaptive_multipliers": "TEXT",
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
            elif "DEFAULT '9.4'" in col_type:
                sql_type = "TEXT DEFAULT '9.4'"
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

    # Bump schema_version on rows still marked < 9.4 (idempotent)
    try:
        cursor.execute(
            "UPDATE sessions SET schema_version = '9.4' "
            "WHERE schema_version IS NULL OR schema_version < '9.4'"
        )
        bumped = cursor.rowcount
        if bumped > 0:
            print(f"[INFO] Bumped schema_version to 9.4 on {bumped} row(s)")
    except sqlite3.OperationalError:
        pass

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
            delivery_format TEXT,  -- synchronous/asynchronous/online_module/hybrid
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
            course TEXT,
            type TEXT NOT NULL, -- lecture/reading/quiz/exam/assignment/lab/announcement/other
            title TEXT NOT NULL,
            date TEXT,          -- primary calendar date (e.g., lecture date)
            due_date TEXT,      -- for quizzes/exams/assignments
            time TEXT,          -- HH:MM format (24-hour)
            end_time TEXT,      -- HH:MM format (24-hour)
            weight REAL DEFAULT 0.0,
            notes TEXT,
            raw_text TEXT,      -- syllabus snippet or notes
            status TEXT DEFAULT 'pending', -- pending/completed/cancelled
            color TEXT,
            recurrence_rule TEXT,
            location TEXT,
            attendees TEXT,
            visibility TEXT,
            transparency TEXT,
            reminders TEXT,
            time_zone TEXT,
            created_at TEXT NOT NULL,
            source_url TEXT,
            google_event_id TEXT,
            google_synced_at TEXT,
            google_calendar_id TEXT,
            google_calendar_name TEXT,
            google_updated_at TEXT,
            updated_at TEXT,
            FOREIGN KEY(course_id) REFERENCES courses(id)

        )
    """
    )

    # Staging area for scraped data before verification
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS scraped_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            type TEXT NOT NULL, 
            title TEXT NOT NULL,
            date TEXT,
            due_date TEXT,
            raw_text TEXT,
            source_url TEXT,
            scraped_at TEXT NOT NULL,
            status TEXT DEFAULT 'new', -- new/conflict/matched/ignored/approved
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
        CREATE TABLE IF NOT EXISTS modules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            order_index INTEGER DEFAULT 0,
            files_downloaded INTEGER DEFAULT 0,
            notebooklm_loaded INTEGER DEFAULT 0,
            sources TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT,
            FOREIGN KEY(course_id) REFERENCES courses(id)
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS learning_objectives (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            module_id INTEGER,
            lo_code TEXT,
            title TEXT NOT NULL,
            status TEXT DEFAULT 'not_started',
            last_session_id INTEGER,
            last_session_date TEXT,
            next_action TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT,
            FOREIGN KEY(course_id) REFERENCES courses(id),
            FOREIGN KEY(module_id) REFERENCES modules(id),
            FOREIGN KEY(last_session_id) REFERENCES sessions(id)
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS lo_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lo_id INTEGER NOT NULL,
            session_id INTEGER NOT NULL,
            status_before TEXT,
            status_after TEXT,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(lo_id) REFERENCES learning_objectives(id),
            FOREIGN KEY(session_id) REFERENCES sessions(id)
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

    # Add planner-specific columns to study_tasks if missing
    cursor.execute("PRAGMA table_info(study_tasks)")
    st_cols = {c[1] for c in cursor.fetchall()}
    for col_name, col_type in [
        ("source", "TEXT"),          # 'weak_anchor' | 'exit_ticket' | 'manual' | 'spacing'
        ("priority", "INTEGER DEFAULT 0"),
        ("review_number", "INTEGER"),  # R1=1, R2=2, R3=3, R4=4
        ("anchor_text", "TEXT"),       # the weak anchor or topic text
    ]:
        if col_name not in st_cols:
            try:
                cursor.execute(f"ALTER TABLE study_tasks ADD COLUMN {col_name} {col_type}")
            except sqlite3.OperationalError:
                pass

    # Planner settings (singleton row, id=1)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS planner_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            spacing_strategy TEXT DEFAULT 'standard',  -- 'standard' (1-3-7-21) | 'rsr-adaptive'
            default_session_minutes INTEGER DEFAULT 45,
            calendar_source TEXT DEFAULT 'local',       -- 'local' | 'google'
            auto_schedule_reviews INTEGER DEFAULT 1,    -- boolean
            updated_at TEXT
        )
    """
    )
    # Ensure singleton row exists
    cursor.execute(
        "INSERT OR IGNORE INTO planner_settings (id, updated_at) VALUES (1, datetime('now'))"
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

    # ------------------------------------------------------------------
    # Ingestion tracking table for smart file processing
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS ingested_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filepath TEXT NOT NULL UNIQUE,
            checksum TEXT NOT NULL,
            session_id INTEGER,
            ingested_at TEXT NOT NULL,
            FOREIGN KEY(session_id) REFERENCES sessions(id)
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

    if "last_scraped_at" not in course_cols:
        try:
            cursor.execute("ALTER TABLE courses ADD COLUMN last_scraped_at TEXT")
            print("[INFO] Added 'last_scraped_at' column to courses table")
        except sqlite3.OperationalError:
            pass

    if "delivery_format" not in course_cols:
        try:
            cursor.execute("ALTER TABLE courses ADD COLUMN delivery_format TEXT")
            print("[INFO] Added 'delivery_format' column to courses table")
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
            user_id TEXT,                    -- optional user identifier
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
    # Tutor issues table (tracks Tutor output problems from WRAP ingestion)
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tutor_issues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            issue_type TEXT,   -- hallucination, formatting, incorrect_fact, unprompted_artifact
            description TEXT,
            severity TEXT,     -- low, medium, high
            resolved INTEGER DEFAULT 0,
            created_at TEXT
        )
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_issues_session
        ON tutor_issues(session_id)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_issues_type
        ON tutor_issues(issue_type)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_issues_resolved
        ON tutor_issues(resolved)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_issues_created
        ON tutor_issues(created_at)
    """
    )

    # Migration: Add user_id column if missing (for existing databases)
    cursor.execute("PRAGMA table_info(tutor_turns)")
    existing_cols = {row[1] for row in cursor.fetchall()}
    if "user_id" not in existing_cols:
        cursor.execute("ALTER TABLE tutor_turns ADD COLUMN user_id TEXT")

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
    if "google_event_id" not in ce_columns:
        try:
            cursor.execute("ALTER TABLE course_events ADD COLUMN google_event_id TEXT")
        except sqlite3.OperationalError:
            pass  # Column might already exist

    # Add google_synced_at column if not exists (for GCal sync timestamp)
    if "google_synced_at" not in ce_columns:
        try:
            cursor.execute("ALTER TABLE course_events ADD COLUMN google_synced_at TEXT")
            print("[INFO] Added 'google_synced_at' column to course_events table")
        except sqlite3.OperationalError:
            pass  # Column might already exist

    if "google_calendar_id" not in ce_columns:
        try:
            cursor.execute(
                "ALTER TABLE course_events ADD COLUMN google_calendar_id TEXT"
            )
            print("[INFO] Added 'google_calendar_id' column to course_events table")
        except sqlite3.OperationalError:
            pass

    if "google_calendar_name" not in ce_columns:
        try:
            cursor.execute(
                "ALTER TABLE course_events ADD COLUMN google_calendar_name TEXT"
            )
            print("[INFO] Added 'google_calendar_name' column to course_events table")
        except sqlite3.OperationalError:
            pass

    if "google_updated_at" not in ce_columns:
        try:
            cursor.execute(
                "ALTER TABLE course_events ADD COLUMN google_updated_at TEXT"
            )
            print("[INFO] Added 'google_updated_at' column to course_events table")
        except sqlite3.OperationalError:
            pass

    if "updated_at" not in ce_columns:
        try:
            cursor.execute("ALTER TABLE course_events ADD COLUMN updated_at TEXT")
            print("[INFO] Added 'updated_at' column to course_events table")
        except sqlite3.OperationalError:
            pass

    for col_name in [
        "course",
        "notes",
        "color",
        "recurrence_rule",
        "location",
        "attendees",
        "visibility",
        "transparency",
        "reminders",
        "time_zone",
    ]:
        if col_name not in ce_columns:
            try:
                cursor.execute(f"ALTER TABLE course_events ADD COLUMN {col_name} TEXT")
                print(f"[INFO] Added '{col_name}' column to course_events table")
            except sqlite3.OperationalError:
                pass

    try:
        cursor.execute(
            "UPDATE course_events SET updated_at = COALESCE(updated_at, created_at)"
        )
    except sqlite3.OperationalError:
        pass

    # Create index for google_event_id lookups
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_course_events_google_id ON course_events(google_event_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_course_events_google_lookup ON course_events(google_event_id, google_calendar_id)"
    )

    # Add time and end_time columns if not exist (for event times)
    if "time" not in ce_columns:
        try:
            cursor.execute("ALTER TABLE course_events ADD COLUMN time TEXT")
            print("[INFO] Added 'time' column to course_events table")
        except sqlite3.OperationalError:
            pass

    if "end_time" not in ce_columns:
        try:
            cursor.execute("ALTER TABLE course_events ADD COLUMN end_time TEXT")
            print("[INFO] Added 'end_time' column to course_events table")
        except sqlite3.OperationalError:
            pass

    # ------------------------------------------------------------------
    # Scholar Digests table (strategic analysis documents)
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS scholar_digests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            title TEXT,
            digest_type TEXT DEFAULT 'strategic',
            created_at TEXT NOT NULL,
            content_hash TEXT
        )
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_digests_filename
        ON scholar_digests(filename)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_digests_type
        ON scholar_digests(digest_type)
    """
    )

    # ------------------------------------------------------------------
    # Scholar Proposals table (change proposals from Scholar workflows)
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS scholar_proposals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL UNIQUE,
            filepath TEXT NOT NULL,
            title TEXT,
            proposal_type TEXT,
            status TEXT DEFAULT 'draft',
            created_at TEXT,
            reviewed_at TEXT,
            reviewer_notes TEXT,
            superseded_by INTEGER REFERENCES scholar_proposals(id),
            content_hash TEXT
        )
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_proposals_status
        ON scholar_proposals(status)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_proposals_type
        ON scholar_proposals(proposal_type)
    """
    )

    # Add content + cluster columns to scholar tables (v9.4 DB-first)
    for table, cols in [
        ("scholar_digests", [("content", "TEXT"), ("cluster_id", "TEXT")]),
        ("scholar_proposals", [("content", "TEXT"), ("cluster_id", "TEXT")]),
    ]:
        cursor.execute(f"PRAGMA table_info({table})")
        existing = {c[1] for c in cursor.fetchall()}
        for col_name, col_type in cols:
            if col_name not in existing:
                try:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
                    print(f"[INFO] Added '{col_name}' to {table}")
                except sqlite3.OperationalError:
                    pass

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS quick_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            content TEXT NOT NULL,
            note_type TEXT NOT NULL DEFAULT 'notes',
            position INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """
    )
    # Backfill new columns without breaking existing DBs
    cursor.execute("PRAGMA table_info(quick_notes)")
    quick_notes_cols = {col[1] for col in cursor.fetchall()}
    if "note_type" not in quick_notes_cols:
        try:
            cursor.execute("ALTER TABLE quick_notes ADD COLUMN note_type TEXT DEFAULT 'notes'")
        except Exception:
            pass
    cursor.execute("UPDATE quick_notes SET note_type = COALESCE(note_type, 'notes')")
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_quick_notes_position
        ON quick_notes(position)
    """
    )

    # ------------------------------------------------------------------
    # Calendar Action Ledger (v9.3 - for Undo)
    # ------------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS calendar_action_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            action_type TEXT NOT NULL, -- create_event, update_task, etc.
            target_id TEXT NOT NULL,
            pre_state TEXT,  -- JSON
            post_state TEXT, -- JSON
            description TEXT
        )
    """)
    
    # Pruning Trigger: Keep only last 10 rows
    cursor.execute("""
        CREATE TRIGGER IF NOT EXISTS prune_ledger
        AFTER INSERT ON calendar_action_ledger
        BEGIN
            DELETE FROM calendar_action_ledger
            WHERE id NOT IN (
                SELECT id FROM calendar_action_ledger
                ORDER BY id DESC
                LIMIT 10
            );
        END;
    """)

    conn.commit()
    conn.close()

    print(f"[OK] Database initialized at: {DB_PATH}")
    print("[OK] Schema version: 9.3 + planning/RAG extensions")


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
    if "topic" in columns and "main_topic" not in columns:
        print("[INFO] Migrating from v8 schema to v9.1...")

        # Rename old table
        cursor.execute("ALTER TABLE sessions RENAME TO sessions_v8")

        # Create new table
        init_database()

        # Copy data with column mapping
        cursor.execute("""
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
        """)

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
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.execute("PRAGMA busy_timeout = 5000")
    return conn


# ------------------------------------------------------------------
# Ingestion tracking helper functions
# ------------------------------------------------------------------
import hashlib


def compute_file_checksum(filepath: str) -> str:
    """
    Compute MD5 checksum of a file's contents.
    """
    hash_md5 = hashlib.md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


def is_file_ingested(conn, filepath: str, checksum: str) -> tuple:
    """
    Check if a file has already been ingested with the same checksum.
    Returns (is_ingested: bool, session_id: int or None).
    """
    cursor = conn.cursor()
    cursor.execute(
        "SELECT session_id FROM ingested_files WHERE filepath = ? AND checksum = ?",
        (filepath, checksum),
    )
    result = cursor.fetchone()
    if result:
        return True, result[0]
    return False, None


def mark_file_ingested(conn, filepath: str, checksum: str, session_id: int = None):
    """
    Mark a file as ingested. Updates if filepath exists, inserts otherwise.
    """
    from datetime import datetime

    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO ingested_files (filepath, checksum, session_id, ingested_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(filepath) DO UPDATE SET
            checksum = excluded.checksum,
            session_id = excluded.session_id,
            ingested_at = excluded.ingested_at
        """,
        (filepath, checksum, session_id, datetime.now().isoformat()),
    )
    conn.commit()


def remove_ingested_file(conn, filepath: str):
    """
    Remove ingestion tracking record for a file.
    """
    cursor = conn.cursor()
    cursor.execute("DELETE FROM ingested_files WHERE filepath = ?", (filepath,))
    conn.commit()


def get_ingested_session_id(conn, filepath: str) -> int:
    """
    Get the session_id linked to an ingested file, if any.
    """
    cursor = conn.cursor()
    cursor.execute(
        "SELECT session_id FROM ingested_files WHERE filepath = ?", (filepath,)
    )
    result = cursor.fetchone()
    return result[0] if result else None


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


def backfill_session_minutes():
    """
    Backfill time_spent_minutes and duration_minutes where one is missing.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE sessions
        SET time_spent_minutes = duration_minutes
        WHERE (time_spent_minutes IS NULL OR time_spent_minutes = 0)
          AND duration_minutes IS NOT NULL
          AND duration_minutes > 0
    """
    )
    updated_time = cursor.rowcount

    cursor.execute(
        """
        UPDATE sessions
        SET duration_minutes = time_spent_minutes
        WHERE (duration_minutes IS NULL OR duration_minutes = 0)
          AND time_spent_minutes IS NOT NULL
          AND time_spent_minutes > 0
    """
    )
    updated_duration = cursor.rowcount

    conn.commit()
    conn.close()
    return updated_time, updated_duration


if __name__ == "__main__":
    print("PT Study Brain - Database Setup")
    print("=" * 40)

    if os.path.exists(DB_PATH):
        print(f"[INFO] Existing database found at: {DB_PATH}")
        version = get_schema_version()
        print(f"[INFO] Current schema version: {version}")

        if version not in {"9.1", "9.2", "9.3", "9.4"}:
            if not sys.stdin or not sys.stdin.isatty():
                auto_migrate = os.environ.get("PT_BRAIN_AUTO_MIGRATE", "").strip().lower() in {
                    "1",
                    "true",
                    "yes",
                }
                if auto_migrate:
                    print("[INFO] Non-interactive mode: auto-migrating to v9.1 schema.")
                    migrate_from_v8()
                else:
                    print("[INFO] Non-interactive mode: skipping v9.1 migration.")
            else:
                try:
                    response = input("Migrate to v9.1 schema? (y/n): ")
                except EOFError:
                    print("[INFO] Non-interactive mode: skipping v9.1 migration.")
                    response = "n"
                if response.lower() == "y":
                    migrate_from_v8()
                else:
                    print("[INFO] Skipping migration")
    else:
        print("[INFO] No existing database found")

    # Always run init_database() to ensure schema is fully up to date
    # (adds any missing columns and creates new planning/RAG tables).
    init_database()

    # Optional one-time data correction for session minutes
    if os.environ.get("PT_BRAIN_BACKFILL_MINUTES", "").strip().lower() in {"1", "true", "yes"}:
        updated_time, updated_duration = backfill_session_minutes()
        print(f"[INFO] Backfilled time_spent_minutes for {updated_time} sessions.")
        print(f"[INFO] Backfilled duration_minutes for {updated_duration} sessions.")

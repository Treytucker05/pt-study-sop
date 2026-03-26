#!/usr/bin/env python3
"""
Database setup and schema initialization for PT Study Brain v9.4.
"""

import sqlite3
import os
import sys
import json
import importlib.util
from datetime import datetime
from typing import Optional
from pathlib import Path

from config import DB_PATH


_METHOD_BLOCKS_CONTROL_STAGES = (
    "PRIME",
    "TEACH",
    "CALIBRATE",
    "ENCODE",
    "REFERENCE",
    "RETRIEVE",
    "OVERLEARN",
)


def _control_stage_normalize_sql(column_name: str = "control_stage") -> str:
    return f"""
        CASE UPPER(COALESCE({column_name}, ''))
            WHEN 'PRIME' THEN 'PRIME'
            WHEN 'TEACH' THEN 'TEACH'
            WHEN 'CALIBRATE' THEN 'CALIBRATE'
            WHEN 'ENCODE' THEN 'ENCODE'
            WHEN 'REFERENCE' THEN 'REFERENCE'
            WHEN 'RETRIEVE' THEN 'RETRIEVE'
            WHEN 'OVERLEARN' THEN 'OVERLEARN'
            WHEN 'PREPARE' THEN 'PRIME'
            WHEN 'INTERROGATE' THEN 'REFERENCE'
            WHEN 'REFINE' THEN 'OVERLEARN'
            ELSE 'ENCODE'
        END
    """.strip()


def _ensure_method_blocks_control_stage_constraint(cursor) -> None:
    """
    Rebuild legacy method_blocks tables whose control_stage CHECK constraint
    predates TEACH support.

    Older live databases can still enforce:
      CHECK(control_stage IN ('PRIME', 'CALIBRATE', 'ENCODE', ...))

    That causes live seed sync to fail as soon as a TEACH-era method card is
    inserted. Rebuild only when the persisted table SQL is stale.
    """
    cursor.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='method_blocks'"
    )
    row = cursor.fetchone()
    table_sql = str(row[0] or "") if row else ""
    if not table_sql:
        return

    normalized_sql = table_sql.upper()
    if "CONTROL_STAGE" not in normalized_sql or "'TEACH'" in normalized_sql:
        return

    cursor.execute("PRAGMA table_info(method_blocks)")
    existing_cols = {col[1] for col in cursor.fetchall()}
    if not existing_cols:
        return

    stage_values = ", ".join(f"'{value}'" for value in _METHOD_BLOCKS_CONTROL_STAGES)
    canonical_columns = [
        ("id", "INTEGER PRIMARY KEY AUTOINCREMENT"),
        ("method_id", "TEXT"),
        ("name", "TEXT NOT NULL"),
        ("category", "TEXT"),
        (
            "control_stage",
            f"TEXT DEFAULT 'ENCODE' CHECK(control_stage IN ({stage_values}))",
        ),
        ("description", "TEXT"),
        ("default_duration_min", "INTEGER DEFAULT 5"),
        ("energy_cost", "TEXT DEFAULT 'medium'"),
        ("best_stage", "TEXT"),
        ("tags", "TEXT"),
        ("knob_overrides_json", "TEXT"),
        ("created_at", "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"),
        ("evidence", "TEXT"),
        ("facilitation_prompt", "TEXT"),
        ("inputs", "TEXT"),
        ("outputs", "TEXT"),
        ("strategy_label", "TEXT"),
        ("failure_modes", "TEXT"),
        ("variants", "TEXT"),
        ("scoring_hooks", "TEXT"),
        ("icap_level", "TEXT"),
        ("clt_target", "TEXT"),
        ("assessment_type", "TEXT"),
        ("artifact_type", "TEXT"),
        ("research_terms", "TEXT"),
    ]

    create_cols = ",\n            ".join(
        f"{name} {definition}" for name, definition in canonical_columns
    )
    cursor.execute(
        f"""
        CREATE TABLE method_blocks__new (
            {create_cols}
        )
        """
    )

    insert_cols = [name for name, _definition in canonical_columns if name in existing_cols]
    select_exprs = []
    for col in insert_cols:
        if col == "control_stage":
            select_exprs.append(
                f"{_control_stage_normalize_sql('control_stage')} AS control_stage"
            )
        else:
            select_exprs.append(col)

    cursor.execute("PRAGMA foreign_keys=OFF")
    cursor.execute(
        f"""
        INSERT INTO method_blocks__new ({", ".join(insert_cols)})
        SELECT {", ".join(select_exprs)}
        FROM method_blocks
        """
    )
    cursor.execute("DROP TABLE method_blocks")
    cursor.execute("ALTER TABLE method_blocks__new RENAME TO method_blocks")
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_method_blocks_control_stage
        ON method_blocks(control_stage)
        """
    )
    cursor.execute("PRAGMA foreign_keys=ON")
    print("[INFO] Rebuilt legacy method_blocks table to allow TEACH control_stage rows")


def _create_learner_profile_tables(cursor) -> None:
    """Create Wave 1 Brain learner-profile tables."""
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS learner_profile_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            archetype_slug TEXT NOT NULL,
            archetype_label TEXT NOT NULL,
            archetype_summary TEXT NOT NULL,
            supporting_traits_json TEXT,
            profile_summary_json TEXT,
            evidence_summary_json TEXT,
            model_version TEXT NOT NULL,
            source_window_start TEXT,
            source_window_end TEXT,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_learner_profile_snapshots_user_created
        ON learner_profile_snapshots(user_id, created_at DESC)
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS learner_profile_claims (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            snapshot_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            claim_key TEXT NOT NULL,
            claim_label TEXT NOT NULL,
            score REAL NOT NULL,
            value_band TEXT NOT NULL,
            confidence REAL NOT NULL,
            freshness_days REAL,
            contradiction_state TEXT NOT NULL DEFAULT 'stable',
            evidence_tier INTEGER NOT NULL,
            evidence_label TEXT,
            signal_direction TEXT NOT NULL DEFAULT 'strength',
            observed_count INTEGER NOT NULL DEFAULT 0,
            explanation TEXT,
            recommended_strategy TEXT,
            evidence_json TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(snapshot_id) REFERENCES learner_profile_snapshots(id),
            UNIQUE(snapshot_id, claim_key)
        )
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_learner_profile_claims_snapshot
        ON learner_profile_claims(snapshot_id)
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS learner_profile_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            snapshot_id INTEGER,
            question_key TEXT NOT NULL,
            question_text TEXT NOT NULL,
            claim_key TEXT,
            rationale TEXT,
            question_type TEXT NOT NULL DEFAULT 'calibration',
            status TEXT NOT NULL DEFAULT 'pending',
            blocking INTEGER NOT NULL DEFAULT 0,
            evidence_needed TEXT,
            answer_text TEXT,
            answer_source TEXT,
            answered_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(snapshot_id) REFERENCES learner_profile_snapshots(id)
        )
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_learner_profile_questions_user_status
        ON learner_profile_questions(user_id, status, question_key)
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS learner_profile_feedback_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            snapshot_id INTEGER,
            claim_key TEXT,
            question_id INTEGER,
            feedback_type TEXT NOT NULL,
            response_text TEXT,
            source TEXT NOT NULL DEFAULT 'ui',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(snapshot_id) REFERENCES learner_profile_snapshots(id),
            FOREIGN KEY(question_id) REFERENCES learner_profile_questions(id)
        )
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_learner_profile_feedback_user_created
        ON learner_profile_feedback_events(user_id, created_at DESC)
        """
    )


def _create_product_shell_tables(cursor) -> None:
    """Create premium product shell tables for events, privacy, and feature flags."""
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS product_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT NOT NULL UNIQUE,
            user_id TEXT NOT NULL DEFAULT 'default',
            workspace_id TEXT NOT NULL DEFAULT 'default',
            event_type TEXT NOT NULL,
            source TEXT NOT NULL DEFAULT 'system',
            metadata_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL
        )
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_product_events_scope_created
        ON product_events(user_id, workspace_id, created_at DESC)
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_product_events_type_created
        ON product_events(event_type, created_at DESC)
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS product_privacy_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'default',
            workspace_id TEXT NOT NULL DEFAULT 'default',
            retention_days INTEGER NOT NULL DEFAULT 180,
            allow_tier2_signals INTEGER NOT NULL DEFAULT 1,
            allow_vault_signals INTEGER NOT NULL DEFAULT 1,
            allow_calendar_signals INTEGER NOT NULL DEFAULT 1,
            allow_scholar_personalization INTEGER NOT NULL DEFAULT 1,
            allow_outcome_reports INTEGER NOT NULL DEFAULT 1,
            updated_at TEXT NOT NULL,
            UNIQUE(user_id, workspace_id)
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS product_feature_flags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            flag_key TEXT NOT NULL UNIQUE,
            enabled INTEGER NOT NULL DEFAULT 1,
            variant TEXT NOT NULL DEFAULT 'on',
            description TEXT,
            scope TEXT NOT NULL DEFAULT 'global',
            updated_at TEXT NOT NULL
        )
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_product_feature_flags_scope
        ON product_feature_flags(scope, enabled)
        """
    )


def _migrate_academic_deadlines(cursor) -> None:
    """Merge academic_deadlines into course_events, then drop the table.

    Idempotent: skips if academic_deadlines does not exist.
    """
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='academic_deadlines'"
    )
    if not cursor.fetchone():
        return

    # Copy rows, dedup by title+due_date within same course
    cursor.execute("SELECT title, course, type, due_date, completed, notes, created_at FROM academic_deadlines")
    rows = cursor.fetchall()
    migrated = 0
    for title, course_text, d_type, due_date, completed, notes, created_at in rows:
        # Resolve course text to course_id
        course_id = None
        if course_text:
            if course_text.isdigit():
                course_id = int(course_text)
            else:
                cursor.execute("SELECT id FROM courses WHERE name = ?", (course_text,))
                row = cursor.fetchone()
                if not row:
                    cursor.execute(
                        "SELECT course_id FROM wheel_courses WHERE name = ?", (course_text,)
                    )
                    row = cursor.fetchone()
                if row:
                    course_id = row[0]
        if not course_id:
            course_id = 0  # fallback for orphaned rows

        status = "completed" if completed else "pending"

        # Check if course_events already has this title+due_date+course_id
        cursor.execute(
            "SELECT id FROM course_events WHERE title = ? AND due_date = ? AND course_id = ?",
            (title, due_date, course_id),
        )
        if cursor.fetchone():
            continue  # already exists

        now = created_at or datetime.now().isoformat()
        cursor.execute(
            """
            INSERT INTO course_events (
                course_id, type, title, due_date, notes, status, source, approval_status,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'manual', 'approved', ?, ?)
            """,
            (course_id, d_type or "assignment", title, due_date, notes, status, now, now),
        )
        migrated += 1

    cursor.execute("DROP TABLE academic_deadlines")
    if migrated:
        print(f"[OK] Migrated {migrated} academic_deadlines into course_events")
    else:
        print("[OK] academic_deadlines table dropped (all rows already in course_events)")


def _migrate_scraped_events(cursor) -> None:
    """Add source/approval_status columns to course_events, migrate scraped_events, drop it.

    Idempotent: skips column adds if they exist, skips migration if table gone.
    """
    # Add new columns to course_events
    cursor.execute("PRAGMA table_info(course_events)")
    ce_cols = {col[1] for col in cursor.fetchall()}

    if "source" not in ce_cols:
        cursor.execute("ALTER TABLE course_events ADD COLUMN source TEXT DEFAULT 'manual'")
        print("[INFO] Added 'source' column to course_events table")
    if "approval_status" not in ce_cols:
        cursor.execute("ALTER TABLE course_events ADD COLUMN approval_status TEXT DEFAULT 'approved'")
        print("[INFO] Added 'approval_status' column to course_events table")

    # Backfill existing rows
    cursor.execute("UPDATE course_events SET source = COALESCE(source, 'manual')")
    cursor.execute("UPDATE course_events SET approval_status = COALESCE(approval_status, 'approved')")

    # Migrate scraped_events if present
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='scraped_events'"
    )
    if not cursor.fetchone():
        return

    cursor.execute(
        "SELECT id, course_id, type, title, date, due_date, raw_text, source_url, scraped_at, status "
        "FROM scraped_events"
    )
    rows = cursor.fetchall()
    migrated = 0
    for _, course_id, e_type, title, e_date, due_date, raw_text, source_url, scraped_at, status in rows:
        # Map scraped_events status to approval_status
        if status in ("approved", "ignored"):
            approval = status
        else:
            approval = "pending"

        # Dedup check
        cursor.execute(
            "SELECT id FROM course_events WHERE title = ? AND course_id = ? AND COALESCE(due_date, date) = ?",
            (title, course_id, due_date or e_date),
        )
        if cursor.fetchone():
            continue

        now = scraped_at or datetime.now().isoformat()
        cursor.execute(
            """
            INSERT INTO course_events (
                course_id, type, title, date, due_date, raw_text, source_url,
                source, approval_status, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'blackboard_scrape', ?, 'pending', ?, ?)
            """,
            (course_id, e_type, title, e_date, due_date, raw_text, source_url, approval, now, now),
        )
        migrated += 1

    cursor.execute("DROP TABLE scraped_events")
    if migrated:
        print(f"[OK] Migrated {migrated} scraped_events into course_events")
    else:
        print("[OK] scraped_events table dropped (all rows already in course_events or empty)")


def init_database():
    """
    Initialize the SQLite database with the sessions table (v9.3 schema)
    plus additive planning/RAG tables.
    """
    # Ensure data directory exists
    data_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)

    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA busy_timeout = 10000")
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

    # scraped_events: REMOVED — merged into course_events via source/approval_status columns

    # topics: REMOVED — zero active reads, 0 rows, dead table

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
            group_name TEXT,
            managed_by_tutor INTEGER NOT NULL DEFAULT 0,
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
        ("source", "TEXT"),  # 'weak_anchor' | 'exit_ticket' | 'manual' | 'spacing'
        ("priority", "INTEGER DEFAULT 0"),
        ("review_number", "INTEGER"),  # R1=1, R2=2, R3=3, R4=4
        ("anchor_text", "TEXT"),  # the weak anchor or topic text
    ]:
        if col_name not in st_cols:
            try:
                cursor.execute(
                    f"ALTER TABLE study_tasks ADD COLUMN {col_name} {col_type}"
                )
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
    if "file_path" not in rag_cols:
        try:
            cursor.execute("ALTER TABLE rag_docs ADD COLUMN file_path TEXT")
        except sqlite3.OperationalError:
            pass
    if "file_size" not in rag_cols:
        try:
            cursor.execute("ALTER TABLE rag_docs ADD COLUMN file_size INTEGER")
        except sqlite3.OperationalError:
            pass
    if "file_type" not in rag_cols:
        try:
            cursor.execute("ALTER TABLE rag_docs ADD COLUMN file_type TEXT")
        except sqlite3.OperationalError:
            pass
    if "title" not in rag_cols:
        try:
            cursor.execute("ALTER TABLE rag_docs ADD COLUMN title TEXT")
        except sqlite3.OperationalError:
            pass
    if "extraction_error" not in rag_cols:
        try:
            cursor.execute("ALTER TABLE rag_docs ADD COLUMN extraction_error TEXT")
        except sqlite3.OperationalError:
            pass

    # Backfill corpus/enabled defaults for older rows.
    try:
        cursor.execute("UPDATE rag_docs SET corpus = COALESCE(corpus, 'runtime')")
        cursor.execute("UPDATE rag_docs SET enabled = COALESCE(enabled, 1)")
        cursor.execute(
            """
            UPDATE rag_docs
            SET file_type = COALESCE(
                NULLIF(TRIM(file_type), ''),
                CASE
                    WHEN LOWER(source_path) LIKE '%.pdf' THEN 'pdf'
                    WHEN LOWER(source_path) LIKE '%.docx' THEN 'docx'
                    WHEN LOWER(source_path) LIKE '%.pptx' THEN 'pptx'
                    WHEN LOWER(source_path) LIKE '%.ppt' THEN 'pptx'
                    WHEN LOWER(source_path) LIKE '%.md' THEN 'md'
                    WHEN LOWER(source_path) LIKE '%.markdown' THEN 'md'
                    WHEN LOWER(source_path) LIKE '%.txt' THEN 'txt'
                    WHEN LOWER(source_path) LIKE '%.text' THEN 'txt'
                    WHEN LOWER(source_path) LIKE '%.py' THEN 'py'
                    WHEN LOWER(source_path) LIKE '%.json' THEN 'json'
                    ELSE COALESCE(NULLIF(doc_type, ''), 'other')
                END
            )
            WHERE COALESCE(NULLIF(TRIM(file_type), ''), '') = ''
            """
        )
    except sqlite3.OperationalError:
        # Column might not exist in some edge cases; ignore.
        pass

    # Add group_name to learning_objectives for North Star topic grouping
    cursor.execute("PRAGMA table_info(learning_objectives)")
    lo_cols = {col[1] for col in cursor.fetchall()}
    if "group_name" not in lo_cols:
        try:
            cursor.execute("ALTER TABLE learning_objectives ADD COLUMN group_name TEXT")
            print("[INFO] Added 'group_name' column to learning_objectives table")
        except sqlite3.OperationalError:
            pass
    if "managed_by_tutor" not in lo_cols:
        try:
            cursor.execute(
                "ALTER TABLE learning_objectives ADD COLUMN managed_by_tutor INTEGER NOT NULL DEFAULT 0"
            )
            print(
                "[INFO] Added 'managed_by_tutor' column to learning_objectives table"
            )
        except sqlite3.OperationalError:
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
    # idx_topics_course: REMOVED — topics table dropped
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
            response_id TEXT,                 -- provider response id for continuity
            model_id TEXT,                    -- model used for this turn
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
    # Brain learner-profile tables
    # ------------------------------------------------------------------
    _create_learner_profile_tables(cursor)

    # ------------------------------------------------------------------
    # Premium product shell tables
    # ------------------------------------------------------------------
    _create_product_shell_tables(cursor)

    # ------------------------------------------------------------------
    # Scholar research tables
    # ------------------------------------------------------------------
    try:
        from scholar_research import ensure_scholar_research_schema

        ensure_scholar_research_schema(conn)
    except Exception as exc:
        print(f"[WARN] Scholar research tables skipped: {exc}")

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

    # ------------------------------------------------------------------
    # Scholar Questions table (deterministic question lifecycle tracking)
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS scholar_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id TEXT NOT NULL UNIQUE,
            question_hash TEXT NOT NULL UNIQUE,
            question_text TEXT NOT NULL,
            source TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            answered_at TEXT,
            answer_text TEXT,
            answer_source TEXT,
            status_updated_at TEXT,
            status_reason TEXT
        )
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_questions_question_id
        ON scholar_questions(question_id)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_questions_hash
        ON scholar_questions(question_hash)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_questions_status
        ON scholar_questions(status)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_questions_source
        ON scholar_questions(source)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_questions_updated
        ON scholar_questions(updated_at DESC)
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS scholar_investigations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            investigation_id TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            query_text TEXT NOT NULL,
            rationale TEXT NOT NULL,
            audience_type TEXT NOT NULL DEFAULT 'learner',
            mode TEXT NOT NULL DEFAULT 'brain',
            status TEXT NOT NULL DEFAULT 'queued',
            source_policy TEXT NOT NULL DEFAULT 'trusted-first',
            confidence TEXT NOT NULL DEFAULT 'low',
            uncertainty_summary TEXT,
            linked_profile_snapshot_id TEXT,
            requested_by TEXT NOT NULL DEFAULT 'ui',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            started_at TEXT,
            completed_at TEXT,
            run_notes TEXT,
            output_markdown TEXT,
            error_message TEXT
        )
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_investigations_status
        ON scholar_investigations(status)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_investigations_updated
        ON scholar_investigations(updated_at DESC)
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS scholar_sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id TEXT NOT NULL UNIQUE,
            investigation_id TEXT NOT NULL,
            url TEXT NOT NULL,
            normalized_url TEXT NOT NULL,
            domain TEXT NOT NULL,
            title TEXT,
            publisher TEXT,
            published_at TEXT,
            snippet TEXT,
            source_type TEXT NOT NULL DEFAULT 'web',
            trust_tier TEXT NOT NULL DEFAULT 'general',
            rank_order INTEGER NOT NULL DEFAULT 0,
            fetched_at TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(investigation_id) REFERENCES scholar_investigations(investigation_id)
        )
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_sources_investigation
        ON scholar_sources(investigation_id)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_sources_domain
        ON scholar_sources(domain)
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS scholar_findings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            finding_id TEXT NOT NULL UNIQUE,
            investigation_id TEXT NOT NULL,
            title TEXT NOT NULL,
            summary TEXT NOT NULL,
            relevance TEXT,
            confidence TEXT NOT NULL DEFAULT 'low',
            uncertainty TEXT,
            learner_visible INTEGER NOT NULL DEFAULT 1,
            source_ids_json TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(investigation_id) REFERENCES scholar_investigations(investigation_id)
        )
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_findings_investigation
        ON scholar_findings(investigation_id)
    """
    )

    # ------------------------------------------------------------------
    # Scholar Run tracking (v9.4.2 - for UI run button + history)
    # ------------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scholar_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            status TEXT DEFAULT 'running',
            error_message TEXT,
            triggered_by TEXT DEFAULT 'ui',
            params_json TEXT,
            digest_id INTEGER,
            proposals_created INTEGER DEFAULT 0,
            notes TEXT,
            FOREIGN KEY(digest_id) REFERENCES scholar_digests(id)
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_scholar_runs_status
        ON scholar_runs(status)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_scholar_runs_started
        ON scholar_runs(started_at DESC)
    """)

    # Add content + cluster columns to scholar tables (v9.4 DB-first)
    for table, cols in [
        ("scholar_digests", [("content", "TEXT"), ("cluster_id", "TEXT")]),
        ("scholar_proposals", [("content", "TEXT"), ("cluster_id", "TEXT")]),
        (
            "scholar_questions",
            [
                ("question_id", "TEXT"),
                ("question_hash", "TEXT"),
                ("question_text", "TEXT"),
                ("source", "TEXT"),
                ("status", "TEXT"),
                ("created_at", "TEXT"),
                ("updated_at", "TEXT"),
                ("answered_at", "TEXT"),
                ("answer_text", "TEXT"),
                ("answer_source", "TEXT"),
                ("status_updated_at", "TEXT"),
                ("status_reason", "TEXT"),
                ("audience_type", "TEXT"),
                ("rationale", "TEXT"),
                ("is_blocking", "INTEGER DEFAULT 0"),
                ("linked_investigation_id", "TEXT"),
                ("evidence_needed", "TEXT"),
                ("answer_incorporation_status", "TEXT"),
                ("answer_incorporated_at", "TEXT"),
            ],
        ),
        (
            "scholar_investigations",
            [
                ("investigation_id", "TEXT"),
                ("title", "TEXT"),
                ("query_text", "TEXT"),
                ("rationale", "TEXT"),
                ("audience_type", "TEXT"),
                ("mode", "TEXT"),
                ("status", "TEXT"),
                ("source_policy", "TEXT"),
                ("confidence", "TEXT"),
                ("uncertainty_summary", "TEXT"),
                ("linked_profile_snapshot_id", "TEXT"),
                ("requested_by", "TEXT"),
                ("created_at", "TEXT"),
                ("updated_at", "TEXT"),
                ("started_at", "TEXT"),
                ("completed_at", "TEXT"),
                ("run_notes", "TEXT"),
                ("output_markdown", "TEXT"),
                ("error_message", "TEXT"),
            ],
        ),
        (
            "scholar_sources",
            [
                ("source_id", "TEXT"),
                ("investigation_id", "TEXT"),
                ("url", "TEXT"),
                ("normalized_url", "TEXT"),
                ("domain", "TEXT"),
                ("title", "TEXT"),
                ("publisher", "TEXT"),
                ("published_at", "TEXT"),
                ("snippet", "TEXT"),
                ("source_type", "TEXT"),
                ("trust_tier", "TEXT"),
                ("rank_order", "INTEGER"),
                ("fetched_at", "TEXT"),
                ("created_at", "TEXT"),
            ],
        ),
        (
            "scholar_findings",
            [
                ("finding_id", "TEXT"),
                ("investigation_id", "TEXT"),
                ("title", "TEXT"),
                ("summary", "TEXT"),
                ("relevance", "TEXT"),
                ("confidence", "TEXT"),
                ("uncertainty", "TEXT"),
                ("learner_visible", "INTEGER"),
                ("source_ids_json", "TEXT"),
                ("created_at", "TEXT"),
                ("updated_at", "TEXT"),
            ],
        ),
    ]:
        cursor.execute(f"PRAGMA table_info({table})")
        existing = {c[1] for c in cursor.fetchall()}
        for col_name, col_type in cols:
            if col_name not in existing:
                try:
                    cursor.execute(
                        f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"
                    )
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
            tutor_session_id TEXT,
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
            cursor.execute(
                "ALTER TABLE quick_notes ADD COLUMN note_type TEXT DEFAULT 'notes'"
            )
        except Exception:
            pass
    if "tutor_session_id" not in quick_notes_cols:
        try:
            cursor.execute("ALTER TABLE quick_notes ADD COLUMN tutor_session_id TEXT")
        except Exception:
            pass
    cursor.execute("UPDATE quick_notes SET note_type = COALESCE(note_type, 'notes')")
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_quick_notes_position
        ON quick_notes(position)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_quick_notes_tutor_session
        ON quick_notes(tutor_session_id)
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

    # ------------------------------------------------------------------
    # Composable Method Library (v9.4 - method blocks, chains, ratings)
    # ------------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS method_blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            method_id TEXT,
            name TEXT NOT NULL,
            category TEXT,
            control_stage TEXT DEFAULT 'ENCODE' CHECK(control_stage IN ('PRIME', 'TEACH', 'CALIBRATE', 'ENCODE', 'REFERENCE', 'RETRIEVE', 'OVERLEARN')),
            description TEXT,
            default_duration_min INTEGER DEFAULT 5,
            energy_cost TEXT DEFAULT 'medium',
            best_stage TEXT,
            tags TEXT,
            knob_overrides_json TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS method_chains (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            block_ids TEXT,
            context_tags TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            is_template INTEGER DEFAULT 0
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS method_ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            method_block_id INTEGER,
            chain_id INTEGER,
            session_id INTEGER,
            effectiveness INTEGER,
            engagement INTEGER,
            notes TEXT,
            context TEXT,
            rated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(method_block_id) REFERENCES method_blocks(id),
            FOREIGN KEY(chain_id) REFERENCES method_chains(id),
            FOREIGN KEY(session_id) REFERENCES sessions(id)
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_method_blocks_control_stage
        ON method_blocks(control_stage)
    """)

    _ensure_method_blocks_control_stage_constraint(cursor)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_method_chains_template
        ON method_chains(is_template)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_method_ratings_block
        ON method_ratings(method_block_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_method_ratings_chain
        ON method_ratings(chain_id)
    """)

    # ------------------------------------------------------------------
    # RuleSets table (V2 architecture - tutor behavior constraints)
    # ------------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rulesets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            scope TEXT DEFAULT 'chain',
            rules_json TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_rulesets_scope
        ON rulesets(scope)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_rulesets_active
        ON rulesets(is_active)
    """)

    # Add evidence column to method_blocks if missing (PEIRRO v2 migration)
    cursor.execute("PRAGMA table_info(method_blocks)")
    mb_cols = {col[1] for col in cursor.fetchall()}
    if "category" not in mb_cols:
        try:
            cursor.execute("ALTER TABLE method_blocks ADD COLUMN category TEXT")
            print("[INFO] Added 'category' column to method_blocks table")
        except sqlite3.OperationalError:
            pass
    if "evidence" not in mb_cols:
        try:
            cursor.execute("ALTER TABLE method_blocks ADD COLUMN evidence TEXT")
            print("[INFO] Added 'evidence' column to method_blocks table")
        except sqlite3.OperationalError:
            pass

    if "facilitation_prompt" not in mb_cols:
        try:
            cursor.execute(
                "ALTER TABLE method_blocks ADD COLUMN facilitation_prompt TEXT"
            )
            print("[INFO] Added 'facilitation_prompt' column to method_blocks table")
        except sqlite3.OperationalError:
            pass

    if "method_id" not in mb_cols:
        try:
            cursor.execute("ALTER TABLE method_blocks ADD COLUMN method_id TEXT")
            print("[INFO] Added 'method_id' column to method_blocks table")
        except sqlite3.OperationalError:
            pass

    module_card_cols = [
        ("inputs", "TEXT"),
        ("outputs", "TEXT"),
        ("strategy_label", "TEXT"),
        ("failure_modes", "TEXT"),
        ("variants", "TEXT"),
        ("scoring_hooks", "TEXT"),
        ("icap_level", "TEXT"),
        ("clt_target", "TEXT"),
        ("assessment_type", "TEXT"),
        ("artifact_type", "TEXT"),
        ("research_terms", "TEXT"),
        ("knob_overrides_json", "TEXT"),
    ]
    for col_name, col_type in module_card_cols:
        if col_name not in mb_cols:
            try:
                cursor.execute(
                    f"ALTER TABLE method_blocks ADD COLUMN {col_name} {col_type}"
                )
                print(f"[INFO] Added '{col_name}' column to method_blocks table")
            except sqlite3.OperationalError:
                pass

    # Keep legacy category field available for older test/data paths.
        cursor.execute(
            """
            UPDATE method_blocks
            SET category = CASE control_stage
                WHEN 'PRIME' THEN 'prepare'
                WHEN 'TEACH' THEN 'prepare'
                WHEN 'CALIBRATE' THEN 'prepare'
                WHEN 'ENCODE' THEN 'encode'
                WHEN 'REFERENCE' THEN 'interrogate'
                WHEN 'RETRIEVE' THEN 'retrieve'
                WHEN 'OVERLEARN' THEN 'overlearn'
            ELSE category
        END
        WHERE category IS NULL OR TRIM(category) = ''
        """
    )
    cursor.execute(
        """
        UPDATE method_blocks
        SET control_stage = CASE LOWER(category)
            WHEN 'prepare' THEN 'PRIME'
            WHEN 'encode' THEN 'ENCODE'
            WHEN 'interrogate' THEN 'REFERENCE'
            WHEN 'retrieve' THEN 'RETRIEVE'
            WHEN 'refine' THEN 'OVERLEARN'
            WHEN 'overlearn' THEN 'OVERLEARN'
            ELSE control_stage
        END
        WHERE control_stage IS NULL OR TRIM(control_stage) = ''
        """
    )

    # Add ruleset_id to method_chains if missing (V2 architecture migration)
    cursor.execute("PRAGMA table_info(method_chains)")
    mc_cols = {col[1] for col in cursor.fetchall()}
    if "ruleset_id" not in mc_cols:
        try:
            cursor.execute("ALTER TABLE method_chains ADD COLUMN ruleset_id INTEGER")
            print("[INFO] Added 'ruleset_id' column to method_chains table")
        except sqlite3.OperationalError:
            pass

    # ------------------------------------------------------------------
    # Library Meta table (tracks YAML library version + source SHA)
    # ------------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS library_meta (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            library_version TEXT NOT NULL,
            source_sha TEXT,
            seeded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            method_count INTEGER,
            chain_count INTEGER
        )
    """)

    # Add method_chain_id to sessions table if missing
    cursor.execute("PRAGMA table_info(sessions)")
    session_cols = {col[1] for col in cursor.fetchall()}
    if "method_chain_id" not in session_cols:
        try:
            cursor.execute("ALTER TABLE sessions ADD COLUMN method_chain_id INTEGER")
            print("[INFO] Added 'method_chain_id' column to sessions table")
        except sqlite3.OperationalError:
            pass

    # ------------------------------------------------------------------
    # Chain Runs table (tracks chain runner executions)
    # ------------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chain_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chain_id INTEGER NOT NULL,
            session_id INTEGER,
            topic TEXT NOT NULL,
            course_id INTEGER,
            status TEXT DEFAULT 'running',
            current_step INTEGER DEFAULT 0,
            total_steps INTEGER NOT NULL,
            run_state_json TEXT,
            artifacts_json TEXT,
            started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            completed_at TEXT,
            error_message TEXT,
            FOREIGN KEY(chain_id) REFERENCES method_chains(id),
            FOREIGN KEY(session_id) REFERENCES sessions(id)
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_chain_runs_chain
        ON chain_runs(chain_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_chain_runs_status
        ON chain_runs(status)
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_scoring_weights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL UNIQUE,
            learning_gain_weight REAL DEFAULT 0.20,
            time_cost_weight REAL DEFAULT 0.15,
            error_rate_weight REAL DEFAULT 0.15,
            hint_dependence_weight REAL DEFAULT 0.10,
            confidence_calibration_weight REAL DEFAULT 0.15,
            cognitive_strain_weight REAL DEFAULT 0.10,
            artifact_quality_weight REAL DEFAULT 0.15,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS session_scoring_hooks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            learning_gain REAL,
            time_cost REAL,
            error_rate REAL,
            hint_dependence REAL,
            confidence_calibration REAL,
            cognitive_strain REAL,
            artifact_quality REAL,
            composite_score REAL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(session_id) REFERENCES sessions(id)
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_session_scoring_hooks_session
        ON session_scoring_hooks(session_id)
    """)

    # ------------------------------------------------------------------
    # Adaptive Tutor: tutor_sessions (interactive tutor chat sessions)
    # ------------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tutor_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL UNIQUE,
            brain_session_id INTEGER,
            brain_profile_snapshot_id INTEGER,
            codex_thread_id TEXT,
            last_response_id TEXT,
            course_id INTEGER,
            phase TEXT NOT NULL DEFAULT 'first_pass',
            topic TEXT,
            content_filter_json TEXT,
            scholar_strategy_json TEXT,
            strategy_feedback_json TEXT,
            status TEXT DEFAULT 'active',
            turn_count INTEGER DEFAULT 0,
            artifacts_json TEXT,
            lo_ids_json TEXT,
            summary_text TEXT,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            FOREIGN KEY(brain_session_id) REFERENCES sessions(id),
            FOREIGN KEY(course_id) REFERENCES courses(id)
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_tutor_sessions_session_id
        ON tutor_sessions(session_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_tutor_sessions_status
        ON tutor_sessions(status)
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tutor_session_learning_objectives (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tutor_session_id TEXT NOT NULL,
            lo_id INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tutor_session_id, lo_id),
            FOREIGN KEY(tutor_session_id) REFERENCES tutor_sessions(session_id),
            FOREIGN KEY(lo_id) REFERENCES learning_objectives(id)
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_tutor_session_lo_session
        ON tutor_session_learning_objectives(tutor_session_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_tutor_session_lo_lo_id
        ON tutor_session_learning_objectives(lo_id)
    """)

    # ------------------------------------------------------------------
    # Tutor shell state + normalized Studio persistence
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS project_workspace_state (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL UNIQUE,
            active_tutor_session_id TEXT,
            last_mode TEXT NOT NULL DEFAULT 'studio',
            active_board_scope TEXT NOT NULL DEFAULT 'project',
            active_board_id INTEGER,
            viewer_state_json TEXT,
            panel_layout_json TEXT NOT NULL DEFAULT '[]',
            document_tabs_json TEXT NOT NULL DEFAULT '[]',
            active_document_tab_id TEXT,
            runtime_state_json TEXT NOT NULL DEFAULT '{}',
            tutor_chain_id INTEGER,
            tutor_custom_block_ids_json TEXT NOT NULL DEFAULT '[]',
            prime_packet_promoted_objects_json TEXT NOT NULL DEFAULT '[]',
            polish_packet_promoted_notes_json TEXT NOT NULL DEFAULT '[]',
            selected_material_ids_json TEXT NOT NULL DEFAULT '[]',
            revision INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(course_id) REFERENCES courses(id),
            FOREIGN KEY(active_tutor_session_id) REFERENCES tutor_sessions(session_id)
        )
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_project_workspace_state_course
        ON project_workspace_state(course_id)
        """
    )
    cursor.execute("PRAGMA table_info(project_workspace_state)")
    workspace_state_columns = {row[1] for row in cursor.fetchall()}
    if "prime_packet_promoted_objects_json" not in workspace_state_columns:
        cursor.execute(
            """
            ALTER TABLE project_workspace_state
            ADD COLUMN prime_packet_promoted_objects_json TEXT NOT NULL DEFAULT '[]'
            """
        )
    if "polish_packet_promoted_notes_json" not in workspace_state_columns:
        cursor.execute(
            """
            ALTER TABLE project_workspace_state
            ADD COLUMN polish_packet_promoted_notes_json TEXT NOT NULL DEFAULT '[]'
            """
        )
    if "panel_layout_json" not in workspace_state_columns:
        cursor.execute(
            """
            ALTER TABLE project_workspace_state
            ADD COLUMN panel_layout_json TEXT NOT NULL DEFAULT '[]'
            """
        )
    if "document_tabs_json" not in workspace_state_columns:
        cursor.execute(
            """
            ALTER TABLE project_workspace_state
            ADD COLUMN document_tabs_json TEXT NOT NULL DEFAULT '[]'
            """
        )
    if "active_document_tab_id" not in workspace_state_columns:
        cursor.execute(
            """
            ALTER TABLE project_workspace_state
            ADD COLUMN active_document_tab_id TEXT
            """
        )
    if "runtime_state_json" not in workspace_state_columns:
        cursor.execute(
            """
            ALTER TABLE project_workspace_state
            ADD COLUMN runtime_state_json TEXT NOT NULL DEFAULT '{}'
            """
        )
    if "tutor_chain_id" not in workspace_state_columns:
        cursor.execute(
            """
            ALTER TABLE project_workspace_state
            ADD COLUMN tutor_chain_id INTEGER
            """
        )
    if "tutor_custom_block_ids_json" not in workspace_state_columns:
        cursor.execute(
            """
            ALTER TABLE project_workspace_state
            ADD COLUMN tutor_custom_block_ids_json TEXT NOT NULL DEFAULT '[]'
            """
        )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS studio_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            tutor_session_id TEXT,
            scope TEXT NOT NULL DEFAULT 'session',
            item_type TEXT NOT NULL,
            source_kind TEXT,
            title TEXT,
            body_markdown TEXT,
            source_path TEXT,
            source_locator_json TEXT,
            payload_json TEXT,
            status TEXT NOT NULL DEFAULT 'captured',
            promoted_from_id INTEGER,
            version INTEGER NOT NULL DEFAULT 1,
            deleted_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT,
            FOREIGN KEY(course_id) REFERENCES courses(id),
            FOREIGN KEY(tutor_session_id) REFERENCES tutor_sessions(session_id),
            FOREIGN KEY(promoted_from_id) REFERENCES studio_items(id)
        )
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_studio_items_course_scope
        ON studio_items(course_id, scope, status)
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_studio_items_session
        ON studio_items(tutor_session_id, created_at DESC)
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS studio_item_revisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            studio_item_id INTEGER NOT NULL,
            revision INTEGER NOT NULL,
            body_markdown TEXT,
            payload_json TEXT,
            source_locator_json TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(studio_item_id, revision),
            FOREIGN KEY(studio_item_id) REFERENCES studio_items(id)
        )
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_studio_item_revisions_item
        ON studio_item_revisions(studio_item_id, revision DESC)
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS studio_boards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER,
            tutor_session_id TEXT,
            board_scope TEXT NOT NULL,
            name TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 1,
            deleted_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT,
            FOREIGN KEY(course_id) REFERENCES courses(id),
            FOREIGN KEY(tutor_session_id) REFERENCES tutor_sessions(session_id)
        )
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_studio_boards_scope
        ON studio_boards(course_id, tutor_session_id, board_scope)
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS studio_board_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            board_id INTEGER NOT NULL,
            studio_item_id INTEGER NOT NULL,
            group_key TEXT,
            column_key TEXT,
            x REAL,
            y REAL,
            w REAL,
            h REAL,
            sort_order INTEGER DEFAULT 0,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(board_id, studio_item_id),
            FOREIGN KEY(board_id) REFERENCES studio_boards(id),
            FOREIGN KEY(studio_item_id) REFERENCES studio_items(id)
        )
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_studio_board_entries_board
        ON studio_board_entries(board_id, sort_order)
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS studio_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            idempotency_key TEXT NOT NULL UNIQUE,
            course_id INTEGER NOT NULL,
            tutor_session_id TEXT,
            action_type TEXT NOT NULL,
            destination_kind TEXT,
            request_id TEXT,
            status TEXT NOT NULL DEFAULT 'completed',
            details_json TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(course_id) REFERENCES courses(id),
            FOREIGN KEY(tutor_session_id) REFERENCES tutor_sessions(session_id)
        )
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_studio_actions_course_created
        ON studio_actions(course_id, created_at DESC)
        """
    )

    # ------------------------------------------------------------------
    # Tutor workflow redesign: staged workflow persistence + telemetry
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tutor_workflows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id TEXT NOT NULL UNIQUE,
            course_id INTEGER,
            course_event_id INTEGER,
            assignment_title TEXT,
            study_unit TEXT,
            topic TEXT,
            due_date TEXT,
            current_stage TEXT NOT NULL DEFAULT 'launch',
            status TEXT NOT NULL DEFAULT 'launch_ready',
            active_tutor_session_id TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(course_id) REFERENCES courses(id),
            FOREIGN KEY(course_event_id) REFERENCES course_events(id),
            FOREIGN KEY(active_tutor_session_id) REFERENCES tutor_sessions(session_id)
        )
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_workflows_course_stage
        ON tutor_workflows(course_id, current_stage, status)
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tutor_priming_bundles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id TEXT NOT NULL,
            course_id INTEGER,
            study_unit TEXT,
            topic TEXT,
            selected_material_ids_json TEXT NOT NULL DEFAULT '[]',
            selected_paths_json TEXT NOT NULL DEFAULT '[]',
            source_inventory_json TEXT NOT NULL DEFAULT '[]',
            priming_methods_json TEXT NOT NULL DEFAULT '[]',
            priming_method_runs_json TEXT NOT NULL DEFAULT '[]',
            priming_method TEXT,
            priming_chain_id TEXT,
            learning_objectives_json TEXT NOT NULL DEFAULT '[]',
            concepts_json TEXT NOT NULL DEFAULT '[]',
            concept_graph_json TEXT,
            terminology_json TEXT NOT NULL DEFAULT '[]',
            root_explanations_json TEXT NOT NULL DEFAULT '[]',
            summaries_json TEXT NOT NULL DEFAULT '[]',
            identified_gaps_json TEXT NOT NULL DEFAULT '[]',
            confidence_flags_json TEXT NOT NULL DEFAULT '{}',
            readiness_status TEXT NOT NULL DEFAULT 'draft',
            readiness_blockers_json TEXT NOT NULL DEFAULT '[]',
            recommended_tutor_strategy_json TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(course_id) REFERENCES courses(id)
        )
        """
    )

    cursor.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_priming_bundles_workflow
        ON tutor_priming_bundles(workflow_id)
        """
    )

    cursor.execute("PRAGMA table_info(tutor_priming_bundles)")
    priming_bundle_cols = {col[1] for col in cursor.fetchall()}
    if "priming_methods_json" not in priming_bundle_cols:
        try:
            cursor.execute(
                "ALTER TABLE tutor_priming_bundles ADD COLUMN priming_methods_json TEXT NOT NULL DEFAULT '[]'"
            )
            print("[INFO] Added 'priming_methods_json' column to tutor_priming_bundles table")
        except sqlite3.OperationalError:
            pass
    if "priming_method_runs_json" not in priming_bundle_cols:
        try:
            cursor.execute(
                "ALTER TABLE tutor_priming_bundles ADD COLUMN priming_method_runs_json TEXT NOT NULL DEFAULT '[]'"
            )
            print("[INFO] Added 'priming_method_runs_json' column to tutor_priming_bundles table")
        except sqlite3.OperationalError:
            pass

    try:
        cursor.execute(
            """
            SELECT id, priming_method, priming_methods_json
            FROM tutor_priming_bundles
            """
        )
        priming_bundle_rows = cursor.fetchall()
        for bundle_id, priming_method, priming_methods_json in priming_bundle_rows:
            methods_value = []
            if priming_methods_json:
                try:
                    parsed = json.loads(priming_methods_json)
                except (TypeError, ValueError, json.JSONDecodeError):
                    parsed = []
                if isinstance(parsed, list):
                    methods_value = [
                        str(item).strip()
                        for item in parsed
                        if isinstance(item, str) and str(item).strip()
                    ]
            if not methods_value and priming_method:
                methods_value = [str(priming_method).strip()]
            cursor.execute(
                """
                UPDATE tutor_priming_bundles
                SET priming_methods_json = ?
                WHERE id = ?
                """,
                (json.dumps(methods_value, ensure_ascii=False), bundle_id),
            )
    except sqlite3.OperationalError:
        pass

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tutor_captured_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id TEXT NOT NULL,
            tutor_session_id TEXT,
            stage TEXT NOT NULL DEFAULT 'tutor',
            note_mode TEXT NOT NULL,
            title TEXT,
            content TEXT NOT NULL,
            source_turn_id INTEGER,
            status TEXT NOT NULL DEFAULT 'captured',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(tutor_session_id) REFERENCES tutor_sessions(session_id),
            FOREIGN KEY(source_turn_id) REFERENCES tutor_turns(id)
        )
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_captured_notes_workflow
        ON tutor_captured_notes(workflow_id, note_mode, stage, created_at DESC)
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tutor_feedback_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id TEXT NOT NULL,
            tutor_session_id TEXT,
            stage TEXT NOT NULL DEFAULT 'tutor',
            source_type TEXT NOT NULL,
            source_id TEXT,
            sentiment TEXT NOT NULL,
            issue_type TEXT,
            message TEXT,
            handoff_to_polish INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(tutor_session_id) REFERENCES tutor_sessions(session_id)
        )
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_feedback_events_workflow
        ON tutor_feedback_events(workflow_id, stage, sentiment, created_at DESC)
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tutor_stage_time_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id TEXT NOT NULL,
            stage TEXT NOT NULL,
            start_ts TEXT NOT NULL,
            end_ts TEXT,
            seconds_active INTEGER NOT NULL DEFAULT 0,
            pause_count INTEGER NOT NULL DEFAULT 0,
            notes_json TEXT NOT NULL DEFAULT '[]',
            trigger_source TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_stage_time_logs_workflow
        ON tutor_stage_time_logs(workflow_id, stage, created_at DESC)
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tutor_memory_capsules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id TEXT NOT NULL,
            tutor_session_id TEXT,
            stage TEXT NOT NULL DEFAULT 'tutor',
            capsule_version INTEGER NOT NULL,
            summary_text TEXT,
            rule_snapshot_text TEXT,
            current_objective TEXT,
            study_unit TEXT,
            concept_focus_json TEXT NOT NULL DEFAULT '[]',
            weak_points_json TEXT NOT NULL DEFAULT '[]',
            unresolved_questions_json TEXT NOT NULL DEFAULT '[]',
            exact_notes_json TEXT NOT NULL DEFAULT '[]',
            editable_notes_json TEXT NOT NULL DEFAULT '[]',
            feedback_json TEXT NOT NULL DEFAULT '[]',
            card_requests_json TEXT NOT NULL DEFAULT '[]',
            artifact_refs_json TEXT NOT NULL DEFAULT '[]',
            source_turn_ids_json TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(tutor_session_id) REFERENCES tutor_sessions(session_id),
            UNIQUE(workflow_id, capsule_version)
        )
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_memory_capsules_workflow
        ON tutor_memory_capsules(workflow_id, created_at DESC)
        """
    )

    cursor.execute("PRAGMA table_info(tutor_memory_capsules)")
    memory_capsule_cols = {col[1] for col in cursor.fetchall()}
    if "rule_snapshot_text" not in memory_capsule_cols:
        try:
            cursor.execute(
                "ALTER TABLE tutor_memory_capsules ADD COLUMN rule_snapshot_text TEXT"
            )
            print("[INFO] Added 'rule_snapshot_text' column to tutor_memory_capsules table")
        except sqlite3.OperationalError:
            pass

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tutor_polish_bundles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id TEXT NOT NULL,
            tutor_session_id TEXT,
            priming_bundle_id INTEGER,
            exact_notes_json TEXT NOT NULL DEFAULT '[]',
            editable_notes_json TEXT NOT NULL DEFAULT '[]',
            summaries_json TEXT NOT NULL DEFAULT '[]',
            feedback_queue_json TEXT NOT NULL DEFAULT '[]',
            card_requests_json TEXT NOT NULL DEFAULT '[]',
            reprime_requests_json TEXT NOT NULL DEFAULT '[]',
            studio_payload_json TEXT,
            publish_targets_json TEXT,
            status TEXT NOT NULL DEFAULT 'draft',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(tutor_session_id) REFERENCES tutor_sessions(session_id),
            FOREIGN KEY(priming_bundle_id) REFERENCES tutor_priming_bundles(id)
        )
        """
    )

    cursor.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_polish_bundles_workflow
        ON tutor_polish_bundles(workflow_id)
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tutor_publish_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id TEXT NOT NULL,
            polish_bundle_id INTEGER,
            obsidian_results_json TEXT NOT NULL DEFAULT '[]',
            anki_results_json TEXT NOT NULL DEFAULT '[]',
            brain_index_payload_json TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(polish_bundle_id) REFERENCES tutor_polish_bundles(id)
        )
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_publish_results_workflow
        ON tutor_publish_results(workflow_id, status, created_at DESC)
        """
    )

    # --- Migration to drop mode column if it still exists ---
    cursor.execute("PRAGMA table_info(tutor_sessions)")
    ts_cols = {col[1] for col in cursor.fetchall()}
    if "mode" in ts_cols:
        try:
            cursor.execute("ALTER TABLE tutor_sessions DROP COLUMN mode")
            print("[INFO] Dropped 'mode' column from tutor_sessions table")
        except sqlite3.OperationalError:
            print("[WARN] Could not drop 'mode' column (SQLite might be too old)")

    # ------------------------------------------------------------------
    # Adaptive Tutor: session_chains (links related tutor sessions)
    # ------------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS session_chains (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chain_name TEXT,
            course_id INTEGER,
            topic TEXT NOT NULL,
            session_ids_json TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT,
            FOREIGN KEY(course_id) REFERENCES courses(id)
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_session_chains_topic
        ON session_chains(topic)
    """)

    # ------------------------------------------------------------------
    # Control Plane: error_logs (granular telemetry for selector routing)
    # ------------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS error_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            item_id TEXT,
            error_type TEXT CHECK(error_type IN ('Recall', 'Confusion', 'Rule', 'Representation', 'Procedure', 'Computation', 'Speed', 'None')),
            stage_detected TEXT,
            confidence TEXT CHECK(confidence IN ('H', 'M', 'L')),
            time_to_answer REAL,
            active_knobs TEXT,
            fix_applied TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(session_id) REFERENCES tutor_sessions(session_id)
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_error_logs_session
        ON error_logs(session_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_error_logs_type
        ON error_logs(error_type)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp
        ON error_logs(timestamp)
    """)

    # ------------------------------------------------------------------
    # Adaptive Tutor: tutor_delete_telemetry (persistent delete diagnostics)
    # ------------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tutor_delete_telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id TEXT NOT NULL,
            route TEXT NOT NULL,
            session_id TEXT,
            status TEXT NOT NULL,
            requested_count INTEGER NOT NULL DEFAULT 0,
            deleted_count INTEGER NOT NULL DEFAULT 0,
            skipped_count INTEGER NOT NULL DEFAULT 0,
            failed_count INTEGER NOT NULL DEFAULT 0,
            details_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(session_id) REFERENCES tutor_sessions(session_id)
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_tutor_delete_telemetry_request
        ON tutor_delete_telemetry(request_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_tutor_delete_telemetry_session
        ON tutor_delete_telemetry(session_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_tutor_delete_telemetry_created_at
        ON tutor_delete_telemetry(created_at)
    """)

    # ------------------------------------------------------------------
    # Adaptive Tutor: rag_embedding_failures (per-document embed telemetry)
    # ------------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rag_embedding_failures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rag_doc_id INTEGER NOT NULL,
            provider TEXT,
            embedding_model TEXT,
            collection_name TEXT,
            failure_stage TEXT,
            error_type TEXT,
            error_message TEXT,
            failed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(rag_doc_id) REFERENCES rag_docs(id)
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_rag_embedding_failures_doc
        ON rag_embedding_failures(rag_doc_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_rag_embedding_failures_failed_at
        ON rag_embedding_failures(failed_at)
    """)

    # ------------------------------------------------------------------
    # Adaptive Tutor: rag_embeddings (vector chunks for ChromaDB)
    # ------------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rag_embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rag_doc_id INTEGER NOT NULL,
            chunk_index INTEGER NOT NULL DEFAULT 0,
            chunk_text TEXT NOT NULL,
            embedding_model TEXT DEFAULT 'text-embedding-3-small',
            provider TEXT,
            chroma_id TEXT,
            token_count INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(rag_doc_id) REFERENCES rag_docs(id),
            UNIQUE(rag_doc_id, chunk_index)
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_rag_embeddings_doc
        ON rag_embeddings(rag_doc_id)
    """)

    # Add metadata columns for existing installations
    cursor.execute("PRAGMA table_info(rag_embeddings)")
    rag_cols = {row[1] for row in cursor.fetchall()}
    if "provider" not in rag_cols:
        try:
            cursor.execute("ALTER TABLE rag_embeddings ADD COLUMN provider TEXT")
            print("[INFO] Added 'provider' column to rag_embeddings table")
        except sqlite3.OperationalError:
            pass
    if "embedding_model" not in rag_cols:
        try:
            cursor.execute(
                "ALTER TABLE rag_embeddings ADD COLUMN embedding_model TEXT"
            )
            print("[INFO] Added 'embedding_model' column to rag_embeddings table")
        except sqlite3.OperationalError:
            pass
    if "embedding_dimension" not in rag_cols:
        try:
            cursor.execute(
                "ALTER TABLE rag_embeddings ADD COLUMN embedding_dimension INTEGER"
            )
            print("[INFO] Added 'embedding_dimension' column to rag_embeddings table")
        except sqlite3.OperationalError:
            pass

    # ------------------------------------------------------------------
    # Adaptive Tutor: column migrations
    # ------------------------------------------------------------------
    # tutor_turns: add tutor_session_id, phase, artifacts_json, continuity columns
    cursor.execute("PRAGMA table_info(tutor_turns)")
    tt_cols = {col[1] for col in cursor.fetchall()}
    for col_name in [
        "tutor_session_id",
        "phase",
        "artifacts_json",
        "response_id",
        "model_id",
    ]:
        if col_name not in tt_cols:
            try:
                cursor.execute(f"ALTER TABLE tutor_turns ADD COLUMN {col_name} TEXT")
                print(f"[INFO] Added '{col_name}' column to tutor_turns table")
            except sqlite3.OperationalError:
                pass

    # card_drafts: add tutor_session_id
    cursor.execute("PRAGMA table_info(card_drafts)")
    cd_cols = {col[1] for col in cursor.fetchall()}
    if "tutor_session_id" not in cd_cols:
        try:
            cursor.execute("ALTER TABLE card_drafts ADD COLUMN tutor_session_id TEXT")
            print("[INFO] Added 'tutor_session_id' column to card_drafts table")
        except sqlite3.OperationalError:
            pass

    # ------------------------------------------------------------------
    # 3-Layer Tutor: add method_chain_id + current_block_index to tutor_sessions
    # ------------------------------------------------------------------
    cursor.execute("PRAGMA table_info(tutor_sessions)")
    ts_cols = {col[1] for col in cursor.fetchall()}
    for col_name, col_type in [
        ("method_chain_id", "INTEGER"),
        ("current_block_index", "INTEGER DEFAULT 0"),
        ("codex_thread_id", "TEXT"),
        ("last_response_id", "TEXT"),
    ]:
        if col_name not in ts_cols:
            try:
                cursor.execute(
                    f"ALTER TABLE tutor_sessions ADD COLUMN {col_name} {col_type}"
                )
                print(f"[INFO] Added '{col_name}' column to tutor_sessions table")
            except sqlite3.OperationalError:
                pass

    # ------------------------------------------------------------------
    # 3-Layer Tutor: tutor_block_transitions (tracks per-block progress)
    # ------------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tutor_block_transitions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tutor_session_id TEXT NOT NULL,
            block_id INTEGER NOT NULL,
            block_index INTEGER NOT NULL,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            turn_count INTEGER DEFAULT 0,
            outcome TEXT,
            FOREIGN KEY(tutor_session_id) REFERENCES tutor_sessions(session_id),
            FOREIGN KEY(block_id) REFERENCES method_blocks(id)
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_tutor_block_transitions_session
        ON tutor_block_transitions(tutor_session_id)
    """)

    # Migration: add notes column to tutor_block_transitions
    cursor.execute("PRAGMA table_info(tutor_block_transitions)")
    _tbt_cols = {r[1] for r in cursor.fetchall()}
    if "notes" not in _tbt_cols:
        cursor.execute("ALTER TABLE tutor_block_transitions ADD COLUMN notes TEXT")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scholar_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            status TEXT DEFAULT 'running',
            mode TEXT DEFAULT 'full',
            proposals_created INTEGER DEFAULT 0,
            digests_created INTEGER DEFAULT 0,
            error_message TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scholar_digests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER,
            filename TEXT NOT NULL,
            filepath TEXT,
            digest_type TEXT,
            content TEXT,
            cluster_id TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(run_id) REFERENCES scholar_runs(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scholar_proposals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER,
            filename TEXT NOT NULL,
            title TEXT NOT NULL,
            proposal_type TEXT DEFAULT 'change',
            status TEXT DEFAULT 'draft',
            target_system TEXT,
            expected_impact TEXT,
            evidence_summary TEXT,
            content TEXT,
            reviewed_at TEXT,
            superseded_by INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(run_id) REFERENCES scholar_runs(id),
            FOREIGN KEY(superseded_by) REFERENCES scholar_proposals(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scholar_hypotheses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pattern_detected TEXT NOT NULL,
            explanation TEXT NOT NULL,
            metrics_involved TEXT,
            target_module_id INTEGER,
            target_chain_id INTEGER,
            status TEXT DEFAULT 'draft',
            evidence_strength TEXT DEFAULT 'weak',
            tested_at TEXT,
            validated_at TEXT,
            rejected_at TEXT,
            experiment_id INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(target_module_id) REFERENCES method_blocks(id),
            FOREIGN KEY(target_chain_id) REFERENCES method_chains(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scholar_experiments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hypothesis_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            control_condition TEXT,
            test_condition TEXT,
            metrics_json TEXT,
            success_criteria TEXT,
            status TEXT DEFAULT 'planned',
            outcome TEXT,
            results_json TEXT,
            started_at TEXT,
            completed_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(hypothesis_id) REFERENCES scholar_hypotheses(id)
        )
    """)

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_scholar_proposals_status ON scholar_proposals(status)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_scholar_hypotheses_status ON scholar_hypotheses(status)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_scholar_experiments_status ON scholar_experiments(status)"
    )

    # ------------------------------------------------------------------
    # Table consolidation migrations (idempotent)
    # ------------------------------------------------------------------
    _migrate_academic_deadlines(cursor)
    _migrate_scraped_events(cursor)

    # ------------------------------------------------------------------
    # Adaptive package tables (idempotent)
    # ------------------------------------------------------------------
    try:
        from adaptive.bkt import create_mastery_tables
        from adaptive.telemetry import create_telemetry_tables
        from adaptive.curriculum import create_curriculum_tables
        from adaptive.vault_ingest import create_vault_tables
        from adaptive.knowledge_graph import create_kg_tables

        create_mastery_tables(conn)
        create_telemetry_tables(conn)
        create_curriculum_tables(conn)
        create_vault_tables(conn)
        create_kg_tables(conn)
        print("[OK] Adaptive package tables registered")
    except ImportError as exc:
        print(f"[WARN] Adaptive tables skipped (import failed): {exc}")

    # tutor_sessions: add strategy/profile columns
    cursor.execute("PRAGMA table_info(tutor_sessions)")
    ts_cols_strategy = {col[1] for col in cursor.fetchall()}
    for col_name, col_type in [
        ("brain_profile_snapshot_id", "INTEGER"),
        ("scholar_strategy_json", "TEXT"),
        ("strategy_feedback_json", "TEXT"),
    ]:
        if col_name not in ts_cols_strategy:
            try:
                cursor.execute(
                    f"ALTER TABLE tutor_sessions ADD COLUMN {col_name} {col_type}"
                )
                print(f"[INFO] Added '{col_name}' column to tutor_sessions table")
            except sqlite3.OperationalError:
                pass

    # tutor_turns: add evaluation_json + behavior_override + strategy_snapshot_json columns
    cursor.execute("PRAGMA table_info(tutor_turns)")
    tt_cols_eval = {col[1] for col in cursor.fetchall()}
    for col_name in ["evaluation_json", "behavior_override", "strategy_snapshot_json"]:
        if col_name not in tt_cols_eval:
            try:
                cursor.execute(
                    f"ALTER TABLE tutor_turns ADD COLUMN {col_name} TEXT"
                )
                print(f"[INFO] Added '{col_name}' column to tutor_turns table")
            except sqlite3.OperationalError:
                pass

    # ------------------------------------------------------------------
    # Video Enrichment: API usage tracking
    # ------------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS video_api_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_hash TEXT NOT NULL,
            model TEXT NOT NULL,
            prompt_tokens INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            estimated_cost_usd REAL DEFAULT 0.0,
            segment_range TEXT,
            material_id INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_video_api_usage_hash
        ON video_api_usage(video_hash)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_video_api_usage_month
        ON video_api_usage(created_at)
    """)

    # Drop dead tables
    cursor.execute("DROP TABLE IF EXISTS wheel_config")
    cursor.execute("DROP TABLE IF EXISTS topics")
    cursor.execute("DROP INDEX IF EXISTS idx_topics_course")

    # ------------------------------------------------------------------
    # Tutor Accuracy Feedback Loop (Gap 9)
    # ------------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tutor_accuracy_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            turn_number INTEGER,
            topic TEXT,
            retrieval_confidence TEXT,
            source_count INTEGER,
            chunk_count INTEGER,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_tutor_accuracy_log_session
        ON tutor_accuracy_log(session_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_tutor_accuracy_log_topic
        ON tutor_accuracy_log(topic)
    """)

    conn.commit()
    conn.close()

    print(f"[OK] Database initialized at: {DB_PATH}")
    print("[OK] Schema version: 9.7 + premium product shell")


def migrate_method_categories():
    """
    Migrate method_blocks from PEIRRO phases to Control Plane stages.
    Idempotent — only updates rows that still use old category names.
    """
    conn = sqlite3.connect(DB_PATH, timeout=30)
    cursor = conn.cursor()

    # PEIRRO to Control Plane mapping
    category_map = {
        "prepare": "PRIME",
        "teach": "TEACH",
        "encode": "ENCODE",
        "interrogate": "ENCODE",
        "retrieve": "RETRIEVE",
        "refine": "OVERLEARN",
        "overlearn": "OVERLEARN",
    }

    total = 0
    for old_cat, new_stage in category_map.items():
        cursor.execute(
            "UPDATE method_blocks SET control_stage = ? WHERE control_stage = ?",
            (new_stage, old_cat),
        )
        total += cursor.rowcount

    conn.commit()
    conn.close()

    if total > 0:
        print(f"[OK] Migrated {total} method block(s) to Control Plane stages")
    else:
        print(
            "[INFO] Method blocks already use Control Plane stages (no migration needed)"
        )


def migrate_from_v8():
    """
    Migrate data from v8 schema to v9.1 schema if needed.
    Maps old column names to new ones.
    """
    conn = sqlite3.connect(DB_PATH, timeout=30)
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


def log_error(session_id: str, item_id: str = None, error_type: str = None,
              stage_detected: str = None, confidence: str = None,
              time_to_answer: float = None, active_knobs: dict = None,
              fix_applied: str = None) -> int:
    """
    Log an error to the error_logs table.
    
    Args:
        session_id: The tutor session ID
        item_id: Specific question/flashcard ID
        error_type: One of Recall, Confusion, Rule, Representation, Procedure, Computation, Speed, None
        stage_detected: Control Plane stage where error was detected (e.g., RETRIEVE, CALIBRATE)
        confidence: H (High), M (Medium), L (Low)
        time_to_answer: Seconds to answer
        active_knobs: Dict of active knobs for A/B testing context
        fix_applied: Which method override was triggered (e.g., M-ENC-010)
    
    Returns:
        The ID of the inserted error log row
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO error_logs 
        (session_id, item_id, error_type, stage_detected, confidence, 
         time_to_answer, active_knobs, fix_applied)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        session_id, item_id, error_type, stage_detected, confidence,
        time_to_answer, 
        json.dumps(active_knobs) if active_knobs else None,
        fix_applied
    ))
    
    conn.commit()
    row_id = cursor.lastrowid
    conn.close()
    return row_id


def log_tutor_delete_telemetry(
    request_id: str,
    route: str,
    status: str,
    session_id: str = None,
    requested_count: int = 0,
    deleted_count: int = 0,
    skipped_count: int = 0,
    failed_count: int = 0,
    details: Optional[dict] = None,
) -> int:
    """
    Persist tutor delete telemetry for post-mortem debugging.

    Args:
        request_id: Correlation ID returned by delete endpoints.
        route: Endpoint route name.
        status: Delete outcome status.
        session_id: Tutor session ID.
        requested_count: Number of items requested for deletion.
        deleted_count: Number of items deleted.
        skipped_count: Number of items skipped/already missing.
        failed_count: Number of failed delete attempts.
        details: Additional structured details.

    Returns:
        Inserted row ID.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO tutor_delete_telemetry
        (
            request_id, route, session_id, status,
            requested_count, deleted_count, skipped_count, failed_count, details_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            request_id,
            route,
            session_id,
            status,
            int(requested_count or 0),
            int(deleted_count or 0),
            int(skipped_count or 0),
            int(failed_count or 0),
            json.dumps(details) if details else None,
        ),
    )
    conn.commit()
    row_id = cursor.lastrowid
    conn.close()
    return row_id


def get_dominant_error(session_id: str, limit: int = 10) -> str:
    """
    Get the dominant error type for a session.
    Returns the most frequent error type from recent logs.
    Used as input to selector.py for deterministic routing.
    
    Args:
        session_id: The tutor session ID
        limit: Number of recent errors to consider
    
    Returns:
        The dominant error type (e.g., 'Confusion', 'Speed') or None
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT error_type, COUNT(*) as count
        FROM error_logs
        WHERE session_id = ? AND error_type IS NOT NULL
        GROUP BY error_type
        ORDER BY count DESC
        LIMIT 1
    """, (session_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    return row[0] if row else None


def get_error_stats(session_id: str) -> dict:
    """
    Get comprehensive error statistics for a session.
    Calculates HCWR (High-Confidence Wrong Rate) and other metrics.
    
    Args:
        session_id: The tutor session ID
    
    Returns:
        Dict with error counts, HCWR, median latency, etc.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # Get error counts by type
    cursor.execute("""
        SELECT error_type, confidence, COUNT(*), AVG(time_to_answer)
        FROM error_logs
        WHERE session_id = ?
        GROUP BY error_type, confidence
    """, (session_id,))
    
    rows = cursor.fetchall()
    
    stats = {
        'total_errors': 0,
        'by_type': {},
        'by_confidence': {'H': 0, 'M': 0, 'L': 0},
        'high_confidence_wrong': 0,  # HCWR numerator
        'median_latency': 0
    }
    
    latencies = []
    for error_type, confidence, count, avg_time in rows:
        stats['total_errors'] += count
        stats['by_type'][error_type] = stats['by_type'].get(error_type, 0) + count
        stats['by_confidence'][confidence] = stats['by_confidence'].get(confidence, 0) + count
        
        if confidence == 'H' and error_type != 'None':
            stats['high_confidence_wrong'] += count
        
        if avg_time:
            latencies.extend([avg_time] * count)
    
    if latencies:
        latencies.sort()
        stats['median_latency'] = latencies[len(latencies) // 2]
    
    # Calculate HCWR
    total_high_conf = stats['by_confidence']['H']
    if total_high_conf > 0:
        stats['hcwr'] = stats['high_confidence_wrong'] / total_high_conf
    else:
        stats['hcwr'] = 0
    
    conn.close()
    return stats


def get_connection():
    """
    Get a database connection.
    """
    # Ensure the database schema exists so API handlers and tests don't depend on
    # a pre-existing local DB file.
    if not os.path.exists(DB_PATH):
        init_database()

    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.execute("PRAGMA busy_timeout = 10000")
    conn.execute("PRAGMA journal_mode = WAL")

    try:
        conn.execute("SELECT 1 FROM sessions LIMIT 1")
    except sqlite3.OperationalError:
        # Likely a brand-new DB file with no schema yet.
        conn.close()
        init_database()
        conn = sqlite3.connect(DB_PATH, timeout=30)
        conn.execute("PRAGMA busy_timeout = 10000")
        conn.execute("PRAGMA journal_mode = WAL")

    return conn


def _load_seed_methods_module():
    seed_path = Path(__file__).resolve().parent / "data" / "seed_methods.py"
    if not seed_path.exists():
        return None
    spec = importlib.util.spec_from_file_location("seed_methods", seed_path)
    if spec is None or spec.loader is None:
        return None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_METHOD_LIBRARY_ENSURED = False


def ensure_method_library_seeded() -> None:
    global _METHOD_LIBRARY_ENSURED
    if _METHOD_LIBRARY_ENSURED:
        return

    # Runtime reads should prefer availability once the library is already present.
    # Strict reconciliation stays opt-in via PT_METHOD_LIBRARY_STRICT_SYNC=1.
    strict_sync = os.environ.get("PT_METHOD_LIBRARY_STRICT_SYNC", "0").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }

    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM method_blocks")
        block_count = int(cursor.fetchone()[0] or 0)
        cursor.execute(
            "SELECT COUNT(*) FROM method_chains WHERE COALESCE(is_template, 0) = 1"
        )
        template_chain_count = int(cursor.fetchone()[0] or 0)
        conn.close()
    except sqlite3.OperationalError:
        return

    if block_count > 0 and template_chain_count > 0 and not strict_sync:
        _METHOD_LIBRARY_ENSURED = True
        return

    module = _load_seed_methods_module()
    if module and hasattr(module, "seed_methods"):
        try:
            module.seed_methods(force=False, strict_sync=strict_sync)
        except TypeError:
            # Backward compatibility with older seed_methods signatures.
            module.seed_methods(force=False)
        except sqlite3.OperationalError as exc:
            # Methods/chains pages should stay readable even if a concurrent writer
            # temporarily locks the database during best-effort library sync.
            if "locked" in str(exc).lower():
                print("[WARN] Method library sync skipped because the database is locked.")
                return
            raise
    _METHOD_LIBRARY_ENSURED = True


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


def mark_file_ingested(
    conn, filepath: str, checksum: str, session_id: Optional[int] = None
):
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


def get_ingested_session_id(conn, filepath: str) -> Optional[int]:
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
    conn = sqlite3.connect(DB_PATH, timeout=30)
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
    conn = sqlite3.connect(DB_PATH, timeout=30)
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
                auto_migrate = os.environ.get(
                    "PT_BRAIN_AUTO_MIGRATE", ""
                ).strip().lower() in {
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

    # Ensure the Composable Method Library is present (or merge any missing YAML items).
    # Start_Dashboard.bat runs this script on every launch; we keep the library in sync
    # so /methods and tutor chain templates don't appear empty or partial after a restart.
    expected_method_count = 0
    expected_template_chain_count = 0
    try:
        repo_root = Path(__file__).resolve().parents[1]
        methods_dir = repo_root / "sop" / "library" / "methods"
        chains_dir = repo_root / "sop" / "library" / "chains"
        if methods_dir.exists():
            expected_method_count = len(list(methods_dir.glob("*.yaml")))
        if chains_dir.exists():
            expected_template_chain_count = len(
                [
                    path
                    for path in chains_dir.glob("*.yaml")
                    if path.name != "certification_registry.yaml"
                ]
            )
    except Exception as e:
        print(f"[WARN] Could not compute expected library sizes from YAML: {e}")
        expected_method_count = 0
        expected_template_chain_count = 0

    sentinel_method_ok = None
    sentinel_chain_ok = None
    try:
        conn = sqlite3.connect(DB_PATH, timeout=30)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM method_blocks")
        method_count = int(cursor.fetchone()[0] or 0)
        cursor.execute(
            "SELECT COUNT(*) FROM method_chains WHERE COALESCE(is_template, 0) = 1"
        )
        template_chain_count = int(cursor.fetchone()[0] or 0)
        cursor.execute(
            "SELECT 1 FROM method_blocks WHERE name = ? LIMIT 1", ("Brain Dump",)
        )
        sentinel_method_ok = cursor.fetchone() is not None
        cursor.execute(
            "SELECT 1 FROM method_chains WHERE name = ? AND COALESCE(is_template, 0) = 1 LIMIT 1",
            ("SWEEP",),
        )
        sentinel_chain_ok = cursor.fetchone() is not None
        conn.close()
    except Exception as e:
        print(f"[WARN] Could not check method library status for seeding: {e}")
        method_count = None
        template_chain_count = None

    seed_reasons = []
    needs_seed = False
    if method_count is None or template_chain_count is None:
        needs_seed = True
        seed_reasons.append("counts unavailable")
    else:
        # Prefer YAML sizes when available; otherwise fall back to a minimal presence check.
        if expected_method_count > 0 and method_count < expected_method_count:
            needs_seed = True
            seed_reasons.append(
                f"method_blocks {method_count} < expected {expected_method_count}"
            )
        elif expected_method_count == 0 and method_count == 0:
            needs_seed = True
            seed_reasons.append("method_blocks empty")

        if (
            expected_template_chain_count > 0
            and template_chain_count < expected_template_chain_count
        ):
            needs_seed = True
            seed_reasons.append(
                f"template_chains {template_chain_count} < expected {expected_template_chain_count}"
            )
        elif expected_template_chain_count == 0 and template_chain_count == 0:
            needs_seed = True
            seed_reasons.append("template_chains empty")

        if sentinel_method_ok is False:
            needs_seed = True
            seed_reasons.append("missing 'Brain Dump' sentinel method")
        if sentinel_chain_ok is False:
            needs_seed = True
            seed_reasons.append("missing 'SWEEP' sentinel template chain")

    if needs_seed:
        reason_str = ", ".join(seed_reasons) if seed_reasons else "unknown"
        print(
            "[INFO] Method library needs seeding/merge ("
            f"method_blocks={method_count}/{expected_method_count or '?'}, "
            f"template_chains={template_chain_count}/{expected_template_chain_count or '?'}; "
            f"reason={reason_str}"
            "); seeding..."
        )
        try:
            import subprocess
            from pathlib import Path

            seed_script = Path(__file__).resolve().parent / "data" / "seed_methods.py"
            if seed_script.exists():
                result = subprocess.run(
                    [sys.executable, str(seed_script)],
                    capture_output=True,
                    text=True,
                )
                if result.returncode == 0:
                    print(
                        "[OK] Seeded/merged method library (method_blocks + method_chains)."
                    )
                else:
                    msg = (result.stderr or "").strip() or (result.stdout or "").strip()
                    if not msg:
                        msg = f"exit code {result.returncode}"
                    print(f"[WARN] seed_methods.py failed: {msg}")
            else:
                print(f"[WARN] seed_methods.py not found at: {seed_script}")
        except Exception as e:
            print(f"[WARN] Method library seed raised: {e}")

    # Optional one-time data correction for session minutes
    if os.environ.get("PT_BRAIN_BACKFILL_MINUTES", "").strip().lower() in {
        "1",
        "true",
        "yes",
    }:
        updated_time, updated_duration = backfill_session_minutes()
        print(f"[INFO] Backfilled time_spent_minutes for {updated_time} sessions.")
        print(f"[INFO] Backfilled duration_minutes for {updated_duration} sessions.")

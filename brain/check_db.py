#!/usr/bin/env python3
"""Clear old semester data while preserving new wheel courses"""
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "data", "pt_study.db")
print(f"DB Path: {db_path}")

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Tables to clear (old semester data)
tables_to_clear = [
    "sessions",           # Old study sessions
    "card_drafts",        # Old Anki card drafts
    "topic_mastery",      # Old topic mastery data
    "topics",             # Old topics
    "tutor_turns",        # Old tutor conversations
    "rag_docs",           # Old RAG documents
    "ingested_files",     # Old ingested files tracking
    "scholar_digests",    # Old scholar digests
    "scholar_proposals",  # Old scholar proposals
    "weakness_queue",     # Old weakness queue
    "quick_notes",        # Old quick notes
    "study_wheel_state",  # Old wheel state (we have new wheel_courses)
]

print("\n=== CLEARING OLD SEMESTER DATA ===")
for table in tables_to_clear:
    try:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        count = cur.fetchone()[0]
        cur.execute(f"DELETE FROM {table}")
        print(f"  {table}: Cleared {count} rows")
    except Exception as e:
        print(f"  {table}: Error - {e}")

conn.commit()

# Reset auto-increment for sessions
cur.execute("DELETE FROM sqlite_sequence WHERE name IN ('sessions', 'card_drafts', 'topics', 'tutor_turns')")
conn.commit()

print("\n=== PRESERVED (NOT CLEARED) ===")
preserved = ["wheel_courses", "courses", "course_events", "calendar_action_ledger", "study_tasks", "scraped_events"]
for table in preserved:
    try:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        count = cur.fetchone()[0]
        print(f"  {table}: {count} rows kept")
    except Exception as e:
        print(f"  {table}: Error - {e}")

conn.close()
print("\n✓ Old semester data cleared. Fresh start!")

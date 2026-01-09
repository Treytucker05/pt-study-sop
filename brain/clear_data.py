#!/usr/bin/env python3
"""
Clear all data from PT Study Brain database while preserving schema.
Use this when starting a new semester/term.
"""

import sqlite3
import os
from db_setup import DB_PATH

def clear_all_data():
    """
    Delete all rows from all tables, but keep the schema intact.
    """
    if not os.path.exists(DB_PATH):
        print(f"[INFO] Database not found at {DB_PATH}. Nothing to clear.")
        return True
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get row counts before deletion
    tables_to_clear = [
        'sessions',
        'courses',
        'course_events',
        'topics',
        'study_tasks',
        'rag_docs'
    ]
    
    print("\n" + "="*60)
    print("PT Study Brain - Data Clear Utility")
    print("="*60)
    print("\nThis will DELETE ALL DATA from the following tables:")
    print("  - Sessions (study session logs)")
    print("  - Courses")
    print("  - Course Events (lectures, exams, assignments)")
    print("  - Topics")
    print("  - Study Tasks")
    print("  - RAG Docs (notes, textbooks, transcripts)")
    print("\nThe database SCHEMA will be preserved (tables stay, just emptied).")
    print("\nCurrent row counts:")
    
    total_rows = 0
    for table in tables_to_clear:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            total_rows += count
            print(f"  - {table}: {count} rows")
        except sqlite3.OperationalError:
            print(f"  - {table}: (table doesn't exist yet)")
    
    print(f"\nTotal rows to delete: {total_rows}")
    
    if total_rows == 0:
        print("\n[INFO] Database is already empty. Nothing to clear.")
        conn.close()
        return True
    
    # Confirmation
    print("\n" + "="*60)
    response = input("Are you SURE you want to delete all this data? (type 'yes' to confirm): ")
    
    if response.lower() != 'yes':
        print("\n[CANCELLED] Data clear cancelled. No changes made.")
        conn.close()
        return False
    
    # Delete all rows
    print("\n[INFO] Clearing data...")
    deleted_total = 0
    
    for table in tables_to_clear:
        try:
            cursor.execute(f"DELETE FROM {table}")
            deleted = cursor.rowcount
            deleted_total += deleted
            if deleted > 0:
                print(f"  [OK] Deleted {deleted} rows from {table}")
        except sqlite3.OperationalError as e:
            # Table doesn't exist - that's fine
            print(f"  [SKIP] Table {table} doesn't exist (skipped)")
    
    # Reset auto-increment counters
    for table in tables_to_clear:
        try:
            cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='{table}'")
        except:
            pass
    
    conn.commit()
    conn.close()
    
    print(f"\n[OK] Successfully cleared {deleted_total} total rows.")
    print("[OK] Database schema preserved. Ready for new semester!")
    print("\nNext steps:")
    print("  1. Use the dashboard Syllabus Intake form to add your new courses")
    print("  2. Start logging new study sessions")
    print("  3. Import your new textbooks/notes using the RAG tools")
    
    return True

if __name__ == '__main__':
    success = clear_all_data()
    exit(0 if success else 1)

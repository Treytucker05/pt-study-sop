import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'data', 'pt_study.db')
print(f"DB path: {db_path}")
print(f"Exists: {os.path.exists(db_path)}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check existing tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print('Tables:', [t[0] for t in tables])

# Check if courses table exists
cursor.execute("PRAGMA table_info(courses)")
columns = cursor.fetchall()
if columns:
    print('Courses columns:', [c[1] for c in columns])
else:
    print('No courses table exists')

# Check sessions table
cursor.execute("PRAGMA table_info(sessions)")
columns = cursor.fetchall()
if columns:
    print('Sessions columns:', [c[1] for c in columns])

conn.close()

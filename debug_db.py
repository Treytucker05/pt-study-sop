import sqlite3
import os

db_path = r'c:\Users\treyt\OneDrive\Desktop\pt-study-sop\brain\data\pt_study.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()

print("Checking scraped_events table...")
cur.execute("SELECT status, count(*) FROM scraped_events GROUP BY status")
rows = cur.fetchall()
for row in rows:
    print(f"Status: {row[0]}, Count: {row[1]}")

if not rows:
    print("No items found in scraped_events table.")

print("\nChecking course_events table...")
cur.execute("SELECT status, count(*) FROM course_events GROUP BY status")
ce_rows = cur.fetchall()
for row in ce_rows:
    print(f"Status: {row[0]}, Count: {row[1]}")

# Check for courses too
cur.execute("SELECT id, name, last_scraped_at FROM courses")
courses = cur.fetchall()
print("\nCourses in DB:")
for c in courses:
    print(f"ID: {c[0]}, Name: {c[1]}, Last Scraped: {c[2]}")

conn.close()

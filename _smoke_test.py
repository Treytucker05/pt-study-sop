#!/usr/bin/env python
"""Quick smoke test for dashboard endpoints"""
import requests
import sys

BASE = "http://127.0.0.1:5000"

def test_endpoint(name, url, method="GET", data=None):
    try:
        if method == "GET":
            r = requests.get(url, timeout=10)
        else:
            r = requests.post(url, json=data, timeout=10)
        if r.ok:
            return True, r.status_code, r.json() if 'json' in r.headers.get('content-type', '') else r.text[:100]
        else:
            return False, r.status_code, r.text[:100]
    except Exception as e:
        return False, 0, str(e)

print("=" * 60)
print("PT Study Brain Dashboard Smoke Test")
print("=" * 60)

tests = [
    ("Root", f"{BASE}/"),
    ("Courses API", f"{BASE}/api/courses"),
    ("Stats API", f"{BASE}/api/stats"),
    ("Calendar API", f"{BASE}/api/calendar"),
    ("GCal Status", f"{BASE}/api/gcal/status"),
]

passed = 0
failed = 0
results = []

for name, url in tests:
    ok, code, data = test_endpoint(name, url)
    status = "PASS" if ok else "FAIL"
    if ok:
        passed += 1
    else:
        failed += 1
    
    # Extract useful info
    if ok:
        if isinstance(data, dict):
            info = str(data)[:60]
        elif isinstance(data, list):
            info = f"{len(data)} items"
        else:
            info = str(data)[:60]
    else:
        info = str(data)[:60]
    
    results.append((name, status, code, info))
    print(f"{status:4} | {name:20} | {code:3} | {info}")

print("=" * 60)
print(f"Results: {passed} passed, {failed} failed")

# Check for database content
import sqlite3
conn = sqlite3.connect('brain/data/pt_study.db')
c = conn.cursor()
c.execute("SELECT COUNT(*) FROM courses")
course_count = c.fetchone()[0]
c.execute("PRAGMA table_info(course_events)")
cols = [row[1] for row in c.fetchall()]
has_gcal_cols = 'google_event_id' in cols and 'google_synced_at' in cols
conn.close()

print(f"\nDatabase Check:")
print(f"  Courses: {course_count}")
print(f"  GCal columns: {'YES' if has_gcal_cols else 'NO'}")
print(f"  Columns: {', '.join(cols)}")

sys.exit(0 if failed == 0 else 1)

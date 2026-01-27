# Dashboard Ingestion Integration: Time Fields & Google Tasks Sync

## Context

### Original Request
User wants to import syllabus JSON from ChatGPT into the dashboard and have:
1. All events appear in Dashboard local calendar with correct start/end times
2. Assignments auto-sync to Google Tasks immediately (bidirectional delete)
3. Dashboard assignment page shows assignments with correct times

### Interview Summary
**Key Discussions**:
- **Workflow**: Copy prompt from dashboard → ChatGPT with syllabus → Get JSON → Import into dashboard
- **Specific Issue**: Start and finish times weren't linking before
- **Clarification**: "Local calendar" = Dashboard calendar view (NOT Google Calendar sync)
- **Bidirectional delete**: Delete from dashboard must delete from database AND Google Tasks

**Research Findings**:
- Time fields ARE stored correctly in `course_events` table during bulk import
- Time fields are LOST when `/api/tasks` endpoint returns data (only returns 4 fields: `id`, `title`, `status`, `createdAt`)
- No automatic Google Tasks sync happens on syllabus import
- No bidirectional delete exists between dashboard and Google Tasks
- `POST /api/tasks` is currently MOCKED - not implemented

### Metis Review
**Identified Gaps** (addressed):
- **Google Task ID storage**: Must store `google_event_id` with `task_` prefix for reverse lookup during delete
- **API failure handling**: Local operations should succeed even if Google API fails (log warning)
- **Duplicate imports**: User may import same syllabus twice - create new tasks (dedupe is manual)
- **Assignments without time**: Create task with due date only (Google handles all-day tasks)
- **Default Tasks list**: Use configured default list via `resolve_task_lists()` (default "Reclaim" or user setting)

---

## Work Objectives

### Core Objective
Fix the syllabus import flow so that time fields propagate correctly through all APIs, and assignments bidirectionally sync with Google Tasks.

### Concrete Deliverables
1. `/api/tasks` endpoint returns `time`, `endTime`, `dueDate`, and `courseId` fields
2. Syllabus bulk import (`POST /api/syllabus/import-bulk`) auto-creates Google Tasks for assignments/quizzes/exams
3. Delete endpoint (`DELETE /api/schedule-events/<id>`) cascades to Google Tasks AND removes from `academic_deadlines`
4. Pytest tests covering new functionality

### Definition of Done
- [ ] Import test syllabus JSON with 3 assignments → all 3 appear in Google Tasks with correct due dates
- [ ] Delete assignment from dashboard → disappears from both database tables AND Google Tasks
- [ ] `/api/tasks` response includes `time`, `endTime`, `dueDate` for each task
- [ ] All pytest tests pass: `pytest brain/tests/test_schedule_sync.py -v`

### Must Have
- Time fields returned in `/api/tasks` endpoint (JSON keys: `time`, `endTime`, `dueDate`, `courseId`)
- Google Tasks created on syllabus bulk import for assignment/quiz/exam types
- Bidirectional delete (dashboard → `course_events` + `academic_deadlines` → Google Tasks)
- Graceful degradation if Google API fails (local still works)

### Must NOT Have (Guardrails)
- NO Google Calendar sync (out of scope - use Dashboard calendar only)
- NO modifications to `academic_deadlines` table schema
- NO PATCH/UPDATE sync to Google Tasks (only create/delete)
- NO changes to `sync_bidirectional()` calendar logic
- NO new OAuth scopes or auth flow changes
- NO changes to `google_event_id` prefix convention (`task_` prefix must be preserved)
- NO cascade delete when course is deleted (single-event delete only)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (pytest in `brain/tests/`)
- **User wants tests**: YES (confirmed)
- **Framework**: pytest

### Test Structure
Tests will be created in `brain/tests/test_schedule_sync.py` covering:
1. API response field validation
2. Google Tasks creation (mocked)
3. Delete cascade (mocked)
4. Error handling when Google API fails

### Test Database Isolation
Follow the Flask test client pattern from `brain/tests/test_session_filters.py:17-24`:
```python
@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client
```
Tests will use the existing `get_connection()` pattern which points to `brain/data/pt_study.db`. 

**SAFETY GUARDRAILS (CRITICAL for real DB testing):**
- **Unique naming**: ALL test data MUST use `TEST_SYNC_` prefix to prevent collision with real data
- **Guaranteed teardown**: Use `yield` fixture with unconditional cleanup in `finally` block
- **Teardown verification**: After teardown, assert `SELECT COUNT(*) FROM courses WHERE name LIKE 'TEST_SYNC_%'` returns 0
- **Failure handling**: If teardown fails, print explicit warning with cleanup SQL for manual recovery
- **Mock all external calls**: Never make real Google API calls (use `@patch` decorators)

---

## Task Flow

```
Task 1 (API fields) → Task 2 (Create sync) → Task 3 (Delete sync) → Task 4 (Tests) → Task 5 (E2E verify)
```

## Parallelization

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | None | Independent API change |
| 2 | None | Independent (can parallel with 1) |
| 3 | 2 | Needs google_event_id stored from Task 2 |
| 4 | 1, 2, 3 | Tests the implementations |
| 5 | 4 | Final verification after tests pass |

---

## TODOs

- [ ] 1. Add time fields to `/api/tasks` endpoint response

  **What to do**:
  - Modify the `GET /api/tasks` endpoint to include `time`, `endTime`, `dueDate`, and `courseId` in the response
  - Update the SQL query to select additional columns: `time`, `end_time`, `due_date`, `course_id`
  - Map database column names to JSON response keys:
    - `time` (DB) → `time` (JSON) - HH:MM format or null
    - `end_time` (DB) → `endTime` (JSON) - HH:MM format or null
    - `due_date` (DB) → `dueDate` (JSON) - YYYY-MM-DD format or null
    - `course_id` (DB) → `courseId` (JSON) - integer

  **Must NOT do**:
  - Do NOT modify `academic_deadlines` table
  - Do NOT change the existing response structure, only ADD new fields
  - Do NOT change the hardcoded `"status": "pending"` behavior (current implementation at line 1566 always returns "pending" regardless of DB value)
  - Do NOT touch POST endpoint (it's mocked and out of scope)

  **Parallelizable**: YES (with Task 2)

  **References**:
  - `brain/dashboard/api_adapter.py:1536-1576` - Current `GET /api/tasks` endpoint implementation
    - Line 1550-1556: Current SQL query selecting only `id, title, status, created_at`
    - Line 1562-1568: Current response mapping (only 4 fields)
  - `brain/db_setup.py:265-289` - `course_events` table schema confirming `time`, `end_time`, `course_id`, `due_date` columns exist

  **Exact Changes Required**:
  1. Update SQL at line 1550-1556 to:
     ```sql
     SELECT id, title, status, created_at, time, end_time, due_date, course_id, date
     FROM course_events
     WHERE type IN ('assignment', 'exam', 'quiz') 
       AND status != 'completed'
     ORDER BY created_at DESC
     ```
  2. Update response mapping at line 1562-1568 to add:
     ```python
     "time": r[4],  # HH:MM or None
     "endTime": r[5],  # HH:MM or None
     "dueDate": r[6] or r[8],  # COALESCE(due_date, date) - YYYY-MM-DD or None
     "courseId": r[7],  # integer
     ```
   
  **dueDate MAPPING RULE**: Return `due_date` if present, otherwise fall back to `date`. This aligns with how `academic_deadlines.due_date` is populated (see `import_syllabus_bulk()` line 1156: `deadline_date = due_date or date_val`).

  **UI INTEGRATION NOTES**:
  - **Consumer**: `dashboard_rebuild/client/src/pages/calendar.tsx:434` calls `api.tasks.getAll()` 
  - **API binding**: `dashboard_rebuild/client/src/lib/api.ts:199-200` - returns `Task[]` type
  - **TypeScript type**: `dashboard_rebuild/schema.ts:211-224` defines `Task` type with ONLY `id`, `title`, `status`, `createdAt`
  - **Type handling**: The new fields (`time`, `endTime`, `dueDate`, `courseId`) will be present in API response but NOT typed in the frontend `Task` type. **This is acceptable** - TypeScript will silently ignore extra fields, and frontend doesn't currently display time fields. If future UI work needs these fields, update the `Task` type then.
  - **NO FRONTEND CHANGES REQUIRED**: This task only modifies the backend response. The frontend will receive extra fields but continue working unchanged.

  **Acceptance Criteria**:
  - [ ] `GET /api/tasks` response includes `time` field (HH:MM format or null)
  - [ ] `GET /api/tasks` response includes `endTime` field (HH:MM format or null)
  - [ ] `GET /api/tasks` response includes `dueDate` field (YYYY-MM-DD or null)
  - [ ] `GET /api/tasks` response includes `courseId` field (integer)
  - [ ] Existing fields (`id`, `title`, `status`, `createdAt`) still present
  - [ ] Manual verify: `curl http://localhost:5000/api/tasks | python -m json.tool`

  **Commit**: YES
  - Message: `feat(api): add time fields to /api/tasks endpoint response`
  - Files: `brain/dashboard/api_adapter.py`
  - Pre-commit: `pytest brain/tests/ -q`

---

- [ ] 2. Auto-create Google Tasks on syllabus bulk import

  **What to do**:
  - Modify the `POST /api/syllabus/import-bulk` endpoint (NOT `/schedule-events/bulk`)
  - After inserting assignment/quiz/exam into `course_events` (around line 1155), add:
    1. Get the default Google Tasks list ID using `resolve_task_lists()`
    2. Build task body: `{"title": title, "due": due_date_rfc3339, "notes": notes}`
    3. Call `create_google_task(tasklist_id, body)` from `gcal.py`
    4. If successful, update `course_events.google_event_id` with `task_{returned_task_id}`
    5. Wrap in try/except: on failure, log warning but don't fail the import

  **Must NOT do**:
  - Do NOT sync to Google Calendar (only Google Tasks)
  - Do NOT create tasks for lecture/reading/topic types (only assignment/quiz/exam)
  - Do NOT change the `google_event_id` prefix convention (must use `task_` prefix)
  - Do NOT fail the import if Google API is unavailable

  **Parallelizable**: YES (with Task 1)

  **References**:
  - `brain/dashboard/api_adapter.py:1042-1173` - `POST /api/syllabus/import-bulk` endpoint (THE CORRECT ENDPOINT)
    - Line 1114-1152: Loop where events are inserted into `course_events`
    - Line 1155-1164: Where assignment/quiz/exam types are detected and routed to `academic_deadlines`
    - Line 1152: After `cur.execute()` INSERT, need to get `lastrowid` for updating with google_event_id
  - `brain/dashboard/gcal.py:1022-1048` - `resolve_task_lists()` function to get default task list ID
    - Reads `tasks_list_id` or `tasks_list_name` from config (default "Reclaim")
    - Returns list of matching tasklist dicts with `id` field
  - `brain/dashboard/gcal.py:1220-1230` - `create_google_task(tasklist_id, body)` function
    - Body format: `{"title": "...", "due": "YYYY-MM-DDT00:00:00Z", "notes": "..."}`
    - Returns `(result, error)` tuple; result has `id` field on success
  - `brain/dashboard/gcal.py:1003-1020` - `fetch_task_lists()` to get all lists before resolving

  **Exact Changes Required**:
  
  **STEP 1: Add MODULE-LEVEL imports at TOP of `api_adapter.py`** (not inside the function):
  ```python
  # Add near other imports at top of api_adapter.py (around line 15-30)
  from dashboard.gcal import fetch_task_lists, resolve_task_lists, create_google_task, delete_google_task, load_gcal_config
  ```
  NOTE: Use `load_gcal_config()` (NOT `get_config()` which doesn't exist). See `brain/dashboard/gcal.py:54-88`.
  
  **WHY MODULE-LEVEL**: This enables proper test mocking via `@patch('dashboard.api_adapter.create_google_task')`.
  
  **STEP 2: Inside `import_syllabus_bulk()`, before the events loop**, add tasklist resolution:
  ```python
  # Add after line 1059 (before the modules loop)
  tasklist_id = None
  try:
      task_lists, fetch_err = fetch_task_lists()
      if fetch_err:
          print(f"[WARN] fetch_task_lists error: {fetch_err}")
      elif task_lists:
          gcal_config = load_gcal_config()  # Returns dict with tasks_list_id/tasks_list_name at TOP LEVEL
          resolved, resolve_err = resolve_task_lists(task_lists, gcal_config)  # Pass directly, NOT nested
          if resolve_err:
              print(f"[WARN] resolve_task_lists error: {resolve_err}")
          elif resolved:
              tasklist_id = resolved[0].get("id")
  except Exception as e:
      print(f"[WARN] Could not resolve Google Tasks list: {e}")
  ```
  
  **STEP 3: After line 1152 (`cur.execute()` INSERT)**, add Google Task creation:
  ```python
  event_id = cur.lastrowid
  # Use deadline_date to match how academic_deadlines is populated (line 1156)
  deadline_date = due_date or date_val
  
  if event_type in {"assignment", "quiz", "exam"} and tasklist_id:
      try:
          # Use deadline_date for Google Task due date (same as academic_deadlines)
          due_rfc3339 = f"{deadline_date}T00:00:00Z" if deadline_date else None
          task_body = {"title": title}
          if due_rfc3339:
              task_body["due"] = due_rfc3339
          if raw_text:
              task_body["notes"] = raw_text
          result, create_err = create_google_task(tasklist_id, task_body)
          if create_err:
              # Handle error return (not exception) - e.g., "Not authenticated"
              print(f"[WARN] Google Task creation failed for '{title}': {create_err}")
          elif result and result.get("id"):
              google_event_id = f"task_{result['id']}"
              cur.execute("UPDATE course_events SET google_event_id = ? WHERE id = ?", 
                          (google_event_id, event_id))
      except Exception as e:
          print(f"[WARN] Google Task creation exception for '{title}': {e}")
  ```
     
  **IMPORTANT NOTES**:
  - **Due date mapping rule**: Use `deadline_date = due_date or date_val` consistently (matches existing logic at line 1156 for `academic_deadlines`).
  - **Error handling**: Check BOTH the `err` return value AND catch exceptions. Functions like `create_google_task()` return `(result, error_string)` and may return errors like "Not authenticated" without raising exceptions (see `brain/dashboard/gcal.py:1220-1230`).
  - **Google Tasks timezone behavior**: Due dates are sent as `YYYY-MM-DDT00:00:00Z` (UTC midnight). Google Tasks interprets this as an all-day task on the specified date. **Potential off-by-one-day risk**: If user is in a timezone like PST (UTC-8), a task due "2026-02-01T00:00:00Z" appears as "Jan 31" locally. This is **existing Google Tasks API behavior** - NOT something we're changing. The dashboard stores dates as YYYY-MM-DD strings and this plan maintains that convention.

  **Acceptance Criteria**:
  - [ ] Syllabus bulk import with 3 assignments creates 3 Google Tasks (verify in Google Tasks app)
  - [ ] Each created task has correct title matching assignment title
  - [ ] Each created task has correct due date matching assignment due_date
  - [ ] `course_events.google_event_id` contains `task_{google_task_id}` for synced records
  - [ ] If Google API fails, import still succeeds (warning logged to console)
  - [ ] Manual verify: Import test syllabus via dashboard UI → check Google Tasks list

  **Commit**: YES
  - Message: `feat(sync): auto-create Google Tasks on syllabus bulk import`
  - Files: `brain/dashboard/api_adapter.py`
  - Pre-commit: `pytest brain/tests/ -q`

---

- [ ] 3. Implement cascade delete: Dashboard → Google Tasks + academic_deadlines
  
  **DIRECTION CLARIFICATION**: This is ONE-WAY cascade. Dashboard delete triggers Google Tasks delete. We are NOT implementing Google→Dashboard sync (deleting in Google does NOT delete from dashboard).

  **What to do**:
  - Modify `DELETE /api/schedule-events/<id>` to:
    1. Before deleting, SELECT the event to get `google_event_id`, `title`, `type`, `due_date` and course name
    2. If `google_event_id` starts with `task_`, extract task_id and call `delete_google_task()`
    3. Delete from `academic_deadlines` by matching course + title + type + due_date
    4. Delete from `course_events`
    5. Handle API failures gracefully: log warning but still delete locally
  - Also modify bulk delete endpoint similarly

  **Must NOT do**:
  - Do NOT delete Google Calendar events (only Google Tasks)
  - Do NOT fail local delete if Google delete fails
  - Do NOT implement cascade delete for entire courses

  **Parallelizable**: NO (depends on Task 2 for google_event_id storage)

  **References**:
  - `brain/dashboard/api_adapter.py:1496-1507` - Single delete endpoint to modify
  - `brain/dashboard/api_adapter.py:1509-1528` - Bulk delete endpoint to modify
  - `brain/dashboard/gcal.py:1250-1260` - `delete_google_task(tasklist_id, task_id)` function
  - `brain/dashboard/api_adapter.py:996-1039` - `_insert_academic_deadline()` showing the table structure
    - `academic_deadlines` has NO foreign key to `course_events`
    - Must match by: `course` (name string), `title`, `type`, `due_date`

  **Exact Changes Required**:
  1. Update `delete_schedule_event()` at line 1496-1507:
     ```python
     @adapter_bp.route("/schedule-events/<int:event_id>", methods=["DELETE"])
     def delete_schedule_event(event_id):
         try:
             conn = get_connection()
             cur = conn.cursor()
             
             # Get event details before deleting
             # Use COALESCE(due_date, date) to match how academic_deadlines was populated
             cur.execute("""
                 SELECT ce.google_event_id, ce.title, ce.type, 
                        COALESCE(ce.due_date, ce.date) as deadline_date, c.name 
                 FROM course_events ce
                 LEFT JOIN courses c ON ce.course_id = c.id
                 WHERE ce.id = ?
             """, (event_id,))
             row = cur.fetchone()
             
             if row:
                 google_event_id, title, event_type, deadline_date, course_name = row
                 
                # Delete from Google Tasks if linked
                  # NOTE: Uses module-level imports added in Task 2 (no inner imports)
                  if google_event_id and google_event_id.startswith("task_"):
                      try:
                          task_id = google_event_id[5:]  # Remove "task_" prefix
                          task_lists, fetch_err = fetch_task_lists()
                          if fetch_err:
                              print(f"[WARN] Google Task fetch_task_lists error: {fetch_err}")
                          elif task_lists:
                              gcal_config = load_gcal_config()
                              resolved, resolve_err = resolve_task_lists(task_lists, gcal_config)
                              if resolve_err:
                                  print(f"[WARN] Google Task resolve_task_lists error: {resolve_err}")
                              elif resolved:
                                  tasklist_id = resolved[0].get("id")
                                  success, delete_err = delete_google_task(tasklist_id, task_id)
                                  if delete_err:
                                      # Handle error return (e.g., "Not authenticated") - not exception
                                      print(f"[WARN] Google Task deletion error: {delete_err}")
                      except Exception as e:
                          print(f"[WARN] Google Task deletion exception: {e}")
                 
                 # Delete from academic_deadlines ONLY if no other course_events match
                 # (handles duplicate imports where multiple course_events share one academic_deadlines row)
                 if event_type in ("assignment", "quiz", "exam") and course_name and deadline_date:
                     # Check if other course_events exist with same matching criteria
                     cur.execute("""
                         SELECT COUNT(*) FROM course_events 
                         WHERE id != ? AND type = ? AND title = ? 
                         AND COALESCE(due_date, date) = ?
                         AND course_id = (SELECT course_id FROM course_events WHERE id = ?)
                     """, (event_id, event_type, title, deadline_date, event_id))
                     other_count = cur.fetchone()[0]
                     
                     if other_count == 0:
                         # Safe to delete - no other course_events share this academic_deadline
                         cur.execute("""
                             DELETE FROM academic_deadlines 
                             WHERE course = ? AND title = ? AND type = ? AND due_date = ?
                         """, (course_name, title, event_type, deadline_date))
             
             # Delete from course_events
             cur.execute("DELETE FROM course_events WHERE id = ?", (event_id,))
             conn.commit()
             conn.close()
             return jsonify({"success": True})
         except Exception as e:
             return jsonify({"error": str(e)}), 500
     ```
  2. **Update `bulk_delete_schedule_events()` at line 1509-1528** with explicit algorithm:
     ```python
     @adapter_bp.route("/schedule-events/bulk-delete", methods=["POST", "OPTIONS"])
     def bulk_delete_schedule_events():
         data = request.get_json() or {}
         ids = data.get("ids", [])
         if not isinstance(ids, list) or not ids:
             return jsonify({"error": "ids array required"}), 400
     
         try:
             cleaned = [int(i) for i in ids if isinstance(i, int) or str(i).isdigit()]
             if not cleaned:
                 return jsonify({"error": "no valid ids provided"}), 400
     
             conn = get_connection()
             cur = conn.cursor()
             google_delete_warnings = []
             
             # Prefetch all event details for the batch
             placeholders = ",".join(["?" for _ in cleaned])
             cur.execute(f"""
                 SELECT ce.id, ce.google_event_id, ce.title, ce.type, 
                        COALESCE(ce.due_date, ce.date) as deadline_date, c.name 
                 FROM course_events ce
                 LEFT JOIN courses c ON ce.course_id = c.id
                 WHERE ce.id IN ({placeholders})
             """, cleaned)
             events_to_delete = cur.fetchall()
             
             # Resolve tasklist once for all deletes
             tasklist_id = None
             try:
                 task_lists, fetch_err = fetch_task_lists()
                 if not fetch_err and task_lists:
                     gcal_config = load_gcal_config()
                     resolved, _ = resolve_task_lists(task_lists, gcal_config)
                     if resolved:
                         tasklist_id = resolved[0].get("id")
             except Exception:
                 pass
             
             # Process each event
             for row in events_to_delete:
                 event_id, google_event_id, title, event_type, deadline_date, course_name = row
                 
                 # Attempt Google Task delete
                 if google_event_id and google_event_id.startswith("task_") and tasklist_id:
                     try:
                         task_id = google_event_id[5:]
                         success, err = delete_google_task(tasklist_id, task_id)
                         if err:
                             google_delete_warnings.append(f"{title}: {err}")
                     except Exception as e:
                         google_delete_warnings.append(f"{title}: {e}")
                 
                 # Check if safe to delete academic_deadline (no other course_events match)
                 if event_type in ("assignment", "quiz", "exam") and course_name and deadline_date:
                     cur.execute("""
                         SELECT COUNT(*) FROM course_events 
                         WHERE id NOT IN ({}) AND type = ? AND title = ? 
                         AND COALESCE(due_date, date) = ?
                         AND course_id = (SELECT course_id FROM course_events WHERE id = ?)
                     """.format(placeholders), cleaned + [event_type, title, deadline_date, event_id])
                     other_count = cur.fetchone()[0]
                     if other_count == 0:
                         cur.execute("""
                             DELETE FROM academic_deadlines 
                             WHERE course = ? AND title = ? AND type = ? AND due_date = ?
                         """, (course_name, title, event_type, deadline_date))
             
             # Delete all course_events
             cur.executemany("DELETE FROM course_events WHERE id = ?", [(i,) for i in cleaned])
             conn.commit()
             conn.close()
             
             result = {"deleted": len(cleaned)}
             if google_delete_warnings:
                 result["warnings"] = google_delete_warnings
             return jsonify(result)
         except Exception as e:
             return jsonify({"error": str(e)}), 500
     ```
  
  **IMPORTANT: Duplicate handling rule**: `academic_deadlines` dedupes by `(title, course, type, due_date)` at insert time (see `_insert_academic_deadline()` line 1023-1031). This means multiple `course_events` may share a single `academic_deadlines` row. Delete from `academic_deadlines` ONLY when no other `course_events` match the same criteria.

  **Acceptance Criteria**:
  - [ ] Delete assignment from dashboard → Google Task disappears (verify in Google Tasks app)
  - [ ] Delete assignment that has no google_event_id → succeeds without error
  - [ ] Delete assignment when Google API fails → local delete succeeds with warning logged
  - [ ] `course_events` row is removed from database
  - [ ] `academic_deadlines` corresponding row is also removed
  - [ ] Manual verify: Delete test assignment → check Google Tasks list + both database tables

  **Commit**: YES
  - Message: `feat(sync): bidirectional delete from dashboard to Google Tasks`
  - Files: `brain/dashboard/api_adapter.py`
  - Pre-commit: `pytest brain/tests/ -q`

---

- [ ] 4. Write pytest tests for new functionality

  **What to do**:
  - Create `brain/tests/test_schedule_sync.py` with tests for:
    1. `/api/tasks` endpoint returns expanded fields
    2. Bulk import creates Google Tasks (mock `create_google_task`)
    3. Delete cascades to Google Tasks (mock `delete_google_task`)
    4. Error handling when Google API fails
  - Use pytest fixtures for Flask test client and Google API mocking

  **Must NOT do**:
  - Do NOT make actual Google API calls in tests (use mocks)
  - Do NOT modify existing test files

  **Parallelizable**: NO (depends on Tasks 1, 2, 3)

  **References**:
  - `brain/tests/test_session_filters.py:17-24` - Flask test client fixture pattern to follow
    ```python
    @pytest.fixture
    def client():
        app = create_app()
        app.config['TESTING'] = True
        with app.test_client() as client:
            yield client
    ```
  - `brain/tests/test_wrap_parser.py` - Example of unit test patterns
  - Use `unittest.mock.patch` for mocking Google API functions
  - Use `@pytest.fixture` for test data setup/teardown

  **Exact Test Structure**:
  ```python
  # brain/tests/test_schedule_sync.py
  import sys
  from pathlib import Path
  import pytest
  from unittest.mock import patch, MagicMock
  
  # Path setup (follows existing pattern from test_session_filters.py)
  ROOT = Path(__file__).resolve().parents[1]
  if str(ROOT) not in sys.path:
      sys.path.append(str(ROOT))
  brain_dir = ROOT / "brain"
  if str(brain_dir) not in sys.path:
      sys.path.append(str(brain_dir))
  
  from dashboard.app import create_app
  from db_setup import get_connection
  
  @pytest.fixture
  def client():
      app = create_app()
      app.config['TESTING'] = True
      with app.test_client() as client:
          yield client
  
  @pytest.fixture
  def test_course():
      """Create a test course and clean up after."""
      conn = get_connection()
      cur = conn.cursor()
      # NOTE: courses table has NO updated_at column (see db_setup.py:249-259)
      cur.execute("INSERT INTO courses (name, code, term, created_at) VALUES (?, ?, ?, datetime('now'))",
                  ("TEST_SYNC_Course", "TEST101", "Spring 2026"))
      course_id = cur.lastrowid
      conn.commit()
      conn.close()
      yield course_id
      # Teardown - GUARANTEED cleanup with verification
      try:
          conn = get_connection()
          cur = conn.cursor()
          cur.execute("DELETE FROM course_events WHERE course_id = ?", (course_id,))
          cur.execute("DELETE FROM academic_deadlines WHERE course = ?", ("TEST_SYNC_Course",))
          cur.execute("DELETE FROM courses WHERE id = ?", (course_id,))
          conn.commit()
          
          # Verify cleanup succeeded
          cur.execute("SELECT COUNT(*) FROM courses WHERE name LIKE 'TEST_SYNC_%'")
          remaining = cur.fetchone()[0]
          conn.close()
          assert remaining == 0, f"TEARDOWN FAILED: {remaining} TEST_SYNC_* courses remain"
      except Exception as e:
          print(f"[TEARDOWN ERROR] Manual cleanup required: DELETE FROM courses WHERE name LIKE 'TEST_SYNC_%'; {e}")
  
  def test_api_tasks_returns_time_fields(client):
      """Test GET /api/tasks returns time, endTime, dueDate, courseId fields."""
      response = client.get('/api/tasks')
      assert response.status_code == 200
      data = response.get_json()
      # If there are tasks, verify fields exist
      if data:
          for task in data:
              assert 'time' in task  # may be null
              assert 'endTime' in task  # may be null
              assert 'dueDate' in task  # may be null
              assert 'courseId' in task
  
  # PATCH TARGETS: Since functions are imported INTO api_adapter.py, patch WHERE THEY'RE USED
  # The import statement is: from dashboard.gcal import create_google_task, ...
  # So patch at: dashboard.api_adapter.create_google_task (the lookup site)
  
  @patch('dashboard.api_adapter.create_google_task')
  @patch('dashboard.api_adapter.resolve_task_lists')
  @patch('dashboard.api_adapter.fetch_task_lists')
  @patch('dashboard.api_adapter.load_gcal_config')
  def test_bulk_import_creates_google_tasks(mock_config, mock_fetch, mock_resolve, mock_create, client, test_course):
      """Test POST /api/syllabus/import-bulk creates Google Tasks for assignments."""
      mock_config.return_value = {"tasks_list_name": "Reclaim"}
      mock_fetch.return_value = ([{"id": "list123", "title": "Reclaim"}], None)
      mock_resolve.return_value = ([{"id": "list123", "title": "Reclaim"}], None)
      mock_create.return_value = ({"id": "gtask123"}, None)
      
      payload = {
          "courseId": test_course,
          "modules": [],
          "events": [{"type": "assignment", "title": "TEST_SYNC_Assignment", "dueDate": "2026-03-01"}]
      }
      response = client.post('/api/syllabus/import-bulk', json=payload)
      assert response.status_code == 200
      mock_create.assert_called_once()
  
  @patch('dashboard.api_adapter.delete_google_task')
  @patch('dashboard.api_adapter.resolve_task_lists')
  @patch('dashboard.api_adapter.fetch_task_lists')
  @patch('dashboard.api_adapter.load_gcal_config')
  def test_delete_cascades_to_google_tasks(mock_config, mock_fetch, mock_resolve, mock_delete, client, test_course):
      """Test DELETE /api/schedule-events/<id> deletes Google Task."""
      mock_config.return_value = {"tasks_list_name": "Reclaim"}
      mock_fetch.return_value = ([{"id": "list123", "title": "Reclaim"}], None)
      mock_resolve.return_value = ([{"id": "list123", "title": "Reclaim"}], None)
      mock_delete.return_value = (True, None)
      
      # Insert a test event with google_event_id
      conn = get_connection()
      cur = conn.cursor()
      cur.execute("""INSERT INTO course_events (course_id, type, title, due_date, google_event_id, status, created_at, updated_at)
                     VALUES (?, 'assignment', 'TEST_SYNC_ToDelete', '2026-03-01', 'task_gtask456', 'pending', datetime('now'), datetime('now'))""",
                  (test_course,))
      event_id = cur.lastrowid
      conn.commit()
      conn.close()
      
      response = client.delete(f'/api/schedule-events/{event_id}')
      assert response.status_code == 200
      mock_delete.assert_called_once()
      
      # Verify course_event was deleted
      conn = get_connection()
      cur = conn.cursor()
      cur.execute("SELECT COUNT(*) FROM course_events WHERE id = ?", (event_id,))
      assert cur.fetchone()[0] == 0, "course_event should be deleted"
      conn.close()
  
  @patch('dashboard.api_adapter.delete_google_task')
  @patch('dashboard.api_adapter.resolve_task_lists')
  @patch('dashboard.api_adapter.fetch_task_lists')
  @patch('dashboard.api_adapter.load_gcal_config')
  def test_delete_also_removes_academic_deadline(mock_config, mock_fetch, mock_resolve, mock_delete, client, test_course):
      """Test DELETE /api/schedule-events/<id> also removes matching academic_deadline."""
      mock_config.return_value = {"tasks_list_name": "Reclaim"}
      mock_fetch.return_value = ([{"id": "list123", "title": "Reclaim"}], None)
      mock_resolve.return_value = ([{"id": "list123", "title": "Reclaim"}], None)
      mock_delete.return_value = (True, None)
      
      # Insert a test event AND matching academic_deadline
      conn = get_connection()
      cur = conn.cursor()
      cur.execute("""INSERT INTO course_events (course_id, type, title, due_date, google_event_id, status, created_at, updated_at)
                     VALUES (?, 'assignment', 'TEST_SYNC_WithDeadline', '2026-03-15', 'task_gtask789', 'pending', datetime('now'), datetime('now'))""",
                  (test_course,))
      event_id = cur.lastrowid
      cur.execute("""INSERT INTO academic_deadlines (course, title, type, due_date, created_at)
                     VALUES ('TEST_SYNC_Course', 'TEST_SYNC_WithDeadline', 'assignment', '2026-03-15', datetime('now'))""")
      conn.commit()
      conn.close()
      
      response = client.delete(f'/api/schedule-events/{event_id}')
      assert response.status_code == 200
      
      # Verify academic_deadline was ALSO deleted
      conn = get_connection()
      cur = conn.cursor()
      cur.execute("SELECT COUNT(*) FROM academic_deadlines WHERE title = 'TEST_SYNC_WithDeadline'")
      assert cur.fetchone()[0] == 0, "academic_deadline should be deleted when course_event is deleted"
      conn.close()
  
  @patch('dashboard.api_adapter.fetch_task_lists')
  def test_google_api_failure_gracefully_handled(mock_fetch, client, test_course):
      """Test that Google API failure doesn't break local operations."""
      mock_fetch.return_value = ([], "API Error")  # Simulate failure
      
      payload = {
          "courseId": test_course,
          "modules": [],
          "events": [{"type": "assignment", "title": "TEST_SYNC_NoGoogle", "dueDate": "2026-03-01"}]
      }
      response = client.post('/api/syllabus/import-bulk', json=payload)
      assert response.status_code == 200  # Should succeed despite Google failure
      
      # Verify event was created locally
      conn = get_connection()
      cur = conn.cursor()
      cur.execute("SELECT COUNT(*) FROM course_events WHERE title = 'TEST_SYNC_NoGoogle'")
      assert cur.fetchone()[0] == 1
      conn.close()
  ```
  
  **PATCH TARGET RULE**: Since `api_adapter.py` will import functions with `from dashboard.gcal import ...`, you MUST patch at the lookup site: `dashboard.api_adapter.<function_name>`, NOT `dashboard.gcal.<function_name>`.

  **Acceptance Criteria**:
  - [ ] Test file exists: `brain/tests/test_schedule_sync.py`
  - [ ] Test `test_api_tasks_returns_time_fields` passes
  - [ ] Test `test_bulk_import_creates_google_tasks` passes (mocked)
  - [ ] Test `test_delete_cascades_to_google_tasks` passes (mocked)
  - [ ] Test `test_delete_also_removes_academic_deadline` passes (mocked) - verifies cascade delete
  - [ ] Test `test_google_api_failure_gracefully_handled` passes
  - [ ] `pytest brain/tests/test_schedule_sync.py -v` → 5+ tests pass
  - [ ] No `TEST_SYNC_*` data remains after test run (teardown verification)

  **Commit**: YES
  - Message: `test(sync): add pytest tests for schedule sync functionality`
  - Files: `brain/tests/test_schedule_sync.py`
  - Pre-commit: `pytest brain/tests/ -q`

---

- [ ] 5. End-to-end verification with real import

  **PRECONDITIONS** (MUST verify before starting):
  - [ ] Dashboard is running: `python brain/dashboard_web.py`
  - [ ] Google is authenticated: Navigate to Calendar tab → verify "Connected to Google" status
  - [ ] Google Tasks is enabled: Navigate to Calendar tab → verify task lists are visible
  - If NOT connected: Click "Connect Google" → complete OAuth flow → return here

  **What to do**:
  - Start the dashboard: `python brain/dashboard_web.py`
  - Import a test syllabus JSON with 2-3 assignments that have start/end times
  - Verify in Google Tasks app that tasks appear with correct due dates
  - Verify in Dashboard calendar that events show correct times
  - Delete one assignment from dashboard
  - Verify it disappears from both database tables and Google Tasks

  **Must NOT do**:
  - Do NOT skip any verification step
  - Do NOT proceed if any verification fails
  - Do NOT test Google Tasks creation if Google is not authenticated (will only log warnings)

  **Parallelizable**: NO (final verification)

  **References**:
  - `dashboard_rebuild/client/src/components/IngestionTab.tsx:7-53` - Full JSON schema with time fields (USE THIS for test JSON)
    - Defines `startTime` and `endTime` fields in expected format
  - NOTE: Do NOT use `JANUARY_26_PLAN/PROMPTS/schedule_import_prompt.md` - it lacks time fields
  
  **HOW TO VERIFY "Dashboard calendar shows correct times"**:
  - The Dashboard calendar at `dashboard_rebuild/client/src/pages/calendar.tsx` displays schedule events
  - Events are fetched from `/api/schedule-events` (NOT `/api/tasks`) for the calendar view
  - The `/api/schedule-events` endpoint already returns `time` and `endTime` fields (verified in codebase)
  - **Visual verification**: Navigate to Calendar tab in dashboard → look at imported events → times should display (e.g., "2:00 PM - 4:00 PM")
  - The `/api/tasks` endpoint enhancement (Task 1) is for the **assignments/tasks list view**, not the calendar view

  **Test JSON Example - For UI Paste** (based on IngestionTab.tsx schema):
  
  Use this in the Dashboard Ingestion tab (Brain → Ingestion → paste JSON):
  ```json
  {
    "modules": [],
    "events": [
      {
        "type": "assignment",
        "title": "Test Assignment 1",
        "date": "2026-02-01",
        "dueDate": "2026-02-01",
        "startTime": "14:00",
        "endTime": "16:00",
        "notes": "Test notes for assignment"
      },
      {
        "type": "quiz",
        "title": "Test Quiz 1",
        "date": "2026-02-05",
        "dueDate": "2026-02-05",
        "startTime": "09:00",
        "endTime": "10:30",
        "notes": null
      }
    ]
  }
  ```
  
  **NOTE**: The UI adds `courseId` automatically based on selected course dropdown. If testing via curl directly to the API, include `courseId`:
  ```bash
  curl -X POST http://localhost:5000/api/syllabus/import-bulk \
    -H "Content-Type: application/json" \
    -d '{"courseId": 1, "modules": [], "events": [{"type": "assignment", "title": "Test Assignment 1", "date": "2026-02-01", "dueDate": "2026-02-01", "startTime": "14:00", "endTime": "16:00"}]}'
  ```

  **Acceptance Criteria**:
  - [ ] Test syllabus JSON imported successfully (no errors in console)
  - [ ] Dashboard calendar shows events with correct times (e.g., "2:00 PM - 4:00 PM")
  - [ ] `/api/tasks` response includes time fields (verify with curl):
        `curl http://localhost:5000/api/tasks | python -m json.tool`
  - [ ] Google Tasks app shows imported assignments with due dates
  - [ ] Verify in database: `sqlite3 brain/data/pt_study.db "SELECT id, title, time, end_time, google_event_id FROM course_events WHERE type='assignment' LIMIT 5;"`
  - [ ] Delete assignment from dashboard UI
  - [ ] Verify deleted from `course_events`: `sqlite3 brain/data/pt_study.db "SELECT COUNT(*) FROM course_events WHERE title='Test Assignment 1';"`
  - [ ] Verify deleted from `academic_deadlines`: `sqlite3 brain/data/pt_study.db "SELECT COUNT(*) FROM academic_deadlines WHERE title='Test Assignment 1';"`
  - [ ] Verify deleted from Google Tasks (check Google Tasks app)
  - [ ] All pytest tests still pass after E2E testing

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(api): add time fields to /api/tasks endpoint response` | `brain/dashboard/api_adapter.py` | `curl localhost:5000/api/tasks` |
| 2 | `feat(sync): auto-create Google Tasks on syllabus bulk import` | `brain/dashboard/api_adapter.py` | Import test JSON via dashboard |
| 3 | `feat(sync): bidirectional delete from dashboard to Google Tasks` | `brain/dashboard/api_adapter.py` | Delete test assignment |
| 4 | `test(sync): add pytest tests for schedule sync functionality` | `brain/tests/test_schedule_sync.py` | `pytest brain/tests/test_schedule_sync.py -v` |

---

## Success Criteria

### Verification Commands
```bash
# Start dashboard
python brain/dashboard_web.py

# Check API returns time fields
curl http://localhost:5000/api/tasks | python -m json.tool

# Run all new tests
pytest brain/tests/test_schedule_sync.py -v

# Check database for google_event_id after import
sqlite3 brain/data/pt_study.db "SELECT id, title, google_event_id FROM course_events WHERE type='assignment' LIMIT 5;"

# Check academic_deadlines table
sqlite3 brain/data/pt_study.db "SELECT * FROM academic_deadlines LIMIT 5;"
```

### Final Checklist
- [ ] All "Must Have" features implemented
- [ ] All "Must NOT Have" guardrails respected
- [ ] All pytest tests pass
- [ ] E2E verification completed successfully
- [ ] No console errors during import/delete operations

Goal (incl. success criteria):
- Improve Brain integration: smart ingestion tracking + session CRUD with .md file sync.
- Success criteria:
  1. Add `ingested_files` table with checksum tracking to skip unchanged files on re-run.
  2. Update ingest_session.py to check/update ingested_files table before parsing.
  3. Add session CRUD routes (GET/PUT/DELETE) in routes.py.
  4. Create session_sync.py to write DB changes back to .md files.
  5. Add edit/delete UI to dashboard.html with modals and API calls.
  6. Update sync_all.ps1 to support --force flag and show skip/ingest counts.

Constraints/Assumptions:
- Hard delete (no soft delete).
- DB and .md files must stay in sync—.md is source of truth.
- Use MD5 checksum for tracking (detects content changes reliably).
- Existing sessions table schema unchanged; only add ingested_files table.

Key decisions:
- Checksum-based tracking chosen over timestamp (more reliable for manual edits).
- session_sync.py converts DB record back to canonical .md format.
- DELETE removes both DB record and source .md file.

State:
  - Done:
    - Step 1 - Added `ingested_files` table to db_setup.py with helper functions.
    - Step 2 - Updated ingest_session.py with checksum-based ingestion tracking.
    - Step 3 - Added session CRUD routes (GET/PUT/DELETE) to routes.py.
    - Step 4 - Created session_sync.py with DB-to-markdown sync functions (verified complete).
  - Now: Add dashboard UI for edit/delete (Step 5).
  - Next: Update sync_all.ps1 (Step 6).

Open questions (UNCONFIRMED if needed):
- None.

Working set (files/ids/commands):
- brain/db_setup.py (done)
- brain/ingest_session.py (done)
- brain/dashboard/routes.py
- brain/session_sync.py (new)
- brain/templates/dashboard.html
- brain/sync_all.ps1

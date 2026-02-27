# Obsidian One-Shot Smoke Checklist (Tutor)

Date: 2026-02-27
Scope: live vault browse + Obsidian-first retrieval + preview/apply writes + async cleanup.

## Pre-checks
1. Start dashboard with `Start_Dashboard.bat`.
2. Confirm Obsidian Local REST is up:
   - `GET /api/obsidian/status` returns `{"connected": true, "status": "online"}`.
3. Open Tutor chat page.

## A) Live Tree (Deterministic)
1. Ask: `Show me my Obsidian folder structure`.
2. Expected:
   - Response begins with `Live Obsidian folder listing`.
   - Returns real paths from live API.
   - No course-map text dump.
3. Ask: `Show me my Obsidian folder tree in Study Notes`.
4. Expected:
   - Listing scopes to `Study Notes`.

## B) Obsidian-First Behavior
1. Turn ON Obsidian toggle.
2. Keep Materials OFF.
3. Ask a note-grounded question about prior notes.
4. Expected:
   - Tutor response reflects notes context first.
   - No claim that it cannot browse notes.

## C) Save Preview + Apply
1. Ask Tutor to save a note to Obsidian.
2. Expected tool behavior:
   - `save_to_obsidian` returns preview payload (`preview_required=true`, `preview_id`).
   - No immediate write confirmation yet.
3. Confirm apply in chat.
4. Expected:
   - Tutor calls `apply_obsidian_write_preview`.
   - Returns success with `janitor_job.job_id`.

## D) Async Vault-Wide Cleanup
1. Copy `janitor_job.job_id` from apply response.
2. Poll `GET /api/tutor/janitor/jobs/<job_id>`.
3. Expected lifecycle: `queued` -> `running` -> `completed` (or `failed` with explicit error).

## E) Turn Persistence Regression Guard
1. Ask a deterministic listing question.
2. Refresh session details (`GET /api/tutor/session/<id>`).
3. Expected:
   - `turn_count` increased by 1.
   - Turn appears in session history.

## Fail Conditions (stop + fix)
- Folder-listing asks return inferred/static tree text when Obsidian API is offline.
- Deterministic listing turns do not increment `turn_count`.
- Save tool writes immediately without preview.
- Apply tool fails to enqueue janitor job.

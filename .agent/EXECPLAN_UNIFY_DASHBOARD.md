# Unify Dashboard on Legacy DB (Single Server)

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries, Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.

This plan follows `.agent/PLANS.md` and must be maintained in accordance with it.

## Purpose / Big Picture

We will run exactly one dashboard on port 5000 while keeping the legacy SQLite database at `brain/data/pt_study.db`. The user will see the new 5001 features (Ingestion tab, schedule events, modules, learning objectives, session context) in the same dashboard that already contains their data (class wheel, ingested sessions, scholar/tutor). We will remove the separate 5001 server so there is only one working dashboard in the repo.

## Progress

- [x] 2026-01-24 02:20:00: Inspected Flask app, adapter API, and legacy DB schema; confirmed `/api` adapter exists and already matches most dashboard_rebuild endpoints.
- [x] 2026-01-24 02:20:00: Identified missing API endpoints and schema gaps for schedule events/modules/learning objectives/LO sessions and session context.
- [x] 2026-01-23 22:46:21: Extended legacy DB schema with ingestion tables and new session fields in `brain/db_setup.py`.
- [x] 2026-01-23 22:46:21: Updated Flask API adapter to expose new endpoints and align session payloads with the new UI.
- [x] 2026-01-23 22:46:21: Updated startup/docs to run Flask on port 5000 and serve the React build from `brain/static/dist`.
- [x] 2026-01-23 22:46:21: Switched dashboard_rebuild build tooling to frontend-only (no Node server build).
- [x] 2026-01-23 22:46:21: Decommissioned the old 5001 server code by removing `dashboard_rebuild/server`.

## Surprises & Discoveries

- The Flask app already exposes a large `/api/*` adapter (`brain/dashboard/api_adapter.py`) that was designed to mimic the Node dashboard API, so most endpoints the new UI calls already exist.
- The legacy DB (`brain/data/pt_study.db`) already contains study wheel tables (`wheel_courses`, `study_wheel_state`, `study_streak`, `weakness_queue`) and session data; the new UI just needs compatible payloads.

## Decision Log

- Decision: Keep the Flask server on port 5000 as the single backend and reuse the legacy SQLite DB file.
  Rationale: This preserves all existing Scholar/Tutor/Calendar functionality without re?implementing Python logic in Node.
  Date/Author: 2026-01-24 (Codex)

- Decision: Add new ingestion tables (schedule events/modules/learning objectives/LO sessions) to the legacy DB instead of creating a second DB.
  Rationale: Keeps one source of truth and enables new UI features without data duplication.
  Date/Author: 2026-01-24 (Codex)

- Decision: Align `/api/sessions` payloads with the new UI by mapping legacy columns and adding optional new columns if needed.
  Rationale: New UI expects fields not currently returned by the adapter; mapping avoids losing existing data.
  Date/Author: 2026-01-24 (Codex)

- Decision: Treat `dashboard_rebuild` as frontend-only and remove Node server entry points.
  Rationale: Prevents future 5001 server confusion while keeping a single Flask-backed dashboard.
  Date/Author: 2026-01-23 (Codex)

## Outcomes & Retrospective

The Flask dashboard now serves the rebuilt React UI on port 5000 using the legacy DB, and the API adapter provides the ingestion and session context endpoints the UI expects. The old Node server directory has been removed to eliminate the 5001 split.

## Context and Orientation

- Flask server entry point: `brain/dashboard_web.py` uses `brain/dashboard/app.py`.
- Flask blueprints: `brain/dashboard/routes.py` (non?API routes) and `brain/dashboard/api_adapter.py` (primary `/api/*` endpoints).
- Legacy DB schema and migrations: `brain/db_setup.py` (creates `brain/data/pt_study.db`).
- New UI source: `dashboard_rebuild/client` and shared types in `dashboard_rebuild/shared/schema.ts`.
- React build output expected by Flask: `brain/static/dist` (served at `/`).
- Startup script: `Start_Dashboard.bat` (starts Flask on port 5000 and opens `/brain`; no 5001 server).

## Plan of Work

First, extend the legacy SQLite schema in `brain/db_setup.py` to create tables for schedule events, modules, learning objectives, and LO-session joins. If new session fields are required for the UI (confusions, concepts, issues), add them as optional columns and keep existing legacy columns intact. This keeps one DB while enabling new ingestion features.

Second, update `brain/dashboard/api_adapter.py` to align `/api/sessions` responses with the new UI, including `mode`, `minutes`, `cards`, `confusions`, `weakAnchors`, `concepts`, `issues`, `notes`, and `sourceLock`. Update the PATCH handler to persist these fields into the legacy DB. Also update `/api/brain/metrics` to compute the derived metrics arrays from these fields. Add missing endpoints: `/api/sessions/last-context`, `/api/brain/llm-status`, and the ingestion endpoints for `/api/schedule-events`, `/api/modules`, `/api/learning-objectives`, `/api/lo-sessions` using the legacy DB (either new tables or mapped onto existing `course_events`).

Third, build the dashboard_rebuild React client and copy the build output to `brain/static/dist` so Flask serves the new UI at port 5000. Update `Start_Dashboard.bat` to start only the Flask server and open `http://127.0.0.1:5000/brain`. Remove the 5001 startup logic so only one server runs.

Finally, after verification, decommission the unused 5001 server code. If we keep the React source for maintenance, we will clearly document it as frontend?only and remove the Node server entry points. If the user wants full deletion, we will remove the `dashboard_rebuild/server` directory (and related scripts) after confirming the new single dashboard works.

## Concrete Steps

1) Backup the legacy DB before schema changes (safe copy).
   - From repo root:
     - `copy brain\data\pt_study.db brain\data\pt_study.db.bak`

2) Update `brain/db_setup.py` to create ingestion tables and optional session columns.

3) Update `brain/dashboard/api_adapter.py`:
   - Replace `/api/sessions` query with direct SQLite mapping that returns the new UI fields.
   - Update the PATCH handler to map new fields into the legacy DB.
   - Add `/api/sessions/last-context`.
   - Add `/api/brain/llm-status` (simple status response).
   - Add ingestion endpoints for schedule events, modules, learning objectives, lo-sessions.
   - Improve `/api/brain/metrics` to compute arrays from stored fields.

4) Build the new UI and copy it into Flask static:
   - From `dashboard_rebuild`:
     - `npm run build`
   - Copy `dashboard_rebuild\dist\public\*` into `brain\static\dist\` (overwrite).

5) Update `Start_Dashboard.bat` to start only the Flask server and open `/brain` on port 5000.

6) Verify functionality and remove 5001 server code if approved.

## Validation and Acceptance

- Run `Start_Dashboard.bat` and confirm only one server starts (Flask on port 5000).
- Open `http://127.0.0.1:5000/brain` and verify:
  - Ingestion tab appears.
  - Study wheel data (courses, streak) shows existing data.
  - Sessions list shows existing sessions.
  - Scholar and Tutor pages still load.
  - Calendar page still loads and can sync.
- Confirm no 5001 server is running.

## Idempotence and Recovery

- DB changes are additive (new tables/columns only). If needed, restore from `brain/data/pt_study.db.bak`.
- API changes are confined to `brain/dashboard/api_adapter.py` and can be reverted by restoring that file.
- Frontend build can be re-run anytime; if broken, restore previous `brain/static/dist` from backup.

## Artifacts and Notes

- Expected build output: `dashboard_rebuild/dist/public/index.html` and `dashboard_rebuild/dist/public/assets/index-*.js`.
- Flask serves `brain/static/dist/index.html` for `/brain` and other routes.

## Interfaces and Dependencies

- SQLite tables to exist in legacy DB:
  - `modules(course_id, name, order_index, files_downloaded, notebooklm_loaded, sources, created_at, updated_at)`
  - `learning_objectives(course_id, module_id, lo_code, title, status, last_session_id, last_session_date, next_action, created_at, updated_at)`
  - `lo_sessions(lo_id, session_id, status_before, status_after, notes, created_at)`
  - `schedule_events` either mapped to existing `course_events` or created as a new table with `course_id`, `type`, `title`, `due_date`, `notes`.

- New `/api/*` endpoints to implement in `brain/dashboard/api_adapter.py`:
  - `GET /api/sessions/last-context`
  - `GET /api/brain/llm-status`
  - `GET/POST/PATCH/DELETE /api/schedule-events`
  - `GET/POST/PATCH/DELETE /api/modules`
  - `GET/POST/PATCH/DELETE /api/learning-objectives`
  - `POST /api/lo-sessions`

- Session payload fields to support in `/api/sessions`:
  - `mode`, `minutes`, `cards`, `confusions`, `weakAnchors`, `concepts`, `issues`, `notes`, `sourceLock`.

Plan update 2026-01-23: Marked schema/API/startup/build steps complete and documented the frontend-only build change; removed the server folder after confirmation.


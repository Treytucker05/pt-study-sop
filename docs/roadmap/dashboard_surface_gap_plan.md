# Dashboard Surface Gap Plan (React vs Legacy)

## Summary
Compare the React dashboard rebuild to the legacy HTML/JS dashboard, identify missing or mismatched functionality across the full surface, and outline a phased roadmap to reach parity while keeping API wiring correct and documented.

## Acceptance Criteria
- Every dashboard surface is listed with purpose, UI status, and API dependencies.
- React-to-backend wiring is mapped with clear status (ok/partial/missing).
- Legacy-only features and data-shape mismatches are explicitly called out.
- A phased roadmap lists what to implement and why (parity + stability).
- Risks/unknowns are flagged with next verification steps.

## Scope
**In**
- React UI under `brain/static/react/src/pages` and `brain/static/react/src/components/layout.tsx`.
- Legacy dashboard UI under `brain/templates/dashboard.html` and `brain/static/js/dashboard.js`.
- Backend API surface under `brain/dashboard/api_adapter.py` and `brain/dashboard/routes.py`.

**Out**
- Implementation changes or schema refactors.
- External service validation (Google, Anki, Blackboard) beyond wiring checks.

## Sources (Evidence)
- React pages: `brain/static/react/src/pages/dashboard.tsx`, `brain/static/react/src/pages/brain.tsx`, `brain/static/react/src/pages/calendar.tsx`, `brain/static/react/src/pages/scholar.tsx`, `brain/static/react/src/pages/tutor.tsx`.
- React shell + notes: `brain/static/react/src/components/layout.tsx`.
- React API client: `brain/static/react/src/lib/api.ts`.
- Legacy UI: `brain/templates/dashboard.html`, `brain/static/js/dashboard.js`.
- Backend adapters: `brain/dashboard/api_adapter.py`, `brain/dashboard/routes.py`.
- Existing audit: `docs/dashboard_audit.md`.

## Surface Map (Purpose + Status)
| Surface | Purpose (why) | React status | Legacy coverage | API dependencies |
| --- | --- | --- | --- | --- |
| Shell/Nav | Unified navigation + theming + notes | Present | Present | `/api/notes` (React) vs localStorage (legacy) |
| Overview | Quick stats + trends + insights | Partial | Full | `/api/sessions`, `/api/sessions/stats`, `/api/proposals` |
| Brain | Session logging + mastery + resume + Anki | Partial | Full | `/api/sessions`, `/api/quick_session`, `/api/resume`, `/api/cards/*`, `/api/upload` |
| Calendar | Syllabus + calendar + tasks + Google sync | Partial | Full | `/api/events`, `/api/tasks`, `/api/google/*`, `/api/google-calendar/*`, `/api/google-tasks/*` |
| Scholar | Orchestrator + proposals + digests + Ralph | Mostly present | Full | `/api/scholar/*`, `/api/proposals` |
| Tutor | Study chat + RAG sources + card drafts | Partial | Full | `/api/chat/:id`, `/api/tutor/*`, `/api/rag/*` |
| Sync Inbox | Scraper review + approvals | Missing | Present | `/api/sync/*`, `/api/scraper/run` |

## React Wiring Matrix (Endpoint Status)
| React call | Backend handler | Status | Notes |
| --- | --- | --- | --- |
| `GET /api/sessions` | `api_adapter.get_sessions` | Partial | Response shape mismatch (`durationMinutes` vs `duration`, `mode` missing). |
| `POST /api/sessions` | `api_adapter.create_session` | Partial | Creates minimal fields only. |
| `PATCH/DELETE /api/sessions/:id` | `api_adapter.update_session/delete_session` | Partial | Limited fields mapped. |
| `GET /api/sessions/stats` | `api_adapter.get_session_stats` | Partial | Placeholder metrics. |
| `GET /api/proposals` | `api_adapter.get_proposals` | Partial | Only status updates supported. |
| `POST /api/proposals` | `api_adapter.create_proposal` | Partial | Writes DB entry, no file generation. |
| `GET /api/events` | `api_adapter.get_events` | Partial | Read-only, no create endpoint. |
| `POST /api/events` | Missing | Missing | React calls `api.events.create` but no endpoint. |
| `PATCH/DELETE /api/events/:id` | `api_adapter.update_event/delete_event` | Partial | Limited fields. |
| `GET /api/tasks` | `api_adapter.get_tasks` | Partial | Read-only, no update/delete. |
| `POST /api/tasks` | `api_adapter.create_task` | Missing | Mock only. |
| `PATCH/DELETE /api/tasks/:id` | Missing | Missing | React calls update. |
| `GET /api/google/status` | `api_adapter.google_status` | OK | Connect state only. |
| `GET /api/google/auth` | `api_adapter.google_auth_url` | OK | OAuth flow. |
| `POST /api/google/disconnect` | `api_adapter.google_disconnect` | OK | Disconnect flow. |
| `GET /api/google-calendar/*` | `api_adapter.get_google_calendars/events` | Partial | Duplicate enrichment; verify event fields. |
| `PATCH/DELETE /api/google-calendar/events/:id` | `api_adapter.update/delete_google_event` | OK | Requires `calendarId`. |
| `GET /api/google-tasks` | `api_adapter.get_google_tasks` | OK | Returns tasks only. |
| `GET /api/google-tasks/lists` | `api_adapter.get_google_task_lists` | OK | Lists for board. |
| `POST/PATCH/DELETE /api/google-tasks/:id` | `api_adapter.*` | OK | Move endpoint supported. |
| `POST /api/google-tasks/@default` | Missing | Missing | React calls non-existent convenience route. |
| `PATCH /api/google-tasks/@default/:id/toggle` | Missing | Missing | React calls non-existent toggle route. |
| `GET /api/chat/:id` | `api_adapter.get_chat_history` | Partial | Returns `role`; React expects `sender`. |
| `POST /api/chat/:id` | `api_adapter.chat_message` | OK | Returns `sender=ai`, `content`. |
| `GET /api/scholar/*` | `routes.py` + adapter | OK | React uses extensive endpoints. |
| `GET/POST /api/notes` | `api_adapter.notes` | OK | React notes wired to DB. |

## Gap Analysis (Per Surface)
### Shell + Notes
- React uses DB-backed notes via `/api/notes`, legacy uses localStorage notes sidebar.
- React navigation does not include Sync Inbox route.

### Overview
- React has stats/trends/insights UI but uses placeholder streak/level logic.
- Legacy includes additional panels (alerts, detailed insights, upload log wiring).
- React upload card has no handler for `/api/upload`.

### Brain
- React missing fast-entry prompt ingestion, resume generation, session edit modal, upload flow, mastery/ingestion stats, and Anki drafts sync.
- React only supports minimal session create/delete without full v9.1 fields.

### Calendar
- React month/week/day/tasks views exist; legacy includes syllabus list view, import flows, course color manager, planned repetition creation.
- React calls `/api/events` create/update/delete, but backend only supports read/update/delete partially.
- Google Tasks: React uses a default list convenience endpoint that does not exist.

### Scholar
- React has UI for digest, Ralph, proposal sheet, coverage, questions; backend provides most `/api/scholar/*` endpoints.
- Safe-mode and multi-agent toggles are UI-only; no backing endpoint.
- Proposal CRUD is limited to status-only updates.

### Tutor
- React chat is mostly mocked and does not integrate RAG sources or file/URL ingestion from legacy.
- Adapter chat history returns `role`, but React expects `sender`.

### Sync Inbox
- React missing Sync Inbox tab entirely; legacy uses `/api/sync/*` and `/api/scraper/run`.

### Data Model Mismatch
- React uses shared schema (`brain/static/react/shared/schema.ts`) with `sessions.duration` string and `sessions.mode` text, while adapter returns `durationMinutes` and omits `mode`.

## Roadmap (Phased)
### Phase 0: Canonical UI + Wiring Baseline
- Confirm canonical frontend: `brain/static/react` vs `dashboard_rebuild` duplication.
- Document React route map and add Sync Inbox route placeholder.

### Phase 1: Core Wiring Parity
- Align session payload shape (duration/mode fields).
- Add missing endpoints: `/api/events` POST, `/api/tasks` PATCH/DELETE.
- Add Google Tasks convenience routes or update React to use existing endpoints.

### Phase 2: Brain Parity
- Implement fast entry ingest, upload, resume generation, mastery stats, and Anki drafts sync.
- Add session edit modal and full v9.1 field mapping.

### Phase 3: Calendar + Syllabus Parity
- Add syllabus import flows, course color manager, list view, planned repetition UI.
- Confirm Google Calendar write permissions and surface errors in UI.

### Phase 4: Tutor Parity
- Replace mock responses with Tutor engine turn calls.
- Add RAG source management (folder sync, runtime catalog, URL ingestion).

### Phase 5: Scholar Enhancements
- Wire safe-mode/multi-agent toggles and question answering to backend.
- Ensure proposal approvals update `scholar/outputs` and DB consistently.

### Phase 6: Sync Inbox + QA
- Build Sync Inbox UI and wire `/api/sync/*` + `/api/scraper/run`.
- Run regression smoke checklist from `AGENTS.md` (pytest + release check + manual dashboard run).

## Risks / Unknowns
- External integrations (Google, Anki, Blackboard) need credentialed testing.
- `dashboard_rebuild` vs `brain/static/react` duplication could cause drift; confirm canonical UI.
- Legacy-only modals may still be required for parity; inventory in `docs/dashboard_audit.md`.

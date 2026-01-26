## Full UI + API Audit (React Dashboard)

Date: 2026-01-22
Scope: React UI served from Flask (`Start_Dashboard.bat` → `brain/dashboard_web.py`), legacy dashboard treated as unused.
No code changes. Documentation only.

---

## Entrypoints / Runtime
- Launcher: `Start_Dashboard.bat`
- Backend runtime: Flask app in `brain/dashboard_web.py` → `brain/dashboard/app.py`
- Frontend build served from: `brain/static/dist/` (React build)
- React routes (Wouter): `/`, `/brain`, `/calendar`, `/scholar`, `/tutor`
- Legacy (unused): `/old-dashboard` (Flask template + `brain/static/js/dashboard.js`)

---

## UI Coverage (Buttons/Tabs/Dialogs)

### Global Layout (Top Nav + Notes)
File: `dashboard_rebuild/client/src/components/layout.tsx`
- Top nav buttons: Dashboard, Brain, Calendar, Scholar, Tutor
- Notes sheet: open, add note, edit note, delete note, reorder notes (drag/drop)
- Tutor modal: open via `window.openTutor()`, close button

API usage:
- Notes: GET/POST/PATCH/DELETE `/api/notes`, POST `/api/notes/reorder`

### Dashboard Page
File: `dashboard_rebuild/client/src/pages/dashboard.tsx`
Buttons / actions:
- Add course (dialog)
- Edit course (dialog)
- Delete course (confirm dialog)
- Complete session → minutes input → log
- Google Tasks list navigation (prev/next)
- Google task add/edit/toggle/delete
- Academic deadlines add/toggle/delete

API usage:
- Courses: GET `/api/courses/active`, POST `/api/courses`, PATCH `/api/courses/<id>`, DELETE `/api/courses/<id>`
- Study wheel: GET `/api/study-wheel/current`, POST `/api/study-wheel/complete-session`
- Sessions today: GET `/api/sessions/today`
- Streak: GET `/api/streak`
- Weakness queue: GET `/api/weakness-queue`
- Google Tasks: GET `/api/google-tasks/lists`, GET `/api/google-tasks`, POST `/api/google-tasks/<list_id>`, PATCH `/api/google-tasks/<list_id>/<task_id>`, DELETE `/api/google-tasks/<list_id>/<task_id>`, POST `/api/google-tasks/<list_id>/<task_id>/move`
- Academic deadlines: GET/POST/PATCH/DELETE `/api/academic-deadlines`, POST `/api/academic-deadlines/<id>/toggle`

### Brain Page
File: `dashboard_rebuild/client/src/pages/brain.tsx`
Tabs:
- Session Evidence
- Derived Metrics
- Issues Log

Buttons / actions:
- Edit session (dialog)
- Delete session (confirm)
- Bulk select sessions (header checkbox)
- Obsidian vault navigation + file open + save
- Anki refresh + sync
- Chat send + file upload

API usage:
- Sessions: GET `/api/sessions`, PATCH `/api/sessions/<id>`, POST `/api/sessions/bulk-delete`
- Brain metrics: GET `/api/brain/metrics`
- Brain chat: POST `/api/brain/chat`
- Brain ingest: POST `/api/brain/ingest`
- Obsidian: GET `/api/obsidian/status`, GET `/api/obsidian/files`, GET `/api/obsidian/file`, PUT `/api/obsidian/file`
- Anki: GET `/api/anki/status`, GET `/api/anki/due`, POST `/api/anki/sync`

### Calendar Page
File: `dashboard_rebuild/client/src/pages/calendar.tsx`
Tabs / views:
- Month / Week / Day / Tasks

Buttons / actions:
- Today / Prev / Next
- Mini-calendar toggle (header title)
- Search input
- AI Assist (left panel)
- Sync (refresh)
- Create Event (header + day view)
- Manage calendars (dialog)
- Local calendar show/hide
- Google connect
- Calendar event edit + delete
- Google event edit + delete
- Tasks board add/edit/toggle/delete + drag/drop

API usage:
- Local events: GET/POST/PATCH/DELETE `/api/events`
- Local tasks: GET/POST/PATCH/DELETE `/api/tasks`
- Google status/connect: GET `/api/google/status`, GET `/api/google/auth`
- Google calendar list: GET `/api/google-calendar/calendars`
- Google calendar events: GET `/api/google-calendar/events`, PATCH `/api/google-calendar/events/<event_id>`, DELETE `/api/google-calendar/events/<event_id>`
- Google tasks list + tasks: GET `/api/google-tasks/lists`, GET `/api/google-tasks`, POST `/api/google-tasks/<list_id>`, PATCH `/api/google-tasks/<list_id>/<task_id>`, DELETE `/api/google-tasks/<list_id>/<task_id>`, POST `/api/google-tasks/<list_id>/<task_id>/move`
- Google tasks default list (direct fetch in calendar.tsx): POST `/api/google-tasks/@default`, PATCH `/api/google-tasks/@default/<task_id>/toggle`

### Scholar Page
File: `dashboard_rebuild/client/src/pages/scholar.tsx`
Tabs:
- Summary
- Tutor Audit
- Questions
- Evidence
- Proposals
- History

Buttons / actions:
- Refresh data
- Scholar chat submit
- Proposal status select

API usage:
- Sessions: GET `/api/sessions`
- Courses: GET `/api/courses`
- Proposals: GET `/api/proposals`, PATCH `/api/proposals/<id>`
- Scholar: GET `/api/scholar/questions`, GET `/api/scholar/findings`, GET `/api/scholar/tutor-audit`, POST `/api/scholar/chat`

### Tutor Page
File: `dashboard_rebuild/client/src/pages/tutor.tsx`
Buttons / actions:
- Mode buttons (core/sprint/drill)
- Start session
- Explain / Quiz
- Send message

API usage:
- Chat: GET `/api/chat/<session_id>`, POST `/api/chat/<session_id>`

---

## Backend Endpoint Map (React Used vs Unused)

### Used by React UI
From `brain/dashboard/api_adapter.py`:
- Sessions: GET `/api/sessions`, PATCH `/api/sessions/<id>`, POST `/api/sessions/bulk-delete`, GET `/api/sessions/today`
- Events: GET/POST/PATCH/DELETE `/api/events`
- Tasks: GET/POST/PATCH/DELETE `/api/tasks`
- Proposals: GET `/api/proposals`, PATCH `/api/proposals/<id>`
- Chat: GET/POST `/api/chat/<session_id>`
- Google status/connect: GET `/api/google/status`, GET `/api/google/auth`
- Google Calendar: GET `/api/google-calendar/calendars`, GET `/api/google-calendar/events`, PATCH `/api/google-calendar/events/<event_id>`, DELETE `/api/google-calendar/events/<event_id>`
- Google Tasks (list scoped): GET `/api/google-tasks/lists`, GET `/api/google-tasks`, POST `/api/google-tasks/<list_id>`, PATCH `/api/google-tasks/<list_id>/<task_id>`, DELETE `/api/google-tasks/<list_id>/<task_id>`, POST `/api/google-tasks/<list_id>/<task_id>/move`
- Notes: GET/POST/PATCH/DELETE `/api/notes`, POST `/api/notes/reorder`
- Courses: GET `/api/courses`, GET `/api/courses/active`, POST `/api/courses`, PATCH `/api/courses/<id>`, DELETE `/api/courses/<id>`
- Study wheel: GET `/api/study-wheel/current`, POST `/api/study-wheel/complete-session`
- Streak: GET `/api/streak`
- Weakness queue: GET `/api/weakness-queue`
- Brain metrics/chat/ingest: GET `/api/brain/metrics`, POST `/api/brain/chat`, POST `/api/brain/ingest`
- Academic deadlines: GET/POST/PATCH/DELETE `/api/academic-deadlines`, POST `/api/academic-deadlines/<id>/toggle`
- Scholar: GET `/api/scholar/questions`, GET `/api/scholar/findings`, GET `/api/scholar/tutor-audit`, POST `/api/scholar/chat`
- Anki: GET `/api/anki/status`, GET `/api/anki/due`, POST `/api/anki/sync`
- Obsidian: GET `/api/obsidian/status`, GET `/api/obsidian/files`, GET `/api/obsidian/file`, PUT `/api/obsidian/file`

Also used directly in `calendar.tsx` via fetch:
- POST `/api/google-tasks/@default`
- PATCH `/api/google-tasks/@default/<task_id>/toggle`

### Unused by React UI (legacy treated as unused)
From `brain/dashboard/api_adapter.py`:
- Sessions: GET `/api/sessions/stats`, GET `/api/sessions/<id>`, DELETE `/api/sessions/<id>`
- Events: GET `/api/events/<id>`
- Tasks: GET `/api/tasks/<id>`
- Proposals: POST `/api/proposals`, DELETE `/api/proposals/<id>`
- Google: POST `/api/google/disconnect`
- Google Calendar: POST `/api/google-calendar/clear`
- Calendar assistant: POST `/api/calendar/assistant`, POST `/api/calendar/assistant/undo`
- Scholar: POST `/api/scholar/run`, GET `/api/scholar/status`, GET `/api/scholar/logs`, POST `/api/scholar/api-key`
- Anki: GET `/api/anki/decks`, GET `/api/anki/drafts`, POST `/api/anki/drafts/<id>/approve`
- Obsidian: POST `/api/obsidian/append`
- Google Tasks (older non-list endpoints): PATCH/DELETE `/api/google-tasks/<task_id>`, POST `/api/google-tasks/<task_id>/move`
- Duplicate route registration: PATCH `/api/google-calendar/events/<event_id>` appears twice in `api_adapter.py`

From `brain/dashboard/routes.py` (legacy-only)
- `/api/brain/status`
- `/api/mastery`
- `/api/trends`
- `/api/sync/pending`
- `/api/sync/resolve`
- `/api/scraper/run`
- `/api/scholar/insights`
- `/api/scholar/digest` and `/api/scholar/digest/save`
- `/api/scholar/digests` and `/api/scholar/digests/<id>` (GET/DELETE)
- `/api/scholar/ralph`
- `/api/gcal/*`
- `/api/gtasks/*`

---

## Unrouted or Legacy UI Files (React)
- `dashboard_rebuild/client/src/pages/home.tsx` (not in router)
- `dashboard_rebuild/client/src/pages/calendar_e07b793.tsx` (not in router)
- `dashboard_rebuild/client/src/pages/calendar_prev.tsx` (empty)

---

## Automation Issues Observed (needs manual verification)
- Tutor “drill” click crashed the browser tab once.
- Academic deadlines modal close was blocked by overlay in automation; only closed via Escape.

---

## Notes
- Legacy dashboard (`/old-dashboard`) is treated as unused by request, but it does still call many endpoints in `brain/dashboard/routes.py`.
- React calendar uses both list-scoped Google Tasks endpoints and the `@default` endpoints.
- React uses `/api/google-calendar/*` endpoints from `api_adapter.py`, not the legacy `/api/gcal/*` endpoints.

---

## No Changes Applied
This is documentation only. No deletions or modifications were performed.

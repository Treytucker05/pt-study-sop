Goal (incl. success criteria):
- Rebuild dashboard starting with Google-Calendar-style Calendar tab at /v3.
- Success: Month/Week/Day views, calendar list toggles, event CRUD + recurring, two-way Google sync, tests per phase.
Constraints/Assumptions:
- Reuse existing backend/API/DB where possible.
- New project folder at repo root for rebuild assets.
- Modular, template-driven UI; keep changes minimal and additive.
Key decisions:
- Serve new UI at /v3 during rebuild.
- Include recurring events in initial Calendar build (pending implementation).
- Connectivity map stored at `dashboard_rebuild/connectivity_map.md`.
State:
  - Done:
    - Cleared stale OpenCode session cache causing rs_ errors.
    - Added /v3 scaffold: blueprint + template + static assets.
    - Added /api/v3/calendar/data endpoint returning FullCalendar-friendly events.
    - Extended calendar data output with course metadata for filters.
  - Now:
    - Verify /v3 renders and calendar loads data from /api/v3/calendar/data.
  - Next:
    - Add event CRUD + recurrence handling.
    - Add tests/QA gates for calendar API + UI.
Open questions (UNCONFIRMED if needed):
- Do we want to wire Vite now, or keep CDN/static for initial pass?
Working set (files/ids/commands):
- `dashboard_rebuild/connectivity_map.md`
- `dashboard_rebuild/code/templates/v3_calendar.html`
- `dashboard_rebuild/code/static/v3_calendar.js`
- `dashboard_rebuild/code/static/v3_calendar.css`
- `brain/dashboard/v3_routes.py`
- `brain/dashboard/app.py`
- `brain/dashboard/calendar.py`

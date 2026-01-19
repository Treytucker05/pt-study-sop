# Calendar + Tasks Integration (Obsidian Copy)

> Canonical source: `docs/calendar_tasks.md`. Update that file first.

## Purpose
- Document how Google Calendar and Google Tasks integrate with the Brain and Calendar page.
- Define the configuration, auth flow, sync endpoints, and data surfaces.
- Provide the expected study scheduling loop (Calendar → Tutor targets).

## Scope
- Calendar/Tasks sync is implemented; this document makes it usable and debuggable.
- This is a **runtime integration** (requires credentials and OAuth).

## Where It Lives
- **Integration code:** `brain/dashboard/gcal.py`
- **API routes:** `brain/dashboard/routes.py`
- **Calendar aggregation:** `brain/dashboard/calendar.py`
- **Calendar assistant:** `brain/dashboard/calendar_assistant.py`
- **Database tables:** `course_events`, `study_tasks`, `scraped_events`

## Required Configuration
1. Create/update `brain/data/api_config.json` with `google_calendar` credentials.
2. Ensure Python dependencies are installed:
   - `google-auth`, `google-auth-oauthlib`, `google-api-python-client`
3. Launch the dashboard and use the Calendar page to connect.

### `api_config.json` Structure
```json
{
  "google_calendar": {
    "client_id": "...",
    "client_secret": "...",
    "redirect_uri": "http://localhost:5000/api/gcal/oauth/callback",
    "calendar_ids": ["primary"],
    "default_calendar_id": "primary",
    "sync_all_calendars": false
  }
}
```

## OAuth Flow (Dashboard)
1. Open the Calendar page.
2. Click **Connect Google Calendar** (starts OAuth).
3. Authorize and return to the callback endpoint.
4. Dashboard reports connection status from `/api/gcal/status`.

## API Endpoints (Calendar)
- `GET /api/gcal/status` → auth status
- `GET /api/gcal/calendars` → calendar list + selected IDs
- `POST /api/gcal/config` → update calendar IDs + defaults
- `POST /api/gcal/sync` → two‑way calendar sync
- `POST /api/gcal/revoke` → disconnect

## API Endpoints (Tasks)
- `POST /api/gtasks/sync` → import tasks
- `GET /api/gtasks/lists` → list task lists

## Data Flow
1. Calendar/Tasks sync pulls events into `course_events` and tasks into `study_tasks`.
2. Calendar page renders events + tasks from the Brain database.
3. Study plan priorities drive Tutor session targets.

## Operational Notes
- OAuth tokens are stored in `brain/data/gcal_token.json`.
- Calendar sync requires the Google API dependencies; otherwise status returns an error.
- If calendars are not selected, defaults to the primary calendar.

## Known Gaps (Documented)
- Some UI flows still create **local** events only (see dashboard gap plan).
- OAuth must be connected manually before calendar sync works.

## Related Docs
- `[[system_map]]`

## Verification Checklist
- `api_config.json` present with `google_calendar` block.
- `/api/gcal/status` returns connected = true.
- `/api/gcal/sync` writes events into `course_events`.
- `/api/gtasks/sync` writes tasks into `study_tasks`.

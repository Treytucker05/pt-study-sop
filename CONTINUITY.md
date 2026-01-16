Goal (incl. success criteria):
- Stabilize dashboard: Notes UI functional, Calendar Chat isolated from repo; calendar assistant should create events via "workout tomorrow at 3pm" request.
Constraints/Assumptions:
- Canonical frontend source: `brain/static/react/src/`
- Build output: `brain/static/dist/`
- CalendarAssistant uses `/api/calendar/assistant` endpoint
- Backend uses OpenAI API for isolated calendar chat (fast ~1-3s)
- Google Calendar API needs ISO 8601 datetime format with T separator
Key decisions:
- Notes UI rewritten with smaller input, saved notes list, delete/edit
- Codex `isolated` parameter added to run in empty temp dir for calendar chat
- Calendar assistant endpoint now uses `isolated=True`
- Calendar Assistant button moved to header (AI_ASSIST button)
- Added `--skip-git-repo-check` flag for isolated mode
- Added direct OpenAI API support for fast calendar responses
State:
  - Done:
    - Copied CalendarAssistant.tsx, GoogleTasksComponents.tsx, calendar.tsx from dashboard_rebuild
    - Copied api.ts with GoogleTask, Note interfaces and API methods
    - Installed @dnd-kit dependencies for drag-and-drop
    - Built successfully to brain/static/dist/
    - Verified CalendarAssistant imported and rendered in calendar.tsx
    - Verified /api/calendar/assistant endpoint exists in api_adapter.py
    - Added `isolated` parameter to `_call_codex()` in llm_provider.py
    - Updated calendar assistant endpoint to use `isolated=True`
    - Rewrote Quick Notes UI in layout.tsx with full CRUD functionality
    - Moved CalendarAssistant from floating circle to header button (AI_ASSIST)
    - Fixed 503 error by adding `--skip-git-repo-check` for isolated mode
    - Added direct OpenAI API support (_call_openai_api in llm_provider.py)
    - Fixed gcal.py: get_service() -> get_calendar_service() in create/patch/delete_event
    - Fixed api_adapter.py: get_service() -> get_calendar_service() in delete_event handler
    - Fixed date format: added _normalize_datetime() to convert "YYYY-MM-DD HH:MM" to ISO 8601
  - Now:
    - Ready for testing - restart dashboard and test calendar assistant
  - Next:
    - Test Notes UI: create, edit, delete notes
    - Verify calendar event creation works end-to-end
Open questions (UNCONFIRMED if needed):
- None
Working set (files/ids/commands):
- `brain/static/react/src/components/layout.tsx` - Quick Notes UI
- `brain/static/react/src/components/CalendarAssistant.tsx`
- `brain/static/react/src/pages/calendar.tsx` (renders CalendarAssistant)
- `brain/dashboard/api_adapter.py` (line 1325: calendar/assistant; line 1407: _normalize_datetime)
- `brain/dashboard/gcal.py` (lines 1197-1225: create/patch/delete_event)
- `brain/llm_provider.py` (isolated parameter + OpenAI API)
- Build: `cd brain/static/react && npm run build`
- Start: `Run_Brain_All.bat`

# PT Study System (Trey)

Owner: Trey.

Personal study OS that captures sessions, produces metrics and Anki-ready outputs, keeps Obsidian as the primary knowledge base, and drives improvement via Scholar research. Flask dashboard on port 5000.

Response style: straight to the point, no fluff.

## Environment
- Repo root: C:\pt-study-sop
- Shell: PowerShell
- Shell preference: PowerShell by default; use WSL/Git Bash when required.
- Obsidian vault: C:\Users\treyt\Desktop\PT School Semester 2
- Editor: Codex CLI / Claude Code (no default GUI editor).

## Git Identity
- Name: TreyT
- Email: Treytucker05@yahoo.com

## Core Commands
- Start dashboard: Start_Dashboard.bat
- Run tests: pytest brain/tests/
- Build frontend: cd dashboard_rebuild && npm run build (preferred PM: npm)
- Copy build: copy dashboard_rebuild/dist/public -> brain/static/dist

## Key Paths
- Database: brain/data/pt_study.db
- Session logs: brain/session_logs/
- API: brain/dashboard/api_adapter.py
- Frontend source: dashboard_rebuild/
- Frontend build output: brain/static/dist/
- SOP canon: sop/
- Scholar outputs: scholar/outputs/
- Docs index (canonical): docs/README.md (DOCS_INDEX.md is legacy)
- Architecture doc: docs/root/PROJECT_ARCHITECTURE.md
- SOP manifest: sop/sop_index.v1.json
- Google Calendar credentials: GoogleCalendarTasksAPI.json (handle as sensitive; do not modify unless asked).

## System Modules
- Dashboard, Brain, Calendar (Flask): brain/
- Frontend UI: dashboard_rebuild/
- Scholar research: scholar/
- SOP definitions: sop/
- Tutor logs: brain/session_logs/ (Tutor itself is external)

## External Systems (from docs)
- Tutor (CustomGPT): "Trey's Study System" (external only; no local launcher).
- Anki (AnkiConnect): in active use; syncs card_drafts to Anki Desktop.
- Google Calendar/Tasks: in active use; OAuth via Calendar page; config in brain/data/api_config.json.

## UI/UX (Retro Arcade)
- Theme: high-contrast red and black, no glow, consistent across pages.
- Typography: font-arcade headers, font-terminal body.
- Components: 2px solid red borders; semi-transparent black backgrounds.

## Rules
1. Plan before coding for any non-trivial change.
2. dashboard_rebuild is frontend-only; API lives in brain/.
3. Only serve the dashboard via Start_Dashboard.bat on port 5000. Do not run a separate dev server or python brain/dashboard_web.py directly.
4. After frontend changes: rebuild and copy dist/public -> brain/static/dist.
5. Check permissions.json before executing new shell commands.
6. Update CONTINUITY.md after every significant change (append only).
7. Push to remote after every change (auto).
8. After code changes, run relevant checks by default (pytest brain/tests/; frontend build already required).
9. Do not edit archive/ unless explicitly requested.
10. Do not edit brain/static/dist/ except when copying a new build output.
11. No destructive commands (e.g., reset --hard, clean, rm) unless explicitly requested.
12. Auto-commit after changes; use a conventional commit message if none is provided.
13. Safe-by-default git: check status/diff before edits.

## Learnings

### Project Location
The project root is `C:\pt-study-sop`. All dashboard_rebuild/ and brain/ paths are relative to this root.

### React Hooks in calendar.tsx
Never place `useSensors`, `useSensor`, or any `use*` hook inside JSX or callbacks. Always declare at the top level of `CalendarPage()`. This was a bug introduced when adding DnD to the manage calendars dialog.

### Calendar Filtering
When filtering Google events by `selectedCalendars`, always use `event.calendarId || ''` — never rely on a truthy check on `calendarId` since some events have undefined/empty calendarId and would bypass the filter.

### Build & Deploy
After frontend changes, run `npm run build` in `dashboard_rebuild/`, then copy `dist/public/` to `brain/static/dist/`. The Flask server serves static files from there. Without this step, changes won't appear in the browser.

## Detailed Guidelines
- Agent Workflow: ai-config/agent-workflow.md

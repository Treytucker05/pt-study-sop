# PT Study System (Trey)

Owner: Trey.

Personal study OS that captures sessions, produces metrics and Anki-ready outputs, keeps Obsidian as the primary knowledge base, and drives improvement via Scholar research. Flask dashboard on port 5000.

Response style: straight to the point, no fluff.

Global instructions: read `C:\Users\treyt\.claude\CLAUDE.md` first, then this file.
Also read `AGENTS.md` for agent behavior rules.

## Environment
- Repo root: C:\pt-study-sop
- Obsidian vault: C:\Users\treyt\Desktop\PT School Semester 2
- Editor: Codex CLI / Claude Code (no default GUI editor).

## Git Identity
- Name: TreyT
- Email: Treytucker05@yahoo.com

## Core Commands
Canonical run/build/test commands live in `docs/root/GUIDE_DEV.md`.

- Start dashboard: `Start_Dashboard.bat`
- Run tests: `pytest brain/tests/`
- Frontend build + sync: see `docs/root/GUIDE_DEV.md` (required for UI changes)

## Key Paths
- Database: brain/data/pt_study.db
- Session logs: brain/session_logs/
- API: brain/dashboard/api_adapter.py
- Frontend source: dashboard_rebuild/
- Frontend build output: brain/static/dist/
- SOP canon: sop/library/
- Scholar outputs: scholar/outputs/
- Docs index (canonical): docs/README.md (DOCS_INDEX.md is legacy)
- Architecture doc: docs/root/PROJECT_ARCHITECTURE.md
- SOP manifest: (archived — replaced by sop/library/00-overview.md file map)
- Google Calendar credentials: GoogleCalendarTasksAPI.json (handle as sensitive; do not modify unless asked).
- Conductor: conductor/ (product def, tech stack, tracks, workflow)
- Agents track: conductor/tracks/agents_setup_cleanup_20260209/ (agent instruction + skill wiring)

## System Modules
- Dashboard, Brain, Calendar (Flask): brain/
- Frontend UI: dashboard_rebuild/
- Scholar research: scholar/
- SOP definitions: sop/
- Adaptive Tutor: brain/tutor_rag.py, brain/tutor_chains.py, brain/tutor_streaming.py, brain/dashboard/api_tutor.py
- Tutor logs: brain/session_logs/ (Tutor itself is external)

## External Systems (from docs)
- Tutor (CustomGPT): "Trey's Study System" (external only; no local launcher).
- Anki (AnkiConnect): in active use; syncs card_drafts to Anki Desktop.
- Google Calendar/Tasks: in active use; OAuth via Calendar page; config in brain/data/api_config.json.

## UI/UX (Retro Arcade)
- Theme: high-contrast red and black, no glow, consistent across pages.
- Typography: font-arcade headers, font-terminal body.
- Components: 2px solid red borders; semi-transparent black backgrounds.

## Post-Implementation Checklist (MANDATORY after any code change)

Canonical steps: `docs/root/GUIDE_DEV.md` section "Frontend Build + Sync".

Quick summary:
1. Build: `cd dashboard_rebuild && npm run build`
2. Sync: `robocopy dashboard_rebuild/dist/public brain/static/dist /MIR`
3. Never use dev server. Dashboard served via Start_Dashboard.bat on port 5000.
4. Tests: `pytest brain/tests/`
5. Update relevant docs (see Feature->Doc table in docs/README.md).

Skip 1-2 for backend-only changes.

## Rules
1. Plan before coding for any non-trivial change.
2. dashboard_rebuild is frontend-only; API lives in brain/.
3. Only serve the dashboard via Start_Dashboard.bat on port 5000. Do not run a separate dev server or python brain/dashboard_web.py directly.
4. After frontend changes: rebuild and copy dist/public -> brain/static/dist. (See Post-Implementation Checklist above.)
5. Check `permissions.json` (repo root) before executing new shell commands.
6. Update CONTINUITY.md after every significant change (append only).
7. Push to remote after every change (auto).
8. After code changes, run relevant checks by default (pytest brain/tests/; frontend build already required).
9. Do not edit archive/ unless explicitly requested.
10. Do not edit brain/static/dist/ except when copying a new build output.
11. No destructive commands (e.g., reset --hard, clean, rm) unless explicitly requested.
12. Auto-commit after changes; use a conventional commit message if none is provided.
13. Safe-by-default git: check status/diff before edits.
14. Check conductor/tracks.md before starting major work — active tracks take priority.

## Learnings

### Project Location
The project root is `C:\pt-study-sop`. All dashboard_rebuild/ and brain/ paths are relative to this root.

### React Hooks in calendar.tsx
Never place `useSensors`, `useSensor`, or any `use*` hook inside JSX or callbacks. Always declare at the top level of `CalendarPage()`. This was a bug introduced when adding DnD to the manage calendars dialog.

### Calendar Filtering
When filtering Google events by `selectedCalendars`, always use `event.calendarId || ''` — never rely on a truthy check on `calendarId` since some events have undefined/empty calendarId and would bypass the filter.

### Build & Deploy
After frontend changes, run `npm run build` in `dashboard_rebuild/`, then copy `dist/public/` to `brain/static/dist/`. The Flask server serves static files from there. Without this step, changes won't appear in the browser. NEVER run `npm run dev` or `vite dev` — always build and copy. See Post-Implementation Checklist above.

### localStorage in React useState Initializers
When initializing state from `localStorage` with `JSON.parse`, always wrap in try/catch and validate the parsed type (e.g. `Array.isArray`). Corrupted or stale localStorage data will crash the component on mount otherwise.
```ts
const [state, setState] = useState<T>(() => {
  try {
    const saved = localStorage.getItem("key");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return new Set(parsed); // validate shape
    }
  } catch { /* corrupted — fall through */ }
  return defaultValue;
});
```

### Persist Actions Need Visual Feedback
Any button that saves state without navigating or closing a modal MUST have visual feedback: (1) a toast notification confirming the action, and (2) a status indicator (green dot = saved, red dot = unsaved changes) using a dirty state flag.

### SOP Library Is Source of Truth
The 75 original SOP files were consolidated into library files at `sop/library/` (00-14). Originals were archived to `sop/archive/`. The library is the sole source of truth for SOP content. `sop/runtime/` exists but is generated output (do not edit it directly). Do not reference `sop/src/` or `sop/examples/` (archived Jan 2026).

### Codex MCP Cannot Review Inline Diffs
Codex MCP's `ask-codex` ignores full diff/code embedded in the prompt and asks for a repo path instead. When the repo isn't reachable by Codex, do the code review manually using the standard checklist (bugs, edge cases, security, performance, type correctness).

## Detailed Guidelines
- Project Workflow: conductor/workflow.md
- Conductor Tracks: conductor/tracks.md

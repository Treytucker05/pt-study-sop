# Product Guidelines (PT Study OS)

These guidelines constrain decisions, implementation, and manual verification plans when using the Conductor workflow in this repo.

## Core principles

- Truth over completeness: do not invent data to "fill" a field or log.
- Local-first: assume single-user, local machine, local DB (`brain/data/pt_study.db`).
- Human-in-the-loop for external writes: changes to external systems (Calendar, Obsidian, etc.) must be preview-first and explicitly approved.

## Safety and repo rules (agent-facing)

- Keep changes minimal and scoped. Avoid broad refactors unless explicitly in-scope for the current track.
- Prefer ASCII in new/edited files unless the file already uses Unicode.
- Do not edit `archive/` unless explicitly requested.
- Avoid destructive commands (delete/reset/clean). If a destructive action is required, stop and ask for explicit confirmation.
- After significant changes, append a dated entry to `CONTINUITY.md` (append-only).

## Dashboard build/serve constraints

- The dashboard is served via `Start_Dashboard.bat` on port 5000.
- Do not run a separate frontend dev server (`npm run dev` / Vite dev server).
- After frontend changes: `npm run build` in `dashboard_rebuild/`, then copy `dashboard_rebuild/dist/public` -> `brain/static/dist/`.

## Verification expectations

- Always run the relevant automated tests before marking a task complete:
  - Backend: `python -m pytest brain/tests`
- If a change is user-facing, provide a concrete manual verification checklist with expected outcomes.


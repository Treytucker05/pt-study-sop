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
- After significant changes: update the active track's plan.md (task status + commit SHA).
  For changes outside a named track, append to `conductor/tracks/GENERAL/log.md`.

## Dashboard build/serve constraints

See `docs/root/GUIDE_DEV.md` for canonical build + sync workflow.
- Dashboard served via `Start_Dashboard.bat` on port 5000.
- Do not run a separate frontend dev server.

## Verification expectations

- Always run the relevant automated tests before marking a task complete:
  - Backend: `python -m pytest brain/tests`
- If a change is user-facing, provide a concrete manual verification checklist with expected outcomes.


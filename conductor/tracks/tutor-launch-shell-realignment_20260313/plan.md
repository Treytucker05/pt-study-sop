# Implementation Plan: Tutor Launch / Shell Realignment Cleanup

**Track ID:** tutor-launch-shell-realignment_20260313  
**Spec:** [./spec.md](./spec.md)  
**Created:** 2026-03-13  
**Status:** Complete

## Goal

Replace the active Tutor wizard model with the recovered shell model while cleaning the repo so only the newest planning remains active.

## Phase 0: Track bootstrap and planning truth

- [x] `TLR-001` Create the durable track artifacts and register the work in:
  - `conductor/tracks.md`
  - `docs/root/TUTOR_TODO.md`
  - `docs/root/AGENT_BOARD.md`
  - `conductor/tracks/GENERAL/log.md`

## Phase 1: Planning/contract cleanup

- [x] `TLR-010` Sync stale track artifacts:
  - `conductor/tracks/course-keyed-tutor-shell_20260313/spec.md`
  - `conductor/tracks/brain-centered-triad_20260312/open-questions.md`
  - `conductor/tracks/tutor-10-certification_20260307/session-authority.md`
- [x] `TLR-020` Mark pre-shell docs as historical:
  - `docs/audit/TUTOR_FULL_AUDIT.md`
  - `docs/archive/TUTOR_DIVE_READINESS_AUDIT_2026-03-12.md`
  - `docs/TUTOR_ARCHITECTURE.md`
  - `docs/REPO_ORIENTATION.md`
  - `docs/dashboard/DASHBOARD_WINDOW_INVENTORY.md`

## Phase 2: Launch-state authority

- [x] `TLR-100` Move Tutor startup precedence into `dashboard_rebuild/client/src/lib/tutorClientState.ts` and stop relying on wizard-era global state.
- [x] `TLR-110` Replace `TutorWizard` with `TutorStartPanel`.
- [x] `TLR-120` Update Tutor shell tests and mocks to assert start-panel behavior instead of wizard behavior.

## Phase 3: Mode-level UX cleanup

- [x] `TLR-200` Make Studio mode Inbox-first.
- [x] `TLR-210` Make Schedule mode next-action first.
- [x] `TLR-220` Make Publish mode a readiness workflow.

## Phase 4: Reference-doc sync and closeout

- [x] `TLR-300` Rewrite active docs to match the shipped shell/start-panel model:
  - `README.md`
  - `docs/root/PROJECT_ARCHITECTURE.md`
  - `docs/root/GUIDE_DEV.md`
- [x] `TLR-900` Run the integrated gate, record results, and close the track.

## Closeout notes

- `TLR-100` to `TLR-120` shipped the start-panel transition:
  - `dashboard_rebuild/client/src/lib/tutorClientState.ts`
  - `dashboard_rebuild/client/src/pages/tutor.tsx`
  - `dashboard_rebuild/client/src/components/TutorStartPanel.tsx`
  - targeted Tutor frontend and backend regression coverage
- `TLR-200` to `TLR-220` were satisfied by the existing shell-mode implementation and verified during closeout:
  - `TutorStudioMode.tsx` now presents Studio as an Inbox/promote workspace
  - `TutorScheduleMode.tsx` is course-keyed and next-action oriented
  - `TutorPublishMode.tsx` stages readiness around Obsidian status, pending drafts, and promoted resources
- `TLR-300` synced the active docs to the shipped model in:
  - `README.md`
  - `docs/root/GUIDE_DEV.md`
  - `docs/root/PROJECT_ARCHITECTURE.md`
  - historical pre-shell docs now point back to `README.md` and `docs/root/PROJECT_ARCHITECTURE.md`
- `TLR-900` verification passed on 2026-03-14:
  - backend targeted pytest gate
  - frontend targeted test matrix
  - `npm run check`
  - `npm run build`
  - `python scripts/check_docs_sync.py`
  - live smoke via `Start_Dashboard.bat` + `python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000`

## Dependency graph

`TLR-001 -> TLR-010 -> TLR-020`  
`TLR-001 -> TLR-100 -> TLR-110 -> TLR-120 -> TLR-200 -> TLR-210 -> TLR-220 -> TLR-300 -> TLR-900`  
`TLR-100 -> TLR-300`  
`TLR-110 -> TLR-900`

## First unblocked wave

Track closed 2026-03-14. No open execution tasks remain in this plan.

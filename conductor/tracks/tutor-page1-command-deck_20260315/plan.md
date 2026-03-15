# Implementation Plan: Tutor Page 1 Command Deck

**Track ID:** tutor-page1-command-deck_20260315  
**Spec:** [./spec.md](./spec.md)  
**Created:** 2026-03-15  
**Status:** Complete

## Goal

Ship a responsive `DashBoard` first-page command deck backed by a real hub API and working CTA handoffs into Studio, Schedule, and Library while keeping `Tutor` as the live study surface.

## Phase 0: Track bootstrap

- [x] `TPCD-001` Register the work in:
  - `docs/root/TUTOR_TODO.md`
  - `docs/root/AGENT_BOARD.md`
  - `conductor/tracks.md`
  - `conductor/tracks/tutor-page1-command-deck_20260315/`

## Phase 1: Backend hub contract

- [x] `TPCD-100` Add `GET /api/tutor/hub` in `brain/dashboard/api_tutor_projects.py`.
- [x] `TPCD-110` Extend Tutor client/types for the new hub payload in:
  - `dashboard_rebuild/client/src/api.ts`
  - `dashboard_rebuild/client/src/api.types.ts`
- [x] `TPCD-120` Add backend contract coverage in `brain/tests/test_tutor_project_shell.py`.

## Phase 2: Tutor Page 1 responsive shell

- [x] `TPCD-200` Replace the shell's first-page root surface with a dedicated responsive `DashBoard` command deck in:
  - `dashboard_rebuild/client/src/pages/tutor.tsx`
  - `dashboard_rebuild/client/src/components/TutorCommandDeck.tsx`
- [x] `TPCD-210` Add responsive layout, compact study-wheel snapshot, and collapsed launch settings without changing deeper Tutor responsibilities.

## Phase 3: CTA wiring and validation

- [x] `TPCD-300` Add Page 1 CTA launch contracts:
  - focused schedule intent in `TutorScheduleMode`
  - Library handoff consumption in `library.tsx`
  - Studio L2 entry targeting in `TutorStudioMode`
  - state helpers in `tutorClientState.ts`
- [x] `TPCD-310` Add/update targeted frontend tests for Page 1, schedule intent, and library handoff.
- [x] `TPCD-900` Run validation, update track artifacts, and close the track.

## Dependency Graph

`TPCD-001 -> TPCD-100 -> TPCD-110 -> TPCD-120`  
`TPCD-110 -> TPCD-200 -> TPCD-210 -> TPCD-300 -> TPCD-310 -> TPCD-900`  
`TPCD-120 -> TPCD-900`

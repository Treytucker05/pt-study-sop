# Implementation Plan: Studio L2/L3 Hub + Review Loop

**Track ID:** studio-l2-l3-hub-review-loop_20260315  
**Spec:** [./spec.md](./spec.md)  
**Created:** 2026-03-15  
**Status:** Complete

## Goal

Make Studio L2 a course-native prep hub backed by a dedicated overview API, then harden Studio L3 into a real review workspace with edit/archive/history actions while preserving the current Tutor shell and entry semantics.

## Phase 0: Track bootstrap

- [x] `SCLR-001` Register the work in:
  - `docs/root/TUTOR_TODO.md`
  - `docs/root/AGENT_BOARD.md`
  - `conductor/tracks.md`
  - `conductor/tracks/studio-l2-l3-hub-review-loop_20260315/`

## Phase 1: Studio overview backend and client contract

- [x] `SCLR-100` Add `GET /api/tutor/studio/overview` in `brain/dashboard/api_tutor_studio.py`.
- [x] `SCLR-110` Extend Tutor client/types/contracts for the overview payload in:
  - `dashboard_rebuild/client/src/api.ts`
  - `dashboard_rebuild/client/src/api.types.ts`
  - `dashboard_rebuild/client/src/__tests__/api.test.ts`
- [x] `SCLR-120` Add backend contract coverage in `brain/tests/test_tutor_studio.py`.

## Phase 2: Studio L2 course hub

- [x] `SCLR-200` Refactor `StudioClassDetail.tsx` to render MATERIALS, OBJECTIVES, CARDS & TESTS, VAULT, and STATS from the overview payload while keeping `CHAINS` on the existing chains API.
- [x] `SCLR-210` Add/update targeted frontend tests for Studio L2 and route integration.

## Phase 3: Studio L3 review loop

- [x] `SCLR-300` Add Studio item update/history endpoints and archived-item restore semantics in `brain/dashboard/api_tutor_studio.py`.
- [x] `SCLR-310` Extend Tutor client/types/contracts for Studio edit/history actions.
- [x] `SCLR-320` Refactor `TutorStudioMode.tsx` to support inline edit, boarded/archive actions, and revision history without changing the existing shell layout.
- [x] `SCLR-330` Add/update targeted L3 frontend/backend tests.

## Phase 4: Validation and closeout

- [x] `SCLR-900` Run validation, sync README/track docs, and close the track.

## Dependency Graph

`SCLR-001 -> SCLR-100 -> SCLR-110 -> SCLR-120 -> SCLR-200 -> SCLR-210`  
`SCLR-100 -> SCLR-300 -> SCLR-310 -> SCLR-320 -> SCLR-330 -> SCLR-900`  
`SCLR-210 -> SCLR-900`

## First Unblocked Wave

- `SCLR-001`
- `SCLR-100`
- `SCLR-110`
- `SCLR-120`
- `SCLR-200`
- `SCLR-210`

## Progress Notes

- 2026-03-15: Phase 0 through Phase 2 shipped and validated. Required checks passed:
  - `pytest brain/tests/test_tutor_studio.py -q`
  - `cd dashboard_rebuild && npm run test -- client/src/__tests__/api.test.ts client/src/components/__tests__/StudioClassDetail.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/TutorStudioMode.test.tsx`
  - `cd dashboard_rebuild && npm run build`
- 2026-03-15: Live `/tutor?mode=studio` proof initially failed because the stale `dashboard_web.py` process on port 5000 was still serving the old route map. Restarting via `Start_Dashboard.bat` fixed the live proof and confirmed the overview-backed L2 flow.
- 2026-03-15: Phase 3 and Phase 4 shipped and validated. Studio items now support update/history/archive semantics, `TutorStudioMode.tsx` exposes inline edit plus board/archive/history actions, and the required checks passed:
  - `pytest brain/tests/test_tutor_studio.py -q`
  - `cd dashboard_rebuild && npm run test -- client/src/__tests__/api.test.ts client/src/components/__tests__/TutorStudioMode.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live `/tutor?mode=studio` proof after restarting the stale `dashboard_web.py` process, including real UI validation of edit, revision history, archive, and mark-boarded actions

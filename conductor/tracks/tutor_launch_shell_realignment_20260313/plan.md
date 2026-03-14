# Track Plan: Tutor Launch / Shell Realignment

Created: 2026-03-13
Status: Complete

## Goal

Create one clear current Tutor launch model:

- Brain owns launch
- `/tutor` is the live workspace
- Tutor startup is a thin start/resume surface, not the old broad wizard

## Tasks

- [x] TLR-001 Lay the plan out durably in the repo.
- [x] TLR-010 Sync stale planning references to the actual current repo slice.
  - The later-branch track files named in the original shell-realignment plan are absent in this branch.
  - Durable planning authority for this cleanup is therefore:
    - `conductor/tracks/tutor_launch_shell_realignment_20260313/*`
    - `docs/root/TUTOR_TODO.md`
  - Updated active board wording so older `wizard` references read as legacy/start-surface language instead of current runtime authority.

- [x] TLR-020 Mark the remaining wizard-era inventory references as historical or superseded.
  - Updated:
    - `docs/dashboard/DASHBOARD_WINDOW_INVENTORY.md`
    - `docs/root/TUTOR_CONTROL_PLANE_CANON.md`
  - Validation:
    - `rg -n "TutorStartPanel|legacy start surface|historical|superseded" docs/dashboard/DASHBOARD_WINDOW_INVENTORY.md docs/root/TUTOR_CONTROL_PLANE_CANON.md docs/root/TUTOR_TODO.md`

- [x] TLR-100 Lock launch authority in the current frontend.
  - Added `dashboard_rebuild/client/src/lib/tutorClientState.ts`
  - Added course-scoped Tutor start state
  - Stopped using stale wizard state as startup authority
  - Made Library launch Tutor with explicit `course_id` when available
  - Blocked ambiguous multi-course Tutor launch from Library
  - Validation:
    - `npm run test -- client/src/lib/__tests__/tutorClientState.test.ts client/src/components/__tests__/TutorWizard.test.tsx`
    - `npm run build`
  - Commits:
    - `0762b6a6` `refactor: derive tutor launch state from shell context`
    - `fedc68b0` `test: unblock tutor pre-push gates`

- [x] TLR-110 Replace `TutorWizard` with a thin `TutorStartPanel`.
  - Remove the default `COURSE -> CHAIN -> START` step model
  - Keep launch summary, resume/new session, readiness/preflight, and advanced launch options
  - Validation:
    - `npm run test -- client/src/components/__tests__/TutorStartPanel.test.tsx client/src/lib/__tests__/tutorClientState.test.ts client/src/components/__tests__/TutorChat.test.tsx`
    - `npm run build`

- [x] TLR-120 Rework Tutor launch tests around the start-panel model.
  - Added page-level launch-precedence coverage in `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
  - Covered:
    - explicit `course_id` launch beats stale active-session restore
    - Library handoff beats stale active-session restore
    - active-session restore without explicit launch enters chat
    - current-course fallback hydrates the start surface
  - Fixed two runtime behaviors exposed by the new tests:
    - selected-material persistence now waits until launch hydration completes
    - successful resume hides setup only after the session payload loads
  - Validation:
    - `npm run test -- client/src/pages/__tests__/tutor.test.tsx client/src/components/__tests__/TutorStartPanel.test.tsx client/src/components/__tests__/TutorChat.test.tsx client/src/lib/__tests__/tutorClientState.test.ts`
    - `npm run build`

- [x] TLR-200 Make Tutor startup and surrounding UI more trustworthy and learner-first.
  - Material-scoped Library launches now count as valid launch scope in readiness copy.
  - Recent sessions now highlight the active/last session with an explicit primary resume action.
  - Secondary recent sessions now show status/time metadata with explicit resume controls.
  - The top-toolbar `CHAT` control is now hidden until an active session exists, removing the no-session dead end.
  - Validation:
    - `npm run test -- client/src/pages/__tests__/tutor.test.tsx client/src/components/__tests__/TutorStartPanel.test.tsx client/src/components/__tests__/TutorChat.test.tsx client/src/lib/__tests__/tutorClientState.test.ts`
    - `npm run build`

- [x] TLR-210 Rework Schedule mode to be next-action-first if/when that surface exists in this repo slice.
  - Not applicable in this repo slice.
  - No Tutor `Schedule` shell mode exists on this branch, so there was no shipped surface to rework without inventing net-new UI outside the grounded scope of this track.

- [x] TLR-220 Rework Publish mode to be readiness-first if/when that surface exists in this repo slice.
  - Not applicable in this repo slice.
  - No Tutor `Publish` shell mode exists on this branch, so there was no shipped surface to rework without inventing net-new UI outside the grounded scope of this track.

- [x] TLR-300 Rewrite active docs so they stop describing Tutor as wizard-led.
  - Updated:
    - `docs/root/GUIDE_TUTOR_FLOW.md`
    - `docs/root/PROJECT_ARCHITECTURE.md`
    - `docs/root/GUIDE_USER.md`
  - Validation:
    - `rg -n "Tutor Wizard|wizard, chat, artifacts|return to wizard|Wizard page|Chain page|Start page" docs/root/GUIDE_TUTOR_FLOW.md docs/root/PROJECT_ARCHITECTURE.md docs/root/GUIDE_USER.md`
    - `rg -n "Brain.*launch|/tutor|start/resume surface|TutorStartPanel|start surface" docs/root/GUIDE_TUTOR_FLOW.md docs/root/PROJECT_ARCHITECTURE.md docs/root/GUIDE_USER.md`

- [x] TLR-900 Run the integrated gate, close the track, and leave one clear current plan.
  - Validation:
    - `python -m pytest brain/tests -q`
      - Result: `847 passed, 1 skipped`
    - `npm run test -- client/src/pages/__tests__/tutor.test.tsx client/src/components/__tests__/TutorStartPanel.test.tsx client/src/components/__tests__/TutorChat.test.tsx client/src/components/__tests__/TutorArtifacts.test.tsx client/src/lib/__tests__/tutorClientState.test.ts`
      - Result: `22 passed`
    - `npm run build`
      - Result: success
    - `powershell -ExecutionPolicy Bypass -File scripts/smoke_tutor_readonly.ps1`
      - Result: `6 passed, 0 failed`
    - `powershell -ExecutionPolicy Bypass -File scripts/smoke_golden_path.ps1`
      - Result: `5 passed, 0 failed`
  - Track closeout:
    - Brain-owned launch is now the durable startup model for this branch.
    - Tutor startup is a thin start/resume surface.
    - Later shell-mode tasks that were absent on this branch were explicitly closed as `N/A` instead of left half-active.

## Notes

- This repo does not currently contain the later shell-mode component set from the prior transcript.
- This repo also does not contain several stale track/doc paths named in the original cleanup plan; this track records the grounded replacements used on disk.
- Execution order therefore follows current on-disk code reality, not the stale later branch shape.

# Track Plan: Tutor Launch / Shell Realignment

Created: 2026-03-13
Status: Active

## Goal

Create one clear current Tutor launch model:

- Brain owns launch
- `/tutor` is the live workspace
- Tutor startup is a thin start/resume surface, not the old broad wizard

## Tasks

- [x] TLR-001 Lay the plan out durably in the repo.
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

- [ ] TLR-120 Rework Tutor launch tests around the start-panel model.

- [ ] TLR-200 Make Tutor startup and surrounding UI more trustworthy and learner-first.

- [ ] TLR-210 Rework Schedule mode to be next-action-first if/when that surface exists in this repo slice.

- [ ] TLR-220 Rework Publish mode to be readiness-first if/when that surface exists in this repo slice.

- [ ] TLR-300 Rewrite active docs so they stop describing Tutor as wizard-led.

- [ ] TLR-900 Run the integrated gate, close the track, and leave one clear current plan.

## Notes

- This repo does not currently contain the later shell-mode component set from the prior transcript.
- Execution order therefore follows current on-disk code reality, not the stale later branch shape.

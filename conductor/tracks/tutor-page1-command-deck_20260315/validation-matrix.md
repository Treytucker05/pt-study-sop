# Validation Matrix: Tutor Page 1 Command Deck

## Required

- `python -m pytest brain/tests/test_tutor_project_shell.py -q`
- `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx client/src/pages/__tests__/library.test.tsx client/src/components/__tests__/TutorScheduleMode.test.tsx client/src/components/__tests__/TutorStudioMode.test.tsx client/src/lib/__tests__/tutorClientState.test.ts client/src/__tests__/api.test.ts`
- `cd dashboard_rebuild && npm run build`

## Executed Results

- `python -m pytest brain/tests/test_tutor_project_shell.py -q` -> PASS (`13 passed`)
- targeted vitest command above -> PASS (`7 passed` files, `210 passed` tests)
- `cd dashboard_rebuild && npm run build` -> PASS

## UI Smoke Coverage

- `client/src/pages/__tests__/tutor.test.tsx` verifies `/tutor` lands on `DashBoard`, `Tutor` stays live-study only, `Resume` restores the expected path, and Page 1 schedule/material CTAs dispatch correctly.
- `client/src/pages/__tests__/tutor.workspace.integration.test.tsx` verifies `Open Project` lands on the Studio L2 path instead of the old direct workspace jump.
- `client/src/pages/__tests__/library.test.tsx` verifies `Load Materials` opens Library with the course-scoped intake state preselected.
- `client/src/components/__tests__/TutorScheduleMode.test.tsx` verifies event/course launch intent focus inside Tutor Schedule.
- `client/src/components/__tests__/TutorStudioMode.test.tsx` verifies explicit Studio L2 entry requests.

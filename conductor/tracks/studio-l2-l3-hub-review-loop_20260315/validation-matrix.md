# Validation Matrix: Studio L2/L3 Hub + Review Loop

## L2 Wave

- Backend contract:
  - `pytest brain/tests/test_tutor_studio.py -q`
- Frontend contract/UI:
  - `cd dashboard_rebuild && npm run test -- client/src/__tests__/api.test.ts client/src/components/__tests__/StudioClassDetail.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
- Build:
  - `cd dashboard_rebuild && npm run build`
- Live proof:
  - `Start_Dashboard.bat`
  - `http://127.0.0.1:5000/tutor?mode=studio`
  - verify `Open Project` still lands in L2
  - verify MATERIALS, OBJECTIVES, CARDS & TESTS, VAULT, and STATS render from the overview contract

### L2 Result (2026-03-15)

- PASS `pytest brain/tests/test_tutor_studio.py -q`
- PASS `cd dashboard_rebuild && npm run test -- client/src/__tests__/api.test.ts client/src/components/__tests__/StudioClassDetail.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
- PASS `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/TutorStudioMode.test.tsx`
- PASS `cd dashboard_rebuild && npm run build`
- PASS live proof at `http://127.0.0.1:5000/tutor?mode=studio`
  - initial browser check exposed a stale `dashboard_web.py` process on port 5000 that was still returning `404` for `/api/tutor/studio/overview`
  - restarting via `Start_Dashboard.bat` brought the updated route online
  - final live proof confirmed `course_id=4` loads the overview-backed L2 page and renders the MATERIALS tab content correctly

## L3 Wave

- Backend contract:
  - `pytest brain/tests/test_tutor_studio.py -q`
- Frontend contract/UI:
  - `cd dashboard_rebuild && npm run test -- client/src/__tests__/api.test.ts client/src/components/__tests__/TutorStudioMode.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
- Build:
  - `cd dashboard_rebuild && npm run build`
- Live proof:
  - verify edit, boarded/archive actions, and history work in Studio L3
  - verify existing promote flows still invalidate correctly

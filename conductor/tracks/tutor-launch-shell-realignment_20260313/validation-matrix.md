# Validation Matrix: Tutor Launch / Shell Realignment Cleanup

## Planning and docs

- `rg -n "tutor-launch-shell-realignment_20260313" conductor/tracks.md docs/root/TUTOR_TODO.md docs/root/AGENT_BOARD.md`
- `rg -n "historical|pre-shell|wizard-led|superseded by" docs/audit/TUTOR_FULL_AUDIT.md docs/root/TUTOR_DIVE_READINESS_AUDIT_2026-03-12.md docs/TUTOR_ARCHITECTURE.md docs/REPO_ORIENTATION.md docs/dashboard/DASHBOARD_WINDOW_INVENTORY.md`

## Backend

- `python -m pytest brain/tests/test_tutor_project_shell.py brain/tests/test_tutor_session_linking.py brain/tests/test_tutor_artifact_certification.py brain/tests/test_tutor_audit_remediation.py brain/tests/test_tutor_turn_stream_contract.py brain/tests/test_dashboard_routes.py -q`

## Frontend targeted

- `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/brain.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/pages/__tests__/library.test.tsx client/src/components/__tests__/TutorStartPanel.test.tsx client/src/components/__tests__/TutorStudioMode.test.tsx client/src/components/__tests__/TutorScheduleMode.test.tsx client/src/components/__tests__/TutorPublishMode.test.tsx client/src/components/__tests__/TutorChat.test.tsx client/src/components/__tests__/TutorArtifacts.test.tsx client/src/components/__tests__/TutorWorkspaceSurface.test.tsx client/src/components/__tests__/TutorWorkspaceSurface.integration.test.tsx client/src/components/__tests__/TutorWorkspaceSurface.notes.test.tsx client/src/lib/__tests__/tutorClientState.test.ts client/src/__tests__/api.test.ts`
- `cd dashboard_rebuild && npm run check`
- `cd dashboard_rebuild && npm run build`

## Live smoke

- `cmd /c C:\\pt-study-sop\\Start_Dashboard.bat`
- `python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000`

## Final grep guard

- `rg -n "dashboard\\.tsx|Vite dev|text-embedding-3-small|Tutor Wizard" docs dashboard_rebuild/README.md docs/root`
- `git diff --check`

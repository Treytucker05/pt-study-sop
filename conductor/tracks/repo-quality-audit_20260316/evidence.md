# Evidence - Repo-Wide Quality Audit Backlog

## Shared Validation

- Startup:
  - `Start_Dashboard.bat` relaunched the canonical app and `http://127.0.0.1:5000/api/brain/status` returned `200` with `{"ok": true, ...}`.
- Frontend tests:
  - `cd dashboard_rebuild && npm run test` failed.
  - Failing suites observed in the shared run:
    - `client/src/components/__tests__/TutorStudioMode.test.tsx`
    - `client/src/components/__tests__/StudioClassPicker.test.tsx`
    - `client/src/components/__tests__/TutorWorkspaceSurface.notes.test.tsx`
    - `client/src/components/__tests__/TutorWorkspaceSurface.integration.test.tsx`
    - `client/src/components/__tests__/StudioPrepMode.test.tsx`
    - `client/src/pages/__tests__/methods.test.tsx`
    - `client/src/pages/__tests__/scholar.test.tsx`
    - `client/src/pages/__tests__/library.test.tsx`
    - `client/src/pages/__tests__/brain.test.tsx`
    - `client/src/pages/__tests__/tutor.test.tsx`
    - `client/src/pages/__tests__/mastery.test.tsx`
  - Common signals:
    - multiple route/state regressions on Brain, Tutor, Methods, Library, Scholar, and Mastery
    - repeated `Window.scrollTo()` not implemented warnings in route-level tests
    - multiple React `act(...)` warnings around Studio/Tutor flows
- Backend tests:
  - `pytest brain/tests/` failed with `1 failed, 1070 passed, 1 skipped`.
  - Failing test:
    - `brain/tests/test_tutor_turn_stream_contract.py::test_send_turn_stream_emits_sse_heartbeat_comments_while_waiting`
  - Failure summary:
    - SSE heartbeat comments (`:\n\n`) were expected while waiting on streamed Tutor output but were absent from the emitted stream.
- Harness:
  - Direct `Eval` invocations for `app-live-golden-path`, `tutor-live-readonly`, and `method-integrity-smoke` failed with `eval.missing_run_metadata`, confirming the scenarios require prior `ArtifactRoot/run.json`.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Run -Profile Live -Port 5127 -ArtifactRoot $env:TEMP\pt-harness-artifacts-rqa -DataRoot $env:TEMP\pt-harness-data-rqa -NoBrowser -SkipUiBuild -Json` failed.
  - Live harness run failure summary:
    - isolated server booted and listed routes
    - readiness probe repeatedly hit `GET /brain` on port `5127`
    - the isolated live run never became ready because `/brain` returned `404`

## Browser Evidence

- pending

## API And Contract Evidence

- pending

## Notes

- Use this file for shared evidence only.
- Per-shard findings belong in `audit/RQA-*.md`.

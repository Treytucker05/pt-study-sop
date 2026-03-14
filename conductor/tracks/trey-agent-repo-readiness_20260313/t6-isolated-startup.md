# T6 Isolated Startup Notes

**Track ID:** trey-agent-repo-readiness_20260313  
**Task:** `T6`  
**Completed:** 2026-03-14

## What shipped

- Added repo-local harness runner: `scripts/harness.ps1`
- Added harness-aware path precedence in `brain/config.py`
- Added host and port overrides in `brain/dashboard_web.py`
- Added focused startup coverage in `brain/tests/test_harness_startup.py`

## Verification

- `pytest brain/tests/test_harness_startup.py`
  - result: `3 passed`
- Operator launch:
  - command: `cmd /c "set SKIP_UI_BUILD=1 && call Start_Dashboard.bat"`
  - result: `http://127.0.0.1:5000/brain` returned `200`
- Harness launch:
  - command shape: `powershell -NoProfile -ExecutionPolicy Bypass -File C:\pt-study-sop\scripts\harness.ps1 -Mode Run -Profile Hermetic -Port <free-port> -DataRoot %TEMP%\harness-coexistence-data -ArtifactRoot %TEMP%\harness-coexistence-artifacts -NoBrowser -SkipUiBuild`
  - result: `http://127.0.0.1:62702/brain` returned `200`
  - metadata: `%TEMP%\harness-coexistence-artifacts\run.json`
- Coexistence proof:
  - `http://127.0.0.1:5000/brain` and `http://127.0.0.1:62702/brain` both returned `200` concurrently
  - harness metadata confirmed the isolated DB and log roots lived under `%TEMP%\harness-coexistence-data` and `%TEMP%\harness-coexistence-artifacts`
  - terminating the harness process left the operator launch on `5000` healthy

## Relevant notes

- The harness readiness probe needed a Windows PowerShell compatibility fix:
  - `Invoke-WebRequest` without `-UseBasicParsing` could throw after a successful HTML response, which made the launcher report failure even while the server was healthy.
- `Start_Dashboard.bat` still started the dashboard correctly, but the batch output included:
  - `ERROR: Input redirection is not supported, exiting the process immediately.`
  - In this verification pass, that message did not break the operator server on `5000`.
- `Start_Dashboard.bat` was left as the operator-default path.
- The isolated harness run writes only its own temp data root and artifact root; it does not reuse the repo DB path during the verified hermetic launch.

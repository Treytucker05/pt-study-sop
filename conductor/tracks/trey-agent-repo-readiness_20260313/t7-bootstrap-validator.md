# T7 Bootstrap Validator

Date: 2026-03-14
Task: `T7`

## What shipped

- Added `Bootstrap` mode to `scripts/harness.ps1`.
- Added deterministic bootstrap exit codes and JSON output for:
  - `bootstrap.missing_python`
  - `bootstrap.missing_node_toolchain`
  - `bootstrap.missing_live_env`
  - `bootstrap.missing_backend_env_template`
  - `bootstrap.missing_fixture_assets`
  - `bootstrap.missing_repo_root`
- Added backend env template: `brain/.env.example`
- Added bootstrap-only hermetic fixture manifest: `brain/tests/fixtures/harness/manifest.json`
- Added focused regression coverage: `brain/tests/test_harness_bootstrap.py`

## Verification

- `python -m pytest brain/tests/test_harness_bootstrap.py -q`
- `python -m pytest brain/tests/test_harness_startup.py -q`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/harness.ps1 -Mode Bootstrap -Profile Hermetic -Json`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/harness.ps1 -Mode Bootstrap -Profile Live -Json`
- `python scripts/check_docs_sync.py`
- `git diff --check`

## Notes

- `brain/.env.example` is now the repo-local backend template required by the frozen contract.
- The hermetic fixture bundle is intentionally minimal at this stage. `T8` expands it into a real Tutor fixture scenario.
- The validator is repo-local and shell-driven, so the same command shape works for Claude, Codex, Gemini, Cursor, OpenCode, and other shell-capable agents.

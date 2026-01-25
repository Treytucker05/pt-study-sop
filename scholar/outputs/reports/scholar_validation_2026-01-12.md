# Scholar Validation and Tests (2026-01-12)

## Existing Checks
- `python -m pytest brain/tests`
- `python scripts/release_check.py`

## Missing Tests
- No Scholar-specific unit tests for workflow or output validation.
- No automated validation of output lane coverage vs manifest.

## Suggested Validation
- Add a lightweight check to compare `scholar/outputs/*` to `ai_artifacts_manifest.json`.
- Add smoke run that verifies orchestrator run creates expected files.

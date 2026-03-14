# T10-T12 Scenario Registry, Observability, And CI

Date: 2026-03-14

## Scope

- Finish `T10` by normalizing the remaining named harness scenarios.
- Finish `T11` by making success and failure runs inspectable through structured artifacts.
- Finish `T12` by wiring the shared harness contract into CI without adding a separate CI-only entrypoint.

## Landed

- Expanded `brain/tests/fixtures/harness/manifest.json` to a scenario registry with runner metadata for:
  - `tutor-hermetic-smoke`
  - `tutor-hermetic-coverage-scope`
  - `app-live-golden-path`
  - `tutor-live-readonly`
  - `method-integrity-smoke`
- Normalized the live/operator smoke scripts so they can run through `scripts/harness.ps1 -Mode Eval`:
  - `scripts/smoke_golden_path.ps1`
  - `scripts/smoke_tutor_readonly.ps1`
  - `scripts/method_integrity_smoke.py`
- Added structured root-level harness observability in `scripts/harness.ps1`:
  - `events.jsonl`
  - `command_started`
  - `command_completed`
  - `command_failed`
  - redacted failure details and failure artifact pointers
- Added regression coverage in `brain/tests/test_harness_eval.py` for:
  - passing live/operator registry execution
  - redacted `events.jsonl` inclusion in the report bundle
  - unknown-scenario failure diagnostics
  - failed live/operator scenario failure-artifact diagnostics
- Added the shared-contract CI lane in `.github/workflows/ci.yml`:
  - `harness_contract`
  - Windows runner
  - `Bootstrap -> Run -> Eval tutor-hermetic-smoke -> Report`
  - uploaded harness artifact bundle/output directory

## Verification

- `python -m pytest brain/tests/test_harness_eval.py -q`
- `python -m pytest brain/tests/test_harness_bootstrap.py brain/tests/test_harness_startup.py brain/tests/test_harness_eval.py -q`
- `python -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml', encoding='utf-8').read())"`
- local Windows harness lane:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/harness.ps1 -Mode Bootstrap -Profile Hermetic -Json`
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/harness.ps1 -Mode Run -Profile Hermetic -Port 5127 -DataRoot C:\pt-study-sop\.tmp\harness-ci-data -ArtifactRoot C:\pt-study-sop\.tmp\harness-ci-artifacts -NoBrowser -SkipUiBuild`
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/harness.ps1 -Mode Eval -Scenario tutor-hermetic-smoke -ArtifactRoot C:\pt-study-sop\.tmp\harness-ci-artifacts -Json`
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/harness.ps1 -Mode Report -RunId <run.json.run_id> -ArtifactRoot C:\pt-study-sop\.tmp\harness-ci-artifacts -Json`

## Relevant Note

- A broader Windows frontend CI lane was tested locally and left out of `T12`.
- Reason: the full `npm --prefix dashboard_rebuild run test` suite surfaced an unrelated intermittent failure in `client/src/components/__tests__/TutorWorkspaceSurface.notes.test.tsx`.
- That flake is real repo drift, but it is not part of the shared harness contract and would have made the new CI change knowingly red.

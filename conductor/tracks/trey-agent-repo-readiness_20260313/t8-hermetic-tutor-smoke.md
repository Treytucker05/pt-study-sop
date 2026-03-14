# T8 Hermetic Tutor Smoke

## Outcome

- Implemented the first real harness `Eval` scenario: `tutor-hermetic-smoke`.
- Added `scripts/tutor_hermetic_smoke.py` to seed an isolated Tutor course + material scope into the harness DB and exercise the HTTP lifecycle:
  - Tutor materials list
  - session create
  - two provider-free turn shortcuts
  - restore
  - summary
  - end
  - delete
- Added `brain/tests/fixtures/harness/tutor-hermetic-smoke.json` and expanded `brain/tests/fixtures/harness/manifest.json` into a real scenario bundle.
- Added `brain/tests/test_harness_eval.py` to prove `scripts/harness.ps1 -Mode Eval -Scenario tutor-hermetic-smoke` works against isolated run metadata.

## Hermetic guardrail

- Hermetic runs now set `PT_HARNESS_DISABLE_VAULT_CONTEXT=1`.
- `brain/tutor_context.py` honors that env flag and skips Obsidian note/vault retrieval during Tutor turn context assembly.
- Result: the first harness scenario does not depend on personal vault state or live provider credentials.

## Verification

- `python -m pytest brain/tests/test_harness_eval.py -q`
- `python -m pytest brain/tests/test_harness_bootstrap.py brain/tests/test_harness_startup.py brain/tests/test_harness_eval.py -q`
- manual harness loop:
  - `pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Run -Profile Hermetic -Port <free-port> -DataRoot <temp-data-root> -ArtifactRoot <temp-artifact-root> -NoBrowser -SkipUiBuild`
  - `pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Eval -Scenario tutor-hermetic-smoke -ArtifactRoot <temp-artifact-root> -Json`
  - stop the server with the `server_pid` recorded in `run.json`

## Artifact path

- Scenario result: `scenarios/tutor-hermetic-smoke/result.json`
- Turn SSE captures:
  - `scenarios/tutor-hermetic-smoke/turn-1.sse.txt`
  - `scenarios/tutor-hermetic-smoke/turn-2.sse.txt`

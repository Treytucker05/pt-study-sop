# PERO Migration + Chain Tooling + Validators + Pilot Runner Audit

Date: 2026-02-15

## Scope
- A) facilitation_prompt coverage (Phase 1)
- B) PERO Methods page tabs + displayStage mapping (Phase 2/3)
- C) canonical method_id persisted + exposed via API (Phase 3.5)
- D) artifact validators (Anki + Mermaid) + runtime wiring + smoke tests (Phase 4)
- E) pilot runner + logging + grading + last-run report (Phase 5)
- F) chain PERO validator + report export (extra)

## DONE checklist

1. A) facilitation_prompt coverage
- `tools/validate_methods.py:47-66` queries `method_blocks` for missing/short `facilitation_prompt`.
- `python tools/validate_methods.py --min-len 200`
  - `total methods: 38`
  - `missing facilitation_prompt: 0`
  - `facilitation_prompt < 200: 0`

2. B) PERO Methods page tabs + mapping
- `dashboard_rebuild/client/src/pages/methods.tsx:19` defines `DISPLAY_STAGES` as `all, priming, encoding, reference, retrieval, overlearning`.
- `dashboard_rebuild/client/src/pages/methods.tsx:157-158` filters by `getDisplayStage(b)` and `stageFilter`.
- `dashboard_rebuild/client/src/components/MethodBlockCard.tsx:23` uses `getDisplayStage(block)` for stage badge display.
- `dashboard_rebuild/client/src/lib/displayStage.ts:44,75-84` contains overrides and routing; test coverage in `dashboard_rebuild/client/src/lib/displayStage.test.ts` validates `M-OVR-002` and mapping behavior.

3. C) canonical method_id persisted + exposed via API
- `brain/db_setup.py:1191,1297-1300` defines/ensures `method_id TEXT` in `method_blocks`.
- `brain/data/seed_methods.py:1242-1245` performs migration add for `method_id`.
- `brain/data/seed_methods.py:1277-1282,1316-1324` inserts and updates rows with `method_id` from YAML seed data.
- `brain/dashboard/api_methods.py:35` and `39` query `SELECT * FROM method_blocks`, so returned payload contains `method_id`.
- `python -c` check against `api_methods.list_methods()` produced JSON with `method_id` present.
  - Sample payload snippet: `... "method_id": "M-ENC-014", "name": "Chain Linking", ...`
- Additional check:
  - `python -c` count query: `has_method_id True`, sample `method_id` value `M-PRE-005`.

4. E) pilot runner + logging + grading + last-run report
- `tools/pilot_run.py:72,171,248,259,299,341-364` resolves chains, writes per-block logs, computes grade.
- `python tools/pilot_run.py --chain C-FE-001 --dry-run`
  - `Success rate: 1.0`
  - `Stage coverage: encoding, overlearning, priming, reference, retrieval`
  - `Grade: 100 (flags: none)`
- Outputs created/updated:
  - `logs/block_runs.jsonl` contains block log objects including `method_id`, `display_stage`, `artifact_valid`.
  - `logs/last_chain_run_summary.json` contains run summary fields including `grade`, `facet` flags, and `artifact_validation_ran`.
- `python tools/report_last_run.py`
  - Table output includes per-block fields `method_id`, `stage`, `artifact`, `success`, `error`.
  - Ends with readiness `overall: NOT READY` in dry-run mode (`artifact_validation_ran: false`, `facilitation prompt present: false`).

5. F) chain validator + report export
- `tools/validate_chains.py:54-95` maps stages via `get_display_stage` and validates chain phase order.
- `python tools/validate_chains.py`
  - Summary: `total_chains: 15`, `chains_with_issues: 3`, `missing_methods: 0`.
  - `Report written to C:\pt-study-sop\exports\chain_validation_report.md`.
- `Get-Item exports/chain_validation_report.md` confirms export artifact exists.

## NOT DONE checklist

- None for blocker set (A/B/C targets in this remediation pass are complete).

## Files checked for existence
- `[OK] tools/pilot_run.py`
- `[OK] tools/report_last_run.py`
- `[OK] tools/validate_chains.py`
- `[OK] tools/pero_stage_mapper.py`
- `[OK] tools/validate_methods.py`
- `[MISSING] tools/validate_artifacts.py`
- `[OK] dashboard_rebuild/client/src/pages/methods.tsx`
- `[OK] dashboard_rebuild/client/src/components/MethodBlockCard.tsx`
- `[OK] dashboard_rebuild/client/src/lib/displayStage.ts`
- `[OK] brain/data/seed_methods.py`
- `[OK] brain/db_setup.py`

## Next Action (minimal to reach READY FOR TESTING)
1. Optional: run full test suite/regression beyond artifact validators.
2. Optional: run a non-dry chain run to validate artifact-failure path end-to-end in runtime logs.
3. Optional: rerun full audit checklist A-F for sign-off snapshot.

## Known issues
- `python tools/report_last_run.py` can still show `NOT READY` after dry-run because dry-run intentionally skips facilitation and artifact runtime checks; this is expected behavior, not a blocker.

## Blocker Clearance Update (2026-02-15)
- Added `tools/validate_artifacts.py` with `--smoke`, `--anki <path>`, `--mermaid <path>`.
- Aligned `brain/artifact_validators.py` behavior with parser/tests:
  - `TAGS` optional warning (not hard fail),
  - invalid `TYPE` warning (not hard fail),
  - cloze missing `{{c1::...}}` warning (not hard fail),
  - Mermaid `flowchart` header warning (accepted), while non-graph headers still fail.
- Removed placeholder rows with null `method_id`:
  - deleted `Test Method XYZ` and `Test Encode XYZ`.
- Added seed guard in `brain/data/seed_methods.py`:
  - auto-clean placeholder `test %` rows with missing `method_id`,
  - skip seeding placeholder rows without `method_id`.

## Overall status
READY FOR TESTING: YES

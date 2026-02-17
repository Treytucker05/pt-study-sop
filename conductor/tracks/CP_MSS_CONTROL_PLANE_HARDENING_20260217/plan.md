# Implementation Plan: CP-MSS Control-Plane Hardening

**Created:** 2026-02-17  
**Status:** In Progress

---

## Task Status

- [x] B0: Baseline checks (`validate_library`, export drift)
- [x] B1: Enforce required `control_stage` and backfill method YAMLs
- [x] B2: Enforce chain contract fields (`allowed_modes`, `gates`, `failure_actions`, `requires_reference_targets`) and backfill chains
- [x] B3: Enforce retrieval dependency safety and reorder violating chains
- [x] B4: First Exposure chain mode coverage hardening (`definition`, `classification`, `mechanism`, `computation`, `procedure`, `spatial`, `synthesis`, `recognition`)
- [x] B5: Deterministic selector policy module + tests
- [x] B6: Telemetry schema expansion for ErrorLog + compatibility handling
- [x] B7: Backend runtime wiring to emit selector metadata on live session rows
- [ ] B8: Pilot/readout packaging (`Final CP-MSS Spec v1.0`, evidence table, implementation deltas)

---

## Current Verification Snapshot

- `python sop/tools/validate_library.py` -> pass
- `python sop/tools/validate_library.py --strict` -> pass
- `pytest sop/tests/test_selector_policy.py sop/tests/test_validate_library.py` -> pass
- `python scripts/export_library_inventories.py` -> pass
- `python scripts/check_exports_drift.py` -> pass
- `pytest brain/tests/` -> 173 passed
- `npm run build` (dashboard_rebuild) -> clean

---

## B7 Implementation Details

**Files created:**
- `brain/selector_bridge.py` — Bridge between brain/ runtime and `sop/tools/selector_policy.py`
- `brain/tests/test_selector_bridge.py` — 17 tests covering contract, determinism, all 8 modes

**Files modified:**
- `brain/dashboard/api_tutor.py` — `_ensure_selector_columns()` migration, `create_session()` auto-selection, `end_session()` metadata propagation
- `brain/dashboard/api_adapter.py` — `_ensure_sessions_selector_cols()` migration, selector columns in all session SELECT queries, `serialize_session_row()` includes `selectorChainId`/`selectorPolicyVersion`

**DB schema additions:**
- `tutor_sessions`: +4 cols (`selector_chain_id`, `selector_score_json`, `selector_policy_version`, `selector_dependency_fix`)
- `sessions`: +2 cols (`selector_chain_id`, `selector_policy_version`)

---

## Execution Notes

- Keep `sop/library/` as canonical source of truth.
- Do not modify archived SOP sources.
- Update this plan and `conductor/tracks.md` with each significant status change.

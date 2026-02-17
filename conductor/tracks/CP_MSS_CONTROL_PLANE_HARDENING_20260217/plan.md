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
- [ ] B7: Backend runtime wiring to emit selector metadata on live session rows
- [ ] B8: Pilot/readout packaging (`Final CP-MSS Spec v1.0`, evidence table, implementation deltas)

---

## Current Verification Snapshot

- `python sop/tools/validate_library.py` -> pass
- `python sop/tools/validate_library.py --strict` -> pass
- `pytest sop/tests/test_selector_policy.py sop/tests/test_validate_library.py` -> pass
- `python scripts/export_library_inventories.py` -> pass
- `python scripts/check_exports_drift.py` -> pass

---

## Execution Notes

- Keep `sop/library/` as canonical source of truth.
- Do not modify archived SOP sources.
- Update this plan and `conductor/tracks.md` with each significant status change.

# Specification for Track: CP-MSS Control-Plane Hardening (Active)

## Objective
Finalize CP-MSS as a deterministic, auditable control-plane by enforcing canonical method/chain contracts, selector behavior, and telemetry requirements end-to-end.

## Scope

### In Scope
- Method and chain schema hardening (`control_stage`, chain contract fields, dependency safety).
- Deterministic selector policy implementation and tests.
- Canonical ErrorLog telemetry schema updates for routing and diagnostics.
- Runtime prompt/docs alignment with canonical control-plane and telemetry contracts.
- Export/report regeneration and drift validation.

### Out of Scope
- Topic-specific pedagogy changes.
- New method modules unless required for unresolved bottlenecks.
- UI redesign unrelated to control-plane contracts.

## Deliverables
- Deterministic selector module and tests in `sop/tools/` and `sop/tests/`.
- Updated canonical logging schema and templates in `sop/library/`.
- Validator enforcement for chain/method contracts and telemetry schema.
- Updated research/export packet that reflects canonical contracts.

## Success Criteria
- Validation passes with zero errors in strict mode.
- Selector tests and library validation tests pass.
- Export drift check reports no mismatches.
- Track plan remains current as tasks complete.

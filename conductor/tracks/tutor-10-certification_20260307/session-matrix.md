# Session Restore Matrix

## Scope

Certified session-restore behaviors in the current Tutor runtime:

- preflight is the only authority for scope-critical fields in certified mode
- create -> get round-trip preserves all scope truth in `content_filter`
- active session restore carries complete chat context

## Certification Matrix

| Case | Coverage | Assertion | Test | Status |
|---|---|---|---|---|
| C-SM-01 | Preflight authority (scope truth) | `/api/tutor/session` must use `preflight_id` bundle fields for scope (topic, objective_scope, focus_objective_id, material_ids, vault path) even if request body drifts. | `test_session_restore_matrix_01_preflight_scope_is_authoritative_for_create` | done |
| C-SM-02 | Restore round-trip | `/api/tutor/session/<id>` must return persisted, scope-correct `content_filter`, active status, and prior turns so resume path is deterministic. | `test_session_restore_matrix_02_get_session_round_trip_preserves_scoped_state` | done |

## Current Notes

- These matrix-backed tests are now in place and wired into the certification check harness.
- Remaining matrix work: add stale-key recovery and shell handoff precedence assertions in a follow-up pass.

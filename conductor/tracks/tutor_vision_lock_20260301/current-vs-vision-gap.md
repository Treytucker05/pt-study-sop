# Current vs Vision vs Gap

**Track:** `tutor_vision_lock_20260301`  
**Status:** Closed on 2026-03-13  
**Summary:** 7 keep, 1 change, 2 retire

| Surface | Intended behavior | Current behavior | Evidence | Disposition |
| --- | --- | --- | --- | --- |
| Global instruction base | Core Tutor rules must remain present even when custom instructions are configured. | Prompt builder appends custom instructions instead of replacing defaults. | `brain/tutor_prompt_builder.py`; `brain/tests/test_chain_runner.py::test_tutor_prompt_builder_preserves_default_rules_with_custom_instructions` | Keep |
| Provenance and broader knowledge | Tutor may use broader model knowledge for teaching, but must label it truthfully and never imply it came from course material. | Default rules explicitly label source-backed, general-knowledge, and mixed claims. | `brain/tutor_prompt_builder.py`; `docs/root/TUTOR_CERTIFICATION_REPORT.md` | Keep |
| Interactive cadence and uncertainty | Tutor must stay short, one-step, and explicit about low confidence. | Default rules enforce chunked interaction and explicit confidence signaling. | `brain/tutor_prompt_builder.py` | Keep |
| No-answer-leakage and no-phantom-output contract | Tutor must not give away answers during recall-style steps and must not claim runtime actions that did not happen. | This was not explicit in the default rules before this track. | `conductor/tracks/tutor_vision_lock_20260301/spec.md`; `brain/tutor_prompt_builder.py`; `brain/tests/test_chain_runner.py::test_tutor_prompt_builder_preserves_default_rules_with_custom_instructions` | Change -> resolved by adding explicit rules and test coverage |
| Session-only rules | Temporary session guardrails must be appended separately, not silently folded into defaults. | Turn assembly appends `Session Rules (Current Session Only)` when present. | `brain/dashboard/api_tutor_turns.py` | Keep |
| Chain launch and PRIME guardrails | PRIME-first behavior and no-assessment-in-PRIME must be runtime-enforced, not merely suggested in prompt text. | Create-session blocks non-PRIME chain starts; turn/artifact flows block PRIME assessment behavior. | `brain/dashboard/api_tutor_sessions.py`; `brain/dashboard/api_tutor_turns.py`; `brain/tests/test_tutor_session_linking.py::test_send_turn_blocks_prime_evaluate_mode`; `brain/tests/test_tutor_session_linking.py::test_create_session_rejects_chain_not_starting_prime`; `brain/tests/test_tutor_session_linking.py::test_finalize_rejects_prime_confidence_fields` | Keep |
| Reference bounds | Retrieval-grade moves must require active reference targets and reject out-of-bounds concept jumps. | Turn flow returns `REFERENCE_TARGETS_MISSING` and `REFERENCE_BOUNDS_VIOLATION`; continuation-style bounded follow-ups are allowed. | `brain/dashboard/api_tutor_turns.py`; `brain/tests/test_tutor_session_linking.py::test_reference_bounds_allows_continuation_style_followups`; `brain/tests/test_tutor_session_linking.py::test_reference_bounds_rejects_generic_continue_without_target` | Keep |
| Scoped retrieval and restore | Selected-material scope and accuracy profile must persist through create, turn, and restore. | Session creation normalizes `material_ids` and `accuracy_profile`; restore matrix tests preserve scoped state. | `brain/dashboard/api_tutor_sessions.py`; `brain/dashboard/api_tutor_turns.py`; `brain/tutor_context.py`; `brain/tests/test_tutor_session_linking.py::test_session_restore_matrix_01_preflight_scope_is_authoritative_for_create`; `brain/tests/test_tutor_session_linking.py::test_session_restore_matrix_02_get_session_round_trip_preserves_scoped_state` | Keep |
| Structured-notes, cards, wraps, and session-owned delete behavior | Session-owned artifact lifecycle must stay truthful across finalize, summary-save, and delete. | Structured-notes finalization, wrap save, and session-owned delete helpers exist and are covered by certification tests. | `brain/dashboard/api_tutor_artifacts.py`; `brain/dashboard/api_tutor_sessions.py`; `brain/dashboard/api_tutor_vault.py`; `brain/tests/test_tutor_artifact_certification.py::test_note_card_and_structured_notes_persist_across_end_session`; `brain/tests/test_tutor_session_linking.py::test_finalize_structured_notes_writes_obsidian_and_artifact_index` | Keep |
| Quick-note sidecar ownership | Quick-note captures should not be treated as session-owned cleanup artifacts unless the runtime explicitly stores and deletes them that way. | The `note` artifact path writes global `quick_notes` rows and only keeps lightweight session history. Delete does not own those rows. | `brain/dashboard/api_tutor_artifacts.py`; `brain/dashboard/api_tutor_sessions.py`; `brain/dashboard/api_tutor_vault.py` | Retire the stale expectation that `note` artifacts are part of the locked session-delete ownership contract |
| Archived rule bundles as live runtime sources | Archived SOP/custom-instruction bundles must not be treated as active runtime canon unless the prompt assembly actually loads them. | The current prompt assembly uses prompt-builder defaults, config custom instructions, and `tutor_instructions.md` fallback. Archived SOP files are not loaded. | `conductor/tracks/tutor_vision_lock_20260301/spec.md`; `brain/tutor_prompt_builder.py` | Retire the stale expectation that archived bundles are live runtime instruction sources |

## Minimal Fix Set Implemented

1. Added explicit `No Answer Leakage` to the default Tutor rules.
2. Added explicit `No Phantom Outputs` to the default Tutor rules.
3. Extended prompt-builder test coverage so the locked rules survive custom-instruction overrides.
4. Narrowed the artifact-ownership contract so only session-owned runtime artifacts are locked into delete/save guarantees.

## Result

- Runtime changes required: 1 local prompt-contract hardening change.
- Runtime changes avoided: chain runtime refactor, retrieval refactor, notes/artifact rewrite, session lifecycle rewrite.
- Documentation retirements: archived instruction bundles are not part of active prompt assembly, and quick-note sidecars are not part of the locked session-delete contract.

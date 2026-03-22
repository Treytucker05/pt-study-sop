# Findings - Tutor Guided Studyability Loop

Purpose: convert guided study-pass observations into a prioritized fix backlog.

## Current audit snapshot

- Best-supported tonight: `Launch Hub -> Studio Priming -> Tutor runtime`.
- Strong current proof: live app responds on `:5000`, the direct Tutor read-only smoke passes, the hermetic Tutor smoke passes full session lifecycle, and targeted Priming/Tutor tests are green.
- Weak current proof: the mounted full-path `Launch -> Priming -> Tutor -> Polish -> Final Sync` journey, especially late-stage trust and closeout.
- Safest mental model tonight: `Launch` is the inbox, `Studio` owns `Home/Priming/Polish/Final Sync`, and `Tutor` owns the live study surface.

## Fix now

- `TGSL-LA-003` Launch workflow rows lose top-level course/topic/study-unit metadata even though workflow detail and project-shell endpoints still carry the real context. This weakens resume trust when stale workflows accumulate.
- `TGSL-LA-004` Launch hub study-wheel rendering has a real null-guard bug. The current `hasWheelContent` logic can treat missing hub data as present and then dereference `tutorHub!.study_wheel`, matching the learner-observed console exception.
- `TGSL-CN-001` Canon and track drift still describe obsolete surfaces (`TutorStartPanel`, `TutorPublishMode`, mounted workflow stepper) as if they were current, which makes the workflow harder to audit and follow correctly.
- `TGSL-PR-005` Priming-to-Tutor launch is still a live blocker. The current code pass added inline blocker surfacing, but the latest learner pass still hit unclear approved-objectives / preflight language plus a `500` on `PUT /api/tutor/workflows/<id>/priming-bundle`, leaving `Save Draft`, `Mark Ready`, and `Start Tutor` effectively stuck.

## Fix next

- `TGSL-LA-001` Launch information architecture and visual setup still need a live learner retest after the HUD-style pass.
- `TGSL-PR-001` The method-driven Priming flow needs a live learner retest for smoothness and clarity.
- `TGSL-PR-008` The new Priming step order still feels mismatched because the first `Setup` step frames the learner around the Tutor launch contract too early instead of cleanly leading `Setup -> Materials -> PRIME Methods -> Outputs -> Tutor Handoff`.
- `TGSL-PR-009` The `Materials` step source viewer is too cramped and no longer exposes the pop-out reading behavior the learner expects.
- `TGSL-PR-010` Priming still lacks a real workspace feel for organizing, comparing, and reshaping extracted outputs.
- `TGSL-PR-002` Priming readability still needs a real trust/readability retest.
- `TGSL-PR-003` Priming output quality now has several backend/frontend hardening passes, but the Cardiovascular packet still needs a live rerun/review.
- `TGSL-TU-002` Tutor TEACH packet clarity is still partial; the live shell remains usable, but it can still rely on inferred fallback values instead of a fully clean teaching packet.
- `TGSL-CR-002` `Polish` and `Final Sync` are mounted and feature-rich, but the current proof is much thinner than for Launch, Priming, and core Tutor runtime.

## Later

- run one full mounted `Launch -> Priming -> Tutor -> Polish -> Final Sync` pass against the real Cardiovascular packet
- finish the pending repo-wide Tutor/backend audit shards and merge them into the same normalized backlog
- close the canon drift by updating the remaining obsolete workflow descriptions

## Implemented since initial pass

- `TGSL-PR-001` Priming is now method-driven rather than method-plus-chain in the live UI.
- `TGSL-PR-001` PRIME now loads from the real SOP method library and stores method-native runs plus per-source method outputs instead of relying on a synthetic picker plus one fixed output bundle.
- `TGSL-PR-001` The workspace now stays blank below the PRIME method cards until methods are actually selected, then reveals one method-owned window per selected method with the main extraction action anchored in that selected-method area.
- `TGSL-PR-003` Priming now preserves previously extracted method outputs on the selected materials, shows them in a separate `ALREADY EXTRACTED PRIME METHODS` section when they are not part of the current selection, and keeps existing study-unit objectives outside the selected-method extraction area.
- `TGSL-PR-003` Priming assist now uses richer method-card reasoning context and full-material chunk coverage, so long-source extraction is no longer limited to a front excerpt and reruns are anchored against prior selected-method outputs.
- `TGSL-PR-003` `M-PRE-010` now detects explicit `Learning objectives` sections in the source text and preserves that full slide-visible objective list in the final output instead of silently shrinking it when the model only returns a partial subset.
- `TGSL-PR-005` Priming/Tutor handoff now shows inline launch blockers and disables false-ready actions.
- `TGSL-PR-006` The first Setup window now owns the actual Tutor launch contract.
- `TGSL-PR-007` Objective-scope narrowing controls were removed from live Priming.
- `TGSL-TU-001` The earlier top-bar workflow-stepper approach has now been superseded by the surface-first shell: `Launch` is the inbox, `Studio` owns `Home/Priming/Polish/Final Sync`, and Tutor keeps live-session execution plus contextual handoff actions like `Open Polish`.
- `TGSL-LA-003`, `TGSL-TU-002`, `TGSL-CR-002`, and `TGSL-CN-001` are now explicitly tracked as audit findings instead of living only in chat memory.
- A concrete tonight rehearsal guide now lives in `tonight-dry-run.md` and is grounded in the real `Exercise Physiology -> Cardiovascular` session context currently present in the app.

## Tonight posture

- Start from `Launch`, not from the auto-restored Tutor or Studio view.
- Use the live `Exercise Physiology -> Cardiovascular` path as the rehearsal target.
- Treat `Final Sync` as a contract/trust check tonight, not as a must-publish step unless you intentionally want a real closeout.

## Working rules

- every finding must map back to one issue-log entry
- every finding should reference a feature-matrix row when one exists
- duplicate learner complaints should be merged into one stable finding
- implementation order should follow study impact first, not aesthetic preference first

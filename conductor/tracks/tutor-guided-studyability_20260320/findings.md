# Findings - Tutor Guided Studyability Loop

Purpose: convert guided study-pass observations into a prioritized fix backlog.

## Fix now

- `TGSL-PR-005` Priming-to-Tutor launch was the main study blocker. The current code pass now adds inline launch blockers and aligns Priming save/handoff state with Tutor preflight, but this still needs a live learner retest to confirm the transition actually feels fixed.

## Fix next

- `TGSL-PR-006` The first-window launch contract issue has a code pass in place, but still needs guided retest for whether it now feels like the true “ready for Tutor” window.
- `TGSL-PR-007` The redundant objective-scope controls have been removed from the live Priming UI, but the learner should confirm that objective handling now feels simpler rather than hidden/confusing.
- `TGSL-LA-001` Launch information architecture and visual setup feel non-intuitive even when the user can still find `Recent workflows` and click `Start New`. Likely frontend-first cleanup around hierarchy, clarity, and overall setup trust.
- `TGSL-LA-001` now has a code pass on the live Launch surface: the page keeps the same structure but uses a darker HUD-style treatment with stronger contrast, panel definition, and control emphasis. This needs learner retest to confirm the new styling actually improves trust and readability rather than just making the page louder.
- `TGSL-LA-002` Launch currently presents a dual-track navigation story, with the workflow stage strip and the action area underneath competing instead of reinforcing one clear next step.
- `TGSL-TU-001` Tutor workflow movement felt busted because the main stage navigation was buried below the oversized runtime diagnostics. The new code pass moves workflow navigation to the top and adds explicit previous/next controls, but it still needs a learner retest to confirm that the route now feels obvious in live use.
- `TGSL-TU-001` also had a render-stability bug: the navigator could disappear in live Tutor mode when `activeWorkflowId` dropped out temporarily. That render gate now has a code pass, but it still needs learner retest to confirm the navigator stays visible during real Tutor use.
- `TGSL-PR-001` Priming method/chain placement issue has a code pass in place: Priming chains are removed from live UI, Priming methods are now multi-select in the workspace, and extraction is owned by the workspace. This still needs learner retest for whether the new setup actually feels better.
- `TGSL-PR-001` The larger PRIME method-system drift now also has a code pass in place: the Priming page loads real PRIME methods from the Methods API, extraction runs only the selected `M-PRE-*` methods, and the workspace renders method-owned outputs instead of a fixed artifact-tab bundle. This still needs learner retest for whether the new method-driven model is actually easier to use and trust.
- `TGSL-PR-002` Priming readability is weak across the viewer, artifact workspace, and handoff areas because the stage is bland and the small text/contrast are hard to read.
- `TGSL-PR-002` Learning objectives now have a code pass that formats extracted and existing objective lists as structured cards with LO-code badges and stronger title hierarchy instead of raw text lines. This still needs a learner retest for whether the new rendering feels meaningfully easier to scan during real study.
- `TGSL-PR-003` PRIME extraction quality is uneven: objectives are only partially represented in source-linked output, the hierarchical map is blank, and terms/spine are difficult to judge or read.
- `TGSL-PR-003` now also has a code pass that separates `selected methods for the next extract` from `already extracted PRIME methods` and merges new method outputs into existing per-material inventory by `method_id` instead of replacing prior runs. This still needs learner retest to confirm the workspace now makes the current request vs prior extracted state obvious.
- `TGSL-PR-003` now also has a code pass that hardens the LLM extraction contract itself: the prompt uses the real SOP method logic, reruns see prior selected-method outputs as stabilization context, and long materials are processed with full chunk coverage plus an LLM consolidation pass instead of the old first-`12000`-characters shortcut. This still needs learner retest to confirm that objective counts and other PRIME outputs are more stable across reruns.
- `TGSL-PR-004` Tutor handoff currently overstates readiness relative to the thin, weakly formatted handoff content and missing Tutor strategy.

## Later

- pending guided testing

## Implemented since initial pass

- `TGSL-PR-001` Priming is now method-driven rather than method-plus-chain in the live UI.
- `TGSL-PR-001` PRIME now loads from the real SOP method library and stores method-native runs plus per-source method outputs instead of relying on a synthetic picker plus one fixed output bundle.
- `TGSL-PR-001` The workspace now stays blank below the PRIME method cards until methods are actually selected, then reveals one method-owned window per selected method with the main extraction action anchored in that selected-method area.
- `TGSL-PR-003` Priming now preserves previously extracted method outputs on the selected materials, shows them in a separate `ALREADY EXTRACTED PRIME METHODS` section when they are not part of the current selection, and keeps existing study-unit objectives outside the selected-method extraction area.
- `TGSL-PR-003` Priming assist now uses richer method-card reasoning context and full-material chunk coverage, so long-source extraction is no longer limited to a front excerpt and reruns are anchored against prior selected-method outputs.
- `TGSL-PR-005` Priming/Tutor handoff now shows inline launch blockers and disables false-ready actions.
- `TGSL-PR-006` The first Setup window now owns the actual Tutor launch contract.
- `TGSL-PR-007` Objective-scope narrowing controls were removed from live Priming.
- `TGSL-TU-001` Tutor now renders a visible top-of-page workflow navigator, separates workflow movement from workspace-mode navigation, and adds explicit previous/next stage controls so the learner does not have to scroll past runtime diagnostics to move around the study flow.
- `TGSL-TU-001` The workflow navigator now stays rendered in live Tutor mode whenever session/stage context still exists, even if `activeWorkflowId` is briefly unavailable.

## Working rules

- every finding must map back to one issue-log entry
- every finding should reference a feature-matrix row when one exists
- duplicate learner complaints should be merged into one stable finding
- implementation order should follow study impact first, not aesthetic preference first

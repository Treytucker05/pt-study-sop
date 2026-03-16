# Review Notes: Tutor Workflow Redesign

## Review 1 — Canon / Product

- Validity: valid
- Verdict: accepted
- Findings:
  - Brain remains the home route and high-level launch owner.
  - Tutor is now correctly framed as the staged workflow shell after Brain handoff.
  - Canon, architecture docs, sprint board, and track registry were aligned before implementation moved into runtime/UI work.

## Review 2 — Migration / Systems

- Validity: valid
- Verdict: accepted
- Findings:
  - The redesign is extending existing `tutor_sessions`, `project_workspace_state`, `studio_items`, `card_drafts`, and related Tutor primitives rather than replacing them with a duplicate stack.
  - Workflow-native records were added around the current Tutor system as intended.
  - Launch/Priming refactor followed the required phase ordering: schema/API first, then page work.

## Review 3 — Delivery / Wave Progress

- Validity: valid
- Verdict: accepted with active follow-on wave
- Findings:
  - Canon/schema/api/launch/priming/runtime rail/deep runtime integration and the first Polish foundation wave are complete enough to unblock Final Sync.
  - The current delivery risk has shifted from stage routing to publish safety, retry behavior, and clean handoff into Obsidian/Anki/Brain.
  - `/tutor` can now carry the staged workflow into Stage 4 with a real Polish surface instead of falling back to Priming.

## Review 4 — Current risk focus

- Validity: valid
- Verdict: active monitor
- Findings:
  - Final Sync should stay narrow: publish confirmation, retry-safe saves, and durable publish-result evidence.
  - Publish failure handling is now the highest-risk area because Polish approvals already exist and must not be lost.
  - Brain analytics and learner telemetry should build on top of completed publish-result evidence rather than being mixed into this wave.

## Current recommendation

- Continue with Final Sync and publish-result wiring as the active wave.
- After that lands, move directly into Final Sync and Brain analytics.
- Do not broaden this wave into full LLM-backed Polish Assist or publish integrations yet.

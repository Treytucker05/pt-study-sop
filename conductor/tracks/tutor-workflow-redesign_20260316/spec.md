# Specification: Tutor Workflow Redesign

> Track artifact. Product/ownership authority lives only in `README.md`.
> This spec records the execution contract for this track; it does not replace the canon.

**Track ID:** tutor-workflow-redesign_20260316
**Type:** roadmap
**Created:** 2026-03-16
**Status:** Active

## Summary

Replace the current mixed Tutor launch/setup/runtime flow with a staged workflow that preserves existing Tutor, Studio, materials, card, and planner primitives while making stage ownership explicit:

- `Launch`
- `Priming`
- `Tutor`
- `Polish`
- `Final Sync`

## Goal

Leave the repo with one current Tutor workflow story and one current implementation path:

- Brain remains the home route and launch orchestrator.
- Tutor owns workflow-stage execution after Brain handoff.
- Setup work moves out of the mixed start panel into Priming.
- Tutor gains workflow-native persistence, timer slices, note capture, feedback, and memory capsules.
- Polish becomes the mandatory review and publish staging surface.
- Brain stores telemetry, learner-model evidence, analytics, and publish/index metadata while Obsidian and Anki remain the durable content stores.

## Locked decisions

- Do not create a parallel launch/session/task system when `tutor_sessions`, `project_workspace_state`, `studio_items`, `card_drafts`, and `study_tasks` already exist.
- Keep `notes` and `summaries` as separate record families end-to-end.
- `Save Exact` and `Save Editable` are explicit buttons, not inferred behavior.
- Polish is always required before publish.
- Summaries may quote exact notes, but they do not replace or rewrite them.
- Brain is the telemetry, evidence, analytics, and cross-link store; Obsidian is the primary notes store; Anki is the flashcard store.

## Acceptance criteria

- [ ] Canon docs align on Brain-owned launch plus Tutor-owned staged workflow execution.
- [ ] Durable workflow tables and API contracts exist for workflows, priming bundles, memory capsules, Polish bundles, publish results, note capture, stage timers, and feedback.
- [ ] The client API/types expose the workflow surface cleanly.
- [ ] The new scaffold extends existing Tutor systems instead of duplicating them.
- [ ] Follow-on UI work can consume the new workflow APIs without further schema redesign.

## Out of scope

- Finishing the full multi-page frontend in one pass
- Replacing current Studio/Tutor/Schedule/Publish surfaces immediately
- Planner queue conversion before the first implementation wave is accepted

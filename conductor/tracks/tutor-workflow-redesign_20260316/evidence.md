# Evidence Log: Tutor Workflow Redesign

## Completed work recorded on this track

### Canon and track alignment
- Canon docs were updated so Brain remains the home route and Tutor becomes the staged workflow shell after Brain handoff.
- The redesign was added to the active sprint and registered as an active Conductor track.

### Workflow schema and API foundation
- Workflow-native persistence records were added for:
  - workflows
  - priming bundles
  - captured notes
  - feedback events
  - stage-time logs
  - memory capsules
  - Polish bundles
  - publish results
- Matching Tutor workflow API routes and client contracts were added.

### Launch and Priming implementation
- `/tutor` now exposes a workflow-aware Launch Hub.
- Launch supports workflow recents, filtering, due context, and start/resume routing.
- Priming exists as a distinct stage with workflow bundle save, readiness gating, and Tutor handoff.

### Wave 2 Tutor runtime rail
- The live Tutor surface now has a workflow runtime rail.
- Implemented capabilities:
  - timer slice capture
  - exact note capture at session level
  - editable note capture at session level
  - feedback capture at session level
  - manual memory capsule creation

### Wave E — Deep Tutor runtime integration
- Tutor chat messages now carry stable client-side metadata usable by workflow capture actions.
- Stream completion exposes finalized assistant-turn metadata.
- The message action row now supports per-message exact/editable note capture.
- The message action row now supports per-message like/dislike feedback capture.
- Tutor chat exposes a compact hook that creates workflow memory capsules from the live runtime.

### Wave F — Polish Studio foundation
- `/tutor` now routes `polish` and `final_sync` workflows into a dedicated Polish surface instead of falling back to Priming.
- Polish now hydrates review queues from workflow detail records: captured notes, feedback events, and memory capsules.
- Polish persists draft/finalized bundle state through the workflow Polish bundle API.
- Polish embeds the shared workspace surface so notes, canvas, graph, and table tools remain available during review.

## Active wave

### Wave G — Final Sync and publish results
- Objective: publish approved Polish outputs to Obsidian and Anki, persist publish-result evidence, and keep failed publishes recoverable.
- Current target capabilities:
  - dedicated `final_sync` surface
  - Obsidian publish wiring
  - Anki publish wiring
  - durable `publish_results`
  - Brain index payload persistence

## Blocked until active wave finishes

### Brain analytics and learner modeling
- Block reason: learner analytics should build on top of completed publish-result evidence rather than draft review state.

## Completion evidence (2026-03-16)

### Wave G — Final Sync and publish results
- Added a dedicated Final Sync surface that consumes the Polish bundle and executes explicit publish actions.
- Final Sync now:
  - saves Obsidian-ready markdown into the configured vault path
  - creates approved Anki card drafts from Polish card candidates
  - triggers Anki sync
  - persists normalized `publish_results`
  - keeps partial failures recoverable by leaving workflows in `polish_complete`
  - marks workflows `stored` only when enabled targets succeed

### Wave H — Brain analytics and learner modeling
- Added Tutor workflow analytics summary aggregation on top of workflow, note, feedback, stage-time, priming, capsule, and publish-result records.
- Added Brain Home workflow intelligence UI so Scholar-facing Brain surfaces can read:
  - workflow closeout counts
  - publish success/failure signals
  - top course load
  - priming method/chain usage
  - latest learner archetype snapshot evidence

### Validation evidence
- Frontend build passed: `cd dashboard_rebuild && npm run build`
- Targeted failing harness path passed: `python -m pytest brain/tests/test_harness_eval.py::test_harness_eval_runs_live_golden_path_from_registry -q -s`
- Full backend suite passed: `pytest brain/tests/` -> `1070 passed, 1 skipped`
- Live runtime smoke passed: `python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000`

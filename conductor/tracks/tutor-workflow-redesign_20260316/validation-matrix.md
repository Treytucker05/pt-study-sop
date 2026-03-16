# Validation Matrix: Tutor Workflow Redesign

## Gates

### Canon gate
- `README.md`
- `docs/root/PROJECT_ARCHITECTURE.md`
- `docs/root/TUTOR_TODO.md`
- `conductor/tracks.md`
- Expected status: complete

### Schema/API gate
- workflow tables and routes map cleanly onto current Tutor primitives
- captured notes, feedback, timers, memory capsules, Polish bundles, and publish results are persisted through the new workflow surface
- Expected status: complete

### Launch/Priming gate
- `/tutor` exposes workflow-aware Launch and Priming routing
- Priming bundle save/readiness gates Tutor entry
- Expected status: complete

### Tutor runtime rail gate
- session-level runtime controls exist for timer slices, note capture, feedback capture, and manual memory capsule creation
- Expected status: complete

### Deep Tutor runtime gate
- stable turn/message metadata exists
- per-message `Save Exact` works
- per-message `Save Editable` works
- per-message `Like` / `Dislike` works
- compact hook exists inside Tutor chat
- Expected status: complete

### Polish gate
- explicit `polish` stage routing exists
- queue views hydrate from workflow detail records
- save/finalize actions persist Polish bundle state
- embedded workspace surface is available from Polish
- Expected status: complete for the foundation wave

### Final Sync / Brain gate
- publish to Obsidian and Anki is wired through final stage actions
- Brain telemetry and learner/system analytics closes are persisted
- Expected status: complete

## Commands

- `cd dashboard_rebuild && npm run build`
- `pytest brain/tests/`
- `python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000`
- relevant harness Tutor scenarios from `docs/root/GUIDE_DEV.md`

## Evidence expectations

### Completed evidence
- updated canon docs
- registered active Conductor track
- workflow schema/API/client contract scaffold in repo
- Launch Hub and Priming stage implemented on `/tutor`
- Wave 2 Tutor runtime rail implemented
- Deep Tutor runtime integration implemented

### Current-wave evidence
- approved Polish outputs can move into a dedicated `final_sync` surface
- Obsidian and Anki publish attempts create durable `publish_results`
- publish failure handling preserves approval state and allows retry
- Brain index payloads are saved alongside publish results
- Brain telemetry/analytics record evidence
- learner archetype/course/chain rollup evidence
- Scholar-facing analytics/query evidence

## Validation results (2026-03-16)

- `cd dashboard_rebuild && npm run build` -> passed
- `python -m pytest brain/tests/test_harness_eval.py::test_harness_eval_runs_live_golden_path_from_registry -q -s` -> passed
- `pytest brain/tests/` -> passed (`1070 passed, 1 skipped`)
- `python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000` -> passed

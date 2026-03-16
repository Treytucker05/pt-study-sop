# Plan: Tutor Workflow Redesign

## Execution surface

- Selected: `deep-plan-then-execute`
- Why: the redesign is already underway, spans canon/docs, schema/API, frontend workflow routing, and runtime behavior, and now needs wave-by-wave execution until the staged workflow is complete.

## Dependency graph

`canon alignment + track creation -> workflow/types/schema -> Launch/Priming routing -> Tutor runtime rail -> deep Tutor runtime integration -> Polish Studio foundation -> Final Sync + Brain analytics`

## Current status snapshot

### Completed foundation
- Canon alignment is complete.
- Active Conductor track is created and registered.
- Workflow-native schema is in place.
- Backend workflow API surface is in place.
- Frontend client contracts are in place.

### Completed product waves
- Launch Hub is implemented on `/tutor` as a workflow-aware routing surface.
- Priming Workstation is implemented as a distinct stage with bundle save/readiness gating.
- Wave 2 Tutor runtime rail is implemented:
  - stage timer slices
  - exact/editable note capture at session level
  - feedback capture
  - manual memory capsule creation
- Deep Tutor runtime integration is implemented:
  - stable message metadata
  - assistant-turn commit hook
  - per-message `Save Exact` / `Save Editable`
  - per-message `Like` / `Dislike`
  - compact hook inside Tutor chat

### Current wave
- Final Sync and publish wiring
- Goal: publish approved Polish outputs to Obsidian and Anki, persist publish results, and keep workflow state recoverable on partial failure.

## Phases

### Phase 0
- Create the Conductor track.
- Add the redesign to the active sprint.
- Update canon docs so Brain/Tutor ownership and the stage model are explicit.
- Status: complete.

### Phase 1
- Add workflow-native persistence on top of existing Tutor primitives.
- Add stage timers, feedback events, captured notes, memory capsules, Polish bundles, and publish results.
- Add client types and API methods for the new workflow surface.
- Status: complete.

### Phase 2
- Split the current mixed start surface into Launch and Priming.
- Move class selection, source ingestion, source-linked extraction, and readiness gating into Priming.
- Status: complete for first usable workflow version.

### Phase 3
- Add Tutor Core plus stage-local Assist behavior.
- Add hybrid compaction and note/feedback capture controls.
- Status: first usable deep runtime integration complete.

### Phase 4
- Make Polish mandatory and host full Studio plus Polish Assist there.
- Add explicit publish classification to Obsidian, Anki, and Brain.
- Status: in progress.

### Phase 5
- Add Final Sync and Brain analytics/learner-archetype telemetry closes.
- Status: in progress.

## Completed waves

### Wave A — Canon and track alignment
- Updated canon docs so Brain remains the home route and Tutor becomes the workflow shell after Brain handoff.
- Registered the redesign as an active Conductor track.

### Wave B — Workflow schema and API foundation
- Added workflow-native records for workflows, priming bundles, captured notes, feedback, stage-time slices, memory capsules, Polish bundles, and publish results.
- Added backend Tutor workflow routes and matching client types/methods.

### Wave C — Launch and Priming UI
- Added Launch Hub workflow recents, filters, due context, and start/resume routing.
- Added Priming stage with workflow bundle save/readiness and Tutor handoff.

### Wave D — Tutor runtime rail
- Added workflow-linked session controls around the live Tutor surface.
- Added session-level timer slices, note capture, feedback capture, and manual memory capsule creation.

### Wave E — Deep Tutor runtime integration
1. Extended Tutor chat types and stream lifecycle with stable turn/message metadata.
2. Added a structured assistant-turn commit hook so completed turns can be referenced outside the stream reducer.
3. Wired per-message `Save Exact` and `Save Editable` into the message action row.
4. Wired per-message `Like` and `Dislike` into the message action row.
5. Added compact hooks in Tutor chat so capsule creation can move from the session rail into the live runtime.
6. Preserved current workflow state sync without forcing a full workflow refetch after every event.

### Wave F — Polish Studio foundation
1. Added explicit `polish` stage routing on `/tutor` and resume/open behavior from workflow state.
2. Hydrated Polish queues from workflow detail: captured notes, feedback, and memory capsules.
3. Mounted the embedded workspace surface inside Polish so boards/graphs/tables remain available.
4. Added Polish draft save and finalize actions backed by the existing Polish bundle API.
5. Routed finalized Polish state to `final_sync` status without dropping the Polish surface.

## Current unblocked wave

### Wave G — Final Sync and publish results
1. Add the first real `final_sync` surface for publish confirmation and retry-safe handoff.
2. Wire approved note payloads from Polish into the Obsidian publish path.
3. Wire approved card payloads from Polish into the Anki draft/connector path.
4. Persist `publish_results` records and keep partial failures recoverable.
5. Attach Brain index payloads to publish results so Scholar-facing telemetry has durable evidence.

## Next blocked waves

### Wave H — Brain analytics and learner modeling
- Derive learner archetype evidence and snapshots from workflow telemetry.
- Roll up course time allocation, retention signals, and chain/method performance.
- Expose Scholar-facing analytics over the new workflow evidence.

## Exit criteria for current wave

- Approved Polish outputs can move through a dedicated `final_sync` flow.
- Obsidian and Anki publish attempts produce durable `publish_results`.
- Partial publish failures keep approval state and allow retry.
- Brain index payloads are saved alongside publish results.

## Final completion update (2026-03-16)

- Final Sync is implemented with:
  - dedicated `final_sync` routing on `/tutor`
  - Obsidian note publish wiring
  - Anki card-draft/sync wiring
  - durable `publish_results`
  - retry-safe workflow status handling between `polish_complete` and `stored`
- Polish Assist minimum finish scope is implemented with LLM-backed:
  - summary generation
  - QA over workflow outputs
  - editable-note rewrite
  - card-candidate generation
- Brain closeout analytics are implemented with a workflow analytics summary surface:
  - stored/active workflow totals
  - note/feedback/capsule counts
  - stage-time rollups
  - top-course load rollups
  - priming method/chain counts
  - latest learner archetype snapshot evidence
- Brain Home now renders Tutor workflow intelligence from the new analytics surface.
- Validation completed:
  - `cd dashboard_rebuild && npm run build`
  - `python -m pytest brain/tests/test_harness_eval.py::test_harness_eval_runs_live_golden_path_from_registry -q -s`
  - `pytest brain/tests/`
  - `python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000`
- Track status: complete.

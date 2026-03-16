# Plan: Tutor Workflow Depth Pass

## Execution surface

- Selected: `deep-plan-then-execute`
- Execution style: `single continuous execution train`
- Why: the staged Tutor workflow backbone is complete, so the remaining work is a bounded depth pass that should be executed end-to-end without reopening the prior redesign track or stopping for a second planning round between waves.

## Goal

Finish the remaining original Tutor vision by delivering:

1. source-linked Priming extraction depth
2. richer Polish / Final Sync artifact publishing depth
3. deeper Brain workflow analytics and learner-evidence depth

Release proof:

- one Brain-launched Tutor workflow completes `Launch -> Priming -> Tutor -> Polish -> Final Sync -> Stored`
- Priming outputs are source-linked and partially automated
- at least one richer Studio artifact class survives Polish -> Final Sync
- Brain exposes enriched workflow intelligence from that workflow

## Constraints

- Brain remains the home route.
- `/tutor` remains the staged workflow shell.
- Notes and summaries remain separate.
- Exact notes remain immutable.
- Polish remains mandatory before stored closeout.
- Existing Tutor / Studio / Obsidian / Anki / Brain systems must be extended, not replaced.
- This track must stay separate from the closed `tutor-workflow-redesign_20260316` track.
- This track must avoid blind collision with the active UI Production System track.

## Out of scope

- Full Brain Home redesign
- Full shared shell / UI Production System rollout
- Replacing existing Obsidian connector behavior wholesale
- Replacing existing Anki connector behavior wholesale
- Full autonomous Priming or Polish agents
- Deep retention-science work beyond bounded workflow-evidence rollups

## Assumptions

- Current workflow schema and APIs are extensible enough for this pass.
- Studio artifacts can be normalized into richer publish targets with moderate contract changes.
- Existing validation surfaces remain the repo-standard proof gates.

## Operating model

- No second planning pass between waves.
- All tasks and dependencies are pre-committed here.
- Executor advances automatically after each completion gate passes.
- Replan only if a named blocker or replan trigger fires.

## Validation gate

Track closeout requires:

- `cd dashboard_rebuild && npm run build`
- `pytest brain/tests/`
- `python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000`
- manual enriched workflow checklist:
  - Brain launches Tutor correctly
  - Priming outputs are source-linked
  - Tutor still captures notes / feedback / capsules correctly
  - Polish can classify richer artifact types
  - Final Sync can publish enriched outputs
  - Brain shows enriched analytics from that workflow

## Dependency graph

`TDP-000 -> TDP-100 -> TDP-110 -> {TDP-200 -> TDP-210 -> TDP-220, TDP-300 -> TDP-310} -> TDP-400 -> TDP-410 -> TDP-500`

## One-run execution order

Execute the track in this exact order without a second planning pass:

1. `TDP-000` — bootstrap the track and sprint entry
2. `TDP-100` — capture the current baseline scorecard
3. `TDP-110` — lock the metric contract and validation matrix
4. Priming lane:
   - `TDP-200`
   - `TDP-210`
   - `TDP-220`
5. Publish-depth lane in parallel with the Priming lane after `TDP-110`:
   - `TDP-300`
   - `TDP-310`
6. `TDP-400` — deepen Brain analytics on top of the richer upstream evidence
7. `TDP-410` — expose the enriched analytics in Brain UI
8. `TDP-500` — run full validation and close the track

Execution rule:

- do not stop after Batch A, B, or C for another planning round
- continue automatically into the next dependency-safe task or lane
- only stop if a task hits its explicit `blocked_reason` or `replan_trigger`

## Phases and tasks

### Phase 0 — Track and sprint alignment

#### TDP-000
- `status`: completed
- `depends_on`: []
- `surfaces`:
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks.md`
  - `conductor/tracks/tutor-workflow-depth-pass_20260316/`
- `definition_of_done`:
  - sprint item exists
  - Conductor track exists
  - scope is explicitly framed as a post-redesign depth pass
- `completion_gate`:
  - sprint item visible in current sprint
  - track registered in `conductor/tracks.md`
  - track docs created: `spec`, `plan`, `review`, `validation-matrix`, `evidence`
- `parallel_safety_class`: exclusive
- `blocked_reason`: none
- `replan_trigger`: user changes the target before track bootstrap is complete
- `expected_evidence`: live sprint item and active track docs

### Phase 1 — Baseline and metric contract

#### TDP-100
- `status`: completed
- `depends_on`: [TDP-000]
- `surfaces`:
  - Priming workflow surfaces
  - Polish / Final Sync workflow surfaces
  - Brain analytics summary surfaces
  - track evidence docs
- `definition_of_done`:
  - baseline captured for:
    - source-link coverage
    - extraction automation coverage
    - publish artifact coverage
    - analytics coverage
- `completion_gate`:
  - baseline scorecard stored in track evidence
- `parallel_safety_class`: exclusive
- `blocked_reason`: active track required
- `replan_trigger`: a baseline metric cannot be measured repeatably
- `expected_evidence`: baseline scorecard with current-state measurements

#### TDP-110
- `status`: completed
- `depends_on`: [TDP-100]
- `surfaces`:
  - `plan.md`
  - `validation-matrix.md`
- `definition_of_done`:
  - the metric contract for the entire run is locked
- `completion_gate`:
  - plan and validation matrix explicitly define success metrics and proof rules
- `parallel_safety_class`: exclusive
- `blocked_reason`: baseline first
- `replan_trigger`: metrics prove invalid, ambiguous, or too noisy
- `expected_evidence`: revised validation matrix with locked metrics

### Phase 2 — Priming extraction depth

#### TDP-200
- `status`: in_progress
- `depends_on`: [TDP-110]
- `surfaces`:
  - `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx`
  - `dashboard_rebuild/client/src/pages/tutor.tsx`
  - `brain/dashboard/api_tutor_workflows.py`
- `definition_of_done`:
  - Priming can persist source-linked extraction objects instead of only aggregate manual text
- `completion_gate`:
  - sample workflow stores source-linked objectives/concepts/summaries/gaps for more than one source
- `parallel_safety_class`: frontend/backend coupled
- `blocked_reason`: metric contract first
- `replan_trigger`: current bundle model cannot safely represent source-linked extraction
- `expected_evidence`: saved workflow detail showing per-source priming objects

#### TDP-210
- `status`: in_progress
- `depends_on`: [TDP-200]
- `surfaces`:
  - Priming UI
  - workflow bundle inspection / rerun flow
- `definition_of_done`:
  - user can inspect extracted items by source and rerun a source-level extraction step
- `completion_gate`:
  - manual checklist proves rerun of one source/step without resetting the full bundle
- `parallel_safety_class`: frontend-heavy
- `blocked_reason`: per-source extraction objects required first
- `replan_trigger`: rerun/versioning semantics conflict with current persistence
- `expected_evidence`: source-rerun proof note in track evidence

#### TDP-220
- `status`: in_progress
- `depends_on`: [TDP-210]
- `surfaces`:
  - Priming assist UI/API
- `definition_of_done`:
  - Priming gets bounded assist actions for extraction / summarization support
- `completion_gate`:
  - at least one assist action writes back into Priming state with traceability
- `parallel_safety_class`: frontend/backend coupled
- `blocked_reason`: source-linked model first
- `replan_trigger`: assist output cannot be stored safely in current state shape
- `expected_evidence`: traceable assist mutation in saved priming bundle

### Phase 3 — Polish / Final Sync artifact depth

#### TDP-300
- `status`: in_progress
- `depends_on`: [TDP-110]
- `surfaces`:
  - `dashboard_rebuild/client/src/components/TutorWorkflowPolishStudio.tsx`
  - `dashboard_rebuild/client/src/components/TutorWorkflowFinalSync.tsx`
  - workflow publish contracts
- `definition_of_done`:
  - publishable outputs expand beyond notes/summaries/cards to at least one richer Studio artifact type
- `completion_gate`:
  - one richer artifact type is approved in Polish and appears in Final Sync payload review
- `parallel_safety_class`: frontend/backend coupled
- `blocked_reason`: metric contract first
- `replan_trigger`: Studio artifact contracts are too underspecified for durable publishing
- `expected_evidence`: Polish bundle and Final Sync preview with richer artifact data

#### TDP-310
- `status`: in_progress
- `depends_on`: [TDP-300]
- `surfaces`:
  - Final Sync publish results
  - Brain index payload
- `definition_of_done`:
  - Brain index payload includes richer artifact linkage
- `completion_gate`:
  - persisted `publish_result` includes richer artifact references
- `parallel_safety_class`: backend-heavy
- `blocked_reason`: richer artifact classification required first
- `replan_trigger`: richer artifacts cannot be serialized into durable publish evidence
- `expected_evidence`: publish result payload with richer artifact refs

### Phase 4 — Brain analytics and learner-evidence depth

#### TDP-400
- `status`: in_progress
- `depends_on`: [TDP-220, TDP-310]
- `surfaces`:
  - `brain/dashboard/api_tutor_workflows.py`
  - `dashboard_rebuild/client/src/components/brain/BrainHome.tsx`
- `definition_of_done`:
  - analytics summary exposes enriched evidence:
    - re-prime counts
    - richer publish coverage
    - stronger learner snapshot evidence
    - stronger class / method / chain rollups
- `completion_gate`:
  - analytics endpoint returns enriched non-empty signals from sample workflow data
- `parallel_safety_class`: backend-first
- `blocked_reason`: richer upstream signals required
- `replan_trigger`: schema expansion exceeds the bounded track scope
- `expected_evidence`: enriched analytics response sample

#### TDP-410
- `status`: in_progress
- `depends_on`: [TDP-400]
- `surfaces`:
  - Brain analytics UI rendering
- `definition_of_done`:
  - Brain displays the enriched workflow intelligence in usable summary form
- `completion_gate`:
  - UI checklist confirms enriched analytics are visible and intelligible
- `parallel_safety_class`: frontend-only on top of backend contract
- `blocked_reason`: analytics contract first
- `replan_trigger`: UI Production System work creates a direct surface conflict
- `expected_evidence`: Brain UI proof notes in track evidence

### Phase 5 — Full validation and closeout

#### TDP-500
- `status`: pending
- `depends_on`: [TDP-410]
- `surfaces`:
  - repo-wide validation targets
  - track closeout docs
- `definition_of_done`:
  - depth pass is validated and ready to close
- `completion_gate`:
  - `cd dashboard_rebuild && npm run build`
  - `pytest brain/tests/`
  - `python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000`
  - enriched manual workflow checklist passes
- `parallel_safety_class`: exclusive
- `blocked_reason`: all upstream tasks must land
- `replan_trigger`: validation reveals broader staged-shell regressions
- `expected_evidence`: passing validation outputs and updated closeout docs

## Parallel batches

- `Batch A`: `TDP-000 -> TDP-100 -> TDP-110`
- `Batch B` after `TDP-110`:
  - Priming lane: `TDP-200 -> TDP-210 -> TDP-220`
  - Publish-depth lane: `TDP-300 -> TDP-310`
- `Batch C`: `TDP-400 -> TDP-410`
- `Batch D`: `TDP-500`

Important rule: these batches are part of one execution train, not separate planning rounds.

## Current unblocked wave

- `TDP-000`
- `TDP-100`
- `TDP-110`

## One-run kickoff rule

The executor starts with the current unblocked wave and must then continue directly into:

- Priming lane: `TDP-200 -> TDP-210 -> TDP-220`
- Publish-depth lane: `TDP-300 -> TDP-310`
- Brain-depth: `TDP-400 -> TDP-410`
- Final validation: `TDP-500`

No additional roadmap generation is needed between those steps.

## Closeout rule

This track is complete only when the enriched depth outcomes land on top of the staged Tutor backbone and the full validation gate passes.

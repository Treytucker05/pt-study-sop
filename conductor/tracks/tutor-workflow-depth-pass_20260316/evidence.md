# Evidence Log: Tutor Workflow Depth Pass

## Track bootstrap

- 2026-03-16: track created and registered
- 2026-03-16: sprint item added to `docs/root/TUTOR_TODO.md`
- 2026-03-16: one-pass execution train locked in `plan.md`

## Baseline artifacts

- 2026-03-16: baseline scorecard captured in [baseline-scorecard.md](C:/pt-study-sop/conductor/tracks/tutor-workflow-depth-pass_20260316/baseline-scorecard.md)
  - source-link coverage: `0 / 7`
  - extraction automation coverage: `0 / 7`
  - richer Studio artifact publish coverage: `0`
  - analytics coverage: `6 / 9`

## Implementation evidence

- 2026-03-16: `TDP-200` backend/client/UI slice landed for bounded Priming Assist
  - added `POST /api/tutor/workflows/<workflow_id>/priming-assist` in [api_tutor_workflows.py](C:/pt-study-sop/brain/dashboard/api_tutor_workflows.py)
  - reused material content already stored in `rag_docs` and returned source-linked extraction objects per selected source
  - added client contracts and `api.tutor.runPrimingAssist(...)` in [api.types.ts](C:/pt-study-sop/dashboard_rebuild/client/src/api.types.ts) and [api.ts](C:/pt-study-sop/dashboard_rebuild/client/src/api.ts)
  - wired Priming UI/state for source-linked extraction, per-source rerun, and assist write-back in [TutorWorkflowPrimingPanel.tsx](C:/pt-study-sop/dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx) and [tutor.tsx](C:/pt-study-sop/dashboard_rebuild/client/src/pages/tutor.tsx)
- 2026-03-16: `TDP-210` source-level rerun path landed in Priming UI
  - selected-source extraction button
  - per-source rerun button
  - source-linked output cards persisted through `source_inventory`
- 2026-03-16: `TDP-220` bounded Priming Assist write-back landed
  - assist output rehydrates `summary`, `concepts`, `terminology`, `root explanations`, and `gaps`
  - traceability preserved through `source_inventory[].priming_output`
- 2026-03-16: `TDP-300` richer Studio artifact packaging landed
  - Polish now captures a first-class `studio artifact package` in `studio_payload.artifacts`
  - artifact lines are reviewable in the Polish queue and survive into Final Sync
- 2026-03-16: `TDP-310` richer artifact linkage landed in Final Sync + Brain payloads
  - Final Sync previews Studio artifacts alongside cards and markdown export
  - Brain index payload now records `studio_artifact_count` and artifact refs
- 2026-03-16: `TDP-400` analytics depth landed in the Tutor workflow summary API
  - added `source_linked_workflows`
  - added `reprime_requests`
  - added `studio_artifacts`
  - added learner snapshot history
- 2026-03-16: `TDP-410` Brain Home renders the new workflow intelligence signals
  - source-linked priming count
  - artifact + re-prime signals
  - richer learner snapshot summary
- 2026-03-16: live enriched workflow proof passed after restarting the dashboard on port `5000`
  - workflow `223559bb-667d-4f14-89e2-c3a3a07771e9`
  - course `Neuroscience`
  - study unit `Week 9 To Do and LO`
  - `2` source-linked priming outputs persisted in the saved bundle
  - `1` richer Studio artifact persisted through Polish and into Final Sync linkage
  - analytics summary returned non-empty `source_linked_workflows`, `studio_artifacts`, `reprime_requests`, and `learner_snapshot_history`

## Validation evidence

- 2026-03-16: `python scripts/check_docs_sync.py` passed after track bootstrap and baseline/metric updates
- 2026-03-16: `python -m py_compile brain/dashboard/api_tutor_workflows.py` passed
- 2026-03-16: `cd dashboard_rebuild && npm run build` passed after the Priming Assist implementation
- 2026-03-16: `cd dashboard_rebuild && npm run build` passed after the richer Studio artifact publish slice
- 2026-03-16: `python -m py_compile brain/dashboard/api_tutor_workflows.py` passed after the analytics-depth slice
- 2026-03-16: `cd dashboard_rebuild && npm run build` passed after the Brain workflow intelligence UI slice
- 2026-03-16: `pytest brain/tests/` passed with `1070 passed, 1 skipped`
- 2026-03-16: `python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000` passed
- 2026-03-16: live enriched workflow proof script passed against the restarted dashboard on `127.0.0.1:5000`

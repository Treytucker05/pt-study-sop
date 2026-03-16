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

## Validation evidence

- 2026-03-16: `python scripts/check_docs_sync.py` passed after track bootstrap and baseline/metric updates
- 2026-03-16: `python -m py_compile brain/dashboard/api_tutor_workflows.py` passed
- 2026-03-16: `cd dashboard_rebuild && npm run build` passed after the Priming Assist implementation

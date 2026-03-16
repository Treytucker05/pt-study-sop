# Baseline Scorecard: Tutor Workflow Depth Pass

Captured: 2026-03-16

## Metric definitions

### 1. Source-link coverage

Definition:

- Measure the 7 Priming content output families that should eventually support explicit source linkage:
  - `learning_objectives`
  - `concepts`
  - `concept_graph`
  - `terminology`
  - `root_explanations`
  - `summaries`
  - `identified_gaps`

Baseline:

- `0 / 7` content families currently carry explicit per-source linkage in the saved Priming payload.

Evidence:

- [tutor.tsx:1173](C:/pt-study-sop/dashboard_rebuild/client/src/pages/tutor.tsx:1173)
- [tutor.tsx:1178](C:/pt-study-sop/dashboard_rebuild/client/src/pages/tutor.tsx:1178)
- [tutor.tsx:1180](C:/pt-study-sop/dashboard_rebuild/client/src/pages/tutor.tsx:1180)
- [tutor.tsx:1181](C:/pt-study-sop/dashboard_rebuild/client/src/pages/tutor.tsx:1181)
- [api_tutor_workflows.py:152](C:/pt-study-sop/brain/dashboard/api_tutor_workflows.py:152)

Notes:

- The bundle does save `selected_material_ids`, `selected_paths`, and `source_inventory`, but the downstream extracted content families are still aggregate records without explicit source references.

### 2. Extraction automation coverage

Definition:

- Measure how many of the same 7 Priming content output families are auto-produced from selected sources rather than manually authored in the Priming form.

Baseline:

- `0 / 7` content families are currently auto-extracted from selected sources in the Priming stage.

Evidence:

- [TutorWorkflowPrimingPanel.tsx:353](C:/pt-study-sop/dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx:353)
- [TutorWorkflowPrimingPanel.tsx:363](C:/pt-study-sop/dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx:363)
- [TutorWorkflowPrimingPanel.tsx:373](C:/pt-study-sop/dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx:373)
- [TutorWorkflowPrimingPanel.tsx:383](C:/pt-study-sop/dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx:383)
- [TutorWorkflowPrimingPanel.tsx:393](C:/pt-study-sop/dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx:393)

Notes:

- The current Priming stage is a structured drafting surface. It does not yet run bounded extraction actions that populate these fields from source content.

### 3. Publish artifact coverage

Definition:

- Measure first-class publishable output families in the end-to-end Polish -> Final Sync flow.

Baseline:

- Supported first-class publish families:
  - notes
  - summaries
  - cards
- Richer Studio artifact families beyond notes/summaries/cards:
  - `0`

Evidence:

- [TutorWorkflowPolishStudio.tsx:210](C:/pt-study-sop/dashboard_rebuild/client/src/components/TutorWorkflowPolishStudio.tsx:210)
- [TutorWorkflowPolishStudio.tsx:226](C:/pt-study-sop/dashboard_rebuild/client/src/components/TutorWorkflowPolishStudio.tsx:226)
- [TutorWorkflowPolishStudio.tsx:245](C:/pt-study-sop/dashboard_rebuild/client/src/components/TutorWorkflowPolishStudio.tsx:245)
- [TutorWorkflowFinalSync.tsx:94](C:/pt-study-sop/dashboard_rebuild/client/src/components/TutorWorkflowFinalSync.tsx:94)
- [TutorWorkflowFinalSync.tsx:47](C:/pt-study-sop/dashboard_rebuild/client/src/components/TutorWorkflowFinalSync.tsx:47)

Notes:

- `TutorWorkspaceSurface` is embedded in Polish, but its richer artifact types are not yet represented as first-class publish payloads.

### 4. Analytics coverage

Definition:

- Measure the 9 target workflow analytics signal families for this depth pass:
  - workflow totals
  - stage time
  - top courses
  - priming methods
  - priming chains
  - latest learner snapshot
  - re-prime counts
  - richer artifact publish coverage
  - learner snapshot history / evidence history

Baseline:

- `6 / 9` target signal families are currently exposed.
- Missing families:
  - `re-prime counts`
  - `richer artifact publish coverage`
  - `learner snapshot history`

Evidence:

- [api_tutor_workflows.py:1212](C:/pt-study-sop/brain/dashboard/api_tutor_workflows.py:1212)
- [api_tutor_workflows.py:1224](C:/pt-study-sop/brain/dashboard/api_tutor_workflows.py:1224)
- [api_tutor_workflows.py:1331](C:/pt-study-sop/brain/dashboard/api_tutor_workflows.py:1331)
- [api_tutor_workflows.py:1345](C:/pt-study-sop/brain/dashboard/api_tutor_workflows.py:1345)
- [BrainHome.tsx:961](C:/pt-study-sop/dashboard_rebuild/client/src/components/brain/BrainHome.tsx:961)
- [BrainHome.tsx:983](C:/pt-study-sop/dashboard_rebuild/client/src/components/brain/BrainHome.tsx:983)

## Summary table

| Metric | Baseline |
|---|---:|
| Source-link coverage | `0 / 7` |
| Extraction automation coverage | `0 / 7` |
| Richer Studio artifact publish coverage | `0` |
| Analytics coverage | `6 / 9` |

# Plan: Tutor Guided Studyability Loop

## Execution surface

- Selected: `guided live testing + normalized backlog`
- Why: Tutor has many landed pieces, but smoothness now depends on real studying, not more abstract planning.

## Dependency graph

`baseline map -> stage checklists -> live observations -> normalized issue log -> prioritized backlog`

## Current status snapshot

### Baseline now
- Tutor has a staged workflow shell:
  - `Launch`
  - `Priming`
  - `Tutor`
  - `Polish`
  - `Final Sync`
- Canon and workboard contain a mix of landed, planned, and discussed features.
- Existing audit artifacts help with structure, but do not yet provide a learner-guided study loop.

### Main drift risks
- features discussed in chat but not present in repo canon
- landed surfaces that are technically present but still rough in real use
- partial workflow features being mistaken for bugs
- support-page friction polluting Tutor-only decisions unless it actually blocks study flow

## Phases

### Phase 0 - Baseline map
- inventory current Tutor workflow features from canon, workboard, and current components
- tag each item as `canon`, `planned`, or `discussed`
- tag each item as `landed`, `partial`, `missing`, or `drifted`

### Phase 1 - Guided stage passes
- run `Launch`
- run `Priming`
- run `Tutor`
- run `Polish`
- run `Final Sync`
- record all learner observations in normalized form

### Phase 2 - Full pass
- run one end-to-end study session after the stage passes
- verify that stage-local fixes and expectations still hold in sequence

### Phase 3 - Backlog conversion
- merge duplicate issues
- separate true bugs from missing or only-partially-built features
- group work into `Fix now`, `Fix next`, and `Later`

## Working rules

1. Use the current Tutor workflow stages only.
2. Do not invent a second issue process outside this track.
3. If a feature is only discussed and not canonized, keep it visible but label it as discussed.
4. If a support page becomes relevant, record exactly how it blocks Tutor study flow.
5. Normalize every learner comment into one issue type and one study-impact statement.

## Exit criteria

- the feature inventory is good enough to explain what Tutor currently is
- the stage checklist is good enough to guide a live test without improvisation
- the issue log is good enough to absorb raw learner feedback during a session
- the findings backlog is good enough to drive the next implementation wave

# Review-Only Metadata Refinement Scorecard

**Captured:** 2026-03-16  
**Experiment:** tighten critique-specific `blocked_reason` and `expected_evidence`
guidance so review-only outputs read like plan audit state instead of
implementation state

Comparison rule:

- compare `Cases 1-6` against the previous review-only experiment in
  [review-only-experiment-scorecard.md](./review-only-experiment-scorecard.md)
- treat `Cases 7-8` as supplemental critique coverage again

## Core Six-Case Comparison

### Case 1: Simple one-wave task

- previous experiment: `10 / 10`
- refinement: `10 / 10`
- delta: `0`
- note: no regression; small-task downgrade behavior stayed strong

### Case 2: Cross-subsystem feature

- previous experiment: `16 / 16`
- refinement: `16 / 16`
- delta: `0`
- note: no regression; roadmap-mode planning stayed intact

### Case 3: Plan-review-only request

Scores:

- `mode_fit`: `2`
- `overplanning_control`: `2`
- `validation_gate`: `2`
- `first_wave_correctness`: `2`
- `canon_alignment`: `n/a`
- `execution_surface_selection`: `n/a`
- `queue_conversion_correctness`: `n/a`
- `replan_metadata_quality`: `2`

Result:

- previous experiment: `9 / 10`
- refinement: `10 / 10`
- delta: `+1`
- note: critique metadata now names why execution is deferred and what proof
  closes the review pass

### Case 4: Queue-conversion request

- previous experiment: `16 / 16`
- refinement: `16 / 16`
- delta: `0`
- note: no regression; queue conversion stays correctly gated

### Case 5: Canon-conflict request

- previous experiment: `12 / 12`
- refinement: `12 / 12`
- delta: `0`
- note: no regression; canon-stop behavior still fires first

### Case 6: Stop-instead-of-plan request

- previous experiment: `9 / 10`
- refinement: `9 / 10`
- delta: `0`
- note: no regression; lighter-mode stop behavior remains unchanged

## Core Summary

- previous experiment aggregate: `68 / 74`
- refinement aggregate: `69 / 74`
- improvement: `+1`
- decision: `keep`

## Supplemental Critique Cases

### Case 7: Review-only repo track tightening

Scores:

- `mode_fit`: `2`
- `overplanning_control`: `2`
- `validation_gate`: `2`
- `first_wave_correctness`: `2`
- `canon_alignment`: `2`
- `execution_surface_selection`: `2`
- `queue_conversion_correctness`: `2`
- `replan_metadata_quality`: `2`

Result:

- previous experiment: `15 / 16`
- refinement: `16 / 16`
- delta: `+1`
- note: repo critique metadata now makes the durable-track-only decision read
  deliberate instead of provisional

### Case 8: Review-only queue-pressure request

Scores:

- `mode_fit`: `2`
- `overplanning_control`: `2`
- `validation_gate`: `2`
- `first_wave_correctness`: `2`
- `canon_alignment`: `2`
- `execution_surface_selection`: `2`
- `queue_conversion_correctness`: `2`
- `replan_metadata_quality`: `2`

Result:

- previous experiment: `15 / 16`
- refinement: `16 / 16`
- delta: `+1`
- note: critique metadata now explains why queue conversion remains blocked even
  when the user is pushing for execution

## Decision

Keep the refinement.

The remaining bottleneck is no longer review-only path quality; the critique
path now matches the strongest planner cases closely enough that future tuning
should move to automation or additional benchmark breadth instead of more
prompt broadening.

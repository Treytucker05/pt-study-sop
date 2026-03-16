# Review-Only Experiment Scorecard

**Captured:** 2026-03-16  
**Experiment:** add a review-only planner path, preserve existing valid plan structure, and avoid premature execution conversion on critique requests

Comparison rule:

- compare `Cases 1-6` against the baseline in [baseline-scorecard.md](./baseline-scorecard.md)
- treat `Cases 7-8` as supplemental critique-oriented coverage, not part of the original baseline denominator

## Core Six-Case Comparison

### Case 1: Simple one-wave task

- baseline: `10 / 10`
- experiment: `10 / 10`
- delta: `0`
- note: no regression; small-task downgrade behavior stayed strong

### Case 2: Cross-subsystem feature

- baseline: `16 / 16`
- experiment: `16 / 16`
- delta: `0`
- note: no regression; review-only path did not dilute the main roadmap path

### Case 3: Plan-review-only request

Scores:

- `mode_fit`: `2`
- `overplanning_control`: `2`
- `validation_gate`: `2`
- `first_wave_correctness`: `2`
- `canon_alignment`: `n/a`
- `execution_surface_selection`: `n/a`
- `queue_conversion_correctness`: `n/a`
- `replan_metadata_quality`: `1`

Result:

- baseline: `6 / 10`
- experiment: `9 / 10`
- delta: `+3`
- note: the review-only path fixes the main measured weakness, but critique-style replan metadata is still lighter than it could be

### Case 4: Queue-conversion request

- baseline: `16 / 16`
- experiment: `16 / 16`
- delta: `0`
- note: no regression; explicit queue conversion behavior remains strong

### Case 5: Canon-conflict request

- baseline: `12 / 12`
- experiment: `12 / 12`
- delta: `0`
- note: no regression; canon-stop behavior still fires early

### Case 6: Stop-instead-of-plan request

- baseline: `9 / 10`
- experiment: `9 / 10`
- delta: `0`
- note: no regression; downgrade behavior remains strong

## Core Baseline Summary

- baseline aggregate: `65 / 74`
- experiment aggregate: `68 / 74`
- improvement: `+3`
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
- `replan_metadata_quality`: `1`

Result:

- total score: `15 / 16`
- note: the repo adapter now stays review-shaped and defaults to `durable-track-only` correctly

### Case 8: Review-only queue-pressure request

Scores:

- `mode_fit`: `2`
- `overplanning_control`: `2`
- `validation_gate`: `2`
- `first_wave_correctness`: `2`
- `canon_alignment`: `2`
- `execution_surface_selection`: `2`
- `queue_conversion_correctness`: `2`
- `replan_metadata_quality`: `1`

Result:

- total score: `15 / 16`
- note: the planner now explicitly withholds queue conversion until the revised first wave is truly ready

## Experiment Verdict

- strongest gains:
  - review-only requests no longer read like blank-sheet roadmap generation
  - critique requests now preserve existing valid task structure
  - repo review-only requests default to `durable-track-only` instead of leaning toward execution conversion
- remaining weakness:
  - review-only outputs still keep lighter replan metadata than the strongest roadmap cases
- recommended next tuning target:
  - add critique-specific examples for stronger `blocked_reason` and `expected_evidence` wording without increasing output size again

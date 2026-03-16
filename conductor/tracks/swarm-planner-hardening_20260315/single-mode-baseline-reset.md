# Single-Mode Baseline Reset

**Captured:** 2026-03-16  
**Change:** collapse the planner from multi-mode selection into one
backward-built operating model and replace generic verification fields with
required per-task completion gates

## What changed

- removed explicit orchestration-mode choice from the shared planner contract
- made one operating model canonical: backward-built execution planning
- kept review-only and plan-only as output boundaries instead of alternate modes
- required every task to include a concrete `completion_gate`
- updated repo-local review, conversion, and eval surfaces to match

## Why the prior baseline is no longer directly comparable

The previous benchmark and scorecard family measured:

- `mode_fit`
- `overplanning_control`

This refinement removes planner mode selection entirely and replaces that axis
with:

- `backward_build_integrity`
- `scope_discipline`
- `task_completion_gates`

That means the prior totals in:

- [baseline-scorecard.md](./baseline-scorecard.md)
- [review-only-experiment-scorecard.md](./review-only-experiment-scorecard.md)
- [review-only-metadata-refinement-scorecard.md](./review-only-metadata-refinement-scorecard.md)

remain useful as historical context, but they should not be compared directly
against future runs scored under the new rubric.

## New baseline rule

Future benchmark runs for this planner pair should:

1. use the updated rubric in the repo eval kit
2. record a fresh baseline before claiming deltas
3. treat this file as the transition point between the old multi-mode rubric and
   the new single-mode rubric

## Smoke expectations after the reset

- the shared planner should no longer ask the model to pick among multiple
  orchestration modes
- every plan should state one operating model and then build backward from the
  end goal
- every task should include a concrete completion gate before it can count as
  done
- review-only requests should keep the same planning model and simply stop
  before execution conversion

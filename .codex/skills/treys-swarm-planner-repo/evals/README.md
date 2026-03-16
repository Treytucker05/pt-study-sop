# Planner Eval Kit

Use this kit to tune `treys-swarm-planner-repo` with the same improve-measure-
checkpoint loop used by `trey-autoresearch`.

## Purpose

Keep the current PT system visible first:

- score planner behavior against the current CP-MSS / Control Plane repo canon
- detect when a planning revision starts drifting away from the existing
  control-plane and execution-surface model

Measure whether planner changes improve:

- mode fit
- over-planning control
- first-wave correctness
- canon alignment
- queue/track correctness

## How to use it

1. Run the benchmark prompts in [benchmark-set.md](./benchmark-set.md) against
   the current planner skill pair.
2. Score the outputs with [scorecard.md](./scorecard.md).
3. Save before/after examples in the active track evidence when the skill
   changes.
4. Keep the planner change only if the scores improve without regressing canon
   alignment or first-wave correctness.

## Baseline rules

- Use the same six prompts each time.
- Do not change the rubric mid-comparison.
- Record whether the planner stopped, downgraded, or escalated correctly.
- Record whether queue conversion was withheld when it should have been.

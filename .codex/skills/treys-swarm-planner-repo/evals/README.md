# Planner Eval Kit

Use this kit to tune `treys-swarm-planner-repo` with the same improve-measure-
checkpoint loop used by `trey-autoresearch`.

## Purpose

Keep the current PT system visible first:

- score planner behavior against the current CP-MSS / Control Plane repo canon
- detect when a planning revision starts drifting away from the existing
  control-plane and execution-surface model

Measure whether planner changes improve:

- backward-build integrity
- scope discipline
- task completion gates
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
5. Mark any non-applicable category as `n/a` and exclude it from the case total.

## Baseline rules

- Use the same six core prompts each time when comparing against the existing
  baseline.
- Treat critique-oriented prompts 7-8 as supplemental review-only cases until a
  new full eight-case baseline is intentionally adopted.
- If the rubric changes, capture a new baseline before comparing revisions.
- Record whether the planner stopped, downgraded, or escalated correctly.
- Record whether queue conversion was withheld when it should have been.
- Exclude `n/a` categories from totals instead of treating them as failures.

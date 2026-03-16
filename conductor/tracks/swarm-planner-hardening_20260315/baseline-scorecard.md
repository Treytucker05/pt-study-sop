# Baseline Scorecard: Swarm Planner Hardening

**Captured:** 2026-03-16  
**Planner pair:** shared [treys-swarm-planner](C:/Users/treyt/.agents/skills/treys-swarm-planner/SKILL.md) + repo adapter [treys-swarm-planner-repo](C:/pt-study-sop/.codex/skills/treys-swarm-planner-repo/SKILL.md)

Scoring key:

- `0` = failed or missing
- `1` = partially correct
- `2` = clearly correct
- `n/a` = not relevant for this case and excluded from the total

## Case 1: Simple one-wave task

Prompt:

`Plan a safe update to one frontend component and one matching test. No queue conversion needed.`

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

- total score: `10 / 10`
- note: the current planner contract is strongest here; it now clearly downgrades out of unnecessary swarm mode

## Case 2: Cross-subsystem feature

Prompt:

`Plan a backend/frontend Tutor feature that needs a Conductor track and only the first wave queue-ready.`

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

- total score: `16 / 16`
- note: this is the strongest repo-specific case; the execution-surface selector and validation gate are doing real work

## Case 3: Plan-review-only request

Prompt:

`Review this existing implementation plan, tighten it, and identify the first unblocked wave.`

Scores:

- `mode_fit`: `1`
- `overplanning_control`: `1`
- `validation_gate`: `2`
- `first_wave_correctness`: `1`
- `canon_alignment`: `n/a`
- `execution_surface_selection`: `n/a`
- `queue_conversion_correctness`: `n/a`
- `replan_metadata_quality`: `1`

Result:

- total score: `6 / 10`
- note: weakest current behavior; the planner still reads more like roadmap generation than a pure critique/tightening path

## Case 4: Queue-conversion request

Prompt:

`Convert the accepted first wave of this plan into planner-backed tasks only.`

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

- total score: `16 / 16`
- note: the new preconditions and explicit execution-surface selector make this path much safer than before

## Case 5: Canon-conflict request

Prompt:

`Plan a Tutor feature that changes page ownership in a way that conflicts with README and the current sprint board.`

Scores:

- `mode_fit`: `2`
- `overplanning_control`: `2`
- `validation_gate`: `2`
- `first_wave_correctness`: `2`
- `canon_alignment`: `2`
- `execution_surface_selection`: `n/a`
- `queue_conversion_correctness`: `n/a`
- `replan_metadata_quality`: `2`

Result:

- total score: `12 / 12`
- note: the repo adapter now stops in the right place instead of relying on reviewers to catch the conflict later

## Case 6: Stop-instead-of-plan request

Prompt:

`Make a swarm plan for a tiny one-file typo fix.`

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

- total score: `9 / 10`
- note: stop/downgrade behavior is strong, but replan metadata is intentionally thinner when the correct move is to keep the plan very small

## Baseline Summary

- Aggregate total: `65 / 74`
- Strengths:
  - small-task downgrade behavior
  - canon-stop behavior
  - explicit execution-surface selection
  - queue-conversion safety
- Weaknesses:
  - plan-review-only handling is still too roadmap-shaped
  - replan metadata is less specific on critique-style prompts
- Recommended next tuning target:
  - add a review-only mode path that preserves the validation gate but shortens the plan shape when the job is critique/revision rather than net-new execution planning

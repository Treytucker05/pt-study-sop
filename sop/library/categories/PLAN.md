# PLAN Category Reference

Stage: 0 of 7 (forethought) | Control Stage: `PLAN`
Purpose: Turn a learner goal into a bounded session, week, or multi-week study plan with explicit scope, method choice, and review timing before execution starts.

## Entry / Exit

- **Entry**: A learner goal, usable objective scope, and at least rough time/deadline constraints are available — even if source content has not been fully worked yet.
- **Exit**: A bounded execution plan exists with explicit horizon, ordered blocks, scheduled reviews, and stop/carry-forward rules. The learner can begin execution without re-planning.

## Hard Rules

- Planning only; do not drift into live teaching during a PLAN block.
- Scope must fit the stated horizon — no aspirational schedules.
- Method selection must visibly match the active learner goal preset (exam_cram / deep_mastery / quick_review / clinical_bridge).
- Review timing must be explicit and realistic, not implied.
- Plans must include cut lines and fallback moves; do not assume ideal execution.

## Method Inventory

| ID | Name | Energy | Duration | Key Mechanism |
|----|------|--------|----------|--------------|
| M-PLAN-001 | Session Planning | low | 5 min | goal_setting + strategic_planning |
| M-PLAN-002 | Weekly & Long-term Planning | medium | 7 min | self_regulated_learning + adaptive_regulation |

## Contract Summary

All PLAN methods share these behavioral constraints:

- **Allowed**: Choose a horizon, cut scope, map presets to method chains, assign rough durations, schedule retrieval/calibration reviews, mark optional vs non-negotiable blocks, state stop and carry-forward rules.
- **Forbidden**: Start teaching content during planning, produce a plan with no stated horizon, select methods without tying them to the learner goal preset, omit review timing, build a plan so broad that execution would obviously fail.
- **Required outputs**: Vary per method — see individual YAML files. Both methods produce a scope decision, an ordered plan, a method-selection map, a review schedule, and explicit guardrails.

## PLAN / Execution Boundary

- PLAN owns goal-to-chain mapping and review scheduling. It does not own teaching, encoding, or retrieval — those happen during execution per the chosen chain.
- A PLAN artifact is execution-ready when scope, horizon, method order, and review cadence are all explicit.
- If the learner objective is still fuzzy, route through `M-PRE-010` (Learning Objectives Primer) before planning — a fuzzy objective makes the schedule unreliable.

## Sample Tutor Prompt

```
You are running a PLAN block. Your job is to turn a learner goal and
constraints into a bounded execution plan. Choose the horizon, cut the
scope, select methods that fit the active preset, place reviews on a
real schedule, and state stop/carry-forward rules. Do not teach content.
Ask only for missing planning inputs.
```

## Evidence Anchors

- Locke and Latham (2002): goal-setting theory supports specific, challenging, bounded goals over vague intentions
- Zimmerman (2002): self-regulated learning places planning and task analysis at the front of effective study cycles
- Panadero (2017): forethought, monitoring, and reflection work best when structurally linked
- Cepeda et al. (2006): spacing research supports planned review over massed one-shot study
- Xu, Li, and Yang (2024): goal-planning strategies link with stronger self-efficacy and engagement

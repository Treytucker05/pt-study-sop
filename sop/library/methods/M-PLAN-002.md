---
id: M-PLAN-002
name: Weekly & Long-term Planning
stage: PLAN
status: draft
version: '1.0'
created: '2026-04-21'
updated: '2026-04-21'
tags: [method, M-PLAN, plan]
---

# M-PLAN-002 — Weekly & Long-term Planning

## Summary
Build a weekly or multi-week study plan that ranks priorities, tracks mastery, schedules spaced reviews, and changes shape when deadlines or progress signals change. The method is useful when the learner needs a durable planning system, not just a single session map.

**Not for:** This is not for live teaching, one-session micro-planning, or semester-scale curriculum architecture. Use `M-PLAN-001` for a single session and use execution-stage methods once the weekly or long-range plan is set.

## Core Steps
1. **Define Horizon And Deadline Shape** — set the weekly or multi-week horizon against real deadlines
2. **Rank Priorities By Risk And Value** — decide what actually deserves the next blocks
3. **Build Weekly Work Blocks** — assign methods, durations, and outputs to real calendar space
4. **Attach Mastery Tracking** — define status levels, evidence sources, and next actions
5. **Schedule Spaced Reviews** — place review and recalibration touches across the horizon
6. **Emit Adjustment Rules** — state how the plan compresses, expands, or reroutes as conditions change

## Inputs
- Learner goal or active preset target
- Objective set or content domains to cover
- Planning horizon (one week or multi-week to deadline)
- Deadline and logistics constraints (exam dates, project dates, duty schedule, fixed commitments)
- Current progress signal or mastery estimate

## Required Outputs
- `HorizonAndPriorityPlan`
- `WeeklyOrLongRangePlan`
- `MasteryTrackingMap`
- `SpacedReviewSchedule`
- `DeadlineAdjustmentRules`

## Knob Schema
```yaml
knobs:
  guidance_level: medium
  delivery_mode: stepwise
  fade_intensity: minimal
  output_layout: labeled_sections
  explanation_density: focused
presets:
  exam_cram:
    guidance_level: light
    delivery_mode: one_shot
    fade_intensity: minimal
    output_layout: bullets
    explanation_density: lean
  deep_mastery:
    guidance_level: high
    delivery_mode: interactive
    fade_intensity: adaptive_light
    output_layout: labeled_sections
    explanation_density: detailed
  quick_review:
    guidance_level: light
    delivery_mode: one_shot
    fade_intensity: minimal
    output_layout: table
    explanation_density: lean
  clinical_bridge:
    guidance_level: medium
    delivery_mode: stepwise
    fade_intensity: adaptive_light
    output_layout: table
    explanation_density: focused
```

## Preset Behavior
- `exam_cram` — Fastest long-range plan. Build a short countdown plan to the next exam or deadline with aggressive priority cuts, compressed weekly blocks, and the minimum viable spaced reviews.
- `deep_mastery` — Fullest long-range plan. Build a multi-week mastery plan with explicit milestones, richer method sequencing, recurring tracking updates, and spaced reviews across the whole horizon.
- `quick_review` — Refresh plan. Build a compact weekly maintenance table for already-seen material with one main work block, one retrieval review, and one progress check.
- `clinical_bridge` — Applied plan. Build a weekly or multi-week planning matrix around cases, on-shift constraints, safety-critical topics, and deadline-sensitive review points.

## Runtime Prompt
```text
You are running M-PLAN-002 (Weekly & Long-term Planning) in the PLAN stage.
Use only the loaded source and ask only for missing required inputs.
Produce: HorizonAndPriorityPlan, WeeklyOrLongRangePlan, MasteryTrackingMap, SpacedReviewSchedule, and DeadlineAdjustmentRules.
Build a weekly or multi-week plan by setting the horizon, ranking priorities, assigning real work blocks, tracking mastery, scheduling spaced reviews, and stating how the plan changes when progress or deadlines shift. Do not drift into teaching.
Preset behavior:
- exam_cram: one-shot; short countdown plan to the next deadline; aggressive cuts; minimal viable spaced reviews.
- deep_mastery: interactive; multi-week mastery plan with milestones, recurring tracking, and fuller review spacing.
- quick_review: one-shot refresh; compact weekly maintenance table with one main block, one retrieval review, and one progress check.
- clinical_bridge: stepwise; applied weekly or multi-week matrix built around cases, shifts, safety-critical topics, and deadline-sensitive reviews.
If no preset is specified, use the default knobs. One-shot returns the full plan in one bounded reply; interactive or stepwise mode moves horizon -> priorities -> schedule -> reviews -> adjustment rules and waits.
```

## Evidence
- **Citation:** Locke and Latham (2002); Zimmerman (2002); Panadero (2017); Cepeda, Pashler, Vul, Wixted, and Rohrer (2006); Kitsantas, Winsler, and Huie (2008); Wirth, Fahr, and Seifried (2024)
- **Finding:** Weekly & Long-term Planning is best supported as a self-regulated forethought scaffold that combines clear goals, strategic planning, progress monitoring, and scheduled review across time. Goal-setting theory supports specific and challenging goals over vague intentions; self-regulated-learning theory places planning, task analysis, and adaptive monitoring at the start of effective study cycles; later SRL reviews support linking forethought, monitoring, and reflection rather than treating them as separate habits; spacing research supports planned review over massed study; and classroom time-management and planning studies show that explicit schedule-and-goal interventions can improve organization, reduce stress, and strengthen academic follow-through. The practical implication for this method is to make priority ranking visible, attach mastery tracking to evidence, pre-schedule reviews, and state exactly how the plan changes when progress or deadlines shift.
- **Source:** `https://doi.org/10.1037/0003-066X.57.9.705`; `https://doi.org/10.1207/S15430421TIP4102_2`; `https://doi.org/10.3389/fpsyg.2017.00422`; `https://doi.org/10.1037/0033-2909.132.3.354`; `https://doi.org/10.1016/j.appdev.2008.04.001`; `https://doi.org/10.14434/josotl.v22i3.32378`
- **Needs research:** `false`

## Related Methods
- [[M-PLAN-001]] — Use when the learner needs a single-session plan instead of a weekly or long-range arc.
- [[M-CAL-002]] — Use when the plan needs fuller progress evidence before the next re-ranking pass.

## Changelog
- **v1.0** — created the PLAN-stage Weekly & Long-term Planning method using the current method template, with weekly and multi-week horizon setting, mastery tracking, spaced review scheduling, deadline adjustment rules, and a planning-focused evidence stack grounded in goal-setting, self-regulated learning, and spacing.

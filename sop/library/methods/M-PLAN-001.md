---
id: M-PLAN-001
name: Session Planning
stage: PLAN
status: draft
version: '1.0'
created: '2026-04-21'
updated: '2026-04-21'
tags: [method, M-PLAN, plan]
---

# M-PLAN-001 — Session Planning

## Summary
Turn a learner goal into a bounded study session or one-week plan with explicit scope, method choice, and review timing before execution starts. The method is useful when the learner does not need more ideas; they need a plan that can actually run.

**Not for:** This is not for teaching content, broad curriculum design across many months, or open-ended brainstorming with no active objective. Use `EXPLAIN` or `ENCODE` once the plan is already set.

## Core Steps
1. **Set Scope And Horizon** — choose the session or week horizon and cut the scope to fit it
2. **Match Goal To Method Mix** — select methods that fit the learner goal preset and real constraints
3. **Sequence The Plan** — lay out the actual order, durations, and handoffs
4. **Schedule Reviews** — place retrieval or calibration reviews on an explicit schedule
5. **Emit Planning Guardrails** — state cut lines, fallback moves, and carry-forward rules

## Inputs
- Learner goal or active preset target
- Objective scope or target content set
- Time horizon (single session or one-week plan)
- Time and logistics constraints (minutes, days, exam date, duty context, energy)

## Required Outputs
- `ScopeAndHorizonDecision`
- `SessionOrWeekPlan`
- `MethodSelectionMap`
- `ReviewSchedule`
- `PlanningGuardrails`

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
- `exam_cram` — Fastest useful plan. Build one compressed study session with a minimal method chain, hard time cuts, and one or two short scheduled reviews in the next 72 hours.
- `deep_mastery` — Fullest plan. Build a one-week arc with a richer stage mix, explicit block rationales, planned calibration points, and spaced review touches across the week.
- `quick_review` — Refresh plan. Build a compact already-seen-material plan as a short table with a brief session block, one retrieval review, and one carry-forward check.
- `clinical_bridge` — Applied plan. Build the session or week around case exposure, decision cues, and safety-critical reviews, then present the schedule as an applied planning matrix.

## Runtime Prompt
```text
You are running M-PLAN-001 (Session Planning) in the PLAN stage.
Use only the loaded source and ask only for missing required inputs.
Produce: ScopeAndHorizonDecision, SessionOrWeekPlan, MethodSelectionMap, ReviewSchedule, and PlanningGuardrails.
Build a bounded session or one-week plan by choosing the horizon, cutting the scope, selecting methods that match the learner goal preset, and scheduling review before execution starts. Do not drift into teaching.
Preset behavior:
- exam_cram: one-shot; compressed single-session plan; minimal chain; one or two short scheduled reviews.
- deep_mastery: interactive; one-week plan; richer stage mix; explicit calibration and spaced review points.
- quick_review: one-shot refresh; compact table for already-seen material with one retrieval review and one carry-forward check.
- clinical_bridge: stepwise; applied planning matrix built around case work, decision cues, and safety-critical reviews.
If no preset is specified, use the default knobs. One-shot returns the full plan in one bounded reply; interactive or stepwise mode moves scope -> method mix -> schedule -> guardrails and waits.
```

## Evidence
- **Citation:** Locke and Latham (2002); Zimmerman (2002); Panadero (2017); Cepeda, Pashler, Vul, Wixted, and Rohrer (2006); Xu, Li, and Yang (2024)
- **Finding:** Session Planning is best supported as a forethought-stage scaffold that makes goals, strategy choice, and review timing explicit before execution begins. Goal-setting theory supports specific, challenging, bounded goals over vague intentions; classic self-regulated-learning work places planning and task analysis at the front of effective study cycles; later SRL reviews show that forethought, monitoring, and reflection work best when they are structurally linked; spacing research supports planned review over massed one-shot study; and recent classroom evidence continues to link goal-planning strategies with stronger self-efficacy and engagement. The practical implication for this method is to choose a real horizon, cut the scope aggressively, select a small method mix that fits the learner goal, and place reviews on the calendar before the session starts.
- **Source:** `https://doi.org/10.1037/0003-066X.57.9.705`; `https://doi.org/10.1207/S15430421TIP4102_2`; `https://doi.org/10.3389/fpsyg.2017.00422`; `https://doi.org/10.1037/0033-2909.132.3.354`; `https://doi.org/10.1016/j.system.2024.103451`
- **Needs research:** `false`

## Related Methods
- [[M-PRE-010]] — Use when the learner first needs a tighter objective set before a plan can be built.
- [[M-OVR-003]] — Use when the plan needs an explicit drill or cross-session review artifact.

## Changelog
- **v1.0** — created the PLAN-stage Session Planning method using the current method template, with explicit scope and horizon setting, preset-driven method selection, scheduled reviews, and a planning-focused evidence stack grounded in goal-setting and self-regulated learning.

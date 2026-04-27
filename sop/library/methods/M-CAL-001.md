---
id: M-CAL-001
name: Micro Precheck
stage: CALIBRATE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-CAL, calibrate]
---

# M-CAL-001 — Micro Precheck

## Summary
Run a short scored micro-baseline at session opening to estimate readiness before instruction without turning the block into teaching. The method stays diagnostic, captures confidence alongside performance, and ends with a reusable readiness signal rather than a lesson.

**Not for:** teaching new material, extended explanation, or open-ended discussion. Use `EXPLAIN` when the goal is instruction and `CONSOLIDATE` when the goal is artifact building.

## Core Steps
1. **Start Timed Calibrate Block** — open the short diagnostic block with the hard time cap
2. **Deliver Short Items** — run the brief scoped probes with no hints first
3. **Capture Scoring Signals** — record correctness, latency, and confidence per item
4. **Compute Readiness Snapshot** — summarize accuracy, calibration gap, and dominant error class

## Inputs
- Active objective targets
- Calibrate item set aligned to scope
- `objective_scope` and focus objective context

## Required Outputs
- `CalibrateItemResults (per-item correctness, latency, confidence)`
- `ReadinessSnapshot (accuracy summary)`
- `CalibrationGapSummary (predicted vs actual gap)`
- `DominantErrorSeed (highest-frequency error class)`
- `MicroCalibrateSnapshot (opening readiness signal for TEACH routing)`

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
- `exam_cram` — one-shot, fastest precheck. Use 2 short items, terse score bullets, a one-line readiness call, and only the single dominant error seed.
- `deep_mastery` — interactive, fuller micro-diagnostic. Use 4-5 items, keep the per-item log explicit, and give a fuller calibration-gap summary before routing.
- `quick_review` — one-shot refresh check. Use 2-3 items, compress the narrative summaries, and render the result as a compact score table plus one route decision.
- `clinical_bridge` — stepwise applied readiness check. Use brief cue-based or mini-scenario probes, show route-relevant misses in a decision table, and emphasize whether the learner is ready for the next applied step.

## Runtime Prompt
```text
You are running M-CAL-001 (Micro Precheck) in the CALIBRATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: CalibrateItemResults, ReadinessSnapshot, CalibrationGapSummary, DominantErrorSeed, and MicroCalibrateSnapshot.
Run a short scored readiness check before EXPLAIN. Keep it diagnostic only, require one real attempt before any answer reveal, capture confidence before feedback, and stop at the item or time cap.
Preset behavior:
- exam_cram: one-shot; 2 items; terse score bullets; one-line readiness call.
- deep_mastery: interactive; 4-5 items; explicit per-item log; fuller calibration-gap summary before routing.
- quick_review: one-shot refresh; 2-3 items; compact score table plus one route decision.
- clinical_bridge: stepwise; use brief applied probes or mini-scenarios and summarize misses in a route-focused decision table.
If no preset is specified, use the default knobs. One-shot returns the full diagnostic artifact in one bounded reply; interactive or stepwise mode moves probe -> scoring -> snapshot and waits.
```

## Evidence
- **Citation:** Black and Wiliam (1998); Hattie and Timperley (2007); Wisniewski, Zierer, and Hattie (2020); Soderstrom and Bjork (2023); Amos and Yao (2024); Pan, Wang, and Zhu (2024)
- **Finding:** Micro Precheck is best supported as a short formative diagnostic that gathers usable evidence before instruction, not as a disguised mini-lesson. Black and Wiliam's foundational review supports brief classroom assessments that surface current understanding so teaching can be adjusted in real time. Hattie and Timperley plus the later feedback meta-analysis show that the value of a check depends on whether it yields actionable information about the gap between current and desired performance, rather than vague praise or extra exposition. Recent classroom pretesting work shows that short low-stakes pretests at the start of lectures can improve later learning and help students notice what to study, while recent classroom and meta-analytic formative-assessment studies support concise questioning and other brief checks when they produce interpretable readiness signals that can guide the next instructional move.
- **Source:** `https://doi.org/10.1080/0969595980050102`; `https://doi.org/10.3102/003465430298487`; `https://doi.org/10.3389/fpsyg.2019.03087`; `https://doi.org/10.1007/s10648-023-09805-6`; `https://doi.org/10.1080/13803611.2024.2363831`; `https://www.nature.com/articles/s41599-024-04086-y`
- **Needs research:** `false`

## Related Methods
- [[M-CAL-002]] — Escalate to fuller probes when the micro baseline is too coarse
- [[M-CAL-004]] — Use a story-level confidence check when item-level probing is too much

## Changelog
- **v1.1** — migrated the method to the stage-first `CALIBRATE` architecture, normalized metadata naming, and preserved the original diagnostic logic.
- **v1.2** — upgraded the evidence stack to stronger formative-assessment, feedback, and classroom pretesting sources; replaced the legacy knob block with the standard schema plus four distinct presets; tightened the runtime prompt; rebuilt the markdown note into the current template structure; and preserved the original method logic, steps, outputs, and constraints.

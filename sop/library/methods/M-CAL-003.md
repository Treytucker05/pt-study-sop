---
id: M-CAL-003
name: Full Calibrate Priority Set
stage: CALIBRATE
status: validated
version: '1.3'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-CAL, calibrate]
---

# M-CAL-003 — Full Calibrate Priority Set

## Summary
Convert full-calibrate telemetry into a deterministic top-3 weakness ranking that drives the next ENCODE move. The method stays diagnostic, ranks only the most important weaknesses, and ends with a structured handoff instead of drifting into teaching.

**Not for:** teaching new material, extended explanation, or open-ended discussion. Use `EXPLAIN` when the goal is instruction and `CONSOLIDATE` when the goal is artifact building.

## Core Steps
1. **Aggregate Misses by Error** — group misses into the method’s fixed error types
2. **Score Weakness Impact** — weight frequency, confidence mismatch, and latency
3. **Rank Weaknesses** — emit exactly 3 ranked priorities with deterministic tie-breaks
4. **Map to ENCODE Action** — attach one method-family recommendation per ranked weakness

## Inputs
- `FullCalibrateItemResults`
- `FullCalibrateSnapshot`
- Confidence-tagged results
- Error-type labels

## Required Outputs
- `FullCalibratePrioritySet (exactly 3 ranked weaknesses)`
- `WeaknessScoreTable (scoring breakdown per weakness)`
- `EncodeRoutingSeed (one ENCODE method-family recommendation per weakness)`
- `FullCalibrateHandoff (diagnostic-to-encode handoff contract)`

## Knob Schema
```yaml
knobs:
  guidance_level: medium
  delivery_mode: one_shot
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
- `exam_cram` — one-shot, fastest triage pass. Return only the top 3 ranked weaknesses with terse why-lines and one-line ENCODE seeds.
- `deep_mastery` — interactive, fullest ranking pass. Keep the score table explicit, show tie-break reasoning, and give slightly richer routing rationales before the handoff.
- `quick_review` — one-shot refresh triage. Compress narrative explanation and present the top 3 plus routing seeds in a compact priority table.
- `clinical_bridge` — stepwise applied routing pass. Frame weaknesses as likely downstream failure points, show them in a handoff matrix, and emphasize the next applied ENCODE move rather than the ranking math.

## Runtime Prompt
```text
You are running M-CAL-003 (Full Calibrate Priority Set) in the CALIBRATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: FullCalibratePrioritySet, WeaknessScoreTable, EncodeRoutingSeed, and FullCalibrateHandoff.
Convert full-calibrate telemetry into exactly 3 ranked weaknesses. Keep the ranking deterministic, score frequency plus confidence-mismatch plus latency, and hand off one ENCODE method-family recommendation per weakness without teaching the content.
Preset behavior:
- exam_cram: one-shot; terse bullets; top 3 only; one-line ENCODE seeds.
- deep_mastery: interactive; labeled sections; explicit score table, tie-break logic, and richer routing rationale.
- quick_review: one-shot refresh; compact priority table with minimal narrative.
- clinical_bridge: stepwise; handoff matrix focused on likely downstream failure points and next applied ENCODE moves.
If no preset is specified, use the default knobs. One-shot returns the full ranking artifact in one bounded reply; interactive or stepwise mode moves scoring -> ranking -> handoff and waits.
```

## Evidence
- **Citation:** Black and Wiliam (1998); Hattie and Timperley (2007); Wisniewski, Zierer, and Hattie (2020); Clark, Kobrin, Karvonen, and Hirt (2023); Pan, Wang, and Zhu (2024); Bez, Burkart, Tomasik, and Merk (2025)
- **Finding:** Full Calibrate Priority Set is best supported as a diagnostic-routing method that converts assessment evidence into a small actionable next-step set, not as a reteaching block. Black and Wiliam's foundational review supports using classroom assessment evidence to adjust subsequent instruction rather than relying on intuition. Hattie and Timperley, reinforced by the later feedback meta-analysis, support feedback and diagnostic summaries that reduce the gap between current and desired performance by making the next move explicit and actionable. More recent classroom studies show the same practical constraint from another angle: diagnostic score reports, strategic questioning, and formative-assessment dashboards are only useful when teachers can interpret the signal, identify the most important errors, and translate them into concrete instructional implications. The practical implication for this method is to rank only a few weaknesses, keep the scoring deterministic, and hand off concise ENCODE recommendations instead of an undifferentiated list of problems.
- **Source:** `https://doi.org/10.1080/0969595980050102`; `https://doi.org/10.3102/003465430298487`; `https://doi.org/10.3389/fpsyg.2019.03087`; `https://doi.org/10.7275/pare.1255`; `https://www.nature.com/articles/s41599-024-04086-y`; `https://doi.org/10.1016/j.learninstruc.2025.102100`
- **Needs research:** `false`

## Related Methods
- [[M-CAL-002]] — Consumes the full-probe telemetry that feeds ranking
- [[M-REF-003]] — Can hand off into a compact reference anchor for priority weak spots

## Changelog
- **v1.1** — migrated structural metadata to the stage-first architecture: category metadata now uses `CALIBRATE`, the subcategory is `priority-routing`, and tags were aligned to calibration-first metadata.
- **v1.2** — cleaned up leftover stage-language references so the body text matches the stage-first architecture without changing method logic.
- **v1.3** — upgraded the evidence stack to stronger diagnostic-routing, actionable-feedback, and classroom signal-interpretation sources; replaced the legacy knob block with the standard schema plus four distinct presets; tightened the runtime prompt; rebuilt the markdown note into the current template structure; and preserved the original method logic, steps, outputs, and constraints. The live file was already `v1.2`, so this hardening pass advanced to `v1.3`.

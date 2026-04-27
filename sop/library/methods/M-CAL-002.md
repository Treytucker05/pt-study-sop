---
id: M-CAL-002
name: Full Calibrate Probes
stage: CALIBRATE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-CAL, calibrate]
---

# M-CAL-002 — Full Calibrate Probes

## Summary
Run a fuller scored probe set after a TEACH-close artifact to generate routing evidence without turning the block into teaching. The method stays diagnostic, preserves confidence-before-feedback order, and ends with a reusable risk-and-readiness signal rather than more explanation.

**Not for:** teaching new material, extended explanation, or open-ended discussion. Use `EXPLAIN` when the goal is instruction and `CONSOLIDATE` when the goal is artifact building.

## Core Steps
1. **Run Scored Probes** — run the fuller probe set against the active objective scope
2. **Apply Confidence Tag** — capture confidence before correctness feedback on each item
3. **Identify Miscalibration Signals** — separate high-confidence misses from low-confidence hits
4. **Compute Bias and Risk Flags** — summarize the pattern and emit routing signals

## Inputs
- TEACH-close artifact (anchor/map/table/flow)
- Full-calibrate probe set aligned to objective scope
- Item correctness
- Item latency

## Required Outputs
- `FullCalibrateItemResults (per-item correctness, latency, confidence)`
- `ConfidenceTaggedResults (per-item confidence + correctness)`
- `HighConfidenceMisses (overconfidence items)`
- `LowConfidenceHits (underconfidence items)`
- `CalibrationRiskFlags (routing signals for downstream methods)`
- `FullCalibrateSnapshot (post-TEACH diagnostic summary)`

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
- `exam_cram` — one-shot, fastest full probe pass. Use the lower end of the configured probe count, keep confidence tagging terse, and return only the most decision-relevant misses, hits, and route call.
- `deep_mastery` — interactive, fullest diagnostic pass. Use the upper end of the configured probe count, keep the per-item log explicit, and give a fuller bias readout before routing.
- `quick_review` — one-shot refresh probe. Use a mid-range probe count, compress the narrative summaries, and present the result as a compact score-and-risk table plus one route decision.
- `clinical_bridge` — stepwise applied probe set. Use brief scenario or cue-based probes, show overconfidence and underconfidence signals in a routing matrix, and emphasize the next applied action or follow-up method.

## Runtime Prompt
```text
You are running M-CAL-002 (Full Calibrate Probes) in the CALIBRATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: FullCalibrateItemResults, ConfidenceTaggedResults, HighConfidenceMisses, LowConfidenceHits, CalibrationRiskFlags, and FullCalibrateSnapshot.
Run a fuller scored readiness block after the TEACH-close artifact. Keep it diagnostic only, require one real attempt before any answer reveal, capture confidence before feedback on every item, and stop at the configured probe or time cap.
Preset behavior:
- exam_cram: one-shot; lower-end probe count; terse bullets; only the most decision-relevant risks and route call.
- deep_mastery: interactive; upper-end probe count; explicit per-item log; fuller bias readout before routing.
- quick_review: one-shot refresh; mid-range probe count; compact score-and-risk table plus one route decision.
- clinical_bridge: stepwise; use brief applied probes and summarize overconfidence or underconfidence signals in a routing matrix.
If no preset is specified, use the default knobs. One-shot returns the full diagnostic artifact in one bounded reply; interactive or stepwise mode moves probes -> risk patterning -> snapshot and waits.
```

## Evidence
- **Citation:** Black and Wiliam (1998); Hattie and Timperley (2007); Wisniewski, Zierer, and Hattie (2020); Amos and Yao (2024); Pan, Wang, and Zhu (2024); Ebrahim, Antink, Andargie, and Barke (2024)
- **Finding:** Full Calibrate Probes is best supported as a fuller diagnostic block that produces interpretable routing evidence after an initial teaching pass, not as a second teaching block. Black and Wiliam's foundational review supports classroom assessment moves that surface current understanding so later instruction can be adjusted on the basis of evidence rather than impressions. Hattie and Timperley plus the later feedback meta-analysis support probe designs that yield actionable gap information, especially when the result is used to identify what is secure, what is risky, and what should happen next. More recent classroom and meta-analytic studies support brief but structured questioning, formative probe sets, and other classroom checks when they create usable readiness signals rather than generic participation data. The practical implication for this method is to keep the probes scoped, score confidence before feedback, and use the resulting miscalibration patterns to route the learner rather than reteach mid-block.
- **Source:** `https://doi.org/10.1080/0969595980050102`; `https://doi.org/10.3102/003465430298487`; `https://doi.org/10.3389/fpsyg.2019.03087`; `https://doi.org/10.1080/13803611.2024.2363831`; `https://www.nature.com/articles/s41599-024-04086-y`; `https://doi.org/10.1039/D2RP00340F`
- **Needs research:** `false`

## Related Methods
- [[M-CAL-001]] — Use a faster micro baseline before a full probe set
- [[M-CAL-003]] — Convert telemetry into the top three priorities after probing

## Changelog
- **v1.1** — migrated the method to the stage-first `CALIBRATE` architecture, normalized metadata naming, and preserved the original full-probe diagnostic logic.
- **v1.2** — upgraded the evidence stack to stronger diagnostic-assessment, feedback, and classroom probe-design sources; replaced the legacy knob block with the standard schema plus four distinct presets; tightened the runtime prompt; rebuilt the markdown note into the current template structure; and preserved the original method logic, steps, outputs, and constraints.

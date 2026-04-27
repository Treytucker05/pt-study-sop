---
id: M-RET-006
name: Adversarial Drill
stage: RETRIEVE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, RET, retrieve]
---

# M-RET-006 — Adversarial Drill

## Summary
Use near-miss prompts to force the learner to separate confusable concepts under low support, then log the misses for targeted repair. The method is built to expose false certainty and shallow discrimination.

**Not for:** This is not for open-note review, answer-reveal first workflows, or deep teaching. Use REFERENCE if the learner needs an anchor first.

## Core Steps
1. **Select confusable pairs with** — Select confusable pairs with highest error risk. Use recent Confusion errors first
2. **Ask near-miss prompts with** — Ask near-miss prompts with minimal cues. Require explicit discriminator in each response
3. **Log misses to ErrorLog.csv.** — Log misses to ErrorLog.csv. Include error_type and fix_applied

## Inputs
- Confusable pairs from Spine or ErrorLog
- Question Bank Seed

## Required Outputs
- `Adversarial near-miss results with discrimination accuracy`
- `ErrorLog updates (error_type and fix_applied per miss)`

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
- `exam_cram` — Fastest adversarial pass. Use 5 near-miss pairs, terse bullets, and only the most dangerous confusions plus fix tags.
- `deep_mastery` — Fullest adversarial pass. Use a larger confusable set, keep per-pair discrimination outcomes explicit, and return a fuller ErrorLog-ready table.
- `quick_review` — Refresh adversarial pass. Use a compact confusion grid with pair, learner choice, discriminator, and result columns.
- `clinical_bridge` — Applied adversarial pass. Use clinical or action-level near misses and organize the results as a short risk-and-fix matrix.

## Runtime Prompt
```text
You are running M-RET-006 (Adversarial Drill) in the RETRIEVE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Adversarial near-miss results with discrimination accuracy and ErrorLog updates.
Run a low-support near-miss drill that forces the learner to name the discriminator before any feedback. Keep it diagnostic, log misses cleanly, and do not rescue the attempt with teaching.
Preset behavior:
- exam_cram: one-shot; 5 pairs; terse bullets; only the most dangerous confusions and fix tags.
- deep_mastery: interactive; larger confusable set; explicit per-pair outcomes and fuller ErrorLog-ready table.
- quick_review: one-shot refresh; compact confusion grid.
- clinical_bridge: stepwise; clinical or action-level near misses organized in a short risk-and-fix matrix.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves pairs -> scoring -> logging and waits.
```

## Evidence
- **Citation:** Ahn and Bjork (2018); Kang and Pashler (2012); Brunmair and Richter (2019); Rohrer, Dedrick, Hartwig, and Cheung (2020)
- **Finding:** Adversarial Drill is best supported as a discrimination-heavy retrieval routine that uses confusable alternatives to sharpen category boundaries. Research on inductive discrimination and interleaving shows that near-miss contrasts can improve later classification, while classroom mixed-practice work supports exposing confusion rather than hiding it inside blocked review. The practical implication for this method is to choose genuinely confusable pairs, require the learner to state the discriminator, and log misses in a way that supports later repair instead of reteaching mid-block.
- **Source:** `https://doi.org/10.1177/2372732218814861; https://doi.org/10.1007/s11251-007-9015-8; https://doi.org/10.1007/s11251-020-09504-7; https://doi.org/10.1037/edu0000367`
- **Needs research:** `false`

## Related Methods
- [[M-REF-001]] — Adversarial misses should be autopsied
- [[M-REF-003]] — Compact anchors help separate near-miss concepts

## Changelog
- **v1.0** — prior method draft preserved the original retrieval flow before this production hardening pass.
- **v1.2** — upgraded the evidence stack to stronger, method-relevant sources; added the standard knob schema plus four clearly distinct presets; tightened the runtime prompt; rebuilt the markdown note into the current production template; and preserved the original method logic, steps, outputs, and constraints.

## Summary of Changes
- Strengthened the evidence section around near-miss discrimination, interleaving, and classroom mixed-practice findings.
- Made the presets materially different in pair count, artifact style, and applied emphasis.
- Tightened the facilitation prompt into a shorter discriminator-first drill contract.
- Rebuilt the markdown note into the current template while preserving the original confusable-pair and ErrorLog workflow.

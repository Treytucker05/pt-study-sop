---
id: M-INT-004
name: Side-by-Side Comparison
stage: INTERROGATE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-INT, interrogate]
---

# M-INT-004 — Side-by-Side Comparison

## Summary
Compare two confusable concepts in a memory-first table, then verify against source and mark the discriminators. The method stays on already-encoded material, makes the confusion pattern visible, and ends with a usable differential cue instead of a vague compare-contrast summary.

**Not for:** first exposure, direct lecturing, or introducing brand-new material that has not already been encoded.

## Core Steps
1. **Choose the Confusable Pair** — pick the two concepts most likely to be mixed up
2. **Build the Table Frame** — set one column per concept
3. **Set the Comparison Rows** — choose 5-7 meaningful dimensions
4. **Fill From Memory First** — complete the table before checking source
5. **Verify and Correct** — mark what changed against source
6. **Highlight the Discriminators** — name the clearest differentiating cues

## Inputs
- Two confusable concepts
- Comparison dimensions (features to compare)
- Source material for accuracy

## Required Outputs
- `Side-by-side comparison table (5-7 rows minimum)`
- `Discriminating features highlighted (the key differentiators)`
- `Error list from initial memory-first attempt`

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
- `exam_cram` — one-shot, fastest comparison pass. Build a 5-row sprint table, name 2-3 discriminator bullets, and log only the highest-value correction misses.
- `deep_mastery` — interactive, fullest comparison pass. Build a 7-row table, rank the discriminators, and keep a fuller correction log that explains where the initial confusion came from.
- `quick_review` — one-shot refresh pass. Use one compact table with columns for dimension, concept A, concept B, and discriminator, followed by a short correction list.
- `clinical_bridge` — stepwise applied pass. Weight the rows toward presentation, red flags, testing, treatment, and prognosis so the final discriminators read like decision cues under pressure.

## Runtime Prompt
```text
You are running M-INT-004 (Side-by-Side Comparison) in the INTERROGATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Side-by-side comparison table, Discriminating features highlighted, and Error list from initial attempt.
Compare two confusable concepts by building a memory-first table, correcting it against source, and ending with the clearest differentiators. Do not turn the run into a lecture or fill the table for the learner.
Preset behavior:
- exam_cram: one-shot; 5-row sprint table; 2-3 discriminator bullets; minimal correction list.
- deep_mastery: interactive; 7-row table; ranked discriminators; fuller correction notes.
- quick_review: one-shot refresh; compact comparison table plus short correction list.
- clinical_bridge: stepwise; differential-style table weighted toward presentation, testing, treatment, and prognosis.
If no preset is specified, use the default knobs. One-shot returns the full comparison artifact in one bounded reply; interactive or stepwise mode moves pair -> rows -> table -> discriminators and waits.
```

## Evidence
- **Citation:** Alfieri, Nokes-Malach, and Schunn (2013); Richland and McDonough (2010); Richland and Simms (2015); Loibl, Tillema, Rummel, and van Gog (2020); Blair, Banes, and Martin (2024)
- **Finding:** Side-by-Side Comparison is best supported as a guided comparison and discrimination method, not as a passive review table. Meta-analytic and review work on case comparison suggests that carefully aligned contrasts help learners notice deep structure, form better categories, and separate confusable alternatives more reliably than studying cases in isolation. More recent classroom and instructional studies show both the benefit and the constraint: contrasting cases can sharpen noticing and transfer, but the effect depends on having well-chosen dimensions and enough guidance to surface the deep features rather than leaving learners with shallow surface contrasts. The practical implication for this method is to require a memory-first table, enforce 5-7 meaningful dimensions, verify errors explicitly, and end by naming the highest-yield discriminator instead of stopping at generic compare-contrast prose.
- **Source:** `https://doi.org/10.1080/00461520.2013.775712`; `https://doi.org/10.1016/j.cedpsych.2009.09.001`; `https://doi.org/10.1002/wcs.1336`; `https://doi.org/10.1007/s11251-020-09504-7`; `https://doi.org/10.1007/s11251-024-09661-z`
- **Needs research:** `false`

## Related Methods
- [[M-ORG-002]] — Comparison-table cousin method
- [[M-INT-006]] — Illness-script fallback if clinical discrimination is needed
- [[M-INT-002]] — Clinical application fallback

## Changelog
- **v1.0** — initial validated spec.
- **v1.2** — migrated the method to the stage-first `INTERROGATE` architecture; upgraded the evidence stack to stronger comparison-learning, contrasting-cases, and classroom noticing sources; replaced the legacy knob block with the standard schema plus four distinct presets; tightened the runtime prompt; rebuilt the markdown note into the current template; and preserved the original comparison flow, outputs, and constraints.

### Summary of Changes
- Replaced the thin one-line evidence stub with a stronger stack centered on case comparison, structural alignment, contrasting cases, and recent classroom noticing studies.
- Reframed the method as a memory-first discrimination tool instead of a generic compare-contrast worksheet.
- Made the presets materially different by table density, correction depth, and applied differential emphasis.
- Tightened the facilitation prompt so it is shorter, less repetitive, and explicit about preset behavior.
- Rebuilt the markdown note into the current production template while keeping the original six-step teaching flow intact.

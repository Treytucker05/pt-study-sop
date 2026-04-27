---
id: M-ORG-002
name: Comparison Table
stage: ENCODE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-ORG, encode]
---

# M-ORG-002 -- Comparison Table

## Summary
Create a side-by-side table comparing 2-4 confusable concepts across shared features. Highlight discriminating features. Builds differential diagnosis skill. The method stays memory-first, forces discriminator highlighting, and ends with reusable if-then rules rather than a decorative table.

**Not for:** This is not for isolated trivia, free-form brainstorming, or content that has no meaningful structure to map.

## Core Steps
1. **Table With Concepts As Columns** -- Create table with concepts as columns
2. **List Comparison Dimensions As Rows** -- List comparison dimensions as rows
3. **Each Cell From Memory First** -- Fill each cell from memory first
4. **Source Material And Correct Errors** -- Check source material and correct errors
5. **Highlight The Discriminating Features** -- Highlight the discriminating features
6. **Generate 1 2 If Then** -- Generate 1-2 "If...then" rules from discriminators

## Inputs
- 2-4 confusable concepts to compare
- List of comparison dimensions/features
- Source material for accuracy

## Required Outputs
- `Completed comparison table`
- `Discriminating features highlighted`
- `Differential rules (1-2 per comparison)`
- `Error list from initial attempt`

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
    output_layout: table
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
- `exam_cram` -- One-shot; build the smallest useful comparison table with the key discriminators and one if-then rule per concept pair.
- `deep_mastery` -- Interactive; fill the table dimension by dimension, surface error corrections, and write fuller differential rules at the end.
- `quick_review` -- One-shot refresh; compress the artifact into a compact discriminator table plus one carry-forward rule block.
- `clinical_bridge` -- Stepwise; use an applied differential grid with clue, likely confusion, and confirming feature columns.

## Runtime Prompt
```text
You are running M-ORG-002 (Comparison Table) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Completed comparison table, Discriminating features highlighted, Differential rules, and Error list from initial attempt.
Build a side-by-side table for 2-4 confusable concepts. Fill it from memory first, verify against the source, highlight the real discriminators, and finish with short if-then rules.
Preset behavior:
- exam_cram: one-shot; smallest useful table plus one if-then rule per comparison.
- deep_mastery: interactive; dimension-by-dimension fill with explicit error correction and fuller rules.
- quick_review: one-shot refresh; compact discriminator table plus one rule block.
- clinical_bridge: stepwise; applied differential grid with clue, likely confusion, and confirming feature columns.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves table -> correction -> discriminator rules and waits.
```

## Evidence
- **Citation:** Alfieri, Nokes-Malach, and Schunn (2013); Richland and McDonough (2010); Richland and Simms (2015); Loibl, Tillema, Rummel, and van Gog (2020); Blair, Banes, and Martin (2024)
- **Finding:** Comparison Table is best supported as a guided comparison method that helps learners discriminate confusable alternatives by aligning the same dimensions across cases. Comparison research shows that side-by-side alignment helps learners notice deep features, form better categories, and transfer distinctions more reliably than studying examples in isolation. More recent instructional work adds the practical boundary condition: the table only helps when the dimensions are meaningful and the learner must actively fill them rather than passively read a completed chart. The practical implication for this method is to force a memory-first fill, highlight the real discriminators, and end with short if-then rules that can be reused during later retrieval.
- **Source:** `https://doi.org/10.1080/00461520.2013.775712`; `https://doi.org/10.1016/j.cedpsych.2009.09.001`; `https://doi.org/10.1002/wcs.1336`; `https://doi.org/10.1007/s11251-020-09504-7`; `https://doi.org/10.1007/s11251-024-09661-z`
- **Needs research:** `false`

## Related Methods
- [[M-INT-004]] -- Use when the learner needs a fuller side-by-side teaching pass before encoding the table
- [[M-RET-006]] -- Use when the finished discriminators should be stress-tested with near-miss retrieval prompts

## Changelog
- **v1.2** -- production hardening pass: upgraded the evidence stack to stronger guided comparison and discrimination sources, added the standard knob schema plus four distinct presets, tightened the runtime prompt, rebuilt the markdown note into the current template, and preserved the original method logic, steps, outputs, and constraints.

### Summary of Changes
- Upgraded the Evidence section with stronger and more relevant citations.
- Made `exam_cram`, `deep_mastery`, `quick_review`, and `clinical_bridge` produce clearly distinct behavior and output formats.
- Tightened the facilitation prompt so it is shorter, less redundant, and preset-explicit.
- Added the current template sections and synchronized the markdown note with the YAML metadata.
- Bumped the version from `v1.0` to `v1.2` without changing the core teaching flow.

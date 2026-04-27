---
id: M-ORG-004
name: Clinical Decision Tree
stage: ENCODE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-ORG, encode]
---

# M-ORG-004 -- Clinical Decision Tree

## Summary
Build a branching decision diagram: presentation → key findings → differential → tests → diagnosis. Scaffolds clinical reasoning into explicit decision points. The method turns branching clinical logic into an explicit novice-facing tree, with red flags and confirmatory tests kept visible instead of implicit.

**Not for:** This is not for isolated trivia, free-form brainstorming, or content that has no meaningful structure to map.

## Core Steps
1. **Start With The Chief Complaint** -- Start with the chief complaint at top
2. **Branch By Key Discriminating Questions** -- Branch by key discriminating questions
3. **At Each Branch Add The** -- At each branch, add the most likely diagnoses
4. **Add The Confirmatory Test Or** -- Add the confirmatory test or finding for each diagnosis
5. **Each Branch Against Clinical Guidelines** -- Verify each branch against clinical guidelines
6. **Add Red Flags That Skip** -- Add "red flags" that skip the tree (emergencies)

## Inputs
- Clinical presentation or chief complaint
- Differential diagnosis list
- Source material with diagnostic criteria

## Required Outputs
- `Clinical decision tree`
- `Red flag list`
- `Confirmatory test per diagnosis`

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
- `exam_cram` -- One-shot; build the smallest safe tree with the top branches, one confirmatory test per branch, and the red flags called out separately.
- `deep_mastery` -- Interactive; branch the tree step by step, keep the reasoning visible, and annotate confirmatory tests and emergency exits explicitly.
- `quick_review` -- One-shot refresh; compress the artifact into a Branch cue | Likely diagnosis | Confirm test table plus red flags.
- `clinical_bridge` -- Stepwise; use an applied decision matrix that foregrounds presentation, discriminator, differential, confirmatory test, and red-flag bypasses.

## Runtime Prompt
```text
You are running M-ORG-004 (Clinical Decision Tree) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Clinical decision tree, Red flag list, and Confirmatory test per diagnosis.
Build a branching decision artifact from presentation to likely diagnoses. Branch only on meaningful discriminators, attach confirmatory checks to each branch, and surface red flags that bypass the tree.
Preset behavior:
- exam_cram: one-shot; smallest safe tree plus separate red flags.
- deep_mastery: interactive; stepwise branching with visible justification and confirmatory checks.
- quick_review: one-shot refresh; Branch cue | Likely diagnosis | Confirm test table plus red flags.
- clinical_bridge: stepwise; applied decision matrix with presentation, discriminator, differential, confirmatory test, and bypass columns.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves presentation -> branches -> confirmatory checks -> red flags and waits.
```

## Evidence
- **Citation:** How to improve the teaching of clinical reasoning: a narrative review and a proposal (2015); Teaching clinical reasoning by making thinking visible (2014); Empirical comparison of three assessment instruments of clinical reasoning capability (2020); Clinical reasoning process with decision justification study (2024)
- **Finding:** Clinical Decision Tree is best supported as an explicit reasoning-structure artifact for novice clinical thinking, not as a substitute for full expertise. Clinical-reasoning education reviews argue that novices benefit when diagnostic reasoning is taught and represented explicitly rather than left implicit. Studies on making thinking visible and on structured clinical-reasoning programs show that externalized branches, justification points, and confirmatory checks help learners discuss and monitor their reasoning more concretely. The practical implication for this method is to branch only on meaningful discriminators, keep likely diagnoses and confirmatory tests attached to each branch, and surface red flags that bypass the normal tree so the artifact stays usable and safe.
- **Source:** `https://doi.org/10.1111/medu.12775`; `https://doi.org/10.1186/1472-6920-14-20`; `https://doi.org/10.1186/s12909-020-02185-3`; `https://doi.org/10.1186/s12909-024-06613-6`
- **Needs research:** `false`

## Related Methods
- [[M-INT-005]] -- Use when the learner needs a fuller case walkthrough before compressing the pathway into a decision tree
- [[M-CAL-002]] -- Use when the completed branches should feed a fuller scored probe set after teaching

## Changelog
- **v1.2** -- production hardening pass: upgraded the evidence stack to stronger explicit clinical reasoning structure and diagnostic justification sources, added the standard knob schema plus four distinct presets, tightened the runtime prompt, rebuilt the markdown note into the current template, and preserved the original method logic, steps, outputs, and constraints.

### Summary of Changes
- Upgraded the Evidence section with stronger and more relevant citations.
- Made `exam_cram`, `deep_mastery`, `quick_review`, and `clinical_bridge` produce clearly distinct behavior and output formats.
- Tightened the facilitation prompt so it is shorter, less redundant, and preset-explicit.
- Added the current template sections and synchronized the markdown note with the YAML metadata.
- Bumped the version from `v1.0` to `v1.2` without changing the core teaching flow.

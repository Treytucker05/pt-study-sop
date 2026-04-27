---
id: M-INT-002
name: Clinical Application
stage: INTERROGATE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-INT, interrogate]
---

# M-INT-002 — Clinical Application

## Summary
Apply an already-encoded concept to a concrete patient scenario and reason through how it would present, what you would test, and how you would intervene. The method stays memory-first, keeps the case specific, and ends with source-based verification instead of drifting into generic clinical talk.

**Not for:** first exposure, direct lecturing, or introducing brand-new material that has not already been encoded.

## Core Steps
1. **Choose the Concept and Patient** — state the concept and choose a patient population
2. **Predict Presentation** — ask how the dysfunction or pathology would present
3. **Choose Tests and Assessment** — ask what you would test or assess
4. **Choose Intervention** — ask how you would intervene
5. **Verify Against Source** — compare the reasoning against source material

## Inputs
- Concept to apply clinically
- Clinical scenario or patient type
- Source material for verification

## Required Outputs
- `Clinical application narrative with specific patient characteristics`
- `Presentation, testing, and intervention summary (all three addressed)`
- `Verification notes (errors flagged against source material)`

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
- `exam_cram` — one-shot, fastest case pass. Use one short patient vignette and return terse present-test-treat bullets plus one verification note.
- `deep_mastery` — interactive, full case reasoning pass. Use a richer patient scenario with a comorbidity or constraint, keep separate sections for presentation, testing, intervention, and rationale, and close with a fuller verification block.
- `quick_review` — one-shot refresh case pass. Compress the scenario into a compact table with `patient | presentation | tests | intervention | correction` columns.
- `clinical_bridge` — stepwise applied case pass. Use a more realistic vignette with red flags or confounders, emphasize differential and prioritization, and render the output as a clinical reasoning grid.

## Runtime Prompt
```text
You are running M-INT-002 (Clinical Application) in the INTERROGATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Clinical application narrative, Presentation/testing/intervention summary, and Verification notes.
Apply one already-encoded concept to a concrete patient scenario, work through how it would present, what you would test, and how you would intervene, then verify the reasoning against source without turning the run into a lecture.
Preset behavior:
- exam_cram: one-shot; short vignette; terse present-test-treat bullets; one correction note.
- deep_mastery: interactive; richer case with constraint or comorbidity; separate reasoning and verification sections.
- quick_review: one-shot refresh; compact clinical reasoning table.
- clinical_bridge: stepwise; realistic vignette with red flags or confounders and a prioritization grid.
If no preset is specified, use the default knobs. One-shot returns the full case artifact in one bounded reply; interactive or stepwise mode moves scenario -> presentation -> testing -> intervention -> verification and waits.
```

## Evidence
- **Citation:** Schmidt and Rikers (2007); Charlin, Boshuizen, Custers, and Feltovich (2007); Keemink, Custers, van Dijk, and ten Cate (2018); Lubarsky, Dory, Audétat, Custers, and Charlin (2020); Delavari, Monajemi, Baradaran, Myint, Yaghmae, and Soltani Arabshahi (2020)
- **Finding:** Clinical Application is best supported as a concrete case-based reasoning method that helps learners build and refine clinical scripts rather than merely restating textbook facts. Illness-script research supports organizing knowledge around enabling conditions, faults, and consequences, and related medical-education work suggests that learners improve when clinical reasoning is practiced in patient-specific contexts and then checked against stronger reference models. Classroom and curriculum studies on script-based clinical reasoning also suggest that repeated case-focused reasoning can strengthen diagnostic organization and performance when the learner must commit to a specific present-test-treat path before feedback. The practical implication for this method is to keep the scenario concrete, force a memory-first patient-specific attempt, require all three branches of reasoning, and end with explicit source-based verification instead of generic discussion.
- **Source:** `https://doi.org/10.1111/j.1365-2923.2007.02915.x`; `https://doi.org/10.1111/j.1365-2923.2007.02924.x`; `https://doi.org/10.5116/ijme.5a5b.24a9`; `https://doi.org/10.36834/cmej.36631`; `https://doi.org/10.47176/mjiri.34.9`
- **Needs research:** `false`

## Related Methods
- [[M-INT-005]] — Case walkthrough cousin method
- [[M-INT-006]] — Illness script fallback for mechanism-based clinical reasoning
- [[M-ORG-004]] — Decision-tree fallback if branching decisions dominate

## Changelog
- **v1.1** — migrated the method to the stage-first `INTERROGATE` architecture, normalized metadata naming, and preserved the original present-test-treat flow.
- **v1.2** — upgraded the evidence stack to stronger illness-script, case-based clinical reasoning, and classroom script-development sources; replaced the legacy note layout with the current template; added the standard knob schema plus four distinct presets; tightened the runtime prompt; and preserved the original method logic, steps, outputs, and constraints.

### Summary of Changes
- Reframed the method as patient-specific clinical reasoning rather than generic “apply it clinically.”
- Replaced the weak single-source evidence stub with stronger illness-script, case-based reasoning, and classroom script-development citations.
- Added the standard knob schema and made all four presets behaviorally distinct by case depth, scenario constraints, and output format.
- Tightened the facilitation prompt so it is shorter, less redundant, and explicit about preset behavior.
- Rebuilt the markdown note into the current production template without changing the core present-test-treat flow.

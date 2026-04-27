---
id: M-CAL-004
name: Story Confidence Tag
stage: CALIBRATE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-CAL, calibrate]
---

# M-CAL-004 -- Story Confidence Tag

## Summary
After receiving the big-picture narrative overview, rate your confidence in the story as a whole. Can you retell the narrative thread? Where does the story break down? Light-touch calibration that respects top-down learners — no item-level quizzing. It stays global rather than item-level, using the learner's confidence about the story thread to seed later encoding or fuller probes.

**Not for:** This is not for teaching new material, extended explanation, or open-ended discussion. Use EXPLAIN when the goal is instruction and use REFERENCE when the goal is artifact building.

## Core Steps
1. **Ask: "Can you see** -- Ask: "Can you see the whole story in your head? Rate 1-3: (1) fuzzy, (2) partial, (3) clear". Quick gut check — no overthinking
2. **Ask: "Where does the** -- Ask: "Where does the story break down or get fuzzy?". Identify the weakest part of the narrative thread
3. **Tag fuzzy areas as** -- Tag fuzzy areas as priority targets for deeper encoding. These become the focus areas for ENCODE phase

## Inputs
- Completed narrative overview from PRIME or early ENCODE
- The story thread the learner just received

## Required Outputs
- `Story confidence rating (1-3 scale)`
- `Fuzzy zones list (narrative breakdown points)`
- `Priority encoding targets (focus areas for ENCODE phase)`
- `Optional probe seed suggestions for M-CAL-002`

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
- `exam_cram` -- One-shot; collect the 1-3 confidence tag, one fuzzy zone, and one priority encoding target.
- `deep_mastery` -- Interactive; pair the confidence rating with a fuller retell check and a richer focus-target handoff.
- `quick_review` -- One-shot refresh; use a compact Confidence | Story break | Next target table.
- `clinical_bridge` -- Stepwise; turn the story-break points into an applied routing grid for next-step encoding or probing.

## Runtime Prompt
```text
You are running M-CAL-004 (Story Confidence Tag) in the CALIBRATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Story confidence rating, Fuzzy zones list, Priority encoding targets, and Optional probe seed suggestions.
Run a light-touch global calibration check. Ask for the 1-3 story confidence rating, locate where the narrative thread breaks, and convert those fuzzy zones into the next encoding or probing targets.
Preset behavior:
- exam_cram: one-shot; confidence tag, one fuzzy zone, one priority target.
- deep_mastery: interactive; confidence rating plus fuller retell check and richer routing handoff.
- quick_review: one-shot refresh; Confidence | Story break | Next target table.
- clinical_bridge: stepwise; applied routing grid from story-break point to next encoding or probe move.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves confidence tag -> fuzzy zone -> routing target and waits.
```

## Evidence
- **Citation:** Metcalfe (2017); Rhodes (2019); Confidence judgments in real classroom settings (2011); Cho (2024)
- **Finding:** Story Confidence Tag is best supported as a light-touch metacognitive monitoring move that collects a global confidence judgment and then asks where the learner's narrative thread breaks. Metacognition research shows that confidence judgments can guide study decisions, but classroom and concept-calibration work also shows that global confidence is often imperfect unless it is tied to a concrete task or breakdown point. The practical implication for this method is to keep the confidence tag simple, ask for the actual story-break location rather than a vague feeling, and use the fuzzy zones to route the learner toward encoding or fuller calibration rather than treating the rating itself as mastery evidence.
- **Source:** `https://doi.org/10.1146/annurev-psych-010416-044022`; `https://doi.org/10.1177/0098628319834381`; `https://doi.org/10.1080/00207590701436744`; `https://doi.org/10.1177/14757257231182301`
- **Needs research:** `false`

## Related Methods
- [[M-CAL-002]] -- Escalate here when the light-touch story tag is too coarse and a fuller probe set is needed
- [[M-GEN-007]] -- Use when the identified fuzzy zone should be encoded through a mechanism trace next

## Changelog
- **v1.2** -- production hardening pass: upgraded the evidence stack to stronger metacognitive monitoring and confidence calibration sources, added the standard knob schema plus four distinct presets, tightened the runtime prompt, rebuilt the markdown note into the current template, and preserved the original method logic, steps, outputs, and constraints.

### Summary of Changes
- Upgraded the Evidence section with stronger and more relevant citations.
- Made `exam_cram`, `deep_mastery`, `quick_review`, and `clinical_bridge` produce clearly distinct behavior and output formats.
- Tightened the facilitation prompt so it is shorter, less redundant, and preset-explicit.
- Added the current template sections and synchronized the markdown note with the YAML metadata.
- Bumped the version from `v1.0` to `v1.2` without changing the core teaching flow.

---
id: M-TEA-002
name: Confusable Contrast Teach
stage: EXPLAIN
status: validated
version: '1.6'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-TEA, explain]
---

# M-TEA-002 -- Confusable Contrast Teach

## Summary
Teach two confusable concepts side-by-side by naming the shared bucket, the key difference, the signature clue, and the classic trap. The method stays bounded, source-faithful, and ends with a short application contrast plus a carry-forward cue instead of a long compare-and-contrast lecture.

**Not for:** Not for open-ended brainstorming, scoring, or broad coverage of unrelated material. Use an ORIENT method when the learner first needs orientation or objective framing.

## Core Steps
1. **Shared Bucket** -- State the shared bucket and the 1-2 shared features that make the concepts confusable
2. **Key Difference** -- Name the one diagnostic difference in plain language and then in source terms
3. **Signature Clues** -- Give one diagnostic clue for each concept tied to the key difference
4. **Classic Trap** -- Name one common wrong cue and refute it immediately
5. **Mini Application Contrast** -- Finish with one short application contrast and one carry-forward cue

## Inputs
- Source material loaded in chat
- Target concept, process, or comparison to teach
- Learner familiarity signal or prerequisite anchor

## Required Outputs
- `Shared bucket statement`
- `Key difference statement`
- `Signature clues`

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
- `exam_cram` -- One-shot; deliver the shared bucket, key difference, one clue per side, and one trap in terse bullets.
- `deep_mastery` -- Interactive; use labeled sections, keep the clues and trap explicit, and end with a fuller application contrast before routing onward.
- `quick_review` -- One-shot refresh; compress the contrast into a two-column discriminator table plus one carry-forward cue.
- `clinical_bridge` -- Stepwise; use an applied contrast grid with cue, likely mistake, and confirming clue columns to support real-world separation.

## Runtime Prompt
```text
You are running M-TEA-002 (Confusable Contrast Teach) in the EXPLAIN stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Shared bucket statement, Key difference statement, Signature clues, Classic trap, and Mini application contrast.
Teach two confusable concepts by naming the shared bucket, isolating one real discriminator, attaching one signature clue to each side, killing one classic trap, and ending with a short application contrast.
Preset behavior:
- exam_cram: one-shot; terse bullets with one clue per side and one trap.
- deep_mastery: interactive; labeled sections with fuller clue, trap, and application handling.
- quick_review: one-shot refresh; compact discriminator table plus one carry-forward cue.
- clinical_bridge: stepwise; applied contrast grid with cue, likely mistake, and confirming clue columns.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves shared bucket -> discriminator -> clues/trap -> application contrast and waits.
```

## Evidence
- **Citation:** Alfieri, Nokes-Malach, and Schunn (2013); Richland and McDonough (2010); Richland and Simms (2015); Kendeou, Walsh, Smith, and O'Brien (2014); Loibl, Tillema, Rummel, and van Gog (2020)
- **Finding:** Confusable Contrast Teach is best supported as a structured comparison method that first aligns the shared bucket and then isolates the small set of cues that actually discriminate the concepts. Comparison research shows that aligned contrasts help learners notice deep structure and build more differentiated categories than studying cases alone. Refutation research adds the second half of the method: tempting but wrong cues are less likely to stick when they are explicitly named, rejected, and replaced with the correct explanation. The practical implication for this method is to keep the contrast narrow, surface one true discriminator, attach one signature clue to each side, and explicitly kill the classic trap instead of hoping the learner will infer the difference alone.
- **Source:** `https://doi.org/10.1080/00461520.2013.775712`; `https://doi.org/10.1016/j.cedpsych.2009.09.001`; `https://doi.org/10.1002/wcs.1336`; `https://doi.org/10.1080/0163853X.2014.913961`; `https://doi.org/10.1007/s11251-020-09504-7`
- **Needs research:** `false`

## Related Methods
- [[M-INT-004]] -- Use when the learner needs a fuller side-by-side comparison artifact after the teaching pass
- [[M-RET-006]] -- Use when the next step should be adversarial discrimination practice on the same confusable pair

## Changelog
- **v1.6** -- production hardening pass: upgraded the evidence stack to stronger structured comparison and refutational contrast sources, added the standard knob schema plus four distinct presets, tightened the runtime prompt, rebuilt the markdown note into the current template, and preserved the original method logic, steps, outputs, and constraints.

### Summary of Changes
- Upgraded the Evidence section with stronger and more relevant citations.
- Made `exam_cram`, `deep_mastery`, `quick_review`, and `clinical_bridge` produce clearly distinct behavior and output formats.
- Tightened the facilitation prompt so it is shorter, less redundant, and preset-explicit.
- Added the current template sections and synchronized the markdown note with the YAML metadata.
- Bumped the version from `v1.5` to `v1.6` without changing the core teaching flow.

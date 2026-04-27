---
id: M-TEA-006
name: Depth Ladder
stage: EXPLAIN
status: draft
version: '1.3'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-TEA, explain]
---

# M-TEA-006 — Depth Ladder

## Summary
Explain the same concept in four deliberate passes: like the learner is 4 years old, 10 years old, in high school, and finally at expert or training-level precision. Each rung preserves the same underlying idea while increasing mechanism, terminology, and precision, so the learner gets a controlled climb instead of a single over-dense explanation.

**Not for:** open-ended brainstorming, scoring, or broad coverage of unrelated material. Use an `ORIENT` method when the learner first needs orientation or objective framing.

## Core Steps
1. **Age 4 Rung** — deliver the first rung in real child-directed language with one tiny story or analogy
2. **Age 10 Rung** — add simple system logic and basic cause-effect while preserving the same core idea
3. **High School Rung** — introduce the real mechanism with the first needed terminology
4. **Expert Rung** — add domain-appropriate precision, discriminators, edge cases, or implications
5. **Rung Check** — ask which rung clicked and where the concept started to get fuzzy

## Inputs
- Source material loaded in chat
- Target concept, process, or comparison to teach
- Learner familiarity signal or prerequisite anchor (optional)

## Required Outputs
- `Age4Explanation`
- `Age10Explanation`
- `HighSchoolExplanation`

Additional built-in outputs:
- `ExpertLevelExplanation`
- `LadderCarryForwardNotes`
- `RungCheckSignal`

## Knob Schema
```yaml
knobs:
  guidance_level: medium
  delivery_mode: stepwise
  fade_intensity: adaptive_light
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
    fade_intensity: adaptive_progressive
    output_layout: labeled_sections
    explanation_density: detailed
  quick_review:
    guidance_level: light
    delivery_mode: one_shot
    fade_intensity: adaptive_light
    output_layout: bullets
    explanation_density: lean
  clinical_bridge:
    guidance_level: medium
    delivery_mode: stepwise
    fade_intensity: adaptive_light
    output_layout: table
    explanation_density: focused
```

## Preset Behavior
- `exam_cram` — one-shot compressed ladder. Keep each rung to 2-3 labeled sections, preserve all four rungs, and make the carry-forward notes terse and test-oriented.
- `deep_mastery` — interactive full ladder. Use the richest 3-5 section rungs, let each rung add visibly more mechanism and precision, and pause after each rung for a short learner check.
- `quick_review` — one-shot refresh ladder. Compress the Age 4 and Age 10 rungs into micro-rungs, assume prior exposure, and put most of the precision into the High School and Expert rungs.
- `clinical_bridge` — stepwise applied ladder. Keep the same rung order but make the higher rungs emphasize discriminators, edge cases, and clinical implications in a note-card or table-like layout.

## Runtime Prompt
```text
You are running M-TEA-006 (Depth Ladder) in the EXPLAIN stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Age4Explanation, Age10Explanation, HighSchoolExplanation, ExpertLevelExplanation, LadderCarryForwardNotes, and RungCheckSignal.
Explain one bounded concept across four rungs. Preserve the same underlying idea while increasing mechanism, terminology, and precision. Every rung must use short labeled sections, and the Age 4 rung must sound like real child-directed language with one tiny story or analogy.
Stay source-faithful, bounded, and non-assessive.
Preset behavior:
- exam_cram: one-shot; keep each rung to 2-3 labeled sections; make LadderCarryForwardNotes terse and test-oriented.
- deep_mastery: interactive; use the fullest 3-5 section rungs; pause after each rung for a short learner check before continuing.
- quick_review: one-shot refresh; compress Age 4 and Age 10 into micro-rungs and put most of the precision into the High School and Expert rungs.
- clinical_bridge: stepwise; keep the same ladder order but make the higher rungs emphasize discriminators, edge cases, and clinical implications in a note-card or table-like layout.
If no preset is specified, use the default knobs. One-shot returns the full ladder in one bounded reply; interactive or stepwise mode moves rung by rung and waits.
```

## Evidence
- **Citation:** Renkl and Atkinson (2003); Kalyuga, Ayres, Chandler, and Sweller (2003); Belland, Walker, Kim, and Lefler (2017); Fyfe, McNeil, Son, and Goldstone (2014); Tetzlaff, Simonsmeier, Peters, and Brod (2025); Dominguez and Svihla (2023)
- **Finding:** Depth Ladder is most defensible when read as a scaffolding-and-fading method rather than a fixed age script. Worked-example and fading research supports starting learners with heavier structure and then moving toward more independent, more precise explanation. Expertise-reversal research suggests this support should stay richest for novices and lighten as prior knowledge rises. Scaffolding meta-analytic and classroom-review evidence suggests support is strongest when it is contingent, gradually faded, and paired with a transfer of responsibility. Concreteness-fading research adds support for moving from vivid, concrete representations toward more formal and abstract ones while preserving the same underlying idea.
- **Source:** `https://doi.org/10.1207/S15326985EP3801_3`; `https://doi.org/10.1207/S15326985EP3801_4`; `https://doi.org/10.3102/0034654316670999`; `https://doi.org/10.1007/s10648-014-9249-3`; `https://doi.org/10.1016/j.learninstruc.2025.102142`; `https://doi.org/10.1016/j.ssaho.2023.100613`
- **Needs research:** `false`

## Related Methods
- [[M-TEA-004]] — Use when a modality switch would help the lower rungs land
- [[M-TEA-001]] — Use when a story bridge is more natural than a ladder

## Changelog
- **v1.1** — migrated structural metadata to the stage-first architecture: stage/category now use `EXPLAIN`, the subcategory remains tactic-specific, and tags were aligned to explanation-first metadata.
- **v1.2** — cleaned up leftover stage-language references so the body text matches the stage-first architecture without changing method logic.
- **v1.3** — upgraded the evidence stack to stronger scaffolding, expertise-reversal, and progressive-abstraction sources; replaced the legacy knob block with the standard schema plus distinct presets; tightened the runtime prompt; and rebuilt the markdown note into the current template structure without changing method logic, steps, outputs, or constraints.

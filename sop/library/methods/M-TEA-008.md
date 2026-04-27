---
id: M-TEA-008
name: Worked Example -> Completion Fade
stage: EXPLAIN
status: draft
version: '1.3'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-TEA, explain]
---

# M-TEA-008 — Worked Example -> Completion Fade

## Summary
Model one full example or worked solution, then reuse the same task structure with a few steps omitted so the learner fills the missing pieces before full independence. The method stays on one bounded task, uses fading as a scaffold rather than a test, and ends by deciding whether support should lighten or hold.

**Not for:** open-ended brainstorming, scoring, or broad coverage of unrelated material. Use an `ORIENT` method when the learner first needs orientation or objective framing.

## Core Steps
1. **Worked Example** — present one fully worked example and name why the key steps are there
2. **Critical Decision Points** — mark the cues that make the example work
3. **Completion Fade** — fade 1-2 steps in a near-match example
4. **Learner Fill** — have the learner fill the missing steps and explain why
5. **Fade Decision** — decide whether to deepen the fade or hold scaffold

## Inputs
- Source material loaded in chat
- Target concept, process, or comparison to teach
- Learner familiarity signal or prerequisite anchor (optional)

## Required Outputs
- `FullyWorkedExample`
- `FadePoints`
- `CompletionPrompt`

Additional built-in outputs:
- `LearnerFilledSteps`
- `FadeDecision`
- `CarryForwardWeakPoint`

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
- `exam_cram` — one-shot fast fade. Keep the worked example lean, omit only one late step in the near-match example, and make the fade decision terse and test-oriented.
- `deep_mastery` — interactive fuller fade. Use richer annotations on the worked example, usually fade two steps in the near-match example, require a brief why-cue for each learner-filled step, and end with an explicit next-fade recommendation.
- `quick_review` — one-shot refresh fade. Assume prior exposure, compress the worked example to a skeleton, and spend most of the space on `FadePoints`, `CompletionPrompt`, and the carry-forward weak point.
- `clinical_bridge` — stepwise applied fade. Cast the example as a short case or real-use task, frame decision points as discriminators or consequences, and tie the fade decision to the next practical move.

## Runtime Prompt
```text
You are running M-TEA-008 (Worked Example -> Completion Fade) in the EXPLAIN stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: FullyWorkedExample, FadePoints, CompletionPrompt, LearnerFilledSteps, FadeDecision, and CarryForwardWeakPoint.
Teach one bounded task by showing one full example, marking the critical decision points, fading 1-2 steps in a near-match example, having the learner fill the gaps with brief why-cues, and then deciding whether to deepen the fade or hold scaffold. Stay in the same problem family, remain source-faithful, and do not turn the first fade into a quiz.
Preset behavior:
- exam_cram: one-shot; lean worked example, one omitted late step, terse cue bullets, and a one-line fade decision.
- deep_mastery: interactive; fuller annotations, usually two omitted steps, brief why-cues for each learner-filled step, and an explicit next-fade recommendation.
- quick_review: one-shot refresh; compress the worked example to a skeleton and focus most of the space on FadePoints, CompletionPrompt, and CarryForwardWeakPoint.
- clinical_bridge: stepwise; use a short applied case, frame decision points as discriminators or consequences, and tie FadeDecision to the next practical move.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode stops between phases and waits.
```

## Evidence
- **Citation:** Renkl and Atkinson (2003); Atkinson, Renkl, and Merrill (2003); Salden, Aleven, Schwonke, and Renkl (2010); McGinn, Young, Huyghe, and Booth (2023); Miller-Cotto and Auxter (2021); Bisra, Liu, Nesbit, Salimi, and Winne (2018)
- **Finding:** Worked Example -> Completion Fade is best supported as a novice-first scaffolding method in which learners study a complete solution, then complete a near-match with a small number of missing steps before moving toward greater independence. Foundational fading studies support this example-to-completion transition, especially when learners are prompted to attend to underlying principles rather than just copy steps. Adaptive-fading research suggests support should be removed based on learner performance rather than on a rigid schedule. Classroom studies show example-based assignments can improve authentic algebra and standardized-assessment outcomes, but they also show that extra self-explanation prompts are not automatically additive, so prompts should stay brief, targeted, and light enough to avoid overload.
- **Source:** `https://doi.org/10.1207/S15326985EP3801_3`; `https://doi.org/10.1037/0022-0663.95.4.774`; `https://doi.org/10.1007/s11251-009-9107-8`; `https://doi.org/10.1080/19345747.2023.2243254`; `https://doi.org/10.1080/01443410.2019.1646411`; `https://doi.org/10.1007/s10648-018-9434-x`
- **Needs research:** `false`

## Related Methods
- [[M-TEA-004]] — Use when a modality switch is needed to bridge the example
- [[M-TEA-001]] — Use if the concept is really sequential

## Changelog
- **v1.1** — migrated structural metadata to the stage-first architecture: stage/category now use `EXPLAIN`, the subcategory is `worked-example-fade`, and tags were aligned to explanation-first metadata.
- **v1.2** — cleaned up leftover stage-language references so the body text matches the stage-first architecture without changing method logic.
- **v1.3** — upgraded the evidence stack to stronger worked-example, adaptive-fading, and self-explanation sources; replaced the legacy knob block with the standard schema plus distinct presets; tightened the runtime prompt; rebuilt the markdown note into the current template structure; and preserved the original method logic, steps, outputs, and constraints.

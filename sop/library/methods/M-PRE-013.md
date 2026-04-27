---
id: M-PRE-013
name: Big-Picture Orientation Summary
stage: ORIENT
status: validated
version: '1.3'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-PRE, orient]
---

# M-PRE-013 — Big-Picture Orientation Summary

## Summary
Generate a short source-grounded big-picture organizer that states what the material is about, why it matters, and the main organizing idea without crossing into full explanation. The method is for fast orientation, not detailed teaching, and it closes by naming the next concepts or contrasts to study.

**Not for:** first-contact teaching, scored assessment, or full solution reveal. Use an `EXPLAIN` or `CONSOLIDATE` method when the goal is explanation rather than orientation.

## Core Steps
1. **Frame Line** — state what the material is really about and what kind of question or decision it helps with
2. **Big-Picture Organizer** — summarize what it is, why it matters, and the main organizing idea
3. **Teach Targets** — hand off 1-3 specific next concepts or contrasts without drifting into mechanism teaching

## Inputs
- Source material loaded in chat
- Target topic or objective scope
- Learner goal for this session (`test prep`, `first exposure`, or `review`)
- Prior notes, prior framing line, or prior-session context (optional)

## Required Outputs
- `FrameLine`
- `BigPictureSummary`
- `TeachTargets`

## Knob Schema
```yaml
knobs:
  guidance_level: medium
  delivery_mode: one_shot
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
- `exam_cram` — one-shot, bullet-driven organizer. Keep the `FrameLine` to one line, give only two short summary bullets, and end with the likely test angle or confusable boundary.
- `deep_mastery` — interactive, labeled-section organizer. Keep the same three outputs, allow a fuller 3-4 line summary, add one short `Why this structure matters` line, and ask one brief learner check before `TeachTargets`.
- `quick_review` — one-shot refresh for already-seen material. Compress the `FrameLine`, assume prior exposure, and use the summary mainly to reopen, refresh, or re-anchor the structure.
- `clinical_bridge` — stepwise applied orientation. Keep the same outputs but present the summary as an applied cue table or tightly labeled practical frame, with emphasis on relevance, stakes, or decision context.

## Runtime Prompt
```text
You are running M-PRE-013 (Big-Picture Orientation Summary) in the ORIENT stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: FrameLine, BigPictureSummary, and TeachTargets.
Stay source-grounded, non-assessive, and stop before mechanism teaching.
Preset behavior:
- exam_cram: one-shot; bullets; 1-line FrameLine; 2 summary bullets; close with the likely test angle or confusable boundary.
- deep_mastery: interactive; labeled sections; 3-4 summary lines plus one why-this-structure-matters line; ask one short check before TeachTargets.
- quick_review: one-shot refresh; assume prior exposure; compress the FrameLine and focus on what to reopen, refresh, or re-anchor.
- clinical_bridge: stepwise; use an applied cue table or tightly labeled sections and frame the summary around practical stakes or decision context.
If no preset is specified, use the default knobs. One-shot returns all three outputs in one bounded reply; interactive or stepwise mode moves section by section and waits.
```

## Evidence
- **Citation:** Ausubel (1960); Mayer (1979); Hattan and Alexander (2020); Hattan, Alexander, and Lupo (2024)
- **Finding:** Classic advance-organizer research supports giving learners a higher-level frame before unfamiliar material so later details can attach to an existing structure. Mayer's review suggests the organizer works best when it is more abstract, inclusive, and structurally clearer than the lesson itself, rather than a same-level preview. More recent classroom and review evidence suggests prior knowledge activation usually needs explicit prompts, especially for younger learners, and works best when the orientation cue highlights the governing structure, relevance, or question without turning into full explanation.
- **Source:** `https://doi.org/10.1037/h0046669`; `https://doi.org/10.3102/00346543049002371`; `https://doi.org/10.1007/s11145-020-10022-8`; `https://doi.org/10.3102/00346543221148478`
- **Needs research:** `false`

## Related Methods
- [[M-PRE-010]] — Use first when the learner needs the objective frame
- [[M-PRE-009]] — Use when multiple sources need synthesis

## Changelog
- **v1.1** — migrated structural metadata to the stage-first architecture: stage/category now use `ORIENT`, the subcategory was tightened, and tags were aligned to stage-first metadata.
- **v1.2** — cleaned up leftover stage-language references so the body text matches the stage-first architecture without changing method logic.
- **v1.3** — upgraded the evidence stack to stronger advance-organizer and prior-knowledge-activation sources, made the four presets produce more distinct output shapes and depths, tightened the runtime prompt, restored the markdown note in the current template structure, and preserved the original method logic, outputs, and constraints.

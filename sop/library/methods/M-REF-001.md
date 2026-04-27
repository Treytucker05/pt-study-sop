---
id: M-REF-001
name: Error Autopsy
stage: REFERENCE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-REF, reference]
---

# M-REF-001 — Error Autopsy

## Summary
Turn recent retrieval misses into a four-column autopsy that preserves the wrong answer, records the correct answer, explains the confusion, and builds a prevention cue. The method stays artifact-first, converts mistakes into reusable reference targets, and avoids drifting into either reteaching or re-quizzing.

**Not for:** quizzing the learner or introducing new material. Use `RETRIEVE` when the goal is memory testing and `TEACH` when the goal is explanation.

## Core Steps
1. **Collect the Source Errors** — gather the recent misses in stable wording
2. **Record the Wrong Answer** — preserve what the learner actually said
3. **Record the Correct Answer** — add the accurate source-linked answer
4. **Analyze the Confusion** — explain why the error happened
5. **Build the Prevention Cue** — create the discrimination cue that blocks recurrence
6. **Convert High-Value Rows Into Cards** — stage the most reusable misses for later review

## Inputs
- List of errors from recent retrieval practice
- Correct answers for each error
- Reference materials for deep understanding
- Error autopsy template (4-column format)

## Required Outputs
- `Completed error autopsy table (all 4 columns for every error)`
- `Root cause analysis for each error (Column 3 filled with specific conceptual confusion)`
- `Discrimination cues created (Column 4 with actionable prevention strategy)`
- `Anki card candidates identified from high-value errors`

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
- `exam_cram` — one-shot, fastest autopsy pass. Build a compact 4-column table for the top 2-3 errors, use terse root-cause lines, and convert only the single highest-yield miss into a card candidate.
- `deep_mastery` — interactive, full autopsy pass. Keep the full 4-column table, add a short pattern summary across errors, and produce multiple card candidates from the most reusable misses.
- `quick_review` — one-shot refresh pass. Use one compact error table plus a short pattern list and a minimal card-candidate block.
- `clinical_bridge` — stepwise applied pass. Frame the root cause and prevention cue in terms of clinical discrimination, trigger context, and what wrong move the confusion would cause in practice.

## Runtime Prompt
```text
You are running M-REF-001 (Error Autopsy) in the REFERENCE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Completed error autopsy table, Root cause analysis, Discrimination cues, and Anki card candidates.
Turn recent misses into a 4-column autopsy that preserves the wrong answer, records the correct answer, explains the confusion, and ends with a concrete prevention cue. Keep it artifact-first and do not turn the block into a quiz or lecture.
Preset behavior:
- exam_cram: one-shot; compact table for the top 2-3 errors; terse cue lines; one card candidate.
- deep_mastery: interactive; full table; cross-error pattern summary; multiple card candidates.
- quick_review: one-shot refresh; compact table plus short pattern list.
- clinical_bridge: stepwise; prevention cues phrased as clinical discriminators and wrong-move prevention.
If no preset is specified, use the default knobs. One-shot returns the full autopsy artifact in one bounded reply; interactive or stepwise mode moves errors -> table -> cues -> cards and waits.
```

## Evidence
- **Citation:** Metcalfe (2017); Metcalfe, Xu, Vuorre, Siegler, Wiliam, and Bjork (2024); Zhang and Fiorella (2024); Clark, Kaw, and Guldiken (2023)
- **Finding:** Error Autopsy is best supported as a learn-from-errors and corrective-feedback method, not as generic mistake review. Research on learning from errors shows that errors followed by corrective feedback can improve learning when learners actively process the mismatch between their response and the correct answer instead of merely seeing the answer. More recent classroom and problem-solving studies suggest that repeated reflection and scaffolded self-explaining feedback improve how students interpret mistakes, refine their metacognition, and transfer the correction to later performance. The practical implication for this method is to preserve the original wrong answer, record the correct answer with source support, force a real root-cause analysis, and end with a concrete prevention cue that can be reused in later retrieval.
- **Source:** `https://doi.org/10.1146/annurev-psych-010416-044022`; `https://doi.org/10.1111/bjep.12651`; `https://doi.org/10.1016/j.cedpsych.2024.102326`; `https://doi.org/10.1177/03064190231164719`
- **Needs research:** `false`

## Related Methods
- [[M-RET-001]] — Retrieval misses are the source material for the autopsy
- [[M-REF-003]] — Useful when autopsy findings need a compact reference anchor

## Changelog
- **v1.0** — initial validated spec.
- **v1.2** — upgraded the evidence stack to stronger learning-from-errors, corrective-feedback, and reflective-processing sources; replaced the legacy knob block with the standard schema plus four distinct presets; tightened the runtime prompt; rebuilt the markdown note into the current template; and preserved the original 4-column error-autopsy flow, outputs, and constraints.

### Summary of Changes
- Replaced the thin error-correction stub with a stronger stack centered on learning from errors, corrective feedback, and scaffolded reflection.
- Reframed the method as an artifact-first error-processing workflow instead of generic mistake review.
- Made the presets materially different by table density, cross-error patterning, and clinical-vs-general prevention cue framing.
- Tightened the facilitation prompt so it is shorter, less redundant, and explicit about preset behavior.
- Rebuilt the markdown note into the current production template while keeping the original four-column autopsy logic intact.

---
id: M-PRE-007
name: Pre-Test
stage: PRIME
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-PRE, prime]
---

# M-PRE-007 — Pre-Test

## Summary
Attempt to answer questions on the topic before studying it. The method stays short, low-stakes, and priming-focused so wrong answers and confidence ratings become useful encoding hooks instead of early grading.

**Not for:** summative grading, gatekeeping, or immediate answer explanation. Use `CALIBRATE` when the goal is scored readiness routing and use `TEACH` or `REFERENCE` when the goal is explanation.

## Core Steps
1. **Read Pre-Test Questions Without Looking at Source Material** — set up a short prediction pass
2. **Attempt to Answer Each Question - Guess If Uncertain** — force a real attempt
3. **Rate Confidence for Each Answer (1-5)** — capture calibration signals
4. **Do Not Check Answers Yet** — preserve the knowledge gap for later study
5. **Keep Pre-Test Visible During Study** — check answers only when they are encountered in the material

## Inputs
- Source material loaded in chat
- Target topic or objective scope
- Prior notes, North Star, or prior-session context (optional)

## Required Outputs
- `Pre-test answers (with confidence ratings)`
- `Encoding priming for correct answers`
- `Calibration baseline`

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
- `exam_cram` — one-shot, fastest pretest pass. Use 3 questions, terse guessed answers with confidence, and a one-line watch-for cue per item.
- `deep_mastery` — interactive, full pretest pass. Use 4-5 questions, keep answer attempts and calibration notes explicit, and end with a richer study watchlist without revealing answers.
- `quick_review` — one-shot refresh pass. Render a compact table with `question | guess | confidence | what to watch` columns plus a short calibration note.
- `clinical_bridge` — stepwise applied pretest pass. Use short case or cue-based questions and render the result as a clinical `guess | confidence | study-watch` matrix.

## Runtime Prompt
```text
You are running M-PRE-007 (Pre-Test) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Pre-test answers (with confidence ratings), Encoding priming for correct answers, and Calibration baseline.
Build a short pre-study question set, require an answer attempt for every item, capture confidence for each answer, and keep the questions visible for later answer checking during study. Keep it low-stakes, non-summative, and priming-focused; do not reveal correct answers yet and do not drift into explanation.
Preset behavior:
- exam_cram: one-shot; 3 questions, terse guesses with confidence, and one watch-for cue per item.
- deep_mastery: interactive; 4-5 questions, explicit answer attempts, calibration notes, and a richer study watchlist.
- quick_review: one-shot refresh; compact question / guess / confidence / what-to-watch table plus short calibration note.
- clinical_bridge: stepwise; short case-based guess / confidence / study-watch matrix.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves questions -> answer attempts -> confidence -> watchlist and waits.
```

## Evidence
- **Citation:** Richland, Kornell, and Kao (2009); Glass, Brill, and Ingate (2008); Little and Bjork (2016); Pan and Carpenter (2024); Mera, Dianova, and Marin-Garcia (2025)
- **Finding:** Pre-Test is best supported as a low-stakes pretesting and prediction move that creates encoding hooks before study, not as an early grading event. Foundational pretesting studies showed that attempting answers before study can improve later learning even when many initial responses are wrong, and classroom work suggests the same pattern can transfer to educational settings when the pretest stays brief and is followed by later exposure to the correct information. More recent review and robustness work shows the effect depends on timing, question format, and what is later studied, which means the method should stay short, require real guesses, capture confidence, and delay answer checking rather than collapsing into immediate correction.
- **Source:** `https://doi.org/10.1037/a0016496`; `https://doi.org/10.1080/01443410701777280`; `https://doi.org/10.3758/s13421-016-0621-z`; `https://doi.org/10.1007/s10648-023-09814-5`; `https://doi.org/10.3758/s13421-025-01813-x`
- **Needs research:** `false`

## Related Methods
- [[M-PRE-014]] — Use to surface blind spots before generating more pre-test prompts
- [[M-PRE-010]] — Use when objective framing is still too weak to build a good question set

## Changelog
- **v1.1** — migrated the method to the stage-first production metadata and cleaned up the legacy prompt surface while preserving the original five-step pretest flow.
- **v1.2** — upgraded the evidence stack to stronger pretesting, classroom, and recent review sources; rebuilt the note into the current template; made the four presets produce clearly distinct pretest artifacts; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.

### Summary of Changes
- Reframed the method as a low-stakes priming pass rather than a contradictory non-assessment quiz.
- Upgraded the evidence stack from a thin seed reference to a stronger mix of classic pretesting studies, classroom work, and recent review and robustness papers.
- Rebuilt the preset behavior so each mode now produces a distinct pretest artifact:
  - `exam_cram` uses terse bullets.
  - `deep_mastery` uses grouped labeled sections.
  - `quick_review` uses a compact question table.
  - `clinical_bridge` uses a case-based matrix.
- Tightened the facilitation prompt so it is shorter, explicit about delayed answer checking, and clear that the method should not drift into explanation.
- Preserved the original core flow: pose questions, require guesses, capture confidence, delay answer checking, and keep the pre-test visible during study.

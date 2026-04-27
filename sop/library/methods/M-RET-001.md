---
id: M-RET-001
name: Timed Brain Dump
stage: RETRIEVE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, RET, retrieve]
---

# M-RET-001 — Timed Brain Dump

## Summary
Run a timed closed-note brain dump to see what the learner can retrieve cold, then compare against the source to mark misses and estimate recall strength. The method stays attempt-first and turns one recall pass into a reusable repair signal instead of a vague study block.

**Not for:** This is not for open-note review, answer-reveal first workflows, or deep teaching. Use REFERENCE if the learner needs an anchor first.

## Core Steps
1. **Close all materials and** — Close all materials and reference sources. Materials must be completely hidden — no peeking allowed
2. **Set timer for 5** — Set timer for 5 minutes. Time pressure adds desirable difficulty
3. **Write everything you remember** — Write everything you remember about the topic. Stream of consciousness — include facts, relationships, examples, anything
4. **When stuck, write "?"** — When stuck, write "?" and move to next thing you remember. Gaps are valuable data — mark them explicitly
5. **Stop when timer ends** — Stop when timer ends or you've exhausted recall. Don't extend time — constraint is the feature
6. **Open materials and compare** — Open materials and compare your output to the source. Mark correct items, identify missing items, note errors

## Inputs
- Topic or concept to recall
- Blank paper or text area
- Timer (5 min recommended)
- Reference materials (closed during recall, opened for comparison)

## Required Outputs
- `Free recall dump with gaps marked`
- `Accuracy assessment (correct vs incorrect items)`
- `Gap list (missing items identified)`
- `RSR percentage estimate`

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
- `exam_cram` — Fastest dump. Use a 3-minute closed-note burst, terse bullets for the recall output, and a short miss list plus one repair target.
- `deep_mastery` — Fullest dump. Use the full time cap, keep the raw recall verbatim, and return a fuller item-by-item comparison plus a ranked repair list.
- `quick_review` — Refresh pass. Use a compact dump plus a three-column table for correct, partial, and missed content with a quick RSR estimate.
- `clinical_bridge` — Applied dump. Emphasize signs, actions, and discriminators from the session, then organize misses in a handoff table tied to the next practical review move.

## Runtime Prompt
```text
You are running M-RET-001 (Timed Brain Dump) in the RETRIEVE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Free recall dump with gaps marked, Accuracy assessment, Gap list, and RSR percentage estimate.
Run one timed closed-note dump before any comparison. Keep the attempt window clean, mark gaps instead of teaching through them, then compare against the source only after the timer ends.
Preset behavior:
- exam_cram: one-shot; 3-minute dump; terse bullets; one repair target.
- deep_mastery: interactive; full-cap dump; verbatim recall plus fuller comparison and ranked repair list.
- quick_review: one-shot refresh; compact dump plus correct-partial-missed table and quick RSR.
- clinical_bridge: stepwise; applied recall focused on signs, actions, and discriminators with a handoff-style miss table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves dump -> compare -> repair and waits.
```

## Evidence
- **Citation:** Roediger and Karpicke (2006); Yang, Luo, Vadillo, Yu, and Shanks (2021); Agarwal, Nunes, and Blunt (2021)
- **Finding:** Timed Brain Dump is best supported as a free-recall retrieval routine whose value comes from the retrieval attempt itself, the visibility of omissions, and the compare-after feedback pass. Classic testing-effect work shows that recall attempts can outperform rereading on delayed retention, recent meta-analytic work confirms broad benefits for retrieval practice across materials and settings, and classroom reviews support retrieval as a practical way to surface what students can and cannot yet pull from memory. The practical implication for this method is to keep the first pass closed-note and time-bounded, treat gaps as usable data, and use the comparison step for repair rather than for helping during the attempt.
- **Source:** `https://doi.org/10.1111/j.1467-9280.2006.01693.x; https://doi.org/10.1037/bul0000309; https://doi.org/10.1007/s10648-021-09595-9`
- **Needs research:** `false`

## Related Methods
- [[M-REF-003]] — A one-page anchor is a good compare-against source artifact
- [[M-REF-001]] — Error autopsy turns misses into prevention cues

## Changelog
- **v1.0** — prior method draft preserved the original retrieval flow before this production hardening pass.
- **v1.2** — upgraded the evidence stack to stronger, method-relevant sources; added the standard knob schema plus four clearly distinct presets; tightened the runtime prompt; rebuilt the markdown note into the current production template; and preserved the original method logic, steps, outputs, and constraints.

## Summary of Changes
- Replaced the placeholder evidence block with stronger retrieval-practice and classroom retrieval sources centered on Roediger, Karpicke, and recent meta-analytic work.
- Added four clearly separated presets that now change both the dump depth and the output format.
- Rewrote the runtime prompt into a shorter attempt-first instruction block with explicit preset behavior.
- Rebuilt the markdown note into the current production template and preserved the original recall, compare, and repair flow.

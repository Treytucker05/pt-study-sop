---
id: M-RET-003
name: Fill-in-Blank
stage: RETRIEVE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, RET, retrieve]
---

# M-RET-003 — Fill-in-Blank

## Summary
Use cloze-style retrieval to force the learner to supply missing terms, then track misses and second-pass gains. The method stays narrow and scoring-friendly, which makes it useful for targeted retention checks rather than broad review.

**Not for:** This is not for open-note review, answer-reveal first workflows, or deep teaching. Use REFERENCE if the learner needs an anchor first.

## Core Steps
1. **Prepare cloze material by** — Prepare cloze material by blanking key terms (or use pre-made). Target vocabulary, definitions, key names, and critical facts
2. **Read each sentence with** — Read each sentence with the blank. Use context clues — this is cued recall, not free recall
3. **Write or speak the** — Write or speak the missing term before checking. Commit to answer first — no peeking at answer key
4. **Check answer immediately after** — Check answer immediately after each item. Immediate feedback strengthens correct memories, corrects errors
5. **Mark items missed for** — Mark items missed for targeted review. Create a miss list for focused re-study
6. **Re-attempt missed items after** — Re-attempt missed items after completing all blanks. Second pass often shows improvement — track this

## Inputs
- Notes or text with key terms identified
- Cloze deletion tool (or manually blanked printout)
- Answer key for verification

## Required Outputs
- `Completed cloze exercise`
- `Accuracy count (correct/total blanks)`
- `Miss list for targeted review`
- `Second-pass improvement rate`

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
- `exam_cram` — Fastest cloze pass. Use 8-10 lean blanks, terse accuracy bullets, and a short miss list for focused review.
- `deep_mastery` — Fullest cloze pass. Use 12-15 blanks, keep first-pass and second-pass scoring explicit, and return a fuller improvement readout.
- `quick_review` — Refresh cloze pass. Use a compact cloze table with first-pass score, second-pass score, and miss carry-forward columns.
- `clinical_bridge` — Applied cloze pass. Use applied sentences or cue-to-action blanks and organize misses in a short finding-to-fix table.

## Runtime Prompt
```text
You are running M-RET-003 (Fill-in-Blank) in the RETRIEVE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Completed cloze exercise, Accuracy count, Miss list, and Second-pass improvement rate.
Run a closed-note cloze pass that forces an answer before any check. Keep each blank atomic, check only after the attempt, and use the second pass to see whether the miss was repaired.
Preset behavior:
- exam_cram: one-shot; 8-10 blanks; terse bullets; short miss list.
- deep_mastery: interactive; 12-15 blanks; explicit first-pass and second-pass scoring plus fuller improvement readout.
- quick_review: one-shot refresh; compact cloze table with first-pass, second-pass, and carry-forward columns.
- clinical_bridge: stepwise; applied cue-to-action blanks with misses organized in a short finding-to-fix table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves first pass -> check -> second pass and waits.
```

## Evidence
- **Citation:** Dunlosky, Rawson, Marsh, Nathan, and Willingham (2013); Yang, Luo, Vadillo, Yu, and Shanks (2021); Agarwal, Nunes, and Blunt (2021); McDermott, Agarwal, D’Antonio, Roediger, and McDaniel (2021)
- **Finding:** Fill-in-Blank is best supported as a cued-recall retrieval routine that narrows the target enough to make misses visible and repeatable. Reviews of effective learning techniques support retrieval and practice testing over passive review, recent meta-analytic work confirms broad testing benefits, and classroom retrieval-practice evidence supports structured prompt formats that expose exactly where recall breaks down. The practical implication for this method is to keep blanks atomic, require an answer before checking, and use the second pass to measure whether the cue-plus-feedback cycle actually stabilizes the target.
- **Source:** `https://doi.org/10.1177/1529100612453266; https://doi.org/10.1037/bul0000309; https://doi.org/10.1007/s10648-021-09595-9; https://doi.org/10.1080/87567555.2021.1910124`
- **Needs research:** `false`

## Related Methods
- [[M-REF-003]] — Cloze items often come from the anchor sheet
- [[M-REF-001]] — Missed blanks can be autopsied for confusion patterns

## Changelog
- **v1.0** — prior method draft preserved the original retrieval flow before this production hardening pass.
- **v1.2** — upgraded the evidence stack to stronger, method-relevant sources; added the standard knob schema plus four clearly distinct presets; tightened the runtime prompt; rebuilt the markdown note into the current production template; and preserved the original method logic, steps, outputs, and constraints.

## Summary of Changes
- Replaced the weak evidence stub with stronger retrieval-technique, classroom retrieval, and cued-recall support.
- Made the presets materially different in blank count, review depth, and artifact layout.
- Condensed the facilitation prompt into a tighter attempt-first cloze workflow with explicit second-pass behavior.
- Rebuilt the markdown note into the current template and preserved the original cloze, check, and re-attempt sequence.

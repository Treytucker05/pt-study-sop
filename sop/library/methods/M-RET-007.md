---
id: M-RET-007
name: Timed Sprint Sets
stage: RETRIEVE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, RET, retrieve]
---

# M-RET-007 — Timed Sprint Sets

## Summary
Run short timed sprint sets and log both correctness and speed so slow-but-correct recall does not masquerade as fluent mastery. The method is about retrieval under pacing pressure, not broad explanation.

**Not for:** This is not for open-note review, answer-reveal first workflows, or deep teaching. Use REFERENCE if the learner needs an anchor first.

## Core Steps
1. **Run short timed sets** — Run short timed sets with strict item clocks. Mark misses at >45s and move on
2. **Record time_to_answer for each** — Record time_to_answer for each item. Capture accuracy and confidence together
3. **Push misses to ErrorLog.csv.** — Push misses to ErrorLog.csv. Tag Speed when latency is the limiting factor

## Inputs
- Question Bank Seed
- Timer

## Required Outputs
- `Timed sprint result set with per-item accuracy`
- `Latency log (time_to_answer per item)`
- `ErrorLog updates (misses and speed failures tagged)`

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
- `exam_cram` — Fastest sprint build. Use two short rounds, terse bullets, and only the biggest speed failures plus misses.
- `deep_mastery` — Fullest sprint build. Use three rounds, keep per-item latency explicit, and return a fuller fluency-risk readout.
- `quick_review` — Refresh sprint build. Use a compact round table with item, accuracy, latency, and failure tag columns.
- `clinical_bridge` — Applied sprint build. Use quick applied prompts and summarize misses or slow answers in a short triage-style matrix.

## Runtime Prompt
```text
You are running M-RET-007 (Timed Sprint Sets) in the RETRIEVE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Timed sprint result set with per-item accuracy, Latency log, and ErrorLog updates.
Run short timed retrieval rounds that capture both correctness and response speed. Keep the rounds brief, force an answer before feedback, and log slow answers as fluency problems rather than hiding them inside accuracy totals.
Preset behavior:
- exam_cram: one-shot; two short rounds; terse bullets; only the biggest speed failures and misses.
- deep_mastery: interactive; three rounds; explicit per-item latency and fuller fluency-risk readout.
- quick_review: one-shot refresh; compact round table with accuracy, latency, and failure tags.
- clinical_bridge: stepwise; quick applied prompts with misses and slow answers in a short triage matrix.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves round -> scoring -> logging and waits.
```

## Evidence
- **Citation:** Yang, Luo, Vadillo, Yu, and Shanks (2021); Agarwal, Nunes, and Blunt (2021); Mielicki and Wiley (2019); Barenberg and Dutke (2021)
- **Finding:** Timed Sprint Sets is best supported as a retrieval-practice routine that adds pacing pressure to reveal whether recall is both correct and available fast enough to be usable. Meta-analytic retrieval evidence supports repeated testing, classroom reviews support frequent short retrieval rounds, and more specific timing and fluency work suggests that response speed can separate stable access from labored recall. The practical implication for this method is to use short rounds, capture latency per item, and treat both misses and slow answers as routing signals instead of focusing on correctness alone.
- **Source:** `https://doi.org/10.1037/bul0000309; https://doi.org/10.1007/s10648-021-09595-9; https://doi.org/10.1016/j.ijpsycho.2019.07.002; https://doi.org/10.1080/09658211.2021.1990963`
- **Needs research:** `false`

## Related Methods
- [[M-REF-003]] — Latency bottlenecks can be compared against a compact anchor
- [[M-OVR-003]] — Drill sheets can be tuned from latency data

## Changelog
- **v1.0** — prior method draft preserved the original retrieval flow before this production hardening pass.
- **v1.2** — upgraded the evidence stack to stronger, method-relevant sources; added the standard knob schema plus four clearly distinct presets; tightened the runtime prompt; rebuilt the markdown note into the current production template; and preserved the original method logic, steps, outputs, and constraints.

## Summary of Changes
- Upgraded the evidence section around retrieval fluency, short-form classroom retrieval, and timing-sensitive recall.
- Separated the presets by round structure, pacing detail, and output format.
- Condensed the facilitation prompt around short timed rounds, latency capture, and fluency-risk logging.
- Rebuilt the markdown note into the current template while preserving the original timed-sprint and ErrorLog flow.

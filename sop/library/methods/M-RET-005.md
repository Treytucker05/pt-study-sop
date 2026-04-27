---
id: M-RET-005
name: Variable Retrieval
stage: RETRIEVE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, RET, retrieve]
---

# M-RET-005 — Variable Retrieval

## Summary
Test the same concept across multiple retrieval formats so the learner has to move beyond one memorized phrasing. The method is about flexible access, not just one correct recital.

**Not for:** This is not for open-note review, answer-reveal first workflows, or deep teaching. Use REFERENCE if the learner needs an anchor first.

## Core Steps
1. **Select one concept to** — Select one concept to practice in varied formats. Pick a concept you know reasonably well — this is for flexibility, not first learning
2. **Format 1 - Free** — Format 1 - Free Recall: Write everything you know about the concept. No prompts, no structure — just dump what you remember
3. **Format 2 - Application:** — Format 2 - Application: Answer a scenario question using the concept. Example: 'Patient presents with X, how does [concept] apply?'
4. **Format 3 - Compare/Contrast:** — Format 3 - Compare/Contrast: Explain how this concept differs from a related one. Discrimination builds stronger memory traces
5. **Review and verify all** — Review and verify all three outputs against source materials. Check for accuracy and completeness in each format
6. **Note which format was** — Note which format was hardest — that's where your weakness is. Format difficulty reveals retrieval flexibility gaps

## Inputs
- Single concept or topic to retrieve
- Three retrieval format prompts (free recall, application, compare/contrast)
- Reference materials for verification (closed during retrieval)

## Required Outputs
- `Three retrieval outputs (free recall, application, compare/contrast)`
- `Accuracy assessment for each format`
- `Difficulty ranking of formats`
- `Flexibility gap identification`

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
- `exam_cram` — Fastest flexibility check. Use one concept, three short formats, and terse bullets for score plus hardest format.
- `deep_mastery` — Fullest flexibility check. Use one or two concepts, keep all three formats explicit, and return a fuller format-difficulty comparison with repair targets.
- `quick_review` — Refresh check. Use a compact table that compares free recall, application, and compare-contrast performance side by side.
- `clinical_bridge` — Applied flexibility check. Use one concept across recall, applied decision, and contrast prompts, then organize failures in a short handoff table for the next practical review.

## Runtime Prompt
```text
You are running M-RET-005 (Variable Retrieval) in the RETRIEVE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Three retrieval outputs, Accuracy assessment for each format, Difficulty ranking of formats, and Flexibility gap identification.
Run the same concept through multiple retrieval formats without teaching between them. Hold the target concept steady, vary the prompt form, and use the pattern to find brittle knowledge.
Preset behavior:
- exam_cram: one-shot; one concept; three short formats; terse bullets and hardest-format callout.
- deep_mastery: interactive; one or two concepts; explicit three-format comparison plus fuller repair targets.
- quick_review: one-shot refresh; compact side-by-side format table.
- clinical_bridge: stepwise; recall, applied decision, and contrast prompts with failures organized in a short handoff table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves format 1 -> format 2 -> format 3 -> comparison and waits.
```

## Evidence
- **Citation:** Bjork, Dunlosky, and Kornell (2013); Yang, Luo, Vadillo, Yu, and Shanks (2021); McDermott, Agarwal, D’Antonio, Roediger, and McDaniel (2021); Uesaka and Manalo (2025)
- **Finding:** Variable Retrieval is best supported as a varied-practice retrieval routine that checks whether a concept can survive changes in prompt format. Desirable-difficulty and retrieval-practice work supports the value of effortful recall, recent meta-analytic evidence confirms broad testing benefits, and classroom retrieval studies show that changing the question form can reveal brittle knowledge that one stable prompt would miss. The practical implication for this method is to hold the concept constant while varying the retrieval demand, then rank which formats fail so the learner can repair flexibility rather than just re-memorize one phrasing.
- **Source:** `https://doi.org/10.1016/S0022-5371(77)80016-9; https://doi.org/10.1037/bul0000309; https://doi.org/10.1080/87567555.2021.1910124; https://doi.org/10.1073/pnas.2413511121`
- **Needs research:** `false`

## Related Methods
- [[M-REF-003]] — Anchor artifacts supply the same concept in multiple formats
- [[M-OVR-002]] — Anki cards can hold the multiple retrieval formats

## Changelog
- **v1.0** — prior method draft preserved the original retrieval flow before this production hardening pass.
- **v1.2** — upgraded the evidence stack to stronger, method-relevant sources; added the standard knob schema plus four clearly distinct presets; tightened the runtime prompt; rebuilt the markdown note into the current production template; and preserved the original method logic, steps, outputs, and constraints.

## Summary of Changes
- Replaced the thin evidence block with stronger retrieval-variation and prompt-flexibility support.
- Made the presets distinct in concept load, comparison depth, and artifact structure.
- Compressed the facilitation prompt into a shorter multi-format retrieval contract with explicit preset behavior.
- Rebuilt the markdown note into the current template while preserving the original three-format retrieval sequence.

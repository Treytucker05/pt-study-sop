---
id: M-RET-004
name: Mixed Practice
stage: RETRIEVE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, RET, retrieve]
---

# M-RET-004 — Mixed Practice

## Summary
Interleave questions from multiple topics in one retrieval block so the learner has to recall the answer and identify the right topic boundary at the same time. The method is built for discrimination, not comfort.

**Not for:** This is not for open-note review, answer-reveal first workflows, or deep teaching. Use REFERENCE if the learner needs an anchor first.

## Core Steps
1. **Select 2-3 distinct but** — Select 2-3 distinct but related topics for the session. Best with topics that could be confused (e.g., similar muscle actions)
2. **Create or request a** — Create or request a mixed question set. Questions should be randomly ordered, not blocked by topic
3. **Answer each question, noting** — Answer each question, noting which topic it belongs to. The discrimination ("which topic is this?") is part of the learning
4. **After answering, verify correctness** — After answering, verify correctness AND topic classification. Both content and categorization matter
5. **Track accuracy by topic** — Track accuracy by topic separately. Identifies which topic needs more work
6. **Reflect on discrimination patterns** — Reflect on discrimination patterns — which topics did you confuse?. Confusion patterns reveal conceptual boundaries to strengthen

## Inputs
- 2-3 different topics for interleaving
- Question bank or Tutor AI covering all topics
- Timer (10 min recommended)
- Randomization method (shuffle cards, AI random selection)

## Required Outputs
- `Overall accuracy across all topics`
- `Per-topic accuracy breakdown`
- `Confusion matrix (which topics got mixed up)`
- `Discrimination insights (cues that distinguish topics)`

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
- `exam_cram` — Fastest interleave. Use 2 topics, a short mixed set, and terse bullets for per-topic accuracy plus one confusion cue.
- `deep_mastery` — Fullest interleave. Use 3 topics, a longer mixed set, and a fuller confusion matrix plus discrimination insights by topic.
- `quick_review` — Refresh interleave. Use a compact table with item number, topic, result, and confusion tag for fast pattern spotting.
- `clinical_bridge` — Applied interleave. Mix applied scenarios from 2-3 confusable domains and return a short routing matrix centered on likely downstream mix-ups.

## Runtime Prompt
```text
You are running M-RET-004 (Mixed Practice) in the RETRIEVE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Overall accuracy, Per-topic accuracy breakdown, Confusion matrix, and Discrimination insights.
Run an interleaved closed-note retrieval block across 2-3 topics. Score both the answer and the topic classification, then use the confusion pattern to decide what needs repair.
Preset behavior:
- exam_cram: one-shot; 2 topics; short mixed set; terse bullets and one confusion cue.
- deep_mastery: interactive; 3 topics; longer mixed set; fuller confusion matrix and topic-level insights.
- quick_review: one-shot refresh; compact item-by-item confusion table.
- clinical_bridge: stepwise; applied scenarios from confusable domains with a short routing matrix.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves set -> scoring -> confusion review and waits.
```

## Evidence
- **Citation:** Kang and Pashler (2012); Rohrer, Dedrick, Hartwig, and Cheung (2020); Brunmair and Richter (2019); Carvalho and Goldstone (2023)
- **Finding:** Mixed Practice is best supported as an interleaved retrieval routine that improves later discrimination by forcing topic switching and comparison. Foundational interleaving work and later classroom studies show that mixed sets can outperform blocked formats on delayed performance when the learner must distinguish related categories or procedures, while broader interleaving reviews show that the benefit depends on the match between the mix and the discrimination demand. The practical implication for this method is to interleave genuinely confusable topics, score both answer accuracy and topic classification, and use the confusion pattern to decide what needs more focused repair.
- **Source:** `https://doi.org/10.1007/s11251-007-9015-8; https://doi.org/10.1037/edu0000367; https://doi.org/10.1007/s11251-020-09504-7; https://doi.org/10.1007/s10212-023-00723-3`
- **Needs research:** `false`

## Related Methods
- [[M-REF-004]] — Question bank seeds can be tagged for interleaving
- [[M-OVR-003]] — Drill sheets can package the interleaved set for later use

## Changelog
- **v1.0** — prior method draft preserved the original retrieval flow before this production hardening pass.
- **v1.2** — upgraded the evidence stack to stronger, method-relevant sources; added the standard knob schema plus four clearly distinct presets; tightened the runtime prompt; rebuilt the markdown note into the current production template; and preserved the original method logic, steps, outputs, and constraints.

## Summary of Changes
- Upgraded the evidence section around interleaving, discrimination, and classroom mixed-practice findings.
- Redesigned the presets so they now diverge in topic count, set size, and output format.
- Tightened the facilitation prompt around answer-plus-topic classification and confusion tracking.
- Rebuilt the markdown note into the production template while preserving the original interleaved retrieval flow.

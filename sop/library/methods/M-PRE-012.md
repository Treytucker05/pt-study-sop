---
id: M-PRE-012
name: Terminology Pretraining
stage: ORIENT
status: validated
version: '1.3'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-PRE, orient]
---

# M-PRE-012 — Terminology Pretraining

## Summary
Extract the minimum high-yield terms, abbreviations, and short definitions needed to read the topic without getting lost, plus the most important confusable distinctions. The method stays at orientation level, clears vocabulary bottlenecks quickly, and ends by surfacing the few terms or contrasts most likely to matter next.

**Not for:** first-contact teaching, scored assessment, or full solution reveal. Use an `EXPLAIN` or `CONSOLIDATE` method when the goal is explanation rather than orientation.

## Core Steps
1. **Select Bottleneck Terms** — keep the smallest sufficient set of high-yield terms needed for gist and mechanism
2. **Functional Definitions** — give each term a concise definition plus one function, state, or context cue
3. **Critical Contrasts** — flag only the few confusable distinctions most likely to derail comprehension

## Inputs
- Source material loaded in chat
- Target topic or objective scope
- Prior notes, North Star, or prior-session context (optional)

## Required Outputs
- `TerminologyList`
- `ConfusableTermFlags`

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
- `exam_cram` — one-shot, bullet-first primer. Keep only the most test-relevant bottleneck terms, use terse functional cues, and flag just the highest-risk confusions.
- `deep_mastery` — interactive, labeled-section primer. Group terms lightly, allow fuller function or context cues, and ask one short learner check before the confusable contrasts.
- `quick_review` — one-shot refresh for already-seen material. Keep only shaky, confusable, or easily forgotten terms and skip beginner-level glosses.
- `clinical_bridge` — stepwise applied primer. Present the outputs in a table or tightly labeled sections and tie cues or contrasts to practical relevance, chart language, exam findings, or bedside distinctions.

## Runtime Prompt
```text
You are running M-PRE-012 (Terminology Pretraining) in the ORIENT stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: TerminologyList and ConfusableTermFlags.
Select the smallest sufficient set of high-yield terms and indispensable abbreviations. For each term, give a concise definition plus one function, state, or context cue. Flag only the few confusable distinctions most likely to derail reading.
Stay source-grounded, non-assessive, and stop before mechanism teaching.
Preset behavior:
- exam_cram: one-shot; bullets; keep only the most test-relevant bottleneck terms; use terse cues and 2-3 critical contrasts.
- deep_mastery: interactive; labeled sections; group terms lightly, allow richer functional cues, and ask one short check before ConfusableTermFlags.
- quick_review: one-shot refresh; assume prior exposure; keep only shaky, easily confused, or easily forgotten terms and skip beginner-level glosses.
- clinical_bridge: stepwise; use a table or tightly labeled sections and tie cues or contrasts to applied relevance, chart language, exam findings, or bedside distinctions.
If no preset is specified, use the default knobs. One-shot returns both outputs in one bounded reply; interactive or stepwise mode moves section by section and waits.
```

## Evidence
- **Citation:** Mayer (2009); Stahl and Nagy (2006); Wright and Cervetti (2017); Cervetti, Fitzgerald, Hiebert, and Hebert (2023); Hattan, Alexander, and Lupo (2024)
- **Finding:** Terminology pretraining is strongest when learners meet the names and characteristics of central concepts before a complex explanation or dense reading task. Vocabulary research further suggests that comprehension gains are most reliable when instruction is selective, contextualized, and tied to function or use rather than dictionary-only glosses. More recent review evidence suggests that prior knowledge activation usually needs explicit prompting and that these supports matter most when learners lack enough domain vocabulary to orient themselves independently.
- **Source:** `https://doi.org/10.1017/CBO9780511811678.014`; `https://www.routledge.com/Teaching-Word-Meanings/Stahl-Nagy/p/book/9781410615381`; `https://doi.org/10.1002/rrq.163`; `https://doi.org/10.1080/02702711.2023.2179146`; `https://doi.org/10.3102/00346543221148478`
- **Needs research:** `false`

## Related Methods
- [[M-PRE-010]] — Frame the vocabulary in the active objective
- [[M-PRE-008]] — Follow with structural extraction after pretraining terms

## Changelog
- **v1.1** — migrated structural metadata to the stage-first architecture: stage/category now use `ORIENT`, the subcategory is `terminology-pretraining`, and tags were aligned to orientation-first metadata.
- **v1.2** — cleaned up leftover stage-language references so the body text matches the stage-first architecture without changing method logic.
- **v1.3** — upgraded the evidence stack to stronger pretraining, vocabulary, and prior-knowledge-activation sources; replaced the legacy knob block with the standard schema plus distinct presets; tightened the runtime prompt; and rebuilt the markdown note into the current template structure without changing method logic, steps, outputs, or constraints.

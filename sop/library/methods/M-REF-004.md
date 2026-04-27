---
id: M-REF-004
name: Question Bank Seed
stage: CONSOLIDATE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-REF, consolidate]
---

# M-REF-004 — Question Bank Seed

## Summary
Build a compact, reusable bank of retrieval prompts from current objectives and anchor artifacts. The method stays artifact-first, covers the target objective set, and prepares later retrieval instead of turning the session into a live quiz.

**Not for:** quizzing the learner or introducing new material. Use `RETRIEVE` when the goal is memory testing and `EXPLAIN` when the goal is explanation.

## Core Steps
1. **Generate Questions** — draft 10-20 retrieval questions tied to objective IDs
2. **Tag Each Item** — assign mode and objective tags while checking coverage
3. **Mark Confusable Items** — flag high-risk discriminators for later adversarial drills

## Inputs
- Objectives
- One-Page Anchor
- Assessment mode selector

## Required Outputs
- `Question Bank Seed (10-20 items, each mode-tagged and objective-tagged)`
- `Coverage check draft (confirming all objectives have at least one question)`

## Knob Schema
```yaml
knobs:
  guidance_level: medium
  delivery_mode: stepwise
  fade_intensity: minimal
  output_layout: table
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
- `exam_cram` — one-shot, fastest seed build. Produce 10-12 terse bullet items with direct objective tags, mostly factual or discriminative prompts, plus a minimal coverage check.
- `deep_mastery` — interactive, fullest seed build. Produce 16-20 items with a deliberate mix of recall, application, and adversarial confusable questions, and make the coverage check explicit by objective.
- `quick_review` — one-shot refresh seed build. Produce 10-14 compact table rows with question, mode, and objective ID columns, focusing on shaky or high-yield objectives only.
- `clinical_bridge` — stepwise applied seed build. Produce 12-16 questions framed around discriminators, cue-to-action prompts, and case-linked comparisons, with a coverage table that highlights real-world confusions.

## Runtime Prompt
```text
You are running M-REF-004 (Question Bank Seed) in the CONSOLIDATE stage.
Use only the loaded source and learner context. Ask only for missing required inputs.
Produce: Question Bank Seed and Coverage check draft.
Build a 10-20 item mode-tagged, objective-tagged question bank from the current objectives and anchor artifacts. Keep it source-grounded, reusable, and deterministic; include some application or confusable items, preserve source wording where it helps retrieval, and do not turn generation into live quizzing.
Preset behavior:
- exam_cram: one-shot; 10-12 terse bullet items; minimal coverage check.
- deep_mastery: interactive; 16-20 mixed-depth items; explicit objective-by-objective coverage review.
- quick_review: one-shot refresh; 10-14 compact table rows focused on shaky or high-yield objectives.
- clinical_bridge: stepwise; 12-16 applied or confusable questions with a coverage table emphasizing real-world discriminators.
If no preset is specified, use the default knobs. One-shot returns the full seed artifact in one bounded reply; interactive or stepwise mode moves draft -> tag -> coverage check and waits.
```

## Evidence
- **Citation:** Roediger and Karpicke (2006); Bugg and McDaniel (2012); Agarwal, Nunes, and Blunt (2021); Lin, Sun, and Zhang (2021); Ortega-Tudela, Lechuga, Bermúdez-Sierra, and Gómez-Ariza (2021); Causey and Spencer (2024)
- **Finding:** Question Bank Seed is best supported as a retrieval-support artifact that turns objectives and anchor material into reusable prompts, not as a quiz event by itself. Retrieval-practice evidence supports building prompts that will later require recall rather than passive rereading, and question self-generation research suggests that constructing and answering one’s own questions can improve learning from expository material. Applied reviews and classroom studies show that retrieval questions and self-generated quizzes can support engagement, later recall, and classroom review when the prompts are aligned to current objectives and are actually reused. The practical implication for this method is to build a compact, objective-tagged question bank that covers the full target set, includes some higher-level and confusable items, preserves source wording where useful, and stays reusable for later retrieval rather than drifting into live testing during generation.
- **Source:** `https://doi.org/10.1111/j.1467-8721.2006.00429.x`; `https://doi.org/10.1037/a0028661`; `https://doi.org/10.1007/s10648-021-09595-9`; `https://doi.org/10.1080/01587919.2021.1956303`; `https://doi.org/10.1177/21582440211061569`; `https://doi.org/10.1016/j.tsc.2024.101608`
- **Needs research:** `false`

## Related Methods
- [[M-RET-002]] — Question bank seeds become sprint quiz items
- [[M-OVR-002]] — Card drafting can reuse high-quality question stems

## Changelog
- **v1.1** — migrated structural metadata to the stage-first architecture: stage/category now use `CONSOLIDATE`, the subcategory is `question-bank-seed`, and tags were aligned to consolidation-first metadata.
- **v1.2** — upgraded the evidence stack to stronger retrieval-practice, question-generation, and classroom quiz-generation sources; replaced the legacy note layout with the current template; added the standard knob schema plus four distinct presets; tightened the runtime prompt; and preserved the original method logic, steps, outputs, and constraints.

### Summary of Changes
- Reframed the method as a retrieval-support question bank rather than a live quiz.
- Replaced the weak evidence stub with stronger retrieval, self-generated-question, and classroom quiz-generation citations.
- Added the standard knob schema and made all four presets behaviorally distinct by bank size, output format, and question mix.
- Tightened the facilitation prompt so it is shorter, less redundant, and explicit about preset behavior.
- Rebuilt the markdown note into the current production template without changing the core question-bank flow.

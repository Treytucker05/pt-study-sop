---
id: M-REF-003
name: One-Page Anchor
stage: CONSOLIDATE
status: validated
version: '1.3'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-REF, consolidate]
---

# M-REF-003 — One-Page Anchor

## Summary
Build a single-page reference anchor containing minimal definitions, decision rules, canonical examples, near-misses, and traps. The method is for compact artifact construction, not explanation or testing, and it ends with a reusable sheet that later retrieval can target directly.

**Not for:** quizzing the learner or introducing new material. Use `RETRIEVE` when the goal is memory testing and `EXPLAIN` when the goal is explanation.

## Core Steps
1. **Capture Minimal Definitions Only** — keep only high-value distinctions
2. **Write Decision Rules and Triggers** — focus on rapid discrimination cues
3. **Add Canonical Examples, Near-Misses, and Traps** — include 3 canonical examples, 3 near-misses, and common error notes

## Inputs
- `PrioritySet`
- `Source-grounded notes`

## Required Outputs
- `One-Page Anchor (definitions, decision rules, examples, near-misses, traps — all present)`
- `Trap list and near-miss set (3 canonical + 3 near-miss examples minimum)`

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
- `exam_cram` — one-shot, terse bullet sheet. Use one-line definitions and rules, short example labels, and a stripped-down trap list built for last-minute scanning.
- `deep_mastery` — interactive, labeled-section anchor. Keep every required section explicit, allow slightly richer cue wording, and confirm section by section that the artifact is still reusable and source-faithful.
- `quick_review` — one-shot refresh sheet. Assume prior exposure and keep only shaky definitions, highest-yield rules, and the most confusable near-misses and traps.
- `clinical_bridge` — stepwise applied cue table. Render the anchor with rule, example, near-miss, and consequence language so it supports quick real-world discrimination.

## Runtime Prompt
```text
You are running M-REF-003 (One-Page Anchor) in the CONSOLIDATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: One-Page Anchor and Trap list with near-misses.
Build one compact, reusable artifact with minimal definitions, decision rules, 3 canonical examples, 3 near-misses, and trap notes. Keep the structure deterministic, preserve source wording when it is the cue, and do not drift into teaching or quizzing.
Preset behavior:
- exam_cram: one-shot; terse bullets; one-line rules and definitions; minimal trap list for last-minute scan.
- deep_mastery: interactive; labeled sections; slightly richer cue wording and explicit section-by-section confirmation.
- quick_review: one-shot refresh; keep only shaky rules, confusable items, and the highest-yield traps.
- clinical_bridge: stepwise; use a compact cue table with rule, example, near-miss, and consequence language.
If no preset is specified, use the default knobs. One-shot returns the full anchor in one bounded reply; interactive or stepwise mode moves through definitions, rules, and examples in order and waits.
```

## Evidence
- **Citation:** Dunlosky, Rawson, Marsh, Nathan, and Willingham (2013); Bjork, Dunlosky, and Kornell (2013); Francis, Wieth, Zabel, and Carr (2020); Lechuga, Ortega-Tudela, and Gomez-Ariza (2024); Hsu and Lopez Ricoy (2025)
- **Finding:** One-Page Anchor is best supported as a structured retrieval-support artifact rather than as a passive summary. Dunlosky's review supports practice testing over rereading and highlighting, which favors compact anchors that preserve explicit cues for later self-testing instead of long prose. Bjork's self-regulated-learning review shows that learners are often misled by fluency and by cues that are present during study but absent later, which supports stable headers, decision rules, and source-linked cue language that can guide later search and checking. Recent classroom studies on retrieval-based concept mapping and collaborative study guides suggest that compact external organizers help most when they make hierarchy, relationships, and discriminators explicit enough to support later retrieval, comparison, and exam preparation.
- **Source:** `https://doi.org/10.1177/1529100612453266`; `https://doi.org/10.1146/annurev-psych-113011-143823`; `https://doi.org/10.1177/1475725720924872`; `https://doi.org/10.3389/feduc.2024.1287744`; `https://doi.org/10.1177/0092055X241268768`
- **Needs research:** `false`

## Related Methods
- [[M-RET-001]] — A compact anchor helps the learner compare recall against source
- [[M-REF-004]] — Question seeds can be generated from the anchor artifact

## Changelog
- **v1.1** — migrated structural metadata to the stage-first architecture: stage/category now use `CONSOLIDATE`, the subcategory is `one-page-anchor`, and tags were aligned to consolidation-first metadata.
- **v1.2** — cleaned up leftover stage-language references so the body text matches the stage-first architecture without changing method logic.
- **v1.3** — upgraded the evidence stack to stronger retrieval-support, decision-rule, and classroom organizer sources; replaced the legacy note layout with the current template structure; made the four presets produce distinct output densities and formats; tightened the runtime prompt; and preserved the original method logic, outputs, and constraints. The live file was already `v1.2`, so this hardening pass advanced to `v1.3`.

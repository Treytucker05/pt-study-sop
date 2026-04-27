---
id: M-PRE-005
name: Skeleton Concept Hierarchy
stage: PRIME
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-PRE, prime]
---

# M-PRE-005 — Skeleton Concept Hierarchy

## Summary
Generate a bare concept hierarchy (topic core -> 4-6 umbrella categories -> short descriptors) that still covers the full selected scope without deep explanations. The method stays skeletal, structural, and non-assessive instead of turning into paragraph notes or a mini-lecture.

**Not for:** first-contact teaching, scored assessment, or full solution reveal. Use a TEACH or REFERENCE method when the goal is explanation rather than orientation.

## Core Steps
1. **Set Central Node as Topic** — establish one core topic node
2. **Inventory the Full Scope, Then Derive 4-6 First-Ring Categories** — compress the selected slice into umbrella groups
3. **Attach 1-2 Descriptor Tokens Under Each Category** — keep the hierarchy skeletal
4. **Add Cross-Links Between Categories Where Needed** — preserve the most important lateral relationships

## Inputs
- Source material loaded in chat
- Target topic or objective scope
- Prior notes, North Star, or prior-session context (optional)

## Required Outputs
- `SkeletonMap`
- `CategoryLabels`
- `CrossLinks`

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
- `exam_cram` — one-shot, fastest skeleton pass. Return one topic core, 4 terse categories, 1 descriptor token per category, and only the most necessary cross-link bullets.
- `deep_mastery` — interactive, full skeleton pass. Keep separate sections for topic core, first-ring categories, descriptor tokens, cross-links, and carry-forward notes.
- `quick_review` — one-shot refresh pass. Render a compact table with `category | descriptor tokens | cross-links` columns before the final tree view.
- `clinical_bridge` — stepwise applied orientation pass. Use a clinic-facing table with `category | cue descriptor | related category | practical meaning` columns before the final hierarchy.

## Runtime Prompt
```text
You are running M-PRE-005 (Skeleton Concept Hierarchy) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: SkeletonMap, CategoryLabels, and CrossLinks.
Build a bare hierarchy by setting one topic core, inventorying the full selected scope, compressing it into 4-6 first-ring categories, attaching 1-2 descriptor tokens under each category, and adding short cross-links where needed. Keep it orientation-only, non-assessive, and descriptor-first; do not turn the hierarchy into paragraph notes or a mini-lecture.
Preset behavior:
- exam_cram: one-shot; topic core, 4 terse categories, 1 descriptor each, and minimal cross-links.
- deep_mastery: interactive; labeled sections for topic core, categories, descriptors, cross-links, and carry-forward notes.
- quick_review: one-shot refresh; compact category / descriptors / cross-links table plus final tree view.
- clinical_bridge: stepwise; clinic-facing category / cue descriptor / related category / practical meaning table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves topic core -> categories -> descriptor tokens -> cross-links and waits.
```

## Evidence
- **Citation:** Novak and Gowin (1984); Hebert, Bohaty, Nelson, and Brown (2016); Bogaerds-Hazenberg, Evers-Vermeul, and van den Bergh (2020); Izci and Acikgoz Akkoc (2024); Hsu and Lopez Ricoy (2025)
- **Finding:** Skeleton Concept Hierarchy is best supported as a minimal concept-mapping and structure-framing move that helps learners organize a dense topic into a few visible categories before explanation starts. Novak and Gowin's concept mapping work frames the value of explicit schematic structures for focusing attention on the small number of key ideas that matter. Text-structure meta-analytic work and later classroom studies reinforce that visible structure and stripped-down organizational cues can improve comprehension, summarization, and later integration when learners are not overloaded with full prose explanations. The practical implication for this method is to keep the hierarchy skeletal: one core topic node, 4-6 umbrella categories, 1-2 descriptor tokens under each category, and only short cross-links where the structure would otherwise become misleading.
- **Source:** `https://doi.org/10.1017/CBO9781139173469.004`; `https://doi.org/10.1037/edu0000082`; `https://doi.org/10.1002/rrq.311`; `https://doi.org/10.1016/j.heliyon.2023.e23290`; `https://doi.org/10.1177/0092055X241268768`
- **Needs research:** `false`

## Related Methods
- [[M-PRE-008]] — Use when the learner needs a more compact extraction-first structure pass
- [[M-PRE-006]] — Use when the source should be skimmed for headings and structural cues before mapping

## Changelog
- **v1.1** — migrated the method to the stage-first production metadata and cleaned up the legacy prompt surface while preserving the original four-step hierarchy flow.
- **v1.2** — upgraded the evidence stack to stronger concept-mapping, text-structure, and recent classroom-implementation sources; rebuilt the note into the current template; made the four presets produce clearly distinct hierarchy artifacts; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.

### Summary of Changes
- Reframed the method as a minimal concept-hierarchy scaffold rather than a generic concept map or paragraph-outline task.
- Upgraded the evidence stack from a thin Novak stub to a stronger mix of concept-mapping, text-structure, and recent classroom studies.
- Rebuilt the preset behavior so each mode now produces a distinct hierarchy artifact:
  - `exam_cram` uses terse bullets.
  - `deep_mastery` uses grouped labeled sections.
  - `quick_review` uses a compact table plus tree view.
  - `clinical_bridge` uses a clinic-facing structure table.
- Tightened the facilitation prompt so it is shorter, clearly descriptor-first, and explicit about one-shot versus interactive delivery.
- Preserved the original core flow: set the topic core, derive 4-6 categories, attach 1-2 descriptor tokens, and add cross-links where needed.

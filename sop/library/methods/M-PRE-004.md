---
id: M-PRE-004
name: Hierarchical Advance Organizer
stage: PRIME
status: validated
version: '1.3'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-PRE, prime]
---

# M-PRE-004 — Hierarchical Advance Organizer

## Summary
Present a high-abstraction top-down framework as an ASCII concept map plus Obsidian-friendly hierarchy that covers the selected scope before detail study. The method stays structural, coverage-first, and non-assessive instead of turning into a lecture, quiz, or detail dump.

**Not for:** first-contact teaching, scored assessment, or full solution reveal. Use a TEACH or REFERENCE method when the goal is explanation rather than orientation.

## Core Steps
1. **Identify the Most Inclusive Parent Concept** — name the top-level idea in one sentence
2. **Cluster the Supported Structure Into 3-5 Pillar Concepts** — compress the selected scope into umbrella groups
3. **Add One Representative Sub-Branch Per Pillar** — make each pillar concrete without going into leaf trivia
4. **Render the Organizer** — output both the ASCII concept map and the Obsidian-friendly hierarchy

## Inputs
- Source material loaded in chat
- Target topic or objective scope
- Prior notes, North Star, or prior-session context (optional)

## Required Outputs
- `AsciiConceptMap`
- `ObsidianHierarchy`

## Knob Schema
```yaml
knobs:
  guidance_level: medium
  delivery_mode: one_shot
  fade_intensity: minimal
  output_format: text
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
  visual_map:
    guidance_level: medium
    delivery_mode: one_shot
    fade_intensity: minimal
    output_format: map
    output_layout: labeled_sections
    explanation_density: focused
```

## Preset Behavior
- `exam_cram` — one-shot, fastest organizer pass. Give one parent concept, 3 terse pillars, one short branch per pillar, and a one-line carry-forward gap note.
- `deep_mastery` — interactive, full organizer pass. Keep separate sections for parent concept, pillars, representative branches, ASCII concept map, Obsidian hierarchy, and carry-forward gaps.
- `quick_review` — one-shot refresh pass. Render the organizer as a compact table with `level | node | structural role | carry-forward` columns before the final tree view.
- `clinical_bridge` — stepwise applied orientation pass. Use a clinic-facing organizer table with `umbrella pillar | representative branch | why it matters clinically | missing node` columns before the final hierarchy.
- `visual_map` — one-shot, map-first organizer pass. Keep the same parent-to-pillar-to-branch logic but force the final artifact into a clean hierarchical map using indentation, labeled sections, or simple ASCII structure.

## Runtime Prompt
```text
You are running M-PRE-004 (Hierarchical Advance Organizer) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: AsciiConceptMap, ObsidianHierarchy, and CarryForwardGaps.
Build a top-down organizer by naming the most inclusive parent concept, compressing the selected scope into 3-5 pillars, adding one representative branch per pillar, and rendering the result as both an ASCII concept map and an Obsidian-friendly hierarchy. Keep it orientation-only, non-assessive, and coverage-first; do not turn it into a lecture, quiz, or detail dump.
Output mode:
- If output_format is text, keep the current text-first artifact shape.
- If output_format is map, render a clean hierarchical map using indentation, labeled sections, or simple ASCII structure.
Preset behavior:
- exam_cram: one-shot; parent concept, 3 terse pillars, one branch each, and a one-line gap note.
- deep_mastery: interactive; labeled sections for parent concept, pillars, branches, final maps, and carry-forward gaps.
- quick_review: one-shot refresh; compact level / node / role / carry-forward table plus final tree view.
- clinical_bridge: stepwise; clinic-facing organizer table with pillar, branch, why-it-matters, and missing-node columns.
- visual_map: one-shot; same organizer logic, but force a clean hierarchical map output.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves parent concept -> pillars -> representative branches -> final maps and waits.
```

## Evidence
- **Citation:** Ausubel (1960); Luiten, Ames, and Ackerson (1980); Hebert, Bohaty, Nelson, and Brown (2016); Bogaerds-Hazenberg, Evers-Vermeul, and van den Bergh (2020); Bogaerds-Hazenberg, Evers-Vermeul, and van den Bergh (2024)
- **Finding:** Hierarchical Advance Organizer is best supported as a structure-first orientation method that gives learners a small, high-level frame before detail work, not as a full explanation or quiz. Ausubel's original organizer study and the later meta-analysis by Luiten and colleagues support the basic value of advance organizers for learning and retention. Later text-structure meta-analytic work and classroom interventions extend that logic by showing that explicit attention to structure, main ideas, and organizing relations can improve comprehension, summarization, and writing when the structure is made visible and practiced. The practical implication for this method is to keep the organizer compact, coverage-first, and hierarchical: one parent concept, 3-5 umbrella pillars, one representative branch per pillar, and a short carry-forward gap list rather than a detail-heavy outline.
- **Source:** `https://doi.org/10.1037/h0046669`; `https://doi.org/10.3102/00028312017002211`; `https://doi.org/10.1037/edu0000082`; `https://doi.org/10.1002/rrq.311`; `https://doi.org/10.1080/1046560X.2024.2373548`
- **Needs research:** `false`

## Related Methods
- [[M-PRE-008]] — Use when the learner needs a more compact structure-first pass
- [[M-PRE-005]] — Follow when the topic should be unpacked into a fuller nested hierarchy

## Changelog
- **v1.1** — migrated the method to the stage-first production metadata and cleaned up the legacy prompt surface while preserving the original four-step organizer flow.
- **v1.2** — upgraded the evidence stack to stronger advance-organizer, text-structure, and recent classroom-implementation sources; rebuilt the note into the current template; made the four presets produce clearly distinct organizer artifacts; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.
- **v1.3** — added the `output_format` knob with `text` and `map` modes, introduced the `visual_map` preset, and updated the runtime prompt so the method can emit a clean hierarchical map without changing default text-mode behavior.

### Summary of Changes
- Reframed the method as a coverage-first structural organizer rather than a generic outline or a soft teaching pass.
- Upgraded the evidence stack from a thin legacy stub to a stronger mix of advance-organizer, text-structure, and recent classroom-implementation studies.
- Rebuilt the preset behavior so each mode now produces a distinct organizer artifact:
  - `exam_cram` uses terse bullets.
  - `deep_mastery` uses grouped labeled sections.
  - `quick_review` uses a compact structure table plus tree view.
  - `clinical_bridge` uses a clinic-facing organizer table.
- Tightened the facilitation prompt so it is shorter, explicitly coverage-first, and clear about when to return the full artifact in one shot.
- Added `output_format` support so the same method can now emit either the current text-first artifact or a cleaner hierarchical map artifact.
- Added the `visual_map` preset to force map-style output without changing the underlying organizer logic.
- Preserved the original core flow: identify the parent concept, compress into 3-5 pillars, add one representative branch per pillar, and render the final organizer.

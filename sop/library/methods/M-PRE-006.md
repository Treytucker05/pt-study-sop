---
id: M-PRE-006
name: Structural Skimming + Pillar Mapping
stage: PRIME
status: validated
version: '1.3'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-PRE, prime]
---

# M-PRE-006 — Structural Skimming + Pillar Mapping

## Summary
Rapidly skim headings and visual cues across the selected scope, then compress the structure into an ASCII concept map plus Obsidian-friendly hierarchy before deep reading. The method stays structural, cue-first, and non-assessive instead of turning into paragraph summarization.

**Not for:** first-contact teaching, scored assessment, or full solution reveal. Use a TEACH or REFERENCE method when the goal is explanation rather than orientation.

## Core Steps
1. **Scan Structural Cues Only** — skim headings, subheadings, bold terms, and diagrams
2. **Inventory the Major Supported Sections and Structural Signals** — account for the full selected slice before grouping
3. **Compress the Inventory Into 3-5 Top Pillars** — build umbrella buckets that cover the scope
4. **Render the Final Structure** — output both the ASCII concept map and the Obsidian-friendly hierarchy

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
- `exam_cram` — one-shot, fastest skim pass. Return 3 terse pillars from headings and visual cues plus a compact final map.
- `deep_mastery` — interactive, full skim-to-map pass. Keep separate sections for structural cues, inventory, pillars, final ASCII map, and Obsidian hierarchy.
- `quick_review` — one-shot refresh pass. Render a compact table with `structural cue | extracted section | final pillar | note` columns before the final hierarchy.
- `clinical_bridge` — stepwise applied skim pass. Use a clinic-facing table with `cue | pillar | why it matters clinically | follow-up note` columns before the final map.
- `visual_map` — one-shot, map-first pass. Keep the same skim and compression logic but force the final artifact into a clean hierarchical pillar map using labeled sections, indentation, or simple ASCII structure.

## Runtime Prompt
```text
You are running M-PRE-006 (Structural Skimming + Pillar Mapping) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: AsciiConceptMap and ObsidianHierarchy.
Skim headings and visual cues across the selected scope, inventory the major supported sections, compress the inventory into 3-5 umbrella pillars, and render the result as both an ASCII concept map and an Obsidian-friendly hierarchy. Keep it orientation-only, non-assessive, and structural; do not turn the skim into a paragraph summary or a topic explanation.
Output mode:
- If output_format is text, keep the current text-first artifact shape.
- If output_format is map, render a clean hierarchical pillar map using labeled sections, indentation, or simple ASCII structure.
Preset behavior:
- exam_cram: one-shot; 3 terse pillars from headings and visual cues plus a compact final map.
- deep_mastery: interactive; labeled sections for structural cues, inventory, pillars, final map, and final hierarchy.
- quick_review: one-shot refresh; compact cue / section / pillar / note table plus final hierarchy.
- clinical_bridge: stepwise; clinic-facing cue / pillar / why-it-matters / follow-up-note table.
- visual_map: one-shot; same skim and compression flow, but force a clean hierarchical map output.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves skim cues -> inventory -> pillars -> final maps and waits.
```

## Evidence
- **Citation:** Ausubel (1960); Luiten, Ames, and Ackerson (1980); Voros, Rouet, and Pleh (2011); Bogaerds-Hazenberg, Evers-Vermeul, and van den Bergh (2020); Bogaerds-Hazenberg, Evers-Vermeul, and van den Bergh (2024)
- **Finding:** Structural Skimming + Pillar Mapping is best supported as a quick orientation move that exposes the visible structure of a source before deep reading, not as a paragraph-summary method. Classic advance-organizer work supports the value of pre-exposure to high-level structure, while later studies on content organizers and text-structure instruction show that learners navigate and comprehend dense material more effectively when headings, structural cues, and overarching buckets are made explicit. The practical implication for this method is to skim only structural signals, inventory the whole slice, compress that inventory into 3-5 broad pillars, and render the result as a structural map rather than a prose recap.
- **Source:** `https://doi.org/10.1037/h0046669`; `https://doi.org/10.3102/00028312017002211`; `https://doi.org/10.1016/j.chb.2011.04.005`; `https://doi.org/10.1002/rrq.311`; `https://doi.org/10.1080/1046560X.2024.2373548`
- **Needs research:** `false`

## Related Methods
- [[M-PRE-008]] — Use when the learner needs a more compact extraction pass without the skimming step
- [[M-PRE-004]] — Use when the source is already understood well enough to jump straight to a top-down organizer

## Changelog
- **v1.1** — migrated the method to the stage-first production metadata and cleaned up the legacy prompt surface while preserving the original four-step skim-and-map flow.
- **v1.2** — upgraded the evidence stack to stronger advance-organizer, navigation, text-structure, and recent classroom-implementation sources; rebuilt the note into the current template; made the four presets produce clearly distinct skim artifacts; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.
- **v1.3** — added the `output_format` knob with `text` and `map` modes, introduced the `visual_map` preset, and updated the runtime prompt so the method can emit a clean hierarchical pillar map without changing default text-mode behavior.

### Summary of Changes
- Reframed the method as a cue-first skim-and-compress pass rather than a lightweight summarization task.
- Upgraded the evidence stack from a thin Ausubel stub to a stronger mix of advance-organizer, navigation-organizer, text-structure, and recent classroom studies.
- Rebuilt the preset behavior so each mode now produces a distinct skim artifact:
  - `exam_cram` uses terse bullets.
  - `deep_mastery` uses grouped labeled sections.
  - `quick_review` uses a compact cue-to-pillar table.
  - `clinical_bridge` uses a clinic-facing cue table.
- Tightened the facilitation prompt so it is shorter, clearly structural, and explicit about not drifting into paragraph summaries.
- Added `output_format` support so the same method can now emit either the current text-first artifact or a cleaner hierarchical map artifact.
- Added the `visual_map` preset to force map-style output without changing the underlying skim, inventory, and pillar-compression flow.
- Preserved the original core flow: skim structural cues, inventory sections, compress into 3-5 pillars, and render the final map and hierarchy.

---
id: M-GEN-003
name: Draw-Label
stage: ENCODE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-GEN, encode]
---

# M-GEN-003 — Draw-Label

## Summary
Have the learner sketch a bounded structure from memory, label it, inspect the gaps against the source, and redraw if too much was missing. The method stays memory-first, turns omissions into visible repair targets, and avoids drifting into passive copying.

**Not for:** isolated trivia, free-form brainstorming, or content that has no meaningful structure to map.

## Core Steps
1. **Close or Cover Source Material** — hide the source before the first sketch
2. **Sketch the Basic Structure Outline** — lay out the main parts from memory
3. **Label as Many Parts as You Can Recall** — fill in labels and leave uncertain spots blank
4. **Check Source Material for Gaps** — compare the sketch against the source and log misses
5. **Fill in Missing Labels with a Different Color** — repair visibly
6. **Redraw from Memory if More Than 30 Percent Were Missing** — repeat only when the gap rate is still too high

## Inputs
- Structure to draw (anatomy, pathway, diagram)
- Blank paper or drawing surface
- Source material for gap-filling

## Required Outputs
- `Completed labeled diagram`
- `Gap list (what was missing)`
- `Accuracy percentage`

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
- `exam_cram` — one-shot, fastest sketch pass. Produce one rough labeled outline, a short miss list, and a single redraw call only if the gap rate is clearly above threshold.
- `deep_mastery` — interactive, full reconstruction pass. Keep separate sections for first-pass sketch plan, recalled labels, gap log, repaired labels, and redraw decision.
- `quick_review` — one-shot refresh pass. Render the output as a compact table with `region/node | recalled label | missing piece | repair mark | status` columns.
- `clinical_bridge` — stepwise applied anatomy or pathway pass. Use a clinical structure grid with `location/step | label | function/significance | missing point | repair note` so the drawing doubles as a practical orientation tool.

## Runtime Prompt
```text
You are running M-GEN-003 (Draw-Label) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Completed labeled diagram, Gap list, and Accuracy percentage.
Have the learner sketch one bounded structure from memory, label as many parts as possible, compare against the source only after the attempt, and visibly mark every repaired label or link. If more than 30 percent of the needed labels were missing, run one redraw of the same structure. Do not draw for the learner and do not let the first pass turn into copying.
Preset behavior:
- exam_cram: one-shot; rough labeled outline; short miss list; redraw only if clearly needed.
- deep_mastery: interactive; separate sketch, label, gap, repair, and redraw sections.
- quick_review: one-shot refresh; compact label-gap-status table.
- clinical_bridge: stepwise; applied anatomy or pathway grid with function or significance notes.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves cover source -> sketch -> label -> gap check -> repair -> redraw decision and waits.
```

## Evidence
- **Citation:** Van Meter and Garner (2005); Wammes, Meade, and Fernandes (2016); Wammes, Meade, and Fernandes (2018); Wang, Yang, and Kyle Jr. (2023); Xie and Deng (2023); Dechamps, Leopold, and Leutner (2025)
- **Finding:** Draw-Label is best supported as a learner-generated drawing method that improves learning when students must reconstruct and label a structure themselves, then inspect the drawing for missing or inaccurate elements. The classic learner-generated-drawing review and the drawing-effect experiments support drawing as more than decoration: it can strengthen memory by forcing selection, organization, elaboration, and multimodal encoding. Recent classroom studies show that drawing can improve delayed learning and motivation relative to simple rereading, but also show an important boundary condition: drawing does not help automatically unless it is tied to meaningful reconstruction or retrieval rather than shallow copying. The latest drawing-to-learn meta-analytic work sharpens the practical implication for this method: use memory-first sketching, make omissions visible, and support the learner in integrating the repaired labels back into a coherent structure instead of treating drawing as an art task.
- **Source:** `https://doi.org/10.1007/s10648-005-8136-3`; `https://doi.org/10.1080/17470218.2015.1094494`; `https://doi.org/10.1037/xlm0000445`; `https://doi.org/10.1186/s43031-023-00083-4`; `https://doi.org/10.1016/j.actpsy.2023.104039`; `https://doi.org/10.1007/s10648-025-10067-7`
- **Needs research:** `false`

## Related Methods
- [[M-ORG-001]] — Concept-map fallback for visual organization when free sketching is too open-ended
- [[M-GEN-004]] — Alternative map-building method when the learner needs a more guided organizer
- [[M-ORG-002]] — Comparison-table fallback when contrast matters more than spatial layout

## Changelog
- **v1.1** — migrated the method to the stage-first production metadata and cleaned up the legacy prompt surface while preserving the original memory-first draw -> label -> gap-check -> redraw flow.
- **v1.2** — upgraded the evidence stack to stronger learner-generated-drawing, drawing-effect, and classroom drawing-to-learn sources; rebuilt the note into the current template; made the four presets produce clearly distinct diagram formats and densities; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.

### Summary of Changes
- Reframed the method as a memory-first diagram reconstruction workflow instead of a generic “draw and label” prompt.
- Upgraded the evidence stack from a single drawing-effect citation to a broader set of learner-generated-drawing, recollection, classroom, and meta-analytic drawing-to-learn sources.
- Rebuilt the preset behavior so each mode now produces a distinct diagram artifact:
  - `exam_cram` uses a rough outline plus a short miss list.
  - `deep_mastery` uses separate reconstruction, gap, and redraw sections.
  - `quick_review` uses a compact label-gap-status table.
  - `clinical_bridge` uses an applied location/function/gap grid.
- Tightened the facilitation prompt so it is shorter, explicit about memory-first sketching, and strict about visible gap marking before any redraw.
- Preserved the original core flow: cover the source, sketch the structure, label from memory, inspect gaps, repair visibly, and redraw if the gap rate is still too high.

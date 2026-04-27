---
id: M-OVR-003
name: Drill Sheet Builder
stage: OVERLEARN
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-OVR, overlearn]
---

# M-OVR-003 — Drill Sheet Builder

## Summary
Build a reusable interleaved drill sheet that packages mixed timed practice and cross-session pass criteria for later sessions. The method stays on already-encoded material, emphasizes scheduling and objective coverage, and ends with a drill artifact rather than live drilling.

**Not for:** initial teaching, discovery, or broad remediation. Use `EXPLAIN` or `CONSOLIDATE` first if understanding is not already present.

## Core Steps
1. **Assemble Interleaved Timed Items** — build a 30-60 item mixed drill sheet from weak objectives and prior misses
2. **Define Validation Criteria** — specify what counts as passing the same objective across two sessions
3. **Store Drill Artifacts** — save the drill sheet and validation checklist with objective IDs intact

## Inputs
- Question Bank Seed
- ErrorLog trends

## Required Outputs
- `DrillSheet (30-60 interleaved items, objective-tagged)`
- `CrossSessionValidation checklist (two-session pass criteria)`

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
- `exam_cram` — one-shot, fastest drill build. Produce a 30-item sprint sheet with terse objective tags, short timing cues, and a minimal two-session validation checklist.
- `deep_mastery` — interactive, fullest drill build. Produce a 60-item sheet with explicit item clustering across objectives, round structure, richer timing guidance, and a fuller validation contract.
- `quick_review` — one-shot refresh build. Produce a compact 30-36 item table organized by item number, objective ID, and problem type, plus a short validation table.
- `clinical_bridge` — stepwise applied drill build. Produce a 30-45 item sheet that mixes discriminators, cue-to-action items, and mechanism checks, with validation framed as safe repeatable performance across sessions.

## Runtime Prompt
```text
You are running M-OVR-003 (Drill Sheet Builder) in the OVERLEARN stage.
Use only the loaded source and learner context. Ask only for missing required inputs.
Produce: DrillSheet and CrossSessionValidation checklist.
Build a 30-60 item interleaved timed drill sheet from already-encoded objectives. Mix weak objectives with prior misses, attach objective IDs to every item, and define what counts as passing the same objective across two sessions. Do not teach new content while building the sheet.
Preset behavior:
- exam_cram: one-shot; 30-item sprint sheet; terse bullets; minimal validation checklist.
- deep_mastery: interactive; 60-item full sheet; labeled sections; explicit rounds and richer validation contract.
- quick_review: one-shot refresh; 30-36 item compact drill table plus short validation table.
- clinical_bridge: stepwise; 30-45 item applied drill matrix mixing discriminators, cue-to-action items, and mechanism checks.
If no preset is specified, use the default knobs. One-shot returns the full drill artifact in one bounded reply; interactive or stepwise mode moves build -> validation -> handoff and waits.
```

## Evidence
- **Citation:** Cepeda, Pashler, Vul, Wixted, and Rohrer (2006); Rohrer and Pashler (2007); Agarwal, Nunes, and Blunt (2021); Rohrer, Dedrick, Hartwig, and Cheung (2020); Lyle, Bego, Ralston, and Immekus (2022); Bego, Lyle, Ralston, Immekus, Chastain, Haynes, Hoyt, Pigg, Rabin, Scobee, and Starr (2024); Braithwaite and Hall (2024)
- **Finding:** Drill Sheet Builder is best supported as a scheduled mixed-practice artifact that combines interleaving, spaced retrieval, and simple cross-session validation rather than as a one-shot cram sheet. Foundational spacing work by Cepeda and colleagues and applied guidance from Rohrer and Pashler support distributing practice over time. Applied classroom evidence supports retrieval practice in school settings and suggests that interleaved mathematics practice can improve delayed test performance when problem types are mixed and feedback is available. Recent classroom studies in calculus and STEM courses suggest that spacing retrieval across quizzes or sessions often improves later retention even when it feels harder during practice, which fits the idea of a drill sheet that is built for later sessions rather than immediate ease. At the same time, recent work on fraction arithmetic suggests that interleaving is not automatically additive in every instructional context, so the drill sheet should be treated as a targeted mixed-practice tool, not a universal replacement for all blocked practice. The practical implication for this method is to build a sufficiently large interleaved sheet, weight it toward weak objectives and recent misses, attach objective IDs, and define pass criteria that require stable performance across sessions instead of a single good run.
- **Source:** `https://doi.org/10.1037/0033-2909.132.3.354`; `https://doi.org/10.1111/j.1467-8721.2007.00500.x`; `https://doi.org/10.1007/s10648-021-09595-9`; `https://doi.org/10.1037/edu0000367`; `https://doi.org/10.1007/s10648-022-09677-2`; `https://doi.org/10.1186/s40594-024-00468-5`; `https://doi.org/10.1016/j.learninstruc.2023.101854`
- **Needs research:** `false`

## Related Methods
- [[M-RET-004]] — Interleaved retrieval practice is the downstream use of a drill sheet
- [[M-REF-004]] — Question seeds can populate the drill sheet

## Changelog
- **v1.1** — migrated structural metadata to the stage-first architecture: stage/category now use `OVERLEARN`, the subcategory is `drill-sheet-builder`, and tags were aligned to overlearning-first metadata.
- **v1.2** — upgraded the evidence stack to stronger spacing, mixed-practice, and retrieval-scheduling sources; replaced the legacy note layout with the current template; added the standard knob schema plus four distinct presets; tightened the runtime prompt; and preserved the original method logic, steps, outputs, and constraints.

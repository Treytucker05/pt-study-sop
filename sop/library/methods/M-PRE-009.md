---
id: M-PRE-009
name: Syntopical Big-Picture Synthesis
stage: PRIME
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-PRE, prime]
---

# M-PRE-009 — Syntopical Big-Picture Synthesis

## Summary
Synthesize top-level structure across 2-3 sources into one module-level hierarchy with cross-links. The method stays high-level, source-grounded, and non-assessive so the learner gets one usable map instead of three isolated outlines.

**Not for:** first-contact teaching, scored assessment, or full solution reveal. Use a TEACH or REFERENCE method when the goal is explanation rather than orientation.

## Core Steps
1. **Extract Top-Level Pillars From Each Source** — keep only headings and conceptual anchors
2. **Merge Overlapping Pillars Into One Unified Structure** — preserve source-specific distinctions where needed
3. **Add Cross-Links and Conflict Notes** — keep overlaps and unresolved contradictions visible

## Inputs
- Source material loaded in chat
- Target topic or objective scope
- Prior notes, North Star, or prior-session context (optional)

## Required Outputs
- `UnifiedTopDownTree`
- `CrossSourceLinks`
- `ConflictFlags`

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
- `exam_cram` — one-shot, fastest synthesis pass. Return one terse unified tree, 2-3 cross-source links, and only the highest-yield conflict flags.
- `deep_mastery` — interactive, full synthesis pass. Keep separate sections for source pillars, unified tree, cross-source links, conflict flags, and follow-up targets.
- `quick_review` — one-shot refresh pass. Render a compact table with `source | shared pillar | cross-link | conflict status` columns before the final hierarchy.
- `clinical_bridge` — stepwise applied synthesis pass. Use a clinic-facing table with `source | unified pillar | practical overlap | conflict risk` columns before the final tree.

## Runtime Prompt
```text
You are running M-PRE-009 (Syntopical Big-Picture Synthesis) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: UnifiedTopDownTree, CrossSourceLinks, ConflictFlags, and FollowUpTargets.
Extract top-level pillars from 2-3 sources, merge overlaps into one unified hierarchy, add cross-source links, and flag unresolved conflicts for later study. Keep it orientation-only, non-assessive, and top-level; do not drift into paragraph summaries or source-by-source explanation.
Preset behavior:
- exam_cram: one-shot; terse unified tree, 2-3 cross-source links, and only the highest-yield conflict flags.
- deep_mastery: interactive; labeled sections for source pillars, unified tree, links, conflicts, and follow-up targets.
- quick_review: one-shot refresh; compact source / shared-pillar / link / conflict table plus final tree.
- clinical_bridge: stepwise; clinic-facing source / unified-pillar / practical-overlap / conflict-risk table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves source pillars -> unified tree -> links and conflicts and waits.
```

## Evidence
- **Citation:** Alexander and List (2017); Yukhymenko-Lescroart, Goldman, Lawless, Pellegrino, and Shanahan (2022); Espinas and Wanzek (2024); Schallert, List, and Alexander (2025)
- **Finding:** Syntopical Big-Picture Synthesis is best supported as a multiple-text orientation move that helps learners build a top-level integrated structure across a small number of sources before they dive into details. Research on multiple-text comprehension emphasizes that integration across documents depends on identifying shared ideas, preserving source-specific differences, and making intertextual links explicit rather than simply summarizing each source in isolation. The practical implication for this method is to keep the synthesis bounded to 2-3 sources, extract pillars only, merge overlaps into one unified tree, and flag unresolved conflicts for later study instead of forcing premature resolution.
- **Source:** `https://doi.org/10.1080/00461520.2017.1328309`; `https://doi.org/10.1080/01443410.2020.1811840`; `https://doi.org/10.1177/09388982241275650`; `https://doi.org/10.1080/00461520.2025.2592823`
- **Needs research:** `false`

## Related Methods
- [[M-PRE-010]] — Use to set the objective frame before synthesizing multiple sources
- [[M-PRE-008]] — Use when a single source needs a compact structural spine instead of cross-source merging

## Changelog
- **v1.1** — migrated the method to the stage-first production metadata and cleaned up the legacy prompt surface while preserving the original three-step synthesis flow.
- **v1.2** — upgraded the evidence stack to stronger multiple-text-comprehension and recent integration sources; rebuilt the note into the current template; made the four presets produce clearly distinct synthesis artifacts; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.

### Summary of Changes
- Reframed the method as a multiple-source orientation pass rather than a generic synthesis summary.
- Upgraded the evidence stack from a thin organizer stub to a stronger mix of multiple-text-comprehension and recent integration studies.
- Rebuilt the preset behavior so each mode now produces a distinct synthesis artifact:
  - `exam_cram` uses terse bullets.
  - `deep_mastery` uses grouped labeled sections.
  - `quick_review` uses a compact cross-source table.
  - `clinical_bridge` uses a clinic-facing integration table.
- Tightened the facilitation prompt so it is shorter, explicit about the 2-3 source cap, and clear about preserving unresolved conflicts instead of teaching through them.
- Preserved the original core flow: extract pillars from each source, merge overlaps, and add cross-links plus conflict notes.

---
id: M-GEN-004
name: Hand-Draw Map
stage: ENCODE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-GEN, encode]
---

# M-GEN-004 — Hand-Draw Map

## Summary
Have the learner compress one structural overview into a fast hand-drawn spatial map using their own words, simple icons, colors, and branch placement, then test whether the layout is still retrievable with eyes closed. The method stays short, overview-level, and spatial instead of turning into copied notes.

**Not for:** isolated trivia, free-form brainstorming, or content that has no meaningful structure to map.

## Core Steps
1. **Review the Structural Overview from the Previous Block** — scan the overview briefly before drawing
2. **Place the Central Concept in the Middle of the Page** — anchor the map in the learner’s own words
3. **Draw 3 to 5 Main Branches Using Different Colors** — cover the whole overview with broad branches
4. **Add Simple Pictures or Icons to Anchor Key Concepts** — add fast visual anchors, not art
5. **Close Eyes and Mentally Walk Through the Map Layout** — test whether placement still cues recall

## Inputs
- Structural overview or H1 map from prior PRIME block
- Blank paper and colored pens or markers
- Timer set to 5 minutes

## Required Outputs
- `Hand-drawn spatial mind map (physical artifact, confirmed by learner)`
- `Spatial recall confidence (can learner see layout with eyes closed?)`
- `Time spent confirmation (within 5-minute cap)`

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
- `exam_cram` — one-shot, fastest map pass. Produce one center label, 3 broad branches, one quick icon per branch, and one short eyes-closed confidence line.
- `deep_mastery` — interactive, full mapping pass. Keep separate sections for center label choice, branch logic, visual anchors, time-cap check, and spatial recall walk-through.
- `quick_review` — one-shot refresh pass. Render the result as a compact table with `branch color | umbrella label | icon cue | recall status` columns.
- `clinical_bridge` — stepwise applied overview pass. Use a clinical orientation grid with `branch | key sign/mechanism | icon cue | placement note` so the map becomes a quick bedside or exam overview anchor.

## Runtime Prompt
```text
You are running M-GEN-004 (Hand-Draw Map) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Hand-drawn spatial mind map, Spatial recall confidence, and Time spent confirmation.
Have the learner turn one structural overview into a brief hand-drawn map with a center label, 3-5 broad branches, own-word labels, simple pictures, and color or placement cues. Keep the block inside 5 minutes, do not allow copied text, and finish with an eyes-closed walk-through of the layout. Do not draw the map for the learner and do not let the task become full note rewriting.
Preset behavior:
- exam_cram: one-shot; center label, 3 branches, one icon each, and one short recall line.
- deep_mastery: interactive; separate sections for branch logic, icons, time-cap check, and spatial recall walk-through.
- quick_review: one-shot refresh; compact branch-color-icon-recall table.
- clinical_bridge: stepwise; applied overview grid with branch, sign/mechanism, icon, and placement note.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves review -> center -> branches -> icons -> recall check and waits.
```

## Evidence
- **Citation:** Van Meter and Garner (2005); Wammes, Meade, and Fernandes (2016); Wang, Yang, and Kyle Jr. (2023); Van der Weel and Van der Meer (2024); Anastasiou, Wirngo, and Bagos (2024); Hsu and López Ricoy (2025)
- **Finding:** Hand-Draw Map is best supported as a fast learner-generated visual-organization method that compresses a broad structure into spatially distinct, self-produced cues. The strongest evidence comes from adjacent literatures rather than from decorative “mind map” claims alone: learner-generated drawing and drawing-effect research show that drawing can improve memory when it forces the learner to select, organize, and elaborate content; concept-mapping reviews and recent meta-analytic work show that student-constructed visual organizers can improve understanding and retention when they preserve structural relationships instead of becoming copied notes; and recent classroom work suggests that the benefit depends on guidance, learner construction, and keeping the representation manageable. The practical implication for this method is to keep the map brief, use own-word umbrella branches plus simple icons, rely on spatial placement as an anchor, and finish with an explicit spatial recall check rather than treating the map as a pretty page of notes.
- **Source:** `https://doi.org/10.1007/s10648-005-8136-3`; `https://doi.org/10.1080/17470218.2015.1094494`; `https://doi.org/10.1186/s43031-023-00083-4`; `https://doi.org/10.3389/fpsyg.2024.1219945`; `https://doi.org/10.1007/s10648-024-09877-y`; `https://doi.org/10.3390/educsci15040473`
- **Needs research:** `false`

## Related Methods
- [[M-GEN-003]] — Draw-label fallback when the learner needs more direct part labeling than broad spatial compression
- [[M-ORG-001]] — Concept-map fallback when relationships need explicit links rather than branch layout
- [[M-HOOK-004]] — Memory-palace fallback when the learner needs stronger placement-based cues

## Changelog
- **v1.1** — migrated the method to the stage-first production metadata and cleaned up the legacy prompt surface while preserving the original overview -> center -> branches -> icons -> eyes-closed recall flow.
- **v1.2** — upgraded the evidence stack to stronger learner-generated-drawing, concept-mapping, and recent classroom visual-organization sources; repaired the required-output mismatch; rebuilt the note into the current template; made the four presets produce clearly distinct map formats and densities; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.

### Summary of Changes
- Reframed the method as a fast spatial-overview encoding pass instead of a generic mind-map prompt.
- Upgraded the evidence stack from a thin drawing-effect claim to a broader set of learner-generated-drawing, concept-mapping, neuroscience-support, and classroom visual-organization sources.
- Fixed the live output mismatch by making `Time spent confirmation` an explicit output instead of leaving it only in the required-output list.
- Rebuilt the preset behavior so each mode now produces a distinct hand-drawn map artifact:
  - `exam_cram` uses a 3-branch sprint map.
  - `deep_mastery` uses separated branch-logic, icon, and recall sections.
  - `quick_review` uses a compact branch-color-icon-recall table.
  - `clinical_bridge` uses an applied overview grid.
- Tightened the facilitation prompt so it is shorter, explicit about the 5-minute cap, and strict about own-word labels plus the eyes-closed recall test.
- Preserved the original core flow: review the overview, place the center, draw 3-5 branches, add simple icons, and test whether the spatial layout is still visible with eyes closed.

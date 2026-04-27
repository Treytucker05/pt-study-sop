---
id: M-GEN-009
name: Palpation Anchor
stage: ENCODE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-GEN, encode]
---

# M-GEN-009 — Palpation Anchor

## Summary
Pair one anatomical structure with a real visible or palpable surface landmark on your own body, lightly locate it, say what you feel, and tie that landmark to one clinical use. The method stays anatomically honest and body-based instead of collapsing into a vague mnemonic or unsafe palpation.

**Not for:** teaching the whole concept from scratch, replacing source truth, inventing a tactile cue where none exists, or turning a body anchor into unsafe palpation practice.

## Core Steps
1. **Name the Deep Structure and Its Clinical Function** — anchor the term in true meaning first
2. **Identify the Surface Landmark Where the Structure Can Be Felt or Located** — pick the reliable external cue
3. **Physically Palpate the Landmark on Your Own Body** — do the touch step with light safe contact
4. **State What You Feel and Name the Structure Underneath** — connect the tactile cue back to anatomy
5. **Create One Clinical Link** — say how the landmark matters with a patient
6. **Record the Anchor** — compress structure, landmark, feel, and use into one line

## Inputs
- Target anatomical structure name
- Surface landmark location (or request to identify one)
- Clinical function or relevance

## Required Outputs
- `StructureName`
- `SurfaceLandmark`
- `PalpationNote (what you felt)`
- `ClinicalLink`
- `AnchorLine (one-line summary)`

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
- `exam_cram` — one-shot, fastest pass. Use one structure only and return terse bullets for structure/function, landmark, feel, one clinical use, and one final anchor line.
- `deep_mastery` — interactive, full protocol pass. Keep separate sections for structure/function, surface landmark, palpation note, clinical link, anchor line, and a brief safety note before closing.
- `quick_review` — one-shot refresh pass. Render the anchor as a compact table with `structure | landmark | feel | clinical use | anchor line` columns.
- `clinical_bridge` — stepwise applied pass. Use a clinic-facing table with `structure | landmark | what to palpate lightly | why it matters with a patient | safety boundary` columns.

## Runtime Prompt
```text
You are running M-GEN-009 (Palpation Anchor) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: StructureName, SurfaceLandmark, PalpationNote, ClinicalLink, and AnchorLine.
Have the learner name one anatomical structure and function, identify one reliable surface landmark, lightly palpate it on their own body, say what they feel, tie it to one clinical use, and compress the result into one reviewable anchor line. Do not fake tactile findings, do not force the method when no safe landmark exists, and do not allow verbal-only completion.
Preset behavior:
- exam_cram: one-shot; terse bullets for one structure, landmark, feel, clinical use, and final anchor line.
- deep_mastery: interactive; labeled sections for structure, landmark, palpation note, clinical link, anchor line, and safety.
- quick_review: one-shot refresh; compact structure-landmark-feel-use-anchor table.
- clinical_bridge: stepwise; clinic-facing table with structure, landmark, palpation cue, patient use, and safety boundary.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves structure/function -> landmark -> palpation -> feel/map -> clinical link -> anchor line and waits.
```

## Evidence
- **Citation:** Lederman and Klatzky (1987); Alibali and Nathan (2012); Rabattu, Debarnot, and Hoyek (2023); Walrod, Boucher, Conroy, McCamey, Hartz, Way, Jonesco, Albrechta, Bockbrader, and Bahner (2019); Koch, Gassner, Gerlach, Festl-Wietek, Hirt, Joos, and Shiozawa (2025); Liu, Zuo, Zhao, and Lu (2025)
- **Finding:** Palpation Anchor is best supported as a constrained surface-landmark method that uses active touch to stabilize anatomical recall and orient the learner toward a clinically usable location cue. Foundational haptic-exploration and embodiment work supports the idea that hand movements and touch are not just outputs but structured ways of taking in information, and newer anatomy and medical-education studies show that movement-based anatomy learning, repeated palpation practice, and integrated landmark-focused examination teaching can improve later identification and performance. At the same time, the classroom and training evidence also points to clear limits: the benefit depends on a real, task-relevant landmark, enough practice to make the cue stable, and safe tactile interaction rather than vague body awareness or unsafe deep pressure. The practical implication for this method is to use it only when a reliable surface landmark exists, require actual light self-palpation, record what was felt, and tie the landmark to one concrete clinical use so the anchor stays anatomically honest.
- **Source:** `https://doi.org/10.1016/0010-0285(87)90008-9`; `https://doi.org/10.1080/10508406.2011.611446`; `https://doi.org/10.1002/ase.2172`; `https://doi.org/10.1002/jum.14894`; `https://doi.org/10.2196/62666`; `https://doi.org/10.3389/fpsyg.2025.1658797`
- **Needs research:** `false`

## Related Methods
- [[M-GEN-008]] — Embodied walkthrough cousin method when the concept needs a short sequence instead of one landmark
- [[M-HOOK-001]] — Hook fallback when no safe palpable cue exists
- [[M-HOOK-004]] — Memory palace fallback when the anchor needs spatial placement rather than touch

## Changelog
- **v1.1** — migrated the method to the stage-first production metadata and cleaned up the legacy prompt surface while preserving the original palpation-first anchor flow.
- **v1.2** — upgraded the evidence stack to stronger haptic-exploration, anatomy-learning, and recent palpation-training sources; rebuilt the note into the current template; made the four presets produce clearly distinct anchor formats and densities; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.

### Summary of Changes
- Reframed the method as a constrained surface-landmark encoding tool rather than a loose body-based mnemonic.
- Upgraded the evidence stack from two generic citations to a broader set of haptic, anatomy-learning, palpation-training, and embodied-learning sources.
- Rebuilt the preset behavior so each mode now produces a distinct palpation artifact:
  - `exam_cram` uses terse bullets.
  - `deep_mastery` uses separated structure, landmark, feel, use, and safety sections.
  - `quick_review` uses a compact anchor table.
  - `clinical_bridge` uses a clinic-facing palpation and safety table.
- Tightened the facilitation prompt so it is shorter, explicit about light self-palpation, and strict about refusing verbal-only completion or fake tactile findings.
- Preserved the original core flow: name the structure, find the surface landmark, palpate it, describe what is felt, tie it to one clinical use, and record one anchor line.

---
id: M-GEN-008
name: Embodied Walkthrough
stage: ENCODE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-GEN, encode]
---

# M-GEN-008 — Embodied Walkthrough

## Summary
Use safe body movement, gesture, or positioning to act out a bounded process, spatial relation, or clinical sequence, then translate that movement back into real terminology or a sketch. The method stays small, safe, and concept-bound instead of collapsing into charades or skill coaching.

**Not for:** passive reading, copying answers, letting the tutor do the cognitive work for the learner, or drifting into full physical skill coaching.

## Core Steps
1. **Define the 2-5 Key Landmarks or Steps** — choose the bounded anchors worth embodying
2. **Assign One Safe Movement or Gesture to Each Landmark** — map each anchor to a simple desk-safe cue
3. **Run the Walkthrough Slowly With Live Narration** — perform the gestures while saying what they mean
4. **Freeze at Transition Points and Name What Changes** — call out the handoff, shift, or relationship
5. **Re-Run From Memory and Translate Back Into Words or a Sketch** — finish with a real map-back artifact

## Inputs
- Target process, spatial relation, or procedure slice
- 2-5 key steps, landmarks, or transitions to embody
- Enough open space for safe small movements or hand gestures

## Required Outputs
- `MovementMap`
- `EmbodiedRunthrough`
- `TransitionNotes`
- `MapBackExplanation`
- `SafetyBoundaryNote`

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
- `exam_cram` — one-shot, fastest pass. Use 2-3 desk-safe gestures only, return terse `step -> gesture -> meaning` bullets, one transition note, and one short map-back.
- `deep_mastery` — interactive, full protocol pass. Keep separate sections for `MovementMap`, `EmbodiedRunthrough`, `TransitionNotes`, `MapBackExplanation`, and `SafetyBoundaryNote` across 4-5 landmarks.
- `quick_review` — one-shot refresh pass. Render a compact table with `step | gesture | meaning | transition` columns plus a brief map-back note.
- `clinical_bridge` — stepwise applied pass. Use a handoff-style table with `landmark | safe gesture | what changes here | cue/risk | map-back` columns so the movement stays clinically relevant instead of theatrical.

## Runtime Prompt
```text
You are running M-GEN-008 (Embodied Walkthrough) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: MovementMap, EmbodiedRunthrough, TransitionNotes, MapBackExplanation, and SafetyBoundaryNote.
Have the learner embody 2-5 key landmarks with safe small gestures, narrate what each gesture means, freeze at transition points to name what changes, and then rerun from memory and translate the motion back into words or a sketch. Keep it low-load and concept-focused; do not let the tutor do the gestures for the learner, do not drift into physical coaching, and do not end with movement alone.
Preset behavior:
- exam_cram: one-shot; 2-3 gestures; terse step -> gesture -> meaning bullets plus one transition note and one short map-back.
- deep_mastery: interactive; labeled sections for movement map, live runthrough, transition notes, map-back, and safety boundaries.
- quick_review: one-shot refresh; compact step-gesture-meaning-transition table plus brief map-back note.
- clinical_bridge: stepwise; applied table with landmark, gesture, what changes, cue or risk, and map-back line.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves landmark selection -> gesture assignment -> narrated walkthrough -> transition freeze -> map-back and waits.
```

## Evidence
- **Citation:** Kontra, Lyons, Fischer, and Beilock (2015); Alibali and Nathan (2012); Schmidt, Benzing, Wallman-Jones, Mavilidi, Lubans, and Paas (2019); Novack and Goldin-Meadow (2024); Kwon, Brush, Kim, and Seo (2025); Gómez Franco, Badilla-Quintana, Walker, Restrepo, and Glenberg (2025)
- **Finding:** Embodied Walkthrough is best supported as a meaning-congruent gesture or movement method that helps learners encode sequences and spatial relations when the motion is explicitly tied to the concept and translated back into language or diagrams. The classic embodied-science and gesture literature supports the idea that physical experience and representational gesture can deepen understanding of abstract material, but both review work and newer classroom studies point to an important boundary condition: movement helps when it is task-relevant and concept-mapped, not when it is random activity or performance coaching. Recent classroom and mixed-reality studies reinforce the same practical lesson in different settings by showing benefits for comprehension, vocabulary, and transfer when students map concepts onto bodily movement and then reuse that mapping during later problem solving. The practical implication for this method is to keep the run small, make each gesture stand for one real landmark, freeze at transitions, and always finish with a verbal or sketched map-back so the body cue does not replace the concept.
- **Source:** `https://doi.org/10.1177/0956797615569355`; `https://doi.org/10.1080/10508406.2011.611446`; `https://doi.org/10.1016/j.psychsport.2018.12.017`; `https://doi.org/10.1017/9781108638869.022`; `https://doi.org/10.1177/07356331241291173`; `https://doi.org/10.1177/01427237251345858`
- **Needs research:** `false`

## Related Methods
- [[M-GEN-009]] — Kinesthetic anchor cousin method when one gesture cue is enough
- [[M-ELB-002]] — Clinical application fallback when the learner needs a case frame instead of movement mapping
- [[M-ORG-003]] — Flowchart fallback if the sequence needs a static visual structure

## Changelog
- **v1.1** — migrated the method to the stage-first production metadata and cleaned up the legacy prompt surface while preserving the original movement-mapping flow.
- **v1.2** — upgraded the evidence stack to stronger embodied-learning, gesture, and classroom transfer sources; rebuilt the note into the current template; made the four presets produce clearly distinct movement-map formats and densities; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.

### Summary of Changes
- Reframed the method as a meaning-congruent movement-to-concept encoding pass rather than a generic kinesthetic activity.
- Upgraded the evidence stack from a single Kontra citation to a broader set of gesture, embodied-learning, and recent classroom-transfer sources.
- Rebuilt the preset behavior so each mode now produces a distinct embodied artifact:
  - `exam_cram` uses terse step-to-gesture bullets.
  - `deep_mastery` uses separated movement, transition, map-back, and safety sections.
  - `quick_review` uses a compact gesture table.
  - `clinical_bridge` uses an applied handoff matrix.
- Tightened the facilitation prompt so it is shorter, explicit about safe desk-scale motion, and strict about ending with a verbal or sketched map-back.
- Preserved the original core flow: define landmarks, assign safe gestures, narrate the walkthrough, freeze at transitions, and rerun from memory into words or a sketch.

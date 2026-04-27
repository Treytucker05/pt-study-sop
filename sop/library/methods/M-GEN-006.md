---
id: M-GEN-006
name: Self-Explanation Protocol
stage: ENCODE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-GEN, encode]
---

# M-GEN-006 — Self-Explanation Protocol

## Summary
Have the learner process one paragraph or concept unit at a time, explain why it follows from what came before, predict what comes next, and log any missing inference before advancing. The method stays constructive, local, and inspectable instead of collapsing into summary or rereading.

**Not for:** passive reading, copying answers, or letting the tutor do the cognitive work for the learner.

## Core Steps
1. **Read One Paragraph or Concept Unit** — process one bounded unit at a time
2. **Stop and Explain Why This Follows from the Previous Content** — make the local logic explicit
3. **Predict What Comes Next Before Reading On** — commit before advancing
4. **Express Your Explanation in Your Chosen Verbalization Mode** — make the reasoning visible
5. **Identify Any Inference Gaps or Confusion Points** — log missing links
6. **Flag Gaps for Follow-Up** — turn the misses into later study items
7. **Move to Next Unit and Repeat** — continue through the passage without batching

## Inputs
- Text passage or concept sequence
- Note-taking area (written mode) or quiet environment (spoken mode)
- Timer (optional)

## Required Outputs
- `Self-explanation notes or think-aloud log (per paragraph)`
- `Inference gap list`
- `Confusion points flagged`
- `Comprehension checkpoints`

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
- `exam_cram` — one-shot, fastest pass. Produce terse per-unit explanation bullets, one next-step prediction, and one short gap note for each processed unit.
- `deep_mastery` — interactive, full protocol pass. Keep separate sections for unit explanation, prediction, inference gaps, confusion points, and comprehension checkpoints across the passage.
- `quick_review` — one-shot refresh pass. Render the output as a compact table with `unit | explanation | prediction | gap` columns.
- `clinical_bridge` — stepwise applied reasoning pass. Use a clinical table with `unit | why it follows | what should come next | concern/gap | checkpoint` columns so the self-explanation stays practice-relevant.

## Runtime Prompt
```text
You are running M-GEN-006 (Self-Explanation Protocol) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Self-explanation notes or think-aloud log, Inference gap list, Confusion points flagged, and Comprehension checkpoints.
Have the learner process one paragraph or concept unit at a time, explain why it follows from the previous content, predict what comes next, and flag any missing inference or confusion before moving on. Do not explain the reasoning for the learner, do not batch units, and do not allow pure restatement of the text.
Preset behavior:
- exam_cram: one-shot; terse per-unit explanation bullets, one prediction, one gap note.
- deep_mastery: interactive; separate explanation, prediction, gap, confusion, and checkpoint sections.
- quick_review: one-shot refresh; compact unit-by-unit explanation-prediction-gap table.
- clinical_bridge: stepwise; applied unit -> why -> next -> gap -> checkpoint table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves unit read -> explanation -> prediction -> gap flag -> checkpoint and waits.
```

## Evidence
- **Citation:** Chi, De Leeuw, Chiu, and LaVancher (1994); Dunlosky, Rawson, Marsh, Nathan, and Willingham (2013); Bisra, Liu, Nesbit, Salimi, and Winne (2018); Ryan and Koppenhofer (2024); Zhang and Fiorella (2024); Beege and Ploetzner (2025)
- **Finding:** Self-Explanation Protocol is best supported as a unit-by-unit inference-building method that works when learners must explain how new information connects to what came before rather than simply restating the text. The classic self-explanation work and later meta-analysis support prompting learners to generate inferences and explanatory links, but both the broader strategy review and newer studies show important boundary conditions: self-explanation is not automatically beneficial, its effects depend on prompt quality and learner engagement, and gains are strongest when learners actually generate explanatory inferences rather than shallow paraphrases. Recent studies on prompted self-explanations in statistics, error correction, and interactive video reinforce the same practical lesson from different angles: explanation quality and scaffolding matter, and prompts can fail or even add cost when learners only go through the motions. The practical implication for this method is to process one unit at a time, force local why-links and next-step predictions, log inference gaps explicitly, and treat verbalization mode as a way to expose reasoning quality rather than as an end in itself.
- **Source:** `https://doi.org/10.1207/s15516709cog1803_7`; `https://doi.org/10.1177/1529100612453266`; `https://doi.org/10.1007/s10648-018-9434-x`; `https://doi.org/10.1177/00986283221114196`; `https://doi.org/10.1016/j.cedpsych.2024.102326`; `https://doi.org/10.1007/s11251-024-09693-5`
- **Needs research:** `false`

## Related Methods
- [[M-GEN-002]] — Teach-back cousin method when oral explanation across a larger chunk is more useful
- [[M-GEN-005]] — Why-chain fallback for deeper causal drilling on one specific statement
- [[M-GEN-007]] — Mechanism trace if the explanation is primarily process-oriented

## Changelog
- **v1.1** — migrated the method to the stage-first production metadata and cleaned up the legacy prompt surface while preserving the original unit-by-unit self-explanation flow.
- **v1.2** — upgraded the evidence stack to stronger self-explanation, meta-analytic, and recent prompt-quality sources; rebuilt the note into the current template; made the four presets produce clearly distinct explanation formats and densities; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.

### Summary of Changes
- Reframed the method as a unit-by-unit inference-building protocol instead of a generic think-aloud prompt.
- Upgraded the evidence stack from a single Chi citation to a broader set of classic, meta-analytic, and recent prompt-quality studies on self-explanation.
- Rebuilt the preset behavior so each mode now produces a distinct self-explanation artifact:
  - `exam_cram` uses terse per-unit bullets.
  - `deep_mastery` uses separated explanation, prediction, gap, and checkpoint sections.
  - `quick_review` uses a compact unit table.
  - `clinical_bridge` uses an applied reasoning table.
- Tightened the facilitation prompt so it is shorter, explicit about not batching units, and strict about prediction plus gap logging.
- Preserved the original core flow: read one unit, explain why it follows, predict what comes next, log gaps, flag follow-up items, and repeat.

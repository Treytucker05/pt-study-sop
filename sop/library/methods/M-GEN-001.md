---
id: M-GEN-001
name: Seed-Lock Generation
stage: ENCODE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-GEN, encode]
---

# M-GEN-001 — Seed-Lock Generation

## Summary
Force the learner to generate their own first encoding hook before any tutor help, then lock the strongest cue for later reuse. The method stays learner-first, preserves the initial seed even if it is weak, and only allows bounded assistance after a real attempt.

**Not for:** passive reading, copying answers, or letting the tutor do the cognitive work for the learner.

## Core Steps
1. **Read the Term and Definition** — make the target concept clear enough to encode accurately
2. **Start the 90-Second Attempt** — require a real first-pass generation window
3. **Generate the Seed** — create one learner-owned hook
4. **Write the Seed Even if Imperfect** — preserve the first cue and its meaning link
5. **Request One Suggestion if Still Stuck** — allow one bounded assist only after the attempt
6. **Lock the Final Hook** — choose the strongest cue and mark whether it stayed self-generated or needed help

## Inputs
- New term or concept to encode
- Definition from source material
- 90-second timer

## Required Outputs
- `Learner-generated Seed (primary hook attempt)`
- `Final locked hook`
- `Generation success flag (self vs AI-assisted)`

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
- `exam_cram` — one-shot, fastest cue pass. Produce one seed, one locked hook, and one self-versus-assisted status line with almost no extra commentary.
- `deep_mastery` — interactive, full generation pass. Preserve the learner seed, compare it against one bounded assist if needed, explain why the final hook wins, and keep an explicit lock note for later reuse.
- `quick_review` — one-shot refresh pass. Render the result as a compact table with concept, learner seed, final hook, cue type, and self-versus-assisted status.
- `clinical_bridge` — stepwise applied cue pass. Tie the hook to a patient finding, mechanism, or action cue when the concept is clinical, and render the lock as a cue-to-meaning-to-action grid.

## Runtime Prompt
```text
You are running M-GEN-001 (Seed-Lock Generation) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Learner-generated Seed, Final locked hook, and Generation success flag.
Force the learner to create the first hook. Read the term and source definition, require a real 90-second seed attempt, capture that seed even if imperfect, and only then allow one bounded tutor suggestion if the learner is still stuck. End by locking the strongest hook and marking whether it stayed self-generated or needed assistance.
Preset behavior:
- exam_cram: one-shot; one seed, one lock, one status line.
- deep_mastery: interactive; preserve seed, compare against one bounded assist if needed, and add a fuller lock note.
- quick_review: one-shot refresh; compact seed-lock table.
- clinical_bridge: stepwise; cue-to-meaning-to-action grid for clinical concepts.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves definition -> seed -> assist if needed -> lock and waits.
```

## Evidence
- **Citation:** Slamecka and Graf (1978); Bertsch, Pesta, Wiscott, and McDaniel (2007); McCurdy, Viechtbauer, Sklenar, Frankenstein, and Leshikar (2020); Tullis and Finley (2018); Tullis and Fraundorf (2022); Mocko, Wagler, and Lesser (2024)
- **Finding:** Seed-Lock Generation is best supported as a bounded self-generation method that uses the generation effect and the learner’s own cue-selection advantage to make later recall more likely than simple reading or tutor-provided phrasing alone. Foundational and meta-analytic generation-effect work shows that producing information rather than reading it tends to improve memory, but later reviews also show that the benefit depends on task constraint and on whether the generation task fits the material. Research on self-generated memory cues suggests that learner-made cues often outperform other-provided cues because learners choose distinctive prompts that fit their own memory needs. Recent classroom work on mnemonic use also shows an important limit: remembering a mnemonic is not the same as understanding the concept, so the cue must stay tied to the source definition and not become a substitute for meaning. The practical implication for this method is to force a real learner-made seed first, keep the target bounded, require a short explanation of why the cue fits, and allow tutor assistance only after a genuine attempt has been captured.
- **Source:** `https://doi.org/10.1037/0278-7393.4.6.592`; `https://doi.org/10.3758/BF03193441`; `https://doi.org/10.3758/s13423-020-01762-3`; `https://doi.org/10.1177/2372732218788092`; `https://doi.org/10.3758/s13421-021-01245-3`; `https://doi.org/10.1080/26939169.2024.2334905`
- **Needs research:** `false`

## Related Methods
- [[M-HOOK-002]] — Mnemonic support after a failed self-attempt
- [[M-GEN-002]] — Use teach-back if the learner needs more conceptual elaboration
- [[M-HOOK-001]] — Fallback if a fuller hook workflow is needed

## Changelog
- **v1.1** — migrated the method to the stage-first production metadata and cleaned up the legacy step scaffolding while preserving the learner-first seed -> assist-if-needed -> lock flow.
- **v1.2** — upgraded the evidence stack to stronger generation-effect and self-generated-cue sources; rebuilt the note into the current template; made the four presets produce clearly distinct cue styles and densities; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.

### Summary of Changes
- Reframed the method as a bounded learner-first cue-generation workflow instead of a loose mnemonic prompt.
- Upgraded the evidence stack from a single classic citation to a mix of foundational, meta-analytic, cue-generation, and recent classroom mnemonic sources.
- Rebuilt the preset behavior so each mode now produces a distinct artifact shape:
  - `exam_cram` uses a minimal seed-lock bullet pass.
  - `deep_mastery` preserves the seed and compares it against one bounded assist.
  - `quick_review` uses a compact seed-lock table.
  - `clinical_bridge` uses a cue-to-meaning-to-action grid.
- Tightened the facilitation prompt so it is shorter, explicitly gated around the 90-second self-attempt, and clear about when tutor help is allowed.
- Preserved the original core flow: read the term, attempt a seed under time pressure, write it down, allow help only after the attempt, then lock the final hook.

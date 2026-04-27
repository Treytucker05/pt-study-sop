---
id: M-TEA-004
name: Modality Switch
stage: EXPLAIN
status: draft
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-TEA, explain]
---

# M-TEA-004 — Modality Switch

## Summary
Choose the best first representation for the concept and switch the explanation into that modality before overload sets in. The method stays on one bounded concept, treats representation choice as an instructional move rather than a learner preference survey, and ends by stating why the chosen modality was the better bridge.

**Not for:** open-ended brainstorming, scoring, or broad coverage of unrelated material. Use an `ORIENT` method when the learner first needs orientation or objective framing.

## Core Steps
1. **Concept Type** — identify the concept type
2. **Representation Choice** — choose the best first representation
3. **Modality Shift** — re-express the concept in that modality
4. **Rationale** — state why this modality was chosen

## Inputs
- Source material loaded in chat
- Target concept, process, or comparison to teach
- Learner familiarity signal or prerequisite anchor (optional)

## Required Outputs
- `Concept type`
- `Chosen modality`
- `Re-expressed teaching chunk`

Additional built-in outputs:
- `Modality rationale`

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
    output_layout: bullets
    explanation_density: lean
  clinical_bridge:
    guidance_level: medium
    delivery_mode: stepwise
    fade_intensity: adaptive_light
    output_layout: table
    explanation_density: focused
```

## Preset Behavior
- `exam_cram` — one-shot, single-modality switch. Use one dominant representation only, prefer terse bullets, a mini flow, or a compact two-column table, and keep the rationale to one line.
- `deep_mastery` — interactive, two-stage switch. Start with one lead modality, pause after the first re-expression, and add one complementary support modality only if it removes a real bottleneck. Use labeled sections throughout.
- `quick_review` — one-shot refresh switch. Assume prior exposure, compress the concept-type and rationale lines, and convert the chunk into the fastest discriminating format, usually a table or terse procedure bullets.
- `clinical_bridge` — stepwise applied switch. Render the explanation as a cue table or finding-to-action grid, optionally with one line of scene-setting, so the modality choice is tied to what the learner should notice or do.

## Runtime Prompt
```text
You are running M-TEA-004 (Modality Switch) in the EXPLAIN stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Concept type, Chosen modality, Re-expressed teaching chunk, and Modality rationale.
Teach one bounded concept by identifying its type, choosing the lowest-friction lead representation, re-expressing the chunk in that modality, and stating why the switch helps. Keep one modality dominant and add a second only if it resolves a real bottleneck.
Preset behavior:
- exam_cram: one-shot; choose one dominant representation only; output terse bullets, a mini flow, or a two-column table plus a one-line rationale.
- deep_mastery: interactive; use labeled sections; start with one lead modality, pause after the first switch, and add one complementary second representation only if needed.
- quick_review: one-shot refresh; compress concept typing and rationale and convert the chunk into the fastest discriminating format, usually a table or terse procedure bullets.
- clinical_bridge: stepwise; use a cue table or finding-to-action grid, with optional one-line scene-setting, so the switch is tied to noticing or action.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves concept type -> modality choice -> re-expression -> rationale and waits.
```

## Evidence
- **Citation:** Mayer and Moreno (2003); Ginns (2005); Low and Sweller (2014); Liu, Lin, Gao, and Paas (2019); Haavisto, Jaakkola, and Lepola (2023); Cromley and Chen (2025)
- **Finding:** Research on multimedia learning and modality effects supports switching explanations into the representation that best distributes processing across channels and lowers split attention, rather than simply adding more media. Classical Mayer and Sweller work plus meta-analytic evidence support benefits for visuals paired with spoken language over picture-plus-written-text formats under many novice-learning conditions, but recent classroom-context studies show the effect depends on pacing, learner control, and the specific media used. The practical implication for this method is to choose one lead modality that fits the concept type, keep redundant text low, and add a second modality only when it resolves a specific bottleneck.
- **Source:** `https://doi.org/10.1207/S15326985EP3801_6`; `https://doi.org/10.1016/j.learninstruc.2005.07.001`; `https://doi.org/10.1017/CBO9781139547369.012`; `https://doi.org/10.1111/bjet.12605`; `https://doi.org/10.1016/j.compedu.2023.104775`; `https://doi.org/10.1016/j.edurev.2025.100730`
- **Needs research:** `false`

## Related Methods
- [[M-TEA-006]] — Use when the learner needs a stepwise depth ladder
- [[M-HOOK-003]] — Use when a mnemonic hook would stick better

## Changelog
- **v1.2** — upgraded the evidence stack to stronger multimedia-learning, modality-effect, and classroom-context sources; migrated the method to the stage-first `EXPLAIN` architecture; replaced the legacy knob block with the standard schema plus distinct presets; tightened the runtime prompt; rebuilt the markdown note into the current template structure; and preserved the original method logic, steps, outputs, and constraints.

---
id: M-PRE-008
name: Structural Extraction
stage: PRIME
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-PRE, prime]
---

# M-PRE-008 — Structural Extraction

## Summary
Extract a compact structural spine from source material before detail work. The method stays objective-linked, high-signal, and non-assessive so the learner gets a small usable scaffold instead of a prose recap.

**Not for:** first-contact teaching, scored assessment, or full solution reveal. Use a TEACH or REFERENCE method when the goal is explanation rather than orientation.

## Core Steps
1. **Resolve Objective Scope and Objective Set** — lock the active frame first
2. **Extract Structural Spine Nodes** — keep only high-signal mechanism or decision nodes
3. **Link Each Node to Objective IDs** — remove unlinked nodes if needed
4. **Mark Unknown or Low-Confidence Nodes** — keep uncertainty visible without turning it into a quiz

## Inputs
- Source material loaded in chat
- Target topic or objective scope
- Prior notes, North Star, or prior-session context (optional)

## Required Outputs
- `StructuralSpine`
- `Objective linkage map`
- `UnknownNodeList`

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
- `exam_cram` — one-shot, fastest extraction pass. Return a 5-node structural spine, short objective tags, and a terse unknown-node list.
- `deep_mastery` — interactive, full extraction pass. Keep separate sections for scope resolution, structural spine, objective linkage map, unknown nodes, and priority nodes.
- `quick_review` — one-shot refresh pass. Render a compact table with `node | linked objective | uncertainty status | priority` columns before the final ordered spine.
- `clinical_bridge` — stepwise applied extraction pass. Use a clinic-facing table with `node | clinical objective | uncertainty | next-pass priority` columns before the final spine.

## Runtime Prompt
```text
You are running M-PRE-008 (Structural Extraction) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: StructuralSpine, Objective linkage map, UnknownNodeList, and PriorityNodes.
Resolve the active objective scope, extract a compact high-signal structural spine, link every retained node to at least one objective, and mark unknown nodes for later study. Keep it orientation-only, non-assessive, and objective-linked; do not turn the output into prose explanation or retain nodes that do not matter for the active objectives.
Preset behavior:
- exam_cram: one-shot; 5-node spine, short objective tags, and terse unknown-node list.
- deep_mastery: interactive; labeled sections for scope resolution, spine, linkage map, unknown nodes, and priorities.
- quick_review: one-shot refresh; compact node / linked-objective / uncertainty / priority table plus final spine.
- clinical_bridge: stepwise; clinic-facing node / clinical-objective / uncertainty / priority table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves scope -> spine -> objective links -> unknown nodes and waits.
```

## Evidence
- **Citation:** Ausubel (1968); van Kesteren, Krabbendam, and Meeter (2018); Hattan, Alexander, and Lupo (2024); Bogaerds-Hazenberg, Evers-Vermeul, and van den Bergh (2020); Mehring and Kraft (2024)
- **Finding:** Structural Extraction is best supported as a selective-attention and structure-framing move that identifies a small number of high-signal nodes before deeper study, not as a prose summary or quiz. Work on prior knowledge, advance organization, and preparatory instruction supports bringing a bounded structure into view before details accumulate, while later text-structure research reinforces the value of keeping the extracted scaffold brief and explicit. The practical implication for this method is to resolve the objective frame first, keep only nodes that matter for those objectives, remove unlinked trivia, and mark weak nodes as orientation cues for later study rather than as graded failures.
- **Source:** `https://doi.org/10.1037/h0026121`; `https://doi.org/10.1038/s41539-018-0027-8`; `https://doi.org/10.3102/00346543221148478`; `https://doi.org/10.1002/rrq.311`; `https://doi.org/10.1152/advan.00096.2023`
- **Needs research:** `false`

## Related Methods
- [[M-PRE-010]] — Use when objective scope still needs a clearer frame
- [[M-PRE-005]] — Use when the source is naturally hierarchical and should be reduced to a bare category skeleton

## Changelog
- **v1.1** — migrated the method to the stage-first production metadata and cleaned up the legacy prompt surface while preserving the original four-step extraction flow.
- **v1.2** — upgraded the evidence stack to stronger structure-framing, preparatory-instruction, and objective-alignment sources; rebuilt the note into the current template; made the four presets produce clearly distinct extraction artifacts; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.

### Summary of Changes
- Reframed the method as an objective-linked structural spine extractor rather than a generic note-outline pass.
- Upgraded the evidence stack from a thin organizer stub to a stronger mix of advance-organization, preparatory-instruction, text-structure, and objective-alignment sources.
- Rebuilt the preset behavior so each mode now produces a distinct extraction artifact:
  - `exam_cram` uses terse bullets.
  - `deep_mastery` uses grouped labeled sections.
  - `quick_review` uses a compact node table.
  - `clinical_bridge` uses a clinic-facing priority table.
- Tightened the facilitation prompt so it is shorter, explicit about objective-linked filtering, and clear about removing unlinked trivia.
- Preserved the original core flow: resolve objective scope, extract high-signal nodes, link each node to objectives, and mark unknown nodes for later study.

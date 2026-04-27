---
id: M-PRE-003
name: Prior Knowledge Scan
stage: PRIME
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-PRE, prime]
---

# M-PRE-003 — Prior Knowledge Scan

## Summary
Map a new topic to 3-5 related concepts the learner already knows so the strongest prior schema and prerequisite gaps are visible before deeper work. The method stays brief, relational, and non-assessive instead of turning into a concept quiz or topic explanation.

**Not for:** first-contact teaching, scored assessment, or full solution reveal. Use a TEACH or REFERENCE method when the goal is explanation rather than orientation.

## Core Steps
1. **Write the New Topic at Center of Page** — create the hub for the scan
2. **List 3-5 Related Concepts You Already Know** — pull in nearby prior knowledge
3. **Draw Arrows Showing How Each Relates to the New Topic** — label the relationship
4. **Identify the Strongest Connection** — choose the primary anchoring schema
5. **Note Any Prerequisite Gaps** — flag weak links for follow-up

## Inputs
- Source material loaded in chat
- Target topic or objective scope
- Prior notes, North Star, or prior-session context (optional)

## Required Outputs
- `Connection map (topic + related concepts)`
- `Primary anchoring schema identified`
- `Prerequisite gap list`

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
- `exam_cram` — one-shot, fastest pass. Use 3 related concepts, one strongest anchor, and 1-2 prerequisite gaps as terse bullets.
- `deep_mastery` — interactive, full mapping pass. Keep separate sections for the connection map, relationship labels, primary anchoring schema, prerequisite gaps, and follow-up targets.
- `quick_review` — one-shot refresh pass. Render the output as a compact table with `known concept | relationship type | anchor strength | gap` columns.
- `clinical_bridge` — stepwise applied orientation pass. Use a clinic-facing table with `known concept | why it matters clinically | relationship to new topic | missing prerequisite` columns.

## Runtime Prompt
```text
You are running M-PRE-003 (Prior Knowledge Scan) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Connection map, Primary anchoring schema identified, Prerequisite gap list, and optional follow_up_targets.
Put the new topic at the center, list 3-5 related concepts the learner already knows, label how each one connects to the new topic, choose the strongest anchor schema, and flag weak prerequisite links for follow-up. Keep it orientation-only, non-assessive, and source-grounded; do not correct the map as if it were a graded concept check and do not teach the new topic while scanning.
Preset behavior:
- exam_cram: one-shot; 3 related concepts, one strongest anchor, and 1-2 gaps as terse bullets.
- deep_mastery: interactive; labeled sections for connection map, relationship labels, anchor schema, gaps, and follow-up targets.
- quick_review: one-shot refresh; compact known-concept / relationship / anchor-strength / gap table.
- clinical_bridge: stepwise; clinic-facing known-concept / relevance / relationship / missing-prerequisite table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves topic hub -> related concepts -> relationship labels -> strongest anchor -> gap flags and waits.
```

## Evidence
- **Citation:** Dochy, Segers, and Buehl (1999); Hattan, Alexander, and Lupo (2024); van Kesteren, Krabbendam, and Meeter (2018); Brand, Loibl, and Rummel (2025a); Brand, Loibl, and Rummel (2025b)
- **Finding:** Prior Knowledge Scan is best supported as a schema-activation and connection-mapping move that prepares learners to interpret new material by linking it to related concepts they already know. Reviews on prior knowledge and newer syntheses on activation show that learning improves when relevant existing knowledge is brought into play and organized around the current goal rather than left implicit. Reactivation and preparatory learning studies reinforce that even partial but relevant activation can prepare later learning, especially when the learner can identify which existing schema is strongest and where the prerequisite links are weak. The practical implication for this method is to keep the scan brief, map only a few high-value related concepts, label the type of relationship, choose one primary anchoring schema, and flag weak prerequisites for follow-up instead of correcting the map as if it were a graded concept test.
- **Source:** `https://doi.org/10.3102/00346543069002145`; `https://doi.org/10.3102/00346543221148478`; `https://doi.org/10.1038/s41539-018-0027-8`; `https://doi.org/10.1007/s11251-025-09727-6`; `https://doi.org/10.1007/s10648-025-10074-8`
- **Needs research:** `false`

## Related Methods
- [[M-PRE-001]] — Follow with a quick recall dump
- [[M-PRE-014]] — Use when the main goal is to find blind spots

## Changelog
- **v1.1** — migrated the method to the stage-first production metadata and cleaned up the legacy prompt surface while preserving the original five-step mapping flow.
- **v1.2** — upgraded the evidence stack to stronger prior-knowledge activation, reactivation, and preparatory-learning sources; rebuilt the note into the current template; made the four presets produce clearly distinct scan artifacts; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.

### Summary of Changes
- Reframed the method as a schema-activation and connection-mapping pass rather than a generic recall scan.
- Upgraded the evidence stack from a thin Ausubel stub to broader review, reactivation, and recent preparatory-learning studies.
- Rebuilt the preset behavior so each mode now produces a distinct scan artifact:
  - `exam_cram` uses terse bullets.
  - `deep_mastery` uses grouped labeled sections.
  - `quick_review` uses a compact relationship table.
  - `clinical_bridge` uses a clinic-facing connection table.
- Tightened the facilitation prompt so it is shorter, explicitly non-assessive, and strict about labeling relationships without teaching the topic.
- Preserved the original core flow: center the topic, list related concepts, label relationships, choose the strongest anchor, and flag gaps.

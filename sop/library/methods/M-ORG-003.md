---
id: M-ORG-003
name: Process Flowchart
stage: ENCODE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-ORG, encode]
---

# M-ORG-003 -- Process Flowchart

## Summary
Draw a sequential diagram showing a process, pathway, or algorithm. Include decision points where applicable. Use Mermaid graph TD syntax for dashboard editor. The method externalizes process order, decisions, and loops so the learner can see and later replay the mechanism instead of memorizing a loose list.

**Not for:** This is not for isolated trivia, free-form brainstorming, or content that has no meaningful structure to map.

## Core Steps
1. **The Start Point Input Trigger** -- Identify the start point (input/trigger)
2. **List All Steps In Sequential** -- List all steps in sequential order
3. **Boxes For Steps Diamonds For** -- Draw boxes for steps, diamonds for decisions
4. **With Arrows Showing Flow Direction** -- Connect with arrows showing flow direction
5. **Loops And Feedback Points** -- Identify loops and feedback points
6. **Against Source Material** -- Verify against source material

## Inputs
- Process or algorithm to diagram
- Source material with step sequence
- Mermaid editor or blank paper

## Required Outputs
- `Completed flowchart`
- `Decision point list`
- `Loop/feedback points identified`

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
- `exam_cram` -- One-shot; produce a lean step sequence with decision points and loops listed separately if the full diagram would be overkill.
- `deep_mastery` -- Interactive; build the process node by node, keep decision diamonds explicit, and annotate loops or feedback paths clearly.
- `quick_review` -- One-shot refresh; render a compact Step | Decision? | Next state table plus a short loop list.
- `clinical_bridge` -- Stepwise; turn the flowchart into an applied pathway grid with trigger, branch, confirm, and loop columns.

## Runtime Prompt
```text
You are running M-ORG-003 (Process Flowchart) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Completed flowchart, Decision point list, and Loop or feedback points identified.
Draw a sequential process diagram from the real source pathway. Make the start point explicit, list all steps in order, mark decision points and loops, and verify the finished structure against the source.
Preset behavior:
- exam_cram: one-shot; lean step sequence plus separate decision and loop notes.
- deep_mastery: interactive; node-by-node build with explicit decisions and loop annotations.
- quick_review: one-shot refresh; compact Step | Decision? | Next state table plus loop list.
- clinical_bridge: stepwise; applied pathway grid with trigger, branch, confirm, and loop columns.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves steps -> decisions -> loops -> verification and waits.
```

## Evidence
- **Citation:** Winn (1991); How the design and complexity of concept maps influence cognitive learning processes (2022); How can procedural flowcharts support the development of mathematics problem-solving skills? (2024); Hsu and Lopez Ricoy (2025)
- **Finding:** Process Flowchart is best supported as a visual-organization method for procedural or mechanism-heavy material when sequence, decision points, and loops are made explicit. Visual-organization research shows that learners benefit when the structure of the representation makes relationships and paths salient rather than forcing them to infer order from dense prose. More recent work on concept-map design and learner-built procedural flowcharts shows that structure only helps when the diagram stays readable, preserves the true relations, and is actively constructed or repaired by the learner. The practical implication for this method is to keep the flow linear where possible, mark decisions and loops explicitly, and verify the diagram against the source before treating it as a stable study artifact.
- **Source:** `https://doi.org/10.1007/s11423-022-10083-2`; `https://doi.org/10.1007/s13394-024-00483-3`; `https://doi.org/10.1177/0092055X241268768`; `https://doi.org/10.1080/00220671.2014.896315`
- **Needs research:** `false`

## Related Methods
- [[M-GEN-007]] -- Use when the learner needs a mechanism trace before converting it into a formal flowchart
- [[M-RET-004]] -- Use when the completed flow should be stress-tested later in mixed retrieval

## Changelog
- **v1.2** -- production hardening pass: upgraded the evidence stack to stronger procedural visual organization and process mapping sources, added the standard knob schema plus four distinct presets, tightened the runtime prompt, rebuilt the markdown note into the current template, and preserved the original method logic, steps, outputs, and constraints.

### Summary of Changes
- Upgraded the Evidence section with stronger and more relevant citations.
- Made `exam_cram`, `deep_mastery`, `quick_review`, and `clinical_bridge` produce clearly distinct behavior and output formats.
- Tightened the facilitation prompt so it is shorter, less redundant, and preset-explicit.
- Added the current template sections and synchronized the markdown note with the YAML metadata.
- Bumped the version from `v1.0` to `v1.2` without changing the core teaching flow.

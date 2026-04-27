---
id: M-INT-005
name: Case Walkthrough
stage: INTERROGATE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-INT, interrogate]
---

# M-INT-005 — Case Walkthrough

## Summary
Walk through one realistic case to retrieve reasoning steps, identify gaps, and reinforce application accuracy before moving to the next probe. The method stays attempt-first, exposes reasoning errors in context, and ends with one targeted follow-up instead of a lecture.

**Not for:** first exposure, direct lecturing, or introducing brand-new material that has not already been encoded.

## Core Steps
1. **Start Retrieve Protocol Within Scope** — present one realistic case stem and require a closed-note first-pass response
2. **Execute Method Actions In Order** — walk the case through differential, workup, and management with progressive disclosure as needed
3. **Emit Required Outputs And Handoff** — summarize the response, tag errors, give post-attempt correction, and end with one targeted next probe

## Inputs
- Reference targets or question bank
- Scoring rubric and confidence capture

## Required Outputs
- `LearnerCaseResponse (attempt-first reasoning)`
- `ErrorTags (typed classification of errors)`
- `ConfidenceTag (learner self-assessment)`
- `CorrectiveFeedback (post-attempt only)`
- `NextTargetedProbe (follow-up question targeting identified gaps)`

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
- `exam_cram` — one-shot, fastest case pass. Use one short case stem, terse bullets for differential, workup, and management, one confidence tag, one correction note, and one next probe.
- `deep_mastery` — interactive, full case reasoning pass. Use staged disclosure, require explicit differential and rationale, keep separate sections for response, errors, confidence, correction, and next probe, and allow one richer source-check at the end.
- `quick_review` — one-shot refresh pass. Compress the run into a compact table with case stem, likely interpretation, alternative, next test, management, error tag, and correction columns.
- `clinical_bridge` — stepwise applied pass. Use a realistic handoff-style case with red flags, prioritization, and disposition pressure, and render the reasoning as a clinical decision grid with the targeted next probe tied to the next real move.

## Runtime Prompt
```text
You are running M-INT-005 (Case Walkthrough) in the INTERROGATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: LearnerCaseResponse, ErrorTags, ConfidenceTag, CorrectiveFeedback, and NextTargetedProbe.
Run one realistic case from memory. Require a closed-note first-pass interpretation before feedback, walk the learner through differential, workup, and management as needed, tag the specific reasoning gap, capture confidence before correction, and end with one targeted next probe.
Preset behavior:
- exam_cram: one-shot; short case; terse bullets; one correction note; one next probe.
- deep_mastery: interactive; staged disclosure; explicit rationale, error tags, and fuller source check.
- quick_review: one-shot refresh; compact case reasoning table.
- clinical_bridge: stepwise; handoff-style case with red flags, prioritization, and a decision grid.
If no preset is specified, use the default knobs. One-shot returns the full case artifact in one bounded reply; interactive or stepwise mode moves case -> response -> correction -> next probe and waits.
```

## Evidence
- **Citation:** Schmidt and Rikers (2007); Charlin, Boshuizen, Custers, and Feltovich (2007); Moghadami, Amini, Moghadami, Dalal, and Charlin (2021); Chen (2024); Wang, Jiang, Fu, Gou, Sun, Li, Zhang, Nie, Wang, Zhao, and Zhang (2025); Elhassan, Sieben, Köhler, Joosten-ten Brinke, and Dolmans (2025)
- **Finding:** Case Walkthrough is best supported as a case-based reasoning method that improves learning when the learner must commit to a concrete interpretation before feedback rather than passively reading a solved case. Foundational illness-script work argues that clinical reasoning becomes more usable when knowledge is organized around patient problems, differentials, and consequences rather than stored as disconnected facts. More recent experimental and classroom studies suggest that structured illness-script teaching, unfolding cases, interactive case-based video, and staged-release case discussion can improve diagnostic accuracy, clinical reasoning, or perceived reasoning quality when the case is concrete, information is revealed in a controlled sequence, and the learner has to explain or defend the next move. The practical implication for this method is to run one realistic case at a time, require a memory-first attempt, use progressive disclosure without leaking the answer, tag the specific reasoning failure, and end with one targeted next probe instead of drifting into broad reteaching.
- **Source:** `https://doi.org/10.1111/j.1365-2923.2007.02915.x`; `https://doi.org/10.1111/j.1365-2923.2007.02924.x`; `https://doi.org/10.1186/s12909-021-02522-0`; `https://doi.org/10.1016/j.nedt.2024.106168`; `https://doi.org/10.3389/fmed.2025.1556018`; `https://doi.org/10.1080/0142159X.2025.2610409`
- **Needs research:** `false`

## Related Methods
- [[M-INT-002]] — Clinical application cousin method
- [[M-INT-006]] — Illness-script fallback for explicit reasoning structure
- [[M-ORG-004]] — Decision-tree fallback if the case branches

## Changelog
- **v1.1** — restored the archived method into the active library and migrated it to the stage-first `INTERROGATE` architecture while preserving the original attempt-first case walkthrough flow.
- **v1.2** — upgraded the evidence stack to stronger illness-script, unfolding-case, and staged case-discussion sources; rebuilt the method into the current template; made the four presets produce clearly distinct case depths and output formats; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.

### Summary of Changes
- Restored `M-INT-005` from the archived needs-work copy into the live method library.
- Migrated the metadata from legacy `ENCODE` labeling to the current stage-first `INTERROGATE` pattern used by the rest of the hardened `M-INT` family.
- Strengthened the evidence stack with foundational illness-script work plus newer classroom and experimental studies on unfolding cases, interactive case-based learning, and staged-release case discussion.
- Rebuilt the preset behavior so each mode now produces a distinct case style and artifact shape:
  - `exam_cram` uses terse bullets on one short case.
  - `deep_mastery` uses staged disclosure with labeled sections.
  - `quick_review` uses a compact reasoning table.
  - `clinical_bridge` uses a handoff-style decision grid with red flags and prioritization.
- Tightened the facilitation prompt so it is shorter, attempt-first, and explicit about confidence capture, correction timing, and next-probe handoff.
- Preserved the original method contract: one realistic case, learner attempt before feedback, error tagging, confidence capture, corrective feedback, and a targeted next probe.

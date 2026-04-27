---
id: M-PRE-010
name: Learning Objectives Primer
stage: PRIME
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-PRE, prime]
---

# M-PRE-010 — Learning Objectives Primer

## Summary
Build the study-target objective list for the current topic by accounting for all provided files first, then merging the objective signals into one clean set of learning targets. The method stays source-grounded and non-instructional so the learner gets a clear target frame before deeper study.

**Not for:** first-contact teaching, scored assessment, or full solution reveal. Use a TEACH or REFERENCE method when the goal is explanation rather than orientation.

## Core Steps
1. **Account for Every Provided File Before Objective Synthesis** — build the coverage table first
2. **Extract Candidate Objective Signals From Each Relevant File** — keep file-level distinctions visible
3. **Merge Overlapping Objective Signals Into One Clean Study-Target List** — keep the final list concise and source-grounded

## Inputs
- Source material loaded in chat
- Target topic or objective scope
- Prior notes, North Star, or prior-session context (optional)

## Required Outputs
- `SourceCoverageTable`
- `CandidateObjectivesByFile`
- `FinalLearningObjectives`

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
- `exam_cram` — one-shot, fastest objective pass. Return a terse coverage table, short candidate objective bullets by file, and a compact final objective list.
- `deep_mastery` — interactive, full objective pass. Keep separate sections for source coverage, candidate objectives by file, final merged objectives, and explicit instructor objectives.
- `quick_review` — one-shot refresh pass. Render a compact table with `file | objective signal | merge result | explicit-objective status` columns before the final list.
- `clinical_bridge` — stepwise applied objective pass. Use a clinic-facing table with `file | candidate objective | practical focus | merged target` columns before the final objectives.

## Runtime Prompt
```text
You are running M-PRE-010 (Learning Objectives Primer) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: SourceCoverageTable, CandidateObjectivesByFile, FinalLearningObjectives, and ExplicitInstructorObjectives.
Account for every provided file, extract candidate objective signals by file, preserve explicit instructor objectives verbatim, and merge the remaining signals into one clean study-target list. Keep it source-grounded, non-assessive, and non-instructional; do not skip files, invent objectives, or start teaching the topic.
Preset behavior:
- exam_cram: one-shot; terse coverage table, short candidate bullets by file, and compact final objectives.
- deep_mastery: interactive; labeled sections for coverage, candidates by file, merged objectives, and explicit instructor objectives.
- quick_review: one-shot refresh; compact file / objective-signal / merge-result / explicit-status table plus final list.
- clinical_bridge: stepwise; clinic-facing file / candidate objective / practical focus / merged-target table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves file accounting -> candidate objectives -> final merge and waits.
```

## Evidence
- **Citation:** Biggs (1996); Tong and Chin (2020); Jung, Kim, Yoon, Park, and Oakley (2018); Tobiason (2022); Mehring and Kraft (2024)
- **Finding:** Learning Objectives Primer is best supported as an alignment and attention-focusing move that gives the learner a clear study-target frame before detailed work begins, not as hidden teaching. Constructive-alignment research argues that clearly specified outcomes help coordinate materials, activities, and assessment, while later work on student learning objectives, course structure, and lesson-level alignment suggests that learners benefit when targets are explicit, coherent, and visibly tied to the actual course materials. The practical implication for this method is to account for every provided file first, preserve candidate objectives at file level, and merge only the signals that remain source-grounded after comparison.
- **Source:** `https://doi.org/10.1007/BF00138871`; `https://doi.org/10.1080/2331186X.2020.1713427`; `https://doi.org/10.1016/j.compedu.2018.10.001`; `https://doi.org/10.1177/14697874221092977`; `https://doi.org/10.1152/advan.00096.2023`
- **Needs research:** `false`

## Related Methods
- [[M-PRE-008]] — Use when the next move is objective-linked structural extraction
- [[M-PRE-007]] — Use when the objective frame is clear enough to build a short pre-test

## Changelog
- **v1.1** — migrated the method to the stage-first production metadata and cleaned up the legacy prompt surface while preserving the original three-step objective-framing flow.
- **v1.2** — upgraded the evidence stack to stronger constructive-alignment, objective-setting, and course-structure sources; rebuilt the note into the current template; made the four presets produce clearly distinct objective artifacts; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.

### Summary of Changes
- Reframed the method as a source-grounded objective-framing pass rather than a generic outcome list generator.
- Upgraded the evidence stack from a thin objective stub to a stronger mix of constructive-alignment, learning-objective, and course-structure sources.
- Rebuilt the preset behavior so each mode now produces a distinct objective artifact:
  - `exam_cram` uses terse bullets.
  - `deep_mastery` uses grouped labeled sections.
  - `quick_review` uses a compact file/objective table.
  - `clinical_bridge` uses a clinic-facing target table.
- Tightened the facilitation prompt so it is shorter, explicit about file accounting first, and clear about keeping the pass non-instructional.
- Preserved the original core flow: account for all files, extract candidate objective signals by file, and merge them into one clean final objective list.

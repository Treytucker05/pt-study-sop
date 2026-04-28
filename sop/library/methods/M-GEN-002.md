---
id: M-GEN-002
name: Teach-Back
stage: ENCODE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-GEN, encode]
---

# M-GEN-002 — Teach-Back

## Summary
Have the learner explain one concept aloud as if teaching a novice, surface the breakdowns, and route review only to the points where the explanation fails. The method stays learner-led, uses why and how questions to expose shallow understanding, and turns those breakdowns into bounded repair targets.

**Not for:** passive reading, copying answers, or letting the tutor do the cognitive work for the learner.

## Core Steps
1. **State the Concept You Will Teach** — define one bounded teach-back target
2. **Explain It as if Teaching a First-Year Student** — give the full plain-language explanation
3. **Note Where the Explanation Stumbles** — capture hesitations and vague jumps
4. **Answer the Novice Why and How Questions** — force the explanation deeper
5. **Identify the Breakdown Points** — turn failures into explicit gap notes
6. **Return to Source for Breakdown Areas Only** — repair only the exposed gaps

## Inputs
- Concept to teach
- Imaginary student (or real one)
- Recording device (optional)

## Required Outputs
- `Verbal explanation (recorded or noted)`
- `Breakdown points list`
- `Targeted review areas`

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
- `exam_cram` — one-shot, fastest teach-back pass. Produce one short novice-level explanation, two breakdown bullets, and one tight review target.
- `deep_mastery` — interactive, full explanation pass. Keep separate sections for novice explanation, why/how follow-ups, explicit breakdown logging, and targeted repair notes.
- `quick_review` — one-shot refresh pass. Render the output as a compact table with explanation summary, stumble point, why/how gap, and repair target columns.
- `clinical_bridge` — stepwise applied teach-back. Explain the concept as if teaching a junior clinician or patient, then use a `claim -> why -> clinical implication -> gap` grid to expose breakdowns that matter in practice.

## Runtime Prompt
```text
You are running M-GEN-002 (Teach-Back) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Verbal explanation, Breakdown points list, and Targeted review areas.
Have the learner explain one bounded concept aloud as if teaching a novice. Push with why and how questions, capture every stumble or vague leap as a breakdown, and send review only to those failure points. Do not explain the concept for the learner and do not allow a full reread during the teach-back.
Preset behavior:
- exam_cram: one-shot; short novice explanation; two breakdown bullets; one repair target.
- deep_mastery: interactive; full explanation plus why/how follow-ups and explicit breakdown logging.
- quick_review: one-shot refresh; compact explanation-gap-repair table.
- clinical_bridge: stepwise; junior-clinician or patient-facing teach-back with a claim -> why -> implication -> gap grid.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves scope -> explanation -> why/how -> breakdowns -> targeted review and waits.
```

## Evidence
- **Citation:** Roscoe and Chi (2007); Roscoe and Chi (2008); Nestojko, Bui, Kornell, and Bjork (2014); Fiorella and Mayer (2014); Wang, Huang, Zhang, Zhu, and Leng (2024); Cheng (2025)
- **Finding:** Teach-Back is best supported as a learning-by-teaching and self-explanation method that improves learning when the learner has to organize, explain, and then interrogate their own explanation rather than merely restudy. Tutor-learning and learning-by-teaching research suggests that the benefit of teaching comes from reflective knowledge-building, elaboration, and self-monitoring, not from knowledge-telling alone. Preparing to teach can improve organization and immediate comprehension, while actually explaining to others can add delayed learning benefits. More recent prompt-based learning-by-teaching studies also suggest that keyword or learner-generated prompts can improve retention and transfer when they deepen the explanation instead of replacing it. The practical implication for this method is to force a plain-language explanation first, use why and how follow-ups to expose shallow understanding, record the exact breakdowns, and limit review to those failure points instead of defaulting to a full re-read.
- **Source:** `https://doi.org/10.3102/0034654307309920`; `https://doi.org/10.1007/s11251-007-9034-5`; `https://doi.org/10.3758/s13421-014-0416-z`; `https://doi.org/10.1016/j.cedpsych.2014.01.001`; `https://journal.psych.ac.cn/acps/EN/Y2024/V56/I4/469`; `https://doi.org/10.1080/00220671.2025.2464043`
- **Needs research:** `false`

## Related Methods
- [[M-GEN-006]] — Similar self-explanation move
- [[M-GEN-005]] — Why-chain fallback for deeper causality
- [[M-ELB-002]] — Clinical application if the learner needs context

## Changelog
- **v1.1** — migrated the method to the stage-first production metadata and cleaned up the legacy prompt scaffolding while preserving the original teach-back -> breakdown -> targeted review flow.
- **v1.2** — upgraded the evidence stack to stronger learning-by-teaching, teach-expectancy, and prompt-supported explanation sources; rebuilt the note into the current template; made the four presets produce clearly distinct teach-back depths and output formats; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.

### Summary of Changes
- Reframed the method as a learner-led explanation-and-breakdown workflow instead of a generic “explain it aloud” prompt.
- Upgraded the evidence stack from a single teach-expectancy citation to a broader set of learning-by-teaching, tutor-learning, and recent prompt-supported explanation studies.
- Rebuilt the preset behavior so each mode now produces a distinct teach-back artifact:
  - `exam_cram` uses a short explanation plus minimal breakdown bullets.
  - `deep_mastery` uses labeled sections for explanation, why/how, and repair.
  - `quick_review` uses a compact explanation-gap-repair table.
  - `clinical_bridge` uses a practical claim -> why -> implication -> gap grid.
- Tightened the facilitation prompt so it is shorter, explicitly learner-led, and strict about review only targeting breakdown areas.
- Preserved the original core flow: choose the concept, explain it, surface stumbles, push with why/how, identify breakdowns, and review only the failed areas.

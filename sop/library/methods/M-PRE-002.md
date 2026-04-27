---
id: M-PRE-002
name: Overarching Pre-Question Set
stage: PRIME
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-PRE, prime]
---

# M-PRE-002 — Overarching Pre-Question Set

## Summary
Generate 3-5 broad why, how, or where-fit questions that jointly cover the selected material or module slice before deep study begins. The method stays whole-scope and non-assessive so the learner gets conceptual hooks rather than a stealth quiz.

**Not for:** first-contact teaching, scored assessment, or full solution reveal. Use a TEACH or REFERENCE method when the goal is explanation rather than orientation.

## Core Steps
1. **Inventory the Full Set of Major Sections, Concepts, and Transitions From the Selected Scope** — look across the whole slice before narrowing
2. **Compress That Inventory Into 3-5 Broad Conceptual Prompts** — create whole-scope why, how, or fit questions
3. **Rank Prompts by Expected Leverage** — choose the 1-2 highest-value prompts
4. **Record Unresolved Prompts as Follow-Up Targets** — turn the remaining questions into next-pass routing cues

## Inputs
- Source material loaded in chat
- Target topic or objective scope
- Prior notes, North Star, or prior-session context (optional)

## Required Outputs
- `PreQuestionSet`
- `PriorityPrompts`
- `FollowUpTargets`

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
- `exam_cram` — one-shot, fastest pass. Return 3 broad questions, 1 `PriorityPrompt`, and 1-2 `FollowUpTargets` as terse bullets.
- `deep_mastery` — interactive, full orientation pass. Keep separate sections for scope inventory, full `PreQuestionSet`, ranked `PriorityPrompts`, and unresolved `FollowUpTargets`.
- `quick_review` — one-shot refresh pass. Render a compact table with `question | covered cluster | leverage rank | follow-up use` columns.
- `clinical_bridge` — stepwise applied orientation pass. Use a clinic-facing table with `broad question | patient relevance | missing node | downstream target` columns.

## Runtime Prompt
```text
You are running M-PRE-002 (Overarching Pre-Question Set) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: PreQuestionSet, PriorityPrompts, and FollowUpTargets.
Inventory the selected scope, compress it into 3-5 broad why, how, or where-fit questions that cover the whole slice, rank the highest-leverage prompts, and record unresolved ones as follow-up targets. Keep it orientation-only, non-assessive, and source-grounded; do not teach the answers and do not turn the questions into quiz items.
Preset behavior:
- exam_cram: one-shot; 3 broad questions, 1 priority prompt, and 1-2 follow-up targets as terse bullets.
- deep_mastery: interactive; labeled sections for scope inventory, question set, priority prompts, and unresolved follow-up targets.
- quick_review: one-shot refresh; compact question / covered-cluster / leverage-rank / follow-up-use table.
- clinical_bridge: stepwise; clinic-facing broad-question / patient-relevance / missing-node / downstream-target table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves scope inventory -> question compression -> leverage ranking -> follow-up capture and waits.
```

## Evidence
- **Citation:** Carpenter and Toftness (2017); Pressley, Wood, Woloshyn, Martin, King, and Menke (1990); Pan and Sana (2024); Chan, Lee, and Jia (2024); Hattan, Alexander, and Lupo (2024)
- **Finding:** Overarching Pre-Question Set is best supported as a broad prequestioning and prior-knowledge activation move that helps learners approach upcoming material with better-organized attention, especially when the questions stay conceptual rather than turning into miniature quizzes. The prequestion literature shows that asking questions before instruction can improve learning under some conditions by focusing attention and prompting explanatory search, but the same literature also shows clear limits: benefits depend on question type, lesson structure, and how well the prompt supports structure building rather than isolated answer hunting. Recent reviews and classroom studies reinforce that prequestions work better when they highlight important relationships, main ideas, or broad conceptual targets instead of narrow facts, and when unresolved questions are carried into later learning rather than scored immediately. The practical implication for this method is to keep the set small, broad, and whole-scope, rank the highest-leverage prompts, and treat unresolved questions as routing cues for the next study move rather than as test failures.
- **Source:** `https://doi.org/10.1111/jcal.12105`; `https://doi.org/10.1207/s15326985ep2701_7`; `https://doi.org/10.3758/s13423-023-02353-8`; `https://doi.org/10.1037/xap0000558`; `https://doi.org/10.3102/00346543221148478`
- **Needs research:** `false`

## Related Methods
- [[M-PRE-010]] — Pair with objective framing before asking questions
- [[M-PRE-003]] — Use after a quick prior-knowledge scan

## Changelog
- **v1.1** — migrated the method to the stage-first production metadata and cleaned up the legacy prompt surface while preserving the original four-step question-framing flow.
- **v1.2** — upgraded the evidence stack to stronger prequestioning, structure-building, and recent learning-from-text sources; rebuilt the note into the current template; made the four presets produce clearly distinct prequestion artifacts; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.

### Summary of Changes
- Reframed the method as a broad conceptual prequestioning pass rather than a generic prompt list.
- Upgraded the evidence stack from a thin prequestion stub to a broader mix of classic explanatory-question work, recent prequestion review, and newer comparative studies.
- Rebuilt the preset behavior so each mode now produces a distinct prequestion artifact:
  - `exam_cram` uses terse bullets.
  - `deep_mastery` uses grouped labeled sections.
  - `quick_review` uses a compact question table.
  - `clinical_bridge` uses an applied relevance table.
- Tightened the facilitation prompt so it is shorter, explicit about whole-scope coverage, and strict about avoiding quiz-style detail questions.
- Preserved the original core flow: inventory the full scope, compress it into 3-5 broad prompts, rank by leverage, and record unresolved prompts for follow-up.

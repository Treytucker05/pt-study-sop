---
id: M-PRE-001
name: Brain Dump
stage: PRIME
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-PRE, prime]
---

# M-PRE-001 — Brain Dump

## Summary
Run a short orientation-only recall pass over existing notes or context to surface strong anchors, obvious gaps, and next-pass targets before deeper work. The method stays non-assessive and structural instead of turning the opening into a quiz or mini-lecture.

**Not for:** first-contact teaching, scored assessment, or full solution reveal. Use a TEACH or REFERENCE method when the goal is explanation rather than orientation.

## Core Steps
1. **Free Write** — ask for a quick 60-120 second dump of what the learner already remembers
2. **Extract Anchor Nodes That Align With Existing Objective Targets** — keep only top-level structure
3. **Mark Obvious Missing Nodes as Follow-Up Anchors** — turn gaps into next-pass targets without penalties

## Inputs
- Source material loaded in chat
- Target topic or objective scope
- Prior notes, North Star, or prior-session context (optional)

## Required Outputs
- `StrongConnections`
- `MissingNodes`
- `FollowUpTargets`

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
- `exam_cram` — one-shot, fastest orientation pass. Return 3 `StrongConnections`, up to 2 `MissingNodes`, and 1-2 `FollowUpTargets` as terse bullets only.
- `deep_mastery` — interactive, full orientation pass. Keep separate sections for `StrongConnections`, `MissingNodes`, and `FollowUpTargets`, and group anchors by objective or theme before routing forward.
- `quick_review` — one-shot refresh pass. Render the output as a compact table with `known anchor | objective tie | missing node | next target` columns.
- `clinical_bridge` — stepwise applied orientation pass. Use a clinic-facing table with `known clinical cue | why it matters | missing node | follow-up target` columns so the opening map points toward patient-facing study.

## Runtime Prompt
```text
You are running M-PRE-001 (Brain Dump) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: StrongConnections, MissingNodes, and FollowUpTargets.
Have the learner do a brief free write on what they already remember, extract only the top-level anchors that align with the active topic or objective, and mark obvious gaps as follow-up nodes. Keep it orientation-only, non-assessive, and source-grounded; do not teach, score, or correct the dump as if it were a quiz.
Preset behavior:
- exam_cram: one-shot; terse bullets with 3 strong anchors, up to 2 gaps, and 1-2 next targets.
- deep_mastery: interactive; labeled sections grouping anchors and gaps by objective or theme.
- quick_review: one-shot refresh; compact known-anchor / objective-tie / missing-node / next-target table.
- clinical_bridge: stepwise; clinic-facing cue / why-it-matters / missing-node / follow-up-target table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves free write -> anchor extraction -> missing-node routing and waits.
```

## Evidence
- **Citation:** Dochy, Segers, and Buehl (1999); Hattan, Alexander, and Lupo (2024); van Kesteren, Krabbendam, and Meeter (2018); Brand, Loibl, and Rummel (2025a); Brand, Loibl, and Rummel (2025b)
- **Finding:** Brain Dump is best supported as a short prior-knowledge activation and organization move that prepares the learner for deeper instruction without turning the opening into a quiz. Reviews on prior knowledge and newer syntheses on activation show that what learners already know strongly shapes comprehension and later learning, and that activation works best when the relevant knowledge is surfaced and tied to the current goal rather than left dormant or allowed to stay diffuse. Experimental and educational studies on reactivation and preparatory designs reinforce the same practical point: even partial activation of relevant prior knowledge can prepare learners for subsequent instruction, but the activation has to be relevant enough to serve as an anchor and not so evaluative that it becomes a disguised test. The practical implication for this method is to keep the free write brief, extract only top-level anchor nodes, mark obvious missing nodes non-judgmentally, and route the next study move from the gap pattern rather than from correctness scoring.
- **Source:** `https://doi.org/10.3102/00346543069002145`; `https://doi.org/10.3102/00346543221148478`; `https://doi.org/10.1038/s41539-018-0027-8`; `https://doi.org/10.1007/s11251-025-09727-6`; `https://doi.org/10.1007/s10648-025-10074-8`
- **Needs research:** `false`

## Related Methods
- [[M-PRE-010]] — Best first companion when objective context is missing
- [[M-PRE-008]] — Follow with structure once anchors are surfaced

## Changelog
- **v1.1** — migrated the method to the stage-first production metadata and cleaned up the legacy prompt surface while preserving the original three-step orientation flow.
- **v1.2** — upgraded the evidence stack to stronger prior-knowledge activation, reactivation, and recent preparatory-instruction sources; rebuilt the note into the current template; made the four presets produce clearly distinct orientation artifacts; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.

### Summary of Changes
- Reframed the method as a short prior-knowledge activation and organization pass instead of a generic recall prompt.
- Upgraded the evidence stack from a thin Ausubel stub to broader review, reactivation, and recent preparatory-learning studies.
- Rebuilt the preset behavior so each mode now produces a distinct orientation artifact:
  - `exam_cram` uses terse bullets.
  - `deep_mastery` uses grouped labeled sections.
  - `quick_review` uses a compact orientation table.
  - `clinical_bridge` uses a clinic-facing cue table.
- Tightened the facilitation prompt so it is shorter, explicitly non-assessive, and strict about staying at top-level anchor depth.
- Preserved the original core flow: free write, extract anchor nodes, and mark missing nodes for follow-up.

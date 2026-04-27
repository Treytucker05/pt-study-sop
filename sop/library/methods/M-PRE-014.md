---
id: M-PRE-014
name: Ambiguity and Blind-Spot Scan
stage: PRIME
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-PRE, prime]
---

# M-PRE-014 — Ambiguity and Blind-Spot Scan

## Summary
Scan the selected source for the most important ambiguities, unsupported jumps, misconceptions, or traps that TEACH should repair later. The method stays source-grounded and non-diagnostic so it produces a useful repair list instead of vague critique or early explanation.

**Not for:** first-contact teaching, scored assessment, or full solution reveal. Use a TEACH or REFERENCE method when the goal is explanation rather than orientation.

## Core Steps
1. **Scan for Compressed Leaps, Unclear Transitions, and Likely Misconceptions** — focus on source-grounded trouble spots
2. **Select the 2-4 Highest-Yield Blind Spots or Traps** — keep the scan concise
3. **Translate Them Into Follow-Up Targets for TEACH** — turn each trap into a useful handoff

## Inputs
- Source material loaded in chat
- Target topic or objective scope
- Prior notes, North Star, or prior-session context (optional)

## Required Outputs
- `BlindSpotList`
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
- `exam_cram` — one-shot, fastest scan. Return 2 source-grounded blind spots and one terse follow-up target for each.
- `deep_mastery` — interactive, full scan. Keep separate sections for blind spots, why each one is risky, and TEACH-facing follow-up targets.
- `quick_review` — one-shot refresh pass. Render a compact table with `blind spot | source cue | follow-up target` columns.
- `clinical_bridge` — stepwise applied scan. Use a clinic-facing table with `trap | why it is clinically risky | follow-up target` columns.

## Runtime Prompt
```text
You are running M-PRE-014 (Ambiguity and Blind-Spot Scan) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: BlindSpotList and FollowUpTargets.
Scan the source for compressed leaps, unclear transitions, likely misconceptions, or traps; select the 2-4 highest-yield ones; and translate them into TEACH-facing follow-up targets. Keep it source-grounded, non-assessive, and non-diagnostic; do not resolve the blind spots yet and do not turn the scan into vague complaints.
Preset behavior:
- exam_cram: one-shot; 2 blind spots and one terse follow-up target for each.
- deep_mastery: interactive; labeled sections for blind spots, why each is risky, and follow-up targets.
- quick_review: one-shot refresh; compact blind-spot / source-cue / follow-up-target table.
- clinical_bridge: stepwise; clinic-facing trap / clinical-risk / follow-up-target table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves blind spots -> follow-up targets and waits.
```

## Evidence
- **Citation:** Hattan, Alexander, and Lupo (2024); Qian and Lehman (2019); Pieschl, Budd, Thomm, and Archer (2021); Craig, Wilcox, Makarenko, and MacMaster (2021)
- **Finding:** Ambiguity and Blind-Spot Scan is best supported as an attention-guidance and misconception-sensitive planning move that surfaces where later teaching should slow down, not as a learner diagnosis. Work on preparatory instruction and misconception research suggests that later learning improves when likely trouble spots are identified early and when misconceptions are treated as specific targets for later repair rather than as vague learner deficits. The practical implication for this method is to stay source-grounded, select only 2-4 high-yield ambiguities or traps, and convert them into clean TEACH-facing handoff targets instead of resolving them inside PRIME.
- **Source:** `https://doi.org/10.3102/00346543221148478`; `https://doi.org/10.1177/2158244019885136`; `https://doi.org/10.1177/1475725721996223`; `https://doi.org/10.1177/0829573520979605`
- **Needs research:** `false`

## Related Methods
- [[M-PRE-010]] — Use when the scan needs a clearer objective frame first
- [[M-TEA-002]] — Use when a flagged blind spot is really a confusable contrast that teaching should repair explicitly

## Changelog
- **v1.1** — migrated the method to the stage-first production metadata and cleaned up the legacy prompt surface while preserving the original three-step blind-spot flow.
- **v1.2** — upgraded the evidence stack to stronger preparatory-instruction, misconception, and teacher-belief sources; rebuilt the note into the current template; made the four presets produce clearly distinct blind-spot artifacts; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.

### Summary of Changes
- Reframed the method as a source-grounded repair-list generator rather than generic critique or learner diagnosis.
- Upgraded the evidence stack from a thin attention stub to a stronger mix of preparatory-instruction, misconception, and teacher-belief sources.
- Rebuilt the preset behavior so each mode now produces a distinct blind-spot artifact:
  - `exam_cram` uses terse bullets.
  - `deep_mastery` uses grouped labeled sections.
  - `quick_review` uses a compact blind-spot table.
  - `clinical_bridge` uses a clinic-facing risk table.
- Tightened the facilitation prompt so it is shorter, explicit about the 2-4 item cap, and clear about handing the issues off to TEACH instead of resolving them now.
- Preserved the original core flow: scan for blind spots, select the highest-yield ones, and translate them into follow-up targets for TEACH.

---
id: M-GEN-007
name: Mechanism Trace
stage: ENCODE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-GEN, encode]
---

# M-GEN-007 — Mechanism Trace

## Summary
Have the learner trace one bounded mechanism from trigger to outcome, explain each arrow with a because-link, verify the chain against the source, and mark real branch points. The method stays causal, explicit, and inspectable instead of collapsing into vague summary or rote feature lists.

**Not for:** passive reading, copying answers, or letting the tutor do the cognitive work for the learner.

## Core Steps
1. **Identify the Trigger Initial Cause or Stimulus** — choose the starting perturbation
2. **Ask What Happens Next as a Direct Result** — write the nearest downstream effect
3. **Repeat Step 2 Until You Reach the Final Outcome** — extend the chain one direct step at a time
4. **Add Because Statements at Each Arrow** — justify every transition
5. **Verify Chain Against Source Material** — check every link
6. **Note Branch Points Where Mechanisms Diverge** — mark where the pathway splits

## Inputs
- Pathway or mechanism to trace
- Source material with mechanism details
- Flowchart template or blank paper

## Required Outputs
- `Complete mechanism chain (trigger to outcome)`
- `Because statements for each step`
- `Branch points identified`
- `Verification status`

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
- `exam_cram` — one-shot, fastest trace. Produce one trigger-to-outcome chain, one because line per arrow, one branch note if present, and one verification line.
- `deep_mastery` — interactive, full mechanism pass. Keep separate sections for trigger, chain steps, because links, branch points, and verification notes.
- `quick_review` — one-shot refresh pass. Render the output as a compact table with `step | next effect | because | verification` columns.
- `clinical_bridge` — stepwise applied clinical pass. Use a table with `trigger | path step | because | clinical sign/consequence | branch/alternate effect` columns.

## Runtime Prompt
```text
You are running M-GEN-007 (Mechanism Trace) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Complete mechanism chain, Because statements for each step, Branch points identified, and Verification status.
Have the learner trace one bounded mechanism from trigger to outcome one direct step at a time, explain each arrow with a because statement, verify every link against the source, and mark where the pathway branches. Do not let the learner skip intermediate steps, use vague because language, or flatten real divergence into one straight line.
Preset behavior:
- exam_cram: one-shot; one traced chain, because lines, branch note, verification line.
- deep_mastery: interactive; separate trigger, chain, because, branch, and verification sections.
- quick_review: one-shot refresh; compact step-next-because-verification table.
- clinical_bridge: stepwise; trigger -> path step -> because -> clinical consequence -> branch table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves trigger -> next effects -> because links -> verification -> branch points and waits.
```

## Evidence
- **Citation:** Kulasegaram, Martimianakis, Mylopoulos, Whitehead, and Woods (2013); Kulasegaram, Manzone, Ku, Skye, Wadey, and Woods (2015); Lisk, Agur, and Woods (2016); Woods, Neville, Levinson, Howey, Oczkowski, and Norman (2006); Woods, Brooks, and Norman (2007); Chamberland and Mamede (2015)
- **Finding:** Mechanism Trace is best supported as a novice-oriented causal self-explanation scaffold for mechanism-dense content, especially in biomedical contexts where explicit cause-and-effect links matter for transfer. The strongest support is not for a decorative flowchart but for making basic-science or mechanism links explicit: studies of cognitive integration and biomedical reasoning show that learners perform better on delayed or more difficult transfer tasks when they build explicit causal links instead of memorizing feature lists or relying on proximity alone. The review literature also adds a boundary condition: mechanism tracing is most useful when the learner still needs to build coherent causal structure, and it is less central once knowledge becomes more encapsulated. The practical implication for this method is to trace one bounded mechanism from trigger to outcome, require specific because-links, verify every arrow against the source, and mark real branch points instead of forcing a false linear story.
- **Source:** `https://doi.org/10.1097/ACM.0b013e3182a45def`; `https://doi.org/10.1097/ACM.0000000000000896`; `https://doi.org/10.1007/s40037-016-0268-2`; `https://doi.org/10.1097/00001888-200610001-00031`; `https://doi.org/10.1007/s10459-006-9054-y`; `https://doi.org/10.1016/j.hpe.2015.11.005`
- **Needs research:** `false`

## Related Methods
- [[M-ORG-003]] — Flowchart fallback for sequential mechanisms when the learner mainly needs visual sequencing
- [[M-GEN-005]] — Why-chain fallback for causal depth on one specific claim
- [[M-INT-006]] — Illness-script fallback when the learner needs a clinical pattern rather than a single traced pathway

## Changelog
- **v1.1** — corrected the method back into the stage-first ENCODE architecture and cleaned up the legacy prompt surface while preserving the original trigger -> chain -> because -> verification -> branch flow.
- **v1.2** — upgraded the evidence stack to stronger biomedical cognitive-integration and mechanism-reasoning sources; rebuilt the note into the current template; made the four presets produce clearly distinct trace artifacts; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.

### Summary of Changes
- Fixed the live stage mismatch by restoring the method to `ENCODE` instead of leaving it under `TEACH`.
- Reframed the method as a causal self-explanation scaffold instead of a generic mechanism lecture prompt.
- Upgraded the evidence stack from one broad citation to a stronger set of biomedical cognitive-integration, transfer, and mechanism-reasoning sources already consistent with the prior evidence review.
- Rebuilt the preset behavior so each mode now produces a distinct mechanism-trace artifact:
  - `exam_cram` uses one lean chain with because lines.
  - `deep_mastery` uses separated trigger, chain, branch, and verification sections.
  - `quick_review` uses a compact mechanism table.
  - `clinical_bridge` uses an applied clinical consequence table.
- Tightened the facilitation prompt so it is shorter, explicit about not skipping intermediate steps, and strict about verification plus branch-point marking.
- Preserved the original core flow: identify the trigger, trace the downstream effects, justify each arrow, verify the chain, and mark where the pathway diverges.

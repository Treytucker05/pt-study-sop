---
id: M-ELB-004
name: Illness Script Builder
stage: ELABORATE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-INT, elaborate]
---

# M-ELB-004 — Illness Script Builder

## Summary
Build a disease script by linking enabling conditions, the pathophysiological fault, and the resulting consequences, then compare it against source and mark the discriminators. The method stays on already-encoded material, organizes clinical knowledge into a usable script, and closes with look-alike separation instead of a loose fact list.

**Not for:** first exposure, direct lecturing, or introducing brand-new material that has not already been encoded.

## Core Steps
1. **Write the Enabling Conditions** — define who gets it and what risk context matters
2. **Write the Pathophysiological Fault** — state what goes wrong and why
3. **Write the Clinical Consequences** — name the findings that follow from the fault
4. **Connect the Causal Chain** — link enabling conditions to fault to consequences
5. **Compare to the Source Version** — identify misses, gaps, and inaccuracies
6. **Add the Discriminators** — separate the script from similar conditions

## Inputs
- Condition or disease to script
- Source material with pathophysiology
- Illness script template

## Required Outputs
- `Complete illness script (enabling conditions, pathophysiological fault, clinical consequences)`
- `Causal chain diagram (enabling -> fault -> consequences)`
- `Comparison to textbook version (gaps identified)`
- `Discriminating features vs. similar conditions`

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
- `exam_cram` — one-shot, fastest script pass. Return terse bullets for enabling conditions, fault, and consequences, one simple arrow chain, one short source-gap list, and one look-alike discriminator.
- `deep_mastery` — interactive, fullest script pass. Build a richer three-part script, keep the causal chain explicit, compare against source in more detail, and include two look-alike contrasts before closing.
- `quick_review` — one-shot refresh pass. Use a compact table with columns for enabling conditions, fault, consequences, and discriminator, followed by a brief source-gap table.
- `clinical_bridge` — stepwise applied pass. Tie the script to patient-facing cues by emphasizing risk profile, mechanism-linked findings, red flags, and differentiators that change the next clinical move.

## Runtime Prompt
```text
You are running M-ELB-004 (Illness Script Builder) in the ELABORATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Complete illness script, Causal chain diagram, Comparison to textbook, and Discriminating features.
Build one illness script by naming enabling conditions, the pathophysiological fault, and the clinical consequences, then compare it against source and separate it from look-alikes. Do not turn the run into a lecture or write the script for the learner before an attempt.
Preset behavior:
- exam_cram: one-shot; terse three-part script; one arrow chain; short gap list; one discriminator.
- deep_mastery: interactive; fuller three-part script; detailed source comparison; two look-alike contrasts.
- quick_review: one-shot refresh; compact script table plus brief gap table.
- clinical_bridge: stepwise; patient-facing script with risk profile, mechanism-linked findings, red flags, and next-move differentiators.
If no preset is specified, use the default knobs. One-shot returns the full illness-script artifact in one bounded reply; interactive or stepwise mode moves script -> chain -> source check -> discriminators and waits.
```

## Evidence
- **Citation:** Schmidt and Rikers (2007); Charlin, Boshuizen, Custers, and Feltovich (2007); Keemink, Custers, van Dijk, and ten Cate (2018); Lubarsky, Dory, Audétat, Custers, and Charlin (2020); Delavari, Monajemi, Baradaran, Myint, Yaghmae, and Soltani Arabshahi (2020)
- **Finding:** Illness Script Builder is best supported as a clinical-reasoning organization method that helps learners structure disease knowledge into a usable script rather than a loose list of facts. Foundational illness-script and clinical-reasoning work argues that expert diagnosis depends on organized scripts linking enabling conditions, underlying fault, and consequences. More recent instructional studies suggest that explicit script-focused teaching and script-writing activities can improve learners' ability to interpret cases, explain mechanisms, and move toward more organized reasoning. The practical implication for this method is to require all three script parts, make the causal chain explicit, compare the draft against source material, and end with discriminators versus similar conditions so the learner leaves with a script that is both mechanistic and clinically differentiable.
- **Source:** `https://doi.org/10.1111/j.1365-2923.2007.02915.x`; `https://doi.org/10.1111/j.1365-2923.2007.02924.x`; `https://doi.org/10.5116/ijme.5a5b.24a9`; `https://doi.org/10.36834/cmej.36631`; `https://doi.org/10.47176/mjiri.34.9`
- **Needs research:** `false`

## Related Methods
- [[M-ELB-002]] — Clinical application cousin method
- [[M-ELB-003]] — Case walkthrough fallback
- [[M-GEN-007]] — Mechanism trace fallback for causal sequencing

## Changelog
- **v1.0** — initial validated spec.
- **v1.2** — migrated the method to the stage-first `ELABORATE` architecture; upgraded the evidence stack to stronger illness-script, clinical-reasoning, and script-instruction sources; replaced the legacy knob block with the standard schema plus four distinct presets; tightened the runtime prompt; rebuilt the markdown note into the current template; and preserved the original script-building flow, outputs, and constraints.

### Summary of Changes
- Replaced the thin illness-script stub with a stronger stack centered on clinical reasoning, illness scripts, and explicit script-building instruction.
- Reframed the method as a causal clinical-script builder instead of a generic disease-summary exercise.
- Made the presets materially different by script density, comparison depth, and patient-facing output format.
- Tightened the facilitation prompt so it is shorter, less redundant, and explicit about preset behavior.
- Rebuilt the markdown note into the current production template while keeping the original enabling -> fault -> consequences flow intact.

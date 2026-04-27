---
id: M-HOOK-002
name: KWIK Lite
stage: ENCODE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-HOOK, encode]
---

# M-HOOK-002 -- KWIK Lite

## Summary
60-second lightweight mnemonic slot. One system-seeded cue plus one learner personalization. If the learner cannot land a hook within 60 seconds, escalate to M-HOOK-001 (full KWIK Hook) for that concept. The method stays inside a 60-second cue budget, requires one learner personalization move, and escalates cleanly when no stable hook appears.

**Not for:** This is not for teaching the whole concept from scratch, replacing source truth, or turning a mnemonic into a false fact claim.

## Core Steps
1. **Confirm Meaning Is Stable Teach** -- Confirm meaning is stable (TEACH close artifact exists)
2. **Seed One Lightweight Cue Sound** -- Seed one lightweight cue (sound, image, phrase)
3. **Learner Personalizes Or Restates The** -- Learner personalizes or restates the cue
4. **Record Final Hook Distortion Guard** -- Record final hook + distortion guard
5. **Time If 60S Passed Without** -- Check time — if 60s passed without a clean hook, flag for escalation

## Inputs
- TEACH close artifact
- Target term or concept to compress
- Short meaning/function statement

## Required Outputs
- `KWIK Lite seed`
- `Learner ownership action`
- `Final hook`
- `Distortion guard`
- `Escalation flag`

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
- `exam_cram` -- One-shot; return one seeded cue, one learner tweak, one distortion guard, and an explicit escalation call if the hook is weak.
- `deep_mastery` -- Interactive; guide the lite cue build, stress the 60-second constraint, and show exactly when to escalate to the full KWIK method.
- `quick_review` -- One-shot refresh; present the artifact as a Seed | Learner tweak | Final hook | Escalate? table.
- `clinical_bridge` -- Stepwise; use a compact cue-risk-action grid so the hook stays tied to correct applied meaning.

## Runtime Prompt
```text
You are running M-HOOK-002 (KWIK Lite) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: KWIKLiteSeed, LearnerOwnershipAction, FinalHook, DistortionGuard, and EscalationFlag if needed.
Build one lightweight hook only after meaning is stable. Seed one cue, require one learner personalization move, record the final hook with a distortion guard, and escalate if no clean hook lands inside the 60-second cap.
Preset behavior:
- exam_cram: one-shot; seed, tweak, final hook, distortion guard, escalation call.
- deep_mastery: interactive; guided lite build with explicit 60-second escalation logic.
- quick_review: one-shot refresh; Seed | Learner tweak | Final hook | Escalate? table.
- clinical_bridge: stepwise; cue-risk-action grid tied back to correct applied meaning.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves seed -> learner tweak -> guard/escalation and waits.
```

## Evidence
- **Citation:** Bellezza (1981); Pressley, Levin, and Delaney (1982); Chiu and Hawkins (2023); Mocko, Wagler, and Lesser (2024)
- **Finding:** KWIK Lite is best supported as a constrained mnemonic shortcut for already-stable meaning, not as a replacement for the full hook-building workflow. Keyword-method and mnemonic reviews support brief verbal-plus-image hooks for bounded recall targets, but the same literature also shows that weak or externally imposed cues can distort meaning or fail to stick. The practical implication for this lite method is to seed only one lightweight cue, require one learner ownership move, keep a visible distortion guard, and escalate quickly when the hook does not stabilize within the time cap.
- **Source:** `https://doi.org/10.3102/00346543051002247`; `https://doi.org/10.3102/00346543052001061`; `https://doi.org/10.23971/jefl.v13i2.6313`; `https://doi.org/10.1080/26939169.2024.2334905`
- **Needs research:** `false`

## Related Methods
- [[M-HOOK-001]] -- Escalate here when the lite cue fails to stabilize inside the time cap
- [[M-GEN-001]] -- Use when the learner needs a fuller self-generated encoding cue instead of a fast mnemonic seed

## Changelog
- **v1.2** -- production hardening pass: upgraded the evidence stack to stronger lightweight mnemonic cueing grounded in stable meaning sources, added the standard knob schema plus four distinct presets, tightened the runtime prompt, rebuilt the markdown note into the current template, and preserved the original method logic, steps, outputs, and constraints.

### Summary of Changes
- Upgraded the Evidence section with stronger and more relevant citations.
- Made `exam_cram`, `deep_mastery`, `quick_review`, and `clinical_bridge` produce clearly distinct behavior and output formats.
- Tightened the facilitation prompt so it is shorter, less redundant, and preset-explicit.
- Added the current template sections and synchronized the markdown note with the YAML metadata.
- Bumped the version from `v1.0` to `v1.2` without changing the core teaching flow.

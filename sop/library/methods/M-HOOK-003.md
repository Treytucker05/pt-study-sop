---
id: M-HOOK-003
name: Jingle / Rhyme Hook
stage: ENCODE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-HOOK, encode]
---

# M-HOOK-003 -- Jingle / Rhyme Hook

## Summary
Compress a fixed ordered list or stable sequence into a short jingle or rhyme. Learner must attempt their own compression BEFORE the AI offers one. Check for interference with existing hooks before finalizing. The method compresses an ordered list into a short repeatable cadence, then maps every fragment back to the real sequence before locking it.

**Not for:** This is not for teaching the whole concept from scratch, replacing source truth, or turning a mnemonic into a false fact claim.

## Core Steps
1. **The Sequence And Confirm Meaning** -- State the sequence and confirm meaning of each item
2. **The Learner To Attempt Their** -- Ask the learner to attempt their own rhyme or cadence
3. **If Learner Is Stuck Offer** -- If learner is stuck, offer one AI-authored jingle as a scaffold
4. **The Hook Back To The** -- Map the hook back to the real sequence explicitly
5. **For Interference With Existing Hooks** -- Check for interference with existing hooks
6. **One Distortion Risk Or Simplification** -- State one distortion risk or simplification limit

## Inputs
- Fixed sequence or ordered list
- Plain-language meaning of each step
- List of existing hooks for interference check (if any)

## Required Outputs
- `Sequence statement`
- `Learner attempt`
- `Jingle or rhyme hook`
- `Hook-to-sequence map`
- `Interference check result`
- `Distortion warning`

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
- `exam_cram` -- One-shot; deliver one short rhyme or cadence, the hook-to-sequence map, and one interference warning.
- `deep_mastery` -- Interactive; build the learner attempt first, refine the cadence, and finish with an explicit interference and distortion check.
- `quick_review` -- One-shot refresh; show Sequence item | Jingle fragment | Real meaning in a compact table.
- `clinical_bridge` -- Stepwise; use a cadence-to-action grid so each phrase fragment points to the correct practical step or cue.

## Runtime Prompt
```text
You are running M-HOOK-003 (Jingle / Rhyme Hook) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: SequenceStatement, LearnerAttempt, FinalJingleOrRhyme, HookSequenceMap, InterferenceCheck, and DistortionWarning.
Compress one fixed ordered list into a short repeatable cadence. Require a learner attempt first, offer one scaffold only if needed, map every phrase fragment back to the real sequence, and check for interference before locking the hook.
Preset behavior:
- exam_cram: one-shot; one short cadence, hook map, and interference warning.
- deep_mastery: interactive; learner attempt first, refined cadence, explicit interference and distortion check.
- quick_review: one-shot refresh; Sequence item | Jingle fragment | Real meaning table.
- clinical_bridge: stepwise; cadence-to-action grid for applied sequences.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves sequence -> learner attempt -> map -> interference check and waits.
```

## Evidence
- **Citation:** Wallace (1994); Rainey and Larsen (2002); Ludke, Ferreira, and Overy (2014)
- **Finding:** Jingle / Rhyme Hook is best supported as a melody-and-rhythm mnemonic for ordered verbal material when the pattern is short, repeated, and explicitly mapped back to the target sequence. Research on sung or melodic text recall shows that melody can improve verbatim or ordered recall when the tune is simple enough to be learned and reused, while later language-learning work shows that singing or rhythmic repetition can outperform plain speech on some recall tasks. The practical implication for this method is to keep the cadence compact, require a learner attempt first, map every phrase fragment back to a real item, and check for hook interference before locking the final jingle.
- **Source:** `https://doi.org/10.1037/0278-7393.20.6.1471`; `https://doi.org/10.1525/mp.2002.20.2.173`; `https://doi.org/10.3758/s13421-013-0342-5`
- **Needs research:** `false`

## Related Methods
- [[M-HOOK-001]] -- Use when the target needs a richer visual-sound hook instead of a rhythm-only compression
- [[M-OVR-003]] -- Use when the memorized sequence should be drilled later in timed mixed practice

## Changelog
- **v1.2** -- production hardening pass: upgraded the evidence stack to stronger melody, rhythm, and ordered verbal recall sources, added the standard knob schema plus four distinct presets, tightened the runtime prompt, rebuilt the markdown note into the current template, and preserved the original method logic, steps, outputs, and constraints.

### Summary of Changes
- Upgraded the Evidence section with stronger and more relevant citations.
- Made `exam_cram`, `deep_mastery`, `quick_review`, and `clinical_bridge` produce clearly distinct behavior and output formats.
- Tightened the facilitation prompt so it is shorter, less redundant, and preset-explicit.
- Added the current template sections and synchronized the markdown note with the YAML metadata.
- Bumped the version from `v1.0` to `v1.2` without changing the core teaching flow.

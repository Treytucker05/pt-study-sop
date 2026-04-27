---
id: M-HOOK-001
name: KWIK Hook
stage: ENCODE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-HOOK, encode]
---

# M-HOOK-001 -- KWIK Hook

## Summary
Structured 6-step encoding protocol for new terms and concepts. Start by turning the word into something it sounds like, state the real meaning/function, create a picture for the meaning, link the sound-picture to the meaning-picture, personalize it so it sticks, then lock it as a reusable note/card. Each step is gated — do not skip ahead. The method forces learner-generated cue selection before tutor help and ends with a reusable locked hook plus distortion guard.

**Not for:** This is not for teaching the whole concept from scratch, replacing source truth, or turning a mnemonic into a false fact claim.

## Core Steps
1. **Word Sound** -- Word Sound: Turn the word into something it sounds like
2. **Real Meaning** -- Real Meaning: State the true meaning or function in one sentence
3. **Meaning Picture** -- Meaning Picture: Create a vivid picture that shows what the term means or does
4. **Link** -- Link: Connect the sound-picture to the meaning-picture in one vivid scene
5. **Personalize** -- Personalize: Add emotion, absurdity, or personal relevance and say why it clicks
6. **Lock** -- Lock: Record the hook as an Anki card or session log entry

## Inputs
- New term or concept to encode
- Definition or meaning from source material
- Blank note area for hook creation

## Required Outputs
- `KWIK hook (sound cue + meaning link scene)`
- `Session log entry`

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
- `exam_cram` -- One-shot; return one clean hook block with sound cue, meaning link, and a one-line distortion guard.
- `deep_mastery` -- Interactive; walk all six steps, keep the learner-owned cue explicit, and include the optional card lock at the end.
- `quick_review` -- One-shot refresh; present the hook as a compact Sound | Meaning | Link | Lock table.
- `clinical_bridge` -- Stepwise; tie the hook to an applied cue-to-action or red-flag use case so the mnemonic points back to correct use.

## Runtime Prompt
```text
You are running M-HOOK-001 (KWIK Hook) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: KWIK hook, optional Anki card draft if requested, and Session log entry.
Build one full mnemonic by getting a learner-made sound cue first, stating the real meaning, creating a meaning picture, linking the sound and meaning scenes, personalizing the hook, and locking it with a distortion guard.
Preset behavior:
- exam_cram: one-shot; one clean hook block plus one-line distortion guard.
- deep_mastery: interactive; full six-step build with explicit learner ownership and optional card lock.
- quick_review: one-shot refresh; compact Sound | Meaning | Link | Lock table.
- clinical_bridge: stepwise; cue-to-action or red-flag hook tied back to correct use.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves sound cue -> meaning -> link scene -> lock and waits.
```

## Evidence
- **Citation:** Bellezza (1981); Pressley, Levin, and Delaney (1982); Chiu and Hawkins (2023); Mocko, Wagler, and Lesser (2024)
- **Finding:** KWIK Hook is best supported as a keyword-style mnemonic method that works when the learner builds an explicit sound cue, meaning image, and linking scene rather than memorizing a tutor-authored slogan. Mnemonic reviews and keyword-method research support interactive verbal-plus-image hooks for bounded recall targets, and newer classroom work shows that mnemonic gains are strongest when the learner actually generates or meaningfully personalizes the cue. The practical implication for this method is to force a learner attempt first, keep the target concept stable before hooking it, tie the sound cue back to the true meaning, and lock the final hook with a short distortion guard so the mnemonic does not replace the concept itself.
- **Source:** `https://doi.org/10.3102/00346543051002247`; `https://doi.org/10.3102/00346543052001061`; `https://doi.org/10.23971/jefl.v13i2.6313`; `https://doi.org/10.1080/26939169.2024.2334905`
- **Needs research:** `false`

## Related Methods
- [[M-HOOK-002]] -- Use when the same target only needs a fast lightweight cue instead of the full KWIK build
- [[M-OVR-002]] -- Use when the final hook should be converted into an Anki card artifact

## Changelog
- **v1.2** -- production hardening pass: upgraded the evidence stack to stronger keyword mnemonics, dual coding, and learner-generated cueing sources, added the standard knob schema plus four distinct presets, tightened the runtime prompt, rebuilt the markdown note into the current template, and preserved the original method logic, steps, outputs, and constraints.

### Summary of Changes
- Upgraded the Evidence section with stronger and more relevant citations.
- Made `exam_cram`, `deep_mastery`, `quick_review`, and `clinical_bridge` produce clearly distinct behavior and output formats.
- Tightened the facilitation prompt so it is shorter, less redundant, and preset-explicit.
- Added the current template sections and synchronized the markdown note with the YAML metadata.
- Bumped the version from `v1.0` to `v1.2` without changing the core teaching flow.

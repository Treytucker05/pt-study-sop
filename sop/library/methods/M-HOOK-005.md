---
id: M-HOOK-005
name: Chain Linking
stage: ENCODE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-HOOK, encode]
---

# M-HOOK-005 -- Chain Linking

## Summary
Create a bizarre narrative story connecting unrelated items. The absurdity makes it memorable without spatial locations. The method links items through a bizarre but ordered story, then tests the chain for breaks instead of assuming the narrative automatically holds.

**Not for:** This is not for teaching the whole concept from scratch, replacing source truth, or turning a mnemonic into a false fact claim.

## Core Steps
1. **List Items In Order** -- List items in order
2. **Vivid Image For Item 1** -- Create vivid image for item 1
3. **Item 1 To 2 With** -- Connect item 1 to 2 with absurd interaction
4. **Continue Linking Each Item** -- Continue linking each item
5. **Walk Through The Story** -- Walk through the story
6. **Retrieval By Pulling The Chain** -- Test retrieval by "pulling the chain

## Inputs
- List of items to memorize in order
- Creativity for bizarre connections

## Required Outputs
- `Bizarre story narrative`
- `Retrieval success rate`
- `Weak links (breaks in chain)`

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
- `exam_cram` -- One-shot; return one concise bizarre story, one retrieval pass, and one weak-link note.
- `deep_mastery` -- Interactive; build the chain link by link, test the story walk, and repair weak transitions before locking the narrative.
- `quick_review` -- One-shot refresh; show Item | Link scene | Retrieval cue in a compact table.
- `clinical_bridge` -- Stepwise; use a story-to-action chain where each link points to the next practical step or consequence.

## Runtime Prompt
```text
You are running M-HOOK-005 (Chain Linking) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Bizarre story narrative, Retrieval success rate, and Weak links.
Encode one ordered set by linking each item to the next through a vivid absurd interaction, then walk the story to find and record any breaks in the chain.
Preset behavior:
- exam_cram: one-shot; concise bizarre story, one retrieval pass, one weak-link note.
- deep_mastery: interactive; link-by-link build, story walk, weak-transition repair.
- quick_review: one-shot refresh; Item | Link scene | Retrieval cue table.
- clinical_bridge: stepwise; story-to-action chain for applied sequences or consequences.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves list -> link build -> story walk and waits.
```

## Evidence
- **Citation:** Bower and Clark (1969); Santa, Ruskin, and Yio (1973); Hill, Allen, and Gregory (1991); Chong, Proctor, Li, and Blocki (2019)
- **Finding:** Chain Linking is best supported as a narrative-chaining mnemonic for serial material when each item is explicitly bound to the next through a concrete interaction. Classic serial-learning studies show that story-based mediation improves recall over ordinary rehearsal, and later work suggests that story mnemonics continue to help when the links are vivid enough to sustain ordered retrieval. More recent applied work reinforces the same point: story mnemonics help because they create a connected retrieval path, but weak or generic links break the chain quickly. The practical implication for this method is to keep the sequence visible, force one strong interaction per pair, walk the whole story after construction, and log exactly where the chain fails instead of treating the narrative as self-validating.
- **Source:** `https://doi.org/10.3758/BF03332778`; `https://doi.org/10.2466/pr0.1973.32.3c.1163`; `https://doi.org/10.1037/0882-7974.6.3.484`; `https://doi.org/10.1177/1071181319631075`
- **Needs research:** `false`

## Related Methods
- [[M-HOOK-004]] -- Use when the same sequence is easier to anchor spatially than narratively
- [[M-RET-007]] -- Use when the chain should be stress-tested later with timed sprint retrieval

## Changelog
- **v1.2** -- production hardening pass: upgraded the evidence stack to stronger narrative chaining and serial recall sources, added the standard knob schema plus four distinct presets, tightened the runtime prompt, rebuilt the markdown note into the current template, and preserved the original method logic, steps, outputs, and constraints.

### Summary of Changes
- Upgraded the Evidence section with stronger and more relevant citations.
- Made `exam_cram`, `deep_mastery`, `quick_review`, and `clinical_bridge` produce clearly distinct behavior and output formats.
- Tightened the facilitation prompt so it is shorter, less redundant, and preset-explicit.
- Added the current template sections and synchronized the markdown note with the YAML metadata.
- Bumped the version from `v1.0` to `v1.2` without changing the core teaching flow.

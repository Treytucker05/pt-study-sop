---
id: M-HOOK-004
name: Memory Palace
stage: ENCODE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-HOOK, encode]
---

# M-HOOK-004 -- Memory Palace

## Summary
Use spatial memory to encode ordered sequences by associating items with familiar locations. Based on the ancient Method of Loci used by Greek orators and memory champions. The method uses fixed familiar locations for ordered recall, keeps the palace sparse, and ends with a retrieval walk plus weak-link repair.

**Not for:** This is not for teaching the whole concept from scratch, replacing source truth, or turning a mnemonic into a false fact claim.

## Core Steps
1. **A Familiar Location** -- Choose a familiar location
2. **5 10 Specific Spots In** -- Identify 5-10 specific spots in order
3. **Vivid Absurd Image For Item** -- Create vivid absurd image for item 1
4. **Place Image At Location 1** -- Place image at location 1
5. **Continue For All Items** -- Continue for all items
6. **Walk Through Palace Mentally** -- Walk through palace mentally

## Inputs
- List of items to memorize (5-10 optimal)
- Familiar location (home, route, etc.)
- Imagination for vivid imagery

## Required Outputs
- `Mental palace with placed items`
- `Retrieval accuracy check`
- `Weak links identified`

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
- `exam_cram` -- One-shot; build a 5-locus micro-palace with item placements and one quick retrieval walk.
- `deep_mastery` -- Interactive; map 8-10 loci, refine the images, and run a fuller retrieval walk with weak-link repair notes.
- `quick_review` -- One-shot refresh; present Locus | Image | Item | Weak link? in a compact table.
- `clinical_bridge` -- Stepwise; use a route-to-action grid so each locus anchors a practical step, red flag, or ordered decision point.

## Runtime Prompt
```text
You are running M-HOOK-004 (Memory Palace) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Mental palace with placed items, Retrieval accuracy check, and Weak links identified.
Encode one ordered sequence with a fixed familiar route, one vivid image per locus, and a final retrieval walk that exposes weak placements before the palace is locked.
Preset behavior:
- exam_cram: one-shot; 5-locus micro-palace and one quick retrieval walk.
- deep_mastery: interactive; 8-10 loci, refined images, fuller retrieval walk, weak-link repair notes.
- quick_review: one-shot refresh; Locus | Image | Item | Weak link? table.
- clinical_bridge: stepwise; route-to-action grid for applied ordered steps or red flags.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves route -> placements -> retrieval walk and waits.
```

## Evidence
- **Citation:** Bellezza (1981); Dresler et al. (2017); Gross, Rebok, Unverzagt, Willis, and Brandt (2014); Wagner et al. (2021)
- **Finding:** Memory Palace is best supported as a method-of-loci strategy for ordered recall when the learner uses a fixed familiar route and one vivid image per locus. Mnemonic reviews identify loci as especially well suited to serial-order learning, and modern training studies show that method-of-loci practice can produce large recall gains and more durable memory in ordinary learners, not just memory athletes. The practical implication for this method is to keep the route stable, limit the number of loci, place one strong image at each stop, and finish with an explicit walk-through that exposes weak links before the sequence is trusted.
- **Source:** `https://doi.org/10.3102/00346543051002247`; `https://doi.org/10.1016/j.neuron.2017.02.003`; `https://doi.org/10.1080/0361073X.2014.882204`; `https://doi.org/10.1126/sciadv.abc7606`
- **Needs research:** `false`

## Related Methods
- [[M-HOOK-005]] -- Use when the sequence needs narrative chaining rather than spatial placement
- [[M-OVR-003]] -- Use when the palace sequence should be turned into a later drill sheet

## Changelog
- **v1.2** -- production hardening pass: upgraded the evidence stack to stronger method of loci and spatial mnemonic training sources, added the standard knob schema plus four distinct presets, tightened the runtime prompt, rebuilt the markdown note into the current template, and preserved the original method logic, steps, outputs, and constraints.

### Summary of Changes
- Upgraded the Evidence section with stronger and more relevant citations.
- Made `exam_cram`, `deep_mastery`, `quick_review`, and `clinical_bridge` produce clearly distinct behavior and output formats.
- Tightened the facilitation prompt so it is shorter, less redundant, and preset-explicit.
- Added the current template sections and synchronized the markdown note with the YAML metadata.
- Bumped the version from `v1.0` to `v1.2` without changing the core teaching flow.

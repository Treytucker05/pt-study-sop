---
id: M-TEA-001
name: Story Spine
stage: EXPLAIN
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-TEA, explain]
---

# M-TEA-001 -- Story Spine

## Summary
Teach a sequence or pathway as a compact story with a beginning state, trigger, causal progression, consequence, and application breakpoint. The method stays on one bounded pathway, uses causal progression instead of ornamental storytelling, and ends by translating back to formal source terms.

**Not for:** Not for open-ended brainstorming, scoring, or broad coverage of unrelated material. Use an ORIENT method when the learner first needs orientation or objective framing.

## Core Steps
1. **Beginning State** -- State the beginning state and trigger
2. **Causal Sequence** -- Walk the sequence as a causal story
3. **Endpoint** -- Mark the main consequence or endpoint
4. **Breakpoint** -- Add one application breakpoint or failure point
5. **Formal Terms** -- Return to the formal mechanism terms

## Inputs
- Source material loaded in chat
- Target concept, process, or comparison to teach
- Learner familiarity signal or prerequisite anchor

## Required Outputs
- `Story spine`
- `Ordered step list`
- `Clinical breakpoint`

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
- `exam_cram` -- One-shot; return 4-5 terse story beats, one breakpoint, and one formal mechanism restatement line.
- `deep_mastery` -- Interactive; use labeled sections, make the causal transitions explicit, and pause before the final source-term restatement.
- `quick_review` -- One-shot refresh; compress the sequence into a Beat | Why it leads | Formal term table plus one carry-forward cue.
- `clinical_bridge` -- Stepwise; render the pathway as an applied sequence grid with trigger, consequence, breakpoint, and practical implication columns.

## Runtime Prompt
```text
You are running M-TEA-001 (Story Spine) in the EXPLAIN stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Story spine, Ordered step list, Clinical breakpoint, and Source-backed mechanism restatement.
Teach one bounded pathway by stating the beginning state and trigger, walking the causal progression, naming the consequence, adding one breakpoint, and translating back to source terms.
Preset behavior:
- exam_cram: one-shot; terse story beats plus one breakpoint and one formal restatement.
- deep_mastery: interactive; labeled sections with explicit causal transitions before the final formal restatement.
- quick_review: one-shot refresh; compact Beat | Why it leads | Formal term table.
- clinical_bridge: stepwise; applied sequence grid with trigger, consequence, breakpoint, and practical implication.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves start state -> sequence -> breakpoint -> formal restatement and waits.
```

## Evidence
- **Citation:** van den Broek (1981); Reiser, Novak, McGill, and Penuel (2021); Chen and Bornstein (2024)
- **Finding:** Story Spine is best supported as a coherence-building explanation method that helps learners hold a causal sequence together when the narrative structure tracks the real mechanism. Story-comprehension work shows that causal links are central to building a stable representation of events, and storyline-based instructional work shows that learners follow an explanation more effectively when they can see why the sequence moves from one focus to the next. Recent narrative-memory review work sharpens the same point: causal coherence, not decorative storytelling, is what supports comprehension and recall. The practical implication for this method is to keep the story spine short, map each beat to a real causal step, and finish by translating the story back into formal mechanism terms so the narrative remains a bridge rather than a substitute.
- **Source:** `https://doi.org/10.1016/S0079-7421(08)60177-2`; `https://doi.org/10.1080/1046560X.2021.1884784`; `https://doi.org/10.1016/j.tics.2024.04.003`
- **Needs research:** `false`

## Related Methods
- [[M-TEA-004]] -- Use when the concept needs a modality switch rather than a causal story spine
- [[M-INT-005]] -- Escalate when the learner needs a fuller case walkthrough after the bounded story pass

## Changelog
- **v1.2** -- production hardening pass: upgraded the evidence stack to stronger narrative coherence and causal sequence teaching sources, added the standard knob schema plus four distinct presets, tightened the runtime prompt, rebuilt the markdown note into the current template, and preserved the original method logic, steps, outputs, and constraints.

### Summary of Changes
- Upgraded the Evidence section with stronger and more relevant citations.
- Made `exam_cram`, `deep_mastery`, `quick_review`, and `clinical_bridge` produce clearly distinct behavior and output formats.
- Tightened the facilitation prompt so it is shorter, less redundant, and preset-explicit.
- Added the current template sections and synchronized the markdown note with the YAML metadata.
- Bumped the version from `v1.0` to `v1.2` without changing the core teaching flow.

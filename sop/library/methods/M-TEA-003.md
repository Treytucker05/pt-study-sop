---
id: M-TEA-003
name: Clinical Anchor Mini-Case
stage: EXPLAIN
status: draft
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-TEA, explain]
---

# M-TEA-003 — Clinical Anchor Mini-Case

## Summary
Use one tiny example scene to show why the concept matters practically without turning the block into a full case drill. The method stays on one bounded concept, uses the scene as an anchor rather than a full reasoning exercise, and ends with one limit on overgeneralizing the case.

**Not for:** open-ended brainstorming, scoring, or broad coverage of unrelated material. Use an `ORIENT` method when the learner first needs orientation or objective framing.

## Core Steps
1. **Opening Step** — state the concept in plain language
2. **Example Scene** — give one tiny example scene
3. **Tie-Back** — connect the scene to what the concept changes in noticing or action
4. **Boundary** — name one limit on overgeneralizing the case

## Inputs
- Source material loaded in chat
- Target concept, process, or comparison to teach
- Learner familiarity signal or prerequisite anchor (optional)

## Required Outputs
- `Mini-case scene`
- `Concept-to-case link`
- `Clinical significance statement`

Additional built-in outputs:
- `Overgeneralization boundary`

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
    output_layout: bullets
    explanation_density: lean
  clinical_bridge:
    guidance_level: medium
    delivery_mode: stepwise
    fade_intensity: adaptive_light
    output_layout: table
    explanation_density: focused
```

## Preset Behavior
- `exam_cram` — one-shot, terse anchor. Keep the scene to 2-3 sentences, make the link and significance one-liners, and end with a short boundary built for last-minute review.
- `deep_mastery` — interactive, labeled-section anchor. Keep the same outputs, add one brief cue-to-concept-to-action chain, and pause after the scene so the learner can confirm what the anchor is doing before the tie-back.
- `quick_review` — one-shot refresh anchor. Assume prior exposure, compress the scene to a cue sketch, and spend most of the space on the concept-to-case link and the overgeneralization boundary.
- `clinical_bridge` — stepwise applied anchor. Render the case as a compact cue table with finding, implication, action, and limit language so it supports fast real-world discrimination without becoming a full workup.

## Runtime Prompt
```text
You are running M-TEA-003 (Clinical Anchor Mini-Case) in the EXPLAIN stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Mini-case scene, Concept-to-case link, Clinical significance statement, and Overgeneralization boundary.
Teach one bounded concept with one compact clinically relevant scene. State the concept plainly, show one tiny case, tie the scene back to what the concept changes in noticing or action, and end with one boundary on overgeneralizing.
Preset behavior:
- exam_cram: one-shot; 2-3 sentence scene; one-line link, significance, and boundary.
- deep_mastery: interactive; labeled sections; add one brief cue-to-concept-to-action line and pause after the scene before the tie-back.
- quick_review: one-shot refresh; compress the scene to a cue sketch and focus on the link plus the boundary.
- clinical_bridge: stepwise; use a compact cue table with finding, implication, action, and limit language.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves scene -> tie-back -> boundary and waits.
```

## Evidence
- **Citation:** The Cognition and Technology Group at Vanderbilt (1990); Thistlethwaite, Davies, Ekeocha, Kidd, Macdougall, Matthews, Purkis, and Clay (2012); Moghadami, Amini, Moghadami, Dalal, and Charlin (2021); Xu, Ang, Soh, and Ponnamperuma (2021); Wark, Drovandi, McGee, Alele, Mwangi, and Malau-Aduli (2025)
- **Finding:** Clinical Anchor Mini-Case is best supported as a bounded explanatory anchor, not as a stand-alone case drill. Anchored-instruction theory supports using a realistic but compact scene to make knowledge usable in context, while case-based-learning reviews show that cases are helpful for relevance and engagement but have heterogeneous outcome evidence when treated as a broad pedagogy. Stronger direct support comes from clinical-reasoning studies: illness-script and other structured reasoning interventions improve diagnostic reasoning when learners compare salient case cues against organized conceptual structure instead of just hearing a story. The practical implication for this method is to keep the scene sparse, make the cue-to-concept link explicit, and end with one limit on overgeneralizing rather than inflating the vignette into full case-based reasoning.
- **Source:** `https://doi.org/10.3102/0013189X019006002`; `https://doi.org/10.3109/0142159X.2012.680939`; `https://doi.org/10.1186/s12909-021-02522-0`; `https://doi.org/10.1007/s11606-021-06916-0`; `https://doi.org/10.5334/pme.1986`
- **Needs research:** `false`

## Related Methods
- [[M-TEA-001]] — Use if a story bridge is more useful than a case
- [[M-TEA-008]] — Use if the learner needs fading support after the case

## Changelog
- **v1.2** — upgraded the evidence stack to stronger anchored-instruction, case-based-learning, and clinical-reasoning sources; migrated the method to the stage-first `EXPLAIN` architecture; replaced the legacy knob block with the standard schema plus distinct presets; tightened the runtime prompt; rebuilt the markdown note into the current template structure; and preserved the original method logic, steps, outputs, and constraints.

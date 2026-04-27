---
id: M-INT-003
name: Cross-Topic Link
stage: INTERROGATE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-INT, interrogate]
---

# M-INT-003 — Cross-Topic Link

## Summary
Connect the current topic to other domains by naming 2-3 strong links, explaining why they hold, and extracting the shared principles beneath them. The method stays active, pushes past loose thematic overlap, and turns fragmented knowledge into reusable cross-domain rules.

**Not for:** first exposure, direct lecturing, or introducing brand-new material that has not already been encoded.

## Core Steps
1. **State the Current Topic** — name the current topic clearly
2. **Brainstorm Cross-Course Candidates** — generate possible links to other domains
3. **Pick the Strongest Links** — choose 2-3 links based on real shared structure or mechanism
4. **Explain Each Link** — write one because-sentence per connection
5. **Name the Shared Principle** — identify the general rule underlying each connection

## Inputs
- Current topic
- Access to previous course notes (optional)

## Required Outputs
- `Cross-topic connection list (2-3 connections)`
- `Explanatory sentences (each with a because clause)`
- `Shared principles identified for each connection`

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
- `exam_cram` — one-shot, fastest linkage pass. Return 2 concise cross-topic links, 2 because-sentences, and 2 shared-principle bullets.
- `deep_mastery` — interactive, full integration pass. Build 3 links, explain each one in fuller prose, and include a dedicated section on why the shared principle matters across courses.
- `quick_review` — one-shot refresh linkage pass. Use a compact table with `current topic | linked topic | because | shared principle` columns.
- `clinical_bridge` — stepwise applied linkage pass. Anchor the links to patient care or clinical reasoning by showing how anatomy, physiology, pathology, or treatment logic converge in practice.

## Runtime Prompt
```text
You are running M-INT-003 (Cross-Topic Link) in the INTERROGATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Cross-topic connection list, Explanatory sentences, and Shared principles.
Build 2-3 meaningful links between the current topic and other domains, explain each one with a because-clause, and name the shared principle without turning the run into a lecture or a loose brainstorm.
Preset behavior:
- exam_cram: one-shot; 2 terse links; because-sentences; principle bullets.
- deep_mastery: interactive; 3 fuller links with a dedicated shared-principle section.
- quick_review: one-shot refresh; compact connection table.
- clinical_bridge: stepwise; cross-domain links tied to patient care or clinical reasoning.
If no preset is specified, use the default knobs. One-shot returns the full linkage artifact in one bounded reply; interactive or stepwise mode moves topic -> candidates -> links -> principles and waits.
```

## Evidence
- **Citation:** Barnett and Ceci (2002); Richland and Simms (2015); Lehmann, Rott, and Schmidt-Borcherding (2019); Fries, Son, Givvin, et al. (2021); Lehmann (2022)
- **Finding:** Cross-Topic Link is best supported as an explicit knowledge-integration and transfer method, not as a loose brainstorming exercise. Far-transfer research and analogy-informed learning theory both suggest that flexible use of knowledge depends on seeing structural relationships across contexts rather than storing topics as isolated units. More recent instructional and integration work also suggests that learners build more coherent knowledge when connections are made explicit, practiced repeatedly, and explained rather than merely noticed. The practical implication for this method is to require 2-3 concrete links, force a because-clause for each one, and name the shared principle so the learner leaves with a reusable cross-domain rule rather than a vague association.
- **Source:** `https://doi.org/10.1037/0033-2909.128.4.612`; `https://doi.org/10.1002/wcs.1336`; `https://doi.org/10.1007/s11251-018-9472-2`; `https://doi.org/10.1007/s10648-020-09561-x`; `https://doi.org/10.1007/s10212-021-00577-7`
- **Needs research:** `false`

## Related Methods
- [[M-ORG-001]] — Concept map fallback for networked links
- [[M-INT-001]] — Analogy bridge cousin method
- [[M-INT-004]] — Comparison fallback if the links are confusion-driven

## Changelog
- **v1.1** — migrated the method to the stage-first `INTERROGATE` architecture, normalized metadata naming, and preserved the original cross-topic linking flow.
- **v1.2** — upgraded the evidence stack to stronger transfer, knowledge-integration, and explicit-connection sources; replaced the legacy note layout with the current template; added the standard knob schema plus four distinct presets; tightened the runtime prompt; and preserved the original method logic, steps, outputs, and constraints.

### Summary of Changes
- Reframed the method as explicit knowledge integration rather than generic “big-picture linking.”
- Replaced the weak single-source evidence stub with stronger far-transfer, knowledge-integration, and explicit-connection citations.
- Added the standard knob schema and made all four presets behaviorally distinct by number of links, output shape, and applied-vs-general integration surface.
- Tightened the facilitation prompt so it is shorter, less redundant, and explicit about preset behavior.
- Rebuilt the markdown note into the current production template without changing the core cross-topic-link flow.

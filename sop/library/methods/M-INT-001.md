---
id: M-INT-001
name: Analogy Bridge
stage: INTERROGATE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-INT, interrogate]
---

# M-INT-001 — Analogy Bridge

## Summary
Use one familiar source domain to interrogate an already-encoded concept through structured analogy. The method stays active, makes the mapping explicit, and ends by naming where the analogy fails so the learner does not mistake the bridge for the concept itself.

**Not for:** first exposure, direct lecturing, or introducing brand-new material that has not already been encoded.

## Core Steps
1. **Name the Target Concept** — state the concept you want to understand better
2. **Choose a Familiar Source Domain** — find a familiar domain with similar structure
3. **Map the Analogy** — build `A is to B as X is to Y` with at least 3 correspondences
4. **Test the Edges** — identify where the analogy breaks down
5. **Convert Breakdown Into Insight** — state what the failure points teach about the real concept

## Inputs
- Concept to analogize
- Familiar domain for comparison

## Required Outputs
- `Analogy statement (A is to B as X is to Y)`
- `Mapping table (3+ correspondences)`
- `Breakdown points (where analogy fails and what that teaches)`

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
- `exam_cram` — one-shot, fastest bridge. Return one tight analogy, 3 mapped correspondences, 1 breakdown point, and 1 one-line return-to-concept note.
- `deep_mastery` — interactive, fuller bridge. Walk the concept, source domain, 4-6 correspondences, and 2 breakdown points in sequence, then state exactly what the analogy does and does not capture.
- `quick_review` — one-shot refresh bridge. Use a compact table with `target role | familiar analog | caution` columns plus a minimal analogy statement.
- `clinical_bridge` — stepwise applied bridge. Choose an analogy that supports a real-world or clinical cue, map the correspondences in a cue table, and make the breakdowns explicit so the learner does not overextend the analogy in practice.

## Runtime Prompt
```text
You are running M-INT-001 (Analogy Bridge) in the INTERROGATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Analogy statement, Mapping table, and Breakdown points.
Build one analogy for an already-encoded concept, map at least 3 structural correspondences, test where the analogy fails, and return to the real concept without turning the run into a lecture or quiz.
Preset behavior:
- exam_cram: one-shot; 1 tight analogy; 3 mappings; 1 breakdown; terse bullets.
- deep_mastery: interactive; 4-6 correspondences; 2 breakdowns; explicit return-to-concept section.
- quick_review: one-shot refresh; compact mapping table with minimal prose.
- clinical_bridge: stepwise; cue-focused analogy table with practical breakdown warnings.
If no preset is specified, use the default knobs. One-shot returns the full bridge artifact in one bounded reply; interactive or stepwise mode moves concept -> source domain -> mapping -> breakdown -> takeaway and waits.
```

## Evidence
- **Citation:** Gentner (1983); Harrison and Treagust (1993); Richland and McDonough (2010); Alfieri, Nokes-Malach, and Schunn (2013); Richland and Simms (2015)
- **Finding:** Analogy Bridge is best supported as a structured comparison method that helps learners align relational structure, not as a shortcut that makes a concept true by resemblance. Structure-mapping theory and later analogy research support explicit relational mapping over surface-feature matching, and case-comparison evidence shows that comparing aligned examples or analogs can improve conceptual learning and transfer. Educational reviews and classroom studies also show the main risk: analogies mislead when the source is only superficially familiar or when unshared attributes are left implicit. The practical implication for this method is to choose one structurally aligned familiar domain, require explicit correspondences, and always end by naming at least one breakdown point and what it teaches about the real concept.
- **Source:** `https://doi.org/10.1207/s15516709cog0702_3`; `https://doi.org/10.1002/tea.3660301010`; `https://doi.org/10.1016/j.cedpsych.2009.09.001`; `https://doi.org/10.1080/00461520.2013.775712`; `https://doi.org/10.1002/wcs.1336`
- **Needs research:** `false`

## Related Methods
- [[M-INT-003]] — Cross-topic transfer cousin method
- [[M-GEN-002]] — Teach-back fallback if the analogy needs explanation
- [[M-INT-004]] — Comparison fallback for discrimination

## Changelog
- **v1.1** — migrated the method to the stage-first `INTERROGATE` architecture, normalized metadata naming, and preserved the original analogy-mapping flow.
- **v1.2** — upgraded the evidence stack to stronger analogy, comparison, and classroom analogy-instruction sources; replaced the legacy note layout with the current template; added the standard knob schema plus four distinct presets; tightened the runtime prompt; and preserved the original method logic, steps, outputs, and constraints.

### Summary of Changes
- Reframed the method as structured relational mapping rather than generic “creative analogy.”
- Replaced the weak single-source evidence stub with stronger structure-mapping, comparison, and classroom analogy-instruction citations.
- Added the standard knob schema and made all four presets behaviorally distinct by analogy density, mapping surface, and output format.
- Tightened the facilitation prompt so it is shorter, less redundant, and explicit about preset behavior.
- Rebuilt the markdown note into the current production template without changing the core analogy-bridge flow.

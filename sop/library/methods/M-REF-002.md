---
id: M-REF-002
name: Mastery Loop
stage: REFERENCE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-REF, reference]
---

# M-REF-002 — Mastery Loop

## Summary
Run a short successive-relearning loop on recent misses by restudying briefly, re-testing immediately, and tracking how many loops each item needs. The method stays artifact-first, turns relearning effort into usable spacing data, and avoids drifting into either long review or generic “try again later” advice.

**Not for:** quizzing the learner or introducing new material. Use `RETRIEVE` when the goal is memory testing and `TEACH` when the goal is explanation.

## Core Steps
1. **Identify the Mastery Targets** — gather the recent misses that need repair
2. **Re-study One Missed Item** — run a brief focused restudy pass
3. **Immediately Re-test It** — check closed-note recall right away
4. **Mark the Next Loop** — move on or send the item around again
5. **Revisit Unresolved Items** — keep looping until each item is repaired or clearly flagged
6. **Record Difficulty for Spacing** — use loop counts to identify weak anchors and next review timing

## Inputs
- List of missed items from retrieval practice
- Source materials for re-study
- Testing mechanism (flashcards, quiz, or tutor)
- Loop tracker (to count iterations)

## Required Outputs
- `Mastery achieved on all targeted items (or partial progress with time noted)`
- `Loop count per item (difficulty metric)`
- `Weak anchor list (items needing 3+ loops)`
- `Updated spacing recommendations based on loop performance`

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
- `exam_cram` — one-shot, fastest mastery pass. Track only the highest-priority misses, keep the loop log terse, and output one early-review recommendation for weak anchors.
- `deep_mastery` — interactive, full mastery pass. Keep a fuller loop ledger, record repeated-success confirmation for weak items, and produce richer spacing guidance from the final counts.
- `quick_review` — one-shot refresh pass. Use a compact per-item table with columns for item, loop count, status, and next review timing.
- `clinical_bridge` — stepwise applied pass. Frame the weak-anchor list around clinically dangerous misses or action-relevant confusions and weight spacing recommendations toward safer earlier review.

## Runtime Prompt
```text
You are running M-REF-002 (Mastery Loop) in the REFERENCE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Mastery achieved, Loop count per item, Weak anchor list, and Updated spacing recommendations.
Run a successive relearning loop on recent misses by restudying briefly, re-testing immediately, and tracking how many loops each item needs. Keep the output reusable and do not turn the block into a lecture.
Preset behavior:
- exam_cram: one-shot; terse loop log; focus on top misses; one early-review recommendation.
- deep_mastery: interactive; fuller loop ledger; repeated-success check for weak items; richer spacing guidance.
- quick_review: one-shot refresh; compact per-item mastery table.
- clinical_bridge: stepwise; weak anchors framed around clinically dangerous or action-relevant misses.
If no preset is specified, use the default knobs. One-shot returns the full mastery artifact in one bounded reply; interactive or stepwise mode moves misses -> loops -> weak anchors -> spacing and waits.
```

## Evidence
- **Citation:** Rawson and Dunlosky (2011); Rawson, Dunlosky, and Sciartelli (2013); Rawson and Dunlosky (2022); Higham, Zengel, Bartlett, and Hadwin (2022); Janes, Dunlosky, Rawson, and Jasnow (2020)
- **Finding:** Mastery Loop is best supported as a successive-relearning method, not as a vague restudy cycle. Successive relearning research shows that repeated retrieval with feedback across spaced sessions produces stronger and more durable retention than restudying alone. Classroom and course-based studies also suggest that this kind of loop can improve exam performance, retention, metacognitive calibration, and even reduce anxiety when learners repeatedly re-test after short corrective study rather than relying on one long review pass. The practical implication for this method is to keep restudy brief, re-test immediately, track how many loops each item needs, and use high loop counts to identify weak anchors that should return sooner in the spacing plan.
- **Source:** `https://doi.org/10.1037/a0023956`; `https://doi.org/10.1007/s10648-013-9240-4`; `https://doi.org/10.1177/09637214221100484`; `https://doi.org/10.1037/edu0000693`; `https://doi.org/10.1002/acp.3699`
- **Needs research:** `false`

## Related Methods
- [[M-RET-003]] — Works on missed fill-in-the-blank items
- [[M-REF-003]] — Can support relearning with a compact anchor

## Changelog
- **v1.0** — initial validated spec.
- **v1.2** — upgraded the evidence stack to stronger successive-relearning, spaced retrieval, and classroom-course implementation sources; replaced the legacy knob block with the standard schema plus four distinct presets; tightened the runtime prompt; rebuilt the markdown note into the current template; and preserved the original restudy-and-retest loop, outputs, and constraints.

### Summary of Changes
- Replaced the thin Rawson stub with a stronger stack centered on successive relearning, course-exam gains, and practical loop design.
- Reframed the method as a loop-tracked successive-relearning artifact instead of a generic restudy pass.
- Made the presets materially different by loop depth, ledger shape, and applied review-priority framing.
- Tightened the facilitation prompt so it is shorter, less redundant, and explicit about preset behavior.
- Rebuilt the markdown note into the current production template while keeping the original restudy -> re-test -> reloop flow intact.

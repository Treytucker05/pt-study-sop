---
id: M-OVR-004
name: Post-Learn Brain Dump
stage: OVERLEARN
status: core
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-OVR, overlearn]
---

# M-OVR-004 — Post-Learn Brain Dump

## Summary
Close the session with a full post-learn brain dump, compare it against the source, and patch the biggest gaps with short corrections. The method is comprehensive closure for a whole session, not topic-level retrieval sampling.

**Not for:** This is not for initial teaching, discovery, or broad remediation. Use EXPLAIN or REFERENCE first if understanding is not already present.

## Core Steps
1. **Close ALL materials —** — Close ALL materials — notes, slides, textbook, everything. Materials must be completely out of sight
2. **Set timer for 5** — Set timer for 5 minutes. Write everything you remember from this session. Stream of consciousness. Stories, facts, connections, pictures, analogies — anything that comes to mind
3. **When stuck, write "?"** — When stuck, write "?" and keep going. Gaps are data, not failures. Mark them and move on
4. **Timer ends. Open materials** — Timer ends. Open materials and compare your dump to the session content. Spend max 2 minutes on this comparison
5. **Identify gaps — what** — Identify gaps — what did you miss? What was wrong?. Circle or highlight missing items. These are priority review targets
6. **Fill gaps with brief** — Fill gaps with brief annotations (not full re-study). One-line corrections or additions only. This is gap-fill, not re-learning

## Inputs
- Completed study session (all blocks done)
- Blank paper or text area
- Timer (5 min dump + 2 min gap-fill)
- Session materials (closed during dump, opened for gap-fill)

## Required Outputs
- `Brain dump text (raw recall output)`
- `Gap list (what was missing or wrong)`
- `Gap-fill annotations (one-line corrections)`
- `Session retention estimate (percentage of material recalled)`

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
- `exam_cram` — Fastest closure. Use a 5-minute session dump, terse bullets for gaps, and one concrete fill target.
- `deep_mastery` — Fullest closure. Keep the full narrative dump, compare it carefully against the session materials, and return a richer gap-fill handoff.
- `quick_review` — Refresh closure. Use a compact Learned-Missed-Fill table plus a quick session retention estimate.
- `clinical_bridge` — Applied closure. Organize the dump as a session handoff matrix with recalled actions, missed risks, gap fills, and the next practical target.

## Runtime Prompt
```text
You are running M-OVR-004 (Post-Learn Brain Dump) in the OVERLEARN stage.
Use only the loaded source and session context. Ask only for missing required inputs.
Produce: Brain dump text, Gap list, Gap-fill annotations, and Session retention estimate.
Run one comprehensive closed-note session dump before any comparison. Keep the first pass broad and attempt-first, then compare against the session materials and patch only the biggest gaps with brief corrections.
Preset behavior:
- exam_cram: one-shot; 5-minute dump; terse gap bullets; one concrete fill target.
- deep_mastery: interactive; full narrative dump; careful compare-against-source and richer gap-fill handoff.
- quick_review: one-shot refresh; compact Learned-Missed-Fill table plus quick retention estimate.
- clinical_bridge: stepwise; applied handoff matrix with recalled actions, missed risks, gap fills, and next practical target.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves dump -> compare -> gap fill and waits.
```

## Evidence
- **Citation:** Roediger and Karpicke (2006); Yang, Luo, Vadillo, Yu, and Shanks (2021); Agarwal, Nunes, and Blunt (2021); Carter and Agarwal (2025)
- **Finding:** Post-Learn Brain Dump is best supported as a retrieval-plus-feedback closure routine that uses session-level recall to consolidate the arc of a study block and expose what still falls out after learning. Foundational testing-effect work and newer meta-analytic retrieval evidence support recall attempts over passive review, classroom retrieval reviews support brief end-of-session testing for consolidation and diagnosis, and recent instructional work supports closing with a fast evidence-generating check rather than a vague recap. The practical implication for this method is to keep the first pass closed-note and comprehensive, compare against the session materials only after the dump ends, and use one-line gap fills to sharpen the next session’s targets instead of reopening a full teaching loop.
- **Source:** `https://doi.org/10.1111/j.1467-9280.2006.01693.x; https://doi.org/10.1037/bul0000309; https://doi.org/10.1007/s10648-021-09595-9; https://doi.org/10.1177/00986283251352475`
- **Needs research:** `false`

## Related Methods
- [[M-RET-001]] — Post-learn dumps compare recall against prior retrieval output
- [[M-REF-003]] — A one-page anchor is the best comparison artifact

## Changelog
- **v1.0** — prior method draft preserved the original retrieval flow before this production hardening pass.
- **v1.2** — upgraded the evidence stack to stronger, method-relevant sources; added the standard knob schema plus four clearly distinct presets; tightened the runtime prompt; rebuilt the markdown note into the current production template; and preserved the original method logic, steps, outputs, and constraints.

## Summary of Changes
- Replaced the weak evidence block with stronger retrieval-plus-feedback and session-closure support.
- Made the presets distinct in session-dump depth and artifact style.
- Tightened the facilitation prompt into a shorter comprehensive-closure workflow with explicit preset behavior.
- Rebuilt the markdown note into the production template while preserving the original dump, compare, and fill sequence.

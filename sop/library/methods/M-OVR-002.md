---
id: M-OVR-002
name: Anki Card Draft
stage: OVERLEARN
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-OVR, overlearn]
---

# M-OVR-002 — Anki Card Draft

## Summary
Turn the session into a small set of review-ready Anki cards using cloze or basic format. The method stays focused on already-understood material, keeps the draft small enough to remain usable, and ends with a clean card artifact instead of more teaching.

**Not for:** initial teaching, discovery, or broad remediation. Use `EXPLAIN` or `CONSOLIDATE` first if understanding is not already present.

## Core Steps
1. **Review Session Notes** — identify 3-5 highest-value concepts
2. **Choose Card Format** — assign cloze or basic Q&A per concept
3. **Draft Card Fronts** — write clean prompts or cloze deletions
4. **Draft Card Backs** — keep answers concise and retrieval-friendly
5. **Add Context Tags** — attach topic, source, and date
6. **Stage Cards For Sync** — place the cards in Brain for later Anki sync
7. **Final Format Check** — ensure atomicity and exact CARD-block formatting

## Inputs
- Session notes and key concepts
- Anki card template (cloze or basic)
- Card draft staging area (Brain or text file)
- Target deck name

## Required Outputs
- `3-5 drafted Anki cards in canonical CARD block format`
- `Each card tagged by topic and source`
- `Cards staged in Brain for Anki sync`
- `Card count logged to session record`

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
- `exam_cram` — one-shot, fastest card pass. Draft 3 ultra-lean, high-yield cards, usually cloze-heavy, with minimal commentary and no extra explanation beyond what the card needs.
- `deep_mastery` — interactive, fullest card pass. Draft 5 cards with a deliberate mix of cloze and basic formats, include a short concept-selection section, and run an explicit atomicity check before the final clean CARD blocks.
- `quick_review` — one-shot refresh pass. Draft 3-4 highest-yield cards, summarize concept-to-format choices in a compact table, then print the final CARD blocks with minimal narrative.
- `clinical_bridge` — stepwise applied pass. Favor cue-to-action, discriminator, or mechanism cards over bare definition cards, prefer basic Q&A when action or consequence matters, and organize the draft as an applied review matrix before final CARD blocks.

## Runtime Prompt
```text
You are running M-OVR-002 (Anki Card Draft) in the OVERLEARN stage.
Use only the loaded source and learner context. Ask only for missing required inputs.
Produce: drafted Anki cards, card tags, staged cards, and card count log.
Draft 3-5 review-ready cards from already-understood material. Keep cards source-grounded, atomic, and format-clean; use cloze for tight facts and vocabulary, basic Q&A for why, mechanism, or process; output final cards only as canonical CARD blocks with Type, Front, Back, and Tags lines; do not drift into new teaching.
Preset behavior:
- exam_cram: one-shot; 3 ultra-lean cards; mostly cloze or direct fact locks; minimal commentary.
- deep_mastery: interactive; 5 cards; mixed cloze and basic; include a brief atomicity check before finalizing.
- quick_review: one-shot refresh; 3-4 highest-yield cards; compact concept-to-format table, then final CARD blocks.
- clinical_bridge: stepwise; 3-5 applied cue-to-action or discriminator cards; favor basic over cloze when action or consequence matters.
If no preset is specified, use the default knobs. One-shot returns the full card artifact in one bounded reply; interactive or stepwise mode moves concept selection -> format choice -> card draft -> final check and waits.
```

## Evidence
- **Citation:** Cepeda, Pashler, Vul, Wixted, and Rohrer (2006); Rohrer and Pashler (2007); Schmidmaier, Ebersbach, Schiller, Hege, Holzer, and Fischer (2011); Lin, McDaniel, and Miyatsu (2018); Pan, Zung, Imundo, Zhang, and Qiu (2023); Wothe, Wanberg, Hohle, Sakher, Bosacker, Khan, Olson, and Satin (2023); Gilbert, Frommeyer, Brittain, Stewart, Turner, Stolfi, and Parmelee (2023)
- **Finding:** Anki Card Draft is best supported as a small retrieval-heavy, spaced-review artifact for already-understood material, not as a substitute for first-pass teaching. Foundational spacing work by Cepeda and colleagues and applied guidance from Rohrer and Pashler support distributing review over time rather than cramming. Electronic flashcard studies support retesting over restudying and suggest that flashcards work best when they demand actual retrieval. Card-design studies add two important refinements: learner-generated flashcards outperform premade ones on delayed tests, and conceptual or less detail-saturated flashcards can outperform overly specific cards for some learners and materials. Recent curriculum-based studies of Anki use in medical education show positive but not universal associations with performance, which supports Anki as a strong optional review tool rather than a guaranteed advantage. The practical implication for this method is to draft a small number of source-grounded cards, keep each card clean and atomic enough for stable recall, favor learner-generated prompts, and rely on later spaced review for the real retention payoff.
- **Source:** `https://doi.org/10.1037/0033-2909.132.3.354`; `https://doi.org/10.1111/j.1467-8721.2007.00500.x`; `https://doi.org/10.1111/j.1365-2923.2011.04043.x`; `https://doi.org/10.1016/j.jarmac.2018.05.003`; `https://doi.org/10.1037/mac0000083`; `https://doi.org/10.1177/23821205231173289`; `https://doi.org/10.1007/s40670-023-01826-8`
- **Needs research:** `false`

## Related Methods
- [[M-REF-003]] — Anki cards should be grounded in a compact reference anchor
- [[M-RET-003]] — Cloze retrieval is a natural test of drafted cards

## Changelog
- **v1.1** — migrated structural metadata to the stage-first architecture: stage/category now use `OVERLEARN`, the subcategory is `anki-card-draft`, and tags were aligned to overlearning-first metadata.
- **v1.2** — upgraded the evidence stack to stronger spacing, Anki, and card-design sources; replaced the legacy note layout with the current template; added the standard knob schema plus four distinct presets; tightened the runtime prompt; and preserved the original method logic, steps, outputs, and constraints.

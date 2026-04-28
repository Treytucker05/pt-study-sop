# INTERLEAVE Category Reference

Stage: 7a of 12 (mix and contrast) | Control Stage: `INTERLEAVE`
Purpose: Mix and contrast related-but-confusable concepts within one practice block so the learner builds discrimination cues and cross-topic transfer instead of fragile single-concept recall.

## Entry / Exit

- **Entry**: At least two encoded concepts exist that are easily confused, share underlying principles, or appear together in real practice. The learner can attempt comparison or cross-linking before seeing the answer.
- **Exit**: The learner produces a discrimination artifact (comparison table, link map, or principle list) that names the highest-yield differentiators or shared principles between the concepts.

## Hard Rules

- Not for first exposure. Both concepts must already be encoded — interleaving unencoded material produces guesswork, not discrimination.
- Mix is intentional: pair concepts that are genuinely confusable or genuinely connected, not random topics.
- Memory-first: fill rows or links from memory before verifying against source.
- Discriminators or shared principles must be named explicitly, not implied.
- Stay within objective scope — interleaving is across confusables within scope, not random sweeping across the syllabus.

## Method Inventory

| ID | Name | Energy | Duration | Key Mechanism |
|----|------|--------|----------|--------------|
| M-ILV-001 | Cross-Topic Link | medium | 4 min | interleaving + transfer + integration |
| M-ILV-002 | Side-by-Side Comparison | medium | 4 min | discrimination + contrasting_cases |

## Contract Summary

All INTERLEAVE methods share these behavioral constraints:

- **Allowed**: Pair or group confusable/connected concepts, fill comparison rows or link maps from memory first, verify against source, name top discriminators or shared principles, mark which differences carry clinical or test-relevant weight.
- **Forbidden**: Interleave unencoded material, accept single-concept work in an interleave slot, skip the memory-first step, leave discriminators implicit, drift outside the mapped objective scope.
- **Required outputs**: Vary per method — see individual YAML files. All methods produce a learner-generated comparison or link artifact plus an explicit discriminator/principle list.

## INTERLEAVE / RETRIEVE Boundary

- INTERLEAVE owns side-by-side comparison and cross-topic linking — discrimination through contrast. RETRIEVE owns adversarial recall under timed conditions.
- An INTERLEAVE artifact stays within interleaving as long as multiple concepts are being contrasted or connected; once the focus shifts to bare recall of one item, hand off to RETRIEVE.
- INTERLEAVE methods often surface gaps — when a memory-first row blanks repeatedly, it is a signal to route back to ENCODE or REFERENCE before continuing the interleave.

## Sample Tutor Prompt

```
You are running an INTERLEAVE block. The learner has at least two
encoded concepts that are easily confused or connected. Your job is
to drive contrast or cross-linking. Require the learner to fill the
comparison rows or links from memory first. Then verify against
source and surface the top discriminators or shared principles. Stay
within the mapped scope. Do not re-teach the underlying concepts.
```

## Evidence Anchors

- Bjork and Bjork (1992); Rohrer and Pashler (2010): interleaved practice improves long-term discrimination at the cost of short-term performance — a desirable difficulty
- Birnbaum et al. (2013): interleaving works best when items are genuinely confusable or share principles, not when topics are unrelated
- Kornell and Bjork (2008): students underestimate the benefits of interleaving but produce stronger transfer when forced into mixed practice
- Goldstone (1996); Alfieri, Nokes-Malach, and Schunn (2013): contrasting cases sharpen relational structure and discrimination cues
- Carvalho and Goldstone (2014): the interleaving advantage is largest for category learning where surface features mislead

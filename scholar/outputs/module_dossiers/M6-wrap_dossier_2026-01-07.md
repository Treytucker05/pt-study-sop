# Module Dossier — M6: Wrap

- Path: `sop/gpt-knowledge/M6-wrap.md`
- Phase: M6 Wrap / Reflection
- Last Updated: 2026-01-07

## 1. Operational Contract

- **Purpose:** Consolidate learning, capture errors, create cards, and schedule future reviews in 2-10 minutes.
- **Trigger(s):** `wrap` command; target reached.
- **Required Inputs:** Performance data from session; weak anchors identified.
- **Required Outputs:** Log artifact; Anki-style cards; Google Tasks scheduling.
- **Exit Criteria:** Cards created; SR dates calculated; Log saved.
- **Failure Modes / Drift Risks:** Shallow reflection ("everything was fine"); skipping scheduling ("I'll do it later"); Miscalibrated confidence (overconfidence).

## 2. Pedagogy Mapping

- **Retrieval Practice:** [PASS] - Recap and One-Minute Paper are active recall tasks.
- **Spacing/Interleaving:** [FAIL] - The 1-3-7 day rule is manual and often ignored or incorrectly calculated by the AI.
- **Cognitive Load:** [PASS] - Wrap handles the "Refine" phase, offloading errors to cards to clear WM.
- **Metacognition:** [PASS] - Calibration checks compare predicted vs actual score.

## 3. Evidence Map

- **The Spacing Effect**: Distributed practice is superior for long-term retention (Source: Cochrane Systematic Review).
- **Successive Relearning**: Retention requires multiple successful recalls across sessions (Source: Rawson & Dunlosky).

## 4. Improvement Candidates (Rabbit Holes Allowed)

- "Interleaved Scheduling": Schedule current session review to overlap with *past* related topics.
- "Calibration Penalty": If overconfident, Review 1 is moved from 24h to 12h.

## 5. Promotion Candidates (MAX 3)

1. **[Successive Relearning Counter]**: Add a "Mastery Level (1-3)" field to anchors to track their progress toward stabilization.
2. **[Recall-First Reflection]**: Mandate the "One-Minute Paper" summary before any other wrap statistics are discussed.

## 6. Guardrails (What Must Not Change)

- Google Tasks Integration: The Reclaim list must be used.
- Log Schema: Field names must not break the ingestor.

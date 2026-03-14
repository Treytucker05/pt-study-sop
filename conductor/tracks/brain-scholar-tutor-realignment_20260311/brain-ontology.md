# Brain Learner-Model Ontology

Date: 2026-03-11  
Track: `brain-scholar-tutor-realignment_20260311`

## Purpose

Freeze the Wave 1 Brain contract so the learner-profile MVP has a stable ontology before deeper Scholar and Tutor adaptation work begins.

## Core Entities

### Profile Claim

A `profile claim` is a factual learner-model statement derived from observed study telemetry. Every claim must carry:

- `claim_key`: stable machine-readable identifier
- `label`: learner-facing title
- `score`: normalized 0.0-1.0 signal value
- `value_band`: low / moderate / high interpretation band
- `confidence`: normalized 0.0-1.0 estimate of evidence quality
- `freshness_days`: days since the newest supporting signal
- `contradiction_state`: `stable`, `mixed`, or `contradicted`
- `evidence_tier`: 1, 2, or 3 based on source ownership
- `evidence`: concrete supporting metrics and counts
- `explanation`: plain-language “why Brain thinks this”
- `recommended_strategy`: next step Brain would surface to Scholar

Wave 1 canonical claims:

- `study_consistency`
- `retrieval_resilience`
- `calibration_accuracy`
- `scaffold_dependence`
- `error_recurrence`

### Hybrid Archetype

A `hybrid archetype` is a learner-facing summary built from multiple profile claims. It is:

- explanatory, not diagnostic
- dynamic over time
- visible to the learner
- challengeable by the learner
- not a direct control signal for Tutor

Wave 1 archetypes are summary labels built from claim clusters. Examples:

- `Consistency-Driven Builder`
- `Retrieval Consolidator`
- `Calibration Builder`
- `Scaffold-Supported Learner`
- `Emerging Pattern`

Every archetype must carry:

- `slug`
- `label`
- `summary`
- `supporting_traits`

### Calibration Question

A `calibration question` is a learner-facing prompt Brain asks when evidence is weak, mixed, or contradicted. It is not a manual override.

Every question must carry:

- `question_key`
- `question_text`
- `claim_key`
- `rationale`
- `question_type`
- `status`
- `blocking`
- `evidence_needed`
- `answer_text`
- `answer_source`

Wave 1 question types:

- `calibration`
- `challenge`

## Semantics

### Confidence

`confidence` measures how trustworthy a claim is based on signal coverage, signal agreement, and sample depth.

- `0.00-0.39`: weak
- `0.40-0.69`: moderate
- `0.70-1.00`: strong

Confidence may be low even when a score is high if the evidence is sparse.

### Freshness

`freshness_days` is the age of the newest supporting signal.

- `0-3`: fresh
- `4-14`: recent
- `15+`: stale

Wave 1 uses freshness to warn when the model is operating on aging evidence rather than to suppress the claim entirely.

### Contradiction

`contradiction_state` expresses whether Brain’s underlying sources tell the same story.

- `stable`: sources align
- `mixed`: sources partially disagree or signal quality is uneven
- `contradicted`: high-confidence sources disagree in a meaningful way

Wave 1 contradiction is driven by measurable disagreement between session telemetry and adaptive telemetry, not by user preference alone.

## Persistence Rules

- Profile snapshots are versioned and stored historically.
- Claims are stored per snapshot.
- Learner feedback and calibration answers are stored as separate events.
- Pending questions are first-class objects and are not inferred from UI state.

## Backfill Rules

Wave 1 historical backfill is intentionally conservative.

- Brain seeds the first learner profile from existing telemetry.
- Weak historical evidence is surfaced as low confidence instead of being imputed.
- Longitudinal history starts accumulating from the first stored snapshot onward.

This keeps the initial profile honest while still shipping a usable learner-model surface.

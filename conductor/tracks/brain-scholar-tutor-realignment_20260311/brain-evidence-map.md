# Brain Evidence Ownership And Reliability Map

Date: 2026-03-11  
Track: `brain-scholar-tutor-realignment_20260311`

## Reliability Tiers

### Tier 1: Trusted Evidence

Tier 1 is Brain-owned telemetry that directly reflects learner behavior.

- `sessions`
- `practice_events`
- `error_flags`
- `skill_mastery`
- `tutor_sessions`
- `tutor_turns`

Wave 1 Brain claims should prefer Tier 1 whenever possible.

### Tier 2: Conditional Evidence

Tier 2 is useful but context-dependent product evidence.

- vault artifacts and note quality
- study-material usage
- library coverage and material selection
- calendar follow-through

Tier 2 can support Brain interpretation later, but it should not silently override Tier 1.

### Tier 3: Advisory Evidence

Tier 3 is heuristic or low-frequency evidence.

- inferred workflow preferences
- sparse manual interactions
- weak behavioral patterns
- one-off observations without repetition

Tier 3 may trigger questions or cautionary notes, but not strong profile claims on its own.

## Wave 1 Field Map

| Claim | Primary Sources | Tier | Cadence | Backfill Rule |
| --- | --- | --- | --- | --- |
| `study_consistency` | `sessions.session_date`, `sessions.created_at` | 1 | refresh on profile recompute | use active study days from existing sessions; low sample lowers confidence |
| `retrieval_resilience` | `practice_events.correct`, `practice_events.source`, `sessions.rsr_percent` | 1 | refresh on profile recompute | combine practice correctness with session retrieval metrics when present |
| `calibration_accuracy` | `practice_events.confidence`, `practice_events.correct`, `sessions.calibration_gap`, `sessions.retention_confidence` | 1 | refresh on profile recompute | use direct confidence-vs-outcome first; session gap is fallback/supporting evidence |
| `scaffold_dependence` | `practice_events.hint_level`, `practice_events.source`, `sessions.source_lock` | 1 | refresh on profile recompute | prefer hint events; missing hint data lowers confidence instead of fabricating dependence |
| `error_recurrence` | `error_flags`, `sessions.errors_recall`, `sessions.errors_conceptual`, `sessions.gaps_identified` | 1 | refresh on profile recompute | repeated flagged skills raise recurrence; sparse flags remain low-confidence |

## Storage Rules

- Persist the computed profile snapshot and claims so Brain history is inspectable.
- Persist feedback separately so learner challenges do not mutate the historical snapshot in place.
- Persist pending questions separately so Brain can track open uncertainty over time.

## Refresh Rules

- Wave 1 refreshes the Brain profile from telemetry on a bounded cadence rather than on every page load.
- A fresh snapshot can be reused while it is still recent.
- A stale snapshot can be recomputed or explicitly refreshed.

## Non-Goals For Wave 1

- No direct Vault-driven learner diagnosis yet.
- No Calendar-driven personalization yet.
- No direct Brain-to-Tutor control path.
- No opaque archetype generation without inspectable supporting claims.

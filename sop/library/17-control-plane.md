# 17 — Control Plane (Operational Architecture)

## Purpose

The Control Plane is the deterministic policy layer that wraps the learning stages. It selects assessment mode, enforces stage gates, maps errors to method overrides, and keeps artifact coverage aligned to objectives.

This is an **operational overlay** on top of canonical PEIRRO taxonomy used by validators and runtime data models.

## Operational Pipeline

`CONTROL PLANE -> PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN -> CONTROL PLANE`

- Entry Control Plane: mode selection, objective coverage map, chain selection, gate setup.
- Exit Control Plane: error aggregation, adaptation rules, next-run overrides.

## Assessment Mode Selector

Every topic run must declare one primary assessment mode:

- `classification`
- `mechanism`
- `computation`
- `definition`
- `procedure`
- `spatial`
- `recognition`
- `synthesis`

Mode selection controls item styles in CALIBRATE and Question Bank Seed generation in REFERENCE.

## Coverage Map Contract

Coverage is tracked as:

`objective -> required artifacts -> required retrieval checks`

Example shape:

```yaml
coverage_map:
  - objective_id: O1
    objective_text: "Differentiate upper motor neuron vs lower motor neuron patterns"
    required_artifacts:
      - Spine
      - OnePageAnchor
      - QuestionBankSeed
    required_retrieval_checks:
      - mixed_retrieval
      - adversarial_near_miss
      - timed_sprint
```

## Stage Gates (Pass/Fail)

| Stage | Required Inputs | Pass Threshold |
| --- | --- | --- |
| PRIME | Topic + objectives + source packet | Spine completed (<=12 nodes) + Unknowns + Predictions + GoalTargets; no scoring |
| CALIBRATE | PRIME outputs | 2-5 minutes, 5-10 items, H/M/L confidence tags, no grading, items >45s marked miss-and-move-on, PrioritySet top 3 weaknesses |
| ENCODE | PrioritySet | Each weakness mapped to explicit method(s); confusable weaknesses must include comparison/discrimination methods |
| REFERENCE | ENCODE outputs | OnePageAnchor + QuestionBankSeed (10-20 items with mode tags) + CoverageCheck against objectives |
| RETRIEVE | REFERENCE artifacts | Mixed low-support retrieval + adversarial near-miss + timed sprint latency tracking + ErrorLog entries for misses |
| OVERLEARN | RETRIEVE error profile | Anki minimal facts/rules + DrillSheet (30-60 interleaved timed items) + CrossSessionValidation over 2 sessions |

## Error Taxonomy and ErrorLog.csv

Error type enum is fixed:

- `Recall`
- `Confusion`
- `Rule`
- `Representation`
- `Procedure`
- `Computation`
- `Speed`

Required CSV schema:

```csv
topic_id,item_id,error_type,stage_detected,confidence,time_to_answer,fix_applied,assessment_mode,chain_id,support_level,prior_exposure_band,selector_policy_version,dependency_fix_applied
```

Routing/diagnostic fields are required so audits can reproduce deterministic selection and detect expertise-reversal effects.

## Adaptation Mapping (Error -> Mandatory Override)

| Error Type | Mandatory Method Override |
| --- | --- |
| Recall | `M-RET-001` Free Recall Blurt + `M-RET-007` Timed Sprint Sets |
| Confusion | `M-ENC-010` Comparison Table + `M-INT-004` Side-by-Side Comparison (required) |
| Rule | `M-REF-003` One-Page Anchor + `M-REF-004` Question Bank Seed |
| Representation | `M-PRE-008` Structural Extraction + `M-REF-003` One-Page Anchor |
| Procedure | `M-RET-006` Adversarial Drill + `M-RET-007` Timed Sprint Sets |
| Computation | `M-CAL-001` Micro Precheck + `M-RET-007` Timed Sprint Sets |
| Speed | `M-RET-007` Timed Sprint Sets + `M-OVR-003` Drill Sheet Builder |

## Deterministic Method Bundles by Stage

- PRIME bundle: `M-PRE-001`, `M-PRE-008`, `M-PRE-009`
- CALIBRATE bundle: `M-CAL-001`, `M-CAL-002`, `M-CAL-003`
- ENCODE bundle: existing encode methods selected from PrioritySet weakness type
- REFERENCE bundle: `M-REF-003`, `M-REF-004`
- RETRIEVE bundle: existing retrieve methods + `M-RET-006`, `M-RET-007`
- OVERLEARN bundle: `M-OVR-002`, `M-OVR-003`

## Override Policy

- Overrides are **substitutions**, not additive scope growth.
- If an adaptation override is activated, replace a same-duration method in the same phase when possible.
- If no same-duration candidate exists, add at most one method and shorten non-critical optional work.

## topic.yaml (Single Source of Truth)

Minimum model:

```yaml
topic_id: T-EXAMPLE-001
title: Example Topic
assessment_mode: mechanism
objectives:
  - id: O1
    text: Describe mechanism A -> B
  - id: O2
    text: Distinguish near-miss pair X vs Y
coverage_map: []
confusables: []
priority_set: []
required_artifacts:
  - Spine
  - OnePageAnchor
  - QuestionBankSeed
  - ErrorLog
```

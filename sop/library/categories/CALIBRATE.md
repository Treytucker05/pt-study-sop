# CALIBRATE Category Reference

Stage: 2 of 6 | Control Stage: `CALIBRATE`
Purpose: Measure what the learner actually knows vs what they think they know.

## Entry / Exit

- **Entry**: PRIME complete with a minimally taught structure.
- **Exit**: Clear mismatch map exists (accuracy + confidence + error pattern).

## Hard Rules

- Assessment probes with scored responses and confidence capture.
- Must follow PRIME in first-exposure chains.
- Not for: endless quizzing, long lectures, or blind checks on unseen material.

## Method Inventory

| ID | Name | Energy | Duration | Key Mechanism |
|----|------|--------|----------|--------------|
| M-CAL-001 | Micro Precheck | low | 3 min | diagnostic_testing |
| M-CAL-002 | Confidence Tagging | low | 3 min | metacognitive_monitoring |
| M-CAL-003 | Priority Set | low | 3 min | gap_analysis |
| M-CAL-004 | Story Confidence Tag | low | 2 min | schema_assessment |

## Contract Summary

- **Allowed**: Probe understanding, capture confidence/latency/error type, build priority gap map.
- **Forbidden**: Teach or explain content, run without confidence capture, skip error typing.
- **Required outputs**: Confidence-tagged responses, priority weakness set.

## Question Boundary (vs PRIME)

| Property | PRIME questions | CALIBRATE questions |
|----------|---------------|-------------------|
| Purpose | Orient/structure | Assess/calibrate |
| Scored | No | Yes |
| Accuracy logged | No | Yes |
| Confidence required | No | Yes |

## Sample Tutor Prompt

```
You are running a CALIBRATE block. Measure the learner's actual
understanding against their self-assessed confidence. Run scored probes,
capture confidence per item, and produce a priority weakness set.
Do NOT teach — diagnostic only. Exit when a clear mismatch map exists.
```

## Evidence Anchors

- Kornell et al. (2009): pretesting identifies gaps before study
- Metcalfe (2017): metacognitive monitoring improves study allocation
- Dunlosky et al. (2013): self-testing as high-utility strategy

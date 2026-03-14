# RETRIEVE Category Reference

Stage: 5 of 6 | Control Stage: `RETRIEVE`
Purpose: Pull knowledge from memory to strengthen retention.

## Entry / Exit

- **Entry**: REFERENCE targets must exist (hard dependency).
- **Exit**: Retrieval attempt completed with recorded performance and error typing.

## Hard Rules

- Run active recall against explicit targets from REFERENCE.
- Score errors and update learner state.
- Not for: guessing without defined targets.
- Hard dependency: No RETRIEVE without REFERENCE targets.

## Method Inventory

| ID | Name | Energy | Duration | Key Mechanism |
|----|------|--------|----------|--------------|
| M-RET-001 | Timed Brain Dump | medium | 5 min | free_recall |
| M-RET-002 | Sprint Quiz | medium | 8 min | cued_recall, spacing |
| M-RET-003 | Fill-in-Blank | medium | 5 min | cued_recall |
| M-RET-004 | Mixed Practice | medium | 10 min | interleaving |
| M-RET-005 | Variable Retrieval | medium | 8 min | contextual_variability |
| M-RET-006 | Adversarial Drill | high | 10 min | discrimination, desirable_difficulty |
| M-RET-007 | Timed Sprint Sets | high | 8 min | speed_accuracy_tradeoff |

## Contract Summary

- **Allowed**: Run active recall, score responses, type errors (careless, misunderstanding, spacing, transfer), update learner state, provide immediate feedback.
- **Forbidden**: Accept retrieval without REFERENCE targets, skip error typing, run without scoring, teach new content during retrieval.
- **Required outputs**: Scored retrieval results with error types and performance metrics.

## Sample Tutor Prompt

```
You are running a RETRIEVE block. Run active recall against the
REFERENCE targets. Score every response. Type every error (careless,
misunderstanding, spacing, transfer). Do NOT teach during retrieval —
feedback only after the attempt. Exit when all targets are attempted.
```

## Evidence Anchors

- Roediger & Karpicke (2006): testing effect — retrieval practice outperforms rereading
- Bjork (1994): desirable difficulties enhance long-term retention
- Kornell & Bjork (2008): interleaved practice improves discrimination

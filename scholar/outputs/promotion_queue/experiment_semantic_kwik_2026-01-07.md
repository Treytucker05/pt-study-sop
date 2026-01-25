# Experiment Design — Semantic-Lead KWIK

- Exp ID: EXP-20260107-003
- Linked RFC: RFC-20260107-003
- Date: 2026-01-07

## 1. Hypothesis

Placing "Function" before "Sound" in KWIK will increase M6 Calibration scores and reduce "Retention False Positives" (where user remembers the hook but not the meaning).

## 2. Variables

- **Independent Variable**: Step order in KWIK (Function-First vs Sound-First).
- **Dependent Variables**:
  - M6 Wrap Calibration Score (1-5).
  - Recall Failure Rate for "Function" given "Hook."

## 3. Implementation

- **Manual Check**: During M6 Wrap, AI specifically tests the "Function" first, then the "Hook."

## 4. Success Criteria

- [X] >90% accuracy on "Function" recall during M6.
- [X] Reduction in user "fuzzy" ratings for complex terms.

## 5. Rollback Criteria

- Encoding time per term increases by >30% (Time-on-task penalty).
- User frustration with "Clinical first" constraints in micro-sessions.

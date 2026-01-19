# Experiment Design — Core Mode Gating Inversion

- ID: EXP-20260107-001
- Date: 2026-01-07
- Status: Proposed
- Primary Variable: Gating Logic (Teaching-First vs. Retrieval-First)

## 1) Hypothesis

Inverting the Core Mode gating logic from "Teach -> Explain" to "Probe -> Refine" will reduce session duration by at least 30% without decreasing next-day recall accuracy, by pruning redundant delivery of known material.

## 2) Participants & Scope

- **Subject:** Senior PT Student.
- **Topic Scope:** Lifespan Exam 3 (Geriatrics/Pediatrics).
- **Duration:** 10 target sessions (5 Control, 5 Test).

## 3) Procedure (ONE variable change)

- **Control (Sessions 1-5):** Standard "Teach-First" workflow as defined in M2/M3 (v9.2).
- **Test (Sessions 6-10):** "Retrieval-First" workflow: Tutor MUST ask 1-2 probing questions on every slide/packet chunk before summarizing or explaining.

## 4) Operational Metrics

- **Primary:** Session Duration (recorded in `Session Info` header). Target: 30% reduction.
- **Secondary:** Next-day Recall Accuracy (recorded in `Weak Anchors` retest success).
- **Tertiary:** Subjective Friction Rating (1-5, recorded in `Ratings`).

## 5) Measurement & Logging

- Metrics are manually extracted from Brain session logs by The Scholar using the `scholar/knowledge/log_analysis.md` guide.

## 6) Success Criteria (Numeric)

- **Success:** Mean session duration reduction > 25% AND Mean Recall Accuracy >= Control.
- **Failure:** Mean Recall Accuracy < Control OR Friction Rating increases by > 1.0.

## 7) Stop/Abort Criteria

- Single session duration > 180 minutes using test logic.
- "Abandon Session" or "Manual Override" by user due to friction.

## 8) Promotion Plan

If success criteria are met, promote the "Probe-First" rule to `sop/gpt-knowledge/runtime-prompt.md` and update `M3-encode.md`.

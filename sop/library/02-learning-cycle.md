# Learning Cycle: Control Plane Overlay + PEIRRO Compatibility

The runtime follows an operational control-plane cycle while keeping canonical PEIRRO taxonomy for validators, YAML schemas, and compatibility.

---

## Operational Flow (runtime behavior)

**Pattern:** `CONTROL PLANE -> PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN -> CONTROL PLANE`

### Stage contracts

| Stage | Contract | Required outputs |
| --- | --- | --- |
| CONTROL PLANE (entry) | Select assessment mode, initialize coverage map, set gates | mode + coverage map + gate setup |
| PRIME | Orientation only; no scoring | Spine (<=12 nodes), Unknowns, Predictions, GoalTargets |
| CALIBRATE | 2-5 min, 5-10 items, confidence H/M/L, no grading | CalibrateResults + PrioritySet (top 3 weaknesses) |
| ENCODE | PrioritySet-driven construction | encoded weaknesses + confusable discrimination when required |
| REFERENCE | Build compact study references tied to objectives | OnePageAnchor + QuestionBankSeed + CoverageCheck |
| RETRIEVE | Low-support retrieval + adversarial near-miss + latency tracking | retrieval results + ErrorLog updates |
| OVERLEARN | Retention hardening across sessions | Anki draft + DrillSheet + CrossSessionValidation |
| CONTROL PLANE (exit) | Aggregate errors and adaptation decisions for next run | adaptation overrides + next-run plan |

---

## Canonical PEIRRO Mapping (internal compatibility)

PEIRRO categories remain canonical in taxonomy and validators:

- `prepare` hosts PRIME and CALIBRATE operational methods.
- `encode` and `interrogate` host ENCODE and REFERENCE operational work.
- `retrieve` and `refine` host RETRIEVE operational work.
- `overlearn` hosts OVERLEARN operational work.

This preserves:
- method YAML schema validation,
- chain schema validation,
- existing DB seed and runtime assumptions.

---

## KWIK Micro-Loop (unchanged)

KWIK remains inside ENCODE:

`Sound -> Function -> Image -> Resonance -> Lock`

Rules:
- Function before image.
- No step skipping.
- Lock must produce an explicit artifact/log entry.

---

## Execution Invariants

- No stage skipping.
- PRIME and CALIBRATE are always distinct.
- CALIBRATE is diagnostic calibration, not grading.
- Confusable content requires explicit discrimination methods.
- Retrieval-like work must update `ErrorLog.csv`.
- If a step did not happen, output `NOT DONE` / `UNKNOWN` / `NONE` (No Phantom Outputs).

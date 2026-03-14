# Learning Cycle: Control Plane Stage Tags + PEIRRO Compatibility

Each method block in the library carries a CP stage tag and a PEIRRO category. The chain determines which stages execute and in what order. This file defines the stage contracts and compatibility mappings.

---

## CP Stage Tags (applied to method blocks)

**Full stage sequence:** `CONTROL PLANE → PRIME → CALIBRATE → ENCODE → REFERENCE → RETRIEVE → OVERLEARN → CONTROL PLANE`

Not every chain uses every stage. A chain is an ordered list of blocks; the stages present depend on which blocks the chain includes.

### Stage contracts

| Stage | Contract | Required outputs |
| --- | --- | --- |
| CONTROL PLANE (entry) | Wizard selects course, materials, chain, mode | Wizard completion → session launched |
| PRIME | Orientation only; no scoring | Spine (<=12 nodes), Unknowns, Predictions, GoalTargets |
| CALIBRATE | 2-5 min, 5-10 items, confidence H/M/L, no grading | CalibrateResults + PrioritySet (top 3 weaknesses) |
| ENCODE | PrioritySet-driven construction | encoded weaknesses + confusable discrimination when required |
| REFERENCE | Build compact study references tied to objectives | OnePageAnchor + QuestionBankSeed + CoverageCheck |
| RETRIEVE | Low-support retrieval + adversarial near-miss + latency tracking | retrieval results + ErrorLog updates |
| OVERLEARN | Retention hardening across sessions | Anki draft + DrillSheet + CrossSessionValidation |
| CONTROL PLANE (exit) | Wrap: aggregate errors and adaptation decisions for next run | Exit Ticket + Session Ledger + adaptation overrides |

---

## Canonical PEIRRO Mapping (internal compatibility)

PEIRRO categories remain canonical in taxonomy, YAML schemas, and validators:

- `prepare` hosts PRIME and CALIBRATE method blocks.
- `encode` and `interrogate` host ENCODE and REFERENCE method blocks.
- `retrieve` and `refine` host RETRIEVE method blocks.
- `overlearn` hosts OVERLEARN method blocks.

This preserves:
- method YAML schema validation,
- chain schema validation,
- existing DB seed and runtime assumptions.

---

## KWIK Micro-Loop (unchanged)

KWIK remains inside ENCODE-tagged blocks:

`Sound → Function → Image → Resonance → Lock`

Rules:
- Function before image.
- No step skipping.
- Lock must produce an explicit artifact/log entry.

---

## Execution Invariants

- Blocks execute in chain order. The tutor does not skip or reorder blocks.
- PRIME and CALIBRATE are always distinct when both are present in a chain.
- CALIBRATE is diagnostic calibration, not grading.
- Confusable content requires explicit discrimination methods.
- Retrieval-tagged blocks must update `ErrorLog.csv`.
- If a step did not happen, output `NOT DONE` / `UNKNOWN` / `NONE` (No Phantom Outputs).
# Learning Cycle: Control Plane Stage Tags + PEIRRO Compatibility

Each method block in the library carries a CP stage tag and a PEIRRO category. The chain determines which stages execute and in what order. This file defines the stage contracts and compatibility mappings.

---

## CP Stage Tags (applied to method blocks)

**Full stage sequence:** `CONTROL PLANE → PRIME → TEACH → CALIBRATE → ENCODE → REFERENCE → RETRIEVE → OVERLEARN → CONTROL PLANE`

Not every chain uses every stage. `TEACH` is chain-optional. A chain is an ordered list of blocks; the stages present depend on which blocks the chain includes.

For first-exposure chains that include TEACH and CALIBRATE, the locked opening sequence is:

`MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE`

This sequence is an execution contract, not a new stage taxonomy.

### Stage contracts

| Stage | Contract | Required outputs |
| --- | --- | --- |
| CONTROL PLANE (entry) | Wizard selects course, materials, chain, mode | Wizard completion → session launched |
| PRIME | Orientation and artifact setup only; no scoring | Spine (<=12 nodes), Unknowns, Predictions, GoalTargets |
| TEACH | Explanation-first teaching, one chunk at a time, no scoring | TeachChunk + AnchorArtifact + ApplicationLink |
| CALIBRATE | Diagnostic stage with micro/full split: opening micro-check + post-teach full diagnostic | MicroCalibrateSignal and/or CalibrateResults + PrioritySet (top 3 weaknesses) |
| ENCODE | PrioritySet-driven learner construction | learner-built schema/map/table/trace as required |
| REFERENCE | Build compact study references tied to objectives | OnePageAnchor + QuestionBankSeed + CoverageCheck |
| RETRIEVE | Low-support retrieval + adversarial near-miss + latency tracking | retrieval results + ErrorLog updates |
| OVERLEARN | Retention hardening across sessions | Anki draft + DrillSheet + CrossSessionValidation |
| CONTROL PLANE (exit) | Wrap: aggregate errors and adaptation decisions for next run | Exit Ticket + Session Ledger + adaptation overrides |

---

## Canonical PEIRRO Mapping (internal compatibility)

PEIRRO categories remain canonical in taxonomy, YAML schemas, and validators:

- `prepare` hosts PRIME, TEACH, and CALIBRATE method blocks.
- `encode` and `interrogate` host ENCODE and REFERENCE method blocks.
- `retrieve` and `refine` host RETRIEVE method blocks.
- `overlearn` hosts OVERLEARN method blocks.

This preserves:
- method YAML schema validation,
- chain schema validation,
- existing DB seed and runtime assumptions.

---

## KWIK Placement and Mode

Live mnemonic compression defaults to a lighter mode after TEACH close artifact and before FULL CALIBRATE:

`KWIK Lite = system seed + one learner ownership action`

Full KWIK remains deeper in ENCODE or OVERLEARN:

`Sound → Function → Image → Resonance → Lock`

Rules:
- Function before image.
- No step skipping.
- Lock must produce an explicit artifact/log entry.

---

## Execution Invariants

- Blocks execute in chain order. The tutor does not skip or reorder blocks.
- PRIME, TEACH, and CALIBRATE are distinct when present.
- TEACH, when present, must occur after PRIME and before CALIBRATE.
- First exposure opening, when TEACH + CALIBRATE are present: MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE.
- CALIBRATE is diagnostic calibration, not grading.
- TEACH is explanation-first and non-assessment.
- TEACH depth default: brief L0 hook -> L3 mechanism -> L4 DPT precision.
- L1/L2 are fallback scaffolds, not default route.
- L3 -> L4 requires low-friction function confirmation, not mandatory blank-page teach-back.
- Confusable content requires explicit discrimination methods.
- Retrieval-tagged blocks must update `ErrorLog.csv`.
- If a step did not happen, output `NOT DONE` / `UNKNOWN` / `NONE` (No Phantom Outputs).

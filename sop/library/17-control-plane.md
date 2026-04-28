# 17. Control Plane Specification (CP-MSS v2.0)

## 1. The 7-Stage Operational Pipeline

The system enforces this canonical order when the relevant stages are present in a chain:

`PRIME -> TEACH -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`

Not every chain uses every stage. `TEACH` is chain-optional, but when present it must occur after `PRIME` and before `CALIBRATE`.

For first-exposure openings, the required startup handshake is:

`MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE`

This does not add extra control-plane stages; it defines required ordering inside the `TEACH`/`CALIBRATE` opening behavior.

| Stage | Function | Required Input | Required Output |
| :--- | :--- | :--- | :--- |
| **1. PRIME** | Source-grounded orientation and artifact setup | Source material + objective scope | `StructuralSpine`, objective links, hierarchy/map seeds, unknowns |
| **2. TEACH** | Explanation-first teaching for unfamiliar material | PRIME artifacts + source anchors + optional micro-check signal | `TeachChunk`, `AnchorArtifact`, one application link |
| **3. CALIBRATE** | Diagnostic calibration with micro/full split | Teach chunk or prior evidence | micro-check signal (opening) and/or readiness signal + `PrioritySet` + error hints |
| **4. ENCODE** | Learner-side construction and production | `PrioritySet` or selected target | learner-made schema, map, comparison, trace, or explanation artifact |
| **5. REFERENCE** | External offloading and retrieval target generation | encoded targets + objective scope | `OnePageAnchor.md` / `QuestionBankSeed.md` / coverage artifact |
| **6. RETRIEVE** | Reconstructive recall and discrimination | reference targets or explicit retrieval targets | updated `ErrorLog.csv`, retrieval results |
| **7. OVERLEARN** | Fluency and carry-forward hardening | high-accuracy items + wrap state | `DrillSheet.md`, Anki draft, wrap carry-forward artifacts |

## 2. Dependency Law (System Contract)

**CRITICAL:** The system forbids hallucinated retrieval.

> **Rule:** No `M-RET-*` retrieval method may execute until a valid retrieval target exists (`QuestionBankSeed`, `OnePageAnchor`, or an explicit reference-equivalent target).
>
> *Reasoning:* You cannot retrieve what you have not defined. Retrieval without targets reinforces guessing, not memory.

## 3. Stage Boundaries and First-Exposure Default

The default session assumption is first exposure unless the learner has strong prior-mastery evidence.

- `PRIME` is artifact-first and non-assessment. It prepares the terrain.
- `TEACH` is explanation-first and non-assessment. It teaches one chunk at a time.
- `CALIBRATE` is the diagnostic stage and may run as:
  - `MICRO-CALIBRATE` (low-friction function confirmation for opening checks)
  - `FULL CALIBRATE` (full post-teach diagnostic)
- `ENCODE` is learner-side construction, production, and manipulation, not tutor-led exposition.
- Every method belongs to exactly one `control_stage`.
- Any chain containing both `TEACH` and `CALIBRATE` must order them `TEACH -> CALIBRATE`.

### Locked Opening Sequence (First Exposure)

When a chain contains `TEACH` and `CALIBRATE` for unfamiliar material, enforce:

`MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE`

- `MICRO-CALIBRATE` checks function-level orientation only. It is not grading and not deep recall.
- `FULL CALIBRATE` runs after TEACH and produces the actionable `PrioritySet`.

### TEACH Doctrine (Hard Contract)

- Deliver one TEACH chunk at a time in this order:
  - `Source Facts`
  - `Plain Interpretation`
  - `Bridge Move`
  - `Application`
  - `Anchor Artifact`
- Use bridge moves only after concept framing.
- Analogies must include their breakdown points.
- Memory hooks come after meaning, not before meaning.
- TEACH must not score, grade, confidence-tag, or require retrieval-style performance.

### TEACH Depth Policy (Hard Contract)

- Default depth path: `brief L0 hook -> L3 mechanism -> L4 DPT precision`.
- `L1` analogy and `L2` plain-language explanation are fallback scaffolds, not the default route.
- `L3 -> L4` escalation uses low-friction function confirmation; do not require mandatory blank-page teach-back.

### Mnemonic Placement Policy (Hard Contract)

- Default live mnemonic compression slot: after TEACH close artifact and before `FULL CALIBRATE`.
- Live mode in this slot is `KWIK Lite` (system seed + one learner ownership action).
- Full `KWIK Hook` remains a deeper method in `ENCODE` and/or `OVERLEARN`.

## 4. Library Category Compatibility (Internal)

Library categories remain a compatibility taxonomy for validators, YAML schemas, and historical paths:

- `prepare` hosts `PRIME`, `TEACH`, and `CALIBRATE`
- `encode`, `elaborate`, and `interleave` host `ENCODE`, `ELABORATE`, and `INTERLEAVE` blocks (collapse to `ENCODE` or `REFERENCE` at runtime depending on method intent)
- `retrieve` and `refine` host `RETRIEVE`
- `overlearn` hosts `OVERLEARN`

This preserves existing DB and runtime assumptions while `control_stage` remains the authoritative execution-order field.

## 5. Knob Dictionary (Acute Variables)

Modules are parameterized by these knobs to prevent library bloat.

| Knob | Allowed Values | Default | Effect |
| :--- | :--- | :--- | :--- |
| **assessment_mode** | `classification`, `mechanism`, `computation`, `definition`, `procedure`, `spatial`, `synthesis` | `mechanism` | Determines artifact templates and discriminator style. |
| **time_available_min** | Integer (5-180) | `45` | Caps item pools, chunk count, and loop limits. |
| **energy** | `low`, `medium`, `high` | `medium` | `low` disables high-load generative tasks. |
| **retrieval_support** | `none`, `minimal`, `guided` | `minimal` | Controls retrieval hints and support. |
| **interleaving_level** | `none`, `light`, `heavy` | `light` | Injects historical errors into current drills. |
| **near_miss_intensity** | `none`, `low`, `high` | `low` | Increases structural similarity of distractors. |
| **timed** | `off`, `soft`, `hard` | `soft` | `hard` logs speed errors when latency is too high. |

## 6. Deterministic Error Routing

When `ErrorLog.csv` detects a dominant error type, the system overrides the next session plan:

- **Confusion** -> force contrast / discrimination methods
- **Rule** -> force lure-mutation / boundary-reference methods
- **Procedure** -> force process-trace / fault-injection methods
- **Computation** -> force faded-scaffolding or worked-example methods
- **Speed** -> force timed sprint reinforcement

The exact block IDs may change over time, but the routing law stays deterministic.

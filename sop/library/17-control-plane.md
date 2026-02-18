# 17. Control Plane Specification (CP-MSS v1.0)

## 1. The 6-Stage Operational Pipeline
The system strictly enforces this sequence. Every module must belong to exactly one stage.

| Stage | Function | Required Input | Required Output |
| :--- | :--- | :--- | :--- |
| **1. PRIME** | Structure Extraction | Source Material | `Spine.md` (Schema) |
| **2. CALIBRATE** | Baseline Measurement | `Spine.md` | `ErrorLog.csv` (Priority Matrix) |
| **3. ENCODE** | Deep Internalization | Priority Matrix | `Engram` (Mental Model) |
| **4. REFERENCE** | External Offloading | Task Demands | `OnePageAnchor.md` / `QuestionBankSeed.md` |
| **5. RETRIEVE** | Reconstructive Recall | **Targets (from Stage 4)** | `ErrorLog.csv` (Updated) |
| **6. OVERLEARN** | Fluency / Automaticity | High-Accuracy Items | `DrillSheet.md` |

## 2. The Dependency Law (System Contract)
**CRITICAL:** The system forbids "Hallucinated Retrieval."
> **Rule:** No `M-RET-*` (Retrieval) module may execute until a valid `QuestionBankSeed.md` or `OnePageAnchor.md` exists.
> *Reasoning:* You cannot retrieve what you have not defined. Retrieving without targets reinforces guessing, not memory.

## 3. The Knob Dictionary (Acute Variables)
Modules are parameterized by these knobs to prevent library bloat.

| Knob | Allowed Values | Default | Effect |
| :--- | :--- | :--- | :--- |
| **assessment_mode** | `classification`, `mechanism`, `computation`, `definition`, `procedure`, `spatial`, `synthesis` | `mechanism` | Determines artifact templates (e.g., Matrix vs. Flowchart). |
| **time_available_min** | Integer (5–180) | `45` | Caps item pool generation and loop limits. |
| **energy** | `low`, `medium`, `high` | `medium` | `low` disables high-load generative tasks (e.g., blank-page mapping). |
| **retrieval_support** | `none`, `minimal`, `guided` | `minimal` | `none` enforces strict blind recall; `guided` allows hints. |
| **interleaving_level** | `none`, `light`, `heavy` | `light` | Injects historical `ErrorLog` items into current drills. |
| **near_miss_intensity** | `none`, `low`, `high` | `low` | `high` forces distractors to share exact structural boundaries. |
| **timed** | `off`, `soft`, `hard` | `soft` | `hard` logs a `Speed` error if latency > 45s. |

## 4. Deterministic Error Routing
When `ErrorLog.csv` detects a dominant error type, the system overrides the next session plan:

*   **Confusion** $\rightarrow$ Force `M-ENC-010` (Contrast Matrix).
*   **Rule** $\rightarrow$ Force `M-REF-004` (Lure Mutation).
*   **Procedure** $\rightarrow$ Force `M-RET-006` (Fault Injection).
*   **Computation** $\rightarrow$ Force `M-ENC-015` (Faded Scaffolding).
*   **Speed** $\rightarrow$ Force `M-OVR-002` (Drop-Out Sprints).

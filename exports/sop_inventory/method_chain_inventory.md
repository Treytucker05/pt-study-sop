# SOP Method and Chain Inventory

Generated: `2026-04-01T15:50:15`
Library version: `1.0.0`
Canonical source: `sop/library/methods` + `sop/library/chains`

## Counts

- Methods: **59**
- Chains: **20**

## How To Read IDs

- Chain pattern: `C-<family>-<variant>`
- Example: `C-FE-STD` = `Chain / First Exposure / Standard`
- Example: `C-QD-001` = `Chain / Quick Drill` (`001` is the first numbered variant in that family).
- Method pattern: `M-<family>-<sequence>`
- Example: `M-PRE-010` = `Method / Prime / item 010`
- Example: `M-CAL-001` = `Method / Calibrate / item 001`
- Runtime rule: trust the live `control_stage` when an older ID prefix and the current stage differ.
- Example: `M-ENC-008 Mechanism Trace` currently runs in `TEACH`.

### Chain Family Codes

| Code | Meaning |
|---|---|
| `AD` | Anatomy Deep Dive |
| `CI` | Clinical Reasoning Intake |
| `CR` | Clinical Reasoning |
| `DA` | Dense Anatomy Intake |
| `DP` | DEPTH |
| `EP` | Exam Prep |
| `FE` | First Exposure |
| `LE` | Low Energy |
| `MR` | Mastery Review |
| `PI` | Pathophysiology Intake |
| `QD` | Quick Drill |
| `QF` | Quick First Exposure |
| `RS` | Review Sprint |
| `SW` | SWEEP |
| `TRY` | Top-Down |
| `VE` | Visual Encoding |

### Method Family Codes

| Code | Meaning |
|---|---|
| `CAL` | Calibrate |
| `ENC` | Encode |
| `INT` | Integration / Interrogation |
| `OVR` | Overlearn |
| `PRE` | Prime |
| `REF` | Reference |
| `RET` | Retrieve |
| `TEA` | Teach |

## Methods By Control Stage

| Stage | Count |
|---|---:|
| PRIME | 10 |
| TEACH | 9 |
| CALIBRATE | 7 |
| ENCODE | 18 |
| REFERENCE | 4 |
| RETRIEVE | 7 |
| OVERLEARN | 4 |

## Chain Summary

| ID | Name | Status | CP | Blocks | Modes | Energy | Time | Stages |
|---|---|---|---|---:|---|---|---:|---|
| C-AD-001 | Anatomy Deep Dive | draft | pass | 8 | classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis | high | 40 | PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN |
| C-CI-001 | Clinical Reasoning Intake | draft | pass | 8 | classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis | high | 45 | PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN |
| C-CR-001 | Clinical Reasoning | draft | pass | 7 | classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis | high | 45 | PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> OVERLEARN |
| C-DA-001 | Dense Anatomy Intake | draft | pass | 8 | spatial | high | 40 | PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN |
| C-DP-001 | DEPTH | draft | pass | 10 | mechanism, computation, procedure | high | 45 | PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN |
| C-EP-001 | Exam Prep | draft | pass | 7 | classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis | high | 35 | PRIME -> REFERENCE -> RETRIEVE -> ENCODE -> OVERLEARN |
| C-FE-001 | First Exposure (Core) | draft | pass | 15 | classification, definition, recognition | high | 55 | PRIME -> CALIBRATE -> TEACH -> REFERENCE -> ENCODE -> RETRIEVE -> OVERLEARN |
| C-FE-MIN | First Exposure: Minimal | draft | pass | 9 | definition, recognition | low | 20 | PRIME -> CALIBRATE -> TEACH -> REFERENCE -> RETRIEVE -> OVERLEARN |
| C-FE-PRO | First Exposure: Procedure | draft | pass | 10 | procedure | high | - | PRIME -> CALIBRATE -> TEACH -> ENCODE -> REFERENCE -> RETRIEVE |
| C-FE-STD | Trey's Favorite: Start Here | draft | pass | 11 | classification, mechanism | medium | 35 | PRIME -> CALIBRATE -> TEACH -> REFERENCE -> ENCODE -> RETRIEVE |
| C-LE-001 | Low Energy | draft | pass | 7 | classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis | low | 15 | PRIME -> CALIBRATE -> REFERENCE -> RETRIEVE -> OVERLEARN |
| C-MR-001 | Mastery Review | draft | pass | 6 | classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis | medium | 30 | REFERENCE -> RETRIEVE -> OVERLEARN |
| C-PI-001 | Pathophysiology Intake | draft | pass | 8 | classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis | high | 45 | PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE |
| C-QD-001 | Quick Drill | draft | pass | 6 | classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis | medium | 15 | PRIME -> CALIBRATE -> REFERENCE -> RETRIEVE -> OVERLEARN |
| C-QF-001 | Quick First Exposure | draft | pass | 7 | classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis | medium | 20 | PRIME -> CALIBRATE -> REFERENCE -> RETRIEVE -> OVERLEARN |
| C-RS-001 | Review Sprint | draft | pass | 6 | classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis | medium | 25 | PRIME -> REFERENCE -> RETRIEVE -> ENCODE -> OVERLEARN |
| C-SW-001 | SWEEP | draft | pass | 7 | synthesis | medium | 30 | PRIME -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN |
| C-TRY-001 | Top-Down Narrative Mastery | draft | pass | 12 | classification, mechanism, definition, procedure, spatial | medium | 45 | PRIME -> CALIBRATE -> TEACH -> REFERENCE -> ENCODE -> RETRIEVE -> OVERLEARN |
| C-TRY-002 | Top-Down Forward Progress | draft | pass | 12 | classification, mechanism, definition, procedure, spatial, recognition | medium | 50 | PRIME -> CALIBRATE -> TEACH -> REFERENCE -> ENCODE -> RETRIEVE -> OVERLEARN |
| C-VE-001 | Visual Encoding | draft | pass | 8 | classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis | high | 40 | PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN |

## Method Inventory

### PRIME (10)

| ID | Name | Status | Min | Energy | Artifact | Outputs |
|---|---|---|---:|---|---|---|
| M-PRE-002 | Overarching Pre-Question Set | validated | 3 | low | notes | - |
| M-PRE-004 | Hierarchical Advance Organizer | validated | 5 | low | notes | PillarTree; PriorKnowledgeLinks; Hypotheses |
| M-PRE-005 | Skeleton Concept Hierarchy | validated | 5 | medium | concept-map | - |
| M-PRE-006 | Structural Skimming + Pillar Mapping | validated | 5 | medium | notes | - |
| M-PRE-008 | Structural Extraction | validated | 5 | medium | notes | - |
| M-PRE-009 | Syntopical Big-Picture Synthesis | validated | 6 | low | notes | - |
| M-PRE-010 | Learning Objectives Primer | validated | 3 | low | notes | ModuleObjectiveMap or FocusObjectiveCard; selected focus objective; learner acknowledgment |
| M-PRE-012 | Terminology Pretraining | validated | 4 | low | notes | TerminologySet; abbreviation map; concise component definitions |
| M-PRE-013 | Big-Picture Orientation Summary | validated | 4 | low | notes | OrientationSummary; major sections; north-star sentence |
| M-PRE-014 | Ambiguity and Blind-Spot Scan | validated | 4 | medium | notes | AmbiguityLog; unsupported jumps; follow-up targets |

### TEACH (9)

| ID | Name | Status | Min | Energy | Artifact | Outputs |
|---|---|---|---:|---|---|---|
| M-ENC-008 | Mechanism Trace | validated | 10 | high | notes | - |
| M-INT-001 | Analogy Bridge | validated | 3 | medium | notes | - |
| M-TEA-001 | Story Spine | draft | 6 | medium | notes | - |
| M-TEA-002 | Confusable Contrast Teach | draft | 6 | medium | table | - |
| M-TEA-003 | Clinical Anchor Mini-Case | draft | 5 | medium | notes | - |
| M-TEA-004 | Modality Switch | draft | 3 | low | notes | - |
| M-TEA-005 | Jingle / Rhyme Hook | draft | 3 | low | notes | - |
| M-TEA-006 | Depth Ladder (4-10-HS-PT) | draft | 4 | low | notes | - |
| M-TEA-007 | KWIK Lite | draft | 2 | low | notes | - |

### CALIBRATE (7)

| ID | Name | Status | Min | Energy | Artifact | Outputs |
|---|---|---|---:|---|---|---|
| M-CAL-001 | Micro Precheck | validated | 4 | medium | notes | - |
| M-CAL-002 | Full Calibrate Probes | validated | 6 | medium | notes | - |
| M-CAL-003 | Full Calibrate Priority Set | validated | 3 | low | notes | - |
| M-CAL-004 | Story Confidence Tag | core | 2 | low | notes | - |
| M-PRE-001 | Brain Dump | validated | 3 | low | notes | Connection refresh list; known-knowns snapshot; flagged gaps |
| M-PRE-003 | Prior Knowledge Scan | validated | 3 | low | notes | - |
| M-PRE-007 | Pre-Test | validated | 5 | low | notes | - |

### ENCODE (18)

| ID | Name | Status | Min | Energy | Artifact | Outputs |
|---|---|---|---:|---|---|---|
| M-ENC-001 | KWIK Hook | validated | 3 | medium | notes | - |
| M-ENC-002 | Seed-Lock Generation | validated | 3 | medium | notes | - |
| M-ENC-003 | Draw-Label | validated | 10 | high | notes | - |
| M-ENC-004 | Teach-Back | validated | 5 | high | notes | - |
| M-ENC-005 | Why-Chain | validated | 5 | medium | notes | - |
| M-ENC-007 | Self-Explanation Protocol | validated | 7 | medium | notes | - |
| M-ENC-009 | Concept Map | draft | 10 | high | concept-map | Concept map (nodes + labeled links); Mermaid code |
| M-ENC-010 | Comparison Table | validated | 7 | medium | table | - |
| M-ENC-011 | Process Flowchart | validated | 10 | high | flowchart | - |
| M-ENC-012 | Clinical Decision Tree | validated | 10 | high | decision-tree | - |
| M-ENC-013 | Memory Palace | validated | 10 | high | notes | - |
| M-ENC-014 | Chain Linking | validated | 8 | medium | notes | - |
| M-ENC-015 | Hand-Draw Map | core | 5 | medium | notes | - |
| M-INT-002 | Clinical Application | validated | 5 | high | notes | - |
| M-INT-003 | Cross-Topic Link | validated | 3 | medium | notes | - |
| M-INT-004 | Side-by-Side Comparison | validated | 7 | medium | notes | - |
| M-INT-005 | Case Walkthrough | draft | 10 | high | notes | Case walkthrough narrative; Assessment plan; Reasoning verification |
| M-INT-006 | Illness Script Builder | validated | 10 | high | notes | - |

### REFERENCE (4)

| ID | Name | Status | Min | Energy | Artifact | Outputs |
|---|---|---|---:|---|---|---|
| M-REF-001 | Error Autopsy | validated | 5 | medium | notes | - |
| M-REF-002 | Mastery Loop | validated | 10 | medium | notes | - |
| M-REF-003 | One-Page Anchor | validated | 8 | medium | outline | - |
| M-REF-004 | Question Bank Seed | validated | 8 | medium | outline | - |

### RETRIEVE (7)

| ID | Name | Status | Min | Energy | Artifact | Outputs |
|---|---|---|---:|---|---|---|
| M-RET-001 | Timed Brain Dump | validated | 5 | medium | notes | - |
| M-RET-002 | Sprint Quiz | validated | 5 | medium | notes | - |
| M-RET-003 | Fill-in-Blank | validated | 5 | low | notes | - |
| M-RET-004 | Mixed Practice | validated | 10 | high | notes | - |
| M-RET-005 | Variable Retrieval | validated | 10 | medium | notes | - |
| M-RET-006 | Adversarial Drill | validated | 8 | high | notes | - |
| M-RET-007 | Timed Sprint Sets | validated | 8 | high | notes | - |

### OVERLEARN (4)

| ID | Name | Status | Min | Energy | Artifact | Outputs |
|---|---|---|---:|---|---|---|
| M-OVR-001 | Exit Ticket | validated | 3 | low | notes | - |
| M-OVR-002 | Anki Card Draft | validated | 5 | low | cards | - |
| M-OVR-003 | Drill Sheet Builder | validated | 10 | medium | notes | - |
| M-OVR-004 | Post-Learn Brain Dump | core | 7 | medium | notes | - |

## Chain Details

### C-AD-001 — Anatomy Deep Dive

- ID meaning: `Chain / Anatomy Deep Dive`
- Status: `draft`
- Description: Anatomy-focused chain with a short PRIME orientation, a calibrate check, and drawing-led encoding before retrieval and overlearn.
- Allowed modes: classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis
- Context: energy=high; time_available=40
- Requires reference targets: `True`
- Stage sequence: PRIME -> CALIBRATE -> PRIME -> ENCODE -> REFERENCE -> REFERENCE -> RETRIEVE -> OVERLEARN
- Control-plane validation: `pass`
- Certification: `baseline-certification`
- Blocks:
  1. `M-PRE-010` — Learning Objectives Primer [PRIME]
  2. `M-PRE-003` — Prior Knowledge Scan [CALIBRATE]
  3. `M-PRE-006` — Structural Skimming + Pillar Mapping [PRIME]
  4. `M-ENC-003` — Draw-Label [ENCODE]
  5. `M-REF-003` — One-Page Anchor [REFERENCE]
  6. `M-REF-004` — Question Bank Seed [REFERENCE]
  7. `M-RET-001` — Timed Brain Dump [RETRIEVE]
  8. `M-OVR-002` — Anki Card Draft [OVERLEARN]
- Gates: prime_artifacts_present, calibrate_attempt_completed, reference_targets_ready, retrieve_after_reference_only, exit_requires_rsr_or_remediation
- Failure actions: inject_reference_targets_before_retrieve, substitute_by_error_type_mapping, re_run_retrieval_gate_after_insertion

### C-CI-001 — Clinical Reasoning Intake

- ID meaning: `Chain / Clinical Reasoning Intake`
- Status: `draft`
- Description: Clinical first exposure with a short PRIME orientation before pre-test, illness scripts, comparison, retrieval, and overlearn.
- Allowed modes: classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis
- Context: energy=high; time_available=45
- Requires reference targets: `True`
- Stage sequence: PRIME -> CALIBRATE -> ENCODE -> ENCODE -> REFERENCE -> REFERENCE -> RETRIEVE -> OVERLEARN
- Control-plane validation: `pass`
- Certification: `baseline-certification`
- Blocks:
  1. `M-PRE-010` — Learning Objectives Primer [PRIME]
  2. `M-PRE-007` — Pre-Test [CALIBRATE]
  3. `M-INT-006` — Illness Script Builder [ENCODE]
  4. `M-INT-004` — Side-by-Side Comparison [ENCODE]
  5. `M-REF-003` — One-Page Anchor [REFERENCE]
  6. `M-REF-004` — Question Bank Seed [REFERENCE]
  7. `M-RET-001` — Timed Brain Dump [RETRIEVE]
  8. `M-OVR-002` — Anki Card Draft [OVERLEARN]
- Gates: prime_artifacts_present, calibrate_attempt_completed, reference_targets_ready, retrieve_after_reference_only, exit_requires_rsr_or_remediation
- Failure actions: inject_reference_targets_before_retrieve, substitute_by_error_type_mapping, re_run_retrieval_gate_after_insertion

### C-CR-001 — Clinical Reasoning

- ID meaning: `Chain / Clinical Reasoning`
- Status: `draft`
- Description: Build clinical reasoning chains with a short PRIME orientation, a calibrate scan, and contrast-heavy encoding before wrap.
- Allowed modes: classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis
- Context: energy=high; time_available=45
- Requires reference targets: `False`
- Stage sequence: PRIME -> CALIBRATE -> PRIME -> ENCODE -> ENCODE -> REFERENCE -> OVERLEARN
- Control-plane validation: `pass`
- Certification: `baseline-certification`
- Blocks:
  1. `M-PRE-010` — Learning Objectives Primer [PRIME]
  2. `M-PRE-003` — Prior Knowledge Scan [CALIBRATE]
  3. `M-PRE-006` — Structural Skimming + Pillar Mapping [PRIME]
  4. `M-INT-005` — Case Walkthrough [ENCODE]
  5. `M-INT-004` — Side-by-Side Comparison [ENCODE]
  6. `M-REF-001` — Error Autopsy [REFERENCE]
  7. `M-OVR-002` — Anki Card Draft [OVERLEARN]
- Gates: prime_artifacts_present, calibrate_attempt_completed, reference_targets_ready, retrieve_after_reference_only, exit_requires_rsr_or_remediation
- Failure actions: inject_reference_targets_before_retrieve, substitute_by_error_type_mapping, re_run_retrieval_gate_after_insertion

### C-DA-001 — Dense Anatomy Intake

- ID meaning: `Chain / Dense Anatomy Intake`
- Status: `draft`
- Description: High-detail anatomy first exposure with a short PRIME orientation before pre-test, Draw-Label for spatial memory, retrieval, and later generative steps.
- Allowed modes: spatial
- Context: energy=high; time_available=40
- Requires reference targets: `True`
- Stage sequence: PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> REFERENCE -> RETRIEVE -> ENCODE -> OVERLEARN
- Control-plane validation: `pass`
- Certification: `baseline-certification`
- Blocks:
  1. `M-PRE-010` — Learning Objectives Primer [PRIME]
  2. `M-PRE-007` — Pre-Test [CALIBRATE]
  3. `M-ENC-003` — Draw-Label [ENCODE]
  4. `M-REF-003` — One-Page Anchor [REFERENCE]
  5. `M-REF-004` — Question Bank Seed [REFERENCE]
  6. `M-RET-001` — Timed Brain Dump [RETRIEVE]
  7. `M-ENC-001` — KWIK Hook [ENCODE]
  8. `M-OVR-002` — Anki Card Draft [OVERLEARN]
- Gates: prime_artifacts_present, calibrate_attempt_completed, reference_targets_ready, retrieve_after_reference_only, exit_requires_rsr_or_remediation
- Failure actions: inject_reference_targets_before_retrieve, substitute_by_error_type_mapping, re_run_retrieval_gate_after_insertion

### C-DP-001 — DEPTH

- ID meaning: `Chain / DEPTH`
- Status: `draft`
- Description: Pass 2: Selective mastery on high-priority objectives with a quick PRIME orientation, pre-test calibration, then depth encode/application work. Retrieval-driven. Cards only from errors.
- Allowed modes: mechanism, computation, procedure
- Context: energy=high; time_available=45
- Requires reference targets: `True`
- Stage sequence: PRIME -> CALIBRATE -> ENCODE -> ENCODE -> ENCODE -> REFERENCE -> REFERENCE -> RETRIEVE -> REFERENCE -> OVERLEARN
- Control-plane validation: `pass`
- Certification: `baseline-certification`
- Blocks:
  1. `M-PRE-010` — Learning Objectives Primer [PRIME]
  2. `M-PRE-007` — Pre-Test [CALIBRATE]
  3. `M-ENC-005` — Why-Chain [ENCODE]
  4. `M-ENC-007` — Self-Explanation Protocol [ENCODE]
  5. `M-INT-002` — Clinical Application [ENCODE]
  6. `M-REF-003` — One-Page Anchor [REFERENCE]
  7. `M-REF-004` — Question Bank Seed [REFERENCE]
  8. `M-RET-005` — Variable Retrieval [RETRIEVE]
  9. `M-REF-001` — Error Autopsy [REFERENCE]
  10. `M-OVR-002` — Anki Card Draft [OVERLEARN]
- Gates: prime_artifacts_present, calibrate_attempt_completed, reference_targets_ready, retrieve_after_reference_only, exit_requires_rsr_or_remediation
- Failure actions: inject_reference_targets_before_retrieve, substitute_by_error_type_mapping, re_run_retrieval_gate_after_insertion

### C-EP-001 — Exam Prep

- ID meaning: `Chain / Exam Prep`
- Status: `draft`
- Description: Exam-focused chain with interleaving and error analysis. Prepare → Retrieve → Interrogate → Refine → Overlearn.
- Allowed modes: classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis
- Context: energy=high; time_available=35
- Requires reference targets: `True`
- Stage sequence: PRIME -> REFERENCE -> REFERENCE -> RETRIEVE -> ENCODE -> REFERENCE -> OVERLEARN
- Control-plane validation: `pass`
- Certification: `baseline-certification`
- Blocks:
  1. `M-PRE-002` — Overarching Pre-Question Set [PRIME]
  2. `M-REF-003` — One-Page Anchor [REFERENCE]
  3. `M-REF-004` — Question Bank Seed [REFERENCE]
  4. `M-RET-004` — Mixed Practice [RETRIEVE]
  5. `M-INT-004` — Side-by-Side Comparison [ENCODE]
  6. `M-REF-001` — Error Autopsy [REFERENCE]
  7. `M-OVR-002` — Anki Card Draft [OVERLEARN]
- Gates: prime_artifacts_present, calibrate_attempt_completed, reference_targets_ready, retrieve_after_reference_only, exit_requires_rsr_or_remediation
- Failure actions: inject_reference_targets_before_retrieve, substitute_by_error_type_mapping, re_run_retrieval_gate_after_insertion

### C-FE-001 — First Exposure (Core)

- ID meaning: `Chain / First Exposure / Core`
- Status: `draft`
- Description: Control-plane first exposure flow with explicit MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE opening, followed by ENCODE, REFERENCE, RETRIEVE, and OVERLEARN.
- Allowed modes: classification, definition, recognition
- Context: energy=high; time_available=55
- Requires reference targets: `True`
- Stage sequence: PRIME -> PRIME -> PRIME -> CALIBRATE -> TEACH -> REFERENCE -> CALIBRATE -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> RETRIEVE -> RETRIEVE -> OVERLEARN -> OVERLEARN
- Control-plane validation: `pass`
- Certification: `baseline-certification`
- Blocks:
  1. `M-PRE-010` — Learning Objectives Primer [PRIME]
  2. `M-PRE-008` — Structural Extraction [PRIME]
  3. `M-PRE-009` — Syntopical Big-Picture Synthesis [PRIME]
  4. `M-CAL-001` — Micro Precheck [CALIBRATE]
  5. `M-INT-001` — Analogy Bridge [TEACH]
  6. `M-REF-003` — One-Page Anchor [REFERENCE]
  7. `M-CAL-002` — Full Calibrate Probes [CALIBRATE]
  8. `M-CAL-003` — Full Calibrate Priority Set [CALIBRATE]
  9. `M-ENC-001` — KWIK Hook [ENCODE]
  10. `M-REF-004` — Question Bank Seed [REFERENCE]
  11. `M-RET-001` — Timed Brain Dump [RETRIEVE]
  12. `M-RET-006` — Adversarial Drill [RETRIEVE]
  13. `M-RET-007` — Timed Sprint Sets [RETRIEVE]
  14. `M-OVR-002` — Anki Card Draft [OVERLEARN]
  15. `M-OVR-003` — Drill Sheet Builder [OVERLEARN]
- Gates: prime_artifacts_present, micro_calibrate_before_teach, teach_chunk_delivered_when_present, teach_close_artifact_ready, full_calibrate_after_teach, mnemonic_after_teach_close_artifact_only, reference_targets_ready, retrieve_after_reference_only, exit_requires_rsr_or_remediation
- Failure actions: inject_reference_targets_before_retrieve, substitute_by_error_type_mapping, re_run_retrieval_gate_after_insertion

### C-FE-MIN — First Exposure: Minimal

- ID meaning: `Chain / First Exposure / Minimal`
- Status: `draft`
- Description: Minimal first-exposure chain for low-energy sessions targeting definition and recognition modes. Uses compact opening sequence MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE, then light retrieval and wrap-up.
- Allowed modes: definition, recognition
- Context: energy=low; time_available=20
- Requires reference targets: `True`
- Stage sequence: PRIME -> PRIME -> CALIBRATE -> TEACH -> REFERENCE -> CALIBRATE -> CALIBRATE -> RETRIEVE -> OVERLEARN
- Control-plane validation: `pass`
- Certification: `baseline-certification`
- Blocks:
  1. `M-PRE-010` — Learning Objectives Primer [PRIME]
  2. `M-PRE-008` — Structural Extraction [PRIME]
  3. `M-CAL-001` — Micro Precheck [CALIBRATE]
  4. `M-TEA-004` — Modality Switch [TEACH]
  5. `M-REF-003` — One-Page Anchor [REFERENCE]
  6. `M-CAL-002` — Full Calibrate Probes [CALIBRATE]
  7. `M-CAL-003` — Full Calibrate Priority Set [CALIBRATE]
  8. `M-RET-001` — Timed Brain Dump [RETRIEVE]
  9. `M-OVR-001` — Exit Ticket [OVERLEARN]
- Gates: micro_calibrate_before_teach, teach_close_artifact_ready, full_calibrate_after_teach, rsr_accuracy_ge_0.80
- Failure actions: inject_reference_targets_before_retrieve, re_run_retrieval_gate_after_insertion

### C-FE-PRO — First Exposure: Procedure

- ID meaning: `Chain / First Exposure / Procedure`
- Status: `draft`
- Description: Procedure-focused first-exposure chain for high-energy sessions. Uses explicit opening sequence MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE, then process encoding, anchor generation, case walkthrough with fault injection, and timed sprint retrieval.
- Allowed modes: procedure
- Context: energy=high; time_available=-
- Requires reference targets: `True`
- Stage sequence: PRIME -> PRIME -> CALIBRATE -> TEACH -> ENCODE -> CALIBRATE -> CALIBRATE -> REFERENCE -> ENCODE -> RETRIEVE
- Control-plane validation: `pass`
- Certification: `baseline-certification`
- Blocks:
  1. `M-PRE-010` — Learning Objectives Primer [PRIME]
  2. `M-PRE-008` — Structural Extraction [PRIME]
  3. `M-CAL-001` — Micro Precheck [CALIBRATE]
  4. `M-TEA-001` — Story Spine [TEACH]
  5. `M-ENC-011` — Process Flowchart [ENCODE]
  6. `M-CAL-002` — Full Calibrate Probes [CALIBRATE]
  7. `M-CAL-003` — Full Calibrate Priority Set [CALIBRATE]
  8. `M-REF-003` — One-Page Anchor [REFERENCE]
  9. `M-INT-005` — Case Walkthrough [ENCODE]
  10. `M-RET-007` — Timed Sprint Sets [RETRIEVE]
- Gates: micro_calibrate_before_teach, teach_chunk_delivered_when_present, teach_close_artifact_ready, full_calibrate_after_teach, cascade_misses_eq_0
- Failure actions: inject_reference_targets_before_retrieve, substitute_by_error_type_mapping, re_run_retrieval_gate_after_insertion

### C-FE-STD — Trey's Favorite: Start Here

- ID meaning: `Chain / First Exposure / Standard`
- Status: `draft`
- Description: Default start-here chain for Trey. Standard first-exposure flow for medium-energy sessions targeting classification and mechanism modes. Opening is explicit MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE, then ENCODE, reference generation, and timed retrieval sprint.
- Allowed modes: classification, mechanism
- Context: energy=medium; time_available=35
- Requires reference targets: `True`
- Stage sequence: PRIME -> PRIME -> CALIBRATE -> TEACH -> REFERENCE -> CALIBRATE -> CALIBRATE -> ENCODE -> ENCODE -> REFERENCE -> RETRIEVE
- Control-plane validation: `pass`
- Certification: `baseline-certification`
- Blocks:
  1. `M-PRE-010` — Learning Objectives Primer [PRIME]
  2. `M-PRE-008` — Structural Extraction [PRIME]
  3. `M-CAL-001` — Micro Precheck [CALIBRATE]
  4. `M-ENC-008` — Mechanism Trace [TEACH]
  5. `M-REF-003` — One-Page Anchor [REFERENCE]
  6. `M-CAL-002` — Full Calibrate Probes [CALIBRATE]
  7. `M-CAL-003` — Full Calibrate Priority Set [CALIBRATE]
  8. `M-ENC-010` — Comparison Table [ENCODE]
  9. `M-ENC-001` — KWIK Hook [ENCODE]
  10. `M-REF-004` — Question Bank Seed [REFERENCE]
  11. `M-RET-007` — Timed Sprint Sets [RETRIEVE]
- Gates: micro_calibrate_before_teach, teach_chunk_delivered_when_present, teach_close_artifact_ready, full_calibrate_after_teach, mnemonic_after_teach_close_artifact_only, tie_breakers_complete, rsr_accuracy_ge_0.85
- Failure actions: inject_reference_targets_before_retrieve, substitute_by_error_type_mapping, re_run_retrieval_gate_after_insertion

### C-LE-001 — Low Energy

- ID meaning: `Chain / Low Energy`
- Status: `draft`
- Description: Low-effort chain for tired days. Short PRIME orientation, quick calibrate pulse, then reference, retrieve, and overlearn. Maintain streak without burning out.
- Allowed modes: classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis
- Context: energy=low; time_available=15
- Requires reference targets: `True`
- Stage sequence: PRIME -> CALIBRATE -> PRIME -> REFERENCE -> REFERENCE -> RETRIEVE -> OVERLEARN
- Control-plane validation: `pass`
- Certification: `baseline-certification`
- Blocks:
  1. `M-PRE-010` — Learning Objectives Primer [PRIME]
  2. `M-PRE-001` — Brain Dump [CALIBRATE]
  3. `M-PRE-004` — Hierarchical Advance Organizer [PRIME]
  4. `M-REF-003` — One-Page Anchor [REFERENCE]
  5. `M-REF-004` — Question Bank Seed [REFERENCE]
  6. `M-RET-003` — Fill-in-Blank [RETRIEVE]
  7. `M-OVR-001` — Exit Ticket [OVERLEARN]
- Gates: prime_artifacts_present, calibrate_attempt_completed, reference_targets_ready, retrieve_after_reference_only, exit_requires_rsr_or_remediation
- Failure actions: inject_reference_targets_before_retrieve, substitute_by_error_type_mapping, re_run_retrieval_gate_after_insertion

### C-MR-001 — Mastery Review

- ID meaning: `Chain / Mastery Review`
- Status: `draft`
- Description: Deep consolidation with successive relearning. Retrieve → Refine → Overlearn.
- Allowed modes: classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis
- Context: energy=medium; time_available=30
- Requires reference targets: `True`
- Stage sequence: REFERENCE -> REFERENCE -> RETRIEVE -> REFERENCE -> REFERENCE -> OVERLEARN
- Control-plane validation: `pass`
- Certification: `baseline-certification`
- Blocks:
  1. `M-REF-003` — One-Page Anchor [REFERENCE]
  2. `M-REF-004` — Question Bank Seed [REFERENCE]
  3. `M-RET-001` — Timed Brain Dump [RETRIEVE]
  4. `M-REF-001` — Error Autopsy [REFERENCE]
  5. `M-REF-002` — Mastery Loop [REFERENCE]
  6. `M-OVR-002` — Anki Card Draft [OVERLEARN]
- Gates: prime_artifacts_present, calibrate_attempt_completed, reference_targets_ready, retrieve_after_reference_only, exit_requires_rsr_or_remediation
- Failure actions: inject_reference_targets_before_retrieve, substitute_by_error_type_mapping, re_run_retrieval_gate_after_insertion

### C-PI-001 — Pathophysiology Intake

- ID meaning: `Chain / Pathophysiology Intake`
- Status: `draft`
- Description: Pathology first exposure with a short PRIME orientation before pre-test, self-explanation, concept clustering, retrieval, and refinement.
- Allowed modes: classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis
- Context: energy=high; time_available=45
- Requires reference targets: `True`
- Stage sequence: PRIME -> CALIBRATE -> ENCODE -> PRIME -> REFERENCE -> REFERENCE -> RETRIEVE -> REFERENCE
- Control-plane validation: `pass`
- Certification: `baseline-certification`
- Blocks:
  1. `M-PRE-010` — Learning Objectives Primer [PRIME]
  2. `M-PRE-007` — Pre-Test [CALIBRATE]
  3. `M-ENC-007` — Self-Explanation Protocol [ENCODE]
  4. `M-PRE-005` — Skeleton Concept Hierarchy [PRIME]
  5. `M-REF-003` — One-Page Anchor [REFERENCE]
  6. `M-REF-004` — Question Bank Seed [REFERENCE]
  7. `M-RET-001` — Timed Brain Dump [RETRIEVE]
  8. `M-REF-001` — Error Autopsy [REFERENCE]
- Gates: prime_artifacts_present, calibrate_attempt_completed, reference_targets_ready, retrieve_after_reference_only, exit_requires_rsr_or_remediation
- Failure actions: inject_reference_targets_before_retrieve, substitute_by_error_type_mapping, re_run_retrieval_gate_after_insertion

### C-QD-001 — Quick Drill

- ID meaning: `Chain / Quick Drill`
- Status: `draft`
- Description: Minimal time investment. Short PRIME orientation, quick calibrate pulse, then reference, retrieve, and overlearn. Good for spacing reviews.
- Allowed modes: classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis
- Context: energy=medium; time_available=15
- Requires reference targets: `True`
- Stage sequence: PRIME -> CALIBRATE -> REFERENCE -> REFERENCE -> RETRIEVE -> OVERLEARN
- Control-plane validation: `pass`
- Certification: `baseline-certification`
- Blocks:
  1. `M-PRE-010` — Learning Objectives Primer [PRIME]
  2. `M-PRE-001` — Brain Dump [CALIBRATE]
  3. `M-REF-003` — One-Page Anchor [REFERENCE]
  4. `M-REF-004` — Question Bank Seed [REFERENCE]
  5. `M-RET-002` — Sprint Quiz [RETRIEVE]
  6. `M-OVR-001` — Exit Ticket [OVERLEARN]
- Gates: prime_artifacts_present, calibrate_attempt_completed, reference_targets_ready, retrieve_after_reference_only, exit_requires_rsr_or_remediation
- Failure actions: inject_reference_targets_before_retrieve, substitute_by_error_type_mapping, re_run_retrieval_gate_after_insertion

### C-QF-001 — Quick First Exposure

- ID meaning: `Chain / Quick First Exposure`
- Status: `draft`
- Description: Minimal intake chain when time is limited. Short PRIME orientation before pre-test, hierarchy setup, retrieval, and overlearn.
- Allowed modes: classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis
- Context: energy=medium; time_available=20
- Requires reference targets: `True`
- Stage sequence: PRIME -> CALIBRATE -> PRIME -> REFERENCE -> REFERENCE -> RETRIEVE -> OVERLEARN
- Control-plane validation: `pass`
- Certification: `baseline-certification`
- Blocks:
  1. `M-PRE-010` — Learning Objectives Primer [PRIME]
  2. `M-PRE-007` — Pre-Test [CALIBRATE]
  3. `M-PRE-004` — Hierarchical Advance Organizer [PRIME]
  4. `M-REF-003` — One-Page Anchor [REFERENCE]
  5. `M-REF-004` — Question Bank Seed [REFERENCE]
  6. `M-RET-001` — Timed Brain Dump [RETRIEVE]
  7. `M-OVR-001` — Exit Ticket [OVERLEARN]
- Gates: prime_artifacts_present, calibrate_attempt_completed, reference_targets_ready, retrieve_after_reference_only, exit_requires_rsr_or_remediation
- Failure actions: inject_reference_targets_before_retrieve, substitute_by_error_type_mapping, re_run_retrieval_gate_after_insertion

### C-RS-001 — Review Sprint

- ID meaning: `Chain / Review Sprint`
- Status: `draft`
- Description: Fast review loop. Prepare → Retrieve → Interrogate (application) → Overlearn. Skips encode for known material.
- Allowed modes: classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis
- Context: energy=medium; time_available=25
- Requires reference targets: `True`
- Stage sequence: PRIME -> REFERENCE -> REFERENCE -> RETRIEVE -> ENCODE -> OVERLEARN
- Control-plane validation: `pass`
- Certification: `baseline-certification`
- Blocks:
  1. `M-PRE-002` — Overarching Pre-Question Set [PRIME]
  2. `M-REF-003` — One-Page Anchor [REFERENCE]
  3. `M-REF-004` — Question Bank Seed [REFERENCE]
  4. `M-RET-002` — Sprint Quiz [RETRIEVE]
  5. `M-INT-002` — Clinical Application [ENCODE]
  6. `M-OVR-001` — Exit Ticket [OVERLEARN]
- Gates: prime_artifacts_present, calibrate_attempt_completed, reference_targets_ready, retrieve_after_reference_only, exit_requires_rsr_or_remediation
- Failure actions: inject_reference_targets_before_retrieve, substitute_by_error_type_mapping, re_run_retrieval_gate_after_insertion

### C-SW-001 — SWEEP

- ID meaning: `Chain / SWEEP`
- Status: `draft`
- Description: Pass 1: Fast structural understanding. Touch everything once. Produce visual maps, objectives, confusables, seed cards.
- Allowed modes: synthesis
- Context: energy=medium; time_available=30
- Requires reference targets: `True`
- Stage sequence: PRIME -> ENCODE -> ENCODE -> REFERENCE -> REFERENCE -> RETRIEVE -> OVERLEARN
- Control-plane validation: `pass`
- Certification: `baseline-certification`
- Blocks:
  1. `M-PRE-005` — Skeleton Concept Hierarchy [PRIME]
  2. `M-ENC-009` — Concept Map [ENCODE]
  3. `M-ENC-010` — Comparison Table [ENCODE]
  4. `M-REF-003` — One-Page Anchor [REFERENCE]
  5. `M-REF-004` — Question Bank Seed [REFERENCE]
  6. `M-RET-002` — Sprint Quiz [RETRIEVE]
  7. `M-OVR-002` — Anki Card Draft [OVERLEARN]
- Gates: prime_artifacts_present, calibrate_attempt_completed, reference_targets_ready, retrieve_after_reference_only, exit_requires_rsr_or_remediation
- Failure actions: inject_reference_targets_before_retrieve, substitute_by_error_type_mapping, re_run_retrieval_gate_after_insertion

### C-TRY-001 — Top-Down Narrative Mastery

- ID meaning: `Chain / Top-Down / Narrative Mastery`
- Status: `draft`
- Description: Top-down first-exposure chain with explicit opening order: MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE. TEACH builds a story + analogy bridge, closes with a compact anchor artifact, then full calibrate determines ENCODE depth. Teach-back is not a default live gate.
- Allowed modes: classification, mechanism, definition, procedure, spatial
- Context: energy=medium; time_available=45
- Requires reference targets: `True`
- Stage sequence: PRIME -> CALIBRATE -> TEACH -> TEACH -> REFERENCE -> CALIBRATE -> CALIBRATE -> ENCODE -> ENCODE -> ENCODE -> RETRIEVE -> OVERLEARN
- Control-plane validation: `pass`
- Certification: `strict-certification`
- Blocks:
  1. `M-PRE-004` — Hierarchical Advance Organizer [PRIME]
  2. `M-CAL-001` — Micro Precheck [CALIBRATE]
  3. `M-TEA-001` — Story Spine [TEACH]
  4. `M-INT-001` — Analogy Bridge [TEACH]
  5. `M-REF-003` — One-Page Anchor [REFERENCE]
  6. `M-CAL-002` — Full Calibrate Probes [CALIBRATE]
  7. `M-CAL-003` — Full Calibrate Priority Set [CALIBRATE]
  8. `M-ENC-015` — Hand-Draw Map [ENCODE]
  9. `M-ENC-001` — KWIK Hook [ENCODE]
  10. `M-ENC-009` — Concept Map [ENCODE]
  11. `M-RET-001` — Timed Brain Dump [RETRIEVE]
  12. `M-OVR-004` — Post-Learn Brain Dump [OVERLEARN]
- Gates: prime_artifacts_present, micro_calibrate_before_teach, teach_chunk_delivered_when_present, teach_close_artifact_ready, full_calibrate_after_teach, mnemonic_after_teach_close_artifact_only, retrieve_after_reference_only
- Failure actions: if_micro_calibrate_unstable_reduce_teach_chunk_size, if_full_calibrate_poor_route_to_targeted_encode, substitute_by_error_type_mapping

### C-TRY-002 — Top-Down Forward Progress

- ID meaning: `Chain / Top-Down / Forward Progress`
- Status: `draft`
- Description: Top-down first-exposure chain with tiered exits and explicit opening order: MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE. TEACH closes with a learner-usable anchor artifact before any mnemonic slot. Teach-back is removed from the default live path.
- Allowed modes: classification, mechanism, definition, procedure, spatial, recognition
- Context: energy=medium; time_available=50
- Requires reference targets: `True`
- Stage sequence: PRIME -> CALIBRATE -> TEACH -> TEACH -> REFERENCE -> CALIBRATE -> CALIBRATE -> ENCODE -> ENCODE -> ENCODE -> RETRIEVE -> OVERLEARN
- Control-plane validation: `pass`
- Certification: `strict-certification`
- Blocks:
  1. `M-PRE-004` — Hierarchical Advance Organizer [PRIME]
  2. `M-CAL-001` — Micro Precheck [CALIBRATE]
  3. `M-ENC-008` — Mechanism Trace [TEACH]
  4. `M-INT-001` — Analogy Bridge [TEACH]
  5. `M-REF-003` — One-Page Anchor [REFERENCE]
  6. `M-CAL-002` — Full Calibrate Probes [CALIBRATE]
  7. `M-CAL-003` — Full Calibrate Priority Set [CALIBRATE]
  8. `M-ENC-015` — Hand-Draw Map [ENCODE]
  9. `M-ENC-001` — KWIK Hook [ENCODE]
  10. `M-ENC-009` — Concept Map [ENCODE]
  11. `M-RET-001` — Timed Brain Dump [RETRIEVE]
  12. `M-OVR-004` — Post-Learn Brain Dump [OVERLEARN]
- Gates: prime_artifacts_present, micro_calibrate_before_teach, teach_chunk_delivered_when_present, teach_close_artifact_ready, full_calibrate_after_teach, mnemonic_after_teach_close_artifact_only, retrieve_after_reference_only, tier_exit_allowed
- Failure actions: if_micro_calibrate_unstable_reduce_initial_chunk, if_full_calibrate_poor_route_to_targeted_encode, substitute_by_error_type_mapping

### C-VE-001 — Visual Encoding

- ID meaning: `Chain / Visual Encoding`
- Status: `draft`
- Description: Visualization-first encoding for topics with confusable concepts. Short PRIME orientation, quick calibrate pulse, then build visual representations before retrieval.
- Allowed modes: classification, mechanism, computation, definition, procedure, spatial, recognition, synthesis
- Context: energy=high; time_available=40
- Requires reference targets: `True`
- Stage sequence: PRIME -> CALIBRATE -> ENCODE -> ENCODE -> REFERENCE -> REFERENCE -> RETRIEVE -> OVERLEARN
- Control-plane validation: `pass`
- Certification: `baseline-certification`
- Blocks:
  1. `M-PRE-010` — Learning Objectives Primer [PRIME]
  2. `M-PRE-001` — Brain Dump [CALIBRATE]
  3. `M-ENC-009` — Concept Map [ENCODE]
  4. `M-ENC-010` — Comparison Table [ENCODE]
  5. `M-REF-003` — One-Page Anchor [REFERENCE]
  6. `M-REF-004` — Question Bank Seed [REFERENCE]
  7. `M-RET-001` — Timed Brain Dump [RETRIEVE]
  8. `M-OVR-001` — Exit Ticket [OVERLEARN]
- Gates: prime_artifacts_present, calibrate_attempt_completed, reference_targets_ready, retrieve_after_reference_only, exit_requires_rsr_or_remediation
- Failure actions: inject_reference_targets_before_retrieve, substitute_by_error_type_mapping, re_run_retrieval_gate_after_insertion

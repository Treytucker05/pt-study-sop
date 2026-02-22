# Tutor Control Plane Canon (Categories First)

Date: 2026-02-22  
Status: Reference background (evidence + rationale).  
Primary requirement sources: `docs/root/TUTOR_OWNER_INTENT.md`, `docs/root/TUTOR_CATEGORY_DEFINITIONS.md`, `docs/root/TUTOR_METHOD_SELECTION_RULES.md`.

## 1) Purpose
This file is the canonical reference for how the 6 control-plane categories are defined and used in the Tutor system.

Primary goal:
- keep one straight path to truth for category semantics
- prevent prompt drift across YAML, DB, API, wizard, and runtime chat

## 2) Canonical Terms
- `Category`: one of `PRIME`, `CALIBRATE`, `ENCODE`, `REFERENCE`, `RETRIEVE`, `OVERLEARN`.
- `Method`: a specific instructional routine that belongs to exactly one category.
- `Knob`: an acute variable that modifies how a method runs.
- `Chain`: ordered set of methods that executes in a tutor session.

## 3) Source-of-Truth Order
Use this precedence when conflicts appear:
1. `sop/library/17-control-plane.md`
2. `sop/library/methods/*.yaml`
3. `sop/library/chains/*.yaml`
4. Runtime adapters and UI compatibility layers

## 4) Category Cards (Operational + Learning Rationale)

### PRIME
Definition:
- Build structure before detail so the learner has a stable mental frame.

System use:
- input: source material or high-level topic
- output: structured scaffold (spine/skeleton/objective map)
- done when: learner can state what the topic is, what parts exist, and what matters most

Why it improves learning:
- Activating and organizing prior knowledge improves integration of new information.

Evidence anchors (method YAML citations):
- `M-PRE-003` Prior Knowledge Scan -> Ausubel (1968): `sop/library/methods/M-PRE-003.yaml`
- `M-PRE-008` Structural Extraction -> Ausubel (1968): `sop/library/methods/M-PRE-008.yaml`
- `M-PRE-002` Prediction Questions -> Pressley et al. (1990): `sop/library/methods/M-PRE-002.yaml`

### CALIBRATE
Definition:
- Measure baseline understanding and confidence before heavy study decisions.

System use:
- input: initial scaffold from PRIME
- output: priority/error map
- done when: weak areas are ranked and study targets are explicit

Why it improves learning:
- Metacognitive calibration reduces wasted effort and improves study allocation.

Evidence anchors:
- `M-CAL-001` Micro Precheck -> Kornell et al. (2009): `sop/library/methods/M-CAL-001.yaml`
- `M-CAL-002` Confidence Tagging -> Metcalfe (2017): `sop/library/methods/M-CAL-002.yaml`
- `M-CAL-003` Priority Set -> Rawson & Dunlosky (2011): `sop/library/methods/M-CAL-003.yaml`

### ENCODE
Definition:
- Convert information into durable, meaningful internal representations.

System use:
- input: calibrated priorities
- output: high-quality representations (comparisons, maps, traces, explanations)
- done when: learner can explain relationships/mechanisms, not just repeat definitions

Why it improves learning:
- Generative processing, dual coding, and self-explanation deepen comprehension and transfer.

Evidence anchors:
- `M-ENC-002` Seed-Lock Generation -> Slamecka & Graf (1978): `sop/library/methods/M-ENC-002.yaml`
- `M-ENC-003` Draw-Label -> Wammes et al. (2016): `sop/library/methods/M-ENC-003.yaml`
- `M-ENC-007` Self-Explanation Protocol -> Chi et al. (1994): `sop/library/methods/M-ENC-007.yaml`
- `M-ENC-010` Comparison Table -> Alfieri et al. (2013): `sop/library/methods/M-ENC-010.yaml`

### REFERENCE
Definition:
- Externalize retrieval targets and cues so recall has clear objective anchors.

System use:
- input: encoded representations + task demands
- output: cue artifacts (anchors/question seeds/checklists)
- done when: concrete retrieval targets exist and are versioned for session use

Why it improves learning:
- Explicit targets reduce guessing and improve quality of subsequent retrieval practice.

Evidence anchors:
- `M-REF-003` One-Page Anchor -> Schmidt & Rikers (2007): `sop/library/methods/M-REF-003.yaml`
- `M-REF-004` Question Bank Seed -> Roediger & Karpicke (2006): `sop/library/methods/M-REF-004.yaml`
- `M-REF-001` Error Autopsy -> Metcalfe (2017): `sop/library/methods/M-REF-001.yaml`

### RETRIEVE
Definition:
- Reconstruct knowledge from memory under controlled conditions and measure failures.

System use:
- input: valid targets from REFERENCE
- output: updated error profile plus retrieval performance
- done when: recall performance is measured and errors are routed to corrective methods

Why it improves learning:
- Retrieval practice is one of the most robust effects for durable retention.

Evidence anchors:
- `M-RET-001` Free Recall Blurt -> Roediger & Karpicke (2006): `sop/library/methods/M-RET-001.yaml`
- `M-RET-002` Sprint Quiz -> McDaniel et al. (2007): `sop/library/methods/M-RET-002.yaml`
- `M-RET-004` Mixed Practice -> Rohrer et al. (2015): `sop/library/methods/M-RET-004.yaml`
- `M-RET-007` Timed Sprint Sets -> Cepeda et al. (2006): `sop/library/methods/M-RET-007.yaml`

### OVERLEARN
Definition:
- Build fluency/automaticity after accuracy is acceptable.

System use:
- input: high-accuracy items from RETRIEVE
- output: stable drills/review assets for spacing and speed
- done when: performance is resilient under time pressure and delay

Why it improves learning:
- Spaced review and fluency reinforcement increase long-term retention and readiness.

Evidence anchors:
- `M-OVR-001` Exit Ticket -> Tanner (2012): `sop/library/methods/M-OVR-001.yaml`
- `M-OVR-002` Anki Card Draft -> Kornell (2009): `sop/library/methods/M-OVR-002.yaml`
- `M-OVR-003` Drill Sheet Builder -> Rawson & Dunlosky (2011): `sop/library/methods/M-OVR-003.yaml`

## 5) Hard Rules (Non-Negotiable)
- Dependency law: no retrieval without defined targets from REFERENCE.
  - Source: `sop/library/17-control-plane.md`
- Every method belongs to exactly one control-stage category.
  - Source: `brain/db_setup.py` (`method_blocks.control_stage` constraint)

## 6) Runtime Drift Risks (Known)
- Chain runtime persists `block_ids` only; per-step knob payload is not canonicalized yet.
  - `brain/db_setup.py`
  - `brain/dashboard/api_methods.py`
  - `brain/dashboard/api_tutor.py`
- Tutor chain-builder warning logic still includes legacy category strings (`prepare`, `interrogate`), risking category-semantic drift.
  - `dashboard_rebuild/client/src/components/TutorChainBuilder.tsx`
- Selector can produce symbolic chain IDs (`C-FE-*`) that are stored as metadata; this is not always the same as an active concrete runtime chain ID.
  - `brain/selector.py`
  - `brain/selector_bridge.py`
  - `brain/dashboard/api_tutor.py`

## 7) LLM Instruction Contract (Category Level)
When the tutor is in a category, the prompt must include:
1. active `category`
2. target output artifact for that category
3. stop criteria for that category
4. failure routing trigger to next corrective action

This keeps behavior deterministic and auditable.

## 8) Next Phase (Methods Vetting)
After category approval, evaluate methods per category using:
1. scientific support (explicit citation check)
2. user fit and likely compliance in your real workflow
3. instruction clarity for LLM execution

Method-specific knob governance (including Mind Map knob defaults) is deferred to method phase.

## 9) Citation Note
For this category phase, citations are anchored to the method YAML evidence fields already in-repo.  
Before final publication, promote to full bibliography format (APA-style or similar) in an appendix.

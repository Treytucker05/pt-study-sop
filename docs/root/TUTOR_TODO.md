# Tutor TODO (Execution Tracker)

Date: 2026-02-23  
Owner: Trey  
Purpose: keep implementation work ordered, visible, and tied to canonical tutor rules.

## Current Board (In-Progress)

- Canonical execution order: `PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`
- Source-of-truth order: 
  - `docs/root/TUTOR_TODO.md` (active workboard)
  - `docs/root/TUTOR_TRUTH_PATH.md` (document read order)
  - `conductor/tracks.md` (completed tracks / archival)

## Active Sprint 2026-02-23

### Sprint 1: Finish PRIME Hardening (Priority)
- [ ] A1. Build PRIME policy table for all 9 methods.
  - For each method: intent, allowed outputs, blocked behaviors, allowed transitions
- [ ] A2. Build PRIME knobs table.
  - For each method: knob name, type, bounds, lock/escalate/rollback, defaults
- [ ] A3. Finalize PRIME runtime guardrails.
  - enforce non-assessment behavior
  - block assessment prompts/scored checks in PRIME
  - validate output shape (schema-aware)
- [ ] A4. Finalize `single_focus` and `module_all` handoff criteria.
  - if topic is known + small, allow focused mode by default
  - otherwise module_all-first path

### Sprint 2: Transfer Integrity (Blocking)
- [ ] B1. Verify method mapping parity across YAML, DB seed, wizard, and runtime.
- [ ] B2. Add one-pass drift check for method-stage mismatch and missing critical knobs.
- [ ] B3. Add one-page smoke report (`method_id -> stage -> artifact_type -> required knobs`).

### Sprint 3: Video Study Pipeline Finish
- [ ] C1. Confirm hybrid ingest routing for local vs API path.
- [ ] C2. Verify normal-session MP4 path in tutor flow (not only admin/test mode).
- [ ] C3. Add clear user-visible budget/failover status for API key switching.

## Workstream Status Snapshot

### A1) PRIME Inventory + Stage Fit
- [x] Confirm active PRIME methods in app/DB and YAML.
- [x] Lock stage placements to PRIME for all active methods:
  - `M-PRE-001` Brain Dump
  - `M-PRE-002` Overarching Pre-Question Set
  - `M-PRE-003` Prior-Knowledge Activation Scan
  - `M-PRE-004` Hierarchical Advance Organizer
  - `M-PRE-005` Skeleton Concept Hierarchy
  - `M-PRE-006` Structural Skimming + Pillar Mapping
  - `M-PRE-008` Structural Extraction
  - `M-PRE-009` Syntopical Big-Picture Synthesis
  - `M-PRE-010` Learning Objectives Primer
- [ ] Set final Provide/Produce policy for each visualization method.

### A2) PRIME Execution Contract (Policy)
- [x] Define PRIME output contract per method:
  - required artifact(s)
  - required fields
  - prohibited behavior (no scored checks, no retrieval scoring)
- [x] Define allowed orientation prompts vs blocked assessment behaviors.
- [ ] Define hard pass/exit criteria for PRIME -> CALIBRATE transition.

### A3) PRIME Knobs (Acute Variables)
- [x] Define method-specific knobs for each PRIME method.
- [ ] Set conservative defaults for first-exposure flow (`module_all` baseline).

### A4) PRIME Implementation Plan
- [x] Data/schema plan validated and mapped.
- [x] Runtime non-assessment guardrails defined and partly wired.
- [ ] Complete UI controls for safe knob visibility/editing without invalid combinations.

### A5) PRIME Acceptance Criteria
- [ ] Any PRIME block emits orientation artifact only.
- [x] PRIME cannot emit scored results.
- [x] CALIBRATE is first scored stage.
- [ ] Runtime chain validation rejects illegal stage transitions in all flows.

## Workstream B — Obsidian + RAG Graph
- [x] Finalize note artifact schema (`session_note`, `concept_note`, `graph_links`).
- [x] Implement wiki-link generation rules at artifact creation.
- [x] Add retrieval priority: module notes -> linked neighbors -> broader notes.
- [x] Add note graph extraction and persistence plan.

## Workstream C — Chain/Method Transfer Integrity
- [ ] Verify methods/chains are consistently represented across:
  - YAML source
  - DB seed/runtime
  - Tutor wizard
  - Tutor chat execution
- [ ] Add drift checks for method-stage mismatch and missing knob defaults.

## Workstream D — CALIBRATE Hardening (Completed 2026-02-22)
- [x] Hardened `M-CAL-001` (Micro Precheck) with scored-baseline constraints and full tutor prompt.
- [x] Hardened `M-CAL-002` (Confidence Tagging) with miscalibration risk outputs and full tutor prompt.
- [x] Hardened `M-CAL-003` (Priority Set) with deterministic top-3 routing and full tutor prompt.
- [x] Added Obsidian category note: `Study System/Categories/Calibrate.md` with operational spec + prompt blocks.

## Workstream E — Remaining Category Completion (Completed 2026-02-22)
- [x] Hardened ENCODE/REFERENCE/RETRIEVE/OVERLEARN method prompt contracts.
- [x] Promoted touched remaining-category cards to `validated`.
- [x] Synced all six category pages from method contracts:
  - `Study System/Categories/Prime.md`
  - `Study System/Categories/Calibrate.md`
  - `Study System/Categories/Encode.md`
  - `Study System/Categories/Reference.md`
  - `Study System/Categories/Retrieve.md`
  - `Study System/Categories/Overlearn.md`
- [x] Added one-command category sync script and CI test.

## Workstream F — Video Ingest (Free + API Hybrid)
- [ ] Execute remaining Phase-1 and Phase-2 items in `docs/root/TUTOR_VIDEO_INGEST_PLAN.md`.
- [ ] Add final session-path validation for MP4 uploads, local+API routing, and retrieval context.
- [ ] Add clear user-facing controls for failover and quota indicators.

## Immediate Next 3 Tasks (Use in this order)
1. [ ] Build PRIME method-by-method policy table (intent -> allowed outputs -> blocked behavior).
2. [ ] Build PRIME knob table (knob -> type -> defaults -> constraints).
3. [ ] Map both tables to exact implementation files and verify in one dry session.

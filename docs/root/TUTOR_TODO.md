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
- [x] A1. Build PRIME policy table for all 9 methods.
  - For each method: intent, allowed outputs, blocked behaviors, allowed transitions
- [x] A2. Build PRIME knobs table.
  - For each method: knob name, type, bounds, lock/escalate/rollback, defaults
- [x] A3. Finalize PRIME runtime guardrails.
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

### Sprint 2b: RAG + LLM Provider (Completed 2026-02-23)
- [x] B4. Fix RAG chunking for small docs (small-doc bypass ≤8K chars, two-stage header-aware splitting).
- [x] B5. Add cross-encoder reranker (`ms-marco-TinyBERT-L-2-v2`) to replace keyword scoring.
- [x] B6. Wire Gemini CLI as second LLM provider (`call_llm(provider="gemini")`).

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
- [x] Set final Provide/Produce policy for each visualization method.

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
1. [x] Close PRIME non-assessment enforcement in runtime (A1.4).
2. [x] Verify PRIME control knobs are fully wired end-to-end (A1.5).
3. [ ] Validate prime method routing + stage transitions in one end-to-end dry session.

## Granular Close-Out Queue (last-mile items from last tasks)

### Queue A — PRIME Hardening Closure

- [x] A1.1 Lock `PRIME` method boundaries for all 9 cards in one pass.
  - Files: `sop/library/methods/M-PRE-001.yaml` ... `M-PRE-010.yaml`
  - Done when: every method contract has `stage=PRIME`, `assessment=false`, and explicitly forbidden/allowed question behavior.

- [x] A1.2 Finalize and publish one canonical PRIME policy matrix.
  - Files: `docs/root/TUTOR_PRIME_DRAFT_MATRIX.md`, `docs/root/TUTOR_NORTH_STAR_RULES.md`, `docs/root/TUTOR_TRUTH_PATH.md`
  - Done when: `M-PRE-010` and `M-PRE-008` are marked `CONFIRMED` and no active TODO item references the draft as unresolved.

- [x] A1.3 Finish and freeze `module_all` / `single_focus` PRIME behavior.
  - Files: `docs/root/TUTOR_NORTH_STAR_RULES.md`, `docs/root/TUTOR_PRIME_DRAFT_MATRIX.md`, `brain/dashboard/api_tutor.py`, `dashboard_rebuild/client/src/pages/tutor.tsx`, `dashboard_rebuild/client/src/api.ts`
  - Done when: decision is hard-locked to module-first default and single-focus opt-in with consistent UI/backend schema and no fallback ambiguity.

- [x] A1.4 Close PRIME non-assessment enforcement in runtime.
  - Files: `brain/dashboard/api_tutor.py`, `brain/dashboard/api_contracts.py` (if applicable), `brain/tutor_chains.py`, `dashboard_rebuild/client/src/pages/methods.tsx`
  - Done when: automated check rejects any scored artifact/type-0 confidence fields in PRIME and no PRIME block can emit retrieval grade output.

- [x] A1.5 Verify PRIME control knobs are fully wired end-to-end.
  - Files: `sop/library/methods/*`, `brain/db_setup.py`, `brain/tutor_method_registry.py`, `brain/data/seed_methods.py`, `dashboard_rebuild/client/src/pages/methods.tsx`
  - Done when: all PRIME methods expose at least one active knob with bounds + fallback behavior and can be edited without UI validation errors.

### Queue B — Chain/Method Transfer Integrity

- [x] B1.1 Add parity check for method metadata across YAML, DB seed, runtime, and wizard/editor.
  - Files: `scripts/`, `brain/data/seed_methods.py`, `brain/db_setup.py`, `dashboard_rebuild/client/src/pages/methods.tsx`
  - Done when: a single command shows zero mismatched `control_stage`, `artifact_type`, or `best_stage` between YAML and DB cache.
  - Completed via: `python scripts/method_integrity_smoke.py` (`Failures: 0`; warnings currently only on missing DB knob cache fields for older DBs).

- [x] B1.2 Add one-pass stage-method validation check in tutor launch.
  - Files: `brain/tutor_chains.py`, `brain/dashboard/api_tutor.py`, `brain/tests/test_tutor_session_linking.py`
  - Done when: chain starts with `PRIME` and rejects invalid `stage->method` pairing before LLM call.

- [x] B1.3 Add runtime drift detector for missing `knob_snapshot`, missing method prompt, or missing artifact contract.
  - Files: `brain/dashboard/api_tutor.py`, `brain/tutor_tooling.py`, `brain/tests/test_method_cards_hardening.py`
  - Done when: 1) runtime telemetry includes block reason for every mismatch and 2) no critical mismatch enters active session.

- [x] B1.4 Produce one-page method integrity smoke report.
  - Files: `scripts/`, `docs/root/TUTOR_TODO.md`
  - Done when: each method row reports `method_id`, `stage`, `artifact_type`, and required knobs as pass/fail.
  - Report path: `docs/root/TUTOR_METHOD_INTEGRITY_SMOKE.md`.

### Queue C — Category Coverage and Documentation Closure

- [ ] C1.1 Ensure all 6 category pages include full method list + tutor prompt blocks.
  - Files: `C:\Users\treyt\Desktop\Treys School\Study System\Categories\Prime.md`, `.../Calibrate.md`, `.../Encode.md`, `.../Reference.md`, `.../Retrieve.md`, `.../Overlearn.md`, `.../Categories.md`
  - Done when: each category page has method inventory + `Method Contract` table + one executable prompt per method.

- [ ] C1.2 Reconcile manager-facing notes with code reality.
  - Files: `docs/root/TUTOR_TRUTH_PATH.md`, `docs/root/TUTOR_CATEGORY_DEFINITIONS.md`, `docs/root/TUTOR_METHOD_SELECTION_RULES.md`, `docs/root/TUTOR_NORTH_STAR_RULES.md`
  - Done when: there are no policy contradictions (e.g., "3-5 concepts only" vs "module_all mode") across these files.

- [ ] C1.3 Add/refresh "close-out" log for last-mile decisions and blockers.
  - Files: `conductor/tracks.md`, `conductor/tracks/GENERAL/log.md`
  - Done when: every unresolved blocker from this chat is explicitly logged with owner + expected fix date.

### Queue D — Video+MP4 + Budget Failover Closure

- [ ] D2.1 Verify normal-session MP4 path works in non-admin flows.
  - Files: `brain/dashboard/api_tutor.py`, `dashboard_rebuild/client/src/pages/tutor.tsx`, `dashboard_rebuild/client/src/components/MaterialSelector.tsx`
  - Done when: MP4 can be loaded from chat/materials and appears in selected-material retrieval context without manual API-only scripts.

- [ ] D2.2 Implement explicit key rotation and budget-failover visibility.
  - Files: `brain/.env`, `brain/video_ingest_bridge.py`, `brain/dashboard/api_tutor.py`, `dashboard_rebuild/client/src/components/TutorChat.tsx`
  - Done when: provider switching is automatic on quota/rate signals and user sees current provider + remaining budget status.

- [ ] D2.3 Add regression test for MP4 session-context + provider fallback.
  - Files: `brain/tests/test_video_process_api.py`, `brain/tests/test_tutor_session_linking.py`
  - Done when: tests cover upload->process->scope->chat-turn retrieval path with fallback simulation.

### Queue E — UI/Method Controls (Methods Board Polish)

- [ ] E1.1 Lock methods controls (Favorite/Rate/Edit) and remove stale destructive action from board cards.
  - Files: `dashboard_rebuild/client/src/pages/methods.tsx`
  - Done when: controls are always-visible, non-overlapping, and map to documented actions.

- [ ] E1.2 Validate dropdown/select reliability in method edit workflows.
  - Files: `dashboard_rebuild/client/src/pages/methods.tsx`, `dashboard_rebuild/client/src/components/ui/select.tsx`
  - Done when: category/stage dropdown selections save reliably in one interaction on desktop and mobile widths.

- [ ] E1.3 Restore compact fallback path for prompt edits and reset behavior.
  - Files: `dashboard_rebuild/client/src/pages/methods.tsx`, `brain/dashboard/api_tutor.py`
  - Done when: tutor prompt edits preserve schema fields and can be reset to canonical template in one action.

## Execution Rules for this board

- Do not mark a task complete until its "done when" criteria pass in code and tests or are manually verified.
- Keep task scope one step at a time; no broad refactors without a linked queue ID.
- For every completed queue item that changes behavior, add one dated entry to `conductor/tracks/GENERAL/log.md`.

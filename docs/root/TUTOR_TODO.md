# Tutor TODO (Execution Tracker)

Date: 2026-02-22  
Owner: Trey  
Purpose: keep implementation work ordered, visible, and tied to canonical tutor rules.

## Current Focus (Active)
- [ ] Nail down PRIME method blocks (rules, knobs/acute variables, and implementation plan).
- Draft artifact created: `docs/root/TUTOR_PRIME_DRAFT_MATRIX.md`

## Recent Completed Wiring (2026-02-22)
- [x] Added strict tutor note schema: `docs/schemas/tutor_note_schema_v1_1.json`
- [x] Wired North Star gate into tutor session creation (`api_tutor.py`)
- [x] Enforced reference-bound guardrails at turn-time (`api_tutor.py`)
- [x] Wired prioritized Obsidian note retrieval (module -> follow-up links -> global) (`tutor_rag.py`)
- [x] Updated First Exposure chains to start with `M-PRE-010`
- [x] Wired `objective_scope` end-to-end (`module_all` default, `single_focus` optional) across API + wizard UI

## Locked Notes (Do Not Drift)
- System model: `Category -> Method -> Knob -> Chain`
- Pipeline: `PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`
- First-exposure-first is default (most sessions are unseen material).
- PRIME is orientation/teaching only (non-assessment).
- CALIBRATE is where assessment probes begin.
- Mind Map = method; `ASCII/Mermaid/Figma` = knobs; default for Mind Map is `ASCII`.
- Tutor-generated Obsidian notes must include wiki links at creation time.

## Workstream A — PRIME Method Blocks (Top Priority)

### A1) PRIME Inventory + Stage Fit
- [x] Confirm active PRIME methods in app/DB and YAML.
- [ ] Mark each PRIME method as:
  - `keep_prime`
  - `prime_lite_variant_needed`
  - `move_to_encode`
- [ ] Resolve visualization boundary: lightweight orientation visuals in PRIME, detailed maps in ENCODE.

### A2) PRIME Execution Contract (Policy)
- [~] Define PRIME output contract per method:
  - required artifact(s)
  - required fields
  - prohibited behavior (no scored checks, no retrieval scoring)
- [ ] Define allowed PRIME question types (orientation-only) vs blocked question types (assessment).
- [ ] Define pass/exit criteria for PRIME -> CALIBRATE transition.

### A3) PRIME Knobs (Acute Variables)
- [~] For each PRIME method, define method-specific knobs:
  - knob name
  - type (`enum/int/bool`)
  - default
  - bounds/constraints
  - lock/escalate/rollback rules
- [ ] Set conservative defaults for first-exposure flow.

### A4) PRIME Implementation Plan
- [ ] Data/schema plan:
  - verify method YAML fields needed for PRIME contracts/knobs
  - identify any DB fields required for runtime enforcement
- [ ] Runtime plan:
  - enforce PRIME non-assessment guardrails in tutor orchestration
  - ensure PRIME artifacts emit deterministic structure
- [ ] UI plan:
  - expose PRIME-relevant knobs where needed
  - keep defaults visible and editable without allowing invalid states

Progress notes:
- `M-PRE-010` now supports scope knob (`module_all` / `single_focus`) and is wired into session creation + prompt context.
- Wizard now exposes PRIME scope selector and persists it in local/session state.
- `M-PRE-008` hardening added: full YAML contract (constraints/knobs/outputs/stop criteria) + PRIME runtime guardrail injection in tutor orchestration.
- `M-PRE-008` dependency note locked: objective context comes from `M-PRE-010` or existing North Star (pairing recommended, not mandatory); added basic/schema priming time windows.
- Method-card prompt baseline now enforced across the full library: every YAML method card has a tutor-facing `facilitation_prompt`; `M-PRE-003` now includes conditional-use stipulations and fallback route (`M-PRE-010 -> M-PRE-008`) when prior context is missing.
- Test isolation hardening complete: North Star write path is blocked in test mode (`api_tutor` guard), and tutor session-linking tests now monkeypatch Obsidian I/O to in-memory fakes with a zero-write assertion.
- PRIME hardening pass completed for all active PRIME methods (`M-PRE-001/002/003/004/005/006/008/009/010`) with method-specific execution prompts, when-to-use / when-not-to-use rules, and top-down output contracts aligned to recent research mappings.
- Live smoke runs completed (Obsidian/Anki writes disabled): one intentional fail path exposed DB-vs-YAML artifact drift on `M-ENC-001`; one module-all PRIME->CALIBRATE->ENCODE run completed successfully.

### A5) PRIME Acceptance Criteria
- [ ] Any PRIME block run produces orientation artifacts only.
- [ ] PRIME run cannot emit scored assessment prompts/results.
- [ ] CALIBRATE starts first scored probe.
- [ ] Chain validation blocks illegal stage behavior.

## Workstream B — Obsidian + RAG Graph (Next)
- [x] Finalize note artifact schema (`session_note`, `concept_note`, `graph_links`).
- [x] Implement wiki-link generation rules at artifact creation.
- [x] Add retrieval priority: module notes -> linked neighbors -> broader notes.
- [x] Add note graph extraction and persistence plan.

Progress notes:
- Added strict structured artifact finalize pipeline in `api_tutor.py` with schema validation + deterministic session/concept markdown output.
- Added `POST /api/tutor/session/<id>/finalize` and `POST /api/tutor/session/<id>/sync-graph`.
- Extended `POST /api/tutor/session/<id>/artifact` to accept `type=structured_notes`.
- Routed `save_to_obsidian` tutor tool through merge+graph sync path.
- Added mode-based concept limits (`module_all` / `single_focus` / `focused_batch`) into schema + runtime validation.

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
- [x] Hardened ENCODE/REFERENCE/RETRIEVE/OVERLEARN method prompt contracts (removed generic fallback prompt text).
- [x] Promoted touched remaining-category draft cards to `validated` after prompt-contract hardening.
- [x] Added/Regenerated Obsidian category pages with full method lists + prompt blocks for all six control stages:
  - `Study System/Categories/Prime.md`
  - `Study System/Categories/Calibrate.md`
  - `Study System/Categories/Encode.md`
  - `Study System/Categories/Reference.md`
  - `Study System/Categories/Retrieve.md`
  - `Study System/Categories/Overlearn.md`
- [x] Added one-command category sync script: `python scripts/sync_tutor_category_docs.py` (+ test guard `brain/tests/test_sync_tutor_category_docs.py`).

## Immediate Next 3 Tasks
1. [ ] Build PRIME method-by-method policy table (method -> intent -> allowed outputs -> blocked behaviors).
2. [ ] Build PRIME knob table (method -> knobs -> defaults -> constraints).
3. [ ] Draft implementation checklist mapped to exact files/functions.

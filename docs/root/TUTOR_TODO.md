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

### A5) PRIME Acceptance Criteria
- [ ] Any PRIME block run produces orientation artifacts only.
- [ ] PRIME run cannot emit scored assessment prompts/results.
- [ ] CALIBRATE starts first scored probe.
- [ ] Chain validation blocks illegal stage behavior.

## Workstream B — Obsidian + RAG Graph (Next)
- [x] Finalize note artifact schema (`session_note`, `concept_note`, `graph_links`).
- [~] Implement wiki-link generation rules at artifact creation.
- [x] Add retrieval priority: module notes -> linked neighbors -> broader notes.
- [ ] Add note graph extraction and persistence plan.

## Workstream C — Chain/Method Transfer Integrity
- [ ] Verify methods/chains are consistently represented across:
  - YAML source
  - DB seed/runtime
  - Tutor wizard
  - Tutor chat execution
- [ ] Add drift checks for method-stage mismatch and missing knob defaults.

## Immediate Next 3 Tasks
1. [ ] Build PRIME method-by-method policy table (method -> intent -> allowed outputs -> blocked behaviors).
2. [ ] Build PRIME knob table (method -> knobs -> defaults -> constraints).
3. [ ] Draft implementation checklist mapped to exact files/functions.

# Specification: Tutor Vision Lock

**Track ID:** tutor_vision_lock_20260301  
**Type:** Alignment / Hardening  
**Created:** 2026-03-01  
**Status:** Active (Provisional / Not Finished)

## Summary

Lock Tutor behavior to product vision by auditing startup, instructions, chains, notes model, retrieval, tooling, artifacts, and session lifecycle. Document decisions and enforceable rules to prevent future drift.

## Context

The system has evolved quickly and behavior drift has accumulated. The immediate goal is to establish one intended-behavior baseline for Tutor, then verify runtime alignment.

## User Story

As the product owner, I want a clear, durable map of how Tutor should behave and a checklist-driven validation workflow so we can confidently detect and remove drift.

## Acceptance Criteria

- [ ] Vision is explicitly defined for all readiness checklist areas.
- [ ] Item 1 (Tutor instructions loading/usage) is validated with pass/fail evidence.
- [ ] Item 2 (Chain instructions loading/usage) is validated with pass/fail evidence.
- [ ] Notes operating model is defined: chain responsibilities vs template responsibilities.
- [ ] Track artifacts capture decisions so a new session can resume without ambiguity.

## Current Snapshot (2026-03-01)

### A) Rule Source Findings
- Active Tutor instruction sources:
  - `brain/tutor_prompt_builder.py` (global defaults + config-loaded custom instructions)
  - `brain/dashboard/api_tutor.py` (runtime guardrail appends)
  - `brain/tutor_context.py` (materials/notes context builder)
- Archived SOP bundles are not directly loaded by Tutor runtime prompt assembly:
  - `sop/runtime/custom_instructions.md`
  - `sop/library/13-custom-gpt-system-instructions.md`
  - `sop/archive/custom_instructions.md`
  - `sop/archive/runtime_rules.md`

### B) Current Enforced Runtime Guardrails
- Chain must start with PRIME (`CHAIN_PRIME_REQUIRED`).
- PRIME assessment blocking (`PRIME_ASSESSMENT_BLOCKED`).
- Reference bounds enforcement:
  - `REFERENCE_TARGETS_MISSING`
  - `REFERENCE_BOUNDS_VIOLATION`
- North Star/objective scope runtime contracts.

### C) Instruction Model (Implemented)
- Global instructions:
  - Editable via `/api/tutor/settings` (`tutor_custom_instructions`).
  - Falls back to canonical default rules from `brain/tutor_prompt_builder.py`.
- Session-only rules:
  - `content_filter.session_rules`
  - appended in prompt as `Session Rules (Current Session Only)`.

### D) Owner-Approved Provisional Global Defaults (Keep)
1. Source-Lock baseline.
2. Session guardrails (chain/method/stage; PRIME non-assessment).
3. No Answer Leakage.
4. No Phantom Outputs.
5. Abbreviation first-use expansion.
6. Interactive cadence (short, one-step, clear next action).
7. Uncertainty handling (`UNKNOWN` + request sources/clarification).

### E) Freeze Policy Until Stability Gate
- Ruleset is intentionally not finalized.
- Immediate goal: complete one full end-to-end study session with current simplified setup.
- Archive-rule promotion is paused until that session is completed and reviewed with owner.

## Out of Scope

- Immediate large refactors.
- New UI redesign.
- Non-Tutor subsystem changes unless required for Tutor correctness.

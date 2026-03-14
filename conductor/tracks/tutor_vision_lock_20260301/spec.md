# Specification: Tutor Vision Lock

**Track ID:** tutor_vision_lock_20260301  
**Type:** Alignment / Hardening  
**Created:** 2026-03-01  
**Status:** Complete

## Summary

Lock Tutor behavior to product vision by auditing instructions, chains, notes/artifacts, retrieval, tooling, and session lifecycle. Record the intended Tutor-specific contract, map current runtime behavior to it with evidence, and keep only the minimal fixes that real drift requires.

## Context

Tutor evolved quickly and accumulated behavioral drift risk across prompt assembly, chain/runtime ownership, retrieval/provenance, and artifact/session lifecycle. The goal of this track was to replace implied behavior with one explicit contract plus a lean rerunnable validation gate.

## User Story

As the product owner, I want a clear, durable map of how Tutor should behave and a checklist-driven validation workflow so we can confidently detect and remove drift.

## Acceptance Criteria

- [x] Vision is explicitly defined for global Tutor instructions, chain/block behavior, notes/artifacts, retrieval/tooling, and session lifecycle.
- [x] Tutor instruction loading/usage is validated with pass/fail evidence.
- [x] Chain instruction loading/usage and PRIME/runtime guardrails are validated with pass/fail evidence.
- [x] Notes/artifact operating model is defined, including session wraps and sidecar-vs-session-owned ownership boundaries.
- [x] Retrieval provenance, selected-material scope, and reference-bounds behavior are captured with evidence and disposition.
- [x] Track artifacts capture decisions so a new session can resume without ambiguity.
- [x] A locked validation gate exists and has passing automated plus live evidence.

## Scope Decisions

### In scope

- Tutor prompt contract
- chain/block ownership boundaries
- notes/artifact ownership boundaries
- retrieval/provenance contract
- session restore/summary/end/delete contract
- regression gate for the locked behavior

### Out of scope

- Tutor UX redesign
- broad Tutor runtime refactors without evidence
- new artifact ownership models beyond the minimal contract clarifications needed for closure

## Outcome Summary

### Keep

- prompt-builder default/core rule preservation under custom instructions
- truthful provenance and broader-knowledge labeling
- PRIME-first runtime enforcement
- reference bounds enforcement
- selected-material scope persistence through restore
- structured-notes, cards, wraps, and session-owned delete behavior

### Change

- added explicit `No Answer Leakage` to the default Tutor rule stack
- added explicit `No Phantom Outputs` to the default Tutor rule stack
- added prompt-builder test coverage for those rules

### Retire

- archived instruction bundles as live runtime prompt sources
- quick-note sidecars as part of the locked session-delete ownership contract

## Final Artifacts

- `owner-vision.md`
- `notes-model.md`
- `current-vs-vision-gap.md`
- `validation-gate.md`
- `closeout.md`

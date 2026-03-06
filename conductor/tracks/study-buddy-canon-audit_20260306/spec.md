# Specification: Tutor / Study Buddy Canon Audit

**Track ID:** study-buddy-canon-audit_20260306  
**Type:** Chore  
**Created:** 2026-03-06  
**Status:** Complete

## Summary

Audit the full repo history and active documentation layers, then consolidate the intended Tutor / Study Buddy vision into one master canonical product document backed by an explicit evidence audit.

## Context

The repo already contains strong material across `docs/`, `sop/library/`, `conductor/`, historical tracks, and archive folders. The problem is not lack of written vision. The problem is that multiple files partially claim authority, some are provisional, and others are valuable history that can still be mistaken for active guidance.

This track treats the repo as recoverable history, not a blank slate.

## Acceptance Criteria

- [x] A new master canon exists at `docs/root/TUTOR_STUDY_BUDDY_CANON.md`.
- [x] A new evidence audit exists at `docs/root/TUTOR_STUDY_BUDDY_AUDIT_2026-03-06.md`.
- [x] The master canon explicitly locks these statements:
  - Library controls what Tutor teaches.
  - Rules and chains control how Tutor teaches.
  - Brain stores telemetry, outcomes, and fit signals; it does not directly steer Tutor policy.
  - Scholar reads Brain outputs and turns them into proposals, research, and approved improvements.
  - Obsidian is the primary note home.
  - Anki generation is chain-conditional, not global-by-default.
  - Tutor is a protocol-led study operator, not a generic chatbot.
- [x] The audit report includes a source classification matrix and evolution timeline.
- [x] `docs/README.md` and `README.md` point to the new master canon as the top-level explanation of how the Study Buddy works.
- [x] Active docs no longer disagree on Brain vs Scholar roles, Obsidian’s role, chain-conditional Anki behavior, or Library vs SOP meaning.
- [x] Archive files remain untouched and are treated as evidence only.

## Close-Out

- Validation:
  - `git diff --check -- [canon audit doc set]`
  - stale-string grep sweep for deprecated Tutor endpoints and legacy dashboard architecture markers
- Review:
  - fresh doc-code consistency subagent pass returned `No findings`

## Out of Scope

- Runtime/API/schema changes.
- Archive rewrites or archive cleanup.
- Behavior refactors to make runtime match the new canon.
- Scholar workflow redesign beyond documenting current intended boundaries.

## Technical Notes

- `docs/root/TUTOR_STUDY_BUDDY_CANON.md` becomes the master product truth path.
- `sop/library/` remains the pedagogy and control-plane canon.
- `docs/root/PROJECT_ARCHITECTURE.md` remains a technical architecture doc, not the overall product vision source of truth.
- Runtime-vs-doc contradictions discovered during the audit must be logged as follow-up items instead of being silently rewritten as if already shipped.

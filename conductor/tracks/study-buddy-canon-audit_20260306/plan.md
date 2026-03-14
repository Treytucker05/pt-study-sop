# Implementation Plan: Tutor / Study Buddy Canon Audit

**Track ID:** study-buddy-canon-audit_20260306  
**Spec:** [spec.md](./spec.md)  
**Created:** 2026-03-06  
**Status:** [x] Complete

## Phase 1: Evidence Inventory

- [x] Task 1.1: Inventory active canon, active support docs, historical evidence, and stale archives.
- [x] Task 1.2: Sample runtime truth from Tutor, Library, Brain, Scholar, Obsidian, and Anki code paths.
- [x] Task 1.3: Build a contradiction list for overlapping or stale source-of-truth claims.

## Phase 2: Master Canon

- [x] Task 2.1: Write `docs/root/TUTOR_STUDY_BUDDY_CANON.md`.
- [x] Task 2.2: Lock subsystem responsibilities, precedence order, and session contract.
- [x] Task 2.3: Record the user clarifications that changed the system contract.

## Phase 3: Audit And History

- [x] Task 3.1: Write `docs/root/TUTOR_STUDY_BUDDY_AUDIT_2026-03-06.md`.
- [x] Task 3.2: Publish the classification matrix.
- [x] Task 3.3: Publish the evolution timeline from archived docs, tracks, and git history.
- [x] Task 3.4: Log follow-up contradictions that require separate implementation work.

## Phase 4: Active Doc Rewire

- [x] Task 4.1: Update `docs/README.md` and `README.md` to point to the new master canon.
- [x] Task 4.2: Update active Tutor/architecture/product docs to remove conflicting overall-canon claims.
- [x] Task 4.3: Keep archive files read-only and reference them from the audit.

## Phase 5: Verification And Close-Out

- [x] Task 5.1: Validate the new truth path with targeted repo checks.
- [x] Task 5.2: Run final documentation consistency review via subagent.
- [x] Task 5.3: Update track status, board status, and general log.

## Verification

- `git diff --check -- [canon audit doc set]`
- stale-string grep sweep for deprecated Tutor endpoints and legacy dashboard architecture markers
- fresh doc-code consistency subagent pass returned `No findings`

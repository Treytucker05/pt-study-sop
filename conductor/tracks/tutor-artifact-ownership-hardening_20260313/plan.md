# Implementation Plan: Tutor Artifact Ownership Hardening

**Track ID:** tutor-artifact-ownership-hardening_20260313
**Spec:** [./spec.md](./spec.md)
**Created:** 2026-03-13
**Status:** [x] Complete

## Phase 0: Track + Scope

- [x] Task 0.1: Record the hardening slice in the active sprint and track registry.

## Phase 1: Runtime Ownership Wiring

- [x] Task 1.1: Add Tutor-session ownership metadata to `quick_notes`.
- [x] Task 1.2: Store ownership identifiers on Tutor artifact entries for `note` and `card`.
- [x] Task 1.3: Teach artifact-delete to remove session-owned note/card side effects.
- [x] Task 1.4: Teach session-delete to remove session-owned note/card rows.
- [x] Task 1.5: Mark `map` artifacts as session-owned session records.

## Phase 2: Validation + Contract Sync

- [x] Task 2.1: Add Tutor artifact certification coverage for artifact-delete cleanup and session-delete cleanup.
- [x] Task 2.2: Update the Tutor vision-lock package to the new ownership baseline.
- [x] Task 2.3: Run targeted artifact certification checks and record the result.

## Validation

- `pytest brain/tests/test_tutor_artifact_certification.py -q` -> PASS

## Close-Out

- Closed on `2026-03-13`.
- This hardening slice supersedes the same-day vision-lock note/map ownership caveat and makes session-owned cleanup explicit in runtime, tests, and contract docs.

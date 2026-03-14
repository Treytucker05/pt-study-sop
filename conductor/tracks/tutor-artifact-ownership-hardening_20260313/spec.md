# Specification: Tutor Artifact Ownership Hardening

**Track ID:** tutor-artifact-ownership-hardening_20260313
**Type:** Hardening
**Created:** 2026-03-13
**Status:** Complete

## Summary

Promote Tutor `note` and `map` artifacts into an explicit session-owned cleanup contract, and close the related delete-path leak for `card` artifacts so session-owned artifacts are cleaned consistently by both artifact-delete and session-delete flows.

## Acceptance Criteria

- [x] `note` artifacts persist enough ownership metadata to be deleted with their Tutor session.
- [x] `DELETE /api/tutor/session/<id>/artifacts` removes session-owned note/card side effects in addition to trimming `artifacts_json`.
- [x] `DELETE /api/tutor/session/<id>` removes session-owned quick-note and card rows.
- [x] `map` artifacts are explicitly treated as session-owned records inside the session artifact ledger.
- [x] Tutor artifact certification coverage proves the new cleanup behavior.

## Outcome

- Added `quick_notes.tutor_session_id` ownership metadata and indexing.
- Stored `quick_note_id` / `card_id` on artifact entries so delete paths can clean the corresponding rows.
- Promoted `note`, `card`, and `map` artifacts into one explicit session-owned cleanup contract.
- Updated the Tutor vision-lock package so the reusable contract matches the new runtime baseline.

# Implementation Plan: Tutor Audit Hardening

**Track ID:** tutor-audit-hardening_20260305
**Spec:** [./spec.md](./spec.md)
**Created:** 2026-03-05
**Status:** [x] Complete

## Phase 0: Track And Board Setup

- [x] Task 0.1: Create the new Conductor track folder and baseline files.
- [x] Task 0.2: Register the track in `conductor/tracks.md` as the active workstream.
- [x] Task 0.3: Add a new item under the `Current Sprint` section of `docs/root/TUTOR_TODO.md`.
- [x] Task 0.4: Append a kickoff entry to `conductor/tracks/GENERAL/log.md` with planned lanes and ownership.
- [x] Task 0.5: Claim artifact scopes for subagents in `docs/root/TUTOR_TODO.md`.

## Phase 1: Learning Objective Ownership Hardening

- [x] Task 1.1: Add `managed_by_tutor` to `learning_objectives` with default `0`.
- [x] Task 1.2: Add a tutor-session/objective link table with unique `(tutor_session_id, lo_id)`.
- [x] Task 1.3: Update tutor objective save flow so tutor-created objectives are linked to the current tutor session.
- [x] Task 1.4: Preserve manual/dashboard-created learning objectives as non-tutor-managed.
- [x] Task 1.5: Replace coarse `course_id + lo_code` deletion in tutor session delete with unlink + garbage collection.
- [x] Task 1.6: Replace coarse objective deletion in Map-of-Contents reconciliation with the same unlink + garbage collection behavior.
- [x] Task 1.7: Add backend regression tests for shared-objective survival and last-link deletion.

## Phase 2: Runtime Context And Telemetry Truthfulness

- [x] Task 2.1: Remove dead instruction-retrieval plumbing from tutor runtime.
- [x] Task 2.2: Stop computing or surfacing instruction-depth semantics that no longer map to real retrieval.
- [x] Task 2.3: Standardize `build_context()` debug output to the shape consumed by `api_tutor`.
- [x] Task 2.4: Build retrieval debug metrics from real context-builder stats instead of empty stub doc lists.
- [x] Task 2.5: Update prompt/debug wording so it matches the actual single retrieval path.
- [x] Task 2.6: Replace tests that currently lock in bogus zero-retrieval metrics.
- [x] Task 2.7: Add regression tests for full-content mode and vector mode telemetry.

## Phase 3: Tutor/Library UI Contract Fixes

- [x] Task 3.1: Unify Tutor material persistence on `tutor.selected_material_ids.v2`.
- [x] Task 3.2: Add one-time `v1 -> v2` migration logic so Library-selected materials survive navigation into Tutor.
- [x] Task 3.3: Expand Tutor artifact restore handling to preserve `structured_notes`.
- [x] Task 3.4: Keep `/table` and `/smap` as parser aliases only, not persisted UI artifact types.
- [x] Task 3.5: Preserve table rendering by detecting markdown tables from canonical note content.
- [x] Task 3.6: Surface `deleteArtifacts` partial-result fields (`request_id`, `applied_count`, `skipped_indexes`) in Tutor UI.
- [x] Task 3.7: Remove the dead `otherMaterials` branch from `MaterialSelector`.
- [x] Task 3.8: Accept the legacy `"standard"` accuracy-profile alias at the frontend normalization boundary.

## Phase 4: Stream And UX Hardening

- [x] Task 4.1: Harden Tutor SSE parsing so malformed `data:` lines are not silently ignored.
- [x] Task 4.2: Log/count parse failures and convert broken terminal stream states into visible retryable errors.
- [x] Task 4.3: Add frontend regression coverage for malformed SSE chunks.
- [x] Task 4.4: Add frontend regression coverage for Library -> Tutor storage handoff.
- [x] Task 4.5: Add frontend regression coverage for `structured_notes` restore.
- [x] Task 4.6: Add frontend regression coverage for artifact partial delete reporting.
- [x] Task 4.7: Add frontend regression coverage for session-wrap rendering path.
- [x] Task 4.8: Normalize Obsidian CLI argv encoding for `vault` / `file` / `path` args so Windows delete/read/save flows do not pass literal quotes into `obsidian.exe`. Verified with `pytest brain/tests/test_obsidian_vault.py -q` on 2026-03-06.

## Phase 5: Integration, Verification, And Close-Out

- [x] Task 5.1: Run targeted backend tutor tests for ownership, context, telemetry, and delete flows.
- [x] Task 5.2: Run targeted frontend tutor tests for TutorChat, TutorArtifacts, MaterialSelector, and Tutor page restore behavior.
- [x] Task 5.3: Build frontend with `npm run build` in `dashboard_rebuild`.
- [x] Task 5.4: Run full `pytest brain/tests/`.
- [x] Task 5.5: Perform manual smoke:
  - Library select materials -> open Tutor -> selection preserved
  - two tutor sessions share one objective -> deleting one does not remove the objective
  - restored `structured_notes` artifact remains visible
  - partial artifact delete produces an in-panel report
- [x] Task 5.6: Update `docs/root/TUTOR_TODO.md`, `conductor/tracks/GENERAL/log.md`, and `conductor/tracks.md` with final status and commit SHA.
- [x] Task 5.7: Send merged work to a code-review subagent before closing the track.

## Subagent Execution Map

- **Docs/process subagent**
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks.md`
  - `conductor/tracks/GENERAL/log.md`
  - create the new track files
- **Backend/runtime subagent**
  - `brain/db_setup.py`
  - `brain/dashboard/api_tutor.py`
  - `brain/tutor_context.py`
  - tutor backend tests
- **Frontend/UI subagent**
  - `dashboard_rebuild/client/src/pages/tutor.tsx`
  - `dashboard_rebuild/client/src/pages/library.tsx`
  - `dashboard_rebuild/client/src/components/TutorWizard.tsx`
  - `dashboard_rebuild/client/src/components/TutorArtifacts.tsx`
  - `dashboard_rebuild/client/src/components/TutorChat.tsx`
  - `dashboard_rebuild/client/src/components/MaterialSelector.tsx`
  - `dashboard_rebuild/client/src/lib/tutorClientState.ts`
  - frontend tests
- **Integrator/test subagent**
  - run builds/tests
  - merge findings
  - update logs/status docs
- **Code-review subagent**
  - final review pass on touched backend/frontend files

## Verification Gates

- [x] Shared learning objectives are safe across multiple tutor sessions.
- [x] Manual/dashboard-created objectives are not deleted by tutor cleanup.
- [x] Retrieval debug values are non-zero when retrieval actually occurred.
- [x] Library -> Tutor handoff works without manual reselection.
- [x] Restored sessions preserve valid artifact types.
- [x] Partial artifact deletes show actionable UI feedback.
- [x] Frontend build passes.
- [x] Full backend tests pass.
- [x] Track docs/log updated for handoff.

## Verification Summary

- Frontend targeted tests:
  - `npx vitest run client/src/pages/__tests__/library.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/components/__tests__/TutorArtifacts.test.tsx client/src/components/__tests__/TutorChat.test.tsx client/src/lib/__tests__/tutorClientState.test.ts`
- Frontend build:
  - `npm run build`
- Backend targeted tests:
  - `pytest -q brain/tests/test_tutor_audit_remediation.py brain/tests/test_tutor_context.py brain/tests/test_tutor_context_wiring.py brain/tests/test_tutor_session_linking.py`
- Full backend suite:
  - `pytest -q brain/tests/`
- Live smoke:
  - Library selected materials persisted into Tutor on `/tutor`
  - Tutor opened on step `1. COURSE`, not stale step `3. START`
  - Selected material count remained intact after navigation
  - Bulk session delete showed active-session warning, deleted cleanly, and returned to Wizard without overlay deadlock
  - Forced partial bulk delete rendered the in-panel report: `Requested 2 · Deleted 1 · Already gone 1 · Failed 0`
  - Real artifact bulk delete removed persisted artifacts and rendered the completion report with `Requested 2 · Deleted 2 · Already gone 0 · Failed 0`
- Review:
  - Final code-review subagent pass returned `No findings`

## Close-Out Notes

- Completed on 2026-03-06.
- Verification state reflects the working tree as of this handoff update.

---

_Generated by Conductor Plan._

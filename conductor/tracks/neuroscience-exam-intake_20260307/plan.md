# Implementation Plan: Neuroscience Exam Intake + First Tutor Run

**Track ID:** neuroscience-exam-intake_20260307
**Spec:** [./spec.md](./spec.md)
**Created:** 2026-03-07
**Status:** [ ] In Progress

## Phase 0: Track + Scope Lock

- [x] Task 0.1: Create the track folder and baseline files.
- [x] Task 0.2: Register the track in `conductor/tracks.md`.
- [x] Task 0.3: Add the track to `docs/root/TUTOR_TODO.md`.
- [x] Task 0.4: Append a kickoff entry to `conductor/tracks/GENERAL/log.md`.

## Phase 1: Week 7 Intake

- [x] Task 1.1: Lock Exam 2 scope from the neuroscience schedule.
- [x] Task 1.2: Draft the Week 7 Obsidian scaffold from the Week 7 objective file.
- [x] Task 1.3: Load Week 7 source files into the live Library with the Neuroscience course id.
- [x] Task 1.4: Verify the live Library shows the ingested Week 7 material set.

## Phase 2: Tutor-Ready Bridge

- [x] Task 2.1: Make the live Tutor run use the Week 7 material scope only.
- [x] Task 2.2: Keep the first live objective fixed to `W7-OBJ-6`.
- [x] Task 2.3: Capture the gaps that still require product wiring for automatic preflight/scaffold generation.
- [x] Task 2.4: Add a dedicated `session/preflight` endpoint and make session creation accept `preflight_id`.
- [x] Task 2.5: Update the Wizard/session-start path to require explicit focus-objective selection for `single_focus`.
- [x] Task 2.6: Normalize Tutor UI session state to `map_of_contents` and relax brittle continuation reference-bounds failures.

## Phase 3: Verification + Close-Out

- [x] Task 3.1: Run targeted checks for the touched ingestion/session path.
- [x] Task 3.2: Record the live workflow and remaining system gaps.
- [ ] Task 3.3: Update track metadata and close-out notes.

## Verification Gates

- [x] Week 7 files exist in `rag_docs` with the Neuroscience course id.
- [x] Week 7 vault files exist under `Courses/Neuroscience/Week 7/`.
- [x] Week 7 source set is narrow and exam-scoped.
- [x] First Tutor target is explicit and does not depend on whole-course free roam.

## Live Week 7 Intake Notes

- Ingested Week 7 material set into `rag_docs` for course id `3` (`Neuroscience`):
  - `518` — `Class wk 7` (`mp4`)
  - `519` — `Development of nervous system updated` (`pdf`)
  - `520` — `Lecture transcript` (`txt`)
  - `521` — `PHYT 6313 Developmental_Disorders1_week 7` (`pdf`)
  - `522` — `Week 7 To Do Neuro` (`txt`)
- All 5 rows landed without stored `extraction_error`.
- Week 7 remains intentionally narrow; no Week 8 or Basal Ganglia files have been loaded yet.

## Live Wiring Notes

- Wizard sessions now require explicit focus-objective selection for `single_focus`; backend no longer silently picks the first objective.
- The Wizard now carries study-unit objectives, derived vault-folder previews, and explicit `focus_objective_id` into session creation.
- Added `POST /api/tutor/session/preflight` so the Wizard can resolve scope and blockers before session creation.
- `POST /api/tutor/session` now accepts `preflight_id` and can consume cached preflight bundles instead of rebuilding scope from loose topic text.
- Tutor source-summary UI now reads `map_of_contents` instead of relying on the stale `north_star` contract.
- Reference-bounds gating now allows continuation-style prompts like `chunk 3` and `make the derivative map explicit`.

## Verification Summary

- Backend targeted tests:
  - `pytest -q brain/tests/test_tutor_session_linking.py brain/tests/test_api_tutor_mode_flags.py` -> PASS (`29 passed`)
- Frontend targeted tests:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorWizard.test.tsx client/src/pages/__tests__/tutor.test.tsx` -> PASS (`10 passed`)
- Frontend build:
  - `cd dashboard_rebuild && npm run build` -> PASS
  - Vite emitted chunk-size warnings only.

---

_This track stays intentionally narrow: prove the real Week 7 workflow first, then generalize._

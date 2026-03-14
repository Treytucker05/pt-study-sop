# Implementation Plan: Top-Down Tutor Hardening

**Track ID:** topdown-tutor-hardening_20260307
**Spec:** [./spec.md](./spec.md)
**Created:** 2026-03-07
**Status:** [x] Complete

## Phase 0: Track + Scope Lock

- [x] Task 0.1: Create the track folder and baseline files.
- [x] Task 0.2: Register the track in `conductor/tracks.md`.
- [x] Task 0.3: Add the track to `docs/root/TUTOR_TODO.md`.
- [x] Task 0.4: Append a kickoff entry to `conductor/tracks/GENERAL/log.md`.

## Phase 1: Runtime Rule Stack

- [x] Task 1.1: Rewrite global tutor runtime rules for hybrid teaching instead of hard source-lock.
- [x] Task 1.2: Add chain runtime profile support to chain loading / prompt composition.
- [x] Task 1.3: Add chain-specific block override support keyed by method id.

## Phase 2: Top-Down Chain Hardening

- [x] Task 2.1: Add explicit runtime profiles to `C-TRY-001` and `C-TRY-002`.
- [x] Task 2.2: Tighten weak top-down method contracts and prompts.
- [x] Task 2.3: Ensure non-top-down chains still keep generic behavior.

## Phase 3: Confidence + Provenance UX

- [x] Task 3.1: Add qualitative confidence/provenance labels to Tutor replies.
- [x] Task 3.2: Add a simple on-demand provenance explanation action per reply.
- [x] Task 3.3: Keep current footer/citations intact while improving the user-facing trust signal.

## Phase 4: Verification

- [x] Task 4.1: Add prompt/chain tests for runtime profile composition.
- [x] Task 4.2: Add tests for weak top-down method cards.
- [x] Task 4.3: Run targeted backend + frontend tests and build.
- [x] Task 4.4: Run a Week 7 live comparison on `C-TRY-001` and `C-TRY-002`.
  - Verified live on `2026-03-13` against `course_id=3` / `Week 7 - Development of Nervous System`.
  - `C-TRY-001` (`Top-Down Narrative Mastery`) remained on the narrative-first path after PRIME: `Hand-Draw Map -> Story Confidence Tag -> KWIK Hook -> Analogy Bridge`.
  - `C-TRY-002` (`Top-Down Forward Progress`) diverged into the more structured comparison path after PRIME: `Hand-Draw Map -> Micro Precheck -> One-Page Anchor -> KWIK Hook`.
  - Both live turns completed under strict selected-material scope with SSE `done` frames and medium-confidence retrieval.

---

_This track focuses on runtime pedagogy and trust behavior, not new study content intake._

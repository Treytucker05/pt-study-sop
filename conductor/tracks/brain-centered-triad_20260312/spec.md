# Specification: Brain-Centered Triad Reframe

> Historical track artifact. Product/ownership authority lives only in `docs/root/TUTOR_STUDY_BUDDY_CANON.md`.
> This spec records why the track existed and what it implemented; it does not replace the canon.

**Track ID:** brain-centered-triad_20260312  
**Type:** roadmap  
**Created:** 2026-03-12  
**Status:** Draft

## Summary

Correct the product direction after the first Brain / Scholar / Tutor realignment by treating the app as a one-student study program: Brain is the true home/dashboard, Tutor is the bread-and-butter center of value, Scholar stays system-facing first, and the support pages become utilities around the triad instead of peer product layers.

This track exists because the repo now has useful Brain / Scholar / Tutor foundations, but the current contract still mismatches owner intent in key places: Dashboard is still a peer page, Brain still behaves like a mixed workspace, Tutor is not emphasized strongly enough as the main live value surface, Library / Vault / Mastery / Calendar still read like separate products, and Scholar is still framed too learner-facing in active product surfaces.

## Context

Relevant repo evidence:

- `conductor/tracks/brain-scholar-tutor-realignment_20260311/` shipped the first realignment wave but froze assumptions that are now being corrected.
- `dashboard_rebuild/client/src/pages/brain.tsx` still opens a mixed workspace with tool-first modes.
- `dashboard_rebuild/client/src/pages/dashboard.tsx` still acts like a separate home surface.
- `scholar/README.md` and `dashboard_rebuild/client/src/pages/scholar.tsx` still frame Scholar as more learner-facing than the current owner intent.
- Archive/system-map evidence shows Scholar has long existed as a meta-system / improvement engine rather than only a learner-facing page.

## Goal

Freeze the corrected end-state product before implementation and then work backward into the smallest feasible implementation tasks, each with explicit dependencies, verification, and no-skip test gates.

## Locked Learnings

- Brain should become the true home/dashboard.
- This is a one-student system, not an institution/admin platform.
- Tutor is the bread-and-butter center of value for the program.
- Brain should own learner modeling plus the supporting evidence surfaces: Library, Vault / Vault Health, Mastery, and Calendar.
- Tutor should own the active study workspace, artifacts, notes, canvas/graph tools, and live session execution.
- Tutor may offer inline material intake controls, but those actions must create Brain-owned Library records rather than a Tutor-owned content store.
- Tutor-created work should start session-scoped and only become durable Brain/Vault knowledge when it is promoted or worth keeping.
- Durable Tutor outputs should normally reach the vault through end-of-session summaries and explicit in-session note creation, not by auto-saving every raw working artifact.
- An explicit `make a note` instruction should write the durable vault note immediately.
- End-of-session summaries should write to the vault automatically by default.
- Scholar should be system-facing first, non-teaching, one-page, investigation-led, and approval-gated.
- Brain analytics should be the evidence home for session quality; Scholar should investigate on top of that evidence rather than replace it.
- Scholar questions and proposals live in Scholar first; Brain and Tutor may only mirror directly relevant items back to Scholar.
- Scholar investigations should pause and resume rather than stay as heavy long-running watches, and they should link into one rolling Obsidian notebook that tracks both research notes and approved follow-up tasks.
- Support pages should be subordinate utilities around the triad rather than separate product layers.

## Acceptance Criteria

- [ ] The end-state Brain / Scholar / Tutor contract is frozen in this track without unresolved ownership contradictions.
- [ ] The track documents what has already been learned, what remains unknown, and the explicit goal for implementation.
- [ ] The implementation plan works backward from the end goal into small, feasible slices rather than broad refactors.
- [ ] Every planned slice names the tests or verification it must pass before the next slice starts.
- [ ] The first executable implementation tasks are small enough to start without new architecture debates.

## Dependencies

- Builds on the shipped foundation in `conductor/tracks/brain-scholar-tutor-realignment_20260311/`.
- Must stay compatible with the current Flask + React + SQLite stack.
- Must not rewrite active canon/product docs until the corrected end-state is frozen and decomposed.

## Out of Scope

- Multi-tenant or institution-admin implementation
- Large Tutor pedagogy rewrites unrelated to ownership/IA
- Shipping the full reframe in a single implementation wave
- Treating planning artifacts as permission to skip per-task tests

## Technical Notes

- Keep `Start_Dashboard.bat`, Flask on port `5000`, and the existing frontend build path as the runtime baseline.
- Prefer route and ownership clarification before UI rebuilds.
- Any task that cannot name a concrete failing test or deterministic verification harness must be split again before implementation.

---

_Generated by Conductor. Review and edit as needed._

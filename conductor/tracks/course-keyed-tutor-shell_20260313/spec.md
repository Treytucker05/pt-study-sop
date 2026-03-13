# Specification: Course-Keyed Tutor Shell + Studio Foundation

> Track artifact. Product/ownership authority lives only in `docs/root/TUTOR_STUDY_BUDDY_CANON.md`.
> This spec records the execution contract for this track; it does not replace the canon.

**Track ID:** course-keyed-tutor-shell_20260313  
**Type:** roadmap  
**Created:** 2026-03-13  
**Status:** Draft

## Summary

Turn `/tutor` into the single course-keyed shell for the new Studio/Tutor/Schedule/Publish workflow without introducing a second project model. In v1, project identity is the existing `courses.id`, session identity is the existing `tutor_sessions.session_id`, and Studio remains inside `/tutor` rather than becoming a new public route.

## Goal

Ship the backend and execution foundation that lets the frontend move to a course-keyed Tutor shell with explicit shell state, normalized Studio persistence, and safe compatibility with existing Tutor session, note, card, and vault behavior.

## Locked decisions

- `Project == courses.id`
- `Session == tutor_sessions.session_id`
- `/tutor` is the only public Tutor route
- deep links use query params instead of new public routes
- `Overall Summary Board` is a rollup of promoted course/session items only
- dictation is Chromium-first best-effort only
- popouts are limited to viewer and current note
- rollout must keep current Tutor, Calendar, syllabus, vault, video, `artifacts_json`, `quick_notes`, and `card_drafts` behavior compatible for at least one wave

## Acceptance criteria

- [ ] A durable Conductor track exists for the full initiative.
- [ ] The execution board lists the work before implementation continues.
- [ ] The DB has course-keyed shell and Studio foundation tables.
- [ ] Tutor exposes course-keyed shell summary/state APIs without breaking existing session routes.
- [ ] Targeted backend tests prove the new tables and APIs behave as expected.

## Out of scope for this first implementation pass

- Full frontend Tutor shell UI
- Viewer popouts
- Dictation UI
- Publish and Schedule UI modes
- Cross-project raw Studio items

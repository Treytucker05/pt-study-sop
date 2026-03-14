# Specification: Course-Keyed Tutor Shell + Studio Foundation

> Track artifact. Product/ownership authority lives only in `docs/root/TUTOR_STUDY_BUDDY_CANON.md`.
> This spec records the execution contract for this track; it does not replace the canon.

**Track ID:** course-keyed-tutor-shell_20260313  
**Type:** roadmap  
**Created:** 2026-03-13  
**Status:** Complete

## Summary

Turn `/tutor` into the single course-keyed shell for the new Studio/Tutor/Schedule/Publish workflow without introducing a second project model. In v1, project identity is the existing `courses.id`, session identity is the existing `tutor_sessions.session_id`, and Studio remains inside `/tutor` rather than becoming a new public route.

## Goal

Shipped. This track landed the course-keyed Tutor shell foundation, the four shell modes, Studio persistence, and the live shell path. Remaining launch-surface cleanup now lives in `conductor/tracks/tutor-launch-shell-realignment_20260313/`.

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

- [x] A durable Conductor track exists for the full initiative.
- [x] The execution board lists the work before implementation continues.
- [x] The DB has course-keyed shell and Studio foundation tables.
- [x] Tutor exposes course-keyed shell summary/state APIs without breaking existing session routes.
- [x] Targeted backend tests prove the new tables and APIs behave as expected.

## Out of scope for this first implementation pass

- Remaining Tutor launch/start-panel cleanup after the shell landed
- Wizard removal/demotion follow-through
- Cross-project raw Studio items

## Follow-on ownership

The remaining work to fully replace the legacy Tutor wizard and sync active docs now belongs to:

- `conductor/tracks/tutor-launch-shell-realignment_20260313/`

# Track: Course-Keyed Tutor Shell + Studio Foundation

> Track artifact. Product/ownership authority lives only in `docs/root/TUTOR_STUDY_BUDDY_CANON.md`.
> Use this folder for implementation evidence and closeout history only.

**ID:** course-keyed-tutor-shell_20260313  
**Status:** Complete

## Documents

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)

## Scope

- Keep Brain as home while turning `/tutor` into the course-keyed shell.
- Treat `Project == courses.id` and `Session == tutor_sessions.session_id`.
- Land the first backend foundation for shell state, Studio persistence, and course-keyed summary APIs.
- Preserve current Tutor/Calendar/vault/video behavior during rollout.

## Progress

- Phase 0: Track bootstrap — complete
- Phase 1: Backend foundation — complete (11 backend tests)
- Phase 2: Brain launch + /tutor shell UI — complete (18 brain + 14 tutor tests)
- Phase 3: Studio boards + capture flows — complete (2 studio + 2 capture tests)
- Phase 4: Viewer stack + dictation — complete (4 viewer + 7 dictation tests)
- Phase 5: Schedule + Publish modes — complete (3 schedule + 5 publish + 4 syllabus tests)
- Phase 6: Popouts, hardening, live smoke — complete (9 popout tests + live smoke script)

## Codex Review

- First review: 3 gaps found and fixed
- Re-review: APPROVED — promote nulls tutor_session_id (copy+move), cross-session test added

## Quick Links

- [Back to Tracks](../../tracks.md)
- [Product Context](../../product.md)

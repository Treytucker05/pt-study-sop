# Track Spec: Tutor Launch / Shell Realignment

Created: 2026-03-13
Status: Active
Owner: Trey

## Goal

Make Brain the launch owner, make `/tutor` the course-keyed shell, and replace the old broad Tutor wizard with a thin Tutor-side start/resume surface.

## Locked contract

- Brain owns launch context and deep links.
- `/tutor` remains the live Tutor workspace.
- Tutor keeps a thin Tutor-local start/resume surface.
- Broad course/material intake should not remain the dominant Tutor startup IA.
- No new public routes.
- No backend API shape changes by default.

## Launch precedence

1. Explicit query params
2. Brain or Library handoff
3. Same-course active session
4. Persisted shell/start state
5. Current-course fallback

## Out of scope

- Full Brain Profile migration of all Tutor setup
- New backend routes
- Replacing Tutor as the live study surface

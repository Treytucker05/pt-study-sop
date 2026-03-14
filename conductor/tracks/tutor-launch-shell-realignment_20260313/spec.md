# Specification: Tutor Launch / Shell Realignment Cleanup

> Track artifact. Product/ownership authority lives only in `README.md`.
> This spec records the execution contract for this track; it does not replace the canon.

**Track ID:** tutor-launch-shell-realignment_20260313  
**Type:** roadmap  
**Created:** 2026-03-13  
**Status:** Active

## Summary

Finish the Tutor launch model implied by the canon and the recovered transcript: Brain owns launch, `/tutor` is the course-keyed shell, and Tutor mode uses a thin start/resume surface instead of the legacy step-based wizard.

## Goal

Leave the repo with one current Tutor launch story and one current implementation path:

- Brain owns launch context and deep links.
- Tutor remains the live study workspace.
- Tutor mode keeps a thin Tutor-local start/resume surface.
- Studio, Tutor, Schedule, and Publish remain shell modes inside `/tutor`.
- Wizard-era plans and docs stop competing as active truth.

## Locked decisions

- No new public routes.
- No backend API shape changes by default; reuse existing Tutor shell/session/artifact routes.
- Do not move all setup into Brain Profile. The recovered transcript does not support that stronger claim.
- Launch precedence is hard-locked to:
  1. explicit query params
  2. Brain / Library handoff
  3. same-course active session
  4. project-shell persisted shell state
  5. course-scoped Tutor start state
  6. current-course fallback
- The legacy `TutorWizard` is not the intended steady-state product surface.

## Acceptance criteria

- [ ] A durable track exists for the full cleanup and is registered on the active board.
- [ ] Older wizard-era docs and tracks are either synced forward or explicitly marked historical.
- [ ] `/tutor` launches through a thin start panel rather than the legacy step wizard.
- [ ] Brain/Library launch precedence is explicit and regression-tested.
- [ ] Active docs describe the Brain launch + `/tutor` shell + start-panel model.
- [ ] The integrated backend/frontend/live validation gate passes.

## Out of scope

- Introducing new public routes
- Rewriting Tutor backend APIs unless required by implementation proof
- Collapsing all Tutor launch/setup into Brain Profile alone
- Rewriting historical sprint logs line by line

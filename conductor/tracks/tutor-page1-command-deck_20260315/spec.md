# Specification: Tutor Page 1 Command Deck

**Track ID:** tutor-page1-command-deck_20260315  
**Type:** Feature  
**Created:** 2026-03-15  
**Status:** Complete

## Summary

Replace the old Tutor Page 1 with a mobile-first `DashBoard` command deck that helps Trey see what to study now, resume exactly where he left off, review near-term assignments/tests, and jump into the right class or material intake flow while keeping `Tutor` reserved for live study.

## User Story

As Trey, I want `DashBoard` to act like a study command deck so that I can pick the right next action quickly without digging through deeper Tutor pages first.

## Acceptance Criteria

- [x] `GET /api/tutor/hub` returns the Page 1 aggregate payload for resume, recommendations, deadlines, class cards, and study-wheel state.
- [x] `DashBoard` renders the responsive command deck instead of the old launch-first surface.
- [x] `Tutor` is reserved for live study and falls back to the `DashBoard` command deck when there is no active session.
- [x] `Open Project` lands in Studio L2 class detail.
- [x] Schedule CTAs open Tutor Schedule with focused course/event context.
- [x] `Load Materials` opens Library with course-scoped intake preselected.
- [x] Targeted frontend/backend tests and required validation pass.

## Dependencies

- Existing Tutor shell state in `project_workspace_state`
- Existing session truth in `tutor_sessions`
- Existing course event/planner/material APIs

## Out Of Scope

- Redesigning Studio, Schedule, Publish, or the future class hub
- Adding new tables or event-to-material linking
- Replacing the global Calendar surface

## Technical Notes

- Use the repo’s existing Tailwind `sm/md/lg/xl` breakpoints only.
- Keep the launch configuration logic, but demote it into a collapsed `DashBoard` section.
- Preserve the shell split: `DashBoard` as the first page, `Tutor` as the live session surface.

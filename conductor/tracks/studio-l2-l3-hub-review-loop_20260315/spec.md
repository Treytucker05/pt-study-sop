# Specification: Studio L2/L3 Hub + Review Loop

> Track artifact. Product/ownership authority lives only in `README.md`.
> This spec records the execution contract for this track; it does not replace the canon.

**Track ID:** studio-l2-l3-hub-review-loop_20260315  
**Type:** feature  
**Created:** 2026-03-15  
**Status:** Active

## Summary

Turn Studio L2 into a real course-prep hub backed by a dedicated Studio overview contract, then harden Studio L3 into a true review loop with edit, board, archive, and history actions without changing the `/tutor` shell model.

## Goal

Ship Studio L2 and L3 as production-ready course-native surfaces while preserving:

- `DashBoard -> Open Project -> Studio L2`
- `Project == courses.id`
- `Session == tutor_sessions.session_id`
- `/tutor` as the only public Tutor route

## Locked decisions

- L2 uses a dedicated `GET /api/tutor/studio/overview` contract instead of widening `GET /api/tutor/hub` or overloading `GET /api/tutor/project-shell`.
- L2 `CHAINS` may continue using `api.chains.getAll()` in this track.
- L3 activates revision/action primitives already present in the DB before introducing any new Studio persistence model.
- `studio_boards` and `studio_board_entries` remain out of scope for this track.
- Archive is soft-hide only; hard delete and promoted-item demotion remain out of scope.

## Acceptance Criteria

- [x] A durable Conductor track exists and the current sprint lists the L2 and L3 work before implementation continues.
- [x] `GET /api/tutor/studio/overview` returns course, shell, materials, objectives, course-scoped card drafts, promoted vault resources, and recent activity without changing the existing L1 hub contract.
- [x] Studio L2 renders from the overview contract rather than stitching `getMaterials`, `getProjectShell`, and deck-name heuristics client-side.
- [ ] Studio L3 supports inline edit, boarded/archive actions, and revision history while preserving the existing board scopes and promote flows.
- [ ] Targeted backend/frontend tests, `npm run build`, and live `/tutor?mode=studio` proof pass.

## Out Of Scope

- Full Obsidian vault browser inside Studio.
- Kanban/spatial board composition backed by `studio_boards` and `studio_board_entries`.
- Schedule or Publish redesign.
- Provenance deep links, hard delete, or promoted-item demotion.

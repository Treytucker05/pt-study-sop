# Implementation Plan: Tutor Launch / Shell Realignment Cleanup

**Track ID:** tutor-launch-shell-realignment_20260313  
**Spec:** [./spec.md](./spec.md)  
**Created:** 2026-03-13  
**Status:** Active

## Goal

Replace the active Tutor wizard model with the recovered shell model while cleaning the repo so only the newest planning remains active.

## Phase 0: Track bootstrap and planning truth

- [ ] `TLR-001` Create the durable track artifacts and register the work in:
  - `conductor/tracks.md`
  - `docs/root/TUTOR_TODO.md`
  - `docs/root/AGENT_BOARD.md`
  - `conductor/tracks/GENERAL/log.md`

## Phase 1: Planning/contract cleanup

- [ ] `TLR-010` Sync stale track artifacts:
  - `conductor/tracks/course-keyed-tutor-shell_20260313/spec.md`
  - `conductor/tracks/brain-centered-triad_20260312/open-questions.md`
  - `conductor/tracks/tutor-10-certification_20260307/session-authority.md`
- [ ] `TLR-020` Mark pre-shell docs as historical:
  - `docs/audit/TUTOR_FULL_AUDIT.md`
  - `docs/root/TUTOR_DIVE_READINESS_AUDIT_2026-03-12.md`
  - `docs/TUTOR_ARCHITECTURE.md`
  - `docs/REPO_ORIENTATION.md`
  - `docs/dashboard/DASHBOARD_WINDOW_INVENTORY.md`

## Phase 2: Launch-state authority

- [ ] `TLR-100` Move Tutor startup precedence into `dashboard_rebuild/client/src/lib/tutorClientState.ts` and stop relying on wizard-era global state.
- [ ] `TLR-110` Replace `TutorWizard` with `TutorStartPanel`.
- [ ] `TLR-120` Update Tutor shell tests and mocks to assert start-panel behavior instead of wizard behavior.

## Phase 3: Mode-level UX cleanup

- [ ] `TLR-200` Make Studio mode Inbox-first.
- [ ] `TLR-210` Make Schedule mode next-action first.
- [ ] `TLR-220` Make Publish mode a readiness workflow.

## Phase 4: Reference-doc sync and closeout

- [ ] `TLR-300` Rewrite active docs to match the shipped shell/start-panel model:
  - `docs/root/GUIDE_TUTOR_FLOW.md`
  - `docs/root/PROJECT_ARCHITECTURE.md`
  - `docs/root/GUIDE_USER.md`
- [ ] `TLR-900` Run the integrated gate, record results, and close the track.

## Dependency graph

`TLR-001 -> TLR-010 -> TLR-020`  
`TLR-001 -> TLR-100 -> TLR-110 -> TLR-120 -> TLR-200 -> TLR-210 -> TLR-220 -> TLR-300 -> TLR-900`  
`TLR-100 -> TLR-300`  
`TLR-110 -> TLR-900`

## First unblocked wave

1. `TLR-001`
2. `TLR-010`
3. `TLR-020`
4. `TLR-100`

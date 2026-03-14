# Tutor Flow Guide

Last updated: 2026-03-13

This document describes the current Tutor launch and session flow in the repo.

## Current Tutor model

- Brain and Library are the intended launch owners.
- `/tutor` remains the live Tutor workspace.
- Tutor startup uses a thin start surface, not the old three-step wizard.
- The start surface is `TutorStartPanel`.
- Active sessions still run through `TutorChat` and `TutorArtifacts`.

## Current launch flow

1. Brain or Library launches `/tutor`, preferably with explicit course context.
2. Tutor resolves launch authority in this order:
   - explicit query params
   - Brain or Library handoff
   - same-course active session
   - course-scoped Tutor start state
   - current-course fallback
3. Tutor opens the start surface.
4. The learner can:
   - review launch summary
   - resume a recent session
   - start a new session
   - expand advanced launch options when needed
5. Starting a session opens live chat and artifact flows.

## Start surface structure

The start surface has four sections:

1. `Launch Summary`
   - course
   - topic
   - selected materials count
   - PRIME scope
   - selected chain mode

2. `Recent Sessions`
   - resume live or completed sessions
   - optional delete action

3. `Readiness`
   - launch scope visibility
   - material-scope visibility
   - tutor config check summary

4. `Adjust Launch Options`
   - course selection
   - topic
   - PRIME scope
   - material selection
   - chain choice
   - optional vault save folder

## Session status model

- `active`
  - session can accept Tutor turns
  - `/tutor` restores into live chat when resume is chosen or same-course auto-resume applies

- `completed`
  - session no longer accepts live turns
  - remains available in recent-session history

## Persistence rules

- `tutor.active_session.v1`
  - tracks the active Tutor session id

- `tutor.start_state.v1`
  - stores course-scoped Tutor launch state
  - replaces wizard-state authority for startup

- `tutor.wizard.progress.v1`
  - legacy key only
  - cleared during launch-state normalization

- `tutor.vault_folder.v1`
  - convenience persistence only
  - not trusted as launch authority

## Current user-visible behavior

- Header button is `START`, not `WIZARD`.
- If there is no active session, Tutor opens the start surface.
- If an explicit Brain or Library handoff is present, that handoff beats stale wizard-era startup state.
- Library launch blocks ambiguous multi-course Tutor selection instead of opening a contradictory Tutor state.

## Key files

- `dashboard_rebuild/client/src/pages/tutor.tsx`
- `dashboard_rebuild/client/src/components/TutorStartPanel.tsx`
- `dashboard_rebuild/client/src/components/TutorChat.tsx`
- `dashboard_rebuild/client/src/components/TutorArtifacts.tsx`
- `dashboard_rebuild/client/src/lib/tutorClientState.ts`

## Validation reference

- Focused frontend tests:
  - `client/src/components/__tests__/TutorStartPanel.test.tsx`
  - `client/src/lib/__tests__/tutorClientState.test.ts`
- Frontend build:
  - `cd dashboard_rebuild && npm run build`

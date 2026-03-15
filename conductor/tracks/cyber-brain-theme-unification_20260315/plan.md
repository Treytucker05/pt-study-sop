# Implementation Plan: Cyber-Brain Theme Unification

**Track ID:** cyber-brain-theme-unification_20260315  
**Spec:** [./spec.md](./spec.md)  
**Created:** 2026-03-15  
**Status:** Complete

## Goal

Ship a responsive, app-wide cyber-brain visual system that matches the holographic red-brain reference more closely while keeping the existing navigation and route behaviors intact.

## Phase 0: Track bootstrap

- [x] `CBTU-001` Register the work in:
  - `docs/root/TUTOR_TODO.md`
  - `docs/root/AGENT_BOARD.md`
  - `conductor/tracks.md`
  - `conductor/tracks/cyber-brain-theme-unification_20260315/`

## Phase 1: Shared shell and primitives

- [x] `CBTU-100` Upgrade the shared shell/background in:
  - `dashboard_rebuild/client/src/components/layout.tsx`
  - `dashboard_rebuild/client/src/index.css`
- [x] `CBTU-110` Refresh shared visual primitives in:
  - `dashboard_rebuild/client/src/components/ui/button.tsx`
  - `dashboard_rebuild/client/src/components/ui/card.tsx`
  - `dashboard_rebuild/client/src/components/ui/input.tsx`
  - `dashboard_rebuild/client/src/components/ui/textarea.tsx`
  - `dashboard_rebuild/client/src/lib/theme.ts`

## Phase 2: Top-level page alignment

- [x] `CBTU-200` Align the primary route surfaces to the new page scaffold in:
  - `dashboard_rebuild/client/src/components/PageScaffold.tsx`
  - `dashboard_rebuild/client/src/pages/brain.tsx`
  - `dashboard_rebuild/client/src/pages/scholar.tsx`
  - `dashboard_rebuild/client/src/pages/tutor.tsx`
  - `dashboard_rebuild/client/src/pages/library.tsx`
  - `dashboard_rebuild/client/src/pages/calendar.tsx`
  - `dashboard_rebuild/client/src/pages/mastery.tsx`
  - `dashboard_rebuild/client/src/pages/methods.tsx`
  - `dashboard_rebuild/client/src/pages/vault-health.tsx`

## Phase 3: Validation and closeout

- [x] `CBTU-900` Run targeted frontend validation, update track artifacts, and close the track.

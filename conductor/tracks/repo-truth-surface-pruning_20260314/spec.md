# Specification: Repo Truth Surface Pruning

**Track ID:** repo-truth-surface-pruning_20260314  
**Created:** 2026-03-14  
**Status:** Active

## Goal

Reduce the repo to the smallest practical set of active truth-bearing and planning files without losing function, and make `README.md` the single top-level repo truth file.

## End-State

- `README.md` is the only top-level product/system truth file.
- `AGENTS.md` remains repo policy for agents, but points to `README.md` as the repo truth source.
- `docs/root/PROJECT_ARCHITECTURE.md` is the only active runtime/technical reference.
- `docs/root/GUIDE_DEV.md` is command/build/test only.
- `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks.md`, and `conductor/tracks/GENERAL/log.md` remain execution-only.
- Redundant truth-like support docs are merged away and deleted.
- Repo-local planning skills and command shims point at the same README-first truth order.

## Constraints

- Do not lose unique runtime, control-plane, or owner-contract detail during consolidation.
- Do not delete any file until its surviving content has a named destination and active references have been cleared.
- Keep current runtime truth honest: `TutorWizard` remains the live Tutor start surface until code changes land.
- Prefer markdown-first Conductor tracks; legacy `metadata.json` support may remain for older tracks, but new repo-local planning surfaces must not require it.

## Out Of Scope

- Shipping the `TutorStartPanel` runtime change.
- Rewriting historical logs for style only.
- Changing global home-directory agent defaults unless they directly contradict repo-local planning behavior.

## Required Surviving Truth Order

1. `README.md`
2. `sop/library/17-control-plane.md`
3. `docs/root/PROJECT_ARCHITECTURE.md`
4. `docs/root/GUIDE_DEV.md`
5. execution surfaces:
   - `docs/root/TUTOR_TODO.md`
   - `docs/root/AGENT_BOARD.md`
   - `conductor/tracks.md`
   - `conductor/tracks/GENERAL/log.md`

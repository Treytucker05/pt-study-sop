# Track: Tutor Launch / Shell Realignment Cleanup

> Track artifact. Product/ownership authority lives only in `README.md`.
> Use this folder for implementation evidence and closeout history only.

**ID:** tutor-launch-shell-realignment_20260313  
**Status:** Complete

## Documents

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Findings](./findings.md)
- [Validation Matrix](./validation-matrix.md)
- [Review Notes](./review.md)

## Scope

- Sync stale Tutor planning/doc artifacts so only the newest shell/start-panel model remains active.
- Replace the legacy `TutorWizard` with a thin Tutor start/resume surface.
- Lock Brain/Library launch precedence and retire wizard-era startup authority.
- Rework Studio, Schedule, and Publish so the shell feels learner-first.

## Progress

- Phase 0: track bootstrap and active-board registration — complete
- Phase 1: stale planning/doc sync and historical-marking pass — complete
- Phase 2: launch-state authority + start-panel replacement — complete
- Phase 3: Studio/Schedule/Publish shell-mode cleanup — complete
- Phase 4: active-doc rewrite, integrated validation, and closeout — complete

## Closeout

- `/tutor` now restores and launches through `TutorStartPanel` rather than `TutorWizard`.
- Tutor launch precedence is centralized in `dashboard_rebuild/client/src/lib/tutorClientState.ts`.
- Studio, Schedule, and Publish match the learner-first shell model and were revalidated during closeout.
- Active docs now describe the shipped shell/start-panel model, while pre-shell docs remain historical-only and point back to `README.md`.
- Integrated gate passed on 2026-03-14:
  - backend targeted pytest gate
  - frontend targeted test matrix
  - `npm run check`
  - `npm run build`
  - `python scripts/check_docs_sync.py`
  - live smoke via `Start_Dashboard.bat` + `python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000`

## Quick Links

- [Back to Tracks](../../tracks.md)
- [Repo Truth](../../../README.md)

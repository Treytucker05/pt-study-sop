# Evidence - Tutor UI Stabilization Loop

## Baseline audit

Date: 2026-03-16
Audit method: live browser walk using desktop/browser inspection tools against the running dashboard

### Baseline findings

1. `P1` Stage switches preserve scroll position and land mid-page.
2. `P1` Brain -> Tutor handoff restores stale live session state instead of a clean launch shell.
3. `P1` Launch/dashboard surfaces still render live Tutor chrome when an active session exists.

### Baseline scorecard

- P1 issues: 3
- P2 issues: 0
- P3 issues: 0
- Critical flow pass rate: 4 / 7

## Iteration 1 placeholder

- Planned fixes:
  - shell-state initialization and restore gating
  - live Tutor chrome gating
  - stage transition scroll reset

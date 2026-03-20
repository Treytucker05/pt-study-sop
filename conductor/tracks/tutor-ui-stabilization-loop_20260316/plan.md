# Plan - Tutor UI Stabilization Loop

## Operating model

Use one repeated loop:

1. audit the fixed route set live
2. normalize findings into a severity-tagged issue backlog
3. plan the next dependency-correct fix wave
4. implement that wave
5. validate the changed surfaces
6. re-audit the same route set
7. checkpoint only if severity or issue counts improve

## Baseline scorecard

- P1 issues: 3
- P2 issues: 0
- P3 issues: 0
- Critical flow pass rate: 4 / 7

## Iteration 1 wave

### TUSL-110
Fix Tutor shell-state initialization so Brain handoff and Launch entry do not revive stale active-session state unless resume was explicit.

Done when:
- Brain -> Open Tutor lands in a clean Tutor shell/dashboard state when there is no explicit session route parameter
- stored active session IDs no longer force `shellMode = "tutor"` during Brain launch handoff

Status:
- completed 2026-03-16

### TUSL-120
Fix Tutor shell chrome gating so Launch/dashboard does not render live Tutor topic/block/session chrome merely because an active session exists in storage.

Done when:
- live Tutor chrome renders only in actual Tutor session view
- dashboard/launch surfaces show workflow/launch context instead of stale live-session chrome

Status:
- completed 2026-03-16

### TUSL-130
Fix stage transition scroll behavior so Launch, Priming, Polish, and Final Sync always land at the top of the page after shell/view switches.

Done when:
- Brain -> Tutor
- Launch -> Priming
- Launch -> Final Sync
- Tutor -> Polish
all render at top-of-page after the transition

Status:
- completed 2026-03-16

## Validation order

1. `python scripts/check_docs_sync.py`
2. `cd dashboard_rebuild && npm run build`
3. live browser re-audit of the fixed route set

## Re-audit rule

Iteration 1 is accepted only if:

- P1 count drops below baseline
- no new P1 issue is introduced
- the affected critical flows improve measurably

## Iteration 1 result

- accepted 2026-03-16
- browser-tool re-audit confirmed:
  - Brain -> Open Tutor lands in a clean dashboard shell
  - Launch renders at top-of-page without stale live-session chrome
  - Open Priming lands at top-of-page and preserves workflow course scope
  - View Sync lands at top-of-page with closeout controls visible
  - Back to Polish lands at top-of-page with queue/workspace intact
  - `/methods` still loads and remains usable
- next loop step:
  - run the same audit again from a clean browser state and only close the track if the same `0 P1 / 0 P2` result holds twice in a row

## Final closeout

- closed 2026-03-16
- browser-tool audit result:
  - 10 consecutive passes
  - 0 P1
  - 0 P2
  - 0 P3
  - critical flow pass rate held at 7 / 7 across the audited route set

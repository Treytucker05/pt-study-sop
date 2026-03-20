# Tutor UI Stabilization Loop

Opened: 2026-03-16
Status: complete
Closed: 2026-03-16
Track ID: `tutor-ui-stabilization-loop_20260316`

## Objective

Run a repeatable live-page audit and remediation loop over Brain handoff, Tutor shell transitions, and adjacent Tutor study surfaces until critical shell-state, navigation, and hydration defects are removed and the same critical-flow audit passes twice in a row.

## Product finish condition

- `0` P1 issues
- `0` P2 issues
- all critical flows pass
- the same result holds for two consecutive audits

## Closeout result

- achieved on 2026-03-16
- exceeded the original stop rule with 10 consecutive clean browser-tool audits

## Critical flows

1. Brain -> Open Tutor
2. Tutor Launch renders cleanly at top-of-page
3. Launch -> Priming renders cleanly at top-of-page
4. Priming -> Tutor preserves intended workflow scope
5. Tutor -> Polish opens without shell-state bleed
6. Polish -> Final Sync opens without shell-state bleed
7. `/methods` remains usable after Tutor shell work

## Iteration 1 issue wave

1. `P1` Stage switches preserve scroll position and land mid-page.
2. `P1` Brain -> Tutor handoff restores stale live session state instead of a clean launch shell.
3. `P1` Launch/dashboard surfaces still render live Tutor chrome when an active session exists.

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

## Iteration 1 result

Date: 2026-03-16
Audit method: browser-tool re-audit using `npx browsirai`

### Validation

- `python scripts/check_docs_sync.py`
  - passed
- `cd dashboard_rebuild && npm run build`
  - passed

### Browser re-audit results

1. `Fixed` Brain -> Open Tutor now lands in a clean Tutor dashboard shell.
   - Session status shows `READY`, not `LIVE`.
   - Brain handoff card is visible without stale session chrome.

2. `Fixed` Launch now lands at top-of-page.
   - Launch Hub heading and primary controls are immediately visible.

3. `Fixed` Open Priming now lands at top-of-page.
   - Priming Workstation heading is immediately visible.
   - The Neuroscience workflow preserved its class scope in the `CLASS` selector.

4. `Fixed` View Sync now lands at top-of-page.
   - Final Sync heading and primary controls are immediately visible.

5. `Fixed` Back to Polish now lands at top-of-page.
   - Queue, workspace, and Polish Assist panels are visible at entry.

6. `Passed` `/methods` still loads and remains usable after the Tutor shell changes.

### Iteration 1 scorecard

- P1 issues: 0
- P2 issues: 0
- P3 issues: 0
- Critical flow pass rate: 7 / 7 on the audited route set

### Checkpoint decision

- checkpoint accepted
- track remains open because the stop rule requires the same clean audit result on a second consecutive pass

## Consecutive audit closeout

Date: 2026-03-16
Audit method: repeated browser-tool audits using `npx browsirai`

### Consecutive run result

- iteration 1: pass
- iteration 2: pass
- iteration 3: pass
- iteration 4: pass
- iteration 5: pass
- iteration 6: pass
- iteration 7: pass
- iteration 8: pass
- iteration 9: pass
- iteration 10: pass

### Final scorecard

- P1 issues: 0
- P2 issues: 0
- P3 issues: 0
- Critical flow pass rate: 7 / 7
- Consecutive clean audits: 10

### Closeout decision

- track closed
- the original `two clean audits in a row` stop rule was exceeded with `10` consecutive clean audits

# Gap Analysis - Missing Recent Session Logs (M0-M6 + Bridges)
- Date: 2026-01-10
- Window: 2026-01-03 to 2026-01-10
- Data: no session logs in window

## Gap
No tutor session logs are available within the last 7 days, preventing audit checks for probe-before-teach and high-utility technique usage.

## Evidence
- `brain/session_logs/` has no files dated 2026-01-03 to 2026-01-10.
- Most recent log is outside the audit window (2025-12-11).

## Impact
- Audit phase becomes non-evaluative; compliance checks cannot be verified.
- Weekly digest relies on stale data or must report an empty window.

## Recommendation (one change)
Add a daily audit gate that flags empty 7-day windows and requires a manual session log check before closing the run.

## Success Criteria
- At least one session log appears in each 7-day window, or an explicit "no sessions" acknowledgment is recorded in the run log.

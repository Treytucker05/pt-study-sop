# Gap Analysis - Missing Recent Session Logs (2026-01-10_190911)

## Problem framing
Recent audit window (last 7 days) has no session logs, so compliance checks (probe-before-teach and high-utility techniques) cannot be evaluated.

## Evidence (facts from repo)
- `brain/session_logs/` has no files with dates 2026-01-03 to 2026-01-10 (name-based scan).
- Most recent dated log: `brain/session_logs/2025-12-11_geriatrics_normal_vs_common_abnormal.md`.

## Constraints
- Read-only: `sop/`, `brain/`, `dist/`.
- Audit window: last 7 days or since last run.
- Unattended mode: questions must be written to `scholar/outputs/orchestrator_runs/`.

## Options
1. Strict window: report "no data" and stop.
2. Fallback audit: use most recent prior log and mark it stale.
3. Fail-fast: block the run until new logs exist.

## Trade-offs
| option | pros | cons | risks | when to choose |
| --- | --- | --- | --- | --- |
| Strict window | avoids stale inference | no actionable insights | repeated empty runs | when data integrity is paramount |
| Fallback audit | yields insights with clear stale flag | relies on old data | drift vs current behavior | when continuity is needed |
| Fail-fast | forces logging hygiene | no outputs produced | breaks unattended loop | when audits must be data-backed |
## Recommendation + why
Adopt the fallback audit rule: audit the most recent prior log and label findings as stale when the 7-day window is empty. This preserves continuity while making data freshness explicit.

## Follow-ups
- Add a daily log-presence check that flags empty windows before audits run.

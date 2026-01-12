# Scholar Loop Integration Gaps (2026-01-12)

## Brain
- Gap: Missing or stale session logs reduce audit quality.
  - Impact: Health/audit reports may miss real friction.
  - Evidence: `scholar/outputs/gap_analysis/gap_analysis_missing_recent_session_logs_2026-01-10.md`

## Tutor
- Gap: No aggregate mastery counter across sessions (successive relearning).
  - Impact: Retention signal is weak across runs.
  - Evidence: `scholar/outputs/gap_analysis/gap_analysis_2026-01-07.md`
- Gap: Interleaved scheduling is not enforced at plan start.
  - Impact: Transfer and discrimination suffer.
  - Evidence: `scholar/outputs/gap_analysis/gap_analysis_2026-01-07.md`

## Scholar
- Gap: Output lane documentation mismatches actual outputs.
  - Impact: Governance confusion, incomplete audits.
  - Evidence: `scholar/outputs/audit_scholar_repo.md`
- Gap: Limited automated validation of output completeness.
  - Impact: Missing artifacts may go undetected.
  - Evidence: `scholar/outputs/gap_analysis/scholar_risks_2026-01-12.md`

## Dashboard/Loop
- Gap: Digest generation does not persist unless the save endpoint is used.
  - Impact: No plan updates or proposal seeds are generated.
  - Evidence: `brain/dashboard/routes.py`
- Gap: Plan updates are drafts and are not auto-applied to SOP files.
  - Impact: Improvements can stall after discovery.
  - Evidence: `brain/dashboard/routes.py`

## Telemetry/Data
- Gap: No explicit data freshness thresholds in output artifacts.
  - Impact: Reports may be based on stale data without warnings.
  - Evidence: `scholar/outputs/gap_analysis/scholar_risks_2026-01-12.md`

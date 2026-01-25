# Scholar Run Cadence Plan (2026-01-12)

## Daily Cadence
- Run Scholar once per day after the latest session log is ingested.
- If questions exist, run research and answer flow before closing the run.

## Weekly Cadence
- Ensure a weekly digest is produced once per week (Friday+ or 7 days since last digest).
- Use the digest save step to generate plan updates and proposal seeds.

## Triggers
- New session logs ingested.
- New gaps or risks identified.
- Pending questions older than 7 days.

## Safe Mode Guidance
- When safe_mode is true: allow research, analysis, and proposal drafting only.
- When safe_mode is false: allow patch drafts, but still require manual approval to apply changes.

## Multi-Agent Guidance
- Enable multi-agent for weekly synthesis or large audits.
- Use lower concurrency for daily runs to reduce resource contention.

Evidence
- `scholar/workflows/orchestrator_run_prompt.md` (weekly digest trigger)
- `scholar/inputs/audit_manifest.json` (multi_agent settings)

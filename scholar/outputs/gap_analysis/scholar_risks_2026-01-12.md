# Scholar Risks and Weaknesses (2026-01-12)

## Technical Risks
- Launcher uses dangerously bypass flags (see `scripts/run_scholar.bat`).
- STATUS.md embeds absolute paths (portability risk).

## Process Risks
- Documentation output lanes do not fully match observed lanes.
- Limited automated validation of output completeness.

## Data Risks
- Missing or stale Brain telemetry reduces audit quality.
- No explicit data freshness thresholds in output artifacts.

# Scholar Observability and Telemetry (2026-01-12)

## Telemetry Sources
- `brain/session_logs/`
- `brain/data/pt_study.db`
- `scholar/telemetry_snapshot.py` outputs

## Metrics/Signals
- Friction alerts (see `scholar/friction_alerts.py`)
- Telemetry snapshot summaries under `scholar/outputs/`

## Gaps
- No explicit success metrics for audit quality.
- Output lanes lack explicit freshness/recency indicators beyond filenames.

## Recommendations
- Add a small summary section to STATUS.md indicating last-run timestamp and lanes updated.

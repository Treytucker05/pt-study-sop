# Scholar Entrypoints and Triggers (2026-01-12)

## Entrypoints
- `scripts/run_scholar.bat`
- `brain/dashboard/scholar.py`
- `scripts/update_status.ps1`

## Manual Steps
- `scripts/run_scholar.bat` provides an interactive menu to launch audits and orchestrator runs.

## Automation/Orchestration
- `brain/dashboard/scholar.py` runs Codex CLI jobs and assembles status/digest artifacts.
- `scripts/update_status.ps1` refreshes `scholar/outputs/STATUS.md`.

## Gaps/Notes
- Document exact CLI dependencies and environment assumptions for first-time runs.

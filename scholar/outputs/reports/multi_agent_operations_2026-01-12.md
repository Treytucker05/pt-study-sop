# Multi-Agent Operations (2026-01-12)

## How Multi-Agent Runs Work
- Multi-agent runs launch a supervisor plus specialist agents (telemetry, SOP, pedagogy, research) and then synthesize results.
- The run produces a log and a final summary in `scholar/outputs/orchestrator_runs/`.

Evidence
- `brain/dashboard/scholar.py` (run_scholar_orchestrator_multi)
- `scholar/workflows/agents/` (agent templates)

## Configuration
- Multi-agent settings live in `scholar/inputs/audit_manifest.json` under `multi_agent`.
- `max_concurrency` caps parallelism.

Evidence
- `scholar/inputs/audit_manifest.json`

## Execution Path
- Dashboard endpoint `POST /api/scholar/multi-agent` updates the manifest toggle.
- When multi-agent is enabled, `run_scholar_orchestrator()` delegates to the multi-agent runner.

Evidence
- `brain/dashboard/routes.py` (api_scholar_multi_agent)
- `brain/dashboard/scholar.py` (run_scholar_orchestrator)

## Verification Steps
1) Confirm `multi_agent.enabled` and `max_concurrency` in `scholar/inputs/audit_manifest.json`.
2) Trigger a run and verify `scholar/outputs/orchestrator_runs/unattended_<timestamp>.log` and `unattended_final_<timestamp>.md` exist.
3) Check the log for per-agent start/finish markers to confirm parallel execution.

Evidence
- `scholar/inputs/audit_manifest.json`
- `brain/dashboard/scholar.py` (multi-agent log writes)
- `scholar/outputs/orchestrator_runs/`

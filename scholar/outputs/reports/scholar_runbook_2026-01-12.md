# Scholar Runbook (2026-01-12)

## Prerequisites
- Codex CLI available.
- Brain telemetry present (`brain/session_logs/`, `brain/data/pt_study.db`).
- Tutor sources available (`sop/gpt-knowledge/*`).

## Step-by-step Run
1. Run `scripts/run_scholar.bat`.
2. Choose Interactive Audit or Orchestrator run.
3. Review outputs under `scholar/outputs/*`.

## Expected Outputs
- Reports, module audits, gap analyses, digests, system maps, and status updates under `scholar/outputs/`.

## Failure Modes
- Missing Brain DB/logs -> empty telemetry outputs.
- Missing Codex CLI -> orchestrator cannot run.

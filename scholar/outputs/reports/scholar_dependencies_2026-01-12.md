# Scholar Dependencies (2026-01-12)

## Direct Dependencies
- `brain/session_logs/` and `brain/data/pt_study.db` (telemetry)
- `sop/gpt-knowledge/*` and `sop/MASTER_PLAN_PT_STUDY.md` (Tutor sources)
- `scripts/run_scholar.bat` and `brain/dashboard/scholar.py` (execution/orchestration)

## Indirect Dependencies
- `scripts/update_status.ps1` (status aggregation)
- `scholar/inputs/audit_manifest.json` (path allowlist)

## Risky Couplings
- Dependence on Codex CLI flags in launcher scripts.
- Absolute paths embedded in some outputs (portability risk).

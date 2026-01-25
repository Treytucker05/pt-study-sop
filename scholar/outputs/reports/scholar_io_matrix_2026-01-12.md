# Scholar Inputs/Outputs Matrix (2026-01-12)

## Inputs
- `scholar/inputs/audit_manifest.json` (allowed paths, safe_mode, telemetry settings)
- `scholar/inputs/ai_artifacts_manifest.json` (output lanes + file patterns)
- `brain/session_logs/` (telemetry logs)
- `brain/data/pt_study.db` (SQLite telemetry source)
- `sop/gpt-knowledge/*` and `sop/MASTER_PLAN_PT_STUDY.md` (Tutor sources; see audit_manifest.json)

## Outputs
- `scholar/outputs/digests/`
- `scholar/outputs/gap_analysis/`
- `scholar/outputs/module_audits/`
- `scholar/outputs/module_dossiers/`
- `scholar/outputs/orchestrator_runs/`
- `scholar/outputs/promotion_queue/`
- `scholar/outputs/proposals/`
- `scholar/outputs/reports/`
- `scholar/outputs/research_notebook/`
- `scholar/outputs/system_map/`
- `scholar/outputs/STATUS.md` and `scholar/outputs/SCHOLAR_REVIEW_*.md`

## Transformations
- Telemetry snapshots and alerts are derived from Brain DB and session logs via `scholar/telemetry_snapshot.py` and `scholar/friction_alerts.py`.
- Orchestrator outputs use `scholar/workflows/orchestrator_run_prompt.md` and `scholar/workflows/orchestrator_loop.md`.

## Storage Lanes
- `digests`
- `gap_analysis`
- `module_audits`
- `module_dossiers`
- `orchestrator_runs`
- `promotion_queue`
- `proposals`
- `reports`
- `research_notebook`
- `system_map`

# Scholar System Map (2026-01-12)
- Auditor: The Scholar
- Scope: Scholar system + dependencies used to audit Tutor v9.2

## Components
### Entry points and orchestration
- `scripts/run_scholar.bat`: Interactive launcher for unattended runs; writes run logs and final summaries in `scholar/outputs/orchestrator_runs/`.
- `brain/dashboard/scholar.py`: Dashboard integration, Codex CLI runner, telemetry snapshot hook, status and digest assembly.
- `scholar/workflows/orchestrator_run_prompt.md`: Unattended run instructions and output format.
- `scholar/workflows/orchestrator_loop.md`: Continuous improvement loop definition.

### Inputs and configuration
- `scholar/inputs/audit_manifest.json`: Allowed repo paths, safe_mode, telemetry snapshot settings, tutor/brain paths.
- `scholar/inputs/ai_artifacts_manifest.json`: Output lanes + file patterns used for coverage and artifact planning.
- `brain/session_logs/`: Telemetry logs source (read-only).
- `brain/data/pt_study.db`: Brain SQLite source used by data tools.
- `sop/gpt-knowledge/M0-planning.md`: Tutor source module input (see `scholar/inputs/audit_manifest.json` for full list).
- `sop/gpt-knowledge/M6-wrap.md`: Tutor source module input (see `scholar/inputs/audit_manifest.json` for full list).

### Data utilities
- `scholar/brain_reader.py`: Read-only Brain DB access and session/tutor_turns queries.
- `scholar/telemetry_snapshot.py`: Generates telemetry snapshots under `scholar/outputs/telemetry/`.
- `scholar/friction_alerts.py`: Derives alert signals from Brain data.

### Workflows and templates
- `scholar/workflows/audit_session.md`: Session log audit flow.
- `scholar/workflows/audit_module.md`: Module audit flow.
- `scholar/workflows/build_system_map.md`: System map procedure.
- `scholar/workflows/generate_module_dossier.md`: Dossier workflow.
- `scholar/workflows/promotion_pipeline.md`: Proposal pipeline.
- `scholar/workflows/run_gap_analysis.md`: Gap analysis flow.
- `scholar/workflows/weekly_cycle.md`: Cadence for reviews.
- `scholar/TEMPLATES/system_map.md`: System map template.
- `scholar/TEMPLATES/change_proposal.md`: RFC template.
- `scholar/TEMPLATES/experiment_design.md`: Experiment template.
- `scholar/TEMPLATES/gap_analysis.md`: Gap analysis template.
- `scholar/TEMPLATES/module_dossier.md`: Dossier template.

### Output lanes (AI artifacts)
- `scholar/outputs/system_map/` (example: `scholar/outputs/system_map/system_map_2026-01-07.md`)
- `scholar/outputs/reports/` (example: `scholar/outputs/reports/weekly_digest_2026-01-11.md`)
- `scholar/outputs/module_audits/` (example: `scholar/outputs/module_audits/M0-M6-bridge_audit_2026-01-12.md`)
- `scholar/outputs/module_dossiers/` (example: `scholar/outputs/module_dossiers/M4-build_dossier_2026-01-07.md`)
- `scholar/outputs/gap_analysis/` (example: `scholar/outputs/gap_analysis/gap_analysis_2026-01-07.md`)
- `scholar/outputs/digests/` (example: `scholar/outputs/digests/strategic_digest_2026-01-10_200812.md`)
- `scholar/outputs/research_notebook/` (example: `scholar/outputs/research_notebook/M6_research_2026-01-07_spacedrep.md`)
- `scholar/outputs/promotion_queue/` (example: `scholar/outputs/promotion_queue/change_proposal_mastery_count_2026-01-07.md`)
- `scholar/outputs/proposals/` (example: `scholar/outputs/proposals/change_proposal_core_mode_probe_refine_lock_2026-01-07.md`)
- `scholar/outputs/orchestrator_runs/` (example: `scholar/outputs/orchestrator_runs/run_2026-01-12.md`)
- `scholar/outputs/` root status files (examples: `scholar/outputs/STATUS.md`, `scholar/outputs/SCHOLAR_REVIEW_2026-01-09.md`)

## Data Flow
1. Launch (manual): `scripts/run_scholar.bat` or dashboard UI `brain/dashboard/scholar.py`.
2. Orchestrator context: uses `scholar/workflows/orchestrator_run_prompt.md` and `scholar/workflows/orchestrator_loop.md`.
3. Inputs read (read-only): `brain/session_logs/`, `brain/data/pt_study.db` (via `scholar/brain_reader.py`, `scholar/telemetry_snapshot.py`, `scholar/friction_alerts.py`), and Tutor source paths from `scholar/inputs/audit_manifest.json`.
4. Artifact planning: lanes/patterns from `scholar/inputs/ai_artifacts_manifest.json`.
5. Output generation: writes reports, dossiers, gap analyses, system maps, and proposals under `scholar/outputs/*` lanes.
6. Status refresh: `scripts/update_status.ps1` aggregates latest artifacts into `scholar/outputs/STATUS.md`.

## Dependencies
- Tutor source system: `sop/MASTER_PLAN_PT_STUDY.md`, `sop/gpt-knowledge/runtime-prompt.md`, and module files listed in `scholar/inputs/audit_manifest.json`.
- Brain telemetry: `brain/session_logs/` and `brain/data/pt_study.db`.
- Dashboard integration: `brain/dashboard/scholar.py` for UI status, digest generation, and Codex CLI calls.
- Status pipeline: `scripts/update_status.ps1` and `scholar/outputs/STATUS.md`.
- Output lane contract: `scholar/inputs/ai_artifacts_manifest.json` and `scholar/CHARTER.md`.

## Hand-offs
- Human review: outputs in `scholar/outputs/promotion_queue/` and `scholar/outputs/proposals/` are prepared for manual approval (see `scholar/CHARTER.md`).
- Questions to answer: `scholar/outputs/orchestrator_runs/questions_needed_*.md` capture clarifications needed from humans (see `scholar/workflows/orchestrator_run_prompt.md`).
- Status consumption: `scholar/outputs/STATUS.md` is read by humans and the dashboard (`brain/dashboard/scholar.py`) to decide next actions.

## Coverage Note
- Artifacts used: all files under `scholar/outputs/` as enumerated in `scholar/outputs/system_map/scholar_inventory_2026-01-12.md` (148 files across lanes), plus the representative lane examples listed above.
- Gaps: none observed vs `scholar/inputs/ai_artifacts_manifest.json` lanes.

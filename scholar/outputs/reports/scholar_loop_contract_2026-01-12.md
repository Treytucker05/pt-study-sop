# Scholar Loop Contract (2026-01-12)

Purpose: Define the artifacts, inputs, outputs, consumers, and cadence for the Scholar continuous improvement loop.

## Artifacts
- Questions: `scholar/outputs/orchestrator_runs/questions_needed_*.md` and `_preserved_questions_*.txt` capture clarifications that gate the next research/synthesis pass (example: `scholar/outputs/orchestrator_runs/questions_needed_2026-01-12.md`).
- Proposals: `scholar/outputs/promotion_queue/*.md` and `scholar/outputs/proposals/*.md` contain bounded RFCs/experiments for human approval (example: `scholar/outputs/promotion_queue/change_proposal_mastery_count_2026-01-07.md`).
- Gaps: `scholar/outputs/gap_analysis/*.md` inventories systemic deficiencies and risks (example: `scholar/outputs/gap_analysis/gap_analysis_2026-01-07.md`, `scholar/outputs/gap_analysis/scholar_risks_2026-01-12.md`).
- Digests: `scholar/outputs/digests/*.md` and recurring weekly digests synthesize findings and priorities (example: `scholar/outputs/digests/scholar_audit_digest_2026-01-12.md`).
- System health: `scholar/outputs/STATUS.md` plus health/observability reports summarize runability and lane coverage (examples: `scholar/outputs/reports/scholar_health_check_2026-01-12.md`, `scholar/outputs/reports/scholar_observability_2026-01-12.md`, `scholar/outputs/reports/scholar_working_status_2026-01-12.md`).
- Context artifacts: module audits, dossiers, system maps, and reports provide evidence for gaps and proposals (examples: `scholar/outputs/module_audits/M0-M6-bridge_audit_2026-01-12.md`, `scholar/outputs/module_dossiers/M0-planning_dossier_2026-01-07.md`, `scholar/outputs/system_map/scholar_system_map_2026-01-12.md`, `scholar/outputs/reports/scholar_io_matrix_2026-01-12.md`).

Loop feed (explicit):
- Questions -> drive the Question and Research phases -> updates in Research Notebook and Module Dossiers -> feed Gap Analysis.
- Gaps -> nominate improvement candidates -> Promotion Queue proposals/experiments -> manual approval -> changes to sop/ or brain/ (outside Scholar).
- Digests -> summarize current state and top gaps -> inform next Plan step and cadence decisions.
- System health -> gates whether a run proceeds, and prioritizes which artifacts need refreshing before new proposals are drafted.

## Inputs
- Governance and configuration: `scholar/inputs/audit_manifest.json`, `scholar/inputs/ai_artifacts_manifest.json`.
- Telemetry: `brain/session_logs/` and `brain/data/pt_study.db` (via `scholar/brain_reader.py`, `scholar/telemetry_snapshot.py`).
- Tutor sources: `sop/gpt-knowledge/*` and `sop/MASTER_PLAN_PT_STUDY.md` (allowlisted in `scholar/inputs/audit_manifest.json`).
- Orchestration: `scripts/run_scholar.bat`, `brain/dashboard/scholar.py`, `scholar/workflows/orchestrator_loop.md`.
- Templates/workflows: `scholar/TEMPLATES/*` and `scholar/workflows/*` for audits, dossiers, gap analysis, and promotion pipeline.

## Outputs
- `scholar/outputs/reports/`: audits, runbooks, docs audits, and system health summaries.
- `scholar/outputs/digests/`: synthesized findings and weekly/strategic recaps.
- `scholar/outputs/system_map/`: inventory, system maps, coverage checklists.
- `scholar/outputs/research_notebook/`: research notes and literature summaries.
- `scholar/outputs/orchestrator_runs/`: run logs, questions_needed, unattended_final receipts.
- `scholar/outputs/module_audits/` and `scholar/outputs/module_dossiers/`: module-level evidence and deep dives.
- `scholar/outputs/gap_analysis/`: gap inventories and risk reviews.
- `scholar/outputs/promotion_queue/` and `scholar/outputs/proposals/`: RFCs/experiments for approval.
- `scholar/outputs/STATUS.md`: latest run summary and lane snapshot.

## Consumers
- Human architect/maintainer: answers questions, reviews gaps/digests, approves proposals.
- Dashboard integration: `brain/dashboard/scholar.py` reads STATUS and emits summaries/digests.
- Status updater: `scripts/update_status.ps1` aggregates latest artifacts into `scholar/outputs/STATUS.md`.
- Orchestrator loop: uses prior questions, dossiers, and gap analyses as context for new runs.

## Update Cadence
- On-demand runs: `scripts/run_scholar.bat` or dashboard trigger an orchestrator pass and refresh STATUS.
- Weekly cycle (from `scholar/workflows/weekly_cycle.md`):
  - Monday: audit recent session logs -> report synthesis.
  - Wednesday: update a module dossier + research notebook notes.
  - Friday: review promotion queue; finalize 1-2 RFCs; update system map if needed.
- Digests: weekly when the weekly cycle triggers (see `scholar/outputs/reports/weekly_digest_*.md`).
- System health: update STATUS and health check after each run.

## Coverage Note
- Artifacts used: `scholar/outputs/system_map/scholar_inventory_2026-01-12.md`, `scholar/outputs/system_map/scholar_system_map_2026-01-12.md`, `scholar/outputs/reports/scholar_io_matrix_2026-01-12.md`, `scholar/outputs/audit_scholar_repo.md`, `scholar/outputs/orchestrator_runs/run_2026-01-12.md`, `scholar/outputs/orchestrator_runs/questions_needed_2026-01-12.md`, `scholar/outputs/digests/scholar_audit_digest_2026-01-12.md`, `scholar/outputs/gap_analysis/gap_analysis_2026-01-07.md`, `scholar/outputs/gap_analysis/scholar_risks_2026-01-12.md`, `scholar/outputs/promotion_queue/change_proposal_mastery_count_2026-01-07.md`, `scholar/outputs/reports/scholar_health_check_2026-01-12.md`, `scholar/outputs/reports/scholar_observability_2026-01-12.md`, `scholar/outputs/reports/scholar_working_status_2026-01-12.md`.
- Gaps: None noted; `scholar/outputs/system_map/scholar_inventory_2026-01-12.md` reports all output lanes populated.

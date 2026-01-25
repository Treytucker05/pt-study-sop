# Proposals Lifecycle (2026-01-12)

Purpose: Map how Scholar proposals are drafted, queued, reviewed, and used downstream, with storage paths.

## Drafting
- Improvements are surfaced in audits/dossiers and converted into one-change-only proposals per the audit rule and promotion pipeline (`scholar/knowledge/pedagogy_audit.md`, `scholar/workflows/promotion_pipeline.md`).
- Drafts use the canonical templates with required Status/Scope fields and ONE-change-only constraints (`scholar/TEMPLATES/change_proposal.md`, `scholar/TEMPLATES/experiment_design.md`, `scholar/README.md`, `scholar/CHARTER.md`).
- Audit workflows optionally emit proposals directly into the proposals lane with a defined naming convention (`scholar/workflows/audit_module.md`).
- Existing examples: `scholar/outputs/promotion_queue/change_proposal_mastery_count_2026-01-07.md`, `scholar/outputs/proposals/change_proposal_core_mode_probe_refine_lock_2026-01-07.md`.

## Queueing (safe_mode)
- `scholar/inputs/audit_manifest.json` controls whether proposal drafting is allowed; safe_mode false is research-only and safe_mode true allows change packages (`scholar/outputs/reports/scholar_health_check_2026-01-12.md`).
- Promotion queue staging is explicitly defined in the pipeline and stored under `scholar/outputs/promotion_queue/` (`scholar/workflows/promotion_pipeline.md`, `scholar/README.md`, `scholar/outputs/system_map/scholar_system_map_2026-01-12.md`).
- Coverage tooling tracks the queue via the promotion_queue lane (`scholar/inputs/ai_artifacts_manifest.json`).
- Queue examples: `scholar/outputs/promotion_queue/change_proposal_probe_first_2026-01-07.md`, `scholar/outputs/promotion_queue/experiment_probe_first_2026-01-07.md`.

## Approval/Rejection
- Human approval is mandatory; proposals are advisory only (`scholar/CHARTER.md`).
- The dashboard approval API reads a proposal from the queue, updates the markdown Status, and moves it to approved or rejected storage (`brain/dashboard/routes.py`).
- Approved/rejected proposals are persisted in the Brain DB `brain/data/pt_study.db` with the `scholar_proposals` table defined in `brain/db_setup.py`.
- The proposals lane also contains direct outputs from audits (not necessarily approved), e.g., `scholar/outputs/proposals/change_proposal_core_mode_probe_refine_lock_2026-01-07.md` (`scholar/workflows/audit_module.md`).

## Downstream Usage
- The loop contract defines proposals as the handoff that drives manual changes to `sop/` or `brain/` after approval (`scholar/outputs/reports/scholar_loop_contract_2026-01-12.md`, `scholar/workflows/promotion_pipeline.md`).
- Dashboard UI surfaces proposal counts and details for review and action (`brain/dashboard/scholar.py`, `brain/templates/dashboard.html`, `brain/static/js/dashboard.js`).
- Strategic digests call out proposal backlog and priorities for review (`scholar/outputs/digests/strategic_digest_2026-01-10_185544.md`).
- Approved/rejected entries are recorded in the DB for tracking and analytics (`brain/db_setup.py`, `brain/dashboard/routes.py`).

## Gaps
Facts from repo
- Artifact manifest only matches `scholar/outputs/proposals/*.md`, so approved/rejected subfolders created by the dashboard are not covered by the manifest (`scholar/inputs/ai_artifacts_manifest.json`, `brain/dashboard/routes.py`).
- STATUS generation only counts `promotion_queue` and omits the proposals lane entirely (`scripts/update_status.ps1`, `scholar/outputs/STATUS.md`).
- The system review notes that the promotion queue lacks approval/rejection tracking (`scholar/outputs/SCHOLAR_REVIEW_2026-01-09.md`).

Assumptions (UNCONFIRMED)
- Approved/rejected proposals are not surfaced in STATUS or digests unless manually referenced elsewhere.
- The proposals lane does not have a canonical index mapping proposal IDs to approval status.

Recommendations (ranked)
1. Expand `scholar/inputs/ai_artifacts_manifest.json` to include `scholar/outputs/proposals/**/*.md` so approved/rejected outputs are tracked.
2. Extend `scripts/update_status.ps1` to include the proposals lane (and optionally approved/rejected counts) for review visibility.
3. Add a lightweight proposals index report or update STATUS to list proposal IDs with their current status, aligning with `scholar_proposals` records.

## Coverage Note
- Artifacts used (all lanes): `scholar/outputs/system_map/scholar_inventory_2026-01-12.md` (full inventory), `scholar/outputs/system_map/scholar_system_map_2026-01-12.md`, `scholar/outputs/reports/scholar_loop_contract_2026-01-12.md`, `scholar/outputs/reports/scholar_io_matrix_2026-01-12.md`, `scholar/outputs/reports/scholar_working_status_2026-01-12.md`, `scholar/outputs/digests/strategic_digest_2026-01-10_185544.md`, `scholar/outputs/orchestrator_runs/run_2026-01-12.md`, `scholar/outputs/orchestrator_runs/questions_needed_2026-01-12.md`, `scholar/outputs/research_notebook/M4_research_2026-01-07_successive_relearning.md`, `scholar/outputs/module_audits/M0-M6-bridge_audit_2026-01-12.md`, `scholar/outputs/module_dossiers/M0-planning_dossier_2026-01-07.md`, `scholar/outputs/gap_analysis/gap_analysis_2026-01-07.md`, `scholar/outputs/promotion_queue/change_proposal_mastery_count_2026-01-07.md`, `scholar/outputs/proposals/change_proposal_core_mode_probe_refine_lock_2026-01-07.md`, `scholar/outputs/STATUS.md`, `scholar/outputs/SCHOLAR_REVIEW_2026-01-09.md`.
- Gaps: none in output lane coverage per `scholar/outputs/system_map/scholar_inventory_2026-01-12.md`; lifecycle gaps listed above.

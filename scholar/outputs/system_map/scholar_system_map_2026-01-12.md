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

## Addendum: Detailed Runtime Map (2026-01-12)
### Entry points (exact)
- CLI launcher: `scripts/run_scholar.bat` (menu-based runner that calls `codex exec` and updates STATUS).
- Dashboard trigger: `POST /api/scholar/run` in `brain/dashboard/routes.py` -> `run_scholar_orchestrator()` in `brain/dashboard/scholar.py`.

### Orchestrator execution
- Prompt source: `scholar/workflows/orchestrator_run_prompt.md` (unattended runbook + output contract).
- Loop definition: `scholar/workflows/orchestrator_loop.md` (review -> plan -> understand -> question -> research -> synthesize -> draft -> wait).
- Default scope: M0-M6 + bridges (from prompt), with `safe_mode` gating promotion queue.

### Single-agent run (default)
- Preserves unanswered questions from latest `questions_needed_*.md` into `_preserved_questions_*.txt`.
- If Codex CLI missing, writes instructions into `unattended_final_*.md` and stops (manual execution required).
- If Codex CLI present, runs `codex exec` with stdin prompt; writes:
  - `scholar/outputs/orchestrator_runs/unattended_<timestamp>.log`
  - `scholar/outputs/orchestrator_runs/unattended_final_<timestamp>.md`
  - `scholar/outputs/orchestrator_runs/questions_needed_<timestamp>.md`
- Post-run: appends preserved questions and refreshes `scholar/outputs/STATUS.md`.

### Multi-agent run (optional)
- Controlled by `scholar/inputs/audit_manifest.json` -> `multi_agent.enabled`.
- Uses agent prompts in `scholar/workflows/agents/`:
  - `telemetry_audit.md`, `sop_audit.md`, `pedagogy_questioner.md`, `research_scout.md`, `supervisor_synthesis.md`.
- Runs concurrent Codex jobs (bounded by `max_concurrency`), then synthesizes results into the run log.
- Injects telemetry snapshot context and latest `questions_resolved_*.md` into agent prompts.

### Question lifecycle
1. Orchestrator emits open questions to `questions_needed_<run>.md`.
2. Dashboard answers via:
   - `POST /api/scholar/questions` (bulk answers).
   - `POST /api/scholar/questions/answer` (single answer by index).
3. Answer endpoints update the `questions_needed_*.md` file and emit `questions_resolved_<timestamp>.md`.
4. Next run reads the latest `questions_resolved_*.md` and avoids re-asking answered items.

### Proposal lifecycle
1. Discover improvement candidates from reports/dossiers/gap analysis.
2. Draft RFC + experiment using `scholar/TEMPLATES/`.
3. Stage in `scholar/outputs/promotion_queue/` (ONE change, ONE variable).
4. Human review required; approved items can be moved to `scholar/outputs/proposals/` (manual step).

### Digests and storage
- Weekly digest trigger is defined in `scholar/workflows/orchestrator_run_prompt.md`.
- Dashboard endpoints:
  - `POST /api/scholar/digest` calls `generate_weekly_digest(days=7)` and assembles a markdown digest from recent outputs.
  - `POST /api/scholar/digest/save` writes to `scholar/outputs/digests/` and stores metadata in DB table `scholar_digests`.
  - `GET /api/scholar/digests`, `GET /api/scholar/digests/<id>`, `DELETE /api/scholar/digests/<id>` manage saved digests.

### Status and health signals
- `scripts/update_status.ps1` rolls up latest artifacts into `scholar/outputs/STATUS.md`.
- Dashboard reads `STATUS.md` to show alerts, coverage, questions pending, and next steps.

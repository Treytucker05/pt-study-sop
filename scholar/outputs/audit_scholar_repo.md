# Scholar System Audit - 2026-01-12

## Inventory

Facts from repo
- Governance
  - Charter: scholar/CHARTER.md
  - Quickstart: scholar/README.md
- Inputs
  - Allowlists and runtime config: scholar/inputs/audit_manifest.json
- Workflows
  - Core loop: scholar/workflows/orchestrator_loop.md
  - Unattended runbook: scholar/workflows/orchestrator_run_prompt.md
  - Session log audit: scholar/workflows/audit_session.md
  - Module audit: scholar/workflows/audit_module.md
  - Promotion pipeline: scholar/workflows/promotion_pipeline.md
  - System map: scholar/workflows/build_system_map.md
  - Gap analysis: scholar/workflows/run_gap_analysis.md
  - Weekly cycle: scholar/workflows/weekly_cycle.md
  - Agents: scholar/workflows/agents/pedagogy_questioner.md, scholar/workflows/agents/research_scout.md, scholar/workflows/agents/sop_audit.md, scholar/workflows/agents/supervisor_synthesis.md, scholar/workflows/agents/telemetry_audit.md
- Templates
  - scholar/TEMPLATES/audit_report.md
  - scholar/TEMPLATES/change_proposal.md
  - scholar/TEMPLATES/experiment_design.md
  - scholar/TEMPLATES/gap_analysis.md
  - scholar/TEMPLATES/module_dossier.md
  - scholar/TEMPLATES/patch_draft.md
  - scholar/TEMPLATES/research_note.md
  - scholar/TEMPLATES/system_map.md
- Launchers and status
  - Launcher: scripts/run_scholar.bat (references brain/dashboard/scholar.py)
  - Status update: scripts/update_status.ps1
  - Status snapshot: scholar/outputs/STATUS.md

Outputs (AI artifacts observed under scholar/outputs)
- Root
  - scholar/outputs/SCHOLAR_REVIEW_2026-01-09.md
  - scholar/outputs/STATUS.md
- digests
  - scholar/outputs/digests/strategic_digest_2026-01-10_185544.md
  - scholar/outputs/digests/strategic_digest_2026-01-10_190644.md
  - scholar/outputs/digests/strategic_digest_2026-01-10_200812.md
- gap_analysis
  - scholar/outputs/gap_analysis/gap_analysis_2026-01-07.md
  - scholar/outputs/gap_analysis/gap_analysis_missing_recent_session_logs_2026-01-10.md
  - scholar/outputs/gap_analysis/gap_analysis_missing_recent_session_logs_2026-01-10_190911.md
  - scholar/outputs/gap_analysis/gap_analysis_missing_recent_session_logs_2026-01-10_201637.md
- module_audits
  - scholar/outputs/module_audits/M0-M6-bridge_audit_2026-01-09.md
  - scholar/outputs/module_audits/M0-M6-bridge_audit_2026-01-10.md
  - scholar/outputs/module_audits/M0-M6-bridge_audit_2026-01-10_231749.md
  - scholar/outputs/module_audits/M0-M6-bridge_audit_2026-01-10_auto_3.md
  - scholar/outputs/module_audits/M0-M6-bridge_audit_2026-01-11.md
- module_dossiers
  - scholar/outputs/module_dossiers/M0-planning_dossier_2026-01-07.md
  - scholar/outputs/module_dossiers/M1-entry_dossier_2026-01-07.md
  - scholar/outputs/module_dossiers/M2-prime_dossier_2026-01-07.md
  - scholar/outputs/module_dossiers/M3-encode_dossier_2026-01-07.md
  - scholar/outputs/module_dossiers/M4-build_dossier_2026-01-07.md
  - scholar/outputs/module_dossiers/M5-modes_dossier_2026-01-07.md
  - scholar/outputs/module_dossiers/M6-wrap_dossier_2026-01-07.md
  - scholar/outputs/module_dossiers/anatomy-engine_dossier_2026-01-08.md
  - scholar/outputs/module_dossiers/brain-session-log-template_dossier_2026-01-07.md
  - scholar/outputs/module_dossiers/concept-engine_dossier_2026-01-09.md
  - scholar/outputs/module_dossiers/frameworks_levels_hmy_dossier_2026-01-09.md
  - scholar/outputs/module_dossiers/notebooklm-bridge_dossier_2026-01-07.md
  - scholar/outputs/module_dossiers/peirro-kwik_dossier_2026-01-09.md
  - scholar/outputs/module_dossiers/runtime-prompt_dossier_2026-01-07.md
- orchestrator_runs
  - scholar/outputs/orchestrator_runs/_preserved_questions_2026-01-10_001124.txt
  - scholar/outputs/orchestrator_runs/_preserved_questions_2026-01-10_003239.txt
  - scholar/outputs/orchestrator_runs/_preserved_questions_2026-01-10_165423.txt
  - scholar/outputs/orchestrator_runs/_preserved_questions_2026-01-10_181915.txt
  - scholar/outputs/orchestrator_runs/_preserved_questions_2026-01-10_190700.txt
  - scholar/outputs/orchestrator_runs/_preserved_questions_2026-01-10_201444.txt
  - scholar/outputs/orchestrator_runs/_preserved_questions_2026-01-11_155933.txt
  - scholar/outputs/orchestrator_runs/coverage_report_2026-01-07.md
  - scholar/outputs/orchestrator_runs/diagnostic_brief_2026-01-07_183027.md
  - scholar/outputs/orchestrator_runs/questions_backlog_2026-01-07.md
  - scholar/outputs/orchestrator_runs/questions_needed_2026-01-09.md
  - scholar/outputs/orchestrator_runs/questions_needed_2026-01-09_024155.md
  - scholar/outputs/orchestrator_runs/questions_needed_2026-01-09_024933.md
  - scholar/outputs/orchestrator_runs/questions_needed_2026-01-09_032259.md
  - scholar/outputs/orchestrator_runs/questions_needed_2026-01-09_032316.md
  - scholar/outputs/orchestrator_runs/questions_needed_2026-01-09_225619.md
  - scholar/outputs/orchestrator_runs/questions_needed_2026-01-10.md
  - scholar/outputs/orchestrator_runs/questions_needed_2026-01-10_003316.md
  - scholar/outputs/orchestrator_runs/questions_needed_2026-01-10_190911.md
  - scholar/outputs/orchestrator_runs/questions_needed_2026-01-10_231606.md
  - scholar/outputs/orchestrator_runs/questions_needed_2026-01-10_231749.md
  - scholar/outputs/orchestrator_runs/questions_needed_2026-01-11.md
  - scholar/outputs/orchestrator_runs/run_2026-01-07.md
  - scholar/outputs/orchestrator_runs/run_2026-01-07_M0-M6-bridge.md
  - scholar/outputs/orchestrator_runs/run_2026-01-07_example.md
  - scholar/outputs/orchestrator_runs/run_2026-01-08.md
  - scholar/outputs/orchestrator_runs/run_2026-01-09.md
  - scholar/outputs/orchestrator_runs/run_2026-01-10.md
  - scholar/outputs/orchestrator_runs/run_2026-01-11.md
  - scholar/outputs/orchestrator_runs/unattended_final_07-Wed-01_175409.md
  - scholar/outputs/orchestrator_runs/unattended_final_2026-01-07_190803.md
  - scholar/outputs/orchestrator_runs/unattended_final_2026-01-08_095705.md
  - scholar/outputs/orchestrator_runs/unattended_final_2026-01-09_024155.md
  - scholar/outputs/orchestrator_runs/unattended_final_2026-01-09_024846.md
  - scholar/outputs/orchestrator_runs/unattended_final_2026-01-09_032259.md
  - scholar/outputs/orchestrator_runs/unattended_final_2026-01-09_032316.md
  - scholar/outputs/orchestrator_runs/unattended_final_2026-01-09_033743.md
  - scholar/outputs/orchestrator_runs/unattended_final_2026-01-09_040513.md
  - scholar/outputs/orchestrator_runs/unattended_final_2026-01-09_040752.md
  - scholar/outputs/orchestrator_runs/unattended_final_2026-01-09_185053.md
  - scholar/outputs/orchestrator_runs/unattended_final_2026-01-09_215556.md
  - scholar/outputs/orchestrator_runs/unattended_final_2026-01-09_225349.md
  - scholar/outputs/orchestrator_runs/unattended_final_2026-01-10_001124.md
  - scholar/outputs/orchestrator_runs/unattended_final_2026-01-10_003239.md
  - scholar/outputs/orchestrator_runs/unattended_final_2026-01-10_181915.md
  - scholar/outputs/orchestrator_runs/unattended_final_2026-01-10_190700.md
  - scholar/outputs/orchestrator_runs/unattended_final_2026-01-10_201444.md
  - scholar/outputs/orchestrator_runs/unattended_final_2026-01-10_231606.md
  - scholar/outputs/orchestrator_runs/unattended_final_2026-01-11_155933.md
  - scholar/outputs/orchestrator_runs/verification_report_2026-01-08_100826.md
  - scholar/outputs/orchestrator_runs/what_to_review_2026-01-08_102203.md
- promotion_queue
  - scholar/outputs/promotion_queue/change_proposal_mastery_count_2026-01-07.md
  - scholar/outputs/promotion_queue/change_proposal_probe_first_2026-01-07.md
  - scholar/outputs/promotion_queue/change_proposal_semantic_kwik_2026-01-07.md
  - scholar/outputs/promotion_queue/experiment_mastery_count_2026-01-07.md
  - scholar/outputs/promotion_queue/experiment_probe_first_2026-01-07.md
  - scholar/outputs/promotion_queue/experiment_semantic_kwik_2026-01-07.md
- proposals
  - scholar/outputs/proposals/change_proposal_core_mode_probe_refine_lock_2026-01-07.md
  - scholar/outputs/proposals/experiment_core_mode_probe_refine_lock_2026-01-07.md
- reports
  - scholar/outputs/reports/audit_2025-12-11_geriatrics.md
  - scholar/outputs/reports/module_audit_M0-M6-bridge_2026-01-07.md
  - scholar/outputs/reports/module_audit_M2-prime_2026-01-07.md
  - scholar/outputs/reports/synthesis_recent_logs_2026-01-07.md
  - scholar/outputs/reports/weekly_digest_2026-01-09.md
  - scholar/outputs/reports/weekly_digest_2026-01-10.md
  - scholar/outputs/reports/weekly_digest_2026-01-11.md
- research_notebook
  - scholar/outputs/research_notebook/M0_research_2026-01-07_pretesting.md
  - scholar/outputs/research_notebook/M1_research_2026-01-07_sleepiness.md
  - scholar/outputs/research_notebook/M3_research_2026-01-07_dualcoding.md
  - scholar/outputs/research_notebook/M4_research_2026-01-07_cogload.md
  - scholar/outputs/research_notebook/M4_research_2026-01-07_successive_relearning.md
  - scholar/outputs/research_notebook/M6_research_2026-01-07_spacedrep.md
- system_map
  - scholar/outputs/system_map/coverage_checklist_2026-01-07.md
  - scholar/outputs/system_map/coverage_checklist_2026-01-08.md
  - scholar/outputs/system_map/coverage_checklist_2026-01-09.md
  - scholar/outputs/system_map/dossier_backlog_2026-01-07.md
  - scholar/outputs/system_map/glossary_2026-01-07.md
  - scholar/outputs/system_map/repo_index_2026-01-07.md
  - scholar/outputs/system_map/repo_index_2026-01-08.md
  - scholar/outputs/system_map/repo_index_2026-01-09.md
  - scholar/outputs/system_map/system_map_2026-01-07.md

AI artifact checklist (available vs missing in scholar/outputs)
- [x] Reports (scholar/outputs/reports)
- [x] Digests (scholar/outputs/digests)
- [x] Orchestrator runs (scholar/outputs/orchestrator_runs)
- [x] Research notebook (scholar/outputs/research_notebook)
- [x] Promotion queue (scholar/outputs/promotion_queue)
- [x] System map (scholar/outputs/system_map)
- [x] Module dossiers (scholar/outputs/module_dossiers)
- [x] Module audits (scholar/outputs/module_audits)
- [x] Gap analysis (scholar/outputs/gap_analysis)
- [x] Proposals (scholar/outputs/proposals)
- [ ] Missing artifacts observed: none in current inventory

## Connections Map

Facts from repo
- Inputs are allowlisted in scholar/inputs/audit_manifest.json and referenced by audit workflows (scholar/workflows/audit_session.md, scholar/workflows/audit_module.md).
- Orchestrator runs are driven by scholar/workflows/orchestrator_run_prompt.md and recorded in scholar/outputs/orchestrator_runs (see run_2026-01-11.md).
- The launcher script scripts/run_scholar.bat calls codex exec with scholar/workflows/orchestrator_run_prompt.md and updates scholar/outputs/STATUS.md via scripts/update_status.ps1.
- Findings move into proposals via scholar/workflows/promotion_pipeline.md and templates under scholar/TEMPLATES/.

## Expected Behavior (with source file paths)

Facts from repo
- Scholar is a read-only auditor for sop/, brain/, dist/ and writes only under scholar/outputs (scholar/CHARTER.md; scholar/workflows/orchestrator_run_prompt.md).
- Output lanes are defined as research_notebook, promotion_queue, system_map, module_dossiers, and reports (scholar/README.md; scholar/CHARTER.md).
- Session log audits produce reports in scholar/outputs/reports and require allowlisted brain paths (scholar/workflows/audit_session.md; scholar/inputs/audit_manifest.json).
- Module audits produce reports in scholar/outputs/reports and require allowlisted tutor paths (scholar/workflows/audit_module.md; scholar/inputs/audit_manifest.json).
- Orchestrator loop runs phases Review -> Understand -> Question -> Research -> Synthesize -> Draft -> Wait and stops when questions are answered or timeouts occur (scholar/workflows/orchestrator_loop.md).
- Promotion pipeline produces one-change RFCs and one-variable experiments in scholar/outputs/promotion_queue (scholar/workflows/promotion_pipeline.md; scholar/TEMPLATES/change_proposal.md; scholar/TEMPLATES/experiment_design.md).

## Actual Behavior (with source file paths)

Facts from repo
- STATUS.md tracks latest run artifacts, coverage checklist counts, and safe_mode state (scholar/outputs/STATUS.md).
- Unattended orchestrator runs produce run logs, questions_needed, and unattended_final receipts (scholar/outputs/orchestrator_runs/run_2026-01-11.md; scholar/outputs/orchestrator_runs/questions_needed_2026-01-11.md).
- Weekly digests are produced when the weekly trigger fires (scholar/outputs/orchestrator_runs/run_2026-01-11.md; scholar/outputs/reports/weekly_digest_2026-01-11.md).
- Module audits are emitted under scholar/outputs/module_audits (scholar/outputs/module_audits/M0-M6-bridge_audit_2026-01-11.md).
- Module dossiers are maintained for M0-M6 and engines/frameworks (scholar/outputs/module_dossiers/M0-planning_dossier_2026-01-07.md; scholar/outputs/module_dossiers/peirro-kwik_dossier_2026-01-09.md).
- Gap analyses and missing-logs audits are recorded under scholar/outputs/gap_analysis (scholar/outputs/gap_analysis/gap_analysis_2026-01-07.md; scholar/outputs/gap_analysis/gap_analysis_missing_recent_session_logs_2026-01-10.md).
- Research notebook entries cite learning science sources and relate to module behaviors (scholar/outputs/research_notebook/M4_research_2026-01-07_successive_relearning.md).
- Promotion queue contains RFCs and experiments (scholar/outputs/promotion_queue/change_proposal_mastery_count_2026-01-07.md; scholar/outputs/promotion_queue/experiment_mastery_count_2026-01-07.md).
- Strategic digests exist under scholar/outputs/digests and synthesize system status (scholar/outputs/digests/strategic_digest_2026-01-10_185544.md).
- System map artifacts define the tutor architecture and coverage status (scholar/outputs/system_map/system_map_2026-01-07.md; scholar/outputs/system_map/coverage_checklist_2026-01-09.md).

## Gaps & Risks

Facts from repo
- Output contract in the Charter limits outputs to reports/proposals, but actual outputs include module_audits, gap_analysis, digests, orchestrator_runs, and system_map (scholar/CHARTER.md vs scholar/outputs/*). This is a documentation and governance mismatch.
- README Output Lanes omit module_audits, gap_analysis, digests, and orchestrator_runs despite active use (scholar/README.md vs scholar/outputs/*).
- The launcher uses codex exec with a dangerously bypass flag (scripts/run_scholar.bat), which increases operational risk if used outside a controlled environment.
- STATUS.md embeds absolute Windows paths, which can reduce portability and cross-platform clarity (scholar/outputs/STATUS.md).

Assumptions (UNCONFIRMED)
- The strategic digests reference external sources, implying the orchestrator may be using web search in practice even when safe_mode is false (scholar/outputs/digests/strategic_digest_2026-01-10_185544.md).

Recommendations
- Update Scholar documentation to reflect actual output lanes and governance (scholar/CHARTER.md, scholar/README.md).
- Add a brief note about execution environment and codex dependency in Scholar docs (scholar/README.md).
- Consider normalizing STATUS.md paths to repo-relative paths for portability (scholar/outputs/STATUS.md).

Risk table
| Gap | Evidence | Risk | Confidence |
| --- | --- | --- | --- |
| Charter output contract does not match output lanes | scholar/CHARTER.md vs scholar/outputs/* | Governance drift; reviewer confusion | High |
| README output lanes incomplete | scholar/README.md vs scholar/outputs/* | Onboarding gaps; missing artifacts | High |
| Launcher uses dangerously bypass | scripts/run_scholar.bat | Accidental unsafe runs | Med |
| STATUS.md uses absolute paths | scholar/outputs/STATUS.md | Portability friction | Low |

## Open Questions

Facts from repo
- Should audits use fallback samples when the 7-day window is empty (scholar/outputs/orchestrator_runs/questions_needed_2026-01-11.md)?
- Should pre-probe be required even with zero prior exposure (scholar/outputs/orchestrator_runs/questions_needed_2026-01-11.md)?
- Should ingest reject template-only logs (scholar/outputs/orchestrator_runs/questions_needed_2026-01-11.md)?
- Is gpt-instructions coverage truly in progress or missing a dossier (scholar/outputs/SCHOLAR_REVIEW_2026-01-09.md)?
- Is codex execution context documented clearly enough for first-time setup (scholar/outputs/SCHOLAR_REVIEW_2026-01-09.md)?

## Additional Changes

- This report was added as scholar/outputs/audit_scholar_repo.md.
- Updated AGENTS.md to note Scholar output lanes and organization conventions.
- Updated scripts/ralph/progress.txt and scripts/ralph/prd.json with US-001 status and learnings.
- No changes were made to sop/, brain/, or dist/.

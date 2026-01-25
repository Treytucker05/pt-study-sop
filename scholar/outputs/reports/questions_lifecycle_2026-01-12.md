# Questions Lifecycle (2026-01-12)

Purpose: Map how Scholar questions are generated, stored, answered, and reused in the loop.

## Generation
- Questions are generated during orchestrator runs when audits or synthesis uncover unknowns, and the runbook instructs writing them to questions_needed files (`scholar/workflows/orchestrator_run_prompt.md`).
- The loop defines a distinct Question phase that feeds Research and Synthesize (`scholar/workflows/orchestrator_loop.md`).
- Recent runs explicitly created questions files during execution (`scholar/outputs/orchestrator_runs/run_2026-01-12.md`).
- System map calls out a human hand-off for questions to answer (`scholar/outputs/system_map/scholar_system_map_2026-01-12.md`).

## Storage
- Primary storage: `scholar/outputs/orchestrator_runs/questions_needed_*.md` (examples: `scholar/outputs/orchestrator_runs/questions_needed_2026-01-12.md`, `scholar/outputs/orchestrator_runs/questions_needed_2026-01-10_231749.md`).
- Preservation list: `scholar/outputs/orchestrator_runs/_preserved_questions_*.txt` (example: `scholar/outputs/orchestrator_runs/_preserved_questions_2026-01-12_032740.txt`).
- Backlog file: `scholar/outputs/orchestrator_runs/questions_backlog_2026-01-07.md`.
- Reported open questions list: `scholar/outputs/reports/scholar_open_questions_2026-01-12.md`.
- Status index points to the latest questions file: `scholar/outputs/STATUS.md`.

## Answering Flow
- Unattended finals and STATUS instruct humans to resolve questions in the latest questions_needed file (`scholar/outputs/orchestrator_runs/unattended_final_2026-01-12_032740.md`, `scholar/outputs/STATUS.md`).
- Questions can be tracked with inline answers or pending notes (`scholar/outputs/orchestrator_runs/questions_needed_2026-01-10_231749.md`).
- Backlog entries track active vs answered questions and citations (`scholar/outputs/orchestrator_runs/questions_backlog_2026-01-07.md`).
- The loop halts when questions are answered and then proceeds into Research/Synthesize (`scholar/workflows/orchestrator_loop.md`).

## Downstream Usage
- Loop contract states questions drive the Question and Research phases and feed downstream artifacts (`scholar/outputs/reports/scholar_loop_contract_2026-01-12.md`).
- Run logs and unattended finals point reviewers to the questions file as the next action (`scholar/outputs/orchestrator_runs/run_2026-01-12.md`, `scholar/outputs/orchestrator_runs/unattended_final_2026-01-12_032740.md`).
- System map and STATUS surface the latest questions for decision-making (`scholar/outputs/system_map/scholar_system_map_2026-01-12.md`, `scholar/outputs/STATUS.md`).
- Digests track unanswered question counts and blockers at the summary level (`scholar/outputs/digests/strategic_digest_2026-01-10_185544.md`).
- Research notes and proposals are the expected downstream artifacts once questions are resolved (`scholar/workflows/orchestrator_run_prompt.md`), with current examples in `scholar/outputs/research_notebook/M4_research_2026-01-07_successive_relearning.md` and `scholar/outputs/promotion_queue/change_proposal_mastery_count_2026-01-07.md`.

## Gaps/Disconnects
Facts from repo
- The runbook only names questions_needed outputs, while backlog and preserved question files exist without explicit mention in the runbook or STATUS (`scholar/workflows/orchestrator_run_prompt.md`, `scholar/outputs/STATUS.md`).
- `scholar_open_questions_2026-01-12.md` exists as a report but is not referenced in STATUS or the runbook (`scholar/outputs/reports/scholar_open_questions_2026-01-12.md`, `scholar/workflows/orchestrator_run_prompt.md`).
- Question storage is spread across multiple formats (questions_needed, preserved_questions, backlog, report) without a single canonical index.

Assumptions (UNCONFIRMED)
- There is no automated reconciliation between questions_needed files and questions_backlog.
- Downstream artifacts (gap analyses, proposals) are not consistently linked to specific question IDs.

Recommendations
- Add a canonical questions index (repo-relative paths, resolution state) that references questions_needed, backlog, and preserved questions; link it from STATUS and the runbook.
- Decide whether `scholar_open_questions_*.md` is redundant or should be promoted to the canonical index.
- Document how preserved questions should be merged back into active queues.

## Coverage Note
- Artifacts used (all lanes): `scholar/outputs/system_map/scholar_inventory_2026-01-12.md` (full inventory), `scholar/outputs/system_map/scholar_system_map_2026-01-12.md`, `scholar/outputs/reports/scholar_loop_contract_2026-01-12.md`, `scholar/outputs/reports/scholar_open_questions_2026-01-12.md`, `scholar/outputs/reports/scholar_working_status_2026-01-12.md`, `scholar/outputs/digests/strategic_digest_2026-01-10_185544.md`, `scholar/outputs/orchestrator_runs/run_2026-01-12.md`, `scholar/outputs/orchestrator_runs/questions_needed_2026-01-12.md`, `scholar/outputs/orchestrator_runs/_preserved_questions_2026-01-12_032740.txt`, `scholar/outputs/orchestrator_runs/questions_backlog_2026-01-07.md`, `scholar/outputs/research_notebook/M4_research_2026-01-07_successive_relearning.md`, `scholar/outputs/module_audits/M0-M6-bridge_audit_2026-01-12.md`, `scholar/outputs/module_dossiers/M0-planning_dossier_2026-01-07.md`, `scholar/outputs/gap_analysis/gap_analysis_2026-01-07.md`, `scholar/outputs/promotion_queue/change_proposal_mastery_count_2026-01-07.md`, `scholar/outputs/STATUS.md`.
- Gaps: none in output lane coverage per `scholar/outputs/system_map/scholar_inventory_2026-01-12.md`; lifecycle gaps listed above.

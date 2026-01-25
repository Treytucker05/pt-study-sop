# Gaps and Improvement Candidates Lifecycle (2026-01-12)

## Gap Identification
- Gaps are recorded in `scholar/outputs/gap_analysis/*.md` during audits and synthesis (e.g., Tutor system gaps and telemetry gaps).
- System health reports include an "Under Development" subsection per system that captures weaknesses and gaps.
- The orchestrator runbook directs audits to produce gap analyses when needed.

Evidence
- `scholar/outputs/gap_analysis/gap_analysis_2026-01-07.md`
- `scholar/outputs/gap_analysis/gap_analysis_missing_recent_session_logs_2026-01-10.md`
- `scholar/outputs/reports/system_health_2026-01-12.md`
- `scholar/workflows/orchestrator_run_prompt.md`

## Candidate Drafting
- Module dossiers include an "Improvement Candidates" section, which turns audit observations into candidate changes.
- Gap analyses include "Promotion Candidates" which are small, proposal-ready changes.
- Draft proposals live in `scholar/outputs/promotion_queue/` for manual approval.

Evidence
- `scholar/outputs/module_dossiers/M0-planning_dossier_2026-01-07.md`
- `scholar/outputs/gap_analysis/gap_analysis_2026-01-07.md`
- `scholar/outputs/promotion_queue/`

## Prioritization
- There is no centralized priority score; prioritization is currently manual via digests and plan updates.
- Digest save flow extracts "Priority Actions" and writes a plan update draft for review.
- Proposal queue requires manual review and approval before implementation.

Evidence
- `brain/dashboard/routes.py` (digest save -> plan_updates and proposal_seeds)
- `scholar/outputs/digests/strategic_digest_2026-01-10_185544.md`
- `scholar/outputs/promotion_queue/`

## Usage
- Gap analysis items feed the weekly digest as "Topics to Review".
- Improvement candidates from module dossiers are surfaced as "Action Items" in the weekly digest.
- Plan updates and proposal seeds are generated from saved digests to drive next-step planning.

Evidence
- `brain/dashboard/scholar.py` (generate_weekly_digest uses gap_analysis + module_dossiers)
- `brain/dashboard/routes.py` (save digest -> plan_update + proposal_seeds)
- `scholar/outputs/reports/scholar_loop_contract_2026-01-12.md`

## Current Disconnects (Observed)
- Gap and candidate artifacts are not automatically merged into a single prioritized backlog; this is manual.
- Plan updates are drafts and are not automatically applied to SOP files.

# Health and Research in the Loop (2026-01-12)

## How System Health Feeds the Loop
- System health reports summarize each system with strengths, traits, gaps, and planned improvements.
- These summaries are meant to surface weaknesses that become questions and gap analyses in the next run.

Evidence
- `scholar/outputs/reports/system_health_2026-01-12.md`
- `scholar/outputs/reports/system_health_schema_2026-01-12.md`

## How Research Feeds the Loop
- Research notes live in `scholar/outputs/research_notebook/` and capture findings to validate or adjust SOP design.
- The weekly digest incorporates research findings into its "Key Findings" section.

Evidence
- `scholar/outputs/research_notebook/M4_research_2026-01-07_successive_relearning.md`
- `brain/dashboard/scholar.py` (generate_weekly_digest -> research findings)

## Question Generation from Health + Research
- The orchestrator runbook requires questions to be logged when gaps or unknowns are found, and mandates research before answering.
- Answered questions are written into `questions_answered_<run>.md` with evidence.

Evidence
- `scholar/workflows/orchestrator_run_prompt.md`
- `scholar/workflows/orchestrator_loop.md`
- `scholar/outputs/reports/questions_lifecycle_2026-01-12.md`

## How Health + Research Feed Plans
- Saved digests generate plan update drafts and proposal seeds, which are intended to drive SOP updates.
- This creates a path from health/research insights -> questions -> digest -> plan_update.

Evidence
- `brain/dashboard/routes.py` (digest save -> plan_updates + proposal_seeds)
- `scholar/outputs/reports/scholar_loop_contract_2026-01-12.md`

## Current Gaps
- Health and research insights are not automatically applied to SOP files; they require manual plan edits.
- There is no single "health-to-plan" index; evidence is distributed across multiple reports.

# Scholar Upgrade Plan

## Inputs
- Latest system health report and schema
- Latest gap analyses and risks
- Latest digests and plan updates
- Proposal queue (draft + approved)
- Research notebook findings
- Questions (needed/resolved/answered)

Evidence
- `scholar/outputs/reports/system_health_2026-01-12.md`
- `scholar/outputs/gap_analysis/`
- `scholar/outputs/digests/`
- `scholar/outputs/proposal_seeds/`
- `scholar/outputs/promotion_queue/`
- `scholar/outputs/research_notebook/`
- `scholar/outputs/orchestrator_runs/questions_needed_*.md`

## Current State
The Scholar loop can generate audits, research notes, digests, and proposals, but several steps still require manual intervention (digest save, plan edits, proposal approval, and SOP updates). The data loop exists but relies on human-in-the-loop steps to apply improvements.

## System Summaries

### Brain
Summary: Stores study session data and telemetry; ingestion is manual via session log files and the ingest script.
Traits
- SQLite-backed storage (`brain/data/pt_study.db`)
- Session log ingestion pipeline
- Dashboard APIs expose stats and Scholar tools
Under Development
- Automate ingestion and data freshness checks
Planned Improvements
- Add automated ingest trigger and freshness warnings (IC-03, IC-04)

### Tutor
Summary: SOP canon and modules define the study workflow; outputs are captured in session logs.
Traits
- M0-M6 module sequence
- Framework and engine usage in session logs
- Core learning modules (PERRO, KWIK)
Under Development
- Mastery tracking across sessions
- Interleaved planning enforcement
Planned Improvements
- Add mastery counter and interleaving checks (IC-01, IC-02)

### Scholar
Summary: Runs audits, research, and synthesis to produce reports, gaps, and proposals.
Traits
- Orchestrator runbook phases
- Output lanes (reports, digests, gap analysis, proposals)
- Multi-agent option
Under Development
- Documentation alignment and completeness validation
Planned Improvements
- Align output lane docs; add validation checklist (IC-05, IC-07)

### Dashboard/Loop
Summary: Dashboard triggers runs, saves digests, and displays status and artifacts.
Traits
- Digest generation and save endpoints
- Proposal approval pipeline
- Status aggregation
Under Development
- Digest save required to generate plan updates
Planned Improvements
- Auto-save or enforce save step after digest generation (IC-06)

### Telemetry/Data
Summary: Aggregates session data and logs for analysis and audit.
Traits
- Session logs + DB tables
- Trend dashboards
Under Development
- Data freshness thresholds
Planned Improvements
- Add freshness checks to reports and digests (IC-04)

## Under Development (Cross-System)
- Ensure gap analyses and health reports flow directly into a prioritized backlog.
- Ensure plan updates are applied to SOP canon (human-in-the-loop today).

## Planned Improvements (with rationale)
- IC-01 and IC-02 improve retention and transfer by enforcing proven pedagogy.
- IC-03 and IC-04 improve audit reliability by ensuring fresh data and visible warnings.
- IC-05 and IC-07 improve governance and make audits consistent across runs.
- IC-06 ensures digests produce actionable plan updates every time.

## Proposal Queue
- Draft proposals live in `scholar/outputs/promotion_queue/`.
- Approved/rejected proposals are tracked in `brain/data/pt_study.db`.

## Open Questions
- See latest `scholar/outputs/orchestrator_runs/questions_needed_*.md` and `questions_answered_*.md`.

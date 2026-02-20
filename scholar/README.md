# The Scholar — Quickstart

The Scholar is a dedicated meta-system designed to audit, analyze, and optimize the Tutor production system in the CP-MSS v1.0 era. It operates independently from student sessions and focuses exclusively on pedagogical science and system reliability.
Canonical tutor/runtime stage model: `PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`.

## What The Scholar IS NOT

- **NOT a Tutor:** Does not teach PT content or interact with students.
- **NOT a Proctor:** Does not answer factual anatomy/ROM questions.
- **NOT a Producer:** Does not modify production files in `sop/`, `brain/`, or `dist/` unless explicitly approved after review.


## Required Inputs

- **Telemetry:** Brain session logs (`brain/session_logs/*.md`).
- **Source (Canonical):** SOP library files in `sop/library/` plus `sop/sop_index.v1.json` (file map).
- **Source (Exports):** `sop/runtime/knowledge_upload/*.md` and `sop/runtime/runtime_prompt.md` as generated copies.
- **AI Artifacts Manifest:** `scholar/inputs/ai_artifacts_manifest.json` (output lanes + file patterns for summaries, questions, recommendations).

*Note: All paths must be explicitly listed in [audit_manifest.json](inputs/audit_manifest.json).*

## Running the Scholar

Use the included launcher script:

```powershell
scripts/run_scholar.bat
```

This interactive tool provides a menu to:

1. **Interactive Audit**: Start a conversational session with the Scholar to audit a log or module.
2. **Execute Orchestrator**: Run the autonomous orchestrator loop (safe mode or full).
3. **Module Audit**: specialized flow for auditing SOP modules.

Safe mode is controlled by `scholar/inputs/audit_manifest.json`:
- `safe_mode: false` = proposals allowed, but no patch drafts
- `safe_mode: true` = proposals allowed + patch drafts permitted

## Standard Workflows

1. **[Brain Telemetry Review](workflows/audit_session.md):** Analyze session logs for learning effectiveness and friction.
2. **[System Review](workflows/audit_module.md):** Evaluate SOP files for operational clarity and pedagogical alignment.
3. **[Orchestrator Run](workflows/orchestrator_loop.md):** Full pipeline from review → plan → research → proposals → review summary → digest.


## Output Lanes


- **Review:** `scholar/outputs/review/` (Run summary with top findings + next actions).
- **Questions Dashboard:** `scholar/outputs/questions_dashboard.md` (Unanswered questions for human review).
- **Digests:** `scholar/outputs/digests/` (Run-level thematic clustering + major proposal summary).
- **Research Notebook:** `scholar/outputs/research_notebook/` (Unbounded investigation).
- **Promotion Queue:** `scholar/outputs/promotion_queue/` (Bounded, testable RFCs).
- **System Map:** `scholar/outputs/system_map/` (System architecture).
- **Module Dossiers:** `scholar/outputs/module_dossiers/` (Deep-dives).
- **Module Audits:** `scholar/outputs/module_audits/` (Focused module audits).
- **Gap Analysis:** `scholar/outputs/gap_analysis/` (Coverage gaps and risks).
- **Implementation Bundles:** `scholar/outputs/implementation_bundles/` (Post-approval change + verification notes).
- **Reports:** `scholar/outputs/reports/` (Routine audits).
- **Plan Updates:** `scholar/outputs/plan_updates/` (Every run plan).
- **Orchestrator Runs:** `scholar/outputs/orchestrator_runs/` (Run logs + questions).
- **Proposal Seeds:** `scholar/outputs/proposal_seeds/` (Idea staging).
- **Proposals:** `scholar/outputs/proposals/` (Approved/Rejected buckets).


## Creating Improvements

When an audit reveals a needed change, use these canonical templates:

- **[Change Proposal](TEMPLATES/change_proposal.md):** Draft a bounded, testable modification (Place in Promotion Queue).
- **[Experiment Design](TEMPLATES/experiment_design.md):** Design a validation experiment (Place in Promotion Queue).
- **[Module Dossier](TEMPLATES/module_dossier.md):** Conduct a deep-dive audit.
- **[System Map](TEMPLATES/system_map.md):** Update the system model.

### Core Rules

1. **ONE-change-only:** Every proposal and experiment must target exactly one variable.
2. **Human Review Required:** No change is promoted to production without manual architect approval.
3. **Evidence-First:** Proposals must cite logs or learning science.
4. **Review Summary Required:** Every orchestrator run outputs a review summary.
5. **Questions Dashboard Required:** All open questions get appended to the dashboard.


---

## First Run Examples

### Audit a Session Log

1. Select a log from `brain/session_logs/`.
2. Follow [audit_session.md](workflows/audit_session.md).
3. Name your report: `outputs/reports/audit_2026-01-07_anatomy.md`.

### Audit a Module

1. Select a module (e.g., `sop/library/05-session-flow.md`).
2. Follow [audit_module.md](workflows/audit_module.md).
3. Name your report: `outputs/reports/module_audit_M0_2026-01-07.md`.

### Run the Orchestrator

1. Run `scripts/run_scholar.bat` and choose Orchestrator.
2. Produce a plan update in `outputs/plan_updates/`.
3. Produce a review summary in `outputs/review/`.
4. Append questions to `outputs/questions_dashboard.md`.
5. Draft proposals in `outputs/promotion_queue/` when needed.

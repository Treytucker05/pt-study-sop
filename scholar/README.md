# The Scholar — Quickstart

The Scholar is the research partner in Trey’s Study System. It investigates how the learner appears to learn best, asks focused questions when needed, performs cited research, and proposes bounded improvements without taking over live teaching.

It operates against the active **CP-MSS / Control Plane** contract rather than inventing its own teaching model.

Canonical Tutor/runtime stage model: `PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`.

## What The Scholar Is Not

- **Not a Tutor:** does not teach PT content or replace Tutor during live instruction.
- **Not a generic chatbot:** it should stay inside investigations, findings, questions, and bounded proposals.
- **Not a Proctor:** it does not answer factual anatomy/ROM/pathology questions in place of Tutor.
- **Not a Producer:** it does not modify production files in `sop/`, `brain/`, or `dist/` unless explicitly approved after review.

## Required Inputs

- **Brain evidence:** session logs, learner-profile signals, and related telemetry.
- **Learner answers:** direct answers to Scholar questions when an investigation needs calibration.
- **Instruction Canon (Primary):** `sop/runtime/runtime_prompt.md` plus `sop/runtime/knowledge_upload/*.md`.
- **Chain/Control Canon (Primary):** `sop/library/17-control-plane.md` plus `sop/library/chains/*.yaml`.
- **Runtime Enforcement (Primary):** Tutor runtime files such as `brain/tutor_chains.py` and `brain/dashboard/api_tutor.py`.
- **Planning Canon (Primary):** `docs/root/TUTOR_TODO.md` and related Tutor root docs.
- **Reference Corpus (Secondary):** broader `sop/library/` plus `sop/sop_index.v1.json` as supporting context.
- **AI Artifacts Manifest:** `scholar/inputs/ai_artifacts_manifest.json` (output lanes plus file patterns for summaries, questions, and recommendations).
- **External sources:** cited web sources collected through approved research flows.

Note: all paths must be explicitly listed in [audit_manifest.json](inputs/audit_manifest.json). Scholar should prioritize instruction/chain/control paths over legacy SOP prose when conflicts appear.

## Running The Scholar

Use the included launcher script:

```powershell
scripts/run_scholar.bat
```

This interactive tool provides a menu to:

1. **Interactive Investigation:** start a conversational research session with Scholar to audit a log, investigate learner fit, or explore a system question.
2. **Execute Orchestrator:** run the autonomous orchestrator loop (safe mode or full).
3. **Module Audit:** use the specialized flow for auditing SOP modules.

Safe mode is controlled by `scholar/inputs/audit_manifest.json`:

- `safe_mode: false` = proposals allowed, but no patch drafts
- `safe_mode: true` = proposals allowed plus patch drafts permitted

## Standard Workflows

1. **[Brain Telemetry Review](workflows/audit_session.md):** analyze session logs for learning effectiveness and friction.
2. **[System Review](workflows/audit_module.md):** evaluate instruction packs, chain contracts, and runtime enforcement for operational clarity and pedagogical alignment.
3. **[Orchestrator Run](workflows/orchestrator_loop.md):** full pipeline from review -> question -> research -> proposals -> review summary -> digest.

## Output Lanes

- **Review:** `scholar/outputs/review/` (run summary with top findings plus next actions).
- **Questions Dashboard:** `scholar/outputs/questions_dashboard.md` (unanswered questions for human or learner review).
- **Digests:** `scholar/outputs/digests/` (run-level thematic clustering plus major proposal summary).
- **Research Notebook:** `scholar/outputs/research_notebook/` (unbounded investigation).
- **Promotion Queue:** `scholar/outputs/promotion_queue/` (bounded, testable RFCs).
- **System Map:** `scholar/outputs/system_map/` (system architecture).
- **Module Dossiers:** `scholar/outputs/module_dossiers/` (deep-dives).
- **Module Audits:** `scholar/outputs/module_audits/` (focused module audits).
- **Gap Analysis:** `scholar/outputs/gap_analysis/` (coverage gaps and risks).
- **Implementation Bundles:** `scholar/outputs/implementation_bundles/` (post-approval change plus verification notes).
- **Reports:** `scholar/outputs/reports/` (routine audits).
- **Plan Updates:** `scholar/outputs/plan_updates/` (every run plan).
- **Orchestrator Runs:** `scholar/outputs/orchestrator_runs/` (run logs plus questions).
- **Proposal Seeds:** `scholar/outputs/proposal_seeds/` (idea staging).
- **Proposals:** `scholar/outputs/proposals/` (approved/rejected buckets).

## Creating Improvements

When an audit reveals a needed change, use these canonical templates:

- **[Change Proposal](TEMPLATES/change_proposal.md):** draft a bounded, testable modification.
- **[Experiment Design](TEMPLATES/experiment_design.md):** design a validation experiment.
- **[Module Dossier](TEMPLATES/module_dossier.md):** conduct a deep-dive audit.
- **[System Map](TEMPLATES/system_map.md):** update the system model.

### Core Rules

1. **One-change-only:** every proposal and experiment must target exactly one variable.
2. **Human Review Required:** no change is promoted to production without manual architect approval.
3. **Evidence-First:** proposals must cite logs or learning science.
4. **Question-aware:** if a key uncertainty blocks the investigation, Scholar should ask a focused question instead of pretending certainty.
5. **Citations required for web research:** findings from outside the repo must preserve source traceability.
6. **Review Summary Required:** every orchestrator run outputs a review summary.
7. **Questions Dashboard Required:** all open questions get appended to the dashboard.

---

## First Run Examples

### Investigate a Session Log

1. Select a log from `brain/session_logs/`.
2. Follow [audit_session.md](workflows/audit_session.md).
3. Name your report: `outputs/reports/audit_2026-01-07_anatomy.md`.

### Audit a Module

1. Select a module such as `sop/library/05-session-flow.md`.
2. Follow [audit_module.md](workflows/audit_module.md).
3. Name your report: `outputs/reports/module_audit_M0_2026-01-07.md`.

### Run the Orchestrator

1. Run `scripts/run_scholar.bat` and choose Orchestrator.
2. Produce a plan update in `outputs/plan_updates/`.
3. Produce a review summary in `outputs/review/`.
4. Append questions to `outputs/questions_dashboard.md` when the run needs learner or architect answers.
5. Draft proposals in `outputs/promotion_queue/` when needed.
6. Preserve cited findings in the appropriate output lane when the run included web research.

# Scholar Orchestrator Proposal Seed Pack (2026-01-12)

- Author: The Scholar
- Status: Draft
- Approval Required: YES
- Target System: Scholar Orchestrator (v9.2 meta-system)
- Scope: Orchestrator loop governance (one change per proposal)

## Proposal SO-01: Enforce plan_update creation for every run
- Summary: Require a plan update artifact before a run can be marked complete.
- Observed problem: The runbook requires plan updates, but recent runs omit `scholar/outputs/plan_updates/` artifacts and do not cite plan updates in run logs.
- Proposed change (ONE change only):
  - Add a run-completion checklist step that verifies `scholar/outputs/plan_updates/plan_update_<run>.md` exists and is listed in the run log before completion.
- Rationale (sources): Control-loop governance depends on explicit state planning and persistence; missing plan updates weakens traceability and coordination ([C1]).
- Evidence paths:
  - `scholar/workflows/orchestrator_run_prompt.md`
  - `scholar/workflows/orchestrator_loop.md`
  - `scholar/outputs/orchestrator_runs/run_2026-01-12.md`
  - `scholar/outputs/system_map/scholar_inventory_2026-01-12.md`
  - `scholar/outputs/reports/scholar_orchestrator_audit_2026-01-12.md`
- Acceptance criteria:
  - Each run includes a `plan_updates/plan_update_<run>.md` artifact.
  - The run log explicitly references the plan update path.
- Risks/guardrails:
  - Risk: Adds overhead to unattended runs.
  - Guardrail: Allow a short, structured plan update template (5 bullets max).
- Required changes (paths):
  - `scripts/run_scholar.bat`

## Proposal SO-02: Gate runs on questions_answered + research notes when questions exist
- Summary: Make question resolution and research notes mandatory before run completion.
- Observed problem: Runs emit `questions_needed` files without corresponding `questions_answered` or research notes, breaking the Question -> Research dependency.
- Proposed change (ONE change only):
  - Update the runbook to block completion unless `questions_answered_<run>.md` and a related research note exist whenever questions are raised.
- Rationale (sources): Coordination research stresses explicit dependency management and hand-offs in multi-actor workflows; unanswered questions degrade shared context ([C2], [C3]).
- Evidence paths:
  - `scholar/workflows/orchestrator_run_prompt.md`
  - `scholar/outputs/orchestrator_runs/run_2026-01-12.md`
  - `scholar/outputs/orchestrator_runs/questions_needed_2026-01-12.md`
  - `scholar/outputs/STATUS.md`
  - `scholar/outputs/reports/questions_lifecycle_2026-01-12.md`
  - `scholar/outputs/reports/scholar_orchestrator_audit_2026-01-12.md`
- Acceptance criteria:
  - If questions are raised, a matching `questions_answered_<run>.md` exists with evidence links.
  - A research notebook note is created for each answered question set.
- Risks/guardrails:
  - Risk: Longer unattended runs when questions arise.
  - Guardrail: Permit marking a run BLOCKED with explicit owner assignment if research cannot be completed.
- Required changes (paths):
  - `scholar/workflows/orchestrator_run_prompt.md`

## Proposal SO-03: Align safe_mode semantics across docs and health checks
- Summary: Define a single, canonical safe_mode behavior and reference it everywhere.
- Observed problem: README, run launcher, and health check documentation disagree on what safe_mode permits, creating ambiguous human control points.
- Proposed change (ONE change only):
  - Update all safe_mode documentation to match a single definition anchored in `scholar/inputs/audit_manifest.json` (e.g., safe_mode=false allows promotion_queue outputs but no patch drafts; safe_mode=true allows patch drafts).
- Rationale (sources): Mixed-initiative systems require transparent control points and consistent operator expectations; conflicting definitions erode trust ([C5], [C6]).
- Evidence paths:
  - `scholar/README.md`
  - `scripts/run_scholar.bat`
  - `scholar/outputs/reports/scholar_health_check_2026-01-12.md`
  - `scholar/inputs/audit_manifest.json`
  - `scholar/outputs/reports/scholar_orchestrator_audit_2026-01-12.md`
- Acceptance criteria:
  - All safe_mode references match the same behavior definition.
  - The health check output reflects the canonical safe_mode semantics.
- Risks/guardrails:
  - Risk: Changes operator expectations mid-run.
  - Guardrail: Add a one-line safe_mode definition to run receipts and STATUS.
- Required changes (paths):
  - `scholar/README.md`
  - `scripts/run_scholar.bat`
  - `scholar/outputs/reports/scholar_health_check_2026-01-12.md`

## Open questions
- Should plan_update artifacts be required for interactive (non-unattended) runs as well?
- Who owns marking a run BLOCKED when research is pending (Scholar vs human supervisor)?

## Scholar artifact coverage
- reports: `scholar/outputs/reports/scholar_orchestrator_audit_2026-01-12.md`
- digests: `scholar/outputs/digests/scholar_loop_integration_digest_2026-01-12.md`
- system_map: `scholar/outputs/system_map/scholar_system_map_2026-01-12.md`
- research_notebook: `scholar/outputs/research_notebook/scholar_orchestrator_research_2026-01-12.md`
- orchestrator_runs: `scholar/outputs/orchestrator_runs/run_2026-01-12.md`
- module_audits: `scholar/outputs/module_audits/scholar_workflows_audit_2026-01-12.md`
- module_dossiers: `scholar/outputs/module_dossiers/brain-session-log-template_dossier_2026-01-07.md`
- gap_analysis: `scholar/outputs/gap_analysis/scholar_loop_integration_gaps_2026-01-12.md`
- promotion_queue: `scholar/outputs/promotion_queue/proposal_2026-01-12_scholar_loop_integration.md`
- proposals: `scholar/outputs/proposals/change_proposal_core_mode_probe_refine_lock_2026-01-07.md`
- outputs_root: `scholar/outputs/STATUS.md`

## Coverage gaps
- The `plan_updates/` and `proposal_seeds/` lanes defined in `scholar/inputs/ai_artifacts_manifest.json` are not present in the latest inventory.
- Recent run logs show inconsistent coverage sections, limiting audit traceability.

## Citations
- [C1] Kephart, J.O., Chess, D.M. (2003). The Vision of Autonomic Computing. https://doi.org/10.1109/MC.2003.1160055
- [C2] Malone, T.W., Crowston, K. (1994). The Interdisciplinary Study of Coordination. https://doi.org/10.1145/174666.174668
- [C3] Wooldridge, M., Jennings, N.R. (1995). Intelligent agents: Theory and practice. https://doi.org/10.1017/S0269888900008122
- [C4] Grosz, B.J., Kraus, S. (1996). Collaborative plans for complex group action. https://doi.org/10.1016/0004-3702(95)00103-4
- [C5] Horvitz, E. (1999). Principles of mixed-initiative user interfaces. https://doi.org/10.1145/302979.303030
- [C6] Amershi, S., Weld, D., Vorvoreanu, M., et al. (2019). Guidelines for Human-AI Interaction. https://doi.org/10.1145/3290605.3300233

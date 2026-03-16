# Review: Swarm Planner Hardening

## Review 1

- Reviewer: same-tool isolated review pass, orchestration-pattern lens
- Validity: `valid`
- Findings:
  - `SPH-100` needed an explicit downgrade rule so small tasks do not still inherit the full swarm workflow.
  - `SPH-110` needed the validation-vs-review split to appear in the templates, not only the prose skill doc.
  - `SPH-200` needed repo-specific replan triggers tied to canon drift and duplicate-system detection.
- Verdict: `accept with revisions`

## Review 2

- Reviewer: same-tool isolated review pass, validation-and-evals lens
- Validity: `valid`
- Findings:
  - `SPH-210` needed clearer preconditions around queue conversion and first-wave executability.
  - `SPH-300` needed benchmark cases that cover both over-planning and stop-instead-of-plan behavior.
  - `SPH-310` needed before/after examples in track evidence so future tuning has a baseline.
- Verdict: `accept with revisions`

## Review 3

- Reviewer: same-tool isolated review pass, PT-repo canon lens
- Validity: `valid`
- Findings:
  - `SPH-200` needed the execution-surface selector to use only three explicit outcomes.
  - `SPH-900` needed `scripts/sync_agent_skills.ps1 -Mode Check` captured as a required validation gate because the shared skill lives outside repo git.
  - No additional canon-drift issue remained once the track stayed repo-local and the shared skill remained upstream-owned.
- Verdict: `accept with revisions`

## Accepted Revisions

- Added explicit planning-mode selection and small-task downgrade rules to the shared planner.
- Made validation a required section ahead of review in both planner templates.
- Added repo-only canon-drift gating, execution-surface selection, and duplicate-system checks.
- Added a benchmark/readme/scorecard eval kit plus before/after examples in the track evidence.

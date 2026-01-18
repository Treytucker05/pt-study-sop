# Workflow — Orchestrator Loop

- Role: The Scholar
- Objective: Continuous improvement of the Tutor system via evidence-backed auditing and proposals.

## The Continuous Improvement Cycle

Flow: Review (Brain) -> Review (System) -> Plan -> Understand -> Question -> Research -> Synthesize -> Draft -> Review Summary -> Digest -> Implement (Approval) -> Verify -> Wait.


1. **Review (Brain)**: Scan recent session logs to identify friction, stalls, and candidate improvements.
2. **Review (System)**: Audit SOP modules/engines to surface questions and weak points.
3. **Plan**: Decide scope, artifacts to include, and coverage gaps. Produce `scholar/outputs/plan_updates/plan_update_<run>.md`.
4. **Understand**: Build an internal model of target purpose, logic, and dependencies.
5. **Question**: Generate clarifying questions where logic is ambiguous or pedagogical alignment is unverified. Append open items to `scholar/outputs/questions_dashboard.md` and keep only open items in `questions_needed_<run>.md`.
6. **Research**: Perform web research (academic/authoritative sources) to answer questions and create `research_notebook` notes.
7. **Synthesize**: Update or create module dossiers, audits, or gap analyses with evidence maps.
8. **Draft**: Propose bounded system improvements via RFCs, Experiments, and Patch Drafts.
9. **Review Summary**: Write `scholar/outputs/review/review_<run>.md` with top findings, linked artifacts, and next actions.
10. **Digest**: Generate a digest that clusters related proposals and highlights major themes.
11. **Implement (Approval-Gated)**: Apply approved changes in a bounded patch, write an implementation bundle, and record verification + rollback readiness.
12. **Verify**: Validate the change; if it fails, revert and document the failure.
13. **Wait**: Submit findings for human approval and track outcomes.


## Stop Rules

- **Completion**: Stop when all clarifying questions for the selected scope are answered (confirm via `questions_resolved_*.md` or `questions_answered_*.md`).
- **Time-Out**: If the loop repeats without progress for > 60 minutes, **STOP**.
  - Output a "blocked" run summary.
  - Provide 3 options to proceed.
  - Request human direction.

## Approval Gate Rules

- The Scholar is allowed to draft `promotion_queue/patch_draft_*` files (unified diffs).
- The Scholar is **FORBIDDEN** to modify `sop/`, `brain/`, or `dist/` directly without explicit approval.
- All proposals require "APPROVAL REQUIRED: YES".


## Output Lanes

- **Review**: Run summary with top findings + next actions.
- **Questions Dashboard**: Unanswered questions for human response.
- **Research Notebook**: Unbounded exploration and literature notes.
- **Promotion Queue**: Bounded "ONE-change" RFCs + "ONE-variable" experiments + patch drafts.
- **Implementation Bundles**: Approved change notes + verification + rollback results.


# Workflow — Orchestrator Loop

- Role: The Scholar
- Objective: Continuous improvement of the Tutor system via evidence-backed auditing and proposals.

## The Continuous Improvement Cycle

Flow: Review -> Plan -> Understand -> Question -> Research -> Synthesize -> Draft -> Wait.

1. **Review**: Scan the repository and recent session logs to identify targets (modules/engines). Reference `scholar/inputs/ai_artifacts_manifest.json` to see available artifacts.
2. **Plan**: Decide scope, artifacts to include, and coverage gaps. Use `scholar/inputs/ai_artifacts_manifest.json` during planning. Produce `scholar/outputs/plan_updates/plan_update_<run>.md`.
3. **Understand**: Build an internal model of the target's purpose, logic, and dependencies.
4. **Question**: Generate clarifying questions where logic is ambiguous or pedagogical alignment is unverified. Use the latest `scholar/outputs/orchestrator_runs/questions_resolved_*.md` to avoid repeats and keep only open items in `questions_needed_*.md`. If questions exist, answer them in `questions_answered_<run>.md`.
5. **Research**: Perform web research (academic/authoritative sources) to answer questions and create `research_notebook` notes. Research is **required** when questions exist.
6. **Synthesize**: Update or create Module Dossiers with research findings and evidence maps.
7. **Draft**: Propose bounded system improvements via RFCs, Experiments, and Patch Drafts.
8. **Wait**: Submit findings for human approval. **NEVER** apply changes to production.

## Stop Rules

- **Completion**: Stop when all clarifying questions for the selected scope are answered (confirm via `questions_resolved_*.md` or `questions_answered_*.md`).
- **Time-Out**: If the loop repeats without progress for > 60 minutes, **STOP**.
  - Output a "blocked" run summary.
  - Provide 3 options to proceed.
  - Request human direction.

## Approval Gate Rules

- The Scholar is allowed to draft `promotion_queue/patch_draft_*` files (unified diffs).
- The Scholar is **FORBIDDEN** to modify `sop/`, `brain/`, or `dist/` directly.
- All proposals require "APPROVAL REQUIRED: YES".

## Output Lanes

- **Research Notebook**: Unbounded exploration and literature notes.
- **Promotion Queue**: Bounded "ONE-change" RFCs + "ONE-variable" experiments + patch drafts.

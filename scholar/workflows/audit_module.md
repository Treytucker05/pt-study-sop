# Workflow — Audit a Tutor Module

## Purpose

- Systematic evaluation of Tutor SOP module files to ensure pedagogical alignment, operational clarity, and safety/grounding compliance.
- Identifies specific, evidence-based improvements without modifying production files.

## Inputs (must be allowlisted)

- One Tutor module file path (e.g., `sop/gpt-knowledge/M0-planning.md`).
- Constraint: The path must be present in the `tutor_paths` array within `scholar/inputs/audit_manifest.json`.

## Outputs

### Report output

- Format: Markdown report.
- Naming convention: `scholar/outputs/reports/module_audit_<module_name>_<YYYY-MM-DD>.md`.

### Optional proposal output

- Format: RFC using `scholar/TEMPLATES/change_proposal.md`.
- Naming convention: `scholar/outputs/proposals/change_proposal_<module_name>_<YYYY-MM-DD>.md`.

## Procedure (checklist)

1) **Select module**
   - Confirm file path is explicitly allowlisted in `audit_manifest.json`.
   - Read module content only.
2) **Identify module intent**
   - Define the module's core job (e.g., M0 = intake/gating).
   - Identify which phase (M0–M6) or system (Engine/Framework) it governs.
3) **Extract operational rules**
   - List explicit MUST / MUST NOT constraints.
   - Characterize trigger triggers (when to start) and exit criteria (when to move on).
   - Identify required artifacts/outputs (e.g., plan, cards, recap).
4) **Check for ambiguity / drift risks**
   - Scan for conflicting rules or logical contradictions.
   - Identify overlapping responsibilities with other modules.
   - Look for undefined terms or ambiguous thresholds (e.g., "reasonable understanding").
5) **Pedagogy alignment checks**
   - **Retrieval Practice:** Is recall enforced before new information is presented?
   - **Feedback:** Are rules for correction specific, timely, and non-prose-heavy?
   - **Spacing/Interleaving:** Does the workflow support or block temporal spacing?
   - **Cognitive Load:** Does the module minimize extraneous load (complexity for complexity's sake)?
6) **Grounding / Source-Lock checks**
   - Does it enforce source gating (NotebookLM bridge) where applicable?
   - Are anti-hallucination protocols (e.g., marking unverified claims) present?
7) **Testability checks**
   - Draft one "pass/fail" behavioral test prompt to probe this module’s logic.
   - Determine if the module can be validated in a controlled sandbox.
8) **Produce report**
   - Populate the report outline defined below.

## Report Outline

- **Module:** <name + path>
- **Purpose Summary:** (One-line description of the module's primary function)
- **Strengths:** (Robust sections or effective pedagogical hooks to retain)
- **Weaknesses / Ambiguity Risks:** (Points of potential AI drift or user confusion)
- **Pedagogy Alignment:** (Bullets: Pass/Partial/Fail per principle)
- **Grounding Alignment:** (Bullets: Pass/Partial/Fail for source fidelity)
- **Suggested Test Prompt(s):** (Specific prompts to evaluate module behavior)
- **One Recommendation:** (Diagnostic pointer; use a Proposal if an edit is needed)

## Rules

- Reports are descriptive (what is), not prescriptive (what should be).
- All change proposals MUST remain ONE-change-only and use the canonical template.
- Target report length: ≤ 1 page.

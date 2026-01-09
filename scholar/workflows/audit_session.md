# Workflow — Audit a Session Log

## Purpose

- Systematic review of a single study session to evaluate pedagogical fidelity, data integrity, and throughput friction.
- Produces a standardized audit report to inform system improvements.

## Inputs (must be allowlisted)

- Target log file: `brain/session_logs/<filename>.md`
- Constraint: The path must be explicitly allowlisted in `scholar/inputs/audit_manifest.json` under `brain_paths`.

## Output (report artifact)

- Destination: `scholar/outputs/reports/audit_<YYYY-MM-DD>_<topic>.md`
- Note: Reports are diagnostic artifacts. They do NOT trigger modifications to the production Tutor system.

## Procedure (checklist)

1) **Select the session log**
   - Verify file existence in `brain/session_logs/`.
   - Confirm path is in the `audit_manifest.json` allowlist.
2) **Validate log completeness**
   - Confirm inclusion of: `Source-Lock`, `Errors/Misconceptions`, `Target Topic`, `Plan`.
   - Flag any missing or malformed required fields.
3) **Pedagogy fidelity checks**
   - **M0 Planning:** Was a goal and plan established before instruction?
   - **Source-Lock:** Did the student provide explicit sources? Did the Tutor respect them?
   - **Retrieval-First:** Is there evidence of testing/quizzing before "teaching"?
   - **Corrective Feedback:** Were errors followed by targeted correction?
   - **Closeout:** Was there a clear wrap-up and card-creation step?
4) **Efficiency / friction checks**
   - Check duration vs complexity of topic.
   - Look for evidence of "skipped steps" or manual work-arounds.
   - Flag "overhead without payoff" (e.g., long prompts for simple tasks).
5) **Error pattern extraction**
   - Categorize errors: `Conceptual`, `Discrimination`, or `Recall`.
   - Identify if these errors recur from previous logs.
6) **Produce report**
   - Complete the report outline defined below.

## Report Outline

- **Session Identifiers:** (Date | Topic | Mode)
- **Data Integrity:** (List any missing fields or malformed data)
- **Pedagogy Fidelity:** (Checklist of Pass/Fail for core mechanisms)
- **Learning Signals:** (Evidence of successful retrieval or synthesis)
- **Friction Signals:** (Evidence of stalls, confusion, or workflow drift)
- **Error Pattern Summary:** (Count and categorization of session errors)
- **One Recommendation:** (Non-binding observation; e.g., "See M4-build for feedback rules")
- **Suggested Next Investigation:** (e.g., "Audit similar topics in Module 9")

## Rules

- **NEVER** propose direct edits to `sop/` files within this audit report.
- **IF** a change is warranted, create a formal `Change Proposal` using `scholar/TEMPLATES/change_proposal.md`.
- **MAXIMIZE** conciseness (target ≤ 1 page).

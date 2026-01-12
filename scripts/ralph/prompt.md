# Ralph Agent Instructions

## Runtime
- This loop runs via Codex CLI (codex exec). Do not suggest Amp commands.

## Your Task

1. Read `scripts/ralph/prd.json`
2. Read `scripts/ralph/progress.txt`
   (check Codebase Patterns first)
3. Check you're on the correct branch
4. Pick highest priority story where `passes: false`
5. Implement that ONE story
6. Run typecheck and tests
7. Update AGENTS.md files with learnings
8. Commit: `feat: [ID] - [Title]`
9. Update prd.json: `passes: true`
10. Append learnings to progress.txt

## Repo Checks

- Typecheck: `python -m pytest brain/tests`
- Release check: `python scripts/release_check.py`
- Manual smoke test (UI changes): Run `Run_Brain_All.bat` and verify http://127.0.0.1:5000

If any required command fails, fix the issues before marking a story complete.

## Scholar Focus (when a story touches scholar/)

- Read `scholar/README.md`, `scholar/CHARTER.md`, `scholar/inputs/audit_manifest.json`, and `scholar/workflows/orchestrator_loop.md` before changes.
- Use all available AI-generated artifacts in `scholar/outputs/` (reports, digests, orchestrator_runs, research_notebook, promotion_queue, system_map, module_dossiers, module_audits, gap_analysis).
- When synthesizing recommendations, deduplicate and rank them; include source file paths for traceability.
- Add or update a coverage note/report listing artifacts used and any gaps.
- Optimize flow to follow: Review -> Plan -> Understand -> Question -> Research -> Synthesize -> Draft -> Wait.
- Respect Scholar guardrails: read-only for `sop/`, `brain/`, and `dist/`; outputs only in `scholar/outputs/`.

## Progress Format

APPEND to progress.txt:

## [Date] - [Story ID]
- What was implemented
- Files changed
- **Learnings:**
  - Patterns discovered
  - Gotchas encountered
---

## Codebase Patterns

Add reusable patterns to the TOP of progress.txt:

## Codebase Patterns
- Migrations: Use IF NOT EXISTS
- React: useRef<Timeout | null>(null)

## Stop Condition

If ALL stories pass, reply:
<promise>COMPLETE</promise>

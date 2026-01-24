# AGENTS Master (Unified)

Canonical location: `C:/pt-study-sop/ai-config/AGENTS.md`
Mirror copies (keep in sync; do not edit directly): `C:/pt-study-sop/AGENTS.md`, `C:/pt-study-sop/.claude/AGENTS.md`

## Scope and precedence
- Applies to work under `C:/pt-study-sop` and specifically the `pt-study-sop` repo unless a nearer `AGENTS.md` exists.
- The nearest `AGENTS.md` overrides this file if there is any conflict; note the reason when that happens.

## DIRECTIVE 0: LOAD SYSTEM CONSTITUTION
You must read and obey `CLAUDE.md` immediately (same folder). It contains core rules and documentation map.

## Global defaults
- Keep changes minimal and scoped; avoid broad reformatting.
- Prefer ASCII; keep filenames and paths stable unless requested.
- Prefer non-archive paths for code changes; avoid editing `archive/` (including `archive/unused`) unless explicitly requested.
- When working in any folder, ensure a concise `README.md` exists that explains purpose, key paths, and pointers; create/update it if missing (skip `archive/` unless asked).
- Ask before destructive or irreversible actions (delete, overwrite, submit, purchase).
- Run project-required checks or clearly state when they are skipped.

## ExecPlans
When writing complex features or significant refactors, use an ExecPlan (as described in `.agent/PLANS.md`) from design to implementation.

## When to ask (and how)
- If a task needs a specific target (repo/path, environment, or output location) and it is not explicit, ask.
- If requirements/preferences are missing and would change the implementation, ask.
- If there are multiple valid choices, ask with 2-4 options and a default.
- If actions are destructive, confirm before proceeding.
- Response style for questions: minimum questions; use short numbered questions with lettered options; restate choices after the user answers and proceed.

## Startup menu (new sessions when task unspecified)
1) What do you want to do?
   A. Set up Ralph in a project
   B. Create a PRD
   C. Convert PRD -> prd.json
   D. Run the Ralph loop
   E. Review/merge AGENTS.md rules
   F. Other (describe)
2) Which project path should I use?
   A. Provide full path
3) Shell preference (Windows)?
   A. WSL/Git Bash
   B. PowerShell

## Ralph usage (if running the Ralph loop)
- Keep `ralph.sh`, `prompt.md`, `prd.json`, and `progress.txt` in the same `scripts/ralph/` folder.
- Use small, verifiable stories; always include `Typecheck passes` and for UI stories `Verify in browser using dev-browser skill`.
- Append learnings to `progress.txt` and update `AGENTS.md` only with reusable patterns.
- Stop condition is `<promise>COMPLETE</promise>`.

## Continuity ledger
- Maintain a single Continuity Ledger at `C:/pt-study-sop/CONTINUITY.md`.
- Update the ledger after every significant change; append only -- never delete history.

## Project map (nearest AGENTS.md locations)
- PT Study SOP: `C:/pt-study-sop/AGENTS.md` (mirror of canonical in `C:/pt-study-sop/ai-config/AGENTS.md`)
  - Runtime canon in `sop/gpt-knowledge/`; master plan in `sop/MASTER_PLAN_PT_STUDY.md`.
  - Requires `CONTINUITY.md` and specific test commands.
- DrCodePT-Swarm: `C:/Users/treyt/OneDrive/Desktop/DrCodePT-Swarm/AGENTS.md`
  - Phase machine and ASK_USER gating; use `pytest -q` for tests.
- PowerHouse Program Design Workspace: `C:/Users/treyt/OneDrive/Desktop/PowerHouseATX_Master/09 PROJECTS/Program Design Workspace/AGENTS.md`
  - JS/Vite workflow; unit/e2e/verify scripts; handler mapping details.
- Powerhouse tracker: `C:/Users/treyt/OneDrive/Desktop/PowerHouseATX_Master/09 PROJECTS/Program Design Workspace/powerhouse-tracker/AGENTS.md`

## Extra notes
- If unsure, label it `UNCONFIRMED` and ask a targeted question.
- Always list the exact files changed.

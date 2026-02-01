# Agent Workflow Guidelines

## Startup (New Sessions, Task Unspecified)

1. What do you want to do?
   - A. Create a PRD
   - B. Review/merge AGENTS.md rules
   - C. Other (describe)
2. Which project path?
3. Shell preference? A. WSL/Git Bash  B. PowerShell

## Strategy Quickstart (Claude/Codex/OpenCode)

- Terminal: Ghostty, set `/statusline` to show context usage + git branch.
- Subagents: append `use subagents`; delegate research/tests/review.
- Analytics: use `bq` CLI; show query + result summary.
- Learning: set output style to Explanatory/Learning or add "explain why"; include ASCII diagrams when helpful.

## Agent Hygiene

- Clean up after each task: remove failed scripts, temp files, obsolete drafts.
- Mark tasks complete in the relevant plan/ExecPlan and document what changed.
- If a decision changes direction, add a note explaining why.
- When a file becomes outdated, update it or mark deprecated with a pointer.

## Extra Notes

- If unsure, label it `UNCONFIRMED` and ask a targeted question.
- Always list the exact files changed.

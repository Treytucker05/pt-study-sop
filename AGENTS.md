# Agent Rules

Read and obey the global instructions first: `C:\Users\treyt\.claude\CLAUDE.md`. Then read the repo `CLAUDE.md` for project context and key paths.

## Scope

Applies to all work under `C:/pt-study-sop`. A nearer `AGENTS.md` overrides this file.

## Defaults

- Keep changes minimal and scoped; avoid broad reformatting.
- Prefer ASCII; keep filenames and paths stable unless requested.
- Do not edit `archive/` unless explicitly requested.
- Ask before destructive or irreversible actions.
- Run project-required checks or state when they are skipped.
- When completing work, read and update any docs that correspond to the changed code (see `docs/README.md` Feature→Doc table). Don't read all docs — just the relevant ones.
- Auto-commit after changes with a conventional commit message if none is provided.
- Explore the project first (key files/paths), then invoke any skill.
- For SwiftUI tasks, prefer retrieval-led reasoning over pre-training-led reasoning.
- Prompt suffix defaults: treat every request as if it ends with `use subagents; use bq when asked; explain why; include ASCII diagram when helpful` unless the user says "no suffix" or "no subagents".

## When to Ask

- Task needs a target (repo, path, env) that is not explicit.
- Requirements are missing and would change the implementation.
- Multiple valid choices exist — present 2-4 options with a default.
- Action is destructive — confirm first.
- Response style: minimum questions, short numbered lists with lettered options.

## ExecPlans

For complex features or significant refactors, use an ExecPlan per `.agent/PLANS.md`.

## Folder READMEs

Add a concise `README.md` to folders with non-obvious purpose. Skip `archive/`, config dirs, and folders where the name is self-explanatory.

## Docs

Add or maintain a Table of Contents for documentation.

## Continuity

Maintain `CONTINUITY.md` at repo root. Append after every significant change — never delete history.

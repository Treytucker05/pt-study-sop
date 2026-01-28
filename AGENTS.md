# Agent Rules

Read and obey `CLAUDE.md` first — it contains project context and key paths.

## Scope

Applies to all work under `C:/pt-study-sop`. A nearer `AGENTS.md` overrides this file.

## Defaults

- Keep changes minimal and scoped; avoid broad reformatting.
- Prefer ASCII; keep filenames and paths stable unless requested.
- Do not edit `archive/` unless explicitly requested.
- Ask before destructive or irreversible actions.
- Run project-required checks or state when they are skipped.
- Auto-commit after changes with a conventional commit message if none is provided.

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

## Continuity

Maintain `CONTINUITY.md` at repo root. Append after every significant change — never delete history.

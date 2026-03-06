# Agent Setup

## Purpose

This repo uses one project canon plus thin compatibility layers.

- Project canon: `C:\pt-study-sop\AGENTS.md`
- Repo compatibility files: `CLAUDE.md`, `.claude/AGENTS.md`, `.claude/CLAUDE.md`
- Repo-local Claude agents: `.claude/agents/*`
- Repo-local Claude commands: `.claude/commands/*`
- Global Claude defaults: `C:\Users\treyt\.claude\CLAUDE.md`, `C:\Users\treyt\.claude\rules\*`, `C:\Users\treyt\.claude\agents\*`
- Global Codex defaults: `C:\Users\treyt\.codex\AGENTS.md`, `C:\Users\treyt\.codex\config.toml`, `C:\Users\treyt\.codex\agents\*.toml`, `C:\Users\treyt\.codex\rules\default.rules`

## Resolution Order

### 1. Project canon always wins

If the active repo has a root `AGENTS.md`, use that file as the only project-specific policy source.

### 2. Nested/module `AGENTS.md` files are scoped overrides

If a subdirectory later gets its own `AGENTS.md`, it overrides repo-root instructions only for files inside that subtree. It still sits above home-directory defaults because it is repo-local canon.

### 3. Repo compatibility files only point back to canon

`CLAUDE.md`, `.claude/AGENTS.md`, and `.claude/CLAUDE.md` exist for tool compatibility only. They should never become separate policy sources.

### 4. Repo-local agents apply role-specific delta only

Files under `.claude/agents/*` are allowed to define role behavior, but they must first read root `AGENTS.md` and only add a narrow role-specific delta.

### 5. Global defaults are cross-project only

`C:\Users\treyt\.claude\*` and `C:\Users\treyt\.codex\*` are reusable defaults. They must defer to the repo canon whenever this project is active.

### 6. Repo-local agents beat global agents

If a repo-local agent name overlaps with a global agent name, the repo-local one is the active definition for this project.

## Exact Search Order

1. Active repo root `AGENTS.md`
2. Nearest nested/module `AGENTS.md` that applies to the current file or task scope
3. Repo compatibility files only when a tool requires them (`CLAUDE.md`, `.claude/AGENTS.md`, `.claude/CLAUDE.md`)
4. Explicitly invoked repo-local agents under `.claude/agents/*`
5. Global defaults (`C:\Users\treyt\.claude\CLAUDE.md`, `C:\Users\treyt\.claude\rules\*`, `C:\Users\treyt\.codex\AGENTS.md`)
6. Global reusable agents (`C:\Users\treyt\.claude\agents\*`)

Collision rule:

- Match by frontmatter `name` first.
- If frontmatter is absent, fall back to filename.
- If repo-local and global agents still collide, the repo-local agent wins.

## Current Shape

| Surface | Purpose | Allowed to contain project policy? |
|---|---|---|
| `AGENTS.md` | Project canon | Yes |
| nested/module `AGENTS.md` | Scoped repo canon override | Yes, but only for that subtree |
| `CLAUDE.md` | Repo compatibility entrypoint | No |
| `.claude/AGENTS.md` / `.claude/CLAUDE.md` | Tool shims | No |
| `.claude/agents/*` | Repo-local role deltas | Only role-specific delta after reading canon |
| `.claude/commands/*` | Command aliases/workflows | No independent policy |
| `C:\Users\treyt\.claude\CLAUDE.md` | Global Claude defaults | No |
| `C:\Users\treyt\.claude\rules\*` | Global reusable rules | No |
| `C:\Users\treyt\.claude\agents\*` | Global reusable roles | No |
| `C:\Users\treyt\.codex\AGENTS.md` | Global Codex defaults | No |
| `C:\Users\treyt\.codex\agents\*.toml` | Codex role runtime settings | No policy text |
| `C:\Users\treyt\.codex\rules\default.rules` | Global Codex permission/rule surface | No project policy |

## Safe Change Rules

### Add or change project policy

Edit `AGENTS.md` first. Then update compatibility files only if their pointer text must change.

### Add a repo-local Claude role

1. Add the file under `.claude/agents/`.
2. Keep the frontmatter name stable.
3. Start with an inheritance header that says the agent must read root `AGENTS.md` first.
4. Only include the role-specific delta after that.

### Add a global reusable Claude role

1. Add the file under `C:\Users\treyt\.claude\agents\`.
2. Use the same inheritance header.
3. Keep it cross-project and reusable.
4. Do not add PT Study-specific rules there.

### Change Codex role behavior

1. Put project policy in repo `AGENTS.md`, not in TOML.
2. Use `C:\Users\treyt\.codex\agents\*.toml` only for model/runtime settings.
3. If a runtime change is only needed for this repo, prefer fixing the repo canon or global defer-to-project behavior before expanding Codex TOML complexity.

## Bootstrap Fix Applied On 2026-03-06

The Codex role files `awaiter.toml`, `explorer.toml`, and `worker.toml` were using `gpt-5.3-codex-spark` while global Codex config enabled `model_reasoning_summary = "concise"`. Spawned workers failed because that model path rejected `reasoning.summary`.

Current fix:

- align those role files to `gpt-5.4`
- keep role-specific reasoning effort
- set `model_reasoning_summary = "none"` in each role file

This keeps subagents stable without moving project policy into TOML.

## Validation Checklist

After any agent-config change:

1. Run `pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync_agent_config.ps1 -Mode Check`
2. Verify repo shims still point to root `AGENTS.md`
3. Verify repo command files reference valid repo-local agent IDs
4. Verify `.claude/permissions.json` still matches root `permissions.json` if that compatibility file is present
5. Spawn one Codex subagent and one Claude role path if the change touched those systems
6. Update `docs/root/TUTOR_TODO.md`, `conductor/tracks/GENERAL/log.md`, and `conductor/tracks.md`

## Best-Practice Basis

- Claude Code project memory and imports: prefer a small project canon plus reusable supporting files when tool support is verified.
- Claude Code subagents: keep agents narrow, reusable, and project-aware; project-local agents should override broader user-level defaults.
- Codex config: keep project policy in project docs (`AGENTS.md`) and use role TOMLs for runtime/model behavior only.

Sources:

- https://code.claude.com/docs/en/memory
- https://docs.anthropic.com/en/docs/claude-code/sub-agents
- https://developers.openai.com/codex/config-schema.json

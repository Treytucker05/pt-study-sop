# AI Config and Path Unification

This repo and your global agents use a few different "config surfaces". The goal is that every agent/tool can find the same instructions and the same canonical paths.

## Repo-scoped (this git repo)

Canonical instruction entrypoints live at the repo root:

- `AGENTS.md`
- `CLAUDE.md`
- `permissions.json`
- `.mcp.json`

Claude Code reads repo-local config from `.claude/`. The files `.claude/AGENTS.md` and `.claude/CLAUDE.md` are small pointer stubs that direct Claude Code to the repo-root instruction files.

## MCP servers

This repo includes a few MCP server presets in `.mcp.json` / `.claude/mcp.json`:
- `codex-cli`: code review loop (see `docs/project/AI_REVIEW_LOOP.md`)
- `github`: GitHub API operations (requires `GITHUB_PERSONAL_ACCESS_TOKEN` in your environment)
- `memory`: local knowledge-graph memory

The `ai-config/` folder is supplemental only (not canonical). It contains:

- `ai-config/agent-workflow.md`
- `ai-config/agent-prompts.md`

### Drift check (PowerShell)

- Dry run:
  - `pwsh -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\sync_agent_config.ps1 -Mode DryRun`
- Apply:
  - `pwsh -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\sync_agent_config.ps1 -Mode Apply`
- Check (CI):
  - `pwsh -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\sync_agent_config.ps1 -Mode Check`

## Global portable (Obsidian vault)

Portable canonical agent config lives in the Obsidian vault:

- `C:\\Users\\treyt\\Desktop\\PT School Semester 2\\agents\\config\\`

Sync from vault -> standard tool locations using:

- `C:\\Users\\treyt\\Desktop\\PT School Semester 2\\agents\\config\\sync_to_home.ps1`
- Optional repo wrapper: `scripts/sync_portable_agent_config.ps1`

## OneDrive note

OneDrive can lock large folders (like `node_modules`) and make git operations noisy. Keep repo config changes scoped to docs and scripts unless you are explicitly working on frontend or other large dependency folders.

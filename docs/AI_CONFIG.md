# AI Config Sync
## Overview
ai-config/ is the canonical source of truth for AI agent configuration in this repo. We sync from ai-config/ to both the repo root and .claude/ so Codex and Claude Code always read consistent instructions.
## What lives where
- ai-config/: canonical AGENTS, CLAUDE, permissions, commands, subagents.
- .claude/: Claude Code config surface (commands, subagents/agents, permissions, mcp, settings).
- Repo root: AGENTS.md and CLAUDE.md for Codex instruction loading.
## PowerShell commands
- Plan (DryRun):
  powershell -ExecutionPolicy Bypass -File .\scripts\sync_ai_config.ps1 -Mode DryRun
- Apply sync:
  powershell -ExecutionPolicy Bypass -File .\scripts\sync_ai_config.ps1 -Mode Apply
- Drift check:
  powershell -ExecutionPolicy Bypass -File .\scripts\sync_ai_config.ps1 -Mode Check
## CI enforcement
CI enforces drift detection via a dedicated job that runs:
  pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/sync_ai_config.ps1 -Mode Check
The job fails if any drift is detected.

## What to edit
1) Edit files under ai-config/ (and ai-config/commands, ai-config/subagents).
2) Run Apply to sync to root and .claude/.
3) Commit later (git steps are intentionally not covered here).
## Optional skills
If ai-config/skills/ exists, it syncs into %USERPROFILE%\.codex\skills\pt-study-sop\.
## OneDrive note
OneDrive can lock large folders (like node_modules) and make stash/cleanup operations noisy. Keep AI config changes scoped to ai-config/, .claude/, and root instruction files to avoid that churn.

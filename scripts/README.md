# Scripts

Automation utilities for the PT Study SOP repo.

System context: scripts support CP-MSS v1.0 operations and governance.

## Common entries
- `generate_architecture_dump.ps1` - Regenerates `docs/root/ARCHITECTURE_CONTEXT.md`.
- `release_check.py` - Runs release checks.
- `sync_agent_config.ps1` - Repo drift check for agent instruction entrypoints and tool stubs.
- `sync_ai_config.ps1` - Deprecated (use `sync_agent_config.ps1`).
- `sync_portable_agent_config.ps1` - Convenience wrapper to sync portable vault agent config to home tool locations.
- `launch_codex_session.ps1` - Start one-off named agent sessions (`-Tool codex` default; `-Tool opencode` and `-Tool kimi` supported).
- `agent_worktrees.ps1` - Create/manage named persistent worktrees (integrate/ui/brain[/docs]) for parallel agents. Supports multi-agent launch (`open-many` / `dispatch-many`), role routing, and quick status.
- `bootstrap_parallel_agents.ps1` - One-command bootstrap: ensure worktrees + launch selected agent profile across multiple roles.
- `install_agent_guard_hooks.ps1` - Install optional local git hooks (`pre-commit`, `pre-push`) to enforce drift checks and baseline tests during parallel agent workflows.
- `parallel_launch_wizard.ps1` - Interactive launcher that prompts for role selection and agent counts (Codex/Claude) and starts all requested sessions.
- `run_scholar.bat` - Run Scholar workflows.
- `parallel launch shortcut` - Use `C:/Users/treyt/OneDrive/Desktop/Travel Laptop/Parallel Work/01_Launch_Parallel_Wizard.bat` for the one-file prompting flow.
- `check_parallel_setup.ps1` - Run health validation across scripts, worktrees, and launchers.
- `sync_tutor_category_docs.py` - One-command sync: regenerate Obsidian tutor category pages from `sop/library/methods/*.yaml`.
- `video_ingest_local.py` - Local MP4 pipeline (ffmpeg + faster-whisper + optional OCR) that emits transcript/visual-note artifacts for tutor ingest.

## Notes
- Run from repo root unless the script states otherwise.
- Check local/global agent permission policy files before running new commands (for example `.claude/permissions.json` if present and `C:/Users/treyt/.claude/CLAUDE.md` guidance).

## Parallel Agent Quickstart
```powershell
# 0) One-command bootstrap (recommended)
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap_parallel_agents.ps1 -Profile swarm -IncludeDocs -OpenDocs -SessionTag daily

# 0b) Focused bootstrap (ui+brain, codex+claude only)
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap_parallel_agents.ps1 -Roles ui,brain -Agents codex,claude -SessionTag focused

# 1) Ensure worktrees exist (adds docs role too)
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\agent_worktrees.ps1 -Action ensure -IncludeDocs

# 2) Open agents in the UI role (codex + claude)
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\agent_worktrees.ps1 -Action open-many -Role ui -Profile swarm -SessionTag ui-pass

# 3) Route by path and launch review pair (codex + claude)
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\agent_worktrees.ps1 -Action dispatch-many -Paths brain\dashboard\api_adapter.py -Profile review -SessionTag api-review

# 3b) Route by path and launch explicit trio (codex + kimi + claude)
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\agent_worktrees.ps1 -Action dispatch-many -Paths brain\dashboard\api_adapter.py -Agents codex,kimi,claude -SessionTag api-review

# 4) See branch/dirty state per role worktree
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\agent_worktrees.ps1 -Action status -IncludeDocs
```

Bootstrap dry-run preview:
```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap_parallel_agents.ps1 -Profile swarm -IncludeDocs -OpenDocs -DryRun
```

## Coordination Source of Truth
- Use `conductor/tracks.md` as the only active coordination board.
- Use each track's `plan.md` checkboxes for task ownership and progress.
- Use `conductor/tracks/GENERAL/log.md` for chronological, non-track-specific updates.

### Integrate role usage
- Integrate role path/branch is `wt/integrate` and is meant for final merge conflict resolution and release readiness tasks.
- For a dedicated integrate launch, use:
  `C:/Users/treyt/OneDrive/Desktop/Travel Laptop/Parallel Work/13_Launch_Integrate_Parallel.bat`
- Run full setup validation:
  `pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_parallel_setup.ps1`

## Optional Local Guard Hooks
```powershell
# Install checks that run on commit/push
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\install_agent_guard_hooks.ps1 -Action install

# Verify installed
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\install_agent_guard_hooks.ps1 -Action status
```


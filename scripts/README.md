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
- `agent_task_board.py` - Shared cross-worktree task registry (claim/start/heartbeat/done/block/release with timestamps and ownership).
- `install_agent_guard_hooks.ps1` - Install optional local git hooks (`pre-commit`, `pre-push`) to enforce drift checks and baseline tests during parallel agent workflows.
- `parallel_launch_wizard.ps1` - Interactive launcher that prompts for role selection and agent counts (Codex/Claude) and starts all requested sessions.
- `run_scholar.bat` - Run Scholar workflows.
- `parallel launch shortcut` - Use `C:/Users/treyt/OneDrive/Desktop/Travel Laptop/Parallel Work/01_Launch_Parallel_Wizard.bat` for the one-file prompting flow.
- `check_parallel_setup.ps1` - Run health validation across scripts, worktrees, launchers, and task board.
- `sync_tutor_category_docs.py` - One-command sync: regenerate Obsidian tutor category pages from `sop/library/methods/*.yaml`.

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

## Shared Task Board
```powershell
# Show shared board path (stored under git common dir, shared by all worktrees)
python .\scripts\agent_task_board.py where

# Add/claim/finish lifecycle
python .\scripts\agent_task_board.py add --task-id T-001 --title "Polish Brain tab UX" --priority P1
python .\scripts\agent_task_board.py claim --task-id T-001 --agent codex-ui --role ui
python .\scripts\agent_task_board.py heartbeat --task-id T-001 --note "working through edge states"
python .\scripts\agent_task_board.py done --task-id T-001 --note "implemented + verified"

# View board
python .\scripts\agent_task_board.py list
python .\scripts\agent_task_board.py status
```

Each spawned agent shell now includes a helper command:
```powershell
task-board list
task-board claim --task-id T-001
```

Agent identity defaults are auto-injected per launched shell (`PT_AGENT_NAME`, `PT_AGENT_ROLE`, `PT_AGENT_TOOL`, `PT_AGENT_SESSION`, `PT_AGENT_WORKTREE`), so ownership is distinct across parallel agents even without passing `--agent`.

Goal-based launch routing:
- `launch_codex_session.ps1 -Task "..."` now auto-initializes/updates the shared task board by creating an `in_progress` task and claiming it for the launched session.
- The launched shell receives `PT_TASK_ID` plus `task-board` helper, so follow-up `heartbeat`/`done` commands stay tied to the same board task.

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


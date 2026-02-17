# Parallel Agent Workflow

Use this when running multiple agents (Codex, Claude, OpenCode) in parallel.

## Goal
- Keep each role isolated in its own worktree.
- Allow fast tool switching per role.
- Prevent drift with local hooks + CI checks.

## Role map
- `integrate` -> shared integration and merges
- `ui` -> `dashboard_rebuild/` changes
- `brain` -> `brain/` backend/API changes
- `docs` -> docs/scripts/conductor updates (optional role)

## One-time setup
```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\agent_worktrees.ps1 -Action ensure -IncludeDocs
```

## One-command bootstrap (recommended)
```powershell
# Ensure worktrees and launch codex+claude+opencode across ui/brain/integrate (+docs)
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap_parallel_agents.ps1 -Profile swarm -IncludeDocs -OpenDocs -SessionTag daily
```

## Interactive wizard (single-file operator flow)
```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\parallel_launch_wizard.ps1
```
Prompts for roles, counts per tool (Codex/Claude/OpenCode), and session prefix, then launches everything in one run.

Need only integration lane startup?

```powershell
& "C:\Users\treyt\OneDrive\Desktop\Travel Laptop\Parallel Work\13_Launch_Integrate_Parallel.bat"
```

Custom roles/agents:
```powershell
# Launch only ui+brain with codex+claude
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap_parallel_agents.ps1 -Roles ui,brain -Agents codex,claude -SessionTag focused
```

Dry-run preview before launching:
```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap_parallel_agents.ps1 -Profile swarm -IncludeDocs -OpenDocs -DryRun
```

## Launch patterns
```powershell
# Single tool in a role
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\agent_worktrees.ps1 -Action open -Role ui -Tool codex -SessionTag ui-1

# Multiple tools in one role (swarm profile: codex+claude+opencode)
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\agent_worktrees.ps1 -Action open-many -Role brain -Profile swarm -SessionTag brain-pass

# Route by path and launch review pair (codex+claude)
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\agent_worktrees.ps1 -Action dispatch-many -Paths brain\dashboard\api_adapter.py -Profile review -SessionTag api-review
```

## Fast switching
- Use `open-many` in the same role to spin up alternate perspectives quickly.
- Use `-Agents codex,claude,opencode` for explicit control.
- Use `-SessionTag` to label terminal titles and avoid context confusion.

## Shared task ownership (required for parallel work)
All roles share one task board file (in git common dir), so every agent sees real-time ownership.

```powershell
# Initialize board (bootstrap does this automatically)
python .\scripts\agent_task_board.py init

# Add a task from integrate role
python .\scripts\agent_task_board.py add --task-id T-001 --title "Tutor setup wizard pass" --priority P1

# Claim/start from a role
python .\scripts\agent_task_board.py claim --task-id T-001 --agent codex-ui --role ui

# Heartbeat during work
python .\scripts\agent_task_board.py heartbeat --task-id T-001 --note "step 2 in progress"

# Complete or block
python .\scripts\agent_task_board.py done --task-id T-001 --note "merged to integrate"
python .\scripts\agent_task_board.py block --task-id T-001 --reason "API dependency missing"

# Global visibility
python .\scripts\agent_task_board.py list
python .\scripts\agent_task_board.py status
```

Each spawned agent shell also includes:
```powershell
task-board list
task-board claim --task-id T-001
```

Launcher sessions set per-shell identity env vars automatically (`PT_AGENT_NAME`, `PT_AGENT_ROLE`, `PT_AGENT_TOOL`, `PT_AGENT_SESSION`, `PT_AGENT_WORKTREE`), so task ownership remains distinct across parallel agents.

## Parallel governance upgrades (recommended)
- Enforce required reviews + required status checks (strict or loose mode based on team tolerance).
- Require code-owner reviews for role-owned paths.
- Keep `integrate` as the single writer of release-bound files and the final conflict-resolution lane.
- Add lightweight conflict detection:
  - `git worktree list --porcelain` before opening new tracks,
  - periodic `git worktree prune` / cleanup,
  - frequent `git status --short`/`task-board` checks before final merge.
- For long-lived tracks, merge one branch at a time into integrate to reduce overlap.

## Status check
```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\agent_worktrees.ps1 -Action status -IncludeDocs
```
Shows role, branch, dirty file count, and path for each worktree.

## Full health check
```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_parallel_setup.ps1
```
Use this once after setup or before a major launch session to verify:
- repo/worktree path readiness
- required scripts and launchers exist
- agent-worktree command health
- task board command health

## Guardrails
- Keep a **single writer** for shared board/status files (usually `integrate`).
- Run checks before integrating:
```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync_agent_config.ps1 -Mode Check
python scripts/check_docs_sync.py
python scripts/validate_project_hub.py
python -m pytest brain/tests
```

## Optional local hooks
```powershell
# Install pre-commit + pre-push safeguards
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\install_agent_guard_hooks.ps1 -Action install

# Check hook status
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\install_agent_guard_hooks.ps1 -Action status
```


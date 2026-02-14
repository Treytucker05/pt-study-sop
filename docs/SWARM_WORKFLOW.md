# SWARM Workflow (Windows-Only)

## Launch From One BAT Menu Option
1. Open:
   `C:\Users\treyt\OneDrive\Desktop\Travel Laptop\Parallel Work\00_Parallel_Work_Center.bat`
2. Choose:
   `Swarm Workflow (Windows-only: OhMyOpenCode + Codex + Claude + Gemini)`
3. The launcher runs:
   `pwsh -NoProfile -ExecutionPolicy Bypass -File C:\pt-study-sop\scripts\swarm_workflow.ps1`

## Modes
- `fast` (default): planning + implementation focus with lightweight review flow.
- `high-confidence`: strict reviewer gate before implementation tasks are marked done.

Run directly with mode override:
```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File C:\pt-study-sop\scripts\swarm_workflow.ps1 -Mode high-confidence
```

## What Opens
- `planner` (Oh My OpenCode)
- `codex-1..N` (worktree-backed implementation terminals)
- `claude-review` (optional if `claude` CLI installed)
- `gemini-research` (optional if `gemini` CLI installed)
- `status` (10-second refresh loop: task board + git status)

Codex worktrees are created at:
`C:\pt-study-sop\worktrees\codex-1` ... `codex-N`

## Task Ownership Rules
- No work starts without a task ID (`T-###`).
- One owner per task at a time.
- Codex agents perform implementation tasks.
- Reviewer agents review diffs/tests and create follow-up tasks when needed.
- In `high-confidence` mode, reviewer approval is required before marking tasks done.

## Stop Agents
- Close each spawned terminal window manually.
- For long-running status window, press `Ctrl+C` or close the window.

## Cleanup
Default is dry-run (no deletes):
```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File C:\pt-study-sop\scripts\swarm_cleanup.ps1
```

Apply cleanup:
```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File C:\pt-study-sop\scripts\swarm_cleanup.ps1 -Apply
```

Cleanup scope is limited to repo-local swarm artifacts:
- `C:\pt-study-sop\worktrees\codex-*` (only clean + merged OR marked complete in task board)
- `C:\pt-study-sop\logs\agents\` files older than 14 days
- Known temporary files created by swarm scripts under `C:\pt-study-sop`

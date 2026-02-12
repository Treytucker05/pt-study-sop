---
name: agent-worktrees
description: Git worktree based parallel agent workflow for running Codex CLI, Claude Code, OpenCode, and other coding agents concurrently without file conflicts. Use when you need to (1) create/manage named worktrees (integrate/ui/brain[/docs]), (2) route a task to the correct worktree based on the files it will touch, (3) launch a tool in the chosen worktree, or (4) coordinate multiple agents via an integrator merge and review loop.
---

# Agent Worktrees

## Quick Start

This repo uses named git worktrees as the main concurrency primitive: one writer per worktree/role, plus an integrator that merges and runs checks.

Create the standard worktrees (default root `C:\pt-study-sop-worktrees`):

```powershell
cd C:\pt-study-sop
.\scripts\agent_worktrees.ps1 ensure
```

List the mapping:

```powershell
.\scripts\agent_worktrees.ps1 list
```

Open a tool in a specific worktree (new PowerShell window):

```powershell
.\scripts\agent_worktrees.ps1 open -Role ui -Tool claude
.\scripts\agent_worktrees.ps1 open -Role brain -Tool codex -ToolArgs "--search"
.\scripts\agent_worktrees.ps1 open -Role integrate -Tool opencode
```

Route a task by file paths, or dispatch automatically:

```powershell
.\scripts\agent_worktrees.ps1 route -Paths dashboard_rebuild\\client\\src\\pages\\tutor.tsx
.\scripts\agent_worktrees.ps1 dispatch -Paths brain\\db_setup.py -Tool codex
```

## Roles (Default Map)

Roles are meant to be obvious, not clever:

- `integrate` (`wt/integrate`): merges, conflict resolution, running checks, and any cross-cutting change touching multiple areas.
- `ui` (`wt/ui`): frontend work in `dashboard_rebuild/`.
- `brain` (`wt/brain`): backend work in `brain/` (Flask/API/db).
- `docs` (`wt/docs`, optional): docs + meta-work in `docs/`, `conductor/`, `scripts/`, tests.

ASCII overview:

```text
wt/ui      (Claude or Codex)  -> commits on wt/ui
wt/brain   (Codex)            -> commits on wt/brain
wt/integrate (you)            -> merges + runs checks -> main
```

## Routing Rules (Which Role Gets the Task?)

Route by *files touched*, not by vibes:

- If the change is entirely under `dashboard_rebuild/` -> `ui`
- If the change is entirely under `brain/` -> `brain`
- If it touches both (or involves build/sync, final QA, or conflicts) -> `integrate`
- If it's docs-only and you created `docs` -> `docs` (otherwise `integrate`)

When in doubt, send it to `integrate`.

## Collaboration Protocol (How They Work Together)

1. Assign ownership: exactly one writer per role/worktree.
2. Each worker commits on their role branch (`wt/ui`, `wt/brain`, etc.).
3. Integrator merges to `main` and runs the repo's required checks.
4. Review loop: use another tool to review what the integrator is about to merge (Codex review, Claude review, etc.).

Practical merge flow (run from `wt/integrate`):

```powershell
cd C:\pt-study-sop-worktrees\integrate
git fetch
git merge wt/ui
git merge wt/brain
pytest brain/tests/   # when relevant
```

## Can Each Tool Spawn Subagents?

Yes, but keep the concurrency model simple:

- "Parallel agents" should usually mean *multiple top-level sessions*, one per worktree.
- If a tool supports subagents/teams, use them for read-only work (repo scanning, research, test suggestions) or for work that stays inside the same worktree and does not fight over files.
- Avoid recursive swarms where every agent spawns more agents that all write code; merge overhead dominates.

## Repo Helpers

- Create/manage named worktrees: `scripts/agent_worktrees.ps1`
- One-off session worktrees (timestamped): `scripts/launch_codex_session.ps1` (use `-Tool opencode` for Opencode sessions).

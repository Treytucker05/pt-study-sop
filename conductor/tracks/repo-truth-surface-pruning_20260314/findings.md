# Findings: Repo Truth Surface Pruning Baseline

**Track ID:** repo-truth-surface-pruning_20260314  
**Recorded:** 2026-03-14

## Confirmed drift

- `README.md` currently says it is not the master truth path and defers to `docs/root/TUTOR_STUDY_BUDDY_CANON.md`.
- Multiple active docs still describe the Tutor runtime differently from live code, especially around the wizard vs thin start surface.
- `docs/root/GUIDE_TUTOR_FLOW.md`, `docs/root/GUIDE_ARCHITECTURE.md`, `docs/root/TUTOR_OWNER_INTENT.md`, `docs/root/TUTOR_CATEGORY_DEFINITIONS.md`, `docs/root/TUTOR_METHOD_SELECTION_RULES.md`, and `docs/root/TUTOR_CONTROL_PLANE_CANON.md` still hold unique content and cannot be deleted safely without a migration map.
- The repo contains both:
  - `conductor/tracks/tutor-launch-shell-realignment_20260313/`
  - `conductor/tracks/tutor_launch_shell_realignment_20260313/`
- Repo-local planning surfaces still drift from the intended contract:
  - `.claude/commands/plan.md` tells the agent to read the project README or Constitution
  - `.codex/skills/planner/SKILL.md` still mentions `scripts/agent_task_board.py`
  - `.codex/skills/parallel-task/SKILL.md` still includes direct `agent_task_board.py` commands
  - several repo-local Conductor skills still require `metadata.json`
- `scripts/check_docs_sync.py` currently enforces the old canon topology and must be updated as part of the migration.

## Implementation consequence

The cleanup must be merge-first, reference-sweep-first, and validator-aware. Destructive deletes are late-wave work, not the first move.

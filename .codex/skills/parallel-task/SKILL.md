---
name: parallel-task
description: >
  Execute dependency-aware tasks from a plan using Codex subagents in parallel.
  Re-check unblocked tasks after each wave, enforce worker prompt quality, and
  validate outputs before integrating results.
---

# Parallel Task

Run plan execution as an orchestrator loop with explicit worker contracts.

## Context window strategy

- Keep the planning/orchestration context alive during implementation.
- Avoid resetting context before execution unless required.
- If remaining context is low (roughly <40%), compact strategically instead of restarting cold.

## Orchestrator responsibilities

The orchestrator is responsible for:

1. Tracking implementation state across all tasks.
2. Deciding when and how to launch workers.
3. Providing each worker complete task context.
4. Validating worker outputs before accepting completion.
5. Resolving conflicts and scheduling follow-up fixes.
6. Keeping the project continuously moving toward completion.

## Inputs required

- A plan with task IDs and dependency lists.
- Current task statuses. Prefer board-native statuses in this repo:
  - `todo`, `in_progress`, `blocked`, `done`
- If plan uses `pending/completed`, normalize as:
  - `pending -> todo`
  - `completed -> done`
- File ownership constraints (to avoid overlap).
- Mapping from plan IDs (`1.2`) to board IDs (`T-###`).

## Execution modes

Choose one mode before dispatch:

1. `swarm-waves` (default):
   - Launch one worker per currently unblocked task.
   - Best for accuracy, lower conflict rate, and predictable token usage.
2. `super-swarm`:
   - Launch as many workers as capacity allows, even with partial dependencies.
   - Best for speed, but higher conflict/rework risk.

When using `super-swarm`, explicitly set and monitor parallelism limits in config:

```toml
[agents]
max_threads = 16
```

If rate-limit (`429`) failures increase, reduce `max_threads`.

## Execution loop (swarm-waves)

Repeat until no `todo` tasks remain:

1. Identify unblocked tasks:
   - `todo`
   - All dependencies are `done`
2. Create an execution wave from unblocked tasks.
3. Launch workers in parallel for independent tasks.
4. Validate each worker result.
5. Mark task status and record blockers.
6. Recompute unblocked tasks.

## Execution loop (super-swarm)

Repeat until no `todo` tasks remain:

1. Select the highest-priority `todo` tasks up to configured worker capacity.
2. Launch workers in parallel with explicit conflict warnings and file boundaries.
3. Validate outputs and mark completion/blockers.
4. Queue conflict-resolution tasks for dependency/order issues.
5. Re-run selection until queue is exhausted.

## Worker prompt quality bar

Use `templates/worker_prompt_template.md`.

Prompt must include:

- Task ID and objective
- Exact file paths
- Plan path and relevant dependency context
- Constraints and non-goals
- Run policy:
  - `commit_mode: enabled|disabled` (default `disabled`)
  - `super_swarm_override: allowed|not_allowed`
- Required tests/verification
- Required output schema

If the prompt misses any of the above, regenerate it before dispatch.

## Validation rules

Do not trust summarized worker output by default.

Ask for:

- Full worker prompt used
- Full worker output

Reject worker output if it lacks:

- Artifacts changed (files and/or docs/notes)
- Verification evidence (commands or checklist)
- Plan status update evidence
- Task completion verdict

Persist worker artifacts for audit and recovery:

- `logs/agents/parallel_prompt_<task-or-wave>_<timestamp>.md`
- `logs/agents/parallel_output_<task-or-wave>_<timestamp>.md`

## Conflict management

- Prefer one writer per file per wave.
- If file overlap is unavoidable, serialize those tasks.
- Use follow-up fix tasks instead of silent overwrite.

Optional coordination with existing task board:

```powershell
python .\scripts\agent_task_board.py claim --task-id T-101 --agent codex-1 --role ui
python .\scripts\agent_task_board.py heartbeat --task-id T-101 --note "implementing"
python .\scripts\agent_task_board.py done --task-id T-101 --note "tests pass"
```

## Completion condition

Execution ends only when:

- All tasks are `done` or explicitly `blocked` with reasons.
- Remaining blockers are surfaced with next actions.
- Final integration checks pass.

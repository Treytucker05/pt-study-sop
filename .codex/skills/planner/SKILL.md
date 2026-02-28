---
name: planner
description: >
  Build a swarm-ready implementation plan with phases, task dependencies, explicit
  deliverables, and verification gates. Use when work is multi-step, spans many
  files, or can benefit from parallel Codex subagents.
---

# Planner

Generate plans that are immediately executable by an orchestrator and workers.

## When to use

- User asks for a plan.
- Work has 3+ steps.
- Work has independent tasks that can run in parallel.
- You want explicit dependency mapping before implementation.

## Core workflow

1. Restate objective, constraints, and out-of-scope items.
2. Gather context from repo files and existing docs.
3. Stop and ask clarifying questions when requirements are ambiguous.
4. Build a phase/task plan with explicit dependencies.
5. Validate the plan for swarm safety and token efficiency.

If `request_user_input` is unavailable in the current mode, ask the user directly.

## Required output format

Use `templates/swarm_plan_template.md` and fill every section.

Minimum requirements:

- 2+ phases when scope is non-trivial.
- Include an explicit dependency graph section.
- Every task has:
  - Status from `todo|in_progress|blocked|done` (normalize `pending/completed` to `todo/done` if needed)
  - Stable phase/task ID (`1.1`, `1.2`, ...)
  - Canonical dependency ID (`T1`, `T2`, ...) for graph readability
  - Optional task-board ID (`T-###`) when integrating with `scripts/agent_task_board.py`
  - Dependencies via `depends_on: []` (empty list when no prereqs)
  - Concrete file paths
  - Definition of done
  - Verification evidence:
    - command(s) for executable work, or
    - review checklist for coordination/research work
- Parallel groups are explicitly marked.

## Swarm readiness checks

Before finalizing the plan:

1. No task has implicit dependencies.
2. No two parallel tasks write the same file unless called out as conflict-prone.
3. Every task has a measurable completion check.
4. The first executable batch (unblocked tasks) is obvious.
5. The plan is orchestration-ready without hidden assumptions.

## Anti-drift rules

- Do not use generic task names like "Refactor code".
- Do not leave "investigate" tasks without concrete output.
- Do not hide risk. Add a "Risks and mitigations" section.
- Do not assume the orchestrator will infer missing context.
- Do not move forward when key stack/framework decisions are unresolved.

## Hand-off contract

When this plan will be executed with subagents, include:

- Worker prompt requirements (what context must be passed).
- Expected worker output shape.
- Rejection criteria for low-quality worker outputs.
- Mapping between phase/task IDs and task-board IDs (`T-###`) when a board is used.
  - Use an explicit mapping block/table.
  - Keep mapping 1:1 for active tasks.

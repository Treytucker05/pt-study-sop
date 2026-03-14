# Codex Subagent Implementation (Planner + Plan Harder + Parallel Task)

This repo now includes three Codex skills to run the workflow described in your notes:

- `planner`: build a dependency-aware plan
- `plan-harder`: run plan review with a worker and harden it
- `parallel-task`: execute unblocked tasks in parallel waves

## Skill locations

- `.codex/skills/planner/SKILL.md`
- `.codex/skills/plan-harder/SKILL.md`
- `.codex/skills/parallel-task/SKILL.md`

Template files:

- `.codex/skills/planner/templates/swarm_plan_template.md`
- `.codex/skills/plan-harder/templates/review_prompt_template.md`
- `.codex/skills/parallel-task/templates/worker_prompt_template.md`

## Recommended flow

1. Run `planner` to generate a phase/task plan with dependencies.
2. Run `plan-harder` to enforce second-opinion review.
3. Choose orchestration mode:
   - `swarm-waves` for accuracy and lower conflict rate.
   - `super-swarm` for maximum speed and higher conflict tolerance.
4. Execute with `parallel-task`.
5. After each wave, recompute unblocked tasks and repeat.

For this repo's standard swarm workflow, keep a required mapping table from plan IDs (`1.1`) to board IDs (`T-###`) and keep it 1:1 for active tasks.

Status model for orchestration:

- Board-native: `todo`, `in_progress`, `blocked`, `done`
- If a plan uses `pending/completed`, normalize to `todo/done` before dispatch.

## Validation commands to prevent hidden drift

Use these exact checks during orchestration:

- "Show me the full prompt you sent to each worker."
- "Show me the full worker output for each worker."

If either is missing or truncated for decision-making, reject and rerun that worker.

For `plan-harder` and `parallel-task`, persist those artifacts to disk (for example under `logs/agents/`).

## Context strategy

- Keep planning/orchestration context in-session during execution whenever possible.
- Avoid resetting context before implementation.
- If context becomes constrained (roughly <40% remaining), compact strategically.

## Front-loaded worker prompts

Use the worker template to pass complete context up front:

- Plan path and goal summary
- Dependencies and related tasks
- Exact file allowlist
- Acceptance criteria and validation requirements
- Explicit output schema and completion status

## `request_user_input` caveat

`request_user_input` is collaboration-mode dependent.

- If available, use it for concise clarifying multiple-choice prompts.
- If unavailable, ask the user directly in chat before continuing.

## Optional config reminder

If your environment supports collaboration feature flags, ensure they are enabled in your Codex config:

```toml
[features]
collab = true
collaboration_modes = true
multi_agent = true
voice_transcription = true
```

For higher parallelism:

```toml
[agents]
max_threads = 16
```

If you see `429` rate limits, reduce `max_threads`.

Optional profile-style example:

```toml
model = "<orchestrator-model>"
plan_mode_reasoning_effort = "xhigh"
model_reasoning_effort = "high"

[features]
collaboration_modes = true
multi_agent = true
voice_transcription = true

[agents]
max_threads = 16

[agents.worker_fast]
config_file = "agents/worker_fast.toml"
description = "Use for single-task execution from a structured plan."
```

## Notes on repo integration

- Existing parallel infrastructure in `scripts/` and `docs/SWARM_WORKFLOW.md` is preserved.
- `parallel-task` is intentionally orchestration guidance, not a replacement for your existing launch scripts.

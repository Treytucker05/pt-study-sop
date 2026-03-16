---
name: treys-swarm-planner-repo
description: >
  Apply treys-swarm-planner to the PT Study System by grounding in repo canon,
  the active execution board, Conductor tracks, planner APIs, and the
  `study_tasks` schema. Use when planning significant work in this repo or when
  converting a plan into Conductor and planner-backed execution tasks.
---

# Trey's Swarm Planner Repo Adapter

Use this skill after `treys-swarm-planner` when the planning target is
`C:\pt-study-sop`.

## Required grounding order

1. Root `AGENTS.md`
2. `docs/root/AGENT_SETUP.md`
3. `README.md`
4. `docs/root/GUIDE_DEV.md`
5. `docs/root/TUTOR_TODO.md`
6. Relevant code, APIs, schemas, tests, and existing track artifacts

## Canon drift gate

Before planning proceeds, explicitly check for drift across:

- `README.md`
- `docs/root/TUTOR_TODO.md`
- `conductor/tracks.md`
- relevant code and route ownership

If those sources disagree on product behavior, ownership, or the execution
surface, stop and surface the conflict before generating tasks.

## Review-only repo path

When the user provides an existing PT plan, track, or roadmap and asks for
review/tightening:

- do not regenerate the whole repo plan by default
- preserve valid task IDs, track structure, and accepted canon decisions
- emit a revised first unblocked wave and an execution readiness verdict
- only escalate to a full rebuild when the current plan fails validation or
  conflicts with repo canon

## Repo-specific planning rules

- `Brain` is the home route unless canon says otherwise.
- Do not start major implementation work until the scope is listed in the
  current sprint section of `docs/root/TUTOR_TODO.md`.
- Prefer `conductor/tracks/` for the durable spec and plan.
- Prefer the planner queue only for executable near-term tasks.
- Create or update a Conductor track before queue generation when the work is
  multi-phase, cross-subsystem, architecture-heavy, or explicitly track-scoped.
- Generate planner-backed tasks only after the revised plan is accepted and only
  for the first unblocked or near-term wave.
- Do not assume `scripts/agent_task_board.py` exists or is canonical.
- Do not create duplicate course, session, calendar, task, or shell systems
  when existing primitives already exist.

## Execution surface selector

Every accepted repo plan must choose exactly one of:

- `markdown-only-no-queue`
- `durable-track-only`
- `track-plus-wave-queue`

You must state:

- selected execution surface
- why that surface fits this repo task
- why the other two surfaces were rejected

Default review-only bias:

- choose `durable-track-only` unless the user explicitly asked for execution
  conversion and the revised first wave is truly unblocked

## Required repo outputs

Every accepted plan in this repo must state:

- final goal
- constraints and assumptions
- files/surfaces touched
- dependency graph
- validation gates
- first unblocked wave
- Conductor vs planner split
- execution surface selector outcome

## Repo-specific task metadata

Keep the shared task contract and add repo-facing meaning to:

- `blocked_reason`
  - use concrete repo blockers such as `canon drift`, `missing sprint item`,
    `track not created`, `no queue field mapping`, or `shared surface conflict`
  - for review-only requests, prefer critique-state blockers such as `await
    explicit execution request`, `revised first wave still blocked`, or
    `durable track remains the correct surface`
- `replan_trigger`
  - use concrete repo triggers such as user scope change, canon change, route
    ownership conflict, or new dependency discovered during execution
- `expected_evidence`
  - use track docs, passing commands, task conversion artifacts, or live proof

For review-only requests, `expected_evidence` should usually be:

- revised track docs
- a corrected first-wave verdict
- a validation/readiness decision rather than new implementation tasks
- an explicit blocker description that explains why queue conversion is still
  deferred

## Required review bar

- minimum 2 valid independent reviews
- preferred 3 reviews for architecture, migrations, or broad product work
- reviewer lenses should be diverse:
  - dependency/parallel review
  - validation/test review
  - canon/product review
- reject reviews that:
  - are vague or interrupted
  - ignore task IDs
  - skip required rubric categories
  - skip rollout or compatibility risk
  - rely on obsolete task-board assumptions

## Eval kit

Use the repo-local eval kit in [evals/](evals/) when tuning this adapter:

- benchmark representative PT planning prompts
- score mode fit, over-planning, first-wave correctness, canon alignment, and
  queue/track correctness
- preserve before/after examples in track evidence when the skill changes

## Use the references

- Use [reference.md](reference.md) for PT-specific grounding, Conductor usage,
  canon-drift gating, and planner field mapping.
- Use [examples.md](examples.md) for repo-specific planning/output examples.
- Use [review_prompt_template.md](review_prompt_template.md) for PT-specific
  review passes.
- Use [task_conversion_template.md](task_conversion_template.md) when mapping an
  accepted plan into `study_tasks`-backed planner tasks.

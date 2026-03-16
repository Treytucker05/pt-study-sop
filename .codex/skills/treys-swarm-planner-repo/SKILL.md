---
name: treys-swarm-planner-repo
description: >
  Apply treys-swarm-planner to the PT Study System by grounding in repo canon,
  the active execution board, Conductor tracks, planner APIs, and the
  `study_tasks` schema. Use when planning significant work in this repo and
  then executing it end-to-end with a backward-built wave/task graph until the
  goal is complete, unless the user explicitly asks for plan-only or
  review-only output.
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

If those sources disagree on product behavior, ownership, or execution shape:

- do not stop in review mode by default
- create an explicit `Phase 0: canon/sprint/track alignment` in the plan
- make the required doc, track, and sprint updates part of execution
- only stop when the conflict cannot be resolved safely from local repo truth or
  requires a user product decision

## Review-only repo path

Only stay review-only when the user explicitly asks for review, critique,
tightening, or plan-only output.

Otherwise:

- treat invocation of this skill as permission to plan in depth and execute
- preserve valid task IDs, track structure, and accepted canon decisions
- expand the plan into a full backward-built execution graph
- keep executing waves until the requested goal is complete or a real blocker is hit

## Repo-specific planning rules

- `Brain` is the home route unless canon says otherwise.
- Do not start major implementation work until the scope is listed in the
  current sprint section of `docs/root/TUTOR_TODO.md`. If it is missing, add
  it as part of Phase 0 and then continue.
- Prefer `conductor/tracks/` for the durable spec and plan.
- Prefer the planner queue for executable tasks and refresh it wave by wave.
- Create or update a Conductor track before queue generation when the work is
  multi-phase, cross-subsystem, architecture-heavy, or explicitly track-scoped.
- Treat explicit use of this skill as plan acceptance unless the user says
  `plan only`, `review only`, or equivalent.
- Generate planner-backed tasks for the current unblocked wave, execute them,
  then replan the next wave until done.
- Do not assume `scripts/agent_task_board.py` exists or is canonical.
- Do not create duplicate course, session, calendar, task, or shell systems
  when existing primitives already exist.

## Operating mode

This adapter uses one default operating mode:

- `deep-plan-then-execute`

That means:

- lock the goal and release proof first
- build the full detailed backward-built plan
- require a concrete completion gate for every task
- create or update the Conductor track as the durable system of record
- convert the first unblocked wave into executable tasks
- execute that wave
- refresh the dependency graph and execute the next unblocked wave
- continue until the requested goal is complete

Only deviate when the user explicitly asks for:

- review-only
- plan-only
- partial execution

## Required repo outputs

Every accepted plan in this repo must state:

- final goal
- constraints and assumptions
- files and surfaces touched
- dependency graph
- validation gates
- full phase and wave graph
- current unblocked wave
- Conductor vs planner split
- execution-loop assumptions
- concrete completion gates for every task

## Repo-specific task metadata

Keep the shared task contract and add repo-facing meaning to:

- `completion_gate`
  - use a real command, test, smoke check, checklist, or artifact review
  - do not leave it as `manual verification` without a named proof step
- `blocked_reason`
  - use concrete repo blockers such as `canon drift`, `missing sprint item`,
    `track not created`, `no queue field mapping`, `shared surface conflict`,
    or `await user product decision`
- `replan_trigger`
  - use concrete repo triggers such as user scope change, canon change, route
    ownership conflict, or new dependency discovered during execution
- `expected_evidence`
  - use track docs, passing commands, task conversion artifacts, live proof,
    and completion evidence for each executed wave

## Required review bar

- minimum 2 valid independent reviews
- preferred 3 reviews for architecture, migrations, or broad product work
- reviewer lenses should be diverse:
  - dependency and parallel review
  - validation and test review
  - canon and product review
- reject reviews that:
  - are vague or interrupted
  - ignore task IDs
  - skip required rubric categories
  - skip rollout or compatibility risk
  - rely on obsolete task-board assumptions

## Execution loop

After the plan is built and reviewed:

1. Create or update the Conductor track if needed.
2. Ensure the sprint board contains the work; if not, add it as part of Phase 0.
3. Convert the first unblocked wave into executable tasks.
4. Execute the wave directly or with subagents when that reduces drift.
5. Record results in the track and refresh blockers and dependencies.
6. Recompute the next unblocked wave.
7. Continue until the goal is complete.

Do not stop after the first wave unless:

- the user explicitly asked for partial execution
- a real blocker requires user input or a product decision
- a safety or repo-truth conflict makes continued execution unsafe

## Eval kit

Use the repo-local eval kit in [evals/](evals/) when tuning this adapter:

- benchmark representative PT planning prompts
- score backward-build integrity, scope discipline, execution continuity, canon alignment, and
  queue/track correctness
- preserve before and after examples in track evidence when the skill changes

## Use the references

- Use [reference.md](reference.md) for PT-specific grounding, Conductor usage,
  canon-drift resolution, execution-loop behavior, and planner field mapping.
- Use [examples.md](examples.md) for repo-specific planning and output examples.
- Use [review_prompt_template.md](review_prompt_template.md) for PT-specific
  review passes.
- Use [task_conversion_template.md](task_conversion_template.md) when mapping an
  accepted plan into `study_tasks`-backed planner tasks wave by wave during execution.

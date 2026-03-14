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
3. `docs/root/TUTOR_STUDY_BUDDY_CANON.md`
4. `docs/root/GUIDE_DEV.md`
5. `docs/root/TUTOR_TODO.md`
6. Relevant code, APIs, schemas, tests, and existing track artifacts

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
- Do not create duplicate course, session, calendar, or task systems when
  existing primitives already exist.

## Required repo outputs

Every accepted plan in this repo must state:

- final goal
- constraints and assumptions
- files/surfaces touched
- dependency graph
- verification gates
- first unblocked wave
- Conductor vs planner split:
  - what belongs in the durable plan
  - what belongs in queue-backed execution

## Required review bar

- minimum 2 valid independent reviews
- preferred 3 reviews for architecture, migrations, or broad product work
- reject reviews that:
  - are vague or interrupted
  - ignore task IDs
  - skip required rubric categories
  - skip rollout or compatibility risk
  - rely on obsolete task-board assumptions

## Use the references

- Use [reference.md](reference.md) for PT-specific grounding, Conductor usage,
  and planner field mapping.
- Use [examples.md](examples.md) for repo-specific planning/output examples.
- Use [review_prompt_template.md](review_prompt_template.md) for PT-specific
  review passes.
- Use [task_conversion_template.md](task_conversion_template.md) when mapping an
  accepted plan into `study_tasks`-backed planner tasks.

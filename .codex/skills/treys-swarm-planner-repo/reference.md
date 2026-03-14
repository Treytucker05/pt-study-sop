# PT Repo Reference

## 1. What to ground in

Before planning, confirm all of the following:

- root `AGENTS.md`
- `docs/root/AGENT_SETUP.md`
- `README.md`
- `docs/root/GUIDE_DEV.md`
- `docs/root/TUTOR_TODO.md`
- relevant code paths and tests
- existing Conductor track artifacts when the work is already track-scoped
- planner queue reality under `/api/planner/*` and `study_tasks`

## 2. Durable plan vs executable tasks

### Durable plan

Use Conductor for durable planning in this repo when the work is multi-phase,
cross-subsystem, architecture-heavy, long-running, or explicitly track-scoped.
Only use a lighter non-track planning artifact for smaller non-track work.

Use the durable planning artifact for:

- final goal
- constraints
- architecture decisions
- phase/task graph
- audit prompts/findings
- revised final plan

Recommended Conductor outputs:

- `spec.md` for the locked end-state and constraints
- `plan.md` for the dependency-aware task graph
- optional `review.md` or `audit.md` for preserved reviewer prompts/findings

### Executable tasks

Use the planner queue only for the first unblocked or near-term wave.

Do not dump the full roadmap into the queue.

## 3. When to create a track vs keep the plan lightweight

Create or update a Conductor track when the work is:

- multi-phase
- cross-subsystem
- architecture-heavy
- likely to span multiple sessions
- explicitly requested as track-scoped

Keep the plan lighter when the work is small but still non-trivial. In that
case, keep the planning artifact minimal, still respect `docs/root/TUTOR_TODO.md`,
and use `conductor/tracks/GENERAL/log.md` for non-track-scoped execution notes.

## 4. Queue generation gate

Only generate planner-backed tasks after:

1. the revised plan is accepted
2. the first unblocked wave is explicit
3. the queue item fields can be populated from real repo data

## 5. study_tasks field mapping

The queue is backed by `study_tasks`. Use only real fields that already exist.

Current planning-relevant fields:

- `course_id`
- `topic_id`
- `course_event_id`
- `scheduled_date`
- `planned_minutes`
- `status`
- `notes`
- `source`
- `priority`
- `review_number`
- `anchor_text`

When mapping plan tasks into queue items:

- use `planned_minutes` for the expected effort budget when the task is ready
  to execute
- use `priority` for execution order inside the current wave
- use `review_number` if a repeated review/attempt cycle matters
- put the parent plan task ID in `anchor_text` or `notes`
- preserve dependency notes in `notes` because the queue is flat
- keep verification commands/checklists in `notes`
- use `source` to record the durable plan artifact when available

## 6. Repo-specific anti-drift checks

Before accepting the plan, verify:

1. it does not drift from `README.md`
2. it does not redefine page ownership or product behavior in `TUTOR_TODO.md`
3. it does not invent obsolete task-board systems
4. it does not duplicate existing course/session/calendar/task primitives
5. it names the required tests, smoke checks, or manual proof gates

## 7. Review rubric additions for this repo

In addition to the base planner rubric, every review should check:

- canon drift
- sprint-board compliance
- Conductor/planner split quality
- run/build/test command correctness

Any review that is vague, interrupted, missing task IDs, missing rubric
categories, or missing an explicit verdict is invalid and does not count toward
the minimum review requirement.

Use [review_prompt_template.md](review_prompt_template.md) for repo-specific
reviews so these checks are not left implicit.

## 8. Recommended conversion pattern

1. Write or update the durable plan first.
2. Identify the first executable wave.
3. Convert only that wave into planner tasks.
4. Preserve parent IDs, dependencies, verification, and rollout notes.
5. Keep later waves in the durable plan until they are ready to execute.
6. Do not generate queue tasks for work whose `depends_on` chain is still
   blocked.

Use [task_conversion_template.md](task_conversion_template.md) when converting
accepted repo plans into `study_tasks`-backed planner tasks.

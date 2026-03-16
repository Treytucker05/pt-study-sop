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

## 2. Canon drift gate

Before choosing phases or execution surfaces, confirm:

- `README.md` matches the intended product behavior
- `docs/root/TUTOR_TODO.md` matches the intended active execution scope
- `conductor/tracks.md` does not claim a conflicting active/retired track
- the relevant route, API, or ownership code still matches the canon

If these do not align:

- stop and surface the conflict
- do not plan through the disagreement

## 3. Durable plan vs executable tasks

### Durable plan

Use Conductor for durable planning in this repo when the work is multi-phase,
cross-subsystem, architecture-heavy, long-running, or explicitly track-scoped.
Only use a lighter non-track planning artifact for smaller non-track work.

Use the durable planning artifact for:

- final goal
- constraints
- architecture decisions
- phase/task graph
- validation findings
- audit prompts/findings
- revised final plan

Recommended Conductor outputs:

- `spec.md` for the locked end-state and constraints
- `plan.md` for the dependency-aware task graph
- `review.md` or `audit.md` for preserved reviewer prompts/findings
- `validation-matrix.md` for required gates
- `evidence.md` for before/after proof when the planning surface itself changes

### Executable tasks

Use the planner queue only for the first unblocked or near-term wave.

Do not dump the full roadmap into the queue.

## 4. Execution surface selector

Choose exactly one of:

- `markdown-only-no-queue`
  - use when the repo has no appropriate queue mapping or the task is too small
- `durable-track-only`
  - use when the work is track-scoped but not yet ready for execution-task
    conversion
- `track-plus-wave-queue`
  - use when the revised plan is accepted and the first wave is truly unblocked

Do not leave this implied.

## 5. When to create a track vs keep the plan lightweight

Create or update a Conductor track when the work is:

- multi-phase
- cross-subsystem
- architecture-heavy
- likely to span multiple sessions
- explicitly requested as track-scoped

Keep the plan lighter when the work is small but still non-trivial. In that
case, keep the planning artifact minimal, still respect `docs/root/TUTOR_TODO.md`,
and use `conductor/tracks/GENERAL/log.md` for non-track-scoped execution notes.

## 6. Queue generation gate

Only generate planner-backed tasks after:

1. the revised plan is accepted
2. the first unblocked wave is explicit
3. the queue item fields can be populated from real repo data
4. the execution surface selector chose `track-plus-wave-queue`

## 7. study_tasks field mapping

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
- preserve `expected_evidence` in `notes`

## 8. Repo-specific anti-drift checks

Before accepting the plan, verify:

1. it does not drift from `README.md`
2. it does not redefine page ownership or product behavior in `TUTOR_TODO.md`
3. it does not invent obsolete task-board systems
4. it does not duplicate existing course/session/calendar/task primitives
5. it does not overload the wrong contract when a narrower repo-native contract
   is the safer fit
6. it names the required tests, smoke checks, or manual proof gates

## 9. Repo-specific replan triggers

Call for replanning when:

- canon changes while the plan is in progress
- the sprint board changes the active scope
- a new track already owns the same work
- queue field mapping turns out to be invalid
- the implementation surface reveals a duplicate-system risk

## 10. Review rubric additions for this repo

In addition to the base planner rubric, every review should check:

- canon drift
- sprint-board compliance
- Conductor/planner split quality
- execution surface selector quality
- run/build/test command correctness

Any review that is vague, interrupted, missing task IDs, missing rubric
categories, or missing an explicit verdict is invalid and does not count toward
the minimum review requirement.

Use [review_prompt_template.md](review_prompt_template.md) for repo-specific
reviews so these checks are not left implicit.

## 11. Recommended conversion pattern

1. Write or update the durable plan first.
2. Identify the first executable wave.
3. Choose the execution surface explicitly.
4. Convert only that wave into planner tasks when the surface is
   `track-plus-wave-queue`.
5. Preserve parent IDs, dependencies, verification, expected evidence, and
   rollout notes.
6. Keep later waves in the durable plan until they are ready to execute.
7. Do not generate queue tasks for work whose `depends_on` chain is still
   blocked.

Use [task_conversion_template.md](task_conversion_template.md) when converting
accepted repo plans into `study_tasks`-backed planner tasks.

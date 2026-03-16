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

Before choosing phases or task waves, confirm:

- `README.md` matches the intended product behavior
- `docs/root/TUTOR_TODO.md` matches the intended active execution scope
- `conductor/tracks.md` does not claim a conflicting active or retired track
- the relevant route, API, or ownership code still matches the canon

If these do not align:

- do not stop by default
- create a `Phase 0: canon/sprint/track alignment`
- fix the disagreement as executable work before the main feature waves
- only stop when the disagreement cannot be resolved safely from local repo truth
  or needs a user product decision

## 3. Durable plan plus execution

Use Conductor for durable planning in this repo when the work is multi-phase,
cross-subsystem, architecture-heavy, long-running, or explicitly track-scoped.
Only use a lighter non-track planning artifact for smaller non-track work.

Use the durable planning artifact for:

- final goal
- constraints
- architecture decisions
- full phase and wave graph
- validation findings
- audit prompts and findings
- revised final plan
- execution progress and completion state

Recommended Conductor outputs:

- `spec.md` for the locked end-state and constraints
- `plan.md` for the dependency-aware task graph
- `review.md` or `audit.md` for preserved reviewer prompts and findings
- `validation-matrix.md` for required gates
- `evidence.md` for before and after proof when the planning surface itself changes

## 4. Executable task waves

Use the planner queue for the current unblocked wave.
Execute the wave, refresh the dependency graph, then generate the next wave.

Do not dump the whole roadmap into the queue at once unless the queue consumer
actually needs every wave immediately and all dependencies are satisfied.

## 5. Operating mode

Default operating mode is `deep-plan-then-execute`.

That means:

1. Ground in canon and repo truth.
2. Lock the goal and release proof first.
3. Build the full detailed backward-built plan.
4. Give every task a concrete completion gate before it can count as done.
5. Create or update the durable Conductor track.
6. Convert the first unblocked wave into executable tasks.
7. Execute that wave.
8. Refresh blockers, evidence, and the next-wave verdict.
9. Continue until the goal is complete.

Only switch to review-only or plan-only when the user explicitly asks for it.

## 6. When to create a track vs keep the plan lightweight

Create or update a Conductor track when the work is:

- multi-phase
- cross-subsystem
- architecture-heavy
- likely to span multiple sessions
- explicitly requested as track-scoped

Keep the plan lighter when the work is small but still non-trivial. In that
case, keep the planning artifact minimal, still respect `docs/root/TUTOR_TODO.md`,
and use `conductor/tracks/GENERAL/log.md` for non-track-scoped execution notes.

## 7. Queue generation gate

Generate planner-backed tasks after:

1. the full revised plan exists
2. the current unblocked wave is explicit
3. every selected task has a concrete completion gate
4. the queue item fields can be populated from real repo data
5. the execution wave has satisfied its `depends_on` chain

If a blocker remains, keep it in the durable plan and do not queue it yet.

## 8. study_tasks field mapping

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
- use `review_number` if a repeated review or attempt cycle matters
- put the parent plan task ID in `anchor_text` or `notes`
- preserve dependency notes in `notes` because the queue is flat
- keep completion gates and named proof steps in `notes`
- use `source` to record the durable plan artifact when available
- preserve `expected_evidence` in `notes`

## 9. Repo-specific anti-drift checks

Before accepting the plan and before executing each wave, verify:

1. it does not drift from `README.md`
2. it does not redefine page ownership or product behavior in `TUTOR_TODO.md`
3. it does not invent obsolete task-board systems
4. it does not duplicate existing course, session, calendar, task, or shell primitives
5. it does not overload the wrong contract when a narrower repo-native contract is safer
6. it names the required tests, smoke checks, or manual proof gates
7. every task includes a concrete completion gate instead of generic manual verification

## 10. Repo-specific replan triggers

Call for replanning when:

- canon changes while the plan is in progress
- the sprint board changes the active scope
- a new track already owns the same work
- queue field mapping turns out to be invalid
- the implementation surface reveals a duplicate-system risk
- a completed wave exposes a different critical path than expected

## 11. Review rubric additions for this repo

In addition to the base planner rubric, every review should check:

- whether the plan preserves repo canon
- whether the sprint board is respected or repaired in Phase 0
- whether the Conductor and planner split is correct
- whether execution can continue wave by wave without dead ends
- whether run, build, and test commands are correct

Any review that is vague, interrupted, missing task IDs, missing rubric
categories, or missing an explicit verdict is invalid and does not count toward
the minimum review requirement.

Use [review_prompt_template.md](review_prompt_template.md) for repo-specific
reviews so these checks are not left implicit.

## 12. Recommended execution pattern

1. Write or update the durable plan first.
2. Identify the first executable wave.
3. Convert only that wave into planner tasks.
4. Execute the wave.
5. Record evidence and refresh the durable plan.
6. Queue the next unblocked wave.
7. Continue until the goal is complete.

Use [task_conversion_template.md](task_conversion_template.md) when converting
accepted repo plans into `study_tasks`-backed planner tasks during execution.

# PT Repo Task Conversion

Convert the current explicit unblocked wave into planner tasks, execute it,
then repeat for the next wave until the goal is complete.
If any precondition below is `no`, keep that work in the durable plan and do not
queue it yet.

Preconditions:

- Full revised plan exists: `yes|no`
- Current unblocked wave explicitly selected: `yes|no`
- Validation gate passed for this wave: `yes|no`
- Every selected task has a concrete completion gate: `yes|no`
- Queue item fields mappable to real `study_tasks` fields: `yes|no`
- Every selected task has satisfied `depends_on`: `yes|no`
- User explicitly requested plan-only or review-only: `yes|no`

## Durable plan context
- Durable planning surface:
- Durable artifact path:
- Parent phase:
- Parent wave:
- Parent plan task ID:

## Planner queue output
- Queue task title:
- Wave:
- Unblocked reason:
- Excluded blocked tasks:
- `course_id`:
- `topic_id`:
- `course_event_id`:
- `scheduled_date`:
- `planned_minutes`:
- `status`:
- `notes`:
- `source`:
- `priority`:
- `review_number`:
- `anchor_text`:

## Required notes content
- dependency notes when queue is flat
- completion gates and named proof steps
- `expected_evidence`
- rollout or rollback caution when relevant
- next-wave trigger when this task completes

## Execute Then Recompute

After the queued wave is executed:

1. record completion evidence in the durable plan or track
2. update blocked and unblocked task state
3. identify the next executable wave
4. convert the next wave into planner tasks
5. continue until the goal is complete

## Stop Instead Of Convert

If `User explicitly requested plan-only or review-only` is `yes`, stop after the
durable plan and wave breakdown.

If any selected task still has an unsatisfied dependency, leave it in the
durable plan and do not queue it yet.

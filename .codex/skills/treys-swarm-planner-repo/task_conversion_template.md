# PT Repo Task Conversion

Only convert the first explicit unblocked wave. Stop after that wave.
If any precondition below is `no`, do not generate planner tasks yet.

Preconditions:

- Revised plan accepted: `yes|no`
- First unblocked wave explicitly selected: `yes|no`
- Queue item fields mappable to real `study_tasks` fields: `yes|no`
- Every selected task has satisfied `depends_on`: `yes|no`

## Durable plan context
- Durable planning surface:
- Durable artifact path:
- Parent phase:
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
- verification commands/checklists
- rollout or rollback caution when relevant

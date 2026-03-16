# Examples

## Example 1: New track-scoped feature

Use this adapter when the user asks for a major feature plan in this repo.

Expected result:

1. Ground in repo canon and the current sprint board.
2. Run the canon-drift gate.
3. Decide whether a new Conductor track is needed.
4. Produce the full backward-built plan with task IDs, validation, and
   execution-surface selection.
5. Run 2 or more valid reviews with diverse lenses.
6. Revise the plan.
7. Convert only the first executable wave into planner-backed tasks if the
   selected surface is `track-plus-wave-queue`.

## Example 2: Small but non-trivial repo improvement

If the work is not track-scoped:

1. still ground in canon and the current sprint board
2. run the canon-drift gate first
3. add the scope to the active sprint before major implementation work
4. choose `markdown-only-no-queue` or `durable-track-only`
5. avoid track-plus-queue unless there is a real first-wave execution need

## Example 3: Plan review request

If the user already has a draft plan:

1. normalize it to the planner format
2. audit it against canon, validation, dependencies, and verification gaps
3. revise it into the accepted final plan
4. call out the first unblocked wave explicitly
5. call out whether the plan should stay durable-only or become queue-ready

## Example 4: Canon-conflict request

If the requested plan contradicts `README.md` or the active sprint board:

1. stop at the canon-drift gate
2. surface the conflicting sources
3. do not produce execution tasks until the conflict is resolved

## Example 5: Review-only repo track tightening

If the user asks to review and tighten an existing PT track or roadmap:

1. keep the request in the review-only path
2. validate canon, task IDs, and first-wave readiness before rebuilding
3. preserve valid track structure
4. default to `durable-track-only`
5. only produce queue-ready output if the user explicitly asks for it and the
   revised first wave is truly unblocked

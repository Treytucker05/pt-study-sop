# Examples

## Example 1: New track-scoped feature

Use this adapter when the user asks for a major feature plan in this repo.

Expected result:

1. Ground in repo canon and the current sprint board.
2. Decide whether a new Conductor track is needed.
3. Produce the full backward-built plan with task IDs and verification.
4. Run 2 or more valid reviews.
5. Revise the plan.
6. Convert only the first executable wave into planner-backed tasks if the user
   wants queue-ready execution.

## Example 2: Small but non-trivial repo improvement

If the work is not track-scoped:

1. still ground in canon and the current sprint board
2. add the scope to the active sprint before major implementation work
3. keep the durable planning artifact lightweight
4. convert the immediate wave into structured tasks or planner queue tasks

## Example 3: Plan review request

If the user already has a draft plan:

1. normalize it to the planner format
2. audit it against canon, dependencies, and verification gaps
3. revise it into the accepted final plan
4. call out the first unblocked wave explicitly

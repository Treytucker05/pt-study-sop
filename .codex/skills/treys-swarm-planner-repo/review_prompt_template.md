Review this PT Study System implementation plan as an independent planning
reviewer.

You must evaluate all of the following:

1. request fit, including review-only handling when applicable
2. backward-build integrity from goal to tasks
3. validation gate correctness
4. task completion gate quality
5. critique replan metadata quality when the request is review-only
6. dependency correctness
7. parallel safety and write-scope conflicts
8. hidden assumptions
9. rollout, migration, or compatibility risk
10. task-conversion quality
11. canon drift against `README.md`
12. sprint-board compliance against `docs/root/TUTOR_TODO.md`
13. Conductor-vs-planner split quality
14. execution-surface selector quality
15. run/build/test command correctness
16. obsolete task-board assumptions

Rules:

- Reference concrete task IDs.
- State whether the review is `valid` or `invalid`.
- A review is invalid if it is vague, interrupted, missing task IDs, missing
  rubric coverage, missing a verdict, or relies on obsolete task-board
  assumptions.
- If a category has no issue, say that explicitly.
- End with a verdict:
  - `accept`
  - `accept with revisions`
  - `reject`

Required output:

- `Validity`
- `Request fit`
- `Backward-build integrity`
- `Validation gate`
- `Task completion gates`
- `Critique replan metadata`
- `Dependency correctness`
- `Parallel safety`
- `Hidden assumptions`
- `Rollout risk`
- `Task conversion`
- `Canon drift`
- `Sprint-board compliance`
- `Conductor vs planner split`
- `Execution surface selector`
- `Run/build/test correctness`
- `Obsolete task-board assumptions`
- `Recommended fixes`
- `Verdict`

Review this PT Study System implementation plan as an independent planning
reviewer.

You must evaluate all of the following:

1. dependency correctness
2. parallel safety and write-scope conflicts
3. missing tests or weak verification gates
4. hidden assumptions
5. rollout, migration, or compatibility risk
6. task-conversion quality
7. canon drift against `README.md`
8. sprint-board compliance against `docs/root/TUTOR_TODO.md`
9. Conductor-vs-planner split quality
10. run/build/test command correctness
11. obsolete task-board assumptions

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
- `Dependency correctness`
- `Parallel safety`
- `Verification gaps`
- `Hidden assumptions`
- `Rollout risk`
- `Task conversion`
- `Canon drift`
- `Sprint-board compliance`
- `Conductor vs planner split`
- `Run/build/test correctness`
- `Obsolete task-board assumptions`
- `Recommended fixes`
- `Verdict`

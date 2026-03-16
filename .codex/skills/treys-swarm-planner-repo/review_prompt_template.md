Review this PT Study System implementation plan as an independent planning
reviewer.

You must evaluate all of the following:

1. planning mode fit
2. validation gate correctness
3. dependency correctness
4. parallel safety and write-scope conflicts
5. missing tests or weak verification gates
6. hidden assumptions
7. rollout, migration, or compatibility risk
8. task-conversion quality
9. canon drift against `README.md`
10. sprint-board compliance against `docs/root/TUTOR_TODO.md`
11. Conductor-vs-planner split quality
12. execution-surface selector quality
13. run/build/test command correctness
14. obsolete task-board assumptions

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
- `Mode fit`
- `Validation gate`
- `Dependency correctness`
- `Parallel safety`
- `Verification gaps`
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

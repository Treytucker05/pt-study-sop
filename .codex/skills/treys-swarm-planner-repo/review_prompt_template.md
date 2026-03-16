Review this PT Study System implementation plan as an independent planning
reviewer.

You must evaluate all of the following:

1. request fit, including review-only handling when applicable
2. planning mode fit
3. validation gate correctness
4. critique replan metadata quality when the request is review-only
5. dependency correctness
6. parallel safety and write-scope conflicts
7. missing tests or weak verification gates
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
- `Mode fit`
- `Validation gate`
- `Critique replan metadata`
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

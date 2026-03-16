# Benchmark Set

## Case 1: Simple one-wave task

Prompt:

`Plan a safe update to one frontend component and one matching test. No queue conversion needed.`

Expected emphasis:

- choose `single-pass` or `sequential`
- reject heavy swarm mode

## Case 2: Cross-subsystem feature

Prompt:

`Plan a backend/frontend Tutor feature that needs a Conductor track and only the first wave queue-ready.`

Expected emphasis:

- choose a heavier mode only if justified
- choose `track-plus-wave-queue`

## Case 3: Plan-review-only request

Prompt:

`Review this existing implementation plan, tighten it, and identify the first unblocked wave.`

Expected emphasis:

- no unnecessary new execution work
- validation gate before critique

## Case 4: Queue-conversion request

Prompt:

`Convert the accepted first wave of this plan into planner-backed tasks only.`

Expected emphasis:

- preserve only the first unblocked wave
- withhold blocked later waves

## Case 5: Canon-conflict request

Prompt:

`Plan a Tutor feature that changes page ownership in a way that conflicts with README and the current sprint board.`

Expected emphasis:

- stop at canon-drift gate
- surface the conflict instead of planning through it

## Case 6: Stop-instead-of-plan request

Prompt:

`Make a swarm plan for a tiny one-file typo fix.`

Expected emphasis:

- downgrade immediately
- explain why swarm mode is overkill

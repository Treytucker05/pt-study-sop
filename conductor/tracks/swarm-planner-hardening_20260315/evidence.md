# Evidence: Swarm Planner Hardening

## Shared Skill Backup

- Backup path: `C:\Users\treyt\.agents\backups\swarm-planner-hardening_20260315\treys-swarm-planner`
- Review-only experiment backup: `C:\Users\treyt\.agents\backups\swarm-planner-review-only_20260316\treys-swarm-planner`

## Benchmark Prompts Captured

1. Simple one-wave task: "Update one frontend component and one test with no queue conversion."
2. Cross-subsystem feature: "Plan a backend/frontend Studio feature with a Conductor track and only the first wave queue-ready."
3. Plan-review-only request: "Audit this existing implementation plan and revise it."
4. Queue-conversion request: "Convert the accepted first wave into planner-backed tasks only."
5. Canon-conflict request: "Plan a feature that conflicts with README and the current sprint board."
6. Stop-instead-of-plan request: "Make a swarm plan for a tiny one-file typo fix."

## Before / After Sample Expectations

### Small task

- Before:
  - planner often emitted the full swarm structure without first justifying whether a lighter mode was enough
- After:
  - planner must emit `Planning mode selection`
  - planner must choose `single-pass` or `sequential`
  - planner must explicitly reject full swarm mode as overkill

### Broad repo task

- Before:
  - review and validation were effectively blended
  - execution-surface decisions were sometimes implied rather than explicit
- After:
  - planner emits a `Validation gate` before review
  - repo adapter emits one explicit execution surface selector outcome
  - task rows include `parallel_safety_class`, `blocked_reason`, `replan_trigger`, and `expected_evidence`

### Canon-conflict task

- Before:
  - the planner review rubric could catch canon drift, but the front-door planning contract did not force an early stop
- After:
  - repo adapter requires a canon-drift gate before planning proceeds
  - unresolved conflicts become stop conditions rather than review-only findings

## Sample Output Deltas

### Prompt 1: small one-wave task

Before sample shape:

```text
Goal
Constraints
Out of scope
Assumptions
Phases and tasks
Parallel batches
Dependency graph
Audit prompts/findings
Revised final plan
First unblocked wave
```

After sample shape:

```text
Goal
Constraints
Out of scope
Assumptions
Planning mode selection
- Mode: single-pass
- Why lighter modes were rejected: n/a
Validation gate
- First-wave truly unblocked: pass
Phases and tasks
- Parallel safety class: parallel-safe
- Blocked reason: none
- Replan trigger: user scope change
- Expected evidence: passing focused test
```

### Prompt 2: broad repo task

Before sample shape:

```text
Conductor vs planner split
- durable plan in Conductor
- first wave maybe queue-ready
Audit prompts/findings
```

After sample shape:

```text
Canon drift gate
- README/TUTOR_TODO/code alignment: pass
Execution surface selector
- Selected: track-plus-wave-queue
- Why this surface fits: first wave is explicit and queue-mappable
Validation gate
- Queue/track mapping valid when applicable: pass
Audit prompts/findings
- Review 1 lens: dependency/parallel
- Review 2 lens: validation/test
- Review 3 lens: canon/product
```

### Prompt 3: canon-conflict request

Before sample shape:

```text
Audit prompts/findings
- canon drift against README
Verdict: accept with revisions
```

After sample shape:

```text
Canon drift gate
- README vs request: conflict
- TUTOR_TODO vs request: conflict
Stop rules
- Stop condition: unresolved canon conflict
First unblocked wave
- none until the canon conflict is resolved
```

## Baseline Follow-Up

- The first durable benchmark run is recorded in [baseline-scorecard.md](./baseline-scorecard.md).
- Highest-scoring cases:
  - cross-subsystem feature
  - queue-conversion request
  - canon-conflict request
- Lowest-scoring case:
  - plan-review-only request
- Follow-on target:
  - shorten the planner shape when the job is review/tightening rather than net-new execution planning

## Review-Only Experiment Follow-Up

- The next measured experiment is recorded in [review-only-experiment-scorecard.md](./review-only-experiment-scorecard.md).
- Core change:
  - added an explicit review-only path so existing-plan critique requests stop behaving like blank-sheet roadmap generation
- Supplemental benchmark additions:
  - `Case 7: Review-only repo track tightening`
  - `Case 8: Review-only queue-pressure request`
- Expected win condition:
  - improve `Case 3` from `6 / 10` to at least `8 / 10` without regressing the strongest existing cases

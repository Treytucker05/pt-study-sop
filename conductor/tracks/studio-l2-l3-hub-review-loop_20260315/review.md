# Review: Studio L2/L3 Hub + Review Loop

## Review A

- Validity: valid
- Dependency correctness: valid after separating the L2 overview contract (`SCLR-100` to `SCLR-210`) from the L3 review-loop mutation work (`SCLR-300` to `SCLR-330`).
- Parallel safety: `SCLR-100` and `SCLR-300` both write `api_tutor_studio.py` and must stay serial. `SCLR-200` is safe only after `SCLR-110`.
- Verification gaps: `dashboard_rebuild/client/src/__tests__/api.test.ts` must cover the new overview method, not just the UI tests.
- Hidden assumptions: course-scoped card drafts must be resolved server-side instead of reusing `deckName` heuristics.
- Rollout risk: accidental contract drift into `hub` or `project-shell` would break existing shell expectations; resolved by a dedicated Studio overview endpoint.
- Task conversion: convert only the L2 wave into executable work first.
- Verdict: accept with revisions

## Review B

- Validity: valid
- Dependency correctness: `SCLR-210` must depend on the overview contract landing first, and `SCLR-900` must stay after both the L2 UI/tests and any README sync.
- Parallel safety: L2 frontend work is safe in parallel with future L3 backend work only after `SCLR-100`; during this first wave, the plan is safely linear.
- Verification gaps: route integration should stay covered so `Open Project` still lands in L2 instead of regressing to L3.
- Hidden assumptions: `StudioPrepMode` is not part of L2 scope and should only be touched if tests prove a regression.
- Rollout risk: stale README L2/L3 text could drift further if closeout docs are skipped.
- Task conversion: bootstrap/docs tasks should stay in the durable plan, not the planner queue, until accepted.
- Verdict: accept with revisions

## Review C

- Validity: valid
- Dependency correctness: the first executable wave is correctly bounded to L2.
- Parallel safety: no unresolved write-scope conflicts in the accepted first wave.
- Verification gaps: live `/tutor?mode=studio` proof must be retained because the shell entry behavior is user-visible and already had a prior regression.
- Hidden assumptions: the repo already has `study_tasks` and `/api/planner/*`, so the plan must explicitly state why queue conversion is deferred.
- Rollout risk: `studio_item_revisions` and `studio_actions` should be activated before inventing new persistence primitives.
- Task conversion: use Conductor for the full roadmap and defer queue generation until the first wave is accepted and explicit.
- Verdict: accept with revisions

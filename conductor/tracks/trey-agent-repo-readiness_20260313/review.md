# Review Notes: Harness Engineering Readiness

**Track ID:** trey-agent-repo-readiness_20260313  
**Status:** Independent review complete and incorporated

## Review prompt basis

- Repo-local prompt path is missing in this checkout:
  - `C:\pt-study-sop\.codex\skills\treys-swarm-planner-repo\review_prompt_template.md`
- Shared fallback prompt used for valid reviews:
  - `C:\Users\treyt\.agents\skills\treys-swarm-planner\templates\review_prompt_template.md`

## Review summary

- Valid reviews recorded: `2`
- Invalid reviews recorded: `1`
- Acceptance rule met: `yes`
- Plan status after revision: `accepted with incorporated revisions`

## Valid review 1: Leibniz

- Validity: `valid`
- Verdict: `reject`
- Accepted issues:
  - `T2` and `findings.md` were stale and needed an explicit disk-truth refresh.
  - `T3`, `T4`, and `T5` were not actually parallel-safe because they all wrote the same planning/doc surfaces.
  - `T6` through `T13` needed stronger verification gates around operator-launch regression, deterministic failure modes, hermeticity, artifact stability, and per-agent proof.
  - The plan needed to stop referencing missing repo-local task-conversion support files and use the shared fallback template path instead.

## Valid review 2: Turing

- Validity: `valid`
- Verdict: `accept with revisions`
- Accepted issues:
  - `T4` must depend on the shared harness contract and env/bootstrap contract, not only `T2`.
  - `T13` must depend on the stabilized command and artifact surfaces, not only the compatibility matrix.
  - `T9` and `T11` need explicit redaction requirements so harness artifacts do not leak repo-local secrets or paths.
  - `T12` needs an OS-aware CI verification strategy because the current workflow spans Windows and Ubuntu.
- Not adopted:
  - the claim that `docs/root/AGENT_BOARD.md` exists was contradicted by local disk checks during plan revision.

## Invalid review: Locke

- Validity: `invalid`
- Verdict: `reject`
- Reason not adopted:
  - the review contradicted local disk state on multiple grounding points, including the existence of `docs/root/AGENT_BOARD.md` and several worktree/bootstrap scripts.
  - useful dependency cautions overlapped with the valid reviews and were already captured there.

## Incorporated revisions

- Refreshed `findings.md` against actual disk state.
- Re-scoped `T1` so the completed planning work stays isolated from active tutor/layout coordination files.
- Serialized the contract-freeze phase instead of claiming a parallel batch for `T3` to `T5`.
- Tightened dependencies across `T4`, `T6`, `T12`, `T13`, `T14`, and `T16`.
- Replaced missing repo-local review/task-conversion template references with the shared fallback template paths.
- Strengthened verification gates for operator-launch regression, deterministic failure exits, hermetic fixture proof, artifact stability, redaction, CI platform split, and stored cross-agent evidence.

# Track: Swarm Planner Hardening

- Spec: [./spec.md](./spec.md)
- Plan: [./plan.md](./plan.md)
- Review: [./review.md](./review.md)
- Validation: [./validation-matrix.md](./validation-matrix.md)
- Evidence: [./evidence.md](./evidence.md)
- Baseline Scorecard: [./baseline-scorecard.md](./baseline-scorecard.md)
- Review-Only Experiment: [./review-only-experiment-scorecard.md](./review-only-experiment-scorecard.md)
- Review-Only Metadata Refinement: [./review-only-metadata-refinement-scorecard.md](./review-only-metadata-refinement-scorecard.md)
- Single-Mode Baseline Reset: [./single-mode-baseline-reset.md](./single-mode-baseline-reset.md)

## Status

- Created: 2026-03-15
- Closed: 2026-03-15
- Current phase: complete
- Immediate focus: none

## Notes

- Shared reusable skill authority remains `C:\Users\treyt\.agents\skills`.
- The PT adapter remains repo-local under `.codex/skills/treys-swarm-planner-repo/`.
- `trey-autoresearch` was used as the tuning model for the planner loop, but its own skill package stayed unchanged.
- A filesystem backup of the pre-change shared planner skill was captured at `C:\Users\treyt\.agents\backups\swarm-planner-hardening_20260315\treys-swarm-planner`.
- The first benchmark baseline was captured on 2026-03-16 and recorded in `baseline-scorecard.md`.
- The next tuning experiment focused on review-only plan handling and is recorded in `review-only-experiment-scorecard.md`.
- A follow-up refinement tightened critique metadata wording and is recorded in `review-only-metadata-refinement-scorecard.md`.
- A later contract change collapsed the planner to one backward-built operating mode and reset the benchmark rubric; that transition is recorded in `single-mode-baseline-reset.md`.

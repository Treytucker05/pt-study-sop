Goal (incl. success criteria):
- Complete the remaining Ralph stories (US-006..US-020) for the Scholar loop integration run, producing the required reports/artifacts and keeping the loop wired to improvements.

Constraints/Assumptions:
- Follow `AGENTS.md` and keep changes minimal.
- Required checks: `python -m pytest brain/tests`, `python scripts/release_check.py`.
- Checks run (US-007..US-020): `python -m pytest brain/tests`, `python scripts/release_check.py`.
- Stay on current branch; avoid staging unrelated changes.

Key decisions:
- Proceeded in the recommended order and completed US-007..US-020.

State:
  - Done:
    - US-001..US-005 completed (contracts/health/questions/proposals mapping).
    - US-006 completed (digests lifecycle report).
    - US-007..US-020 completed (loop lifecycle, gaps, plan, proposals, cadence, digest).
  - Now:
    - Review the generated artifacts and decide next implementation steps.
  - Next:
    - Approve proposals and schedule implementation changes if desired.

Open questions (UNCONFIRMED if needed):
- None.

Working set (files/ids/commands):
- `scripts/ralph/prd.json`
- `scripts/ralph/progress.txt`
- `scholar/outputs/reports/`
- `scholar/outputs/gap_analysis/`
- `scholar/outputs/plans/scholar_upgrade_plan.md`
- `scholar/outputs/promotion_queue/proposal_2026-01-12_scholar_loop_integration.md`
- `scholar/outputs/digests/scholar_loop_integration_digest_2026-01-12.md`
- `CONTINUITY.md`

# Plan: Repo Truth Surface Pruning

**Track ID:** repo-truth-surface-pruning_20260314  
**Status:** Complete

- [x] T0: Claim the track on live coordination surfaces and create durable artifacts.
- [x] T1: Build the keep/merge/delete matrix and section-level migration map for every candidate deletion file.
- [x] T2: Run a repo-wide reference sweep for deleted-path candidates, duplicate track paths, `agent_task_board.py`, and `metadata.json` assumptions.
- [x] T3: Promote `README.md` into the top-level repo truth file and fold in the surviving product/system contract.
- [x] T4: Merge runtime/reference detail into `docs/root/PROJECT_ARCHITECTURE.md` and reduce `docs/root/GUIDE_DEV.md` to command-only guidance.
- [x] T5: Move surviving owner/product/control-plane rules into `README.md`, `docs/root/PROJECT_ARCHITECTURE.md`, or `sop/library/17-control-plane.md`.
- [x] T6: Rewire active docs, validators, and Conductor surfaces to the README-first truth order.
- [x] T7: Align repo-local planning skills and `.claude/commands/plan.md` to the new truth order and markdown-first track contract.
- [x] T8: Delete merged-away docs and the duplicate underscore Tutor launch track after reference cleanup passes.
- [x] T9: Run validation, sync closeout surfaces, and record final notes.

## Final validation

- `python scripts/check_docs_sync.py` -> PASS
- `git diff --check` -> PASS (CRLF/LF warnings only)
- planner surface sweep -> only the intentional negative note in `treys-swarm-planner-repo`

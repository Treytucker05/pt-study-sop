# Track: Repo Truth Surface Pruning

> Track artifact. `README.md` is the top-level repo truth target for this cleanup.
> Use this folder for implementation evidence, migration maps, and closeout history.

**ID:** repo-truth-surface-pruning_20260314  
**Status:** Complete

## Documents

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Findings](./findings.md)
- [Review Notes](./review.md)

## Scope

- Promote `README.md` into the master repo truth file.
- Merge redundant active truth docs down to the minimum working set.
- Align repo-local planning skills and command shims to the README-first truth order.
- Delete stale conflicting docs and the duplicate Tutor launch track only after migrations and reference sweeps pass.

## Outcome

- `README.md` is now the single top-level repo truth file.
- Redundant active truth docs were merged away and deleted.
- Repo-local planning entrypoints now ground in `README.md` and no longer require legacy task-board assumptions.
- The duplicate underscore Tutor launch track artifacts were removed.

## Validation

- `python scripts/check_docs_sync.py`
- `git diff --check`
- targeted `rg` sweeps for retired doc paths, duplicate track paths, and stale planning assumptions

## Links

- [Back to Tracks](../../tracks.md)
- [Execution Board](../../../docs/root/TUTOR_TODO.md)
- [Agent Board](../../../docs/root/AGENT_BOARD.md)

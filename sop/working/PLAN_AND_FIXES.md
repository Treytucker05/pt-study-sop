# Plan and Fixes (v9.2)

## Current Issues
- Keep release `v9.1/` frozen while testing and iterating inside the active `v9.2/` workspace.
- Finalize the promotion steps so `v9.2/` becomes the primary working system without losing historical references.

## Suggested Fixes
- Move legacy releases (v9.1 and older) into `sop/legacy/` and maintain `v9.2/` as the active build.
- Once validations are complete, update root documentation to point at the `sop/` working system and package `v9.2/` for release.

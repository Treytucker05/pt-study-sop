# Review - Tutor UI Stabilization Loop

## Why a separate track exists

The staged Tutor workflow backbone is complete, but live page inspection still shows shell-state and navigation regressions that are user-visible and high-severity. This work is stabilization, not a new architecture pass, so it should not reopen the completed workflow tracks.

## Backward-built reasoning

- The stop condition is a stable live UI, not more code.
- The fastest path is a tight loop over the same fixed route set.
- Iteration 1 must start with shell-state and transition defects because they contaminate every downstream page impression.

## Iteration 1 scope check

Included:
- Brain handoff initialization
- Tutor shell restore and auto-resume gating
- Tutor chrome visibility gating
- stage/view scroll reset

Excluded:
- full visual polish
- unrelated Studio work
- new feature additions
- speculative Launch redesign

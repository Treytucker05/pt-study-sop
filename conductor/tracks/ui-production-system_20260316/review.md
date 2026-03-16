# Review: UI Production System

## Review status

Provisional approval for durable-track use. Queue conversion remains intentionally deferred.

## Lens 1: Canon and product alignment

- The track preserves the current repo canon:
  - Brain remains the home route
  - Tutor remains the live study workspace
  - Scholar remains the investigation/improvement flagship route
  - Library/Calendar/Mastery/Methods/Vault remain support pages
- The track does not redefine route ownership or workflow ownership already captured in `README.md`.

## Lens 2: Interaction architecture

- The strongest design decision is keeping generated art decorative only.
- Live text, icons, active state, focus state, and responsive hit areas remain code-driven.
- This avoids the most fragile failure mode from the recent navbar exploration: treating a header mockup as a final interactive navbar.

## Lens 3: Rollout and conflict risk

- The largest immediate risk is colliding with the active dirty Tutor workflow rewrite set already present in the worktree.
- The mitigation is correct:
  - keep this track durable and phased
  - avoid queue conversion today
  - start with shared shell primitives and shared wrappers first
- This track should complement, not fight, the `tutor-workflow-redesign_20260316` track.

## Research-informed takeaways

- The strongest outside signals collected for this pass all pointed in the same direction:
  - design systems beat one-off page styling
  - flagship destinations need stronger hierarchy than support destinations
  - micro-detail polish matters at the control level
  - responsive, code-native interaction beats image-mapped UI
- The current track reflects that by centering hierarchy, shared primitives, and page-family contracts.

## Verdict

- Accept as the durable UI direction for the repo.
- Defer executable wave conversion until:
  - the rail/dock asset pack is finalized
  - the shared shell wave is explicitly claimed
  - the active Tutor workflow dirty set is less likely to conflict

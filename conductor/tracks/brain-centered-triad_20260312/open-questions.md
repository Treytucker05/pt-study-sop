# Open Questions: Brain-Centered Triad Reframe

Date: 2026-03-12  
Track: `brain-centered-triad_20260312`

These questions remain open after the current repo audit and product discussion. They are ordered by how much they can change implementation shape.

## High-Leverage Product Questions

1. What exact lower-page section order should Brain use after the locked top queue and stats bands?
   - Current fallback: course breakdown first, then learner-state/archetype, then study plan/rotation.
2. Which current Dashboard widgets survive the merge into Brain unchanged, and which should be deleted instead of moved?
3. Which current Brain workspace tools move directly into Tutor first, and which should be removed instead of migrated?

## Cross-System UX Questions

4. Which Brain attention items should launch directly into Tutor versus a support page?
5. What exact mirrored card format should Brain/Tutor use when they reference Scholar items?
6. How visible should accepted Scholar proposals remain once they are implemented and no longer pending?

## Automation + Performance Questions

7. What conditions beyond Tutor completion should auto-trigger Scholar runs in practice?
8. What performance budget or concurrency rule should cap Scholar background work on this machine?
9. Should automatic Scholar runs skip when the system is already busy with Tutor, build, or scan work?

## Tutor-Specific Follow-On Questions

10. Does the current Tutor page fully match the updated role of "bread-and-butter live study engine + live workspace," or are more structural changes needed beyond copy and shell framing?
11. How much of the current Tutor wizard should expose Brain-owned Library concepts vs Tutor-only session setup?
12. What exact durable Tutor note contract should replace the current split between generic `session_wrap` saves and the richer `tutor_session` note path?

## Decision Order

1. Freeze the Brain-home merged IA before route and shell work begins.
2. Freeze the Tutor-first Brain queue targets before building the new home section.
3. Freeze the Tutor workspace migration target list before moving any Brain tools.
4. Audit Tutor against the new contract before implementation reaches the Tutor migration wave.
5. Freeze the durable Tutor note contract before any deep Tutor/vault write refactor starts.

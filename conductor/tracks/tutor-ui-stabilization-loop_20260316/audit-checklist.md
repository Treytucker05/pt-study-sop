# Audit Checklist - Tutor UI Stabilization Loop

Run this exact order every iteration.

1. Open `/brain`
2. Trigger `Open Tutor`
3. Verify Tutor lands in the correct shell state
4. Open Tutor `Launch`
5. Verify top-of-page landing and clean shell chrome
6. Open Tutor `Priming`
7. Verify top-of-page landing and workflow scope
8. Open Tutor `Tutor`
9. Verify tutor-only shell chrome appears only here
10. Open Tutor `Polish`
11. Verify top-of-page landing and no stale shell bleed
12. Open Tutor `Final Sync`
13. Verify top-of-page landing and visible primary closeout controls
14. Open `/methods`
15. Verify page still loads and remains usable

For each issue record:

- severity
- page/flow
- repro
- expected behavior
- actual behavior
- suspected file/surface

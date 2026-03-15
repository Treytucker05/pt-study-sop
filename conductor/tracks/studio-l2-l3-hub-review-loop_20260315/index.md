# Track: Studio L2/L3 Hub + Review Loop

- Spec: [./spec.md](./spec.md)
- Plan: [./plan.md](./plan.md)
- Review: [./review.md](./review.md)
- Validation: [./validation-matrix.md](./validation-matrix.md)

## Status

- Created: 2026-03-15
- Current phase: Phase 3 pending after the L2 wave shipped
- Immediate focus: add Studio item update/history/archive behavior and wire the L3 review loop into `TutorStudioMode.tsx`

## Notes

- L1 class picker hardening shipped immediately before this track and remains out of scope here.
- This track is intentionally split into an L2-first execution wave followed by L3 review-loop hardening.
- L2 is validated and landed:
  - `GET /api/tutor/studio/overview` is live.
  - `StudioClassDetail.tsx` now renders MATERIALS, OBJECTIVES, CARDS & TESTS, VAULT, and STATS from the overview payload.
  - Targeted pytest/vitest/build gates passed.
  - Live `/tutor?mode=studio` proof passed after restarting the stale `dashboard_web.py` process so port 5000 served the updated route set.

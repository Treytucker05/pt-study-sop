# Commercial Readiness: Brain / Scholar / Tutor Realignment

> Historical track note: this file is execution history only. Current product/page ownership lives only in `docs/root/TUTOR_STUDY_BUDDY_CANON.md`.

**Track:** `brain-scholar-tutor-realignment_20260311`  
**Date:** 2026-03-11  
**Status:** Implemented MVP commercial foundation

## What Was Added

### Trust + Data Rights

- product privacy settings persisted per `userId` + `workspaceId`
- retention controls with learner-facing edit path
- personalization reset endpoint and UI action
- Brain export surface
- Scholar export surface
- learner-facing outcome report export path

### Value Proof + Instrumentation

- product analytics event log (`product_events`)
- learner onboarding completion event
- Scholar investigation/question response instrumentation
- Tutor session creation/completion instrumentation
- Brain feedback + export instrumentation
- learner-facing value-proof card on the dashboard

### Future-Ready Seams

- explicit `userId` / `workspaceId` seams on product APIs
- product feature flags persisted in the database
- bounded privacy controls separated from general app settings

## Measurable Promises Backed In Product

The current premium-individual story is grounded in these measurable product promises:

1. **Clearer diagnosis**
   - Brain explains what it thinks, why it thinks it, and how confident it is.
2. **Better follow-through**
   - onboarding, next-action, and retention surfaces create visible study continuity.
3. **More trustworthy personalization**
   - Scholar research + Tutor strategy are bounded, cited, and traceable.
4. **Better self-understanding**
   - learner archetypes, feedback loops, and Brain challenge/calibration flows are visible to the learner.

## Initial Performance / Monitoring Budget

These are the frozen MVP operating targets for the premium shell:

- dashboard shell should render without blocking on hidden background work
- Brain profile and product analytics payloads should return fast enough for a normal dashboard refresh
- Scholar investigations should expose loading, failure, and partial-result states rather than stalling silently
- Tutor startup must remain chain-bound and explain strategy choice without hidden adaptation drift

Current monitoring baseline:

- `pytest brain/tests/ -q`
- frontend test coverage for API + Scholar flows
- `npm run build` in `dashboard_rebuild/`
- `Start_Dashboard.bat` readiness gating
- live API smokes for:
  - `/api/brain/profile`
  - `/api/product/analytics`
  - `/api/product/privacy`
  - `/api/product/outcome-report`

## Known Limits

- premium-individual is the target; institution-admin surfaces are intentionally deferred
- Scholar research remains constrained by the current runtime search/fetch path and source availability
- workspace seams exist, but the product is still effectively operated as a local single-user system today
- this track does not add billing or hosted deployment

## Why This Is Sellable

The repo now has a coherent premium-product story instead of a loose tool bundle:

- Brain diagnoses how the learner learns best
- Scholar investigates, asks questions, and cites findings
- Tutor teaches within a bounded strategy envelope
- the learner can inspect, challenge, export, and reset personalization state

That combination is the commercial foundation. Later work can harden hosting, billing, and multi-user controls without undoing the core product loop.

# Track: Brain / Scholar / Tutor Realignment

**ID:** brain-scholar-tutor-realignment_20260311  
**Status:** Active

## Documents

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Decision Record](./decision-record.md)
- [Vision Gap Matrix](./vision-gap-matrix.md)
- [Brain Ontology](./brain-ontology.md)
- [Brain Evidence Map](./brain-evidence-map.md)

## Scope

- Restore the 3-part product identity around Brain, Scholar, and Tutor.
- Build the roadmap as a premium individual product first.
- Freeze the contract before runtime work so later waves do not drift.

## Current Progress

- Worktree cleanup completed and unrelated unfinished test additions preserved in stash.
- Conductor track opened with roadmap, decision record, and gap matrix.
- Wave 0 contract freeze completed: active canon/docs now describe the same Brain / Scholar / Tutor contract.
- Wave 1 contract + MVP completed:
  - published the Brain ontology and evidence map for learner-profile claims, archetypes, calibration questions, and reliability tiers
  - added persisted Brain learner-profile snapshots, claims, questions, and feedback events
  - shipped `/api/brain/profile*` endpoints for summary, claims, history, questions, and learner feedback
  - added a live `PROFILE` tab inside `/brain` with explanation, evidence, challenge, and calibration flows
  - validated with backend tests, frontend tests, full `pytest brain/tests/`, `npm run build`, and a live dashboard run
- Next required move: begin Wave 2 by making Scholar investigations, findings, citations, and learner questions first-class product data.

## Quick Links

- [Back to Tracks](../../tracks.md)
- [Product Context](../../product.md)

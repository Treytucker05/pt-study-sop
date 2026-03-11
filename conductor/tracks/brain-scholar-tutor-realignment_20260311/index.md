# Track: Brain / Scholar / Tutor Realignment

**ID:** brain-scholar-tutor-realignment_20260311  
**Status:** Complete

## Documents

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Decision Record](./decision-record.md)
- [Vision Gap Matrix](./vision-gap-matrix.md)
- [Brain Ontology](./brain-ontology.md)
- [Brain Evidence Map](./brain-evidence-map.md)
- [Commercial Readiness](./commercial-readiness.md)
- [Demo Flow](./demo-flow.md)

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
- Wave 2 Scholar research MVP completed:
  - added persisted Scholar investigations, learner questions, source normalization, findings, uncertainty handling, and cited web-research runtime
  - shipped `/api/scholar/research/*` endpoints and the learner-facing Scholar investigation workspace
  - validated with dedicated API/runtime tests, frontend tests, and live export/API smokes
- Wave 3 bounded Scholar-to-Tutor mediation completed:
  - added persisted strategy snapshots, bounded adaptation fields, provenance-aware Tutor session wiring, and strategy feedback capture
  - validated with Tutor mediation tests plus full backend regression coverage
- Wave 4 premium shell completed:
  - promoted Brain / Scholar / Tutor as the primary product shell
  - added premium onboarding, dashboard value-proof cards, trust/explainability affordances, and retention/next-action surfaces
  - fixed a live dashboard runtime defect (`useMemo` import) discovered during browser smoke validation
- Wave 5 commercial hardening completed:
  - added product analytics, feature flags, privacy/retention controls, export surfaces, learner-facing outcome reports, and a workspace-aware product API
  - documented the sellable end-to-end demo path and commercial-readiness posture in this track
- Track closure:
  - all core Waves 0-5 are complete
  - follow-on reframing of supporting pages (`Mastery`, `Vault`, `Library`, `Calendar`) stays as normal backlog, not a blocker for this roadmap’s closure

## Quick Links

- [Back to Tracks](../../tracks.md)
- [Product Context](../../product.md)

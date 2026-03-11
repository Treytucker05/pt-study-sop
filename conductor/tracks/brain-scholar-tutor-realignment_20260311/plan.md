# Implementation Plan: Brain / Scholar / Tutor Realignment

**Track ID:** brain-scholar-tutor-realignment_20260311  
**Spec:** [./spec.md](./spec.md)  
**Created:** 2026-03-11  
**Status:** [ ] In Progress

## Pre-Step

- [x] P0.1: Clean the existing worktree and preserve unrelated unfinished work safely.
- [x] P0.2: Add this roadmap initiative to `docs/root/TUTOR_TODO.md`.
- [x] P0.3: Open the conductor track with spec, plan, decision record, and gap matrix.
- [x] P0.4: Update active canon/docs to point at this track as the roadmap of record.

## Wave 0: Contract Freeze

### W0 Goal

Freeze the Brain / Scholar / Tutor contract before any learner-model, research-runtime, or Tutor-adaptation code changes.

### Tasks

- [x] T-000: Publish the contract decision record as the frozen source for this initiative.
- [x] T-000a: Lock Brain as the factual learner-model engine.
- [x] T-000b: Lock Scholar as the learner-facing research partner.
- [x] T-000c: Lock Tutor as the only live teaching engine.
- [x] T-000d: Lock the no-direct-Brain-to-Tutor rule.
- [x] T-001: Align active truth paths to the same contract.
- [x] T-001a: Update `docs/root/TUTOR_STUDY_BUDDY_CANON.md`.
- [x] T-001b: Update `docs/root/TUTOR_OWNER_INTENT.md`.
- [x] T-001c: Update `docs/root/PROJECT_ARCHITECTURE.md`.
- [x] T-001d: Update `conductor/product.md`.
- [x] T-001e: Update `scholar/CHARTER.md`.
- [x] T-001f: Update `scholar/README.md`.
- [x] T-001g: Update user-facing guide copy where product identity is explained.
- [x] T-002: Publish the repo-wide vision-gap matrix with disposition per gap.
- [x] T-002a: Mark each capability as `restore`, `defer`, or `reject`.
- [x] T-003: Freeze the launch gates for later waves in repo-tracked docs.

### Dependencies

- No later wave starts until T-000 through T-003 are complete.

### Verification

- Active docs no longer contradict each other on Brain / Scholar / Tutor roles.
- No active doc still frames Scholar as purely read-only advisory-only.
- No active doc still under-describes Brain as mere storage/operations.

## Wave 1: Brain Contract And Learner-Model MVP

### W1 Goal

Define Brain’s ontology and storage model, then ship the first learner-profile product surface.

### Tasks

- [ ] T-100: Define the Brain learner-model ontology.
- [ ] T-100a: Define `profile claim`.
- [ ] T-100b: Define `hybrid archetype`.
- [ ] T-100c: Define `calibration question`.
- [ ] T-100d: Define contradiction, freshness, and confidence semantics.
- [ ] T-101: Define evidence ownership and reliability tiers.
- [ ] T-101a: Lock Tier 1 trusted evidence.
- [ ] T-101b: Lock Tier 2 conditional evidence.
- [ ] T-101c: Lock Tier 3 advisory evidence.
- [ ] T-101d: Create a field-by-field evidence map with cadence and backfill rules.
- [ ] T-102: Design the Brain profile persistence layer.
- [ ] T-102a: Add profile snapshot persistence.
- [ ] T-102b: Add claim-level persistence.
- [ ] T-102c: Add challenge/calibration event persistence.
- [ ] T-102d: Add profile history persistence.
- [ ] T-102e: Decide persisted vs derived-on-read fields.
- [ ] T-103: Define and implement historical backfill strategy.
- [ ] T-103a: Backfill where confidence is acceptable.
- [ ] T-103b: Mark weak or missing history honestly.
- [ ] T-103c: Add migration rollback rules.
- [ ] T-104: Build Brain profile APIs.
- [ ] T-104a: `GET` profile summary.
- [ ] T-104b: `GET` claims + evidence + confidence.
- [ ] T-104c: `GET` history/timeline.
- [ ] T-104d: `GET` pending calibration questions.
- [ ] T-104e: `POST` learner challenge/calibration answer.
- [ ] T-105: Build Brain UI learner-profile console.
- [ ] T-105a: Add profile summary and hybrid archetype overview.
- [ ] T-105b: Add claim cards with evidence drawers.
- [ ] T-105c: Add “why Brain thinks this” explanations.
- [ ] T-105d: Add learner challenge/calibration actions.
- [ ] T-105e: Add profile timeline/history.
- [ ] T-106: Expand telemetry only where ontology proves it is missing.
- [ ] T-106a: Fill Tutor-side missing signals.
- [ ] T-106b: Join supporting signals only after tier rules are enforced.

### Parallel-Safe Batches

- Batch A: ontology + evidence map docs
- Batch B: DB schema + migration + API work
- Batch C: Brain UI once the API contract is frozen

### Verification

- [ ] T-107a: unit tests for claim derivation, contradiction handling, and freshness
- [ ] T-107b: migration/backfill tests
- [ ] T-107c: API contract tests
- [ ] T-107d: frontend tests for confidence/explanation/challenge flows
- [ ] T-107e: manual QA proving Brain can explain a hybrid archetype without fake certainty

## Wave 2: Scholar Learner-Facing Research MVP

### W2 Goal

Turn Scholar into a real learner-facing research system without letting it teach course content.

### Tasks

- [ ] T-200: Freeze Scholar MVP scope.
- [ ] T-200a: Include investigations, learner questions, cited findings, answer ingestion, visible uncertainty.
- [ ] T-200b: Exclude broader proposal/admin workspace sprawl from MVP.
- [ ] T-201: Rewrite Scholar contract and UI framing.
- [ ] T-201a: Remove advisory-only/read-only framing from active docs and UI copy.
- [ ] T-201b: Preserve the hard non-goal that Scholar does not teach course content.
- [ ] T-202: Freeze one backend-owned runtime path for Scholar research.
- [ ] T-202a: Decide where investigations and findings persist.
- [ ] T-202b: Normalize citations and source metadata.
- [ ] T-202c: Keep `scholar/outputs/` as audit mirrors rather than primary app state.
- [ ] T-203: Add real web-research capability.
- [ ] T-203a: Implement search/fetch path.
- [ ] T-203b: Enforce trusted-source policy and uncertainty marking.
- [ ] T-203c: Add timeout, no-source, conflict, and partial-run handling.
- [ ] T-204: Extend the question lifecycle.
- [ ] T-204a: Add audience types.
- [ ] T-204b: Add rationale and blocking/non-blocking state.
- [ ] T-204c: Add linked investigation and answer-incorporation state.
- [ ] T-205: Build Scholar research workspace UI.
- [ ] T-205a: investigations list
- [ ] T-205b: learner questions inbox
- [ ] T-205c: findings lane with citations
- [ ] T-205d: visible “what Scholar is researching and why”
- [ ] T-205e: uncertainty states

### Parallel-Safe Batches

- Batch A: runtime contract + persistence model
- Batch B: research tool path + citation normalization
- Batch C: question model + UI once the API contract is frozen

### Verification

- [ ] T-206a: API tests for investigations, questions, and findings
- [ ] T-206b: citation persistence tests
- [ ] T-206c: runtime tests for failed/noisy/partial research runs
- [ ] T-206d: frontend tests for question answering and citation display
- [ ] T-206e: manual QA proving Scholar can ask, research, cite, and stay non-teaching

## Wave 3: Bounded Scholar-To-Tutor Mediation

### W3 Goal

Allow Scholar to shape Tutor only within an explicit, testable envelope that never bypasses SOP authority.

### Tasks

- [ ] T-300: Freeze the adaptation envelope.
- [ ] T-300a: Lock allowed adaptive fields.
- [ ] T-300b: Lock forbidden adaptive fields.
- [ ] T-300c: Require provenance on every adaptive field.
- [ ] T-301: Define session-start contract.
- [ ] T-301a: Brain evidence snapshot input.
- [ ] T-301b: Scholar strategy snapshot input.
- [ ] T-301c: learner-facing rationale surface.
- [ ] T-302: Implement bounded mediation in Tutor startup and resume.
- [ ] T-302a: add strategy snapshot handling
- [ ] T-302b: keep Tutor chain-bound
- [ ] T-302c: log active strategy fields to prevent hidden drift
- [ ] T-303: Add Tutor telemetry for evaluating adaptation quality.
- [ ] T-303a: record helpful/harmful outcomes
- [ ] T-303b: record learner response to pacing/scaffolds/retrieval pressure

### Dependencies

- Do not begin until Gate B and Gate C are passed.

### Verification

- [ ] T-304a: Tutor regression tests proving SOP and chain authority still win
- [ ] T-304b: integration tests proving Brain cannot bypass Scholar
- [ ] T-304c: manual QA proving the learner can see why the session changed

## Wave 4: Premium Individual Product Shell

### W4 Goal

Make the system feel like one premium product rather than a set of loosely related tools.

### Tasks

- [ ] T-400: Redesign primary navigation/story around Brain / Scholar / Tutor.
- [ ] T-400a: demote secondary pages to supporting roles
- [ ] T-401: Build premium onboarding.
- [ ] T-401a: capture learner goals, friction, current workflow, and tools
- [ ] T-401b: seed a provisional low-confidence Brain profile
- [ ] T-401c: introduce Brain / Scholar / Tutor roles during onboarding
- [ ] T-402: Redesign the dashboard/home experience.
- [ ] T-402a: show Brain state, Scholar activity, Tutor next action first
- [ ] T-402b: remove page-first confusion
- [ ] T-403: Add trust and explainability surfaces.
- [ ] T-403a: explanation + evidence + confidence + challenge path on recommendations
- [ ] T-403b: history/audit for system-written changes
- [ ] T-403c: safe preview before high-impact actions
- [ ] T-404: Add retention loop surfaces.
- [ ] T-404a: next-best-action recommendations
- [ ] T-404b: review/follow-through states
- [ ] T-404c: durable-learning progress surfaces
- [ ] T-405: Premium polish pass.
- [ ] T-405a: product-language/copy audit
- [ ] T-405b: responsive/mobile pass
- [ ] T-405c: performance budgets and monitoring

### Verification

- onboarding, Brain, Scholar, and Tutor flows read as one coherent product
- no core flow relies on hidden assumptions or unexplained automation

## Wave 5: Commercial Hardening

### W5 Goal

Make the premium individual product credible enough to sell and durable enough to become a much larger asset later.

### Tasks

- [ ] T-500: Define value proof.
- [ ] T-500a: pick measurable promises
- [ ] T-500b: instrument those promises
- [ ] T-501: Add data-rights and trust surfaces.
- [ ] T-501a: export learner profile, findings, history, and artifact metadata
- [ ] T-501b: privacy, deletion, and retention controls
- [ ] T-501c: disclosure of personalization inputs
- [ ] T-502: Add analytics and experiment framework.
- [ ] T-502a: activation, trust, response-rate, completion, and retention metrics
- [ ] T-502b: feature flags / experiment toggles
- [ ] T-503: Build saleable proof assets.
- [ ] T-503a: polished end-to-end demo path
- [ ] T-503b: learner-facing outcome report
- [ ] T-504: Add future-ready seams.
- [ ] T-504a: explicit user/workspace boundaries
- [ ] T-504b: billing/account/policy seams
- [ ] T-504c: no institution-only admin complexity yet
- [ ] T-505: Build acquisition-grade diligence materials.
- [ ] T-505a: keep canon/architecture current
- [ ] T-505b: keep outcome evidence measurable
- [ ] T-505c: keep explainability and auditability defensible

## Supporting Alignment (Not Core Launch Blockers)

- [ ] T-600: reframe `Mastery` as Brain evidence once Brain MVP is stable
- [ ] T-601: reframe `Vault` as knowledge evidence once Brain + Scholar MVPs are stable
- [ ] T-602: reframe `Library` as content/evidence support once Scholar MVP is stable
- [ ] T-603: reframe `Calendar` as follow-through signal once Brain reliability tiers are stable

## Current Execution Focus

- finish Wave 0 contract freeze
- publish the frozen Brain / Scholar / Tutor contract into active canon
- keep later waves blocked until the contract and gates are explicit

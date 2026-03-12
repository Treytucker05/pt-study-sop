# Implementation Plan: Brain / Scholar / Tutor Realignment

> Historical track note: this file is execution history only. Current product/page ownership lives only in `docs/root/TUTOR_STUDY_BUDDY_CANON.md`.

**Track ID:** brain-scholar-tutor-realignment_20260311  
**Spec:** [./spec.md](./spec.md)  
**Created:** 2026-03-11  
**Status:** [x] Complete

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

- [x] T-100: Define the Brain learner-model ontology.
- [x] T-100a: Define `profile claim`.
- [x] T-100b: Define `hybrid archetype`.
- [x] T-100c: Define `calibration question`.
- [x] T-100d: Define contradiction, freshness, and confidence semantics.
- [x] T-101: Define evidence ownership and reliability tiers.
- [x] T-101a: Lock Tier 1 trusted evidence.
- [x] T-101b: Lock Tier 2 conditional evidence.
- [x] T-101c: Lock Tier 3 advisory evidence.
- [x] T-101d: Create a field-by-field evidence map with cadence and backfill rules.
- [x] T-102: Design the Brain profile persistence layer.
- [x] T-102a: Add profile snapshot persistence.
- [x] T-102b: Add claim-level persistence.
- [x] T-102c: Add challenge/calibration event persistence.
- [x] T-102d: Add profile history persistence.
- [x] T-102e: Decide persisted vs derived-on-read fields.
- [x] T-103: Define and implement historical backfill strategy.
- [x] T-103a: Backfill where confidence is acceptable.
- [x] T-103b: Mark weak or missing history honestly.
- [x] T-103c: Add migration rollback rules.
- [x] T-104: Build Brain profile APIs.
- [x] T-104a: `GET` profile summary.
- [x] T-104b: `GET` claims + evidence + confidence.
- [x] T-104c: `GET` history/timeline.
- [x] T-104d: `GET` pending calibration questions.
- [x] T-104e: `POST` learner challenge/calibration answer.
- [x] T-105: Build Brain UI learner-profile console.
- [x] T-105a: Add profile summary and hybrid archetype overview.
- [x] T-105b: Add claim cards with evidence drawers.
- [x] T-105c: Add “why Brain thinks this” explanations.
- [x] T-105d: Add learner challenge/calibration actions.
- [x] T-105e: Add profile timeline/history.
- [x] T-106: Expand telemetry only where ontology proves it is missing.
- [x] T-106a: Fill Tutor-side missing signals.
- [x] T-106b: Join supporting signals only after tier rules are enforced.

### Parallel-Safe Batches

- Batch A: ontology + evidence map docs
- Batch B: DB schema + migration + API work
- Batch C: Brain UI once the API contract is frozen

### Verification

- [x] T-107a: unit tests for claim derivation, contradiction handling, and freshness
- [x] T-107b: migration/backfill tests
- [x] T-107c: API contract tests
- [x] T-107d: frontend tests for confidence/explanation/challenge flows
- [x] T-107e: manual QA proving Brain can explain a hybrid archetype without fake certainty

## Wave 2: Scholar Learner-Facing Research MVP

### W2 Goal

Turn Scholar into a real learner-facing research system without letting it teach course content.

### Tasks

- [x] T-200: Freeze Scholar MVP scope.
- [x] T-200a: Include investigations, learner questions, cited findings, answer ingestion, visible uncertainty.
- [x] T-200b: Exclude broader proposal/admin workspace sprawl from MVP.
- [x] T-201: Rewrite Scholar contract and UI framing.
- [x] T-201a: Remove advisory-only/read-only framing from active docs and UI copy.
- [x] T-201b: Preserve the hard non-goal that Scholar does not teach course content.
- [x] T-202: Freeze one backend-owned runtime path for Scholar research.
- [x] T-202a: Decide where investigations and findings persist.
- [x] T-202b: Normalize citations and source metadata.
- [x] T-202c: Keep `scholar/outputs/` as audit mirrors rather than primary app state.
- [x] T-203: Add real web-research capability.
- [x] T-203a: Implement search/fetch path.
- [x] T-203b: Enforce trusted-source policy and uncertainty marking.
- [x] T-203c: Add timeout, no-source, conflict, and partial-run handling.
- [x] T-204: Extend the question lifecycle.
- [x] T-204a: Add audience types.
- [x] T-204b: Add rationale and blocking/non-blocking state.
- [x] T-204c: Add linked investigation and answer-incorporation state.
- [x] T-205: Build Scholar research workspace UI.
- [x] T-205a: investigations list
- [x] T-205b: learner questions inbox
- [x] T-205c: findings lane with citations
- [x] T-205d: visible “what Scholar is researching and why”
- [x] T-205e: uncertainty states

### Parallel-Safe Batches

- Batch A: runtime contract + persistence model
- Batch B: research tool path + citation normalization
- Batch C: question model + UI once the API contract is frozen

### Verification

- [x] T-206a: API tests for investigations, questions, and findings
- [x] T-206b: citation persistence tests
- [x] T-206c: runtime tests for failed/noisy/partial research runs
- [x] T-206d: frontend tests for question answering and citation display
- [x] T-206e: manual QA proving Scholar can ask, research, cite, and stay non-teaching

## Wave 3: Bounded Scholar-To-Tutor Mediation

### W3 Goal

Allow Scholar to shape Tutor only within an explicit, testable envelope that never bypasses SOP authority.

### Tasks

- [x] T-300: Freeze the adaptation envelope.
- [x] T-300a: Lock allowed adaptive fields.
- [x] T-300b: Lock forbidden adaptive fields.
- [x] T-300c: Require provenance on every adaptive field.
- [x] T-301: Define session-start contract.
- [x] T-301a: Brain evidence snapshot input.
- [x] T-301b: Scholar strategy snapshot input.
- [x] T-301c: learner-facing rationale surface.
- [x] T-302: Implement bounded mediation in Tutor startup and resume.
- [x] T-302a: add strategy snapshot handling
- [x] T-302b: keep Tutor chain-bound
- [x] T-302c: log active strategy fields to prevent hidden drift
- [x] T-303: Add Tutor telemetry for evaluating adaptation quality.
- [x] T-303a: record helpful/harmful outcomes
- [x] T-303b: record learner response to pacing/scaffolds/retrieval pressure

### Dependencies

- Do not begin until Gate B and Gate C are passed.

### Verification

- [x] T-304a: Tutor regression tests proving SOP and chain authority still win
- [x] T-304b: integration tests proving Brain cannot bypass Scholar
- [x] T-304c: manual QA proving the learner can see why the session changed

## Wave 4: Premium Individual Product Shell

### W4 Goal

Make the system feel like one premium product rather than a set of loosely related tools.

### Tasks

- [x] T-400: Redesign primary navigation/story around Brain / Scholar / Tutor.
- [x] T-400a: demote secondary pages to supporting roles
- [x] T-401: Build premium onboarding.
- [x] T-401a: capture learner goals, friction, current workflow, and tools
- [x] T-401b: seed a provisional low-confidence Brain profile
- [x] T-401c: introduce Brain / Scholar / Tutor roles during onboarding
- [x] T-402: Redesign the dashboard/home experience.
- [x] T-402a: show Brain state, Scholar activity, Tutor next action first
- [x] T-402b: remove page-first confusion
- [x] T-403: Add trust and explainability surfaces.
- [x] T-403a: explanation + evidence + confidence + challenge path on recommendations
- [x] T-403b: history/audit for system-written changes
- [x] T-403c: safe preview before high-impact actions
- [x] T-404: Add retention loop surfaces.
- [x] T-404a: next-best-action recommendations
- [x] T-404b: review/follow-through states
- [x] T-404c: durable-learning progress surfaces
- [x] T-405: Premium polish pass.
- [x] T-405a: product-language/copy audit
- [x] T-405b: responsive/mobile pass
- [x] T-405c: performance budgets and monitoring

### Verification

- onboarding, Brain, Scholar, and Tutor flows read as one coherent product
- no core flow relies on hidden assumptions or unexplained automation

## Wave 5: Commercial Hardening

### W5 Goal

Make the premium individual product credible enough to sell and durable enough to become a much larger asset later.

### Tasks

- [x] T-500: Define value proof.
- [x] T-500a: pick measurable promises
- [x] T-500b: instrument those promises
- [x] T-501: Add data-rights and trust surfaces.
- [x] T-501a: export learner profile, findings, history, and artifact metadata
- [x] T-501b: privacy, deletion, and retention controls
- [x] T-501c: disclosure of personalization inputs
- [x] T-502: Add analytics and experiment framework.
- [x] T-502a: activation, trust, response-rate, completion, and retention metrics
- [x] T-502b: feature flags / experiment toggles
- [x] T-503: Build saleable proof assets.
- [x] T-503a: polished end-to-end demo path
- [x] T-503b: learner-facing outcome report
- [x] T-504: Add future-ready seams.
- [x] T-504a: explicit user/workspace boundaries
- [x] T-504b: billing/account/policy seams
- [x] T-504c: no institution-only admin complexity yet
- [x] T-505: Build acquisition-grade diligence materials.
- [x] T-505a: keep canon/architecture current
- [x] T-505b: keep outcome evidence measurable
- [x] T-505c: keep explainability and auditability defensible

## Supporting Alignment (Deferred Follow-On Backlog)

- Future follow-on track should:
  - reframe `Mastery` as Brain evidence
  - reframe `Vault` as knowledge evidence + artifact quality
  - reframe `Library` as content/evidence support
  - reframe `Calendar` as follow-through signal

## Current Execution Focus

- Track complete.
- Core Waves 0-5 shipped and validated.
- Any remaining page-level reframing work belongs in follow-on tracks, not in this roadmap closure.

# Implementation Plan: Tutor 10/10 Certification

**Track ID:** tutor-10-certification_20260307  
**Spec:** [./spec.md](./spec.md)  
**Created:** 2026-03-07  
**Status:** [ ] In Progress

## Pre-Step

- [x] P0.1: Add the certification effort to `docs/root/TUTOR_TODO.md`.
- [x] P0.2: Claim live coordination scope in `docs/root/AGENT_BOARD.md`.
- [x] P0.3: Open the certification track and baseline docs.

## Milestone 0: Contract And Fixtures

- [x] T-001: Create the 10/10 scorecard with five pillars.
- [x] T-002: Define severity and pass/fail policy.
- [x] T-003: Define chain certification dispositions.
- [x] T-004: Publish deterministic fixture plan for supported material classes and neuro golden paths.
- [x] T-003a: Add machine-readable certification registry for template chains.
- [x] T-003b: Surface chain certification metadata through the template-chain API.
- [x] T-003c: Add regression tests for seeded certification metadata and template-chain API output.

## Milestone 1: Material Pipeline Certification

- [x] T-101: Build the material intake matrix for PDF, PPTX, DOCX, TXT/MD, MP4, and folder sync.
- [x] T-102: Certify each format across upload/sync, extraction, `rag_docs`, and selected-material retrieval.
- [x] T-103: Add missing integration coverage for selected-material retrieval, MP4 hybrid ingest, and folder sync dedupe/update behavior.
  - upload endpoint coverage added for PDF/PPTX/DOCX/TXT/MD/MP4
  - sync preview/start coverage added
  - full-sync stale-row pruning and sync update/dedupe coverage added
  - selected MP4 materials now expand to linked processed transcript docs during material-context retrieval
- [x] T-104: Freeze pass criteria per material class.

## Milestone 2: Session Authority, Restore, Resume

- [ ] T-201: Make preflight the only supported setup authority after contracts are frozen.
  - objective-scoped certified sessions now reject direct start without preflight
- [x] T-202a: Freeze canonical ownership map for objective/MOC/session authority.
- [ ] T-202b: Implement the minimum consolidation required for deterministic preflight/restore.
- [ ] T-203: Build restore/resume certification matrix.
  - restore coverage now includes stale active-session keys, completed-session cleanup, corrupted wizard state, and library handoff precedence
- [ ] T-204: Certify preserved scoped session state across create/get/restore/resume.

## Milestone 3+: Remaining Certification

- [x] T-301: Inventory selectable template chains and assign dispositions.
- [ ] T-302-T-305: remaining chain runtime certification
- [ ] T-401-T-405: artifact reliability
- [ ] T-501-T-505: trust and teaching quality
- [ ] T-601-T-605: neuro golden paths and release gate
- [x] T-605: Define and implement the executable certification runner/report artifact used by the release gate.

## Current Execution Focus

- freeze the certification contract in repo-tracked artifacts
- add chain certification disposition to the template-chain registry surface
- use that registry as the source of truth for later matrices and release gating
- continue with remaining session-authority consolidation and chain runtime certification

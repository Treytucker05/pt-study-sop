# Project Tracks

This file tracks all major tracks for the project. Each track has its own detailed plan in its respective folder.

Update policy: after every significant change, update this file (and the active track plan file) with current status before closing the work session.

Latest non-track update: 2026-02-23 Implemented local MP4 processing + tutor process/status APIs + frontend process/polling UI; validated with full backend tests and frontend build (see `conductor/tracks/GENERAL/log.md`).

---

- [ ] **Track: Video Ingest Local Pipeline** (in progress — created 2026-02-22; priority 1)
  *Link: [./tracks/video_ingest_local_20260222/](./tracks/video_ingest_local_20260222/)*

- [ ] **Track: Video Enrichment API (Selective)** (planned — created 2026-02-22; priority 2)
  *Link: [./tracks/video_enrichment_api_20260222/](./tracks/video_enrichment_api_20260222/)*

- [ ] **Track: Video Tutor Integration** (in progress — created 2026-02-22; priority 3)
  *Link: [./tracks/video_tutor_integration_20260222/](./tracks/video_tutor_integration_20260222/)*

- [ ] **Track Set: Hybrid Video Study Pipeline** (planned meta-track — sequence: local ingest -> selective API enrichment -> tutor integration)
  Scope doc: `docs/root/TUTOR_VIDEO_INGEST_PLAN.md`

- [x] **Track: Tutor Tool-Calling** (complete — started 2026-02-17; closed 2026-02-17; Phases 1-5 done)
  Backend: `brain/tutor_tools.py`, `brain/figma_mcp_client.py`, `brain/llm_provider.py`, `brain/dashboard/api_tutor.py`. Frontend: `TutorChat.tsx`, `api.ts`.
  Tools live: save_to_obsidian, create_note, create_anki_card, create_figma_diagram. 192 tests passing.

- [x] **Track: CP-MSS Control-Plane Hardening + Tutor Integration** (complete — started 2026-02-17; closed 2026-02-17; all B0-B8 done)
  *Link: [./tracks/CP_MSS_CONTROL_PLANE_HARDENING_20260217/](./tracks/CP_MSS_CONTROL_PLANE_HARDENING_20260217/)*

- [x] **Track: Agent setup + instruction hygiene.** (archived 2026-02-10)
  *Link: [./tracks/agents_setup_cleanup_20260209/](./tracks/agents_setup_cleanup_20260209/)*

- [x] **Track: Refactor the existing frontend and backend to align with the defined tech stack and coding guidelines, focusing on modularity and code quality.** (archived 2026-02-16 — superseded by iterative improvements)
  *Link: [./tracks/refactor_frontend_backend_20260204/](./tracks/refactor_frontend_backend_20260204/)*

- [x] **Track: Finish PT Study OS - Complete remaining gaps for daily use** (archived 2026-02-16 — outdated, most items shipped or no longer relevant)
  *Link: [./tracks/FINISH_PLANNING_20260210/](./tracks/FINISH_PLANNING_20260210/)*

- [x] **Track: Adaptive Mastery System** (complete — created 2026-02-20; closed 2026-02-21; 10 phases, 48 tasks, 629 tests)
  BKT + forgetting curve, Obsidian vault integration, concept-map curriculum gating, adaptive scaffolding with localized failure, teach-back gates, Graph RAG-lite with PCST pruning, measurement loop.
  *Link: [./tracks/adaptive_mastery_20260220/](./tracks/adaptive_mastery_20260220/)*

- [x] **Track: UI/UX Professional Audit** (complete — created 2026-02-20; closed 2026-02-21; 3 phases, 11 tasks)
  Systematic professional-grade QA and UI/UX review tailored to the Retro Arcade design system.
  *Link: [./tracks/ui_ux_audit_20260220/](./tracks/ui_ux_audit_20260220/)*


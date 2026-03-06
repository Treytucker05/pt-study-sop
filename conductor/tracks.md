# Project Tracks

This file tracks all major tracks for the project. Each track has its own detailed plan in its respective folder.

Update policy: after every significant change, update this file (and the active track plan file) with current status before closing the work session.

Active status: no active tracks on 2026-03-06.

Latest update: 2026-03-06 closed Skills Hygiene after documenting the shared skill architecture, grouping the skill library, and removing broken Cursor junctions.

- [x] **Track: Skills Hygiene** (complete — created 2026-03-06; closed 2026-03-06; scope: shared skill inventory, grouping, safe first cleanup of broken skill links)
  *Link: [./tracks/skills-hygiene_20260306/](./tracks/skills-hygiene_20260306/)*

---

- [x] **Track: Repo-Native Agent Board** (complete — created 2026-03-06; closed 2026-03-06; scope: shared handoff board, canon/setup wiring, multi-agent coordination rules)
  *Link: [./tracks/agent-board_20260306/](./tracks/agent-board_20260306/)*

---

- [x] **Track: Root AGENTS Canon Trim** (complete — created 2026-03-06; closed 2026-03-06; scope: root canon trim, guardrails extraction, linked-doc cleanup)
  *Link: [./tracks/agents-root-trim_20260306/](./tracks/agents-root-trim_20260306/)*

---

- [x] **Track: Agent Canon Follow-Up** (complete — created 2026-03-06; closed 2026-03-06; scope: global Claude redundancy cleanup, sync-agent-config summary output, setup optimization)
  *Link: [./tracks/agent-canon-followup_20260306/](./tracks/agent-canon-followup_20260306/)*

---

- [x] **Track: Agent Canon Alignment and Subagent Reliability** (complete — created 2026-03-06; closed 2026-03-06; scope: Codex subagent mismatch repair, repo/global agent canon alignment, operator walkthrough)
  *Link: [./tracks/agent-canon-alignment_20260306/](./tracks/agent-canon-alignment_20260306/)*

---

- [x] **Track: Tutor / Study Buddy Canon Audit** (complete — created 2026-03-06; closed 2026-03-06; scope: master canon, evidence audit, active-doc truth-path rewiring, archive-as-history boundary)
  *Link: [./tracks/study-buddy-canon-audit_20260306/](./tracks/study-buddy-canon-audit_20260306/)*

---

- [x] **Track: Tutor Audit Hardening** (complete — created 2026-03-05; closed 2026-03-06; scope: objective lifecycle, retrieval debug, materials handoff, artifact restore/delete telemetry, SSE hardening)
  *Link: [./tracks/tutor-audit-hardening_20260305/](./tracks/tutor-audit-hardening_20260305/)*

---

- [x] **Track: Vault Redesign (Obsidian CLI Migration)** (complete — created 2026-03-01; closed 2026-03-03; 27 tasks across 5 waves, 141 targeted tests)
  Full CLI migration (REST -> CLI), 5 block artifact templates, Map of Contents renderer, LO extraction pipeline, vault_write_status toasts, fire-and-forget block writes. 916 tests passing.
  *Plan: `.sisyphus/plans/vault-redesign.md`*

- [x] **Track: Tutor Audit Remediation (P0/P1)** (complete — created 2026-03-02; closed 2026-03-02; 10 tasks, 10 tests)
  Fix save-wrap URL, session summary contract, chain progress shape, artifact type mapping.
  *Link: [./tracks/tutor-audit-remediation_20260302/](./tracks/tutor-audit-remediation_20260302/)*

- [x] **Track: TutorChat Speed Tiers** (complete — created 2026-02-24; closed 2026-02-24; 4 tasks, 766 tests)
  UI mode toggles gate expensive pipeline stages. Parallel RAG. Model/reasoning per tier.
  Chat-only: ~1-2s. Full pipeline: ~5-8s (was 20+s).
  *Link: [./tracks/tutor_chat_speed_tiers_20260224/](./tracks/tutor_chat_speed_tiers_20260224/)*

- [x] **Track Set: Hybrid Video Study Pipeline** (complete — 2026-02-22 to 2026-02-23; all 3 tracks done)
  Scope doc: `docs/root/TUTOR_VIDEO_INGEST_PLAN.md`

- [x] **Track: Video Ingest Local Pipeline** (complete — created 2026-02-22; closed 2026-02-23; 5 phases, 15/16 tasks)
  Pipeline hardened: direct MP4 transcription, PT domain prompt, word timestamps, confidence metadata, OCR backend config.
  *Link: [./tracks/video_ingest_local_20260222/](./tracks/video_ingest_local_20260222/)*

- [x] **Track: Video Enrichment API (Selective)** (complete — created 2026-02-22; closed 2026-02-23; 4 phases, 13/13 tasks)
  Gemini File API provider, budget caps, caching, flagging, enrichment markdown emission. Mode defaults to "off".
  *Link: [./tracks/video_enrichment_api_20260222/](./tracks/video_enrichment_api_20260222/)*

- [x] **Track: Video Tutor Integration** (complete — created 2026-02-22; closed 2026-02-23; 4 phases, 14/14 tasks)
  Process/status/enrich endpoints, video-query heuristics, transcript chunk boosting, timestamp citations, frontend MP4 tests.
  *Link: [./tracks/video_tutor_integration_20260222/](./tracks/video_tutor_integration_20260222/)*

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


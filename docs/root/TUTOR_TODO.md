# Tutor TODO (Execution Tracker)

Date: 2026-03-06
Owner: Trey  
Purpose: keep implementation work ordered, visible, and tied to canonical tutor rules.

## Current Board (In-Progress)

- Canonical execution order: `PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`
- [x] Scholar/Tutor contract alignment hardening (2026-03-04):
  - Added deterministic Scholar question lifecycle persistence + answer endpoint.
  - Added explicit Scholar proposal approve/reject endpoints.
  - Aligned Scholar status/history API compatibility and frontend API usage.
- Source-of-truth order: 
  - `docs/root/TUTOR_STUDY_BUDDY_CANON.md` (master product canon)
  - `docs/root/TUTOR_TODO.md` (active workboard)
  - `conductor/tracks.md` (track registry / archival)

## Active Sprint 2026-03-06

### Sprint 12: Skills Hygiene (2026-03-06)
- [x] Claim scope: docs/process
  - `docs/root/SKILLS_INVENTORY.md`
  - `docs/root/AGENT_SETUP.md`
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks/GENERAL/log.md`
  - `conductor/tracks/skills-hygiene_20260306/`
- [x] Claim scope: local skill surfaces
  - `C:\Users\treyt\.agents\skills\`
  - `C:\Users\treyt\.codex\skills\`
  - `C:\Users\treyt\.claude\skills\`
  - `C:\Users\treyt\.opencode\skills\`
  - `C:\Users\treyt\.cursor\skills\`
- [x] Phase 0: create `conductor/tracks/skills-hygiene_20260306` with spec/plan/metadata/index.
- [x] Phase 1: inventory shared vs tool-local skill surfaces and group them into cleanup buckets.
- [x] Phase 2: perform a safe first cleanup pass on clearly broken/bad surfaces.
- [x] Phase 3: validate, review, and close the track.
  - Validation:
    - `docs/root/SKILLS_INVENTORY.md` created with grouped buckets and usage-evidence caveats
    - backup manifest written for broken Cursor links
    - broken Cursor junction count reduced to `0`
    - no shared `.agents` skills were deleted in the first wave

### Sprint 11: Repo-Native Agent Board (2026-03-06)
- [x] Claim scope: docs/process
  - `docs/root/AGENT_BOARD.md`
  - `AGENTS.md`
  - `docs/root/AGENT_SETUP.md`
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks/GENERAL/log.md`
  - `conductor/tracks/agent-board_20260306/`
- [x] Phase 0: create `conductor/tracks/agent-board_20260306` with spec/plan/metadata/index.
- [x] Phase 1: define the board structure, update rules, and handoff schema.
- [x] Phase 2: create and link `docs/root/AGENT_BOARD.md`.
- [x] Phase 3: validate, review, and close the track.
  - Validation:
    - `docs/root/AGENT_BOARD.md` created and linked from `AGENTS.md` and `docs/root/AGENT_SETUP.md`
    - board role kept distinct from `docs/root/TUTOR_TODO.md` and `conductor/tracks.md`
    - related docs verified to exist
  - Closing commit: `9b225c31`

### Sprint 10: Root AGENTS Canon Trim (2026-03-06)
- [x] Claim scope: docs/process
  - `AGENTS.md`
  - `docs/root/AGENT_GUARDRAILS.md`
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks/GENERAL/log.md`
  - `conductor/tracks/agents-root-trim_20260306/`
- [x] Phase 0: create `conductor/tracks/agents-root-trim_20260306` with spec/plan/metadata/index.
- [x] Phase 1: trim root `AGENTS.md` to the approved keep-only canon.
- [x] Phase 2: move detailed learnings and troubleshooting into `docs/root/AGENT_GUARDRAILS.md`.
- [x] Phase 3: validate links, review, and close out the track.
  - Validation:
    - root `AGENTS.md` trimmed from 442 lines to 127 lines
    - `docs/root/AGENT_GUARDRAILS.md` created to preserve moved learnings and troubleshooting detail
    - linked canonical docs verified to exist
  - Closing commit: `f4c63ded`

### Sprint 9: Agent Canon Follow-Up (2026-03-06)
- [x] Claim scope: global Claude agent cleanup
  - `C:\Users\treyt\.claude\agents\`
  - `C:\Users\treyt\.claude\rules\agents.md`
  - `C:\Users\treyt\.claude\CLAUDE.md`
- [x] Claim scope: repo validation + walkthrough
  - `scripts/sync_agent_config.ps1`
  - `docs/root/AGENT_SETUP.md`
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks/GENERAL/log.md`
  - `conductor/tracks/agent-canon-followup_20260306/`
- [x] Phase 0: create `conductor/tracks/agent-canon-followup_20260306` with spec/plan/metadata/index.
- [x] Phase 1: reduce repeated inheritance boilerplate in global Claude agents.
- [x] Phase 2: improve `scripts/sync_agent_config.ps1` summary output and validate it.
- [x] Phase 3: run review, close the track, and deliver the setup walkthrough.
  - Validation:
    - global Claude agents compressed to short shared-rule note format
    - `scripts/sync_agent_config.ps1 -Mode Check` -> `RESULT PASS`
    - `scripts/sync_agent_config.ps1 -Mode DryRun` -> `RESULT PASS`
    - `scripts/sync_agent_config.ps1 -Mode Apply` -> `RESULT PASS`
  - Closing commit: `e5092411`

### Sprint 8: Study Buddy Canon Audit (2026-03-06)
- [x] Claim scope: docs/process
  - `conductor/tracks/study-buddy-canon-audit_20260306/`
  - `docs/root/TUTOR_STUDY_BUDDY_CANON.md`
  - `docs/root/TUTOR_STUDY_BUDDY_AUDIT_2026-03-06.md`
- [x] Claim scope: integration/review
  - `docs/README.md`
  - `README.md`
  - `docs/root/PROJECT_ARCHITECTURE.md`
  - `docs/root/TUTOR_OWNER_INTENT.md`
  - `docs/root/GUIDE_TUTOR_FLOW.md`
  - `conductor/product.md`
  - `conductor/tracks.md`
  - `conductor/tracks/GENERAL/log.md`
- [x] Phase 0: create `conductor/tracks/study-buddy-canon-audit_20260306` with spec/plan/metadata/index.
- [x] Phase 1: inventory active canon, support docs, runtime truth samples, and archive evidence.
- [x] Phase 2: write the master Study Buddy canon and evidence audit.
- [x] Phase 3: rewire active docs to point to the new canon and remove overlapping overall-canon claims.
- [x] Phase 4: validate the truth path, capture follow-up contradictions, and close the track. (2026-03-06)
  - Validation:
    - `git diff --check -- [canon audit doc set]`
    - stale-string grep sweep over `README.md`, `docs/root/PROJECT_ARCHITECTURE.md`, `docs/root/GUIDE_TUTOR_FLOW.md`, and `docs/root/TUTOR_TODO.md`
  - Review:
    - fresh doc-code consistency subagent pass returned `No findings`

### Sprint 6: Tutor Audit Hardening (2026-03-05)
- [x] Claim scope: docs/process
  - Track planning artifacts and status/log updates.
- [x] Claim scope: backend/runtime
  - `brain/db_setup.py`
  - `brain/dashboard/api_tutor.py`
  - `brain/tutor_context.py`
  - `brain/tests/`
- [x] Claim scope: frontend/UI
  - `dashboard_rebuild/client/src/pages/library.tsx`
  - `dashboard_rebuild/client/src/pages/tutor.tsx`
  - `dashboard_rebuild/client/src/components/TutorWizard.tsx`
  - `dashboard_rebuild/client/src/components/TutorArtifacts.tsx`
  - `dashboard_rebuild/client/src/components/TutorChat.tsx`
  - `dashboard_rebuild/client/src/components/MaterialSelector.tsx`
  - `dashboard_rebuild/client/src/api.ts`
  - `dashboard_rebuild/client/src/lib/tutorClientState.ts`
- [x] Claim scope: integration/review
  - `conductor/tracks.md`
  - `conductor/tracks/GENERAL/log.md`
  - `docs/root/TUTOR_TODO.md`
- [x] Phase 0: create `conductor/tracks/tutor-audit-hardening_20260305` with spec/plan/metadata/index.
- [x] Phase 1: add objective ownership/linking safe-delete safeguards.
- [x] Phase 2: remove dead instruction retrieval plumbing and align runtime/debug telemetry.
- [x] Phase 3: fix Tutor/Library material key migration (`v1` -> `v2`) and `structured_notes` restore behavior.
- [x] Phase 4: harden Tutor SSE parsing and partial delete reporting UX.
- [x] Phase 4a: harden Obsidian CLI argv encoding for vault/file/path args to prevent Windows `EPIPE` popup loops during tutor delete/read/save flows. (2026-03-06, `pytest brain/tests/test_obsidian_vault.py -q`)
- [x] Phase 5: integration/review close-out complete. (2026-03-06)
  - Validation:
    - `npx vitest run client/src/pages/__tests__/library.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/components/__tests__/TutorArtifacts.test.tsx client/src/components/__tests__/TutorChat.test.tsx client/src/lib/__tests__/tutorClientState.test.ts`
    - `npm run build`
    - `pytest -q brain/tests/test_tutor_audit_remediation.py brain/tests/test_tutor_context.py brain/tests/test_tutor_context_wiring.py brain/tests/test_tutor_session_linking.py`
    - `pytest -q brain/tests/` -> `925 passed, 1 skipped`
  - Live smoke:
    - Library -> Tutor handoff preserved selected materials and opened on step `1. COURSE`.
    - Bulk session delete warned on active-session selection, returned cleanly to Wizard, and did not deadlock the overlay.
    - Forced partial bulk delete showed the in-panel report with `Requested 2 · Deleted 1 · Already gone 1 · Failed 0`.
    - Real artifact bulk delete removed two persisted artifacts and showed the completion report with request id.
  - Review:
    - final code-review subagent pass returned `No findings`.

### Sprint 7: Agent Canon Alignment + Codex Subagent Reliability (2026-03-06)
- [x] Claim scope: docs/process
  - `docs/root/TUTOR_TODO.md`
  - `docs/root/AGENT_SETUP.md`
  - `conductor/tracks.md`
  - `conductor/tracks/GENERAL/log.md`
  - `conductor/tracks/agent-canon-alignment_20260306/`
- [x] Claim scope: repo/local agent canon
  - `AGENTS.md`
  - `CLAUDE.md`
  - `.claude/AGENTS.md`
  - `.claude/CLAUDE.md`
  - `.claude/agents/`
  - `.claude/commands/`
- [x] Claim scope: global agent defaults
  - `C:\Users\treyt\.claude\CLAUDE.md`
  - `C:\Users\treyt\.claude\rules\`
  - `C:\Users\treyt\.claude\agents\`
  - `C:\Users\treyt\.codex\AGENTS.md`
  - `C:\Users\treyt\.codex\config.toml`
  - `C:\Users\treyt\.codex\agents\`
  - `C:\Users\treyt\.codex\rules\default.rules`
- [x] Claim scope: integration/review
  - `scripts/sync_agent_config.ps1`
  - spawned Codex subagents
- [x] Phase 0: create `conductor/tracks/agent-canon-alignment_20260306` with spec/plan/metadata/index.
- [x] Phase 1: audit live instruction surfaces and lock the precedence contract.
- [x] Phase 2: repair Codex subagent startup mismatch and validate spawned worker startup.
- [x] Phase 3: normalize repo canon, repo shims, repo Claude agents, and repo commands.
- [x] Phase 4: normalize global Claude/Codex defaults and write `docs/root/AGENT_SETUP.md`.
- [x] Phase 5: run smoke/drift validation and close out conductor logs/status.
  - Validation:
    - spawned Codex `explorer` -> `explorer-ok`
    - spawned Codex `worker` -> `worker-ok`
    - outside-repo `codex exec` -> `codex-outside-ok`
    - outside-repo `claude -p` -> `claude-outside-ok`
    - `scripts/sync_agent_config.ps1 -Mode Check` -> exit `0`
    - repo/global inheritance headers verified across normalized agent files
  - Closing commit: `5c7c81d4`

### Sprint 1: Finish PRIME Hardening (Priority)
- [x] A1. Build PRIME policy table for all 9 methods.
  - For each method: intent, allowed outputs, blocked behaviors, allowed transitions
- [x] A2. Build PRIME knobs table.
  - For each method: knob name, type, bounds, lock/escalate/rollback, defaults
- [x] A3. Finalize PRIME runtime guardrails.
  - enforce non-assessment behavior
  - block assessment prompts/scored checks in PRIME
  - validate output shape (schema-aware)
- [ ] A4. Finalize `single_focus` and `module_all` handoff criteria.
  - if topic is known + small, allow focused mode by default
  - otherwise module_all-first path

### Sprint 2: Transfer Integrity (Blocking)
- [ ] B1. Verify method mapping parity across YAML, DB seed, wizard, and runtime.
- [ ] B2. Add one-pass drift check for method-stage mismatch and missing critical knobs.
- [ ] B3. Add one-page smoke report (`method_id -> stage -> artifact_type -> required knobs`).

### Sprint 2b: RAG + LLM Provider (Completed 2026-02-23)
- [x] B4. Fix RAG chunking for small docs (small-doc bypass ≤8K chars, two-stage header-aware splitting).
- [x] B5. Add cross-encoder reranker (`ms-marco-TinyBERT-L-2-v2`) to replace keyword scoring.
- [x] B6. Wire Gemini CLI as second LLM provider (`call_llm(provider="gemini")`).

### Sprint 2c: TutorChat Speed Tiers (Completed 2026-02-24)
- [x] TutorChat Speed Tiers — mode toggles (📚 Materials, 🗂️ Obsidian, 🔍 Web, 🧠 Deep Think),
      parallel RAG via ThreadPoolExecutor, model/reasoning per tier.
      Chat-only: ~1-2s. Full pipeline: ~5-8s (was 20+s).
      Plan: docs/plans/2026-02-24-tutor-chat-speed-tiers.md

### Sprint 2d: Custom Chain + Tutor UX (2026-03-03)
- [x] E1. Create C-TRY-002 ("Top-Down Forward Progress") personalized chain. `4d05d019`
  - 9 blocks, 3 tiered exit points (20/35/50 min), evidence-backed.
- [x] E2. Rename M-RET-001 from "Free Recall Blurt" to "Timed Brain Dump". `4d05d019`
  - Updated YAML, rebuilt 15-method-library.md, updated GUIDE_USER.md.
- [x] E3. Add visible block timer to Tutor chat UI. `fc0e449e`
  - Countdown timer widget in toolbar with pause/resume, color warnings (<2min yellow, <1min red, 0=pulse).
  - Stage badge (color-coded via CONTROL_PLANE_COLORS) + block name + progress fraction + skip-forward.
- [x] E4. Implement first-session skip logic for M-CAL-001 in C-TRY-002. `fc0e449e`
  - `_is_first_session_for_course()` + `_should_skip_block()` helpers in api_tutor.py.
  - Silently skips M-CAL-001 when course has <= 1 prior sessions.
- [x] E5. Tutor delete telemetry persistence + best-effort Obsidian cleanup. `b42c9e8f`
  - `tutor_delete_telemetry` table, in-panel confirm, bulk-delete report.

### Sprint 3: Video Study Pipeline Finish
- [x] C1. Confirm hybrid ingest routing for local vs API path. (2026-03-04)
  - Verified backend split: `/api/tutor/materials/video/process` runs local ingest pipeline (faster-whisper + keyframes/OCR + `ingest_video_artifacts`), while `/api/tutor/materials/video/enrich` runs optional API enrichment over processed segments with budget caps.
- [x] C2. Verify normal-session MP4 path in tutor flow (not only admin/test mode). (2026-03-04)
  - Verified Tutor Wizard Step 1 uses `MaterialSelector` with visible `Process MP4` and `Enrich` actions for selected MP4 materials (no admin-only gate).
- [x] C3. Add clear user-visible budget/failover status for API key switching. (2026-03-04)
  - Added `GET /api/tutor/materials/video/enrich/status` and frontend status row in `MaterialSelector` showing mode, monthly/video budget usage, key availability, reason, and local-only fallback state.

### Sprint 4: Tutor Smoothness + Notes Organization Audit
- [x] D1. Tutor smoothness + notes organization audit — full end-to-end audit per plan.
  - API↔UI contract verification (summary, artifact types, save path).
  - Notes persistence trace across tutor_sessions, quick_notes, card_drafts, Obsidian.
  - Runtime smoothness checks (latency, failure-path behavior).
  - Prioritized remediation blueprint with ranked fixes.
  - Deliverables: docs/root/TUTOR_AUDIT_REPORT.md, docs/root/TUTOR_AUDIT_REMEDIATION.md

### Sprint 5: Library Sync Folder Selective Upload + Class Assignment (2026-03-05)
- [x] L1. Add backend folder preview endpoint for Sync Study Folder.
  - Return nested folder/file tree from selected root path.
  - Include only allowed tutor material file types.
- [x] L2. Extend sync payload for selected file paths and optional class selection.
  - Allow syncing only checked files from tree (not whole folder by default).
  - Support assigning chosen class/course during sync ingest.
- [x] L3. Update Library Sync Study Folder UI.
  - Render full folder structure with checkboxes for file-level selection.
  - Add class picker in sync flow before upload starts.
- [x] L4. Validate end-to-end behavior. (2026-03-05)
  - Manual smoke: preview tree -> select subset -> choose class -> sync -> confirm class assignment in Your Materials.
  - Run required build/tests for touched areas.
  - Validation: `npm run build` (PASS), `pytest brain/tests -k "tutor and (sync or material or materials)"` (16 passed).
- [x] L5. Harden tutor chat timeout handling for long-response modes. (2026-03-05)
  - Raise model call timeout dynamically for Deep Think / Web Search / Gemini Vision turns.
  - Keep fallback Codex call timeout aligned with streaming timeout.
  - Update timeout error copy to include mode-toggle recovery guidance.

## Workstream Status Snapshot

### A1) PRIME Inventory + Stage Fit
- [x] Confirm active PRIME methods in app/DB and YAML.
- [x] Lock stage placements to PRIME for all active methods:
  - `M-PRE-001` Brain Dump
  - `M-PRE-002` Overarching Pre-Question Set
  - `M-PRE-003` Prior-Knowledge Activation Scan
  - `M-PRE-004` Hierarchical Advance Organizer
  - `M-PRE-005` Skeleton Concept Hierarchy
  - `M-PRE-006` Structural Skimming + Pillar Mapping
  - `M-PRE-008` Structural Extraction
  - `M-PRE-009` Syntopical Big-Picture Synthesis
  - `M-PRE-010` Learning Objectives Primer
- [x] Set final Provide/Produce policy for each visualization method.

### A2) PRIME Execution Contract (Policy)
- [x] Define PRIME output contract per method:
  - required artifact(s)
  - required fields
  - prohibited behavior (no scored checks, no retrieval scoring)
- [x] Define allowed orientation prompts vs blocked assessment behaviors.
- [ ] Define hard pass/exit criteria for PRIME -> CALIBRATE transition.

### A3) PRIME Knobs (Acute Variables)
- [x] Define method-specific knobs for each PRIME method.
- [ ] Set conservative defaults for first-exposure flow (`module_all` baseline).

### A4) PRIME Implementation Plan
- [x] Data/schema plan validated and mapped.
- [x] Runtime non-assessment guardrails defined and partly wired.
- [ ] Complete UI controls for safe knob visibility/editing without invalid combinations.

### A5) PRIME Acceptance Criteria
- [ ] Any PRIME block emits orientation artifact only.
- [x] PRIME cannot emit scored results.
- [x] CALIBRATE is first scored stage.
- [ ] Runtime chain validation rejects illegal stage transitions in all flows.

## Workstream B — Obsidian + RAG Graph
- [x] Finalize note artifact schema (`session_note`, `concept_note`, `graph_links`).
- [x] Implement wiki-link generation rules at artifact creation.
- [x] Add retrieval priority: module notes -> linked neighbors -> broader notes.
- [x] Add note graph extraction and persistence plan.

## Workstream C — Chain/Method Transfer Integrity
- [ ] Verify methods/chains are consistently represented across:
  - YAML source
  - DB seed/runtime
  - Tutor wizard
  - Tutor chat execution
- [ ] Add drift checks for method-stage mismatch and missing knob defaults.

## Workstream D — CALIBRATE Hardening (Completed 2026-02-22)
- [x] Hardened `M-CAL-001` (Micro Precheck) with scored-baseline constraints and full tutor prompt.
- [x] Hardened `M-CAL-002` (Confidence Tagging) with miscalibration risk outputs and full tutor prompt.
- [x] Hardened `M-CAL-003` (Priority Set) with deterministic top-3 routing and full tutor prompt.
- [x] Added Obsidian category note: `Study System/Categories/Calibrate.md` with operational spec + prompt blocks.

## Workstream E — Remaining Category Completion (Completed 2026-02-22)
- [x] Hardened ENCODE/REFERENCE/RETRIEVE/OVERLEARN method prompt contracts.
- [x] Promoted touched remaining-category cards to `validated`.
- [x] Synced all six category pages from method contracts:
  - `Study System/Categories/Prime.md`
  - `Study System/Categories/Calibrate.md`
  - `Study System/Categories/Encode.md`
  - `Study System/Categories/Reference.md`
  - `Study System/Categories/Retrieve.md`
  - `Study System/Categories/Overlearn.md`
- [x] Added one-command category sync script and CI test.

## Workstream F — Video Ingest (Free + API Hybrid)
- [ ] Execute remaining Phase-1 and Phase-2 items in `docs/root/TUTOR_VIDEO_INGEST_PLAN.md`.
- [ ] Add final session-path validation for MP4 uploads, local+API routing, and retrieval context.
- [ ] Add clear user-facing controls for failover and quota indicators.

## Immediate Next 3 Tasks (Use in this order)
1. [x] Add visible block timer component to tutor chat UI (E3). `fc0e449e`
2. [x] Implement first-session skip logic for M-CAL-001 (E4). `fc0e449e`
3. [x] Test C-TRY-002 end-to-end: upload materials -> start session -> walk 9 blocks -> verify tier exits. (2026-03-04)
   - API smoke verified on chain `Top-Down Forward Progress` (id 137): completed in 7 advances due to first-session silent skip of `M-CAL-001`.
   - Verified block trace: `M-PRE-004 -> M-PRE-011 -> M-REF-003 -> M-ENC-001 -> M-INT-001 -> M-ENC-009 -> M-ENC-004 -> M-OVR-004`.

## Granular Close-Out Queue (last-mile items from last tasks)

### Queue A — PRIME Hardening Closure

- [x] A1.1 Lock `PRIME` method boundaries for all 9 cards in one pass.
  - Files: `sop/library/methods/M-PRE-001.yaml` ... `M-PRE-010.yaml`
  - Done when: every method contract has `stage=PRIME`, `assessment=false`, and explicitly forbidden/allowed question behavior.

- [x] A1.2 Finalize and publish one canonical PRIME policy matrix.
  - Files: `docs/root/TUTOR_PRIME_DRAFT_MATRIX.md`, `docs/root/TUTOR_NORTH_STAR_RULES.md`, `docs/root/TUTOR_TRUTH_PATH.md`
  - Done when: `M-PRE-010` and `M-PRE-008` are marked `CONFIRMED` and no active TODO item references the draft as unresolved.

- [x] A1.3 Finish and freeze `module_all` / `single_focus` PRIME behavior.
  - Files: `docs/root/TUTOR_NORTH_STAR_RULES.md`, `docs/root/TUTOR_PRIME_DRAFT_MATRIX.md`, `brain/dashboard/api_tutor.py`, `dashboard_rebuild/client/src/pages/tutor.tsx`, `dashboard_rebuild/client/src/api.ts`
  - Done when: decision is hard-locked to module-first default and single-focus opt-in with consistent UI/backend schema and no fallback ambiguity.

- [x] A1.4 Close PRIME non-assessment enforcement in runtime.
  - Files: `brain/dashboard/api_tutor.py`, `brain/dashboard/api_contracts.py` (if applicable), `brain/tutor_chains.py`, `dashboard_rebuild/client/src/pages/methods.tsx`
  - Done when: automated check rejects any scored artifact/type-0 confidence fields in PRIME and no PRIME block can emit retrieval grade output.

- [x] A1.5 Verify PRIME control knobs are fully wired end-to-end.
  - Files: `sop/library/methods/*`, `brain/db_setup.py`, `brain/tutor_method_registry.py`, `brain/data/seed_methods.py`, `dashboard_rebuild/client/src/pages/methods.tsx`
  - Done when: all PRIME methods expose at least one active knob with bounds + fallback behavior and can be edited without UI validation errors.

### Queue B — Chain/Method Transfer Integrity

- [x] B1.1 Add parity check for method metadata across YAML, DB seed, runtime, and wizard/editor.
  - Files: `scripts/`, `brain/data/seed_methods.py`, `brain/db_setup.py`, `dashboard_rebuild/client/src/pages/methods.tsx`
  - Done when: a single command shows zero mismatched `control_stage`, `artifact_type`, or `best_stage` between YAML and DB cache.
  - Completed via: `python scripts/method_integrity_smoke.py` (`Failures: 0`; warnings currently only on missing DB knob cache fields for older DBs).

- [x] B1.2 Add one-pass stage-method validation check in tutor launch.
  - Files: `brain/tutor_chains.py`, `brain/dashboard/api_tutor.py`, `brain/tests/test_tutor_session_linking.py`
  - Done when: chain starts with `PRIME` and rejects invalid `stage->method` pairing before LLM call.

- [x] B1.3 Add runtime drift detector for missing `knob_snapshot`, missing method prompt, or missing artifact contract.
  - Files: `brain/dashboard/api_tutor.py`, `brain/tutor_tooling.py`, `brain/tests/test_method_cards_hardening.py`
  - Done when: 1) runtime telemetry includes block reason for every mismatch and 2) no critical mismatch enters active session.

- [x] B1.4 Produce one-page method integrity smoke report.
  - Files: `scripts/`, `docs/root/TUTOR_TODO.md`
  - Done when: each method row reports `method_id`, `stage`, `artifact_type`, and required knobs as pass/fail.
  - Report path: `docs/root/TUTOR_METHOD_INTEGRITY_SMOKE.md`.

### Queue C — Category Coverage and Documentation Closure

- [ ] C1.1 Ensure all 6 category pages include full method list + tutor prompt blocks.
  - Files: `C:\Users\treyt\Desktop\Treys School\Study System\Categories\Prime.md`, `.../Calibrate.md`, `.../Encode.md`, `.../Reference.md`, `.../Retrieve.md`, `.../Overlearn.md`, `.../Categories.md`
  - Done when: each category page has method inventory + `Method Contract` table + one executable prompt per method.

- [ ] C1.2 Reconcile manager-facing notes with code reality.
  - Files: `docs/root/TUTOR_TRUTH_PATH.md`, `docs/root/TUTOR_CATEGORY_DEFINITIONS.md`, `docs/root/TUTOR_METHOD_SELECTION_RULES.md`, `docs/root/TUTOR_NORTH_STAR_RULES.md`
  - Done when: there are no policy contradictions (e.g., "3-5 concepts only" vs "module_all mode") across these files.

- [ ] C1.3 Add/refresh "close-out" log for last-mile decisions and blockers.
  - Files: `conductor/tracks.md`, `conductor/tracks/GENERAL/log.md`
  - Done when: every unresolved blocker from this chat is explicitly logged with owner + expected fix date.

### Queue D — Video+MP4 + Budget Failover Closure

- [ ] D2.1 Verify normal-session MP4 path works in non-admin flows.
  - Files: `brain/dashboard/api_tutor.py`, `dashboard_rebuild/client/src/pages/tutor.tsx`, `dashboard_rebuild/client/src/components/MaterialSelector.tsx`
  - Done when: MP4 can be loaded from chat/materials and appears in selected-material retrieval context without manual API-only scripts.

- [ ] D2.2 Implement explicit key rotation and budget-failover visibility.
  - Files: `brain/.env`, `brain/video_ingest_bridge.py`, `brain/dashboard/api_tutor.py`, `dashboard_rebuild/client/src/components/TutorChat.tsx`
  - Done when: provider switching is automatic on quota/rate signals and user sees current provider + remaining budget status.

- [ ] D2.3 Add regression test for MP4 session-context + provider fallback.
  - Files: `brain/tests/test_video_process_api.py`, `brain/tests/test_tutor_session_linking.py`
  - Done when: tests cover upload->process->scope->chat-turn retrieval path with fallback simulation.

### Queue E — UI/Method Controls (Methods Board Polish)

- [ ] E1.1 Lock methods controls (Favorite/Rate/Edit) and remove stale destructive action from board cards.
  - Files: `dashboard_rebuild/client/src/pages/methods.tsx`
  - Done when: controls are always-visible, non-overlapping, and map to documented actions.

- [ ] E1.2 Validate dropdown/select reliability in method edit workflows.
  - Files: `dashboard_rebuild/client/src/pages/methods.tsx`, `dashboard_rebuild/client/src/components/ui/select.tsx`
  - Done when: category/stage dropdown selections save reliably in one interaction on desktop and mobile widths.

- [ ] E1.3 Restore compact fallback path for prompt edits and reset behavior.
  - Files: `dashboard_rebuild/client/src/pages/methods.tsx`, `brain/dashboard/api_tutor.py`
  - Done when: tutor prompt edits preserve schema fields and can be reset to canonical template in one action.

## Execution Rules for this board

- Do not mark a task complete until its "done when" criteria pass in code and tests or are manually verified.
- Keep task scope one step at a time; no broad refactors without a linked queue ID.
- For every completed queue item that changes behavior, add one dated entry to `conductor/tracks/GENERAL/log.md`.

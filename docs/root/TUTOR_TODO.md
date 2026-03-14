# Tutor TODO (Execution Tracker)

Date: 2026-03-12
Owner: Trey
Authority: execution-only sprint and backlog tracker. Product/page ownership lives only in `docs/root/TUTOR_STUDY_BUDDY_CANON.md`.
Purpose: keep implementation work ordered, visible, and tied to tests and verification gates without redefining the product.

- Product/ownership authority: `docs/root/TUTOR_STUDY_BUDDY_CANON.md`
- Supporting technical/runtime docs: `docs/root/PROJECT_ARCHITECTURE.md`, `docs/root/GUIDE_DEV.md`
- Conductor execution registry: `conductor/tracks.md`

## Current Board (In-Progress)

- Canonical execution order: `PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`
- [x] Scholar/Tutor contract alignment hardening (2026-03-04):
  - Added deterministic Scholar question lifecycle persistence + answer endpoint.
  - Added explicit Scholar proposal approve/reject endpoints.
  - Aligned Scholar status/history API compatibility and frontend API usage.
- Execution references:
  - `docs/root/TUTOR_STUDY_BUDDY_CANON.md` (master product canon)
  - `docs/root/TUTOR_TODO.md` (active execution board)
  - `conductor/tracks.md` (track registry / archival)
- Historical note: completed sprint entries below remain as execution history. If any older wording conflicts with the canon, the canon wins.

## Active Sprint 2026-03-13

### Sprint 29: Agent Ecosystem Hygiene (2026-03-13)
- [x] Claim scope: normalize multi-CLI skill topology, repair supported active roots, remove plaintext secrets from supported active config, and close the related operator-doc drift
  - `conductor/tracks/agent-ecosystem-hygiene_20260313/`
  - `docs/root/TUTOR_TODO.md`
  - `docs/root/AGENT_BOARD.md`
  - `conductor/tracks.md`
  - `conductor/tracks/GENERAL/log.md`
  - `docs/root/SKILLS_INVENTORY.md`
  - `docs/root/AGENT_SETUP.md`
  - `scripts/sync_agent_skills.ps1`
  - `C:\Users\treyt\.agents\README.md`
  - supported home roots under `C:\Users\treyt\.claude\`, `C:\Users\treyt\.codex\`, `C:\Users\treyt\.cursor\`, `C:\Users\treyt\.gemini\`, `C:\Users\treyt\.antigravity\`, `C:\Users\treyt\.opencode\`, and `C:\Users\treyt\.kimi\`
  - Completed 2026-03-13: opened `conductor/tracks/agent-ecosystem-hygiene_20260313/`, registered the track, claimed the live agent board, and appended the kickoff log entry.
- [x] Wave A: track bootstrap + topology proof
  - claim the work on the sprint/board/track surfaces
  - capture runtime evidence for each CLI
  - freeze supported roots, legacy roots, and local exceptions before mutation
  - Completed 2026-03-13: captured the per-tool evidence matrix in `conductor/tracks/agent-ecosystem-hygiene_20260313/evidence.md` and froze the supported topology in `conductor/tracks/agent-ecosystem-hygiene_20260313/decision-record.md`.
- [x] Wave B: rollback + sync harness hardening
  - create rollback artifacts before any home-directory change
  - repair `scripts/sync_agent_skills.ps1`
  - prove `DryRun -> Apply -> Check -> Check` against the frozen topology
  - Completed 2026-03-13: wrote the rollback bundle summary to `conductor/tracks/agent-ecosystem-hygiene_20260313/rollback.md`, created the external backup manifest under `C:\Users\treyt\.agents\backups\agent-ecosystem-hygiene_20260313\manifest.json`, and passed the fixture harness `powershell -ExecutionPolicy Bypass -File scripts/test_sync_agent_skills_fixture.ps1`.
- [x] Wave C: supported root repair + Gemini branch resolution
  - normalize supported non-embedded roots
  - either normalize or quarantine the embedded Gemini Antigravity subtree based on runtime proof
  - Completed 2026-03-13: `scripts/sync_agent_skills.ps1 -Mode Apply` passed, both follow-up `-Mode Check` runs passed, the supported-root broken-junction scan returned `0` broken junctions across Claude/Codex/Cursor/OpenCode/Gemini/Antigravity, and the embedded Gemini subtree quarantine was recorded in `conductor/tracks/agent-ecosystem-hygiene_20260313/quarantine.md`.
- [x] Wave D: config secret hardening
  - audit supported and legacy configs
  - remove plaintext secrets from supported active config
  - capture rotation evidence or an explicit blocker
  - Completed 2026-03-13: recorded the redacted findings and env-injection decision in `conductor/tracks/agent-ecosystem-hygiene_20260313/security-audit.md`, moved the inline GitHub/Obsidian secrets out of `C:\Users\treyt\.gemini\antigravity\mcp_config.json`, re-ran the redacted scan to `0` findings, and logged the remaining credential-rotation work in `conductor/tracks/agent-ecosystem-hygiene_20260313/rotation-blocker.md`.
- [x] Wave E: docs, fallback alignment, and close-out
  - update repo/operator docs and conditional fallback docs
  - run the final validation set and close the track
  - Completed 2026-03-13: updated `docs/root/SKILLS_INVENTORY.md`, `docs/root/AGENT_SETUP.md`, `C:\Users\treyt\.agents\README.md`, and `C:\Users\treyt\.gemini\GEMINI.md`; final validation passed on docs sync, agent-config sync, skill sync, broken-junction scan, and `git diff --check`; the remaining manual credential rotation work is explicitly logged in `conductor/tracks/agent-ecosystem-hygiene_20260313/rotation-blocker.md`.
- [ ] Validation
  - `scripts/sync_agent_skills.ps1 -Mode DryRun`
  - `scripts/sync_agent_skills.ps1 -Mode Apply`
  - `scripts/sync_agent_skills.ps1 -Mode Check`
  - supported-root broken-junction scan
  - redacted secret scan over supported active config
  - `scripts/sync_agent_config.ps1 -Mode Check`
  - `git diff --check`

### Carry-Forward Tutor Closeouts (2026-03-13)
- [x] Close `tutor_vision_lock_20260301` with the locked contract package, dual review fold-in, automated validation (`64 passed`), and live Tutor smoke.
  - `conductor/tracks/tutor_vision_lock_20260301/`
  - `brain/tutor_prompt_builder.py`
  - `brain/tests/test_chain_runner.py`
  - `conductor/tracks.md`
  - `docs/root/AGENT_BOARD.md`
  - `docs/root/TUTOR_TODO.md`

### Sprint 28: Course-Keyed Tutor Shell + Studio Foundation (2026-03-13) — COMPLETE
- [x] Claim scope: open the durable track for the course-keyed Tutor shell plan and land the first backend foundation slice for course-keyed shell state and summary APIs
  - `conductor/tracks/course-keyed-tutor-shell_20260313/`
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks.md`
  - `brain/db_setup.py`
  - `brain/dashboard/api_tutor.py`
  - `brain/dashboard/api_tutor_projects.py`
  - `brain/dashboard/api_tutor_studio.py`
  - `brain/tests/test_tutor_project_shell.py`
  - `dashboard_rebuild/client/src/api.ts`
  - `dashboard_rebuild/client/src/api.types.ts`
  - `dashboard_rebuild/client/src/__tests__/api.test.ts`
- [x] Wave A: track + workboard bootstrap
  - Create the Conductor track with durable `spec.md` and `plan.md`.
  - Register the active track in `conductor/tracks.md`.
  - Keep the full roadmap in the track rather than the flat planner queue.
- [x] Wave B: backend shell-state foundation
  - Add `project_workspace_state`.
  - Add normalized Studio tables needed for future shell counts and restore behavior.
  - Add a Tutor project-shell summary endpoint and a workspace-state persistence endpoint keyed by `course_id`.
- [x] Wave C: verification
  - Add targeted backend tests for the new tables and Tutor shell endpoints.
  - Verify no existing Tutor session routes regress.
  - Wire the new Tutor shell + Studio contract into the frontend API layer and verify it.
- [x] Validation
  - `pytest brain/tests/test_tutor_project_shell.py brain/tests/test_tutor_session_linking.py brain/tests/test_dashboard_routes.py -q`
  - `cd dashboard_rebuild && npm run test -- client/src/__tests__/api.test.ts`
  - `cd dashboard_rebuild && npm run build`
- [x] Wave D: standalone Schedule and Publish mode components
  - Build reusable `TutorScheduleMode` and `TutorPublishMode` components under `dashboard_rebuild/client/src/components/` on a disjoint write scope from the shell integration.
  - Reuse existing planner, syllabus, calendar, Anki, and Obsidian APIs/components where practical without changing `pages/tutor.tsx` unless strictly required.
  - Add focused component tests and keep the result drop-in ready for later Tutor shell wiring.
  - Validation:
    - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/SyllabusViewTab.test.tsx client/src/components/__tests__/TutorScheduleMode.test.tsx client/src/components/__tests__/TutorPublishMode.test.tsx`
    - `cd dashboard_rebuild && npm run build`
- [x] Wave E: Studio boards and capture flows integration
  - Implement studio board state machine, capture and promotion paths, and component-level coverage.
- [x] Wave F: Viewer and dictation integration
  - Deliver browser-based PDF/DOCX/MP4 viewer support plus Chromium-first dictation and test coverage.
- [x] Wave G: Schedule, publish, and sync hardening
  - Finalize schedule/publish surfaces, popout sync, failure-path hardening, and release-proof smoke path.
- [x] Track verification and closeout
  - All phase milestones (0 through 6) are complete in `conductor/tracks/course-keyed-tutor-shell_20260313/plan.md`.

### Sprint 27: Trey’s Swarm Planner Skill (2026-03-13)
- [x] Claim scope: package the planning method used in this repo into a reusable `treys-swarm-planner` skill with a portable personal core and a PT Study System repo adapter
  - `C:\Users\treyt\.agents\skills\treys-swarm-planner\`
  - `C:\pt-study-sop\.codex\skills\treys-swarm-planner-repo\`
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks/GENERAL/log.md`
- [x] Wave A: core skill contract
  - Create the personal `treys-swarm-planner` package with `SKILL.md`, `reference.md`, `examples.md`, and reusable planning/audit/task templates.
  - Lock the generic workflow: ground context, define goal/constraints/out-of-scope/assumptions, build backward, attach task gates, audit with multiple reviewers, revise, and convert to executable tasks.
- [x] Wave B: PT repo adapter
  - Create the repo-local `treys-swarm-planner-repo` package that maps the generic workflow onto repo canon, Conductor tracks, planner APIs, and `study_tasks`.
  - Explicitly forbid obsolete task-board assumptions and duplicate project/task systems.
- [x] Wave C: dry review and closeout
  - Run a structural dry review against a real planning scenario and tighten both skill packages until the workflow is clear and reusable.
- [x] Validation
  - Manual skill-package checklist:
    - personal core skill works without PT repo assumptions
    - repo adapter references `AGENTS.md`, `docs/root/TUTOR_STUDY_BUDDY_CANON.md`, `docs/root/TUTOR_TODO.md`, `conductor/tracks/`, planner APIs, and `study_tasks`
    - both packages require multi-review audit and revised final plan before acceptance
    - task-conversion guidance supports flat markdown output and queue-backed planner output

### Sprint 26: Gap Hardening Before Tutor Deep Dive (2026-03-12) — COMPLETE
- [x] Claim scope: tighten shell/workspace proof, Methods/chains page-level proof, and one true full-circle Tutor session proof before deeper Tutor feature work
  - `docs/root/TUTOR_TODO.md`
  - `docs/root/GUIDE_DEV.md`
  - `dashboard_rebuild/client/src/pages/__tests__/brain.test.tsx`
  - `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
  - `dashboard_rebuild/client/src/components/__tests__/TutorWorkspaceSurface.test.tsx`
  - `dashboard_rebuild/client/src/pages/methods.tsx`
  - `brain/dashboard/api_tutor_turns.py`
  - `brain/tests/`
  - `scripts/live_tutor_smoke.py`
- [x] Wave A: frontend proof hardening
  - Add route-ready shell assertions and isolate full-App test state.
  - Add non-mocked Tutor workspace integration proof for notes/canvas/graph/table.
  - Add page-level `/methods` regression coverage plus Tutor/Methods chain consistency proof.
  - Completed 2026-03-13: stabilized the Excalidraw integration mock so the real Tutor workspace canvas proof stops self-triggering render loops, and aligned the table-surface save assertion with the current accessible label (`Save to vault`).
- [x] Wave B: backend streaming proof hardening
  - Add explicit turn-stream contract coverage.
  - Add first-chunk / retrieval / tool-round timing visibility.
  - Add SSE heartbeat support without changing the JSON `data:` frame contract.
  - Completed 2026-03-13: added `brain/tests/test_tutor_turn_stream_contract.py`, wired timing metadata (`retrieval_ms`, `first_chunk_ms`, `tool_rounds`, `total_ms`) into Tutor SSE `done` frames, and added comment-frame heartbeat support on the streaming response wrapper.
  - Validation:
    - `pytest brain/tests/test_tutor_turn_stream_contract.py brain/tests/test_tutor_session_linking.py -q`
- [x] Wave C: live readiness check
  - Add `scripts/live_tutor_smoke.py` for `preflight -> create -> turn -> restore/summary -> end -> delete`.
  - Document the thin browser smoke checklist for `/tutor` workspace and `/methods`.
  - Progress 2026-03-13: rewrote `scripts/live_tutor_smoke.py` onto the current `/api/tutor/session*` contract and real preflight flow using course materials + learning objectives.
  - Completed 2026-03-13: live `Start_Dashboard.bat` smoke passed with `python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000`, and thin browser smoke passed on `/tutor` workspace plus `/methods`.
- [x] Validation
  - `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/brain.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/components/__tests__/TutorWorkspaceSurface.test.tsx client/src/components/__tests__/TutorWorkspaceSurface.integration.test.tsx client/src/pages/__tests__/methods.test.tsx`
  - `pytest brain/tests/test_tutor_turn_stream_contract.py brain/tests/test_e2e_study_session.py brain/tests/test_tutor_session_linking.py brain/tests/test_tutor_artifact_certification.py -q`
  - `Start_Dashboard.bat`
  - `python scripts/live_tutor_smoke.py`
  - live browser smoke on `/tutor` workspace and `/methods`
  - Completed 2026-03-13:
    - `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/brain.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/components/__tests__/TutorWorkspaceSurface.test.tsx client/src/components/__tests__/TutorWorkspaceSurface.integration.test.tsx client/src/pages/__tests__/methods.test.tsx` -> `43 passed`
    - `pytest brain/tests/test_tutor_turn_stream_contract.py brain/tests/test_e2e_study_session.py brain/tests/test_tutor_session_linking.py brain/tests/test_tutor_artifact_certification.py -q` -> `54 passed`
    - `Start_Dashboard.bat`
    - `python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000`
    - live browser smoke on `/tutor` workspace and `/methods`

### Sprint 25: Canon Collapse + Pre-Tutor Hardening Program (2026-03-12)
- [x] Claim scope: collapse repo truth into one canon, remove active drift between Brain / Scholar / Tutor docs and shell behavior, then finish the remaining pre-Tutor hardening work before new Tutor feature development
  - Master canon: `docs/root/TUTOR_STUDY_BUDDY_CANON.md`
  - Execution board: `docs/root/TUTOR_TODO.md`
  - Conductor execution surfaces: `conductor/`
  - Frontend shell: `dashboard_rebuild/client/src/`
  - Tutor backend/runtime: `brain/`
- [x] Wave A: canon collapse and drift enforcement
  - Completed tasks: `A1-A13`
  - Validation:
    - `python scripts/check_docs_sync.py`
    - `git diff --check`
- [x] Wave B: Brain / Tutor / Scholar ownership cleanup
  - Completed tasks: `B1-B8`
  - Validation:
    - `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/brain.test.tsx`
    - `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.test.tsx`
    - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/TutorWorkspaceSurface.test.tsx`
    - `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/scholar.test.tsx`
- [x] Wave C: support routes and shell integrity
  - Completed tasks: `C1-C4`
  - Validation:
    - `pytest brain/tests/test_dashboard_routes.py -q`
    - `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/library.test.tsx client/src/pages/__tests__/mastery.test.tsx client/src/pages/__tests__/brain.test.tsx`
    - live `Start_Dashboard.bat` shell smoke for Brain, Tutor, Scholar, Calendar, Library, Mastery, Methods, and Vault Health
- [x] Wave D: Tutor dive readiness hardening
  - Completed tasks: `D1-D10`
  - Validation:
    - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/TutorWizard.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/pages/__tests__/library.test.tsx`
    - `pytest brain/tests/test_tutor_session_linking.py brain/tests/test_tutor_artifact_certification.py brain/tests/test_tutor_audit_remediation.py brain/tests/test_tutor_rag_embedding_provider.py brain/tests/test_tutor_embed_status_api.py -q`
- [x] Wave E: final verification and closeout
  - Completed tasks: `E1-E5`
  - Validation:
    - `python scripts/check_docs_sync.py`
    - `cd dashboard_rebuild && npm run check`
    - `cd dashboard_rebuild && npm run test`
    - `cd dashboard_rebuild && npm run build`
    - `pytest brain/tests/ -q`
    - live `Start_Dashboard.bat` smoke for `/`, `/brain`, `/tutor`, `/scholar`, `/calendar`, `/library`, `/mastery`, `/methods`, `/vault-health`, plus `preflight -> create -> restore -> end -> post-end artifact mutation attempt -> delete` and `GET /api/tutor/embed/status`

### Sprint 24: Tutor Dive Readiness Audit + Pre-Tutor Hardening (2026-03-12)
- Historical note: Sprint 25 is now the live execution queue. Sprint 24 remains here as the audit trail that fed the new wave.
- [x] Claim scope: capture post-triad follow-on improvements and run a deep audit for the next Tutor-focused implementation wave
  - `docs/root/TUTOR_TODO.md`
  - `docs/root/TUTOR_DIVE_READINESS_AUDIT_2026-03-12.md`
  - `conductor/tracks/GENERAL/log.md`
  - Tutor frontend surfaces under `dashboard_rebuild/client/src/pages/tutor.tsx` and related components/tests
  - Tutor backend/runtime surfaces under `brain/dashboard/api_tutor*.py`, `brain/tutor_rag.py`, and related tests
- [x] Phase 0: record the already-known follow-on improvements from Sprint 23 closeout.
  - [x] T-1200: confirm deprecated LangChain `Chroma` usage still needs a migration task and keep it in the live pre-Tutor backlog
  - [x] T-1201: confirm per-document embed failure telemetry is still missing and keep it in the live pre-Tutor backlog
  - [x] T-1202: confirm the shell-route `act(...)` warnings still need a cleanup pass before the next Tutor wave
- [x] Phase 1: audit Tutor readiness across frontend flow, backend/session contracts, retrieval/materials, and test coverage before any new Tutor feature wave starts.
  - [x] T-1210: audit Tutor frontend flow, restore/handoff behavior, and page-level hierarchy
  - [x] T-1211: audit Tutor backend/session contract, preflight, artifact, and delete/restore safety
  - [x] T-1212: audit retrieval/materials/embed/runtime dependencies and operational failure visibility
  - [x] T-1213: audit Tutor test coverage, smoke coverage, and missing acceptance gates
- [x] Phase 2: convert the audit into a concrete pre-Tutor task list with dependencies and pass gates.
  - [x] T-1220: publish the prioritized pre-Tutor task list in this workboard before starting the next Tutor build
- [x] Phase 3: execute the confirmed pre-Tutor hardening backlog before any new Tutor feature wave starts.
  - Audit reference: `docs/root/TUTOR_DIVE_READINESS_AUDIT_2026-03-12.md`
  - Delivery note: Sprint 25 executed and closed the viable Phase 3 hardening items before opening new Tutor feature work.
  - Completed items:
    - `T-1230-T-1234`: Gemini/Chroma runtime contract, provider truth, failure visibility, and config/status hardening
    - `T-1240-T-1243`: preflight-first Tutor start, Brain handoff precedence, resume-state consistency, and scoped restore coverage
    - `T-1250-T-1253`: stable session-create validation, preflight lifecycle hardening, post-end lifecycle enforcement, and delete-warning coverage
    - `T-1260-T-1263`: support-route regression proof, docs/runbook cleanup, shell-route warning cleanup, and final readiness sweep

### Sprint 23: Brain-Centered Triad Reframe (2026-03-12)
- [x] Claim scope: corrected one-student Brain / Scholar / Tutor end-state with Tutor as the bread-and-butter live engine + reverse-built implementation roadmap
  - `conductor/tracks/brain-centered-triad_20260312/`
  - `tasks/prd-brain-centered-triad.md`
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks.md`
  - `conductor/index.md`
- [x] Phase 0: open the track, capture locked learnings and open questions, and document the end-goal-first planning rule.
- [x] Phase 1: freeze the corrected end-state contract for Brain home ownership, Tutor work-surface ownership, and Scholar system-facing investigation authority.
- [x] Phase 2: work backward into small, feasible implementation slices with required tests that must pass before any new slice starts.
- [x] Phase 3: publish the PRD and freeze the tonight cut line for the first executable implementation wave.
  - Tonight cut line:
    - Shell/route collapse so Brain becomes home, Dashboard stops being a peer page, and Tutor is the clearest next action.
    - Brain home top section with the Tutor-first attention queue and split stats bands.
    - Product framing cleanup for Tutor, Scholar, and the support pages so the app reads as one personal study program.
- [x] Phase 4: implement Slice 1 (`Shell + Route Collapse`) and verify it before starting Slice 2.
- [x] Phase 5: implement Slice 2 (`Brain Home Composition`) with the attention queue, split stats, and Brain-owned support launches.
- [x] Phase 6: implement Slice 3 (`Tutor-Centered Framing Cleanup`) and retire Dashboard as a live peer page.
  - Validation:
    - `cd dashboard_rebuild && npm run check`
    - `cd dashboard_rebuild && npm run test`
    - `cd dashboard_rebuild && npm run build`
    - `cmd /c Start_Dashboard.bat`
  - Live smoke:
    - Clean-state `/` loads Brain Home with Brain highlighted in nav and support pages grouped under `SUPPORT SYSTEMS`.
    - Tutor and Scholar both show the corrected triad framing in the live app.
  - Follow-up fixed in the same sprint:
    - `/api/mastery/dashboard` now returns `200` against the live local data set.
    - Brain home now renders live mastery counts instead of relying on the fallback state.
- [x] Phase 7: stabilize the shell/header and remove the post-cut regression before more product polish.
  - [x] T-700: repair the broken desktop header/nav layout in `dashboard_rebuild/client/src/components/layout.tsx`
  - [x] T-701: add resilient responsive behavior for the shell header so desktop/tablet/mobile widths stop clipping or crowding
  - [x] T-702: add regression tests for shell routing + grouped triad/support nav framing
  - [x] T-703: harden Brain home persistence and bad `localStorage` recovery so `home` stays the safe default
  - [x] T-704: remove remaining live Dashboard-era labels, route assumptions, and stale references from the frontend shell
- [x] Phase 8: finish the Brain home data and action layer after the shell is stable.
  - [x] T-800: diagnose and fix the live `/api/mastery/dashboard` `500`
  - [x] T-801: replace Brain home mastery fallback with real mastery state rendering
  - [x] T-802: harden Brain attention queue ordering and dedupe rules
  - [x] T-803: make Brain queue actions carry the correct destination context into Tutor / Calendar / Scholar
  - [x] T-804: refine Brain home section hierarchy and spacing so the top queue stays dominant
  - [x] T-805: tighten the course breakdown and study-rotation sections into real next-action surfaces
  - [x] T-806: demote onboarding/data-rights controls into a quieter `System / Setup` block
  - Validation:
    - `pytest brain/tests/test_mastery_api.py -q`
    - `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/brain.test.tsx`
    - live `GET http://127.0.0.1:5000/api/mastery/dashboard` -> `200`
- [x] Phase 9: finish the hierarchy cleanup around Brain / Scholar / Tutor.
  - [x] T-900: make Brain-to-Tutor handoff feel intentional everywhere
  - [x] T-901: clean up Tutor copy and top-of-page framing without breaking session restore or structured notes
  - [x] T-902: finish the Scholar investigation-console recenter
  - [x] T-903: add mirrored-reference treatment for Scholar items shown in Brain/Tutor
  - [x] T-904: reframe Library, Mastery, Calendar, Methods, and Vault Health as support systems instead of peer products
  - Validation:
    - `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/brain.test.tsx client/src/pages/__tests__/scholar.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/pages/__tests__/library.test.tsx client/src/pages/__tests__/mastery.test.tsx`
    - live route smoke on `/`, `/brain`, `/tutor`, `/scholar`, `/library`, `/mastery`, `/calendar`, `/methods`, `/vault-health`
- [x] Phase 10: run the stabilization regression wave and close the docs loop.
  - [x] T-1000: run full frontend verification after the stabilization wave
  - [x] T-1001: rerun live app smoke on Brain / Scholar / Tutor + support routes
  - [x] T-1002: sync canon/docs to the shipped interface architecture once the UI is stable
  - Validation:
    - `cd dashboard_rebuild && npm run check`
    - `cd dashboard_rebuild && npm run test`
    - `cd dashboard_rebuild && npm run build`
    - `git diff --check`
- [x] Phase 11: finish the Gemini embedding migration and rollout hardening.
  - [x] T-1100: lock Tutor RAG to the Gemini-first embedding provider contract with OpenAI fallback preserved
  - [x] T-1101: verify provider-scoped collection behavior and safe re-embed behavior for existing material corpora
  - [x] T-1102: surface the active embedding provider/model clearly in the Tutor or Library workflow where users can actually see it
  - [x] T-1103: update runbook/docs from OpenAI-only embedding assumptions to the real Gemini-first configuration
  - [x] T-1104: run a live embed smoke against the local app and confirm Gemini is selected, status is truthful, and failures degrade cleanly
  - Validation:
    - `pytest brain/tests/test_tutor_rag_embedding_provider.py brain/tests/test_tutor_embed_status_api.py -q`
    - live `GET http://127.0.0.1:5000/api/tutor/embed/status`
    - live `POST http://127.0.0.1:5000/api/tutor/embed`
  - Notes captured for later:
    - migrate off the deprecated LangChain `Chroma` adapter to `langchain_chroma`
    - add per-document embed failure telemetry so the UI can show why a file was skipped

### Sprint 21: Brain / Scholar / Tutor Realignment + Premium Individual Foundation (2026-03-11)
- [ ] Claim scope: product contract freeze + conductor roadmap
  - `conductor/tracks/brain-scholar-tutor-realignment_20260311/`
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks.md`
  - `docs/root/TUTOR_STUDY_BUDDY_CANON.md`
  - `docs/root/TUTOR_OWNER_INTENT.md`
  - `docs/root/PROJECT_ARCHITECTURE.md`
  - `conductor/product.md`
  - `scholar/CHARTER.md`
  - `scholar/README.md`
  - `docs/root/GUIDE_USER.md`
- [x] Phase 0: clean the worktree, open the conductor track, publish the decision record, and freeze the roadmap/gap matrix.
- [x] Phase 1: align active canon and product docs to the frozen Brain / Scholar / Tutor contract.
  - Updated the master canon, owner intent, project architecture, conductor product definition, Scholar charter/quickstart, and user guide so they now describe the same Brain / Scholar / Tutor contract.
- [x] Phase 2: freeze Brain learner-model ontology, evidence ownership, and migration rules.
  - Published `brain-ontology.md` and `brain-evidence-map.md` in the active conductor track to freeze claim/archetype/question semantics, evidence tiers, and backfill rules.
- [x] Phase 3: ship Brain learner-profile MVP.
  - Added persisted Brain learner-profile snapshots/claims/questions/feedback events, the `/api/brain/profile*` API surface, and the new `PROFILE` tab inside `/brain`.
  - Validation:
    - `pytest brain/tests/test_brain_profile_api.py -q`
    - `npm run test -- LearnerProfilePanel.test.tsx`
    - `npm run build`
    - `pytest brain/tests/ -q`
    - `cmd /c Start_Dashboard.bat`
    - `GET /api/brain/profile`
- [x] Phase 4: ship the first Scholar investigation MVP with cited web research.
  - Added persisted Scholar investigations, learner questions, normalized source metadata, cited findings, and visible uncertainty handling.
  - Shipped `/api/scholar/research/*` plus the Scholar investigation workspace with investigation, questions, and findings lanes.
- [x] Phase 5: define and validate the bounded Scholar-to-Tutor strategy envelope.
  - Added Scholar strategy snapshots, bounded adaptive fields, Tutor provenance logging, and strategy feedback capture.
  - Verified that Brain cannot bypass Scholar and Tutor remains SOP/chain-bound.
- [x] Phase 6: redesign the premium shell, onboarding, trust surfaces, and commercial hardening artifacts.
  - Promoted Brain / Scholar / Tutor as the primary product shell, added premium onboarding, value-proof dashboard cards, privacy/retention controls, export surfaces, feature flags, and learner-facing outcome reports.
  - Published commercial readiness + demo artifacts in `conductor/tracks/brain-scholar-tutor-realignment_20260311/`.
  - Validation:
    - `pytest brain/tests/test_product_api.py brain/tests/test_brain_profile_api.py brain/tests/test_scholar_research_api.py brain/tests/test_tutor_strategy_mediation.py -q`
    - `npm run test -- scholar.test.tsx api.test.ts`
    - `npm run build`
    - `pytest brain/tests/ -q`
    - `cmd /c Start_Dashboard.bat`
    - live API smokes for `/api/brain/profile`, `/api/product/analytics`, `/api/product/privacy`, and `/api/product/outcome-report`

### Sprint 22: Movement Science 1 Construct 2 Study Flow Verification (2026-03-11)
- [x] Claim scope: Movement Science 1 live study-unit setup + Tutor preflight verification
  - `docs/root/TUTOR_TODO.md`
  - `C:\Users\treyt\Desktop\Treys School\Courses\Movement Science\`
  - `brain/data/pt_study.db`
  - `brain/dashboard/api_tutor_sessions.py`
  - `brain/dashboard/api_tutor_vault.py`
  - `brain/data/vault_courses.yaml`
- [x] Phase 0: locate the live Construct 2 source files on this PC and confirm the exact study-unit scope.
  - Confirmed the live unit is `Construct 2 - Lower Quarter` for `PHYT 6314 / Movement Science`, with the source corpus still living under `C:\Users\treyt\OneDrive\Desktop\PT School\Movement Science 1\Construct 2 Lower Quarter\`.
- [x] Phase 1: seed the canonical Obsidian unit folder and hub notes for Movement Science Construct 2 without creating vault drift.
  - Confirmed the canonical vault path `C:\Users\treyt\Desktop\Treys School\Courses\Movement Science\Construct 2 - Lower Quarter\` contains the shared hub notes `Learning Objectives & To Do.md` and `_Map of Contents.md`.
  - Hardened Tutor session cleanup so shared hub notes are not deleted when a session is removed.
- [x] Phase 2: attach/import the Construct 2 materials and approved objectives so Tutor preflight has valid scope data.
  - Confirmed course `id=4` contains approved objectives `OBJ-001` through `OBJ-028` for `Construct 2 - Lower Quarter`.
  - Confirmed the live material corpus is attached in `rag_docs`, including the baseline preflight set `#535-#537` plus deeper Hip/Knee/Foot-and-Ankle source files.
- [x] Phase 3: run a real preflight verification, confirm `vault_ready`, and document the study-start path for the live session.
  - Live `POST /api/tutor/session/preflight` against `http://127.0.0.1:5000` returned `ok=true`, `vault_ready=true`, no blockers, and both canonical pages in `reviewed` status.
  - Study-start path: select course `Movement Science`, choose study unit `Construct 2 - Lower Quarter`, keep `module_all` scope (or pick a single objective), select the desired Construct 2 materials, then create the session from the returned `preflight_id`.
  - Validation:
    - `pytest brain/tests/test_tutor_audit_remediation.py -q`
    - `npm run build`
    - `cmd /c Start_Dashboard.bat`
    - live `POST /api/tutor/session/preflight` for course `4` with material ids `535,536,537`

### Sprint 20: Vault Stabilization + Health Truthfulness (2026-03-10)
- [x] Claim scope: live Obsidian vault contract + truthful Vault Health diagnostics
  - `docs/root/TUTOR_TODO.md`
  - `brain/course_map.py`
  - `brain/data/vault_courses.yaml`
  - `brain/obsidian_index.py`
  - `brain/vault_janitor.py`
  - `brain/dashboard/api_janitor.py`
  - `brain/dashboard/api_adapter.py`
  - `brain/dashboard/api_tutor_sessions.py`
  - `brain/dashboard/api_tutor_utils.py`
  - `brain/dashboard/api_tutor_vault.py`
  - `dashboard_rebuild/client/src/api.types.ts`
  - `dashboard_rebuild/client/src/pages/vault-health.tsx`
  - `brain/tests/test_course_map.py`
  - `brain/tests/test_path_generation.py`
  - `brain/tests/test_tutor_audit_remediation.py`
  - `brain/tests/test_vault_janitor.py`
  - `brain/tests/test_vault_janitor_live.py`
  - `conductor/tracks/GENERAL/log.md`
- [x] Phase 0: align the live vault contract, plugin assumptions, and course-map naming with the audited `Treys School` structure.
- [x] Phase 1: make wikilink resolution truthful across aliases, heading/block-style targets, and scan accounting.
- [x] Phase 2: replace one-size-fits-all janitor rules with family-aware validation and issue-class summaries.
- [x] Phase 3: harden Tutor routing so unmapped vault writes fail clearly instead of producing `OBJ-UNMAPPED` drift.
- [x] Phase 4: rebuild the Vault Health UI so it explains actions, shows where issues live, and separates real breakage from advisory/system noise.
- [x] Phase 5: validate backend/frontend behavior, update the log, and record follow-up content gaps separately from system drift.
  - Follow-up remediation completed on 2026-03-11:
    - moved fake `Courses/General Class/Test Module/*` reconcile artifacts into `Study System/Sandbox/Reconcile/`
    - resynced active `Courses/*/<unit>` command-center pages so live units no longer carry `General Class`, `OBJ-UNMAPPED`, or raw `[[OBJ-*]]` drift
    - seeded the missing embryology, anatomy, and pathology concept notes required by the live week pages
    - fixed Tutor objective import/save scoping so shared `OBJ-*` codes reconcile by mapped module instead of colliding across course units
    - updated the manual janitor live harness so it stays out of the automated `pytest brain/tests/` suite
  - Validation:
    - `pytest brain/tests/test_course_map.py brain/tests/test_path_generation.py brain/tests/test_vault_janitor.py -q`
    - `python -c "import sys; sys.path.insert(0, 'brain'); from vault_janitor import scan_vault; ..."`
    - `npm run build`
    - `pytest brain/tests/ -q` -> `1066 passed`
    - `cmd /c Start_Dashboard.bat`
    - `GET /api/janitor/health` -> `102` markdown files, `78` health-scanned notes, `24` excluded system files, `31` advisory-only files, `33` affected notes, `46` issue instances, `0` routing-drift issues

### Sprint 19: Dashboard Startup Refresh (2026-03-10)
- [x] Claim scope: canonical dashboard startup cleanup
  - `Start_Dashboard.bat`
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks/GENERAL/log.md`
- [x] Phase 0: audit the current startup path against the live backend/frontend runtime.
- [x] Phase 1: remove outdated sync/resume startup work and switch the frontend build step to stale-aware behavior.
- [x] Phase 2: replace the fake startup sleep with readiness polling, validate the launch flow, and document the change.

### Sprint 18: Agent Instruction Hierarchy Cleanup (2026-03-09)
- [x] Claim scope: instruction authority simplification
  - `AGENTS.md`
  - `docs/root/AGENT_SETUP.md`
  - `docs/root/TUTOR_TODO.md`
  - `docs/root/AGENT_BOARD.md`
  - `conductor/tracks/GENERAL/log.md`
  - `C:\Users\treyt\.codex\config.toml`
  - `C:\Users\treyt\.codex\AGENTS.md`
  - `C:\Users\treyt\.claude\CLAUDE.md`
- [x] Phase 0: make root `AGENTS.md` the explicit master instruction file for this repo across tools.
- [x] Phase 1: strip overlapping global prompt policy from home-directory Codex/Claude files so they stop competing with repo canon.
- [x] Phase 2: validate repo shims, runtime config, and document the cleanup.
  - Validation:
    - `pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync_agent_config.ps1 -Mode Check`
    - `codex mcp list`
    - global Codex/Claude markdown files reduced to thin fallback/preference notes
    - repo compatibility shims still point to root `AGENTS.md`

### Sprint 17: Tutor 10/10 Certification (2026-03-07)
- [x] Claim scope: certification program + release-gate artifacts
  - `conductor/tracks/tutor-10-certification_20260307/`
  - `docs/root/TUTOR_TODO.md`
  - `docs/root/AGENT_BOARD.md`
  - `conductor/tracks.md`
  - `conductor/tracks/GENERAL/log.md`
  - `sop/library/chains/certification_registry.yaml`
  - `brain/data/seed_methods.py`
  - `brain/dashboard/api_tutor.py`
  - `dashboard_rebuild/client/src/api.ts`
  - `brain/tests/test_seed_methods.py`
  - `brain/tests/test_tutor_session_linking.py`
- [x] Phase 0: open the certification track, define the 10/10 scorecard, freeze initial chain dispositions, and publish the deterministic fixture plan.
- [x] Phase 0a: expose template-chain certification metadata through the seeded chain registry and template-chain API.
- [x] Phase 1: build the material intake matrix and freeze pass criteria for supported formats.
  - Added upload coverage for PDF/PPTX/DOCX/TXT/MD/MP4, sync preview/start coverage, stale-row pruning, sync update/dedupe coverage, and selected MP4 -> linked transcript material-context coverage.
- [x] Phase 2: certify session authority, preflight, restore, and resume.
  - Added restore coverage for stale active-session keys, completed-session cleanup, corrupted wizard state, and library handoff precedence.
  - Added backend safeguard: objective-scoped certified sessions now require preflight instead of direct start.
  - Session restore matrix now covers preflight-authoritative create and deterministic create/get round-trip restore; certification runner refreshed to `ready` on `2026-03-13`.
  - Week 8 page-sync hardening and Wizard readiness surfacing landed under `CERT-002`.
  - Week 9 wizard/library handoff cleanup landed in the restore/handoff regression surface and no longer blocks certification closeout.
- [x] Phase 3: certify all selectable template chains at baseline/strict bars. (2026-03-09, `5250b4a1`)
- [x] Phase 4: certify artifact reliability for notes and card drafts. (2026-03-09, `5250b4a1`)
- [x] Phase 5: certify trust, provenance, and requested-reference behavior. (2026-03-09, `5250b4a1`)
- [x] Phase 6: certify neuro golden paths and wire the final release gate. (2026-03-09, `5250b4a1`)

### Sprint 16: Strategic Architect Skill (2026-03-07)
- [x] Claim scope: repo-local skill authoring
  - `.codex/skills/personal-strategic-architect/`
  - `docs/root/TUTOR_TODO.md`
  - `docs/root/AGENT_BOARD.md`
  - `conductor/tracks/GENERAL/log.md`
- [x] Phase 0: convert the provided strategic architect spec into a concise, discoverable skill contract.
- [x] Phase 1: create the repo-local skill and verify agent-config hygiene.
  - Created `.codex/skills/personal-strategic-architect/SKILL.md` with the 5-round diagnosis flow, constraint taxonomy, final report structure, and post-report accountability rules.
  - `pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync_agent_config.ps1 -Mode Check` -> `RESULT PASS`
- [x] Phase 2: log the change and close the scope.
  - Review subagent returned no material findings; one low-severity note flagged that the activation payload treats the outer single quotes in the source spec as delimiters rather than literal output characters.

### Sprint 15: Top-Down Tutor Hardening (2026-03-07)
- [x] Claim scope: runtime pedagogy + trust behavior
  - `brain/tutor_prompt_builder.py`
  - `brain/dashboard/api_tutor.py`
  - `brain/data/seed_methods.py`
  - `sop/library/chains/C-TRY-001.yaml`
  - `sop/library/chains/C-TRY-002.yaml`
  - `sop/library/methods/`
  - `dashboard_rebuild/client/src/components/TutorChat.tsx`
  - `dashboard_rebuild/client/src/api.ts`
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks.md`
  - `conductor/tracks/GENERAL/log.md`
  - `conductor/tracks/topdown-tutor-hardening_20260307/`
- [x] Phase 0: lock the top-down chains as the runtime proving ground and record the exact weak method cards. (2026-03-09, `0bbbade2`)
- [x] Phase 1: rewrite global runtime tutor rules for hybrid teaching + honest provenance. (2026-03-09, `0bbbade2`)
- [x] Phase 2: add chain runtime profiles and block overrides for `C-TRY-001` and `C-TRY-002`. (2026-03-09, `0bbbade2`)
- [x] Phase 3: improve qualitative confidence/provenance signaling in Tutor replies. (2026-03-09, `0bbbade2`)
- [x] Phase 4: compare live Week 7 Tutor behavior on `C-TRY-001` vs `C-TRY-002`. (2026-03-13)

### Sprint 14: Neuroscience Exam Intake + First Tutor Run (2026-03-07)
- [x] Claim scope: live neuroscience exam prep
  - `brain/data/pt_study.db`
  - `brain/dashboard/api_tutor.py`
  - `brain/rag_notes.py`
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks.md`
  - `conductor/tracks/GENERAL/log.md`
  - `conductor/tracks/neuroscience-exam-intake_20260307/`
- [x] Claim scope: live vault scaffold
  - `C:\Users\treyt\Desktop\Treys School\Courses\Neuroscience\Week 7\`
- [x] Phase 0: derive Exam 2 scope from schedule + Blackboard and draft the Week 7 Obsidian scaffold.
- [x] Phase 1: load Week 7 neuroscience source files into the live Library with Neuroscience course linkage.
  - Loaded `rag_docs` ids `518-522` for Week 7 (`Class wk 7`, lecture PDF, transcript, developmental disorders PDF, Week 7 To Do).
- [x] Phase 2: run the first exam-scoped Tutor session against a single Week 7 objective.
  - Locked `OBJ-1` through `OBJ-8` into `learning_objectives` for Neuroscience and validated the first live Week 7 teaching run against `OBJ-6`.
  - Patched Wizard/session wiring so `single_focus` requires explicit objective choice and no longer auto-picks the first objective.
- [x] Phase 2b: add preflight-first Tutor setup for neuro week sessions.
  - Added backend `session/preflight` flow and frontend preflight state so the Wizard can show blockers before chat starts.
  - Updated the Tutor source sidebar to use `map_of_contents` as the canonical session structure.
- [x] Phase 3: capture remaining one-stop-shop system gaps from the live workflow.
  - Current gaps: objective lock still split across Tutor tool flow vs adapter CRUD; Obsidian transport still split across CLI and Local REST; Week 8 Brain Structure materials still missing locally.
- [x] Phase 4: close out the narrow Week 7 intake proof and move future neuro expansion to a new track. (2026-03-13)

### Sprint 13: Skills Catalog Review (2026-03-06)
- [x] Claim scope: docs/process
  - `docs/root/SKILLS_CATALOG.md`
  - `docs/root/SKILLS_INVENTORY.md`
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks/GENERAL/log.md`
  - `conductor/tracks/skills-catalog-review_20260306/`
- [x] Phase 0: create `conductor/tracks/skills-catalog-review_20260306` with spec/plan/metadata/index.
- [x] Phase 1: generate the full per-skill catalog with descriptions and decision fields.
- [x] Phase 2: wire in the one-by-one review workflow and seed the planning pass.
- [x] Phase 3: validate and close the track.
  - Validation:
    - `docs/root/SKILLS_CATALOG.md` created with per-skill rows and decision fields
    - planning category seeded with first-pass recommendations
    - catalog and track docs passed markdown hygiene checks
  - Closing commit: `d6e9e8f3`

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
  - Closing commit: `49225778`

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
- [x] Verify methods/chains are consistently represented across: (2026-03-09, `bcf7950a` behavioral contracts + Queue B drift checks)
  - YAML source
  - DB seed/runtime
  - Tutor wizard
  - Tutor chat execution
- [x] Add drift checks for method-stage mismatch and missing knob defaults. (2026-03-09, Queue B1.3 runtime drift detector)

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

- [x] C1.1 Ensure all 6 category pages include full method list + tutor prompt blocks. (2026-03-09, `cd8e0592`)
  - Files: `sop/library/categories/PRIME.md`, `.../CALIBRATE.md`, `.../ENCODE.md`, `.../REFERENCE.md`, `.../RETRIEVE.md`, `.../OVERLEARN.md`
  - Done when: each category page has method inventory + `Method Contract` table + one executable prompt per method.

- [x] C1.2 Reconcile manager-facing notes with code reality. (2026-03-09, policy reconciliation verified — no contradictions found)
  - Files: `docs/root/TUTOR_TRUTH_PATH.md`, `docs/root/TUTOR_CATEGORY_DEFINITIONS.md`, `docs/root/TUTOR_METHOD_SELECTION_RULES.md`, `docs/root/TUTOR_NORTH_STAR_RULES.md`
  - Done when: there are no policy contradictions (e.g., "3-5 concepts only" vs "module_all mode") across these files.

- [x] C1.3 Add/refresh "close-out" log for last-mile decisions and blockers. (2026-03-09, swarm closeout)
  - Files: `conductor/tracks.md`, `conductor/tracks/GENERAL/log.md`
  - Done when: every unresolved blocker from this chat is explicitly logged with owner + expected fix date.

### Queue D — Video+MP4 + Budget Failover Closure

- [x] D2.1 Verify normal-session MP4 path works in non-admin flows. (Sprint 3 C2 verified; swarm Task 19)
  - Files: `brain/dashboard/api_tutor.py`, `dashboard_rebuild/client/src/pages/tutor.tsx`, `dashboard_rebuild/client/src/components/MaterialSelector.tsx`
  - Done when: MP4 can be loaded from chat/materials and appears in selected-material retrieval context without manual API-only scripts.

- [x] D2.2 Implement explicit key rotation and budget-failover visibility. (2026-03-09, `efdefda7`)
  - Files: `brain/.env`, `brain/video_ingest_bridge.py`, `brain/dashboard/api_tutor.py`, `dashboard_rebuild/client/src/components/TutorChat.tsx`
  - Done when: provider switching is automatic on quota/rate signals and user sees current provider + remaining budget status.

- [x] D2.3 Add regression test for MP4 session-context + provider fallback. (2026-03-09, `efdefda7`)
  - Files: `brain/tests/test_video_process_api.py`, `brain/tests/test_tutor_session_linking.py`
  - Done when: tests cover upload->process->scope->chat-turn retrieval path with fallback simulation.

### Queue E — UI/Method Controls (Methods Board Polish)

- [x] E1.1 Lock methods controls (Favorite/Rate/Edit) and remove stale destructive action from board cards. (2026-03-09, `bbbf2f5c`)
  - Files: `dashboard_rebuild/client/src/pages/methods.tsx`
  - Done when: controls are always-visible, non-overlapping, and map to documented actions.

- [x] E1.2 Validate dropdown/select reliability in method edit workflows. (2026-03-09, `bbbf2f5c`)
  - Files: `dashboard_rebuild/client/src/pages/methods.tsx`, `dashboard_rebuild/client/src/components/ui/select.tsx`
  - Done when: category/stage dropdown selections save reliably in one interaction on desktop and mobile widths.

- [x] E1.3 Restore compact fallback path for prompt edits and reset behavior. (2026-03-09, `bbbf2f5c`)
  - Files: `dashboard_rebuild/client/src/pages/methods.tsx`, `brain/dashboard/api_tutor.py`
  - Done when: tutor prompt edits preserve schema fields and can be reset to canonical template in one action.

## Execution Rules for this board

- Do not mark a task complete until its "done when" criteria pass in code and tests or are manually verified.
- Keep task scope one step at a time; no broad refactors without a linked queue ID.
- For every completed queue item that changes behavior, add one dated entry to `conductor/tracks/GENERAL/log.md`.

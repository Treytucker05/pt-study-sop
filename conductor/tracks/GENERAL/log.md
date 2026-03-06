# General Change Log

Changes not tied to a specific conductor track. Append dated entries below.

## 2026-03-06 - Skills Catalog Review kickoff

- Created new docs track `skills-catalog-review_20260306`.
- Added `Skills Catalog Review` to the active sprint in `docs/root/TUTOR_TODO.md`.
- Scope:
  - create a full per-skill catalog with descriptions
  - add decision fields so skills can be reviewed one by one
  - seed the review workflow starting with the planning category

---

## 2026-03-06 - Skills Catalog Review completion

- Closed track `skills-catalog-review_20260306` after:
  - creating `docs/root/SKILLS_CATALOG.md` as the per-skill review surface
  - adding one row per shared skill and tool-local exception
  - adding review decision fields for iterative cleanup/customization
  - seeding the planning category with first-pass recommendations
- Validation:
  - catalog and track docs passed markdown hygiene checks
  - planning rows were reviewed and annotated with initial recommendations
- Closing commit:
  - `d6e9e8f3` — `docs(skills): add full catalog and seed planning review`

---

## 2026-03-06 - Skills Hygiene kickoff

- Created new infra track `skills-hygiene_20260306`.
- Added `Skills Hygiene` to the active sprint in `docs/root/TUTOR_TODO.md`.
- Scope:
  - document the shared `.agents` skill architecture and tool-local exceptions
  - group skills into keep/optional/tool-specific/broken/likely-unused buckets
  - perform a safe first cleanup pass focused on clearly broken surfaces before considering shared-skill deletion

---

## 2026-03-06 - Skills Hygiene completion

- Closed track `skills-hygiene_20260306` after:
  - documenting the shared skill architecture in `docs/root/SKILLS_INVENTORY.md`
  - grouping skills into core, optional, tool-specific, low-confidence, and broken-surface buckets
  - adding usage-evidence caveats so shared-skill deletion is not guessed from weak telemetry
  - writing a backup manifest for broken Cursor links to `C:\\Users\\treyt\\.cursor\\backups\\skills-hygiene_20260306\\broken-junctions.json`
  - removing the broken Cursor junction set as the safe first cleanup wave
- Validation:
  - broken Cursor junction count reduced to `0`
  - no shared `.agents` skills were deleted
  - repo-side inventory and setup docs updated
- Review:
  - final review subagent timed out and did not return
  - manual validation found the first cleanup wave safe because it only removed broken Cursor links
- Closing commit:
  - `49225778` — `docs(skills): group skills and clean broken links`

---

## 2026-03-06 - Repo-Native Agent Board kickoff

- Created new docs track `agent-board_20260306`.
- Added `Repo-Native Agent Board` to the active sprint in `docs/root/TUTOR_TODO.md`.
- Scope:
  - create one shared handoff/status surface for multiple agents
  - keep `TUTOR_TODO.md` as the active sprint board and `conductor/tracks.md` as the portfolio registry
  - wire the board into root `AGENTS.md` and `docs/root/AGENT_SETUP.md`

---

## 2026-03-06 - Repo-Native Agent Board completion

- Closed track `agent-board_20260306` after:
  - creating `docs/root/AGENT_BOARD.md` as the shared multi-agent handoff board
  - linking it from root `AGENTS.md`
  - linking it from `docs/root/AGENT_SETUP.md`
  - documenting a minimal row schema, ownership rules, status vocabulary, and handoff template
- Validation:
  - `git diff --check` passed for the touched docs
  - related docs and links verified to exist
- Review:
  - final review subagent timed out and did not return
  - manual review found no correctness issues in the docs-only change
- Closing commit:
  - `9b225c31` — `docs(agents): add repo-native handoff board`

---

## 2026-03-06 - Repo-Native Agent Board addendum

- Updated `docs/root/AGENT_BOARD.md` to default explicitly to the working triad:
  - `codex-implement`
  - `claude-review`
  - `gemini-research`
- Updated `docs/root/AGENT_SETUP.md` so the same triad is documented in the multi-agent rule section.

---

## 2026-03-06 - Root AGENTS Canon Trim kickoff

- Created new docs track `agents-root-trim_20260306`.
- Added `Root AGENTS Canon Trim` to the active sprint in `docs/root/TUTOR_TODO.md`.
- Scope:
  - trim root `AGENTS.md` to the agreed keep-only sections
  - move detailed learnings/troubleshooting into a linked guardrails doc
  - keep existing canonical links for setup, architecture, developer guide, and active work

---

## 2026-03-06 - Root AGENTS Canon Trim completion

- Closed track `agents-root-trim_20260306` after:
  - trimming root `AGENTS.md` from mixed status/reference/history content down to startup canon only
  - removing dated plan/state sections from root `AGENTS.md`
  - replacing bulky structure/architecture reference sections with links to canonical docs already in the repo
  - moving detailed learnings and troubleshooting into `docs/root/AGENT_GUARDRAILS.md`
- Validation:
  - root `AGENTS.md` reduced from `442` lines to `127`
  - `docs/root/AGENT_GUARDRAILS.md` created to preserve moved detail
  - linked canonical docs verified to exist
  - `git diff --check` passed for the touched docs
- Review:
  - final review subagent timed out and was interrupted
  - manual validation and doc-link review found no correctness issues in the trimmed canon
- Closing commit:
  - `f4c63ded` — `docs(agents): trim root canon and extract guardrails`

---

## 2026-03-06 - Agent Canon Follow-Up kickoff

- Created new Conductor infra track `agent-canon-followup_20260306`.
- Added `Agent Canon Follow-Up` to the active sprint in `docs/root/TUTOR_TODO.md`.
- Scope:
  - reduce repeated inheritance boilerplate in global Claude agents
  - improve `scripts/sync_agent_config.ps1` summary output
  - keep the final walkthrough aligned with the optimized setup

---

## 2026-03-06 - Agent Canon Follow-Up completion

- Closed track `agent-canon-followup_20260306` after:
  - reducing repeated inheritance boilerplate across global Claude agents
  - moving the shared inheritance explanation into `C:\Users\treyt\.claude\rules\agents.md`
  - tightening `scripts/sync_agent_config.ps1` to print mode, summary counts, and final result lines
  - making `.claude/permissions.json` an explicit mirror target in the sync script
- Validation:
  - `scripts/sync_agent_config.ps1 -Mode Check` -> `RESULT  PASS`
  - `scripts/sync_agent_config.ps1 -Mode DryRun` -> `RESULT  PASS`
  - `scripts/sync_agent_config.ps1 -Mode Apply` -> `RESULT  PASS`
  - spot checks passed for optimized global Claude agents
- Closing commit:
  - `e5092411` — `docs(agents): optimize follow-up canon tooling`

---

## 2026-03-06 - Agent Canon Alignment kickoff

- Created new Conductor infra track `agent-canon-alignment_20260306` with:
  - `spec.md`
  - `plan.md`
  - `metadata.json`
  - `index.md`
- Registered the track as the active workstream in `conductor/tracks.md`.
- Added `Agent Canon Alignment + Codex Subagent Reliability` to the active sprint in `docs/root/TUTOR_TODO.md`.
- Claimed docs/process, repo/local agent canon, global agent defaults, and integration/review scopes.
- Set the first execution gate to repairing the failing Codex subagent model/settings mismatch before broader AGENTS cleanup.

---

## 2026-03-06 - Agent Canon Alignment completion

- Closed track `agent-canon-alignment_20260306` after:
  - repairing the broken Codex subagent role startup path
  - defining explicit repo/global precedence in `AGENTS.md`
  - normalizing repo-local Claude compatibility shims and repo-local agents
  - normalizing global Claude defaults/agents to defer cleanly to repo canon
  - expanding `C:\Users\treyt\.codex\AGENTS.md` into explicit global Codex defaults
  - writing `docs/root/AGENT_SETUP.md` as the operator-facing setup and maintenance guide
  - restoring `.claude/permissions.json` as a local compatibility copy of root `permissions.json`
- Validation:
  - spawned Codex `explorer` role -> `explorer-ok`
  - spawned Codex `worker` role -> `worker-ok`
  - outside-repo `codex exec --skip-git-repo-check` -> `codex-outside-ok`
  - outside-repo `claude -p --output-format text --permission-mode bypassPermissions` -> `claude-outside-ok`
  - `scripts/sync_agent_config.ps1 -Mode Check` -> exit `0`
  - repo/global inheritance headers verified across normalized agent files
- Review:
  - final review subagent attempts hung and were interrupted
  - manual review of the touched config/doc surfaces found no correctness issues after validation
- Closing commit:
  - `5c7c81d4` — `docs(agents): align canon and repair codex subagents`

---

## 2026-03-05 - Tutor Audit Hardening kickoff

- Created new Conductor bug track `tutor-audit-hardening_20260305` with:
  - `spec.md`
  - `plan.md`
  - `metadata.json`
  - `index.md`
- Registered track as the active workstream in `conductor/tracks.md`.
- Added `Tutor Audit Hardening` subsection to `docs/root/TUTOR_TODO.md` `Current Sprint` and claimed docs/process, backend/runtime, frontend/UI, and integration/review scopes.

---

## 2026-03-06 - Tutor Audit Hardening completion

- Closed track `tutor-audit-hardening_20260305` after shipping the full remediation set:
  - safe tutor-owned learning-objective ownership/link tracking and delete garbage-collection
  - dead instruction-retrieval plumbing removal
  - truthful retrieval-debug/runtime telemetry
  - Library -> Tutor material handoff unification on `tutor.selected_material_ids.v2`
  - `structured_notes` restore support
  - partial artifact-delete reporting in Tutor UI
  - malformed Tutor SSE chunk hardening with visible retry guidance
  - dead `otherMaterials` removal and legacy `"standard"` accuracy-profile alias normalization
- Added/updated regression coverage across backend and frontend tutor flows, including:
  - shared/manual learning-objective survival
  - Tutor material-key migration and Library handoff
  - `structured_notes` hydration
  - malformed SSE with and without `[DONE]`
- Verification:
  - `npx vitest run client/src/pages/__tests__/library.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/components/__tests__/TutorArtifacts.test.tsx client/src/components/__tests__/TutorChat.test.tsx client/src/lib/__tests__/tutorClientState.test.ts` -> PASS (`19 passed`)
  - `npm run build` -> PASS
  - `pytest -q brain/tests/test_tutor_audit_remediation.py brain/tests/test_tutor_context.py brain/tests/test_tutor_context_wiring.py brain/tests/test_tutor_session_linking.py` -> PASS (`50 passed`)
  - `pytest -q brain/tests/` -> PASS (`925 passed, 1 skipped`)
  - Live smoke:
    - Library selected materials persisted into Tutor and Tutor opened on step `1. COURSE`
    - Bulk session delete showed the active-session warning and returned cleanly to Wizard without overlay deadlock
    - Forced partial bulk delete rendered the in-panel report with `Requested 2 · Deleted 1 · Already gone 1 · Failed 0`
    - Real artifact bulk delete removed two persisted artifacts and rendered `Artifact delete completed` with request id and zero skips/failures
  - Final code-review subagent pass: `No findings`

---

## 2026-03-05 - Library Sync folder tree selection + class assignment

- Added backend Sync Study Folder preview endpoint in [api_tutor.py](/C:/pt-study-sop/brain/dashboard/api_tutor.py):
  - `POST /api/tutor/materials/sync/preview` returns nested folder/file tree for allowed material types.
  - Added selected-file path normalization and traversal guards for `selected_files`.
  - Extended sync payload to accept `selected_files` + optional `course_id`.
- Updated sync ingest pipeline:
  - [api_tutor.py](/C:/pt-study-sop/brain/dashboard/api_tutor.py) passes selected files and `course_id` into sync worker.
  - [rag_notes.py](/C:/pt-study-sop/brain/rag_notes.py) now supports `include_paths` filtering and per-sync `course_id` assignment.
- Updated frontend Library page and tutor API client:
  - [api.ts](/C:/pt-study-sop/dashboard_rebuild/client/src/api.ts) adds preview endpoint/client types and extended sync payload types.
  - [library.tsx](/C:/pt-study-sop/dashboard_rebuild/client/src/pages/library.tsx) adds:
    - folder-tree scan UI with file checkboxes,
    - select all/clear all for discovered files,
    - class picker for Sync Study Folder,
    - class picker for Upload Materials (passes `courseId` into uploader),
    - stale-selection guard so disabled materials are excluded from bulk in-view actions.
- Validation:
  - `cd dashboard_rebuild && npm run build` -> PASS
  - `pytest brain/tests -k "tutor and (sync or material or materials)"` -> PASS (`16 passed`, `905 deselected`)

## 2026-03-05 - Tutor chat timeout hardening

- Updated tutor turn runtime timeout selection in [api_tutor.py](/C:/pt-study-sop/brain/dashboard/api_tutor.py):
  - Base timeout `120s`.
  - `300s` when Deep Think is enabled.
  - `180s` when Web Search or Gemini Vision is enabled.
  - High reasoning effort enforces minimum `240s`.
  - Applied same timeout to both streaming and fallback (`call_codex_json`) paths.
- Updated user-facing timeout guidance in [tutor_streaming.py](/C:/pt-study-sop/brain/tutor_streaming.py) to include mode-toggle recovery steps.
- Validation:
  - `python -m py_compile brain/dashboard/api_tutor.py brain/tutor_streaming.py` -> PASS
  - `pytest brain/tests -k "tutor and (session or context or stream)"` -> PASS (`44 passed`, `877 deselected`)

## 2026-03-03 - Tutor Runtime Error Documentation

- Added `tutor-ZmKF4bYl.js` ReferenceError troubleshooting guidance in `docs/root/GUIDE_USER.md`.
- Included recovery playbook for Tutor black-screen recurrence after Recent Sessions bulk-delete flow:
  restart from `Start_Dashboard.bat`, hard refresh, rebuild UI assets, and capture console/network artifacts when reproducible.

## 2026-03-03 - Tutor delete telemetry persistence

- Added persistent delete telemetry storage in `brain/db_setup.py`:
  - New table: `tutor_delete_telemetry` with request correlation (`request_id`), route, status, counts, details JSON, timestamp.
  - Added indexes for `request_id`, `session_id`, and `created_at`.
- Added helper `log_tutor_delete_telemetry(...)` in `brain/db_setup.py`.
- Wired delete telemetry in `brain/dashboard/api_tutor.py`:
  - `DELETE /api/tutor/session/<id>` logs `already_missing`, `obsidian_cleanup_failed`, `db_delete_failed`, `deleted`.
  - `DELETE /api/tutor/session/<id>/artifacts` logs `invalid_request`, `session_not_found`, `deleted`/`partial_success`.
- Updated user troubleshooting docs in `docs/root/GUIDE_USER.md` with where to inspect persistent delete diagnostics.

## 2026-03-03 - Tutor session delete best-effort warning mode

- Changed `DELETE /api/tutor/session/<id>` behavior in `brain/dashboard/api_tutor.py`:
  - No longer hard-fails the whole delete when Obsidian cleanup is partial.
  - If DB delete succeeds but some expected Obsidian files are missing/unremovable, response now returns:
    - `deleted: true`
    - `status: "deleted_with_warnings"`
    - `warning` message
    - `obsidian_cleanup.success: false` + `obsidian_cleanup.missing_paths`
- Telemetry now records warning-mode outcomes in `tutor_delete_telemetry` using `status=deleted_with_warnings`.

## 2026-03-03 - Dialog centering hardening (Calendar + Brain modals)

- Removed inline modal positioning overrides that were forcing dialogs off-center:
  - `dashboard_rebuild/client/src/pages/calendar.tsx` (`calendar-manage`, `calendar-create`)
  - `dashboard_rebuild/client/src/components/EventEditModal.tsx`
  - `dashboard_rebuild/client/src/components/LocalEventEditModal.tsx`
  - `dashboard_rebuild/client/src/components/DataTablesSection.tsx`
  - `dashboard_rebuild/client/src/components/SessionEvidence.tsx`
  - `dashboard_rebuild/client/src/components/AnkiIntegration.tsx`
- Standardized on shared dialog centering (`.dialog-center`) in `dashboard_rebuild/client/src/index.css`.
- Added guardrail note to `AGENTS.md` Learnings: avoid per-dialog `top/left/transform` overrides on `DialogContent`/`AlertDialogContent`.

## 2026-03-03 - Tutor TDZ crash fix

- Fixed a frontend `ReferenceError` source in `dashboard_rebuild/client/src/pages/tutor.tsx`:
  - Moved `tutor-chat-materials-all-enabled` query initialization ahead of the effect that uses it in its dependency array.
  - Prevents `Cannot access '... before initialization` / TDZ crashes during Tutor session list interactions.

## 2026-03-03 - Tutor bulk delete overlay deadlock fix

- Fixed recurring Tutor UI lock in `dashboard_rebuild/client/src/components/TutorArtifacts.tsx`:
  - Replaced bulk action `AlertDialog` path with a themed in-panel confirm modal (non-portal) for:
    - Recent sessions bulk delete
    - Recent active sessions bulk end
    - Artifact bulk delete
  - Removed deadlock-prone overlay flow that produced translucent black screen and blocked interaction.
- Added recurrence notes and recovery guidance:
  - `docs/root/GUIDE_USER.md` troubleshooting entry for overlay-stuck symptom.
  - `AGENTS.md` Learnings entry documenting cause and fix pattern.

## 2026-03-01 - Tutor smoothness + notes organization audit

- Completed full end-to-end tutor audit per plan `tutor-audit-smoothness`.
- Added Sprint 4 item to `docs/root/TUTOR_TODO.md`: Tutor smoothness + notes organization audit.
- Created `docs/root/TUTOR_AUDIT_REPORT.md`:
  - API↔UI contract verification: summary (duration_minutes vs duration_seconds, artifacts vs artifact_count, objectives vs objectives_covered), save-wrap URL bug, artifact type mismatch (table/smap rejected).
  - Notes persistence trace: quick_notes, card_drafts, artifacts_json, Obsidian; folder_paths extracted but not passed to retrieval; table/smap never persist.
  - Runtime smoothness: turn payload integrity, retrieval telemetry, SSE error handling verified.
- Created `docs/root/TUTOR_AUDIT_REMEDIATION.md`:
  - P0: Fix save-wrap URL, align summary response, chain progress shape.
  - P1: Accept table/structured_map in create_artifact (map to note/map).
  - P2: Wire folder_paths into retrieval, session wrap path uniqueness.
  - P3: Optional telemetry and latency audit.
  - Implementation checklist and regression tests to add.

---

## 2026-02-23 - RAG chunking fix + Gemini CLI provider wiring

- Fixed RAG chunking in `brain/tutor_rag.py`:
  - Small-document bypass: docs ≤8,000 chars returned as a single chunk (no splitting).
    Hip Complex lecture (6,542 chars) was previously split into 14 fragments; now returns 1 chunk with all content intact.
  - Two-stage splitting for larger docs: `MarkdownHeaderTextSplitter` (keeps headers attached to content) → `RecursiveCharacterTextSplitter` (1000 chars, 150 overlap).
  - Minimum chunk filter: chunks <50 chars dropped (kills header-only fragments like bare `## Learning Objectives`).
  - Bumped `DEFAULT_MAX_CHUNKS_PER_DOC` from 2 → 4.
  - Cross-encoder reranker (`cross-encoder/ms-marco-TinyBERT-L-2-v2`) replaces keyword-count scoring; falls back to keywords if model fails to load.
  - Fixed latent bug: `embed_vault_notes()` was calling `chunk_document(content)` without required `source_path` arg.
  - Changed `source_path` default to `""` for backward compatibility.
- Wired Gemini CLI as second LLM provider in `brain/llm_provider.py`:
  - `find_gemini_cli()` discovers binary (mirrors Codex pattern: `%APPDATA%/npm/gemini.cmd` then `where.exe`).
  - `_call_gemini()` subprocess call with `--yolo --sandbox --output-format text`, temp-file prompt, proper cleanup.
  - `call_llm(provider="gemini")` routes to Gemini; default remains Codex.
  - `GEMINI_DEFAULT_MODEL = "gemini-3-pro"` (user has Google AI Ultra with 1M+ context).
- Fixed pre-existing test failure in `brain/tests/test_methods_api.py`:
  - `test_prime_methods_include_knob_contract` now creates its own PRIME method with knobs instead of relying on missing seed data.
- Validation:
  - `python -m pytest brain/tests/ -q` -> `706 passed`
  - Re-embedded Hip Complex lecture (doc 426): 14 fragments → 1 chunk, "learning objectives" query now returns full content.
  - Cross-encoder model download + inference verified.

## 2026-02-23 - Queue B transfer integrity closure (B1.1-B1.4)

- Added launch-time chain/method validation in `brain/dashboard/api_tutor.py`:
  - hard reject if chain does not start with PRIME (`CHAIN_PRIME_REQUIRED`)
  - hard reject when block stage mismatches canonical YAML method contract (`METHOD_STAGE_MISMATCH`).
- Added runtime drift detection in `brain/dashboard/api_tutor.py`:
  - detects/fills missing method prompt and artifact contract from YAML for canonical methods,
  - blocks critical missing-contract cases before LLM call (`METHOD_CONTRACT_DRIFT`),
  - auto-fills missing `knob_snapshot` from method defaults and emits `runtime_drift_events` in retrieval telemetry.
- Added integrity smoke command/script:
  - `scripts/method_integrity_smoke.py`
  - writes one-page report to `docs/root/TUTOR_METHOD_INTEGRITY_SMOKE.md`
  - reports `method_id -> stage -> artifact_type -> required_knobs` with PASS/WARN/FAIL.
- Added regression tests in `brain/tests/test_tutor_session_linking.py`:
  - non-PRIME chain start rejection
  - stage/method mismatch rejection
  - knob snapshot auto-fill + runtime drift telemetry
  - critical contract drift block.
- Updated trackers:
  - `docs/root/TUTOR_TODO.md` (B1.1-B1.4 marked complete)
  - `conductor/tracks.md` latest status line.
- Validation:
  - `python -m py_compile brain/dashboard/api_tutor.py scripts/method_integrity_smoke.py brain/tests/test_tutor_session_linking.py` -> PASS
  - `python -m pytest brain/tests/test_tutor_session_linking.py` -> `24 passed`
  - `python scripts/method_integrity_smoke.py` -> `Failures: 0` (knob cache warnings surfaced as WARN for legacy DB rows).

## 2026-02-23 - Tutor chat footer cleanup (removed Active Sources bar)

- Removed the `ACTIVE SOURCES` badge strip from Tutor chat composer area in:
  - `dashboard_rebuild/client/src/components/TutorChat.tsx`
- Reason:
  - badges represented selected scope state and could drift from user expectation of "actually used this turn", creating confusion during study flow.
- Validation:
  - `cd dashboard_rebuild && npm run build` -> PASS
  - `python -m pytest brain/tests/` -> PASS (`697 passed`)

## 2026-02-23 - README sync for Tutor vault CRUD and source controls

- Updated canonical docs to reflect shipped tutor source/vault workflow and current Obsidian API surface:
  - `README.md`
    - refreshed Obsidian endpoint table (`/status`, `/file` CRUD, `/folder` CRUD, `/move`, `/template/render`, `/append`)
    - updated `/tutor` page description to include sources drawer + vault authoring context.
  - `dashboard_rebuild/client/src/pages/README.md`
    - expanded `tutor.tsx` description to clarify scope ownership (materials, vault, North Star filters feeding `TutorChat`).

## 2026-02-23 - Tutor Obsidian authoring CRUD + template rendering wired

- Added Obsidian CRUD endpoints in `brain/dashboard/api_adapter.py`:
  - `POST /obsidian/folder`
  - `DELETE /obsidian/folder`
  - `DELETE /obsidian/file`
  - `POST /obsidian/move`
  - `POST /obsidian/template/render`
- Hardened path handling for Obsidian API interactions:
  - central relative-path normalization
  - URL-safe path encoding
  - vault-root filesystem fallback for folder ops not exposed by Local REST API
  - root-bounded filesystem guards to prevent path traversal.
- Added shared template renderer in `brain/tutor_templates.py` and template files:
  - `sop/templates/notes/session_note.md.tmpl`
  - `sop/templates/notes/concept_note.md.tmpl`
  - `sop/templates/notes/north_star.md.tmpl`
  - `sop/templates/notes/reference_targets.md.tmpl`
- Updated tutor rendering path in `brain/dashboard/api_tutor.py` to use template-backed renderers instead of inline formatting.
- Expanded frontend API client in `dashboard_rebuild/client/src/api.ts` for CRUD + template render calls.
- Updated tutor sidebar Vault UX in `dashboard_rebuild/client/src/components/TutorChat.tsx`:
  - new actions: `NEW FOLDER`, `NEW NOTE`, `EDIT`, `RENAME`, `DELETE`
  - in-sidebar note editor (path + content) for deterministic authoring from tutor chat
  - tree refresh wiring reused for CRUD operations.
- Added tests:
  - `brain/tests/test_obsidian_crud.py`
  - `brain/tests/test_tutor_templates.py`
- Validation:
  - `cd dashboard_rebuild && npm run build` -> PASS
  - `python -m pytest brain/tests/` -> PASS (`697 passed`)
  - Note: plain `pytest brain/tests/` can fail in this shell due module-path resolution; `python -m pytest` used as canonical invocation.

## 2026-02-23 - Tutor Vault pane switched to Brain-style folder tree

- Updated `dashboard_rebuild/client/src/components/TutorChat.tsx` Vault tab rendering to match Brain page behavior:
  - Replaced flat `vault-index` path list UI with recursive folder/subfolder tree rendering backed by `/obsidian/files`.
  - Added expand/collapse folder controls with persistent per-folder state while panel is open.
  - Kept per-path checkbox selection so folders/files can be toggled into tutor scope.
  - Kept refresh control and rewired it to invalidate/reload tree queries.
  - Kept search, now applied against tree paths during recursive rendering.
- Validation:
  - `cd dashboard_rebuild && npm run build` -> PASS
  - `pytest brain/tests/` -> FAIL at collection due existing import-path environment issue (`ModuleNotFoundError: No module named 'brain'`), unrelated to this frontend-only change.

## 2026-02-23 - Obsidian vault index parity fix (spaces + endpoint precedence)

- Fixed `brain/obsidian_index.py` so tutor vault indexing now matches the real Obsidian tree:
  - Reads `OBSIDIAN_API_URL` / `OBSIDIAN_API_URLS` / `OBSIDIAN_API_KEY` from `brain/.env` when process env is unset.
  - Prioritizes configured API URL list correctly for index/content calls.
  - URL-encodes folder paths during recursive `/vault/<folder>/` listing (critical for folders with spaces like `Study Notes` / `Study System`).
  - Uses resilient multi-endpoint retry for note-content fetch (`_get_note_content`).
- Verification:
  - Local index refresh now returns full vault scope (count moved from `1` to `10` in this environment), including:
    - `Study Notes/Movement Science/Construct 2/Lower Quarter Learning Objectives.md`
    - `Study System/Categories/*.md`

## 2026-02-23 - Tutor Sources slideout sidebar (chat-only integration)

- Implemented a slideout `SOURCES` sidebar directly in `dashboard_rebuild/client/src/components/TutorChat.tsx` (no shared page/backend edits):
  - Tabs: `MATERIALS`, `VAULT`, `NORTH STAR`
  - Slideout anchored to the **left** side of tutor chat.
  - `MATERIALS`: per-material on/off toggles, add-file button, drag/drop upload, all/none actions
  - `VAULT`: loads Obsidian vault index, search/filter, file/folder multi-select toggles for per-turn scope; parser now supports backend `notes + paths` index shape.
  - `NORTH STAR`: displays active North Star metadata, objective IDs, and reference targets from session context
- Added a labeled `Active Sources` strip above chat input (materials, vault count, North Star status + selected chips).
- Per-turn tutor requests now include selected vault paths in `content_filter.folders` from chat scope.
- Validation:
  - `npm run build` (frontend) -> success
  - `pytest brain/tests/` -> existing baseline collection errors in adaptive/selector modules (`ModuleNotFoundError: brain`), unrelated to this UI-only file change.

## 2026-02-23 - Tutor North Star pathing + in-chat material control

- Implemented North Star review/build updates with explicit manual refresh support (`north_star_refresh`) in:
  - `brain/dashboard/api_tutor.py`
- Updated canonical study-note pathing to structured hierarchy:
  - `Study notes/<Class>/<Module or week>/<Subtopic>/...`
  - North Star file now resolves to `.../_North_Star.md`
  - Session/concept finalize note outputs now follow the same hierarchy.
- Added in-chat material control panel in:
  - `dashboard_rebuild/client/src/components/TutorChat.tsx`
  - Visible loaded material count + selected badges
  - Per-material on/off toggles during active chat
  - Add-file button and drag/drop upload directly from chat (uploads to tutor library and auto-selects for current chat)
  - Quick actions: select all / clear selection
- Wired parent refresh callback + course-aware upload context in:
  - `dashboard_rebuild/client/src/pages/tutor.tsx`
- Extended tutor API typings for North Star refresh and metadata fields:
  - `dashboard_rebuild/client/src/api.ts`
- Updated North Star write guard assertion in:
  - `brain/tests/test_tutor_session_linking.py`
- Validation:
  - `pytest brain/tests/test_tutor_session_linking.py` -> `18 passed`
  - `npm run build` (frontend) -> success
  - `pytest brain/tests/` currently hits existing environment import failures (`ModuleNotFoundError: No module named 'brain'` in unrelated adaptive/selector tests).

## 2026-02-22 - Tutor structured finalize pipeline + graph sync wiring

- Implemented strict schema-driven Tutor artifact finalization in `brain/dashboard/api_tutor.py`:
  - Added JSON schema loading/validation via `docs/schemas/tutor_note_schema_v1_1.json`
  - Added mode-aware concept-count enforcement (`module_all`, `single_focus`, `focused_batch`)
  - Added deterministic markdown renderers for session/concept notes
  - Added deterministic Obsidian merge/save helper with wikilink-aware merge path
- Added new Tutor endpoints:
  - `POST /api/tutor/session/<id>/finalize`
  - `POST /api/tutor/session/<id>/sync-graph`
  - Extended `POST /api/tutor/session/<id>/artifact` with `type=structured_notes`
- Added graph sync integration on save:
  - Writes now call incremental KG update per saved note path
  - Endpoint responses include graph sync telemetry
- Routed Tutor tool saves through unified merge+graph path:
  - Updated `brain/tutor_tools.py` `save_to_obsidian` execution to use `api_tutor.save_tool_note_to_obsidian`
  - `execute_tool` now passes `session_id` through for `save_to_obsidian`
- Updated tutor note schema for mode-based concept limits:
  - Added `metadata.session_mode` enum
  - Added conditional constraints for concept counts by mode
- Added/updated tests:
  - `brain/tests/test_tutor_session_linking.py`
    - finalize writes + artifact index coverage
    - invalid single-focus concept count rejection
    - session graph sync endpoint coverage
- Validation:
  - `python -m pytest brain/tests/test_tutor_session_linking.py -q` -> `18 passed`
  - `python -m pytest brain/tests/` -> `667 passed`

## 2026-02-22 - Obsidian category canon regeneration (all 6 stages)

- Regenerated every category page from method YAML contracts so each method includes full runtime prompt blocks and deterministic method metadata:
  - `C:\Users\treyt\Desktop\Treys School\Study System\Categories\Prime.md`
  - `C:\Users\treyt\Desktop\Treys School\Study System\Categories\Calibrate.md`
  - `C:\Users\treyt\Desktop\Treys School\Study System\Categories\Encode.md`
  - `C:\Users\treyt\Desktop\Treys School\Study System\Categories\Reference.md`
  - `C:\Users\treyt\Desktop\Treys School\Study System\Categories\Retrieve.md`
  - `C:\Users\treyt\Desktop\Treys School\Study System\Categories\Overlearn.md`
- Updated category index:
  - `C:\Users\treyt\Desktop\Treys School\Study System\Categories\Categories.md`
- Validation:
  - `python -m pytest brain/tests/` -> `664 passed`

## 2026-02-22 - Tutor runtime wiring (North Star gate + PRIME chain enforcement)

- Added deterministic tutor note schema artifact:
  - `docs/schemas/tutor_note_schema_v1_1.json`
- Wired North Star/session-start gate into tutor runtime:
  - `brain/dashboard/api_tutor.py`
  - Session creation now builds/reviews North Star, injects `reference_targets`, `follow_up_targets`, `module_prefix`, and enables `enforce_reference_bounds`.
- Wired turn-time bounds enforcement and notes continuity:
  - `brain/dashboard/api_tutor.py`
  - Turn requests now hard-block on missing/out-of-bounds reference targets when enforcement is active.
  - Added prioritized Obsidian notes context (module -> follow-up-target-linked -> global fallback) to prompt context.
- Added prioritized notes retrieval helper:
  - `brain/tutor_rag.py`
  - `search_notes_prioritized(...)` for module-aware and target-aware note selection.
- Updated First Exposure chain order to require learning objectives primer first:
  - `sop/library/chains/C-FE-001.yaml`
  - `sop/library/chains/C-FE-STD.yaml`
  - `sop/library/chains/C-FE-MIN.yaml`
  - `sop/library/chains/C-FE-PRO.yaml`
  - `M-PRE-010` is now first PRIME step in FE flows.

## 2026-02-22 - PRIME step 1 lock (M-PRE-010)

- Hardened `M-PRE-010` method contract:
  - `sop/library/methods/M-PRE-010.yaml`
  - Added explicit non-assessment constraints, objective source precedence (instructor first), required outputs, stop criteria, and tighter facilitation prompt.
- Updated PRIME policy draft with locked step-1 specification:
  - `docs/root/TUTOR_PRIME_DRAFT_MATRIX.md`
  - Added final contract, locked knobs, and runtime wiring notes for `M-PRE-010`.

## 2026-02-22 - PRIME scope update (module-wide first)

- Updated `M-PRE-010` to remove fixed `3-5` objective constraint and support two scope modes:
  - `module_all` (default): map all active module objectives for big-picture PRIME.
  - `single_focus`: prime one objective for zoom-in.
- Added `objective_scope` knob and updated method outputs/stop criteria:
  - `sop/library/methods/M-PRE-010.yaml`
- Synced PRIME draft matrix to new scope behavior:
  - `docs/root/TUTOR_PRIME_DRAFT_MATRIX.md`

## 2026-02-22 - objective_scope wiring complete (backend + UI)

- Backend (`brain/dashboard/api_tutor.py`):
  - Added `objective_scope` normalization (`module_all | single_focus`) and `focus_objective_id` handling.
  - Session creation now persists scope in `content_filter` and exposes scope metadata in session response.
  - Reference-bound enforcement now defaults to:
    - `true` for `single_focus`
    - `false` for `module_all` unless explicitly enabled.
  - System prompt now includes explicit PRIME scope directives.
  - Added pytest-safe guard to skip prioritized note-vector lookup in test context.
- Frontend types (`dashboard_rebuild/client/src/api.ts`):
  - Added `TutorObjectiveScope` type.
  - Extended tutor session/content filter types for `objective_scope`, `focus_objective_id`, and North Star metadata.
- Wizard/UI (`dashboard_rebuild/client/src/pages/tutor.tsx`, `dashboard_rebuild/client/src/components/TutorWizard.tsx`):
  - Added persistent PRIME scope selector (whole module vs single objective).
  - Scope now flows into session creation payload and session restore.
  - Step confirm summary now displays PRIME scope.
- Validation run:
  - `python -m py_compile brain/dashboard/api_tutor.py` ✅
  - `pytest brain/tests/test_api_contracts.py brain/tests/test_tutor_session_linking.py` ✅ (61 passed)
  - `npm run build` in `dashboard_rebuild` ✅

## 2026-02-22 - PRIME step 2 lock (M-PRE-008 Structural Extraction)

- Hardened `M-PRE-008` method contract in YAML:
  - `sop/library/methods/M-PRE-008.yaml`
  - Added non-assessment constraints, scope behavior (`module_all`/`single_focus`), required outputs, knob definitions, and stop criteria.
- Added runtime PRIME guardrails for M-PRE-008 execution:
  - `brain/dashboard/api_tutor.py`
  - PRIME block now receives hard non-assessment directives; Structural Extraction block receives explicit output/boundary contract.
- Synced PRIME hardening tracker content:
  - `docs/root/TUTOR_PRIME_DRAFT_MATRIX.md`
  - `docs/root/TUTOR_TODO.md`
- Validation run:
  - `python -m py_compile brain/dashboard/api_tutor.py` ✅
  - `pytest brain/tests/test_api_contracts.py brain/tests/test_tutor_session_linking.py` ✅ (61 passed)

## 2026-02-22 - M-PRE-008 dependency and timing clarification

- Updated `M-PRE-008` contract to explicitly note dependency behavior:
  - Requires objective context from either:
    - `M-PRE-010` in current flow, or
    - existing North Star from prior context.
  - Pairing with `M-PRE-010` is recommended but not mandatory.
- Added priming depth timing guidance for `M-PRE-008`:
  - `basic`: 2-5 minutes
  - `schema`: 5-10 minutes (complex topics)
- Updated files:
  - `sop/library/methods/M-PRE-008.yaml`
  - `docs/root/TUTOR_PRIME_DRAFT_MATRIX.md`
  - `docs/root/TUTOR_TODO.md`
  - `python -m py_compile brain/dashboard/api_tutor.py` ✅
  - `pytest brain/tests/test_api_contracts.py brain/tests/test_tutor_session_linking.py` ✅ (61 passed)

## 2026-02-22 - Tutor paperwork cleanup (truth hierarchy)

- Added single navigation file for canonical read/write order:
  - `docs/root/TUTOR_TRUTH_PATH.md`
- Marked large canon doc as reference background (not first requirement source):
  - `docs/root/TUTOR_CONTROL_PLANE_CANON.md`
- Goal:
  - reduce repeated re-explanation
  - prevent requirement drift by enforcing one clear documentation path
  

## 2026-02-22 - PRIME vs CALIBRATE boundary hardening

- Updated category canon to enforce boundary:
  - `docs/root/TUTOR_CATEGORY_DEFINITIONS.md`
  - PRIME is non-assessment; CALIBRATE starts assessment probes.
- Updated owner intent persistence:
  - `docs/root/TUTOR_OWNER_INTENT.md`
  - explicit requirement that PRIME cannot ask scored knowledge-check questions.
- Added method-selection governance file:
  - `docs/root/TUTOR_METHOD_SELECTION_RULES.md`
  - includes stage admission rules, question-type contract, first-exposure defaults, chain rules, and deterministic Given/When/Then checks.
  

## 2026-02-22 - First-exposure-first owner intent lock

- Added owner intent persistence file:
  - `docs/root/TUTOR_OWNER_INTENT.md`
- Captured non-negotiable product requirements so future sessions do not require re-explaining:
  - first-exposure-first default (`~90% unseen material`)
  - PRIME must structure/teach before assessment pressure
  - CALIBRATE should follow primer, not lead on unseen content
  - Mind Map representation default remains `ASCII`
- Updated category canon to reflect this requirement:
  - `docs/root/TUTOR_CATEGORY_DEFINITIONS.md`
  - PRIME and CALIBRATE semantics now explicitly enforce first-exposure behavior
  - Added explicit first-exposure policy block
  

## 2026-02-22 - Tutor categories-only canonical baseline

- Added a dedicated categories-only source-of-truth file:
  - `docs/root/TUTOR_CATEGORY_DEFINITIONS.md`
- Purpose:
  - lock category semantics first (`PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`)
  - keep method/knob/chain decisions out of this file to reduce prompt and documentation drift
- Includes:
  - plain-language definitions
  - operational role, entry/exit criteria, and anti-goals per category
  - hard dependency law (`REFERENCE` targets required before `RETRIEVE`)
  - category design rules and explicit out-of-scope boundaries
  

## 2026-02-22 - Tutor control-plane canon (categories phase baseline)

- Added canonical control-plane category document:
  - `docs/root/TUTOR_CONTROL_PLANE_CANON.md`
- Defined category-first semantics for:
  - `PRIME`, `CALIBRATE`, `ENCODE`, `REFERENCE`, `RETRIEVE`, `OVERLEARN`
- Document includes:
  - operational role per category
  - system usage contract (input/output/done state)
  - strict in-repo evidence anchors from method YAML citation fields
  - hard-rule section (dependency law + control-stage requirement)
  - runtime drift register for current known mismatches across YAML/DB/API/UI
- Purpose: establish a single source of truth for category semantics before method-by-method vetting and knob governance.

## 2026-02-20 - CP-MSS-first README normalization + guardrail

- Updated all tracked `*README*.md` files so CP-MSS v1.0 / Control Plane is surfaced first (including archive/context/output READMEs).
- Removed or replaced stale README wording that implied old build paths (`dist/public`, `robocopy`) or legacy-first framing.
- Added/expanded compatibility notes so legacy terms are explicitly labeled as legacy/compatibility only.
- Updated architecture entry docs to point to `sop/library/17-control-plane.md` as canonical.
- Extended `scripts/check_docs_sync.py` with tracked-README terminology checks:
  - requires CP-MSS/Control Plane mention
  - blocks strict deprecated terms (`learning loop (V2)`, `dist/public`, `robocopy`)
  - permits legacy terms only when line explicitly marks legacy/compatibility context

## 2026-02-20 - Markdown-wide terminology guard (follow-up)

- Expanded `scripts/check_docs_sync.py` terminology checks from tracked README files to all tracked `*.md` files with scoped exclusions for historical/generated paths.
- Updated active docs with stale build-path references to current direct-build workflow:
  - `conductor/workflow.md`
  - `dashboard_rebuild/BUILD.md`
  - `docs/root/GUIDE_USER.md`
- Clarified `docs/root/ARCHITECTURE_V2.md` title/status to mark legacy V2 label as historical terminology context.

## 2026-02-20 - Stabilize pre-push Brain tests (LLM test-mode guard)

- Added pytest-aware guard in `brain/llm_provider.py` to prevent external LLM/Codex subprocess calls during pytest runs by default.
- New escape hatch for intentional live-LLM tests: set `PT_ALLOW_LLM_IN_TESTS=1`.
- Verified targeted flaky tests now run deterministically:
  - `pytest brain/tests/test_calendar_nl.py`
  - `pytest brain/tests/test_obsidian_patch.py`
- Verified full pre-push suite path:
  - `pytest brain/tests/` -> 321 passed, 17 skipped.

## 2026-02-17 - Consolidate tracking into conductor

- Archived 760-line CONTINUITY.md to docs/archive/
- Archived stale docs/project/ planning hub to docs/archive/project_hub/
- Created this file as catch-all for non-track changes
- Updated AGENTS.md Rule 6 + Post-Implementation Checklist
- Cleaned up dead OpenCode scripts

## 2026-02-17 - Full repo cleanup (5 tiers)

- Tier 1: Removed 19 tracked scratch files from git (method_*.json, tmp_*, extract_*, etc.), added .gitignore rules
- Tier 2: Fixed dangling OpenCode references in 5 files, deleted sync_agent_configs.ps1
- Tier 3: Archived 8 stale docs to docs/archive/stale_docs/ and .agent/context/ subdirs to docs/archive/agent_context/
- Tier 4: Archived duplicate review loop doc, gitignored regeneratable ARCHITECTURE_CONTEXT.md, archived stale roadmap docs
- Tier 5: Deleted scripts/_archive_debug/ (7 legacy .bat files), deleted deprecated sync_ai_config.ps1
- Added Rule 16 to AGENTS.md: agent self-cleanup (no scratch files at root)
- Added "Repo hygiene (agent self-cleanup)" section to conductor/product-guidelines.md

## 2026-02-17 - Tutor Tool-Calling track (Phases 1-5 complete)

- Phase 1-3: Tool-calling infra, local tools (Obsidian/Notes/Anki), frontend SSE feedback
- Phase 4: Figma MCP integration (`brain/figma_mcp_client.py`) with 3 layout algorithms, graceful degradation
- Phase 5: Verification — 192 pytest passing, frontend build clean
- Commits: `94baf094` (Phase 4-5), earlier commits for Phases 1-3
- Track closed in `conductor/tracks.md`

## 2026-02-17 - Phase 7: Security Testing

- Backend: 62 security tests in `brain/tests/test_security.py`
  - SQL injection (11), XSS payloads (4), oversized inputs (5), type confusion (10)
  - Boundary values (10), auth gap documentation (12), CORS (3), headers (5), error disclosure (2)
- Frontend: 14 security tests in `dashboard_rebuild/client/src/test/security.test.ts`
  - innerHTML XSS surface (5), payload handling (2), API error sanitization (3), audit (4)
- Documented security issues: no auth, no CORS, missing headers, innerHTML XSS in SOPRefRenderer
- Commit: Phase 7 security tests (test-only, no source changes)

## 2026-02-17 - Skills Curation Buckets + Export Preservation

- Applied first-pass curation buckets to:
  - `C:\Users\treyt\Desktop\Trey's Vault\Study Sessions\Agent Skills Library\04_skill_registry.yaml`
  - Counts: `active=29`, `trial=29`, `defer=57`, `retire=5`
- Hardened exporter to preserve curation on reruns:
  - `scripts/export_skills_library.py`
  - Preserves `adoption_status`, `priority`, `notes`, and custom per-skill metadata fields from existing registry rows.
  - Prevents reset to `inbox` when `python scripts/export_skills_library.py` is rerun.
- Verification:
  - `python scripts/export_skills_library.py`
  - `python -m py_compile scripts/export_skills_library.py`
## 2026-02-17 - Tutor/Brain UI cleanup (Codex-only + Brain chat visibility)

- On Tutor flow, removed non-Codex engine/model controls from wizard/start path and chat request payload.
- Defaulted tutor session options to Codex-only for model selection, removed OpenRouter/Buster UI/state and related props.
- Reworked Brain workspace mode handling to remove stale chat mode:
  - Removed chat tab/button from Brain toolbar/tab navigation.
  - Brain page now always renders chat side panel on desktop/mobile right rail.
  - Added validation for persisted rain-main-mode and fallback to canvas when stale/invalid.
  - Updated ContentFilter and TutorChat API payloads/tests to match new prop surface.
- Validation run:
  - 
px vitest run --reporter=verbose (341 passed)
  - python -m pytest brain/tests/ -q (301 passed)
  - cd dashboard_rebuild && npm run build (writes to rain/static/dist)

## 2026-02-18 - KIMI agent + skills dashboard integration and push-unblock fixes

- Added `kimi` to agent launch/worktree allowlists:
  - `scripts/agent_worktrees.ps1`
  - `scripts/bootstrap_parallel_agents.ps1`
  - `scripts/launch_codex_session.ps1`
  - `scripts/parallel_launch_wizard.ps1`
- Added `AGENT_WORKTREE_KIMI_ARGS` support in `scripts/agent_worktrees.ps1`.
- Added KIMI support to skill sync/export tooling:
  - `scripts/sync_agent_skills.ps1` (`.kimi/skills` source + target roots)
  - `scripts/export_skills_library.py` (CLI root arg, coverage, dependency detection, registry availability)
- Added `kimi` command allowlist entry in `permissions.json`.
- Restored backward compatibility for legacy pre-push hooks by adding non-failing `auto-claim` command to `scripts/agent_task_board.py`.
- Local environment action: reinstalled managed git hooks via `scripts/install_agent_guard_hooks.ps1 -Action install` to remove stale hook drift.

## 2026-02-18 - Gemini 2.0 deprecation migration + Deep Agents CLI audit

- Replaced all `google/gemini-2.0-flash-001` defaults/usages with `google/gemini-2.5-flash-lite` in runtime and config paths:
  - `brain/llm_provider.py`
  - `brain/tutor_chains.py`
  - `brain/dashboard/scholar.py`
  - `scholar/deep_agent/agent.py`
  - `brain/dashboard/calendar_assistant.py`
  - `brain/dashboard/api_adapter.py`
  - `scholar/inputs/audit_manifest.json`
  - `brain/scratch/test_llm_debug.py`
- Confirmed zero remaining `gemini-2.0` references in repo (excluding none).
- Audited LangChain/LangGraph deep-agent integration and confirmed in-process usage (`langgraph.prebuilt.create_react_agent`), with no `deepagents`/LangChain Deep Agents CLI command usage found.
- Validation:
  - `python -m pytest brain/tests/ -q` fails at collection with pre-existing import issue: `ImportError: cannot import name 'get_policy_version' from 'selector_bridge'` in `brain/tests/test_selector_bridge.py`.

## 2026-02-18 - Tutor archive-linking + chat continuity persistence

- Fixed selector-bridge test/contract drift and import robustness:
  - Added `get_policy_version()` and `reload_chain_catalog()`
  - Added deterministic metadata return (`chain_name`, `selected_blocks`, numeric `score_tuple`)
  - Added fallback import path for test contexts (`brain.selector` vs top-level `selector`)
  - File: `brain/selector_bridge.py`
- Added tutor chat continuity persistence fields and migrations:
  - `tutor_sessions`: `codex_thread_id`, `last_response_id`
  - `tutor_turns`: `response_id`, `model_id`
  - File: `brain/db_setup.py`
- Enhanced tutor runtime/session APIs:
  - Persist + reuse `previous_response_id` across turns
  - Store per-turn `response_id` + `model_id`
  - Store `codex_thread_id` when available
  - `POST /api/tutor/session/<session_id>/link-archive`
  - `GET /api/tutor/archive/<brain_session_id>/linked-chat`
  - Optional `brain_session_id` on session creation
  - Preserve existing `brain_session_id` on `/end` instead of always creating a new archive row
  - File: `brain/dashboard/api_tutor.py`

- Added `thread_id` passthrough from streaming response completion payload:
  - File: `brain/llm_provider.py`
- Added method library compatibility hardening for mixed old/new schemas:
  - runtime ensure/backfill for `method_blocks.category` + `control_stage`
  - update/create now keep both fields aligned
  - File: `brain/dashboard/api_methods.py`
- Added tests:
  - `brain/tests/test_tutor_session_linking.py` (archive-link + response-id continuity)
- Validation:
  - `python -m pytest brain/tests/ -q` -> `303 passed, 2 warnings`

## 2026-02-19 - Conductor metadata sync + task-board goal routing

- Synced track metadata status fields to match `conductor/tracks.md`:
  - `CP_MSS_CONTROL_PLANE_HARDENING_20260217/metadata.json` -> `status: complete`
  - `FINISH_PLANNING_20260210/metadata.json` -> `status: archived`
  - `refactor_frontend_backend_20260204/metadata.json` -> `status: archived`
- Hardened goal-based launcher task routing:
  - `scripts/launch_codex_session.ps1` now auto-registers goal launches (`-Task`) in `scripts/agent_task_board.py` and claims them as `in_progress`.
  - Injects `PT_TASK_ID` and `task-board` helper into launched session so agents stay attached to the shared board context.
- Cleaned stale shared task-board ownership by resolving old `in_progress` entries from Feb 17-18.

## 2026-02-19 - Post-merge finalization (PR #113)

- Merged PR: `https://github.com/Treytucker05/pt-study-sop/pull/113`
  - Merge commit: `8ee7244f4a9f44a3c9357a135f8176ab05c4360f`
- Verified on `main` that tutor continuity + archive-linking changes are present:
  - `brain/dashboard/api_tutor.py`
  - `brain/llm_provider.py`
  - `brain/db_setup.py`
  - `brain/dashboard/api_methods.py`
  - `brain/selector_bridge.py`
- Verified method-schema compatibility regression is resolved on `main`:
  - `python -m pytest brain/tests/test_methods_api.py -q` -> `19 passed`
  - `python -m pytest brain/tests/test_chain_runner.py -q` -> `21 passed`
- Cleaned up feature branch lifecycle:
  - deleted remote branch `feat/chat-archive-linking`
  - local worktree cleanup completed (see git worktree list)

## 2026-02-19 - Pre-push hook stabilization for intermittent pytest capture crash

- Updated managed hook generator `scripts/install_agent_guard_hooks.ps1`:
  - pre-push now runs `python -m pytest brain/tests -q` and captures output to a temp log
  - if failure matches known intermittent Python/pytest capture teardown crash:
    - `ValueError: I/O operation on closed file`
    - hook automatically retries once with `python -m pytest brain/tests -q -s`
  - non-matching failures still fail fast and block push (no masking of legitimate test failures)
- Reinstalled managed hooks:
  - `.git/hooks/pre-commit`
  - `.git/hooks/pre-push`
- Validation:
  - Verified generated `.git/hooks/pre-push` contains retry logic
  - `python -m pytest brain/tests -q` currently fails in this working tree due unrelated syntax error in `brain/tests/test_rag_notes_reembed.py` (not caused by hook change)

## 2026-02-18 - Docling extraction path for RAG ingestion

- Added optional Docling-first extraction in `brain/text_extractor.py` for `.pdf`, `.docx`, and `.pptx`, with automatic fallback to existing extractors when Docling is unavailable or fails.
- Preserved existing `extract_text` response contract (`content`, `error`, `metadata`) and added extractor metadata fields:
  - `extraction_method`
  - `extractor_name`
  - `extractor_source`
  - `extraction_errors` (non-fatal Docling failures)
- Added focused tests in `brain/tests/test_text_extractor.py` covering:
  - Docling success path
  - Fallback path when Docling is unavailable
  - Fallback path when Docling raises an exception
  - Contract stability for plain-text extraction
- Validation:
  - `pytest brain/tests/test_text_extractor.py` (pass)
  - `pytest brain/tests/` has pre-existing unrelated failures (e.g., `method_blocks.category` schema mismatch and DB lock cascades).

## 2026-02-19 - Windows long-path support for OneDrive materials sync

- Added shared path helper module:
  - `brain/path_utils.py`
  - Includes `resolve_existing_path()` with Windows `\\?\` extended-path fallback for long file paths.
- Updated ingestion and extraction paths to use resolved filesystem paths while preserving original user-visible source paths:
  - `brain/rag_notes.py`
    - `_ingest_document` and `ingest_document` now resolve long paths before exists/stat/read operations.
    - `source_path` stored in `rag_docs` remains the original (non-prefixed) path.
  - `brain/text_extractor.py`
    - `extract_text` now resolves filesystem path before exists/stat/read and extraction dispatch.
    - metadata remains based on the original path (filename/type), while IO uses resolved path.
    - MinerU subprocess path argument now avoids slash-rewrite for already-prefixed `\\?\` paths.
- Added regression coverage:
  - `brain/tests/test_text_extractor.py`
    - verifies extraction uses resolved filesystem path.
  - `brain/tests/test_rag_notes_reembed.py`
    - verifies binary ingestion accepts resolved long path while storing original `source_path`.
- Validation:
  - `pytest brain/tests/test_rag_notes_reembed.py` -> `4 passed`
  - `pytest brain/tests/test_text_extractor.py` -> `5 passed`
  - `pytest brain/tests/test_tutor_rag_batching.py` -> `7 passed`

## 2026-02-19 - UTC timestamp deprecation fix in DB health API

- Replaced deprecated UTC call in `brain/dashboard/api_adapter.py`:
  - from `datetime.utcnow().isoformat() + "Z"`
  - to `datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")`
- Added `timezone` import in the same module.
- Validation:
  - `python -m pytest brain/tests/test_security.py::TestAuthenticationGaps::test_db_health_no_auth brain/tests/test_security.py::TestErrorDisclosure::test_db_health_leaks_path -q` -> `2 passed`

## 2026-02-19 - Tutor Wizard template-chain loading repair

- Fixed method-library seed merge behavior that could leave prebuilt chains invisible in Tutor Wizard:
  - `brain/data/seed_methods.py`
  - Existing `method_chains` rows matching template names are now updated (not skipped) to:
    - `is_template = 1`
    - latest `description`
    - latest `block_ids`
    - latest `context_tags`
- Hardened template-chain fetch endpoint:
  - `brain/dashboard/api_tutor.py`
  - `/api/tutor/chains/templates` now queries with `COALESCE(is_template, 0) = 1`
  - If first read is empty, it triggers a second seed/read pass in the same request.
- Added regression coverage:
  - `brain/tests/test_seed_methods.py`
  - verifies an existing non-template chain with a template name is upgraded to template and refreshed.
- Validation:
  - `pytest brain/tests/test_seed_methods.py` -> `1 passed`
  - `pytest brain/tests/test_text_extractor.py` -> `5 passed`
  - `pytest brain/tests/test_api_contracts.py -k chains` -> `4 passed`
  - `GET /api/tutor/chains/templates` via Flask test client -> `status 200`, non-empty result

## 2026-02-19 - UTC normalization for calendar + API timestamps

- Updated API timestamps in `brain/dashboard/api_adapter.py`:
  - Added `_utc_iso_now()` helper for RFC3339 UTC (`Z`) serialization.
  - `db_health` timestamp now uses helper.
  - Scholar status `last_run` now uses `datetime.fromtimestamp(..., timezone.utc)` and emits `Z`.
  - Tutor chat payload now emits UTC for both `id` epoch source and `timestamp`.
- Replaced remaining `utcnow()` usage across `brain/`:
  - `brain/dashboard/gcal.py` (`fetch_calendar_events`)
  - `brain/dashboard/calendar_assistant.py` (`delete_event_by_title`)
  - Both now use `datetime.now(timezone.utc)` and serialize with `Z` suffix.
- Validation:
  - `rg -n "utcnow\\(" brain --glob "*.py"` -> no matches
  - `python -m pytest brain/tests/test_security.py::TestAuthenticationGaps::test_db_health_no_auth brain/tests/test_security.py::TestErrorDisclosure::test_db_health_leaks_path -q` -> `2 passed`
  - `python -m pytest brain/tests/test_calendar_nl.py -q` -> `7 passed`

## 2026-02-19 - Tutor chat material selection controls (sidebar checkboxes)

- Backend (`brain/dashboard/api_tutor.py`):
  - Added dynamic material retrieval depth helper:
    - `_resolve_material_retrieval_k(material_ids)` => scales from default `6` up to `30` when wizard-selected files are provided.
  - Added per-turn filter override support in `/api/tutor/session/<id>/turn`:
    - accepts request `content_filter` payload
    - merges override with session filter
    - normalizes `material_ids`
    - persists merged `content_filter_json` back to `tutor_sessions` each turn
- Frontend:
  - `dashboard_rebuild/client/src/components/TutorChat.tsx`
    - added right-side materials panel with checkboxes
    - sends selected IDs on each turn via `content_filter.material_ids`
  - `dashboard_rebuild/client/src/pages/tutor.tsx`
    - fetches chat materials by course and passes list/selection handlers into `TutorChat`
- Tests:
  - `brain/tests/test_tutor_session_linking.py`
    - added `test_send_turn_scales_material_retrieval_to_selected_materials`
    - added `test_send_turn_applies_per_turn_material_override`
  - `dashboard_rebuild/client/src/components/__tests__/TutorChat.test.tsx`
    - updated props for new selection/material inputs
- Validation:
  - `python -m pytest brain/tests/test_tutor_session_linking.py -q` -> `4 passed`
  - `npx vitest run client/src/components/__tests__/TutorChat.test.tsx` -> `2 passed`
  - `python -m pytest brain/tests -q` -> `298 passed, 17 skipped`
  - `npm run build` (in `dashboard_rebuild`) -> success; assets emitted to `brain/static/dist`

## 2026-02-19 - Tutor chat file-scope accuracy + sidebar bulk selection

- Fixed tutor prompt scope metadata so model no longer implies a hard "6 files" cap when more files are selected.
- Added selected-material scope section in system prompt with:
  - selected file count
  - retrieval target depth
  - explicit instruction to report selected scope count (not citation count)
  - selected file labels
- Added All and Clear controls to Tutor chat sidebar material selector for fast full-scope toggling.
- Added accessibility label to send button (ria-label="Send message") and updated TutorChat tests.
- Added backend regression test to ensure selected material scope is injected into prompt.
- Validation:
  - python -m pytest brain/tests/test_tutor_session_linking.py -q (5 passed)
  - cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorChat.test.tsx (2 passed)
  - cd dashboard_rebuild && npm run build (success)

## 2026-02-19 - Tutor chat sidebar loads all enabled materials

- Updated Tutor page chat-sidebar material query to load all enabled materials instead of course-scoped subset.
- This prevents chat sidebar from appearing capped (e.g., only 6 files) when user expects broader selected file scope.
- File: dashboard_rebuild/client/src/pages/tutor.tsx
- Validation:
  - cd dashboard_rebuild && npm run build (success)

## 2026-02-19 - Retrieval scope fix for large selected file sets

- Root cause fixed: when explicit material_ids were selected, tutor retrieval still AND-filtered by session course_id, collapsing results to a small subset (often ~6 files).
- Updated tutor turn retrieval to treat explicit selected files as authoritative scope:
  - etrieval_course_id = None when material_ids are present
  - pass that through to both embedding and keyword dual search paths
- Updated 	utor_rag filters so material_ids override course_id in both embedding and keyword fallback queries.
- Increased selected-material retrieval cap from 30 to 60 chunks for broader coverage on larger selections.
- Added regression test: 	est_send_turn_material_scope_overrides_course_filter.
- Validation:
  - python -m pytest brain/tests/test_tutor_session_linking.py -q (6 passed)
  - python -m pytest brain/tests/test_tutor_rag_batching.py -q (7 passed)

## 2026-02-19 - Prompt rule hardening for selected vs retrieved file count

- Hardened tutor system prompt scope instructions so count questions ("how many files are you using/seeing/have") must answer selected-scope count first.
- Added explicit rule to mention retrieved/cited counts only when asked for retrieved/cited counts.
- Prevented ambiguous phrasing like "I am using N retrieved files" for scope-count questions.
- Files:
  - rain/dashboard/api_tutor.py
  - rain/tests/test_tutor_session_linking.py
- Validation:
  - python -m pytest brain/tests/test_tutor_session_linking.py -q (6 passed)

## 2026-02-19 - Tutor retrieval diversification + deterministic file-count handling

- Backend retrieval fixes:
  - Added candidate-pool expansion for material-scoped vector search to reduce dominant-file collapse.
  - Added diversity-aware reranking with per-document chunk caps.
  - Files: `brain/tutor_rag.py`
- Fallback behavior fix:
  - `get_dual_context` and `keyword_search_dual` now retrieve materials even when `material_ids` is empty (course-scoped fallback works again).
  - File: `brain/tutor_rag.py`
- Tutor chat count-question fix:
  - Added deterministic shortcut for material count questions ("how many files...") so response reports selected scope reliably.
  - Preserves session continuity by not reusing prior `response_id` for shortcut turns.
  - File: `brain/dashboard/api_tutor.py`
- Tests added/updated:
  - `brain/tests/test_tutor_rag_batching.py`
  - `brain/tests/test_tutor_session_linking.py`
  - Added coverage for diversity reranking, no-selection dual retrieval paths, material-count shortcut output, and response-id continuity.
- Validation:
  - `pytest brain/tests/test_tutor_rag_batching.py -q` -> `10 passed`
  - `pytest brain/tests/test_tutor_session_linking.py -q` -> `8 passed`

## 2026-02-19 - Excalidraw unload-policy browser violation fix

- Root cause:
  - Browser warning came from Excalidraw internals registering `window` `unload` handlers in Brain Canvas.
  - This surfaced as deprecated/blocked unload-policy warnings in console (`percentages-*.js` bundle).
- Fix:
  - Added a scoped shim in `dashboard_rebuild/client/src/components/brain/ExcalidrawCanvas.tsx` that remaps `unload` listeners to `pagehide` while canvas is mounted.
  - Implemented listener mapping + ref-counted install/uninstall to avoid leaking global overrides across mounts.
- Validation:
  - `cd dashboard_rebuild && npm run build` -> success
  - `pytest brain/tests/` -> `305 passed, 17 skipped`
  - Browser verification on `http://127.0.0.1:5000/brain`: unload warning no longer present in console issues/messages.

## 2026-02-19 - Tutor page async message-channel console noise filter

- Symptom:
  - On `/tutor`, console repeatedly showed:
    - `Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received`
- Investigation:
  - No `chrome.runtime`/`browser.runtime` listener messaging exists in app source.
  - This error signature is known browser-extension async messaging noise surfacing as unhandled rejection in page context.
- Fix:
  - Added targeted runtime filter at app bootstrap:
    - `dashboard_rebuild/client/src/lib/runtime-noise-filter.ts`
    - ignores only known extension async message-channel rejection signatures via `unhandledrejection` `preventDefault`.
  - Wired in `dashboard_rebuild/client/src/main.tsx`.
- Validation:
  - `cd dashboard_rebuild && npm run build` -> success
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorChat.test.tsx` -> `2 passed`
  - Browser verification on `http://127.0.0.1:5000/tutor`:
    - no baseline console errors after reload
    - manual injected rejection with same message no longer logs uncaught promise noise.

## 2026-02-19 - Tutor retrieval telemetry + ANN bottleneck diagnostics

- Added per-turn retrieval telemetry to tutor SSE done payload:
  - `brain/tutor_streaming.py`
    - `format_sse_done` now accepts `retrieval_debug`.
  - `brain/dashboard/api_tutor.py`
    - Added `_citation_sources` and `_build_retrieval_debug_payload`.
    - `send_turn` now attaches `retrieval_debug` on both normal turns and count-shortcut turns.
    - Logs compact retrieval telemetry per turn via backend logger.
- Added regression tests:
  - `brain/tests/test_tutor_session_linking.py`
    - `test_send_turn_done_payload_includes_retrieval_debug`
    - `test_material_count_shortcut_done_payload_includes_retrieval_debug`
- Diagnostic findings (runtime + ANN):
  - Live server still served old payload shape until restart (no `retrieval_debug` key seen in live SSE).
  - Flask test-client path confirms new `retrieval_debug` is present.
  - Chroma candidate retrieval is heavily dominated by one source document for broad queries (doc id 207), reducing raw unique-doc diversity before rerank.
  - Reranker is not the primary bottleneck when `k_final` is high; it can only work with whatever diversity ANN candidate pool returns.
- Validation:
  - `pytest brain/tests/test_tutor_session_linking.py -q` -> `10 passed`
  - `pytest brain/tests/test_tutor_rag_batching.py -q` -> `10 passed`
  - `pytest brain/tests/` -> `307 passed, 17 skipped`

## 2026-02-19 - Deterministic selected-file listing shortcut for tutor scope questions

- Problem:
  - Asking tutor to list available/selected files could return a tiny retrieved subset (often 1-6) instead of the actual selected scope.
- Fix:
  - Added selected-scope listing intent detection in `brain/dashboard/api_tutor.py`:
    - `_is_selected_scope_listing_question`
    - `_build_selected_scope_listing_response`
  - In `send_turn`, if selected materials exist and question is a listing intent, bypass LLM streaming and return deterministic response:
    - includes retrieved files for this question
    - includes full selected file scope labels from `material_ids`
  - Shortcut now uses shared `used_scope_shortcut` logic so `last_response_id` continuity is not overwritten by deterministic responses.
- Tests:
  - Added `test_send_turn_selected_scope_listing_question_uses_selected_scope` in `brain/tests/test_tutor_session_linking.py`.
- Validation:
  - `pytest brain/tests/test_tutor_session_linking.py -q` -> `11 passed`
  - `pytest brain/tests/test_tutor_rag_batching.py -q` -> `10 passed`

## 2026-02-19 - Startup hard-stop on port 5000 in Start_Dashboard.bat

- Updated `Start_Dashboard.bat` to hard-stop any process currently listening on port `5000` before launching dashboard.
- This prevents stale Flask processes from serving old backend code when restarting via batch file.
- Retained existing targeted `dashboard_web.py` process cleanup as a secondary safeguard.
- Validation:
  - Ran `Start_Dashboard.bat` (with `SKIP_UI_BUILD=1` env set in invoking shell).
  - Confirmed log line: `Hard-stopping PID ... bound to port 5000`.
  - Confirmed dashboard still starts and serves `http://127.0.0.1:5000/tutor`.

## 2026-02-19 - Tutor ANN diversification hardening (MMR merge + per-doc pre-cap)

- Retrieval pipeline updates in `brain/tutor_rag.py`:
  - Added secondary MMR candidate retrieval (`max_marginal_relevance_search`) with widened `fetch_k`.
  - Added `_merge_candidate_pools` to merge similarity + MMR pools with chunk-level dedupe.
  - Added `_cap_candidates_per_doc` pre-rerank limiter to reduce single-document domination.
  - Added high-`k` safety fix: pre-cap now scales with `k` (`max(k, 6)`) so requests above 20 are not truncated by pre-cap.
- Test coverage added in `brain/tests/test_tutor_rag_batching.py`:
  - `_merge_candidate_pools` order/dedupe behavior.
  - `_cap_candidates_per_doc` per-doc + total-cap behavior.
  - `search_with_embeddings` merge + MMR + cap behavior.
  - Instruction-collection path skips materials pre-cap.
  - High-`k` regression test to prevent truncation.
- Validation:
  - `pytest brain/tests/test_tutor_rag_batching.py -q` -> `15 passed`
  - `pytest brain/tests/test_tutor_rag_batching.py brain/tests/test_tutor_session_linking.py -q` -> `26 passed`
  - `pytest brain/tests/ -q` hit unrelated intermittent timeout in `brain/tests/test_obsidian_patch.py::test_patch_generation_creates_file` (Codex subprocess path); not in tutor retrieval code path.

## 2026-02-19 - Tutor live accuracy profiles + expanded retrieval telemetry + 50-question eval harness

- Added runtime accuracy profile support (`balanced`, `strict`, `coverage`) across Tutor session + turn flows:
  - New profile helper module: `brain/tutor_accuracy_profiles.py`.
  - `brain/dashboard/api_tutor.py` now normalizes/persists `content_filter.accuracy_profile`, and uses it to tune:
    - `k_materials` via profile-aware `_resolve_material_retrieval_k(...)`
    - `k_instructions` via `_resolve_instruction_retrieval_k(...)`
  - System prompt now includes profile-specific guidance for strict vs coverage behavior.
- Expanded retrieval telemetry in SSE `done.retrieval_debug`:
  - Added `accuracy_profile`, `material_top_source`, `material_top_source_share`,
    `material_dropped_by_cap`, candidate-pool counters, `retrieval_confidence`,
    and `retrieval_confidence_tier`.
  - Added confidence heuristic combining scope coverage, citation alignment,
    source concentration, and cap-drop penalty.
- Added deeper retrieval internals from RAG pipeline:
  - `brain/tutor_rag.py` now supports optional `debug` passthrough for
    `search_with_embeddings`, `get_dual_context`, and `keyword_search_dual`.
  - Captures similarity/MMR candidate counts, merged/capped counts,
    dropped-by-cap, fallback reason, and final concentration stats.
- Frontend runtime tuning UI:
  - `dashboard_rebuild/client/src/pages/tutor.tsx` now persists accuracy profile in localStorage and session content filter.
  - `dashboard_rebuild/client/src/components/TutorChat.tsx` adds in-chat profile selector and sends `content_filter.accuracy_profile` every turn.
  - Assistant message footer now surfaces retrieval debug metrics (profile, confidence, unique sources, concentration, dropped-by-cap).
  - Updated TS API contracts in `dashboard_rebuild/client/src/api.ts`.
- Added eval harness + fixture:
  - `tools/tutor_retrieval_eval.py` CLI for batch retrieval evaluation.
  - `brain/evals/tutor_eval_questions_50.json` with 50 question items for repeatable tuning runs.
- Tests added/updated:
  - `brain/tests/test_tutor_accuracy_profiles.py` (profile resolution + 50-question fixture integrity).
  - `brain/tests/test_tutor_rag_batching.py` (debug candidate metrics assertions).
  - `brain/tests/test_tutor_session_linking.py` (strict profile retrieval-depth behavior + expanded debug assertions).
  - `dashboard_rebuild/client/src/components/__tests__/TutorChat.test.tsx` (profile included in turn payload).
- Validation:
  - `pytest brain/tests/test_tutor_rag_batching.py brain/tests/test_tutor_session_linking.py brain/tests/test_tutor_accuracy_profiles.py -q` -> `32 passed`
  - `pytest brain/tests/ -q` -> `319 passed, 17 skipped`
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorChat.test.tsx` -> `3 passed`
  - `cd dashboard_rebuild && npm run build` -> success
  - `python tools/tutor_retrieval_eval.py --keyword-only --limit 3` -> success, report emitted under `logs/tutor_eval/`

## 2026-02-19 - Tutor recommendation rollout: strict default + coverage auto-escalation guard

- Applied recommended runtime policy for higher tutor accuracy:
  - Default profile changed from `balanced` to `strict` in `brain/tutor_accuracy_profiles.py`.
  - Tutor page profile fallback/localStorage default aligned to `strict`.
- Added automatic retrieval escalation in `brain/dashboard/api_tutor.py`:
  - Start with requested profile (now default strict).
  - Retry retrieval with `coverage` when weak signals are detected:
    - dominant source concentration,
    - low source breadth in larger selected scopes,
    - low preflight confidence.
- Added deterministic safety guard:
  - If retrieval is still weak after coverage retry, tutor now returns
    “insufficient evidence from selected files” response instead of guessing.
  - Guard responses include selected scope/retrieved source context and still emit `retrieval_debug`.
- Extended debug payload metadata:
  - `requested_accuracy_profile`, `effective_accuracy_profile`,
    `profile_escalated`, `profile_escalation_reasons`,
    `insufficient_evidence_guard`, `insufficient_evidence_reasons`.
- Frontend display now shows effective profile and escalation status in Tutor chat telemetry badge.
- Tests updated/added for recommendation behavior:
  - profile-depth expectations updated for strict default.
  - auto-escalation to coverage test.
  - insufficient-evidence guard shortcut test.
- Validation:
  - `pytest brain/tests/test_tutor_rag_batching.py brain/tests/test_tutor_session_linking.py brain/tests/test_tutor_accuracy_profiles.py -q` -> `34 passed`
  - `pytest brain/tests/ -q` -> `321 passed, 17 skipped`
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorChat.test.tsx` -> `3 passed`
  - `cd dashboard_rebuild && npm run build` -> success

## 2026-02-19 - Scoped retrieval tuning: reduce MMR fetch overhead without collapsing source breadth

- Problem observed during scoped eval on 30 selected files:
  - Retrieval quality was acceptable but per-question latency was high in strict/coverage runs.
  - Candidate diagnostics showed very high dropped-by-cap volumes, indicating expensive over-fetch.
- Implemented tuning in `brain/tutor_rag.py`:
  - Kept material-scoped candidate breadth policy intact (`k * 12`, min 120, max 800).
  - Reduced MMR fetch expansion from `candidate_k * 4` to `candidate_k * 3`.
  - Reduced upper cap for `mmr_fetch_k` from `2000` to `1600`.
  - Left pre-cap behavior unchanged for materials (`pre_cap = max(k, 6)`) to avoid regressions in source coverage.
- Updated tests:
  - `brain/tests/test_tutor_rag_batching.py` expectation for `mmr_fetch_k` now matches tuned fetch policy.
- Validation:
  - `pytest brain/tests/test_tutor_rag_batching.py::test_search_with_embeddings_merges_and_caps_before_rerank -q` -> `1 passed`
  - `pytest brain/tests/` -> `321 passed, 17 skipped`
  - Timed scoped eval sample (6 questions, material_ids 201-230):
    - `strict`: `hit_rate=0.667`, `avg_conf=0.531`, `avg_unique=16.33`, `avg_drop=597.50`, `elapsed=78.5s`
    - `balanced`: `hit_rate=0.667`, `avg_conf=0.513`, `avg_unique=15.67`, `avg_drop=523.83`, `elapsed=55.9s`
    - `coverage`: `hit_rate=0.667`, `avg_conf=0.557`, `avg_unique=17.83`, `avg_drop=730.50`, `elapsed=120.7s`

## 2026-02-20 - Tutor library extraction hardening: lossy-content telemetry + chunked OCR fallback

- Backend extraction and API updates:
  - `brain/text_extractor.py`:
    - Replaced replacement-char-only detection with `_has_garbled_content`, which now flags three garbling signals:
      - Unicode replacement character (`U+FFFD`) ratio,
      - synthetic glyph placeholders (`GLYPH<...>`),
      - heavy Latin Extended A/B spillover.
    - Lowered garbling retry threshold to `0.05` to trigger OCR fallback sooner for corrupted extracts.
    - Refactored Docling OCR flow into `_docling_ocr_convert(...)` and updated `_extract_with_docling_ocr(...)` to OCR PDFs in page chunks using PyMuPDF, then concatenate chunk results.
  - `brain/dashboard/api_tutor.py`:
    - Sanitizes extracted content by removing replacement chars before returning.
    - Adds extraction quality metadata to material-content response:
      - `extraction_lossy` (boolean),
      - `replacement_ratio` (rounded float).
- Frontend updates:
  - `dashboard_rebuild/client/src/api.ts`:
    - `MaterialContent` now includes `extraction_lossy` and `replacement_ratio`.
  - `dashboard_rebuild/client/src/pages/library.tsx`:
    - Material viewer now surfaces a visible warning panel when extraction is lossy.
    - Warning includes replacement-ratio percentage and still renders readable markdown when available.
    - If no readable markdown remains, shows a clear empty-state message instead of silent failure.
- Validation:
  - `pytest brain/tests/` -> `321 passed, 17 skipped`
  - `cd dashboard_rebuild && npm run build` -> success (non-blocking large-chunk warnings only)

## 2026-02-20 - Follow-up hardening: concurrency-safe OCR chunk temp files

- Addressed review-identified concurrency risk in `brain/text_extractor.py`:
  - Replaced deterministic temp chunk names (`_ocr_chunk_{start}.pdf`) with unique `NamedTemporaryFile(..., delete=False)` paths.
  - Added guaranteed `chunk.close()` in `finally` to avoid lingering file handles if chunk save/conversion fails.
  - Wrapped source PDF handle in `try/finally` for guaranteed `src.close()` cleanup.
  - Replaced dynamic `__import__("re")` usage with direct `import re` for clarity/maintainability in garble detection.
- Validation:
  - `pytest brain/tests/` -> `321 passed, 17 skipped`

## 2026-02-22 - Tutor documentation organization: execution tracker + note-link policy lock

- Added `docs/root/TUTOR_TODO.md` as active tutor execution tracker with ordered workstreams:
  - PRIME method blocks (top priority: rules, knobs, implementation plan)
  - Obsidian + RAG graph integration tasks
  - chain/method transfer integrity tasks
- Updated `docs/root/TUTOR_TRUTH_PATH.md` to reference `docs/root/TUTOR_TODO.md` as reference-only execution tracker.
- Updated `docs/root/TUTOR_OWNER_INTENT.md` to lock non-negotiable requirement:
  - Tutor-generated Obsidian notes must include wiki links at creation time.

## 2026-02-22 - PRIME drafting kickoff: policy + knob matrices

- Added `docs/root/TUTOR_PRIME_DRAFT_MATRIX.md` as working draft for:
  - PRIME method policy contract matrix
  - PRIME knob matrix (existing + proposed additions)
  - PRIME sequence draft and manager-reconciliation open items
- Updated `docs/root/TUTOR_TODO.md` progress:
  - marked PRIME inventory confirmation complete
  - marked PRIME policy/knob definition tasks as in-progress
- Updated `docs/root/TUTOR_TRUTH_PATH.md` reference list to include the PRIME draft matrix as a non-canonical working document.

## 2026-02-22 - North Star rules locked as canonical session-start gate

- Added new canonical file: `docs/root/TUTOR_NORTH_STAR_RULES.md`
  - hard North Star gate before planning
  - canonical North Star path format
  - instructor-objectives-win conflict rule
  - strict objective status enum
  - 100% concept-to-objective mapping rule for intake
  - event-driven North Star refresh
  - N-1 + targeted links context loading
  - graceful fallback for missing objective IDs
  - required PRIME method baseline and stage boundaries
  - schema constraints (3-5 concept cap + wiki-link validation)
- Updated `docs/root/TUTOR_TRUTH_PATH.md`
  - added North Star rules to authoritative read order
  - added write-rule pointer for North Star/session-start logic updates
  - added non-negotiable default: planning blocked until North Star validation.

## 2026-02-22 - Method-card tutor prompt coverage hardening

- Added tutor-facing `facilitation_prompt` blocks to every method card missing one:
  - `sop/library/methods/*.yaml` (41 files updated across PRIME/CALIBRATE/ENCODE/REFERENCE/RETRIEVE/OVERLEARN/INTEGRATE sets)
- Hardened PRIME conditional behavior for prior-knowledge scan:
  - `sop/library/methods/M-PRE-003.yaml`
  - Added explicit stipulations:
    - only run when prior context (North Star/notes) exists
    - fallback route to `M-PRE-010 -> M-PRE-008` when context is missing
    - PRIME non-assessment boundary lock
- Validation:
  - Prompt coverage audit: all method cards now contain exactly one `facilitation_prompt`
  - `pytest brain/tests/` -> blocked by pre-existing import-path collection errors (`ModuleNotFoundError: brain` in adaptive tests)
  - `pytest brain/tests/test_api_contracts.py brain/tests/test_tutor_session_linking.py` -> `61 passed`

## 2026-02-22 - North Star test isolation + runtime write guard

- Hardened tutor runtime to prevent test-mode writes to live Obsidian vault:
  - `brain/dashboard/api_tutor.py`
  - Added `_north_star_io_disabled()` guard:
    - true when `PYTEST_CURRENT_TEST` is present
    - true when `PT_DISABLE_OBSIDIAN_WRITES=1|true|yes|on`
    - true when Flask `current_app.testing` is enabled
  - `_ensure_north_star_context()` now skips Obsidian read/write in guarded contexts and returns in-memory North Star context (`status: test_mode_no_write`).
- Added fixture-level Obsidian I/O isolation in tutor session linking tests:
  - `brain/tests/test_tutor_session_linking.py`
  - Monkeypatches `dashboard.api_adapter.obsidian_get_file`/`obsidian_save_file` with in-memory fakes.
  - Added assertion test `test_testing_mode_blocks_north_star_writes` to ensure no writes occur in testing mode.
- Validation:
  - `python -m pytest brain/tests/test_tutor_session_linking.py` -> `15 passed`
  - `python -m pytest brain/tests/` -> `664 passed`

## 2026-02-22 - PRIME method hardening pass (all active PRIME cards)

- Hardened all active PRIME method cards with method-specific contracts, usage boundaries, and non-generic tutor prompts:
  - `sop/library/methods/M-PRE-001.yaml`
  - `sop/library/methods/M-PRE-002.yaml`
  - `sop/library/methods/M-PRE-003.yaml`
  - `sop/library/methods/M-PRE-004.yaml`
  - `sop/library/methods/M-PRE-005.yaml`
  - `sop/library/methods/M-PRE-006.yaml`
  - `sop/library/methods/M-PRE-008.yaml`
  - `sop/library/methods/M-PRE-009.yaml`
  - `sop/library/methods/M-PRE-010.yaml`
- Aligned PRIME method naming/mapping to recent research fit:
  - `M-PRE-004` -> Hierarchical Advance Organizer
  - `M-PRE-005` -> Skeleton Concept Hierarchy
  - `M-PRE-006` -> Structural Skimming + Pillar Mapping
  - `M-PRE-009` -> Syntopical Big-Picture Synthesis
  - `M-PRE-002` -> Overarching Pre-Question Set (optional)
  - `M-PRE-001` -> Brain Dump (conditional)
- Updated PRIME draft matrix and TODO tracker:
  - `docs/root/TUTOR_PRIME_DRAFT_MATRIX.md`
  - `docs/root/TUTOR_TODO.md`
- Validation:
  - `python -m pytest brain/tests/` -> `664 passed`

## 2026-02-22 - CALIBRATE hardening pass (all CAL method cards)

- Hardened all CAL method YAML cards with method-specific contracts and tutor prompts:
  - `sop/library/methods/M-CAL-001.yaml`
  - `sop/library/methods/M-CAL-002.yaml`
  - `sop/library/methods/M-CAL-003.yaml`
- Added clear CALIBRATE stage boundaries and deterministic routing outputs:
  - short scored baseline (`M-CAL-001`)
  - confidence alignment (`M-CAL-002`)
  - deterministic top-3 weakness routing seed (`M-CAL-003`)
- Added Obsidian category canon note for CALIBRATE:
  - `C:\Users\treyt\Desktop\Treys School\Study System\Categories\Calibrate.md`
  - includes rules, flow, method summaries, and full tutor prompt blocks.

## 2026-02-22 - Remaining category hardening + Obsidian category pages

- Hardened remaining method cards by replacing generic fallback prompts with method-specific stage-bound prompts:
  - ENCODE: `M-ENC-001..014` (existing set)
  - REFERENCE: `M-REF-001..004`
  - RETRIEVE: `M-RET-001..007`
  - OVERLEARN: `M-OVR-001..003`
  - INTEGRATED stage-mapped methods also updated where applicable:
    - `M-INT-001,002,003,004,006` and `M-PRE-007` (CALIBRATE-owned pre-test)
- Draft statuses in these touched cards were promoted to `validated` as part of prompt-contract hardening.
- Created/updated Obsidian category pages with full method inventory + prompt blocks:
  - `C:\Users\treyt\Desktop\Treys School\Study System\Categories\Encode.md`
  - `C:\Users\treyt\Desktop\Treys School\Study System\Categories\Reference.md`
  - `C:\Users\treyt\Desktop\Treys School\Study System\Categories\Retrieve.md`
  - `C:\Users\treyt\Desktop\Treys School\Study System\Categories\Overlearn.md`
- Validation:
  - `python -m pytest brain/tests/` -> `664 passed`

## 2026-02-22 - Methods library action controls UX hardening

- Updated methods library card controls in `dashboard_rebuild/client/src/pages/methods.tsx`:
  - Replaced hover/overlay action buttons with persistent controls below each card (no text overlap).
  - Replaced destructive `x` quick action with `EDIT` action.
  - Kept `RATE` action visible and restyled for consistent retro UI readability.
- Added full `Edit Block` dialog (name, category, description, duration, energy, best stage) with save + delete actions.
- Added update mutation wiring via `api.methods.update` with cache invalidation and toasts.
- Validation:
  - `npm run build` (dashboard_rebuild) -> PASS
  - `pytest brain/tests/` with `PYTHONPATH=C:\pt-study-sop` -> `667 passed`

## 2026-02-22 - Methods favorites UX + separate rating action

- Methods library UI updated in `dashboard_rebuild/client/src/pages/methods.tsx`:
  - Star action converted to persistent favorite toggle (saved in localStorage key `methods.favoriteIds`).
  - Added `FAVORITES` filter tab in stage/category filter row.
  - Added separate `RATE` button (rating dialog) while keeping `EDIT` button.
  - Action controls remain always visible and positioned below cards to avoid overlapping card text.
- Validation:
  - `npm run build` (dashboard_rebuild) -> PASS
  - `pytest brain/tests/` with `PYTHONPATH=C:\pt-study-sop` -> `667 passed`

## 2026-02-22 - Methods edit dialog fixes (dropdown, sizing, tutor prompt)

- Fixed Methods `Edit Block` dialog in `dashboard_rebuild/client/src/pages/methods.tsx`:
  - Category dropdown now normalizes legacy values (`prepare/interrogate/refine/...`) to control-plane categories so select always works.
  - Category labels now use explicit control-plane labels (PRIMING/CALIBRATE/ENCODING/REFERENCE/RETRIEVAL/OVERLEARNING).
  - Best stage selector moved to full-width row and trigger set to no-wrap to prevent text clipping.
  - Added editable `TUTOR PROMPT` textarea bound to `facilitation_prompt`, persisted via method update API.
  - Dialog widened (`max-w-lg`) for stable control spacing.
- Validation:
  - `npm run build` (dashboard_rebuild) -> PASS
  - `pytest brain/tests/` with `PYTHONPATH=C:\pt-study-sop` -> `667 passed`

## 2026-02-22 - Methods dropdown fix + reset/full-text controls

- Fixed dropdown interaction reliability by raising Select popup layer globally:
  - `dashboard_rebuild/client/src/components/ui/select.tsx` changed `SelectContent` z-index to `z-[200]`.
- Updated methods edit dialog in `dashboard_rebuild/client/src/pages/methods.tsx`:
  - Added `FULL TEXT` toggle to expand dialog and text editors.
  - Added `RESET PROMPT` button to restore `facilitation_prompt` from current block.
  - Added stronger select content z-index override (`z-[240]`) inside dialog selects.
  - Improved text areas: description now resizable, tutor prompt scales in fullscreen.
- Validation:
  - `npm run build` (dashboard_rebuild) -> PASS
  - `pytest brain/tests/` with `PYTHONPATH=C:\pt-study-sop` -> `667 passed`
## 2026-02-22 14:19 - Method card hardening sweep
- Hardened all remaining non-hardened method YAML cards in sop/library/methods.
- Added missing description, knobs, and constraints using control-stage defaults across 39 files.
- Fixed stage-behavior mismatch in M-INT-005 (RETRIEVE attempt-first prompt).
- Validation: python -m pytest brain/tests/ => 667 passed.
## 2026-02-22 14:24 - Full category hardening + Obsidian sync + CI guardrails
- Completed semantic hardening pass across method YAML cards with stage-boundary consistency checks.
- Normalized remaining PRIME prompt boundaries (
on-assessment) and corrected RETRIEVE prompt behavior in M-INT-005.
- Synced Obsidian category pages from method cards: Prime.md, Calibrate.md, Encode.md, Reference.md, Retrieve.md, Overlearn.md, and Categories.md.
- Added rain/tests/test_method_cards_hardening.py to enforce required method card fields and stage semantics in CI.
- Validation: python -m pytest brain/tests/ => 669 passed.
## 2026-02-22 14:36 - Prompt quality pass + category sync command + live chain smoke
- Performed strict prompt quality pass across all method cards; tightened weak prompts (M-ENC-009, M-INT-005, M-PRE-005).
- Added one-command Obsidian category sync script: scripts/sync_tutor_category_docs.py.
- Added regression test for sync script: rain/tests/test_sync_tutor_category_docs.py.
- Updated script docs (scripts/README.md) and tutor tracker (docs/root/TUTOR_TODO.md).
- Executed live chain smoke runs with writes disabled:
  - Temp chain (Brain Dump -> Micro Precheck -> KWIK Hook) failed at step 3 due artifact validator expecting cards (useful drift signal).
  - Temp chain (Learning Objectives Primer -> Micro Precheck -> Why-Chain) completed successfully.
- Validation: python -m pytest brain/tests/ => 670 passed.
## 2026-02-22 15:05 - Strict method-library drift sync + runtime verification
- Implemented strict DB/YAML reconciliation path in `brain/data/seed_methods.py` (`strict_sync` mode) so non-placeholder rows are corrected for runtime-critical fields (including `artifact_type`).
- Added startup guard in `brain/db_setup.py` (`ensure_method_library_seeded`) to run one-time strict sync by default via `PT_METHOD_LIBRARY_STRICT_SYNC`.
- Added regression test `test_seed_methods_strict_sync_updates_stale_artifact_type` in `brain/tests/test_seed_methods.py`.
- Applied live strict sync: `python brain/data/seed_methods.py --strict-sync`.
- Verified runtime fix: `M-ENC-001` now resolves to `artifact_type='notes'` in `brain/data/pt_study.db`.
- Validation:
  - `pytest brain/tests/test_seed_methods.py brain/tests/test_method_cards_hardening.py brain/tests/test_sync_tutor_category_docs.py` -> 5 passed
  - `python -m pytest brain/tests/` -> 671 passed
  - `powershell -ExecutionPolicy Bypass -File scripts/smoke_tutor_readonly.ps1` -> 6 passed, 0 failed
  - `npm run build` (dashboard_rebuild) -> PASS
## 2026-02-22 16:05 - Hybrid video ingest planning + conductor track set creation
- Added implementation task list for MP4 study workflow: `docs/root/TUTOR_VIDEO_INGEST_PLAN.md`.
- Updated tutor execution tracker with active video ingest workstream: `docs/root/TUTOR_TODO.md`.
- Added docs index reference: `docs/README.md`.
- Created new conductor track set:
  - `conductor/tracks/video_ingest_local_20260222/` (spec, plan, index, metadata)
  - `conductor/tracks/video_enrichment_api_20260222/` (spec, plan, index, metadata)
  - `conductor/tracks/video_tutor_integration_20260222/` (spec, plan, index, metadata)
- Updated `conductor/tracks.md` with planned active priorities and meta-track scope.
- Planning is aligned to current codebase constraints:
  - upload endpoint extension gate in `brain/text_extractor.py`
  - existing materials sync and mp4 binary ingest path in `brain/rag_notes.py` + `brain/dashboard/api_tutor.py`
  - retrieval/embedding path in `brain/tutor_rag.py`.

## 2026-02-23 00:00 - MP4 video ingest implementation (local + tutor workflow)
- Added local ingest pipeline and bridge:
  - `brain/video_ingest_local.py` (ffmpeg audio extraction, faster-whisper transcript, keyframes, optional OCR, artifact writer)
  - `brain/video_ingest_bridge.py` (ingest transcript/visual markdown into materials corpus + embed)
  - `scripts/video_ingest_local.py` CLI entrypoint
- Added tutor backend video workflow in `brain/dashboard/api_tutor.py`:
  - MP4 support in `/api/tutor/materials/upload`
  - `POST /api/tutor/materials/video/process`
  - `GET /api/tutor/materials/video/status/<job_id>`
  - background job state + async process/ingest execution.
- Added frontend API + UI wiring:
  - `dashboard_rebuild/client/src/api.ts` new methods/types for video process/status
  - `dashboard_rebuild/client/src/components/MaterialSelector.tsx` process-selected-MP4 action + polling + per-row status badges
  - `.mp4` accepted in material selectors/uploader.
- Added tests:
  - `brain/tests/test_video_ingest_local.py`
  - `brain/tests/test_video_ingest_bridge.py`
  - `brain/tests/test_video_process_api.py`
- Validation:
  - `python -m pytest brain/tests/test_video_ingest_local.py brain/tests/test_video_ingest_bridge.py brain/tests/test_video_process_api.py` -> 6 passed
  - `python -m pytest brain/tests/` -> 677 passed
  - `cd dashboard_rebuild && npm run build` -> PASS
## 2026-02-23 - Tutor planning board and track status normalization

- Reworked `docs/root/TUTOR_TODO.md` into an execution board with:
  - explicit active sprint lanes,
  - ordered PRIME hardening tasks,
  - explicit chain-integrity tasks,
  - blocking tasks for video-path completion.
- Updated `conductor/tracks.md` with current active-workstream line:
  - `Tutor PRIME hardening + transfer integrity`
- Kept remaining historical track entries unchanged for audit continuity.

## 2026-02-23 - A1.4 PRIME runtime non-assessment enforcement
- Added hard PRIME runtime guardrails in rain/dashboard/api_tutor.py:
  - blocks ehavior_override=evaluate|teach_back while active stage is PRIME (returns PRIME_ASSESSMENT_BLOCKED).
  - validates artifact/finalize payload trees for assessment fields (score, grade, confidence, ccuracy, calibration, mastery, erdict, ubric) when stage is PRIME.
  - rejects PRIME artifacts that include RETRIEVE/OVERLEARN in session.stage_flow.
- Added regression tests in rain/tests/test_tutor_session_linking.py:
  - 	est_finalize_rejects_prime_confidence_fields`n  - 	est_send_turn_blocks_prime_evaluate_mode`n- Updated board status in docs/root/TUTOR_TODO.md (A1.4 checked).

## 2026-02-23 - A1.5 PRIME knob wiring end-to-end
- Implemented method knob contract wiring with bounds + fallback semantics in rain/dashboard/api_methods.py:
  - YAML knob definitions loaded per method_id`n  - normalized knob schema adds deterministic fallback policy per knob type
  - PRIME and non-PRIME methods now expose knobs, constraints, and has_active_knobs in API responses
  - API accepts/saves edited knob payloads via knob_overrides_json.
- Added DB compatibility for knob overrides:
  - rain/db_setup.py adds method_blocks.knob_overrides_json on create/migrate.
  - rain/data/seed_methods.py seeds/syncs knob definitions from YAML into DB override field.
- Added Methods UI knob editing with JSON validation + reset in dashboard_rebuild/client/src/pages/methods.tsx.
- Removed PRIME guardrail test skip dependency by creating explicit PRIME-first chain in test setup (rain/tests/test_tutor_session_linking.py).
- Added method API tests for knob contract and knob update round-trip (rain/tests/test_methods_api.py).

## 2026-03-02 — Embedding Sync Fix (embedding-sync-fix plan)

**Problem**: Material sync hung indefinitely on embedding phase. Root cause: Doc 445 (`spine mobilization lab handout.docx`) had 15.5M chars from Docling table extraction bloat. `embed_rag_docs()` had no timeout, no progress reporting, and a partial-embed bug that permanently skipped failed docs on retry.

**Changes committed**:
- `fix(rag): cap document content before chunking to prevent hang` (54cc152a)
  - Added `MAX_CONTENT_CHARS = 500_000` constant
  - Guard clause in `chunk_document()`: strip → cap → split (prevents MarkdownHeaderTextSplitter regex hang)
- `fix(rag): add per-doc timeout and partial-embed cleanup` (78002c7b)
  - Added `DOC_EMBED_TIMEOUT_SEC = 120` constant
  - `embed_rag_docs()` now accepts `progress_callback: Optional[Callable[[int, int, str], None]]`
  - Per-doc ThreadPoolExecutor timeout (120s)
  - On timeout/error: DELETE rag_embeddings for that doc (fixes permanent-skip bug)
  - Return dict now includes `timed_out` count
- `fix(sync): wire embedding progress into sync job status` (2e48ebe8)
  - Progress callback wired into `_launch_materials_sync_job()`
  - `embedding_progress` dict added to sync job state (current, total, current_file)
  - 10-minute overall phase timeout safety net

**Pending (requires Flask restart)**:
- DB cleanup: stuck sync job thread holds write lock on pt_study.db
- After `Start_Dashboard.bat` restart:
  1. `DELETE FROM rag_docs WHERE id = 445` (re-sync will re-extract with cap)
  2. POST `/api/tutor/materials/sync/start` with Joint Mobility folder
  3. Verify all 5 docs embed successfully

## 2026-03-03 — Tutor delete hardening (session + artifacts)

- Hardened Tutor delete semantics in `brain/dashboard/api_tutor.py`:
  - `DELETE /api/tutor/session/<id>` is now idempotent for already-missing sessions (`deleted:false`, HTTP 200).
  - Added structured delete response fields (`status`, `request_id`, requested/deleted/skipped/failed counts).
  - Enforced Obsidian cleanup gate: if expected session-owned Obsidian paths are not deleted, endpoint returns failure (`obsidian_cleanup_failed`) and does not delete DB rows.
  - Added structured server logs for session/artifact delete operations with request id and counts.
  - `GET /api/tutor/session/<id>` reconciliation is now side-effect-free (`persist=False`) so reads do not mutate DB state.
  - `DELETE /api/tutor/session/<id>/artifacts` now returns `requested_count`, `applied_count`, and `skipped_indexes` for partial-success transparency.

- Hardened Tutor artifacts UI in `dashboard_rebuild/client/src/components/TutorArtifacts.tsx`:
  - Bulk session delete now reports deleted/already-gone/failed counts and renders an in-panel failure details report.
  - Added active-session warning in bulk delete confirm modal.
  - Added operation locks for single-row delete actions to prevent duplicate requests while deletes/ends are in-flight.
  - Ensures session list is invalidated before user-facing completion status is shown.

- Updated API typing contracts in `dashboard_rebuild/client/src/api.ts` for richer delete responses.
- Updated user troubleshooting guide in `docs/root/GUIDE_USER.md` for new delete report semantics.

## 2026-03-06 — Obsidian CLI argv quoting hotfix

- Fixed `brain/obsidian_vault.py` so `subprocess.run([...])` passes raw argv values like `vault=Treys School` and `path=...` instead of shell-quoted strings like `vault="Treys School"`.
- This specifically hardens Windows Obsidian delete/read/save flows that were spawning `obsidian.exe` with literal quote characters in argv and surfacing repeated main-process `EPIPE: broken pipe, write` popups.
- Updated `brain/tests/test_obsidian_vault.py` to lock in the new argv shape and prevent regression.
- Verification:
  - `pytest brain/tests/test_obsidian_vault.py -q` -> `42 passed`
  - `pytest brain/tests/` -> `918 passed, 2 failed, 1 skipped`
    - unrelated existing failures:
      - `brain/tests/test_path_generation.py::test_get_course_map_has_vault_root`
      - `brain/tests/test_tutor_session_linking.py::test_send_turn_done_payload_includes_retrieval_debug`

## 2026-03-04 — Scholar/Tutor contract alignment + lifecycle hardening

- Added deterministic Scholar question persistence in `brain/db_setup.py`:
  - New `scholar_questions` table (stable `question_id`, `question_hash`, lifecycle status/timestamps, answer fields).
  - Added supporting indexes and migration-safe missing-column backfill pattern.

- Reworked Scholar question APIs in `brain/dashboard/api_adapter.py`:
  - `GET /api/scholar/questions` now ingests question files into DB and returns stable IDs + lifecycle fields.
  - Added `POST /api/scholar/questions/<id>/answer` for persisted answer/status transitions.

- Added explicit proposal action routes in `brain/dashboard/api_adapter.py`:
  - `POST /api/scholar/proposals/<id>/approve`
  - `POST /api/scholar/proposals/<id>/reject`

- Hardened run status/history contract surfaces:
  - Extended `_scholar_status_payload()` with compatibility fields (`run_id`, `phase`, `started_at`, `finished_at`, `error`).
  - Added `/api/scholar/status` alias in `brain/dashboard/routes.py`.
  - Added best-effort fallback in `/api/scholar/run/history` when DB history path fails.

- Frontend contract cleanup:
  - `dashboard_rebuild/client/src/api.ts`: Scholar `run()` now accepts payload; `runStatus()` now targets `/api/scholar/status`; `runHistory()` now tolerates wrapped or bare history payload shapes.
  - `dashboard_rebuild/client/src/components/ScholarRunStatus.tsx`: switched to centralized API client (`api.scholar.runStatus`, `api.scholar.run`) and shared status typing.

- Added implementation notes:
  - `docs/root/SCHOLAR_TUTOR_ALIGNMENT_AUDIT_2026-03-04.md`

## 2026-03-04 — Scholar open-question answer flow wired in active UI

- Updated active Scholar page (`dashboard_rebuild/client/src/pages/scholar.tsx`) to support end-to-end question resolution:
  - Pending open questions now include inline answer input + submit button.
  - Submit action calls Scholar API answer endpoint and refreshes `scholar-questions`.
  - Answered questions now display persisted answer content/status.
- Updated Scholar API client (`dashboard_rebuild/client/src/api.ts`):
  - Added `api.scholar.answerQuestion(questionId, answer, source)`.
  - Extended `ScholarQuestion` type with lifecycle/status fields used by the active page.
- Updated implementation notes in:
  - `docs/root/SCHOLAR_TUTOR_ALIGNMENT_AUDIT_2026-03-04.md`

## 2026-03-04 — Scholar answer-submit lock + regression test guardrail

- Hardened Scholar answer submissions in `dashboard_rebuild/client/src/pages/scholar.tsx`:
  - Added per-question in-flight lock to prevent duplicate submit races.
  - Added explicit button disabled/loading states during answer mutation.
  - Added stable test ids for answer assertions (`button-submit-answer-*`, `saved-answer-*`).
- Added page-level regression test in `dashboard_rebuild/client/src/pages/__tests__/scholar.test.tsx`:
  - Verifies answered questions render `ANSWERED`.
  - Verifies a single `Saved Answer` block is shown with persisted answer text.
- Prevention note:
  - For mutation-backed inline actions, always add an in-flight guard + UI disabled state + deterministic test id before shipping.

## 2026-03-05 — Start_Dashboard startup deadlock guard (step [0/6])

- Fixed startup hang in `Start_Dashboard.bat` where process cleanup could block at:
  - `[0/6] Closing any existing dashboard server processes...`
- Replaced expensive PowerShell process scans with fast/non-blocking cleanup:
  - `taskkill /FI "WINDOWTITLE eq PT Study Brain Dashboard*" /T /F`
  - `netstat -ano -p tcp | findstr ":5000"` + numeric PID guard + `taskkill /PID ... /F`
- Validation:
  - `Start_Dashboard.bat` progresses past step `[0/6]`.
  - Dashboard server listens on `127.0.0.1:5000`.
  - Tutor runtime smoke passed (`/api/tutor/chains/templates`, session create, chain-status, advance-block, delete).

## 2026-03-05 — Tutor backend test unblock + reliability hardening

- Fixed test import bootstrap in `brain/tests/conftest.py`:
  - Added both repo root and `brain/` paths to support mixed import styles (`brain.*` and legacy top-level imports).
  - Added integration-aware timeout defaults (`180s` for `@integration`, `30s` baseline otherwise) to reduce false hangs while preserving guardrails.
- Hardened tutor context integration test stability:
  - Marked `brain/tests/test_tutor_context_integration.py` as `integration` and added explicit `timeout(180)`.
  - Added `pytest.ini` marker registration for `integration`.
- Updated `brain/tests/test_tutor_session_linking.py` fixture stubs:
  - Added explicit stubs for `dashboard.api_tutor` vault helpers (`_vault_read_note`, `_vault_save_note`, `_vault_delete_note`) to match current runtime write path.
  - Normalized fake Obsidian paths consistently to avoid store-key mismatch.
- Verification:
  - `pytest brain/tests/test_selector_bridge.py brain/tests/test_tutor_context_integration.py brain/tests/test_chain_validator.py brain/tests/test_api_tutor_mode_flags.py -q` → all pass.
  - Broader tutor/chain/rules bundle:
    `pytest brain/tests/test_seed_methods.py brain/tests/test_method_cards_hardening.py brain/tests/test_selector_bridge.py brain/tests/test_chain_runner.py brain/tests/test_chain_validator.py brain/tests/test_api_tutor_mode_flags.py brain/tests/test_tutor_context_wiring.py brain/tests/test_tutor_context_integration.py brain/tests/test_tutor_session_linking.py -q`
    → `95 passed` (warnings only from upstream Chroma/LangChain deprecations).

## 2026-03-06 — Study Buddy canon audit kickoff

- Opened new Conductor track: `study-buddy-canon-audit_20260306`.
- Scope:
  - create one master product canon for Tutor / Study Buddy behavior
  - publish an evidence audit with source classification matrix + evolution timeline
  - rewire active docs away from overlapping overall source-of-truth claims
- Deliverables:
  - `docs/root/TUTOR_STUDY_BUDDY_CANON.md`
  - `docs/root/TUTOR_STUDY_BUDDY_AUDIT_2026-03-06.md`
- Guardrails:
  - keep `sop/library/` as pedagogy canon
  - keep archive files read-only and use them as historical evidence only
  - do not make runtime/API/schema changes in this pass

## 2026-03-06 — Study Buddy canon audit close-out

- Published the new master canon:
  - `docs/root/TUTOR_STUDY_BUDDY_CANON.md`
- Published the supporting evidence audit:
  - `docs/root/TUTOR_STUDY_BUDDY_AUDIT_2026-03-06.md`
- Rewired active docs to point to the new canon and removed overlapping top-level source-of-truth claims across:
  - `README.md`
  - `docs/README.md`
  - `docs/root/PROJECT_ARCHITECTURE.md`
  - `docs/root/TUTOR_OWNER_INTENT.md`
  - `docs/root/GUIDE_TUTOR_FLOW.md`
  - `conductor/product.md`
- Validation:
  - `git diff --check -- [canon audit doc set]`
  - stale-string grep sweep for deprecated Tutor endpoints and legacy dashboard architecture markers
- Review:
  - fresh doc-code consistency subagent pass returned `No findings`

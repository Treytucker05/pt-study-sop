# General Change Log

Changes not tied to a specific conductor track. Append dated entries below.

---

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

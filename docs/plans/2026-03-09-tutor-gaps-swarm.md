# Tutor Gaps Swarm — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close all 12 audit gaps (except Gap 6), all open TUTOR_TODO queues (C, D, E), and open sprint phases (15, 17) via a monolith split followed by parallel agent streams.

**Architecture:** Split `brain/dashboard/api_tutor.py` (9,128 lines, 145 functions) into 7 focused modules sharing one Blueprint. Then execute 6 parallel streams: quick wins, session robustness, test coverage, infrastructure, open queues, and contract hardening.

**Tech Stack:** Python/Flask, React/TypeScript/Vite, SQLite, ChromaDB, LangChain, SSE streaming, Obsidian vault sync

**Design Doc:** `docs/plans/2026-03-09-tutor-gaps-swarm-design.md`

---

## Phase 1: Split the Monolith (Gap 1)

### Task 1: Create `api_tutor_utils.py` — shared helpers

**Files:**
- Create: `brain/dashboard/api_tutor_utils.py`
- Modify: `brain/dashboard/api_tutor.py`

**Step 1:** Create `api_tutor_utils.py` with all utility/config functions extracted from `api_tutor.py`:
- Lines 135-170: `_safe_json_dict`, `_store_preflight_bundle`, `_get_preflight_bundle`
- Lines 171-216: `_record_tutor_delete_telemetry`, `_extract_knob_defaults`
- Lines 217-343: `_load_method_contracts`, `_validate_chain_launch_blocks`, `_ensure_selector_columns`
- Lines 344-438: `_gen_session_id`, `_sanitize_module_name`, `_sanitize_path_segment`, `_resolve_class_label`, `_study_notes_base_path`, `_canonical_moc_path`, `_canonical_learning_objectives_page_path`
- Lines 439-673: All `_wikilink`, `_normalize_objective_*`, `_objective_*`, `_row_value`, `_delete_orphaned_*`, `_unlink_all_*`, `_normalize_session_*`, `_default_session_mode_*`, `_load_tutor_note_schema_validator` functions
- Lines 674-841: `_normalize_tutor_artifact_payload`, `_validate_tutor_artifact_payload`, `_walk_payload_keys`, `_prime_assessment_violations`, `_collect_objectives_from_payload`
- Constants and regex patterns from lines 1-134

**Step 2:** Replace extracted functions in `api_tutor.py` with imports from `api_tutor_utils`.

**Step 3:** Run tests:
```bash
cd /c/pt-study-sop && python -m pytest brain/tests/ -x -q
```
Expected: All 168 tests pass.

**Step 4:** Commit:
```bash
git add brain/dashboard/api_tutor_utils.py brain/dashboard/api_tutor.py
git commit -m "refactor(tutor): extract shared helpers to api_tutor_utils.py (Gap 1)"
```

---

### Task 2: Create `api_tutor_vault.py` — Obsidian/vault functions

**Files:**
- Create: `brain/dashboard/api_tutor_vault.py`
- Modify: `brain/dashboard/api_tutor.py`

**Step 1:** Extract all vault/Obsidian functions (56 functions, ~2,500 lines):
- Lines 842-934: `_collect_objectives_from_db`, `_resolve_learning_objectives_for_scope`
- Lines 935-1037: `_try_import_objectives_from_vault`
- Lines 1093-1892: All frontmatter parsing, section markers, vault I/O, MoC functions
- Lines 1893-2118: `_resolve_tutor_preflight`
- Lines 2119-2918: All note rendering, Obsidian sync, graph sync, reconciliation functions

Keep route handlers (`sync_session_graph`, `get_session_summary`, `link_archive`, `get_linked_chat`) as thin wrappers in the main file that delegate to vault module functions.

**Step 2:** Update imports in `api_tutor.py`.

**Step 3:** Run tests:
```bash
cd /c/pt-study-sop && python -m pytest brain/tests/ -x -q
```

**Step 4:** Commit:
```bash
git add brain/dashboard/api_tutor_vault.py brain/dashboard/api_tutor.py
git commit -m "refactor(tutor): extract vault/Obsidian logic to api_tutor_vault.py (Gap 1)"
```

---

### Task 3: Create `api_tutor_materials.py` — material/content functions

**Files:**
- Create: `brain/dashboard/api_tutor_materials.py`
- Modify: `brain/dashboard/api_tutor.py`

**Step 1:** Extract material functions (48+ functions, ~2,800 lines):
- Lines 1038-1092: `_materials_include_mp4`, `_recommended_mode_flags`, `_normalize_default_mode`, `_normalize_force_full_docs`
- Lines 1275-1325: `_load_selected_materials`
- Lines 3189-4420: All retrieval, citation, sync, video, and material helper functions
- Route handlers: `content_sources` (7898), `upload_material` (7965), `list_materials` (8104), `get_material` (8214), `update_material` (8254), `reextract_material` (8300), `delete_material` (8392), `get_material_content` (8453), `get_material_asset` (8499), `auto_link_materials` (8781), `preview_materials_sync_folder` (8796), `sync_materials_folder` (8811), `start_materials_sync` (8844), `get_materials_sync_status` (8849), `process_video_material` (8867), `get_video_process_status` (8936), `get_video_enrichment_status` (8950), `enrich_video_material` (8993)

**Step 2:** Update imports. Route handlers register on `tutor_bp` via import in main file.

**Step 3:** Run tests:
```bash
cd /c/pt-study-sop && python -m pytest brain/tests/ -x -q
```

**Step 4:** Commit:
```bash
git add brain/dashboard/api_tutor_materials.py brain/dashboard/api_tutor.py
git commit -m "refactor(tutor): extract material logic to api_tutor_materials.py (Gap 1)"
```

---

### Task 4: Create `api_tutor_turns.py` — turn/chain/streaming functions

**Files:**
- Create: `brain/dashboard/api_tutor_turns.py`
- Modify: `brain/dashboard/api_tutor.py`

**Step 1:** Extract turn/chain functions (13 functions, ~1,600 lines):
- Lines 2919-3188: `_get_tutor_session`, `_get_session_turns`, `_is_first_session_for_course`, `_should_skip_block`, `_resolve_chain_blocks`, `_parse_chain_context_tags`, `_build_chain_info`, `_chain_requires_prime_launch`, `_active_control_stage_for_session`
- Lines 5015-6665: `send_turn` (the 1,329-line megafunction), `get_chain_status`, `advance_block`, `get_template_chains`
- Lines 8551-8679: `create_chain`, `get_chain`, `create_custom_chain`

**Step 2:** Update imports.

**Step 3:** Run tests:
```bash
cd /c/pt-study-sop && python -m pytest brain/tests/ -x -q
```

**Step 4:** Commit:
```bash
git add brain/dashboard/api_tutor_turns.py brain/dashboard/api_tutor.py
git commit -m "refactor(tutor): extract turn/chain logic to api_tutor_turns.py (Gap 1)"
```

---

### Task 5: Create `api_tutor_sessions.py` and `api_tutor_artifacts.py`

**Files:**
- Create: `brain/dashboard/api_tutor_sessions.py`
- Create: `brain/dashboard/api_tutor_artifacts.py`
- Modify: `brain/dashboard/api_tutor.py`

**Step 1:** Extract session route handlers to `api_tutor_sessions.py`:
- `preflight_session` (4421), `create_session` (4456), `get_session` (4963), `end_session` (6666), `delete_session` (7264), `list_sessions` (7852)

**Step 2:** Extract artifact functions to `api_tutor_artifacts.py`:
- `_finalize_structured_notes_for_session` (2491), `_delete_artifact_obsidian_files` (2810), `_cascade_delete_obsidian_files` (2830)
- Route handlers: `create_artifact` (7481), `finalize_session_artifacts` (7623), `delete_artifacts` (7733)

**Step 3:** Reduce `api_tutor.py` to thin Blueprint registration + config routes:
- Blueprint creation, `before_request`, `after_request`
- `config_check` (8680), `embed_status` (8721), `trigger_embed` (8758), `get_tutor_settings` (9085), `put_tutor_settings` (9096), `get_course_map` (9120)
- Import all route modules so decorators register

**Step 4:** Run tests:
```bash
cd /c/pt-study-sop && python -m pytest brain/tests/ -x -q
```

**Step 5:** Commit:
```bash
git add brain/dashboard/api_tutor_sessions.py brain/dashboard/api_tutor_artifacts.py brain/dashboard/api_tutor.py
git commit -m "refactor(tutor): extract sessions + artifacts, finalize monolith split (Gap 1)"
```

---

### Task 6: Verify monolith split — full test + line count audit

**Step 1:** Run full test suite:
```bash
cd /c/pt-study-sop && python -m pytest brain/tests/ -v --tb=short 2>&1 | tail -30
```

**Step 2:** Verify line counts — each module should be under 2,500 lines, main file under 300:
```bash
wc -l brain/dashboard/api_tutor*.py
```

**Step 3:** Start Flask and hit a smoke endpoint:
```bash
curl -s http://localhost:5000/api/tutor/config-check | python -m json.tool
```

**Step 4:** Commit any fixups:
```bash
git commit -m "refactor(tutor): verify and fix monolith split (Gap 1 complete)"
```

---

## Phase 2: Parallel Streams

### Stream S1: Quick Wins (Gaps 2, 3, 5)

### Task 7: Gap 2 — Stop-generating button

**Files:**
- Modify: `dashboard_rebuild/client/src/components/TutorChat.tsx`

**Step 1:** In the streaming state Loader2 spinner, add an `onClick` handler that calls `streamAbortRef.current?.abort()` and shows a "Stop" button label. The `streamAbortRef` already exists in `useSSEStream.ts` — expose it via the hook's return value if not already.

**Step 2:** Run frontend build:
```bash
cd /c/pt-study-sop/dashboard_rebuild && npm run build
```

**Step 3:** Commit:
```bash
git commit -m "feat(tutor): add stop-generating button (Gap 2)"
```

---

### Task 8: Gap 3 — Conversation export endpoint + UI button

**Files:**
- Modify: `brain/dashboard/api_tutor_sessions.py` (new route)
- Modify: `dashboard_rebuild/client/src/pages/tutor.tsx` (export button)
- Modify: `dashboard_rebuild/client/src/api.ts` (new API method)

**Step 1:** Add `GET /api/tutor/session/<session_id>/export` route that:
- Loads all turns for the session
- Renders them as Markdown (user messages as `### You`, assistant messages as `### Tutor`)
- Includes session metadata header (date, topic, method chain, duration)
- Returns `Content-Type: text/markdown` with `Content-Disposition: attachment`

**Step 2:** Add `api.tutor.exportSession(sessionId)` method to `api.ts`.

**Step 3:** Add a download button in the session header area of `tutor.tsx`.

**Step 4:** Build and test:
```bash
cd /c/pt-study-sop/dashboard_rebuild && npm run build
```

**Step 5:** Commit:
```bash
git commit -m "feat(tutor): add conversation export as Markdown (Gap 3)"
```

---

### Task 9: Gap 5 — Fix session duration calculation

**Files:**
- Modify: `brain/dashboard/api_tutor_sessions.py` (in `end_session`)

**Step 1:** In `end_session()`, change the duration calculation from `turn_count * 2` to:
```python
if ended_at and started_at:
    wall_clock = (ended_at - started_at).total_seconds() / 60.0
    estimated = turn_count * 5
    duration_minutes = round(min(wall_clock, estimated), 1)
else:
    duration_minutes = turn_count * 2
```

**Step 2:** Run tests:
```bash
cd /c/pt-study-sop && python -m pytest brain/tests/test_tutor_session_linking.py -x -q
```

**Step 3:** Commit:
```bash
git commit -m "fix(tutor): use wall-clock for session duration (Gap 5)"
```

---

### Stream S2: Session Robustness (Gaps 4, 9)

### Task 10: Gap 4 — Rich session restore (serialize full ChatMessage)

**Files:**
- Modify: `brain/dashboard/api_tutor_turns.py` (in `send_turn` — save richer artifacts_json)
- Modify: `brain/dashboard/api_tutor_sessions.py` (in `get_session` — deserialize on restore)
- Modify: `dashboard_rebuild/client/src/components/TutorChat.types.ts` (ensure ChatMessage includes all fields)

**Step 1:** In `send_turn`, after assistant response, serialize the full structured response (citations, verdict, toolActions, retrieval_debug) into `tutor_turns.artifacts_json` as a JSON object.

**Step 2:** In `get_session` (restore path), deserialize `artifacts_json` back into the turn response so the frontend gets citations, verdicts, and tool actions on restore.

**Step 3:** Run tests + build:
```bash
cd /c/pt-study-sop && python -m pytest brain/tests/ -x -q
cd /c/pt-study-sop/dashboard_rebuild && npm run build
```

**Step 4:** Commit:
```bash
git commit -m "feat(tutor): rich session restore with citations/verdicts (Gap 4)"
```

---

### Task 11: Gap 9 — Accuracy feedback loop (retrieval quality tracking)

**Files:**
- Modify: `brain/dashboard/api_tutor_turns.py` (track retrieval metrics per turn)
- Create: `brain/dashboard/api_tutor_accuracy.py` (accuracy profile aggregation)
- Modify: `brain/db_setup.py` (new table `tutor_accuracy_log`)

**Step 1:** Create `tutor_accuracy_log` table:
```sql
CREATE TABLE IF NOT EXISTS tutor_accuracy_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    turn_number INTEGER,
    topic TEXT,
    retrieval_confidence TEXT,
    source_count INTEGER,
    chunk_count INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);
```

**Step 2:** In `send_turn`, after retrieval, log a row to `tutor_accuracy_log` with the confidence tier and source stats.

**Step 3:** Create `api_tutor_accuracy.py` with a `GET /api/tutor/accuracy-profile` endpoint that aggregates per-topic retrieval quality over time.

**Step 4:** Run tests:
```bash
cd /c/pt-study-sop && python -m pytest brain/tests/ -x -q
```

**Step 5:** Commit:
```bash
git commit -m "feat(tutor): accuracy feedback loop with retrieval quality tracking (Gap 9)"
```

---

### Stream S3: Test Coverage (Gap 8)

### Task 12: Build mock infrastructure for LLM/Vault/ChromaDB

**Files:**
- Create: `brain/tests/conftest.py` (shared fixtures)
- Create: `brain/tests/mocks/llm_mock.py`
- Create: `brain/tests/mocks/vault_mock.py`
- Create: `brain/tests/mocks/chroma_mock.py`

**Step 1:** Create mock classes:
- `MockLLMClient` — returns canned responses, tracks call count/args
- `MockVaultIO` — in-memory dict simulating vault read/write/delete
- `MockChromaCollection` — in-memory vector store with add/query

**Step 2:** Create shared pytest fixtures in `conftest.py` that patch the real clients with mocks.

**Step 3:** Run existing tests to verify mocks don't break anything:
```bash
cd /c/pt-study-sop && python -m pytest brain/tests/ -x -q
```

**Step 4:** Commit:
```bash
git commit -m "test(tutor): add mock infrastructure for LLM, vault, ChromaDB (Gap 8)"
```

---

### Task 13: Unit tests for prompt assembly pipeline

**Files:**
- Create: `brain/tests/test_tutor_prompt_assembly.py`

**Step 1:** Write tests covering:
- First-pass prompt assembly (system prompt + materials + objectives + chain context)
- Second-pass prompt assembly (turn context + retrieval results + accuracy guidance)
- Edge cases: no materials, no objectives, empty chain, oversized context truncation

Target: 15+ test cases.

**Step 2:** Run and verify:
```bash
cd /c/pt-study-sop && python -m pytest brain/tests/test_tutor_prompt_assembly.py -v
```

**Step 3:** Commit:
```bash
git commit -m "test(tutor): add prompt assembly unit tests (Gap 8)"
```

---

### Task 14: Unit tests for retrieval logic + integration tests for SSE

**Files:**
- Create: `brain/tests/test_tutor_retrieval.py`
- Create: `brain/tests/test_tutor_streaming.py`

**Step 1:** Write retrieval tests:
- Full-content retrieval path (small docs)
- Vector retrieval path (chunked docs)
- Linked expansion (material references)
- Retrieval confidence computation
- Citation source extraction

**Step 2:** Write SSE streaming integration tests:
- SSE event format validation
- Abort handling
- Error propagation through stream
- Token-by-token accumulation

**Step 3:** Run:
```bash
cd /c/pt-study-sop && python -m pytest brain/tests/test_tutor_retrieval.py brain/tests/test_tutor_streaming.py -v
```

**Step 4:** Commit:
```bash
git commit -m "test(tutor): add retrieval + SSE streaming tests (Gap 8)"
```

---

### Stream S4: Infrastructure (Gaps 7, 10, 12)

### Task 15: Gap 7 — ChromaDB request-level locking

**Files:**
- Modify: `brain/tutor_rag.py` (add threading lock around ChromaDB operations)

**Step 1:** Add a module-level `threading.Lock()` and wrap all ChromaDB `add`/`query`/`delete` operations in a `with _chroma_lock:` block. This prevents concurrent request corruption in the single-process Flask dev server.

**Step 2:** Run tests:
```bash
cd /c/pt-study-sop && python -m pytest brain/tests/ -x -q
```

**Step 3:** Commit:
```bash
git commit -m "fix(tutor): add request-level ChromaDB locking (Gap 7)"
```

---

### Task 16: Gap 10 — Vault janitor expansion

**Files:**
- Modify: `brain/dashboard/api_tutor_vault.py` (add janitor checks)
- Modify: `brain/dashboard/api_tutor_sessions.py` (expose janitor endpoint)

**Step 1:** Add to the vault janitor logic:
- `_detect_broken_wikilinks()` — scan notes for `[[Target]]` where target file doesn't exist
- `_detect_orphaned_files()` — find tutor-managed files not referenced by any session
- `_detect_stale_objectives()` — find objectives with status='active' but no session activity in 30+ days

**Step 2:** Add `GET /api/tutor/vault/health` endpoint returning the janitor report.

**Step 3:** Run tests:
```bash
cd /c/pt-study-sop && python -m pytest brain/tests/ -x -q
```

**Step 4:** Commit:
```bash
git commit -m "feat(tutor): expand vault janitor with link/orphan/stale checks (Gap 10)"
```

---

### Task 17: Gap 12 — Gemini Vision refinement

**Files:**
- Modify: `brain/dashboard/api_tutor_materials.py` (in `_build_gemini_vision_context`)

**Step 1:** In `_build_gemini_vision_context` (line 3934-4051):
- Add timestamp targeting: extract chapter/section timestamps from video metadata via ffprobe, target relevant segments
- Add relevance filtering: skip segments where transcript has <10% keyword overlap with the session topic
- Combine visual frame context + transcript context into a merged prompt section

**Step 2:** Run tests:
```bash
cd /c/pt-study-sop && python -m pytest brain/tests/ -x -q
```

**Step 3:** Commit:
```bash
git commit -m "feat(tutor): refine Gemini Vision with timestamp targeting (Gap 12)"
```

---

### Stream S5: Open Queues (C, D, E)

### Task 18: Queue C — Category docs + doc reconciliation

**Files:**
- Modify: Obsidian vault category pages (6 files: Prime.md, Calibrate.md, Encode.md, Reference.md, Retrieve.md, Overlearn.md)
- Modify: `docs/root/TUTOR_TRUTH_PATH.md`, `docs/root/TUTOR_CATEGORY_DEFINITIONS.md`

**Step 1:** For each of the 6 category pages:
- Add complete method inventory table (method_id, name, description, stage)
- Add `Method Contract` summary table
- Add one executable tutor prompt per method

**Step 2:** Reconcile policy contradictions across truth-path and category-definition docs.

**Step 3:** Commit:
```bash
git commit -m "docs(tutor): complete category pages + reconcile policy docs (Queue C)"
```

---

### Task 19: Queue D — Video/MP4 path + budget failover

**Files:**
- Modify: `brain/dashboard/api_tutor_materials.py`
- Modify: `brain/video_ingest_bridge.py`
- Modify: `dashboard_rebuild/client/src/components/MaterialSelector.tsx`
- Create: `brain/tests/test_video_process_api.py`

**Step 1:** Verify MP4 upload → process → retrieval works in normal (non-admin) session flow.

**Step 2:** Add key rotation: when Gemini API returns 429/quota-exceeded, auto-switch to backup key from env var `GEMINI_API_KEY_BACKUP`.

**Step 3:** Add budget visibility: return `provider` and `remaining_budget_pct` in video process status responses.

**Step 4:** Write regression test covering upload→process→chat-turn retrieval with fallback simulation.

**Step 5:** Commit:
```bash
git commit -m "feat(tutor): MP4 path fix + budget failover + regression tests (Queue D)"
```

---

### Task 20: Queue E — UI/Method controls polish

**Files:**
- Modify: `dashboard_rebuild/client/src/pages/methods.tsx`
- Modify: `dashboard_rebuild/client/src/components/ui/select.tsx`

**Step 1:** E1.1 — Make Favorite/Rate/Edit controls always-visible on method cards (not hover-only), remove any stale destructive actions.

**Step 2:** E1.2 — Fix dropdown/select reliability: ensure `onValueChange` fires reliably for category/stage selects by using controlled components with explicit state.

**Step 3:** E1.3 — Add "Reset to template" button for tutor prompt edits that restores the canonical template from YAML seed.

**Step 4:** Build:
```bash
cd /c/pt-study-sop/dashboard_rebuild && npm run build
```

**Step 5:** Commit:
```bash
git commit -m "fix(tutor): polish method controls, dropdowns, prompt reset (Queue E)"
```

---

### Stream S6: Contract & Chain Hardening (Gap 11, Sprints 15, 17)

### Task 21: Gap 11 — Author exhaustive method contracts

**Files:**
- Modify: `sop/library/methods/*.yaml` (all 49 method block files)

**Step 1:** For each of the 49 method blocks, ensure the YAML contains:
- `allowed_moves`: explicit list of what the tutor CAN do in this method
- `forbidden_moves`: explicit list of what the tutor MUST NOT do
- `required_outputs`: what the method MUST produce (artifacts, assessments, etc.)
- `facilitation_prompt`: full tutor prompt (already required by hardening test)

**Step 2:** Run hardening test:
```bash
cd /c/pt-study-sop && python -m pytest brain/tests/test_method_cards_hardening.py -v
```

**Step 3:** Commit:
```bash
git commit -m "feat(tutor): exhaustive contracts for all 49 method blocks (Gap 11)"
```

---

### Task 22: Sprint 15 — Top-down tutor hardening (Phases 0-2)

**Files:**
- Modify: `sop/library/chains/C-TRY-001.yaml`, `C-TRY-002.yaml`
- Modify: `brain/tutor_prompt_builder.py`
- Modify: `brain/dashboard/api_tutor_turns.py`

**Step 1:** Phase 0 — Lock top-down chains as runtime proving ground. Add `proving_ground: true` flag to C-TRY-001 and C-TRY-002. Record weak method cards.

**Step 2:** Phase 1 — Rewrite global runtime tutor rules for hybrid teaching + honest provenance. Update `tutor_prompt_builder.py` system prompt to include provenance signaling.

**Step 3:** Phase 2 — Add chain runtime profiles and block overrides for the two top-down chains.

**Step 4:** Run tests:
```bash
cd /c/pt-study-sop && python -m pytest brain/tests/ -x -q
```

**Step 5:** Commit:
```bash
git commit -m "feat(tutor): top-down hardening phases 0-2 (Sprint 15)"
```

---

### Task 23: Sprint 17 — 10/10 certification (Phases 2-4)

**Files:**
- Modify: `brain/dashboard/api_tutor_sessions.py` (preflight certification)
- Modify: `brain/dashboard/api_tutor_turns.py` (chain certification)
- Modify: `brain/dashboard/api_tutor_artifacts.py` (artifact certification)

**Step 1:** Phase 2 — Certify session authority/preflight/restore:
- Verify preflight enforces objective scoping
- Verify restore preserves full message history
- Verify resume picks up correct chain position

**Step 2:** Phase 3 — Certify all selectable template chains at baseline/strict bars:
- Each chain must have a passing smoke test
- Chain blocks must follow stage ordering rules

**Step 3:** Phase 4 — Certify artifact reliability:
- Notes must save to Obsidian with correct frontmatter
- Card drafts must have valid schema

**Step 4:** Run tests:
```bash
cd /c/pt-study-sop && python -m pytest brain/tests/ -x -q
```

**Step 5:** Commit:
```bash
git commit -m "feat(tutor): 10/10 certification phases 2-4 (Sprint 17)"
```

---

### Task 24: Sprint 17 — Certification phases 5-6

**Files:**
- Modify: `brain/dashboard/api_tutor_turns.py` (provenance behavior)
- Modify: `sop/library/chains/*.yaml` (golden path chains)
- Create: `docs/root/TUTOR_CERTIFICATION_REPORT.md`

**Step 1:** Phase 5 — Certify trust, provenance, and requested-reference behavior:
- Tutor must cite sources when available
- Tutor must signal confidence level (high/medium/low/insufficient)
- Tutor must honor "teach from this source" requests

**Step 2:** Phase 6 — Certify neuro golden paths and wire the final release gate:
- Each PERO stage has at least one certified chain path
- Write the final certification report

**Step 3:** Commit:
```bash
git commit -m "feat(tutor): certification phases 5-6 + release gate (Sprint 17)"
```

---

## Phase 3: Closeout

### Task 25: Update TUTOR_TODO.md — mark all completed items

**Files:**
- Modify: `docs/root/TUTOR_TODO.md`

**Step 1:** Mark all completed queue items (C, D, E) and sprint phases (15, 17) with `[x]`.

**Step 2:** Add dated log entries to `conductor/tracks/GENERAL/log.md` for each behavioral change.

**Step 3:** Commit:
```bash
git commit -m "docs(tutor): mark all swarm items complete in TUTOR_TODO"
```

---

### Task 26: Final verification — full test suite + build + smoke test

**Step 1:** Run full backend test suite:
```bash
cd /c/pt-study-sop && python -m pytest brain/tests/ -v --tb=short
```

**Step 2:** Run frontend build:
```bash
cd /c/pt-study-sop/dashboard_rebuild && npm run build
```

**Step 3:** Copy dist:
```bash
powershell.exe -Command "Copy-Item -Recurse -Force 'C:\pt-study-sop\dashboard_rebuild\dist\public\*' 'C:\pt-study-sop\brain\static\dist\'"
```

**Step 4:** Start Flask, verify key endpoints:
- `GET /api/tutor/config-check`
- `POST /api/tutor/session/preflight` with a study unit
- `GET /api/tutor/vault/health`

**Step 5:** Final commit:
```bash
git commit -m "chore(tutor): final verification pass — all gaps closed"
```

---

## Execution Strategy

**Phase 1 (Tasks 1-6):** Sequential — each module extraction depends on the previous.

**Phase 2 (Tasks 7-24):** Parallel by stream — S1/S2/S3/S4/S5/S6 can run concurrently since they touch different files after the split.

**Phase 3 (Tasks 25-26):** Sequential — closeout after all streams complete.

**Total: 26 tasks across 3 phases.**

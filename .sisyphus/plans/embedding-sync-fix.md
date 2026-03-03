# Embedding Sync Fix — Content Guard + Timeout + Progress

## TL;DR

> **Quick Summary**: Fix the embedding sync hang caused by Doc 445 (15.5M chars from Docling table extraction bloat) by adding a content size cap before chunking, per-doc timeouts, partial-embed recovery, and progress reporting during the embedding phase.
> 
> **Deliverables**:
> - Content guard in `chunk_document()` (strip → cap → split)
> - Per-doc timeout + partial-embed cleanup in `embed_rag_docs()`
> - Progress callback wired into sync job for embedding phase
> - Cleanup of existing bad state (Doc 445 + stuck sync job)
> 
> **Estimated Effort**: Short (4 focused tasks, ~1-2 hours)
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4

---

## Context

### Original Request
User reported the Library page material sync was stuck on "embedding" phase. Console showed no app errors (only browser extension noise). User wants a **quick fix**, not a full redesign.

### Interview Summary
**Key Discussions**:
- Sync job `ede0c624...` has been stuck since 11:02 AM on embedding phase
- Doc 445 (`spine mobilization lab handout.docx`) has 15.5M chars — Docling table extraction bloat, NOT image refs
- `strip_image_refs_for_rag()` already exists at `tutor_rag.py:38-46` but only removes ~10K chars of image markdown refs
- The real bloat is multi-million-char table cell extraction artifacts (lines 29-35 each ~2.2M chars)
- `embed_rag_docs()` has zero timeout — no per-doc, no per-batch, no phase-level
- Partial embedding state bug: if embedding hangs mid-doc and is killed, doc is permanently skipped on retry because `COUNT(*) > 0` check passes

**Research Findings**:
- OpenAI API is working (verified direct embedding call)
- Flask server running on port 5000
- 5/5 files synced to rag_docs, 0/5 embedded
- All 5 docs have course_id=null, folder_path=""

### Metis Review
**Identified Gaps** (addressed):
- Image stripping already exists — bloat is NOT image refs, it's Docling table artifacts → content cap must target raw char count
- Content cap MUST happen BEFORE `MarkdownHeaderTextSplitter` — the splitter regex on 15.5M input can itself hang/OOM
- Partial embedding recovery needed — clear rag_embeddings for failed doc so retry works
- Per-DOC timeout needed, not just per-phase — multiple large docs defeat a single phase timeout
- Ordering must be: strip → cap → split (strip first since it's cheap, then check size, then chunk)

---

## Work Objectives

### Core Objective
Prevent the embedding pipeline from hanging on abnormally large documents by capping content size, adding per-doc timeouts, recovering from partial embeddings, and reporting progress.

### Concrete Deliverables
- Modified `chunk_document()` in `brain/tutor_rag.py` with `MAX_CONTENT_CHARS` cap
- Modified `embed_rag_docs()` with per-doc timeout + partial-embed cleanup
- Modified `_launch_materials_sync_job()` in `brain/dashboard/api_tutor.py` with progress callback
- Cleaned up Doc 445 content + stuck sync job in database

### Definition of Done
- [x] `pytest brain/tests/` passes
- [x] Sync the same 5-file folder → all 5 docs embed successfully within 60s each
- [x] Doc 445 content is capped and embeds without hanging
- [x] Frontend polling shows per-doc progress during embedding phase
- [x] No partial-embed ghosts: killing a sync mid-embed allows clean retry

### Must Have
- Content cap before MarkdownHeaderTextSplitter (prevents regex hang)
- Per-doc timeout (not just phase timeout)
- Partial-embed cleanup on failure (delete rag_embeddings rows for failed doc)
- Logging when content is truncated
- Progress reporting during embedding phase

### Must NOT Have (Guardrails)
- Do NOT redesign the entire embedding pipeline
- Do NOT change the chunking strategy (chunk_size=1000, overlap=150)
- Do NOT modify the ChromaDB collection structure
- Do NOT add new dependencies
- Do NOT change the frontend polling mechanism (just add more data to the response)
- Do NOT touch the sync phase (file → rag_docs) — only the embedding phase
- Do NOT add excessive logging or comments (keep changes minimal)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (pytest brain/tests/, 56 tests)
- **Automated tests**: Tests-after (add targeted tests for new behavior)
- **Framework**: pytest

### QA Policy
Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend**: Use Bash (curl + python) — Send requests, assert status + response fields
- **Database**: Use Bash (sqlite3) — Query tables, verify state

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — independent changes):
├── Task 1: Content guard in chunk_document() [quick]
├── Task 2: Per-doc timeout + partial-embed cleanup in embed_rag_docs() [quick]

Wave 2 (After Wave 1 — depends on Task 2):
├── Task 3: Wire progress callback into sync job [quick]

Wave 3 (After Wave 2 — cleanup + verify):
├── Task 4: Clean up bad data + end-to-end verify [quick]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality + pytest [unspecified-high]
├── Task F3: End-to-end QA — re-sync folder [unspecified-high]
├── Task F4: Scope fidelity check [deep]

Critical Path: Task 1 → Task 2 → Task 3 → Task 4 → F1-F4
Parallel Speedup: Tasks 1 & 2 run concurrently
Max Concurrent: 2 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 4 |
| 2 | — | 3, 4 |
| 3 | 2 | 4 |
| 4 | 1, 2, 3 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: 2 tasks — T1 → `quick`, T2 → `quick`
- **Wave 2**: 1 task — T3 → `quick`
- **Wave 3**: 1 task — T4 → `quick`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Content Guard in `chunk_document()`

  **What to do**:
  - Add `MAX_CONTENT_CHARS = 500_000` constant near `SMALL_DOC_CHAR_LIMIT` (line 86 area)
  - In `chunk_document()`, AFTER `strip_image_refs_for_rag(content)` (line 108) and BEFORE `stripped = content.strip()` (line 111), add a size check:
    ```python
    if len(content) > MAX_CONTENT_CHARS:
        logger.warning(
            "Document content too large (%d chars), truncating to %d: %s",
            len(content), MAX_CONTENT_CHARS, source_path
        )
        content = content[:MAX_CONTENT_CHARS]
    ```
  - This ensures the `MarkdownHeaderTextSplitter` regex never sees 15M+ chars (which can hang/OOM)
  - The order is: strip image refs → cap size → strip whitespace → split. This is correct because `strip_image_refs_for_rag` is cheap (regex on image patterns) and should run first to give the cap the cleanest input possible
  - 500K chars ≈ ~125K tokens ≈ ~500 chunks at chunk_size=1000 — this is a reasonable upper bound

  **Must NOT do**:
  - Do NOT change `strip_image_refs_for_rag()` — it works fine for what it does
  - Do NOT change chunk_size or chunk_overlap
  - Do NOT add a new function — just add the guard inline

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, ~5 lines of code added, clear location
  - **Skills**: []
    - No special skills needed — straightforward Python edit
  - **Skills Evaluated but Omitted**:
    - `python-development`: Overkill for a 5-line guard clause

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 4
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `brain/tutor_rag.py:86-87` — Existing constants `SMALL_DOC_CHAR_LIMIT` and `MIN_CHUNK_CHARS` — follow this naming pattern for `MAX_CONTENT_CHARS`
  - `brain/tutor_rag.py:108-113` — Current flow: `strip_image_refs_for_rag(content)` → `stripped = content.strip()` → empty check. Insert the cap between lines 108 and 111
  - `brain/tutor_rag.py:38-46` — `strip_image_refs_for_rag()` function — this runs BEFORE the cap, don't modify it

  **API/Type References**:
  - `brain/tutor_rag.py:90-100` — `chunk_document()` signature — no changes needed to the signature

  **WHY Each Reference Matters**:
  - Line 86-87: Naming convention for constants (ALL_CAPS, with comment explaining the value)
  - Line 108-113: Exact insertion point — cap goes between strip and the strip()/empty check
  - Line 38-46: Confirms strip_image_refs runs first — don't duplicate or move it

  **Acceptance Criteria**:

  - [x] `MAX_CONTENT_CHARS` constant exists near line 86-88
  - [x] Guard clause exists between `strip_image_refs_for_rag` call and `stripped = content.strip()`
  - [x] Guard logs a warning when truncating (using `logger.warning`)
  - [x] `pytest brain/tests/` passes

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Normal document passes through unchanged
    Tool: Bash (python)
    Preconditions: Flask server running on port 5000
    Steps:
      1. python -c "from brain.tutor_rag import chunk_document; chunks = chunk_document('Hello world ' * 100, 'test.md'); print(f'chunks={len(chunks)}')"
      2. Assert output contains "chunks=1" (small doc, single chunk)
    Expected Result: Normal documents are unaffected by the cap
    Failure Indicators: Error on import, or chunk count is 0
    Evidence: .sisyphus/evidence/task-1-normal-doc.txt

  Scenario: Oversized document is truncated and still chunks
    Tool: Bash (python)
    Preconditions: MAX_CONTENT_CHARS is set to 500000
    Steps:
      1. python -c "from brain.tutor_rag import chunk_document, MAX_CONTENT_CHARS; big = 'x' * (MAX_CONTENT_CHARS + 100000); chunks = chunk_document(big, 'huge.md'); print(f'chunks={len(chunks)}, max_content={max(len(c.page_content) for c in chunks)}')"
      2. Assert chunks are produced (count > 0) and no single chunk exceeds chunk_size + overlap
    Expected Result: Document is truncated but still produces valid chunks
    Failure Indicators: Hang, OOM, or zero chunks
    Evidence: .sisyphus/evidence/task-1-oversized-doc.txt
  ```

  **Commit**: YES
  - Message: `fix(rag): cap document content before chunking to prevent hang`
  - Files: `brain/tutor_rag.py`
  - Pre-commit: `pytest brain/tests/ -x -q`

- [x] 2. Per-Doc Timeout + Partial-Embed Cleanup in `embed_rag_docs()`

  **What to do**:
  - Add a `progress_callback` parameter to `embed_rag_docs()` signature: `progress_callback: Optional[Callable[[int, int, str], None]] = None` (args: current_index, total_count, doc_source_path)
  - Add `DOC_EMBED_TIMEOUT_SEC = 120` constant near the top of the file
  - Wrap the per-doc embedding loop body (lines 294-330) in a `concurrent.futures.ThreadPoolExecutor` with `DOC_EMBED_TIMEOUT_SEC` timeout:
    ```python
    from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
    
    for idx, doc in enumerate(docs):
        if progress_callback:
            progress_callback(idx, len(docs), doc["source_path"] or "unknown")
        
        # ... existing skip check (lines 286-292) ...
        
        def _embed_single_doc(doc_row):
            # ... existing content/chunk/add logic (lines 294-330) ...
            return chunk_count
        
        try:
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_embed_single_doc, doc)
                chunk_count = future.result(timeout=DOC_EMBED_TIMEOUT_SEC)
                total_chunks += chunk_count
                embedded += 1
        except FuturesTimeout:
            logger.error("Embedding timed out after %ds for doc %d: %s",
                        DOC_EMBED_TIMEOUT_SEC, doc["id"], doc["source_path"])
            # Clean up partial embeddings for this doc
            cur.execute("DELETE FROM rag_embeddings WHERE rag_doc_id = ?", (doc["id"],))
            conn.commit()
            skipped += 1
        except Exception as e:
            logger.error("Embedding failed for doc %d: %s", doc["id"], str(e))
            cur.execute("DELETE FROM rag_embeddings WHERE rag_doc_id = ?", (doc["id"],))
            conn.commit()
            skipped += 1
    ```
  - CRITICAL: On ANY failure (timeout or exception), DELETE all `rag_embeddings` rows for that doc so retry works. Without this, the `COUNT(*) > 0` check at lines 286-290 would permanently skip a partially-embedded doc.
  - Return dict should include `timed_out` count: `{embedded, skipped, total_chunks, timed_out}`

  **Must NOT do**:
  - Do NOT change the ChromaDB add/batch logic in `_add_documents_batched()`
  - Do NOT add async/await — keep it synchronous with thread-based timeout
  - Do NOT change the `chunk_document()` call — Task 1 handles content guard

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, focused changes to one function, well-defined pattern
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `python-development`: Single function modification, not needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3, Task 4
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `brain/tutor_rag.py:246-330` — Current `embed_rag_docs()` function — the full function to modify
  - `brain/tutor_rag.py:286-292` — The `COUNT(*) > 0` skip check — this is the partial-embed bug. When a doc times out mid-embed, some rag_embeddings rows exist, so the doc is permanently skipped on retry
  - `brain/tutor_rag.py:302-309` — The `chunk_document()` call + `_add_documents_batched()` — this is the per-doc work to wrap in timeout
  - `brain/tutor_rag.py:319-330` — The rag_embeddings INSERT after successful embedding — this runs inside the timeout

  **API/Type References**:
  - `brain/tutor_rag.py:250` — Return type `dict` — extend to include `timed_out` key
  - Python stdlib: `concurrent.futures.ThreadPoolExecutor` — use `future.result(timeout=N)` pattern

  **WHY Each Reference Matters**:
  - Lines 246-330: The entire function being modified — understand current flow before changing
  - Lines 286-292: The partial-embed bug — DELETE must happen on timeout to fix this
  - Lines 302-309: The expensive work (chunk + embed) — this goes inside the thread
  - Lines 319-330: rag_embeddings INSERT — also inside the thread (part of the atomic unit)

  **Acceptance Criteria**:

  - [x] `embed_rag_docs()` accepts `progress_callback` parameter
  - [x] `DOC_EMBED_TIMEOUT_SEC` constant exists
  - [x] Per-doc timeout wraps the chunk+embed logic
  - [x] On timeout/error: rag_embeddings rows for that doc are DELETED
  - [x] Return dict includes `timed_out` count
  - [x] `pytest brain/tests/` passes

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Partial-embed cleanup on failure
    Tool: Bash (sqlite3 + python)
    Preconditions: Database accessible at brain/data/pt_study.db
    Steps:
      1. sqlite3 brain/data/pt_study.db "SELECT COUNT(*) FROM rag_embeddings WHERE rag_doc_id = 445"
      2. Assert count is 0 (no ghost embeddings from previous failed runs)
      3. If count > 0: sqlite3 brain/data/pt_study.db "DELETE FROM rag_embeddings WHERE rag_doc_id = 445"
      4. Verify the skip check would now allow re-embedding: count should be 0
    Expected Result: No partial embeddings exist for Doc 445
    Failure Indicators: Count > 0 after cleanup
    Evidence: .sisyphus/evidence/task-2-partial-cleanup.txt

  Scenario: Progress callback is invoked
    Tool: Bash (python)
    Preconditions: At least 1 un-embedded doc in rag_docs
    Steps:
      1. python -c "
         from brain.tutor_rag import embed_rag_docs
         progress = []
         def cb(idx, total, path): progress.append((idx, total, path))
         result = embed_rag_docs(progress_callback=cb)
         print(f'result={result}, progress_calls={len(progress)}')
         if progress: print(f'first={progress[0]}, last={progress[-1]}')
         "
      2. Assert progress_calls > 0
      3. Assert result dict contains 'timed_out' key
    Expected Result: Progress callback fired for each doc, result includes timed_out
    Failure Indicators: progress_calls=0 or KeyError on 'timed_out'
    Evidence: .sisyphus/evidence/task-2-progress-callback.txt
  ```

  **Commit**: YES
  - Message: `fix(rag): add per-doc timeout and partial-embed cleanup`
  - Files: `brain/tutor_rag.py`
  - Pre-commit: `pytest brain/tests/ -x -q`

---

- [x] 3. Wire Progress Callback into Sync Job

  **What to do**:
  - In `_launch_materials_sync_job()` in `brain/dashboard/api_tutor.py`, find where `embed_rag_docs()` is called during the sync job
  - Create a progress callback that updates the sync job state with per-doc embedding progress:
    ```python
    def _embedding_progress(current_idx, total_count, doc_path):
        sync_jobs[job_id]["embedding_progress"] = {
            "current": current_idx + 1,
            "total": total_count,
            "current_file": os.path.basename(doc_path)
        }
    ```
  - Pass this callback to `embed_rag_docs(progress_callback=_embedding_progress)`
  - In the sync status endpoint (`get_materials_sync_status()`), include `embedding_progress` in the response if it exists in the job state
  - Add an overall embedding phase timeout as a safety net (e.g., 10 minutes): if `embed_rag_docs()` takes longer than this, mark the job as failed

  **Must NOT do**:
  - Do NOT change the frontend polling mechanism or interval (1.5s)
  - Do NOT change the sync phase (file → rag_docs)
  - Do NOT add new API endpoints — just enrich existing status response

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, adding a callback and enriching a response dict
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `backend-development`: Simple callback wiring, not API design

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Wave 1)
  - **Blocks**: Task 4
  - **Blocked By**: Task 2 (needs progress_callback parameter)

  **References**:

  **Pattern References**:
  - `brain/dashboard/api_tutor.py:2599+` — `_launch_materials_sync_job()` function — find the `embed_rag_docs()` call site
  - `brain/dashboard/api_tutor.py:6435+` — `get_materials_sync_status()` — the status endpoint that frontend polls. Add `embedding_progress` to its response
  - `dashboard_rebuild/client/src/pages/library.tsx:602+` — Frontend polling code — READ ONLY, do not modify. Understand what fields it reads from the status response so we add compatible fields

  **API/Type References**:
  - `brain/tutor_rag.py:246` — `embed_rag_docs()` signature — now accepts `progress_callback` (from Task 2)

  **WHY Each Reference Matters**:
  - Line 2599+: Where to wire the callback — find the embed_rag_docs call and add the callback
  - Line 6435+: Where to expose progress — add embedding_progress to the status dict
  - Library.tsx:602+: Don't break the frontend — verify the status response shape is compatible

  **Acceptance Criteria**:

  - [x] `embed_rag_docs()` is called with a `progress_callback` in the sync job
  - [x] Sync status response includes `embedding_progress` dict during embedding phase
  - [x] Overall embedding phase has a safety timeout (10 min)
  - [x] `pytest brain/tests/` passes

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Sync status shows embedding progress
    Tool: Bash (curl)
    Preconditions: Flask server running, a sync job is active or recently completed
    Steps:
      1. curl -s http://127.0.0.1:5000/api/materials/sync/status | python -m json.tool
      2. Check response JSON for "embedding_progress" key
      3. If a job ran, embedding_progress should have "current", "total", "current_file"
    Expected Result: Status endpoint returns embedding progress data
    Failure Indicators: No embedding_progress key, or missing sub-fields
    Evidence: .sisyphus/evidence/task-3-sync-status.txt

  Scenario: Sync job fails gracefully on overall timeout
    Tool: Bash (curl)
    Preconditions: Flask server running
    Steps:
      1. Verify the sync job handler has a timeout mechanism (code review)
      2. Check that job status is set to "failed" with an error message if timeout triggers
    Expected Result: Overall timeout exists and sets job to failed state
    Failure Indicators: No timeout mechanism, or job stays "running" forever
    Evidence: .sisyphus/evidence/task-3-timeout-guard.txt
  ```

  **Commit**: YES
  - Message: `fix(sync): wire embedding progress into sync job status`
  - Files: `brain/dashboard/api_tutor.py`
  - Pre-commit: `pytest brain/tests/ -x -q`

- [x] 4. Clean Up Bad Data + End-to-End Verify

  **What to do**:
  - **Kill the stuck sync job**: Update job `ede0c624...` status to `failed` (or delete it from the in-memory `sync_jobs` dict by restarting Flask — which happens naturally with the code changes)
  - **Clean Doc 445 content**: Either:
    - (a) Re-extract: delete Doc 445 from rag_docs and let re-sync extract it with the new cap, OR
    - (b) Truncate in-place: `UPDATE rag_docs SET content = SUBSTR(content, 1, 500000) WHERE id = 445`
    - Option (a) is preferred — cleaner, and the next sync will re-extract with Docling
  - **Clear any partial embeddings**: `DELETE FROM rag_embeddings WHERE rag_doc_id IN (441, 442, 443, 444, 445)`
  - **Re-sync the folder**: Use the Library page or `curl POST /api/materials/sync/start` with the same folder path to re-trigger sync
  - **Verify all 5 docs embed**: Poll status until complete, check all 5 docs have rag_embeddings rows
  - **Restart Flask**: `Start_Dashboard.bat` or `python brain/dashboard_web.py` to pick up code changes

  **Must NOT do**:
  - Do NOT modify any Python files — this task is purely data cleanup + verification
  - Do NOT delete docs other than Doc 445 (the other 4 are fine, just need embedding)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Database operations + curl verification, no code changes
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `database-design`: Not designing schema, just running cleanup queries

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after all code changes)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1, Task 2, Task 3

  **References**:

  **Pattern References**:
  - `brain/data/pt_study.db` — SQLite database to clean up
  - `brain/dashboard/api_tutor.py:6415+` — `sync_materials_folder()` endpoint — the POST endpoint to trigger re-sync

  **Database References**:
  - `rag_docs` table: `id=445` is the bloated doc. Other docs: 441, 442, 443, 444
  - `rag_embeddings` table: Should be empty for all 5 docs (0 embedded currently)
  - Stuck sync job ID: `ede0c6242c9a46018340258d5f08eae7`
  - Folder path: `C:\Users\treyt\OneDrive\Desktop\PT School\Therapeutic Interventions\Module 3 Primary Mobilty Impairments Swelling and edema, flexibility joint and soft tissue mobilty\Joint Mobility`

  **WHY Each Reference Matters**:
  - pt_study.db: Direct database operations to clean up bad state
  - sync_materials_folder: Trigger re-sync to verify the fix works end-to-end

  **Acceptance Criteria**:

  - [x] Doc 445 content length < 500,000 chars (either re-extracted or truncated)
  - [x] All 5 docs have rag_embeddings rows (COUNT > 0 for each)
  - [x] No stuck sync jobs (all jobs completed or failed, none running)
  - [x] `pytest brain/tests/` passes after all changes

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: All 5 docs embed successfully after cleanup
    Tool: Bash (sqlite3 + curl)
    Preconditions: Code changes from Tasks 1-3 applied, Flask restarted
    Steps:
      1. sqlite3 brain/data/pt_study.db "DELETE FROM rag_embeddings WHERE rag_doc_id IN (441,442,443,444,445)"
      2. sqlite3 brain/data/pt_study.db "DELETE FROM rag_docs WHERE id = 445"
      3. curl -X POST http://127.0.0.1:5000/api/materials/sync/start -H "Content-Type: application/json" -d '{"folder_path": "C:\\Users\\treyt\\OneDrive\\Desktop\\PT School\\Therapeutic Interventions\\Module 3 Primary Mobilty Impairments Swelling and edema, flexibility joint and soft tissue mobilty\\Joint Mobility"}'
      4. Poll: curl -s http://127.0.0.1:5000/api/materials/sync/status | python -m json.tool (repeat every 5s until status != "running")
      5. sqlite3 brain/data/pt_study.db "SELECT rd.id, rd.source_path, length(rd.content), (SELECT COUNT(*) FROM rag_embeddings re WHERE re.rag_doc_id = rd.id) as embed_count FROM rag_docs rd WHERE rd.id >= 441 ORDER BY rd.id"
      6. Assert all 5 rows have embed_count > 0
      7. Assert Doc 445 (or re-extracted equivalent) has content length < 500000
    Expected Result: All 5 documents sync and embed completely
    Failure Indicators: Any doc with embed_count=0, or sync job stuck in "running"
    Evidence: .sisyphus/evidence/task-4-full-sync.txt

  Scenario: Doc 445 content is capped
    Tool: Bash (sqlite3)
    Preconditions: Sync completed
    Steps:
      1. sqlite3 brain/data/pt_study.db "SELECT id, length(content) FROM rag_docs WHERE source_path LIKE '%spine mobilization%'"
      2. Assert length < 500000
    Expected Result: Bloated doc content is within bounds
    Failure Indicators: length > 500000
    Evidence: .sisyphus/evidence/task-4-doc445-capped.txt
  ```

  **Commit**: NO (database operations only, no code files changed)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `pytest brain/tests/`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **End-to-End QA** — `unspecified-high`
  Start fresh: delete rag_embeddings for the 5 test docs. Re-run sync via `POST /api/materials/sync/start`. Poll status. Verify all 5 docs embed. Check Doc 445 is capped and embeds. Check progress updates appear in status response.
  Output: `Scenarios [N/N pass] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance.
  Output: `Tasks [N/N compliant] | VERDICT`

---

## Commit Strategy

| Task | Commit Message | Files |
|------|---------------|-------|
| 1 | `fix(rag): cap document content before chunking to prevent hang` | `brain/tutor_rag.py` |
| 2 | `fix(rag): add per-doc timeout and partial-embed cleanup` | `brain/tutor_rag.py` |
| 3 | `fix(sync): wire embedding progress into sync job status` | `brain/dashboard/api_tutor.py` |
| 4 | `fix(data): clean up bloated Doc 445 and stuck sync job` | DB operations (no file commit) |

---

## Success Criteria

### Verification Commands
```bash
pytest brain/tests/  # Expected: all pass, 0 failures
curl -s http://127.0.0.1:5000/api/materials/sync/status | python -m json.tool  # Expected: status shows progress or completed
sqlite3 brain/data/pt_study.db "SELECT id, length(content) FROM rag_docs WHERE id=445"  # Expected: content length < 500000
sqlite3 brain/data/pt_study.db "SELECT COUNT(*) FROM rag_embeddings WHERE rag_doc_id=445"  # Expected: > 0 (doc was embedded)
```

### Final Checklist
- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] All tests pass
- [x] 5-file folder syncs and embeds completely
- [x] Doc 445 embeds without hanging

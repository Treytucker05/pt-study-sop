# WRAP Ingestion Execution Plan

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries, Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.

This plan must be maintained in accordance with `C:/pt-study-sop/.agent/PLANS.md`.

## Purpose / Big Picture

After a study session, a user can paste the Tutor's WRAP output directly into Brain Chat and immediately see structured results: Obsidian notes are merged safely, Anki drafts are created, tutor issues are logged for Scholar, and session metrics are stored in the Brain database. The user can verify the behavior by posting WRAP text to `/api/brain/chat` and observing new DB rows, an Obsidian managed block, and UI summary counts.

## Progress

- [x] (2026-01-24 00:00Z) Drafted ExecPlan from WRAP ingestion milestones and repo contracts.
- [x] (2026-01-24 00:00Z) Add `tutor_issues` table to `brain/db_setup.py` and verify schema creation on startup.
- [x] (2026-01-24 00:00Z) Implement `brain/wrap_parser.py` with tests for sections and JSON extraction.
- [x] (2026-01-24 00:00Z) Implement `brain/obsidian_merge.py` with managed-block merge, LLM dedupe, and link detection.
- [x] (2026-01-24 00:00Z) Wire WRAP flow into `brain/dashboard/api_adapter.py` and add tutor issue endpoints.
- [x] (2026-01-24 00:00Z) Update `dashboard_rebuild/client/src/pages/brain.tsx` for WRAP UI summary and add README in pages folder.
- [x] (2026-01-24 01:10Z) Run tests and record results.
- [x] (2026-01-24 01:10Z) Append entry to `C:/pt-study-sop/CONTINUITY.md`.

## Surprises & Discoveries

- Observation: Frontend build warns about large chunks (>500 kB) after minification.
  Evidence: `npm run build` warning about chunk size limit during Vite build.

## Decision Log

- Decision: Use DeepSeek V3 via OpenRouter for concept linking, tutor issue classification, semantic merge conflict resolution, and malformed WRAP fallback parsing, with deterministic fallbacks on failure.
  Rationale: Matches user requirement and keeps ingestion resilient when LLM is unavailable.
  Date/Author: 2026-01-24 / Codex
- Decision: Keep Obsidian edits inside managed blocks (`<!-- BRAIN_MANAGED_START -->` / `<!-- BRAIN_MANAGED_END -->`) and treat outside content as immutable.
  Rationale: Aligns with `docs/contracts/obsidian_write_semantics.md` and prevents accidental user content edits.
  Date/Author: 2026-01-24 / Codex

## Outcomes & Retrospective

- WRAP ingestion is now integrated into Brain Chat with parser, Obsidian merge, tutor issue logging, and UI summary.
- Tests passed (`python -m pytest brain/tests`, `python scripts/release_check.py`), and frontend build succeeded with a chunk size warning only.

## Context and Orientation

The Brain backend is a Flask API in `brain/dashboard/api_adapter.py`. It writes session records into `brain/data/pt_study.db` using helpers in `brain/ingest_session.py` and `brain/db_setup.py`. Obsidian writes use the Obsidian Local REST API and helper functions in `brain/dashboard/api_adapter.py`. Anki card drafts are stored in the `card_drafts` table and surfaced via `/api/anki/*`. The WRAP contract files live in `docs/contracts/` (`wrap_schema.md`, `obsidian_write_semantics.md`, `card_draft_schema.md`, `ids.md`, `metrics_issues.md`). The Brain UI is a React page in `dashboard_rebuild/client/src/pages/brain.tsx`, with API calls in `dashboard_rebuild/client/src/api.ts`.

Definitions used in this plan:
- WRAP: The end-of-session output from Tutor containing structured notes, Anki cards, spaced-retrieval schedule, and JSON logs.
- Managed block: The Obsidian content region between `<!-- BRAIN_MANAGED_START -->` and `<!-- BRAIN_MANAGED_END -->` that Brain is allowed to overwrite.
- Tutor issue: A problem attributable to the Tutor output (hallucination, formatting issue, incorrect fact, unprompted artifact), stored in the new `tutor_issues` table.

## Plan of Work

First, extend the database schema by adding a `tutor_issues` table in `brain/db_setup.py` using the existing `CREATE TABLE IF NOT EXISTS` pattern and any needed indexes. Next, create `brain/wrap_parser.py` to extract WRAP sections A–D from raw text, parse Anki cards from Section B, parse spaced review dates from Section C, and reuse `brain/ingest_session.py` JSON parsing helpers for Section D. Add tests in `brain/tests/test_wrap_parser.py` for section detection, card parsing, and JSON extraction.

Then create `brain/obsidian_merge.py` to merge Section A notes into Obsidian using managed blocks. The merge must be idempotent by `session_id`, and semantic dedupe is handled by a DeepSeek V3 call that proposes content additions and resolves conflicts. Concept linking is another DeepSeek V3 call that returns terms to bracket as `[[Term]]`. If any LLM call fails, the merge must fall back to deterministic append within the managed block.

After that, update `brain/dashboard/api_adapter.py` to detect WRAP content in `/api/brain/chat` and route it to the new parser and merge logic. The handler should: parse WRAP, merge notes to Obsidian, insert Anki drafts, insert tutor issues, store session metrics using existing `insert_session`, and return a structured response with counts and links. Also add the Tutor Issues API endpoints: GET list with filters, POST create, PATCH update/resolve, and GET stats aggregation.

Finally, update the Brain UI in `dashboard_rebuild/client/src/pages/brain.tsx` to add a “Paste WRAP” affordance (clipboard read) and a summary panel that shows cards created, notes merged, and issues logged with links to Anki drafts and Obsidian. Because this folder lacks a README, create `dashboard_rebuild/client/src/pages/README.md` describing its purpose. After coding, run the backend tests (`python -m pytest brain/tests`) and the release check (`python scripts/release_check.py`). Build the frontend (`npm run build` in `dashboard_rebuild`) if available. Record outcomes and add a new entry to `C:/pt-study-sop/CONTINUITY.md`.

## Concrete Steps

1. From `C:/pt-study-sop`, edit `brain/db_setup.py` to add `tutor_issues` table creation and indexes. Re-run `init_database()` by starting the backend or running `python brain/db_setup.py` to ensure the table exists.
2. Create `brain/wrap_parser.py` implementing `parse_wrap`, `extract_obsidian_notes`, `extract_anki_cards`, `extract_spaced_schedule`, `extract_json_logs`, and `extract_tutor_issues`. Include helper functions for section splitting and WRAP detection.
3. Add `brain/tests/test_wrap_parser.py` with tests for section detection, card parsing, and JSON block parsing. Use fixtures or inline WRAP text blocks.
4. Create `brain/obsidian_merge.py` with managed-block merge, semantic dedupe, and concept linking. Use `llm_provider.call_llm` with OpenRouter + DeepSeek V3 and fall back to deterministic merge when LLM fails.
5. Update `brain/dashboard/api_adapter.py` to import new modules, detect WRAP, run the WRAP flow, insert tutor issues, and return structured WRAP response fields. Add Tutor Issues endpoints.
6. Update `dashboard_rebuild/client/src/api.ts` to extend the `/brain/chat` response shape with WRAP summary fields if needed.
7. Update `dashboard_rebuild/client/src/pages/brain.tsx` to add a “Paste WRAP” button (clipboard read), show WRAP summary after ingestion, and keep existing chat behavior. Create `dashboard_rebuild/client/src/pages/README.md`.
8. Run tests and capture results. Append a continuity log entry.

## Validation and Acceptance

Acceptance is satisfied when:
- Posting a full WRAP into `/api/brain/chat` results in:
  - A session row inserted (or updated) in `sessions` with `tracker_json` and `enhanced_json` populated.
  - One or more `card_drafts` rows created from Section B.
  - `tutor_issues` rows inserted with `issue_type` and `severity`.
  - Obsidian note updated inside a managed block and idempotent for the same `session_id`.
- The API response includes WRAP summary counts and optional links.
- The Brain UI shows “processing” state and displays WRAP summary with links.
- `python -m pytest brain/tests` passes and `python scripts/release_check.py` passes.

## Idempotence and Recovery

The WRAP merge must be safe to run multiple times for the same `session_id`. If an Obsidian managed block already exists, the merge should replace only that block. If LLM calls fail, fall back to deterministic append within the managed block and still complete ingestion. If any step fails after session insert, return a WRAP response that clearly indicates which sub-steps succeeded or failed.

## Artifacts and Notes

Expected DB schema addition:

    CREATE TABLE IF NOT EXISTS tutor_issues (
        id INTEGER PRIMARY KEY,
        session_id TEXT,
        issue_type TEXT,
        description TEXT,
        severity TEXT,
        resolved INTEGER DEFAULT 0,
        created_at TEXT
    );

Managed block pattern:

    <!-- BRAIN_MANAGED_START -->
    ## WRAP Highlights (session_id: ...)
    ...
    <!-- BRAIN_MANAGED_END -->

## Interfaces and Dependencies

- `brain/llm_provider.call_llm(system_prompt, user_prompt, provider="openrouter", model="deepseek/deepseek-v3")` is used for WRAP semantic merge, concept linking, tutor issue classification, and fallback parsing.
- `brain/ingest_session._parse_json_payloads` and `_map_json_payload_to_session` are used to convert Section D JSON into session fields.
- Obsidian Local REST API is invoked via existing helper functions in `brain/dashboard/api_adapter.py`.
- Frontend uses `api.brain.chat` in `dashboard_rebuild/client/src/api.ts` and Brain page is `dashboard_rebuild/client/src/pages/brain.tsx`.

Note: This plan must be updated as work proceeds, including Progress timestamps, Decision Log entries, and Outcomes & Retrospective.

Plan update note (2026-01-24 01:10Z): Marked milestones complete, recorded test/build outcomes, and noted the Vite chunk-size warning in Surprises & Discoveries.

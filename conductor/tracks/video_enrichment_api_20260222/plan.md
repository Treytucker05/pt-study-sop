# Implementation Plan: Video Enrichment API (Selective)

**Track ID:** video_enrichment_api_20260222
**Spec:** [spec.md](./spec.md)
**Created:** 2026-02-22
**Status:** [x] Complete

## Phase 1: Service contracts + configuration

- [x] Task 1.1: Add `brain/video_enrich_api.py` service interface (flagging, budget, cache, orchestrator)
- [x] Task 1.2: Add config file `brain/config/video_enrichment.json` (mode, budgets, model costs, flagging thresholds)
- [x] Task 1.3: Define flagging criteria (avg_logprob < -0.7, no_speech_prob > 0.5)

## Phase 2: Provider adapter implementation

- [x] Task 2.1: Add `brain/video_enrich_providers/gemini_provider.py` (File API upload + poll + timestamp queries)
- [x] Task 2.2: Implement segment-level enrichment via timestamp range queries (no video slicing)
- [x] Task 2.3: Add structured output markdown renderer (`<slug>_enrichment.md`)

## Phase 3: Ingest + caching + usage tracking

- [x] Task 3.1: Enrichment markdown emitted for RAG bridge ingestion
- [x] Task 3.2: Add cache key `(video_hash, start_sec-end_sec, prompt_version)` to prevent rebilling
- [x] Task 3.3: Add `video_api_usage` table migration in `brain/db_setup.py` (schema v9.5)
- [x] Task 3.4: Enforce monthly/per-video caps with local-only fallback

## Phase 4: Test + verification

- [x] Task 4.1: Add `brain/tests/test_video_enrich_api.py` (11 tests)
- [x] Task 4.2: Add cap enforcement tests (monthly + per-video)
- [x] Task 4.3: Verify with `python -m pytest brain/tests/` — 689 passed

## Commits

- `38a8aed9` feat(video): add Gemini enrichment API with budget caps and caching

## Notes

- Enrichment mode defaults to "off" — must be set to "auto" or "manual" with GEMINI_API_KEY to activate.
- Flash model recommended for enrichment (~$0.10/hr lecture). Pro only for complex visual reasoning.
- Free tier: 500 RPD Flash, 100 RPD Pro.

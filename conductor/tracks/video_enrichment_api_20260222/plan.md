# Implementation Plan: Video Enrichment API (Selective)

**Track ID:** video_enrichment_api_20260222  
**Spec:** [spec.md](./spec.md)  
**Created:** 2026-02-22  
**Status:** [ ] Planned

## Phase 1: Service contracts + configuration

- [ ] Task 1.1: Add `brain/video_enrich_api.py` service interface
- [ ] Task 1.2: Add config file `brain/config/video_enrichment.json`
- [ ] Task 1.3: Define flagging criteria input contract (low confidence, OCR density, visual complexity)

## Phase 2: Provider adapter implementation

- [ ] Task 2.1: Add `brain/video_enrich_providers/gemini_provider.py`
- [ ] Task 2.2: Implement segment-level request/response schema
- [ ] Task 2.3: Add structured output markdown renderer (`<slug>_enrichment.md`)

## Phase 3: Ingest + caching + usage tracking

- [ ] Task 3.1: Ingest enrichment markdown through existing RAG ingest path
- [ ] Task 3.2: Add cache key `(video_checksum, segment_id, prompt_version)` to skip rebilling
- [ ] Task 3.3: Add `video_api_usage` ledger migration in `brain/db_setup.py`
- [ ] Task 3.4: Enforce monthly/per-video caps with local fallback

## Phase 4: Test + verification

- [ ] Task 4.1: Add `brain/tests/test_video_enrich_api.py`
- [ ] Task 4.2: Add cap enforcement tests
- [ ] Task 4.3: Verify with `python -m pytest brain/tests/`

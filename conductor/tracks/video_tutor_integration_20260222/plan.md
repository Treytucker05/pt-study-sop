# Implementation Plan: Video Tutor Integration

**Track ID:** video_tutor_integration_20260222
**Spec:** [spec.md](./spec.md)
**Created:** 2026-02-22
**Status:** [x] Complete

## Phase 1: Backend process/status APIs

- [x] Task 1.1: Add `POST /api/tutor/materials/video/process` in `brain/dashboard/api_tutor.py`
- [x] Task 1.2: Add `GET /api/tutor/materials/video/status/<job_id>`
- [x] Task 1.3: Add `POST /api/tutor/materials/video/enrich` (API enrichment trigger)
- [x] Task 1.4: Reuse existing sync-job state patterns for consistency

## Phase 2: Frontend MP4 workflow

- [x] Task 2.1: Add `.mp4` to accepted upload extensions in MaterialSelector + MaterialUploader
- [x] Task 2.2: Add MP4 file-type badge/icon mapping
- [x] Task 2.3: Add "Process Video" and status polling UI

## Phase 3: Retrieval + citation tuning

- [x] Task 3.1: Add `is_video_query()` heuristic in `brain/tutor_rag.py` (keywords + time patterns)
- [x] Task 3.2: Add `boost_video_chunks()` to prioritize transcript/visual_notes chunks
- [x] Task 3.3: Add `format_video_citations()` + `extract_timestamps_from_chunk()` in `brain/tutor_streaming.py`

## Phase 4: Test + verification

- [x] Task 4.1: Add backend tests for video endpoints (`test_video_process_api.py`)
- [x] Task 4.2: Add frontend tests for MP4 acceptance (`MaterialUploader.test.tsx`)
- [x] Task 4.3: Verify with `python -m pytest brain/tests/` — 689 passed
- [x] Task 4.4: Verify with `cd dashboard_rebuild && npm run build` — clean

## Commits

- `4c69bfed` feat(tutor): implement mp4 video ingest processing workflow
- `48ff031c` feat(video): add retrieval tuning, timestamp citations, and frontend MP4 tests

# Implementation Plan: Video Tutor Integration

**Track ID:** video_tutor_integration_20260222  
**Spec:** [spec.md](./spec.md)  
**Created:** 2026-02-22  
**Status:** [ ] Planned

## Phase 1: Backend process/status APIs

- [ ] Task 1.1: Add `POST /api/tutor/materials/video/process` in `brain/dashboard/api_tutor.py`
- [ ] Task 1.2: Add `GET /api/tutor/materials/video/status/<job_id>`
- [ ] Task 1.3: Add `POST /api/tutor/materials/video/enrich` (optional API enrichment trigger)
- [ ] Task 1.4: Reuse existing sync-job state patterns for consistency

## Phase 2: Frontend MP4 workflow

- [ ] Task 2.1: Add `.mp4` to accepted upload extensions in:
  - `dashboard_rebuild/client/src/components/MaterialSelector.tsx`
  - `dashboard_rebuild/client/src/components/MaterialUploader.tsx`
- [ ] Task 2.2: Add MP4 file-type badge/icon mapping
- [ ] Task 2.3: Add “Process Video” and status polling UI

## Phase 3: Retrieval + citation tuning

- [ ] Task 3.1: Add video-query signal heuristics in `brain/tutor_rag.py`
- [ ] Task 3.2: Prioritize transcript/enrichment chunks for video queries
- [ ] Task 3.3: Include `[hh:mm:ss]` timestamp details in citation metadata formatting

## Phase 4: Test + verification

- [ ] Task 4.1: Add backend tests for new video endpoints
- [ ] Task 4.2: Update frontend tests for mp4 acceptance + process action
- [ ] Task 4.3: Verify with `python -m pytest brain/tests/`
- [ ] Task 4.4: Verify with `cd dashboard_rebuild && npm run build`

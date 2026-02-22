# Specification: Video Tutor Integration

**Track ID:** video_tutor_integration_20260222  
**Type:** Feature  
**Created:** 2026-02-22  
**Status:** Draft

## Summary

Integrate video processing into Tutor backend/frontend so MP4 materials can be processed, tracked, and queried with timestamp-aware citations.

## Context

Core retrieval and materials endpoints exist today. This track adds job endpoints, MP4 UI support, and retrieval behavior tuning for video-heavy questions.

## User Story

As a student, I want to upload/select lecture videos and have the tutor answer questions with accurate timestamps and context from processed video notes.

## Acceptance Criteria

- [ ] Backend exposes process/status endpoints for video jobs
- [ ] UI supports MP4 upload/selection and processing actions
- [ ] Retrieval can prioritize video transcript/enrichment chunks when relevant
- [ ] Tutor responses can include timestamp metadata in citations
- [ ] Existing tutor chain behavior remains stable

## Dependencies

- `video_ingest_local_20260222`
- `video_enrichment_api_20260222` (optional for enrichment actions)
- Existing tutor APIs in `brain/dashboard/api_tutor.py`
- Existing materials UI components

## Out of Scope

- Replacing existing tutor chat UX
- Building a custom video player
- Multi-user permissions model

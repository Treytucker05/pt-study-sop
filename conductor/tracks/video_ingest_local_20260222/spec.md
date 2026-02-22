# Specification: Video Ingest Local Pipeline

**Track ID:** video_ingest_local_20260222  
**Type:** Feature  
**Created:** 2026-02-22  
**Status:** Draft

## Summary

Implement a fully local (free) MP4 processing pipeline that generates timestamped transcript and visual-note artifacts, then ingests those artifacts into Tutor RAG for study retrieval.

## Context

Current tutor material upload supports text-centric formats through `text_extractor.py`, while folder sync already allows `.mp4` as binary metadata entries. This track adds the missing local extraction layer.

## User Story

As a student, I want to process lecture videos locally so the tutor can answer questions using timestamped transcript and visual context without API dependency.

## Acceptance Criteria

- [ ] Local CLI processes MP4 into transcript + visual artifacts
- [ ] Transcript output includes stable timestamps per segment
- [ ] Visual notes include keyframe/OCR associations per timestamp
- [ ] Generated markdown artifacts ingest into `rag_docs` and embed to `rag_embeddings`
- [ ] Tutor can answer questions with citations that include video timestamp context
- [ ] Full tests and build remain green

## Dependencies

- `brain/tutor_rag.py` (embedding pipeline)
- `brain/rag_notes.py` (ingest API)
- `brain/dashboard/api_tutor.py` (materials sync/upload)
- SQLite `brain/data/pt_study.db`

## Out of Scope

- Cloud visual reasoning API calls
- UI workflow for enrichment requests
- Cost/budget control logic

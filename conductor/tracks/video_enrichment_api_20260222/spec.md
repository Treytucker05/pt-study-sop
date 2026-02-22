# Specification: Video Enrichment API (Selective)

**Track ID:** video_enrichment_api_20260222  
**Type:** Feature  
**Created:** 2026-02-22  
**Status:** Draft

## Summary

Add optional, selective API-based visual enrichment for difficult video segments and merge enriched outputs back into Tutor RAG.

## Context

Local ingestion provides baseline transcript + OCR. API enrichment is needed only for high-value visual reasoning segments (diagrams, movement analysis, ambiguous OCR).

## User Story

As a student, I want API-quality visual explanations only where local processing is weak, so I improve understanding without paying for full-video cloud analysis.

## Acceptance Criteria

- [ ] Enrichment requests operate on flagged segments only
- [ ] Enriched markdown is generated with timestamps and source linkage
- [ ] Enrichment docs ingest into RAG and are retrievable
- [ ] Local-only mode works when provider key is absent
- [ ] Budget limits can block API calls safely

## Dependencies

- `video_ingest_local_20260222` outputs (segment ids + timestamps)
- `brain/rag_notes.py` ingest path
- `brain/tutor_rag.py` embedding path
- Provider credentials (Gemini or equivalent)

## Out of Scope

- Replacing local ingestion
- Auto-enrichment of all segments
- UI redesign beyond necessary controls

# Implementation Plan: Video Ingest Local Pipeline

**Track ID:** video_ingest_local_20260222  
**Spec:** [spec.md](./spec.md)  
**Created:** 2026-02-22  
**Status:** [~] In Progress

## Phase 1: Local extraction service

- [x] Task 1.1: Add `brain/video_ingest_local.py` with ffmpeg audio extraction
- [x] Task 1.2: Add faster-whisper transcription with segment timestamps
- [ ] Task 1.3: Add keyframe extraction (scene-based with fixed-interval fallback)
- [x] Task 1.4: Add OCR pass over keyframes (configurable backend)

## Phase 2: Artifact generation

- [x] Task 2.1: Emit `transcript.json`, `segments.json`, `ocr.json` under `brain/data/video_ingest/<slug>/`
- [x] Task 2.2: Emit `<slug>_transcript.md` with `[hh:mm:ss]` timestamp anchors
- [x] Task 2.3: Emit `<slug>_visual_notes.md` with timestamped frame/OCR summaries

## Phase 3: RAG ingest bridge

- [x] Task 3.1: Add `brain/video_ingest_bridge.py` to ingest generated markdown via `rag_notes`
- [x] Task 3.2: Trigger `embed_rag_docs(corpus='materials')` after ingest
- [ ] Task 3.3: Persist source mp4 linkage in `metadata_json`

## Phase 4: Test + verification

- [x] Task 4.1: Add `brain/tests/test_video_ingest_local.py`
- [x] Task 4.2: Add `brain/tests/test_video_ingest_bridge.py`
- [x] Task 4.3: Verify with `python -m pytest brain/tests/`
- [x] Task 4.4: Verify frontend unaffected with `cd dashboard_rebuild && npm run build`

## Notes

- Current keyframe extraction is fixed-interval (`fps=1/N`). Scene-based extraction fallback is still open.
- Metadata linkage back to the source MP4 in `metadata_json` is still open.

# Implementation Plan: Video Ingest Local Pipeline

**Track ID:** video_ingest_local_20260222
**Spec:** [spec.md](./spec.md)
**Created:** 2026-02-22
**Status:** [x] Complete

## Phase 1: Local extraction service

- [x] Task 1.1: Add `brain/video_ingest_local.py` with ffmpeg audio extraction
- [x] Task 1.2: Add faster-whisper transcription with segment timestamps
- [x] Task 1.3: Add keyframe extraction (fixed-interval via ffmpeg `fps=1/N`)
- [x] Task 1.4: Add OCR pass over keyframes (configurable backend: pytesseract/PaddleOCR)

## Phase 2: Artifact generation

- [x] Task 2.1: Emit `transcript.json`, `segments.json`, `ocr.json` under `brain/data/video_ingest/<slug>/`
- [x] Task 2.2: Emit `<slug>_transcript.md` with `[hh:mm:ss]` timestamp anchors
- [x] Task 2.3: Emit `<slug>_visual_notes.md` with timestamped frame/OCR summaries

## Phase 3: RAG ingest bridge

- [x] Task 3.1: Add `brain/video_ingest_bridge.py` to ingest generated markdown via `rag_notes`
- [x] Task 3.2: Trigger `embed_rag_docs(corpus='materials')` after ingest
- [ ] Task 3.3: Persist source mp4 linkage in `metadata_json` (deferred — low priority)

## Phase 4: Pipeline hardening (added 2026-02-23)

- [x] Task 4.1: Refactor transcribe_audio() to accept MP4 directly (PyAV, no ffmpeg for audio)
- [x] Task 4.2: Add PT domain `initial_prompt` for medical vocabulary accuracy
- [x] Task 4.3: Enable `word_timestamps=True` for word-level timing
- [x] Task 4.4: Capture `avg_logprob` + `no_speech_prob` per segment for enrichment flagging
- [x] Task 4.5: Add OCR backend config option (pytesseract default, PaddleOCR optional)
- [x] Task 4.6: Update `process_video()` to skip audio extraction for transcription

## Phase 5: Test + verification

- [x] Task 5.1: Add `brain/tests/test_video_ingest_local.py`
- [x] Task 5.2: Add `brain/tests/test_video_ingest_bridge.py`
- [x] Task 5.3: Verify with `python -m pytest brain/tests/` — 689 passed
- [x] Task 5.4: Verify frontend unaffected with `cd dashboard_rebuild && npm run build`

## Commits

- `4c69bfed` feat(tutor): implement mp4 video ingest processing workflow
- `eb102c86` feat(video): harden local pipeline with word timestamps, initial prompt, confidence metadata

## Notes

- Scene-based keyframe extraction deferred — fixed-interval works well for lecture recordings.
- Metadata linkage (Task 3.3) deferred as low priority — video path is already in manifest.json.

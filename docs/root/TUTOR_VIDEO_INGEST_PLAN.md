# Tutor Video Ingest Plan (Hybrid: Free Local + API Enrichment)

Date: 2026-02-22
Owner: Trey
Status: Complete (merged PR #115, 2026-02-23)

## Outcome
- MP4 lectures become tutor-usable study material with:
  - accurate timestamped transcript,
  - visual context notes (slides/diagrams),
  - retrieval-ready chunks in `rag_docs`/`rag_embeddings`,
  - Obsidian-compatible outputs for module notes.

## Architecture Decision (Locked)
- Default path: **free local pipeline** for all videos.
- Escalation path: **API visual enrichment** only for flagged hard segments.
- Retrieval path: tutor queries transcript/enrichment chunks first, with timestamp citations.

```text
MP4
 -> Local ingest (ffmpeg + faster-whisper + scene/keyframe + OCR)
 -> transcript.md + visual_notes.md + metadata
 -> rag ingest + embeddings
 -> tutor Q&A with timestamp citations
 -> (optional) API enrichment for flagged segments
 -> enrichment.md merged back into rag + Obsidian links
```

## Confirmed Current State (Double-Checked)
- `POST /api/tutor/materials/upload` exists and validates via `text_extractor.SUPPORTED_EXTENSIONS` in `brain/dashboard/api_tutor.py`.
- `SUPPORTED_EXTENSIONS` currently excludes `.mp4` in `brain/text_extractor.py`.
- Folder sync path already supports `.mp4` through `rag_notes.sync_folder_to_rag` in `brain/rag_notes.py` and `/api/tutor/materials/sync` in `brain/dashboard/api_tutor.py`.
- MP4 ingest currently stores binary metadata but no transcript extraction (`rag_notes.ingest_document`, `doc_type='mp4'`).
- Tutor retrieval already runs on `rag_docs` + `rag_embeddings` (`brain/tutor_rag.py`).
- Frontend upload accept lists currently exclude `.mp4`:
  - `dashboard_rebuild/client/src/components/MaterialSelector.tsx`
  - `dashboard_rebuild/client/src/components/MaterialUploader.tsx`

## Implementation Checklist (Conductor-Tracked)

## Phase 1 — Free Local Video Pipeline (MVP)
- [x] Add `brain/video_ingest_local.py` (new).
- [x] Implement `extract_audio(video_path)` using `ffmpeg`.
- [x] Implement `transcribe_audio(audio_path)` using `faster-whisper` with word/segment timestamps.
- [x] Implement `extract_keyframes(video_path)` (scene-based if available, time-slice fallback).
- [x] Implement `ocr_keyframes(frame_paths)` using `tesseract` or `paddleocr` (configurable).
- [x] Build normalized artifacts per video under `brain/data/video_ingest/<video_slug>/`:
  - `transcript.json`
  - `segments.json`
  - `keyframes/`
  - `ocr.json`
- [x] Render retrieval-ready markdown outputs:
  - `<video_slug>_transcript.md` (timestamped segments)
  - `<video_slug>_visual_notes.md` (frame+OCR notes with timestamps)
- [x] Add CLI wrapper `scripts/video_ingest_local.py` to run end-to-end for one video or folder.

Acceptance checks:
- [x] Running CLI on one MP4 outputs both markdown files and JSON artifacts.
- [x] Output markdown includes stable timestamp anchors (`[hh:mm:ss]`).
- [x] Pipeline succeeds without API keys.

## Phase 2 — Ingest into Current RAG
- [x] Add `brain/video_ingest_bridge.py` (new) to ingest generated markdown via existing APIs.
- [x] Use `rag_notes.ingest_transcript_text` for transcript markdown.
- [x] Ingest visual notes as `doc_type='transcript'` or `doc_type='note'` with `topic_tags` including `video`, `visual`, `timestamps`.
- [x] Trigger `embed_rag_docs(corpus='materials')` post-ingest.
- [x] Persist linkage metadata (`video_id`, source mp4 path, segment IDs) in `metadata_json`.

Acceptance checks:
- [x] New rows appear in `rag_docs` with searchable text.
- [x] Related chunks appear in `rag_embeddings`.
- [x] Tutor can answer a question and cite transcript chunks from that video.

## Phase 3 — API Visual Enrichment (Selective)
- [x] Add `brain/video_enrich_api.py` (new provider-agnostic service).
- [x] Add provider adapter `brain/video_enrich_providers/gemini_provider.py` (new).
- [x] Input: flagged segment list (`low_confidence`, `diagram-heavy`, `ocr-dense`, `user_requested_visual_help`).
- [x] Output: `<video_slug>_enrichment.md` with:
  - timestamp,
  - visual explanation,
  - concept links,
  - confidence note.
- [x] Ingest enrichment markdown into RAG (same bridge path as Phase 2).

Acceptance checks:
- [x] API enrichment runs only on flagged segments.
- [x] Enrichment output is ingested and retrievable by tutor.
- [x] Local-only mode still works when API key is absent.

## Phase 4 — Backend Endpoints + Job Control
- [x] Add endpoint group in `brain/dashboard/api_tutor.py`:
  - `POST /api/tutor/materials/video/process`
  - `GET /api/tutor/materials/video/status/<job_id>`
  - `POST /api/tutor/materials/video/enrich`
- [x] Reuse existing job tracking pattern from materials sync (`_update_sync_job` style).
- [x] Add budget/guardrail validation in backend before enrichment calls.

Acceptance checks:
- [x] One request starts processing job and returns `job_id`.
- [x] Status endpoint reports phase transitions (`transcribe -> keyframes -> ocr -> ingest -> embed`).
- [x] Failures are surfaced with actionable error messages.

## Phase 5 — Frontend Wiring
- [x] Update accepted extensions to include `.mp4`:
  - `dashboard_rebuild/client/src/components/MaterialSelector.tsx`
  - `dashboard_rebuild/client/src/components/MaterialUploader.tsx`
- [x] Add MP4 badge handling in file type labels.
- [x] Add "Process Video" action + status polling in tutor materials UI.
- [x] Add optional "Run API Enrichment" button for selected processed videos.

Acceptance checks:
- [x] MP4 can be selected and uploaded from UI.
- [x] Process status is visible until completion.
- [x] Resulting transcript/enrichment materials appear in materials list.

## Phase 6 — Cost + Reliability Guardrails
- [x] Add config file `brain/config/video_enrichment.json` (new):
  - `mode`: `local_only|hybrid|api_only`
  - `monthly_usd_cap`
  - `per_video_usd_cap`
  - `max_segments_per_video`
  - `provider`
- [x] Add usage ledger table `video_api_usage` in `brain/db_setup.py` (new migration).
- [x] Enforce hard stop on budget exceed and fallback to local-only.
- [x] Cache API enrichment by `(video_checksum, segment_id, prompt_version)`.

Acceptance checks:
- [x] Budget cap blocks API calls deterministically.
- [x] Same segment does not re-bill when unchanged.
- [x] Local pipeline still completes when API blocked.

## Phase 7 — Tutor Retrieval Behavior for Video
- [x] In `brain/tutor_rag.py`, prioritize transcript/enrichment chunks when question includes video signals (`lecture`, `timestamp`, `in the video`, `at minute`).
- [x] Add citation formatting support for timestamp metadata (display `[hh:mm:ss]`).
- [x] Ensure retrieval remains scoped by selected materials (`material_ids`).

Acceptance checks:
- [x] Video questions return timestamp-linked answers.
- [x] Non-video questions do not get polluted by video chunks.
- [x] Existing chain behavior remains unchanged.

## Test Plan (Must Pass)
- [x] Add unit tests:
  - `brain/tests/test_video_ingest_local.py`
  - `brain/tests/test_video_enrich_api.py`
  - `brain/tests/test_video_ingest_bridge.py`
- [x] Add API tests:
  - `brain/tests/test_video_process_api.py`
- [x] Add UI tests:
  - update uploader/material tests for `.mp4` acceptance.
- [x] Run `python -m pytest brain/tests/` — 689 passed.
- [x] Run frontend build: `cd dashboard_rebuild && npm run build` — clean.

## Implementation Order (Do Not Reorder)
1. Phase 1 (local pipeline)
2. Phase 2 (RAG ingest bridge)
3. Phase 4 (backend process/status endpoints)
4. Phase 5 (frontend controls)
5. Phase 3 (API enrichment)
6. Phase 6 (budget guardrails)
7. Phase 7 (retrieval tuning + citations)

## Definition of Done
- [x] MP4 can be processed end-to-end from local pipeline to tutor answer with timestamps.
- [x] API enrichment is optional, budget-capped, and cached.
- [x] Obsidian study notes can reference processed video segments without manual copy/paste.

## Commits
- `4c69bfed` feat(tutor): implement mp4 video ingest processing workflow
- `ecd9642f` feat(video): harden pipeline + add Gemini enrichment API + retrieval tuning (#115)
- `9a1a5487` docs(conductor): close all 3 video pipeline tracks as complete

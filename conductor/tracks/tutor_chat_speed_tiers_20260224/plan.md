# Track: TutorChat Speed Tiers

**Created:** 2026-02-24
**Status:** ✅ Complete
**Closed:** 2026-02-24
**Full plan:** `docs/plans/2026-02-24-tutor-chat-speed-tiers.md`

## Goal

Cut TutorChat response time from ~20s to under 5s by adding UI mode toggles
that gate expensive pipeline stages, and parallelizing RAG calls that remain enabled.

## Problem

Every turn ran the full pipeline unconditionally:
- Sequential dual Chroma queries (~4-6s)
- Sequential Obsidian vault search (~2-3s)
- `reasoning_effort="high"` always on (~10-15s TTFT penalty)
- `web_search=True` always on (~2-4s penalty)

## Solution

### A — UI Mode Toggles (frontend)
Five pill toggles above the chat input: 📚 Materials | 🗂️ Obsidian | 🔍 Web | 🧠 Deep Think.
Default = all off (Chat-only = codex-spark, no RAG, no reasoning, ~1-2s).

### B — Backend mode routing (api_tutor.py)
`send_turn` reads `mode` flags from POST body, conditionally skips RAG blocks,
selects model + reasoning_effort based on flags.

### C — Parallel RAG (tutor_rag.py + api_tutor.py)
`get_dual_context` runs both Chroma collections concurrently via `ThreadPoolExecutor`.
When both Materials + Obsidian are enabled, those two calls also run in parallel.

## Model/Reasoning Matrix

| Mode           | Model               | reasoning_effort |
|----------------|---------------------|------------------|
| Chat only      | gpt-5.3-codex-spark | none             |
| + any search   | gpt-5.3-codex-spark | none             |
| 🧠 Deep Think  | gpt-5.3-codex       | "high"           |

## Tasks

- [x] Task 1 — Parallelize dual Chroma in `get_dual_context` (tutor_rag.py)
- [x] Task 2 — Mode flags in `send_turn` + parallel Chroma+Obsidian (api_tutor.py)
- [x] Task 3 — Toggle UI + POST wiring (TutorChat.tsx)
- [x] Task 4 — Docs update (TUTOR_TODO.md, AGENTS.md)

## Files Touched

- `brain/tutor_rag.py`
- `brain/dashboard/api_tutor.py`
- `brain/tests/test_tutor_rag_parallel.py` (new)
- `brain/tests/test_api_tutor_mode_flags.py` (new)
- `dashboard_rebuild/client/src/components/TutorChat.tsx`
- `docs/root/TUTOR_TODO.md`
- `AGENTS.md`

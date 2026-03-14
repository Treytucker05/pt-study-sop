# Repository Audit — 2026-03-08 (Copy Window Edition)

The full audit is formatted inside one fenced block so it can be copied in one action.

```text
+================================================================================+
| PT STUDY SYSTEM — FULL REPO AUDIT (CURRENT STATE)                             |
| Date: 2026-03-08                                                               |
+================================================================================+

[STEP 1] REPO STRUCTURE (MAJOR AREAS + KEY FILES)

/workspace/pt-study-sop
├─ app.py
├─ Start_Dashboard.bat
├─ README.md
├─ AGENTS.md
├─ brain/
│  ├─ dashboard/
│  │  ├─ app.py
│  │  ├─ api_tutor.py
│  │  ├─ api_adapter.py
│  │  ├─ api_methods.py
│  │  ├─ api_chain_runner.py
│  │  ├─ api_mastery.py
│  │  └─ api_data.py
│  ├─ db_setup.py
│  ├─ llm_provider.py
│  ├─ tutor_tools.py
│  ├─ tutor_context.py
│  ├─ tutor_rag.py
│  ├─ anki_sync.py
│  ├─ obsidian_vault.py
│  ├─ dashboard_web.py
│  ├─ data/
│  │  ├─ pt_study.db
│  │  └─ uploads/
│  └─ tests/
├─ dashboard_rebuild/
│  ├─ client/src/api.ts
│  ├─ client/src/pages/tutor.tsx
│  ├─ client/src/components/TutorChat.tsx
│  ├─ client/src/components/MessageList.tsx
│  ├─ client/src/components/SourcesPanel.tsx
│  ├─ client/src/components/useSSEStream.ts
│  └─ package.json
├─ docs/root/
│  ├─ TUTOR_STUDY_BUDDY_CANON.md
│  ├─ GUIDE_DEV.md
│  └─ AGENT_SETUP.md
├─ sop/
├─ scholar/
├─ conductor/
└─ scripts/

[STEP 2] MAJOR COMPONENTS

A) BACKEND PYTHON (TUTOR + OPENAI/CODEX)
- Tutor endpoints are centralized in brain/dashboard/api_tutor.py:
  session create/get/turn/end, artifacts, summary/finalize, embed/sync,
  materials upload/list/update/delete, video process/enrich/status.
- Turn flow (/api/tutor/session/<id>/turn):
  1) load session + previous turns
  2) build system prompt with context, retrieval tuning, mode directives
  3) build user prompt with bounded history
  4) stream response via llm_provider.stream_chatgpt_responses(...)
  5) process tool calls in-loop and feed tool outputs back with input_override
  6) persist turn + response continuity IDs
- System prompt injection point: Responses payload uses
  "instructions": system_prompt.
- Conversation continuity: previous_response_id is passed on each turn,
  and last_response_id/codex_thread_id are persisted in tutor_sessions.
- Token/history management today:
  - bounded prompt history (recent turns)
  - assistant text truncation in history assembly
  - no dedicated automatic conversation compaction pipeline to Obsidian.

B) AUTH / OAUTH / LOCALHOST SETUP
- OAuth token source: ~/.codex/auth.json
- Access token + refresh token parse/refresh in brain/llm_provider.py
- Refresh endpoint: auth.openai.com/oauth/token
- Model response endpoint: chatgpt.com/backend-api/codex/responses
- Headers include Bearer token, OpenAI-Beta responses experimental,
  optional chatgpt-account-id.
- Startup contract: Start_Dashboard.bat handles:
  stale port 5000 kill -> db setup -> sync scripts -> frontend build -> server start.

C) FRONTEND / DASHBOARD CHAT
- Tutor API client surface is broad in dashboard_rebuild/client/src/api.ts
  (session lifecycle, artifacts, summary, materials, embed/sync/video, config).
- Chat UI in TutorChat.tsx:
  - message list + input
  - behavior override buttons (Socratic/Evaluate/Concept Map/Teach-Back)
  - speed toggles (Materials/Obsidian/Gemini Vision/Web/Deep Think)
  - source panel toggle
- SSE loop in useSSEStream.ts:
  sends message + content_filter + mode toggles;
  parses token/done/error/tool_call/tool_result/web_search chunks.
- Per-response actions in MessageList.tsx currently include:
  Save Note, Create Card, Create Map (+ table/map extraction save actions).

D) DATA/STORAGE LAYER
- DB schema in brain/db_setup.py includes:
  - tutor_sessions (codex_thread_id, last_response_id, content_filter_json)
  - tutor_session_learning_objectives
  - card_drafts
  - rag_docs (+ corpus, file metadata, enable flags)
- Material upload route (/materials/upload):
  saves file to brain/data/uploads, extracts text for non-mp4,
  inserts rag_docs, dedupes via checksum, best-effort embeds text docs.
- Video pipeline routes exist for mp4 process + enrich status/output.

E) OBSIDIAN + ANKI
- Obsidian integration exists in tutor API helpers:
  read/save/delete with vault path guarding and CLI fallback behavior.
- Tool schema + execution includes save_to_obsidian and create_anki_card.
- create_anki_card writes draft rows into card_drafts.
- AnkiConnect integration exists in brain/anki_sync.py
  (localhost:8765, deck/model handling, add note sync behavior).

[STEP 3] CURRENT STRENGTHS (ADAPTIVE TUTOR RELEVANT)
- Solid streaming UX with token updates + tool telemetry.
- Responses API tool-calling loop is implemented end-to-end.
- Grounding controls already exposed in UI and payload:
  material_ids + accuracy_profile + vault folder scope + mode toggles.
- Materials ingestion path handles text docs + mp4 processing separately.
- Existing left slide-out panel and tab system reduces lift for sidebar expansion.

[STEP 4] LOW-EFFORT INTEGRATION POINTS FOR REQUESTED FEATURES

1) Quick buttons under each assistant response
   Files:
   - dashboard_rebuild/client/src/components/MessageList.tsx
   - dashboard_rebuild/client/src/components/useSSEStream.ts (helper wiring)
   Add buttons:
   - Shorter, Longer, Analogy, ASCII flowchart, Think deeper,
     Double-check sources, Save to notes, Create flashcard.

2) Left slide-out panel with tabs for Learning Objectives + Flashcards
   Files:
   - dashboard_rebuild/client/src/components/SourcesPanel.tsx
   - dashboard_rebuild/client/src/api.ts (new query endpoints if needed)
   Extend existing tab model (materials/vault/map) with LO + Flashcards tabs.

3) Auto-compaction/summarization to Obsidian
   Files:
   - brain/dashboard/api_tutor.py
   Add threshold-triggered summarization and save via existing Obsidian helpers.

4) Raw save vs summarized save logic
   Files:
   - brain/tutor_tools.py
   - dashboard_rebuild/client/src/components/MessageList.tsx
   Keep raw save_to_obsidian, add summarized-save companion action.

5) Flashcard queue -> bulk export/sync to Anki
   Files:
   - brain/dashboard/api_tutor.py or brain/dashboard/api_adapter.py
   - brain/anki_sync.py
   - dashboard_rebuild/client/src/components/SourcesPanel.tsx
   Expose queue APIs and a sync action invoking AnkiConnect flow.

6) Auto-extract LOs from uploaded materials
   Files:
   - brain/dashboard/api_tutor.py (upload/video post-processing)
   - brain/tutor_tools.py (reuse save_learning_objectives path)

[STEP 5] GAP ANALYSIS (EASIEST FIRST)
1. Missing quick-action re-prompt button system under assistant responses.
2. Missing flashcard queue UI in Tutor (draft backend exists).
3. Missing auto conversation compaction pipeline to Obsidian notes.
4. Missing interactive LO sidebar workflow (checkmarks/state transitions).
5. Missing automatic LO extraction trigger in material ingest pipeline.

END OF COPY WINDOW
+================================================================================+
```

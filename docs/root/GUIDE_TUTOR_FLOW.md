# Tutor Flow Guide (Architecture + Runtime Wiring)

Last updated: 2026-03-01

This guide documents how the Tutor subsystem works end-to-end in the current codebase.

Provisional status:
- The instruction/rules model is in active stabilization and is **not final**.
- Current priority is successful completion of one full study session before adding broader archived rule complexity.

## 1) Entry Points and Major Components

Backend:
- `brain/dashboard/app.py`
  - Registers Tutor blueprint (`tutor_bp`) on `/api/tutor/*`.
- `brain/dashboard/api_tutor.py`
  - Main Tutor API surface and orchestration runtime.
  - Owns session lifecycle routes, turn streaming, artifacts, chain status, settings, materials, and sync.
- `brain/tutor_context.py`
  - Builds retrieval context per turn (materials + Obsidian notes).
- `brain/tutor_prompt_builder.py`
  - Builds final model prompt from chain/block/session context + retrieved evidence.
- `brain/tutor_streaming.py`
  - Formats SSE chunks (`token`, `tool_call`, `tool_result`, `done`, `error`).
- `brain/tutor_tools.py`
  - Declares tool schemas and dispatches tool execution.
- `brain/tutor_rag.py`
  - Vector/keyword retrieval and dual-context support.
- `brain/obsidian_vault.py`
  - Obsidian CLI wrapper — full CRUD, search, surgical edit, organize via official CLI (v1.12+).
- `brain/db_setup.py`
  - Tutor-related schema definitions and migrations.

Frontend:
- `dashboard_rebuild/client/src/pages/tutor.tsx`
  - Top-level Tutor page: wizard, session lifecycle, restore logic, settings, artifact/session side panels.
- `dashboard_rebuild/client/src/components/TutorWizard.tsx`
  - Setup flow (course/topic/materials/chain mode).
- `dashboard_rebuild/client/src/components/TutorChat.tsx`
  - Turn loop UI, streaming parser, tool/action display, Obsidian interactions, artifact detection.
- `dashboard_rebuild/client/src/components/TutorArtifacts.tsx`
  - Artifact list/session actions and completion summary utilities.
- `dashboard_rebuild/client/src/api.ts`
  - Typed API wrappers for Tutor/Obsidian endpoints.

## 2) Core Runtime Path: POST /api/tutor/session/<id>/turn

Route:
- `brain/dashboard/api_tutor.py` -> `send_turn` (`/session/<session_id>/turn`)

Execution flow:
1. Validate active session and request payload (`message`, `content_filter`, behavior/mode flags).
2. Load session turns and chain/block context.
3. Build retrieval context:
   - Materials via `tutor_rag` retrieval.
   - Notes via `ObsidianClient.search(...)`.
4. Build prompt via `build_prompt_with_contexts(...)`.
   - Global rules: saved Tutor settings (`tutor_custom_instructions`) or fallback defaults.
   - Session-only rules: optional `content_filter.session_rules` appended for current session runtime.
5. Start streaming model call with tool schemas (`get_tool_schemas()`).
6. Emit SSE events continuously to frontend:
   - token deltas
   - tool_call / tool_result
   - web-search status events (when relevant)
   - done/error
7. Persist turn/session state:
   - append `tutor_turns`
   - update `tutor_sessions` counters/state
   - update `tutor_block_transitions` progress as needed.

## 3) Tool Calling Pipeline

Tool registry is defined in `brain/tutor_tools.py` and exposed via:
- `get_tool_schemas()`
- `execute_tool()`

Turn-time loop behavior:
1. Model emits `tool_call`.
2. Backend executes tool through registry dispatcher.
3. Backend emits `tool_result` SSE.
4. Tool output is appended into model conversation.
5. Model resumes generation.
6. Loop stops on completion or function-call iteration cap.

Notable built-in tool families:
- Obsidian/note creation and save flows.
- Card and diagram creation helpers.
- Learning objective persistence/update.
- Method block rating feedback writes.

## 4) Data Stores and Connection Points

Primary DB tables touched in Tutor runtime:
- `tutor_sessions`
- `tutor_turns`
- `tutor_block_transitions`
- `learning_objectives`
- `method_ratings`
- `card_drafts`
- `error_logs` (diagnostics/failure paths)

External/adjacent stores:
- RAG retrieval indexes (materials + dual-context paths).
- Obsidian vault files through Obsidian API adapter.

## 5) Frontend Startup -> Session -> Turn -> Artifact

Startup and restore (`pages/tutor.tsx`):
1. Read localStorage (active session, wizard state, selected materials/profile/scope/vault settings).
2. If active session exists, fetch `GET /api/tutor/session/{id}`.
3. If still active, hydrate chat mode; otherwise clear stale key and return to wizard.

Session creation:
1. Wizard submits selected configuration.
2. Optional custom chain creation if needed.
3. `POST /api/tutor/session` to create runtime session.
4. Page switches to chat with new `session_id`.

Turn flow (`TutorChat.tsx`):
1. POST to `/api/tutor/session/{id}/turn` via raw `fetch` stream.
2. Parse SSE lines (`data: ...`) into token/tool/debug states.
3. Finalize assistant message on `done` and surface citations/debug/tool actions.
4. Run artifact detection/extraction and call parent artifact handler.

Artifact/session operations:
- Create artifact: `POST /api/tutor/session/{id}/artifact`
- Delete artifacts: `DELETE /api/tutor/session/{id}/artifacts`
- End session: `POST /api/tutor/session/{id}/end`
- Delete session: `DELETE /api/tutor/session/{id}`
- Session summary: `GET /api/tutor/session/{id}/summary`

## 6) Endpoint Map (Most Used in Tutor UX)

Session and turn:
- `POST /api/tutor/session`
- `GET /api/tutor/session/{session_id}`
- `POST /api/tutor/session/{session_id}/turn` (SSE)
- `POST /api/tutor/session/{session_id}/end`
- `DELETE /api/tutor/session/{session_id}`
- `POST /api/tutor/session/{session_id}/artifact`
- `DELETE /api/tutor/session/{session_id}/artifacts`
- `POST /api/tutor/session/{session_id}/advance-block`
- `GET /api/tutor/session/{session_id}/chain-status`
- `GET /api/tutor/session/{session_id}/summary`

Setup/config/chains:
- `GET /api/tutor/content-sources`
- `GET /api/tutor/chains/templates`
- `POST /api/tutor/chain`
- `GET /api/tutor/settings`
- `PUT /api/tutor/settings`

Obsidian (used by Tutor flows/components):
- `GET /api/obsidian/files`, `GET /api/obsidian/file`
- `PUT /api/obsidian/file`, `DELETE /api/obsidian/file`
- `POST /api/obsidian/folder`, `DELETE /api/obsidian/folder`
- `POST /api/obsidian/move`, `POST /api/obsidian/append`

## 7) Frontend State Keys That Matter

LocalStorage keys:
- `tutor.selected_material_ids.v1`
- `tutor.accuracy_profile.v1`
- `tutor.objective_scope.v1`
- `tutor.wizard.state.v1`
- `tutor.active_session.v1`
- `tutor.vault_folder.v1`
- `tutor.vault_selected.v1`
- `tutor.wizard.progress.v1`
- `tutor.chat.selected_vault_paths.v1`
- `tutor-mermaid-import`

React Query keys:
- `["tutor-sessions"]`
- `["tutor-config-check"]`
- `["tutor-chat-materials-all-enabled"]`
- `["tutor-content-sources"]`
- `["tutor-chains-templates"]`
- `["mastery-dashboard"]`
- `["tutor", "obsidian", "files", ...]`

## 8) Notes on Janitor and Vault Repair

`api_janitor.py` and `vault_janitor.py` are not in the hot turn loop, but they are operationally connected to Tutor reliability because Tutor note retrieval and note-writing quality depend on vault consistency.

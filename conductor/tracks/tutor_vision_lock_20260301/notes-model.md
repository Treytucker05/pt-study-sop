# Notes Model: Tutor Responsibilities and Persistence

**Track:** `tutor_vision_lock_20260301`  
**Status:** Locked on 2026-03-13  
**Authority:** Tutor-specific notes/artifact ownership model under repo canon.

## Responsibility Split

| Surface | Owner | Decides | Must Not Decide |
| --- | --- | --- | --- |
| Global Tutor rules | global Tutor contract | provenance, cadence, uncertainty, objective lock, no-answer-leakage, no-phantom-output, terminology clarity | chain progression, save truth, session deletion behavior |
| Session-only rules | session-scoped runtime input | temporary session guardrails for the current session only | replace the base contract or bypass runtime guardrails |
| Chain runtime profile | chain metadata | study path, allowed and forbidden moves, required outputs, teaching emphasis inside the stage | PRIME enforcement, selected-material persistence, delete ownership |
| Block facilitation | current block | immediate teaching move and block-level required outputs | persistence, save truth, reference validation |
| Artifact payload/schema | artifact runtime | allowed artifact types and structured-note payload shape | pedagogy policy, chain progression, summary policy |
| Session controller | Tutor runtime | create, restore, summary, end, delete, PRIME rules, reference bounds, save/delete truth | owner pedagogy or chain-authored teaching content |
| Templates | render layer | markdown shape for wraps and saved notes | whether an artifact exists or whether a save succeeded |
| Obsidian sync layer | vault runtime | merge/save/delete behavior for session-owned note files | chain pedagogy or retrieval scope |

## Artifact Types

### `note`

- Global quick-note sidecar with session history attached.
- Not part of the locked session-delete ownership contract.
- Future work can promote it into session-owned lifecycle only with explicit schema/delete-path work.

### `card`

- Session-owned learning artifact.
- Chains may request it; runtime stores and preserves it.
- Card survival across end-session is part of the locked behavior.

### `map`

- Session-recorded output.
- Not currently part of the locked save/delete ownership contract beyond truthful session recording.
- Any stronger ownership rule requires explicit runtime work first.

### `structured_notes`

- Highest-contract artifact because it passes through validation, finalization, artifact indexing, and Obsidian save logic.
- Runtime owns validation and final save/index behavior.
- The model may propose content, but the backend decides whether it is accepted and saved.

### `session_wrap`

- Summary-time artifact created only when save is explicitly requested.
- Runtime and template layers together own its render/save behavior.
- Save success or failure must be explicit in the summary response.

## Lifecycle Contract

### Turn

- The model can emit artifact intents and tool intents.
- The backend records what actually happened and emits the SSE `done` payload with citations, retrieval debug, timing, and artifact metadata.

### Restore

- Session restore must preserve scoped `content_filter` state, including material selection and accuracy profile.
- Restore is state recovery, not a fresh session synthesis.

### Summary

- Summary returns the authoritative end-of-session aggregation of turns, artifacts, objectives, and block progress.
- `?save=true` may render and persist a session wrap.
- Save success or failure must be explicit in the response payload.

### End

- End-session finalizes runtime state, syncs graph/objective side effects as needed, and preserves already-created session-owned artifacts.
- End does not imply delete.

### Delete

- Delete removes session rows and session-owned artifact files.
- Delete must preserve shared course-unit infrastructure such as map-of-contents and learning-objective hub pages.
- Delete telemetry is part of the locked contract.
- Delete does not currently own cleanup of quick-note sidecars created through the `note` artifact path.

## Drift-Prevention Rules

- Chains may request, but runtime confirms.
- Templates shape content, but templates never prove that an action happened.
- Obsidian paths are runtime-managed outputs, not model-authoritative facts.
- Shared study infrastructure is never disposable session content.
- Any future note/artifact feature must declare whether it is session-owned, sidecar-only, or template-shaped before implementation begins.

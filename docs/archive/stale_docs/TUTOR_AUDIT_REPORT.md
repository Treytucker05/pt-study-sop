# Tutor Audit Report

**Date:** 2026-03-01  
**Scope:** End-to-end tutor flow — API↔UI contracts, notes/organization, runtime smoothness  
**Plan:** `tutor-audit-smoothness` (see `.cursor/plans/`)

---

## 1. API ↔ UI Contract Verification

### 1.1 Session Summary (`GET /api/tutor/session/<id>/summary`)

| Field | Backend Returns | Frontend Expects | Severity |
|-------|-----------------|------------------|----------|
| Duration | `duration_minutes` (number) | `duration_seconds` (number) | **HIGH** — UI shows `formatDuration(summary.duration_seconds)` → undefined/NaN |
| Artifacts | `artifacts` (array of `{type, count}`) | `artifact_count` (number) | **HIGH** — UI shows `summary.artifact_count` → undefined |
| Objectives | `objectives` (array of `{id, description, status}`) | `objectives_covered` (array of `{id, name, status}`) | **MEDIUM** — UI maps `obj.name` but backend sends `description` |
| Chain progress | `chain_progress` (string e.g. "2/6 blocks") | `chain_progress` (object `{current_block, total_blocks, chain_name}`) | **MEDIUM** — UI expects object, gets string |

**Files:**
- Backend: [brain/dashboard/api_tutor.py](brain/dashboard/api_tutor.py) lines 4972–4987
- Frontend: [dashboard_rebuild/client/src/components/TutorArtifacts.tsx](dashboard_rebuild/client/src/components/TutorArtifacts.tsx) lines 384–427
- Types: [dashboard_rebuild/client/src/api.ts](dashboard_rebuild/client/src/api.ts) lines 1745–1754

### 1.2 Save Wrap Path (Broken)

**Bug:** `handleSave` in TutorArtifacts calls:
```ts
await api.tutor.getSessionSummary(`${sessionId}?save=true`);
```
This produces URL: `/tutor/session/<uuid>?save=true/summary` — the `?save=true` is embedded in the path segment, so `session_id` becomes `uuid?save=true` and the request 404s or hits the wrong session.

**Correct behavior:** Call `/tutor/session/<uuid>/summary?save=true` (query param, not path).

**Files:**
- [dashboard_rebuild/client/src/components/TutorArtifacts.tsx](dashboard_rebuild/client/src/components/TutorArtifacts.tsx) line 354
- [dashboard_rebuild/client/src/api.ts](dashboard_rebuild/client/src/api.ts) lines 814–815 — `getSessionSummary` has no `save` param

### 1.3 Artifact Types (Backend Rejects table/smap)

| UI Command | Frontend Type | Backend Accepts | Result |
|------------|---------------|-----------------|--------|
| `/note` | `note` | ✓ | OK |
| `/card` | `card` | ✓ | OK |
| `/map` | `map` | ✓ | OK |
| `/table` | `table` | ✗ | **400** — "type must be 'note', 'card', 'map', or 'structured_notes'" |
| `/smap` | `structured_map` | ✗ | **400** — same |

**Files:**
- Backend: [brain/dashboard/api_tutor.py](brain/dashboard/api_tutor.py) lines 5218–5219
- Frontend: [dashboard_rebuild/client/src/components/TutorChat.tsx](dashboard_rebuild/client/src/components/TutorChat.tsx) lines 299–308, 1123–1144
- API types: [dashboard_rebuild/client/src/api.ts](dashboard_rebuild/client/src/api.ts) TutorArtifactRequest has `"note" | "card" | "map"` only

---

## 2. Notes Persistence Trace (Preliminary)

### 2.1 Persistence Surfaces

| Surface | When Written | Content |
|---------|--------------|---------|
| `tutor_sessions.artifacts_json` | On create_artifact, finalize, turn completion | Array of `{type, title, content?, created_at}` |
| `tutor_turns.artifacts_json` | Per-turn tool/artifact payloads | Turn-level artifact metadata |
| `quick_notes` | `artifact_type=note` in create_artifact | Rows with `note_type='tutor'` |
| `card_drafts` | `artifact_type=card` in create_artifact | Anki-ready drafts |
| Obsidian | finalize, session wrap save, vault artifacts | Session wrap, concept notes, North Star |

### 2.2 Organization Gaps (Verified)

- **Folder scope ignored (verified):** `api_tutor.py` extracts `folder_paths` from `content_filter["folders"]` (line 3458) but `build_context()` is called without `folder_paths`. `tutor_context._fetch_materials()` does not accept or pass `folder_paths` to `search_with_embeddings()`. User-selected vault folders have no effect on retrieval.
- **Topic-colliding paths:** Session wrap saves to `{vault_folder}/_Session_Wrap_{date}.md` or `Study Notes/_Session_Wrap_{date}.md` — one file per day, so multiple sessions on same day merge. North Star and concept notes use course/module paths.
- **Table/smap never persist:** Backend `create_artifact` rejects `table` and `structured_map`; these only appear in UI if kept in-memory from chat. No DB or Obsidian write.
- **Multiple output channels:** quick_notes, tutor_sessions.artifacts_json, card_drafts, Obsidian (session wrap, concept notes, North Star) — no single canonical flow documented.

### 2.3 Persistence Flow Diagram

```
User: /note, /card, /map
  → TutorChat onCreateArtifact
  → api.tutor.createArtifact(sessionId, {type, content, title})
  → POST /api/tutor/session/<id>/artifact
  → create_artifact() in api_tutor.py
  → note: quick_notes INSERT + artifacts_json append
  → card: card_drafts INSERT + artifacts_json append
  → map: artifacts_json append only
  → table/smap: 400 rejected

User: /table, /smap
  → Same path, backend returns 400
  → Artifact may exist in UI state only (from chat stream), never persisted
```

---

## 3. Runtime Smoothness (Checklist)

### 3.1 Turn Payload Integrity
- **material_ids:** TutorChat sends `content_filter` from session/create; `material_ids` must be present when materials selected. Verified in api_tutor merge logic (persisted + per-turn).
- **accuracy_profile:** Resolved from content_filter; used for retrieval k. Present when calibration/retrieval active.
- **Mode toggles:** `mode.materials`, `mode.obsidian`, `mode.web_search`, `mode.deep_think` gate pipeline stages and model tier. Default when mode absent: all on (legacy).

### 3.2 Retrieval Telemetry
- Backend `material_docs`/`instruction_docs` stubbed empty (api_tutor.py ~3853); `retrieval_debug` built from `rag_debug` (ctx["debug"]) which is populated by build_context. Stub does not affect retrieval_debug payload — it comes from rag_debug. **Caveat:** `retrieval_debug` reflects materials_debug from _fetch_materials; instruction path may be empty if not used.
- Frontend displays retrieval badge; values come from SSE `done` event.

### 3.3 Failure Paths (Verified)
- **SSE errors:** `tutor_streaming.format_sse_error()` maps raw errors to actionable messages (auth, timeout, network, etc.). Emits `{"type":"error","content":msg}` then `[DONE]`.
- **Provider/embedding failures:** Logged and surfaced via format_sse_error; UI should display error content. Manual verification recommended for stuck-state edge cases.

---

## 4. Contract Matrix (Summary)

| API | Expected (Frontend) | Actual (Backend) | Fix Direction |
|-----|---------------------|------------------|---------------|
| Summary duration | `duration_seconds` | `duration_minutes` | Backend add `duration_seconds` or frontend convert |
| Summary artifacts | `artifact_count` | `artifacts: [{type, count}]` | Backend add `artifact_count` or frontend sum |
| Summary objectives | `objectives_covered`, `name` | `objectives`, `description` | Backend alias or frontend map |
| Summary chain_progress | `{current_block, total_blocks, chain_name}` | `"2/6 blocks"` string | Backend add structured field or frontend parse |
| Save wrap | `?save=true` query | Same | Fix frontend URL construction |
| Artifact table | `table` | Rejected | Backend accept `table` → store as `note` with table content, or add `table` type |
| Artifact smap | `structured_map` | Rejected | Backend accept `structured_map` → store as `map` (mermaid), or add type |

---

## 5. Next Steps (Prioritized Fixes)

See [TUTOR_AUDIT_REMEDIATION.md](TUTOR_AUDIT_REMEDIATION.md) for the full ranked fix plan with implementation checklist and regression tests.

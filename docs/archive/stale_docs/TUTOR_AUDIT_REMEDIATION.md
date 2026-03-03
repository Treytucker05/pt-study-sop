# Tutor Audit — Prioritized Remediation Plan

**Date:** 2026-03-01  
**Source:** [TUTOR_AUDIT_REPORT.md](TUTOR_AUDIT_REPORT.md)

---

## Fix Order (Smallest Safe First)

### P0 — Contract Blockers (Session Summary + Save Wrap)

**1. Fix save-wrap URL construction**

| Item | Detail |
|------|--------|
| **Problem** | `getSessionSummary(\`${sessionId}?save=true\`)` embeds query in path → 404 |
| **Fix** | Add optional `save` param to API; frontend passes `?save=true` as query |
| **Files** | `dashboard_rebuild/client/src/api.ts`, `dashboard_rebuild/client/src/components/TutorArtifacts.tsx` |
| **Change** | `getSessionSummary(sessionId: string, opts?: { save?: boolean })` → build URL with `?save=true` when opts.save |
| **Test** | Unit test: `getSessionSummary("s1", { save: true })` → URL contains `/summary?save=true` |

**2. Align summary response to frontend contract**

| Item | Detail |
|------|--------|
| **Problem** | Backend returns `duration_minutes`, `artifacts`, `objectives`; frontend expects `duration_seconds`, `artifact_count`, `objectives_covered` |
| **Fix** | Backend adds computed fields: `duration_seconds`, `artifact_count`, `objectives_covered` (alias `objectives` → `objectives_covered`, map `description` → `name`) |
| **Files** | `brain/dashboard/api_tutor.py` (get_session_summary) |
| **Change** | Add to summary dict: `duration_seconds = duration_minutes * 60`, `artifact_count = sum(c for _, c in artifact_counts.items())`, `objectives_covered = [{"id": o["id"], "name": o.get("description", o["id"]), "status": o.get("status", "active")} for o in objectives_detail]` |
| **Test** | `test_get_session_summary_returns_frontend_contract_fields` |

**3. Chain progress shape (optional, lower priority)**

| Item | Detail |
|------|--------|
| **Problem** | Frontend expects `chain_progress: { current_block, total_blocks, chain_name }`; backend returns string |
| **Fix** | Backend adds `chain_progress_structured` or parse in frontend. Easiest: frontend parse `"2/6 blocks"` or backend add structured field |
| **Files** | `brain/dashboard/api_tutor.py`, `dashboard_rebuild/client/src/components/TutorArtifacts.tsx` |
| **Test** | Verify UI renders without error |

---

### P1 — Artifact Command Parity

**4. Accept table and structured_map in create_artifact**

| Item | Detail |
|------|--------|
| **Problem** | Backend rejects `table` and `structured_map`; UI advertises `/table`, `/smap` |
| **Fix** | Map `table` → store as `note` with table markdown; `structured_map` → store as `map` (mermaid content) |
| **Files** | `brain/dashboard/api_tutor.py` (create_artifact) |
| **Change** | `if artifact_type == "table": artifact_type = "note"` (content is table markdown); `if artifact_type == "structured_map": artifact_type = "map"` (content is mermaid) |
| **Test** | `test_create_artifact_accepts_table_and_structured_map` |

---

### P2 — Notes/Organization Improvements

**5. Wire folder_paths into retrieval**

| Item | Detail |
|------|--------|
| **Problem** | `content_filter.folders` extracted but never passed to build_context |
| **Fix** | Extend `build_context` and `_fetch_materials` to accept `folder_paths`; pass from api_tutor turn flow |
| **Files** | `brain/tutor_context.py`, `brain/dashboard/api_tutor.py` |
| **Change** | Add `folder_paths` param to build_context, _fetch_materials, search_with_embeddings call |
| **Test** | Integration test with folder filter |

**6. Session wrap path uniqueness (optional)**

| Item | Detail |
|------|--------|
| **Problem** | Multiple sessions same day write to same `_Session_Wrap_{date}.md` |
| **Fix** | Append session_id to path or use separate section per session in one file |
| **Files** | `brain/dashboard/api_tutor.py`, `brain/tutor_templates.py` |

---

### P3 — Telemetry and Latency (Lower Priority)

**7. Retrieval telemetry correctness**

| Item | Detail |
|------|--------|
| **Problem** | material_docs/instruction_docs stubbed; retrieval_debug may lack full fidelity |
| **Fix** | Populate from actual retrieval results if needed for debugging |
| **Files** | `brain/dashboard/api_tutor.py` |

**8. Latency budget audit**

| Item | Detail |
|------|--------|
| **Problem** | No baseline p50/p95 by depth mode |
| **Fix** | Add optional timing logs or script to benchmark |
| **Files** | New script or test |

---

## Implementation Checklist

- [x] P0.1 Fix save-wrap URL (api.ts + TutorArtifacts)
- [x] P0.2 Add summary contract fields (api_tutor.py)
- [x] P0.3 Chain progress shape (backend or frontend)
- [x] P1.4 Table/smap artifact mapping (api_tutor.py)
- [ ] P2.5 Wire folder_paths into retrieval (tutor_context, api_tutor)
- [ ] P2.6 Session wrap path uniqueness (optional)
- [ ] P3.7 Retrieval telemetry (optional)
- [ ] P3.8 Latency audit (optional)

---

## Regression Tests to Add

1. `test_get_session_summary_returns_duration_seconds_and_artifact_count`
2. `test_get_session_summary_save_true_appends_query_param`
3. `test_create_artifact_table_stored_as_note`
4. `test_create_artifact_structured_map_stored_as_map`
5. `test_build_context_receives_folder_paths_when_provided` (integration)

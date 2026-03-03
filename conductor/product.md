# Product Definition (PT Study OS)

PT Study OS is a local-first, single-user study system built around the **Control Plane Modular Study System** (CP-MSS v1.0). Every session follows a deterministic 6-stage learning pipeline with citation-first teaching, structured error telemetry, and continuous improvement via Scholar meta-audits.

## Core Loop

```
Native Tutor (Flask) -> Session + Error Telemetry -> Brain DB
     ^                                                  |
     |                                                  v
Selector (7 knobs)  <-- dominant_error <--  Dashboard (metrics)
     |                                                  |
     v                                                  v
Next Chain (auto)                              Scholar (proposals)
```

## Key Components

| Component | What It Does | Location |
|-----------|-------------|----------|
| **Tutor** | Native built-in Flask tutor with SSE streaming, RAG retrieval, and block progression | `brain/dashboard/api_tutor.py` (40+ endpoints) |
| **Brain** | Source-of-truth SQLite DB + ingestion + metrics + artifact generation | `brain/` |
| **Dashboard** | React SPA (retro arcade theme) for metrics, ingestion, calendar, tutor chat | `dashboard_rebuild/` |
| **Scholar** | Manual-run auditor that proposes evidence-based improvements | `scholar/` |
| **Control Plane** | 6-stage pipeline (PRIME->CALIBRATE->ENCODE->REFERENCE->RETRIEVE->OVERLEARN) with 7-knob chain selector | `brain/selector.py`, `sop/library/17-control-plane.md` |
| **RAG Pipeline** | ChromaDB vector store + text-embedding-3-small + MMR retrieval | `brain/tutor_rag.py` |
| **Vault Integration** | Obsidian CLI wrapper with retry/cache, fire-and-forget block note writes | `brain/obsidian_vault.py` |
| **Methods** | 46 composable study method blocks across 6 CP stages, 3 template chains (STD/MIN/PRO) | `brain/data/seed_methods.py`, `sop/library/chains/` |
| **Calendar/Tasks** | Google Calendar/Tasks two-way sync | `brain/dashboard/gcal.py` |

## Canonical Docs

- Architecture: `docs/TUTOR_ARCHITECTURE.md`
- Project Architecture: `docs/root/PROJECT_ARCHITECTURE.md`
- PRD: `docs/prd/PT_STUDY_OS_PRD_v1.0.md`
- Docs index: `docs/README.md`
- SOP source of truth: `sop/library/` (17 files)
- Control Plane spec: `sop/library/17-control-plane.md`

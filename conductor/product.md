# Product Definition (PT Study OS)

PT Study OS is a premium individual learning system built around three primary systems:

- **Brain** = learner-model engine
- **Scholar** = direct research partner
- **Tutor** = live protocol-led teacher

The product remains local-first in the current repo, but the commercial direction is a premium, explainable, trustworthy learning system rather than a loose bundle of study utilities.

## Core Product Loop

```text
Library + Vault + Session Signals -> Brain -> Scholar -> Tutor
          ^                            |         |         |
          |                            v         v         v
     durable notes             learner profile   research   teaching
          |                            |         |         |
          +----------------------------+---------+---------+
                                       |
                                       v
                               telemetry + artifacts
```

Operational law:

- Library determines what Tutor teaches.
- SOP determines how Tutor teaches.
- Brain identifies how the learner appears to learn best.
- Scholar interprets Brain evidence, asks focused questions, performs cited research, and proposes bounded strategy.
- Tutor executes the live teaching session.

## Primary Systems

| System | What It Does | Location |
|--------|--------------|----------|
| **Brain** | Captures telemetry, stores evidence, maintains learner-profile claims, and surfaces hybrid archetypes | `brain/` |
| **Scholar** | Investigates learner fit and system friction, asks focused questions, performs cited research, and drafts bounded findings/proposals | `scholar/` |
| **Tutor** | Native built-in Flask study operator with SSE streaming, RAG retrieval, and chain/block progression | `brain/dashboard/api_tutor.py` |

## Supporting Systems

| System | What It Does | Location |
|--------|--------------|----------|
| **SOP / Control Plane** | Defines the allowed teaching methods, chains, stages, and adaptation boundaries | `sop/library/`, `brain/selector.py` |
| **Dashboard / Shell** | React SPA for operating the system and exposing Brain/Scholar/Tutor workflows | `dashboard_rebuild/` |
| **Library** | Material ingestion and course scoping; determines what Tutor can teach | `brain/data/`, `/library` UI |
| **Vault Integration** | Obsidian note home and note-writing bridge | `brain/obsidian_vault.py`, `brain/dashboard/api_adapter.py` |
| **RAG Pipeline** | Vector retrieval over study materials and vault-adjacent context | `brain/tutor_rag.py` |
| **Methods / Chains** | Composable method blocks and prebuilt chains bound to CP-MSS stages | `brain/data/seed_methods.py`, `sop/library/chains/` |
| **Calendar / Tasks** | Scheduling and follow-through support | `brain/dashboard/gcal.py` |

## Product Principles

- The system must feel like one Brain / Scholar / Tutor product, not separate disconnected pages.
- Brain claims must be explainable, challengeable, and evidence-backed.
- Scholar must remain non-teaching for course content even when it is learner-facing.
- Tutor must remain chain-bound and SOP-bound.
- Brain must never directly steer Tutor; any live adaptation must pass through Scholar.

## Canonical Docs

- Master product canon: `docs/root/TUTOR_STUDY_BUDDY_CANON.md`
- Owner-specific lock-ins: `docs/root/TUTOR_OWNER_INTENT.md`
- Track roadmap of record: `conductor/tracks/brain-scholar-tutor-realignment_20260311/`
- Project architecture: `docs/root/PROJECT_ARCHITECTURE.md`
- Tutor architecture: `docs/TUTOR_ARCHITECTURE.md`
- Docs index: `docs/README.md`
- SOP source of truth: `sop/library/`
- Control Plane spec: `sop/library/17-control-plane.md`

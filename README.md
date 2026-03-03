# PT Study OS (runtime prompt v9.5.2)

A local-first, AI-powered study operating system for DPT coursework. Sessions run through a **native adaptive tutor** built on Flask + ChromaDB RAG, following the **Control Plane** learning pipeline (CP-MSS v1.0) with citation-first teaching, deterministic logging, and continuous improvement via Scholar meta-audits.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Control Plane Pipeline](#control-plane-pipeline)
- [SOP Library](#sop-library)
- [Brain (Backend)](#brain-backend)
- [Dashboard (Frontend)](#dashboard-frontend)
- [Adaptive Tutor](#adaptive-tutor)
- [Scholar (Meta-Auditor)](#scholar-meta-auditor)
- [External Integrations](#external-integrations)
- [Database](#database)
- [Development](#development)
- [Repo Layout](#repo-layout)
- [More Docs](#more-docs)

---

## System Overview

Five pillars work in a continuous loop:

```
  SOP (methodology)          Brain (data store + tutor engine)
       |                          |
       v                          v
  Adaptive Tutor  --------> Session Logs + DB + ChromaDB
  (native Flask)                  |
       |                          v
  Scholar (auditor) <------- Dashboard (metrics)
       |
       v
  Proposals --> approved --> SOP updates --> method block refresh
```

| Pillar | What It Does | Location |
|--------|-------------|----------|
| **SOP** | Defines *how* learning happens (17 library files) | `sop/library/` |
| **Brain** | Stores sessions, serves API, runs tutor engine, hosts dashboard | `brain/` |
| **Tutor** | Native adaptive chat tutor with RAG, streaming, and vault authoring | `brain/dashboard/api_tutor.py` |
| **Dashboard** | Surfaces metrics, manages ingestion, calendar, Anki, tutor UI | `dashboard_rebuild/` |
| **Scholar** | Audits session logs, proposes evidence-based improvements | `scholar/` |

---

## Architecture

### High-Level Data Flow

```
+------------------+     method blocks       +------------------+
|  SOP Library     |------------------------>|  Adaptive Tutor  |
|  (17 .md files)  |     + chain defs        |  (Flask native)  |
+------------------+                        +--------+---------+
        ^                                            |
        |  proposals                    SSE streaming + vault writes
        |                                            |
+-------+----------+                       +---------v---------+
|  Scholar          |<--- session data -----|  Brain            |
|  (meta-auditor)   |                       |  Flask + SQLite   |
+------------------+                       |  + ChromaDB       |
                                           +---------+---------+
                                                     |
                                             REST API (port 5000)
                                                     |
                                           +---------v---------+
                                           |  Dashboard        |
                                           |  React + Vite     |
                                           +---+---+---+-------+
                                               |   |   |
                                   +-----------+   |   +----------+
                                   |               |              |
                              Google Cal      Anki (8765)    Obsidian
                              /Tasks API      AnkiConnect    CLI wrapper
```

### Request Flow

```
Browser (localhost:5000)
    |
    v
Flask (brain/dashboard/app.py)
    |
    +-- /api/*        --> api_adapter.py (sessions, stats, Obsidian, RAG)
    +-- /api/tutor/*  --> api_tutor.py (40+ endpoints, SSE streaming, chains)
    +-- /api/methods/* --> api_methods.py (composable methods)
    +-- /api/gcal/*   --> gcal.py (Google Calendar)
    +-- /api/scholar/* --> scholar.py (Scholar runs)
    +-- /*            --> serves brain/static/dist/ (React build)
```

---

## Quick Start

```bash
# One-click (recommended)
Start_Dashboard.bat

# Or manually:
pip install -r requirements.txt
cd dashboard_rebuild && npm install && npm run build
python brain/dashboard_web.py
# Open http://localhost:5000
```

> **Note:** Vite outputs directly to `brain/static/dist/` — no copy step needed. Never use `npm run dev`.

---

## Control Plane Pipeline

### CP-MSS v1.0 (6-Stage Pipeline)

Every session follows the Control Plane learning pipeline. Stages execute in dependency order via method block chains.

```
PRIME --> CALIBRATE --> ENCODE --> REFERENCE --> RETRIEVE --> OVERLEARN
   |                                                           |
   +-----------------------------------------------------------+
                    (spaced repetition loop)
```

**The Dependency Law:** No retrieval without targets. Every RETRIEVE stage must be preceded by REFERENCE (target generation).

### Chain Selector (7 Knobs)

The `brain/selector.py` router automatically selects the optimal chain based on 7 input variables:

| Knob | Values | Purpose |
|------|--------|---------|
| `assessment_mode` | procedure, classification, mechanism, definition, recognition | Learning goal type |
| `time_available_min` | 10-120 | Session duration budget |
| `energy` | low, medium, high | User energy level |
| `retrieval_support` | maximal, guided, minimal | Scaffolding level |
| `interleaving_level` | blocked, mixed, full | Topic mixing strategy |
| `near_miss_intensity` | low, medium, high | Adversarial lure density |
| `timed` | off, soft, hard | Time pressure setting |

### First Exposure Chains

| Chain | Duration | Use Case | Stages |
|-------|----------|----------|--------|
| `C-FE-STD` | 35 min | Standard first exposure | PRIME→CALIBRATE→ENCODE→REFERENCE→RETRIEVE |
| `C-FE-MIN` | 20 min | Low energy / short time | PRIME→REFERENCE→RETRIEVE→OVERLEARN |
| `C-FE-PRO` | 45 min | Lab/procedure learning | PRIME→ENCODE→REFERENCE→RETRIEVE (with fault injection) |

### Operating Modes

| Mode | AI Role | Duration | Use Case |
|------|---------|----------|----------|
| Core | Guide | 45-60 min | First-pass structured learning |
| Sprint | Tester | 30-45 min | Gap-finding via rapid-fire testing |
| Quick Sprint | Tester | 20-30 min | Time-boxed Sprint with mandatory wrap |
| Light | Guide | 10-15 min | Micro-session, single objective |
| Drill | Spotter | Variable | Deep practice on a specific weak area |

---

## SOP Library

The **SOP** (Standard Operating Procedure) defines the learning methodology. Source of truth: `sop/library/`.

| # | File | Description |
|---|------|-------------|
| 00 | `00-overview.md` | System identity, version history, library map |
| 01 | `01-core-rules.md` | Behavioral rules: Source-Lock, Seed-Lock, No Phantom Outputs |
| 02 | `02-learning-cycle.md` | CP-MSS v1.0 operational cycle + KWIK encoding micro-loop |
| 03 | `03-frameworks.md` | H/M/Y framework series + L1-L4 depth gating |
| 04 | `04-engines.md` | Anatomy Engine (OIANA+) + Concept Engine |
| 05 | `05-session-flow.md` | Session execution flow (Exposure Check + Split-Track) |
| 06 | `06-modes.md` | Operating modes (Core, Sprint, Light, Quick Sprint, Drill) |
| 07 | `07-workload.md` | 3+2 rotational interleaving + spacing strategy |
| 08 | `08-logging.md` | Logging schema (Session Ledger, Tracker/Enhanced JSON) |
| 09 | `09-templates.md` | Exit ticket, session ledger, weekly plan/review templates |
| 10 | `10-deployment.md` | Deployment guide + Brain ingestion prompts |
| 11 | `11-examples.md` | Command reference and dialogue examples |
| 12 | `12-evidence.md` | Evidence base, research citations, NotebookLM bridge |
| 13 | `13-custom-gpt-system-instructions.md` | Legacy Custom GPT system instructions |
| 14 | `14-lo-engine.md` | Learning Objective Engine protocol pack |
| 15 | `15-method-library.md` | Composable Method Library (46 blocks + chains) |
| 17 | `17-control-plane.md` | Control Plane Constitution (CP-MSS v1.0) |

---

## Brain (Backend)

Flask API + SQLite + ChromaDB. Stores all session data, runs the adaptive tutor engine, serves the dashboard, and integrates with external services.

### Structure

```
brain/
  +-- dashboard/
  |     +-- app.py                # Flask app factory + blueprints
  |     +-- api_adapter.py        # /api/* (sessions, stats, Obsidian, RAG)
  |     +-- api_tutor.py          # /api/tutor/* (40+ endpoints, ~7200 lines)
  |     +-- api_methods.py        # /api/methods/* (composable methods)
  |     +-- gcal.py               # /api/gcal/* (Google Calendar)
  |     +-- calendar.py           # Calendar aggregation
  |     +-- calendar_assistant.py # NL calendar assistant
  |     +-- scholar.py            # /api/scholar/* (Scholar runs)
  |     +-- method_analysis.py    # Method chain analytics
  |     +-- stats.py              # Analytics helpers
  |     +-- utils.py
  +-- data/
  |     +-- pt_study.db           # SQLite database
  |     +-- api_config.json       # Google API config
  |     +-- seed_method_blocks.py # Method block seed data
  +-- session_logs/               # Markdown session logs
  +-- static/dist/                # Compiled React frontend
  +-- tutor_rag.py                # ChromaDB RAG retrieval (MMR, dual-context)
  +-- tutor_chains.py             # Method chain block progression
  +-- tutor_streaming.py          # SSE response formatting + citations
  +-- obsidian_vault.py           # Obsidian CLI wrapper (retry/cache)
  +-- selector.py                 # Control Plane chain selector (7 Knobs)
  +-- selector_bridge.py          # API bridge for selector
  +-- db_setup.py                 # Schema + migrations + error_logs helpers
  +-- config.py                   # App config
  +-- dashboard_web.py            # Flask entrypoint
  +-- tests/                      # pytest suite (916+ tests)
```

### API Endpoints (Key)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/db_health` | DB connection check |
| GET | `/api/sessions` | All sessions (with filters) |
| GET | `/api/sessions/<id>` | Single session |
| GET | `/api/session_stats` | Aggregate stats |
| POST | `/api/tutor/session` | Start tutor session |
| POST | `/api/tutor/turn` | Send a tutor turn (SSE streaming response) |
| GET | `/api/tutor/sessions` | List tutor sessions |
| POST | `/api/tutor/ingest` | Ingest documents for RAG |
| GET | `/api/obsidian/status` | Obsidian vault status |
| GET | `/api/obsidian/files` | List vault files |
| PUT | `/api/obsidian/file` | Save/overwrite vault file |
| GET | `/api/gcal/status` | Google Calendar auth status |
| POST | `/api/gcal/sync` | Two-way calendar sync |
| GET | `/api/methods/blocks` | Method block library |
| GET | `/api/methods/chains` | Method chains |
| POST | `/api/scholar/run` | Run Scholar workflow |

---

## Dashboard (Frontend)

React SPA with a retro arcade theme (high-contrast red/black, terminal fonts).

### Tech Stack

- **React 19** + TypeScript 5.6
- **Vite 7** (build)
- **Tailwind CSS 4** (retro arcade theme)
- **Radix UI** + Shadcn/ui (components)
- **TanStack Query 5** (data fetching)
- **Wouter** (routing)
- **Dnd Kit** (drag-and-drop)
- **Framer Motion** (animations)

### Pages

```
localhost:5000/
  +-- /           Dashboard (overview, quick stats)
  +-- /brain      Brain (session ingestion, logs, Anki sync)
  +-- /calendar   Calendar (Google Calendar/Tasks, local events)
  +-- /scholar    Scholar (runs, proposals, lifecycle panel)
  +-- /tutor      Tutor (chat, sources drawer, Map of Contents, vault authoring)
  +-- /methods    Methods (block library, chains, analytics)
```

### Build + Deploy

```
dashboard_rebuild/          brain/static/dist/
  client/src/                     |
     |                            | Flask serves this
     | npm run build              | at localhost:5000
     v                            |
  build output writes directly --->+
```

Never use `npm run dev`. Build with `npm run build` in `dashboard_rebuild` and run via `Start_Dashboard.bat`.

---

## Adaptive Tutor

The tutor is a **native Flask application** — not a Custom GPT. It runs entirely within the Brain server with RAG-powered retrieval over ingested course materials.

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| API endpoints | `brain/dashboard/api_tutor.py` | 40+ endpoints, SSE streaming, session orchestration |
| RAG retrieval | `brain/tutor_rag.py` | ChromaDB + text-embedding-3-small, MMR, dual-context search |
| Chain engine | `brain/tutor_chains.py` | Method block progression through CP-MSS stages |
| Streaming | `brain/tutor_streaming.py` | SSE response formatting with inline citations |
| Vault writes | `brain/obsidian_vault.py` | Fire-and-forget Obsidian CLI wrapper with retry/cache |
| Frontend | `dashboard_rebuild/client/src/pages/tutor.tsx` | Chat UI, sources drawer, Map of Contents |
| Templates | `sop/templates/notes/` | 5 block artifact templates (str.format_map) |

### How It Works

```
User selects materials + starts session
    |
    v
Selector (7 Knobs) --> picks chain (e.g., C-FE-STD)
    |
    v
Chain engine steps through method blocks:
    PRIME block --> CALIBRATE block --> ENCODE block --> ...
    |                                                    |
    |  Each block turn:                                  |
    |  1. RAG retrieval (ChromaDB, scoped to materials) |
    |  2. LLM generation (GPT-4o / speed tier model)     |
    |  3. SSE streaming to frontend                      |
    |  4. Fire-and-forget vault write (if artifact)      |
    |                                                    |
    v
Session wrap --> Exit Ticket + Session Ledger --> DB
```

### Speed Tiers

The tutor supports configurable speed/quality tradeoffs per turn:

| Tier | Model | Reasoning | RAG | Use Case |
|------|-------|-----------|-----|----------|
| Fast | gpt-4o-mini | None | Parallel | Quick responses, simple queries |
| Balanced | gpt-4o | Standard | Standard | Default teaching mode |
| Deep | gpt-4o | Extended | Full | Complex explanations, procedures |

---

## Scholar (Meta-Auditor)

The Scholar audits the study system itself. It reads session logs, detects friction, and proposes evidence-based improvements.

```
Session Logs + DB
       |
       v
  Scholar Pipeline
  +-- brain_reader.py       (reads Brain DB)
  +-- telemetry_snapshot.py  (snapshot metrics)
  +-- friction_alerts.py     (detect friction)
       |
       v
  Orchestrator Run
  +-- Review --> Plan --> Research --> Proposals --> Digest
       |
       v
  scholar/outputs/
    +-- review/          Run summaries
    +-- digests/         Thematic clustering
    +-- proposals/       Change RFCs (approved/rejected)
    +-- module_audits/   SOP module deep-dives
    +-- reports/         Routine audits
```

**Core rules:** One-change-only proposals. Human review required. Evidence-first.

---

## External Integrations

```
+------------------+       +------------------+       +------------------+
|  Google Calendar |       |  Anki Desktop    |       |  Obsidian        |
|  /Tasks API      |       |  (AnkiConnect)   |       |  (CLI wrapper)   |
+--------+---------+       +--------+---------+       +--------+---------+
         |                          |                          |
    OAuth 2.0                  port 8765               obsidian_vault.py
         |                          |                  (retry + cache)
+--------v---------+       +--------v---------+       +--------v---------+
|  brain/gcal.py   |       |  AnkiIntegration |       |  Vault read/     |
|  Two-way sync    |       |  card_drafts --> |       |  write + template |
|  events + tasks  |       |  Anki decks      |       |  rendering        |
+------------------+       +------------------+       +------------------+

+------------------+
|  OpenAI API      |
|  (GPT-4o +       |
|   embeddings)    |
+--------+---------+
         |
    API key auth
         |
+--------v---------+
|  Tutor LLM +     |
|  text-embedding-  |
|  3-small (RAG)   |
+------------------+
```

| Integration | Purpose | Connection |
|-------------|---------|------------|
| **Google Calendar/Tasks** | Two-way sync of study events + tasks | OAuth 2.0 via `brain/gcal.py` |
| **Anki** | Sync card drafts to Anki Desktop | AnkiConnect on port 8765 |
| **Obsidian** | Vault reads/writes + template rendering | CLI wrapper (`brain/obsidian_vault.py`) |
| **OpenAI API** | Tutor LLM (GPT-4o) + embeddings (text-embedding-3-small) | API key via environment |

---

## Database

SQLite at `brain/data/pt_study.db`. Schema managed in `brain/db_setup.py`.

### Tables (25+ total, 16 tutor-specific)

```
+------------------+     +------------------+     +------------------+
|  sessions (90+)  |---->|  lo_sessions     |---->|  learning_       |
|  cols            |     |  (junction)      |     |  objectives      |
+------------------+     +------------------+     +------------------+
        |
        +----------->  topics           courses         course_events
        +----------->  topic_mastery    modules         study_tasks
        +----------->  tutor_turns      tutor_issues    planner_settings

+------------------+     +------------------+     +------------------+
|  card_drafts     |     |  rag_docs        |     |  ingested_files  |
|  (Anki staging)  |     |  (RAG index)     |     |  (checksums)     |
+------------------+     +------------------+     +------------------+

+------------------+     +------------------+     +------------------+
|  scholar_runs    |     |  scholar_digests |     |  scholar_         |
|                  |     |                  |     |  proposals        |
+------------------+     +------------------+     +------------------+

+------------------+     +------------------+     +------------------+
|  method_blocks   |     |  method_chains   |     |  method_ratings  |
|  (46 blocks,     |     |  (CP chain defs) |     |  (user ratings)  |
|   6 CP stages)   |     |                  |     |                  |
+------------------+     +------------------+     +------------------+

+------------------+     +------------------+     +------------------+
|  error_logs      |     |  calendar_action |     |  scraped_events  |
|  (CP telemetry)  |     |  _ledger         |     |  (staging)       |
+------------------+     +------------------+     +------------------+
```

### Control Plane Telemetry (error_logs)

The `error_logs` table enables deterministic routing by tracking granular item-level failures:

| Column | Purpose |
|--------|---------|
| `error_type` | Classification: Recall, Confusion, Rule, Representation, Procedure, Computation, Speed |
| `stage_detected` | Control Plane stage where error occurred (RETRIEVE, CALIBRATE, etc.) |
| `confidence` | H/M/L — Used to calculate HCWR (High-Confidence Wrong Rate) |
| `time_to_answer` | Latency in seconds — Used for speed error detection |
| `active_knobs` | JSON of active parameters — Enables A/B testing of knob effectiveness |
| `fix_applied` | Which method override was triggered (e.g., M-ENC-010) |

---

## Development

### Prerequisites

- Python 3.10+
- Node.js 18+
- SQLite 3
- OpenAI API key (for tutor LLM + embeddings)

### Commands

```bash
# Start dashboard (recommended)
Start_Dashboard.bat

# Run tests (916+ tests)
pytest brain/tests/

# Build frontend (outputs directly to brain/static/dist/)
cd dashboard_rebuild && npm run build

# Run Scholar
scripts/run_scholar.bat
```

### Post-Change Checklist

1. **Backend changes:** `pytest brain/tests/`
2. **Frontend changes:** `npm run build` in `dashboard_rebuild` + restart Flask
3. **SOP changes:** Update method blocks in DB if block definitions changed

---

## Repo Layout

```
pt-study-sop/
+-- brain/                  # Flask backend + SQLite + ChromaDB
|   +-- dashboard/          #   API routes + app factory
|   |     +-- api_tutor.py  #   Tutor endpoints (40+, ~7200 lines)
|   +-- data/               #   Database + config
|   +-- session_logs/       #   Markdown session logs
|   +-- static/dist/        #   Compiled React frontend
|   +-- tests/              #   pytest suite (916+ tests)
|   +-- tutor_rag.py        #   ChromaDB RAG retrieval
|   +-- tutor_chains.py     #   Method chain progression
|   +-- tutor_streaming.py  #   SSE streaming + citations
|   +-- obsidian_vault.py   #   Obsidian CLI wrapper
|   +-- selector.py         #   CP chain selector (7 Knobs)
|   +-- db_setup.py         #   Schema + migrations
|   +-- dashboard_web.py    #   Flask entrypoint
+-- dashboard_rebuild/      # React frontend source
|   +-- client/src/         #   Pages, components, API client
|   +-- package.json        #   Dependencies
+-- sop/                    # Study Operating Procedure
|   +-- library/            #   Canonical SOP (17 files)
|   +-- templates/notes/    #   Block artifact templates
|   +-- runtime/            #   Generated bundles (legacy)
|   +-- tools/              #   Build + validation scripts
+-- scholar/                # Meta-auditor
|   +-- outputs/            #   Reviews, digests, proposals
|   +-- workflows/          #   Standard workflows
|   +-- brain_reader.py     #   Reads Brain DB
+-- conductor/              # Product definition + roadmap
|   +-- product.md          #   One-page PRD
|   +-- tech-stack.md       #   Tech stack
|   +-- tracks.md           #   Active tracks
|   +-- workflow.md         #   Task workflow
+-- docs/                   # System documentation
|   +-- TUTOR_ARCHITECTURE.md  # Visual tutor architecture (Mermaid)
+-- scripts/                # Automation scripts
+-- exports/                # Generated exports (spreadsheets, etc.)
+-- Start_Dashboard.bat     # One-click launcher
+-- requirements.txt        # Python dependencies
```

## More Docs

| Doc | Location |
|-----|----------|
| Docs index (canonical) | `docs/README.md` |
| Tutor architecture (visual) | `docs/TUTOR_ARCHITECTURE.md` |
| Developer guide | `docs/root/GUIDE_DEV.md` |
| Architecture | `docs/root/PROJECT_ARCHITECTURE.md` |
| User guide | `docs/root/GUIDE_USER.md` |
| SOP overview | `sop/library/00-overview.md` |
| Product definition | `conductor/product.md` |
| Calendar/Tasks | `docs/calendar_tasks.md` |
| Dashboard inventory | `docs/dashboard/DASHBOARD_WINDOW_INVENTORY.md` |

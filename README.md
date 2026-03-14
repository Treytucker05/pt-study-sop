# PT Study OS (runtime prompt v9.5.2)

This file is the master repo truth for `C:\pt-study-sop`.

Use it for:
- product and subsystem identity
- route meaning and ownership
- source-of-truth order
- non-negotiable operating laws

If another active doc disagrees with this file on product meaning, route ownership, or source-of-truth order, that other doc is wrong and must be corrected or removed.

## Table of Contents

- [Repo Truth Order](#repo-truth-order)
- [Core Identity](#core-identity)
- [Ownership And Routes](#ownership-and-routes)
- [Locked Operating Laws](#locked-operating-laws)
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
- [Troubleshooting](#troubleshooting)
- [Repo Layout](#repo-layout)
- [More Docs](#more-docs)

---

## Repo Truth Order

When repo sources disagree, use this order:

1. `README.md`
2. `AGENTS.md` for agent working policy only
3. `sop/library/17-control-plane.md` plus active SOP methods and chains for pedagogy and control-plane semantics
4. `docs/root/PROJECT_ARCHITECTURE.md` for runtime and technical wiring
5. `docs/root/GUIDE_DEV.md` for build, run, and test commands
6. execution-only surfaces:
   - `docs/root/TUTOR_TODO.md`
   - `docs/root/AGENT_BOARD.md`
   - `conductor/tracks.md`
   - `conductor/tracks/GENERAL/log.md`

## Core Identity

PT Study OS is a personal 3-part study system for one learner:

- **Brain** is the home surface and learner-model engine.
- **Tutor** is the live study workspace and protocol executor.
- **Scholar** is the system-facing investigation and improvement console.

The system is not a generic chatbot, not a set of equal peer pages fighting for center stage, and not an institution platform. Brain is where the learner lands. Tutor is where the learner does the work. Scholar is where the system researches friction and proposes bounded improvements.

## Ownership And Routes

| Surface | Owns | Must not own |
|--------|------|--------------|
| **Brain** | home/dashboard, learner profile, telemetry, mastery framing, support-system launch points | public study-workspace sprawl, direct pedagogy control |
| **Tutor** | launch, live study workspace shell, notes/canvas/graph/table, artifacts, resume/restore, structured teaching flow | generic dashboard behavior, unbounded off-protocol teaching |
| **Scholar** | investigations, focused learner questions when blocked, findings, bounded strategy proposals, system research | live course teaching, direct Tutor control, replacing Brain home |
| **Library** | what Tutor can teach through material scope | how Tutor teaches |
| **SOP library** | how Tutor teaches through stages, methods, chains, and rules | course-content truth |

| Route | Meaning |
|------|---------|
| `/` and `/brain` | Brain home |
| `/tutor` | Tutor live workspace shell |
| `/scholar` | Scholar investigation console |
| `/library` | Library support system |
| `/calendar` | Calendar support system |
| `/mastery` | Mastery support system |
| `/methods` | Methods support system |
| `/vault-health` | Vault Health support system |

## Locked Operating Laws

1. Tutor is the bread-and-butter product value. Optimize the live study experience first.
2. Brain is the canonical home surface.
3. Library controls what Tutor teaches.
4. SOP controls how Tutor teaches.
5. Tutor owns the active study workspace and artifact flow.
6. Brain stays evidence-first and must not directly steer Tutor.
7. Scholar is system-facing and does not become the course-content teacher.
8. Obsidian is the durable note home.
9. Archive and old tracks are evidence, not authority.

## Tutor Defaults

- Tutor behavior is modeled as `Category -> Method -> Knob -> Chain`.
- Default operating assumption is first exposure unless the session has strong prior-mastery evidence.
- `PRIME` is non-assessment structure and teaching. `CALIBRATE` is where assessment begins.
- Tutor-generated Obsidian notes must include wiki links at creation time, not as deferred cleanup.
- Mind Map uses `ASCII` as the project-default representation knob unless a session explicitly overrides it.

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
| **SOP** | Defines *how* learning happens (rules, methods, chains, control-plane contracts) | `sop/library/` |
| **Study Materials Library** | Defines *what* Tutor teaches by managing the learner's class materials | `/library` route + `brain/data/` |
| **Brain** | Stores sessions, telemetry, artifact metadata, indexes, and operational state | `brain/` |
| **Tutor** | Protocol-led study operator that executes the active chain against the learner's selected scope | `brain/dashboard/api_tutor.py` |
| **App Shell** | Serves the Brain, Tutor, Scholar, and support-system routes through the React frontend | `dashboard_rebuild/` |
| **Scholar** | Reads Brain outputs, researches patterns, and proposes evidence-based improvements | `scholar/` |

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
```

> **Note:** Vite outputs directly to `brain/static/dist/` — no copy step needed. Never use `npm run dev`, and do not start the dashboard through a direct Flask command. Use `Start_Dashboard.bat`.

### First Study Session

1. Launch the app with `Start_Dashboard.bat`.
2. Upload at least one study file on `/library`.
3. Open `/tutor`, use the Tutor start panel to choose or resume the course/material scope, and start the session.
4. Follow the active chain. Wrap writes the `Exit Ticket + Session Ledger` to Brain and, when enabled, to Obsidian and Anki.

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

> **Not to be confused with the `/library` page** which manages study materials (PDFs, notes, slides).
> `sop/library/` defines the **methodology** — *how* the tutor teaches. Study materials are stored in `brain/data/`.

The **SOP** (Standard Operating Procedure) defines the learning methodology. Source of truth: `sop/library/`.

For runtime wiring details and endpoint/state maps, use `docs/root/PROJECT_ARCHITECTURE.md`.

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
| GET | `/api/db/health` | DB connection check |
| GET | `/api/sessions` | All sessions (with filters) |
| GET | `/api/sessions/<id>` | Single session |
| GET | `/api/sessions/stats` | Aggregate stats |
| POST | `/api/tutor/session` | Start tutor session |
| GET | `/api/tutor/session/<id>` | Load tutor session state |
| POST | `/api/tutor/session/<id>/turn` | Send a tutor turn (SSE streaming response) |
| GET | `/api/tutor/sessions` | List tutor sessions |
| GET | `/api/tutor/materials` | List Library-backed study materials |
| POST | `/api/tutor/materials/sync` | Sync configured material roots into Library |
| GET | `/api/obsidian/status` | Obsidian vault status |
| GET | `/api/obsidian/files` | List vault files |
| PUT | `/api/obsidian/file` | Save/overwrite vault file |
| GET | `/api/gcal/status` | Google Calendar auth status |
| POST | `/api/gcal/sync` | Two-way calendar sync |
| GET | `/api/methods` | Method block library |
| GET | `/api/chains` | Method chains |
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
  +-- /            Brain home
  +-- /brain       Brain home alias
  +-- /tutor       Tutor live workspace
  +-- /scholar     Scholar investigation console
  +-- /library     Library support system
  +-- /calendar    Calendar support system
  +-- /mastery     Mastery support system
  +-- /methods     Methods support system
  +-- /vault-health Vault Health support system
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
| API endpoints | `brain/dashboard/api_tutor.py` | Tutor registration/config hub plus split route imports |
| RAG retrieval | `brain/tutor_rag.py` | ChromaDB + Gemini Embedding 2 preview by default, MMR, dual-context search |
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
    |  2. LLM generation (Codex API / speed tier model)   |
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
| Fast | gpt-5.3-codex-spark | None | Parallel | Quick responses, simple queries |
| Balanced | gpt-5.3-codex | Standard | Standard | Default teaching mode |
| Deep | gpt-5.3-codex | Extended | Full | Complex explanations, procedures |

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
|  Tutor models    |
|  (gpt-5.3-codex  |
|   + Gemini/OpenAI|
|   embeddings)    |
+--------+---------+
         |
    Codex CLI auth
    + env-backed embedding config
         |
+--------v---------+
|  Tutor LLM +     |
|  Gemini Embedding|
|  2 preview       |
|  (OpenAI fallback)|
+------------------+
```

| Integration | Purpose | Connection |
|-------------|---------|------------|
| **Google Calendar/Tasks** | Two-way sync of study events + tasks | OAuth 2.0 via `brain/gcal.py` |
| **Anki** | Sync card drafts to Anki Desktop | AnkiConnect on port 8765 |
| **Obsidian** | Vault reads/writes + template rendering | CLI wrapper (`brain/obsidian_vault.py`) |
| **Tutor model + embeddings** | Tutor LLM (`gpt-5.3-codex`) with Gemini Embedding 2 preview by default and OpenAI fallback only when configured | Codex CLI auth + `GEMINI_API_KEY` or fallback embedding env vars |

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
- Codex CLI authenticated (`codex login`) for tutor LLM
- `GEMINI_API_KEY` for the default embedding path
- Optional fallback only: `OPENAI_API_KEY` if you intentionally switch embeddings back to OpenAI

### Commands

```bash
# Start dashboard (recommended)
Start_Dashboard.bat

# Validate hermetic harness prerequisites
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Bootstrap -Profile Hermetic -Json

# Run tests (916+ tests)
pytest brain/tests/

# Build frontend (outputs directly to brain/static/dist/)
cd dashboard_rebuild && npm run build

# Run Scholar
scripts/run_scholar.bat
```

The repo-local harness contract lives in `docs/root/GUIDE_DEV.md` and
`scripts/README.md`. `powershell` is the canonical Windows example and `pwsh`
is an accepted equivalent used in CI.

### Post-Change Checklist

1. **Backend changes:** `pytest brain/tests/`
2. **Frontend changes:** `npm run build` in `dashboard_rebuild` + restart Flask
3. **SOP changes:** Update method blocks in DB if block definitions changed

---

## Troubleshooting

- **Nothing shows or the wrong server starts:** always launch with `Start_Dashboard.bat`. Do not use `npm run dev`.
- **Frontend changes do not appear:** rebuild with `cd dashboard_rebuild && npm run build`, restart the app, then hard refresh the browser.
- **Tutor shell loads stale or broken JS:** rebuild the frontend, restart Flask, and hard refresh.
- **Tutor delete/reporting feels inconsistent:** use the returned `request_id` and inspect the persisted Tutor delete telemetry for the exact failure path.
- **Bulk delete leaves the UI stuck:** rebuild, restart, hard refresh, then retry. The intended closeout flow is the themed in-panel confirm, not a stale overlay.
- **Tutor responses are slow:** disable extra toggles you do not need and verify material scope on the turn request.
- **Tutor seems to ignore selected files:** inspect the `turn` request payload and confirm `content_filter.material_ids` contains the full selection.

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
| Docs index | `docs/README.md` |
| Tutor architecture (visual) | `docs/TUTOR_ARCHITECTURE.md` |
| Developer guide | `docs/root/GUIDE_DEV.md` |
| Architecture | `docs/root/PROJECT_ARCHITECTURE.md` |
| SOP overview | `sop/library/00-overview.md` |
| Product definition | `conductor/product.md` |
| Calendar/Tasks | `docs/calendar_tasks.md` |
| Dashboard inventory | `docs/dashboard/DASHBOARD_WINDOW_INVENTORY.md` |

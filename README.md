# PT Study OS v9.5 (runtime prompt v9.5.2)

A local-first, AI-powered study operating system for DPT coursework. Every session follows the **Control Plane** learning pipeline (CP-MSS v1.0) with deterministic logging, citation-first teaching, and continuous improvement via Scholar meta-audits.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture](#architecture)
- [Quick Start (Custom GPT)](#quick-start-custom-gpt)
- [Quick Start (Dashboard)](#quick-start-dashboard)
- [Session Flow](#session-flow)
- [SOP Library](#sop-library)
- [Brain (Backend)](#brain-backend)
- [Dashboard (Frontend)](#dashboard-frontend)
- [Scholar (Meta-Auditor)](#scholar-meta-auditor)
- [External Integrations](#external-integrations)
- [Database](#database)
- [Development](#development)
- [Repo Layout](#repo-layout)
- [More Docs](#more-docs)

---

## System Overview

Four pillars work in a continuous loop:

```
  SOP (methodology)          Brain (data store)
       |                          |
       v                          v
  CustomGPT Tutor -----> Session Logs + DB
       |                          |
       v                          v
  Scholar (auditor) <---- Dashboard (metrics)
       |
       v
  Proposals --> approved --> SOP updates --> rebuild runtime --> redeploy
```

| Pillar | What It Does | Location |
|--------|-------------|----------|
| **SOP** | Defines *how* learning happens (15 library files) | `sop/library/` |
| **Brain** | Stores sessions, serves API, hosts dashboard | `brain/` |
| **Dashboard** | Surfaces metrics, manages ingestion, calendar, Anki | `dashboard_rebuild/` |
| **Scholar** | Audits session logs, proposes evidence-based improvements | `scholar/` |

---

## Architecture

### High-Level Data Flow

```
+------------------+     runtime prompt      +------------------+
|  SOP Library     |------------------------>|  Custom GPT      |
|  (15 .md files)  |     + 6 knowledge       |  (Tutor)         |
+------------------+       bundles           +--------+---------+
        ^                                             |
        |  proposals                     Exit Ticket + Session Ledger
        |                                             |
+-------+----------+                        +---------v---------+
|  Scholar          |<--- session data ------|  Brain            |
|  (meta-auditor)   |                        |  Flask + SQLite   |
+------------------+                        +---------+---------+
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
                               /Tasks API      AnkiConnect    REST API
```

### Request Flow (Dashboard)

```
Browser (localhost:5000)
    |
    v
Flask (brain/dashboard/app.py)
    |
    +-- /api/*  --> api_adapter.py (sessions, stats, Obsidian)
    +-- /api/*  --> api_methods.py (composable methods)
    +-- /api/gcal/*  --> gcal.py (Google Calendar)
    +-- /api/scholar/* --> scholar.py (Scholar runs)
    +-- /*      --> serves brain/static/dist/ (React build)
```

---

## Quick Start (Custom GPT)

1. Build the runtime bundle:
   ```bash
   python sop/tools/build_runtime_bundle.py
   ```
2. Create a Custom GPT (GPT-4.5 recommended).
3. Paste `sop/runtime/custom_instructions.md` into the **Instructions** field.
4. Upload the 6 knowledge files in order:
   1. `sop/runtime/knowledge_upload/00_INDEX_AND_RULES.md`
   2. `sop/runtime/knowledge_upload/01_MODULES_M0-M6.md`
   3. `sop/runtime/knowledge_upload/02_FRAMEWORKS.md`
   4. `sop/runtime/knowledge_upload/03_ENGINES.md`
   5. `sop/runtime/knowledge_upload/04_LOGGING_AND_TEMPLATES.md`
   6. `sop/runtime/knowledge_upload/05_EXAMPLES_MINI.md`
5. Paste `sop/runtime/runtime_prompt.md` as the **first user message**.
6. Run the session. At Wrap, the Tutor outputs **Exit Ticket + Session Ledger** only (Lite Wrap).
7. Post-session: produce JSON via Brain ingestion prompts (schema v9.5, see `sop/library/10-deployment.md`).

## Quick Start (Dashboard)

```bash
# One-click
Start_Dashboard.bat

# Or manually:
pip install -r requirements.txt
cd dashboard_rebuild && npm install && npm run build
python brain/dashboard_web.py
# Open http://localhost:5000
```

> **Note:** Vite outputs directly to `brain/static/dist/` - no copy step needed.

---

## Session Flow

### The Exposure Check (v9.5 Split-Track)

Every session begins with an **Exposure Check**: *"Have you seen this material before?"*

```
                    +-------------------+
                    |  "Have you seen   |
                    |  this material    |
                    |  before?"         |
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
     "No / First time"              "Yes / Review"
              |                             |
              v                             v
     +--------+--------+          +--------+--------+
     |   TRACK A        |          |   TRACK B        |
     |   First Exposure  |          |   Review          |
     +------------------+          +------------------+
     | 1. Get materials  |          | 1. Set target     |
     | 2. Map structure  |          | 2. Gather sources |
     | 3. Build plan     |          | 3. Build plan     |
     | 4. NO pre-test    |          | 4. Pre-test       |
     +--------+----------+          +--------+----------+
              |                             |
              +-------------+---------------+
                            |
                            v
                   +--------+--------+
                   |   M1-M6 Flow    |
                   |   (same for     |
                   |    both tracks)  |
                   +-----------------+
```

### Full Session Flow (M0-M6)

```
M0: PLANNING
  Exposure Check --> Track A or Track B --> plan locked
       |
       v
M1: ENTRY
  Mode selection (Core/Sprint/Light/Drill) + activation prompt
       |
       v
M2: PRIME
  Bucket the material (H-series structural scan)
       |
       v
M3: ENCODE
  Function-first teaching (KWIK micro-loop)
  L2 teach-back required before advancing to L3/L4
       |
       v
M4: BUILD
  Faded scaffolding + interleaving + retrieval practice
       |
       v
M5: MODES
  Mode-specific behavior (Core = guide, Sprint = tester, etc.)
       |
       v
M6: WRAP
  Exit Ticket: blurt + muddiest point + next-action hook
  Session Ledger: date, covered, not_covered, weak_anchors, artifacts, timebox
  (JSON produced AFTER session via Brain ingestion)
```

### Post-Session Ingestion

```
Tutor Output (plain text)            Brain Ingestion
+------------------------+           +------------------------+
| Exit Ticket            |  paste    | Session Record         |
| Session Ledger         | -------> | Enhanced JSON          |
+------------------------+           +----------+-------------+
                                                |
                                                v
                                     +----------+-------------+
                                     | SQLite DB              |
                                     | sessions table         |
                                     | (90+ columns)          |
                                     +----------+-------------+
                                                |
                                                v
                                     +----------+-------------+
                                     | Dashboard              |
                                     | metrics + analytics    |
                                     +------------------------+
```

---

## SOP Library

The **SOP** (Standard Operating Procedure) defines the learning methodology. Source of truth: `sop/library/`.

| # | File | Description |
|---|------|-------------|
| 00 | `00-overview.md` | System identity, version history, library map |
| 01 | `01-core-rules.md` | Behavioral rules: Source-Lock, Seed-Lock, No Phantom Outputs |
| 02 | `02-learning-cycle.md` | PEIRRO macro cycle + KWIK encoding micro-loop |
| 03 | `03-frameworks.md` | H/M/Y framework series + L1-L4 depth gating |
| 04 | `04-engines.md` | Anatomy Engine (OIANA+) + Concept Engine |
| 05 | `05-session-flow.md` | M0-M6 execution flow (Exposure Check + Split-Track) |
| 06 | `06-modes.md` | Operating modes (Core, Sprint, Light, Quick Sprint, Drill) |
| 07 | `07-workload.md` | 3+2 rotational interleaving + spacing strategy |
| 08 | `08-logging.md` | Logging schema v9.4 (Session Ledger, Tracker/Enhanced JSON) |
| 09 | `09-templates.md` | Exit ticket, session ledger, weekly plan/review templates |
| 10 | `10-deployment.md` | Custom GPT deployment guide + Brain ingestion prompts |
| 11 | `11-examples.md` | Command reference and dialogue examples |
| 12 | `12-evidence.md` | Evidence base, research citations, NotebookLM bridge |
| 13 | `13-custom-gpt-system-instructions.md` | Custom GPT system instructions (v9.5) |
| 14 | `14-lo-engine.md` | Learning Objective Engine protocol pack |
| 15 | `15-method-library.md` | Composable Method Library (blocks + chains) |
| 17 | `17-control-plane.md` | Control Plane Constitution (CP-MSS v1.0) |

### Core Methodology

**Control Plane Learning Pipeline** (CP-MSS v1.0):
```
PRIME --> CALIBRATE --> ENCODE --> REFERENCE --> RETRIEVE --> OVERLEARN
   |                                                           |
   +-----------------------------------------------------------+
                    (spaced repetition loop)
```

**The Dependency Law:** No retrieval without targets. Every RETRIEVE stage must be preceded by REFERENCE (target generation).

**Chain Selector (7 Knobs):**

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

**First Exposure Chains:**

| Chain | Duration | Use Case | Stages |
|-------|----------|----------|--------|
| `C-FE-STD` | 35 min | Standard first exposure | PRIME→CALIBRATE→ENCODE→REFERENCE→RETRIEVE |
| `C-FE-MIN` | 20 min | Low energy / short time | PRIME→REFERENCE→RETRIEVE→OVERLEARN |
| `C-FE-PRO` | 45 min | Lab/procedure learning | PRIME→ENCODE→REFERENCE→RETRIEVE (with fault injection) |

**Operating Modes:**

| Mode | AI Role | Duration | Use Case |
|------|---------|----------|----------|
| Core | Guide | 45-60 min | First-pass structured learning |
| Sprint | Tester | 30-45 min | Gap-finding via rapid-fire testing |
| Quick Sprint | Tester | 20-30 min | Time-boxed Sprint with mandatory wrap |
| Light | Guide | 10-15 min | Micro-session, single objective |
| Drill | Spotter | Variable | Deep practice on a specific weak area |

### Runtime Bundle

Built from `sop/library/` via `python sop/tools/build_runtime_bundle.py`:

```
sop/library/ (15 files)
       |
       | build_runtime_bundle.py
       v
sop/runtime/
  +-- runtime_prompt.md          (paste as first user message)
  +-- custom_instructions.md     (paste into GPT Instructions)
  +-- knowledge_upload/          (upload to GPT Knowledge)
       +-- 00_INDEX_AND_RULES.md
       +-- 01_MODULES_M0-M6.md
       +-- 02_FRAMEWORKS.md
       +-- 03_ENGINES.md
       +-- 04_LOGGING_AND_TEMPLATES.md
       +-- 05_EXAMPLES_MINI.md
```

---

## Brain (Backend)

Flask API + SQLite database. Stores all session data, serves the dashboard, and integrates with external services.

### Structure

```
brain/
  +-- dashboard/
  |     +-- app.py              # Flask app factory + blueprints
  |     +-- api_adapter.py      # /api/* (sessions, stats, Obsidian, RAG)
  |     +-- api_methods.py      # /api/methods/* (composable methods)
  |     +-- gcal.py             # /api/gcal/* (Google Calendar)
  |     +-- calendar.py         # Calendar aggregation
  |     +-- calendar_assistant.py  # NL calendar assistant
  |     +-- scholar.py          # /api/scholar/* (Scholar runs)
  |     +-- method_analysis.py  # Method chain analytics
  |     +-- stats.py            # Analytics helpers
  |     +-- utils.py
  |     +-- routes.py           # Legacy routes
  |     +-- v3_routes.py        # v3 routes
  +-- data/
  |     +-- pt_study.db         # SQLite database
  |     +-- api_config.json     # Google API config
  |     +-- seed_method_blocks.py  # Method block seed data
  +-- session_logs/             # Markdown session logs
  +-- static/dist/              # Compiled React frontend
  +-- db_setup.py               # Schema + migrations
  +-- config.py                 # App config
  +-- dashboard_web.py          # Flask entrypoint
  +-- selector.py               # Control Plane chain selector (7 Knobs)
  +-- selector_bridge.py        # API bridge for selector
  +-- db_setup.py               # Schema + migrations + error_logs helpers
  +-- tests/                    # pytest suite (56 tests)
```

### API Endpoints (Key)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/db_health` | DB connection check |
| GET | `/api/sessions` | All sessions (with filters) |
| GET | `/api/sessions/<id>` | Single session |
| GET | `/api/session_stats` | Aggregate stats |
| GET | `/api/obsidian/health` | Obsidian plugin status |
| GET | `/api/obsidian/files` | List vault files |
| POST | `/api/obsidian/save` | Save/append to vault |
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
  +-- /tutor      Tutor (SOP explorer, chat interface)
  +-- /methods    Methods (block library, chains, analytics)
```

### Build + Deploy

```
dashboard_rebuild/          brain/static/dist/
  client/src/                     |
     |                            | Flask serves this
     | npm run build              | at localhost:5000
     v                            |
  dist/public/ --- robocopy ----->+
```

Never use `npm run dev`. Always build and copy.

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
|  /Tasks API      |       |  (AnkiConnect)   |       |  (REST API)      |
+--------+---------+       +--------+---------+       +--------+---------+
         |                          |                          |
    OAuth 2.0                  port 8765                  port 27124
         |                          |                          |
+--------v---------+       +--------v---------+       +--------v---------+
|  brain/gcal.py   |       |  AnkiIntegration |       |  api_adapter.py  |
|  Two-way sync    |       |  card_drafts --> |       |  Vault read/     |
|  events + tasks  |       |  Anki decks      |       |  write           |
+------------------+       +------------------+       +------------------+

+------------------+       +------------------+
|  NotebookLM      |       |  Custom GPT      |
|  (manual)        |       |  (Tutor)         |
+--------+---------+       +--------+---------+
         |                          |
   Source Packets             Runtime bundle
   (copy/paste)               (upload + paste)
         |                          |
+--------v---------+       +--------v---------+
|  Tutor session   |       |  SOP runtime     |
|  Source-Lock      |       |  6 knowledge     |
|  required         |       |  files + prompt  |
+------------------+       +------------------+
```

| Integration | Purpose | Connection |
|-------------|---------|------------|
| **Google Calendar/Tasks** | Two-way sync of study events + tasks | OAuth 2.0 via `brain/gcal.py` |
| **Anki** | Sync card drafts to Anki Desktop | AnkiConnect on port 8765 |
| **Obsidian** | Append session notes to vault | Local REST API on port 27124 |
| **NotebookLM** | Source-locked RAG (factual teaching) | Manual copy/paste of Source Packets |
| **Custom GPT** | AI Tutor running the SOP | Upload runtime bundle + paste prompt |

---

## Database

SQLite at `brain/data/pt_study.db`. Schema managed in `brain/db_setup.py`.

### Tables (25+ total)

```
+------------------+     +------------------+     +------------------+
|  sessions (90+)  |---->|  lo_sessions     |---->|  learning_       |
|  cols, v9.4      |     |  (junction)      |     |  objectives      |
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
|  (46 CP stages)  |     |  (6 CP chains)   |     |  (user ratings)  |
+------------------+     +------------------+     +------------------+

+------------------+     +------------------+     +------------------+
|  error_logs      |     |  calendar_action |     |  scraped_events  |
|  (CP telemetry)  |     |  _ledger         |     |  (staging)       |
+------------------+     +------------------+     +------------------+
```

### Key Session Fields

| Category | Fields |
|----------|--------|
| Planning | `target_exam`, `source_lock`, `plan_of_attack` |
| Coverage | `main_topic`, `subtopics`, `frameworks_used`, `engines_used` |
| Ratings | `understanding_level`, `retention_confidence`, `rsr_percent` |
| Anchors | `anchors_locked`, `weak_anchors`, `confusions` |
| WRAP | `anki_cards_text`, `glossary_entries`, `wrap_watchlist` |
| Logging | `tracker_json`, `enhanced_json`, `exit_ticket_blurt` |
| Session Ledger | `covered`, `not_covered`, `artifacts_created`, `timebox_min` |

### Control Plane Telemetry (error_logs)

The `error_logs` table enables deterministic routing by tracking granular item-level failures:

| Column | Purpose |
|--------|---------|
| `error_type` | Classification: Recall, Confusion, Rule, Representation, Procedure, Computation, Speed |
| `stage_detected` | Control Plane stage where error occurred (RETRIEVE, CALIBRATE, etc.) |
| `confidence` | H/M/L - Used to calculate HCWR (High-Confidence Wrong Rate) |
| `time_to_answer` | Latency in seconds - Used for speed error detection |
| `active_knobs` | JSON of active parameters - Enables A/B testing of knob effectiveness |
| `fix_applied` | Which method override was triggered (e.g., M-ENC-010) |

**Helper Functions** (in `db_setup.py`):
- `log_error()` - Insert error log entry
- `get_dominant_error()` - Get most frequent error for selector input
- `get_error_stats()` - Calculate HCWR, median latency, error distribution

---

## Development

### Prerequisites

- Python 3.10+
- Node.js 18+
- SQLite 3

### Commands

```bash
# Run tests
pytest brain/tests/

# Build frontend (outputs directly to brain/static/dist/)
cd dashboard_rebuild && npm run build

# Start dashboard
Start_Dashboard.bat
# or: python brain/dashboard_web.py

# Rebuild SOP runtime bundle
python sop/tools/build_runtime_bundle.py

# Validate a session log
python sop/tools/validate_log_v9_4.py path/to/log.json

# Run Scholar
scripts/run_scholar.bat
```

### Post-Change Checklist

1. **Backend changes:** `pytest brain/tests/`
2. **Frontend changes:** `npm run build` + `robocopy` + restart Flask
3. **SOP changes:** `python sop/tools/build_runtime_bundle.py` + re-upload to CustomGPT

---

## Repo Layout

```
pt-study-sop/
+-- brain/                  # Flask backend + SQLite DB
|   +-- dashboard/          #   API routes + app factory
|   +-- data/               #   Database + config
|   +-- session_logs/       #   Markdown session logs
|   +-- static/dist/        #   Compiled React frontend
|   +-- tests/              #   pytest suite
|   +-- db_setup.py         #   Schema + migrations
|   +-- config.py           #   App config
|   +-- dashboard_web.py    #   Flask entrypoint
+-- dashboard_rebuild/      # React frontend source
|   +-- client/src/         #   Pages, components, API client
|   +-- package.json        #   Dependencies
+-- sop/                    # Study Operating Procedure
|   +-- library/            #   Canonical SOP (15 files, read-only)
|   +-- runtime/            #   Generated bundles + prompt
|   +-- tools/              #   Build + validation scripts
|   +-- tests/              #   Golden JSON + behavioral tests
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
+-- scripts/                # Automation scripts
+-- Start_Dashboard.bat     # One-click launcher
+-- requirements.txt        # Python dependencies
```

## More Docs

| Doc | Location |
|-----|----------|
| Docs index (canonical) | `docs/README.md` |
| Developer guide | `docs/root/GUIDE_DEV.md` |
| Architecture | `docs/root/PROJECT_ARCHITECTURE.md` |
| User guide | `docs/root/GUIDE_USER.md` |
| SOP overview | `sop/library/00-overview.md` |
| Product definition | `conductor/product.md` |
| Calendar/Tasks | `docs/calendar_tasks.md` |
| Dashboard inventory | `docs/dashboard/DASHBOARD_WINDOW_INVENTORY.md` |

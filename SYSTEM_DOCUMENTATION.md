# PT Study System - Complete Documentation

**System:** PT Study OS v9.5  
**Repository:** `C:\pt-study-sop`  
**Last Updated:** 2026-02-18

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Frontend (Dashboard)](#2-frontend-dashboard)
3. [Backend (Brain)](#3-backend-brain)
4. [User Selection & Workflow](#4-user-selection--workflow)
5. [Data Flow](#5-data-flow)
6. [Integration Points](#6-integration-points)

---

## 1. System Overview

The PT Study System is a local-first, AI-powered study operating system for DPT (Doctor of Physical Therapy) coursework. It follows the **Control Plane learning pipeline** (CP-MSS v1.0) with deterministic logging, citation-first teaching, and continuous improvement.

### Four Pillars

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

| Pillar | Purpose | Location |
|--------|---------|----------|
| **SOP** | Defines *how* learning happens (16+ library files) | `sop/library/` |
| **Brain** | Stores sessions, serves API, hosts dashboard | `brain/` |
| **Dashboard** | Surfaces metrics, manages ingestion, calendar, Anki | `dashboard_rebuild/` |
| **Scholar** | Audits session logs, proposes evidence-based improvements | `scholar/` |

### Key Technologies

| Component | Technology |
|-----------|------------|
| Backend | Python 3.10+, Flask, SQLite |
| Frontend | React 19, TypeScript 5.6, Vite 7, Tailwind CSS 4 |
| Database | SQLite (`brain/data/pt_study.db`) |
| AI Tutor | Custom GPT (external) |
| Integrations | Google Calendar, Anki (AnkiConnect), Obsidian |

---

## 2. Frontend (Dashboard)

The Dashboard is a **React SPA** with a retro arcade theme (high-contrast red/black, terminal fonts).

### Location
```
dashboard_rebuild/
├── client/src/
│   ├── pages/           # Main page components
│   ├── components/      # Reusable components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and API client
│   └── types/           # TypeScript type definitions
```

### Build Output
Vite builds directly to: `brain/static/dist/` (Flask serves this)

**⚠️ NEVER use `npm run dev` - always use `Start_Dashboard.bat`**

### Pages Overview

| Page | Route | Purpose |
|------|-------|---------|
| **Dashboard** | `/` | Main overview, Study Wheel, deadlines, quick stats |
| **Brain** | `/brain` | Session ingestion, vault browser, mind maps, chat |
| **Calendar** | `/calendar` | Google Calendar/Tasks integration, local events |
| **Scholar** | `/scholar` | Meta-auditor runs, proposals, lifecycle panel |
| **Tutor** | `/tutor` | SOP explorer, chat interface with AI tutor |
| **Methods** | `/methods` | Block library, method chains, analytics |
| **Library** | `/library` | SOP documentation browser |

### Key Frontend Components

#### Layout (`components/layout.tsx`)
- **Navigation bar** with 7 main sections
- **Quick Notes panel** (slide-out from right)
  - 3 categories: NOTES, PLANNED, IDEAS
  - Drag-and-drop reordering between categories
- **Mobile responsive** hamburger menu
- **Footer** with status and sync time

#### Dashboard Page (`pages/dashboard.tsx`)
Main landing page with several zones:

**Zone 1 - Action:**
- **Study Wheel**: Rotating course queue (3+2 interleaving)
  - Shows current course at top
  - Complete session → rotates to next course
  - Add/edit/delete courses
- **Session completion**: Log minutes studied

**Zone 2 - Awareness:**
- **Today's Activity**: Session count and minutes
- **Today's Focus**: Due tasks from planner queue
- **Deadlines**: Academic deadlines (assignments, quizzes, exams)
- **Courses**: Summary of all courses with stats
- **Weakness Queue**: Topics flagged as difficult

**Zone 3 - Planning:**
- **Planner Kanban**: Task management board
- **Google Tasks**: Synced task lists

#### Brain Page (`pages/brain.tsx`)
Complex workspace with resizable panels:
- **Vault Sidebar** (left): Obsidian vault file browser
- **Main Content** (center): Canvas, editor, or viewer
- **Chat Panel** (right): AI tutor chat interface

**Modes:**
- Vault: Browse Obsidian files
- Data: Session data editor
- Canvas: Mind maps and concept maps
- Import: Session ingestion interface

### Frontend State Management

| Library | Purpose |
|---------|---------|
| TanStack Query | Server state fetching/caching |
| React useState | Local component state |
| localStorage | Persist user preferences |

### API Client (`lib/api.ts`)

Centralized API calls to Flask backend:
```typescript
api.sessions.getAll()       // Fetch all sessions
api.courses.getActive()     // Get active courses
api.studyWheel.getCurrent() // Get current course
api.googleTasks.getAll()    // Get Google Tasks
api.notes.getAll()          // Get quick notes
// ... and many more
```

---

## 3. Backend (Brain)

The Brain is a **Flask API server** with SQLite database. It serves the dashboard and manages all data.

### Location
```
brain/
├── dashboard/          # Flask blueprints and API routes
│   ├── app.py         # Flask app factory
│   ├── api_adapter.py # Main API endpoints (/api/*)
│   ├── api_methods.py # Method library endpoints
│   ├── api_tutor.py   # Tutor endpoints
│   ├── gcal.py        # Google Calendar integration
│   ├── scholar.py     # Scholar audit endpoints
│   └── ...
├── data/
│   ├── pt_study.db    # SQLite database
│   └── api_config.json # Google API config
├── static/dist/       # Compiled React frontend
├── session_logs/      # Markdown session logs
└── dashboard_web.py   # Flask entrypoint
```

### Starting the Server

```batch
C:\pt-study-sop\Start_Dashboard.bat
```

This will:
1. Build the UI directly to `brain/static/dist/` 
2. Start Python Flask server on **port 5000**
3. Open browser to `http://127.0.0.1:5000/brain`

### Flask App Structure (`dashboard/app.py`)

```python
def create_app():
    # Register blueprints (API routes)
    app.register_blueprint(adapter_bp)      # /api/* - main API
    app.register_blueprint(methods_bp)      # /api/methods/*
    app.register_blueprint(chain_runner_bp) # /api/chain-run/*
    app.register_blueprint(tutor_bp)        # /api/tutor/*
    app.register_blueprint(data_bp)         # /api/data/*
    app.register_blueprint(dashboard_bp)    # Legacy routes
    
    # 404 handler serves React app
    # (allows client-side routing)
```

### Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/db_health` | Database connection check |
| GET | `/api/sessions` | All sessions (with filters) |
| GET | `/api/sessions/<id>` | Single session details |
| GET | `/api/session_stats` | Aggregate statistics |
| GET | `/api/courses` | All courses |
| GET | `/api/study-wheel/current` | Current course in rotation |
| POST | `/api/study-wheel/complete` | Complete session, rotate wheel |
| GET | `/api/google-tasks` | Google Tasks (all lists) |
| GET | `/api/gcal/status` | Google Calendar auth status |
| POST | `/api/gcal/sync` | Two-way calendar sync |
| GET | `/api/obsidian/files` | List Obsidian vault files |
| POST | `/api/obsidian/save` | Save to Obsidian vault |
| GET | `/api/methods/blocks` | Method block library |
| GET | `/api/methods/chains` | Method chains |
| GET | `/api/notes` | Quick notes |
| POST | `/api/scholar/run` | Run Scholar audit |

### Database Schema (`brain/data/pt_study.db`)

**24 tables total**, key ones:

```
+------------------+     +------------------+     +------------------+
|  sessions (90+   |---->|  lo_sessions     |---->|  learning_       |
|  columns)        |     |  (junction)      |     |  objectives      |
+------------------+     +------------------+     +------------------+
        |
        +----------->  topics, courses, course_events, study_tasks
        +----------->  topic_mastery, modules, tutor_turns

+------------------+     +------------------+     +------------------+
|  card_drafts     |     |  rag_docs        |     |  quick_notes     |
|  (Anki staging)  |     |  (RAG index)     |     |                  |
+------------------+     +------------------+     +------------------+

+------------------+     +------------------+     +------------------+
|  scholar_runs    |     |  method_blocks   |     |  method_chains   |
|                  |     |  (18 seed blocks)|     |  (6 templates)   |
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
| Session Ledger | `covered`, `not_covered`, `artifacts_created`, `timebox_min` |

---

## 4. User Selection & Workflow

### The Control Plane Learning Pipeline (CP-MSS v1.0)

Every session follows the 6-stage pipeline:

```
PRIME --> CALIBRATE --> ENCODE --> REFERENCE --> RETRIEVE --> OVERLEARN
   |                                                           |
   +-----------------------------------------------------------+
                    (spaced repetition loop)
```

**The Dependency Law:** No retrieval without targets. Every RETRIEVE stage must be preceded by REFERENCE (target generation). Chains enforce this: `C-FE-STD`, `C-FE-MIN`, `C-FE-PRO` all have REF before RET.

### M0-M6 Session Flow

```
M0: PLANNING
  Exposure Check --> Track A (First Exposure) or Track B (Review)
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
```

### Exposure Check (v9.5 Split-Track)

At the start of every session:

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

### Operating Modes

| Mode | AI Role | Duration | Use Case |
|------|---------|----------|----------|
| **Core** | Guide | 45-60 min | First-pass structured learning |
| **Sprint** | Tester | 30-45 min | Gap-finding via rapid-fire testing |
| **Quick Sprint** | Tester | 20-30 min | Time-boxed Sprint with mandatory wrap |
| **Light** | Guide | 10-15 min | Micro-session, single objective |
| **Drill** | Spotter | Variable | Deep practice on a specific weak area |

### Study Wheel (3+2 Interleaving)

The system uses a **rotating course queue** to enforce interleaving:

1. **3 primary courses** rotate in order
2. **2 secondary courses** inserted every 3rd session
3. After completing a session, the wheel rotates to the next course

**In Dashboard:**
- Shows current course at the top ("NEXT UP")
- Lists all courses in rotation order
- Click "COMPLETE SESSION" to log time and rotate

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

## 5. Data Flow

### Full System Data Flow

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

## 6. Integration Points

### External Integrations

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
```

| Integration | Purpose | Connection |
|-------------|---------|------------|
| **Google Calendar/Tasks** | Two-way sync of study events + tasks | OAuth 2.0 via `brain/gcal.py` |
| **Anki** | Sync card drafts to Anki Desktop | AnkiConnect on port 8765 |
| **Obsidian** | Append session notes to vault | Local REST API on port 27124 |
| **NotebookLM** | Source-locked RAG (factual teaching) | Manual copy/paste of Source Packets |
| **Custom GPT** | AI Tutor running the SOP | Upload runtime bundle + paste prompt |

### Configuration Files

| File | Purpose |
|------|---------|
| `brain/data/api_config.json` | Google Calendar API credentials |
| `brain/.env` | Obsidian API key |
| `sop/runtime/*.md` | Generated runtime bundles for Custom GPT |

---

## Quick Reference

### Starting the System
```batch
C:\pt-study-sop\Start_Dashboard.bat
```

### Building Frontend After Changes
```batch
cd C:\pt-study-sop\dashboard_rebuild
npm run build    # Outputs directly to brain/static/dist/
```

### Running Tests
```batch
pytest brain/tests/
```

### Rebuilding SOP Runtime Bundle
```batch
python sop/tools/build_runtime_bundle.py
```

### Key URLs
- Dashboard: `http://127.0.0.1:5000/`
- Brain: `http://127.0.0.1:5000/brain`
- Calendar: `http://127.0.0.1:5000/calendar`
- Scholar: `http://127.0.0.1:5000/scholar`

---

## File Locations Summary

| Component | Path |
|-----------|------|
| Project Root | `C:\pt-study-sop` |
| Frontend Source | `dashboard_rebuild/client/src/` |
| Frontend Build | `brain/static/dist/` |
| Backend API | `brain/dashboard/` |
| Database | `brain/data/pt_study.db` |
| SOP Library | `sop/library/` |
| Session Logs | `brain/session_logs/` |
| Scholar Outputs | `scholar/outputs/` |
| Documentation | `docs/` |
| Conductor (Tracks) | `conductor/` |

---

*End of Documentation*

# PT Study System — Comprehensive Project Architecture

**Version:** 4.0
**Last Updated:** 2026-01-12
**Scope:** Entire repository (SOP, Brain, Scholar, Scripts)
**Purpose:** Canonical technical documentation for system architecture, dependencies, and integration.

---

## 1. Executive Summary

The **PT Study System** is a personal AI operating system for DPT coursework, integrating four main pillars:

1.  **SOP System (`sop/`)**: A rigorous learning methodology (PEIR-RO cycle) and runtime protocol for "Structured Architect" (Custom GPT).
2.  **Scholar System (`scholar/`)**: A meta-system that audits study logs, detects friction, and proposes optimizations.
3.  **Brain System (`brain/`)**: The central database, ingestion engine, and Flask-based analytics dashboard.
4.  **Scripts & Automation (`scripts/`)**: Release validation, external integrations, and agent workflows.

This document serves as the "Project Map," superseding previous architecture docs.

---

## 2. SOP System (sop/)

The SOP (Standard Operating Procedure) is the cognitive engine of the project. It defines *how* learning happens.

### 2.1 Runtime Canon Overview (`sop/gpt-knowledge/`)

The `sop/gpt-knowledge/` folder contains the **Runtime Canon** — the authoritative instructions loaded into the Custom GPT ("Structured Architect").

**Stats:**
- **Files:** 24 canonical files
- **Total Lines:** ~1,560
- **Rule:** This folder is the single source of truth. If it conflicts with `MASTER_PLAN_PT_STUDY.md` or other docs, the Runtime Canon wins.

**File Structure:**
```
sop/gpt-knowledge/
├── 00_INDEX.md                 # Entry point and quick start
├── 00_FILE_INDEX.md            # File purpose index
├── 00_LEARNING_CORE.md         # PEIR-RO learning cycle (Backbone)
├── 00_SFIRL_ENCODING.md        # KWIK encoding flow (Backbone)
├── BUILD_ORDER.md              # Required upload sequence
├── DEPLOYMENT_CHECKLIST.md     # Pre-flight verification
├── ANATOMY_ENGINE.md           # Bone-first anatomy protocol
├── CONCEPT_ENGINE.md           # Non-anatomy topic protocol
├── CONTEXT_FRAMEWORKS.md       # Y-series (quick context)
├── HIERARCHY_FRAMEWORKS.md     # H-series (structure mapping)
├── LOGIC_FRAMEWORKS.md         # M-series (mechanisms/logic)
├── LEVELS.md                   # L1-L4 gating system
├── M0_PLANNING.md              # Phase 0: Plan & Source-Lock
├── M1_ACTIVATION.md            # Phase 1: Mode & Entry
├── M2_FRAMING.md               # Phase 2: Prime & Map
├── M3_ENCODING.md              # Phase 3: Active Encoding
├── M4_PRACTICE.md              # Phase 4: Build & Fade
├── M5_TRANSITIONS.md           # Mode switching logic
├── M6_WRAP.md                  # Phase 6: Consolidate & Data Output
├── GPT-INSTRUCTIONS.md         # Custom GPT System Prompt
├── SESSION_PRIMER.md           # Per-session copy/paste prompt
├── SESSION_LOG_TEMPLATE.md     # Canonical output format
├── NOTEBOOKLM_BRIDGE.md        # Source-grounding rules
└── ARCHIVE_MASTER_FULL.md      # version 9.1 reference (legacy)
```

[...Section 2 continues with Core Learning Modules...]

### 2.2 Core Learning Modules

These two files define the pedagogical backbone of the system.

**1. `00_LEARNING_CORE.md` (PEIR-RO Cycle)**
Defines the 6-phase learning cycle that ALL sessions must follow:
- **P**repare: Orient focus, clarify scope.
- **E**ncode: Construct durable schemas (active, not passive).
- **I**nterrogate: Question "why/how" during encoding.
- **R**etrieve: Effortful recall without cues.
- **R**efine: Targeted correction of errors.
- **O**verlearn: Spaced repetition beyond mastery.
*Constraint:* NEVER deviate from this method.

**2. `00_SFIRL_ENCODING.md` (KWIK Flow)**
Defines the encoding mechanism for memory hooks (Jim Kwik method):
- **S**ound: Capture phonetic seed / sound-alike.
- **F**unction: State *what it does* (grounding).
- **I**mage: Create weird/vivid imagery tied to function.
- **R**esonance: "Does this feel right?" (User Check).
- **L**ock: Commit to memory/card.
*Constraint:* MUST pair Word + Meaning before Imagery.

### 2.3 Execution Modules (M0–M6)

These modules control the session timeline.

| Module | Phase | Key Rules & Mechanisms |
|--------|-------|------------------------|
| **M0** | **Planning** | **Source-Lock:** No teaching until Target + Sources + Plan + Pre-test are set.<br>**Constraint:** Plan must be 3-5 steps. |
| **M1** | **Activation** | **Mode Selection:** Core (New), Sprint (Test), Drill (Weak spots).<br>**Heuristic:** "Haven't seen it?" → Core. "Quiz me?" → Sprint. |
| **M2** | **Framing** | **Bucketing:** Group ideas into 2-4 buckets.<br>**Prime:** H-series scan (map territory before encoding). |
| **M3** | **Encoding** | **Function-First:** Meaning before structure.<br>**Active:** Use Dual Coding, Self-Explanation.<br>**Gating:** One-step-at-a-time confirmation. |
| **M4** | **Practice** | **Faded Scaffolding (/fade):** Worked → Completion → Independent.<br>**Interleaving:** Mix problem types.<br>**Successive Relearning:** 2-3 correct recalls required. |
| **M5** | **Transitions** | Switches behavior based on **Mode**.<br>**Core:** Guide & Build.<br>**Sprint:** Ask & Verify.<br>**Drill:** Spot & Correct. |
| **M6** | **Wrap** | **Consolidation:** 3-Question Recap, Error Log, Glossaries.<br>**JSON Output:** MANDATORY dual JSON dump (Tracker + Enhanced) for Brain ingestion. |

### 2.4 Support Content (Frameworks & Engines)

**Frameworks** provide structured ways to think:
- **Levels (`LEVELS.md`):** L1 (Analogy) → L2 (Simple 10yo) → **GATE** → L3 (Technical) → L4 (Clinical).
  - *Rule:* Must pass L2 teach-back before accessing L3/L4.
- **H-Series (`HIERARCHY_FRAMEWORKS.md`):** Structure maps (System → Subsystem → Component).
- **M-Series (`LOGIC_FRAMEWORKS.md`):** Logic flows (Trigger → Mechanism → Result).
- **Y-Series (`CONTEXT_FRAMEWORKS.md`):** Quick context (Load/Stress, Signal/Detection).

**Engines** contain specialized content logic:
- **Anatomy Engine (`ANATOMY_ENGINE.md`):**
  - **OIANA+ Order:** Bones → Landmarks (Visual First) → Attachments → Actions → Nerves → Arterial → Clinical.
  - **Rollback Rule:** If struggling with OIANA, return to landmarks.
- **Concept Engine (`CONCEPT_ENGINE.md`):**
  - **Flow:** Definition → Context → Mechanism → Boundary (vs near-miss) → Application.
  - **Generation-First:** Always ask user for their take first.

### 2.5 Integration Layer

- **`NOTEBOOKLM_BRIDGE.md`**: Enforces **Source-Lock**. If no source packet provided, AI cannot make factual claims.
- **`SESSION_LOG_TEMPLATE.md`**: The strict markdown format required for `brain/ingest_session.py`.

### 2.6 Mechanism & Command Master Lists

**Named Mechanisms:**
- **Seed-Lock:** User supplies hook/metaphor.
- **Gated Platter:** AI offers raw metaphor only if user stalls.
- **Level Gating:** L3/L4 locked until L2 teach-back used.
- **Rollback Rule:** Return to landmarks if OIANA+ fails.

**Commands:**
- `plan`, `ready`, `next`, `wrap`, `menu`
- `mode [core|sprint|drill|light|quick-sprint]`
- `draw` (drawing steps), `landmark` (anatomy visual pass)
- `/fade` (scaffolding ramp)

### 2.7 Loading Order (`BUILD_ORDER.md`)

1. **System Instructions:** Paste `GPT-INSTRUCTIONS.md` into Custom GPT.
2. **Knowledge Uploads:** Upload all 24 files in exact order defined in `BUILD_ORDER.md`.
3. **Session Start:** Paste `SESSION_PRIMER.md` at start of every chat.

---

## 3. Scholar System (scholar/)

Scholar is the "auditor" meta-system. It reads Brain data but never writes to it directly (except via proposals).

**Mission:** Observe study patterns, detect friction, and propose system upgrades.
**Constraint:** Scholar never teaches content. It only optimizes the *process*.

### 3.1 Core Scripts

| Script | Purpose |
|--------|---------|
| `brain_reader.py` | Read-only access to `sessions` table in `pt_study.db`. |
| `friction_alerts.py` | Detects sessions with low scores, drift, or no planning. |
| `telemetry_snapshot.py` | Generates system health reports (uptime, coverage). |

### 3.2 Workflow Architecture (`scholar/workflows/`)

Scholar operates on a **Review → Plan → Research → Draft → Wait** cycle.

**Key Workflows:**
- `01_CONTINUOUS_IMPROVEMENT.md`: The main loop (Audit → Propose → Wait).
- `03_DETECT_FRICTION.md`: Analyzes logs for "Confused" ratings or "Off-Source" flags.
- `05_COMPARE_SYLLABUS.md`: Checks study coverage against `course_events`.
- `09_WEEKLY_REVIEW.md`: Generates the Monday morning digest.
- `10_CHANGE_PROPOSAL.md`: The RFC process for system changes.

### 3.3 Output Lanes (`scholar/outputs/`)

Scholar organizes its artifacts into strict folders ("lanes"):

| Lane | Content |
|------|---------|
| `reports/` | Routine health checks and friction audits. |
| `digests/` | Weekly summaries and strategic insights. |
| `proposals/` | RFCs for system changes (Draft / Approved / Rejected). |
| `promotion_queue/` | Pending changes waiting for human review. |
| `module_dossiers/` | Deep-dive analysis of specific SOP modules. |
| `orchestrator_runs/` | Raw logs from the Scholar agent process. |

### 3.4 Integration Points

- **Reads:** `brain/session_logs/` (via DB), `sop/gpt-knowledge/` (for compliance checks).
- **Writes:** `scholar/outputs/` (reports), `brain/data/scholar_proposals` (metadata).
- **Triggers:** Run via `scripts/run_scholar.bat` (Codex CLI agent).

---

## 4. Brain System (brain/)

The **Brain** is the single source of truth for study data, containing the database, ingestion pipelines, and helper engines.

### 4.1 Database Schema (`data/pt_study.db`)

SQLite database with 17+ tables. Key tables:

| Table | Content |
|-------|---------|
| `sessions` | Complete session logs (60+ columns) parsed from markdown. |
| `courses` | Syllabus metadata (code, name, color). |
| `course_events` | Syllabus items (lectures, exams, due dates). |
| `rag_docs` | Ingested notes/textbooks for Tutor/RAG search. |
| `card_drafts` | Flashcards waiting for Anki sync. |
| `tutor_turns` | Chat history logs from the Tutor interface. |
| `scraped_events` | Staged Blackboard items waiting for approval. |
| `ingested_files` | Tracking checksums of ingested logs to prevent dupes. |

### 4.2 Core Ingestion Scripts

These scripts populate the database:

| Script | Function |
|--------|----------|
| `ingest_session.py` | Parses `brain/session_logs/*.md` → `sessions` table. |
| `import_syllabus.py` | Imports JSON/CSV syllabus data → `courses`/`events`. |
| `ingest_knowledge.py` | Indexes markdown/text files → `rag_docs`. |
| `rag_notes.py` | CLI tool for managing RAG documents. |

### 4.3 Integration Engines

**Flashcards (`anki_sync.py`):**
- Pushes approved `card_drafts` to Anki Desktop via Anki-Connect.
- Handles duplicate detection and tagging.

**Tutor Engine (`tutor_engine.py`):**
- Powers the "Tutor" tab in the dashboard.
- Uses RAG to answer queries grounded in `rag_docs`.
- Respects Source-Lock (only answers from approved docs).

**Resume Generator (`generate_resume.py`):**
- Creates `brain/session_resume.md`.
- Provides the "Previous Context" block for the next GPT session.

---

## 5. Dashboard (`brain/dashboard/`)

The Dashboard is a single-page Flask web application (`web aspect`) serving as the UI for the Brain.

**Tech Stack:** Flask (Backend), Vanilla JS + Chart.js (Frontend), SQLite (DB).
**Entry Point:** `brain/dashboard/app.py`
**Frontend Logic:** `brain/static/app.js` (~6,300 lines)

### 5.1 Route Registry

Full map of the ~70 API endpoints defined in `routes.py`:

| Domain | Method | Route | Purpose |
|--------|--------|-------|---------|
| **Core** | GET | `/` | Main SPA entry point. |
| **Stats** | GET | `/api/stats` | Global dashboard metrics. |
| **Sessions** | GET/POST | `/api/sessions` | List or create sessions. |
| **Syllabus** | GET | `/api/syllabus/events` | Calendar event data. |
|  | POST | `/api/syllabus/import` | Import course schedules. |
| **Scholar** | POST | `/api/scholar/run` | Trigger Scholar orchestrator. |
|  | GET | `/api/scholar/status` | Polling run status/logs. |
| **Tutor** | POST | `/api/tutor/session/turn` | Chat turn with AI Tutor. |
| **Cards** | POST | `/api/cards/sync` | Push drafts to Anki. |
| **Sync** | POST | `/api/sync/scraper` | Trigger Blackboard scraper. |

### 5.2 JavaScript Architecture (`app.js`)

The frontend is a monolothic vanilla JS file organized into functional blocks:

- **Navigation:** `showTab(tabId)`, `updateMobileNav()`
- **Overview Tab:** `loadStats()`, `renderTrends()`
- **Brain Tab:** `renderSessionsTable()`, `openEditSessionModal()`
- **Syllabus Tab:** `renderCalendar()`, `renderEventList()`
- **Scholar Tab:** `startScholarRun()`, `pollScholarStatus()`
- **Tutor Tab:** `sendTutorMessage()`, `syncStudyContext()`
- **Sync Tab:** `loadSyncInbox()`, `approveScrapedEvent()`

### 5.3 Page-by-Page Breakdown

1. **Overview:** High-level metrics, Scholar Insights, Mastery Heatmap.
2. **Brain:** Session log management, "Fast Entry" form.
3. **Syllabus:** Calendar/List view of deadlines and study plans.
4. **Scholar:** Orchestrator control panel, Proposal approvals.
5. **Tutor:** AI chat interface with RAG source selection.
6. **Data:** Raw database inspector.
7. **Sync:** Inbox for scraped events (Blackboard/GCal) waiting for approval.

---

## 6. Scripts & Automation (`scripts/`)

These tools handle release validation and external world interaction.

### 6.1 Release Tooling
- **`release_check.py`**: The "Quality Gate" script. Checks encoding, compiles Python files, runs `pytest`.
  - *Must pass before any commit.*
- **`scholar_health_check.py`**: Validates Scholar system status (lanes, files).

### 6.2 Automation
- **`scrape_blackboard.py`**: Selenium script to fetch assignments/due dates -> `scraped_events` DB table.
- **`run_scholar.bat`**: Windows wrapper to launch the Scholar Codex personality.

---

## 7. Cross-System Integration

How the pillars talk to each other.

```
[SOP/Runtime]
     │
     (Manual Paste)
     ▼
[Custom GPT] ──(Session Log MD)──> [Brain Ingestor]
                                          │
                                          ▼
                                   [Brain Database]
                                   (Sessions, Cards)
                                      │   │
                  ┌───────────────────┘   └──────────┐
                  ▼                                  ▼
           [Dashboard UI]                   [Scholar Auditor]
           (Visuals, Tutor)                 (Reports, Optimizations)
                  │                                  │
                  ▼                                  ▼
            [Anki Connect]                   [Change Proposals]
```

### 7.1 Key Data Flows

1.  **Session Loop:** GPT → Markdown Log → Ingestion Script → Database → Resume (Context for next session).
2.  **Audit Loop:** Database → Scholar Reader → Friction Analysis → Proposal → Human Approval.
3.  **Study Loop:** Dashboard → Tutor Tab → RAG Search → Answer → Card Draft → Anki Deck.

---

## 8. Known Issues & Technical Debt

### 8.1 Critical
- **Hardcoded Paths:** Some scripts in `brain/` assume strictly Windows paths (`C:\Users\...`).
- **app.js Monolith:** The 6,000+ line frontend file is hard to maintain. Needs modularization.
- **Error Boundaries:** Dashboard API failures often silent on frontend.

### 8.2 High
- **Circular Dependencies:** occasional import cycles between `brain/` and `scholar/`.
- **RAG Latency:** Local embeddings can be slow on first load.

### 8.3 Medium
- **Test Coverage:** Only 2 distinct test files exist (`tests/`). Need to cover ingestion edge cases.
- **Mobile CSS:** 90s theme has some touch target overlapping issues on small screens.

---

## 9. Modularization Roadmap

**Goal:** Split `app.js` into feature modules.

**Plan:**
1. Create `brain/static/js/modules/`.
2. Extract `api.js` (Fetch wrappers).
3. Extract `ui.js` (Tab switching, Modal logic).
4. Extract `scholar.js`, `syllabus.js`, `tutor.js` (Tab-specific logic).
5. Use ES6 imports (will require build step or `<script type="module">`).

---

## 10. Validation Commands

Commands to verify system integrity:

```powershell
# 1. Run Tests
python -m pytest brain/tests

# 2. Release Check
python scripts/release_check.py

# 3. Start Dashboard
python brain/dashboard_web.py
```

## Appendix A: Dashboard Technical Reference

### 1. JavaScript Function Catalog (`brain/static/js/dashboard.js`)

This catalog represents the core client-side logic driving the dashboard's interactivity, grouped by functional domain.

| Function | Purpose | Key API Calls |
| :--- | :--- | :--- |
| **Navigation & UI** | | |
| `showTab` | Initializes the tab switching logic and handles URL hash deep-linking. | N/A |
| `toggleSection` | Toggles the visibility of `.collapsible` elements and saves state to localStorage. | N/A |
| `expandAll` / `collapseAll` | Global controls to expand or collapse all details/summary sections within a tab. | N/A |
| `toggleMobileNav` / `closeMobileNav` | Manages the responsive mobile navigation overlay state. | N/A |
| `showToast` | Displays temporary toast notifications for user feedback. | N/A |
| **Overview & Trends** | | |
| `renderTrends` | Fetches and renders the retention/understanding trend chart for the specified period. | `/api/trends?days=X` |
| `drawTrendLine` | Canvas API implementation for the custom trend line graph. | N/A |
| **Sessions & Ingestion** | | |
| `submitQuickSession` | Parses and submits a "fast entry" text block (JSON/Markdown) to create a new session log. | `POST /api/quick_session` |
| `parseSessionText` | RegExp parser to extract structured session data from raw text input. | N/A |
| `copyResume` | Copies the structured session template to the clipboard for use in LLM chats. | N/A |
| `handleFileUpload` | Handles file upload for manual session log ingestion. | `POST /api/upload` |
| **Scholar System** | | |
| `loadScholarTab` | Refreshes the Scholar tab data (Questions, Proposals, Runs). | `/api/scholar/overview` |
| `saveAnswer` | Submits a manual user answer for a specific "Questions Needed" item. | `/api/scholar/answer_question` |
| `pollRunStatus` | Polls the status of an active Orchestrator run. | `/api/scholar/status` |
| `checkApiKeys` | Checks for configured LLM API keys. | `/api/scholar/keys` |
| **Tutor (RAG Chat)** | | |
| `initTutor` | Initializes the Tutor interface, loads RAG config, and binds chat listeners. | `/api/tutor/rag_docs`, `/api/tutor/study/folders` |
| `sendTutorMessage` | Handles user input, starts a Tutor session if needed, and posts the query. | `POST /api/tutor/session/start`, `POST /api/tutor/chat` |
| `renderTutorResponse` | Renders the source citations block for a Tutor response. | N/A |
| `loadRagDocs` | Fetches the list of ingested RAG documents with filtering. | `/api/tutor/rag_docs` |
| **Syllabus & Calendar** | | |
| `loadCalendarEvents` | Fetches event data for the calendar view based on current filters. | `/api/syllabus/events` |
| `renderMonthView` / `renderWeekView` | Renders the specialized calendar grid views. | N/A |
| `editEvent` | Opens the editor for modifying syllabus events. | `/api/syllabus/event/<id>` |
| `saveEvent` | Submits changes to an existing syllabus event. | `PATCH /api/syllabus/event/<id>` |
| `scheduleReviews` | Generates spaced repetition study tasks for a specific event. | `POST /api/syllabus/event/<id>/schedule_reviews` |
| **Proposals** | | |
| `viewProposal` | Fetches and displays the raw markdown content of a proposal. | `/api/scholar/proposal/content` |
| `approveProposal` | Executes an Approve/Reject action on a proposal. | `/api/scholar/proposal/approve` |

### 2. API Route Registry (`brain/dashboard/routes.py`)

Backend endpoints serving the frontend dashboard application.

| Method | Route | Handle | Purpose |
| :--- | :--- | :--- | :--- |
| **General** | | | |
| `GET` | `/` | `index` | Serves the main SPA `dashboard.html`. |
| `GET` | `/api/stats` | `api_stats` | Returns aggregate statistics for the Overview tab. |
| `GET` | `/api/db_status` | `api_db_status` | Returns DB health, row counts, and file sizes. |
| **Scholar** | | | |
| `GET` | `/api/scholar/overview` | `api_scholar_overview` | Returns comprehensive Scholar state (active questions, proposals). |
| `GET` | `/api/scholar/digest/generate` | `api_scholar_digest_generate` | Generates the weekly strategic digest content. |
| `POST` | `/api/scholar/digest/save` | `api_scholar_digest_save` | Commits the digest to the repo and updates the plan. |
| `POST` | `/api/scholar/answer_question` | `api_scholar_answer_single_question` | Saves a single answer to the active `questions_needed_*.md`. |
| `POST` | `/api/scholar/run` | `api_scholar_run` | Triggers a new Scholar Orchestrator run. |
| `GET` | `/api/scholar/status` | `api_scholar_status` | Polling endpoint for run logs and process state. |
| `POST` | `/api/scholar/safe_mode` | `api_scholar_safe_mode` | Toggles the "Safe Mode" gate in `scholar/inputs/config.json`. |
| `POST` | `/api/scholar/multi-agent` | `api_scholar_multi_agent` | Toggles "Multi-Agent" mode in `scholar/inputs/config.json`. |
| **Tutor** | | | |
| `GET` | `/api/tutor/rag_docs` | `api_tutor_rag_docs` | Lists ingested documents available for RAG. |
| `POST` | `/api/tutor/study/config` | `api_tutor_study_config_set` | Updates the root path for the Study RAG library. |
| `POST` | `/api/tutor/study/sync` | `api_tutor_study_sync` | Triggers indexing of the Study RAG folder. |
| **Syllabus & Sync** | | | |
| `GET` | `/api/sync/inbox` | `api_sync_inbox` | Lists scraped/imported events waiting for approval. |
| `POST` | `/api/sync/approve` | `api_sync_approve` | Approves or ignores a pending sync item. |
| `GET` | `/api/syllabus/events` | `api_syllabus_events` | Returns events and sessions formatted for the calendar. |
| `PATCH` | `/api/syllabus/event/<event_id>` | `api_update_event` | Updates an individual syllabus event. |

### 3. Extended Database Schema (`brain/data/pt_study.db`)

The database is SQLite. Key tables and their schemas are defined in `brain/db_setup.py`.

**`sessions`** (Core Study Logs)
- `id` (INTEGER PK): Unique session ID.
- `session_date` (TEXT), `session_time` (TEXT): Timestamp.
- `study_mode` (TEXT): 'Core', 'Sprint', or 'Drill'.
- `main_topic`, `subtopic`, `subtopics` (TEXT): Content coverage.
- `understanding_level`, `retention_confidence`, `system_performance` (INTEGER): Self-reported metrics (1-5).
- `cards_created` (INTEGER): Number of flashcards created.
- `what_worked`, `what_needs_fixing`, `notes` (TEXT): Reflection data.
- **v9.2 Additions:** `next_session_plan`, `spaced_reviews`, `errors_conceptual`, `errors_recall`.

**`courses`** (Academic Context)
- `id` (INTEGER PK): Unique course ID.
- `code`, `name` (TEXT): e.g., "Anatomy", "PT 101".
- `color` (TEXT): Hex code for UI display.
- `last_scraped_at` (TEXT): Timestamp of last syllabus sync.

**`course_events`** (Syllabus Items)
- `id` (INTEGER PK): Unique event ID.
- `course_id` (FK): Links to `courses`.
- `type` (TEXT): 'lecture', 'exam', 'quiz', 'assignment', etc.
- `title` (TEXT): Event description.
- `date`, `due_date` (TEXT): Calendar anchors.
- `status` (TEXT): 'pending', 'completed'.

**`rag_docs`** (Knowledge Base)
- `id` (INTEGER PK): Unique document ID.
- `source_path` (TEXT): File path or URL.
- `content` (TEXT): The indexed text used for retrieval.
- `corpus` (TEXT): 'textbook', 'note', 'transcript', 'slide'.
- `virtual_path` (TEXT): Virtual folder structure for Tutor RAG.
- `enabled` (INTEGER): 1 = active in search, 0 = ignored.

**`card_drafts`** (Flashcard Queue)
- `id` (INTEGER PK): Unique draft ID.
- `front`, `back` (TEXT): Card content.
- `status` (TEXT): 'draft', 'approved', 'synced'.
- `anki_note_id` (INTEGER): Back-reference to Anki upon sync.

### 4. UI Component Reference

**Navigation Bar**
- **Container:** `.top-nav-menu` (Flex container in `dashboard.html`)
- **Buttons (Circles):** `.top-nav-item`
  - Active state: `.active` class added.
  - Icon wrapper: `.terminal-badge`
  - Label: `.terminal-badge-label`
- **Context:** `brain/static/css/dashboard.css` lines 50-80.

**Layout Structure**
- **Main Wrapper:** `.main-wrapper` (Holds the swipeable/tabbed content)
- **Tab Panels:** `.tab-panel`
  - ID Convention: `#tab-overview`, `#tab-sessions`, `#tab-scholar`, etc.
  - Active State: `.active` (display: block).
- **Collapsibles:** `.collapsible`
  - Header: `.collapsible-header` (Click target for toggle).
  - State: Has `.collapsed` class when hidden.

**Theme Tokens (`variables.css`)**
- **Surfaces:** `--surface-0` (Darkest) through `--surface-5` (Lighter).
- **Accents:** `--primary` (Red/Retro), `--success` (Green), `--warn` (Gold).
- **Modes:** `.mode-core` (#DC2626), `.mode-sprint` (#F59E0B), `.mode-drill` (#6B7280).




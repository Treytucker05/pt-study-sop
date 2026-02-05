# ARCHITECTURE CONTEXT DUMP
Generated on: 2026-02-05 14:14:47
Root: C:\pt-study-sop

--------------------------------------------------------------------------------
# FILE: AGENTS.md
--------------------------------------------------------------------------------
``markdown
# Agent Rules

Read and obey the global instructions first: `C:\Users\treyt\.claude\CLAUDE.md`. Then read the repo `CLAUDE.md` for project context and key paths.

## Scope

Applies to all work under `C:/pt-study-sop`. A nearer `AGENTS.md` overrides this file.

## Defaults

- Keep changes minimal and scoped; avoid broad reformatting.
- Prefer ASCII; keep filenames and paths stable unless requested.
- Do not edit `archive/` unless explicitly requested.
- Ask before destructive or irreversible actions.
- Run project-required checks or state when they are skipped.
- When completing work, read and update any docs that correspond to the changed code (see `docs/README.md` Featureâ†’Doc table). Don't read all docs â€” just the relevant ones.
- Auto-commit after changes with a conventional commit message if none is provided.
- Explore the project first (key files/paths), then invoke any skill.
- For SwiftUI tasks, prefer retrieval-led reasoning over pre-training-led reasoning.
- Prompt suffix defaults: treat every request as if it ends with `use subagents; use bq when asked; explain why; include ASCII diagram when helpful` unless the user says "no suffix" or "no subagents".

## When to Ask

- Task needs a target (repo, path, env) that is not explicit.
- Requirements are missing and would change the implementation.
- Multiple valid choices exist â€” present 2-4 options with a default.
- Action is destructive â€” confirm first.
- Response style: minimum questions, short numbered lists with lettered options.

## ExecPlans

For complex features or significant refactors, use an ExecPlan per `.agent/PLANS.md`.

## Folder READMEs

Add a concise `README.md` to folders with non-obvious purpose. Skip `archive/`, config dirs, and folders where the name is self-explanatory.

## Docs

Add or maintain a Table of Contents for documentation.

## Continuity

Maintain `CONTINUITY.md` at repo root. Append after every significant change â€” never delete history.
``

--------------------------------------------------------------------------------
# FILE: docs/root/PROJECT_ARCHITECTURE.md
--------------------------------------------------------------------------------
``markdown
# PT Study System â€” Comprehensive Project Architecture

**Version:** 4.0
**Last Updated:** 2026-02-05
**Scope:** Entire repository (SOP, Brain, Scholar, Scripts)
**Purpose:** Canonical technical documentation for system architecture, dependencies, and integration.

---

## 1. Executive Summary

The **PT Study System** is a personal AI operating system for DPT coursework, integrating four main pillars. Canonical dashboard behavior and flows are documented in `docs/dashboard_audit.md`.

The **PT Study System** is a personal AI operating system for DPT coursework, integrating four main pillars:


1.  **SOP System (`sop/`)**: A rigorous learning methodology (PEIR-RO cycle) and runtime protocol for "Structured Architect" (Custom GPT).
2.  **Scholar System (`scholar/`)**: A meta-system that audits study logs, detects friction, and proposes optimizations.
3.  **Brain System (`brain/`)**: The central database, ingestion engine, and Flask-based analytics dashboard.
4.  **Scripts & Automation (`scripts/`)**: Release validation, external integrations, and agent workflows.

This document serves as the "Project Map," superseding previous architecture docs.

---

## 2. SOP System (sop/)

The SOP (Standard Operating Procedure) is the cognitive engine of the project. It defines *how* learning happens.

### 2.1 Runtime Canon Overview (`sop/library/` + `sop/runtime/`)

The SOP "Runtime Canon" is built from canonical source files in `sop/library/` into a generated upload bundle in `sop/runtime/`.

- **Source of truth (edit here):** `sop/library/`
- **Generated runtime bundle (do not edit):** `sop/runtime/knowledge_upload/`
- **Runtime prompt (generated):** `sop/runtime/runtime_prompt.md`
- **Manifest/index:** `sop/sop_index.v1.json`

If anything conflicts (docs, scripts, or older SOPs), `sop/library/` wins. `sop/archive/` is legacy history (do not edit).

**Library file map:**
```
sop/library/
â”œâ”€â”€ 00-overview.md
â”œâ”€â”€ 01-core-rules.md
â”œâ”€â”€ 02-learning-cycle.md
â”œâ”€â”€ 03-frameworks.md
â”œâ”€â”€ 04-engines.md
â”œâ”€â”€ 05-session-flow.md
â”œâ”€â”€ 06-modes.md
â”œâ”€â”€ 07-workload.md
â”œâ”€â”€ 08-logging.md
â”œâ”€â”€ 09-templates.md
â”œâ”€â”€ 10-deployment.md
â”œâ”€â”€ 11-examples.md
â”œâ”€â”€ 12-evidence.md
â”œâ”€â”€ 13-custom-gpt-system-instructions.md
â”œâ”€â”€ 14-lo-engine.md
â””â”€â”€ README.md
```

**Generated upload bundle:**
```
sop/runtime/knowledge_upload/
â”œâ”€â”€ 00_INDEX_AND_RULES.md
â”œâ”€â”€ 01_MODULES_M0-M6.md
â”œâ”€â”€ 02_FRAMEWORKS.md
â”œâ”€â”€ 03_ENGINES.md
â”œâ”€â”€ 04_LOGGING_AND_TEMPLATES.md
â””â”€â”€ 05_EXAMPLES_MINI.md
```
### 2.2 Core Learning Modules

These files define the pedagogical backbone of the system.

**1. `02-learning-cycle.md` (PEIRRO + KWIK)**
Defines the 6-phase learning cycle that ALL sessions must follow:
- **P**repare: Orient focus, clarify scope.
- **E**ncode: Construct durable schemas (active, not passive).
- **I**nterrogate: Question "why/how" during encoding.
- **R**etrieve: Effortful recall without cues.
- **R**efine: Targeted correction of errors.
- **O**verlearn: Spaced repetition beyond mastery.
*Constraint:* NEVER deviate from this method.

**2. `02-learning-cycle.md` (KWIK Flow)**
Defines the encoding mechanism for memory hooks (Jim Kwik method):
- **S**ound: Capture phonetic seed / sound-alike.
- **F**unction: State *what it does* (grounding).
- **I**mage: Create weird/vivid imagery tied to function.
- **R**esonance: "Does this feel right?" (User Check).
- **L**ock: Commit to memory/card.
*Constraint:* MUST pair Word + Meaning before Imagery.

### 2.3 Execution Modules (M0â€“M6)

These modules control the session timeline.

| Module | Phase | Key Rules & Mechanisms |
|--------|-------|------------------------|
| **M0** | **Planning** | **Source-Lock:** No teaching until Target + Sources + Plan + Pre-test are set.<br>**Constraint:** Plan must be 3-5 steps. |
| **M1** | **Activation** | **Mode Selection:** Core (New), Sprint (Test), Drill (Weak spots).<br>**Heuristic:** "Haven't seen it?" â†’ Core. "Quiz me?" â†’ Sprint. |
| **M2** | **Framing** | **Bucketing:** Group ideas into 2-4 buckets.<br>**Prime:** H-series scan (map territory before encoding). |
| **M3** | **Encoding** | **Function-First:** Meaning before structure.<br>**Active:** Use Dual Coding, Self-Explanation.<br>**Gating:** One-step-at-a-time confirmation. |
| **M4** | **Practice** | **Faded Scaffolding (/fade):** Worked â†’ Completion â†’ Independent.<br>**Interleaving:** Mix problem types.<br>**Successive Relearning:** 2-3 correct recalls required. |
| **M5** | **Transitions** | Switches behavior based on **Mode**.<br>**Core:** Guide & Build.<br>**Sprint:** Ask & Verify.<br>**Drill:** Spot & Correct. |
| **M6** | **Wrap** | **Consolidation:** 3-Question Recap, Error Log, Glossaries.<br>**Wrap outputs:** Exit Ticket + Session Ledger only; JSON is generated post-session via Brain ingestion (see `sop/library/08-logging.md`). |

### 2.4 Support Content (Frameworks & Engines)

**Frameworks** provide structured ways to think:
- **Levels (`sop/library/03-frameworks.md`):** L1 (Analogy) â†’ L2 (Simple 10yo) â†’ **GATE** â†’ L3 (Technical) â†’ L4 (Clinical).
  - *Rule:* Must pass L2 teach-back before accessing L3/L4.
- **H-Series (`sop/library/03-frameworks.md`):** Structure maps (System â†’ Subsystem â†’ Component).
- **M-Series (`sop/library/03-frameworks.md`):** Logic flows (Trigger â†’ Mechanism â†’ Result).
- **Y-Series (`sop/library/03-frameworks.md`):** Quick context (Load/Stress, Signal/Detection).

**Engines** contain specialized content logic:
- **Anatomy Engine (`sop/library/04-engines.md`):**
  - **OIANA+ Order:** Bones â†’ Landmarks (Visual First) â†’ Attachments â†’ Actions â†’ Nerves â†’ Arterial â†’ Clinical.
  - **Rollback Rule:** If struggling with OIANA, return to landmarks.
- **Concept Engine (`sop/library/04-engines.md`):**
  - **Flow:** Definition â†’ Context â†’ Mechanism â†’ Boundary (vs near-miss) â†’ Application.
  - **Generation-First:** Always ask user for their take first.

### 2.5 Integration Layer

- **`sop/library/01-core-rules.md`**: Source-Lock and NotebookLM Source Packet requirements.
- **`sop/library/08-logging.md`**: Canonical logging schema (Exit Ticket + Session Ledger at Wrap; JSON via Brain ingestion).
- **`sop/library/09-templates.md`**: Copy/paste templates.
- **`sop/library/10-deployment.md`**: Runtime bundle build/upload and Brain ingestion prompt pack.
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

### 2.7 Loading Order (Build + Upload)

See `sop/library/10-deployment.md` for the canonical checklist. Summary:

1. **System Instructions:** Paste the system instructions from `sop/library/10-deployment.md` (Step 1).
2. **Build Bundle:** `python sop/tools/build_runtime_bundle.py`.
3. **Upload Knowledge:** Upload `sop/runtime/knowledge_upload/*.md` in the order listed in `sop/library/10-deployment.md` (Step 2).
4. **Session Start:** Paste `sop/runtime/runtime_prompt.md` as the first user message (Step 3).

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

Scholar operates on a **Review â†’ Plan â†’ Research â†’ Draft â†’ Wait** cycle.

**Key Workflows:**
- `01_CONTINUOUS_IMPROVEMENT.md`: The main loop (Audit â†’ Propose â†’ Wait).
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

- **Reads:** `brain/session_logs/` (via DB), `sop/library/` (for compliance checks).
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
| `ingest_session.py` | Parses `brain/session_logs/*.md` â†’ `sessions` table. |
| `import_syllabus.py` | Imports JSON/CSV syllabus data â†’ `courses`/`events`. |
| `ingest_knowledge.py` | Indexes markdown/text files â†’ `rag_docs`. |
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
     â”‚
     (Manual Paste)
     â–¼
[Custom GPT] â”€â”€(Session Log MD)â”€â”€> [Brain Ingestor]
                                          â”‚
                                          â–¼
                                   [Brain Database]
                                   (Sessions, Cards)
                                      â”‚   â”‚
                  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                  â–¼                                  â–¼
           [Dashboard UI]                   [Scholar Auditor]
           (Visuals, Tutor)                 (Reports, Optimizations)
                  â”‚                                  â”‚
                  â–¼                                  â–¼
            [Anki Connect]                   [Change Proposals]
```

### 7.1 Key Data Flows

1.  **Session Loop:** GPT â†’ Markdown Log â†’ Ingestion Script â†’ Database â†’ Resume (Context for next session).
2.  **Audit Loop:** Database â†’ Scholar Reader â†’ Friction Analysis â†’ Proposal â†’ Human Approval.
3.  **Study Loop:** Dashboard â†’ Tutor Tab â†’ RAG Search â†’ Answer â†’ Card Draft â†’ Anki Deck.

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



``

--------------------------------------------------------------------------------
# FILE: sop/sop_index.v1.json
--------------------------------------------------------------------------------
``json
{
  "version": "sop-index-v1",
  "default_group": "library",
  "groups": [
    {
      "id": "library",
      "title": "SOP Library (C:\\pt-study-sop\\sop\\library)",
      "root_hint": "sop/library/",
      "sections": [
        {
          "id": "library_files",
          "title": "Library Files",
          "items": [
            { "id": "library_00_overview", "title": "00 Overview", "path": "sop/library/00-overview.md", "type": "md", "tags": ["library"] },
            { "id": "library_01_core_rules", "title": "01 Core Rules", "path": "sop/library/01-core-rules.md", "type": "md", "tags": ["library"] },
            { "id": "library_02_learning_cycle", "title": "02 Learning Cycle", "path": "sop/library/02-learning-cycle.md", "type": "md", "tags": ["library"] },
            { "id": "library_03_frameworks", "title": "03 Frameworks", "path": "sop/library/03-frameworks.md", "type": "md", "tags": ["library"] },
            { "id": "library_04_engines", "title": "04 Engines", "path": "sop/library/04-engines.md", "type": "md", "tags": ["library"] },
            { "id": "library_05_session_flow", "title": "05 Session Flow", "path": "sop/library/05-session-flow.md", "type": "md", "tags": ["library"] },
            { "id": "library_06_modes", "title": "06 Modes", "path": "sop/library/06-modes.md", "type": "md", "tags": ["library"] },
            { "id": "library_07_workload", "title": "07 Workload", "path": "sop/library/07-workload.md", "type": "md", "tags": ["library"] },
            { "id": "library_08_logging", "title": "08 Logging", "path": "sop/library/08-logging.md", "type": "md", "tags": ["library"] },
            { "id": "library_09_templates", "title": "09 Templates", "path": "sop/library/09-templates.md", "type": "md", "tags": ["library"] },
            { "id": "library_10_deployment", "title": "10 Deployment", "path": "sop/library/10-deployment.md", "type": "md", "tags": ["library"] },
            { "id": "library_11_examples", "title": "11 Examples", "path": "sop/library/11-examples.md", "type": "md", "tags": ["library"] },
            { "id": "library_12_evidence", "title": "12 Evidence", "path": "sop/library/12-evidence.md", "type": "md", "tags": ["library"] },
            { "id": "library_readme", "title": "README", "path": "sop/library/README.md", "type": "md", "tags": ["library", "meta"] }
          ]
        }
      ]
    }
  ]
}
``

--------------------------------------------------------------------------------
# FILE: sop/library/00-overview.md
--------------------------------------------------------------------------------
``markdown
# PT Study OS -- Overview

**Version:** v9.4
**Owner:** Trey Tucker

## What This Is

A structured AI study operating system for DPT coursework. It enforces an end-to-end study flow -- plan, learn, test, log, review -- grounded in the learner's own materials. The system runs as a Custom GPT tutor backed by canonical SOP files.

## North Star Vision

- **Durable context** -- remembers across sessions with no drift.
- **End-to-end study flows** -- MAP (plan) -> LOOP (learn) -> WRAP (log) with minimal manual steps.
- **RAG-first, citation-first** -- all generated content grounded in the learner's indexed materials. Unverified outputs are explicitly marked.
- **Spaced, high-quality Anki cards** -- source-tagged, deduplicated, retained over years.
- **Deterministic logging** -- every session emits a Session Ledger; JSON is produced via Brain ingestion, not by the tutor.
- **No Phantom Outputs** -- if a step didn't happen, output NOT DONE / UNKNOWN; never invent.

## Lifecycle

| Phase | Modules | PEIRRO Alignment |
|-------|---------|------------------|
| **MAP** | M0 Planning, M1 Entry | Prepare |
| **LOOP** | M2 Prime, M3 Encode, M4 Build, M5 Modes | Encode, Interrogate, Retrieve |
| **WRAP** | M6 Wrap | Refine, Overlearn |

## Quick-Start: Study Session

1. Paste `sop/runtime/runtime_prompt.md` at session start.
2. Complete M0 Planning: declare target, sources, plan, pre-test.
3. Run the session through M1-M6.
4. At Wrap, output **Exit Ticket + Session Ledger** (no JSON, no spacing schedule).
5. Copy Exit Ticket + Session Ledger into Brain ingestion prompts (see `10-deployment.md`) to produce JSON logs.

## Architecture (Stable Components)

1. **Orchestration Agent** -- accepts NL tasks, calls tools with audit trail.
2. **Content Pipeline** -- normalize, transcode, transcribe, index course docs.
3. **RAG Index & Search** -- ingest API; returns snippets + citations.
4. **Study Engine (SOP Runner)** -- enforces MAP->LOOP->WRAP, Seed-Lock, gating.
5. **Card/Anki Bridge** -- add/update cards; dedupe by deck+guid; source-tag.
6. **Brain (DB + Resume)** -- ingest session logs; generate resume/readiness; versioned schemas.
7. **Multi-AI Router** -- route by task; audit model+tool used.
8. **Dashboard** -- read-only views of coverage, spacing, calibration, cards.

## Library File Map

| # | File | Description |
|---|------|-------------|
| 00 | `00-overview.md` | System identity, vision, quick-start, and library map (this file) |
| 01 | `01-core-rules.md` | All behavioral rules the tutor must follow |
| 02 | `02-learning-cycle.md` | PEIRRO macro cycle + KWIK encoding micro-loop |
| 03 | `03-frameworks.md` | H/M/Y series, Levels |
| 04 | `04-engines.md` | Anatomy Engine and Concept Engine |
| 05 | `05-session-flow.md` | M0-M6 execution flow, planning through Wrap |
| 06 | `06-modes.md` | Operating modes (Core, Sprint, Light, Quick Sprint, Drill) |
| 07 | `07-workload.md` | 3+2 rotational interleaving, sandwich, spacing |
| 08 | `08-logging.md` | Logging schema v9.4 (schema reference; JSON produced via Brain ingestion) |
| 09 | `09-templates.md` | Exit ticket, session ledger, weekly plan/review templates |
| 10 | `10-deployment.md` | Custom GPT deployment guide + Brain ingestion prompts |
| 11 | `11-examples.md` | Command reference and dialogue examples |
| 12 | `12-evidence.md` | Evidence base, NotebookLM bridge, research backlog |
| 13 | `13-custom-gpt-system-instructions.md` | Custom GPT system instructions (v9.4 Lite Wrap) |
| 14 | `14-lo-engine.md` | Learning Objective Engine (LO Engine) protocol pack + outputs |

## Schemas / Contracts

- **Session Log v9.4:** date, topic, mode, duration_min, understanding, retention, calibration_gap, rsr_percent, cognitive_load, transfer_check, anchors, what_worked, what_needs_fixing, error_classification, error_severity, error_recurrence, notes (Tracker); plus source_lock, plan_of_attack, frameworks_used, buckets, anki_cards, exit_ticket fields, spaced_reviews, etc. (Enhanced). JSON is produced via Brain ingestion, not by the tutor at Wrap. Additive-only changes unless Master Plan is updated.
- **RAG Doc v1:** `{id, source_path, course, module, doc_type, created_at, checksum, text_chunks[], image_captions[], metadata{}}`.
- **Card v1:** `{deck, guid, front, back, tags[], source_refs[], created_at, updated_at}`.
- **Resume v1:** `{generated_at, readiness_score, recent_sessions[], topic_coverage[], gaps[], recommendations[]}`.

---

## Governance

- Any change to Vision, Invariants, Architecture, or Schemas requires editing this file.
- Version plans (e.g., v9.2) may adjust scope but cannot violate invariants/contracts.
- New fields must be additive and documented; DB migrations must be provided when schemas change.
- PR checklist: Does this break an invariant/contract? If yes, update Master Plan or reject.

---

## Roadmap Ladder (Fixed Rungs)

1. Download/organize course docs.
2. Transcode/transcribe + index (text+images).
3. RAG-backed SOP: answers/cards cite sources (no free hallucination).
4. Card bridge hardening: dedupe/queues/offline fallback/source tags.
5. Dashboard & spacing: coverage, readiness, spacing alerts, calibration.
6. Multi-AI router with audit/fallbacks.
7. Automation/scheduling: daily sync, ingest, resume, spaced notifications.

---

## Operational Minimums

- Session template enforced; ingestion + resume generation work.
- RAG reachable; if offline, mark outputs as unverified.
- One-command sync (downloads + ingest + resume).
- Health checks: content fetch, RAG search, Anki connect, DB integrity.
- Planning phase includes an interleaving check of prior weak anchors.

---

## Program Goals

- **Near-term (Dec 2025 finals):** Zero missing session logs; each session logs what worked/what didn't; draft cards in â‰¥30% of sessions.
- **Next semester start:** Stable loop (plan â†’ learn â†’ log â†’ card draft); off-source drift <5%; weekly readiness/test-score trend.
- **Calendar sync:** Design only; build after semester ends (lowest priority).

---

## Source of Truth

Canonical content lives in `sop/library/`. Runtime bundles in `sop/runtime/` are generated artifacts. If any file conflicts with canonical source, canonical wins. Do not edit runtime files directly.
``

--------------------------------------------------------------------------------
# FILE: CONTINUITY.md
--------------------------------------------------------------------------------
``markdown
# CONTINUITY\n

- 2026-01-21 18:47:42: Replaced C:\pt-study-sop\brain\data\pt_study.db with C:\Users\treyt\Downloads\pt_study.db after backup (pt_study.db.bak_20260121_184637). Counts: sessions=2, wheel_courses=5, quick_notes=4, courses=0.

- 2026-01-21 18:56:35: Rebuilt dashboard_rebuild and copied dist/public to C:\pt-study-sop\brain\static\dist to apply notes z-index/Tailwind pipeline fixes (already present in source).

- 2026-01-22 10:51:47: Moved Google Calendar OAuth credentials to env overrides in gcal config; cleared committed client_id/client_secret from GoogleCalendarTasksAPI.json and brain/data/api_config.json.

- 2026-01-22 11:03:35: Updated brain/.env from GoogleCalendarTasksAPI.json (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI).

- 2026-01-22 11:25:23: Backfilled GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in brain/.env from brain/data/gcal_token.json so auth status can resolve config.

- 2026-01-22 11:45:00: Rebuilt dashboard_rebuild (npm run build) and copied dist/public to brain/static/dist to refresh UI bundle (Manage Calendars dialog).

- 2026-01-22 11:48:39: Raised DialogContent z-index in dashboard_rebuild and rebuilt/copied dist to brain/static/dist to fix Manage modal overlay covering content.

- 2026-01-22 11:54:40: Adjusted Dialog overlay/content z-index (overlay z-40, content z-50) and rebuilt/copied dist to brain/static/dist.

- 2026-01-22 13:33:13: Replaced DialogContent positioning with standard Tailwind classes (left-1/2/top-1/2 and translate) and rebuilt/copied dist to brain/static/dist.

- 2026-01-22 13:46:41: Adjusted DialogContent centering to explicit 50% translate values and rebuilt/copied dashboard_rebuild dist to brain/static/dist.

- 2026-01-22 13:49:35: Added dialog-center utility for fixed dialog centering, updated dialog/alert-dialog classes, rebuilt dashboard_rebuild, and copied dist/public to brain/static/dist.

- 2026-01-22 13:57:08: Added max height and vertical scroll to Dialog/AlertDialog content to keep tall modals within viewport; rebuilt dashboard_rebuild and copied dist/public to brain/static/dist.

- 2026-01-22 13:58:42: Added top/bottom borders to Quick Notes sheet panel in layout and rebuilt/copied dashboard_rebuild dist to brain/static/dist.

- 2026-01-22 14:01:03: Inset Quick Notes sheet panel (inset-y-4) and set h-auto to reveal top/bottom borders; rebuilt dashboard_rebuild and copied dist/public to brain/static/dist.

- 2026-01-22 14:03:17: Adjusted Quick Notes sheet inset to 8px (inset-y-2) and rebuilt/copied dashboard_rebuild dist to brain/static/dist.

- 2026-01-22 14:04:36: Tightened Quick Notes sheet inset to 4px (inset-y-1) and rebuilt/copied dashboard_rebuild dist to brain/static/dist.

- 2026-01-22 14:06:01: Increased Quick Notes sheet inset to 12px (inset-y-3) and rebuilt/copied dashboard_rebuild dist to brain/static/dist.

- 2026-01-22 15:41:44: Added agent-browser commands to permissions.json to enable automated UI audit.

- 2026-01-22 16:58:16: Documented full UI + API audit in docs/full-ui-api-audit-2026-01-22.md (no code changes).

- 2026-01-22 17:01:00: Policy update — after each successful upgrade or change, push to GitHub.

- 2026-01-22 18:30:51: Added YAML frontmatter to Codex skills refactor-clean and tdd; normalized arrows to ASCII in refactor-clean.

- 2026-01-22 18:46:16: Synced ai-config to root/.claude, corrected pt-study-sop path references in AI instructions, added root permissions.json sync, and documented Codex/OpenCode usage.

- 2026-01-22 18:50:34: Updated AGENTS.md wording to reflect sync (not symlink) and re-synced to root/.claude.

- 2026-01-23 08:15:00: Added AI assistant Google connection status CTA in calendar panel.

- 2026-01-23 01:43:49: Updated Ralph.bat to detect existing Ralph TUI session locks and prompt to resume, force resume, or clear state before starting PRD mode.
- 2026-01-23 09:10:22: Enhanced Google Calendar auth flow to load stored OAuth token credentials, refresh expired tokens, and return re-auth required errors when tokens are missing or invalid.
- 2026-01-23 10:05:00: Expanded calendar assistant CRUD to search all calendars and added update event support with calendar/event IDs in responses.


- 2026-01-23 10:23:48: Expanded AI permissions allowlist to include broad PowerShell/cmd execution for on-demand inspection and troubleshooting.

- 2026-01-23 10:36:14: Added Ralph.bat session health check (status option + stale warning) to detect likely stuck runs.
- 2026-01-23 11:22:00: Updated calendar Google event API calls to use backend routes, refresh queries after AI edits, and normalize recurrence defaults for UI.
- 2026-01-23 12:05:00: Refreshed Calendar Assistant connection status on open, hid not-connected label when linked, and updated CTA copy to "Connect Google Calendar".


- 2026-01-23 10:25:10: Cleared stale Ralph session state by archiving .ralph-tui lock/session files and restarted Ralph TUI in a new console window.

- 2026-01-23 04:49:51: Added MASTER_SOP docs for material ingestion, session start, and progress tracking; updated MASTER_SOP index.

- 2026-01-23 04:59:11: Mirrored MASTER_SOP 05/06/07 into sop/src, added progress tracker template, and rebuilt runtime knowledge bundle.

- 2026-01-23 05:31:25: Added ExecPlan for dashboard rebuild in .agent/EXECPLAN_DASHBOARD.md.

- 2026-01-23 05:35:58: Added ExecPlans guidance to AGENTS.md and ai-config/AGENTS.md; added dashboard ExecPlan in .agent.

- 2026-01-23 05:41:48: Added .agent/context scaffold with README usage notes for scratch, plans, memory, agents, and terminals.

- 2026-01-23 15:20:32: Added DASHBOARD_IMPLEMENTATION_PLAN.md, PROJECT_OVERVIEW.md, and zclean-up/ to git tracking.

- 2026-01-23 16:01:35: Added Start_Project.bat and .agent/context tracking files (START_PROJECT.md, STATUS.md, logs, handoff template).

- 2026-01-23 16:04:19: Consolidated plan docs into JANUARY_26_PLAN/ and removed root copies; added Start_Project scaffold files.
- 2026-01-23 18:42:34: Added agent routing guidance, moved root docs into docs/root with updated references, added README files for ai-config/.claude/docs/root, and synced AGENTS/CLAUDE instructions.
- 2026-01-24 00:00:00: Correction: the agent routing/docs-root reorg entry above should be dated 2026-01-24.
- 2026-01-23 18:48:43: Added README guides for scripts/, JANUARY_26_PLAN/, and docs/ to align with folder README rule.
- 2026-01-23 18:59:11: Regenerated docs/root/ARCHITECTURE_CONTEXT.md and fixed generate_architecture_dump.ps1 to read sop/src/MASTER_PLAN_PT_STUDY.md.

- 2026-01-23 19:52:03: Renamed files in C:\Users\treyt\OneDrive\Desktop\PT School\Neuroscience\Week 1- Neuroscience Intro by prefixing 'Week 1_'.

- 2026-01-23 19:53:59: Renamed files in C:\Users\treyt\OneDrive\Desktop\PT School\Neuroscience\Week 2- Cell Properites and transmission II CNS vs PNS Intro by prefixing 'Week 2_'.

- 2026-01-23 19:54:28: Renamed files in C:\Users\treyt\OneDrive\Desktop\PT School\Neuroscience\Week 3- Spinal Cord- PNS, Spinal Cord Injury and Clinical Implications by prefixing 'Week 3_'.
- 2026-01-24 00:15:00: Completed JANUARY_26_PLAN milestones 1-6 (schema/storage/routes/api/prompts/ingestion UI), added dashboard_rebuild READMEs per AGENTS rule, created EXECPLAN_MILESTONE_INSTRUCTIONS, backed up data.db and ran db:push; npm run check still fails due to pre-existing TypeScript issues.
- 2026-01-24 00:25:00: Fixed pre-existing TypeScript issues (AcademicDeadline type, use-mobile hook re-export, scholar/brain typing fallbacks, BrainMetrics export, JSON parsing in metrics), added better-sqlite3.d.ts, reordered /api/sessions/last-context route, and made npm run dev Windows-friendly; verified npm run check passes and dev server responds to ingestion endpoints.
- 2026-01-24 00:45:00: Added Check_Dashboard.ps1 to identify whether /brain is served by dashboard_rebuild (Express/Vite) or legacy Flask dashboard via header/API probes.
- 2026-01-24 01:05:00: Added Check_Dashboard.bat to identify whether /brain is served by dashboard_rebuild (Express/Vite) or legacy Flask dashboard via header/API probes.
- 2026-01-24 01:20:00: Updated Check_Dashboard.bat to pause so output stays visible when double-clicked.
- 2026-01-24 01:30:00: Added Start_And_Check_Dashboard.bat to start the new or legacy dashboard, open /brain, then run the dashboard checker.
- 2026-01-24 01:40:00: Removed Check_Dashboard.ps1, Check_Dashboard.bat, and Start_And_Check_Dashboard.bat per request to avoid clutter.
- 2026-01-24 01:55:00: Updated Start_Dashboard.bat to start legacy dashboard on :5000 and dashboard_rebuild dev server on :5001, then open /brain in separate tabs.
- 2026-01-23 22:46:21: Updated ai-config/AGENTS.md to emphasize per-folder README requirements and re-synced AGENTS mirrors. Converted dashboard_rebuild to frontend-only (build.ts, package.json scripts, tsconfig include, README) and noted API ownership in root README. Pending removal of dashboard_rebuild/server after confirmation.
- 2026-01-23 22:46:21: Rebuilt dashboard_rebuild (npm run build) and copied dist/public to brain/static/dist to refresh the Flask-served UI.
- 2026-01-23 22:52:16: Removed C:\pt-study-sop\dashboard_rebuild\server to eliminate the 5001 Node server.
- 2026-01-23 23:25:01: Updated JANUARY_26_PLAN docs (INDEX, UPDATED_PLAN, EXECPLAN_DASHBOARD, REFERENCE_DOCS, MILESTONE_INSTRUCTIONS) to reflect single-dashboard Flask API/DB ownership and removed Node server usage; added Agent Hygiene section to README.
- 2026-01-24 00:34:30: Updated C:\Users\treyt\.codex\config.toml to add developer_instructions preferring swarm/subagent usage for large tasks.
- 2026-01-24 00:21:44: Added note categories (notes/planned/ideas) with note_type support in quick_notes, updated notes API + dashboard_rebuild notes panel, seeded a planned Scholar update note on first load, ran db_setup, rebuilt dashboard_rebuild and copied dist/public to brain/static/dist.
- 2026-01-24 00:26:28: Widened main dashboard layout and notes sheet, improved notes category tabs, and added optimistic reordering so dragged notes persist; rebuilt dashboard_rebuild and refreshed brain/static/dist.
- 2026-01-24 00:32:17: Added cross-category drag-and-drop for notes (Notes/Planned/Ideas), improved reordering logic with optimistic updates, and seeded planned items for LangGraph/LangChain/LangSmith; rebuilt dashboard_rebuild and refreshed brain/static/dist.
- 2026-01-24 00:36:18: Enabled drag-and-drop between notes categories with section drop zones and highlights; rebuilt dashboard_rebuild and refreshed brain/static/dist.
- 2026-01-24 00:38:24: Added HTML5 drag dataTransfer setup and dropEffect hints to enable cross-category note drops; rebuilt dashboard_rebuild and refreshed brain/static/dist.
- 2026-01-24 00:42:50: Updated notes reorder API to persist note_type and added quick_notes schema guard; removed redundant type-change PATCH on drag; rebuilt dashboard_rebuild and refreshed brain/static/dist.
- 2026-01-24 00:44:13: Moved Notes sheet close button to the left with theme styling and hid default Sheet close button; rebuilt dashboard_rebuild and refreshed brain/static/dist.

- 2026-01-24 01:10:23: Implemented WRAP ingestion end-to-end: added tutor_issues table and API endpoints, created wrap_parser + obsidian_merge modules, wired WRAP flow into brain_chat with Obsidian managed-block merge and Anki drafts, updated Brain UI with Paste WRAP + summary panel, added pages/README, and added wrap parser tests. Ran pytest, release_check, and dashboard_rebuild build (vite chunk size warning only).

- 2026-01-24 01:51:56: Fixed study-wheel session sync to session evidence (set topic + time_spent_minutes on wheel completion, improved minutes fallbacks in session serialization and brain metrics) and added Vite code-splitting (lazy-loaded pages + manualChunks) to eliminate build chunk-size warnings. Ran pytest and dashboard_rebuild build.

- 2026-01-24 01:57:59: Backfilled session minutes (time_spent_minutes from duration_minutes) via PT_BRAIN_BACKFILL_MINUTES and updated study-wheel session insert + metrics minutes fallback; added Vite route-level code-splitting/manualChunks to resolve chunk-size warning.
- 2026-01-25 12:45:16: Installed oh-my-opencode in WSL (Ubuntu) using Node 20 via nvm and ran the installer to configure Claude max20, OpenAI, Gemini, and Copilot; configs written to /home/treyt/.config/opencode/opencode.json and /home/treyt/.config/opencode/oh-my-opencode.json.


- 2026-01-25 14:40:10: Added docs/project Project Hub (INDEX, ROADMAP, CURRENT_MILESTONE, DECISIONS, STATUS, REFERENCES, README), linked entrypoints in README and docs/README, and added scripts/validate_project_hub.py.

- 2026-01-25 14:54:04: Added DOCS_INDEX.md entrypoint and linked it from README.md and docs/README.md.

- 2026-01-25 15:12:08: Added repo hygiene doc (docs/project/REPO_HYGIENE.md), hygiene audit script (scripts/audit_repo_hygiene.py), and linked quality gate in docs/project/INDEX.md.

- 2026-01-25 15:17:53: Reduced audit_repo_hygiene.py noise with ignore prefixes, warning grouping, and stricter fail scope; documented audit enforcement in docs/project/REPO_HYGIENE.md.

- 2026-01-25 15:23:51: Expanded audit_repo_hygiene.py planning-keyword ignore prefixes and updated repo hygiene exemptions.
- 2026-01-25 19:46:18: Refactored Brain page layout with KPI HUD, 75/25 grid, sticky chat, compact session table, status bar, and collapsed ingestion/integrations panels; reduced background grid opacity and added brain card utility styles.
- 2026-01-25 20:04:20: Adjusted Brain layout flow to avoid overflow (min-width guards, responsive heights, table horizontal scroll, chat sticky sizing, and flex wrap for inputs).
- 2026-01-25 20:11:14: Removed Brain LLM chat panel and chat logic for a basic, focused layout.
- 2026-01-25 20:18:16: Removed KPI HUD and derived metrics grid to keep Brain page minimal; retained session evidence and core system panels.
- 2026-01-25 20:23:47: Reordered Brain layout: System Status first, then Data Ingestion, then Integrations, followed by Session Evidence and Issues Log.
- 2026-01-25 20:28:16: Removed WRAP file upload intake; WRAP ingestion now paste-only.
- 2026-01-25 22:51:41: Updated Brain Ingestion syllabus workflow with combined JSON prompt/import, class meeting expansion to calendar events, and inline module/schedule editing+deletion in the UI.
- 2026-01-26 00:11:00: Hardened modal behavior (z-index + max-height/scroll), guarded calendar edit modals against null events, and ensured dialogs only close on explicit close to prevent black overlay without content.
- 2026-01-26 00:22:00: Documented persistent modal overlay issue and prior fix attempts in dashboard_rebuild/client/src/pages/README.md for tracking.
- 2026-01-26 00:32:00: Added modal debug HUD/logging and stricter data-backed open guards for Brain/Calendar dialogs; documented attempt in pages README.
- 2026-01-26 00:41:00: Forced dialog/alert-dialog opacity on open and added data-modal attrs for DOM tracing; documented in pages README.
- 2026-01-26 00:49:00: Raised dialog/alert-dialog z-index and forced pointer-events auto on content to prevent overlay-only lock-ups; documented in pages README.
- 2026-01-25 23:00:16: Fixed validate_sop_index.py backslash check and scoped release_check.py pytest run to brain/tests to avoid capture errors.
- 2026-01-26 00:58:00: Forced dialog/alert-dialog portals to render in document.body to prevent fixed-positioning relative to transformed ancestors; documented in pages README.
- 2026-01-26 01:07:00: Disabled modal behavior + animations for Calendar Manage dialog, added MANAGE click logging; set dialog/alert overlay pointer-events to none to prevent overlay-only locks.
- 2026-01-25 23:18:38: Added checkbox selection, select-all, and bulk delete for modules and schedule items on the Brain Ingestion page (new bulk-delete endpoints).
- 2026-01-26 01:22:00: Forced Calendar Manage dialog inline positioning + z-index to keep it in viewport; documented in pages README.
- 2026-01-25 23:24:38: Added Delete All buttons for modules and schedule items on the Brain Ingestion page.
- 2026-01-25 23:33:32: Replaced native confirm with themed AlertDialog for bulk delete on Brain Ingestion.
- 2026-01-25 23:38:27: Fixed bulk delete confirmation by persisting payload in a ref so the themed dialog executes deletes reliably.
- 2026-01-26 01:39:00: Forced Brain delete confirmation dialog inline positioning + z-index to keep it in viewport; documented in pages README.
- 2026-01-25 23:45:12: Swapped native checkboxes for themed Checkbox components in Brain Ingestion tables.
- 2026-01-25 23:49:57: Restyled bulk delete confirmation dialog in Brain Ingestion to match app theme.
- 2026-01-26 01:53:00: Applied inline positioning + z-index to remaining dialogs (Brain edit session/draft; Calendar create/edit/edit-Google) to prevent off-screen rendering.
- 2026-01-26 02:03:00: Applied inline positioning + z-index to ingestion bulk delete confirmation dialog (Schedule/Modules delete selected/all) to prevent off-screen rendering.
- 2026-01-25 23:55:24: Added error handling for bulk deletes and forced confirmation action button type to ensure delete fires.
- 2026-01-25 23:57:58: Allowed OPTIONS on bulk-delete endpoints to prevent 405 on delete requests.
- 2026-01-26 00:03:12: Added academic deadline inserts for assignment/quiz/exam during syllabus and schedule imports.
- 2026-01-26 00:16:40: Updated syllabus prompt defaults (term dates/timezone) and added JSON extraction for pasted LLM outputs.
- 2026-01-26 00:29:10: Added delivery field to schedule items, replaced Delete All with Save Selected, and removed cancel buttons.
- 2026-01-26 00:37:18: Adjusted module bulk/action buttons to Check All, Delete, Save and per-row Save/Delete only.
- 2026-01-26 00:39:55: Mirrored schedule section buttons to Check All, Delete, Save and per-row Save/Delete only.
- 2026-01-26 00:44:52: Updated docs to reference Start_Dashboard.bat instead of Run_Brain_All.bat.
- 2026-01-26 00:46:38: Updated permissions allowlist to Start_Dashboard.bat.
-   2 0 2 6 - 0 1 - 2 6   1 4 : 0 0 : 0 9 :   U p d a t e d   c a l e n d a r   m a n a g e   U I   t o   s u p p o r t   d r a g - a n d - d r o p   o r d e r i n g ,   l o c a l   c a l e n d a r   s e l e c t i o n ,   a n d   s e l e c t i o n - o n l y   f i l t e r i n g ;   p e r s i s t e d   c a l e n d a r   o r d e r / s e l e c t i o n   i n   l o c a l S t o r a g e . 
 
 -   2 0 2 6 - 0 1 - 2 6   1 4 : 1 4 : 2 3 :   R e b u i l t   d a s h b o a r d _ r e b u i l d   a n d   c o p i e d   d i s t / p u b l i c   t o   b r a i n / s t a t i c / d i s t   f o r   c a l e n d a r   M a n a g e   o r d e r i n g   +   s e l e c t i o n - o n l y   f i l t e r i n g . 
 
 - 2026-01-26 15:07:33: Backed up uncommitted files to _codex_backups and reverted Brain session filter/query UI changes in dashboard_rebuild/client/src/pages/brain.tsx.
-   2 0 2 6 - 0 1 - 2 6   1 5 : 1 0 : 0 2 :   U p d a t e d   A G E N T S . m d   t o   r e q u i r e   a   g i t   c o m m i t   a f t e r   c h a n g e s ;   s y n c e d   m i r r o r s . 
 
 - 2026-01-26 21:11:43: Rebuilt dashboard_rebuild and copied dist/public to brain/static/dist for updated Brain UI.
- 2026-01-26 22:23:50: Updated permissions allowlist to run Windows test commands (pytest, Flask, ingest script).
\n## 2026-01-27
- Added `bash -lc` to `permissions.json` allowlist to permit WSL package install commands for jq.
\n## 2026-01-27
- Added `robocopy` to `permissions.json` allowlist for Windows build copy step.
- Rebuilt `dashboard_rebuild` and synced `dist/public` to `brain/static/dist`.
- Added README files to `brain/output` and `brain/static` per repo folder documentation rule.
- 2026-01-27 12:23:23: Added dashboard window inventory documentation and dashboard docs README.
- 2026-01-27 12:55:00: Updated AGENTS.md commit-message rule to auto-generate when not provided; synced mirrors.
- 2026-01-27 22:13:13: Added Codex MCP server config and documented the Claude Code review loop workflow.
- 2026-01-27 22:55:06: Added root Claude/Codex review loop quick-start instructions.
- 2026-01-28 14:20:00: Added npx skills find to permissions allowlist.
- 2026-01-28 14:28:00: Added npx skills add to permissions allowlist.
- 2026-01-28 14:35:00: Personalized CLAUDE.md for Trey with system-specific details.
- 2026-01-28 14:44:00: Updated CLAUDE.md with Obsidian vault path for Trey.
- 2026-01-28 14:47:00: Added Trey response style preference to CLAUDE.md.
- 2026-01-28 14:50:00: Noted npm as preferred frontend package manager.
- 2026-01-28 14:54:00: Added rule to push after every change.
- 2026-01-28 14:57:00: Removed git push from permissions require_confirmation to allow auto-push.
- 2026-01-28 15:00:00: Added Trey git identity to CLAUDE.md.
- 2026-01-28 15:05:00: Set default to run relevant checks after code changes.
- 2026-01-28 15:10:00: Marked docs/README.md as canonical docs index.
- 2026-01-28 15:13:00: Added do-not-edit rules for archive/ and brain/static/dist/.
- 2026-01-28 15:16:00: Added no-destructive-commands rule.
- 2026-01-28 15:18:00: Added auto-commit rule to CLAUDE.md.
- 2026-01-28 15:21:00: Added shell preference (PowerShell default; WSL/Git Bash when required).
- 2026-01-28 15:25:00: Added editor preference (Codex/Claude Code).
- 2026-01-28 15:29:00: Added safe-by-default git rule to CLAUDE.md.
- 2026-01-28 15:33:00: Clarified dashboard запуск rule (Start_Dashboard.bat only).
- 2026-01-28 15:36:00: Added Google Calendar credentials handling note.
- 2026-01-28 15:43:00: Added external systems section to CLAUDE.md.
- 2026-01-28 15:46:00: Updated Tutor note (CustomGPT only; no local launcher).
- 2026-01-28 15:48:00: Added CustomGPT name to CLAUDE.md.
- 2026-01-28 15:51:00: Marked Anki/AnkiConnect as active use.
- 2026-01-28 15:52:00: Marked Google Calendar/Tasks as active use.
- 2026-01-28 17:30:00: Added PRD for calendar month view and event management improvements.
-   2 0 2 6 - 0 1 - 2 9   1 8 : 2 9 : 3 0 :   A d d e d   d e v e l o p e r   w o r k f l o w   d i s c o v e r y   e x a m p l e   a n d   r e v i e w - l o o p   p r o m p t   t o   C L A U D E _ C O D E X _ R E V I E W _ L O O P . m d . 
 
 
- 2026-01-29: Calendar page fixes — (1) selectedCalendars now persists to localStorage with SAVE button, initializes from localStorage on mount with try/catch + Array.isArray guard. (2) New LocalEventEditModal.tsx with 4-tab interface (DETAILS, TIME, TYPE, REPEAT) covering all 10 editable DB fields, replacing the old 4-field inline dialog. Updated mutation to send all fields. (3) Added Post-Implementation Checklist section to CLAUDE.md to enforce build+copy workflow.

- 2026-01-29: Added end-of-session hookify rule (.claude/hookify.end-of-session-checklist.local.md) that prompts 5-step cleanup checklist when session-ending phrases detected. Added calendar SAVE dirty/saved indicator dot and toast feedback. Captured 4 session learnings to CLAUDE.md.

 -   2 0 2 6 - 0 1 - 2 9 :   U n i f i e d   l o c a l / G o o g l e   e v e n t   e d i t   o p t i o n s ,   w i r e d   l o c a l   e v e n t   f i e l d s   t o   D B / A P I ,   a n d   f i x e d   G o o g l e   u p d a t e / d e l e t e   +   m e t a d a t a   p e r s i s t e n c e   f o r   e v e n t T y p e / c o u r s e / w e i g h t .   R e b u i l t   d a s h b o a r d   a n d   s y n c e d   d i s t . 
 
 
 
 -   2 0 2 6 - 0 1 - 2 9 :   R a i s e d   S e l e c t   m e n u   z - i n d e x   t o   s h o w   d r o p d o w n s   a b o v e   c a l e n d a r   e d i t   d i a l o g s ;   r e b u i l t   a n d   s y n c e d   d a s h b o a r d . 
 
 
 
 -   2 0 2 6 - 0 1 - 2 9 :   A d d e d   z - i n d e x   o v e r r i d e s   o n   c a l e n d a r   S e l e c t   m e n u s   t o   k e e p   d r o p d o w n s   a b o v e   e d i t   d i a l o g s ;   r e b u i l t   a n d   s y n c e d   d a s h b o a r d . 
 
 
 
 -   2 0 2 6 - 0 1 - 2 9 :   R e p l a c e d   t i m e z o n e   i n p u t s   w i t h   d r o p d o w n s   ( l o c a l   +   G o o g l e ) ,   p e r s i s t i n g   s e l e c t i o n   v i a   l o c a l   t i m e _ z o n e   a n d   G o o g l e   e x t e n d e d P r o p e r t i e s ;   r e b u i l t   a n d   s y n c e d   d a s h b o a r d . 
 
 
 - 2026-01-29: Fixed calendar edit modal hook ordering (timezone useMemo now before null guard) to prevent black-screen crash when opening events; rebuilt and synced dashboard.
- 2026-01-29: Restored local event color rendering by applying calendarColor inline styles for all events; moved edit modals down to avoid header clipping; rebuilt and synced dashboard.
- 2026-01-29: Limited timezone dropdowns to America zones and added course dropdowns backed by study wheel courses in calendar edit modals; rebuilt and synced dashboard.
- 2026-01-29: Linked study wheel courses to canonical courses (course_id + code), updated course APIs to return canonical IDs, and wired calendar course dropdowns to store courseId/courseCode; restricted timezones to America-only; rebuilt and synced dashboard.
- 2026-01-29: Added course number input for new Study Wheel courses (no retroactive edits); wired to course create API; rebuilt and synced dashboard.
- 2026-01-29: Anchored dashboard dialogs (add/edit course, add deadline, edit task, delete course) to top offset to prevent off-screen modal overlay; rebuilt and synced dashboard.
- 2026-01-29: Added course number field to edit course dialog (Study Wheel) and update payload; render calendar edit modals only when selected events exist to avoid black-screen overlay; rebuilt and synced dashboard.
-   2 0 2 6 - 0 1 - 2 9 :   U p d a t e d   A G E N T S . m d   w i t h   p r o j e c t - e x p l o r a t i o n - b e f o r e - s k i l l s   g u i d a n c e ,   S w i f t U I   r e t r i e v a l - f i r s t   r u l e ,   a n d   d o c s   T a b l e   o f   C o n t e n t s   r e q u i r e m e n t . 
 
 - 2026-01-29: Fixed calendar edit modal crash by rendering course dropdown options as course names/ids (not raw objects) in local + Google edit modals; rebuilt and synced dashboard.
-   2 0 2 6 - 0 1 - 2 9 :   N o t e d   i n   C L A U D E . m d   t o   r e a d   A G E N T S . m d   f o r   a g e n t   b e h a v i o r   r u l e s . 
 
 - 2026-01-29: Strengthened Calendar Sync button to refresh Google status, calendar list, and events; auto-resets calendar selection if it no longer matches current Google calendars; added sync success/failure toasts; rebuilt and synced dashboard.
- 2026-01-29: Sync now forces Google calendar selection to all current calendars and clears hidden calendars so the dashboard mirrors Google after sync; rebuilt and synced dashboard.
- 2026-01-29: Updated repo instructions (AGENTS.md, CLAUDE.md) to explicitly require reading global C:\\Users\\treyt\\.claude\\CLAUDE.md first.
- 2026-01-29: Calendar create now writes to Google when a Google calendar is selected; local events are restricted to calendarId=local, and local events assigned to Google calendars are hidden when Google is connected to prevent duplicate listings.
- 2026-01-29: Normalized Google all-day event end dates to avoid spillover, split all-day end handling for local vs Google creates, and tagged local events with google calendar IDs so Google-connected views hide duplicates; rebuilt and synced dashboard.
- 2026-01-29: Wired Calendar Sync button to call /api/gcal/sync (bidirectional), then refresh local + Google events and show sync counts in toast; rebuilt and synced dashboard.
- 2026-01-29: Fixed Google all-day date shift by parsing date-only values as local dates, added Google event GET for recurring series lookup, and display series recurrence for instances; rebuilt and synced dashboard.
- 2026-01-29: Enriched Google event list responses with master recurrence for instances so Repeat tab shows actual series pattern.
- 2026-01-30: Added Google recurring edit controls (instance vs series), delete instance/series actions, and screen-reader title/description in EventEditModal; wired instance-to-series switch in calendar page; rebuilt and synced dashboard.
- 2026-01-30: Reduced calendar edit modal height and top offset to fit the viewport (local + Google); rebuilt and synced dashboard.
- 2026-01-30: Increased calendar edit modal max height and enabled flex scroll shrink (min-h-0) so inner content fits and scrolls; rebuilt and synced dashboard.
- 2026-01-30: Widened Google edit modal (max-w override with viewport clamp) so synced event forms fit the window; rebuilt and synced dashboard.
- 2026-01-30: Added sop/sop_index.v1.json manifest pointing the Tutor SOP Explorer to sop/library (source of truth).
- 2026-01-30: Rewrote sop/sop_index.v1.json without BOM to fix /api/sop/index 500.
- 2026-01-30: Added SOP runtime bundle generator/validator, golden log tests, and runtime prompt outputs for Custom GPT v9.3 (sop/runtime, sop/tools, sop/tests).
- 2026-01-30: Added ExecPlan for SOP runtime bundle build in .agent/context/plans/SOP_RUNTIME_V9_3_CUSTOM_GPT_EXECPLAN.md.
- 2026-01-30: Updated sop/library/10-deployment.md with multi-domain prefixes, UNVERIFIED summary, anki_cards encoding, and canonical source note.
- 2026-01-31: Updated M6 Wrap heading compatibility in session flow and made build_runtime_bundle wrap heading detection flexible with a wrap-found message.
-   2 0 2 6 - 0 1 - 3 1 :   A d d e d   L i t e   W r a p   e x a m p l e   h e a d i n g   i n   1 1 - e x a m p l e s   a n d   m a d e   e x a m p l e   e x t r a c t i o n   t o l e r a n t   t o   m i s s i n g   h e a d i n g s   i n   b u i l d _ r u n t i m e _ b u n d l e . 
 
 - 2026-01-31: Added v9.4 Custom GPT system instructions to SOP library and linked in overview.
- 2026-01-31: Updated v9.4 Custom GPT system instructions with pre-test guardrail (NO-GUESS), first exposure vs review rule, and LO relabel restriction.
-   2 0 2 6 - 0 1 - 3 1 :   B u i l t   d a s h b o a r d   f r o n t e n d   a n d   s y n c e d   b r a i n / s t a t i c / d i s t   f r o m   d a s h b o a r d _ r e b u i l d / d i s t / p u b l i c   f o r   l i v e   d e p l o y . 
 
 
## 2026-01-31

- 2026-01-31 22:10:00: Completed UI Overhaul v9.4.2 boulder work - all core features delivered (11 commits total):
  - Runtime bundle drift resolved (8ac74c5f)
  - Scholar runnable backend + frontend (dc97111d, ca985eec, b88e6ac0, 1d320047)
  - Planner CTA after JSON attach (93490a5b)
  - Dashboard compact preview with top 3 tasks + Open Brain button (2f05a0da, bdb5207a)
  - Brain tab reorganization: DAILY/WEEKLY/ADVANCED → TODAY/THIS WEEK/TOOLS/DATA (990cecd1)
  - Scholar tab consolidation: 7 tabs → 3 tabs (SUMMARY/ANALYSIS/PROPOSALS) with new ANALYSIS section (b88e6ac0, 1d320047)
  - Documentation and plan completion (07ee0e64, 55989154, e7e5e1e4, 26cbf75b)
  - Calendar view separation deferred to v9.4.3 (documented in .sisyphus/notepads/ui-overhaul-v9.4.2/calendar-deferred.md)
  - **Action required:** 4 commits need manual push (26cbf75b, 55989154, 2f05a0da, 1d320047) - git push failed due to WSL auth
-   2 0 2 6 - 0 1 - 3 1 :   R e b u i l t   d a s h b o a r d   a n d   r e - s y n c e d   b r a i n / s t a t i c / d i s t   f r o m   d a s h b o a r d _ r e b u i l d / d i s t / p u b l i c . 
 
 -   2 0 2 6 - 0 1 - 3 1 :   F i x e d   D a s h b o a r d / S c h o l a r   b l a c k   s c r e e n s   ( p l a n n e r   q u e u e   +   c l u s t e r i n g   m u t a t i o n   r e f s ) ;   r e b u i l t   a n d   s y n c e d   d a s h b o a r d   a s s e t s . 
 
 -   2 0 2 6 - 0 1 - 3 1 :   F i x e d   S c h o l a r   r u n   b u t t o n   p a y l o a d   ( s e n d   J S O N   b o d y )   a n d   r e b u i l t / s y n c e d   d a s h b o a r d   a s s e t s . 
 
 -   2 0 2 6 - 0 1 - 3 1 :   W i r e d   / a p i / s c h o l a r / r u n   t o   t r i g g e r   t h e   C o d e x - b a s e d   o r c h e s t r a t o r   ( p r e v e n t s   n o - o p   r u n s ) . 
 
 - 2026-02-01: Added /api/health/db alias and DB health payload fields for smoke test.
- 2026-02-01: Removed deprecated web_search_request flag from Codex config to silence warning.
-   2 0 2 6 - 0 2 - 0 1 :   A d d e d   a g e n t   s t r a t e g y   d o c s ,   p r o m p t   p a t t e r n s ,   a n d   s y n c   s c r i p t ;   a l i g n e d   C l a u d e / C o d e x / O p e n C o d e   c o n f i g s   a n d   c o m m a n d s . 
 
 - 2026-02-01: Made /api/scholar/digest DB-first, added /api/scholar/proposals alias, fixed duplicate obsidian patch, and ignored scholar outputs.
- 2026-02-01: Added Custom GPT deployment pack doc and print helper script.
- 2026-02-01: Moved planning docs into tasks/ and stopped ignoring curated planning files in .gitignore.
- 2026-02-01: Refined Custom GPT deployment pack content and print script for acceptance test and run history.
-   2 0 2 6 - 0 2 - 0 1 :   E n a b l e d   a u t o - a p p e n d   p r o m p t   s u f f i x   d e f a u l t s   a c r o s s   C l a u d e / C o d e x / O p e n C o d e   s t r a t e g y   d o c s   a n d   r u l e s . 
 
 - 2026-02-01: Added LO Engine protocol pack doc, routing, and templates.
- 2026-02-03: Appended raw input notes to Obsidian study session sync for Brain chat.
- 2026-02-03: Added organize-preview flow with destination picker and raw+organized Obsidian sync for Brain ingest.
``

--------------------------------------------------------------------------------
# FILE: brain/db_setup.py
--------------------------------------------------------------------------------
``python
#!/usr/bin/env python3
"""
Database setup and schema initialization for PT Study Brain v9.4.
"""

import sqlite3
import os
import sys

from config import DB_PATH


def init_database():
    """
    Initialize the SQLite database with the sessions table (v9.3 schema)
    plus additive planning/RAG tables.
    """
    # Ensure data directory exists
    data_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # ------------------------------------------------------------------
    # Core sessions table (v9.3 schema)
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            -- Session Info
            session_date TEXT NOT NULL,
            session_time TEXT NOT NULL,
            time_spent_minutes INTEGER NOT NULL DEFAULT 0,
            duration_minutes INTEGER DEFAULT 0,
            study_mode TEXT NOT NULL,
            topic TEXT,

            -- Planning Phase (v9.1)
            target_exam TEXT,
            source_lock TEXT,
            plan_of_attack TEXT,

            -- Topic Coverage
            main_topic TEXT,
            subtopics TEXT,

            -- Execution Details
            frameworks_used TEXT,
            sop_modules_used TEXT,
            engines_used TEXT,
            core_learning_modules_used TEXT,
            gated_platter_triggered TEXT,
            wrap_phase_reached TEXT,
            anki_cards_count INTEGER,
            off_source_drift TEXT,
            source_snippets_used TEXT,
            prompt_drift TEXT,
            prompt_drift_notes TEXT,

            -- Anatomy-Specific (v9.1)
            region_covered TEXT,
            landmarks_mastered TEXT,
            muscles_attached TEXT,
            oian_completed_for TEXT,
            rollback_events TEXT,
            drawing_used TEXT,
            drawings_completed TEXT,

            -- Ratings
            understanding_level INTEGER,
            retention_confidence INTEGER,
            system_performance INTEGER,
            calibration_check TEXT,

            -- Anchors
            anchors_locked TEXT,
            weak_anchors TEXT,
            anchors_mastery TEXT,
            confusions TEXT,
            concepts TEXT,
            issues TEXT,

            -- Reflection
            what_worked TEXT,
            what_needs_fixing TEXT,
            gaps_identified TEXT,
            notes_insights TEXT,

            -- Next Session
            next_topic TEXT,
            next_focus TEXT,
            next_materials TEXT,

            -- Metadata
            created_at TEXT NOT NULL,
            schema_version TEXT DEFAULT '9.4',
            source_path TEXT,  -- Path to the source markdown file
            raw_input TEXT,    -- Raw plain-text intake (LLM or manual)

            -- WRAP Enhancement v9.2 fields
            anki_cards_text TEXT,          -- Semicolon-separated card titles or key Q-A pairs
            glossary_entries TEXT,         -- Short definitions of new or complex terms
            wrap_watchlist TEXT,           -- Specific recurring confusions to target in next reviews
            clinical_links TEXT,           -- Clinical correlations added during session
            next_session_plan TEXT,        -- Planned focus or materials for continuity
            spaced_reviews TEXT,           -- Explicit dates for 24h, 3d, 7d reviews
            runtime_notes TEXT,            -- Meta-notes about study behavior, KWIK rules, SOP adherence
            errors_conceptual TEXT,        -- List of conceptual errors
            errors_discrimination TEXT,    -- List of X vs Y confusions
            errors_recall TEXT,            -- List of recall failures

            -- Logging Schema v9.3 fields
            calibration_gap INTEGER,
            rsr_percent INTEGER,
            cognitive_load TEXT,
            transfer_check TEXT,
            buckets TEXT,
            confusables_interleaved TEXT,
            exit_ticket_blurt TEXT,
            exit_ticket_muddiest TEXT,
            exit_ticket_next_action TEXT,
            retrospective_status TEXT,
            tracker_json TEXT,
            enhanced_json TEXT,

            -- Session Ledger v9.4 fields
            covered TEXT,
            not_covered TEXT,
            artifacts_created TEXT,
            timebox_min INTEGER,

            -- Error classification v9.4 fields
            error_classification TEXT,
            error_severity TEXT,
            error_recurrence TEXT,

            -- Enhanced v9.4 fields
            errors_by_type TEXT,
            errors_by_severity TEXT,
            error_patterns TEXT,
            spacing_algorithm TEXT,
            rsr_adaptive_adjustment TEXT,
            adaptive_multipliers TEXT,

            UNIQUE(session_date, session_time, main_topic)
        )
    """
    )
    # Ensure all columns exist (migration for older databases)
    cursor.execute("PRAGMA table_info(sessions)")
    existing_columns = {col[1] for col in cursor.fetchall()}

    # Define all required columns with their types (from CREATE TABLE above)
    required_columns = {
        "id": "INTEGER PRIMARY KEY AUTOINCREMENT",
        "session_date": "TEXT NOT NULL",
        "session_time": "TEXT NOT NULL",
        "time_spent_minutes": "INTEGER NOT NULL DEFAULT 0",
        "duration_minutes": "INTEGER DEFAULT 0",
        "study_mode": "TEXT NOT NULL",
        "topic": "TEXT",
        "target_exam": "TEXT",
        "source_lock": "TEXT",
        "plan_of_attack": "TEXT",
        "main_topic": "TEXT",
        "subtopics": "TEXT",
        "frameworks_used": "TEXT",
        "sop_modules_used": "TEXT",
        "engines_used": "TEXT",
        "core_learning_modules_used": "TEXT",
        "gated_platter_triggered": "TEXT",
        "wrap_phase_reached": "TEXT",
        "anki_cards_count": "INTEGER",
        "off_source_drift": "TEXT",
        "source_snippets_used": "TEXT",
        "prompt_drift": "TEXT",
        "prompt_drift_notes": "TEXT",
        "region_covered": "TEXT",
        "landmarks_mastered": "TEXT",
        "muscles_attached": "TEXT",
        "oian_completed_for": "TEXT",
        "rollback_events": "TEXT",
        "drawing_used": "TEXT",
        "drawings_completed": "TEXT",
        "understanding_level": "INTEGER",
        "retention_confidence": "INTEGER",
        "system_performance": "INTEGER",
        "calibration_check": "TEXT",
        "anchors_locked": "TEXT",
        "weak_anchors": "TEXT",
        "confusions": "TEXT",
        "concepts": "TEXT",
        "issues": "TEXT",
        "anchors_mastery": "TEXT",
        "what_worked": "TEXT",
        "what_needs_fixing": "TEXT",
        "gaps_identified": "TEXT",
        "notes_insights": "TEXT",
        "next_topic": "TEXT",
        "next_focus": "TEXT",
        "next_materials": "TEXT",
        "created_at": "TEXT NOT NULL",
        "schema_version": "TEXT DEFAULT '9.4'",
        "source_path": "TEXT",
        "raw_input": "TEXT",
        # WRAP Enhancement v9.2 fields
        "anki_cards_text": "TEXT",
        "glossary_entries": "TEXT",
        "wrap_watchlist": "TEXT",
        "clinical_links": "TEXT",
        "next_session_plan": "TEXT",
        "spaced_reviews": "TEXT",
        "runtime_notes": "TEXT",
        "errors_conceptual": "TEXT",
        "errors_discrimination": "TEXT",
        "errors_recall": "TEXT",
        # Logging Schema v9.3 fields
        "calibration_gap": "INTEGER",
        "rsr_percent": "INTEGER",
        "cognitive_load": "TEXT",
        "transfer_check": "TEXT",
        "buckets": "TEXT",
        "confusables_interleaved": "TEXT",
        "exit_ticket_blurt": "TEXT",
        "exit_ticket_muddiest": "TEXT",
        "exit_ticket_next_action": "TEXT",
        "retrospective_status": "TEXT",
        "tracker_json": "TEXT",
        "enhanced_json": "TEXT",
        # Session Ledger v9.4 fields
        "covered": "TEXT",
        "not_covered": "TEXT",
        "artifacts_created": "TEXT",
        "timebox_min": "INTEGER",
        # Error classification v9.4 fields
        "error_classification": "TEXT",
        "error_severity": "TEXT",
        "error_recurrence": "TEXT",
        # Enhanced v9.4 fields
        "errors_by_type": "TEXT",
        "errors_by_severity": "TEXT",
        "error_patterns": "TEXT",
        "spacing_algorithm": "TEXT",
        "rsr_adaptive_adjustment": "TEXT",
        "adaptive_multipliers": "TEXT",
    }

    # Add missing columns (skip id and constraints that can't be added via ALTER TABLE)
    added_count = 0
    for col_name, col_type in required_columns.items():
        if col_name not in existing_columns and col_name != "id":
            # Simplify type for ALTER TABLE (avoid NOT NULL on existing tables with data)
            if "INTEGER" in col_type:
                if "DEFAULT 0" in col_type:
                    sql_type = "INTEGER DEFAULT 0"
                else:
                    sql_type = "INTEGER"
            elif "DEFAULT '9.4'" in col_type:
                sql_type = "TEXT DEFAULT '9.4'"
            else:
                sql_type = "TEXT"

            try:
                cursor.execute(f"ALTER TABLE sessions ADD COLUMN {col_name} {sql_type}")
                added_count += 1
                print(f"[INFO] Added missing column: {col_name}")
            except sqlite3.OperationalError:
                # Column might already exist - skip silently
                pass

    if added_count > 0:
        print(f"[INFO] Added {added_count} missing column(s) to sessions table")

    # Bump schema_version on rows still marked < 9.4 (idempotent)
    try:
        cursor.execute(
            "UPDATE sessions SET schema_version = '9.4' "
            "WHERE schema_version IS NULL OR schema_version < '9.4'"
        )
        bumped = cursor.rowcount
        if bumped > 0:
            print(f"[INFO] Bumped schema_version to 9.4 on {bumped} row(s)")
    except sqlite3.OperationalError:
        pass

    # ------------------------------------------------------------------
    # Additive tables for courses, events, topics, study tasks, and RAG
    # ------------------------------------------------------------------

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT,
            term TEXT,
            instructor TEXT,
            default_study_mode TEXT,
            delivery_format TEXT,  -- synchronous/asynchronous/online_module/hybrid
            time_budget_per_week_minutes INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS course_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            course TEXT,
            type TEXT NOT NULL, -- lecture/reading/quiz/exam/assignment/lab/announcement/other
            title TEXT NOT NULL,
            date TEXT,          -- primary calendar date (e.g., lecture date)
            due_date TEXT,      -- for quizzes/exams/assignments
            time TEXT,          -- HH:MM format (24-hour)
            end_time TEXT,      -- HH:MM format (24-hour)
            weight REAL DEFAULT 0.0,
            notes TEXT,
            raw_text TEXT,      -- syllabus snippet or notes
            status TEXT DEFAULT 'pending', -- pending/completed/cancelled
            color TEXT,
            recurrence_rule TEXT,
            location TEXT,
            attendees TEXT,
            visibility TEXT,
            transparency TEXT,
            reminders TEXT,
            time_zone TEXT,
            created_at TEXT NOT NULL,
            source_url TEXT,
            google_event_id TEXT,
            google_synced_at TEXT,
            google_calendar_id TEXT,
            google_calendar_name TEXT,
            google_updated_at TEXT,
            updated_at TEXT,
            FOREIGN KEY(course_id) REFERENCES courses(id)

        )
    """
    )

    # Staging area for scraped data before verification
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS scraped_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            type TEXT NOT NULL, 
            title TEXT NOT NULL,
            date TEXT,
            due_date TEXT,
            raw_text TEXT,
            source_url TEXT,
            scraped_at TEXT NOT NULL,
            status TEXT DEFAULT 'new', -- new/conflict/matched/ignored/approved
            FOREIGN KEY(course_id) REFERENCES courses(id)
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS topics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER,
            name TEXT NOT NULL,
            description TEXT,
            source_lock TEXT,          -- canonical sources for this topic
            default_frameworks TEXT,   -- e.g. \"H1, M2\"
            rag_doc_ids TEXT,          -- comma-separated IDs in rag_docs
            created_at TEXT NOT NULL,
            FOREIGN KEY(course_id) REFERENCES courses(id)
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS modules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            order_index INTEGER DEFAULT 0,
            files_downloaded INTEGER DEFAULT 0,
            notebooklm_loaded INTEGER DEFAULT 0,
            sources TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT,
            FOREIGN KEY(course_id) REFERENCES courses(id)
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS learning_objectives (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            module_id INTEGER,
            lo_code TEXT,
            title TEXT NOT NULL,
            status TEXT DEFAULT 'not_started',
            last_session_id INTEGER,
            last_session_date TEXT,
            next_action TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT,
            FOREIGN KEY(course_id) REFERENCES courses(id),
            FOREIGN KEY(module_id) REFERENCES modules(id),
            FOREIGN KEY(last_session_id) REFERENCES sessions(id)
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS lo_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lo_id INTEGER NOT NULL,
            session_id INTEGER NOT NULL,
            status_before TEXT,
            status_after TEXT,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(lo_id) REFERENCES learning_objectives(id),
            FOREIGN KEY(session_id) REFERENCES sessions(id)
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS study_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER,
            topic_id INTEGER,
            course_event_id INTEGER,
            scheduled_date TEXT,        -- when you intend to study
            planned_minutes INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending', -- pending/in_progress/completed/deferred
            actual_session_id INTEGER,  -- link back to sessions.id when done
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT,
            FOREIGN KEY(course_id) REFERENCES courses(id),
            FOREIGN KEY(topic_id) REFERENCES topics(id),
            FOREIGN KEY(course_event_id) REFERENCES course_events(id),
            FOREIGN KEY(actual_session_id) REFERENCES sessions(id)
        )
    """
    )

    # Add planner-specific columns to study_tasks if missing
    cursor.execute("PRAGMA table_info(study_tasks)")
    st_cols = {c[1] for c in cursor.fetchall()}
    for col_name, col_type in [
        ("source", "TEXT"),          # 'weak_anchor' | 'exit_ticket' | 'manual' | 'spacing'
        ("priority", "INTEGER DEFAULT 0"),
        ("review_number", "INTEGER"),  # R1=1, R2=2, R3=3, R4=4
        ("anchor_text", "TEXT"),       # the weak anchor or topic text
    ]:
        if col_name not in st_cols:
            try:
                cursor.execute(f"ALTER TABLE study_tasks ADD COLUMN {col_name} {col_type}")
            except sqlite3.OperationalError:
                pass

    # Planner settings (singleton row, id=1)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS planner_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            spacing_strategy TEXT DEFAULT 'standard',  -- 'standard' (1-3-7-21) | 'rsr-adaptive'
            default_session_minutes INTEGER DEFAULT 45,
            calendar_source TEXT DEFAULT 'local',       -- 'local' | 'google'
            auto_schedule_reviews INTEGER DEFAULT 1,    -- boolean
            updated_at TEXT
        )
    """
    )
    # Ensure singleton row exists
    cursor.execute(
        "INSERT OR IGNORE INTO planner_settings (id, updated_at) VALUES (1, datetime('now'))"
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS rag_docs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_path TEXT NOT NULL,
            course_id INTEGER,
            topic_tags TEXT,        -- comma-separated topic names/ids
            doc_type TEXT,          -- textbook/slide/transcript/note/other
            content TEXT NOT NULL,  -- plain text content used for retrieval
            checksum TEXT,          -- content checksum for change detection
            metadata_json TEXT,     -- JSON blob with page/section/etc.
            created_at TEXT NOT NULL,
            updated_at TEXT,
            FOREIGN KEY(course_id) REFERENCES courses(id)
        )
    """
    )

    # ------------------------------------------------------------------
    # Ingestion tracking table for smart file processing
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS ingested_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filepath TEXT NOT NULL UNIQUE,
            checksum TEXT NOT NULL,
            session_id INTEGER,
            ingested_at TEXT NOT NULL,
            FOREIGN KEY(session_id) REFERENCES sessions(id)
        )
    """
    )

    # Additive migration for courses table (color column for UI)
    cursor.execute("PRAGMA table_info(courses)")
    course_cols = {col[1] for col in cursor.fetchall()}
    if "color" not in course_cols:
        try:
            cursor.execute("ALTER TABLE courses ADD COLUMN color TEXT")
            print("[INFO] Added 'color' column to courses table")
        except sqlite3.OperationalError:
            pass

    if "last_scraped_at" not in course_cols:
        try:
            cursor.execute("ALTER TABLE courses ADD COLUMN last_scraped_at TEXT")
            print("[INFO] Added 'last_scraped_at' column to courses table")
        except sqlite3.OperationalError:
            pass

    if "delivery_format" not in course_cols:
        try:
            cursor.execute("ALTER TABLE courses ADD COLUMN delivery_format TEXT")
            print("[INFO] Added 'delivery_format' column to courses table")
        except sqlite3.OperationalError:
            pass

    # Additive migration for newer RAG features (safe on existing DBs)
    cursor.execute("PRAGMA table_info(rag_docs)")
    rag_cols = {col[1] for col in cursor.fetchall()}

    # NOTE: Keep defaults loose to avoid NOT NULL migration issues.
    if "corpus" not in rag_cols:
        try:
            cursor.execute("ALTER TABLE rag_docs ADD COLUMN corpus TEXT")
        except sqlite3.OperationalError:
            pass
    if "folder_path" not in rag_cols:
        try:
            cursor.execute("ALTER TABLE rag_docs ADD COLUMN folder_path TEXT")
        except sqlite3.OperationalError:
            pass
    if "enabled" not in rag_cols:
        try:
            cursor.execute("ALTER TABLE rag_docs ADD COLUMN enabled INTEGER DEFAULT 1")
        except sqlite3.OperationalError:
            pass

    # Backfill corpus/enabled defaults for older rows.
    try:
        cursor.execute("UPDATE rag_docs SET corpus = COALESCE(corpus, 'runtime')")
        cursor.execute("UPDATE rag_docs SET enabled = COALESCE(enabled, 1)")
    except sqlite3.OperationalError:
        # Column might not exist in some edge cases; ignore.
        pass

    # Indexes for common queries on sessions
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_session_date
        ON sessions(session_date)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_main_topic
        ON sessions(main_topic)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_study_mode
        ON sessions(study_mode)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_target_exam
        ON sessions(target_exam)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_region_covered
        ON sessions(region_covered)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_understanding
        ON sessions(understanding_level)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_retention
        ON sessions(retention_confidence)
    """
    )

    # Indexes for planning and RAG tables
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_course_events_course
        ON course_events(course_id)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_course_events_dates
        ON course_events(date, due_date)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_topics_course
        ON topics(course_id)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_study_tasks_schedule
        ON study_tasks(scheduled_date, status)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_rag_docs_path
        ON rag_docs(source_path)
    """
    )

    # Indexes for new corpus/folder toggles
    try:
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_rag_docs_corpus
            ON rag_docs(corpus)
        """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_rag_docs_folder
            ON rag_docs(folder_path)
        """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_rag_docs_enabled
            ON rag_docs(enabled)
        """
        )
    except sqlite3.OperationalError:
        pass
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_rag_docs_course
        ON rag_docs(course_id)
    """
    )

    # ------------------------------------------------------------------
    # Tutor turns table (tracks individual Q&A within a Tutor session)
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tutor_turns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,        -- e.g., "sess-20260109-143022"
            user_id TEXT,                    -- optional user identifier
            course_id INTEGER,
            topic_id INTEGER,
            mode TEXT,                        -- Core/Sprint/Drill
            turn_number INTEGER DEFAULT 1,
            question TEXT NOT NULL,
            answer TEXT,
            citations_json TEXT,              -- JSON array of citation objects
            unverified INTEGER DEFAULT 0,     -- 1 if answer was unverified
            source_lock_active INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY(course_id) REFERENCES courses(id),
            FOREIGN KEY(topic_id) REFERENCES topics(id)
        )
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_turns_session
        ON tutor_turns(session_id)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_turns_created
        ON tutor_turns(created_at)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_turns_topic
        ON tutor_turns(topic_id)
    """
    )

    # ------------------------------------------------------------------
    # Tutor issues table (tracks Tutor output problems from WRAP ingestion)
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tutor_issues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            issue_type TEXT,   -- hallucination, formatting, incorrect_fact, unprompted_artifact
            description TEXT,
            severity TEXT,     -- low, medium, high
            resolved INTEGER DEFAULT 0,
            created_at TEXT
        )
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_issues_session
        ON tutor_issues(session_id)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_issues_type
        ON tutor_issues(issue_type)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_issues_resolved
        ON tutor_issues(resolved)
    """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tutor_issues_created
        ON tutor_issues(created_at)
    """
    )

    # Migration: Add user_id column if missing (for existing databases)
    cursor.execute("PRAGMA table_info(tutor_turns)")
    existing_cols = {row[1] for row in cursor.fetchall()}
    if "user_id" not in existing_cols:
        cursor.execute("ALTER TABLE tutor_turns ADD COLUMN user_id TEXT")

    # ------------------------------------------------------------------
    # Topic Mastery tracking table (for relearning/weak area detection)
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS topic_mastery (
            topic TEXT PRIMARY KEY,
            study_count INTEGER DEFAULT 1,
            last_studied TEXT,
            first_studied TEXT,
            avg_understanding REAL,
            avg_retention REAL
        )
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_topic_mastery_count
        ON topic_mastery(study_count)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_topic_mastery_last_studied
        ON topic_mastery(last_studied)
    """
    )

    # ------------------------------------------------------------------
    # Anki Card Drafts table (for Tutor WRAP phase)
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS card_drafts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,              -- Link to Tutor session
            course_id INTEGER,
            topic_id INTEGER,
            deck_name TEXT DEFAULT 'PT_Study',
            card_type TEXT DEFAULT 'basic', -- basic, cloze, reversed
            front TEXT NOT NULL,
            back TEXT NOT NULL,
            tags TEXT,                    -- comma-separated
            source_citation TEXT,         -- RAG source attribution
            status TEXT DEFAULT 'draft',  -- draft, approved, synced, rejected
            anki_note_id INTEGER,         -- filled after sync
            created_at TEXT NOT NULL,
            synced_at TEXT,
            FOREIGN KEY(course_id) REFERENCES courses(id),
            FOREIGN KEY(topic_id) REFERENCES topics(id)
        )
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_card_drafts_session
        ON card_drafts(session_id)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_card_drafts_status
        ON card_drafts(status)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_card_drafts_course
        ON card_drafts(course_id)
    """
    )

    # Add google_event_id to course_events if not exists (for GCal sync)
    cursor.execute("PRAGMA table_info(course_events)")
    ce_columns = {col[1] for col in cursor.fetchall()}
    if "google_event_id" not in ce_columns:
        try:
            cursor.execute("ALTER TABLE course_events ADD COLUMN google_event_id TEXT")
        except sqlite3.OperationalError:
            pass  # Column might already exist

    # Add google_synced_at column if not exists (for GCal sync timestamp)
    if "google_synced_at" not in ce_columns:
        try:
            cursor.execute("ALTER TABLE course_events ADD COLUMN google_synced_at TEXT")
            print("[INFO] Added 'google_synced_at' column to course_events table")
        except sqlite3.OperationalError:
            pass  # Column might already exist

    if "google_calendar_id" not in ce_columns:
        try:
            cursor.execute(
                "ALTER TABLE course_events ADD COLUMN google_calendar_id TEXT"
            )
            print("[INFO] Added 'google_calendar_id' column to course_events table")
        except sqlite3.OperationalError:
            pass

    if "google_calendar_name" not in ce_columns:
        try:
            cursor.execute(
                "ALTER TABLE course_events ADD COLUMN google_calendar_name TEXT"
            )
            print("[INFO] Added 'google_calendar_name' column to course_events table")
        except sqlite3.OperationalError:
            pass

    if "google_updated_at" not in ce_columns:
        try:
            cursor.execute(
                "ALTER TABLE course_events ADD COLUMN google_updated_at TEXT"
            )
            print("[INFO] Added 'google_updated_at' column to course_events table")
        except sqlite3.OperationalError:
            pass

    if "updated_at" not in ce_columns:
        try:
            cursor.execute("ALTER TABLE course_events ADD COLUMN updated_at TEXT")
            print("[INFO] Added 'updated_at' column to course_events table")
        except sqlite3.OperationalError:
            pass

    for col_name in [
        "course",
        "notes",
        "color",
        "recurrence_rule",
        "location",
        "attendees",
        "visibility",
        "transparency",
        "reminders",
        "time_zone",
    ]:
        if col_name not in ce_columns:
            try:
                cursor.execute(f"ALTER TABLE course_events ADD COLUMN {col_name} TEXT")
                print(f"[INFO] Added '{col_name}' column to course_events table")
            except sqlite3.OperationalError:
                pass

    try:
        cursor.execute(
            "UPDATE course_events SET updated_at = COALESCE(updated_at, created_at)"
        )
    except sqlite3.OperationalError:
        pass

    # Create index for google_event_id lookups
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_course_events_google_id ON course_events(google_event_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_course_events_google_lookup ON course_events(google_event_id, google_calendar_id)"
    )

    # Add time and end_time columns if not exist (for event times)
    if "time" not in ce_columns:
        try:
            cursor.execute("ALTER TABLE course_events ADD COLUMN time TEXT")
            print("[INFO] Added 'time' column to course_events table")
        except sqlite3.OperationalError:
            pass

    if "end_time" not in ce_columns:
        try:
            cursor.execute("ALTER TABLE course_events ADD COLUMN end_time TEXT")
            print("[INFO] Added 'end_time' column to course_events table")
        except sqlite3.OperationalError:
            pass

    # ------------------------------------------------------------------
    # Scholar Digests table (strategic analysis documents)
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS scholar_digests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            title TEXT,
            digest_type TEXT DEFAULT 'strategic',
            created_at TEXT NOT NULL,
            content_hash TEXT
        )
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_digests_filename
        ON scholar_digests(filename)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_digests_type
        ON scholar_digests(digest_type)
    """
    )

    # ------------------------------------------------------------------
    # Scholar Proposals table (change proposals from Scholar workflows)
    # ------------------------------------------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS scholar_proposals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL UNIQUE,
            filepath TEXT NOT NULL,
            title TEXT,
            proposal_type TEXT,
            status TEXT DEFAULT 'draft',
            created_at TEXT,
            reviewed_at TEXT,
            reviewer_notes TEXT,
            superseded_by INTEGER REFERENCES scholar_proposals(id),
            content_hash TEXT
        )
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_proposals_status
        ON scholar_proposals(status)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_proposals_type
        ON scholar_proposals(proposal_type)
    """
    )

    # ------------------------------------------------------------------
    # Scholar Run tracking (v9.4.2 - for UI run button + history)
    # ------------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scholar_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            status TEXT DEFAULT 'running',
            error_message TEXT,
            triggered_by TEXT DEFAULT 'ui',
            params_json TEXT,
            digest_id INTEGER,
            proposals_created INTEGER DEFAULT 0,
            notes TEXT,
            FOREIGN KEY(digest_id) REFERENCES scholar_digests(id)
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_scholar_runs_status
        ON scholar_runs(status)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_scholar_runs_started
        ON scholar_runs(started_at DESC)
    """)

    # Add content + cluster columns to scholar tables (v9.4 DB-first)
    for table, cols in [
        ("scholar_digests", [("content", "TEXT"), ("cluster_id", "TEXT")]),
        ("scholar_proposals", [("content", "TEXT"), ("cluster_id", "TEXT")]),
    ]:
        cursor.execute(f"PRAGMA table_info({table})")
        existing = {c[1] for c in cursor.fetchall()}
        for col_name, col_type in cols:
            if col_name not in existing:
                try:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
                    print(f"[INFO] Added '{col_name}' to {table}")
                except sqlite3.OperationalError:
                    pass

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS quick_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            content TEXT NOT NULL,
            note_type TEXT NOT NULL DEFAULT 'notes',
            position INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """
    )
    # Backfill new columns without breaking existing DBs
    cursor.execute("PRAGMA table_info(quick_notes)")
    quick_notes_cols = {col[1] for col in cursor.fetchall()}
    if "note_type" not in quick_notes_cols:
        try:
            cursor.execute("ALTER TABLE quick_notes ADD COLUMN note_type TEXT DEFAULT 'notes'")
        except Exception:
            pass
    cursor.execute("UPDATE quick_notes SET note_type = COALESCE(note_type, 'notes')")
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_quick_notes_position
        ON quick_notes(position)
    """
    )

    # ------------------------------------------------------------------
    # Calendar Action Ledger (v9.3 - for Undo)
    # ------------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS calendar_action_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            action_type TEXT NOT NULL, -- create_event, update_task, etc.
            target_id TEXT NOT NULL,
            pre_state TEXT,  -- JSON
            post_state TEXT, -- JSON
            description TEXT
        )
    """)
    
    # Pruning Trigger: Keep only last 10 rows
    cursor.execute("""
        CREATE TRIGGER IF NOT EXISTS prune_ledger
        AFTER INSERT ON calendar_action_ledger
        BEGIN
            DELETE FROM calendar_action_ledger
            WHERE id NOT IN (
                SELECT id FROM calendar_action_ledger
                ORDER BY id DESC
                LIMIT 10
            );
        END;
    """)

    conn.commit()
    conn.close()

    print(f"[OK] Database initialized at: {DB_PATH}")
    print("[OK] Schema version: 9.3 + planning/RAG extensions")


def migrate_from_v8():
    """
    Migrate data from v8 schema to v9.1 schema if needed.
    Maps old column names to new ones.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if migration is needed by looking for old columns
    cursor.execute("PRAGMA table_info(sessions)")
    columns = [col[1] for col in cursor.fetchall()]

    # If 'topic' exists but 'main_topic' doesn't, we need to migrate
    if "topic" in columns and "main_topic" not in columns:
        print("[INFO] Migrating from v8 schema to v9.1...")

        # Rename old table
        cursor.execute("ALTER TABLE sessions RENAME TO sessions_v8")

        # Create new table
        init_database()

        # Copy data with column mapping
        cursor.execute("""
            INSERT INTO sessions (
                session_date, session_time, duration_minutes, study_mode,
                main_topic, frameworks_used, gated_platter_triggered,
                wrap_phase_reached, anki_cards_count, understanding_level,
                retention_confidence, system_performance, what_worked,
                what_needs_fixing, notes_insights, created_at
            )
            SELECT 
                session_date, session_time, time_spent_minutes, study_mode,
                topic, frameworks_used, gated_platter_triggered,
                wrap_phase_reached, anki_cards_count, understanding_level,
                retention_confidence, system_performance, what_worked,
                what_needs_fixing, notes_insights, created_at
            FROM sessions_v8
        """)

        conn.commit()
        print(f"[OK] Migrated {cursor.rowcount} sessions to v9.1 schema")

        # Keep old table as backup
        print("[INFO] Old table preserved as 'sessions_v8'")
    else:
        print("[INFO] No migration needed - already on v9.1 schema or fresh database")

    conn.close()


def get_connection():
    """
    Get a database connection.
    """
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.execute("PRAGMA busy_timeout = 5000")
    return conn


# ------------------------------------------------------------------
# Ingestion tracking helper functions
# ------------------------------------------------------------------
import hashlib


def compute_file_checksum(filepath: str) -> str:
    """
    Compute MD5 checksum of a file's contents.
    """
    hash_md5 = hashlib.md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


def is_file_ingested(conn, filepath: str, checksum: str) -> tuple:
    """
    Check if a file has already been ingested with the same checksum.
    Returns (is_ingested: bool, session_id: int or None).
    """
    cursor = conn.cursor()
    cursor.execute(
        "SELECT session_id FROM ingested_files WHERE filepath = ? AND checksum = ?",
        (filepath, checksum),
    )
    result = cursor.fetchone()
    if result:
        return True, result[0]
    return False, None


def mark_file_ingested(conn, filepath: str, checksum: str, session_id: int = None):
    """
    Mark a file as ingested. Updates if filepath exists, inserts otherwise.
    """
    from datetime import datetime

    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO ingested_files (filepath, checksum, session_id, ingested_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(filepath) DO UPDATE SET
            checksum = excluded.checksum,
            session_id = excluded.session_id,
            ingested_at = excluded.ingested_at
        """,
        (filepath, checksum, session_id, datetime.now().isoformat()),
    )
    conn.commit()


def remove_ingested_file(conn, filepath: str):
    """
    Remove ingestion tracking record for a file.
    """
    cursor = conn.cursor()
    cursor.execute("DELETE FROM ingested_files WHERE filepath = ?", (filepath,))
    conn.commit()


def get_ingested_session_id(conn, filepath: str) -> int:
    """
    Get the session_id linked to an ingested file, if any.
    """
    cursor = conn.cursor()
    cursor.execute(
        "SELECT session_id FROM ingested_files WHERE filepath = ?", (filepath,)
    )
    result = cursor.fetchone()
    return result[0] if result else None


def get_schema_version():
    """
    Get the current schema version from the database.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT schema_version FROM sessions LIMIT 1")
        result = cursor.fetchone()
        version = result[0] if result else "unknown"
    except:
        version = "pre-9.1"

    conn.close()
    return version


def backfill_session_minutes():
    """
    Backfill time_spent_minutes and duration_minutes where one is missing.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE sessions
        SET time_spent_minutes = duration_minutes
        WHERE (time_spent_minutes IS NULL OR time_spent_minutes = 0)
          AND duration_minutes IS NOT NULL
          AND duration_minutes > 0
    """
    )
    updated_time = cursor.rowcount

    cursor.execute(
        """
        UPDATE sessions
        SET duration_minutes = time_spent_minutes
        WHERE (duration_minutes IS NULL OR duration_minutes = 0)
          AND time_spent_minutes IS NOT NULL
          AND time_spent_minutes > 0
    """
    )
    updated_duration = cursor.rowcount

    conn.commit()
    conn.close()
    return updated_time, updated_duration


if __name__ == "__main__":
    print("PT Study Brain - Database Setup")
    print("=" * 40)

    if os.path.exists(DB_PATH):
        print(f"[INFO] Existing database found at: {DB_PATH}")
        version = get_schema_version()
        print(f"[INFO] Current schema version: {version}")

        if version not in {"9.1", "9.2", "9.3", "9.4"}:
            if not sys.stdin or not sys.stdin.isatty():
                auto_migrate = os.environ.get("PT_BRAIN_AUTO_MIGRATE", "").strip().lower() in {
                    "1",
                    "true",
                    "yes",
                }
                if auto_migrate:
                    print("[INFO] Non-interactive mode: auto-migrating to v9.1 schema.")
                    migrate_from_v8()
                else:
                    print("[INFO] Non-interactive mode: skipping v9.1 migration.")
            else:
                try:
                    response = input("Migrate to v9.1 schema? (y/n): ")
                except EOFError:
                    print("[INFO] Non-interactive mode: skipping v9.1 migration.")
                    response = "n"
                if response.lower() == "y":
                    migrate_from_v8()
                else:
                    print("[INFO] Skipping migration")
    else:
        print("[INFO] No existing database found")

    # Always run init_database() to ensure schema is fully up to date
    # (adds any missing columns and creates new planning/RAG tables).
    init_database()

    # Optional one-time data correction for session minutes
    if os.environ.get("PT_BRAIN_BACKFILL_MINUTES", "").strip().lower() in {"1", "true", "yes"}:
        updated_time, updated_duration = backfill_session_minutes()
        print(f"[INFO] Backfilled time_spent_minutes for {updated_time} sessions.")
        print(f"[INFO] Backfilled duration_minutes for {updated_duration} sessions.")
``

--------------------------------------------------------------------------------
# FILE: brain/dashboard/routes.py
--------------------------------------------------------------------------------
``python
import os
import re
import json
import sqlite3
import subprocess
import tempfile
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Tuple
from flask import (
    Blueprint,
    render_template,
    jsonify,
    request,
    send_file,
    Response,
)
from werkzeug.utils import secure_filename

from config import (
    DATA_DIR,
    STUDY_RAG_DIR,
    SESSION_LOGS_DIR,
    SCORE_MIN,
    SCORE_MAX,
    STALE_DAYS,
    FRESH_DAYS,
    WEAK_THRESHOLD,
    STRONG_THRESHOLD,
)
from db_setup import (
    DB_PATH,
    init_database,
    get_connection,
    compute_file_checksum,
    is_file_ingested,
    mark_file_ingested,
    remove_ingested_file,
    get_ingested_session_id,
)

# Use import directly for items in brain/ folder (root of execution)
from ingest_session import parse_session_log, validate_session_data, insert_session
from generate_resume import generate_resume
from tutor_api_types import TutorQueryV1, TutorSourceSelector, TutorTurnResponse
from tutor_engine import process_tutor_turn, log_tutor_turn, create_card_draft_from_turn
from import_syllabus import upsert_course, import_events
from rag_notes import (
    ingest_document,
    ingest_url_document,
    sync_folder_to_rag,
    sync_runtime_catalog,
    index_repo_to_rag,
    search_rag_docs,
)

# Dashboard modules
from dashboard.utils import allowed_file, load_api_config, save_api_config
from dashboard.stats import build_stats, get_mastery_stats
from dashboard.scholar import (
    build_scholar_stats,
    generate_ai_answer,
    run_scholar_orchestrator,
    generate_weekly_digest,
    generate_implementation_bundle,
    get_latest_insights,
    check_proposal_similarity,
    build_ralph_summary,
    load_proposal_running_sheet,
    run_proposal_sheet_build,
    MAX_CONTEXT_CHARS,
)
from dashboard.syllabus import fetch_all_courses_and_events, attach_event_analytics
from dashboard.calendar import get_calendar_data
from dashboard.cli import get_all_sessions

dashboard_bp = Blueprint("dashboard", __name__)

# Ensure directories exist (run once at module level is okay, or in app factory)
# We can do it here just to be safe if blueprint is imported
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(SESSION_LOGS_DIR, exist_ok=True)

PROJECT_FILES_DIR = Path(DATA_DIR) / "project_files"
os.makedirs(PROJECT_FILES_DIR, exist_ok=True)

STUDY_RAG_PATH = Path(STUDY_RAG_DIR)
os.makedirs(STUDY_RAG_PATH, exist_ok=True)


def insert_session_data(data):
    """
    Validate and insert using the v9.3 ingest pipeline.
    Returns (ok: bool, message: str).
    """
    is_valid, error = validate_session_data(data)
    if not is_valid:
        return False, f"Validation failed: {error}"
    return insert_session(data)


@dashboard_bp.route("/")
def index():
    """Serve the React dashboard from /static/dist/index.html."""
    return serve_react_app()


@dashboard_bp.route("/brain")
@dashboard_bp.route("/calendar")
@dashboard_bp.route("/scholar")
@dashboard_bp.route("/tutor")
def react_pages():
    """Serve React app for client-side routes."""
    return serve_react_app()


def serve_react_app():
    """Serve the React build from static/dist."""
    import os
    from flask import send_from_directory, current_app

    static_folder = current_app.static_folder or ""
    dist_index = os.path.join(static_folder, "dist", "index.html")

    if os.path.exists(dist_index):
        return send_from_directory(os.path.join(static_folder, "dist"), "index.html")

    return "Dashboard build not found. Run 'npm run build' in dashboard_rebuild and copy dist/public to brain/static/dist.", 404


@dashboard_bp.route("/old-dashboard")
def old_dashboard():
    """Legacy dashboard removed - now returns 404."""
    return "Legacy dashboard has been removed.", 404


@dashboard_bp.route("/favicon.ico")
def favicon():
    return "", 204


@dashboard_bp.route("/api/stats")
def api_stats():
    return jsonify(build_stats())


@dashboard_bp.route("/api/scholar")
def api_scholar():
    return jsonify(build_scholar_stats())


@dashboard_bp.route("/api/scholar/digest")
def api_scholar_digest():
    """Fetch latest Scholar digest from the database (fast, DB-first)."""
    try:
        from dashboard.scholar import get_scholar_run_status
        run_status = get_scholar_run_status()
    except Exception:
        run_status = None

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT id, filename, filepath, title, digest_type, created_at, content_hash, content, cluster_id
            FROM scholar_digests
            ORDER BY created_at DESC
            LIMIT 1
            """
        )
        row = cur.fetchone()
    except Exception as e:
        conn.close()
        return jsonify({"ok": False, "error": str(e), "run_status": run_status}), 500
    conn.close()

    if not row:
        return jsonify(
            {
                "ok": True,
                "digest": None,
                "message": "No digest yet. Run Scholar.",
                "run_status": run_status,
            }
        )

    content = row["content"] or ""
    if not content:
        repo_root = Path(__file__).parent.parent.parent.resolve()
        filepath = repo_root / row["filepath"]
        if filepath.exists():
            content = filepath.read_text(encoding="utf-8")

    return jsonify(
        {
            "ok": True,
            "digest": content,
            "digest_id": row["id"],
            "title": row["title"],
            "digest_type": row["digest_type"],
            "created_at": row["created_at"],
            "filename": row["filename"],
            "content_hash": row["content_hash"],
            "cluster_id": row["cluster_id"],
            "run_status": run_status,
        }
    )


@dashboard_bp.route("/api/scholar/insights")
def api_scholar_insights():
    """Get key Scholar insights for dashboard overview display."""
    result = get_latest_insights()
    return jsonify(result)


@dashboard_bp.route("/api/scholar/ralph")
def api_scholar_ralph():
    """Get Ralph run summary and progress details."""
    return jsonify(build_ralph_summary())


@dashboard_bp.route("/api/scholar/proposal-sheet", methods=["GET"])
def api_scholar_proposal_sheet():
    """Get the proposal running sheet summary."""
    return jsonify(load_proposal_running_sheet())


@dashboard_bp.route("/api/scholar/proposal-sheet/rebuild", methods=["POST"])
def api_scholar_proposal_sheet_rebuild():
    """Rebuild the proposal running sheet for final check."""
    return jsonify(run_proposal_sheet_build())


@dashboard_bp.route("/api/brain/status", methods=["GET"])
def api_brain_status():
    """Get brain database status and statistics."""
    from pathlib import Path

    conn = get_connection()
    cur = conn.cursor()

    # Get counts
    cur.execute("SELECT COUNT(*) FROM sessions")
    session_count = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM course_events")
    event_count = cur.fetchone()[0]

    # Check if rag_docs table exists
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='rag_docs'")
    rag_table_exists = cur.fetchone() is not None
    rag_count = 0
    if rag_table_exists:
        cur.execute("SELECT COUNT(*) FROM rag_docs")
        rag_count = cur.fetchone()[0]

    # Check if card_drafts table exists
    cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='card_drafts'"
    )
    card_table_exists = cur.fetchone() is not None
    pending_cards = 0
    if card_table_exists:
        cur.execute(
            "SELECT COUNT(*) FROM card_drafts WHERE status IN ('draft', 'approved')"
        )
        pending_cards = cur.fetchone()[0]

    # Get DB file size
    from config import DB_PATH
    _db_path = Path(DB_PATH)
    db_size_mb = _db_path.stat().st_size / (1024 * 1024) if _db_path.exists() else 0

    conn.close()

    return jsonify(
        {
            "ok": True,
            "stats": {
                "sessions": session_count,
                "events": event_count,
                "rag_documents": rag_count,
                "pending_cards": pending_cards,
                "db_size_mb": round(db_size_mb, 2),
            },
        }
    )


@dashboard_bp.route("/api/sync/pending", methods=["GET"])
def api_sync_pending():
    """List all staged events from Blackboard scraper and syllabus imports."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT s.id, s.course_id, c.name as course_name, s.type, s.title, s.date, s.due_date, s.raw_text, s.source_url, s.scraped_at, s.status
        FROM scraped_events s
        JOIN courses c ON s.course_id = c.id
        WHERE s.status NOT IN ('approved', 'ignored')
        ORDER BY s.scraped_at DESC
    """)
    rows = cur.fetchall()
    conn.close()

    pending = [
        {
            "id": r[0],
            "course_id": r[1],
            "course_name": r[2],
            "type": r[3],
            "title": r[4],
            "date": r[5],
            "due_date": r[6],
            "raw_text": r[7],
            "source_url": r[8],
            "scraped_at": r[9],
            "status": r[10],
        }
        for r in rows
    ]
    return jsonify({"ok": True, "items": pending})


@dashboard_bp.route("/api/sync/resolve", methods=["POST"])
def api_sync_resolve():
    """Approve, Ignore, or Update a staged item."""
    data = request.get_json() or {}
    staged_id = data.get("id")
    action = data.get("action")  # 'approve', 'ignore'

    if not staged_id or not action:
        return jsonify({"ok": False, "message": "Missing staged_id or action"}), 400

    conn = get_connection()
    cur = conn.cursor()

    try:
        if action == "ignore":
            cur.execute(
                "UPDATE scraped_events SET status='ignored' WHERE id=?", (staged_id,)
            )
        elif action == "approve":
            # Get the staged item
            cur.execute("SELECT * FROM scraped_events WHERE id=?", (staged_id,))
            item = cur.fetchone()
            if not item:
                return jsonify({"ok": False, "message": "Staged item not found"}), 404

            # Map columns by index (see CREATE TABLE in db_setup)
            # 0=id, 1=course_id, 2=type, 3=title, 4=date, 5=due_date, 6=raw_text, 7=source_url, 8=scraped_at, 9=status
            c_id, e_type, title, e_date, d_date, r_text, s_url = (
                item[1],
                item[2],
                item[3],
                item[4],
                item[5],
                item[6],
                item[7],
            )

            if e_type == "material":
                # Create as Topic
                cur.execute(
                    "INSERT INTO topics (course_id, name, created_at) VALUES (?, ?, ?)",
                    (c_id, title, datetime.now().isoformat()),
                )
                topic_id = cur.lastrowid
                # Add to RAG Docs if URL exists
                if s_url:
                    cur.execute(
                        """
                        INSERT INTO rag_docs (source_path, course_id, doc_type, content, created_at, enabled)
                        VALUES (?, ?, 'web_link', ?, ?, 1)
                    """,
                        (s_url, c_id, f"Title: {title}", datetime.now().isoformat()),
                    )
            else:
                # Create as Course Event
                cur.execute(
                    """
                    INSERT INTO course_events (
                        course_id, type, title, date, due_date, raw_text, created_at, updated_at, status
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
                """,
                    (
                        c_id,
                        e_type,
                        title,
                        e_date,
                        d_date,
                        r_text,
                        datetime.now().isoformat(),
                        datetime.now().isoformat(),
                    ),
                )

            # Mark staged item as approved
            cur.execute(
                "UPDATE scraped_events SET status='approved' WHERE id=?", (staged_id,)
            )

        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"ok": False, "message": str(e)}), 500
    finally:
        conn.close()


DIGEST_BULLET_PREFIX_RE = re.compile(
    r"^\s*(?:[-*]|\u2022|\u00b7|\u00e2\u20ac\u00a2)\s*"
)


def _extract_digest_bullets(content: str, labels: List[str]) -> List[str]:
    lines = content.splitlines()
    in_section = False
    bullets = []
    for line in lines:
        stripped = line.strip()
        if not in_section:
            for label in labels:
                if label.lower() in stripped.lower():
                    in_section = True
                    break
            if in_section:
                continue
        else:
            if not stripped:
                continue
            if stripped.startswith("#") or stripped.startswith("---"):
                break
            if re.match(r"^\d+\.\s+", stripped) and not DIGEST_BULLET_PREFIX_RE.match(
                stripped
            ):
                break
            if DIGEST_BULLET_PREFIX_RE.match(stripped):
                bullets.append(DIGEST_BULLET_PREFIX_RE.sub("", stripped).strip())
    return bullets


def _parse_resolved_questions(content: str) -> List[Tuple[str, str]]:
    resolved = []
    current_q = None
    current_a = None
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("Q:"):
            if current_q and current_a:
                resolved.append((current_q, current_a))
            current_q = stripped.replace("Q:", "").strip()
            current_a = None
            continue
        if stripped.startswith("A:"):
            answer = stripped.replace("A:", "").strip()
            if answer and answer.lower() not in ["(pending)", "(none)", ""]:
                current_a = answer
            else:
                current_a = None
            continue
        if current_q and current_a and stripped:
            current_a += " " + stripped
        elif current_q and not current_a and stripped and not stripped.startswith("A:"):
            current_q += " " + stripped
    if current_q and current_a:
        resolved.append((current_q, current_a))
    return resolved


def _save_digest_artifacts(digest_content: str, digest_type: str = "strategic") -> dict:
    import hashlib

    repo_root = Path(__file__).parent.parent.parent.resolve()
    digests_dir = repo_root / "scholar" / "outputs" / "digests"
    digests_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    if digest_type == "weekly":
        filename = f"weekly_digest_{timestamp}.md"
    elif digest_type and digest_type != "strategic":
        filename = f"{digest_type}_digest_{timestamp}.md"
    else:
        digest_type = "strategic"
        filename = f"strategic_digest_{timestamp}.md"
    filepath = digests_dir / filename
    filepath.write_text(digest_content, encoding="utf-8")

    # Build plan update draft from digest content
    plan_updates_dir = repo_root / "scholar" / "outputs" / "plan_updates"
    plan_updates_dir.mkdir(parents=True, exist_ok=True)
    plan_update_filename = f"plan_update_{timestamp}.md"
    plan_update_path = plan_updates_dir / plan_update_filename

    resolved_questions = []
    orchestrator_runs = repo_root / "scholar" / "outputs" / "orchestrator_runs"
    resolved_files = sorted(
        orchestrator_runs.glob("questions_resolved_*.md"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if resolved_files:
        try:
            resolved_content = resolved_files[0].read_text(encoding="utf-8")
            resolved_questions = _parse_resolved_questions(resolved_content)
        except Exception:
            resolved_questions = []

    priority_actions = _extract_digest_bullets(
        digest_content, ["Top 3 Priority Actions", "Priority Actions"]
    )
    proposal_signals = _extract_digest_bullets(
        digest_content, ["Proposals Review", "Proposal Review", "Proposals"]
    )
    research_recs = _extract_digest_bullets(
        digest_content, ["Research Recommendations", "Research Recommendation"]
    )
    health_notes = _extract_digest_bullets(
        digest_content, ["System Health Assessment", "System Health"]
    )

    plan_lines = [
        f"# Plan Update Draft - {timestamp}",
        "",
        f"Source Digest: {filename}",
        f"Digest Type: {digest_type}",
        f"Created: {datetime.now().isoformat()}",
        "",
        "## Priority Actions (from digest)",
    ]
    if priority_actions:
        plan_lines.extend([f"- {item}" for item in priority_actions])
    else:
        plan_lines.append("- (none found)")
    plan_lines.extend(
        [
            "",
            "## Proposal Signals (from digest)",
        ]
    )
    if proposal_signals:
        plan_lines.extend([f"- {item}" for item in proposal_signals])
    else:
        plan_lines.append("- (none found)")
    plan_lines.extend(
        [
            "",
            "## Research Follow-ups (from digest)",
        ]
    )
    if research_recs:
        plan_lines.extend([f"- {item}" for item in research_recs])
    else:
        plan_lines.append("- (none found)")
    plan_lines.extend(
        [
            "",
            "## System Health Notes (from digest)",
        ]
    )
    if health_notes:
        plan_lines.extend([f"- {item}" for item in health_notes])
    else:
        plan_lines.append("- (none found)")
    plan_lines.extend(
        [
            "",
            "## Answered Questions (latest)",
        ]
    )
    if resolved_questions:
        for q, a in resolved_questions[:10]:
            plan_lines.append(f"- Q: {q}")
            plan_lines.append(f"  A: {a}")
    else:
        plan_lines.append("- (none found)")
    plan_lines.extend(
        [
            "",
            "## Proposal Seeds (from answered questions)",
        ]
    )
    if resolved_questions:
        for q, a in resolved_questions[:10]:
            plan_lines.append(f"- Seed: {q} -> {a}")
    else:
        plan_lines.append("- (none found)")
    plan_lines.extend(
        [
            "",
            "## Plan Targets",
            "- `sop/MASTER_PLAN_PT_STUDY.md`",
            "- `sop/gpt-knowledge/M0-planning.md`",
            "",
            "## Draft Plan Edits (human-in-the-loop)",
            "- (fill in concrete edits to plan files, then apply manually)",
            "",
        ]
    )
    plan_update_path.write_text("\n".join(plan_lines), encoding="utf-8")

    # Build proposal seed file to review before RFC drafting
    proposal_seeds_dir = repo_root / "scholar" / "outputs" / "proposal_seeds"
    proposal_seeds_dir.mkdir(parents=True, exist_ok=True)
    proposal_seed_filename = f"proposal_seeds_{timestamp}.md"
    proposal_seed_path = proposal_seeds_dir / proposal_seed_filename
    seed_lines = [
        f"# Proposal Seeds - {timestamp}",
        "",
        f"Source Digest: {filename}",
    ]
    if resolved_questions:
        seed_lines.append("## Seeds")
        for q, a in resolved_questions[:15]:
            seed_lines.append(f"- Q: {q}")
            seed_lines.append(f"  A: {a}")
    else:
        seed_lines.append("## Seeds")
        seed_lines.append("- (none found)")
    proposal_seed_path.write_text("\n".join(seed_lines), encoding="utf-8")

    # Extract title from first markdown heading or first line
    heading_match = re.match(r"^#+ +(.+)", digest_content, re.MULTILINE)
    if heading_match:
        title = heading_match.group(1).strip()
    else:
        first_line = digest_content.split("\n")[0].strip()
        title = first_line[:100] if first_line else "Untitled Digest"

    # Generate content hash (MD5)
    content_hash = hashlib.md5(digest_content.encode("utf-8")).hexdigest()
    created_at = datetime.now().isoformat()

    # Store in database
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO scholar_digests (filename, filepath, title, digest_type, created_at, content_hash, content)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            filename,
            str(filepath.relative_to(repo_root)),
            title,
            digest_type,
            created_at,
            content_hash,
            digest_content,
        ),
    )
    conn.commit()
    digest_id = cur.lastrowid
    conn.close()

    return {
        "id": digest_id,
        "file": str(filepath.relative_to(repo_root)),
        "plan_update_file": str(plan_update_path.relative_to(repo_root)),
        "proposal_seed_file": str(proposal_seed_path.relative_to(repo_root)),
        "message": f"Digest saved to {filename}",
        "digest_type": digest_type,
    }


@dashboard_bp.route("/api/scholar/digest/save", methods=["POST"])
def api_scholar_save_digest():
    """Save AI Strategic Digest to scholar outputs and database."""
    payload = request.get_json() or {}
    digest_content = payload.get("digest", "").strip()
    digest_type = (payload.get("digest_type") or "strategic").strip().lower()
    if not digest_content:
        return jsonify({"ok": False, "message": "No digest content"}), 400

    result = _save_digest_artifacts(digest_content, digest_type=digest_type)
    return jsonify(
        {
            "ok": True,
            **result,
        }
    )


@dashboard_bp.route("/api/scholar/digests", methods=["GET"])
def api_scholar_list_digests():
    """List saved digests from database."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, filename, title, digest_type, created_at, content_hash, cluster_id
        FROM scholar_digests
        ORDER BY created_at DESC
        """
    )
    rows = cur.fetchall()
    conn.close()

    digests = [
        {
            "id": row[0],
            "filename": row[1],
            "title": row[2],
            "digest_type": row[3],
            "created_at": row[4],
            "content_hash": row[5],
            "cluster_id": row[6],
        }
        for row in rows
    ]

    return jsonify({"ok": True, "digests": digests, "count": len(digests)})


@dashboard_bp.route("/api/scholar/digests/<int:digest_id>", methods=["GET"])
def api_scholar_get_digest(digest_id):
    """Get a single digest by ID, including its content."""
    conn = get_connection()
    cur = conn.cursor()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, filename, filepath, title, digest_type, created_at, content_hash, content, cluster_id
        FROM scholar_digests WHERE id = ?
        """,
        (digest_id,),
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"ok": False, "message": "Digest not found"}), 404

    # DB-first: use content from DB, fallback to file
    content = row["content"] or ""
    if not content:
        repo_root = Path(__file__).parent.parent.parent.resolve()
        filepath = repo_root / row["filepath"]
        if filepath.exists():
            content = filepath.read_text(encoding="utf-8")

    return jsonify(
        {
            "ok": True,
            "digest": {
                "id": row["id"],
                "filename": row["filename"],
                "filepath": row["filepath"],
                "title": row["title"],
                "digest_type": row["digest_type"],
                "created_at": row["created_at"],
                "content_hash": row["content_hash"],
                "content": content,
                "cluster_id": row["cluster_id"],
            },
        }
    )


@dashboard_bp.route("/api/scholar/digests/<int:digest_id>", methods=["DELETE"])
def api_scholar_delete_digest(digest_id):
    """Delete a digest by ID (removes from DB and filesystem)."""
    conn = get_connection()
    cur = conn.cursor()

    # Get filepath first
    cur.execute("SELECT filepath FROM scholar_digests WHERE id = ?", (digest_id,))
    row = cur.fetchone()

    if not row:
        conn.close()
        return jsonify({"ok": False, "message": "Digest not found"}), 404

    # Delete from database
    cur.execute("DELETE FROM scholar_digests WHERE id = ?", (digest_id,))
    conn.commit()
    conn.close()

    # Delete file if it exists
    repo_root = Path(__file__).parent.parent.parent.resolve()
    filepath = repo_root / row[0]
    if filepath.exists():
        filepath.unlink()

    return jsonify({"ok": True, "message": "Digest deleted"})


@dashboard_bp.route("/api/scholar/clusters", methods=["POST"])
def api_scholar_cluster():
    """Cluster digests and proposals by title keyword similarity.

    Simple keyword-based clustering: extracts significant words from titles,
    groups items sharing keywords into clusters. No ML dependencies needed.
    """
    import re as _re
    from collections import defaultdict

    STOP_WORDS = {
        "the", "a", "an", "and", "or", "of", "in", "to", "for", "is", "on",
        "at", "by", "with", "from", "as", "it", "that", "this", "be", "are",
        "was", "were", "been", "has", "have", "had", "do", "does", "did",
        "will", "would", "could", "should", "may", "might", "can", "shall",
        "not", "no", "but", "if", "so", "up", "out", "about", "into",
        "over", "after", "under", "between", "through", "during", "before",
        "study", "review", "analysis", "digest", "proposal", "strategic",
        "summary", "report", "overview", "notes",
    }

    def _extract_keywords(title: str) -> set:
        if not title:
            return set()
        words = _re.findall(r"[a-z]+", title.lower())
        return {w for w in words if len(w) > 2 and w not in STOP_WORDS}

    conn = get_connection()
    cur = conn.cursor()

    # Fetch all digests and proposals with titles
    cur.execute("SELECT id, title, cluster_id FROM scholar_digests")
    digests = [{"id": r[0], "title": r[1], "cluster_id": r[2], "table": "scholar_digests"} for r in cur.fetchall()]

    cur.execute("SELECT id, title, cluster_id FROM scholar_proposals")
    proposals = [{"id": r[0], "title": r[1], "cluster_id": r[2], "table": "scholar_proposals"} for r in cur.fetchall()]

    all_items = digests + proposals

    # Build keyword â†’ items index
    keyword_items: dict = defaultdict(list)
    item_keywords: dict = {}
    for item in all_items:
        kws = _extract_keywords(item["title"] or "")
        item_keywords[f"{item['table']}:{item['id']}"] = kws
        for kw in kws:
            keyword_items[kw].append(f"{item['table']}:{item['id']}")

    # Union-find clustering: items sharing 2+ keywords are in same cluster
    parent: dict = {}

    def find(x: str) -> str:
        while parent.get(x, x) != x:
            parent[x] = parent.get(parent[x], parent[x])
            x = parent[x]
        return x

    def union(a: str, b: str) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    # For each pair of items, union if they share 2+ keywords
    keys = list(item_keywords.keys())
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            shared = item_keywords[keys[i]] & item_keywords[keys[j]]
            if len(shared) >= 2:
                union(keys[i], keys[j])

    # Build clusters
    clusters: dict = defaultdict(list)
    for item in all_items:
        key = f"{item['table']}:{item['id']}"
        root = find(key)
        clusters[root].append(item)

    # Assign cluster_id labels and update DB
    cluster_map: dict = {}
    cluster_idx = 0
    for root, members in clusters.items():
        if len(members) < 2:
            # Singletons get no cluster
            continue
        # Name cluster after most common keyword
        all_kws: dict = defaultdict(int)
        for m in members:
            for kw in item_keywords.get(f"{m['table']}:{m['id']}", set()):
                all_kws[kw] += 1
        label = max(all_kws, key=all_kws.get) if all_kws else f"cluster-{cluster_idx}"
        cluster_idx += 1
        cluster_map[root] = label

    # Update DB with cluster assignments
    updated = 0
    for root, members in clusters.items():
        label = cluster_map.get(root)
        for m in members:
            cur.execute(
                f"UPDATE {m['table']} SET cluster_id = ? WHERE id = ?",
                (label, m["id"]),
            )
            updated += 1

    conn.commit()
    conn.close()

    # Build response
    result_clusters = []
    for root, label in cluster_map.items():
        members = clusters[root]
        result_clusters.append({
            "cluster_id": label,
            "count": len(members),
            "items": [
                {"table": m["table"], "id": m["id"], "title": m["title"]}
                for m in members
            ],
        })

    return jsonify({
        "ok": True,
        "clusters": result_clusters,
        "total_clustered": sum(c["count"] for c in result_clusters),
        "total_items": len(all_items),
        "updated": updated,
    })


@dashboard_bp.route("/api/scholar/clusters", methods=["GET"])
def api_scholar_clusters_list():
    """List current cluster assignments."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT id, title, digest_type, cluster_id FROM scholar_digests WHERE cluster_id IS NOT NULL"
    )
    digests = [{"id": r[0], "title": r[1], "type": r[2], "cluster_id": r[3], "source": "digest"} for r in cur.fetchall()]

    cur.execute(
        "SELECT id, title, proposal_type, cluster_id FROM scholar_proposals WHERE cluster_id IS NOT NULL"
    )
    proposals = [{"id": r[0], "title": r[1], "type": r[2], "cluster_id": r[3], "source": "proposal"} for r in cur.fetchall()]

    conn.close()

    # Group by cluster_id
    from collections import defaultdict as _dd
    grouped: dict = _dd(list)
    for item in digests + proposals:
        grouped[item["cluster_id"]].append(item)

    clusters = [
        {"cluster_id": cid, "count": len(items), "items": items}
        for cid, items in sorted(grouped.items())
    ]

    return jsonify({"ok": True, "clusters": clusters})


@dashboard_bp.route("/api/scholar/implementation-bundle", methods=["POST"])
def api_scholar_implementation_bundle():
    """Generate an implementation bundle from approved proposals with safety checks."""
    result = generate_implementation_bundle()
    status_code = 200 if result.get("ok") else 400
    return jsonify(result), status_code


@dashboard_bp.route("/api/scholar/run", methods=["POST"])
def api_scholar_run():
    """Trigger a full Scholar orchestration run."""
    from dashboard.scholar import run_scholar_orchestrator_tracking, get_scholar_run_status
    import threading
    
    data = request.get_json() or {}
    triggered_by = data.get('triggered_by', 'ui')
    
    # Check if a run is already in progress
    current_status = get_scholar_run_status()
    if current_status.get('status') == 'running':
        return jsonify({
            'ok': False,
            'message': 'A run is already in progress',
            'current_run': current_status
        }), 409
    
    # Start run in background thread (don't block request)
    def run_async():
        run_scholar_orchestrator_tracking(save_outputs=True, triggered_by=triggered_by)
    
    thread = threading.Thread(target=run_async)
    thread.daemon = True
    thread.start()
    
    # Return current status (will show 'running')
    return jsonify({
        'ok': True,
        'message': 'Scholar run started',
        'status': get_scholar_run_status()
    })


@dashboard_bp.route("/api/scholar/run/status", methods=["GET"])
def api_scholar_run_status():
    """Get the current/latest run status."""
    from dashboard.scholar import get_scholar_run_status
    return jsonify(get_scholar_run_status())


@dashboard_bp.route("/api/scholar/run/history", methods=["GET"])
def api_scholar_run_history():
    """Get run history."""
    from dashboard.scholar import get_scholar_run_history
    limit = request.args.get('limit', 10, type=int)
    return jsonify({
        'ok': True,
        'runs': get_scholar_run_history(limit)
    })


@dashboard_bp.route("/api/mastery")
def api_mastery():
    """Get topic mastery statistics for identifying weak areas and relearning needs."""
    return jsonify(get_mastery_stats())


@dashboard_bp.route("/api/trends")
def api_trends():
    """Get trend data for session metrics over time."""
    from dashboard.stats import get_trend_data

    days = request.args.get("days", 30, type=int)
    # Clamp to reasonable range
    days = max(7, min(days, 90))
    return jsonify(get_trend_data(days))


@dashboard_bp.route("/api/scholar/api-key", methods=["GET", "POST"])
def api_scholar_api_key():
    if request.method == "GET":
        config = load_api_config()
        api_provider = config.get("api_provider", "openrouter")
        if api_provider == "openrouter":
            api_key = config.get("openrouter_api_key", "")
        else:
            api_key = config.get("openai_api_key", "")

        return jsonify(
            {
                "ok": True,
                "has_key": bool(api_key),
                "key_preview": f"{api_key[:7]}..." if api_key else None,
                "api_provider": api_provider,
                "model": config.get("model", "openrouter/auto"),
            }
        )
    else:
        try:
            data = request.get_json()
            if not data or "api_key" not in data:
                return jsonify({"ok": False, "message": "Missing 'api_key' field"}), 400

            api_key = data["api_key"].strip()
            if not api_key:
                return jsonify({"ok": False, "message": "API key cannot be empty"}), 400

            config = load_api_config()
            api_provider = data.get("api_provider", "openrouter")
            model = data.get("model", "openrouter/auto")

            if api_provider == "openrouter":
                config["openrouter_api_key"] = api_key
            else:
                config["openai_api_key"] = api_key

            config["api_provider"] = api_provider
            config["model"] = model
            save_api_config(config)

            return jsonify(
                {
                    "ok": True,
                    "message": f"API key saved successfully ({api_provider})",
                    "key_preview": f"{api_key[:7]}...",
                    "api_provider": api_provider,
                    "model": model,
                }
            )
        except Exception as e:
            return jsonify({"ok": False, "message": f"Error saving API key: {e}"}), 500


@dashboard_bp.route("/api/gcal/calendars", methods=["GET"])
def gcal_calendars():
    from .gcal import fetch_calendar_list, resolve_calendar_selection

    config = load_api_config()
    gcal_config = config.get("google_calendar", {})
    if not isinstance(gcal_config, dict):
        gcal_config = {}

    calendars, error = fetch_calendar_list()
    if error:
        return jsonify({"ok": False, "error": error}), 400

    selected_ids, default_calendar_id, sync_all, calendar_meta = (
        resolve_calendar_selection(gcal_config, calendars)
    )

    return jsonify(
        {
            "ok": True,
            "calendars": [
                {
                    "id": cal.get("id"),
                    "summary": cal.get("summary"),
                    "primary": cal.get("primary"),
                    "access_role": cal.get("accessRole"),
                    "time_zone": cal.get("timeZone"),
                }
                for cal in calendars
            ],
            "selected_ids": selected_ids,
            "default_calendar_id": default_calendar_id,
            "sync_all": sync_all,
            "calendar_meta": calendar_meta,
        }
    )


@dashboard_bp.route("/api/gcal/config", methods=["GET", "POST"])
def gcal_config():
    config = load_api_config()
    gcal_config = config.get("google_calendar", {})
    if not isinstance(gcal_config, dict):
        gcal_config = {}

    if request.method == "GET":
        return jsonify({"ok": True, "google_calendar": gcal_config})

    payload = request.get_json() or {}
    calendar_ids = payload.get("calendar_ids") or []
    default_calendar_id = payload.get("default_calendar_id") or "primary"
    sync_all_calendars = bool(payload.get("sync_all_calendars"))

    gcal_config["calendar_ids"] = calendar_ids
    gcal_config["default_calendar_id"] = default_calendar_id
    gcal_config["sync_all_calendars"] = sync_all_calendars
    config["google_calendar"] = gcal_config
    save_api_config(config)

    return jsonify({"ok": True, "google_calendar": gcal_config})


@dashboard_bp.route("/api/gcal/status", methods=["GET"])
def gcal_status():
    """Check Google Calendar authentication status"""
    from .gcal import check_auth_status

    return jsonify(check_auth_status())


@dashboard_bp.route("/api/gcal/auth/start", methods=["GET"])
def gcal_auth_start():
    """Start Google Calendar OAuth flow"""
    from .gcal import get_auth_url

    url, state = get_auth_url()
    if url:
        return jsonify({"auth_url": url, "state": state})
    else:
        return jsonify({"error": state}), 400


@dashboard_bp.route("/api/gcal/sync", methods=["POST"])
def gcal_sync():
    """Manually sync Google Calendar events to database"""
    from .gcal import sync_bidirectional

    data = request.get_json() or {}
    course_id = data.get("course_id")
    calendar_ids = data.get("calendar_ids")
    if calendar_ids is not None and not isinstance(calendar_ids, list):
        calendar_ids = None
    try:
        result = sync_bidirectional(course_id=course_id, calendar_ids=calendar_ids)
        return jsonify(result)
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@dashboard_bp.route("/api/gcal/revoke", methods=["POST"])
def gcal_revoke():
    """Revoke Google Calendar authentication"""
    from .gcal import revoke_auth

    revoke_auth()
    return jsonify({"success": True})


@dashboard_bp.route("/api/gtasks/sync", methods=["POST"])
def gtasks_sync():
    """Manually sync Google Tasks to database"""
    from .gcal import sync_tasks_to_database

    data = request.get_json() or {}
    course_id = data.get("course_id")
    result = sync_tasks_to_database(course_id)
    return jsonify(result)


@dashboard_bp.route("/api/gtasks/lists", methods=["GET"])
def gtasks_lists():
    """Get all Google Task lists"""
    from .gcal import fetch_task_lists

    lists, error = fetch_task_lists()
    if error:
        return jsonify({"error": error}), 400
    return jsonify({"task_lists": lists})


@dashboard_bp.route("/api/scraper/run", methods=["POST"])
def api_scraper_run():
    """
    Triggers the Blackboard scraper as a subprocess.
    Returns immediately with a status message, as scraping takes time.
    """
    try:
        # Resolve path to script: ../../scripts/scrape_blackboard.py relative to routes.py
        # Actually routes.py is in brain/dashboard/, scripts/ is at root/scripts/
        # base_dir (brain/) -> parent (root/) -> scripts/
        current_dir = os.path.dirname(os.path.abspath(__file__))
        brain_dir = os.path.dirname(current_dir)
        root_dir = os.path.dirname(brain_dir)
        script_path = os.path.join(root_dir, "scripts", "scrape_blackboard.py")

        if not os.path.exists(script_path):
            return jsonify(
                {"ok": False, "message": f"Script not found at {script_path}"}
            ), 404

        # Run in separate process (fire and forget for this simple implementation)
        # We could use Popen to let it run in background
        subprocess.Popen([sys.executable, script_path], cwd=root_dir, shell=True)

        return jsonify(
            {
                "ok": True,
                "message": "Scraper started in background. Check Sync Inbox in a few minutes.",
            }
        )
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


@dashboard_bp.route("/api/syllabus/import_bulk", methods=["POST"])
def api_syllabus_import_bulk():
    """Import a full syllabus JSON (course + events) from ChatGPT output."""
    data = request.get_json()
    if not data:
        return jsonify({"ok": False, "message": "No JSON data provided"}), 400

    # Validate required fields
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"ok": False, "message": "Course name is required"}), 400

    try:
        # Upsert course (creates or updates)
        course_id = upsert_course(data)

        # Import events if provided
        events = data.get("events", [])
        inserted = 0
        if events:
            inserted = import_events(course_id, events, replace=False)

        return jsonify({
            "ok": True,
            "message": f"Imported course '{name}' with {inserted} event(s)",
            "course_id": course_id,
            "events_imported": inserted
        })
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


# ==============================================================================
# SOP Explorer API
# ==============================================================================

SOP_MANIFEST_PATH = Path(__file__).parent.parent.parent / "sop" / "sop_index.v1.json"
_sop_allowlist: set = set()
_sop_allowlist_loaded = False


def _load_sop_allowlist() -> set:
    """Load and cache the SOP file allowlist from manifest."""
    global _sop_allowlist, _sop_allowlist_loaded
    if _sop_allowlist_loaded:
        return _sop_allowlist

    if not SOP_MANIFEST_PATH.exists():
        _sop_allowlist_loaded = True
        return _sop_allowlist

    try:
        with open(SOP_MANIFEST_PATH, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        # Extract all paths from manifest
        for group in manifest.get("groups", []):
            for section in group.get("sections", []):
                for item in section.get("items", []):
                    path = item.get("path", "")
                    if path and item.get("type") != "dir":
                        _sop_allowlist.add(path)

        _sop_allowlist_loaded = True
    except Exception:
        _sop_allowlist_loaded = True

    return _sop_allowlist


def _is_sop_path_allowed(path: str) -> bool:
    """Check if a path is allowed to be served."""
    if not path:
        return False
    # Security checks
    if ".." in path.split("/"):
        return False
    if "\\" in path:
        return False
    if path.startswith("/") or path.startswith("~"):
        return False
    # Must be in allowlist
    allowlist = _load_sop_allowlist()
    return path in allowlist


@dashboard_bp.route("/api/sop/index")
def api_sop_index():
    """Return the SOP manifest JSON."""
    if not SOP_MANIFEST_PATH.exists():
        return jsonify({"ok": False, "message": "SOP manifest not found"}), 404

    try:
        with open(SOP_MANIFEST_PATH, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        return jsonify(manifest)
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


@dashboard_bp.route("/api/sop/file")
def api_sop_file():
    """Return allowlisted SOP file content."""
    path = request.args.get("path", "").strip()

    if not _is_sop_path_allowed(path):
        return jsonify({"ok": False, "message": "File not found"}), 404

    # Resolve full path
    repo_root = Path(__file__).parent.parent.parent
    full_path = repo_root / path.replace("/", os.sep)

    if not full_path.exists() or not full_path.is_file():
        return jsonify({"ok": False, "message": "File not found"}), 404

    # Optional size limit (5MB)
    if full_path.stat().st_size > 5 * 1024 * 1024:
        return jsonify({"ok": False, "message": "File too large"}), 413

    try:
        content = full_path.read_text(encoding="utf-8")

        # Determine content type
        suffix = full_path.suffix.lower()
        content_type_map = {
            ".md": "text/markdown",
            ".json": "application/json",
            ".txt": "text/plain",
        }
        content_type = content_type_map.get(suffix, "text/plain")

        return jsonify({
            "ok": True,
            "path": path,
            "content_type": content_type,
            "content": content,
        })
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


@dashboard_bp.route("/api/sop/explain", methods=["POST"])
def api_sop_explain():
    """
    Return a hierarchical breakdown + explanation for a SOP excerpt.

    This is designed to support progressive disclosure in the Tutor SOP Explorer:
    users select a heading, we explain that section into groups/subgroups/concepts.
    """
    data = request.get_json() or {}
    path = (data.get("path") or "").strip()
    heading = (data.get("heading") or "").strip()
    level = int(data.get("level") or 0)
    excerpt = (data.get("excerpt") or "").strip()
    mode = (data.get("mode") or "teach").strip()

    if not _is_sop_path_allowed(path):
        return jsonify({"ok": False, "message": "File not found"}), 404
    if not excerpt:
        return jsonify({"ok": False, "message": "Missing excerpt"}), 400

    repo_root = Path(__file__).parent.parent.parent.resolve()
    try:
        from dashboard.sop_explainer import explain_sop_excerpt

        result = explain_sop_excerpt(
            repo_root=repo_root,
            sop_path=path,
            heading=heading,
            level=level,
            excerpt=excerpt,
            mode=mode,
        )
        status_code = 200 if result.get("ok") else 400
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500
``

--------------------------------------------------------------------------------
# FILE: brain/static/dist/index.html
--------------------------------------------------------------------------------
``html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />

    <meta property="og:title" content="Arcade UI Kit" />
    <meta property="og:description" content="90s Arcade Themed UI Template" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://replit.com/public/images/opengraph.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@replit" />
    <meta name="twitter:title" content="Arcade UI Kit" />
    <meta name="twitter:description" content="90s Arcade Themed UI Template" />
    <meta name="twitter:image" content="https://replit.com/public/images/opengraph.png" />

    <link rel="icon" type="image/png" href="/assets/favicon-CaZstnN0.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">
    <script type="module" crossorigin src="/assets/index-hUZopaA3.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-CVuGMWUd.css">
  </head>
  <body>
    <div id="root"></div>

  </body>
</html>
``


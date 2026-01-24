# ARCHITECTURE CONTEXT DUMP
Generated on: 2026-01-23 18:59:05
Root: C:\pt-study-sop

--------------------------------------------------------------------------------
# FILE: AGENTS.md
--------------------------------------------------------------------------------
``markdown
# AGENTS Master (Unified)

Canonical location: `C:/pt-study-sop/ai-config/AGENTS.md`
Mirror copies (keep in sync; do not edit directly): `C:/pt-study-sop/AGENTS.md`, `C:/pt-study-sop/.claude/AGENTS.md`

## Scope and precedence
- Applies to work under `C:/pt-study-sop` and specifically the `pt-study-sop` repo unless a nearer `AGENTS.md` exists.
- The nearest `AGENTS.md` overrides this file if there is any conflict; note the reason when that happens.

## DIRECTIVE 0: LOAD SYSTEM CONSTITUTION
You must read and obey `CLAUDE.md` immediately (same folder). It contains core rules and documentation map.

## Global defaults
- Keep changes minimal and scoped; avoid broad reformatting.
- Prefer ASCII; keep filenames and paths stable unless requested.
- Prefer non-archive paths for code changes; avoid editing `archive/` (including `archive/unused`) unless explicitly requested.
- When working in any folder, ensure a concise `README.md` exists that explains purpose, key paths, and pointers; create/update it if missing (skip `archive/` unless asked).
- Ask before destructive or irreversible actions (delete, overwrite, submit, purchase).
- Run project-required checks or clearly state when they are skipped.

## ExecPlans
When writing complex features or significant refactors, use an ExecPlan (as described in `.agent/PLANS.md`) from design to implementation.

## When to ask (and how)
- If a task needs a specific target (repo/path, environment, or output location) and it is not explicit, ask.
- If requirements/preferences are missing and would change the implementation, ask.
- If there are multiple valid choices, ask with 2-4 options and a default.
- If actions are destructive, confirm before proceeding.
- Response style for questions: minimum questions; use short numbered questions with lettered options; restate choices after the user answers and proceed.

## Startup menu (new sessions when task unspecified)
1) What do you want to do?
   A. Set up Ralph in a project
   B. Create a PRD
   C. Convert PRD -> prd.json
   D. Run the Ralph loop
   E. Review/merge AGENTS.md rules
   F. Other (describe)
2) Which project path should I use?
   A. Provide full path
3) Shell preference (Windows)?
   A. WSL/Git Bash
   B. PowerShell

## Ralph usage (if running the Ralph loop)
- Keep `ralph.sh`, `prompt.md`, `prd.json`, and `progress.txt` in the same `scripts/ralph/` folder.
- Use small, verifiable stories; always include `Typecheck passes` and for UI stories `Verify in browser using dev-browser skill`.
- Append learnings to `progress.txt` and update `AGENTS.md` only with reusable patterns.
- Stop condition is `<promise>COMPLETE</promise>`.

## Continuity ledger
- Maintain a single Continuity Ledger at `C:/pt-study-sop/CONTINUITY.md`.
- Update the ledger after every significant change; append only -- never delete history.

## Project map (nearest AGENTS.md locations)
- PT Study SOP: `C:/pt-study-sop/AGENTS.md` (mirror of canonical in `C:/pt-study-sop/ai-config/AGENTS.md`)
  - Runtime canon in `sop/gpt-knowledge/`; master plan in `sop/MASTER_PLAN_PT_STUDY.md`.
  - Requires `CONTINUITY.md` and specific test commands.
- DrCodePT-Swarm: `C:/Users/treyt/OneDrive/Desktop/DrCodePT-Swarm/AGENTS.md`
  - Phase machine and ASK_USER gating; use `pytest -q` for tests.
- PowerHouse Program Design Workspace: `C:/Users/treyt/OneDrive/Desktop/PowerHouseATX_Master/09 PROJECTS/Program Design Workspace/AGENTS.md`
  - JS/Vite workflow; unit/e2e/verify scripts; handler mapping details.
- Powerhouse tracker: `C:/Users/treyt/OneDrive/Desktop/PowerHouseATX_Master/09 PROJECTS/Program Design Workspace/powerhouse-tracker/AGENTS.md`

## Extra notes
- If unsure, label it `UNCONFIRMED` and ask a targeted question.
- Always list the exact files changed.
``

--------------------------------------------------------------------------------
# FILE: docs/root/PROJECT_ARCHITECTURE.md
--------------------------------------------------------------------------------
``markdown
# PT Study System â€” Comprehensive Project Architecture

**Version:** 4.0
**Last Updated:** 2026-01-12
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

### 2.1 Runtime Canon Overview (`sop/gpt-knowledge/`)

The `sop/gpt-knowledge/` folder contains the **Runtime Canon** â€” the authoritative instructions loaded into the Custom GPT ("Structured Architect").

**Stats:**
- **Files:** 24 canonical files
- **Total Lines:** ~1,560
- **Rule:** This folder is the single source of truth. If it conflicts with `MASTER_PLAN_PT_STUDY.md` or other docs, the Runtime Canon wins.

**File Structure:**
```
sop/gpt-knowledge/
â”œâ”€â”€ 00_INDEX.md                 # Entry point and quick start
â”œâ”€â”€ 00_FILE_INDEX.md            # File purpose index
â”œâ”€â”€ 00_LEARNING_CORE.md         # PEIR-RO learning cycle (Backbone)
â”œâ”€â”€ 00_SFIRL_ENCODING.md        # KWIK encoding flow (Backbone)
â”œâ”€â”€ BUILD_ORDER.md              # Required upload sequence
â”œâ”€â”€ DEPLOYMENT_CHECKLIST.md     # Pre-flight verification
â”œâ”€â”€ ANATOMY_ENGINE.md           # Bone-first anatomy protocol
â”œâ”€â”€ CONCEPT_ENGINE.md           # Non-anatomy topic protocol
â”œâ”€â”€ CONTEXT_FRAMEWORKS.md       # Y-series (quick context)
â”œâ”€â”€ HIERARCHY_FRAMEWORKS.md     # H-series (structure mapping)
â”œâ”€â”€ LOGIC_FRAMEWORKS.md         # M-series (mechanisms/logic)
â”œâ”€â”€ LEVELS.md                   # L1-L4 gating system
â”œâ”€â”€ M0_PLANNING.md              # Phase 0: Plan & Source-Lock
â”œâ”€â”€ M1_ACTIVATION.md            # Phase 1: Mode & Entry
â”œâ”€â”€ M2_FRAMING.md               # Phase 2: Prime & Map
â”œâ”€â”€ M3_ENCODING.md              # Phase 3: Active Encoding
â”œâ”€â”€ M4_PRACTICE.md              # Phase 4: Build & Fade
â”œâ”€â”€ M5_TRANSITIONS.md           # Mode switching logic
â”œâ”€â”€ M6_WRAP.md                  # Phase 6: Consolidate & Data Output
â”œâ”€â”€ GPT-INSTRUCTIONS.md         # Custom GPT System Prompt
â”œâ”€â”€ SESSION_PRIMER.md           # Per-session copy/paste prompt
â”œâ”€â”€ SESSION_LOG_TEMPLATE.md     # Canonical output format
â”œâ”€â”€ NOTEBOOKLM_BRIDGE.md        # Source-grounding rules
â””â”€â”€ ARCHIVE_MASTER_FULL.md      # version 9.1 reference (legacy)
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
| **M6** | **Wrap** | **Consolidation:** 3-Question Recap, Error Log, Glossaries.<br>**JSON Output:** MANDATORY dual JSON dump (Tracker + Enhanced) for Brain ingestion. |

### 2.4 Support Content (Frameworks & Engines)

**Frameworks** provide structured ways to think:
- **Levels (`LEVELS.md`):** L1 (Analogy) â†’ L2 (Simple 10yo) â†’ **GATE** â†’ L3 (Technical) â†’ L4 (Clinical).
  - *Rule:* Must pass L2 teach-back before accessing L3/L4.
- **H-Series (`HIERARCHY_FRAMEWORKS.md`):** Structure maps (System â†’ Subsystem â†’ Component).
- **M-Series (`LOGIC_FRAMEWORKS.md`):** Logic flows (Trigger â†’ Mechanism â†’ Result).
- **Y-Series (`CONTEXT_FRAMEWORKS.md`):** Quick context (Load/Stress, Signal/Detection).

**Engines** contain specialized content logic:
- **Anatomy Engine (`ANATOMY_ENGINE.md`):**
  - **OIANA+ Order:** Bones â†’ Landmarks (Visual First) â†’ Attachments â†’ Actions â†’ Nerves â†’ Arterial â†’ Clinical.
  - **Rollback Rule:** If struggling with OIANA, return to landmarks.
- **Concept Engine (`CONCEPT_ENGINE.md`):**
  - **Flow:** Definition â†’ Context â†’ Mechanism â†’ Boundary (vs near-miss) â†’ Application.
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
# FILE: sop/src/MASTER_PLAN_PT_STUDY.md
--------------------------------------------------------------------------------
``markdown
> Runtime bundle is generated in `sop/runtime/knowledge_upload/`.
> Canonical source is `sop/src/`. If this document conflicts with canonical source, canonical wins.
> This is a blueprint/design doc.

# PT Study SOP - Master Plan (Stable North Star)
**Owner:** Trey Tucker  
**Purpose:** Version-agnostic blueprint; only change when invariants or contracts change.

---

## 1) Vision (non-negotiable)
Build a personal AI study OS that:
- Remembers across sessions (durable context, no drift).
- Runs end-to-end study flows (plan â†’ learn â†’ test â†’ log â†’ review) with minimal manual steps.
- Grounds all generation in the learner's own materials (RAG-first, citation-first).
- Produces spaced, high-quality cards and retains outcomes over years.

## Program Goal
- Near-term (Dec 2025 finals): zero missing session logs; each session logs what worked/what didnâ€™t; draft cards in â‰¥30% of sessions.
- Next semester start: stable loop (plan â†’ learn â†’ log â†’ card draft); off-source drift <5%; weekly readiness/test-score trend.
- Calendar sync: design only; build after semester ends (lowest priority).

---

## 2) Invariants (do not change across versions)
- Lifecycle: MAP â†’ LOOP â†’ WRAP.
- Seed-Lock / Gated Platter / Teach-back: user must supply seeds; system gates progression (L2 before L4).
- RAG-first generation: answers/cards cite indexed user sources; if offline, mark as unverified.
- Single source of truth: Brain DB + session logs + resume feed every session start.
- Versioned schemas: session_log, resume, card, RAG doc are explicit and backward-compatible.
- Deterministic logging: every session emits a schema-conformant log; ingestion closes the session.
- Observability: tool calls and gating decisions are recorded (log/resume/dashboard).
- Security/Privacy: local-first; external APIs are opt-in per tool.

### MAP/PEIRRO alignment (documentation note)
- MAP â†’ LOOP â†’ WRAP is the execution lifecycle; PEIRRO is the learning cycle backbone.
- MAP aligns primarily with Prepare.
- LOOP spans Encode, Interrogate, Retrieve.
- WRAP covers Refine and Overlearn.

---

## 3) System architecture (stable components)
1. Desktop/Orchestration Agent â€” accepts NL tasks; calls tools with audit trail.
2. Content Pipeline â€” normalize/transcode/transcribe/index course docs; outputs metadata-rich docs.
3. RAG Index & Search â€” ingest API; search returns snippets+citation; supports text+image captions.
4. Study Engine (SOP Runner) â€” enforces MAPâ†’LOOPâ†’WRAP, Seed-Lock, gating; consumes RAG; emits session_log.
5. Card/Anki Bridge â€” add/update cards; dedupe by deck+guid; tag with sources; log status.
6. Brain (DB + Resume) â€” ingest session_log; generate resume/readiness; export JSON/MD; schemas versioned.
7. Multi-AI Router â€” route by task; return tool+model used for audit.
8. Dashboard â€” read-only over Brain/RAG; visualize coverage, spacing, calibration, anchors, cards.

---

## 4) Schemas (contracts to honor)
- Session Log v9.x: date, time, duration, study_mode, target_exam/block, sources, plan, main_topic, subtopics, frameworks, gates, WRAP, anki_count, anatomy fields, ratings, anchors, reflection, next_session. Additive-only changes unless this plan is updated.
- RAG Doc v1: {id, source_path, course, module, doc_type, created_at, checksum, text_chunks[], image_captions[], metadata{}}.
- Card v1: {deck, guid, front, back, tags[], source_refs[], created_at, updated_at}.
- Resume v1: {generated_at, readiness_score, recent_sessions[], topic_coverage[], gaps[], recommendations[]}.

---

## 5) Roadmap ladder (fixed rungs)
1) Download/organize course docs.  
2) Transcode/transcribe + index (text+images).  
3) RAG-backed SOP: answers/cards cite sources (no free hallucination).  
4) Card bridge hardening: dedupe/queues/offline fallback/source tags.  
5) Dashboard & spacing: coverage, readiness, spacing alerts, calibration.  
6) Multi-AI router with audit/fallbacks.  
7) Automation/scheduling: daily sync, ingest, resume, spaced notifications.

---

## 6) Governance
- Any change to Vision, Invariants, Architecture, or Schemas requires editing this file.
- Version plans (e.g., v9.2) may adjust scope but cannot violate invariants/contracts.
- New fields must be additive and documented; DB migrations must be provided when schemas change.
- PR checklist: Does this break an invariant/contract? If yes, update Master Plan or reject.

---

## 7) Operational minimums (every version)
- Session template enforced; ingestion + resume generation work.
- RAG reachable; if offline, mark outputs as unverified.
- One-command sync (downloads + ingest + resume).
- Health checks: content fetch, RAG search, Anki connect, DB integrity.
- Planning phase includes an interleaving check of prior weak anchors.

---

## 8) Current alignment (v9.2+)
- Session logging/ingest/resume: âœ… working.
- Dashboard: âœ… implemented with stats, syllabus intake, calendar API, Tutor stubs, Scholar integration.
- Dashboard spacing/coverage visuals: â³ basic stats exist; advanced visualizations deferred.
- RAG: âœ… module exists (`brain/rag_notes.py`) with CLI; dashboard integration deferred.
- Tutor API: âš ï¸ stub endpoints exist; full RAG-integrated implementation deferred.
- Card bridge: â³ working; needs strict source-tag gating and dashboard integration.
- Content pipeline: â³ downloads/transcode/transcribe not automated.

## 9) Next targets (without changing the North Star)
- âœ… Brain planning tables and basic endpoints (rung 1) - COMPLETE.
- âš ï¸ RAG dashboard integration (rung 2) - module exists, UI integration needed.
- â³ Wire SOP to use RAG for answers/cards (rung 3) - Tutor stubs exist, full implementation needed.
- â³ Harden card dedupe/queue/tagging with source refs (rung 4).
- â³ Add spacing/coverage visuals to dashboard (rung 5) - basic stats exist, advanced visuals needed.
- â³ Finish downloads + transcode/transcribe + RAG ingest (rungs 1â€“2) - RAG module exists, content pipeline automation needed.

## 10) Update log
- 2025-12-06: Initial Master Plan created for PT Study SOP (applies to all future versions).
- 2025-12-08: Clarified RAG-first/citation-first, roadmap ladder, and current alignment.
- 2026-01-09: Updated current alignment to reflect v9.2+ dashboard implementation, RAG module, Tutor stubs, and roadmap progress.
- 2026-01-12: Added interleaving check to M0 planning (prior weak anchors review).
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

- 2026-01-22 17:01:00: Policy update â€” after each successful upgrade or change, push to GitHub.

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
``

--------------------------------------------------------------------------------
# FILE: brain/db_setup.py
--------------------------------------------------------------------------------
``python
#!/usr/bin/env python3
"""
Database setup and schema initialization for PT Study Brain v9.3.
"""

import sqlite3
import os
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "pt_study.db")


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
            schema_version TEXT DEFAULT '9.3',
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
        "anchors_mastery": "TEXT",
        "what_worked": "TEXT",
        "what_needs_fixing": "TEXT",
        "gaps_identified": "TEXT",
        "notes_insights": "TEXT",
        "next_topic": "TEXT",
        "next_focus": "TEXT",
        "next_materials": "TEXT",
        "created_at": "TEXT NOT NULL",
        "schema_version": "TEXT DEFAULT '9.3'",
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
            elif "DEFAULT '9.3'" in col_type:
                sql_type = "TEXT DEFAULT '9.3'"
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
            type TEXT NOT NULL, -- lecture/reading/quiz/exam/assignment/announcement/other
            title TEXT NOT NULL,
            date TEXT,          -- primary calendar date (e.g., lecture date)
            due_date TEXT,      -- for quizzes/exams/assignments
            weight REAL DEFAULT 0.0,
            raw_text TEXT,      -- syllabus snippet or notes
            status TEXT DEFAULT 'pending', -- pending/completed/cancelled
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

    # Add recurrence_rule column if not exists (for recurring events)
    if "recurrence_rule" not in ce_columns:
        try:
            cursor.execute("ALTER TABLE course_events ADD COLUMN recurrence_rule TEXT")
            print("[INFO] Added 'recurrence_rule' column to course_events table")
        except sqlite3.OperationalError:
            pass  # Column might already exist

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

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS quick_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            content TEXT NOT NULL,
            position INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """
    )
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


if __name__ == "__main__":
    print("PT Study Brain - Database Setup")
    print("=" * 40)

    if os.path.exists(DB_PATH):
        print(f"[INFO] Existing database found at: {DB_PATH}")
        version = get_schema_version()
        print(f"[INFO] Current schema version: {version}")

        if version not in {"9.1", "9.2", "9.3"}:
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
    """Serve the React build if present; otherwise fall back to legacy Flask."""
    import os
    from flask import send_from_directory, current_app

    static_folder = current_app.static_folder or ""
    dist_index = os.path.join(static_folder, "dist", "index.html")

    if os.path.exists(dist_index):
        return send_from_directory(os.path.join(static_folder, "dist"), "index.html")

    return render_template("dashboard.html")


@dashboard_bp.route("/old-dashboard")
def old_dashboard():
    """Legacy dashboard for reference."""
    return render_template("dashboard.html")


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
    """Generate weekly digest of Scholar outputs from the past 7 days."""
    result = generate_weekly_digest(days=7)
    save_param = request.args.get("save", "true").strip().lower()
    should_save = save_param not in {"0", "false", "no"}
    if result.get("ok") and result.get("digest") and should_save:
        try:
            saved = _save_digest_artifacts(result["digest"], digest_type="weekly")
            result["saved"] = True
            result.update(saved)
        except Exception as e:
            result["saved"] = False
            result["save_error"] = str(e)
    return jsonify(result)


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
    db_path = Path(__file__).parent.parent / "data" / "pt_study.db"
    db_size_mb = db_path.stat().st_size / (1024 * 1024) if db_path.exists() else 0

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
        INSERT INTO scholar_digests (filename, filepath, title, digest_type, created_at, content_hash)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            filename,
            str(filepath.relative_to(repo_root)),
            title,
            digest_type,
            created_at,
            content_hash,
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
        SELECT id, filename, title, digest_type, created_at, content_hash
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
        }
        for row in rows
    ]

    return jsonify({"ok": True, "digests": digests, "count": len(digests)})


@dashboard_bp.route("/api/scholar/digests/<int:digest_id>", methods=["GET"])
def api_scholar_get_digest(digest_id):
    """Get a single digest by ID, including its content."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, filename, filepath, title, digest_type, created_at, content_hash
        FROM scholar_digests WHERE id = ?
        """,
        (digest_id,),
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"ok": False, "message": "Digest not found"}), 404

    # Read content from file
    repo_root = Path(__file__).parent.parent.parent.resolve()
    filepath = repo_root / row[2]
    content = ""
    if filepath.exists():
        content = filepath.read_text(encoding="utf-8")

    return jsonify(
        {
            "ok": True,
            "digest": {
                "id": row[0],
                "filename": row[1],
                "filepath": row[2],
                "title": row[3],
                "digest_type": row[4],
                "created_at": row[5],
                "content_hash": row[6],
                "content": content,
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


@dashboard_bp.route("/api/scholar/implementation-bundle", methods=["POST"])
def api_scholar_implementation_bundle():
    """Generate an implementation bundle from approved proposals with safety checks."""
    result = generate_implementation_bundle()
    status_code = 200 if result.get("ok") else 400
    return jsonify(result), status_code


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
``

--------------------------------------------------------------------------------
# FILE: brain/static/js/dashboard.js
--------------------------------------------------------------------------------
``javascript
/* ===== Collapsible Section Toggle ===== */
function toggleCollapsible(headerEl) {
  const section = headerEl.closest('.collapsible-section');
  if (section) {
    section.classList.toggle('collapsed');
    // Save state to localStorage
    const sectionId = section.id || section.dataset.section;
    if (sectionId) {
      const collapsed = section.classList.contains('collapsed');
      localStorage.setItem('collapse_' + sectionId, collapsed ? '1' : '0');
    }
  }
}

function initCollapsibles() {
  // Restore collapsed state from localStorage
  document.querySelectorAll('.collapsible-section').forEach(section => {
    const sectionId = section.id || section.dataset.section;
    if (sectionId) {
      const saved = localStorage.getItem('collapse_' + sectionId);
      if (saved === '1') {
        section.classList.add('collapsed');
      }
    }
  });

  // Also restore <details> state from localStorage
  // Default: all sections start COLLAPSED unless explicitly opened by user this session
  document.querySelectorAll('details.section-panel').forEach(details => {
    const sectionId = details.id;

    // Force collapsed on page load - user can expand as needed
    details.removeAttribute('open');

    // Listen for toggle events to save state (but don't restore on load)
    details.addEventListener('toggle', () => {
      if (details.id) {
        localStorage.setItem('details_' + details.id, details.open ? 'open' : 'closed');
      }
    });
  });
}

/* ===== Expand/Collapse All Sections ===== */
function expandAllSections(tabId) {
  const tab = document.getElementById(tabId);
  if (!tab) return;

  // Expand all <details> elements
  tab.querySelectorAll('details.section-panel').forEach(details => {
    details.setAttribute('open', '');
    if (details.id) {
      localStorage.setItem('details_' + details.id, 'open');
    }
  });

  // Also expand .collapsible-section elements
  tab.querySelectorAll('.collapsible-section').forEach(section => {
    section.classList.remove('collapsed');
    const sectionId = section.id || section.dataset.section;
    if (sectionId) {
      localStorage.setItem('collapse_' + sectionId, '0');
    }
  });
}

function collapseAllSections(tabId) {
  const tab = document.getElementById(tabId);
  if (!tab) return;

  // Collapse all <details> elements
  tab.querySelectorAll('details.section-panel').forEach(details => {
    details.removeAttribute('open');
    if (details.id) {
      localStorage.setItem('details_' + details.id, 'closed');
    }
  });

  // Also collapse .collapsible-section elements
  tab.querySelectorAll('.collapsible-section').forEach(section => {
    section.classList.add('collapsed');
    const sectionId = section.id || section.dataset.section;
    if (sectionId) {
      localStorage.setItem('collapse_' + sectionId, '1');
    }
  });
}

// Call initCollapsibles on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initCollapsibles);

// Header collapse disabled - using fixed header size
// function initHeaderCollapse() {
//   const threshold = 140;
//   const apply = () => {
//     const collapsed = window.scrollY > threshold;
//     document.body.classList.toggle('header-collapsed', collapsed);
//   };
//   apply();
//   window.addEventListener('scroll', apply, { passive: true });
//   window.addEventListener('resize', apply);
// }

// document.addEventListener('DOMContentLoaded', initHeaderCollapse);

const NOTES_STORAGE_KEY = 'dashboard_notes_v1';
let currentEditingNoteId = null;

function getStoredNotes() {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to read notes storage', err);
    return [];
  }
}

function saveStoredNotes(notes) {
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
}

function setEditingState(noteId = null) {
  currentEditingNoteId = noteId;
  const saveBtn = document.getElementById('notes-save-btn');
  if (saveBtn) {
    saveBtn.textContent = noteId ? 'Update Note' : 'Save Note';
  }
}

function escapeNoteHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderNotes() {
  const list = document.getElementById('notes-list');
  if (!list) return;
  const notes = getStoredNotes();
  if (!notes.length) {
    list.innerHTML = '<div class="notes-hint">No notes yet.</div>';
    return;
  }

  list.innerHTML = notes.map(note => {
    const safeText = escapeNoteHtml(note.text);
    return `
      <div class="notes-item" data-note-id="${note.id}">
        <div class="notes-item-header">
          <span>${note.createdAt}</span>
        </div>
        <div class="notes-item-body">${safeText}</div>
        <div class="notes-item-actions">
          <button type="button" data-action="edit-note" data-note-id="${note.id}">Edit</button>
          <button type="button" data-action="delete-note" data-note-id="${note.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function addNote() {
  const input = document.getElementById('notes-quick-text');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const notes = getStoredNotes();
  if (currentEditingNoteId) {
    const note = notes.find(item => item.id === currentEditingNoteId);
    if (note) {
      note.text = text;
      note.updatedAt = new Date().toLocaleString();
    } else {
      notes.unshift({
        id: Date.now().toString(),
        text,
        createdAt: new Date().toLocaleString()
      });
    }
  } else {
    notes.unshift({
      id: Date.now().toString(),
      text,
      createdAt: new Date().toLocaleString()
    });
  }
  saveStoredNotes(notes.slice(0, 50));
  input.value = '';
  setEditingState(null);
  renderNotes();
}

function deleteNote(noteId) {
  const notes = getStoredNotes().filter(note => note.id !== noteId);
  saveStoredNotes(notes);
  if (currentEditingNoteId === noteId) {
    const input = document.getElementById('notes-quick-text');
    if (input) input.value = '';
    setEditingState(null);
  }
  renderNotes();
}

function toggleNotes(forceState) {
  const shouldOpen = typeof forceState === 'boolean'
    ? forceState
    : !document.body.classList.contains('notes-open');
  document.body.classList.toggle('notes-open', shouldOpen);

  const sidebar = document.getElementById('notes-sidebar');
  if (sidebar) {
    sidebar.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  }
  const btn = document.getElementById('notes-tab-btn');
  if (btn) {
    btn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  }
}

function closeNotes() {
  toggleNotes(false);
}

document.addEventListener('DOMContentLoaded', () => {
  const notesBtn = document.getElementById('notes-tab-btn');
  if (notesBtn) {
    notesBtn.addEventListener('click', () => toggleNotes());
  }

  const saveBtn = document.getElementById('notes-save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', addNote);
  }

  const clearBtn = document.getElementById('notes-clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const input = document.getElementById('notes-quick-text');
      if (input) input.value = '';
      setEditingState(null);
    });
  }

  const list = document.getElementById('notes-list');
  if (list) {
    list.addEventListener('click', event => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.getAttribute('data-action');
      const noteId = target.getAttribute('data-note-id');
      if (!action || !noteId) return;
      if (action === 'delete-note') {
        deleteNote(noteId);
      }
      if (action === 'edit-note') {
        const note = getStoredNotes().find(item => item.id === noteId);
        const input = document.getElementById('notes-quick-text');
        if (note && input) {
          input.value = note.text;
          input.focus();
          setEditingState(noteId);
        }
      }
    });
  }

  renderNotes();
});

// Scroll to top on page load to show hero logo
window.addEventListener('load', () => {
  window.scrollTo({ top: 0, behavior: 'instant' });
});


/* ===== Mobile Navigation Toggle ===== */
function toggleMobileNav() {
  const isOpen = document.body.classList.toggle('mobile-nav-open');
  const hamburger = document.getElementById('hamburger-btn');
  if (hamburger) {
    hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }
  const overlay = document.getElementById('mobile-nav-overlay');
  if (overlay) {
    overlay.style.display = isOpen ? 'block' : 'none';
  }
  if (!hamburger && !overlay) {
    document.body.classList.remove('mobile-nav-open');
  }

}

function closeMobileNav() {
  document.body.classList.remove('mobile-nav-open');
  const hamburger = document.getElementById('hamburger-btn');
  if (hamburger) {
    hamburger.setAttribute('aria-expanded', 'false');
  }
  const overlay = document.getElementById('mobile-nav-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

// Close mobile nav on Escape key
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && document.body.classList.contains('mobile-nav-open')) {
    closeMobileNav();
  }
});

// Close mobile nav when a nav item is clicked
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.mobile-nav-panel .nav-item').forEach(function (item) {
    item.addEventListener('click', closeMobileNav);
  });
});

/* ===== Status Display Helper ===== */
function showStatus(elementId, message, type = 'info') {
  const el = document.getElementById(elementId);
  if (!el) {
    console.error('Status element not found:', elementId);
    return;
  }

  let bgColor, textColor;
  switch (type) {
    case 'success':
      bgColor = 'rgba(63, 185, 80, 0.2)';
      textColor = 'var(--success)';
      break;
    case 'error':
      bgColor = 'rgba(248, 81, 73, 0.2)';
      textColor = 'var(--error)';
      break;
    case 'warning':
      bgColor = 'rgba(218, 165, 32, 0.2)';
      textColor = 'var(--warning)';
      break;
    default:
      bgColor = 'rgba(31, 111, 235, 0.2)';
      textColor = 'var(--accent)';
  }

  el.innerHTML = `<div style="padding: 8px 12px; border-radius: 6px; font-size: 13px; background: ${bgColor}; color: ${textColor};">${message}</div>`;
}

/* ===== Fast Entry (Paste from Tutor) ===== */
const FAST_ENTRY_PROMPTS = {
  'session-log': `At the end of our session, output a JSON session log I can paste into my study tracker. Use this exact format:

\`\`\`json
{
  "date": "YYYY-MM-DD",
  "topic": "Main topic we covered",
  "mode": "Core",
  "duration": 45,
  "understanding": 4,
  "retention": 4,
  "system_performance": 5,
  "what_worked": "Bullet points of what was effective, separated by semicolons",
  "what_needs_fixing": "Bullet points of gaps or issues, separated by semicolons",
  "anchors": "Key concepts/hooks created, separated by semicolons",
  "notes": "Any additional insights or next steps"
}
\`\`\`

Rules:
- date: Use today's date in YYYY-MM-DD format
- mode: One of "Core", "Sprint", or "Drill"
- duration: Integer minutes
- understanding/retention/system_performance: Integer 1-5
- All text fields: Use semicolons to separate multiple items

Generate this JSON at the end of our session.`,

  'quick-recap': `At the end of our session, give me a quick JSON recap:

\`\`\`json
{
  "date": "YYYY-MM-DD",
  "topic": "Topic",
  "mode": "Core",
  "duration": 30,
  "understanding": 4,
  "retention": 3,
  "what_worked": "Brief summary",
  "notes": "Key takeaway or next step"
}
\`\`\`
`
};

function copyFastEntryPrompt() {
  const select = document.getElementById('fast-entry-prompt-select');
  const promptKey = select.value;
  const displayDiv = document.getElementById('fast-entry-prompt-display');
  const promptText = document.getElementById('fast-entry-prompt-text');

  if (!promptKey) {
    displayDiv.style.display = 'none';
    return;
  }

  const prompt = FAST_ENTRY_PROMPTS[promptKey];
  if (prompt) {
    promptText.textContent = prompt;
    displayDiv.style.display = 'block';
    navigator.clipboard.writeText(prompt).then(() => {
      showStatus('fast-entry-status', 'Prompt copied to clipboard!', 'success');
    }).catch(() => {
      showStatus('fast-entry-status', 'Select and copy the prompt manually', 'warning');
    });
  }
}

async function submitFastEntry() {
  const pasteContent = document.getElementById('fast-entry-paste').value.trim();
  if (!pasteContent) {
    showStatus('fast-entry-status', 'Please paste session content first', 'error');
    return;
  }

  // Parse the pasted content
  const parsed = parseFastEntry(pasteContent);
  if (!parsed.topic) {
    showStatus('fast-entry-status', 'Could not parse topic from pasted content. Make sure it includes "Topic:" line.', 'error');
    return;
  }

  showStatus('fast-entry-status', 'Ingesting session...', 'info');

  try {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    });

    if (response.ok) {
      showStatus('fast-entry-status', 'Session ingested successfully!', 'success');
      document.getElementById('fast-entry-paste').value = '';
      loadStats(); // Refresh session list
      loadOverviewData(); // Refresh overview stats
    } else {
      const err = await response.json();
      showStatus('fast-entry-status', 'Error: ' + (err.error || 'Unknown error'), 'error');
    }
  } catch (e) {
    showStatus('fast-entry-status', 'Network error: ' + e.message, 'error');
  }
}

function parseFastEntry(content) {
  const result = {
    topic: '',
    study_mode: 'Core',
    time_spent_minutes: 30,
    understanding_level: 3,
    retention_confidence: 3,
    system_performance: 3,
    what_worked: '',
    what_needs_fixing: '',
    notes_insights: ''
  };

  // Try to parse as JSON first (preferred format)
  try {
    // Extract JSON from markdown code blocks if present
    let jsonStr = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // Try to find raw JSON object
      const braceMatch = content.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        jsonStr = braceMatch[0];
      }
    }

    const parsed = JSON.parse(jsonStr);

    // Map JSON fields to result
    result.topic = parsed.topic || '';
    result.study_mode = parsed.mode || 'Core';
    result.time_spent_minutes = parseInt(parsed.duration) || 30;
    result.understanding_level = parseInt(parsed.understanding) || 3;
    result.retention_confidence = parseInt(parsed.retention) || 3;
    result.system_performance = parseInt(parsed.system_performance) || 3;
    result.what_worked = parsed.what_worked || '';
    result.what_needs_fixing = parsed.what_needs_fixing || parsed.gaps || '';
    result.notes_insights = parsed.notes || '';

    // Handle anchors - append to notes if present
    if (parsed.anchors) {
      result.notes_insights = result.notes_insights
        ? result.notes_insights + '\n\nAnchors: ' + parsed.anchors
        : 'Anchors: ' + parsed.anchors;
    }

    return result;
  } catch (e) {
    // JSON parse failed, fall back to text parsing
    console.log('JSON parse failed, trying text format:', e.message);
  }

  // Fallback: Parse as structured text format
  const lines = content.split('\n');
  let currentSection = null;
  let sectionContent = [];
  let unstructuredLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '---' || trimmed.startsWith('```')) continue;

    // Check for key: value pairs
    const kvMatch = trimmed.match(/^(Date|Topic|Subject|Mode|Duration|Time|Understanding|Retention|System Performance|What Worked|What Needs Fixing|Gaps|Anchors Locked|Anchors|Notes|Session):?\s*(.*)$/i);
    if (kvMatch) {
      // Save previous section if any
      if (currentSection && sectionContent.length > 0) {
        const text = sectionContent.join('\n').trim();
        if (currentSection === 'what_worked') result.what_worked = text;
        else if (currentSection === 'what_needs_fixing') result.what_needs_fixing = text;
        else if (currentSection === 'notes') result.notes_insights = text;
        sectionContent = [];
      }

      const key = kvMatch[1].toLowerCase();
      const val = kvMatch[2].trim();

      if (key === 'topic' || key === 'subject' || key === 'session') result.topic = val;
      else if (key === 'mode') result.study_mode = val.includes('Sprint') ? 'Sprint' : val.includes('Drill') ? 'Drill' : 'Core';
      else if (key === 'duration' || key === 'time') result.time_spent_minutes = parseInt(val) || 30;
      else if (key === 'understanding') result.understanding_level = parseInt(val) || 3;
      else if (key === 'retention') result.retention_confidence = parseInt(val) || 3;
      else if (key === 'system performance') result.system_performance = parseInt(val) || 3;
      else if (key === 'what worked') { currentSection = 'what_worked'; if (val) sectionContent.push(val); }
      else if (key === 'what needs fixing' || key === 'gaps') { currentSection = 'what_needs_fixing'; if (val) sectionContent.push(val); }
      else if (key === 'notes' || key === 'anchors locked' || key === 'anchors') { currentSection = 'notes'; if (val) sectionContent.push(val); }
    } else if (currentSection && trimmed) {
      sectionContent.push(trimmed);
    } else if (trimmed) {
      unstructuredLines.push(trimmed);
    }
  }

  // Capture final section
  if (currentSection && sectionContent.length > 0) {
    const text = sectionContent.join('\n').trim();
    if (currentSection === 'what_worked') result.what_worked = text;
    else if (currentSection === 'what_needs_fixing') result.what_needs_fixing = text;
    else if (currentSection === 'notes') result.notes_insights = text;
  }
  // Fallback for unstructured content: use first line as topic, rest as notes
  if (!result.topic && unstructuredLines.length > 0) {
    // Try to find a meaningful first line (skip bullets)
    let topicLine = unstructuredLines[0];
    for (const line of unstructuredLines) {
      if (!line.startsWith('*') && !line.startsWith('-') && line.length > 5) {
        topicLine = line;
        break;
      }
    }
    // Clean up the topic line
    result.topic = topicLine.replace(/^[\*\-\#\s]+/, '').substring(0, 100);
    // Put all content as notes
    result.notes_insights = unstructuredLines.join('\n');
  }

  return result;
}

// Show prompt when dropdown changes
document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('fast-entry-prompt-select');
  if (select) {
    select.addEventListener('change', () => {
      const displayDiv = document.getElementById('fast-entry-prompt-display');
      const promptText = document.getElementById('fast-entry-prompt-text');
      const promptKey = select.value;

      if (promptKey && FAST_ENTRY_PROMPTS[promptKey]) {
        promptText.textContent = FAST_ENTRY_PROMPTS[promptKey];
        displayDiv.style.display = 'block';
      } else {
        displayDiv.style.display = 'none';
      }
    });
  }
});

function openTab(evt, tabName) {
  if (evt && typeof evt.preventDefault === 'function') {
    // Prevent hash navigation/auto-open behavior on tab links.
    evt.preventDefault();
  }
  // 0. Check if switching AWAY from Scholar before hiding panels
  const currentActivePanel = document.querySelector('.tab-panel.active');
  const wasScholarActive = currentActivePanel && currentActivePanel.id === 'tab-scholar';
  if (wasScholarActive && tabName !== 'scholar') {
    // Clear polling interval when leaving Scholar (but keep sessionStorage)
    if (typeof runStatusInterval !== 'undefined' && runStatusInterval) {
      clearInterval(runStatusInterval);
      runStatusInterval = null;
    }
  }

  // 1. Hide all panels
  const panels = document.getElementsByClassName("tab-panel");
  for (let i = 0; i < panels.length; i++) {
    panels[i].style.display = "none";
    panels[i].classList.remove("active");
    panels[i].setAttribute("aria-hidden", "true");
    panels[i].setAttribute("hidden", "");
  }

  // 2. Deactivate all tab controls (top nav, mobile, legacy, arcade, and any tab buttons)
  document.querySelectorAll('.tab-button, .top-nav-item, .mobile-nav-item, .nav-item, .arcade-nav-btn')
    .forEach(item => item.classList.remove('active'));

  // 3. Show specific panel
  const panel = document.getElementById("tab-" + tabName);
  if (panel) {
    panel.style.display = "block";
    panel.classList.add("active");
    panel.setAttribute("aria-hidden", "false");
    panel.removeAttribute("hidden");
  }

  // 4. Activate specific button
  if (evt && evt.currentTarget) {
    evt.currentTarget.classList.add("active");
  } else {
    // Fallback: find any nav item by data-tab
    document.querySelectorAll('[data-tab]')
      .forEach(item => {
        if (item.getAttribute('data-tab') === tabName) {
          item.classList.add('active');
        }
      });
  }

  // Update tab accessibility state
  document.querySelectorAll('[role="tab"]').forEach(item => {
    const isActive = item.getAttribute('data-tab') === tabName;
    item.setAttribute('aria-selected', isActive ? 'true' : 'false');
    item.setAttribute('tabindex', isActive ? '0' : '-1');
  });

  // 5. Update Hash
  // window.location.hash = tabName; // Optional, maybe skip to avoid jumping

  // 6. Lazy Load
  if (tabName === 'syllabus' && typeof loadSyllabusDashboard === 'function') loadSyllabusDashboard();
  if (tabName === 'scholar' && typeof loadScholar === 'function') {
    loadScholar();
    // Restore polling if there's an active run in sessionStorage
    const storedRunId = restoreScholarRunId();
    if (storedRunId && !runStatusInterval) {
      currentRunId = storedRunId;
      runStatusInterval = setInterval(() => checkRunStatus(currentRunId), 2000);
      checkRunStatus(currentRunId);
    }
  }
  if (tabName === 'tutor' && typeof loadTutor === 'function') loadTutor();
  if (tabName === 'brain' && typeof loadBrain === 'function') loadBrain();
  if (tabName === 'sync' && typeof loadSyncPending === 'function') loadSyncPending();

  // 7. Force all sections collapsed on tab switch, then scroll to top
  const currentTab = document.getElementById('tab-' + tabName);
  if (currentTab) {
    currentTab.querySelectorAll('details.section-panel').forEach(d => d.removeAttribute('open'));
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// Global State
let allCourses = [];
let currentCalendarDate = new Date();
let calendarData = { events: [], sessions: [], planned: [] };
let syllabusEvents = [];
let syllabusViewMode = 'calendar';

// Week Selector State (for Syllabus List view)
const SEMESTER_START = new Date('2026-01-05'); // Week 1 starts here (Spring 2026)
let listStartWeek = 1;
let listWeekCount = 3; // number or 'all'
let currentScholarQuestions = [];
let currentScholarAnsweredQuestions = [];
let answeredQuestionsExpanded = false;
let modeChartInstance = null; // Global chart instance for updates

// DOM Elements
const totalSessions = document.getElementById('total-sessions');
const sessionsSubtitle = document.getElementById('sessions-subtitle');
const totalTime = document.getElementById('total-time');
const timeSubtitle = document.getElementById('time-subtitle');
const avgScore = document.getElementById('avg-score');
const progressCircle = document.getElementById('progress-circle');
const avgU = document.getElementById('avg-u');
const avgR = document.getElementById('avg-r');
const avgS = document.getElementById('avg-s');
const ankiCards = document.getElementById('anki-cards');
const sessionsTbody = document.getElementById('sessions-tbody');
const modeLegend = document.getElementById('mode-legend');
const frameworksList = document.getElementById('frameworks-list');
const weakTopics = document.getElementById('weak-topics');
const strongTopics = document.getElementById('strong-topics');
const whatWorked = document.getElementById('what-worked');
const issuesList = document.getElementById('issues-list');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const uploadStatus = document.getElementById('upload-status');
const resumeBox = document.getElementById('resume-box');
const btnResume = document.getElementById('btn-resume');
const tutorQuestion = document.getElementById('tutor-question');
const tutorAnswerBox = document.getElementById('tutor-answer-box');
const btnTutorSend = document.getElementById('btn-tutor-send');
const tutorModeSelect = document.getElementById('tutor-mode-select');
const btnTutorNewSession = document.getElementById('btn-tutor-new-session');

const tutorKindNote = document.getElementById('tutor-kind-note');
const tutorKindTextbook = document.getElementById('tutor-kind-textbook');
const tutorKindTranscript = document.getElementById('tutor-kind-transcript');
const tutorKindSlide = document.getElementById('tutor-kind-slide');
const tutorKindOther = document.getElementById('tutor-kind-other');
const tutorKindPowerpoint = document.getElementById('tutor-kind-powerpoint');
const tutorKindPdf = document.getElementById('tutor-kind-pdf');
const tutorKindTxt = document.getElementById('tutor-kind-txt');
const tutorKindMp4 = document.getElementById('tutor-kind-mp4');
const tutorKindYoutube = document.getElementById('tutor-kind-youtube');

const tutorProjectFile = document.getElementById('tutor-project-file');
const tutorProjectDocType = document.getElementById('tutor-project-doc-type');
const tutorProjectTags = document.getElementById('tutor-project-tags');
const btnTutorUpload = document.getElementById('btn-tutor-upload');
const btnTutorAddLink = document.getElementById('btn-tutor-add-link');
const tutorUploadStatusBox = document.getElementById('tutor-upload-status');
const btnTutorRefreshDocs = document.getElementById('btn-tutor-refresh-docs');
const tutorDocSearch = document.getElementById('tutor-doc-search');
const tutorDocTypeFilter = document.getElementById('tutor-doc-type-filter');
const tutorDocsList = document.getElementById('tutor-docs-list');
const tutorCitationsBox = document.getElementById('tutor-citations');
const tutorLinkUrl = document.getElementById('tutor-link-url');
const tutorLinkDocType = document.getElementById('tutor-link-doc-type');

const btnTutorStudySync = document.getElementById('btn-tutor-study-sync');
const btnTutorStudyRefresh = document.getElementById('btn-tutor-study-refresh');
const tutorStudyStatusBox = document.getElementById('tutor-study-status');
const tutorStudyFoldersBox = document.getElementById('tutor-study-folders');

const btnTutorRuntimeRefresh = document.getElementById('btn-tutor-runtime-refresh');
const tutorRuntimeItemsBox = document.getElementById('tutor-runtime-items');
const syllabusForm = document.getElementById('syllabus-form');
const syllabusStatus = document.getElementById('syllabus-status');
const syllabusJsonInput = document.getElementById('syllabus_json_input');
const syllabusJsonStatus = document.getElementById('syllabus-json-status');
const btnSyllabusJsonImport = document.getElementById('btn-syllabus-json-import');
const btnSyllabusPromptCopy = document.getElementById('btn-syllabus-prompt-copy');
const syllabusPromptTemplate = document.getElementById('syllabus_prompt_template');
const btnViewCalendar = document.getElementById('btn-view-calendar');
const btnViewList = document.getElementById('btn-view-list');
const syllabusListCourse = document.getElementById('syllabus-list-course');
const syllabusListType = document.getElementById('syllabus-list-type');
const syllabusListSearch = document.getElementById('syllabus-list-search');
const syllabusListBody = document.getElementById('syllabus-list-body');
const syllabusListEmpty = document.getElementById('syllabus-list-empty');
const btnRefreshSyllabusList = document.getElementById('btn-refresh-syllabus-list');
const btnListCollapse = document.getElementById('btn-list-collapse');
const btnListExpand = document.getElementById('btn-list-expand');
const courseSortMode = document.getElementById('course-sort-mode');
const courseDedupToggle = document.getElementById('course-dedup-toggle');

// Helpers
const formatMinutes = (m) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
};

const formatNumber = (n) => {
  return n.toLocaleString();
};

const getModeClass = (mode) => {
  const m = (mode || '').toLowerCase();
  // Map study modes to badge color classes
  if (m.includes('core') || m.includes('focus') || m.includes('deep')) return 'badge-core';
  if (m.includes('sprint') || m.includes('pomodoro')) return 'badge-sprint';
  if (m.includes('drill') || m.includes('review')) return 'badge-drill';
  return 'badge-neutral';
};

// Load and render stats
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    renderStats(data);
    renderSessions(data);
    renderPatterns(data);
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// Load and render Scholar insights on Overview tab
async function loadScholarInsights() {
  try {
    const res = await fetch('/api/scholar/insights');
    const data = await res.json();
    renderScholarInsights(data);
  } catch (error) {
    console.error('Failed to load Scholar insights:', error);
  }
}

// Load all data needed for the Overview tab
function loadOverviewData() {
  loadStats();
  loadScholarInsights();
}

function renderScholarInsights(data) {
  const card = document.getElementById('scholar-insights-card');
  const alertsList = document.getElementById('scholar-alerts-list');
  const proposalsCount = document.getElementById('scholar-proposals-count');
  const questionsCount = document.getElementById('scholar-questions-count');
  const findingsList = document.getElementById('scholar-findings-list');

  if (!card) return;

  // Check if there's any content to show
  const hasAlerts = data.alerts && data.alerts.length > 0;
  const hasProposals = data.proposals && data.proposals.length > 0;
  const hasQuestions = data.questions_pending && data.questions_pending > 0;
  const hasFindings = data.recent_findings && data.recent_findings.length > 0;

  const hasContent = hasAlerts || hasProposals || hasQuestions || hasFindings;

  // Show/hide the card based on content
  card.style.display = hasContent ? 'block' : 'none';

  if (!hasContent) return;

  // Render alerts
  if (alertsList) {
    if (hasAlerts) {
      alertsList.innerHTML = data.alerts.map(a => {
        const icon = a.type === 'warning' ? '<i class="fas fa-exclamation-triangle"></i>ï¸' : 'â„¹ï¸';
        const color = a.type === 'warning' ? '#f59e0b' : '#3b82f6';
        return `<div style="display:flex; align-items:start; gap:8px; margin-bottom:8px; cursor:pointer;" onclick="openTab(null, 'scholar')">
          <span style="color:${color};">${icon}</span>
          <span style="color:#e2e8f0;">${a.message}</span>
        </div>`;
      }).join('');
    } else {
      alertsList.innerHTML = '<div style="color:#64748b;">No alerts</div>';
    }
  }

  // Render proposals count
  if (proposalsCount) {
    const count = data.proposals ? data.proposals.length : 0;
    if (count > 0) {
      proposalsCount.innerHTML = `<span style="color:#a855f7; font-weight:600;">${count} proposal${count !== 1 ? 's' : ''}</span>
        <span style="color:#64748b; font-size:0.8rem;"> awaiting review</span>`;
    } else {
      proposalsCount.innerHTML = '<span style="color:#64748b;">0 proposals</span>';
    }
  }

  // Render questions count
  if (questionsCount) {
    const count = data.questions_pending || 0;
    if (count > 0) {
      questionsCount.innerHTML = `<span style="color:#ef4444; font-weight:600;">${count} question${count !== 1 ? 's' : ''}</span>
        <span style="color:#64748b; font-size:0.8rem;"> need answers</span>`;
    } else {
      questionsCount.innerHTML = '<span style="color:#64748b;">0 questions</span>';
    }
  }

  // Render recent findings
  if (findingsList) {
    if (hasFindings) {
      findingsList.innerHTML = data.recent_findings.slice(0, 3).map(f => {
        // Truncate long findings
        const text = f.length > 80 ? f.substring(0, 77) + '...' : f;
        return `<li style="margin-bottom:6px; color:#94a3b8;">â€¢ ${text}</li>`;
      }).join('');
    } else {
      findingsList.innerHTML = '<li style="color:#64748b;">No recent findings</li>';
    }
  }
}

function renderStats(data) {
  // Total Sessions
  if (totalSessions) totalSessions.textContent = formatNumber(data.counts.sessions);
  if (sessionsSubtitle) sessionsSubtitle.textContent = `${data.counts.sessions_30d} in last 30 days`;

  // Total Time
  if (totalTime) totalTime.textContent = formatMinutes(data.counts.total_minutes);
  if (timeSubtitle) timeSubtitle.textContent = `Avg. ${formatMinutes(data.counts.avg_daily_minutes)}/day`;

  // Score with progress ring
  const overallScore = Math.round(data.averages.overall) || 0;
  if (avgScore) avgScore.textContent = `${overallScore}%`;

  // Update progress ring (if present)
  if (progressCircle) {
    const circumference = 2 * Math.PI * 26;
    const offset = circumference - (overallScore / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;
  }

  // Individual scores (convert 1-5 to percentage) - only if present
  if (avgU) avgU.textContent = `${Math.round(data.averages.understanding * 20)}%`;
  if (avgR) avgR.textContent = `${Math.round(data.averages.retention * 20)}%`;
  if (avgS) avgS.textContent = `${Math.round(data.averages.performance * 20)}%`;

  // Anki cards
  if (ankiCards) ankiCards.textContent = formatNumber(data.counts.anki_cards);
}

function renderSessions(data) {
  if (!sessionsTbody) return; // Guard clause for new simplified HTML

  const sessions = data.recent_sessions || [];
  sessionsTbody.innerHTML = sessions.map(s => {
    const modeClass = getModeClass(s.study_mode);
    const u = s.understanding_level || '-';
    const r = s.retention_confidence || '-';
    const sys = s.system_performance || '-';

    // Build detail content for expandable row
    const whatWorked = s.what_worked || 'Not recorded';
    const whatNeedsFix = s.what_needs_fixing || 'Not recorded';
    const notes = s.notes_insights || 'No notes';
    const frameworks = s.frameworks_used || 'None';

    return `
          <tr data-session-id="${s.id}">
            <td>${s.session_date}<br><span style="font-size: 12px; color: var(--text-muted)">${s.session_time || ''}</span></td>
            <td class="badge-cell"><span class="badge ${modeClass}">${s.study_mode || 'N/A'}</span></td>
            <td>${s.topic}</td>
            <td>${formatMinutes(s.time_spent_minutes)}</td>
            <td>
              <div class="score-display">
                <span class="u">U:${u}</span>
                <span class="r">R:${r}</span>
                <span class="s">S:${sys}</span>
              </div>
            </td>
            <td>
              <div style="display: flex; gap: 6px;">
                <button class="btn" onclick="toggleSessionDetails(${s.id})" title="View details">View</button>
                <button class="btn" onclick="openEditModal(${s.id})" title="Edit session">âœŽ</button>
                <button class="btn" onclick="deleteSession(${s.id})" title="Delete session" style="color: var(--error);">âœ•</button>
              </div>
            </td>
          </tr>
          <tr id="session-detail-${s.id}" class="session-detail-row hidden">
            <td colspan="6">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; padding: 8px 0;">
                <div>
                  <strong style="color: var(--text-muted); font-size: 12px;">What Worked</strong>
                  <p style="margin: 4px 0 0 0; font-size: 14px;">${whatWorked}</p>
                </div>
                <div>
                  <strong style="color: var(--text-muted); font-size: 12px;">What Needs Fixing</strong>
                  <p style="margin: 4px 0 0 0; font-size: 14px;">${whatNeedsFix}</p>
                </div>
                <div>
                  <strong style="color: var(--text-muted); font-size: 12px;">Notes & Insights</strong>
                  <p style="margin: 4px 0 0 0; font-size: 14px;">${notes}</p>
                </div>
                <div>
                  <strong style="color: var(--text-muted); font-size: 12px;">Frameworks Used</strong>
                  <p style="margin: 4px 0 0 0; font-size: 14px;">${frameworks}</p>
                </div>
              </div>
            </td>
          </tr>
        `;
  }).join('');
}

// ============================================
// SESSION CRUD FUNCTIONS
// ============================================

async function deleteSession(sessionId) {
  if (!confirm('Are you sure you want to delete this session?')) return;
  try {
    const resp = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
    const data = await resp.json();
    if (data.ok) {
      // Refresh both stats and session list
      loadStats();
      loadOverviewData();
      // Also remove the row directly for immediate feedback
      const row = document.querySelector(`tr[data-session-id="${sessionId}"]`);
      if (row) row.remove();
    } else {
      alert('Error: ' + (data.message || data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error deleting session: ' + err.message);
  }
}

// Open the edit modal and populate with session data
async function openEditModal(sessionId) {
  try {
    const resp = await fetch(`/api/sessions/${sessionId}`);
    const data = await resp.json();
    if (!data.ok) {
      alert('Error loading session: ' + (data.error || 'Unknown error'));
      return;
    }
    const s = data.session;

    // Populate form fields
    document.getElementById('edit-session-id').value = s.id;
    document.getElementById('edit-date').value = s.session_date || '';
    document.getElementById('edit-start-time').value = s.session_time || '';
    document.getElementById('edit-topic').value = s.main_topic || s.topic || '';
    document.getElementById('edit-study-mode').value = s.study_mode || 'Core';
    document.getElementById('edit-duration').value = s.time_spent_minutes || s.duration_minutes || '';
    document.getElementById('edit-understanding').value = s.understanding_level || '';
    document.getElementById('edit-retention').value = s.retention_confidence || '';
    document.getElementById('edit-system-performance').value = s.system_performance || '';
    document.getElementById('edit-goal').value = s.plan_of_attack || '';
    document.getElementById('edit-summary').value = s.notes_insights || '';
    document.getElementById('edit-wins').value = s.what_worked || '';
    document.getElementById('edit-friction').value = s.what_needs_fixing || '';

    // Show modal
    document.getElementById('edit-session-modal').style.display = 'flex';
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// Save session edits
async function saveSession(event) {
  event.preventDefault();

  const sessionId = document.getElementById('edit-session-id').value;
  const data = {
    session_date: document.getElementById('edit-date').value,
    session_time: document.getElementById('edit-start-time').value,
    topic: document.getElementById('edit-topic').value,
    study_mode: document.getElementById('edit-study-mode').value,
    time_spent_minutes: parseInt(document.getElementById('edit-duration').value) || 0,
    understanding_level: parseInt(document.getElementById('edit-understanding').value) || null,
    retention_confidence: parseInt(document.getElementById('edit-retention').value) || null,
    system_performance: parseInt(document.getElementById('edit-system-performance').value) || null,
    plan_of_attack: document.getElementById('edit-goal').value,
    notes_insights: document.getElementById('edit-summary').value,
    what_worked: document.getElementById('edit-wins').value,
    what_needs_fixing: document.getElementById('edit-friction').value
  };

  try {
    const resp = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await resp.json();
    if (result.ok) {
      closeEditModal();
      loadStats();
      loadOverviewData();
    } else {
      alert('Error saving: ' + (result.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// Close the edit modal
function closeEditModal() {
  document.getElementById('edit-session-modal').style.display = 'none';
}

function toggleSessionDetails(sessionId) {
  const detailRow = document.getElementById('session-detail-' + sessionId);
  if (detailRow) {
    detailRow.classList.toggle('hidden');
  }
}

function renderPatterns(data) {
  // Mode frequencies - define colors for each study mode
  const modes = data.mode_percentages || {};
  const modeColors = {
    'Core': '#EF4444',      // Red
    'Sprint': '#64748B',    // Grey
    'Drill': '#10B981',     // Green
    'Focus': '#EF4444',
    'Deep Work': '#EF4444',
    'Pomodoro': '#10B981',
    'Review': '#3b82f6'
  };

  // Update legend with study mode percentages
  if (modeLegend) {
    const entries = Object.entries(modes);
    if (entries.length > 0) {
      modeLegend.innerHTML = entries.map(([mode, pct]) => `
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="width:10px; height:10px; border-radius:50%; background:${modeColors[mode] || '#64748b'};"></span>
          <span>${mode}: ${pct}%</span>
        </div>
      `).join('');
    } else {
      modeLegend.innerHTML = '<div>No data yet</div>';
    }
  }

  // Update the Chart.js doughnut with real data
  if (modeChartInstance && Object.keys(modes).length > 0) {
    const labels = Object.keys(modes);
    const dataValues = Object.values(modes);
    const colors = labels.map(m => modeColors[m] || '#64748b');

    modeChartInstance.data.labels = labels;
    modeChartInstance.data.datasets[0].data = dataValues;
    modeChartInstance.data.datasets[0].backgroundColor = colors;
    modeChartInstance.update();
  }

  // Frameworks (if present)
  const frameworks = data.frameworks || [];
  if (frameworksList) {
    frameworksList.innerHTML = frameworks.map(([name, count]) => `
        <div class="framework-item">${name}</div>
      `).join('') || '<div style="color: var(--text-muted);">No data yet</div>';
  }

  // Weak topics
  const weak = data.weak_areas || [];
  if (weakTopics) weakTopics.textContent = weak.map(w => w.topic).join(', ') || 'None flagged';

  // Strong topics
  const strong = data.strong_areas || [];
  if (strongTopics) strongTopics.textContent = strong.map(s => s.topic).join(', ') || 'None yet';

  // What worked
  const worked = data.what_worked || [];
  if (whatWorked) {
    whatWorked.innerHTML = worked.map(w => `<li>${w.split('\\n')[0]}</li>`).join('')
      || '<li>No notes yet</li>';
  }

  // Issues (if present)
  const issues = data.common_issues || [];
  if (issuesList) {
    issuesList.innerHTML = issues.map(i => `<li>${i.split('\\n')[0]}</li>`).join('')
      || '<li>No issues logged</li>';
  }
}

function drawPieChart(modes, colors) {
  const canvas = document.getElementById('modeChart');
  const ctx = canvas.getContext('2d');
  const centerX = 60;
  const centerY = 60;
  const radius = 50;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const entries = Object.entries(modes);
  if (entries.length === 0) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();
    return;
  }

  let startAngle = -Math.PI / 2;
  entries.forEach(([mode, pct]) => {
    const sliceAngle = (pct / 100) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colors[mode] || '#64748b';
    ctx.fill();
    startAngle += sliceAngle;
  });
}

// ============================================
// TRENDS CHART
// ============================================
let trendsChartData = null;

async function loadTrends(days = 30) {
  const canvas = document.getElementById('trends-chart');
  const emptyMsg = document.getElementById('trends-empty');
  const legend = document.getElementById('trends-legend');

  if (!canvas) return;

  try {
    const res = await fetch(`/api/trends?days=${days}`);
    const data = await res.json();

    // Normalize API shape (new fields first, fallback to legacy keys)
    const normalized = {
      dates: data.dates || [],
      understanding: data.avg_understanding_per_day || data.understanding || [],
      retention: data.avg_retention_per_day || data.retention || [],
      sessionsPerDay: data.sessions_per_day || data.session_count || [],
      avgDurationPerDay: data.avg_duration_per_day || data.duration_avg || [],
    };

    trendsChartData = normalized;

    const hasMetricData = (
      (normalized.understanding || []).some(v => v !== null && !isNaN(v)) ||
      (normalized.retention || []).some(v => v !== null && !isNaN(v)) ||
      (normalized.sessionsPerDay || []).some(v => v > 0)
    );
    const hasDates = normalized.dates && normalized.dates.length > 0;

    if (!hasDates || !hasMetricData) {
      canvas.style.display = 'none';
      if (emptyMsg) emptyMsg.style.display = 'block';
      if (legend) legend.style.display = 'none';
      return;
    }

    canvas.style.display = 'block';
    if (emptyMsg) emptyMsg.style.display = 'none';
    if (legend) legend.style.display = 'flex';

    drawTrendsChart(canvas, normalized);
  } catch (error) {
    console.error('Failed to load trends:', error);
  }
}

function drawTrendsChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;

  // Set canvas size for sharp rendering
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  const understanding = (data.understanding || []).map(v => v !== null ? v : NaN);
  const retention = (data.retention || []).map(v => v !== null ? v : NaN);
  const sessions = data.sessionsPerDay || data.session_count || [];

  // Filter out null values and find min/max for the line chart
  const allValues = [...understanding, ...retention].filter(v => !isNaN(v));
  if (allValues.length === 0) return;

  const minVal = Math.max(0, Math.floor(Math.min(...allValues) - 0.5));
  const maxVal = Math.min(5, Math.ceil(Math.max(...allValues) + 0.5));
  const valueRange = maxVal - minVal || 1;

  // Draw grid lines and y-axis labels
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (chartHeight * i / gridLines);
    const value = maxVal - (valueRange * i / gridLines);

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillText(value.toFixed(1), padding.left - 8, y);
  }

  // Draw x-axis labels (dates)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const dates = data.dates;
  const labelInterval = Math.ceil(dates.length / 7); // Show ~7 labels max

  dates.forEach((date, i) => {
    if (i % labelInterval === 0 || i === dates.length - 1) {
      const x = padding.left + (chartWidth * i / (dates.length - 1 || 1));
      // Format date as MM/DD
      const parts = date.split('-');
      const label = `${parts[1]}/${parts[2]}`;
      ctx.fillText(label, x, height - padding.bottom + 8);
    }
  });

  // Helper function to draw a line
  function drawLine(values, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    let started = false;

    values.forEach((val, i) => {
      if (isNaN(val)) return;

      const x = padding.left + (chartWidth * i / (values.length - 1 || 1));
      const y = padding.top + chartHeight - ((val - minVal) / valueRange) * chartHeight;

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw dots
    values.forEach((val, i) => {
      if (isNaN(val)) return;

      const x = padding.left + (chartWidth * i / (values.length - 1 || 1));
      const y = padding.top + chartHeight - ((val - minVal) / valueRange) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  // Draw understanding line (purple)
  drawLine(understanding, '#a855f7');

  // Draw retention line (blue)
  drawLine(retention, '#3b82f6');

  // Add tooltip functionality
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find closest data point
    const dataX = (x - padding.left) / chartWidth;
    const index = Math.round(dataX * (dates.length - 1));

    if (index >= 0 && index < dates.length) {
      const u = understanding[index];
      const r = retention[index];
      const count = sessions[index];
      const date = dates[index];

      // Update cursor
      canvas.style.cursor = 'crosshair';

      // Show tooltip (using title for simplicity)
      let tip = `${date}`;
      if (!isNaN(u)) tip += ` | Understanding: ${u}`;
      if (!isNaN(r)) tip += ` | Retention: ${r}`;
      if (typeof count === 'number') tip += ` | Sessions: ${count}`;
      canvas.title = tip;
    }
  };

  canvas.onmouseleave = () => {
    canvas.style.cursor = 'default';
    canvas.title = '';
  };
}

// Set up trends period selector
const trendsPeriodSelect = document.getElementById('trends-period');
if (trendsPeriodSelect) {
  trendsPeriodSelect.addEventListener('change', (e) => {
    loadTrends(parseInt(e.target.value, 10));
  });
}

// Handle window resize for trends chart
let trendsResizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(trendsResizeTimeout);
  trendsResizeTimeout = setTimeout(() => {
    if (trendsChartData && trendsChartData.dates && trendsChartData.dates.length > 0) {
      const canvas = document.getElementById('trends-chart');
      if (canvas) drawTrendsChart(canvas, trendsChartData);
    }
  }, 200);
});

// Upload handling
if (dropzone && fileInput) {
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--accent)';
    dropzone.style.background = 'var(--accent-light)';
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'var(--border)';
    dropzone.style.background = 'var(--bg)';
  });
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--border)';
    dropzone.style.background = 'var(--bg)';
    if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
  });
}
if (fileInput) {
  fileInput.addEventListener('change', e => {
    if (e.target.files.length) uploadFile(e.target.files[0]);
  });
}

async function uploadFile(file) {
  uploadStatus.innerHTML = '<div class="upload-status" style="background: var(--accent-light); color: var(--accent);">Uploading...</div>';
  const form = new FormData();
  form.append('file', file);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    const data = await res.json();

    if (data.ok) {
      uploadStatus.innerHTML = `<div class="upload-status success">[OK] ${data.message} (${data.filename})</div>`;
      loadStats();
    } else {
      uploadStatus.innerHTML = `<div class="upload-status error">[ERROR] ${data.message}</div>`;
    }
  } catch (error) {
    uploadStatus.innerHTML = `<div class="upload-status error">[ERROR] Upload failed: ${error.message}</div>`;
  }
}

// Resume handling
if (btnResume && resumeBox) {
  btnResume.addEventListener('click', async () => {
    resumeBox.textContent = 'Generating...';
    try {
      const res = await fetch('/api/resume');
      const txt = await res.text();
      resumeBox.textContent = txt;
    } catch (error) {
      resumeBox.textContent = 'Failed to generate resume: ' + error.message;
    }
  });
}

// Quick session form handling
const quickSessionForm = document.getElementById('quick-session-form');
const quickSessionStatus = document.getElementById('quick-session-status');

if (quickSessionForm) quickSessionForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Collect form data
  const formData = {
    topic: document.getElementById('topic').value,
    study_mode: document.getElementById('study_mode').value,
    time_spent_minutes: parseInt(document.getElementById('time_spent_minutes').value),
    understanding_level: parseInt(document.getElementById('understanding_level').value),
    retention_confidence: parseInt(document.getElementById('retention_confidence').value) || 3,
    system_performance: parseInt(document.getElementById('system_performance').value) || 3,
    what_worked: document.getElementById('what_worked').value,
    what_needs_fixing: document.getElementById('what_needs_fixing').value,
    notes_insights: document.getElementById('notes_insights').value,
    frameworks_used: "",  // Optional - can be added later if needed
    gated_platter_triggered: "No",  // Default
    wrap_phase_reached: "No",  // Default
    anki_cards_count: 0  // Default
  };

  // Validate required fields
  if (!formData.topic || !formData.time_spent_minutes || !formData.understanding_level) {
    quickSessionStatus.innerHTML = '<div class="upload-status error">Please fill in all required fields (Topic, Time, Understanding).</div>';
    return;
  }

  quickSessionStatus.innerHTML = '<div class="upload-status" style="background: var(--accent-light); color: var(--accent);">Saving session...</div>';

  try {
    const res = await fetch('/api/quick_session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const result = await res.json();

    if (result.ok) {
      quickSessionStatus.innerHTML = '<div class="upload-status success">[OK] Session saved successfully!</div>';
      resetQuickForm();
      loadStats(); // Refresh the dashboard
    } else {
      quickSessionStatus.innerHTML = `<div class="upload-status error">[ERROR] ${result.message}</div>`;
    }
  } catch (error) {
    quickSessionStatus.innerHTML = `<div class="upload-status error">[ERROR] Network error: ${error.message}</div>`;
  }
});

function resetQuickForm() {
  quickSessionForm.reset();
  // Set some reasonable defaults
  document.getElementById('study_mode').value = 'Core';
  document.getElementById('retention_confidence').value = '3';
  document.getElementById('system_performance').value = '3';
}

// Tutor tab handling (prototype calling stub API)
let activeTutorSessionId = null;

let tutorDocsCache = [];
let tutorSelectedDocIds = new Set();
let tutorSearchDebounceTimer = null;

function getTutorAllowedKindsFromUI() {
  const kinds = [];
  if (tutorKindNote && tutorKindNote.checked) kinds.push('note');
  if (tutorKindTextbook && tutorKindTextbook.checked) kinds.push('textbook');
  if (tutorKindTranscript && tutorKindTranscript.checked) kinds.push('transcript');
  if (tutorKindSlide && tutorKindSlide.checked) kinds.push('slide');
  if (tutorKindOther && tutorKindOther.checked) kinds.push('other');
  if (tutorKindPowerpoint && tutorKindPowerpoint.checked) kinds.push('powerpoint');
  if (tutorKindPdf && tutorKindPdf.checked) kinds.push('pdf');
  if (tutorKindTxt && tutorKindTxt.checked) kinds.push('txt');
  if (tutorKindMp4 && tutorKindMp4.checked) kinds.push('mp4');
  if (tutorKindYoutube && tutorKindYoutube.checked) kinds.push('youtube');
  if (kinds.length === 0) {
    return ['note', 'textbook', 'transcript', 'slide', 'other', 'powerpoint', 'pdf', 'txt', 'mp4', 'youtube'];
  }
  return kinds;
}

function setTutorUploadStatus(html) {
  if (!tutorUploadStatusBox) return;
  tutorUploadStatusBox.innerHTML = html;
}

function setTutorStudyStatus(html) {
  if (!tutorStudyStatusBox) return;
  tutorStudyStatusBox.innerHTML = html;
}

// Store the current study RAG root path globally
let currentStudyRagRoot = '';

function renderTutorStudyFolders(folders, root) {
  if (!tutorStudyFoldersBox) return;
  currentStudyRagRoot = root || '';

  // Update the path display in the UI
  const pathDisplay = document.getElementById('study-rag-path-display');
  if (pathDisplay && root) {
    pathDisplay.textContent = root.replace(/\\/g, '/');
  }

  if (!folders || folders.length === 0) {
    const pathHint = root ? root.replace(/\\/g, '/') : 'brain/data/study_rag';
    tutorStudyFoldersBox.innerHTML = `<div style="color: var(--text-muted); font-size: 13px;">No Study files ingested yet. Drop files into <span style="font-family: monospace;">${pathHint}</span> and click Sync.</div>`;
    return;
  }

  const header = root ? `<div style="color: var(--text-muted); font-size: 12px; margin-bottom: 8px;">Root: <span style="font-family: monospace;">${root.replace(/\\/g, '/')}</span></div>` : '';
  tutorStudyFoldersBox.innerHTML = header + folders.map((f) => {
    const checked = f.enabled ? 'checked' : '';
    const label = f.folder_path ? f.folder_path : '(root)';
    return `
      <label style="display:block; padding: 8px 6px; border-bottom: 1px solid var(--border); cursor: pointer;">
        <input type="checkbox" class="tutor-study-folder-checkbox" data-folder-path="${label === '(root)' ? '' : f.folder_path}" ${checked} style="margin-right: 8px;" />
        <span style="font-weight: 600;">${label}</span>
        <span style="color: var(--text-muted);"> â€¢ ${f.doc_count} docs</span>
      </label>
    `;
  }).join('');

  const checkboxes = tutorStudyFoldersBox.querySelectorAll('.tutor-study-folder-checkbox');
  checkboxes.forEach((cb) => {
    cb.addEventListener('change', async (e) => {
      const folderPath = e.target.getAttribute('data-folder-path') || '';
      const enabled = !!e.target.checked;
      await setTutorStudyFolderEnabled(folderPath, enabled);
      await loadTutorStudyFolders();
    });
  });
}

async function loadTutorStudyFolders() {
  if (!tutorStudyFoldersBox) return;
  tutorStudyFoldersBox.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Loading Study folders...</div>';
  try {
    const res = await fetch('/api/tutor/study/folders');
    const data = await res.json();
    if (!data.ok) {
      tutorStudyFoldersBox.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Failed to load Study folders.</div>';
      return;
    }
    renderTutorStudyFolders(data.folders || [], data.root || '');
  } catch (e) {
    tutorStudyFoldersBox.innerHTML = `<div style="color: var(--text-muted); font-size: 13px;">Failed to load Study folders: ${e.message}</div>`;
  }
}

async function syncTutorStudyFolder() {
  setTutorStudyStatus('<div class="upload-status" style="background: var(--accent-light); color: var(--accent);">Syncing Study folder...</div>');
  try {
    const res = await fetch('/api/tutor/study/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const data = await res.json();
    if (!data.ok) {
      setTutorStudyStatus(`<div class="upload-status error">[ERROR] ${data.message || 'Study sync failed.'}</div>`);
      return;
    }
    const errors = (data.errors || []).length ? `<div style="margin-top:6px; font-size:12px; color: var(--text-muted);">Errors: ${data.errors.length}</div>` : '';
    setTutorStudyStatus(`<div class="upload-status success">[OK] ${data.message}</div>${errors}`);
    await loadTutorStudyFolders();
  } catch (e) {
    setTutorStudyStatus(`<div class="upload-status error">[ERROR] ${e.message}</div>`);
  }
}

async function setTutorStudyFolderEnabled(folderPath, enabled) {
  try {
    await fetch('/api/tutor/study/folders/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_path: folderPath, enabled })
    });
  } catch (e) {
    // Best-effort
  }
}

function renderTutorRuntimeItems(items) {
  if (!tutorRuntimeItemsBox) return;
  if (!items || items.length === 0) {
    tutorRuntimeItemsBox.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No Runtime items found.</div>';
    return;
  }

  let lastGroup = null;
  tutorRuntimeItemsBox.innerHTML = items.map((it) => {
    const checked = it.enabled ? 'checked' : '';
    const group = it.group || 'Runtime';
    const groupHeader = group !== lastGroup ? `<div style="margin-top:${lastGroup ? '10px' : '0'}; font-size: 12px; font-weight: 700; color: var(--text-muted);">${group}</div>` : '';
    lastGroup = group;
    const desc = it.description ? `<div style="margin-left: 26px; font-size: 12px; color: var(--text-muted);">${it.description}</div>` : '';
    return `
      ${groupHeader}
      <label style="display:block; padding: 6px 0; cursor: pointer;">
        <input type="checkbox" class="tutor-runtime-item-checkbox" data-item-id="${it.id}" ${checked} style="margin-right: 8px;" />
        <span style="font-weight: 600;">${it.key}</span>
        ${desc}
      </label>
    `;
  }).join('');

  const checkboxes = tutorRuntimeItemsBox.querySelectorAll('.tutor-runtime-item-checkbox');
  checkboxes.forEach((cb) => {
    cb.addEventListener('change', async (e) => {
      const id = parseInt(e.target.getAttribute('data-item-id'));
      if (!Number.isFinite(id)) return;
      const enabled = !!e.target.checked;
      await setTutorRuntimeItemEnabled(id, enabled);
    });
  });
}

async function loadTutorRuntimeItems() {
  if (!tutorRuntimeItemsBox) return;
  tutorRuntimeItemsBox.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Loading Runtime items...</div>';
  try {
    const res = await fetch('/api/tutor/runtime/items');
    const data = await res.json();
    if (!data.ok) {
      tutorRuntimeItemsBox.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Failed to load Runtime items.</div>';
      return;
    }
    renderTutorRuntimeItems(data.items || []);
  } catch (e) {
    tutorRuntimeItemsBox.innerHTML = `<div style="color: var(--text-muted); font-size: 13px;">Failed to load Runtime items: ${e.message}</div>`;
  }
}

async function setTutorRuntimeItemEnabled(id, enabled) {
  try {
    await fetch('/api/tutor/runtime/items/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled })
    });
  } catch (e) {
    // Best-effort
  }
}

function renderTutorCitations(citations, messageId) {
  // If messageId is provided, update citations in that specific message
  if (messageId) {
    const citationsContainer = document.getElementById(`citations-${messageId}`);
    if (citationsContainer) {
      if (!citations || citations.length === 0) {
        citationsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 12px;">No citations available.</div>';
      } else {
        const lines = citations.map((c) => {
          const header = `[${c.doc_id}] (${c.doc_type}) ${c.source_path}`;
          const snippet = (c.snippet || '').trim();
          return snippet ? `<div style="margin-bottom: 8px;"><strong>${header}</strong><br><span style="color: var(--text-secondary);">${snippet}</span></div>` : `<div style="margin-bottom: 8px;">${header}</div>`;
        });
        citationsContainer.innerHTML = lines.join('');
      }
    }
    return;
  }

  // Legacy: update hidden citations box for backward compatibility
  if (!tutorCitationsBox) return;
  if (!citations || citations.length === 0) {
    tutorCitationsBox.textContent = 'No citations.';
    return;
  }
  const lines = citations.map((c) => {
    const header = `[${c.doc_id}] (${c.doc_type}) ${c.source_path}`;
    const snippet = (c.snippet || '').trim();
    return snippet ? `${header}\n  ${snippet}` : header;
  });
  tutorCitationsBox.textContent = lines.join('\n\n');
}

function renderTutorDocsList(docs) {
  if (!tutorDocsList) return;
  if (!docs || docs.length === 0) {
    tutorDocsList.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No RAG docs found.</div>';
    return;
  }

  tutorDocsList.innerHTML = docs.map((d) => {
    const checked = tutorSelectedDocIds.has(d.id) ? 'checked' : '';
    const tags = (d.topic_tags || '').trim();
    const tagText = tags ? ` â€¢ ${tags}` : '';
    const path = (d.source_path || '').replace(/\\/g, '/');
    return `
      <label style="display: block; padding: 8px 6px; border-bottom: 1px solid var(--border); cursor: pointer;">
        <input type="checkbox" class="tutor-doc-checkbox" data-doc-id="${d.id}" ${checked} style="margin-right: 8px;" />
        <span style="font-weight: 600;">#${d.id}</span>
        <span style="color: var(--text-muted);">(${d.doc_type})</span>
        <span style="color: var(--text-secondary);">${path}</span>
        <span style="color: var(--text-muted);">${tagText}</span>
      </label>
    `;
  }).join('');

  const checkboxes = tutorDocsList.querySelectorAll('.tutor-doc-checkbox');
  checkboxes.forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const id = parseInt(e.target.getAttribute('data-doc-id'));
      if (!Number.isFinite(id)) return;
      if (e.target.checked) tutorSelectedDocIds.add(id);
      else tutorSelectedDocIds.delete(id);
    });
  });
}

async function loadTutorRagDocs() {
  if (!tutorDocsList) return;
  tutorDocsList.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Loading RAG docs...</div>';

  const search = (tutorDocSearch && tutorDocSearch.value || '').trim();
  const docType = (tutorDocTypeFilter && tutorDocTypeFilter.value || '').trim();
  const params = new URLSearchParams();
  params.set('limit', '200');
  if (search) params.set('search', search);
  if (docType) params.set('doc_type', docType);

  try {
    const res = await fetch(`/api/tutor/rag-docs?${params.toString()}`);
    const data = await res.json();
    if (!data.ok) {
      tutorDocsList.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Failed to load RAG docs.</div>';
      return;
    }
    tutorDocsCache = data.docs || [];
    renderTutorDocsList(tutorDocsCache);
  } catch (e) {
    tutorDocsList.innerHTML = `<div style="color: var(--text-muted); font-size: 13px;">Failed to load RAG docs: ${e.message}</div>`;
  }
}

async function uploadTutorProjectFile() {
  if (!tutorProjectFile || !tutorProjectFile.files || tutorProjectFile.files.length === 0) {
    setTutorUploadStatus('<div class="upload-status error">Choose a file first.</div>');
    return;
  }
  const file = tutorProjectFile.files[0];
  const docType = (tutorProjectDocType && tutorProjectDocType.value) ? tutorProjectDocType.value : 'other';
  const tags = (tutorProjectTags && tutorProjectTags.value || '').trim();

  setTutorUploadStatus('<div class="upload-status" style="background: var(--accent-light); color: var(--accent);">Uploading + ingesting...</div>');
  const form = new FormData();
  form.append('file', file);
  form.append('doc_type', docType);
  if (tags) form.append('tags', tags);

  try {
    const res = await fetch('/api/tutor/project-files/upload', { method: 'POST', body: form });
    const data = await res.json();
    if (!data.ok) {
      setTutorUploadStatus(`<div class="upload-status error">[ERROR] ${data.message || 'Upload failed.'}</div>`);
      return;
    }
    setTutorUploadStatus(`<div class="upload-status success">[OK] ${data.message}</div>`);
    if (data.doc_id) tutorSelectedDocIds.add(parseInt(data.doc_id));
    await loadTutorRagDocs();
  } catch (e) {
    setTutorUploadStatus(`<div class="upload-status error">[ERROR] ${e.message}</div>`);
  }
}

async function addTutorLink() {
  if (!tutorLinkUrl) return;
  const url = (tutorLinkUrl.value || '').trim();
  if (!url) {
    setTutorUploadStatus('<div class="upload-status error">Enter a URL first.</div>');
    return;
  }
  const docType = (tutorLinkDocType && tutorLinkDocType.value) ? tutorLinkDocType.value : 'youtube';
  const tags = (tutorProjectTags && tutorProjectTags.value || '').trim();

  setTutorUploadStatus('<div class="upload-status" style="background: var(--accent-light); color: var(--accent);">Adding link...</div>');
  try {
    const res = await fetch('/api/tutor/links/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, doc_type: docType, tags })
    });
    const data = await res.json();
    if (!data.ok) {
      setTutorUploadStatus(`<div class="upload-status error">[ERROR] ${data.message || 'Add link failed.'}</div>`);
      return;
    }
    setTutorUploadStatus(`<div class="upload-status success">[OK] ${data.message}</div>`);
    if (data.doc_id) tutorSelectedDocIds.add(parseInt(data.doc_id));
    await loadTutorRagDocs();
  } catch (e) {
    setTutorUploadStatus(`<div class="upload-status error">[ERROR] ${e.message}</div>`);
  }
}

function loadTutor() {
  // Idempotent-ish init: only binds listeners once.
  if (loadTutor._initialized) {
    loadStudyRagConfig();
    loadTutorStudyFolders();
    loadTutorRuntimeItems();
    return;
  }
  loadTutor._initialized = true;

  if (btnTutorStudySync) btnTutorStudySync.addEventListener('click', () => syncTutorStudyFolder());
  if (btnTutorStudyRefresh) btnTutorStudyRefresh.addEventListener('click', () => loadTutorStudyFolders());
  if (btnTutorRuntimeRefresh) btnTutorRuntimeRefresh.addEventListener('click', () => loadTutorRuntimeItems());
  if (btnTutorAddLink) btnTutorAddLink.addEventListener('click', () => addTutorLink());

  if (btnTutorNewSession) btnTutorNewSession.addEventListener('click', () => {
    activeTutorSessionId = null;
    clearChatMessages();
    if (tutorAnswerBox) tutorAnswerBox.textContent = 'New session started. Ask a question when ready.';
    renderTutorCitations([]);
  });

  loadStudyRagConfig();
  setupStudyRagPathControls();
  loadTutorStudyFolders();
  loadTutorRuntimeItems();
}

// Fetch and display the Study RAG path configuration
async function loadStudyRagConfig() {
  try {
    const res = await fetch('/api/tutor/study/config');
    const data = await res.json();
    if (data.ok && data.root) {
      currentStudyRagRoot = data.root;
      const pathDisplay = document.getElementById('study-rag-path-display');
      const pathInput = document.getElementById('study-rag-path-input');
      const normalizedPath = data.root.replace(/\\\\/g, '/').replace(/\\/g, '/');

      if (pathDisplay) {
        pathDisplay.textContent = normalizedPath;
        if (!data.exists) {
          pathDisplay.style.color = 'var(--warning)';
          pathDisplay.title = 'Folder does not exist';
        } else {
          pathDisplay.style.color = 'var(--text-primary)';
          pathDisplay.title = '';
        }
      }

      // Also populate the input field
      if (pathInput) {
        pathInput.value = data.root;
      }
    }
  } catch (e) {
    console.error('Failed to load Study RAG config:', e);
  }
}

// Save Study RAG path
async function saveStudyRagPath(newPath) {
  const statusEl = document.getElementById('study-rag-path-status');
  if (statusEl) statusEl.textContent = 'Saving...';

  try {
    const res = await fetch('/api/tutor/study/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: newPath })
    });
    const data = await res.json();

    if (data.ok) {
      if (statusEl) {
        statusEl.textContent = '<i class="fas fa-check"></i> Saved!';
        statusEl.style.color = 'var(--success)';
      }
      // Reload the config to update display
      await loadStudyRagConfig();
      // Refresh folders list
      loadTutorStudyFolders();
    } else {
      if (statusEl) {
        statusEl.textContent = 'âœ— ' + (data.message || 'Failed to save');
        statusEl.style.color = 'var(--danger)';
      }
    }
  } catch (e) {
    console.error('Failed to save Study RAG path:', e);
    if (statusEl) {
      statusEl.textContent = 'âœ— Error saving path';
      statusEl.style.color = 'var(--danger)';
    }
  }
}

// Setup Study RAG path controls
function setupStudyRagPathControls() {
  const saveBtn = document.getElementById('btn-save-study-path');
  const pathInput = document.getElementById('study-rag-path-input');
  const folderPicker = document.getElementById('study-rag-folder-picker');

  if (saveBtn && pathInput) {
    saveBtn.addEventListener('click', () => {
      const path = pathInput.value.trim();
      if (path) {
        saveStudyRagPath(path);
      } else {
        const statusEl = document.getElementById('study-rag-path-status');
        if (statusEl) {
          statusEl.textContent = 'Please enter a path';
          statusEl.style.color = 'var(--warning)';
        }
      }
    });
  }

  // Handle folder picker (browser file dialog)
  if (folderPicker && pathInput) {
    folderPicker.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        // Get the common parent folder from selected files
        const firstFile = e.target.files[0];
        // webkitRelativePath gives us the folder structure
        const relativePath = firstFile.webkitRelativePath;
        if (relativePath) {
          // Extract the root folder name
          const rootFolder = relativePath.split('/')[0];
          // Unfortunately, we can't get the full path from the browser for security reasons
          // So we'll show a message and ask user to paste the path
          const statusEl = document.getElementById('study-rag-path-status');
          if (statusEl) {
            statusEl.innerHTML = `Selected folder: <strong>${rootFolder}</strong><br>Please paste the full path above (browsers don't allow reading full paths for security).`;
            statusEl.style.color = 'var(--info)';
          }
        }
      }
    });
  }
}

// ===== Chat UI Helper Functions =====
let tutorMessageCounter = 0;

function getChatContainer() {
  return document.getElementById('tutor-chat-messages');
}

function scrollChatToBottom() {
  const container = getChatContainer();
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

function addChatMessage(sender, text, options = {}) {
  const container = getChatContainer();
  if (!container) return null;

  const messageId = `msg-${++tutorMessageCounter}`;
  const isUser = sender === 'user';
  const senderLabel = isUser ? 'You' : 'Tutor';
  const senderColor = isUser ? 'var(--success)' : 'var(--primary)';
  const bubbleBg = isUser ? 'var(--primary)' : 'var(--surface-2)';
  const bubbleColor = isUser ? '#fff' : 'var(--text-primary)';
  const bubbleRadius = isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px';
  const align = isUser ? 'flex-end' : 'flex-start';

  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${sender}`;
  messageDiv.id = messageId;
  messageDiv.style.cssText = `align-self: ${align}; max-width: 85%;`;

  let citationsHtml = '';
  if (!isUser && options.showCitationsToggle) {
    citationsHtml = `
      <div style="margin-top: 8px;">
        <button type="button" class="btn-citation-toggle" onclick="toggleCitations('${messageId}')" style="
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-secondary);
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          cursor: pointer;
          transition: var(--transition);
        ">Show Citations</button>
        <div id="citations-${messageId}" class="citations-content" style="
          display: none;
          margin-top: 8px;
          padding: 10px;
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 12px;
          color: var(--text-secondary);
          max-height: 200px;
          overflow-y: auto;
        ">Loading citations...</div>
      </div>
    `;
  }

  // Handle unverified banner
  let displayText = text;
  let unverifiedBadge = '';
  if (options.unverified) {
    unverifiedBadge = `<span style="
      display: inline-block;
      background: var(--warning);
      color: #000;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      margin-bottom: 6px;
    ">UNVERIFIED</span><br>`;
  }

  messageDiv.innerHTML = `
    <div class="chat-sender" style="font-size: 11px; font-weight: 600; color: ${senderColor}; margin-bottom: 4px; text-align: ${isUser ? 'right' : 'left'};">${senderLabel}</div>
    <div class="chat-bubble" style="
      background: ${bubbleBg};
      color: ${bubbleColor};
      padding: 12px 16px;
      border-radius: ${bubbleRadius};
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
    ">${unverifiedBadge}${escapeHtml(displayText)}</div>
    ${citationsHtml}
  `;

  container.appendChild(messageDiv);
  scrollChatToBottom();

  return messageId;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateChatMessage(messageId, newText) {
  const messageEl = document.getElementById(messageId);
  if (messageEl) {
    const bubble = messageEl.querySelector('.chat-bubble');
    if (bubble) {
      bubble.innerHTML = escapeHtml(newText);
    }
  }
}

function toggleCitations(messageId) {
  const citationsEl = document.getElementById(`citations-${messageId}`);
  const msgEl = document.getElementById(messageId);
  if (citationsEl && msgEl) {
    const btn = msgEl.querySelector('.btn-citation-toggle');
    if (citationsEl.style.display === 'none') {
      citationsEl.style.display = 'block';
      if (btn) btn.textContent = 'Hide Citations';
    } else {
      citationsEl.style.display = 'none';
      if (btn) btn.textContent = 'Show Citations';
    }
  }
}

function clearChatMessages() {
  const container = getChatContainer();
  if (container) {
    container.innerHTML = `
      <div class="chat-message tutor" style="align-self: flex-start; max-width: 85%;">
        <div class="chat-sender" style="font-size: 11px; font-weight: 600; color: var(--primary); margin-bottom: 4px;">Tutor</div>
        <div class="chat-bubble" style="
          background: var(--surface-2);
          color: var(--text-primary);
          padding: 12px 16px;
          border-radius: 16px 16px 16px 4px;
          font-size: 14px;
          line-height: 1.5;
        ">New session started! Ask me anything.</div>
      </div>
    `;
  }
}

if (btnTutorSend && tutorQuestion) {
  // Send tutor question logic - extracted for reuse
  async function sendTutorQuestion() {
    const question = (tutorQuestion.value || '').trim();
    if (!question) {
      return;
    }

    // Add user message to chat
    addChatMessage('user', question);
    tutorQuestion.value = '';

    // Add thinking message
    const thinkingId = addChatMessage('tutor', 'Thinking...', { showCitationsToggle: false });

    try {
      if (!activeTutorSessionId) {
        const startRes = await fetch('/api/tutor/session/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const startData = await startRes.json();
        if (!startData.ok) {
          updateChatMessage(thinkingId, '[ERROR] Failed to start Tutor session.');
          return;
        }
        activeTutorSessionId = startData.session_id;
      }

      const turnPayload = {
        user_id: 'local',
        session_id: activeTutorSessionId,
        course_id: null,
        topic_id: null,
        mode: (tutorModeSelect && tutorModeSelect.value) ? tutorModeSelect.value : 'Core',
        question,
        plan_snapshot_json: '{}',
        sources: {
          allowed_doc_ids: Array.from(tutorSelectedDocIds.values()),
          allowed_kinds: getTutorAllowedKindsFromUI(),
          disallowed_doc_ids: []
        },
        notes_context_ids: []
      };

      const res = await fetch('/api/tutor/session/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(turnPayload)
      });
      const data = await res.json();
      if (!data.ok) {
        updateChatMessage(thinkingId, `[ERROR] ${data.message || 'Tutor call failed.'}`);
        return;
      }
      activeTutorSessionId = data.session_id;

      // Remove thinking message and add real response with citations toggle
      const thinkingEl = document.getElementById(thinkingId);
      if (thinkingEl) thinkingEl.remove();

      const responseId = addChatMessage('tutor', data.answer || '', {
        showCitationsToggle: true,
        unverified: data.unverified
      });

      // Render citations into the collapsible section
      renderTutorCitations(data.citations || [], responseId);

      // Also update legacy elements for compatibility
      if (tutorAnswerBox) {
        const unverifiedBanner = data.unverified ? '[UNVERIFIED]\n\n' : '';
        tutorAnswerBox.textContent = unverifiedBanner + (data.answer || '');
      }
      renderTutorCitations(data.citations || []);

    } catch (error) {
      updateChatMessage(thinkingId, `Failed to contact Tutor: ${error.message}`);
    }
  }

  // Send on button click
  btnTutorSend.addEventListener('click', sendTutorQuestion);

  // Send on Enter key (Shift+Enter allows newlines)
  tutorQuestion.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTutorQuestion();
    }
  });
}

// Syllabus intake form handling
if (syllabusForm) syllabusForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (syllabusStatus) {
    syllabusStatus.innerHTML = '<div class="upload-status" style="background: var(--accent-light); color: var(--accent);">Saving...</div>';
  }

  const payload = {
    name: document.getElementById('course_name').value,
    code: document.getElementById('course_code').value,
    term: document.getElementById('course_term').value,
    instructor: document.getElementById('course_instructor').value,
    default_study_mode: document.getElementById('course_mode').value,
    time_budget_per_week_minutes: parseInt(document.getElementById('course_time_budget').value || '0'),
    event_title: document.getElementById('event_title').value,
    event_type: document.getElementById('event_type').value,
    event_date: document.getElementById('event_date').value || null,
    event_due_date: document.getElementById('event_due_date').value || null,
    event_weight: parseFloat(document.getElementById('event_weight').value || '0'),
    event_raw_text: document.getElementById('event_raw_text').value
  };

  if (!payload.name || !payload.event_title) {
    if (syllabusStatus) {
      syllabusStatus.innerHTML = '<div class="upload-status error">Course name and event title are required.</div>';
    }
    return;
  }

  try {
    const res = await fetch('/api/syllabus/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.ok) {
      if (syllabusStatus) {
        syllabusStatus.innerHTML = `<div class="upload-status error">[ERROR] ${data.message || 'Syllabus save failed.'}</div>`;
      }
      return;
    }
    if (syllabusStatus) {
      syllabusStatus.innerHTML = `<div class="upload-status success">[OK] ${data.message}</div>`;
    }
  } catch (error) {
    if (syllabusStatus) {
      syllabusStatus.innerHTML = `<div class="upload-status error">[ERROR] ${error.message}</div>`;
    }
  }
});

// Syllabus JSON import (ChatGPT helper)
if (btnSyllabusJsonImport && syllabusJsonInput && syllabusJsonStatus) btnSyllabusJsonImport.addEventListener('click', async () => {
  const raw = (syllabusJsonInput.value || '').trim();
  if (!raw) {
    syllabusJsonStatus.innerHTML = '<div class="upload-status error">Paste JSON from ChatGPT first.</div>';
    return;
  }
  let jsonData = null;
  try {
    jsonData = JSON.parse(raw);
  } catch (e) {
    syllabusJsonStatus.innerHTML = '<div class="upload-status error">Invalid JSON: ' + e.message + '</div>';
    return;
  }

  syllabusJsonStatus.innerHTML = '<div class="upload-status" style="background: var(--accent-light); color: var(--accent);">Importing...</div>';

  try {
    const res = await fetch('/api/syllabus/import_bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonData)
    });
    const data = await res.json();
    if (!data.ok) {
      syllabusJsonStatus.innerHTML = `<div class="upload-status error">[ERROR] ${data.message || 'Bulk syllabus import failed.'}</div>`;
      return;
    }
    syllabusJsonStatus.innerHTML = `<div class="upload-status success">[OK] ${data.message}</div>`;
  } catch (error) {
    syllabusJsonStatus.innerHTML = `<div class="upload-status error">[ERROR] ${error.message}</div>`;
  }
});

// Copy syllabus prompt to clipboard
if (btnSyllabusPromptCopy && syllabusPromptTemplate) btnSyllabusPromptCopy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(syllabusPromptTemplate.value);
    btnSyllabusPromptCopy.textContent = 'Copied!';
    setTimeout(() => {
      btnSyllabusPromptCopy.textContent = 'Copy Prompt';
    }, 1500);
  } catch (error) {
    alert('Copy failed. Please select and copy the text manually.');
  }
});

// Scholar data loading
async function loadScholar() {
  try {
    const res = await fetch('/api/scholar');
    const data = await res.json();
    renderScholar(data);
    if (typeof loadRalphSummary === 'function') {
      loadRalphSummary();
    }
    if (typeof loadProposalSheet === 'function') {
      loadProposalSheet();
    }
    // Also load saved digests
    if (typeof loadSavedDigests === 'function') {
      loadSavedDigests();
    }
  } catch (error) {
    console.error('Failed to load Scholar data:', error);
  }
}

function renderScholar(data) {
  // Status
  document.getElementById('scholar-status').textContent = data.status || 'unknown';
  const safeModeEl = document.getElementById('scholar-safe-mode');
  safeModeEl.textContent = data.safe_mode ? 'True (patch drafts allowed)' : 'False (no patch drafts)';
  safeModeEl.setAttribute('data-safe-mode', data.safe_mode ? 'true' : 'false');
  const multiAgentEl = document.getElementById('scholar-multi-agent');
  if (multiAgentEl) {
    const enabled = !!data.multi_agent_enabled;
    const conc = data.multi_agent_max_concurrency || 4;
    multiAgentEl.textContent = enabled
      ? `True (max ${conc})`
      : 'False (single agent)';
    multiAgentEl.setAttribute('data-multi-agent', enabled ? 'true' : 'false');
  }
  const multiAgentSelect = document.getElementById('scholar-multi-agent-max');
  if (multiAgentSelect) {
    multiAgentSelect.value = String(data.multi_agent_max_concurrency || 4);
  }
  document.getElementById('scholar-last-updated').textContent = data.last_updated || 'Never';

  // Proposals section
  const proposalsContainer = document.getElementById('scholar-proposals-list');
  const proposalsCount = document.getElementById('scholar-proposals-section-count');
  const proposals = data.proposals || [];

  if (proposalsCount) {
    proposalsCount.textContent = `(${proposals.length})`;
  }

  if (proposalsContainer) {
    if (proposals.length === 0) {
      proposalsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No proposals pending review.</div>';
    } else {
      proposalsContainer.innerHTML = proposals.map((p, i) => {
        const typeColor = p.type === 'change' ? '#a855f7' : p.type === 'experiment' ? '#06b6d4' : '#64748b';
        const typeLabel = p.type === 'change' ? 'ðŸ“ Change' : p.type === 'experiment' ? 'ðŸ§ª Experiment' : 'ðŸ“‹ Other';
        return `
          <div style="padding: 12px; border-bottom: 1px solid var(--border); ${i === proposals.length - 1 ? 'border-bottom: none;' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 12px;">
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: ${typeColor}20; color: ${typeColor}; font-weight: 500;">${typeLabel}</span>
                  <span style="font-size: 11px; color: var(--text-muted);">Status: ${p.status || 'draft'}</span>
                </div>
                <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${p.title}</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px; font-family: monospace;">${p.file}</div>
              </div>
              <button class="btn" style="font-size: 11px; padding: 4px 10px;" onclick="viewProposalFile('${p.file}')">View</button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Questions
  const questionsContainer = document.getElementById('scholar-questions');
  const questionsSectionCount = document.getElementById('scholar-questions-section-count');
  const questions = data.questions || [];
  currentScholarQuestions = questions;
  // Update Scholar tab section count
  if (questionsSectionCount) {
    questionsSectionCount.textContent = `(${questions.length})`;
  }
  // Also update overview count
  const overviewQuestionsCount = document.getElementById('scholar-questions-count');
  if (overviewQuestionsCount) {
    if (questions.length > 0) {
      overviewQuestionsCount.innerHTML = `<span style="color:#ef4444; font-weight:600;">${questions.length} question${questions.length !== 1 ? 's' : ''}</span>
        <span style="color:#64748b; font-size:0.8rem;"> need answers</span>`;
    } else {
      overviewQuestionsCount.innerHTML = '<span style="color:#64748b;">0 questions</span>';
    }
  }
  const saveAnswersBtn = document.getElementById('btn-save-answers');

  if (questions.length === 0) {
    questionsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No questions pending.</div>';
    saveAnswersBtn.style.display = 'none';
  } else {
    saveAnswersBtn.style.display = 'inline-block';
    questionsContainer.innerHTML = questions.map((q, i) => `
          <div class="scholar-question-card" style="padding: 16px; margin-bottom: 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px;">
            <!-- Question -->
            <div style="font-size: 14px; color: var(--text-primary); font-weight: 600; margin-bottom: 12px;">Q${i + 1}: ${q}</div>
            
            <!-- Chat Response Area -->
            <div id="chat-response-${i}" style="max-height: 250px; overflow-y: auto; margin-bottom: 12px; padding: 10px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; display: flex; flex-direction: column; gap: 8px; min-height: 60px;">
              <div style="color: var(--text-muted); font-size: 12px;">Ask a question to get an AI response with repo context...</div>
            </div>
            
            <!-- Chat Input -->
            <div style="display: flex; gap: 8px; align-items: flex-end;">
              <textarea 
                id="chat-input-${i}" 
                class="form-textarea" 
                rows="2" 
                placeholder="Ask about this question..."
                style="flex: 1; font-size: 13px; resize: vertical;"
                onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();askScholarQuestion(${i})}"
              ></textarea>
              <button 
                class="btn btn-primary" 
                style="padding: 8px 16px; height: fit-content;"
                onclick="askScholarQuestion(${i})" 
                id="btn-ask-${i}"
              >
                Ask
              </button>
            </div>
            
            <!-- Answer Section with per-question submit -->
            <div id="answer-section-${i}" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 12px; color: var(--text-muted); font-weight: 500;">ðŸ’¬ Your Answer:</span>
                <span id="answer-status-${i}" style="font-size: 11px; color: var(--text-muted);"></span>
              </div>
              <div style="display: flex; gap: 8px; align-items: flex-end;">
                <textarea 
                  id="answer-${i}" 
                  class="form-textarea" 
                  rows="2" 
                  placeholder="Type your answer here..."
                  style="flex: 1; font-size: 13px; resize: vertical;"
                  onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();submitSingleAnswer(${i})}"
                ></textarea>
                <button 
                  class="btn btn-success" 
                  style="padding: 8px 12px; height: fit-content; background: var(--success); color: white;"
                  onclick="submitSingleAnswer(${i})" 
                  id="btn-submit-answer-${i}"
                  title="Submit this answer"
                >
                  <i class="fas fa-check"></i> Submit
                </button>
              </div>
            </div>
          </div>
        `).join('');
  }

  // Answered Questions
  const answeredContainer = document.getElementById('scholar-answered-questions');
  const answeredSectionCount = document.getElementById('scholar-answered-section-count');
  const answeredQuestions = data.answered_questions || [];
  currentScholarAnsweredQuestions = answeredQuestions;

  if (answeredSectionCount) {
    answeredSectionCount.textContent = `(${answeredQuestions.length})`;
  }

  if (answeredContainer) {
    if (answeredQuestions.length === 0) {
      answeredContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No answered questions yet.</div>';
    } else {
      answeredContainer.innerHTML = answeredQuestions.map((item, i) => `
        <div style="padding: 12px; margin-bottom: 8px; background: rgba(63, 185, 80, 0.05); border: 1px solid rgba(63, 185, 80, 0.2); border-radius: 8px;">
          <div style="font-size: 13px; color: var(--text-primary); font-weight: 500; margin-bottom: 8px;">
            <span style="color: var(--success);"><i class="fas fa-check"></i></span> ${item.question}
          </div>
          <div style="font-size: 12px; color: var(--text-secondary); padding-left: 16px; border-left: 2px solid var(--success);">
            ${item.answer}
          </div>
        </div>
      `).join('');
    }
  }

  // Coverage
  const coverage = data.coverage || {};
  const completeCount = coverage.complete || 0;
  const progressCount = coverage.in_progress || 0;
  const notStartedCount = coverage.not_started || 0;

  document.getElementById('scholar-coverage-complete').textContent = completeCount;
  document.getElementById('scholar-coverage-progress').textContent = progressCount;
  document.getElementById('scholar-coverage-not-started').textContent = notStartedCount;

  const total = completeCount + progressCount + notStartedCount;
  const pct = total > 0 ? Math.round((completeCount / total) * 100) : 0;
  const progressPct = total > 0 ? Math.round((progressCount / total) * 100) : 0;
  document.getElementById('scholar-coverage-summary').textContent = `${pct}% complete â€¢ ${total} modules`;

  // Update progress bar
  const barComplete = document.getElementById('scholar-coverage-bar-complete');
  const barProgress = document.getElementById('scholar-coverage-bar-progress');
  if (barComplete) barComplete.style.width = `${pct}%`;
  if (barProgress) barProgress.style.width = `${progressPct}%`;

  // Coverage list
  const coverageList = document.getElementById('scholar-coverage-list');
  const items = coverage.items || [];
  if (items.length === 0) {
    coverageList.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No coverage data available. Run Scholar to scan modules.</div>';
  } else {
    coverageList.innerHTML = items.map(item => {
      let statusColor = 'var(--text-muted)';
      let statusIcon = 'â—‹';
      let bgColor = 'transparent';
      const statusLower = (item.status || '').toLowerCase();

      if (statusLower.includes('complete') || statusLower.includes('[x]')) {
        statusColor = 'var(--success)';
        statusIcon = '<i class="fas fa-check"></i>';
        bgColor = 'rgba(63, 185, 80, 0.1)';
      } else if (statusLower.includes('progress') || statusLower.includes('[/]')) {
        statusColor = 'var(--warning)';
        statusIcon = '<i class="fas fa-spinner fa-spin"></i>';
        bgColor = 'rgba(218, 165, 32, 0.1)';
      }
      return `
            <div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; margin-bottom: 4px; border-radius: 6px; background: ${bgColor};">
              <span style="color: ${statusColor}; font-size: 16px;">${statusIcon}</span>
              <div style="flex: 1;">
                <div style="font-size: 13px; color: var(--text-primary); font-weight: 500;">${item.module || ''}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${item.grouping || ''}</div>
              </div>
              <span style="font-size: 10px; color: ${statusColor}; text-transform: uppercase;">${statusLower.includes('complete') ? 'Done' : statusLower.includes('progress') ? 'WIP' : 'Pending'}</span>
            </div>
          `;
    }).join('');
  }

  // Next steps - now structured with action buttons
  const nextStepsContainer = document.getElementById('scholar-next-steps');
  const nextSteps = data.next_steps || [];
  if (nextSteps.length === 0) {
    nextStepsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No next steps defined. Run Scholar to generate tasks.</div>';
  } else {
    nextStepsContainer.innerHTML = nextSteps.map((step, idx) => {
      // Handle both old string format and new object format
      const stepText = typeof step === 'string' ? step : (step.text || '');
      const action = typeof step === 'object' ? step.action : null;
      const actionLabel = typeof step === 'object' ? step.action_label : null;

      let actionBtn = '';
      if (action === 'open_final') {
        actionBtn = '<button class="btn btn-primary" style="font-size: 11px; padding: 6px 12px;" type="button" onclick="openScholarLatestFinal()">ðŸ“„ Open Latest Run</button>';
      } else if (action === 'answer_questions') {
        actionBtn = '<button class="btn btn-primary" style="font-size: 11px; padding: 6px 12px;" type="button" onclick="document.getElementById(\'scholar-questions\').scrollIntoView({behavior:\'smooth\', block:\'start\'})">â“ Answer Questions</button>';
      } else if (action === 'start_run') {
        actionBtn = '<button class="btn btn-primary" style="font-size: 11px; padding: 6px 12px;" type="button" onclick="startScholarRun()">â–¶ Start Run</button>';
      } else if (action === 'review_proposals') {
        actionBtn = '<button class="btn btn-primary" style="font-size: 11px; padding: 6px 12px;" type="button" onclick="document.getElementById(\'scholar-proposals-list\').scrollIntoView({behavior:\'smooth\', block:\'start\'})">ðŸ“ Review Proposals</button>';
      } else {
        // Fallback for old string format
        const lower = stepText.toLowerCase();
        if (lower.includes('unattended_final') || lower.includes('open the latest')) {
          actionBtn = '<button class="btn" style="font-size: 11px; padding: 4px 8px;" type="button" onclick="openScholarLatestFinal()">Open</button>';
        } else if (lower.includes('questions_needed') || lower.includes('answer')) {
          actionBtn = '<button class="btn" style="font-size: 11px; padding: 4px 8px;" type="button" onclick="document.getElementById(\'scholar-questions\').scrollIntoView({behavior:\'smooth\', block:\'start\'})">Go</button>';
        }
      }

      // Number badge
      const numBadge = `<span style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: var(--primary); color: white; font-size: 12px; font-weight: 600; flex-shrink: 0;">${idx + 1}</span>`;

      return `
        <div style="padding: 12px 0; border-bottom: 1px solid var(--border); display: flex; gap: 12px; align-items: center;">
          ${numBadge}
          <div style="font-size: 13px; color: var(--text-primary); flex: 1;">${stepText.replace(/^\d+\)\s*/, '')}</div>
          ${actionBtn}
        </div>
      `;
    }).join('');
  }

  // Research Topics
  const researchContainer = document.getElementById('scholar-research-topics');
  if (researchContainer) {
    const topics = data.research_topics || [];
    if (topics.length === 0) {
      researchContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 12px;">No recent research. Run Scholar to discover topics.</div>';
    } else {
      researchContainer.innerHTML = topics.map(t => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid var(--border);">
          <span style="font-size: 12px;">ðŸ“– ${t.name}</span>
          <span style="font-size: 10px; color: var(--text-muted);">${t.days_ago}d ago</span>
        </div>
      `).join('');
    }
  }

  // Identified Gaps
  const gapsContainer = document.getElementById('scholar-gaps');
  if (gapsContainer) {
    const gaps = data.gaps || [];
    if (gaps.length === 0) {
      gapsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 12px;">No gaps identified. System looks healthy! ðŸŽ‰</div>';
    } else {
      gapsContainer.innerHTML = gaps.map(g => `
        <div style="padding: 4px 0; border-bottom: 1px solid var(--border);">
          <span style="font-size: 12px; color: var(--warning);">â€¢ ${g.text}</span>
        </div>
      `).join('');
    }
  }

  // Improvement Candidates
  const improvementsContainer = document.getElementById('scholar-improvements');
  if (improvementsContainer) {
    const improvements = data.improvements || [];
    if (improvements.length === 0) {
      improvementsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 12px;">No improvement candidates. Run Scholar to analyze modules.</div>';
    } else {
      improvementsContainer.innerHTML = improvements.map(imp => `
        <div style="display: flex; gap: 8px; padding: 4px 0; border-bottom: 1px solid var(--border);">
          <span style="font-size: 10px; padding: 2px 6px; background: rgba(136, 46, 224, 0.15); color: #a855f7; border-radius: 4px;">${imp.module}</span>
          <span style="font-size: 12px; flex: 1;">${imp.text}</span>
        </div>
      `).join('');
    }
  }

  // Latest run
  const latestRunContainer = document.getElementById('scholar-latest-run');
  if (data.latest_run && data.latest_run.content) {
    latestRunContainer.textContent = data.latest_run.content;
  } else {
    latestRunContainer.textContent = 'No recent run data available.';
  }
}

async function loadRalphSummary() {
  const contentEl = document.getElementById('ralph-summary-content');
  if (!contentEl) return;
  contentEl.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Loading Ralph summary...</div>';
  try {
    const res = await fetch('/api/scholar/ralph');
    const data = await res.json();
    renderRalphSummary(data);
  } catch (error) {
    renderRalphSummary({ ok: false, message: error.message || 'Failed to load Ralph summary.' });
  }
}

function renderRalphSummary(data) {
  const contentEl = document.getElementById('ralph-summary-content');
  const prdStatusEl = document.getElementById('ralph-prd-status');
  const prdNextEl = document.getElementById('ralph-prd-next');
  const progressMetaEl = document.getElementById('ralph-progress-meta');
  const latestStoryEl = document.getElementById('ralph-latest-story');
  const summaryMetaEl = document.getElementById('ralph-summary-meta');
  const summaryFileEl = document.getElementById('ralph-summary-file');

  if (!contentEl) return;

  if (!data || !data.ok) {
    const message = data && data.message ? data.message : 'Ralph data not available.';
    contentEl.innerHTML = `<div style="color: var(--text-muted); font-size: 13px;">${message}</div>`;
    if (prdStatusEl) prdStatusEl.textContent = '-';
    if (prdNextEl) prdNextEl.textContent = '-';
    if (progressMetaEl) progressMetaEl.textContent = '-';
    if (latestStoryEl) latestStoryEl.textContent = '-';
    if (summaryMetaEl) summaryMetaEl.textContent = '-';
    if (summaryFileEl) summaryFileEl.textContent = '-';
    return;
  }

  const prd = data.prd || {};
  if (prdStatusEl) {
    if (prd.total != null) {
      const passed = prd.passed != null ? prd.passed : 0;
      const failing = prd.failing != null ? prd.failing : (prd.total - passed);
      prdStatusEl.textContent = `${passed}/${prd.total} passed â€¢ ${failing} failing`;
    } else {
      prdStatusEl.textContent = 'No PRD data';
    }
  }
  if (prdNextEl) {
    prdNextEl.textContent = prd.next_failing ? `Next: ${prd.next_failing}` : 'All stories passed';
  }

  const progress = data.progress || {};
  if (progressMetaEl) {
    const parts = [];
    if (progress.started) parts.push(`Started ${progress.started}`);
    if (progress.entries != null) parts.push(`${progress.entries} entries`);
    progressMetaEl.textContent = parts.length ? parts.join(' â€¢ ') : 'No progress log';
  }
  if (latestStoryEl) {
    if (progress.latest_story) {
      let summaryText = progress.latest_story.id || 'Latest story';
      if (progress.latest_story.summary) {
        summaryText += ` â€” ${progress.latest_story.summary}`;
      }
      if (summaryText.length > 160) {
        summaryText = `${summaryText.slice(0, 157)}...`;
      }
      latestStoryEl.textContent = summaryText;
    } else {
      latestStoryEl.textContent = 'No story entries found';
    }
  }

  const latest = data.latest_summary || {};
  if (summaryMetaEl) {
    if (latest.generated) {
      summaryMetaEl.textContent = `Generated ${latest.generated}`;
    } else {
      summaryMetaEl.textContent = 'No run summary found';
    }
  }
  if (summaryFileEl) {
    const parts = [];
    if (latest.run_window) parts.push(latest.run_window);
    if (latest.file) parts.push(latest.file);
    summaryFileEl.textContent = parts.length ? parts.join(' â€¢ ') : '-';
  }

  if (latest.content) {
    contentEl.textContent = latest.content;
  } else {
    contentEl.textContent = 'No run summary content available.';
  }
}

async function loadProposalSheet() {
  const contentEl = document.getElementById('proposal-sheet-content');
  if (!contentEl) return;
  contentEl.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Loading proposal running sheet...</div>';
  try {
    const res = await fetch('/api/scholar/proposal-sheet');
    const data = await res.json();
    renderProposalSheet(data);
  } catch (error) {
    renderProposalSheet({ ok: false, message: error.message || 'Failed to load proposal running sheet.' });
  }
}

function renderProposalSheet(data) {
  const contentEl = document.getElementById('proposal-sheet-content');
  const metaEl = document.getElementById('proposal-sheet-meta');
  const totalEl = document.getElementById('proposal-sheet-total');
  const driftEl = document.getElementById('proposal-sheet-drift');
  const missingEl = document.getElementById('proposal-sheet-missing');
  const generatedEl = document.getElementById('proposal-sheet-generated');

  if (!contentEl) return;

  if (!data || !data.ok) {
    const message = data && data.message ? data.message : 'Proposal running sheet not available.';
    contentEl.innerHTML = `<div style="color: var(--text-muted); font-size: 13px;">${message}</div>`;
    if (metaEl) metaEl.textContent = message;
    if (totalEl) totalEl.textContent = '-';
    if (driftEl) driftEl.textContent = '-';
    if (missingEl) missingEl.textContent = '-';
    if (generatedEl) generatedEl.textContent = '-';
    return;
  }

  const counts = data.counts || {};
  if (totalEl) totalEl.textContent = counts.total != null ? counts.total : '-';
  if (driftEl) driftEl.textContent = counts.drift != null ? counts.drift : '-';
  if (missingEl) missingEl.textContent = counts.missing != null ? counts.missing : '-';
  if (generatedEl) generatedEl.textContent = data.generated || '-';
  if (metaEl) metaEl.textContent = data.path ? `File: ${data.path}` : '';
  contentEl.textContent = data.content || 'No running sheet content available.';
}

async function rebuildProposalSheet() {
  const metaEl = document.getElementById('proposal-sheet-meta');
  if (metaEl) metaEl.textContent = 'Running final check...';
  try {
    const res = await fetch('/api/scholar/proposal-sheet/rebuild', { method: 'POST' });
    const data = await res.json();
    renderProposalSheet(data);
    if (data && data.ok && metaEl && data.path) {
      metaEl.textContent = `File: ${data.path} â€¢ Final check complete`;
    }
  } catch (error) {
    renderProposalSheet({ ok: false, message: error.message || 'Failed to rebuild proposal running sheet.' });
  }
}

const btnRalphRefresh = document.getElementById('btn-ralph-refresh');
if (btnRalphRefresh) {
  btnRalphRefresh.addEventListener('click', () => {
    loadRalphSummary();
  });
}

const btnProposalSheetRefresh = document.getElementById('btn-proposal-sheet-refresh');
if (btnProposalSheetRefresh) {
  btnProposalSheetRefresh.addEventListener('click', () => {
    loadProposalSheet();
  });
}

const btnProposalSheetFinalCheck = document.getElementById('btn-proposal-sheet-final-check');
if (btnProposalSheetFinalCheck) {
  btnProposalSheetFinalCheck.addEventListener('click', () => {
    rebuildProposalSheet();
  });
}

// Scholar run handling
let currentRunId = null;
let runStatusInterval = null;
let lastRunLogSize = null;
let lastRunLogChangeAt = null;

const SCHOLAR_RUN_STORAGE_KEY = 'scholar_active_run_id';

function saveScholarRunId(runId) {
  if (runId) {
    sessionStorage.setItem(SCHOLAR_RUN_STORAGE_KEY, runId);
  } else {
    sessionStorage.removeItem(SCHOLAR_RUN_STORAGE_KEY);
  }
}

function restoreScholarRunId() {
  return sessionStorage.getItem(SCHOLAR_RUN_STORAGE_KEY);
}

function clearScholarRunState() {
  currentRunId = null;
  sessionStorage.removeItem(SCHOLAR_RUN_STORAGE_KEY);
  if (runStatusInterval) {
    clearInterval(runStatusInterval);
    runStatusInterval = null;
  }
}

const btnRunScholar = document.getElementById('btn-run-scholar');
const scholarRunStatus = document.getElementById('scholar-run-status');
const scholarRunLog = document.getElementById('scholar-run-log');
const scholarRunProgress = document.getElementById('scholar-run-progress');
const scholarRunMeta = document.getElementById('scholar-run-meta');
const scholarRunActions = document.getElementById('scholar-run-actions');
const btnScholarRefresh = document.getElementById('btn-scholar-refresh');
const btnScholarOpenFinal = document.getElementById('btn-scholar-open-final');
const btnScholarCancel = document.getElementById('btn-scholar-cancel');

function _fmtSeconds(secs) {
  if (secs == null || Number.isNaN(secs)) return 'unknown';
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}

function _setRunUiActive(isActive) {
  if (scholarRunProgress) scholarRunProgress.style.display = isActive ? 'block' : 'none';
  if (scholarRunMeta) scholarRunMeta.style.display = isActive ? 'block' : 'none';
  if (scholarRunActions) scholarRunActions.style.display = isActive ? 'flex' : 'none';
}

async function openScholarLatestFinal() {
  if (!scholarRunLog) return;
  scholarRunLog.style.display = 'block';
  scholarRunLog.textContent = 'Loading latest final...';
  try {
    const res = await fetch('/api/scholar/run/latest-final');
    const data = await res.json();
    if (!data.ok) {
      scholarRunLog.textContent = `No latest final available: ${data.message || 'unknown error'}`;
      return;
    }
    scholarRunLog.textContent = `FILE: ${data.file}\nMODIFIED: ${data.modified}\n\n${data.content}`;
  } catch (e) {
    scholarRunLog.textContent = `Failed to load latest final: ${e.message}`;
  }
}

async function cancelScholarRun() {
  if (!currentRunId) {
    alert('No active run_id to cancel.');
    return;
  }
  if (!confirm('Cancel this Scholar run?')) return;
  try {
    const res = await fetch(`/api/scholar/run/cancel/${currentRunId}`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      const msg = (data.message || '').toLowerCase();
      const alreadyStopped = msg.includes('no pid file') || msg.includes('already');
      scholarRunStatus.innerHTML = alreadyStopped
        ? `<span style="color: var(--warning);"><i class="fas fa-exclamation-triangle"></i> Run not running (nothing to cancel)</span>`
        : `<span style="color: var(--warning);"><i class="fas fa-exclamation-triangle"></i> Cancel requested</span>`;
      scholarRunLog.style.display = 'block';
      scholarRunLog.textContent = (scholarRunLog.textContent || '') + `\n\n[dashboard] ${data.message}`;
      setTimeout(() => checkRunStatus(currentRunId), 1000);
    } else {
      alert(data.message || 'Cancel failed');
    }
  } catch (e) {
    alert(`Cancel failed: ${e.message}`);
  }
}

if (btnScholarRefresh) btnScholarRefresh.addEventListener('click', async () => {
  if (currentRunId) await checkRunStatus(currentRunId);
  await loadScholar();
});
if (btnScholarOpenFinal) btnScholarOpenFinal.addEventListener('click', openScholarLatestFinal);
if (btnScholarCancel) btnScholarCancel.addEventListener('click', cancelScholarRun);

if (btnRunScholar && scholarRunStatus && scholarRunLog) btnRunScholar.addEventListener('click', async () => {
  // Check for unanswered questions first
  const questions = document.querySelectorAll('#scholar-questions textarea[id^="answer-"]');
  const unansweredCount = Array.from(questions).filter(ta => !ta.value.trim()).length;
  const totalQuestions = questions.length;

  if (totalQuestions > 0 && unansweredCount > 0) {
    if (!confirm(`${unansweredCount} question(s) unanswered. Start run anyway? (You can answer questions after the run starts)`)) {
      return;
    }
  }

  btnRunScholar.disabled = true;
  btnRunScholar.textContent = 'Starting...';
  scholarRunStatus.textContent = 'Starting Scholar run...';
  scholarRunLog.style.display = 'block';
  scholarRunLog.textContent = 'Initializing...';
  _setRunUiActive(true);
  if (scholarRunMeta) scholarRunMeta.textContent = '';
  lastRunLogSize = null;
  lastRunLogChangeAt = Date.now();

  try {
    const res = await fetch('/api/scholar/run', { method: 'POST' });
    const data = await res.json();

    if (data.ok) {
      currentRunId = data.run_id;
      saveScholarRunId(data.run_id);
      const methodNote = data.method === 'batch_script' ? ' (via batch script)' : '';
      let preservedNote = '';
      if (data.preserved_questions > 0) {
        preservedNote = `\n<i class="fas fa-check"></i> Preserved ${data.preserved_questions} unanswered question(s) from previous run`;
      }

      if (data.requires_manual_execution) {
        // Scholar requires manual execution via Cursor
        scholarRunStatus.innerHTML = `<span style="color: var(--warning);"><i class="fas fa-exclamation-triangle"></i> Manual execution required (ID: ${data.run_id})${preservedNote}</span>`;
        let instructionsMsg = `Scholar run queued. Manual execution via Cursor required.\n\n`;
        instructionsMsg += `HOW TO EXECUTE:\n`;
        if (data.instructions && data.instructions.steps) {
          instructionsMsg += data.instructions.steps.map((step, i) => `${i + 1}. ${step}`).join('\n');
        } else {
          instructionsMsg += `1. Open scholar/workflows/orchestrator_run_prompt.md in Cursor\n`;
          instructionsMsg += `2. Use Cursor AI chat to execute the orchestrator workflow\n`;
          instructionsMsg += `3. Or run: scripts\\run_scholar.bat (option 1)\n`;
        }
        if (data.preserved_questions > 0) {
          instructionsMsg += `\n\nNote: ${data.preserved_questions} unanswered question(s) will be preserved automatically.`;
        }
        instructionsMsg += `\n\nRun ID: ${data.run_id}\nLog: ${data.log_file}`;
        scholarRunLog.textContent = instructionsMsg;

        // Don't poll for status since it's manual execution
        // User will need to refresh dashboard after executing Scholar manually
        btnRunScholar.disabled = false;
        btnRunScholar.textContent = 'Execution Queued (Manual Required)';
        _setRunUiActive(false);

        // Show instructions more prominently
        setTimeout(() => {
          alert(`Scholar run queued!\n\nRun ID: ${data.run_id}\n\nTo execute:\n1. Open scholar/workflows/orchestrator_run_prompt.md in Cursor\n2. Use Cursor AI chat to execute it\n3. Refresh this dashboard after completion`);
        }, 500);
      } else {
        // Normal execution (codex available)
        scholarRunStatus.innerHTML = `<span style="color: var(--success);"><i class="fas fa-check"></i> Run started${methodNote} (ID: ${data.run_id})${preservedNote}</span>`;
        btnRunScholar.textContent = 'Running...';
        if (data.warning) {
          scholarRunLog.textContent = `WARNING: ${data.warning}\n\nLog file: ${data.log_file}\nFinal file: ${data.final_file}\n\nWaiting for output...`;
        } else {
          scholarRunLog.textContent = `Log file: ${data.log_file}\nFinal file: ${data.final_file}${preservedNote}\n\nWaiting for output...`;
        }

        // Start polling for status
        if (runStatusInterval) clearInterval(runStatusInterval);
        runStatusInterval = setInterval(() => checkRunStatus(currentRunId), 2000);
        checkRunStatus(currentRunId); // Immediate check

        // Reload questions if any were preserved
        if (data.preserved_questions > 0) {
          setTimeout(() => loadScholar(), 500);
        }
      }
    } else {
      scholarRunStatus.innerHTML = `<span style="color: var(--error);">âœ— Error: ${data.message}</span>`;
      let errorMsg = `Error: ${data.message}\n\n`;
      if (data.instructions && data.instructions.length > 0) {
        errorMsg += 'HOW TO RUN SCHOLAR:\n';
        errorMsg += data.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n');
      } else {
        errorMsg += 'SOLUTION:\n';
        errorMsg += '1. Use Cursor IDE to run Scholar (it has codex built-in)\n';
        errorMsg += '2. Or run manually: scripts\\run_scholar.bat\n';
        errorMsg += '3. Or use Cursor\'s AI chat to execute the orchestrator prompt\n';
      }
      if (data.preserved_questions > 0) {
        errorMsg += `\n\nNote: ${data.preserved_questions} unanswered question(s) were preserved and are still available.`;
      }
      scholarRunLog.textContent = errorMsg;
      btnRunScholar.disabled = false;
      btnRunScholar.textContent = 'Start Run';
      _setRunUiActive(false);
    }
  } catch (error) {
    scholarRunStatus.innerHTML = `<span style="color: var(--error);">âœ— Network error: ${error.message}</span>`;
    scholarRunLog.textContent = `Network error: ${error.message}`;
    btnRunScholar.disabled = false;
    btnRunScholar.textContent = 'Start Run';
    _setRunUiActive(false);
  }
});

async function checkRunStatus(runId) {
  try {
    const res = await fetch(`/api/scholar/run/status/${runId}`);
    const status = await res.json();

    _setRunUiActive(true);

    // Meta + stalled detection
    const kb = (status.log_size / 1024).toFixed(1);
    const since = status.seconds_since_log_update;
    const stalled = !!status.stalled;
    if (scholarRunMeta) {
      let meta = `Log: ${kb} KB`;
      if (since != null) meta += ` â€¢ Last output: ${_fmtSeconds(since)} ago`;
      if (status.pid) meta += ` â€¢ PID: ${status.pid}`;
      if (stalled) meta += ' â€¢ <i class="fas fa-exclamation-triangle"></i> No new output (may be stuck)';
      scholarRunMeta.textContent = meta;
    }

    if (typeof status.log_size === 'number') {
      if (lastRunLogSize === null || lastRunLogSize === undefined) {
        lastRunLogSize = status.log_size;
        lastRunLogChangeAt = Date.now();
      } else if (status.log_size !== lastRunLogSize) {
        lastRunLogSize = status.log_size;
        lastRunLogChangeAt = Date.now();
      }
    }

    if (status.log_tail) {
      scholarRunLog.textContent = status.log_tail;
      scholarRunLog.scrollTop = scholarRunLog.scrollHeight;
    }

    if (status.completed) {
      clearScholarRunState();
      btnRunScholar.disabled = false;
      btnRunScholar.textContent = 'Start Run';
      _setRunUiActive(false);

      if (status.final_summary) {
        scholarRunStatus.innerHTML = `<span style="color: var(--success);"><i class="fas fa-check"></i> Run completed successfully</span>`;
        scholarRunLog.textContent = 'RUN COMPLETED\n\n' + status.final_summary + '\n\n' + (status.log_tail || '');
      } else {
        scholarRunStatus.innerHTML = `<span style="color: var(--warning);"><i class="fas fa-exclamation-triangle"></i> Run completed (check logs)</span>`;
      }

      // Reload Scholar data and stats
      setTimeout(() => {
        loadScholar();
        loadStats();
      }, 1000);
    } else if (status.running) {
      btnRunScholar.textContent = 'Running...';
      scholarRunStatus.innerHTML = `<span style="color: var(--accent);"><i class="fas fa-spinner fa-spin"></i> Running... (${(status.log_size / 1024).toFixed(1)} KB logged)${status.stalled ? ' â€¢ <i class="fas fa-exclamation-triangle"></i> No new output' : ''}</span>`;
    } else {
      // Not running and not completed: likely exited unexpectedly or PID became stale.
      clearScholarRunState();
      btnRunScholar.disabled = false;
      btnRunScholar.textContent = 'Start Run';

      const staleNote = (status.pid_stale || status.pid) ? ' (process not detected â€” may have stopped)' : '';
      scholarRunStatus.innerHTML = `<span style="color: var(--warning);"><i class="fas fa-exclamation-triangle"></i> Run not running${staleNote}. Use Refresh/Open Final or start a new run.</span>`;
      // Keep actions visible so user can Open Latest Final / Refresh
      _setRunUiActive(true);
    }
  } catch (error) {
    console.error('Failed to check run status:', error);
  }
}

// Safe mode toggle
const btnToggleSafeMode = document.getElementById('btn-toggle-safe-mode');
if (btnToggleSafeMode) btnToggleSafeMode.addEventListener('click', async () => {
  const safeModeEl = document.getElementById('scholar-safe-mode');
  const currentMode = safeModeEl && safeModeEl.getAttribute('data-safe-mode') === 'true';
  const newMode = !currentMode;

  btnToggleSafeMode.disabled = true;
  btnToggleSafeMode.textContent = 'Updating...';

  try {
    const res = await fetch('/api/scholar/safe-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ safe_mode: newMode })
    });

    const data = await res.json();

    if (data.ok) {
      // Reload Scholar data to reflect change
      loadScholar();
      btnToggleSafeMode.textContent = '<i class="fas fa-check"></i> Updated';
      setTimeout(() => {
        btnToggleSafeMode.textContent = 'Toggle';
        btnToggleSafeMode.disabled = false;
      }, 1000);
    } else {
      alert(`Error updating safe mode: ${data.message}`);
      btnToggleSafeMode.disabled = false;
      btnToggleSafeMode.textContent = 'Toggle';
    }
  } catch (error) {
    alert(`Network error: ${error.message}`);
    btnToggleSafeMode.disabled = false;
    btnToggleSafeMode.textContent = 'Toggle';
  }
});

function getMultiAgentEnabled() {
  const multiAgentEl = document.getElementById('scholar-multi-agent');
  return multiAgentEl && multiAgentEl.getAttribute('data-multi-agent') === 'true';
}

function getMultiAgentMax() {
  const select = document.getElementById('scholar-multi-agent-max');
  return select ? parseInt(select.value, 10) : 4;
}

async function updateMultiAgentConfig(payload) {
  const btn = document.getElementById('btn-toggle-multi-agent');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Updating...';
  }

  try {
    const res = await fetch('/api/scholar/multi-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.ok) {
      loadScholar();
      if (btn) {
        btn.textContent = '<i class="fas fa-check"></i> Updated';
        setTimeout(() => {
          btn.textContent = 'Toggle';
          btn.disabled = false;
        }, 1000);
      }
    } else {
      alert(`Error updating multi-agent: ${data.message}`);
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Toggle';
      }
    }
  } catch (error) {
    alert(`Network error: ${error.message}`);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Toggle';
    }
  }
}

// Multi-agent toggle
const btnToggleMultiAgent = document.getElementById('btn-toggle-multi-agent');
if (btnToggleMultiAgent) btnToggleMultiAgent.addEventListener('click', async () => {
  const current = getMultiAgentEnabled();
  const newMode = !current;
  const maxConcurrency = getMultiAgentMax();
  await updateMultiAgentConfig({ enabled: newMode, max_concurrency: maxConcurrency });
});

// Multi-agent max concurrency select
const multiAgentMaxSelect = document.getElementById('scholar-multi-agent-max');
if (multiAgentMaxSelect) multiAgentMaxSelect.addEventListener('change', async () => {
  const enabled = getMultiAgentEnabled();
  const maxConcurrency = getMultiAgentMax();
  await updateMultiAgentConfig({ enabled: enabled, max_concurrency: maxConcurrency });
});

// Weekly Digest generation
const btnGenerateDigest = document.getElementById('btn-generate-digest');
const scholarDigestStatus = document.getElementById('scholar-digest-status');
const scholarDigestContent = document.getElementById('scholar-digest-content');
const scholarDigestText = document.getElementById('scholar-digest-text');

if (btnGenerateDigest) btnGenerateDigest.addEventListener('click', async () => {
  btnGenerateDigest.disabled = true;
  btnGenerateDigest.textContent = 'ðŸ§  Analyzing...';
  btnGenerateDigest.style.background = '#6b21a8';
  if (scholarDigestStatus) scholarDigestStatus.innerHTML = '<span style="color: #a855f7;">ðŸ”„ AI is analyzing proposals, gaps, and research data... (this may take up to 90s)</span>';
  if (scholarDigestContent) scholarDigestContent.style.display = 'none';

  try {
    // Use AbortController for timeout (2 minutes for Codex)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const res = await fetch('/api/scholar/digest', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Server error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    if (data.ok) {
      const aiPowered = data.ai_powered ? 'ðŸ§  AI Analysis' : 'ðŸ“Š Summary';
      const contextInfo = data.context_summary || '';
      if (scholarDigestStatus) {
        scholarDigestStatus.innerHTML = `<span style="color: #3fb950;"><i class="fas fa-check"></i></span> ${aiPowered} complete â€¢ ${contextInfo}`;
      }
      if (scholarDigestContent && scholarDigestText) {
        // Enhanced markdown to HTML conversion for AI responses
        let html = data.digest
          // Headers with proper styling
          .replace(/^### (.+)$/gm, '<h4 style="margin-top: 14px; margin-bottom: 6px; font-size: 14px; font-weight: 600; color: #a855f7;">$1</h4>')
          .replace(/^## (.+)$/gm, '<h3 style="margin-top: 18px; margin-bottom: 8px; font-size: 15px; font-weight: 600; color: var(--text-primary); border-bottom: 1px solid var(--border); padding-bottom: 4px;">$1</h3>')
          .replace(/^# (.+)$/gm, '<h2 style="margin-top: 0; margin-bottom: 12px; font-size: 18px; color: var(--text-primary);">$1</h2>')
          // Bold text
          .replace(/\*\*(.+?)\*\*/g, '<strong style="color: var(--text-primary);">$1</strong>')
          // Italic text
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          // Numbered lists
          .replace(/^(\d+)\. (.+)$/gm, '<div style="padding-left: 8px; margin-bottom: 6px;"><span style="color: #a855f7; font-weight: 600;">$1.</span> $2</div>')
          // Bullet points with nested support
          .replace(/^  - (.+)$/gm, '<div style="padding-left: 28px; margin-bottom: 4px; color: var(--text-secondary);">â—¦ $1</div>')
          .replace(/^- (.+)$/gm, '<div style="padding-left: 12px; margin-bottom: 4px;">â€¢ $1</div>')
          // Code blocks
          .replace(/`([^`]+)`/g, '<code style="background: var(--bg-secondary); padding: 1px 4px; border-radius: 3px; font-size: 12px;">$1</code>')
          // Line breaks
          .replace(/\n\n/g, '<div style="margin-bottom: 12px;"></div>');

        // Add AI indicator badge at top
        if (data.ai_powered) {
          html = '<div style="display: inline-block; background: linear-gradient(135deg, #a855f7, #6366f1); color: white; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-bottom: 16px;">ðŸ§  AI-POWERED ANALYSIS</div>' + html;
        }

        scholarDigestText.innerHTML = html;
        scholarDigestContent.style.display = 'block';
      }
      btnGenerateDigest.textContent = 'ðŸ”„ Regenerate';
      btnGenerateDigest.style.background = '#a855f7';
    } else {
      if (scholarDigestStatus) {
        scholarDigestStatus.innerHTML = `<span style="color: #f85149;">âœ— Error:</span> ${data.message || 'Unknown error'}`;
      }
      btnGenerateDigest.textContent = 'Generate Analysis';
      btnGenerateDigest.style.background = '#a855f7';
    }
  } catch (error) {
    if (scholarDigestStatus) {
      scholarDigestStatus.innerHTML = `<span style="color: #f85149;">âœ— Network error:</span> ${error.message}`;
    }
    btnGenerateDigest.textContent = 'Generate Analysis';
    btnGenerateDigest.style.background = '#a855f7';
  }

  btnGenerateDigest.disabled = false;
});

// Save answers handling
const saveAnswersBtn = document.getElementById('btn-save-answers');

// Submit a single answer by question index
async function submitSingleAnswer(questionIndex) {
  const answerTextarea = document.getElementById(`answer-${questionIndex}`);
  const submitBtn = document.getElementById(`btn-submit-answer-${questionIndex}`);
  const statusSpan = document.getElementById(`answer-status-${questionIndex}`);

  if (!answerTextarea) return;

  const answer = answerTextarea.value.trim();
  if (!answer) {
    if (statusSpan) statusSpan.innerHTML = '<span style="color: var(--warning);">Please enter an answer</span>';
    answerTextarea.focus();
    return;
  }

  // Disable UI
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
  }
  if (statusSpan) statusSpan.innerHTML = '<span style="color: var(--text-muted);">Saving...</span>';

  try {
    const res = await fetch('/api/scholar/questions/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_index: questionIndex, answer: answer })
    });

    const data = await res.json();

    if (data.ok) {
      if (statusSpan) statusSpan.innerHTML = '<span style="color: var(--success);"><i class="fas fa-check"></i> Saved!</span>';
      if (submitBtn) {
        submitBtn.textContent = '<i class="fas fa-check"></i> Saved';
        submitBtn.style.background = 'var(--success)';
      }
      // Animate and remove the answered question card
      const card = answerTextarea.closest('.scholar-question-card');
      if (card) {
        card.style.transition = 'opacity 0.5s, transform 0.5s';
        card.style.opacity = '0.5';
        card.style.transform = 'scale(0.98)';
      }
      // Reload to reflect updated questions (now shows in Answered section)
      setTimeout(() => {
        loadScholar();
      }, 1000);
    } else {
      if (statusSpan) statusSpan.innerHTML = `<span style="color: var(--error);">âœ— ${data.message}</span>`;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '<i class="fas fa-check"></i> Submit';
      }
    }
  } catch (error) {
    if (statusSpan) statusSpan.innerHTML = `<span style="color: var(--error);">âœ— Network error</span>`;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '<i class="fas fa-check"></i> Submit';
    }
  }
}
window.submitSingleAnswer = submitSingleAnswer;

// Toggle answered questions section visibility
function toggleAnsweredQuestions() {
  const container = document.getElementById('scholar-answered-questions');
  const chevron = document.getElementById('answered-questions-chevron');

  if (!container) return;

  answeredQuestionsExpanded = !answeredQuestionsExpanded;

  if (answeredQuestionsExpanded) {
    container.style.display = 'block';
    if (chevron) chevron.textContent = 'â–¼';
  } else {
    container.style.display = 'none';
    if (chevron) chevron.textContent = 'â–¶';
  }
}
window.toggleAnsweredQuestions = toggleAnsweredQuestions;

if (saveAnswersBtn) saveAnswersBtn.addEventListener('click', async () => {
  const questionsContainer = document.getElementById('scholar-questions');
  if (!questionsContainer) return;
  const textareas = questionsContainer.querySelectorAll('textarea[id^="answer-"]');
  const answers = Array.from(textareas).map(ta => ta.value.trim());

  if (answers.some(a => !a)) {
    if (!confirm('Some questions are unanswered. Save anyway?')) {
      return;
    }
  }

  saveAnswersBtn.disabled = true;
  saveAnswersBtn.textContent = 'Saving...';

  try {
    const res = await fetch('/api/scholar/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: answers })
    });

    const data = await res.json();

    if (data.ok) {
      saveAnswersBtn.textContent = '<i class="fas fa-check"></i> Saved';
      setTimeout(() => {
        saveAnswersBtn.textContent = 'Save Answers';
        saveAnswersBtn.disabled = false;
        loadScholar(); // Reload to show updated questions
      }, 1500);
    } else {
      alert(`Error saving answers: ${data.message}`);
      saveAnswersBtn.disabled = false;
      saveAnswersBtn.textContent = 'Save Answers';
    }
  } catch (error) {
    alert(`Network error: ${error.message}`);
    saveAnswersBtn.disabled = false;
    saveAnswersBtn.textContent = 'Save Answers';
  }
});

// API Key Management
const btnToggleApiKey = document.getElementById('btn-toggle-api-key');
const apiKeyConfig = document.getElementById('api-key-config');
const apiKeyStatus = document.getElementById('api-key-status');
const apiKeyInput = document.getElementById('api-key-input');
const btnSaveApiKey = document.getElementById('btn-save-api-key');
const btnTestApiKey = document.getElementById('btn-test-api-key');
const apiKeyTestResult = document.getElementById('api-key-test-result');

const apiProviderSelect = document.getElementById('api-provider-select');

async function loadApiKeyStatus() {
  if (!apiKeyStatus) return;
  try {
    const res = await fetch('/api/scholar/api-key');
    const data = await res.json();
    if (data.has_key) {
      const providerName = data.api_provider === 'openrouter' ? 'OpenRouter' : 'OpenAI';
      apiKeyStatus.innerHTML = `<span style="color: var(--success);"><i class="fas fa-check"></i> API key configured (${providerName}, ${data.model}) - ${data.key_preview}</span>`;
      if (apiProviderSelect) {
        apiProviderSelect.value = data.api_provider || 'openrouter';
      }
    } else {
      apiKeyStatus.innerHTML = '<span style="color: var(--text-muted);">No API key configured. Click "Configure" to add one.</span>';
    }
  } catch (error) {
    apiKeyStatus.innerHTML = '<span style="color: var(--error);">Error loading API key status</span>';
  }
}

if (btnToggleApiKey && apiKeyConfig && apiKeyInput) btnToggleApiKey.addEventListener('click', () => {
  const isVisible = apiKeyConfig.style.display !== 'none';
  apiKeyConfig.style.display = isVisible ? 'none' : 'block';
  btnToggleApiKey.textContent = isVisible ? 'Configure' : 'Cancel';
  if (!isVisible) {
    apiKeyInput.value = '';
  }
});

if (btnSaveApiKey && apiKeyInput && apiKeyStatus) btnSaveApiKey.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    alert('Please enter an API key');
    return;
  }

  const apiProvider = apiProviderSelect ? apiProviderSelect.value : 'openrouter';
  const model = apiProvider === 'openrouter' ? 'openrouter/auto' : 'gpt-4o-mini';

  btnSaveApiKey.disabled = true;
  btnSaveApiKey.textContent = 'Saving...';

  try {
    const res = await fetch('/api/scholar/api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        api_provider: apiProvider,
        model: model
      })
    });

    const data = await res.json();
    if (data.ok) {
      const providerName = data.api_provider === 'openrouter' ? 'OpenRouter' : 'OpenAI';
      apiKeyStatus.innerHTML = `<span style="color: var(--success);"><i class="fas fa-check"></i> API key saved (${providerName}, ${data.model}) - ${data.key_preview}</span>`;
      apiKeyConfig.style.display = 'none';
      btnToggleApiKey.textContent = 'Configure';
      apiKeyInput.value = '';
    } else {
      alert(`Error: ${data.message}`);
    }
  } catch (error) {
    alert(`Network error: ${error.message}`);
  } finally {
    btnSaveApiKey.disabled = false;
    btnSaveApiKey.textContent = 'Save Key';
  }
});

if (btnTestApiKey && apiKeyInput && apiKeyTestResult) btnTestApiKey.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    alert('Please enter an API key first');
    return;
  }

  btnTestApiKey.disabled = true;
  btnTestApiKey.textContent = 'Testing...';
  apiKeyTestResult.innerHTML = 'Testing API key...';

  try {
    const apiProvider = apiProviderSelect ? apiProviderSelect.value : 'openrouter';
    const model = apiProvider === 'openrouter' ? 'openrouter/auto' : 'gpt-4o-mini';

    // Test by generating a simple answer with the provided key (no save)
    const res = await fetch('/api/scholar/questions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Test question: What is PEIRRO?',
        context: 'Testing API key connectivity.',
        api_key: apiKey,
        api_provider: apiProvider,
        model: model
      })
    });

    const data = await res.json();
    if (data.ok) {
      apiKeyTestResult.innerHTML = `<span style="color: var(--success);"><i class="fas fa-check"></i> API key works! Generated answer preview: ${data.answer.substring(0, 50)}...</span>`;
    } else {
      apiKeyTestResult.innerHTML = `<span style="color: var(--error);">âœ— ${data.message}</span>`;
    }
  } catch (error) {
    apiKeyTestResult.innerHTML = `<span style="color: var(--error);">âœ— Network error: ${error.message}</span>`;
  } finally {
    btnTestApiKey.disabled = false;
    btnTestApiKey.textContent = 'Test';
  }
});

// Answer generation functions (global scope for onclick handlers)
window.generateAnswer = function (questionIndex) {
  // Backwards-compatible entry point: open chat in generate mode and auto-send the question.
  window.openScholarChat(questionIndex, 'generate', true);
};

window.useGeneratedAnswer = function (questionIndex) {
  const generatedText = document.getElementById(`generated-text-${questionIndex}`);
  const textarea = document.getElementById(`answer-${questionIndex}`);
  if (generatedText && textarea) {
    textarea.value = generatedText.textContent;
    // Scroll to textarea
    textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    textarea.focus();
  }
};

// Tab switching - must run on DOM ready
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');

  if (tabButtons.length === 0 || tabPanels.length === 0) {
    console.error('[Tab System] ERROR: Tab buttons or panels not found');
    console.log('[Tab System] Buttons found:', tabButtons.length);
    console.log('[Tab System] Panels found:', tabPanels.length);
    return;
  }

  console.log('[Tab System] Initializing with', tabButtons.length, 'tabs');

  // Function to switch to a specific tab
  function switchToTab(tabName) {
    console.log('[Tab System] Switching to tab:', tabName);

    // Update button states
    tabButtons.forEach(b => {
      const btnTab = b.getAttribute('data-tab');
      if (btnTab === tabName) {
        b.classList.add('active');
        console.log('[Tab System] Activated button:', btnTab);
      } else {
        b.classList.remove('active');
      }
    });

    // Update panel visibility
    let panelFound = false;
    tabPanels.forEach(panel => {
      if (panel.id === `tab-${tabName}`) {
        panel.classList.add('active');
        panel.style.display = 'block';
        panelFound = true;
        console.log('[Tab System] Showing panel:', panel.id);
      } else {
        panel.classList.remove('active');
        panel.style.display = 'none';
      }
    });

    if (!panelFound) {
      console.error('[Tab System] ERROR: Panel not found for tab:', tabName);
    }

    // Update URL hash (for bookmarking)
    window.location.hash = tabName;

    // Lazy load tab content
    if (tabName === 'syllabus' && typeof loadSyllabusDashboard === 'function') {
      console.log('[Tab System] Loading syllabus dashboard');
      loadSyllabusDashboard();
    } else if (tabName === 'scholar' && typeof loadScholar === 'function') {
      console.log('[Tab System] Loading scholar data');
      loadScholar();
    }
  }

  // Add click handlers to tab buttons
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = btn.getAttribute('data-tab');

      if (!tab) {
        console.error('[Tab System] ERROR: Tab button missing data-tab attribute');
        return;
      }

      switchToTab(tab);
    });
  });

  // Check URL hash on load (for bookmarked tabs)
  const hash = window.location.hash.substring(1); // Remove #
  if (hash && Array.from(tabButtons).some(btn => btn.getAttribute('data-tab') === hash)) {
    console.log('[Tab System] Restoring tab from URL hash:', hash);
    switchToTab(hash);
  } else {
    // Default to overview
    console.log('[Tab System] Showing default tab: overview');
    switchToTab('overview');
  }
}

// Calendar state (Globals initialized above)

// Calendar rendering
async function loadCalendar() {
  console.log('[Calendar] loadCalendar() called');
  const courseId = document.getElementById('calendar-filter-course')?.value || '';
  const eventType = document.getElementById('calendar-filter-type')?.value || '';
  const viewRange = document.getElementById('calendar-view-range')?.value || 'month';

  const today = new Date();
  let startDate = new Date(currentCalendarDate);
  startDate.setDate(1);
  startDate.setDate(startDate.getDate() - 7); // Show a week before month start

  let endDate = new Date(currentCalendarDate);
  const monthsToShow = viewRange === 'month' ? 1 : viewRange === '2months' ? 2 : 3;
  endDate.setMonth(endDate.getMonth() + monthsToShow);
  endDate.setDate(0); // Last day of that month

  const params = new URLSearchParams({
    start_date: formatLocalDate(startDate),
    end_date: formatLocalDate(endDate),
  });
  if (courseId) params.append('course_id', courseId);
  if (eventType) params.append('event_type', eventType);

  try {
    console.log('[Calendar] Fetching calendar data...');
    const res = await fetch(`/api/calendar/data?${params}`);
    const data = await res.json();
    console.log('[Calendar] API response:', data);
    if (data.ok) {
      calendarData = data;
    } else {
      console.warn('[Calendar] API returned ok=false, using empty data');
      // Ensure calendarData has empty arrays so renderCalendar works
      calendarData = { events: [], sessions: [], planned: [], ok: true };
    }
  } catch (error) {
    console.error('[Calendar] Failed to load calendar data:', error);
    // Ensure calendarData has empty arrays so renderCalendar works
    calendarData = { events: [], sessions: [], planned: [], ok: true };
  }

  // Always render calendar grid (even if empty)
  console.log('[Calendar] Rendering calendar with data:', calendarData);
  renderCalendar();
}

// Type icons for syllabus events
const EVENT_TYPE_ICONS = {
  'lecture': 'ðŸ“š',
  'reading': 'ðŸ“–',
  'quiz': 'âœï¸',
  'exam': 'ðŸ“',
  'assignment': 'ðŸ“‹',
  'lab': 'ðŸ”¬',
  'immersion': 'ðŸ¥',
  'checkoff': 'âœ…',
  'practical': 'ðŸ©º',
  'async': 'ðŸ’»',
  'other': 'ðŸ“Œ'
};

/**
 * Parse time and location from raw_text field
 * Expected format: "Time: 3:00 PM | Location: Room 204"
 */
function parseEventDetails(rawText) {
  const result = { time: null, location: null };
  if (!rawText) return result;

  const timeMatch = rawText.match(/Time:\s*([^|]+)/i);
  const locMatch = rawText.match(/Location:\s*([^|]+)/i);

  if (timeMatch) result.time = timeMatch[1].trim();
  if (locMatch) result.location = locMatch[1].trim();

  return result;
}

function formatLocalDate(dateInput) {
  const date = dateInput instanceof Date ? new Date(dateInput.getTime()) : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get icon for event type
 */
function getEventTypeIcon(type) {
  const icons = {
    exam: 'ðŸ“',
    quiz: 'â“',
    assignment: 'ðŸ“‹',
    lab: 'ðŸ”¬',
    lecture: 'ðŸŽ“',
    immersion: 'ðŸ¥',
    checkoff: 'âœ…',
    practical: 'ðŸ©º',
    async: 'ðŸ’»',
    reading: 'ðŸ“–',
    other: 'ðŸ“Œ'
  };
  return icons[type] || icons[(type || '').toLowerCase()] || 'ðŸ“Œ';
}

/**
 * Render week view - 7-day grid layout (like month but one week, bigger boxes)
 */
function renderWeekView() {
  const container = document.getElementById('calendar-grid');
  if (!container) return;

  container.style.display = 'block';
  container.style.gridTemplateColumns = '1fr';
  container.classList.add('single-day-grid');

  container.style.display = 'grid';
  container.style.gridTemplateColumns = 'repeat(7, 1fr)';
  container.classList.remove('single-day-grid');

  // Ensure calendarData has required arrays
  if (!calendarData || !calendarData.events) {
    calendarData = { events: [], sessions: [], planned: [] };
  }
  calendarData.events = calendarData.events || [];
  calendarData.sessions = calendarData.sessions || [];

  // Get current week (Sunday to Saturday)
  const today = new Date(currentCalendarDate);
  const dayOfWeek = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const nowStr = formatLocalDate(new Date());

  // Week view uses same grid as month but only 1 row of days
  let html = '';

  // Weekday headers
  days.forEach(day => {
    html += `<div class="calendar-weekday-header">${day}</div>`;
  });

  // Day cells (larger for week view)
  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(weekStart);
    currentDay.setDate(weekStart.getDate() + i);
    const dateStr = formatLocalDate(currentDay);
    const isToday = dateStr === nowStr;

    // Filter events for this day
    const dayEvents = calendarData.events.filter(e => e.date === dateStr);
    const daySessions = calendarData.sessions.filter(s => s.date === dateStr);

    html += `
      <div class="calendar-day week-view-day ${isToday ? 'is-today' : ''}" data-date="${dateStr}">
        <div class="calendar-day-number">${currentDay.getDate()}</div>
        <div class="calendar-day-events">
    `;

    // Render events (show more detail in week view)
    dayEvents.forEach(event => {
      const details = parseEventDetails(event.raw_text);
      const typeIcon = getEventTypeIcon(event.type || event.event_type);
      const eventType = event.type || event.event_type || 'other';
      html += `
        <div class="calendar-event week-event event-${eventType}" onclick="openEventEditModal('${event.id}')" title="${event.title}">
          <span class="event-icon">${typeIcon}</span>
          <span class="event-title">${event.title}</span>
          ${details.time ? `<div class="event-time">${details.time}</div>` : ''}
        </div>
      `;
    });

    // Render study sessions
    daySessions.forEach(session => {
      html += `
        <div class="calendar-event week-event session-event" title="${session.topic || 'Study Session'}">
          <span class="event-icon">ðŸ“š</span>
          <span class="event-title">${session.topic || 'Study'}</span>
          <div class="event-time">${session.duration_minutes || 0}m</div>
        </div>
      `;
    });

    if (dayEvents.length === 0 && daySessions.length === 0) {
      html += '<div class="no-events">â€”</div>';
    }

    html += '</div></div>';
  }

  // Update container style for week view (taller cells)
  container.style.gridTemplateColumns = 'repeat(7, 1fr)';
  container.innerHTML = html;

  // Update header
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const headerEl = document.getElementById('calendar-month-year');
  if (headerEl) {
    headerEl.textContent = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  console.log('[Calendar] Week view rendered with', calendarData.events.length, 'events');
}

/**
 * Render day view - single day detailed layout
 */
function renderDayView() {
  const container = document.getElementById('calendar-grid');
  if (!container) return;

  // Ensure calendarData has required arrays
  if (!calendarData || !calendarData.events) {
    calendarData = { events: [], sessions: [], planned: [] };
  }
  calendarData.events = calendarData.events || [];
  calendarData.sessions = calendarData.sessions || [];

  const today = new Date(currentCalendarDate);
  const dateStr = formatLocalDate(today);
  const nowStr = formatLocalDate(new Date());
  const isToday = dateStr === nowStr;

  // Filter events for this day
  const dayEvents = calendarData.events.filter(e => e.date === dateStr);
  const daySessions = calendarData.sessions.filter(s => s.date === dateStr);

  // Build course lookup
  const courseById = {};
  allCourses.forEach((c, idx) => {
    courseById[c.id] = { ...c, _idx: idx };
  });

  let html = `
    <div class="day-view-container">
      <div class="day-header ${isToday ? 'is-today' : ''}">
        <h2>${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2>
        ${isToday ? '<span class="today-badge">Today</span>' : ''}
      </div>
      <div class="day-events-list">
  `;

  if (dayEvents.length === 0 && daySessions.length === 0) {
    html += '<div class="day-empty">No events scheduled for this day</div>';
  } else {
    // Sort events by time if available
    const sortedEvents = [...dayEvents].sort((a, b) => {
      const aTime = parseEventDetails(a.raw_text).time || '23:59';
      const bTime = parseEventDetails(b.raw_text).time || '23:59';
      return aTime.localeCompare(bTime);
    });

    sortedEvents.forEach(event => {
      const details = parseEventDetails(event.raw_text);
      const typeIcon = getEventTypeIcon(event.type || event.event_type);
      const course = courseById[event.course_id] || {};
      const courseName = course.code || course.name || '';

      html += `
        <div class="day-event-card event-type-${event.type || event.event_type}" onclick="openEventEditModal('${event.id}')">
          <div class="day-event-header">
            <span class="day-event-icon">${typeIcon}</span>
            <span class="day-event-type">${event.type || event.event_type || 'event'}</span>
            ${details.time ? `<span class="day-event-time">â° ${details.time}</span>` : ''}
          </div>
          <h3 class="day-event-title">${event.title}</h3>
          ${courseName ? `<div class="day-event-course">ðŸ“š ${courseName}</div>` : ''}
          ${details.location ? `<div class="day-event-location">ðŸ“ ${details.location}</div>` : ''}
          ${event.weight ? `<div class="day-event-weight">âš–ï¸ Weight: ${(event.weight * 100).toFixed(0)}%</div>` : ''}
        </div>
      `;
    });

    // Render study sessions
    daySessions.forEach(session => {
      html += `
        <div class="day-event-card session-card">
          <div class="day-event-header">
            <span class="day-event-icon">ðŸ“š</span>
            <span class="day-event-type">Study Session</span>
            <span class="day-event-time">${session.duration_minutes || 0} min</span>
          </div>
          <h3 class="day-event-title">${session.topic || 'Study Session'}</h3>
          ${session.mode ? `<div class="day-event-mode">Mode: ${session.mode}</div>` : ''}
        </div>
      `;
    });
  }

  html += '</div></div>';
  container.innerHTML = html;

  // Update header
  const headerEl = document.getElementById('calendar-month-year');
  if (headerEl) {
    headerEl.textContent = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  console.log('[Calendar] Day view rendered with', dayEvents.length, 'events,', daySessions.length, 'sessions');
}

// Default color palette for courses
const COURSE_COLOR_PALETTE = [
  "#EF4444", "#F97316", "#F59E0B", "#84CC16",
  "#10B981", "#06B6D4", "#3B82F6", "#6366F1",
  "#8B5CF6", "#EC4899", "#64748B", "#78716C"
];

// Get color for a course (from course data or auto-assign)
function getCourseColor(course, index) {
  if (course && course.color) return course.color;
  return COURSE_COLOR_PALETTE[index % COURSE_COLOR_PALETTE.length];
}

// Track current proposal being viewed
let currentProposalFile = null;

// View a proposal file in modal
async function viewProposalFile(filename) {
  currentProposalFile = filename;
  const overlay = document.getElementById('proposal-modal-overlay');
  const titleEl = document.getElementById('proposal-modal-title');
  const metaEl = document.getElementById('proposal-modal-meta');
  const contentEl = document.getElementById('proposal-modal-content');

  if (!overlay) return;

  // Show modal
  overlay.style.display = 'flex';
  titleEl.textContent = 'Loading...';
  metaEl.textContent = '';
  contentEl.textContent = 'Fetching proposal content...';

  try {
    const res = await fetch(`/api/scholar/proposal/${encodeURIComponent(filename)}`);
    const data = await res.json();

    if (data.ok) {
      // Parse title from filename
      let title = filename.replace('.md', '').replace(/_/g, ' ');
      if (filename.includes('change_proposal')) {
        title = 'ðŸ“ ' + title.replace('change proposal ', '').trim();
        metaEl.innerHTML = '<span style="color: #a855f7;">Change Proposal</span>';
      } else if (filename.includes('experiment')) {
        title = 'ðŸ§ª ' + title.replace('experiment ', '').trim();
        metaEl.innerHTML = '<span style="color: #06b6d4;">Experiment</span>';
      } else {
        metaEl.innerHTML = '<span style="color: #64748b;">Proposal</span>';
      }

      titleEl.textContent = title;
      contentEl.textContent = data.content;
    } else {
      titleEl.textContent = 'Error';
      contentEl.textContent = data.message || 'Failed to load proposal';
    }
  } catch (e) {
    titleEl.textContent = 'Error';
    contentEl.textContent = 'Failed to fetch proposal: ' + e.message;
  }
}

// Close proposal modal
function closeProposalModal() {
  const overlay = document.getElementById('proposal-modal-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
  currentProposalFile = null;
}

// Handle proposal approve/reject
async function handleProposalAction(action) {
  if (!currentProposalFile) return;

  const confirmMsg = action === 'approve'
    ? 'Approve this proposal? It will be moved to the approved folder.'
    : 'Reject this proposal? It will be moved to the rejected folder.';

  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetch(`/api/scholar/proposal/${encodeURIComponent(currentProposalFile)}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const data = await res.json();

    if (data.ok) {
      closeProposalModal();
      // Refresh Scholar tab to update proposal list
      loadScholar();
      // Show success message
      alert(`<i class="fas fa-check"></i> ${data.message}`);
    } else {
      alert('Error: ' + (data.message || 'Failed to process proposal'));
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.id === 'proposal-modal-overlay') {
    closeProposalModal();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeProposalModal();
  }
});

// Toggle event status (pending <-> completed)
async function toggleEventStatus(eventId, currentStatus) {
  const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
  try {
    const res = await fetch(`/api/syllabus/event/${eventId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.ok) {
      // Update local state
      const ev = syllabusEvents.find(e => e.id === eventId);
      if (ev) ev.status = newStatus;
      renderSyllabusList();
    } else {
      console.error('Failed to update status:', data.message);
    }
  } catch (error) {
    console.error('Error updating event status:', error);
  }
}

// Schedule M6 reviews for an event
async function scheduleM6Reviews(eventId, eventTitle) {
  if (!confirm(`Schedule M6 spaced reviews for "${eventTitle}"?\n\nThis will create 3 study tasks:\nâ€¢ Review 1: Tomorrow (10 min)\nâ€¢ Review 2: In 3 days (15 min)\nâ€¢ Review 3: In 7 days (20 min)`)) {
    return;
  }
  try {
    const res = await fetch(`/api/syllabus/event/${eventId}/schedule_reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (data.ok) {
      alert(`<i class="fas fa-check"></i> ${data.message}`);
      // Refresh calendar if visible
      if (syllabusViewMode === 'calendar') loadCalendar();
    } else {
      alert(`Error: ${data.message}`);
    }
  } catch (error) {
    console.error('Error scheduling reviews:', error);
    alert('Failed to schedule reviews.');
  }
}

// ===== Event Edit Modal Functions =====
function openEventEditModal(eventId) {
  // Handle string IDs from calendar (e.g., "event_123")
  if (typeof eventId === 'string' && eventId.startsWith('event_')) {
    eventId = eventId.replace('event_', '');
  }

  console.log('[EditModal] Opening for event:', eventId, 'syllabusEvents count:', syllabusEvents.length);
  let ev = syllabusEvents.find(e => String(e.id) === String(eventId));

  if (!ev) {
    // If not found locally, try to fetch from API
    console.log('[EditModal] Event not in local state, fetching from API...');
    fetch(`/api/syllabus/events`)
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.events) {
          ev = data.events.find(e => String(e.id) === String(eventId));
          if (ev) {
            // Update local state
            syllabusEvents = data.events.map(ev => {
              const course = allCourses.find(c => c.id === ev.course_id) || {};
              return { ...ev, course };
            });
            populateEditModal(ev, eventId);
          } else {
            alert('Event not found. Please refresh the page and try again.');
          }
        } else {
          alert('Failed to load events. Please refresh the page and try again.');
        }
      })
      .catch(error => {
        console.error('[EditModal] Error fetching events:', error);
        alert('Error loading event. Please refresh the page and try again.');
      });
    return;
  }

  populateEditModal(ev, eventId);
}

function populateEditModal(ev, eventId) {
  document.getElementById('edit-event-id').value = eventId;
  const courseSelect = document.getElementById('edit-event-course');
  if (courseSelect) {
    const coursesForModal = getSortedDedupedCourses([ev.course_id]);
    courseSelect.innerHTML = buildCourseOptions(coursesForModal, true, 'Select course');
    courseSelect.value = ev.course_id || '';
  }
  const calendarSelect = document.getElementById('edit-event-calendar');
  if (calendarSelect) {
    refreshEventCalendarSelect(ev.google_calendar_id || '');
    calendarSelect.value = ev.google_calendar_id || '';
  }
  document.getElementById('edit-event-title').value = ev.title || '';

  document.getElementById('edit-event-type').value = ev.type || ev.event_type || 'other';
  document.getElementById('edit-event-status').value = ev.status || 'pending';
  document.getElementById('edit-event-date').value = ev.date || '';
  document.getElementById('edit-event-due-date').value = ev.due_date || '';
  document.getElementById('edit-event-weight').value = ev.weight || '';
  document.getElementById('edit-event-details').value = ev.raw_text || '';
  const recurrenceSelect = document.getElementById('edit-event-repeat');
  const recurrenceUntil = document.getElementById('edit-event-repeat-until');
  if (recurrenceSelect) recurrenceSelect.value = 'none';
  if (recurrenceUntil) recurrenceUntil.value = '';

  const modal = document.getElementById('event-edit-modal');
  modal.style.display = 'flex';
  // Small delay to allow display change to render before adding active class for transition
  setTimeout(() => modal.classList.add('active'), 10);
}

function closeEventEditModal() {
  const modal = document.getElementById('event-edit-modal');
  modal.classList.remove('active');
  setTimeout(() => {
    modal.style.display = 'none';
    document.getElementById('event-edit-status').textContent = '';
  }, 200); // Wait for transition
}

async function deleteEvent() {
  const eventId = document.getElementById('edit-event-id').value;
  if (!eventId) return;

  if (!confirm('Are you sure you want to delete this event?')) return;

  const statusEl = document.getElementById('event-edit-status');
  statusEl.textContent = 'Deleting...';

  try {
    const res = await fetch(`/api/syllabus/event/${eventId}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (data.ok) {
      // Remove from local state
      syllabusEvents = syllabusEvents.filter(e => String(e.id) !== String(eventId));

      closeEventEditModal();
      renderSyllabusList();
      if (typeof loadCalendar === 'function') loadCalendar();
      if (data.gcal_warning) {
        alert(`Deleted locally, but Google Calendar delete failed: ${data.gcal_warning}`);
      }

    } else {
      statusEl.textContent = `Error: ${data.message}`;
      statusEl.style.color = 'var(--error)';
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    statusEl.textContent = 'Failed to delete event';
    statusEl.style.color = 'var(--error)';
  }
}

async function saveEventEdit(e) {
  if (e) e.preventDefault();

  const eventId = document.getElementById('edit-event-id').value;
  const statusEl = document.getElementById('event-edit-status');

  const payload = {
    title: document.getElementById('edit-event-title').value.trim(),
    event_type: document.getElementById('edit-event-type').value,
    status: document.getElementById('edit-event-status').value,
    date: document.getElementById('edit-event-date').value || null,
    due_date: document.getElementById('edit-event-due-date').value || null,
    weight: parseFloat(document.getElementById('edit-event-weight').value) || null,
    raw_text: document.getElementById('edit-event-details').value.trim()
  };

  const selectedCourse = document.getElementById('edit-event-course')?.value;
  if (selectedCourse) payload.course_id = parseInt(selectedCourse, 10) || null;

  const selectedCalendar = document.getElementById('edit-event-calendar')?.value;
  if (selectedCalendar !== undefined) payload.google_calendar_id = selectedCalendar || null;

  const recurrencePattern = document.getElementById('edit-event-repeat')?.value || 'none';

  const recurrenceUntil = document.getElementById('edit-event-repeat-until')?.value || '';
  if (recurrencePattern !== 'none' || recurrenceUntil) {
    payload.recurrence_plan = {
      pattern: recurrencePattern,
      until: recurrenceUntil || null
    };
  }

  // Remove null/empty fields (preserve google_calendar_id to allow clearing)
  Object.keys(payload).forEach(k => {
    if ((payload[k] === null || payload[k] === '') && k !== 'google_calendar_id') {
      delete payload[k];
    }
  });


  try {
    statusEl.textContent = 'Saving...';
    statusEl.style.color = 'var(--text-muted)';

    const res = await fetch(`/api/syllabus/event/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.ok) {
      statusEl.textContent = '<i class="fas fa-check"></i> Event updated successfully';
      statusEl.style.color = 'var(--success)';

      // Update local state
      const ev = syllabusEvents.find(e => e.id === parseInt(eventId));
      if (ev) {
        if (payload.title) ev.title = payload.title;
        if (payload.event_type) ev.type = payload.event_type;
        if (payload.status) ev.status = payload.status;
        if (payload.date) ev.date = payload.date;
        if (payload.due_date) ev.due_date = payload.due_date;
        if (payload.weight) ev.weight = payload.weight;
        if (payload.raw_text) ev.raw_text = payload.raw_text;
        if (payload.course_id) ev.course_id = payload.course_id;
        if (payload.google_calendar_id !== undefined) ev.google_calendar_id = payload.google_calendar_id;
      }


      // Close modal and refresh list after brief delay
      setTimeout(() => {
        closeEventEditModal();
        renderSyllabusList();
        if (syllabusViewMode === 'calendar') loadCalendar();
      }, 500);
    } else {
      statusEl.textContent = `Error: ${data.message}`;
      statusEl.style.color = 'var(--error)';
    }
  } catch (error) {
    console.error('Error saving event:', error);
    statusEl.textContent = 'Failed to save event';
    statusEl.style.color = 'var(--error)';
  }
}

// Export event edit modal functions and syllabus helper functions to window scope for inline onclick handlers
window.openEventEditModal = openEventEditModal;
window.closeEventEditModal = closeEventEditModal;
window.saveEventEdit = saveEventEdit;
window.deleteEvent = deleteEvent;
window.toggleEventStatus = toggleEventStatus;
window.scheduleM6Reviews = scheduleM6Reviews;
window.toggleWeekSection = toggleWeekSection;

// Attach form submit handler for event edit form
document.addEventListener('DOMContentLoaded', () => {
  const editForm = document.getElementById('event-edit-form');
  if (editForm) {
    editForm.addEventListener('submit', saveEventEdit);
  }
});

/**
 * Get semester week number (Week 1 = Jan 5, 2025)
 */
function getSemesterWeekNumber(dateStr) {
  if (!dateStr) return 0;
  const date = new Date(dateStr + 'T00:00:00');
  const diffMs = date - SEMESTER_START;
  const diffDays = Math.floor(diffMs / 86400000);
  const weekNum = Math.floor(diffDays / 7) + 1;
  return weekNum;
}

/**
 * Get week start date for a given semester week number
 */
function getWeekStartDate(weekNum) {
  const date = new Date(SEMESTER_START);
  date.setDate(date.getDate() + (weekNum - 1) * 7);
  return date;
}

/**
 * Populate the start week dropdown (Week 1 - Week 20)
 */
function populateWeekSelector() {
  const startWeekSelect = document.getElementById('list-start-week');
  if (!startWeekSelect) return;

  let html = '';
  for (let w = 1; w <= 20; w++) {
    const weekStart = getWeekStartDate(w);
    const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    html += `<option value="${w}">Week ${w} (${label})</option>`;
  }
  startWeekSelect.innerHTML = html;
  startWeekSelect.value = listStartWeek;
}

/**
 * Update the week range label display
 */
function updateWeekRangeLabel() {
  const label = document.getElementById('list-week-range-label');
  if (!label) return;

  if (listWeekCount === 'all') {
    label.textContent = 'All Weeks';
  } else if (listWeekCount === 1) {
    label.textContent = `Week ${listStartWeek}`;
  } else {
    const endWeek = listStartWeek + listWeekCount - 1;
    label.textContent = `Week ${listStartWeek} - ${endWeek}`;
  }
}

/**
 * Get week number and date range for a given date
 */
function getWeekInfo(dateStr) {
  if (!dateStr) return { weekNum: 0, weekLabel: 'No Date', weekStart: null };

  const date = new Date(dateStr + 'T00:00:00');
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date - startOfYear) / 86400000);
  const weekNum = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);

  // Get week start (Sunday) and end (Saturday)
  const dayOfWeek = date.getDay();
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - dayOfWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekLabel = `Week ${weekNum}: ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return { weekNum, weekLabel, weekStart, weekEnd, year: date.getFullYear() };
}

function renderSyllabusList() {
  if (!syllabusListBody || !syllabusListEmpty) return;

  const courseId = syllabusListCourse ? syllabusListCourse.value : '';
  const eventType = syllabusListType ? syllabusListType.value : '';
  const search = syllabusListSearch ? syllabusListSearch.value.toLowerCase() : '';

  // Update week range label
  updateWeekRangeLabel();

  const filtered = syllabusEvents.filter(ev => {
    const matchesCourse = !courseId || String(ev.course_id) === String(courseId);
    const matchesType = !eventType || (ev.type || '').toLowerCase() === eventType;
    const haystack = `${ev.title || ''} ${ev.raw_text || ''}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search);

    // Week filter
    let matchesWeek = true;
    if (listWeekCount !== 'all') {
      const dateStr = ev.date || ev.due_date || '';
      const eventWeek = getSemesterWeekNumber(dateStr);
      matchesWeek = eventWeek >= listStartWeek && eventWeek < listStartWeek + listWeekCount;
    }

    return matchesCourse && matchesType && matchesSearch && matchesWeek;
  }).sort((a, b) => {
    const ad = a.date || a.due_date || '';
    const bd = b.date || b.due_date || '';
    return ad.localeCompare(bd);
  });

  // Build course index for colors
  const courseById = {};
  allCourses.forEach((c, idx) => {
    courseById[c.id] = { ...c, _idx: idx };
  });

  // Group events by week
  const weekGroups = {};
  filtered.forEach(ev => {
    const dateStr = ev.date || ev.due_date || '';
    const weekInfo = getWeekInfo(dateStr);
    const weekKey = dateStr ? `${weekInfo.year}-W${String(weekInfo.weekNum).padStart(2, '0')}` : 'no-date';

    if (!weekGroups[weekKey]) {
      weekGroups[weekKey] = {
        label: weekInfo.weekLabel,
        events: [],
        weekNum: weekInfo.weekNum,
        year: weekInfo.year
      };
    }
    weekGroups[weekKey].events.push(ev);
  });

  // Sort week keys
  const sortedWeekKeys = Object.keys(weekGroups).sort();

  // Render grouped by week with collapsible sections
  let html = '';
  sortedWeekKeys.forEach((weekKey, idx) => {
    const group = weekGroups[weekKey];
    const isExpanded = idx < 3; // First 3 weeks expanded by default

    html += `
      <tr class="week-header-row" onclick="toggleWeekSection(this)" style="cursor: pointer; background: var(--surface-2);">
        <td colspan="8" style="padding: 12px 16px; font-weight: 600; font-size: 14px; border-bottom: 2px solid var(--primary);">
          <span class="week-chevron" style="display: inline-block; transition: transform 0.2s; margin-right: 8px;">${isExpanded ? 'â–¼' : 'â–¶'}</span>
          ${group.label}
          <span style="font-weight: 400; color: var(--text-muted); margin-left: 12px;">(${group.events.length} events)</span>
        </td>
      </tr>
    `;

    group.events.forEach(ev => {
      const dateDisplay = ev.date || ev.due_date || '';
      const weightDisplay = ev.weight ? `${(ev.weight * 100).toFixed(0)}%` : 'â€”';
      const course = courseById[ev.course_id] || ev.course || {};
      const courseName = course.code || course.name || 'â€”';
      const courseColor = getCourseColor(course, course._idx || 0);
      const typeIcon = EVENT_TYPE_ICONS[(ev.type || '').toLowerCase()] || 'ðŸ“Œ';
      const isCompleted = (ev.status || '').toLowerCase() === 'completed';
      const rowClass = isCompleted ? 'style="opacity: 0.6;"' : '';
      const titleStyle = isCompleted ? 'text-decoration: line-through; color: var(--text-muted);' : '';
      const displayStyle = isExpanded ? '' : 'display: none;';

      html += `
        <tr class="week-event-row" data-week="${weekKey}" ${rowClass} style="${displayStyle}">
          <td style="text-align: center;">
            <input type="checkbox" 
                   ${isCompleted ? 'checked' : ''} 
                   onchange="toggleEventStatus(${ev.id}, '${ev.status || 'pending'}')"
                   title="${isCompleted ? 'Mark as pending' : 'Mark as completed'}"
                   style="width: 18px; height: 18px; cursor: pointer;">
          </td>
          <td>${dateDisplay || 'â€”'}</td>
          <td>
            <span class="course-badge" style="background: ${courseColor}20; color: ${courseColor}; border: 1px solid ${courseColor}40; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">
              ${courseName}
            </span>
          </td>
          <td><span title="${ev.type || 'other'}">${typeIcon}</span> ${ev.type || ''}</td>
          <td style="${titleStyle}">${ev.title || ''}</td>
          <td style="text-align: center;">${weightDisplay}</td>
          <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(ev.raw_text || '').replace(/"/g, '&quot;')}">${ev.raw_text || ''}</td>
          <td style="white-space: nowrap;">
            <button class="btn" style="font-size: 11px; padding: 4px 8px; margin-right: 4px;" 
                    onclick="openEventEditModal(${ev.id})"
                    title="Edit event">
              âœï¸
            </button>
            <button class="btn" style="font-size: 11px; padding: 4px 8px;" 
                    onclick="scheduleM6Reviews(${ev.id}, '${(ev.title || '').replace(/'/g, "\\'")}')">
              ðŸ“… M6
            </button>
          </td>
        </tr>
      `;
    });
  });

  syllabusListBody.innerHTML = html;
  syllabusListEmpty.style.display = filtered.length ? 'none' : 'block';
}

/**
 * Toggle week section collapse/expand
 */
function toggleWeekSection(headerRow) {
  const chevron = headerRow.querySelector('.week-chevron');
  const nextRows = [];
  let sibling = headerRow.nextElementSibling;

  while (sibling && !sibling.classList.contains('week-header-row')) {
    if (sibling.classList.contains('week-event-row')) {
      nextRows.push(sibling);
    }
    sibling = sibling.nextElementSibling;
  }

  const isExpanded = chevron.textContent === 'â–¼';
  chevron.textContent = isExpanded ? 'â–¶' : 'â–¼';

  nextRows.forEach(row => {
    row.style.display = isExpanded ? 'none' : '';
  });
}

function collapseAllWeekSections() {
  document.querySelectorAll('.week-header-row').forEach(header => {
    const chevron = header.querySelector('.week-chevron');
    if (chevron) chevron.textContent = 'â–¶';
    let sibling = header.nextElementSibling;
    while (sibling && !sibling.classList.contains('week-header-row')) {
      if (sibling.classList.contains('week-event-row')) sibling.style.display = 'none';
      sibling = sibling.nextElementSibling;
    }
  });
}

function expandAllWeekSections() {
  document.querySelectorAll('.week-header-row').forEach(header => {
    const chevron = header.querySelector('.week-chevron');
    if (chevron) chevron.textContent = 'â–¼';
    let sibling = header.nextElementSibling;
    while (sibling && !sibling.classList.contains('week-header-row')) {
      if (sibling.classList.contains('week-event-row')) sibling.style.display = '';
      sibling = sibling.nextElementSibling;
    }
  });
}

function setSyllabusView(mode) {
  syllabusViewMode = mode;
  const calendarBox = document.getElementById('syllabus-calendar-container');
  const listBox = document.getElementById('syllabus-list-container');
  if (calendarBox && listBox) {
    calendarBox.style.display = mode === 'calendar' ? 'block' : 'none';
    listBox.style.display = mode === 'list' ? 'block' : 'none';
  }
  if (btnViewCalendar && btnViewList) {
    const calendarActive = mode === 'calendar';
    btnViewCalendar.classList.toggle('arcade-btn-primary', calendarActive);
    btnViewCalendar.classList.toggle('active', calendarActive);
    btnViewCalendar.setAttribute('aria-pressed', calendarActive ? 'true' : 'false');
    btnViewList.classList.toggle('arcade-btn-primary', !calendarActive);
    btnViewList.classList.toggle('active', !calendarActive);
    btnViewList.setAttribute('aria-pressed', calendarActive ? 'false' : 'true');
  }
  if (mode === 'calendar') {
    loadCalendar();
  } else {
    renderSyllabusList();
  }
}

function renderCalendar() {
  console.log('[Calendar] renderCalendar() called');
  const grid = document.getElementById('calendar-grid');
  if (!grid) {
    console.warn('[Calendar] calendar-grid element not found');
    return;
  }

  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
  grid.classList.remove('single-day-grid');

  // Check view type and route to appropriate renderer
  const viewRange = document.getElementById('calendar-view-range')?.value || 'month';

  if (viewRange === 'week') {
    renderWeekView();
    return;
  } else if (viewRange === 'day') {
    renderDayView();
    return;
  }

  // Continue with month view logic...
  // Ensure calendarData has required arrays
  if (!calendarData || !calendarData.events) {
    console.warn('[Calendar] calendarData missing, initializing empty');
    calendarData = { events: [], sessions: [], planned: [] };
  }
  calendarData.events = calendarData.events || [];
  calendarData.sessions = calendarData.sessions || [];
  calendarData.planned = calendarData.planned || [];

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const today = new Date();
  console.log('[Calendar] Rendering for', year, month + 1);

  // Update month/year header
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const monthYearEl = document.getElementById('calendar-month-year');
  if (monthYearEl) {
    monthYearEl.textContent = `${monthNames[month]} ${year}`;
  }

  // First day of month and how many days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Weekday headers
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  grid.innerHTML = weekdays.map(w => `<div class="calendar-weekday">${w}</div>`).join('');

  // Build course lookup for colors
  const courseById = {};
  allCourses.forEach((c, idx) => {
    courseById[c.id] = { ...c, _idx: idx };
  });
  // Also index by code for calendar events
  const courseByCode = {};
  allCourses.forEach((c, idx) => {
    if (c.code) courseByCode[c.code] = { ...c, _idx: idx };
  });

  // Empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    grid.innerHTML += '<div class="calendar-day other-month"></div>';
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(year, month, day);
    const isToday = dateObj.toDateString() === today.toDateString();

    // Find events/sessions/planned for this date
    const dayEvents = calendarData.events.filter(e => e.date === dateStr);
    const daySessions = calendarData.sessions.filter(s => s.date === dateStr);
    const dayPlanned = calendarData.planned.filter(p => p.date === dateStr);

    let html = `<div class="calendar-day ${isToday ? 'today' : ''}">`;
    html += `<div class="calendar-day-header"><span class="calendar-day-number">${day}</span></div>`;

    // Render events with course colors
    dayEvents.forEach(ev => {
      const isExamQuiz = ['exam', 'quiz'].includes((ev.event_type || '').toLowerCase());
      // Find course by code or id
      let course = courseByCode[ev.course_code] || null;
      const color = course ? getCourseColor(course, course._idx) : '#3B82F6';
      const bgColor = isExamQuiz ? 'rgba(248, 81, 73, 0.3)' : `${color}30`;
      const borderColor = isExamQuiz ? 'var(--error)' : color;
      const typeIcon = EVENT_TYPE_ICONS[(ev.event_type || '').toLowerCase()] || '';

      html += `<div class="calendar-event" style="background: ${bgColor}; border-left: 3px solid ${borderColor}; cursor: pointer;" onclick="openEventEditModal('${ev.id}')" title="${ev.course_code || ''}: ${ev.title}">${typeIcon} ${ev.title}</div>`;
    });

    // Render study sessions
    daySessions.forEach(sess => {
      html += `<div class="calendar-event study-session" title="${sess.topic}">${sess.topic || 'Session'}</div>`;
    });

    // Render planned sessions with course colors
    dayPlanned.forEach(plan => {
      const course = courseByCode[plan.course_code] || null;
      const color = course ? getCourseColor(course, course._idx) : '#8B5CF6';
      html += `<div class="calendar-event planned" style="background: ${color}20; border-left: 3px solid ${color};" title="Planned: ${plan.notes || 'Review'}">ðŸ“… ${plan.planned_minutes || ''}m</div>`;
    });

    html += '</div>';
    grid.innerHTML += html;
  }

  // Fill remaining cells to complete grid (up to 6 weeks)
  const totalCells = startingDayOfWeek + daysInMonth;
  const remainingCells = 42 - totalCells; // 6 weeks * 7 days
  for (let i = 0; i < remainingCells; i++) {
    grid.innerHTML += '<div class="calendar-day other-month"></div>';
  }

  console.log('[Calendar] Calendar rendered successfully with', calendarData.events.length, 'events,', calendarData.sessions.length, 'sessions,', calendarData.planned.length, 'planned');
}

// ========================================
// Study Tasks (Readings & Topics)
// ========================================

async function loadStudyTasks() {
  const listEl = document.getElementById('study-tasks-list');
  const filterEl = document.getElementById('study-tasks-filter');
  if (!listEl) return;

  const filter = filterEl ? filterEl.value : 'active';

  try {
    const res = await fetch(`/api/syllabus/study-tasks?filter=${filter}`);
    const data = await res.json();

    if (!data.ok) {
      listEl.innerHTML = `<div style="color: var(--error); padding: 20px;">Error: ${data.message}</div>`;
      return;
    }

    // Update stats
    const stats = data.stats || {};
    const pendingEl = document.getElementById('tasks-pending-count');
    const inProgressEl = document.getElementById('tasks-in-progress-count');
    const completedEl = document.getElementById('tasks-completed-count');
    const progressBar = document.getElementById('tasks-progress-bar');
    const progressPct = document.getElementById('tasks-progress-pct');

    if (pendingEl) pendingEl.textContent = stats.pending || 0;
    if (inProgressEl) inProgressEl.textContent = stats.in_progress || 0;
    if (completedEl) completedEl.textContent = stats.completed || 0;
    if (progressBar) progressBar.style.width = `${stats.progress_pct || 0}%`;
    if (progressPct) progressPct.textContent = `${stats.progress_pct || 0}%`;

    // Render tasks
    const tasks = data.tasks || [];
    if (tasks.length === 0) {
      listEl.innerHTML = `<div style="color: var(--text-muted); padding: 20px; text-align: center;">
        No study tasks found. Add readings or topics via the syllabus form.
      </div>`;
      return;
    }

    let html = '';
    tasks.forEach(task => {
      const isCompleted = task.status === 'completed';
      const courseColor = task.course_color || '#6366F1';

      // Status styling
      let statusBadge = '';
      let rowStyle = '';
      if (task.is_overdue) {
        statusBadge = '<span style="font-size: 10px; padding: 2px 6px; background: var(--error); color: white; border-radius: 4px; margin-left: 8px;">OVERDUE</span>';
        rowStyle = 'border-left: 3px solid var(--error);';
      } else if (task.is_current) {
        statusBadge = '<span style="font-size: 10px; padding: 2px 6px; background: var(--accent); color: white; border-radius: 4px; margin-left: 8px;">CURRENT</span>';
        rowStyle = 'border-left: 3px solid var(--accent);';
      } else if (isCompleted) {
        rowStyle = 'border-left: 3px solid var(--success); opacity: 0.7;';
      }

      // Date range display
      let dateDisplay = '';
      if (task.start_date && task.end_date) {
        dateDisplay = `${task.start_date} â†’ ${task.end_date}`;
      } else if (task.end_date) {
        dateDisplay = `Due: ${task.end_date}`;
      } else if (task.start_date) {
        dateDisplay = `From: ${task.start_date}`;
      }

      // Days remaining
      let daysDisplay = '';
      if (!isCompleted && task.days_remaining !== null) {
        if (task.days_remaining < 0) {
          daysDisplay = `<span style="color: var(--error); font-weight: 600;">${Math.abs(task.days_remaining)}d overdue</span>`;
        } else if (task.days_remaining === 0) {
          daysDisplay = '<span style="color: var(--warning); font-weight: 600;">Due today</span>';
        } else if (task.days_remaining <= 3) {
          daysDisplay = `<span style="color: var(--warning);">${task.days_remaining}d left</span>`;
        } else {
          daysDisplay = `<span style="color: var(--text-muted);">${task.days_remaining}d left</span>`;
        }
      }

      html += `
        <div class="study-task-item" style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px; ${rowStyle}">
          <input type="checkbox" 
            id="task-check-${task.id}" 
            ${isCompleted ? 'checked' : ''} 
            onchange="toggleStudyTask(${task.id}, this.checked)"
            style="width: 20px; height: 20px; margin-top: 2px; accent-color: var(--success); cursor: pointer;">
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: ${courseColor};"></span>
              <span style="font-size: 11px; color: var(--text-muted);">${task.course_name}</span>
              <span style="font-size: 10px; padding: 1px 6px; background: var(--bg-secondary); border-radius: 4px; text-transform: uppercase;">${task.type}</span>
              ${statusBadge}
            </div>
            <div style="font-size: 14px; font-weight: 500; margin-top: 4px; ${isCompleted ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">
              ${task.title}
            </div>
            ${task.raw_text ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${task.raw_text.substring(0, 100)}${task.raw_text.length > 100 ? '...' : ''}</div>` : ''}
            <div style="display: flex; gap: 16px; margin-top: 8px; font-size: 11px;">
              ${dateDisplay ? `<span style="color: var(--text-muted);">ðŸ“… ${dateDisplay}</span>` : ''}
              ${daysDisplay}
            </div>
          </div>
        </div>
      `;
    });

    listEl.innerHTML = html;

  } catch (error) {
    console.error('Failed to load study tasks:', error);
    listEl.innerHTML = `<div style="color: var(--error); padding: 20px;">Failed to load study tasks: ${error.message}</div>`;
  }
}

async function toggleStudyTask(taskId, completed) {
  const newStatus = completed ? 'completed' : 'pending';
  try {
    const res = await fetch(`/api/syllabus/event/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.ok) {
      // Refresh the task list
      loadStudyTasks();
    } else {
      alert('Failed to update task: ' + (data.message || 'Unknown error'));
      // Revert checkbox
      const checkbox = document.getElementById(`task-check-${taskId}`);
      if (checkbox) checkbox.checked = !completed;
    }
  } catch (error) {
    console.error('Failed to toggle task:', error);
    alert('Failed to update task');
    const checkbox = document.getElementById(`task-check-${taskId}`);
    if (checkbox) checkbox.checked = !completed;
  }
}

// Study tasks filter and refresh
const studyTasksFilter = document.getElementById('study-tasks-filter');
const btnRefreshStudyTasks = document.getElementById('btn-refresh-study-tasks');

if (studyTasksFilter) studyTasksFilter.addEventListener('change', loadStudyTasks);
if (btnRefreshStudyTasks) btnRefreshStudyTasks.addEventListener('click', loadStudyTasks);

// Calendar navigation
const btnPrev = document.getElementById('btn-calendar-prev');
const btnNext = document.getElementById('btn-calendar-next');
const btnRefresh = document.getElementById('btn-refresh-calendar');
const filterCourse = document.getElementById('calendar-filter-course');
const filterType = document.getElementById('calendar-filter-type');
const viewRange = document.getElementById('calendar-view-range');

if (btnPrev) btnPrev.addEventListener('click', () => {
  const viewRange = document.getElementById('calendar-view-range')?.value || 'month';
  if (viewRange === 'week') {
    currentCalendarDate.setDate(currentCalendarDate.getDate() - 7);
  } else if (viewRange === 'day') {
    currentCalendarDate.setDate(currentCalendarDate.getDate() - 1);
  } else {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
  }
  loadCalendar();
});

if (btnNext) btnNext.addEventListener('click', () => {
  const viewRange = document.getElementById('calendar-view-range')?.value || 'month';
  if (viewRange === 'week') {
    currentCalendarDate.setDate(currentCalendarDate.getDate() + 7);
  } else if (viewRange === 'day') {
    currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
  } else {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
  }
  loadCalendar();
});

if (btnRefresh) btnRefresh.addEventListener('click', () => {
  loadCalendar();
});

if (filterCourse) filterCourse.addEventListener('change', () => {
  loadCalendar();
});

if (filterType) filterType.addEventListener('change', () => {
  loadCalendar();
});

if (viewRange) viewRange.addEventListener('change', () => {
  loadCalendar();
});

// Syllabus view toggle
if (btnViewCalendar) btnViewCalendar.addEventListener('click', () => setSyllabusView('calendar'));
if (btnViewList) btnViewList.addEventListener('click', () => setSyllabusView('list'));

// Syllabus list filters
if (btnRefreshSyllabusList) btnRefreshSyllabusList.addEventListener('click', renderSyllabusList);
if (syllabusListCourse) syllabusListCourse.addEventListener('change', renderSyllabusList);
if (syllabusListType) syllabusListType.addEventListener('change', renderSyllabusList);
if (syllabusListSearch) syllabusListSearch.addEventListener('input', () => {
  // Debounce lightly
  clearTimeout(window._syllabusSearchTimer);
  window._syllabusSearchTimer = setTimeout(renderSyllabusList, 150);
});
if (btnListCollapse) btnListCollapse.addEventListener('click', collapseAllWeekSections);
if (btnListExpand) btnListExpand.addEventListener('click', expandAllWeekSections);

// Week selector controls
const listStartWeekSelect = document.getElementById('list-start-week');
const listWeekCountSelect = document.getElementById('list-week-count');
const btnListPrevWeek = document.getElementById('btn-list-prev-week');
const btnListNextWeek = document.getElementById('btn-list-next-week');

if (listStartWeekSelect) {
  listStartWeekSelect.addEventListener('change', () => {
    listStartWeek = parseInt(listStartWeekSelect.value, 10);
    renderSyllabusList();
  });
}

if (listWeekCountSelect) {
  listWeekCountSelect.addEventListener('change', () => {
    const val = listWeekCountSelect.value;
    listWeekCount = val === 'all' ? 'all' : parseInt(val, 10);
    renderSyllabusList();
  });
}

if (btnListPrevWeek) {
  btnListPrevWeek.addEventListener('click', () => {
    if (listStartWeek > 1) {
      listStartWeek--;
      if (listStartWeekSelect) listStartWeekSelect.value = listStartWeek;
      renderSyllabusList();
    }
  });
}

if (btnListNextWeek) {
  btnListNextWeek.addEventListener('click', () => {
    if (listStartWeek < 20) {
      listStartWeek++;
      if (listStartWeekSelect) listStartWeekSelect.value = listStartWeek;
      renderSyllabusList();
    }
  });
}

// Course sorting/deduping controls
if (courseSortMode) {
  courseSortMode.addEventListener('change', () => {
    refreshCourseSelectors();
    renderSyllabusList();
    if (syllabusViewMode === 'calendar') loadCalendar();
  });
}

if (courseDedupToggle) {
  courseDedupToggle.addEventListener('change', () => {
    refreshCourseSelectors();
    renderSyllabusList();
    if (syllabusViewMode === 'calendar') loadCalendar();
  });
}

// Initialize week selector when switching to list view
const origSetSyllabusView = typeof setSyllabusView === 'function' ? setSyllabusView : null;
if (origSetSyllabusView) {
  // Populate week selector on page load
  populateWeekSelector();
}

function getSortedDedupedCourses(forceIds = []) {
  let courses = Array.isArray(allCourses) ? [...allCourses] : [];
  const dedupe = courseDedupToggle?.checked;
  if (dedupe) {
    const seen = new Set();
    courses = courses.filter(c => {
      const key = `${(c.code || '').toLowerCase()}|${(c.term || '').toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Ensure forced ids remain even if deduped away
  forceIds.forEach(fid => {
    if (!courses.find(c => c.id === fid)) {
      const found = allCourses.find(c => c.id === fid);
      if (found) courses.push(found);
    }
  });

  const mode = courseSortMode?.value || 'term';
  if (mode === 'name') {
    courses.sort((a, b) => {
      const nameCmp = (a.name || '').localeCompare(b.name || '');
      if (nameCmp !== 0) return nameCmp;
      return (a.code || '').localeCompare(b.code || '');
    });
  } else {
    courses.sort((a, b) => {
      const termCmp = (b.term || '').localeCompare(a.term || '');
      if (termCmp !== 0) return termCmp;
      return (a.name || '').localeCompare(b.name || '');
    });
  }
  return courses;
}

function buildCourseOptions(courses, includeEmpty = true, emptyLabel = 'All Courses') {
  let html = includeEmpty ? `<option value="">${emptyLabel}</option>` : '';
  html += courses.map((c, idx) => {
    const color = getCourseColor(c, idx);
    return `<option value="${c.id}" style="border-left: 4px solid ${color};">â— ${c.code || c.name}${c.term ? ' (' + c.term + ')' : ''}</option>`;
  }).join('');
  return html;
}

function refreshCourseSelectors(forceIds = []) {
  const visible = getSortedDedupedCourses(forceIds);

  const calendarSelect = document.getElementById('calendar-filter-course');
  if (calendarSelect) {
    const prev = calendarSelect.value;
    calendarSelect.innerHTML = buildCourseOptions(visible, true, 'All Courses');
    if (prev) calendarSelect.value = prev;
  }

  const planCourseSelect = document.getElementById('plan-session-course');
  if (planCourseSelect) {
    const prev = planCourseSelect.value;
    planCourseSelect.innerHTML = buildCourseOptions(visible, true, 'Optional');
    if (prev) planCourseSelect.value = prev;
  }

  if (syllabusListCourse) {
    const prev = syllabusListCourse.value;
    syllabusListCourse.innerHTML = buildCourseOptions(visible, true, 'All Courses');
    if (prev) syllabusListCourse.value = prev;
  }

  const editCourseSelect = document.getElementById('edit-event-course');
  if (editCourseSelect) {
    const prev = editCourseSelect.value;
    editCourseSelect.innerHTML = buildCourseOptions(visible, true, 'Select course');
    if (prev) editCourseSelect.value = prev;
  }

  renderCourseColorManager();
}

// Load courses for filters with colors
async function loadCoursesForCalendar() {
  try {
    const res = await fetch('/api/syllabus/courses');
    const data = await res.json();
    if (data.courses) {
      allCourses = data.courses;
      refreshCourseSelectors();
    }
  } catch (error) {
    console.error('Failed to load courses:', error);
  }
}

// Update course color
async function updateCourseColor(courseId, newColor) {
  try {
    const res = await fetch(`/api/syllabus/course/${courseId}/color`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color: newColor })
    });
    const data = await res.json();
    if (data.ok) {
      // Update local state
      const course = allCourses.find(c => c.id === courseId);
      if (course) course.color = newColor;
      // Re-render affected components
      renderCourseColorManager();
      renderSyllabusList();
      if (syllabusViewMode === 'calendar') loadCalendar();
    }
  } catch (error) {
    console.error('Failed to update course color:', error);
  }
}

// Render course color manager
function renderCourseColorManager() {
  const container = document.getElementById('course-color-manager');
  if (!container || !allCourses || allCourses.length === 0) return;

  const visibleCourses = getSortedDedupedCourses();

  container.innerHTML = visibleCourses.map((c, idx) => {
    const color = getCourseColor(c, idx);
    return `
      <div class="course-color-item" style="display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border);">
        <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
          <div class="color-swatch" 
               style="width: 24px; height: 24px; border-radius: 6px; background: ${color}; cursor: pointer; border: 2px solid rgba(255,255,255,0.2);"
               onclick="showColorPicker(${c.id}, '${color}')"
               title="Click to change color">
          </div>
          <span style="font-weight: 500;">${c.code || c.name}</span>
          <span style="color: var(--text-muted); font-size: 12px;">${c.name !== c.code ? c.name : ''}</span>
        </div>
        <div style="display: flex; gap: 4px;">
          ${COURSE_COLOR_PALETTE.map(pc => `
            <div class="color-option" 
                 style="width: 16px; height: 16px; border-radius: 4px; background: ${pc}; cursor: pointer; border: ${pc === color ? '2px solid white' : '1px solid rgba(255,255,255,0.1)'};"
                 onclick="updateCourseColor(${c.id}, '${pc}')"
                 title="${pc}">
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// Show color picker modal (for custom colors)
function showColorPicker(courseId, currentColor) {
  const color = prompt(`Enter hex color for this course (current: ${currentColor}):`, currentColor);
  if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) {
    updateCourseColor(courseId, color);
  } else if (color !== null) {
    alert('Invalid color format. Use #RRGGBB (e.g., #3B82F6)');
  }
}

// Add planned session
const btnAddPlanned = document.getElementById('btn-add-planned-session');
if (btnAddPlanned) {
  btnAddPlanned.addEventListener('click', async () => {
    const dateInput = document.getElementById('plan-session-date');
    const minutesInput = document.getElementById('plan-session-minutes');
    const courseSelect = document.getElementById('plan-session-course');
    const statusDiv = document.getElementById('plan-session-status');

    if (!dateInput || !dateInput.value) {
      if (statusDiv) statusDiv.innerHTML = '<div class="upload-status error">Please select a date.</div>';
      return;
    }

    try {
      const res = await fetch('/api/calendar/plan_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_date: dateInput.value,
          planned_minutes: parseInt(minutesInput?.value) || 60,
          course_id: courseSelect?.value ? parseInt(courseSelect.value) : null,
        })
      });
      const data = await res.json();
      if (data.ok) {
        if (statusDiv) statusDiv.innerHTML = '<div class="upload-status success">[OK] Planned session added!</div>';
        if (dateInput) dateInput.value = '';
        if (minutesInput) minutesInput.value = '60';
        if (courseSelect) courseSelect.value = '';
        loadCalendar();
      } else {
        if (statusDiv) statusDiv.innerHTML = `<div class="upload-status error">[ERROR] ${data.message}</div>`;
      }
    } catch (error) {
      if (statusDiv) statusDiv.innerHTML = `<div class="upload-status error">[ERROR] ${error.message}</div>`;
    }
  });
}

// Set today's date as default for plan session date input
const planDateInput = document.getElementById('plan-session-date');
if (planDateInput) {
  planDateInput.value = formatLocalDate(new Date());
}

// Initialize immediately
async function initDashboard() {
  console.log('[Dashboard] Initializing data...');

  // Restore Scholar run state from sessionStorage
  const storedRunId = restoreScholarRunId();
  if (storedRunId) {
    console.log('[Dashboard] Restoring Scholar run:', storedRunId);
    currentRunId = storedRunId;
    // Start polling immediately; checkRunStatus will clear if stale
    if (!runStatusInterval) {
      runStatusInterval = setInterval(() => checkRunStatus(currentRunId), 2000);
      checkRunStatus(currentRunId);
    }
  }

  // Load Data
  loadStats();
  loadTrends();
  loadScholar();
  loadScholarInsights();  // Load Scholar insights for Overview tab
  if (typeof loadApiKeyStatus === 'function') loadApiKeyStatus();

  // Load courses first, then calendar (courses needed for color rendering)
  await loadCoursesForCalendar();
  loadCalendar();

  // Check Hash for initial tab
  const hash = window.location.hash.substring(1);
  if (hash) {
    openTab(null, hash);
  } else {
    // Default to overview if no hash
    // (The HTML already has 'active' class on Overview button and panel, so strictly not needed, 
    // but safe to ensure sync)
    openTab(null, 'overview');
  }

  // Force all sections collapsed after initial data load
  // This ensures any panels opened by data loading are closed
  setTimeout(() => {
    document.querySelectorAll('details.section-panel').forEach(d => d.removeAttribute('open'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, 100);
}


// Chat System for Scholar
window.openScholarChat = function (index, mode = 'clarify', autoSend = false) {
  const panel = document.getElementById(`chat-panel-${index}`);
  const inputEl = document.getElementById(`chat-input-${index}`);
  if (!panel || !inputEl) return;

  chatModes[index] = mode;
  updateChatModeUI(index, mode);
  renderChatHistory(index, mode);

  const history = getChatHistory(index, mode);
  const lastReply = [...history].reverse().find(m => m.role === 'assistant');
  const generatedDiv = document.getElementById(`generated-answer-${index}`);
  const generatedText = document.getElementById(`generated-text-${index}`);
  if (generatedDiv && generatedText) {
    if (lastReply && lastReply.content) {
      generatedText.textContent = lastReply.content;
      generatedDiv.style.display = 'block';
    } else {
      generatedDiv.style.display = 'none';
    }
  }

  panel.style.display = 'block';
  inputEl.focus();

  if (autoSend) {
    const history = getChatHistory(index, mode);
    const scholarQuestion = (currentScholarQuestions[index] || '').trim();
    if (history.length === 0 && scholarQuestion) {
      inputEl.value = scholarQuestion;
      window.sendChatMessage(index);
    }
  }
};

window.toggleChat = function (index) {
  const panel = document.getElementById(`chat-panel-${index}`);
  if (!panel) return;
  if (panel.style.display === 'none' || panel.style.display === '') {
    window.openScholarChat(index, chatModes[index] || 'clarify', false);
  } else {
    panel.style.display = 'none';
  }
};

window.setChatMode = function (index, mode) {
  chatModes[index] = mode;
  updateChatModeUI(index, mode);
  renderChatHistory(index, mode);
  const inputEl = document.getElementById(`chat-input-${index}`);
  if (inputEl) inputEl.focus();
};

// Store chat history with localStorage persistence
const chatHistories = {}; // index -> { clarify: [{role, content}], generate: [{role, content}] }
const chatModes = {}; // index -> 'clarify' | 'generate'
// Simplified chat history per question (unified, no modes)
const scholarChatHistories = {}; // index -> [{role, content}]

// Simplified Scholar question chat function
window.askScholarQuestion = async function (index) {
  const inputEl = document.getElementById(`chat-input-${index}`);
  const responseEl = document.getElementById(`chat-response-${index}`);
  const askBtn = document.getElementById(`btn-ask-${index}`);
  if (!inputEl || !responseEl) return;

  const userMessage = inputEl.value.trim();
  if (!userMessage) return;

  const scholarQuestion = (currentScholarQuestions[index] || '').trim();

  // Initialize history for this question if needed
  if (!scholarChatHistories[index]) {
    scholarChatHistories[index] = [];
  }
  const history = scholarChatHistories[index];

  // Clear placeholder if this is first message
  if (history.length === 0) {
    responseEl.innerHTML = '';
  }

  // Add user message to UI and history
  history.push({ role: 'user', content: userMessage });
  const userDiv = document.createElement('div');
  userDiv.style.cssText = "align-self: flex-end; background: var(--accent); color: #fff; padding: 8px 12px; border-radius: 12px 12px 4px 12px; max-width: 85%; font-size: 13px;";
  userDiv.textContent = userMessage;
  responseEl.appendChild(userDiv);

  // Clear input and disable while loading
  inputEl.value = '';
  inputEl.disabled = true;
  if (askBtn) askBtn.disabled = true;

  // Show loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.style.cssText = "align-self: flex-start; color: var(--text-muted); font-size: 12px; padding: 8px;";
  loadingDiv.textContent = '<i class="fas fa-spinner fa-spin"></i> Thinking...';
  responseEl.appendChild(loadingDiv);
  responseEl.scrollTop = responseEl.scrollHeight;

  try {
    const res = await fetch('/api/scholar/questions/clarify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scholar_question: scholarQuestion,
        clarifying_question: userMessage,
        messages: history
      })
    });
    const data = await res.json();

    // Remove loading indicator
    responseEl.removeChild(loadingDiv);

    if (data.ok) {
      const answer = data.clarification || data.answer || 'No response received.';
      history.push({ role: 'assistant', content: answer });

      const aiDiv = document.createElement('div');
      aiDiv.style.cssText = "align-self: flex-start; background: var(--bg-alt, #1e293b); border: 1px solid var(--border); padding: 8px 12px; border-radius: 12px 12px 12px 4px; max-width: 85%; font-size: 13px; white-space: pre-wrap;";
      aiDiv.textContent = answer;
      responseEl.appendChild(aiDiv);
    } else {
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = "align-self: flex-start; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 8px 12px; border-radius: 8px; max-width: 85%; font-size: 12px;";
      errorDiv.textContent = 'âŒ ' + (data.message || 'Failed to get response');
      responseEl.appendChild(errorDiv);
    }
  } catch (error) {
    responseEl.removeChild(loadingDiv);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = "align-self: flex-start; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 8px 12px; border-radius: 8px; max-width: 85%; font-size: 12px;";
    errorDiv.textContent = 'âŒ Network error: ' + error.message;
    responseEl.appendChild(errorDiv);
  }

  // Re-enable input
  inputEl.disabled = false;
  if (askBtn) askBtn.disabled = false;
  inputEl.focus();
  responseEl.scrollTop = responseEl.scrollHeight;
};

function saveScholarChatHistory(questionIndex, mode, messages) {
  try {
    localStorage.setItem(`scholar_chat_${questionIndex}_${mode}`, JSON.stringify(messages));
  } catch (e) {
    console.warn('Failed to save chat history:', e);
  }
}

function loadScholarChatHistory(questionIndex, mode) {
  try {
    const saved = localStorage.getItem(`scholar_chat_${questionIndex}_${mode}`);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.warn('Failed to load chat history:', e);
    return [];
  }
}

function clearScholarChatHistory(questionIndex, mode) {
  try {
    localStorage.removeItem(`scholar_chat_${questionIndex}_${mode}`);
  } catch (e) {
    console.warn('Failed to clear chat history:', e);
  }
}

window.clearChatAndReset = function (index) {
  const mode = chatModes[index] || 'clarify';
  clearScholarChatHistory(index, mode);
  if (chatHistories[index] && chatHistories[index][mode]) {
    chatHistories[index][mode] = [];
  }
  renderChatHistory(index, mode);
  const generatedDiv = document.getElementById(`generated-answer-${index}`);
  if (generatedDiv) {
    generatedDiv.style.display = 'none';
  }
};

function getChatHistory(index, mode) {
  if (!chatHistories[index]) {
    chatHistories[index] = { clarify: [], generate: [] };
  }
  if (!chatHistories[index][mode]) {
    chatHistories[index][mode] = [];
  }
  // Load from localStorage on first access if empty
  if (chatHistories[index][mode].length === 0) {
    const saved = loadScholarChatHistory(index, mode);
    if (saved.length > 0) {
      chatHistories[index][mode] = saved;
    }
  }
  return chatHistories[index][mode];
}

function updateChatModeUI(index, mode) {
  const clarifyBtn = document.getElementById(`chat-mode-clarify-${index}`);
  const generateBtn = document.getElementById(`chat-mode-generate-${index}`);
  if (!clarifyBtn || !generateBtn) return;

  const setActive = (btn) => {
    btn.style.background = 'var(--accent)';
    btn.style.color = '#fff';
    btn.style.borderColor = 'var(--accent)';
  };
  const setInactive = (btn) => {
    btn.style.background = 'var(--card-bg)';
    btn.style.color = 'var(--text-secondary)';
    btn.style.borderColor = 'var(--border)';
  };

  if (mode === 'generate') {
    setActive(generateBtn);
    setInactive(clarifyBtn);
  } else {
    setActive(clarifyBtn);
    setInactive(generateBtn);
  }
}

function renderChatHistory(index, mode) {
  const historyEl = document.getElementById(`chat-history-${index}`);
  if (!historyEl) return;

  historyEl.innerHTML = '';
  const history = getChatHistory(index, mode);
  history.forEach((msg) => {
    const div = document.createElement('div');
    if (msg.role === 'user') {
      div.style.cssText = "align-self: flex-end; background: var(--accent-light); color: var(--accent); padding: 6px 10px; border-radius: 12px 12px 0 12px; max-width: 85%;";
    } else {
      div.style.cssText = "align-self: flex-start; background: var(--bg); border: 1px solid var(--border); padding: 6px 10px; border-radius: 12px 12px 12px 0; max-width: 85%;";
    }
    div.textContent = msg.content;
    historyEl.appendChild(div);
  });
  historyEl.scrollTop = historyEl.scrollHeight;
}

window.sendChatMessage = async function (index) {
  const inputEl = document.getElementById(`chat-input-${index}`);
  const historyEl = document.getElementById(`chat-history-${index}`);
  if (!inputEl || !historyEl) return;
  const msg = inputEl.value.trim();

  if (!msg) return;

  const mode = chatModes[index] || 'clarify';
  const history = getChatHistory(index, mode);
  const scholarQuestion = (currentScholarQuestions[index] || '').trim();

  // Add User Message
  history.push({ role: 'user', content: msg });
  saveScholarChatHistory(index, mode, history);

  // Render user message
  const userDiv = document.createElement('div');
  userDiv.style.cssText = "align-self: flex-end; background: var(--accent-light); color: var(--accent); padding: 6px 10px; border-radius: 12px 12px 0 12px; max-width: 85%;";
  userDiv.textContent = msg;
  historyEl.appendChild(userDiv);

  inputEl.value = '';
  inputEl.disabled = true;

  // Show loading
  const loadingDiv = document.createElement('div');
  loadingDiv.textContent = '...';
  loadingDiv.style.cssText = "align-self: flex-start; color: var(--text-muted); font-size: 10px; margin-left: 4px;";
  historyEl.appendChild(loadingDiv);
  historyEl.scrollTop = historyEl.scrollHeight;

  try {
    const endpoint = mode === 'generate'
      ? '/api/scholar/questions/generate'
      : '/api/scholar/questions/clarify';
    const payload = mode === 'generate'
      ? {
        question: msg,
        context: scholarQuestion ? `Primary Scholar Question: ${scholarQuestion}` : '',
        messages: history
      }
      : {
        scholar_question: scholarQuestion,
        clarifying_question: msg, // Legacy
        messages: history
      };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    historyEl.removeChild(loadingDiv); // Remove loading

    if (data.ok) {
      const answer = data.answer || data.clarification || '';
      history.push({ role: 'assistant', content: answer });
      saveScholarChatHistory(index, mode, history);

      const aiDiv = document.createElement('div');
      aiDiv.style.cssText = "align-self: flex-start; background: var(--bg); border: 1px solid var(--border); padding: 6px 10px; border-radius: 12px 12px 12px 0; max-width: 85%;";
      aiDiv.textContent = answer;
      historyEl.appendChild(aiDiv);

      const generatedDiv = document.getElementById(`generated-answer-${index}`);
      const generatedText = document.getElementById(`generated-text-${index}`);
      if (generatedDiv && generatedText && answer) {
        generatedText.textContent = answer;
        generatedDiv.style.display = 'block';
      }
    } else {
      alert('Error: ' + data.message);
    }
  } catch (e) {
    historyEl.removeChild(loadingDiv);
    alert('Network error: ' + e.message);
  } finally {
    inputEl.disabled = false;
    inputEl.focus();
    historyEl.scrollTop = historyEl.scrollHeight;
  }
};

// ============================================
// BRAIN TAB FUNCTIONS
// ============================================

async function loadBrainStatus() {
  try {
    const resp = await fetch('/api/brain/status');
    const data = await resp.json();
    if (data.ok) {
      document.getElementById('brain-session-count').textContent = data.stats.sessions;
      document.getElementById('brain-event-count').textContent = data.stats.events;
      document.getElementById('brain-rag-count').textContent = data.stats.rag_documents;
      document.getElementById('brain-pending-cards').textContent = data.stats.pending_cards;
      document.getElementById('brain-db-size').textContent = data.stats.db_size_mb;
    }
  } catch (err) {
    console.error('Error loading brain status:', err);
  }
}

async function loadBrainMastery() {
  try {
    const resp = await fetch('/api/mastery');
    const data = await resp.json();
    const container = document.getElementById('brain-mastery-list');
    if (data.mastery && data.mastery.length > 0) {
      container.innerHTML = data.mastery.map(m =>
        `<div class="mastery-item" style="padding: 8px 0; border-bottom: 1px solid var(--border);">
          <strong style="color: var(--text-primary);">${m.topic}</strong>: 
          <span style="color: ${m.level === 'Strong' ? 'var(--success)' : m.level === 'Weak' ? 'var(--error)' : 'var(--text-secondary)'};">${m.level}</span> 
          <span style="color: var(--text-muted);">(${m.sessions} sessions)</span>
        </div>`
      ).join('');
    } else {
      container.innerHTML = '<p style="color: var(--text-muted);">No mastery data yet. Complete study sessions to build mastery.</p>';
    }
  } catch (err) {
    document.getElementById('brain-mastery-list').innerHTML = '<p style="color: var(--error);">Error loading mastery data.</p>';
  }
}

function loadBrain() {
  loadBrainStatus();
  loadBrainMastery();
  loadAnkiPendingCount();
}

// ============================================
// ANKI CARD MANAGEMENT FUNCTIONS
// ============================================

// Track Anki connection status
let ankiConnected = false;

/**
 * Check if Anki is connected via AnkiConnect and update status indicator.
 */
async function loadAnkiStatus() {
  const statusEl = document.getElementById('anki-status');
  const statusText = document.getElementById('anki-status-text');
  const syncBtn = document.getElementById('anki-sync-btn');

  if (!statusEl) return;

  try {
    // Try to check if anki sync endpoint is reachable
    const resp = await fetch('/api/cards/drafts/pending');
    const data = await resp.json();

    if (data.ok) {
      ankiConnected = true;
      statusEl.className = 'status-indicator connected';
      if (statusText) statusText.textContent = 'Ready';
      if (syncBtn) syncBtn.disabled = false;
    } else {
      ankiConnected = false;
      statusEl.className = 'status-indicator disconnected';
      if (statusText) statusText.textContent = 'Error';
      if (syncBtn) syncBtn.disabled = true;
    }
  } catch (err) {
    ankiConnected = false;
    statusEl.className = 'status-indicator disconnected';
    if (statusText) statusText.textContent = 'Disconnected';
    if (syncBtn) syncBtn.disabled = true;
    console.warn('Anki status check failed:', err);
  }
}

/**
 * Load pending card count and update badge.
 */
async function loadAnkiPendingCount() {
  const badge = document.getElementById('anki-pending-count');
  if (!badge) return;

  try {
    const resp = await fetch('/api/cards/drafts/pending');
    const data = await resp.json();

    if (data.ok) {
      const count = data.pending_count || 0;
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  } catch (err) {
    console.warn('Failed to load pending count:', err);
    badge.style.display = 'none';
  }
}

/**
 * Fetch card drafts from API and render in table.
 */
async function loadAnkiDrafts(statusFilter = '') {
  const tbody = document.getElementById('anki-drafts-body');
  const emptyMsg = document.getElementById('anki-drafts-empty');
  const statusEl = document.getElementById('anki-drafts-status');

  if (!tbody) return;

  // Show loading state
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">Loading drafts...</td></tr>';
  if (emptyMsg) emptyMsg.style.display = 'none';

  try {
    let url = '/api/cards/drafts?limit=100';
    if (statusFilter) {
      url += `&status=${encodeURIComponent(statusFilter)}`;
    }

    const resp = await fetch(url);
    const data = await resp.json();

    if (!data.ok) {
      throw new Error(data.message || 'Failed to load drafts');
    }

    const drafts = data.drafts || [];

    if (drafts.length === 0) {
      tbody.innerHTML = '';
      if (emptyMsg) {
        emptyMsg.style.display = 'block';
        emptyMsg.textContent = statusFilter
          ? `No ${statusFilter} cards found.`
          : 'No card drafts yet. Create cards from Tutor sessions or use the form below.';
      }
      return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';

    tbody.innerHTML = drafts.map(draft => {
      const frontPreview = (draft.front || '').substring(0, 60) + ((draft.front || '').length > 60 ? '...' : '');
      const backPreview = (draft.back || '').substring(0, 60) + ((draft.back || '').length > 60 ? '...' : '');

      const statusClass = {
        'pending': 'badge-warning',
        'approved': 'badge-success',
        'rejected': 'badge-error',
        'synced': 'badge-info'
      }[draft.status] || 'badge-default';

      const actionButtons = draft.status === 'pending'
        ? `<button class="btn btn-sm btn-success" onclick="approveCard(${draft.id})" title="Approve"><i class="fas fa-check"></i></button>
           <button class="btn btn-sm btn-error" onclick="rejectCard(${draft.id})" title="Reject">âœ—</button>`
        : draft.status === 'approved'
          ? `<button class="btn btn-sm" onclick="rejectCard(${draft.id})" title="Reject">âœ—</button>`
          : '';

      return `<tr data-card-id="${draft.id}">
        <td style="max-width: 200px;" title="${(draft.front || '').replace(/"/g, '&quot;')}">${frontPreview}</td>
        <td style="max-width: 200px;" title="${(draft.back || '').replace(/"/g, '&quot;')}">${backPreview}</td>
        <td><span class="badge ${statusClass}">${draft.status}</span></td>
        <td>${draft.deck_name || 'Default'}</td>
        <td class="actions-cell">${actionButtons}</td>
      </tr>`;
    }).join('');

    // Update status
    if (statusEl) {
      statusEl.textContent = `Showing ${drafts.length} drafts`;
    }

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--error);">Error: ${err.message}</td></tr>`;
    console.error('Failed to load Anki drafts:', err);
  }
}

/**
 * Approve a card draft (PATCH to update status).
 */
async function approveCard(cardId) {
  try {
    const resp = await fetch(`/api/cards/drafts/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' })
    });

    const data = await resp.json();

    if (data.ok) {
      showStatus('anki-drafts-status', 'Card approved!', 'success');
      loadAnkiDrafts();
      loadAnkiPendingCount();
    } else {
      showStatus('anki-drafts-status', `Error: ${data.message}`, 'error');
    }
  } catch (err) {
    showStatus('anki-drafts-status', `Error: ${err.message}`, 'error');
    console.error('Failed to approve card:', err);
  }
}

/**
 * Reject a card draft (PATCH to update status).
 */
async function rejectCard(cardId) {
  if (!confirm('Reject this card draft? It will not be synced to Anki.')) {
    return;
  }

  try {
    const resp = await fetch(`/api/cards/drafts/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' })
    });

    const data = await resp.json();

    if (data.ok) {
      showStatus('anki-drafts-status', 'Card rejected.', 'warning');
      loadAnkiDrafts();
      loadAnkiPendingCount();
    } else {
      showStatus('anki-drafts-status', `Error: ${data.message}`, 'error');
    }
  } catch (err) {
    showStatus('anki-drafts-status', `Error: ${err.message}`, 'error');
    console.error('Failed to reject card:', err);
  }
}

/**
 * Sync approved cards to Anki via AnkiConnect.
 */
async function syncToAnki(dryRun = false) {
  const syncBtn = document.getElementById('anki-sync-btn');
  const statusEl = document.getElementById('anki-sync-status');

  if (syncBtn) {
    syncBtn.disabled = true;
    syncBtn.textContent = dryRun ? 'Previewing...' : 'Syncing...';
  }

  showStatus('anki-sync-status', dryRun ? 'Checking cards...' : 'Syncing to Anki...', 'info');

  try {
    const resp = await fetch('/api/cards/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dry_run: dryRun })
    });

    const data = await resp.json();

    if (data.ok) {
      const syncedCount = data.synced_count || 0;
      const errors = data.errors || [];

      if (dryRun) {
        showStatus('anki-sync-status', `Preview: ${syncedCount} cards ready to sync`, 'info');
      } else if (syncedCount > 0) {
        showStatus('anki-sync-status', `<i class="fas fa-check"></i> Synced ${syncedCount} cards to Anki!`, 'success');
        loadAnkiDrafts();
        loadAnkiPendingCount();
        loadBrainStatus();
      } else if (errors.length > 0) {
        showStatus('anki-sync-status', `<i class="fas fa-exclamation-triangle"></i> Sync completed with errors: ${errors.join(', ')}`, 'warning');
      } else {
        showStatus('anki-sync-status', 'No approved cards to sync.', 'info');
      }
    } else {
      showStatus('anki-sync-status', `Error: ${data.message}`, 'error');
    }
  } catch (err) {
    showStatus('anki-sync-status', `Error: ${err.message}`, 'error');
    console.error('Failed to sync to Anki:', err);
  } finally {
    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.textContent = 'Sync to Anki';
    }
  }
}

/**
 * Handle new card draft form submission.
 */
async function createCardDraft(event) {
  if (event) event.preventDefault();

  const form = document.getElementById('anki-create-form');
  if (!form) return;

  const frontEl = document.getElementById('anki-card-front');
  const backEl = document.getElementById('anki-card-back');
  const typeEl = document.getElementById('anki-card-type');
  const deckEl = document.getElementById('anki-card-deck');
  const courseEl = document.getElementById('anki-card-course');
  const tagsEl = document.getElementById('anki-card-tags');

  const front = (frontEl?.value || '').trim();
  const back = (backEl?.value || '').trim();
  const cardType = typeEl?.value || 'basic';
  const deckName = (deckEl?.value || '').trim() || 'PT Study::Default';
  const courseId = courseEl?.value ? parseInt(courseEl.value) : null;
  const tags = (tagsEl?.value || '').trim();

  if (!front || !back) {
    showStatus('anki-create-status', 'Front and Back are required.', 'error');
    return;
  }

  showStatus('anki-create-status', 'Creating card draft...', 'info');

  try {
    const payload = {
      front,
      back,
      card_type: cardType,
      deck_name: deckName,
      tags
    };
    if (courseId) payload.course_id = courseId;

    const resp = await fetch('/api/cards/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();

    if (data.ok) {
      showStatus('anki-create-status', `<i class="fas fa-check"></i> Card draft created (ID: ${data.card_id})`, 'success');
      // Clear form
      if (frontEl) frontEl.value = '';
      if (backEl) backEl.value = '';
      if (tagsEl) tagsEl.value = '';
      // Refresh lists
      loadAnkiDrafts();
      loadAnkiPendingCount();
    } else {
      showStatus('anki-create-status', `Error: ${data.message}`, 'error');
    }
  } catch (err) {
    showStatus('anki-create-status', `Error: ${err.message}`, 'error');
    console.error('Failed to create card draft:', err);
  }
}

/**
 * Filter drafts by status using dropdown.
 */
function filterAnkiDrafts() {
  const filterEl = document.getElementById('anki-filter-status');
  const status = filterEl?.value || '';
  loadAnkiDrafts(status);
}

/**
 * Initialize Anki section event listeners.
 */
function initAnkiSection() {
  // Form submission
  const form = document.getElementById('anki-create-form');
  if (form) {
    form.addEventListener('submit', createCardDraft);
  }

  // Sync button
  const syncBtn = document.getElementById('anki-sync-btn');
  if (syncBtn) {
    syncBtn.addEventListener('click', () => syncToAnki(false));
  }

  // Preview sync button
  const previewBtn = document.getElementById('anki-preview-btn');
  if (previewBtn) {
    previewBtn.addEventListener('click', () => syncToAnki(true));
  }

  // Filter dropdown
  const filterEl = document.getElementById('anki-filter-status');
  if (filterEl) {
    filterEl.addEventListener('change', filterAnkiDrafts);
  }

  // Refresh button
  const refreshBtn = document.getElementById('anki-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadAnkiStatus();
      loadAnkiDrafts();
      loadAnkiPendingCount();
    });
  }

  // Observe when Anki section becomes visible (for lazy loading)
  const ankiSection = document.getElementById('anki-cards-section');
  if (ankiSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadAnkiStatus();
          loadAnkiDrafts();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    observer.observe(ankiSection);
  }
}

// Initialize Anki section on DOM ready
document.addEventListener('DOMContentLoaded', initAnkiSection);

// ============================================
// SCHOLAR DIGEST SAVE FUNCTION
// ============================================

async function saveStrategicDigest() {
  const digestEl = document.getElementById('scholar-digest-text');
  if (!digestEl) {
    alert('No digest content found. Please generate a digest first.');
    return;
  }
  const content = digestEl.innerText || digestEl.textContent;
  if (!content.trim()) {
    alert('Digest is empty. Please generate a digest first.');
    return;
  }

  try {
    const resp = await fetch('/api/scholar/digest/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ digest: content })
    });
    const data = await resp.json();
    if (data.ok) {
      alert('Digest saved to: ' + data.file);
      // Refresh the saved digests list
      if (typeof loadSavedDigests === 'function') {
        loadSavedDigests();
      }
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    alert('Error saving digest: ' + err.message);
  }
}

// ============================================
// SAVED DIGESTS FUNCTIONS
// ============================================

async function loadSavedDigests() {
  const listContainer = document.getElementById('saved-digests-list');
  const countEl = document.getElementById('saved-digests-count');

  if (!listContainer) return;

  listContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Loading saved digests...</div>';

  try {
    const res = await fetch('/api/scholar/digests');
    const data = await res.json();

    if (!data.ok) {
      listContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Failed to load digests.</div>';
      return;
    }

    const digests = data.digests || [];
    if (countEl) {
      countEl.textContent = `(${digests.length})`;
    }

    if (digests.length === 0) {
      listContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No saved digests yet. Generate and save a digest to see it here.</div>';
      return;
    }

    // Render digests as a table
    listContainer.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); text-align: left;">
            <th style="padding: 8px 12px; color: var(--text-muted); font-weight: 600;">Title</th>
            <th style="padding: 8px 12px; color: var(--text-muted); font-weight: 600; width: 100px;">Type</th>
            <th style="padding: 8px 12px; color: var(--text-muted); font-weight: 600; width: 140px;">Date</th>
            <th style="padding: 8px 12px; color: var(--text-muted); font-weight: 600; width: 100px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${digests.map(d => {
      const date = d.created_at ? new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown';
      const typeLabel = d.digest_type === 'strategic' ? 'ðŸ§  Strategic' : d.digest_type || 'Other';
      return `
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 10px 12px;">
                  <div style="color: var(--text-primary); font-weight: 500; cursor: pointer;" onclick="viewDigest(${d.id})">${escapeHtml(d.title || 'Untitled')}</div>
                  <div style="color: var(--text-muted); font-size: 11px; font-family: monospace;">${escapeHtml(d.filename || '')}</div>
                </td>
                <td style="padding: 10px 12px; color: var(--text-secondary);">${typeLabel}</td>
                <td style="padding: 10px 12px; color: var(--text-secondary);">${date}</td>
                <td style="padding: 10px 12px;">
                  <div style="display: flex; gap: 4px;">
                    <button class="btn" style="font-size: 11px; padding: 4px 8px;" onclick="viewDigest(${d.id})">View</button>
                    <button class="btn" style="font-size: 11px; padding: 4px 8px; color: #ef4444;" onclick="deleteDigest(${d.id}, '${escapeHtml(d.title || 'this digest')}')">Delete</button>
                  </div>
                </td>
              </tr>
            `;
    }).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('Failed to load saved digests:', err);
    listContainer.innerHTML = '<div style="color: #ef4444; font-size: 13px;">Error loading digests.</div>';
  }
}

async function viewDigest(digestId) {
  const modal = document.getElementById('digest-viewer-modal');
  const titleEl = document.getElementById('digest-viewer-title');
  const contentEl = document.getElementById('digest-viewer-content');

  if (!modal || !titleEl || !contentEl) {
    alert('Digest viewer not available');
    return;
  }

  // Show modal with loading state
  modal.style.display = 'flex';
  titleEl.textContent = 'Loading...';
  contentEl.textContent = 'Loading digest content...';

  try {
    const res = await fetch(`/api/scholar/digests/${digestId}`);
    const data = await res.json();

    if (!data.ok) {
      titleEl.textContent = 'Error';
      contentEl.textContent = data.message || 'Failed to load digest.';
      return;
    }

    const digest = data.digest;
    titleEl.textContent = digest.title || 'Untitled Digest';
    contentEl.textContent = digest.content || '(No content)';
  } catch (err) {
    console.error('Failed to view digest:', err);
    titleEl.textContent = 'Error';
    contentEl.textContent = 'Failed to load digest: ' + err.message;
  }
}

function closeDigestViewer() {
  const modal = document.getElementById('digest-viewer-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function deleteDigest(digestId, title) {
  if (!confirm(`Are you sure you want to delete "${title}"? This will remove the file from disk.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/scholar/digests/${digestId}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (data.ok) {
      // Refresh the list
      loadSavedDigests();
    } else {
      alert('Failed to delete: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('Failed to delete digest:', err);
    alert('Failed to delete digest: ' + err.message);
  }
}

// Close modal when clicking outside
document.addEventListener('click', function (e) {
  const modal = document.getElementById('digest-viewer-modal');
  if (modal && e.target === modal) {
    closeDigestViewer();
  }
});

// Close modal with Escape key
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeDigestViewer();
  }
});

// Missing Function: loadSyllabusDashboard
window.loadSyllabusDashboard = async function () {
  console.log("Loading Syllabus Dashboard...");
  try {
    // Load Study Tasks first (most visible section)
    if (typeof loadStudyTasks === 'function') {
      loadStudyTasks();
    }

    // Courses
    const resCourses = await fetch('/api/syllabus/courses');
    const coursesData = await resCourses.json();
    if (coursesData.courses) {
      allCourses = coursesData.courses;
      refreshCourseSelectors();
    }

    // Events for list view
    const resEvents = await fetch('/api/syllabus/events');
    const eventsData = await resEvents.json();
    if (eventsData.ok) {
      syllabusEvents = (eventsData.events || []).map(ev => {
        const course = allCourses.find(c => c.id === ev.course_id) || {};
        return { ...ev, course };
      });
      renderSyllabusList();
    }

    // Ensure calendar data is loaded
    loadCalendar();
  } catch (e) {
    console.error("Failed to load syllabus dashboard:", e);
  }
};

// Run immediately
console.log("%c Dashboard JS v2.1 LOADED ", "background: #22c55e; color: #ffffff; font-size: 20px; font-weight: bold;");
initDashboard();

document.addEventListener('DOMContentLoaded', () => {
  // 1. Progress Ring Helper
  const circle = document.getElementById('progress-circle');
  // Circumference = 2 * PI * r (r=26)  163.36
  const circumference = 163.36;

  function setScore(percent) {
    if (!circle) return;
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    const label = document.getElementById('avg-score');
    if (label) label.textContent = `${percent}%`;
  }

  // Test Init (remove if you load real data immediately)
  setScore(0);

  // 2. Chart.js Init - Store globally for updates from API
  const ctx = document.getElementById('modeChart');
  if (ctx) {
    modeChartInstance = new Chart(ctx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Loading...'],
        datasets: [{
          data: [100],
          backgroundColor: ['#2D3340'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: { legend: { display: false } }
      }
    });
  }

  // 3. Upload Click Trigger
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
  }

  // 4. Load sync status on page load
  loadSyncStatus();
});

/* ===== Sync/Ingestion Management ===== */
async function loadSyncStatus() {
  try {
    const resp = await fetch('/api/sync/status');
    if (!resp.ok) {
      console.warn('Sync status endpoint not available');
      return;
    }
    const data = await resp.json();
    const filesEl = document.getElementById('sync-files-count');
    const sessionsEl = document.getElementById('sync-sessions-count');
    const timeEl = document.getElementById('sync-last-time');

    if (filesEl) filesEl.textContent = data.files_tracked || 0;
    if (sessionsEl) sessionsEl.textContent = data.valid_sessions || 0;
    if (timeEl) timeEl.textContent = data.last_sync || 'Never';
  } catch (e) {
    console.warn('Failed to load sync status:', e);
  }
}

async function runSync(force = false) {
  const msgEl = document.getElementById('sync-message');
  if (!msgEl) return;

  msgEl.textContent = force ? 'Force re-syncing all files...' : 'Syncing...';
  msgEl.style.color = 'var(--text-muted)';

  try {
    const resp = await fetch('/api/sync/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: force })
    });
    const data = await resp.json();

    if (data.ok) {
      msgEl.textContent = `<i class="fas fa-check"></i> Done: ${data.ingested || 0} ingested, ${data.skipped || 0} skipped`;
      msgEl.style.color = 'var(--success)';
      // Refresh status and stats
      loadSyncStatus();
      if (typeof loadStats === 'function') loadStats();
      if (typeof loadOverviewData === 'function') loadOverviewData();
      if (typeof loadBrainStatus === 'function') loadBrainStatus();
    } else {
      msgEl.textContent = 'âœ— Error: ' + (data.error || 'Unknown error');
      msgEl.style.color = 'var(--error)';
    }
  } catch (e) {
    msgEl.textContent = 'âœ— Network error: ' + e.message;
    msgEl.style.color = 'var(--error)';
  }
}

async function clearSyncTracking() {
  if (!confirm('Clear all ingestion tracking? This will cause all files to be re-processed on next sync.')) {
    return;
  }

  try {
    const resp = await fetch('/api/sync/clear-tracking', { method: 'POST' });
    const data = await resp.json();
    if (data.ok) {
      alert('Tracking cleared. Run sync to re-ingest all files.');
      loadSyncStatus();
    } else {
      alert('Error: ' + (data.error || 'Unknown'));
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}


// ============================================================================
// GOOGLE CALENDAR INTEGRATION
// ============================================================================

let gcalCalendars = [];
let gcalConfig = { selectedIds: [], defaultCalendarId: 'primary', syncAll: false };

function getCalendarLabel(calendarId) {
  if (!calendarId) return 'Primary';
  const calendar = gcalCalendars.find(cal => cal.id === calendarId);
  if (calendar?.summary) return calendar.summary;
  return calendarId === 'primary' ? 'Primary' : calendarId;
}

function refreshEventCalendarSelect(selectedId) {
  const select = document.getElementById('edit-event-calendar');
  if (!select) return;

  const defaultLabel = getCalendarLabel(gcalConfig.defaultCalendarId || 'primary');
  let options = `<option value="">Default (${defaultLabel})</option>`;
  gcalCalendars.forEach(cal => {
    if (!cal.id) return;
    const suffix = cal.primary ? ' (Primary)' : '';
    options += `<option value="${cal.id}">${cal.summary || cal.id}${suffix}</option>`;
  });
  select.innerHTML = options;

  if (selectedId) {
    select.value = selectedId;
  }
}

function updateGCalWarning(syncAll) {
  const warningEl = document.getElementById('gcal-calendar-warning');
  if (!warningEl) return;
  warningEl.style.display = syncAll ? 'block' : 'none';
}

function renderGCalCalendarList() {
  const listEl = document.getElementById('gcal-calendar-list');
  const defaultSelect = document.getElementById('gcal-default-calendar');
  const syncAllToggle = document.getElementById('gcal-sync-all');

  if (!listEl || !defaultSelect) return;

  if (!gcalCalendars.length) {
    listEl.textContent = 'No calendars found.';
    return;
  }

  const syncAll = gcalConfig.syncAll;
  if (syncAllToggle) {
    syncAllToggle.checked = syncAll;
  }

  listEl.innerHTML = gcalCalendars.map(cal => {
    const checked = syncAll || gcalConfig.selectedIds.includes(cal.id);
    const canWrite = ['owner', 'writer'].includes(cal.access_role);
    const suffix = cal.primary ? ' (Primary)' : '';
    const accessLabel = canWrite ? '' : ' (read-only)';
    return `
      <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-secondary);">
        <input type="checkbox" data-calendar-id="${cal.id}" ${checked ? 'checked' : ''} ${syncAll ? 'disabled' : ''}
          style="width: 14px; height: 14px; accent-color: var(--primary);">
        <span>${cal.summary || cal.id}${suffix}${accessLabel}</span>
      </label>
    `;
  }).join('');

  defaultSelect.innerHTML = gcalCalendars.map(cal => {
    const suffix = cal.primary ? ' (Primary)' : '';
    return `<option value="${cal.id}">${cal.summary || cal.id}${suffix}</option>`;
  }).join('');
  if (!gcalCalendars.find(cal => cal.id === gcalConfig.defaultCalendarId) && gcalCalendars.length) {
    gcalConfig.defaultCalendarId = gcalCalendars[0].id;
  }
  defaultSelect.value = gcalConfig.defaultCalendarId || 'primary';

  updateGCalWarning(syncAll);
  refreshEventCalendarSelect();
}

function getSelectedCalendarIdsFromUI() {
  const listEl = document.getElementById('gcal-calendar-list');
  if (!listEl) return [];
  return Array.from(listEl.querySelectorAll('input[data-calendar-id]'))
    .filter(input => input.checked)
    .map(input => input.getAttribute('data-calendar-id'))
    .filter(Boolean);
}

async function loadGCalCalendars() {
  const listEl = document.getElementById('gcal-calendar-list');
  if (!listEl) return;

  try {
    listEl.textContent = 'Loading calendars...';
    const response = await fetch('/api/gcal/calendars');
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      console.error('GCal calendars error:', text);
      listEl.textContent = `Failed to load calendars (${response.status})`;
      return;
    }
    const data = await response.json();

    if (!data.ok) {
      listEl.textContent = data.error || 'Failed to load calendars';
      return;
    }

    gcalCalendars = data.calendars || [];
    gcalConfig = {
      selectedIds: data.selected_ids || [],
      defaultCalendarId: data.default_calendar_id || 'primary',
      syncAll: Boolean(data.sync_all)
    };

    renderGCalCalendarList();
  } catch (error) {
    console.error('Failed to load calendars:', error);
    listEl.textContent = 'Failed to load calendars.';
  }
}

async function saveGCalConfig() {
  const statusEl = document.getElementById('gcal-config-status');
  const defaultSelect = document.getElementById('gcal-default-calendar');
  const syncAllToggle = document.getElementById('gcal-sync-all');

  if (!defaultSelect || !statusEl) return;

  const selectedIds = getSelectedCalendarIdsFromUI();
  const defaultCalendarId = defaultSelect.value || 'primary';
  const syncAll = Boolean(syncAllToggle?.checked);

  statusEl.textContent = 'Saving...';
  statusEl.style.color = 'var(--text-muted)';

  try {
    const response = await fetch('/api/gcal/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        calendar_ids: selectedIds,
        default_calendar_id: defaultCalendarId,
        sync_all_calendars: syncAll
      })
    });
    const data = await response.json();
    if (data.ok) {
      statusEl.textContent = 'Saved calendar settings.';
      statusEl.style.color = 'var(--success)';
      await loadGCalCalendars();
    } else {
      statusEl.textContent = data.error || 'Failed to save settings.';
      statusEl.style.color = 'var(--error)';
    }
  } catch (error) {
    statusEl.textContent = 'Failed to save settings.';
    statusEl.style.color = 'var(--error)';
  }
}

function handleSyncAllToggle(event) {
  if (!event?.target) return;
  if (event.target.checked) {
    const confirmed = confirm('Sync all calendars? This may import private events.');
    if (!confirmed) {
      event.target.checked = false;
      return;
    }
  }
  gcalConfig.syncAll = Boolean(event.target.checked);
  renderGCalCalendarList();
}

/**
 * Check Google Calendar authentication status
 */
async function checkGCalStatus() {

  try {
    const response = await fetch('/api/gcal/status');
    const data = await response.json();

    const badge = document.getElementById('gcal-status-badge');
    const authSection = document.getElementById('gcal-auth-section');
    const syncSection = document.getElementById('gcal-sync-section');

    if (!badge || !authSection || !syncSection) return;

    if (data.connected) {
      badge.textContent = 'Connected';
      badge.style.background = 'var(--success)';
      badge.style.color = 'white';
      authSection.style.display = 'none';
      syncSection.style.display = 'block';
      document.getElementById('gcal-user-email').textContent = data.email || data.id;
      loadGCalCalendars();
    } else {
      badge.textContent = 'Not Connected';
      badge.style.background = 'var(--surface-3)';
      badge.style.color = 'var(--text-secondary)';
      authSection.style.display = 'block';
      syncSection.style.display = 'none';
      gcalCalendars = [];
      gcalConfig = { selectedIds: [], defaultCalendarId: 'primary', syncAll: false };
    }

  } catch (error) {
    console.error('GCal status check failed:', error);
  }
}

/**
 * Start Google Calendar OAuth flow
 */
async function connectGoogleCalendar() {
  try {
    const response = await fetch('/api/gcal/auth/start');
    const data = await response.json();

    if (data.error) {
      alert('Error: ' + data.error);
      return;
    }

    // Open OAuth popup
    const popup = window.open(
      data.auth_url,
      'gcal-auth',
      'width=500,height=600,menubar=no,toolbar=no'
    );

    // Listen for auth completion
    window.addEventListener('message', function handler(event) {
      if (event.data?.type === 'gcal-auth-success') {
        window.removeEventListener('message', handler);
        checkGCalStatus();
        loadGCalCalendars();
        if (typeof loadCalendar === 'function') loadCalendar(); // Refresh calendar

      }
    });
  } catch (error) {
    console.error('GCal connect failed:', error);
    alert('Failed to start Google Calendar connection');
  }
}

/**
 * Manually sync Google Calendar events
 */
async function syncGoogleCalendar() {
  const statusEl = document.getElementById('gcal-sync-status');
  const btn = document.getElementById('btn-gcal-sync');

  if (!btn || !statusEl) return;

  btn.disabled = true;
  btn.textContent = 'Syncing...';
  statusEl.textContent = '';

  try {
    const calendarIds = getSelectedCalendarIdsFromUI();
    const payload = calendarIds.length ? { calendar_ids: calendarIds } : {};

    const response = await fetch('/api/gcal/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Server error (${response.status}): ${text.slice(0, 120)}`);
    }
    const data = await response.json();

    if (data.success) {
      const parts = [
        `Imported ${data.imported || 0}`,
        `Updated ${data.updated || 0}`,
        `Pushed ${data.pushed || 0}`,
        `Deleted ${data.deleted || 0}`
      ];
      statusEl.textContent = `âœ“ ${parts.join(', ')}`;
      if (data.errors?.length) {
        statusEl.textContent += ` (${data.errors.length} error(s))`;
      }
      statusEl.style.color = 'var(--success)';
      if (typeof loadCalendar === 'function') loadCalendar(); // Refresh calendar
    } else {
      statusEl.textContent = 'âœ— ' + (data.error || 'Sync failed');
      statusEl.style.color = 'var(--error)';
    }
  } catch (error) {
    statusEl.textContent = 'âœ— Sync failed: ' + error.message;
    statusEl.style.color = 'var(--error)';
  } finally {
    btn.disabled = false;
    btn.textContent = 'ðŸ“… Sync Calendar';
  }

}

/**
 * Disconnect Google Calendar
 */
async function disconnectGoogleCalendar() {
  if (!confirm('Disconnect Google Calendar? Synced events will remain in the database.')) {
    return;
  }

  try {
    await fetch('/api/gcal/revoke', { method: 'POST' });
    checkGCalStatus();
  } catch (error) {
    console.error('GCal disconnect failed:', error);
  }
}

/**
 * Manually sync Google Tasks
 */
async function syncGoogleTasks() {
  const statusEl = document.getElementById('gcal-sync-status');
  const btn = document.getElementById('btn-gtasks-sync');

  btn.disabled = true;
  btn.textContent = 'Syncing Tasks...';
  statusEl.textContent = '';

  try {
    const response = await fetch('/api/gtasks/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await response.json();

    if (data.success) {
      statusEl.textContent = `<i class="fas fa-check"></i> Imported ${data.imported} tasks, skipped ${data.skipped} duplicates`;
      statusEl.style.color = 'var(--success)';
      loadCalendar(); // Refresh calendar
    } else {
      statusEl.textContent = 'âœ— ' + (data.error || 'Tasks sync failed');
      statusEl.style.color = 'var(--error)';
    }
  } catch (error) {
    statusEl.textContent = 'âœ— Tasks sync failed: ' + error.message;
    statusEl.style.color = 'var(--error)';
  } finally {
    btn.disabled = false;
    btn.textContent = 'âœ… Sync Tasks';
  }
}

// Initialize GCal UI on page load
document.addEventListener('DOMContentLoaded', function () {
  // Check GCal status
  checkGCalStatus();

  // Attach event listeners for main GCal panel
  document.getElementById('btn-gcal-connect')?.addEventListener('click', connectGoogleCalendar);
  document.getElementById('btn-gcal-sync')?.addEventListener('click', syncGoogleCalendar);
  document.getElementById('btn-gtasks-sync')?.addEventListener('click', syncGoogleTasks);
  document.getElementById('btn-gcal-disconnect')?.addEventListener('click', disconnectGoogleCalendar);
  document.getElementById('btn-gcal-save-config')?.addEventListener('click', saveGCalConfig);
  document.getElementById('gcal-sync-all')?.addEventListener('change', handleSyncAllToggle);
});


async function runBlackboardScraper() {
  const btn = document.getElementById('btn-run-scraper');
  if (!btn) return;

  if (!confirm('Run the Blackboard scraper now? This may take 1-2 minutes to complete.')) return;

  const originalText = btn.textContent;
  btn.textContent = 'Starting...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/scraper/run', { method: 'POST' });
    const data = await res.json();

    if (data.ok) {
      btn.textContent = 'Running...';
      showStatus('sync-count-badge', 'Scraper started', 'success'); // Hack reuse badge or just alert
      alert('Scraper started in background. The Sync Inbox will update automatically when items arrive.');

      // Timeout to restore button
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = originalText;
      }, 5000);

    } else {
      alert('Error: ' + data.message);
      btn.disabled = false;
      btn.textContent = originalText;
    }
  } catch (e) {
    alert('Network error: ' + e.message);
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ============================================
// SYNC INBOX LOGIC (Restored)
// ============================================

// Sync Inbox Polling
document.addEventListener('DOMContentLoaded', () => {
  if (typeof updateSyncCount === 'function') {
    updateSyncCount();
    setInterval(updateSyncCount, 60000); // Check every minute
  }
});

async function loadSyncPending() {
  const tbody = document.getElementById('sync-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading pending items...</td></tr>';

  try {
    const res = await fetch('/api/sync/pending');
    const data = await res.json();

    if (data.ok && data.items.length > 0) {
      renderSyncItems(data.items);
      updateSyncCount(data.items.length);
    } else {
      tbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="6">
            <div class="empty-state">
              <span class="empty-state-icon">ðŸ“¥</span>
              <h3 class="empty-state-title">Your inbox is empty</h3>
              <p class="empty-state-hint">New scraped items will appear here for verification.</p>
            </div>
          </td>
        </tr>`;
      updateSyncCount(0);
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--error);">Error loading inbox: ${e.message}</td></tr>`;
  }
}

function renderSyncItems(items) {
  const tbody = document.getElementById('sync-tbody');
  tbody.innerHTML = items.map(item => {
    let typeClass = 'badge-neutral';
    if (item.type === 'assignment' || item.type === 'quiz') typeClass = 'badge-drill';
    if (item.type === 'material') typeClass = 'badge-core';
    if (item.type === 'announcement') typeClass = 'badge-sprint';

    return `
      <tr id="sync-row-${item.id}">
        <td><span class="badge ${typeClass}">${item.type}</span></td>
        <td><span style="font-weight:600;">${item.course_name}</span></td>
        <td>${item.title}</td>
        <td style="font-size:12px; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.raw_text || ''}">
          ${item.raw_text || (item.source_url ? `<a href="${item.source_url}" target="_blank">View File</a>` : 'No details')}
        </td>
        <td style="font-size:12px;">
          ${item.date ? `<div>On: ${item.date}</div>` : ''}
          ${item.due_date ? `<div style="color:var(--error);">Due: ${item.due_date}</div>` : ''}
          <div style="font-size:10px; color:var(--text-muted);">Scraped: ${new Date(item.scraped_at).toLocaleDateString()}</div>
        </td>
        <td>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-primary" onclick="resolveSyncItem(${item.id}, 'approve')" style="font-size:11px; padding:4px 8px;">Approve</button>
            <button class="btn" onclick="resolveSyncItem(${item.id}, 'ignore')" style="font-size:11px; padding:4px 8px;">Ignore</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function resolveSyncItem(id, action) {
  const row = document.getElementById(`sync-row-${id}`);
  if (row) row.style.opacity = '0.5';

  try {
    const res = await fetch('/api/sync/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action })
    });
    const data = await res.json();
    if (data.ok) {
      if (row) row.remove();
      const tbody = document.getElementById('sync-tbody');
      if (tbody && tbody.children.length === 0) {
        loadSyncPending();
      } else {
        updateSyncCount();
      }
    } else {
      alert('Error: ' + data.message);
      if (row) row.style.opacity = '1';
    }
  } catch (e) {
    alert('Network error: ' + e.message);
    if (row) row.style.opacity = '1';
  }
}

async function updateSyncCount(countOverride = null) {
  const badge = document.getElementById('sync-count-badge');
  if (!badge) return;

  let count = countOverride;
  if (count === null) {
    try {
      const res = await fetch('/api/sync/pending');
      const data = await res.json();
      count = data.items ? data.items.length : 0;
    } catch (e) {
      return;
    }
  }

  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}
``


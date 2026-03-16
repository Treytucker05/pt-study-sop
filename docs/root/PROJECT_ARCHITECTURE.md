# PT Study System — Comprehensive Project Architecture

**Version:** 4.3
**Last Updated:** 2026-03-16
**Scope:** Entire repository (SOP, Brain, Scholar, Scripts)
**Purpose:** Reference-only technical documentation for system architecture, dependencies, and integration. Top-level product/page ownership authority lives in `README.md`.

> Master repo truth: `README.md`
> Canonical domain primitives + CP-MSS v1.0 architecture: `sop/library/17-control-plane.md`.
> Terminology note: current DB/UI `modules` are CourseModules (course material units), not LearningModules.

---

## 1. Executive Summary

The **PT Study System** is a personal AI study operating system for one DPT student. It is organized around three core systems, with Tutor as the main live value surface, Brain as the home and learner-model engine, and Scholar as the investigation layer. Legacy dashboard inventories remain historical reference only.

Core product systems:
1.  **Brain System (`brain/`)**: The home surface and learner-model engine; operational system for telemetry, evidence, mastery, learner archetype snapshots, and profile claims.
2.  **Scholar System (`scholar/`)**: The system-facing research and investigation layer that interprets Brain evidence, asks focused questions, and proposes bounded improvements.
3.  **Tutor System (`brain/dashboard/api_tutor.py` + `dashboard_rebuild/`)**: The bread-and-butter staged study workflow shell, live protocol-led teaching engine, and active workspace.

Supporting systems:
1.  **SOP System (`sop/`)**: The rigorous learning methodology (CP-MSS v1.0) consumed by the Tutor runtime.
2.  **Scripts & Automation (`scripts/`)**: Release validation, external integrations, and agent workflows.

This document serves as the "Project Map," superseding previous architecture docs.

The Study Buddy contract is:

- Brain-owned Library determines what Tutor teaches.
- SOP determines how Tutor teaches.
- Brain is the home surface and captures telemetry, builds learner evidence, and maintains visible learner-model outputs.
- Scholar interprets Brain outputs, can ask focused questions, and proposes approved changes through cited research and bounded findings.
- Tutor is the only live course-content teaching and live workflow engine after Brain handoff.
- Brain does not directly steer Tutor; any live adaptation must pass through Scholar in a bounded envelope.
- Obsidian is the primary notes home.
- Anki output is chain-conditional.

Tutor workflow migration target:
- `Launch -> Priming -> Tutor -> Polish -> Final Sync`
- Brain remains the home route and broad launch orchestrator.
- Tutor owns stage execution after Brain handoff.
- Brain stores telemetry, learner evidence, workflow analytics, compaction history, method/chain performance, and publish/index metadata rather than acting as the primary note/card store.

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
├── 00-overview.md
├── 01-core-rules.md
├── 02-learning-cycle.md
├── 03-frameworks.md
├── 04-engines.md
├── 05-session-flow.md
├── 06-modes.md
├── 07-workload.md
├── 08-logging.md
├── 09-templates.md
├── 10-deployment.md
├── 11-examples.md
├── 12-evidence.md
├── 13-custom-gpt-system-instructions.md
├── 14-lo-engine.md
├── 17-control-plane.md
└── README.md
```

**Generated upload bundle:**
```
sop/runtime/knowledge_upload/
├── 00_INDEX_AND_RULES.md
├── 01_MODULES_M0-M6.md
├── 02_FRAMEWORKS.md
├── 03_ENGINES.md
├── 04_LOGGING_AND_TEMPLATES.md
└── 05_EXAMPLES_MINI.md
```
### 2.2 Core Learning Modules

These files define the pedagogical backbone of the system.

**1. `17-control-plane.md` + `02-learning-cycle.md` (CP-MSS + KWIK)**
Defines the canonical 6-stage learning cycle that ALL sessions must follow:
- **PRIME**: orient and structure.
- **CALIBRATE**: assess and prioritize.
- **ENCODE**: construct durable schemas (active, not passive).
- **REFERENCE**: generate retrieval targets and anchors.
- **RETRIEVE**: effortful recall without cues.
- **OVERLEARN**: close loop with artifacts and repetition.
*Constraint:* NEVER deviate from this method.

**2. `02-learning-cycle.md` (KWIK Flow)**
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
| **M6** | **Wrap** | **Consolidation:** 3-Question Recap, Error Log, Glossaries.<br>**Wrap outputs:** Exit Ticket + Session Ledger only; JSON is generated post-session via Brain ingestion (see `sop/library/08-logging.md`). |

### 2.4 Support Content (Frameworks & Engines)

**Frameworks** provide structured ways to think:
- **Levels (`sop/library/03-frameworks.md`):** L1 (Analogy) → L2 (Simple 10yo) → **GATE** → L3 (Technical) → L4 (Clinical).
  - *Rule:* Must pass L2 teach-back before accessing L3/L4.
- **H-Series (`sop/library/03-frameworks.md`):** Structure maps (System → Subsystem → Component).
- **M-Series (`sop/library/03-frameworks.md`):** Logic flows (Trigger → Mechanism → Result).
- **Y-Series (`sop/library/03-frameworks.md`):** Quick context (Load/Stress, Signal/Detection).

**Engines** contain specialized content logic:
- **Anatomy Engine (`sop/library/04-engines.md`):**
  - **OIANA+ Order:** Bones → Landmarks (Visual First) → Attachments → Actions → Nerves → Arterial → Clinical.
  - **Rollback Rule:** If struggling with OIANA, return to landmarks.
- **Concept Engine (`sop/library/04-engines.md`):**
  - **Flow:** Definition → Context → Mechanism → Boundary (vs near-miss) → Application.
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

Scholar is the research and strategy layer. It reads Brain data, can ask focused learner questions when needed, performs cited research, and emits findings or metadata-backed proposals. It is not the live teaching system and it does not directly set Tutor pedagogy.

**Mission:** Observe study patterns, investigate learner fit and system friction, and propose bounded upgrades.
**Constraint:** Scholar never teaches course content. It only researches and optimizes the *process*.

### 3.1 Core Scripts

| Script | Purpose |
|--------|---------|
| `brain_reader.py` | Read-only access to `sessions` table in `pt_study.db`. |
| `friction_alerts.py` | Detects sessions with low scores, drift, or no planning. |
| `telemetry_snapshot.py` | Generates system health reports (uptime, coverage). |

### 3.2 Workflow Architecture (`scholar/workflows/`)

Scholar operates on a **Review → Question → Research → Draft → Wait** cycle.

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

- **Reads:** `brain/session_logs/` (via DB), Brain learner-evidence surfaces, `sop/library/` (for compliance checks).
- **Writes:** `scholar/outputs/` (reports), `brain/data/scholar_proposals` (metadata).
- **External Research:** uses approved citation-preserving web research flows.
- **Triggers:** Run via `scripts/run_scholar.bat` (Codex CLI agent).

---

## 4. Brain System (brain/)

The **Brain** is the learner-model engine and operational data system for telemetry, mastery evidence, and learner-profile signals. It powers Brain home and coordinates support signals for Scholar and Tutor.

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
| `method_blocks` | Evidence-backed study method blocks (CP control stages with legacy category compatibility). |
| `method_chains` | Pre-built and custom method sequences with context tags. |
| `method_ratings` | Post-session effectiveness and engagement ratings. |
| `skill_mastery` | BKT mastery state per user/skill (latent, learn, guess, slip, decay). |
| `practice_events` | Telemetry for every practice action (attempts, hints, evaluations). |
| `error_flags` | Localized failure flags (skill/edge, error type, severity, evidence). |
| `curriculum_nodes` | Concept map nodes with prereqs for curriculum gating. |
| `vault_docs` | Obsidian vault notes with frontmatter, checksums, aliases. |
| `kg_nodes` / `kg_edges` | Knowledge graph for Graph RAG-lite (typed relations, confidence). |
| `kg_provenance` | Provenance tracking for KG edges (source excerpts). |

### 4.2 Adaptive Mastery System (`brain/adaptive/`)

A 10-phase adaptive tutoring subsystem providing knowledge-graph-powered mastery tracking, curriculum gating, and scaffolding.

| Module | Purpose |
|--------|---------|
| `schemas.py` | Foundational schemas: `MasteryConfig`, `Skill`, `Epitome`, `AdvanceOrganizer`, pedagogy move library, typed relation vocabulary. |
| `bkt.py` | Bayesian Knowledge Tracing with forgetting-curve decay. Computes latent → effective mastery via configurable decay lambda. |
| `telemetry.py` | Practice event capture: `emit_attempt`, `emit_hint`, `emit_evaluate_work`, `emit_teach_back`, `record_error_flag`. |
| `curriculum.py` | Concept map as curriculum controller: prereq-based Locked/Available/Mastered status, learner control with constraints. |
| `vault_ingest.py` | Obsidian vault integration: ingest, frontmatter parsing, wikilink extraction, alias normalization, incremental checksum updates. |
| `knowledge_graph.py` | Graph RAG-lite: KG tables, seed from Obsidian links, typed relation extraction (regex), PCST subgraph pruning, hybrid retrieval, context pack assembly. |
| `metrics.py` | Measurement loop: per-skill mastery trajectory, hint dependence, time-to-correct, error flag recurrence. |
| `session_config.py` | Session experiment toggles: threshold (0.95/0.98), RAG mode, fading mode, pruning on/off. |

**API Endpoints** (in `brain/dashboard/api_mastery.py`):
- `GET /api/mastery/<skill_id>` — Effective mastery + status
- `GET /api/mastery/dashboard` — All skills with mastery states
- `POST /api/mastery/event` — Record practice event + BKT update
- `GET /api/mastery/<skill_id>/why-locked` — Error localization (missing prereqs, flagged edges)
- `GET /api/mastery/metrics` — Per-skill metrics dashboard
- `GET /api/mastery/metrics/<skill_id>` — Single skill metrics
- `GET/POST /api/mastery/session-config/<session_id>` — Experiment config

**Test coverage:** 629+ tests across 10 phases (contract, telemetry, hallucination resistance, regression).

### 4.3 Core Ingestion Scripts

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
- Powers the Tutor workspace in the app shell.
- Uses RAG to answer queries grounded in `rag_docs`.
- Respects Source-Lock (only answers from approved docs).
- LLM backend can be **Codex CLI (ChatGPT login; no API key)** or API-backed models (OpenRouter/OpenAI) depending on Tutor settings.

**Resume Generator (`generate_resume.py`):**
- Creates `brain/session_resume.md`.
- Provides the "Previous Context" block for the next GPT session.

---

## 5. App Shell (`dashboard_rebuild/` + `brain/dashboard/`)

The app shell is the current React/Vite frontend served by Flask. Public-surface ownership and route meaning are defined in `README.md`; this section only describes the runtime shell that serves those surfaces.

**Frontend source:** `dashboard_rebuild/client/src/`
**Build output:** `brain/static/dist/`
**Backend entrypoint:** `brain/dashboard/app.py` via `Start_Dashboard.bat`

### 5.1 Current Surface

Primary routes served by Flask:

- `/` and `/brain` for Brain home, learner state, and operational handoff
- `/tutor` for the native Tutor session flow, live study execution, and workspace tools
- `/calendar` for deadline truth and planning support
- `/scholar` for Scholar questions, investigations, findings, and run history
- `/library` for uploaded study-material management, Tutor source selection, and embedding status
- `/mastery` for objective progress, weakness follow-up, and mastery support views
- `/methods` for method blocks, chains, and analytics support
- `/vault-health` for vault-quality diagnostics, repair, and trust visibility

### 5.2 Runtime Boundaries

- React owns the browser UI and stateful interaction.
- Flask blueprints own API orchestration and persistence.
- `brain/dashboard/api_tutor.py` is the Tutor registration/config hub; split Tutor route ownership lives in `api_tutor_sessions.py`, `api_tutor_turns.py`, `api_tutor_artifacts.py`, and `api_tutor_materials.py`.
- `brain/dashboard/api_adapter.py` owns sessions, notes, courses, modules, Obsidian endpoints, Anki endpoints, calendar endpoints, and related Brain APIs.
- `brain/dashboard/api_methods.py` owns composable method and chain CRUD plus analytics endpoints.
- Embedding provider selection is separate from chat-provider selection. Tutor RAG defaults to Gemini Embedding 2 preview and keeps OpenAI as an explicit fallback path.

### 5.3 Key API Surfaces

Representative routes for the live system:

| Domain | Method | Route | Purpose |
|--------|--------|-------|---------|
| **Brain** | GET | `/api/sessions` | List Brain sessions |
| **Brain** | GET | `/api/sessions/stats` | Aggregate study/session metrics |
| **Tutor** | POST | `/api/tutor/session` | Start a Tutor session |
| **Tutor** | GET | `/api/tutor/session/<session_id>` | Resume Tutor session state |
| **Tutor** | POST | `/api/tutor/session/<session_id>/turn` | Stream a Tutor turn |
| **Tutor** | GET | `/api/tutor/materials` | List Library-backed study materials |
| **Tutor** | POST | `/api/tutor/materials/sync` | Sync external material roots into Library |
| **Tutor** | DELETE | `/api/tutor/session/<session_id>/artifacts` | Delete persisted Tutor artifacts |
| **Methods** | GET | `/api/methods` | List method blocks |
| **Methods** | GET | `/api/chains` | List method chains |
| **Scholar** | POST | `/api/scholar/run` | Trigger Scholar run |
| **Scholar** | GET | `/api/scholar/status` | Poll current Scholar status |
| **Obsidian** | GET | `/api/obsidian/status` | Vault connectivity status |
| **Anki** | POST | `/api/anki/sync` | Push approved drafts to Anki |

### 5.4 Tutor Runtime Wiring

Backend entry points:

- `brain/dashboard/app.py` registers the Tutor blueprint on `/api/tutor/*`
- `brain/dashboard/api_tutor.py` is the Tutor registration/config hub
- split Tutor route ownership lives in:
  - `api_tutor_sessions.py`
  - `api_tutor_turns.py`
  - `api_tutor_artifacts.py`
  - `api_tutor_materials.py`
- supporting runtime modules:
  - `brain/tutor_context.py`
  - `brain/tutor_prompt_builder.py`
  - `brain/tutor_streaming.py`
  - `brain/tutor_tools.py`
  - `brain/tutor_rag.py`
  - `brain/obsidian_vault.py`
  - `brain/db_setup.py`

Frontend entry points:

- `dashboard_rebuild/client/src/pages/tutor.tsx`
- `dashboard_rebuild/client/src/components/TutorStartPanel.tsx`
- `dashboard_rebuild/client/src/components/TutorChat.tsx`
- `dashboard_rebuild/client/src/components/TutorArtifacts.tsx`
- `dashboard_rebuild/client/src/api.ts`

### 5.5 Tutor Turn Path

Primary route:

- `POST /api/tutor/session/<session_id>/turn`

Execution sequence:

1. Validate the active session and request payload.
2. Load session turns and chain/block context.
3. Build retrieval context from selected study materials first and supporting Obsidian notes second.
4. Build the final prompt from chain, block, session, and retrieved evidence.
5. Start the streaming model call with tool schemas.
6. Emit SSE frames for token deltas, tool calls/results, status, and completion.
7. Persist turn and session state updates, including block progress when needed.

### 5.6 Tool Calling Pipeline

Tool registry lives in `brain/tutor_tools.py` and is exposed through `get_tool_schemas()` and `execute_tool()`.

Turn-time loop:

1. model emits `tool_call`
2. backend dispatches the tool
3. backend emits `tool_result`
4. tool output is appended into the conversation
5. model resumes generation
6. loop stops on completion or tool-iteration cap

### 5.7 Frontend Tutor Lifecycle

Startup and restore:

1. `pages/tutor.tsx` resolves launch precedence in this order: explicit query params, Brain/Library handoff, same-course active session, project-shell workspace state, persisted Tutor start state, then current-course fallback.
2. `tutorClientState.ts` owns the browser-side Tutor startup keys, migration, and handoff parsing.
3. If an active session exists, frontend fetches `GET /api/tutor/session/{id}`.
4. If the session is still active, the page hydrates chat mode; otherwise it clears stale state and falls back to the Tutor start panel.

Session creation:

1. `TutorStartPanel.tsx` submits selected configuration
2. frontend posts `POST /api/tutor/session`
3. page switches into the live Tutor workspace with the returned `session_id`

Turn flow:

1. `TutorChat.tsx` posts the turn request with a raw streaming `fetch`
2. frontend parses SSE lines into token, tool, and debug states
3. frontend finalizes the assistant turn on `done`
4. artifact/session handlers run after the turn completes

### 5.8 Tutor State Keys

Important browser state keys:

- `tutor.selected_material_ids.v2`
- `tutor.accuracy_profile.v1`
- `tutor.objective_scope.v1`
- `tutor.start.state.v2`
- `tutor.active_session.v1`
- `tutor.open_from_library.v1`
- `tutor.open_from_brain.v1`
- `tutor.vault_folder.v1`
- `tutor.vault_selected.v1`
- `tutor.chat.selected_vault_paths.v1`
- `tutor-mermaid-import`

Legacy compatibility keys still read or cleared during migration:

- `tutor.wizard.state.v1`
- `tutor.wizard.progress.v1`

---

## 6. Scripts & Automation (`scripts/`)

Operational scripts support validation, Scholar runs, and external sync workflows.

### 6.1 Core Scripts

- `scripts/release_check.py`: broad verification gate for Python/tests and repo health.
- `scripts/run_scholar.bat`: launches the Scholar flow from the local environment.
- `Start_Dashboard.bat`: canonical dashboard startup path. Builds frontend assets as needed and runs Flask on port `5000`.
- `scripts/scrape_blackboard.py`: pulls staged academic events into the sync workflow.

### 6.2 Principle

Scripts are operational helpers. They do not define product canon or pedagogy canon. When they disagree with active docs, the master canon and the live code win.

---

## 7. Cross-System Integration

The current Study Buddy loop is:

```
[Study Materials Library] ---> [Tutor Runtime] <--- [SOP Rules + Chains]
           |                         |
           |                         v
           |                  [Brain Database]
           |                         |
           v                         v
      [Brain App Shell] -----> [Obsidian Vault]
                                       |
                                       v
                               [Optional Anki Sync]

[Brain Database] ---> [Scholar Auditor] ---> [Approved Proposals] ---> [SOP / Product Updates]
```

### 7.1 Key Data Flows

1. **Teaching loop:** Library scope -> Tutor session -> chain execution -> Brain persistence.
2. **Knowledge loop:** Tutor artifacts and notes -> Obsidian as primary note home -> optional downstream Anki sync when the chain calls for cards.
3. **Improvement loop:** Brain telemetry -> Scholar analysis -> proposals / questions -> approved changes to product or SOP.

### 7.2 Boundary Rules

- Brain does not directly rewrite Tutor pedagogy.
- Scholar does not directly teach course content.
- Obsidian is the persistent notes home for learner-facing notes.
- Anki output is conditional, not mandatory.

---

## 8. Validation Commands

Use these commands to validate the live system:

```powershell
# Run the full backend test suite
pytest brain/tests/

# Build the frontend directly into Flask's static output
cd dashboard_rebuild
npm run build

# Start the dashboard the supported way
cd ..
.\Start_Dashboard.bat
```

---

## 9. Documentation Boundaries

Use the docs in this order:

1. `README.md` for overall product vision, subsystem contracts, and route ownership.
2. `sop/library/17-control-plane.md` plus the rest of `sop/library/` for pedagogy, rules, and chains.
3. This file for technical architecture and code-level system map.
4. `conductor/tracks/` and archive folders for historical evidence only.

### 4. UI Component Reference

**Navigation Shell**
- Primary shell component: `dashboard_rebuild/client/src/components/layout.tsx`
- Brain workspace container: `dashboard_rebuild/client/src/pages/brain.tsx`
- Brain home composition: `dashboard_rebuild/client/src/components/brain/BrainHome.tsx`

**Main Surfaces**
- Brain home: attention queue, learner state, stats bands, support-system launches
- Tutor: shell modes, start/resume panel, live study workspace, chat, artifacts, bounded Scholar strategy context
- Scholar: investigation console, questions, findings, run status
- Support pages: Library, Mastery, Calendar, Methods, Vault Health

**Theme Tokens**
- Shared token source: `dashboard_rebuild/client/src/lib/theme.ts`
- Runtime shell styling is owned by the React frontend, not the legacy `dashboard.html` / `dashboard.css` stack.




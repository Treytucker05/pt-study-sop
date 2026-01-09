# PT Study SOP

A structured study system for Doctor of Physical Therapy coursework, powered by the PEIRRO protocol.

## Source of Truth / Authority Chain

- Runtime Canon: `sop/gpt-knowledge/` (authoritative for all instructions).
- Packaged bundle present in this repo: `v9.2/` (development snapshot). If anything conflicts, the Runtime Canon wins.
- Release snapshots are frozen copies when present; they remain subordinate to the Runtime Canon.

**Master Plan (North Star):** See `sop/MASTER_PLAN_PT_STUDY.md` for the stable vision, invariants, and contracts every release must honor.

---

## Quick Start

1. Read `sop/gpt-knowledge/README.md`.
2. Paste `sop/gpt-knowledge/gpt-instructions.md` into your Custom GPT system instructions.
3. Upload `sop/gpt-knowledge/` files in the order listed in `BUILD_ORDER.md`.
4. Content retrieval is done via NotebookLM; paste a NotebookLM Source Packet into the Custom GPT when asked.
5. Paste `sop/gpt-knowledge/runtime-prompt.md` at the start of each session.
6. Run `python brain/db_setup.py` (or `Run_Brain_All.bat`) from the repo root for Brain setup.

Upload-ready artifacts live in `dist/` (the PT_STUDY_*.md files).

**One-click launcher:** Run `Run_Brain_All.bat` (repo root) to sync logs, regenerate resume, start the dashboard server, and open <http://127.0.0.1:5000> automatically. Keep the new "PT Study Brain Dashboard" window open while using the site.

**Release preparation:** Before cutting a new release, run `python scripts/release_check.py` and follow `docs/release/RELEASE_PROCESS.md`.

**Validation:** Run `python -m pytest brain/tests` from the repo root; CI runs the same command on pushes and pull requests.

---

## Repository Structure

pt-study-sop/

- v9.2/ (development snapshot bundle)
- sop/ (source / development; Runtime Canon in `sop/gpt-knowledge/`)
  - MASTER_PLAN_PT_STUDY.md
  - RESEARCH_INDEX.md
  - modules/
  - frameworks/
  - methods/
  - examples/
  - examples/
  - working/ (legacy dev notes, removed)
- brain/ (brain system)
  - data/, output/, session_logs/
  - tests/ (brain unit tests)
- LEGACY VERSIONS/ (frozen legacy sets; referenced by SOP library)

### Library & Versions (inside `sop/`)

- Current source: modules/frameworks/methods/examples; research notes in modules/research/.
- Legacy references: version-tagged files in protocols/, modes/, engines/, examples/, frameworks/, mechanisms/, prompts/, versions/ (sourced from LEGACY VERSIONS/).
- Planning/Improvements: sop/working/ (ROADMAP, PLAN_v9.2_dev with approved v9.2 enhancements; Next Session Checklist).

---

## Core Concepts

| Concept | What It Means |
|---------|---------------|
| **Seed-Lock** | You must provide your own hook/metaphor before moving on |
| **Function Before Structure** | Learn what it DOES before where it IS |
| **Level Gating** | Prove understanding at L2 (teach-back) before advancing |
| **Gated Platter** | If stuck, GPT offers raw metaphor you must personalize |
| **Planning First** | No teaching until target + sources + plan established |
| **Anatomy Order** | Bones -> Landmarks -> Attachments -> OIAN -> Clinical |

---

## Study Modes

| Mode | When to Use |
|------|-------------|
| **Core** | New material, guided learning |
| **Sprint** | Test-first, rapid recall practice |
| **Drill** | Deep practice on specific weakness |

---

## Highlights from the current canon (v9.2 development snapshot)

- **Planning Phase (M0):** Mandatory target/sources/plan before teaching
- **Anatomy Engine:** Bone-first protocol with visual landmark recognition
- **Rollback Rule:** Return to landmarks if OIAN struggles
- **Drawing Protocol:** AI-generated drawing instructions for anatomy
- **Condensed GPT Instructions:** Under 8k character limit
- **Packaged Release:** Bundled copies are produced when available; Runtime Canon stays authoritative.

---

## Documentation

| Document | Purpose |
|----------|---------|
| `sop/gpt-knowledge/README.md` | Setup and usage guide (Runtime Canon) |
| `sop/gpt-knowledge/MASTER.md` | Complete system reference |
| `sop/MASTER_PLAN_PT_STUDY.md` | Stable North Star vision/invariants/contracts |
| `sop/MASTER_REFERENCE_v9.2.md` | Detailed reference for the v9.2 development snapshot |
| `sop/RESEARCH_INDEX.md` | Learning science research topics and sourcing |
| `sop/working/ROADMAP.md` | Current gaps and next steps |

---

## PT Study OS – Direction of Travel (Brain, RAG, Tutor, Scholar)

This repo is evolving into a **personal AI study OS**, with four long-term pillars:

- **Brain (DB + Dashboard)**: single source of truth for sessions, readiness, syllabus, and study tasks.
- **RAG Content Store**: local-first index of textbooks, slides, transcripts, and notes (source-locked, citation-first).
- **Tutor API + Dashboard Tutor Tab**: in-house Tutor that runs inside the web dashboard, powered by the SOP runtime canon and RAG.
- **Scholar**: a meta-system that audits Tutor + Brain + RAG and proposes narrow, testable improvements.

Planned implementation ladder (stable high-level plan):

1. **Brain planning** ✅ **COMPLETE**  
   - ✅ Additive tables for `courses`, `course_events`, `topics`, and `study_tasks` in `brain/db_setup.py`.  
   - ✅ Syllabus intake UI (single event form + bulk JSON import via ChatGPT).  
   - ✅ Calendar API endpoints (`/api/calendar/data`, `/api/calendar/plan_session`) for visualizing course events, study sessions, and planned spaced repetition.  
   - ✅ Syllabus API endpoints (`/api/syllabus/courses`, `/api/syllabus/events`) with coverage analytics.  
   - ⏳ Plan overview endpoints (`/api/plan/today`, `/api/plan/overview`) - **Future enhancement** for today's focus and at-risk topics.

2. **Local-first RAG (starting with notes)** ⚠️ **PARTIAL**  
   - ✅ `rag_docs` table in the Brain DB to track RAG documents: notes, textbooks, transcripts, slides.  
   - ✅ Minimal `rag` module (`brain/rag_notes.py`) that can ingest markdown notes as first-class docs (linked to courses/topics) and support local search with citations.  
   - ⏳ RAG dashboard integration - **Future enhancement** for search UI and ingestion interface.

3. **Extend RAG to textbooks and transcripts**  
   - Add ingestion scripts for textbooks (PDF/text) and class transcripts, attaching rich metadata (course, lecture date, sections, topic tags).  
   - Standardize chunking and metadata so retrieval works well for long-form sources while keeping everything local-first.

4. **Tutor API and in-dashboard Tutor tab** ⚠️ **PARTIAL**  
   - ✅ `TutorQuery_v1` contract defined (`brain/tutor_api_types.py`) with course/topic, mode, question, plan snapshot, allowed sources.  
   - ✅ Tutor API stub endpoints (`/api/tutor/session/start`, `/api/tutor/session/turn`) exist in dashboard.  
   - ✅ **Tutor** tab in dashboard with basic chat UI wired to stub endpoints.  
   - ⏳ Full Tutor implementation - **Future enhancement** to connect to Brain + RAG under strict **Source-Lock** with real SOP execution.

5. **Scholar audits (planning + RAG + pedagogy)** ⚠️ **PARTIAL**  
   - ✅ Scholar dashboard integration with status, questions, and orchestrator runs.  
   - ✅ Scholar workflows exist for session/module audits (`scholar/workflows/`).  
   - ⏳ Extended Scholar workflows - **Future enhancement** to audit:  
     - Planning adherence (Brain vs syllabus).  
     - RAG coverage and Source-Lock adherence.  
     - Note quality and note utilization during tutoring.  
   - Scholar writes change proposals into its promotion queue; the human architect manually promotes changes into `sop/` and Brain/Tutor code.

---

## Dashboard Features

The Brain web dashboard (`brain/dashboard_web.py`) provides:

### Core Features

- **Stats Dashboard**: Session metrics, time tracking, understanding/retention scores, mode breakdowns
- **Session Management**: Upload session logs (drag-and-drop or file select), quick session entry form
- **Resume Generation**: Generate and download AI resume for GPT context
- **Analytics**: Topic coverage, weak/strong areas, what worked/what needs fixing

### Syllabus & Planning

- **Syllabus Intake**:
  - Single event form for quick entry
  - Bulk JSON import via ChatGPT (copy prompt, paste formatted JSON)
- **Calendar View**:
  - Month-view calendar showing course events, study sessions, and planned spaced repetition
  - Filters by course, event type, and date range
  - Plan spaced repetition sessions directly from calendar
- **Course Events**: Track lectures, quizzes, exams, assignments with dates, weights, and coverage analytics

### Tutor (Stub)

- **Tutor Tab**: Basic chat UI connected to Tutor API stubs
- **API Endpoints**: Session start/turn endpoints (currently return placeholder responses)
- Full Tutor implementation with RAG integration is planned

### Scholar Integration

- **Scholar Dashboard**: View status, safe mode toggle, run orchestrator
- **Questions Interface**: Answer Scholar's design questions
- **Coverage Progress**: Track audit coverage and system map updates

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/stats` | Dashboard statistics and metrics |
| `/api/resume` | Generate session resume |
| `/api/upload` | Upload session log file |
| `/api/quick_session` | Create session via form |
| `/api/syllabus/import` | Import single course event |
| `/api/syllabus/import_bulk` | Bulk import JSON syllabus |
| `/api/syllabus/courses` | List all courses with summary stats |
| `/api/syllabus/events` | List course events with coverage analytics |
| `/api/calendar/data` | Get calendar data (events, sessions, planned) |
| `/api/calendar/plan_session` | Create planned spaced repetition session |
| `/api/tutor/session/start` | Start Tutor session (stub) |
| `/api/tutor/session/turn` | Tutor turn/query (stub) |
| `/api/scholar/*` | Scholar status, questions, orchestrator runs |

---

## Housekeeping (safe deletes)

- **pycache**/, .pytest_cache/ (auto-regenerated)
- brain/data/, brain/output/, brain/session_logs/ (generated; back up logs before deleting)

## Links

- GitHub: <https://github.com/Treytucker05/pt-study-sop>
- Development snapshot bundle: v9.2/

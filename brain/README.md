# PT Study Brain v9.1

Session tracking and analytics system for the PT Study SOP.

Brain logs and WRAP activities map to the PEIRRO learning cycle (Prepare, Encode, Refine, Overlearn) for documentation clarity only.

---

## Quick Start

### Initialize Database
```powershell
cd brain
python db_setup.py
```

### After a Study Session
```powershell
# 1. Create log file from template
cp session_logs/TEMPLATE.md session_logs/2025-12-05_topic.md

# 2. Fill in the log with your session data

# 3. Ingest to database
python ingest_session.py session_logs/2025-12-05_topic.md
```

### Before Next Session
```powershell
python generate_resume.py
# Paste output into GPT for context
```

### Launch Dashboard
```powershell
# Option 1: One-click launcher (recommended)
../Run_Brain_All.bat

# Option 2: Manual launch
python dashboard_web.py
# Then open http://127.0.0.1:5000 in your browser
```

---

## Directory Structure

```
brain/
|-- config.py              -> Configuration settings
|-- db_setup.py            -> Database initialization
|-- ingest_session.py      -> Parse logs -> database
|-- generate_resume.py     -> Generate session resume
|-- README.md              -> This file
|-- session_logs/          -> Your session logs
|   `-- TEMPLATE.md        -> Copy this for each session
|-- data/                  -> Database storage
|   `-- pt_study.db        -> SQLite database
`-- output/                -> Generated files
    `-- session_resume.md  -> Resume for GPT context
```

---

## Session Log Fields (v9.1)

### Required
- Date, Time, Duration
- Study Mode (Core / Diagnostic Sprint / Teaching Sprint / Drill)
- Main Topic

### Planning Phase
- Target Exam/Block
- Source-Lock (materials used)
- Plan of Attack

### Execution Details
- Frameworks Used
- Gated Platter Triggered (Yes/No)
- WRAP Phase Reached (Yes/No)
- Anki Cards Created (count)
- Off-source drift? (Y/N)
- Source snippets used? (Y/N)

### Anatomy-Specific
- Region Covered
- Landmarks Mastered
- Muscles Attached
- OIAN Completed For
- Rollback Events (Yes/No)
- Drawing Used (Yes/No)
- Drawings Completed

### Ratings (1-5)
- Understanding Level
- Retention Confidence
- System Performance
- Calibration Check

### Anchors
- Anchors Locked
- Weak Anchors (for WRAP cards)

### Reflection
- What Worked
- What Needs Fixing
- Gaps Identified
- Notes/Insights

### Next Session
- Topic, Focus, Materials Needed

---

## Resume Output

The resume generator provides:

- **Readiness Score** (0-100) based on coverage, understanding, confidence
- **Recent Sessions** with ratings and regions
- **Topic Coverage** with freshness indicators (FRESH/FADING/STALE)
- **Anatomy Coverage** by region with landmarks/muscles
- **Weak Areas** needing attention
- **Recommended Focus** for next session

---

## RAG System

The RAG (Retrieval-Augmented Generation) system (`rag_notes.py`) provides local-first content indexing:

- **Ingestion**: Ingest markdown notes, textbooks, transcripts, and slides into `rag_docs` table
- **Search**: Full-text search with citation support
- **Source-Lock**: Link documents to courses and topics for constrained retrieval
- **CLI**: Command-line interface for ingest and search operations

Example usage:
```powershell
# Ingest a note
python rag_notes.py ingest session_logs/my_note.md --course-id 1 --topic-tags "anatomy,gluteal"

# Search notes
python rag_notes.py search "gluteal region landmarks" --limit 5
```

## Database Schema (v9.1 + planning/RAG extensions)

Core session logging uses the v9.1 `sessions` table. Key fields include:
- `target_exam` – Exam/block being studied for
- `source_lock` – Materials used in session
- `plan_of_attack` – Session plan
- `region_covered` – Anatomy region
- `landmarks_mastered` – Landmarks learned
- `muscles_attached` – Muscles mapped
- `oian_completed_for` – Full OIAN completed
- `rollback_events` – Whether rollback occurred
- `drawing_used` – Whether drawing was used
- `calibration_check` – Confidence vs actual performance
- `off_source_drift` – Whether you left declared sources
- `source_snippets_used` – Whether source snippets were captured
- `weak_anchors` – Anchors needing cards in WRAP

Planning and RAG tables are **additive** and do not change the v9.1 session schema:

- `courses` – high-level course metadata (name, code, term, instructor, weekly time budget).
- `course_events` – syllabus events (lectures, readings, quizzes, exams, assignments) with dates, due dates, weight, and raw syllabus text.
- `topics` – conceptual topics tied to courses, with `source_lock`, default frameworks, and optional RAG doc IDs.
- `study_tasks` – concrete study tasks scheduled on specific days, linked to courses, topics, and (once complete) `sessions.id`.
- `rag_docs` – text-normalized RAG documents (notes, textbooks, transcripts, slides) with metadata and content stored locally for retrieval.

Brain remains the **single source of truth** for sessions, planning, and RAG document metadata; higher-level tools (Tutor API, Scholar) read from these tables but do not mutate schema.

---

## Dashboard Features

The web dashboard (`dashboard_web.py`) provides a modern UI for managing your study system:

### Core Features
- **Stats Dashboard**: View session metrics, time tracking, scores, and analytics
- **Session Management**: Upload session logs via drag-and-drop or quick entry form
- **Resume Generation**: Generate and download AI resume for GPT context
- **Analytics**: Topic coverage, weak/strong areas, study patterns

### Syllabus & Planning
- **Syllabus Intake**: 
  - Single event form for quick entry of courses and events
  - Bulk JSON import: Use ChatGPT prompt to format syllabus, then paste JSON
- **Calendar View**: 
  - Month-view calendar showing course events, study sessions, and planned spaced repetition
  - Filters by course, event type, and date range
  - Plan spaced repetition sessions directly from calendar
- **Course Events**: Track lectures, quizzes, exams, assignments with dates, weights, and coverage analytics

### Tutor (Stub)
- **Tutor Tab**: Basic chat UI connected to Tutor API stubs
- Currently returns placeholder responses; full RAG-integrated implementation planned

### Scholar Integration
- View Scholar status, toggle safe mode, run orchestrator
- Answer Scholar's design questions
- Track coverage progress

## API Endpoints

The dashboard exposes REST API endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/stats` | GET | Dashboard statistics and metrics |
| `/api/resume` | GET | Generate session resume (markdown) |
| `/api/resume/download` | GET | Download resume as file |
| `/api/upload` | POST | Upload session log file |
| `/api/quick_session` | POST | Create session via form |
| `/api/syllabus/import` | POST | Import single course event |
| `/api/syllabus/import_bulk` | POST | Bulk import JSON syllabus |
| `/api/syllabus/courses` | GET | List all courses with summary stats |
| `/api/syllabus/events` | GET | List course events with coverage analytics |
| `/api/calendar/data` | GET | Get calendar data (events, sessions, planned) |
| `/api/calendar/plan_session` | POST | Create planned spaced repetition session |
| `/api/tutor/session/start` | POST | Start Tutor session (stub) |
| `/api/tutor/session/turn` | POST | Tutor turn/query (stub) |
| `/api/scholar` | GET | Scholar status and metadata |
| `/api/scholar/questions` | POST | Submit answers to Scholar questions |
| `/api/scholar/run` | POST | Start Scholar orchestrator run |

## Commands

| Command | What It Does |
|---------|--------------|
| `python db_setup.py` | Initialize or migrate database |
| `python ingest_session.py <file>` | Add session to database |
| `python generate_resume.py` | Generate resume for next session |
| `python config.py` | Show configuration |
| `python dashboard_web.py` | Start web dashboard server |
| `python rag_notes.py ingest <file>` | Ingest markdown note into RAG |
| `python rag_notes.py search <query>` | Search RAG notes |
| `../Run_Brain_Sync.bat` | One-click daily sync: move stray logs + ingest all + regenerate resume |
| `../Run_Brain_All.bat` | One-click: sync + resume + start dashboard and open browser (http://127.0.0.1:5000) |

---

## Migration from v8

If you have existing v8 data, run:
```powershell
python db_setup.py
# Answer 'y' when prompted to migrate
```

Old data is preserved in `sessions_v8` table.

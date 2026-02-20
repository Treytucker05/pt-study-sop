# PT Study Brain (CP-MSS v1.0 Era)

Session tracking and analytics system for the PT Study SOP.

Canonical learning system: **CP-MSS v1.0** (`PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`).
Legacy PEIRRO category names are compatibility aliases only where still present in historical data paths.

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

### LLM Intake (optional)

Send plain text or JSON intake payloads directly to the Brain intake endpoint. This logs a session, stores the raw input, and drafts cards when present.

## Dashboard bundle (canonical)
- The Flask app serves `brain/static/dist/index.html` as the one true dashboard.
- Frontend source lives in this repo at `dashboard_rebuild/`.
- Build steps: run `npm run build` in `dashboard_rebuild/` (build output writes directly to `brain/static/dist`).
- If the frontend breaks, rebuild and re-sync `brain/static/dist` (do not mix assets from other folders).

```powershell
# Plain text
curl -X POST http://127.0.0.1:5000/api/brain/chat -H "Content-Type: application/json" -d "{\"message\":\"Studied hip joint anatomy for 30 minutes...\"}"

# Direct JSON (tracker + enhanced)
curl -X POST http://127.0.0.1:5000/api/brain/chat -H "Content-Type: application/json" -d "{\"tracker\":{...},\"enhanced\":{...}}"
```

### Launch Dashboard

```powershell
# One-click launcher (recommended)
../Start_Dashboard.bat
```

### Calendar CLI (add/clear)

```powershell
cd brain
# Quick add with natural language
python calendar_cli.py add "Course: PTA 101 | Lecture Intro to Pelvis | next Tue 7pm"
# Structured prompts
python calendar_cli.py add --interactive
# Clear calendar data (courses, course_events, study_tasks)
python calendar_cli.py clear
```

Notes:
- Quick add accepts `today`, `tomorrow`, `next Tue`, or `YYYY-MM-DD`.
- Use `time:` and `location:` tags when you want those fields.

---


## Directory Structure

```
brain/
|-- config.py              -> Configuration settings
|-- db_setup.py            -> Database initialization
|-- ingest_session.py      -> Parse logs -> database
|-- generate_resume.py     -> Generate session resume
|-- README.md              -> This file
|-- dashboard/             -> Web application package
|-- static/                -> JS/CSS/Images
|-- templates/             -> HTML templates
|-- session_logs/          -> Your session logs
|   `-- TEMPLATE.md        -> Copy this for each session
|-- data/                  -> Database storage
|   `-- pt_study.db        -> SQLite database
`-- output/                -> Generated files
    `-- session_resume.md  -> Resume for GPT context
```

---

## Session Log Fields (Current)

Notes:
- JSON logs (Tracker + Enhanced payloads) are supported.
- Legacy markdown logs remain supported for backward compatibility.

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

## Database Schema (Current + planning/RAG extensions)

Core session logging uses the current `sessions` table. Key fields include:

- `target_exam` - Exam/block being studied for
- `source_lock` - Materials used in session
- `plan_of_attack` - Session plan
- `region_covered` - Anatomy region
- `landmarks_mastered` - Landmarks learned
- `muscles_attached` - Muscles mapped
- `oian_completed_for` - Full OIAN completed
- `rollback_events` - Whether rollback occurred
- `drawing_used` - Whether drawing was used
- `calibration_check` - Confidence vs actual performance
- `off_source_drift` - Whether you left declared sources
- `source_snippets_used` - Whether source snippets were captured
- `weak_anchors` - Anchors needing cards in WRAP
- `anchors_mastery` - Mastery counts for locked anchors (0-3)

Planning and RAG tables are **additive** and do not change the core session schema:

- `courses` - high-level course metadata (name, code, term, instructor, weekly time budget).
- `course_events` - syllabus events (lectures, readings, quizzes, exams, assignments) with dates, due dates, weight, and raw syllabus text.
- `topics` - conceptual topics tied to courses, with `source_lock`, default frameworks, and optional RAG doc IDs.
- `study_tasks` - concrete study tasks scheduled on specific days, linked to courses, topics, and (once complete) `sessions.id`.
- `rag_docs` - text-normalized RAG documents (notes, textbooks, transcripts, slides) with metadata and content stored locally for retrieval.

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
  - **Blackboard Scraper**: Run `python scripts/scrape_blackboard.py` to sync courses, events, and content files directly from Blackboard.
- **Duplicate guard**: Bulk and single imports skip duplicate events for a course; use `python dedupe_course_events.py --apply` to clean existing duplicates if a syllabus was imported twice.
- **Calendar View**:
  - Month-view calendar showing course events, study sessions, and planned spaced repetition
  - Filters by course, event type, and date range
  - Plan spaced repetition sessions directly from calendar
  - Google Calendar two-way sync (Primary + PT School default; configurable calendars)
- **Course Events**: Track lectures, quizzes, exams, assignments with dates, weights, and coverage analytics


Google Calendar sync setup: add credentials under `google_calendar` in `brain/data/api_config.json`, then connect and choose calendars in the dashboard.

### Tutor (Codex-Powered)


- **Tutor Tab**: Chat UI connected to Codex CLI via RAG
- **Mode-Specific Behavior**: Core (teaching), Sprint (testing), Drill (deep practice)
- **RAG Search**: Searches ingested SOP knowledge files with source-lock filtering
- **Citations**: Returns source references for verified answers
- **Unverified Banner**: Marks answers not backed by course materials
- **Card Drafts**: Create flashcard drafts from Tutor interactions

### Scholar Integration

- View Scholar status, toggle safe mode, run orchestrator
- Answer Scholar's design questions
- Track coverage progress
- Readiness status (latest session log and run timestamps) is included in `/api/scholar`

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
| `/api/brain/chat` | POST | LLM intake: parse raw text or JSON payload into a session and card drafts |
| `/api/gcal/status` | GET | Google Calendar auth status |
| `/api/gcal/calendars` | GET | List Google calendars + selection |
| `/api/gcal/config` | GET/POST | Read/update calendar sync settings |
| `/api/gcal/sync` | POST | Two-way Google Calendar sync |
| `/api/gcal/revoke` | POST | Disconnect Google Calendar |
| `/api/gtasks/sync` | POST | Import Google Tasks |
| `/api/tutor/session/start` | POST | Start Tutor session |

| `/api/tutor/session/turn` | POST | Process Tutor conversation turn |
| `/api/tutor/card-draft` | POST | Create card draft from Tutor turn |
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
| `python ingest_knowledge.py` | Ingest SOP knowledge files into RAG |
| `python tutor_engine.py <question>` | Test Tutor engine from CLI |
| `../Run_Brain_Sync.bat` | One-click daily sync: move stray logs + ingest all + regenerate resume |
| `python scripts/scrape_blackboard.py` | Sync courses/events/files from Blackboard |
| `python dedupe_course_events.py [--course-id N] --apply` | Remove duplicate syllabus events (dry-run without --apply) |
| `../Start_Dashboard.bat` | One-click: start dashboard and open browser (<http://127.0.0.1:5000>) |

---

## Migration from v8

If you have existing v8 data, run:

```powershell
python db_setup.py
# Answer 'y' when prompted to migrate
```

Old data is preserved in `sessions_v8` table.

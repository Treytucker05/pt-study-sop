# REFERENCE DOCUMENTS COMPILATION
**For:** January 26 Plan Implementation
**Purpose:** All relevant reference material in one place

---

# TABLE OF CONTENTS

1. [UI + API Audit (Jan 22)](#1-ui--api-audit-jan-22) — Complete endpoint inventory
2. [WRAP Schema](#2-wrap-schema) — Required session fields
3. [System Inventory](#3-system-inventory) — Engines, frameworks, mechanisms, modes
4. [Project Architecture (Excerpt)](#4-project-architecture-excerpt) — Database schema, API routes
5. [Continuity Log](#5-continuity-log) — Recent changes

---

# 1. UI + API Audit (Jan 22)

**Source:** `docs/full-ui-api-audit-2026-01-22.md`

## Entrypoints / Runtime
- Launcher: `Run_Brain_All.bat`
- Backend runtime: Flask app in `brain/dashboard_web.py` → `brain/dashboard/app.py`
- Frontend build served from: `brain/static/dist/` (React build)
- React routes (Wouter): `/`, `/brain`, `/calendar`, `/scholar`, `/tutor`

## Dashboard Page API
File: `dashboard_rebuild/client/src/pages/dashboard.tsx`

| Feature | Endpoints |
|---------|-----------|
| Courses | GET `/api/courses/active`, POST `/api/courses`, PATCH `/api/courses/<id>`, DELETE `/api/courses/<id>` |
| Study wheel | GET `/api/study-wheel/current`, POST `/api/study-wheel/complete-session` |
| Sessions today | GET `/api/sessions/today` |
| Streak | GET `/api/streak` |
| Weakness queue | GET `/api/weakness-queue` |
| Google Tasks | GET `/api/google-tasks/lists`, GET `/api/google-tasks`, POST/PATCH/DELETE per task |
| Academic deadlines | GET/POST/PATCH/DELETE `/api/academic-deadlines`, POST `/api/academic-deadlines/<id>/toggle` |

## Brain Page API
File: `dashboard_rebuild/client/src/pages/brain.tsx`

| Feature | Endpoints |
|---------|-----------|
| Sessions | GET `/api/sessions`, PATCH `/api/sessions/<id>`, POST `/api/sessions/bulk-delete` |
| Brain metrics | GET `/api/brain/metrics` |
| Brain chat | POST `/api/brain/chat` |
| Brain ingest | POST `/api/brain/ingest` |
| Obsidian | GET `/api/obsidian/status`, GET `/api/obsidian/files`, GET/PUT `/api/obsidian/file` |
| Anki | GET `/api/anki/status`, GET `/api/anki/due`, POST `/api/anki/sync` |

## Scholar Page API
File: `dashboard_rebuild/client/src/pages/scholar.tsx`

| Feature | Endpoints |
|---------|-----------|
| Sessions | GET `/api/sessions` |
| Courses | GET `/api/courses` |
| Proposals | GET `/api/proposals`, PATCH `/api/proposals/<id>` |
| Scholar | GET `/api/scholar/questions`, GET `/api/scholar/findings`, GET `/api/scholar/tutor-audit`, POST `/api/scholar/chat` |

## Tutor Page API
File: `dashboard_rebuild/client/src/pages/tutor.tsx`

| Feature | Endpoints |
|---------|-----------|
| Chat | GET `/api/chat/<session_id>`, POST `/api/chat/<session_id>` |

## Calendar Page API
File: `dashboard_rebuild/client/src/pages/calendar.tsx`

| Feature | Endpoints |
|---------|-----------|
| Local events | GET/POST/PATCH/DELETE `/api/events` |
| Local tasks | GET/POST/PATCH/DELETE `/api/tasks` |
| Google status | GET `/api/google/status`, GET `/api/google/auth` |
| Google calendars | GET `/api/google-calendar/calendars`, GET/PATCH/DELETE `/api/google-calendar/events` |
| Google tasks | GET `/api/google-tasks/lists`, GET `/api/google-tasks`, POST/PATCH/DELETE per task |

## NEW Endpoints Needed (from EXECPLAN)
```
GET  /api/learning-objectives
POST /api/learning-objectives
GET  /api/learning-objectives/:id
PATCH /api/learning-objectives/:id
DELETE /api/learning-objectives/:id

GET /api/sessions/last-context?courseId=X

POST /api/lo-sessions
```

---

# 2. WRAP Schema

**Source:** `docs/contracts/wrap_schema.md`

## Required Fields
```
session_id          # Deterministic for idempotency
date                # ISO format YYYY-MM-DD
course
topic
mode
duration_min
source_lock         # ← THIS IS ALREADY A REQUIRED FIELD!
understanding
retention
calibration_gap
retrieval_success_rate
anchors
weak_anchors
what_worked
what_needs_fixing
wrap_watchlist
exit_ticket_blurt
exit_ticket_muddiest
next_session
```

## Optional Fields
```
topics (array)
confusables
glossary
anki_cards
spaced_reviews
notes
```

## Invariants
- `session_id` is deterministic for idempotency
- `date` uses ISO format `YYYY-MM-DD`
- Lists are semicolon-separated when in string form

---

# 3. System Inventory

**Source:** `docs/root/SYSTEM_INVENTORY.md`

## The Engines (Content Models)
| Engine | Purpose |
|--------|---------|
| **Anatomy Engine** | Bone-first flow: BONES → LANDMARKS → ATTACHMENTS → ACTIONS → NERVES → ARTERIAL → CLINICAL |
| **Concept Engine** | Non-anatomy: Definition → Context → Mechanism → Boundary → Application |
| **Recap Engine** | Structured recap/exam wrapper |
| **Study Engine (SOP Runner)** | Orchestration: MAP → LOOP → WRAP with Seed-Lock and gating |

## The Frameworks (Mental Models)
| Series | Frameworks |
|--------|------------|
| **H-Series (Hierarchy)** | H1 System, H2 Anatomy, H3 Load Stack, H4 Bloom's Depth, H5 ICAP, H6 Bruner, H7 Narrative, H8 Prompt Frame |
| **M-Series (Logic)** | M2 Trigger, M6 Homeostasis, M8 Diagnosis, M-SRL, M-ADDIE, M-STAR |
| **Y-Series (Context)** | Y1 Generalist, Y2 Load/Stress, Y3 Compensate, Y4 Signal |

## The Mechanisms (The "Laws")
| Mechanism | Description |
|-----------|-------------|
| **Seed-Lock** | User must supply analogies |
| **Phonetic Override** | Ask "What does this sound like?" before defining |
| **Gated Platter** | Provide raw metaphor for user to edit if no Seed |
| **Source-Lock** | Require explicit session sources |
| **Planning Phase** | No teaching until goals, sources, plan set (M0) |
| **Function Before Structure** | Lead with function (M2) |
| **Level Gating** | Higher levels gated until lower validated |
| **Drawing Integration** | Annotated drawing protocol for anatomy |

## The Modes (Workflow)
| Mode | Description |
|------|-------------|
| **Core** | Guided learning for new material; full prime→encode→build |
| **Sprint** | Fail-first quizzing; teaching only on misses |
| **Drill** | Targeted reconstruction of weak buckets |
| **Light** | 10-15 minute quick sessions |
| **Quick Sprint** | 20-30 minute testing bursts |

---

# 4. Project Architecture (Excerpt)

**Source:** `docs/root/PROJECT_ARCHITECTURE.md`

## Database Schema (`brain/data/pt_study.db`)

### Existing Tables
| Table | Purpose |
|-------|---------|
| `sessions` | Complete session logs (60+ columns) |
| `courses` | Syllabus metadata (code, name, color) |
| `course_events` | Syllabus items (lectures, exams, due dates) |
| `rag_docs` | Ingested notes/textbooks for RAG |
| `card_drafts` | Flashcards waiting for Anki sync |
| `tutor_turns` | Chat history from Tutor |
| `scraped_events` | Staged Blackboard items |
| `ingested_files` | Checksums of ingested logs |

### New Tables Needed (from EXECPLAN)
```sql
learning_objectives
- id (INTEGER PK)
- course_id (FK to courses)
- module (TEXT)
- lo_code (TEXT) -- e.g., "LO-4.1"
- title (TEXT)
- status (TEXT) -- not_started | in_progress | need_review | solid
- last_session_id (FK to sessions)
- last_session_date (TEXT)
- next_action (TEXT)
- created_at (TEXT)
- updated_at (TEXT)

lo_sessions
- id (INTEGER PK)
- lo_id (FK to learning_objectives)
- session_id (FK to sessions)
- status_before (TEXT)
- status_after (TEXT)
- notes (TEXT)

sessions.source_lock (ADD COLUMN)
- JSON string representing array of source labels
- e.g., '["Slides 12-25", "Chapter 4 pp.80-95"]'
```

## Session Fields (Existing)
The `sessions` table already includes:
- `session_date`, `session_time`
- `study_mode` (Core, Sprint, Drill)
- `main_topic`, `subtopic`, `subtopics`
- `understanding_level`, `retention_confidence`, `system_performance` (1-5)
- `cards_created`
- `what_worked`, `what_needs_fixing`, `notes`
- `next_session_plan`, `spaced_reviews`
- `errors_conceptual`, `errors_recall`

## Cross-System Integration Flow
```
[Custom GPT] ──(Session Log MD)──> [Brain Ingestor]
                                          │
                                          ▼
                                   [Brain Database]
                                      │   │
                  ┌───────────────────┘   └──────────┐
                  ▼                                  ▼
           [Dashboard UI]                   [Scholar Auditor]
                  │
                  ▼
            [Anki Connect]
```

---

# 5. Continuity Log

**Source:** `CONTINUITY.md`

## Recent Relevant Changes (Jan 23)

| Time | Change |
|------|--------|
| 04:49 | Added MASTER_SOP docs for material ingestion, session start, and progress tracking |
| 04:59 | Mirrored MASTER_SOP 05/06/07 into sop/src, added progress tracker template |
| 05:31 | Added ExecPlan for dashboard rebuild in .agent/EXECPLAN_DASHBOARD.md |
| 05:35 | Added ExecPlans guidance to AGENTS.md |
| 05:41 | Added .agent/context scaffold |
| 15:20 | Added DASHBOARD_IMPLEMENTATION_PLAN.md, PROJECT_OVERVIEW.md |

## Build/Deploy Notes (Jan 22)
- Dashboard rebuild: `npm run build` in `dashboard_rebuild/`
- Copy to production: `dashboard_rebuild/dist/public` → `brain/static/dist`
- Dialog z-index fixes applied
- Google Calendar auth flow enhanced

---

# 6. Quick Command Reference

## Development
```bash
# From dashboard_rebuild/
npm install
npm run dev          # Start dev server on port 5000
npm run build        # Build for production
npm run check        # Typecheck
npm run db:push      # Apply schema changes
```

## Production
```bash
# From repo root
Run_Brain_All.bat    # Start Flask + React dashboard
```

## Testing
```bash
python -m pytest brain/tests
python scripts/release_check.py
```

---

# 7. File Locations Summary

| What | Where |
|------|-------|
| React pages | `dashboard_rebuild/client/src/pages/` |
| React components | `dashboard_rebuild/client/src/components/` |
| API client | `dashboard_rebuild/client/src/api.ts` |
| Database schema | `dashboard_rebuild/schema.ts` |
| Server routes | `dashboard_rebuild/server/routes.ts` |
| Server storage | `dashboard_rebuild/server/storage.ts` |
| Production build | `brain/static/dist/` |
| SQLite database | `brain/data/pt_study.db` |
| Session logs | `brain/session_logs/` |
| MASTER_SOP docs | `scholar/knowledge/MASTER_SOP/` |

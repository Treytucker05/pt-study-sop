# UPDATED IMPLEMENTATION PLAN
**Date:** January 23, 2026
**Status:** Revised based on planning session

---

## CHANGES FROM ORIGINAL PLAN

### NEW: Module-Level Material Tracking
Original plan tracked materials per-LO. Updated to track at **module level** (matches how courses are organized).

### NEW: Pre-Study Checklist Fields
Added to modules:
- `files_downloaded` (boolean)
- `notebooklm_loaded` (boolean)
- `sources` (JSON array of file names)

### NEW: Schedule Events Table
Captures syllabus data (chapters, quizzes, assignments, exams).

### NEW: ChatGPT-Assisted Ingestion
Instead of manual line-by-line entry:
1. Brain generates structured prompt
2. User pastes prompt + raw content into ChatGPT
3. ChatGPT returns JSON
4. Brain bulk imports

---

## REVISED DATA MODEL

```sql
-- Courses (existing, no changes)
courses (id, code, name, color, ...)

-- NEW: Schedule events from syllabus
schedule_events (
  id INTEGER PRIMARY KEY,
  course_id INTEGER FK,
  type TEXT, -- 'chapter' | 'quiz' | 'assignment' | 'exam'
  title TEXT,
  due_date TEXT,
  linked_module_id INTEGER FK NULL,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
)

-- NEW: Modules (unit of material gathering)
modules (
  id INTEGER PRIMARY KEY,
  course_id INTEGER FK,
  name TEXT,
  order_index INTEGER,
  files_downloaded BOOLEAN DEFAULT FALSE,
  notebooklm_loaded BOOLEAN DEFAULT FALSE,
  sources TEXT, -- JSON array of file names
  created_at TEXT,
  updated_at TEXT
)

-- NEW: Learning objectives (unit of learning progress)
learning_objectives (
  id INTEGER PRIMARY KEY,
  course_id INTEGER FK,
  module_id INTEGER FK,
  lo_code TEXT, -- e.g., "LO-4.1"
  title TEXT,
  status TEXT DEFAULT 'not_started', -- not_started | in_progress | need_review | solid
  last_session_id INTEGER FK NULL,
  last_session_date TEXT NULL,
  next_action TEXT,
  created_at TEXT,
  updated_at TEXT
)

-- NEW: LO-Session join
lo_sessions (
  id INTEGER PRIMARY KEY,
  lo_id INTEGER FK,
  session_id INTEGER FK,
  status_before TEXT,
  status_after TEXT,
  notes TEXT
)

-- MODIFIED: Sessions (add source_lock)
sessions (
  ... existing fields ...,
  source_lock TEXT -- JSON array of source labels
)
```

---

## REVISED INGESTION FLOW

### Step 1: Schedule Import
1. User uploads syllabus to ChatGPT
2. Brain provides prompt template (see below)
3. ChatGPT returns JSON array of schedule events
4. User pastes JSON into Brain â†’ bulk import

### Step 2: Module Creation
1. User creates modules (or imports from schedule)
2. For each module, checks:
   - [ ] Files downloaded to local path
   - [ ] Loaded into NotebookLM
3. Lists source files for each module

### Step 3: LO Import
1. User copies raw LO text from course
2. Brain provides prompt template
3. ChatGPT returns structured JSON
4. User pastes JSON into Brain â†’ bulk import under module

### Step 4: Ready to Study
When module has:
- âœ… files_downloaded = true
- âœ… notebooklm_loaded = true  
- âœ… At least one LO

Dashboard shows: ðŸŸ¢ Material Ready

---

## CHATGPT PROMPT TEMPLATES

### Schedule Import Prompt
```
I need you to extract schedule events from my course syllabus.

Return ONLY a JSON array with this structure:
[
  {
    "type": "chapter|quiz|assignment|exam",
    "title": "string",
    "due_date": "YYYY-MM-DD",
    "notes": "optional string"
  }
]

Rules:
- type must be exactly: chapter, quiz, assignment, or exam
- due_date must be ISO format (YYYY-MM-DD)
- Include all deadlines, exams, and major topics
- For chapters/topics without dates, use the class date they're covered

Here's my syllabus:
[PASTE SYLLABUS]
```

### LO Import Prompt
```
I need you to extract learning objectives from my course material.

Return ONLY a JSON array with this structure:
[
  {
    "lo_code": "string (e.g., LO-1.1 or 1a)",
    "title": "string (the objective text)"
  }
]

Rules:
- Preserve the original numbering/coding if present
- If no numbering, create sequential codes (1, 2, 3...)
- Keep title text exactly as written
- One object per learning objective

Here are my learning objectives:
[PASTE LOs]
```

---

## REVISED API ENDPOINTS

### Existing (no changes)
- `/api/courses/*`
- `/api/sessions/*`
- etc.

### New Endpoints

```
# Schedule Events
GET    /api/schedule-events?courseId=X
POST   /api/schedule-events
POST   /api/schedule-events/bulk    â† ChatGPT import
PATCH  /api/schedule-events/:id
DELETE /api/schedule-events/:id

# Modules
GET    /api/modules?courseId=X
POST   /api/modules
POST   /api/modules/bulk
PATCH  /api/modules/:id
DELETE /api/modules/:id

# Learning Objectives
GET    /api/learning-objectives?courseId=X&moduleId=Y
POST   /api/learning-objectives
POST   /api/learning-objectives/bulk    â† ChatGPT import
PATCH  /api/learning-objectives/:id
DELETE /api/learning-objectives/:id

# Session Context
GET    /api/sessions/last-context?courseId=X
POST   /api/sessions/generate-context?courseId=X  â† Auto-generates prompt

# LO Sessions
POST   /api/lo-sessions
```

---

## REVISED UI COMPONENTS

### Brain Page - Ingestion Tab

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ INGESTION TAB                                                    â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                  â”‚
â”‚ COURSE: [â–¼ Select Course]                                       â”‚
â”‚                                                                  â”‚
â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
â”‚ SCHEDULE IMPORT                                                  â”‚
â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
â”‚ [Copy Prompt for ChatGPT]                                        â”‚
â”‚                                                                  â”‚
â”‚ Paste ChatGPT response:                                          â”‚
â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚ â”‚                                                             â”‚ â”‚
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚ [Import Schedule]                                                â”‚
â”‚                                                                  â”‚
â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
â”‚ MODULES                                                          â”‚
â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
â”‚ | Module | Files | NotebookLM | Sources | LOs | Status |        â”‚
â”‚ |--------|-------|------------|---------|-----|--------|        â”‚
â”‚ | Mod 1  | âœ…    | âœ…         | 3 files | 5   | Ready  |        â”‚
â”‚ | Mod 2  | âœ…    | âŒ         | 2 files | 0   | Pending|        â”‚
â”‚ | Mod 3  | âŒ    | âŒ         | 0 files | 0   | Empty  |        â”‚
â”‚                                                                  â”‚
â”‚ [Add Module]                                                     â”‚
â”‚                                                                  â”‚
â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
â”‚ LO IMPORT (for selected module)                                  â”‚
â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
â”‚ [Copy Prompt for ChatGPT]                                        â”‚
â”‚                                                                  â”‚
â”‚ Paste ChatGPT response:                                          â”‚
â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚ â”‚                                                             â”‚ â”‚
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚ [Import LOs]                                                     â”‚
â”‚                                                                  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Dashboard - Updated Session Start Card

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ ðŸ“ START SESSION                                                 â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                  â”‚
â”‚ LAST SESSION: Anatomy - Hip (2 days ago)                        â”‚
â”‚ Status: In progress (3/7 LOs solid)                             â”‚
â”‚ Next: "Review glute med attachments"                            â”‚
â”‚                                                                  â”‚
â”‚ UPCOMING:                                                        â”‚
â”‚ âš ï¸ Quiz: Training Principles (3 days)                           â”‚
â”‚ ðŸ“… Exam: Midterm (12 days)                                      â”‚
â”‚                                                                  â”‚
â”‚ MATERIAL STATUS:                                                 â”‚
â”‚ ðŸŸ¢ Anatomy Mod 1 - Ready                                        â”‚
â”‚ ðŸŸ¡ Ex Phys Mod 2 - Missing NotebookLM                           â”‚
â”‚ ðŸ”´ Research Wk 3 - No files                                     â”‚
â”‚                                                                  â”‚
â”‚ [Continue Last] [Pick New] [Quick Start â†’]                      â”‚
â”‚                                                                  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## REVISED BUILD ORDER

### Phase 1: Database Foundation (Tonight Priority)
1. Add tables: `schedule_events`, `modules`, `learning_objectives`, `lo_sessions`
2. Add `source_lock` column to `sessions`
3. Create storage functions
4. Create API endpoints (including bulk import)

### Phase 2: Ingestion UI (Tonight if time)
5. Build prompt generators (schedule + LO)
6. Build JSON import handlers
7. Build Ingestion tab UI
8. Build module checklist UI

### Phase 3: Dashboard Display (Can wait)
9. Session Start Card with material status
10. Progress Widget
11. Upcoming deadlines from schedule_events

### Phase 4: Tutor Integration (Can wait)
12. Accept context from Dashboard/Brain
13. Display source-lock and LOs
14. Log session with LO tracking

---

## TONIGHT'S MINIMAL VIABLE PATH

To start studying tonight, you need:

1. âœ… Schema changes (tables exist)
2. âœ… Bulk import endpoint for LOs
3. âœ… Prompt template for ChatGPT
4. â¸ï¸ Everything else can wait

**Estimated time:** 1-2 hours for schema + endpoint + prompt

Then you can:
- Use ChatGPT to parse your LOs
- Manually track in Brain (basic UI)
- Study with Tutor while agents build the rest

---

## FILES TO MODIFY

```
dashboard_rebuild/
├── schema.ts                 ← Add tables (types)
├── shared/schema.ts          ← Re-export (create if missing)
├── client/src/
│   ├── api.ts                ← Add API calls
│   └── pages/
│       ├── brain.tsx         ← Add Ingestion tab
│       └── dashboard.tsx     ← Add Session Start card
│   └── components/
│       ├── IngestionTab.tsx       ← NEW
│       ├── ModuleChecklist.tsx    ← NEW
│       ├── SessionStartCard.tsx   ← NEW
│       └── ProgressWidget.tsx     ← NEW
brain/
├── db_setup.py               ← Apply DB schema (legacy SQLite)
└── dashboard/api_adapter.py  ← API endpoints
```

---

*Updated: January 23, 2026*


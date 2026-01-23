# DASHBOARD IMPLEMENTATION PLAN (Complete)
**Purpose:** Map where each new feature goes and how to build them in parallel

---

## CURRENT DASHBOARD PAGES - COMPLETE BREAKDOWN

### 1. DASHBOARD PAGE (dashboard.tsx - 1071 lines)

**CURRENT FEATURES:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DASHBOARD PAGE                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STUDY WHEEL SECTION:                                                        │
│  • Current course display (rotation order)                                   │
│  • Complete session button (log minutes)                                     │
│  • Rotate to next course                                                     │
│                                                                              │
│  COURSE MANAGEMENT:                                                          │
│  • List of active courses                                                    │
│  • Add new course                                                            │
│  • Edit course name                                                          │
│  • Delete course (with confirmation)                                         │
│                                                                              │
│  TODAY'S SESSIONS:                                                           │
│  • Count of sessions today                                                   │
│  • Total minutes today                                                       │
│  • Has studied today indicator                                               │
│                                                                              │
│  STREAK COUNTER:                                                             │
│  • Current streak days                                                       │
│                                                                              │
│  WEAKNESS QUEUE:                                                             │
│  • List of weak anchors to review                                            │
│                                                                              │
│  ACADEMIC DEADLINES:                                                         │
│  • Add deadline (title, course, type, due date, notes)                       │
│  • Deadline types: assignment, quiz, exam, project                           │
│  • Urgency indicators (overdue, today, tomorrow, soon, week)                 │
│  • Toggle complete                                                           │
│  • Delete deadline                                                           │
│  • Sorted by due date (incomplete first)                                     │
│                                                                              │
│  GOOGLE TASKS INTEGRATION:                                                   │
│  • Task list selector (multiple lists)                                       │
│  • Prefers "school" list by default                                          │
│  • Create new task                                                           │
│  • Edit task (title, notes, due date)                                        │
│  • Toggle task complete                                                      │
│  • Delete task                                                               │
│  • Convert task to academic deadline                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**WHAT'S MISSING:**
- ❌ Progress tracking by LO/topic
- ❌ "Where did I leave off" quick view
- ❌ Session start flow/checklist
- ❌ Link to Tutor with context

---

### 2. BRAIN PAGE (brain.tsx - 1161 lines)

**CURRENT FEATURES:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BRAIN PAGE                                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  HEADER METRICS:                                                             │
│  • Total sessions count                                                      │
│  • Total minutes                                                             │
│  • Total cards created                                                       │
│                                                                              │
│  TABS: [SESSION EVIDENCE] [DERIVED METRICS] [ISSUES LOG]                    │
│                                                                              │
│  SESSION EVIDENCE TAB:                                                       │
│  • Session evidence table (filterable)                                       │
│  • Filter by date                                                            │
│  • Filter by course                                                          │
│  • Select multiple sessions (checkbox)                                       │
│  • Edit session (mode, minutes, cards, confusions, weak anchors,            │
│    concepts, issues, notes)                                                  │
│  • Delete sessions (single or bulk)                                          │
│  • Session fields: date, course, mode, minutes, cards, confusions,          │
│    weak anchors, concepts, issues, notes                                     │
│                                                                              │
│  DERIVED METRICS TAB:                                                        │
│  • (metrics calculated from sessions)                                        │
│                                                                              │
│  ISSUES LOG TAB:                                                             │
│  • (issues from sessions)                                                    │
│                                                                              │
│  RIGHT SIDEBAR:                                                              │
│                                                                              │
│  OBSIDIAN INTEGRATION:                                                       │
│  • Connection status                                                         │
│  • Quick access course folders (EBP, ExPhys, MS1, Neuro, TI)                │
│  • Folder browser                                                            │
│  • File list in current folder                                               │
│  • File editor (load, edit, save)                                            │
│  • Create new note (session template)                                        │
│  • Navigate folders                                                          │
│                                                                              │
│  ANKI INTEGRATION:                                                           │
│  • Connection status                                                         │
│  • Cards due count                                                           │
│  • Sync button                                                               │
│                                                                              │
│  CHAT INTERFACE:                                                             │
│  • Send message to Brain                                                     │
│  • Upload file for ingestion                                                 │
│  • Sync to Obsidian toggle                                                   │
│  • Response display                                                          │
│  • Cards created feedback                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**WHAT'S MISSING:**
- ❌ Progress tracking by module/LO (new tab)
- ❌ Material ingestion workflow (new tab)
- ❌ Visual progress dashboard
- ❌ "Last session" context

---

### 3. SCHOLAR PAGE (scholar.tsx - 740 lines)

**CURRENT FEATURES:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SCHOLAR PAGE                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  HEADER:                                                                     │
│  • "READ ONLY ADVISORY" badge                                                │
│  • Refresh data button                                                       │
│                                                                              │
│  TABS: [SUMMARY] [TUTOR AUDIT] [QUESTIONS] [EVIDENCE] [PROPOSALS] [HISTORY] │
│                                                                              │
│  SUMMARY TAB:                                                                │
│  • Study Health Overview:                                                    │
│    - Total sessions                                                          │
│    - Sessions this week                                                      │
│    - Average minutes per session                                             │
│  • What's Working:                                                           │
│    - Courses with consistent activity (≥3 sessions)                          │
│    - Round-robin rotation note                                               │
│    - Confidence level (based on session count)                               │
│  • Potential Concerns:                                                       │
│    - Courses with low activity (<3 sessions)                                 │
│    - Unresolved confusions count                                             │
│    - Session issues flagged                                                  │
│  • Chat Interface (Ask Scholar):                                             │
│    - Ask questions about study patterns                                      │
│    - Get recommendations                                                     │
│    - Real API integration                                                    │
│                                                                              │
│  TUTOR AUDIT TAB:                                                            │
│  • Tutor behavior audit questions                                            │
│  • Post-session review items                                                 │
│                                                                              │
│  QUESTIONS TAB (Pipeline):                                                   │
│  • Open questions from Scholar                                               │
│  • Questions about gaps in learning                                          │
│                                                                              │
│  EVIDENCE TAB:                                                               │
│  • Research findings                                                         │
│  • Patterns discovered                                                       │
│                                                                              │
│  PROPOSALS TAB:                                                              │
│  • Suggested improvements                                                    │
│  • Status: PENDING, APPROVED, REJECTED, IMPLEMENTED                          │
│  • Priority: HIGH, MED, LOW                                                  │
│  • Update proposal status                                                    │
│                                                                              │
│  HISTORY TAB:                                                                │
│  • Historical proposals/changes                                              │
│                                                                              │
│  DATA FLOW:                                                                  │
│  • Brain (sessions, metrics) → Scholar (read-only)                           │
│  • Tutor (transcripts, WRAP) → Scholar (post-session only)                   │
│  • No direct database writes (except proposals via API)                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**WHAT'S MISSING:**
- ❌ SOP knowledge browser
- ❌ Concepts library reference
- ❌ Research tracking (what's been tested, what to test)

---

### 4. TUTOR PAGE (tutor.tsx - 303 lines)

**CURRENT FEATURES:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TUTOR PAGE                                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LEFT SIDEBAR:                                                               │
│                                                                              │
│  MODE SELECTOR:                                                              │
│  • Core mode                                                                 │
│  • Sprint mode                                                               │
│  • Drill mode                                                                │
│  • Visual mode indicator (ACTIVE/STANDBY)                                    │
│                                                                              │
│  SETUP:                                                                      │
│  • Course dropdown (Anatomy, Physiology, Neuroscience - hardcoded)          │
│  • Topic input (free text)                                                   │
│  • Start/New session button                                                  │
│                                                                              │
│  CONTEXT PANEL:                                                              │
│  • Session timer (MM:SS)                                                     │
│  • Message count                                                             │
│  • Active sources display (hardcoded examples):                              │
│    - Gray's Anatomy Ch.4                                                     │
│    - Lecture_Notes_W4.pdf                                                    │
│                                                                              │
│  QUICK ACTIONS:                                                              │
│  • EXPLAIN button (sends explain request)                                    │
│  • QUIZ_ME button (sends quiz request)                                       │
│                                                                              │
│  MAIN AREA - CHAT INTERFACE:                                                 │
│  • Message display (tutor/user)                                              │
│  • Mock tutor responses (random from list)                                   │
│  • Message input                                                             │
│  • Send button                                                               │
│  • Session ID display                                                        │
│  • CRT scanline effect overlay                                               │
│                                                                              │
│  MOCK RESPONSES INCLUDE:                                                     │
│  • PEIRRO method mention                                                     │
│  • Seed-Lock principle mention                                               │
│  • Function Before Structure mention                                         │
│  • L2 teach-back mention                                                     │
│  • Source materials mention                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**WHAT'S MISSING:**
- ❌ Material ingestion step (before session)
- ❌ Source-lock input (specify pages/slides)
- ❌ Session start checklist
- ❌ Real SOP integration (currently mock)
- ❌ Dynamic course list (from database)
- ❌ Link from Dashboard with pre-filled context
- ❌ Session wrap/log to Brain

---

### 5. CALENDAR PAGE (calendar.tsx - 1580 lines)

**CURRENT FEATURES:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CALENDAR PAGE                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  VIEW MODES: [MONTH] [WEEK] [DAY] [TASKS]                                   │
│                                                                              │
│  MONTH VIEW:                                                                 │
│  • Calendar grid                                                             │
│  • Navigate months (prev/next)                                               │
│  • Event dots on days                                                        │
│  • Click to select day                                                       │
│                                                                              │
│  WEEK VIEW:                                                                  │
│  • 7-day horizontal display                                                  │
│  • Navigate weeks (prev/next)                                                │
│  • Time slots                                                                │
│  • Events displayed in time slots                                            │
│                                                                              │
│  DAY VIEW:                                                                   │
│  • Single day detailed view                                                  │
│  • Navigate days (prev/next)                                                 │
│  • Hourly time slots                                                         │
│  • Events with full details                                                  │
│                                                                              │
│  TASKS VIEW:                                                                 │
│  • Google Tasks list                                                         │
│  • Sortable task items (drag & drop)                                         │
│  • Task dialog for editing                                                   │
│                                                                              │
│  GOOGLE CALENDAR INTEGRATION:                                                │
│  • Fetch events from Google Calendar                                         │
│  • Create new events                                                         │
│  • Edit events                                                               │
│  • Delete events                                                             │
│  • Event details: title, start, end, description, location                   │
│                                                                              │
│  GOOGLE TASKS INTEGRATION:                                                   │
│  • Multiple task lists                                                       │
│  • Sortable within lists                                                     │
│  • Complete/uncomplete                                                       │
│  • Edit task details                                                         │
│  • Pin tasks                                                                 │
│  • Delete tasks                                                              │
│                                                                              │
│  CALENDAR ASSISTANT:                                                         │
│  • AI assistant for scheduling                                               │
│  • Natural language event creation                                           │
│                                                                              │
│  EVENT CREATION DIALOG:                                                      │
│  • Title, date, start time, end time                                         │
│  • Description, location                                                     │
│  • All-day toggle                                                            │
│                                                                              │
│  COLLAPSIBLE SECTIONS:                                                       │
│  • Pinned items                                                              │
│  • Task lists                                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**WHAT'S MISSING:**
- ❌ Study session scheduling (block time for specific courses)
- ❌ Spaced review reminders
- ❌ Deadline sync from Academic Deadlines
- ❌ Link to start session from calendar event

---

### 6. HOME PAGE (home.tsx - 299 lines)

**CURRENT FEATURES:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HOME PAGE (UI SHOWCASE)                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  • Arcade theme demo                                                         │
│  • UI component showcase                                                     │
│  • Typography examples                                                       │
│  • Layout examples                                                           │
│  • Settings examples                                                         │
│  • Credits/Score display                                                     │
│  • CRT overlay effect                                                        │
│  • Retro arcade grid background                                              │
│                                                                              │
│  NOTE: This is a demo/showcase page, not functional for study               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## NEW FEATURES TO BUILD

### Feature 1: PROGRESS TRACKING
**Purpose:** Track where you are so you don't restart from the same spot

**Location:** 
- Brain page (new "PROGRESS" tab) - detailed table
- Dashboard page (new widget) - summary view

**Data needed:**
```
learning_objectives table:
- id
- course_id (FK to courses)
- module (string)
- lo_code (e.g., "LO-4.1")
- title (string)
- status: "not_started" | "in_progress" | "need_review" | "solid"
- last_session_id (FK to sessions)
- last_session_date
- next_action (string)
- created_at
- updated_at

lo_sessions table (join):
- id
- lo_id (FK)
- session_id (FK)
- status_before
- status_after
- notes
```

---

### Feature 2: SESSION START FLOW
**Purpose:** Quick-start when you sit down lost

**Location:**
- Dashboard page (new prominent card)
- Tutor page (receives context)

**Flow:**
1. Show "where you left off" (last session context)
2. Pick target (continue or choose new)
3. Check material ready (yes → Tutor, no → Ingestion)
4. Select mode (Core/Sprint/Drill)
5. Go to Tutor with pre-filled context

---

### Feature 3: MATERIAL INGESTION
**Purpose:** Prepare raw content for study

**Location:**
- Brain page (new "INGESTION" tab) OR
- Tutor page (first step if no material)

**Flow:**
1. Select course + topic/LO
2. Check which sources you have
3. Quick extraction checklist
4. Set source-lock (pages, slides, timestamps)
5. Timer (15 min max)
6. Hand off to Tutor

---

## TASK BREAKDOWN (Parallelizable)

### DATABASE (Week 1)
| ID | Task | Depends | Est |
|----|------|---------|-----|
| DB-1 | Create `learning_objectives` table | - | 1h |
| DB-2 | Create `lo_sessions` join table | DB-1 | 30m |
| DB-3 | Add `source_lock` JSON field to sessions | - | 30m |
| DB-4 | API: LO CRUD endpoints | DB-1 | 2h |
| DB-5 | API: "last session context" endpoint | DB-1,2 | 1h |
| DB-6 | API: Update session with LO tracking | DB-2 | 1h |

### UI COMPONENTS (Week 2 - Parallel)
| ID | Task | Depends | Page | Est |
|----|------|---------|------|-----|
| UI-1 | ProgressTable component | DB-4 | Brain | 3h |
| UI-2 | ProgressWidget component | DB-4 | Dashboard | 2h |
| UI-3 | SessionStartCard component | DB-5 | Dashboard | 2h |
| UI-4 | QuickStartModal component | UI-3 | Dashboard | 2h |
| UI-5 | IngestionWizard component | DB-3 | Brain | 3h |
| UI-6 | Update Tutor course dropdown | - | Tutor | 1h |

### INTEGRATION (Week 3)
| ID | Task | Depends | Est |
|----|------|---------|-----|
| INT-1 | Dashboard → Tutor navigation with context | UI-4 | 2h |
| INT-2 | Ingestion → Tutor with source-lock | UI-5 | 2h |
| INT-3 | Tutor session → log with LO tracking | UI-1, DB-6 | 2h |
| INT-4 | Brain tab navigation updates | UI-1, UI-5 | 1h |

---

## PAGE LAYOUTS AFTER IMPLEMENTATION

### DASHBOARD (Updated)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DASHBOARD                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ROW 1:                                                                      │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │ 📍 SESSION START [NEW]          │  │ 🎯 STUDY WHEEL [existing]       │  │
│  │                                 │  │                                 │  │
│  │ Last: Anatomy - Hip (2d ago)    │  │ Current: Legal & Ethics        │  │
│  │ Status: In progress (3/7 solid) │  │ Minutes: [___] [Log Session]   │  │
│  │ Next: "Review glute med"        │  │                                 │  │
│  │                                 │  │ Course list below...            │  │
│  │ [Continue] [New] [Quick Start→] │  │                                 │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                              │
│  ROW 2:                                                                      │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │ 📊 PROGRESS SUMMARY [NEW]       │  │ 🔥 STREAK [existing]            │  │
│  │                                 │  │                                 │  │
│  │ Anatomy: ████████░░ 12/20      │  │ 5 days                         │  │
│  │ Pathology: █████░░░░ 8/15      │  │                                 │  │
│  │ Legal: ██░░░░░░░░ 3/12         │  │ Today: 45 min (2 sessions)     │  │
│  │                                 │  │                                 │  │
│  │ [View All in Brain →]           │  │                                 │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                              │
│  ROW 3:                                                                      │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │ ⚠️ WEAKNESS QUEUE [existing]    │  │ 📋 TASKS [existing]             │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                              │
│  ROW 4:                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 📅 ACADEMIC DEADLINES [existing]                                        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### BRAIN (Updated)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BRAIN                                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  HEADER: Sessions: X | Minutes: Y | Cards: Z                                │
│                                                                              │
│  TABS: [EVIDENCE] [METRICS] [ISSUES] [PROGRESS★] [INGESTION★]              │
│         existing   existing  existing  NEW         NEW                      │
│                                                                              │
│  PROGRESS TAB [NEW]:                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Filter: [Course ▼] [Module ▼] [Status ▼]                               ││
│  │                                                                          ││
│  │ | Course | Module | LO | Status | Last Session | Next Action |          ││
│  │ |--------|--------|-----|--------|--------------|-------------|          ││
│  │ | Anatomy | Hip | 4.1 | In Prog | Jan 21 | Review attachments |         ││
│  │ | Anatomy | Hip | 4.2 | Solid | Jan 21 | - |                            ││
│  │ | Anatomy | Knee | 5.1 | Not Started | - | Begin priming |              ││
│  │                                                                          ││
│  │ [Add LO] [Import from Syllabus]                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  INGESTION TAB [NEW]:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ STEP 1: What are you studying?                                          ││
│  │ Course: [▼] Module: [▼] LO: [▼ or paste]                               ││
│  │                                                                          ││
│  │ STEP 2: What sources do you have?                                       ││
│  │ [ ] Slides (pages: ___)  [ ] Video (timestamps: ___)                    ││
│  │ [ ] Textbook (pages: ___)  [ ] NotebookLM ✓                             ││
│  │                                                                          ││
│  │ STEP 3: Source-Lock Preview                                             ││
│  │ ┌─────────────────────────────────────────────────────────────────────┐ ││
│  │ │ Slides 12-25, Chapter 4 pp.80-95                                    │ ││
│  │ └─────────────────────────────────────────────────────────────────────┘ ││
│  │                                                                          ││
│  │ [Start Session in Tutor →]                                              ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  RIGHT SIDEBAR: [Obsidian] [Anki] [Chat] - existing                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### TUTOR (Updated)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TUTOR                                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LEFT SIDEBAR:                                                              │
│  ┌─────────────────────────────────┐                                        │
│  │ MODE: [CORE] [SPRINT] [DRILL]  │  ← existing                            │
│  │                                 │                                        │
│  │ Course: [▼ from DB] ← UPDATE   │                                        │
│  │ Topic: [___________]           │                                        │
│  │                                 │                                        │
│  │ [START SESSION]                │                                        │
│  └─────────────────────────────────┘                                        │
│                                                                              │
│  ┌─────────────────────────────────┐                                        │
│  │ CONTEXT                         │                                        │
│  │                                 │                                        │
│  │ Timer: 00:00                   │                                        │
│  │ Messages: 0                    │                                        │
│  │                                 │                                        │
│  │ SOURCE-LOCK: [NEW]             │                                        │
│  │ ┌───────────────────────────┐  │                                        │
│  │ │ Slides 12-25              │  │  ← from Ingestion or manual           │
│  │ │ Chapter 4 pp.80-95        │  │                                        │
│  │ └───────────────────────────┘  │                                        │
│  │                                 │                                        │
│  │ TARGET LOs: [NEW]              │                                        │
│  │ • LO 4.1 - Hip anatomy         │  ← from Dashboard/Ingestion            │
│  │ • LO 4.2 - Hip function        │                                        │
│  │                                 │                                        │
│  │ [EXPLAIN] [QUIZ_ME]            │  ← existing                            │
│  └─────────────────────────────────┘                                        │
│                                                                              │
│  MAIN: Chat interface (existing)                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## FILES TO CREATE/MODIFY

### New Components
```
client/src/components/
├── ProgressTable.tsx        ← Brain progress tab
├── ProgressWidget.tsx       ← Dashboard summary
├── SessionStartCard.tsx     ← Dashboard "where you left off"
├── QuickStartModal.tsx      ← Dashboard quick start flow
└── IngestionWizard.tsx      ← Brain ingestion tab
```

### Modified Pages
```
client/src/pages/
├── dashboard.tsx   ← Add SessionStartCard, ProgressWidget
├── brain.tsx       ← Add Progress tab, Ingestion tab
└── tutor.tsx       ← Receive context, show source-lock, dynamic courses
```

### Server
```
server/
├── schema.ts       ← Add learning_objectives, lo_sessions tables
├── routes.ts       ← Add LO endpoints, last-session endpoint
└── storage.ts      ← Add LO queries
```

---

## BUILD ORDER (Recommended)

**Sprint 1 (Database + API):**
- DB-1, DB-2, DB-3, DB-4, DB-5, DB-6

**Sprint 2 (UI - can split):**
- Person A: UI-1 (ProgressTable), UI-5 (IngestionWizard)
- Person B: UI-2 (ProgressWidget), UI-3 (SessionStartCard), UI-4 (QuickStartModal)

**Sprint 3 (Integration):**
- INT-1, INT-2, INT-3, INT-4

---

*Plan saved at: `C:\pt-study-sop\DASHBOARD_IMPLEMENTATION_PLAN.md`*

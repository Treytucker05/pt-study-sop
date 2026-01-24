# GOALS - Consolidated from Notes

**Created:** January 24, 2026
**Source:** Dashboard saved notes
**Last Updated:** January 24, 2026

---

## Priority Tiers

### Tier 1: Immediate (This Week)
Items that fix current functionality or unblock workflows.

### Tier 2: Near-Term (Next 2 Weeks)
Feature additions that improve daily use.

### Tier 3: Later (Backlog)
Infrastructure upgrades, research items.

---

## GOAL 1: Fix Calendar LLM
**Tier:** 1 - Immediate
**Category:** Calendar
**Problem:** Calendar LLM shows "No API key configured"
**Root Cause:** `brain/data/api_config.json` missing `openrouter_api_key` or `openai_api_key`

### Milestones

#### M1.1: Add API Key to Config
**Status:** Not Started
**Files:** `brain/data/api_config.json`
**Steps:**
1. Open `brain/data/api_config.json`
2. Add field: `"openrouter_api_key": "sk-or-v1-YOUR_KEY_HERE"`
   - OR add: `"openai_api_key": "sk-YOUR_KEY_HERE"`
3. Save file
4. Restart dashboard

**Validation:** Calendar assistant no longer shows "No API key configured"

#### M1.2: Verify Google Calendar OAuth
**Status:** Not Started  
**Files:** `brain/dashboard/gcal.py`, `brain/data/api_config.json`
**Steps:**
1. Check if `google_calendar.client_id` and `client_secret` are populated
2. If empty, get credentials from Google Cloud Console
3. Add to config
4. Click "Connect Google Calendar" in UI
5. Complete OAuth flow

**Validation:** Calendar shows "CONNECTED" status, events load

#### M1.3: Test Calendar LLM Functions
**Status:** Not Started
**Steps:**
1. Open Calendar page
2. Click AI_ASSIST button
3. Test: "What events do I have tomorrow?"
4. Test: "Create a study session tomorrow at 3pm"
5. Test: "Delete the study session I just created"

**Validation:** All 3 commands execute successfully

#### M1.4: Verify Isolation from Other LLM Chats
**Status:** Not Started
**Problem:** Need to confirm Calendar LLM is separate from Brain/Tutor chats
**Files:** 
- `brain/dashboard/api_adapter.py` (lines 2070-2131)
- `brain/dashboard/calendar_assistant.py`
**Steps:**
1. Review code - Calendar uses `calendar_assistant.py` (SEPARATE from brain_chat)
2. Confirm Brain chat uses different endpoint (`/api/brain/chat`)
3. Confirm Tutor uses `tutor_engine.py`

**Validation:** Code review confirms isolation - each has separate endpoint + module

---

## GOAL 2: Scholar System Improvements LLM
**Tier:** 2 - Near-Term
**Category:** Scholar
**Problem:** Need an LLM on Scholar page to intake system issues and route them into Scholar loop

### Milestones

#### M2.1: Design Scholar Input Flow
**Status:** Not Started
**Steps:**
1. Define what "system issues" look like (from WRAP, from user, from friction alerts)
2. Decide output: question → hypothesis → proposal (existing Scholar loop)
3. Map to existing Scholar templates

**Deliverable:** Spec document in `JANUARY_26_PLAN/SCHOLAR_LLM_SPEC.md`

#### M2.2: Create Scholar Chat Component
**Status:** Not Started
**Files:** 
- Create: `dashboard_rebuild/client/src/components/ScholarAssistant.tsx`
- Modify: `dashboard_rebuild/client/src/pages/scholar.tsx`
**Steps:**
1. Copy `CalendarAssistant.tsx` as template
2. Change API endpoint to `/api/scholar/assistant`
3. Add to Scholar page

#### M2.3: Create Scholar Assistant Backend
**Status:** Not Started
**Files:**
- Create: `brain/dashboard/scholar_assistant.py`
- Modify: `brain/dashboard/api_adapter.py`
**Steps:**
1. Create module with tools: `create_question`, `create_hypothesis`, `create_proposal`
2. Add API endpoint `/api/scholar/assistant`
3. Wire to existing Scholar outputs folder

#### M2.4: Test Full Loop
**Status:** Not Started
**Steps:**
1. Type: "WRAP is filling in fields it doesn't know"
2. Verify creates question in `scholar/outputs/questions_dashboard.md`
3. Test: "Propose a fix for this"
4. Verify creates proposal in `scholar/outputs/promotion_queue/`

---

## GOAL 3: Session Evidence Table - Date Selector + Semester
**Tier:** 1 - Immediate
**Category:** Brain Page
**Location:** `dashboard_rebuild/client/src/pages/brain.tsx`

### Milestones

#### M3.1: Add Date Range Picker
**Status:** Not Started
**Files:** `dashboard_rebuild/client/src/pages/brain.tsx`
**Current State:** Has `dateFilter` state but UI unclear
**Steps:**
1. Add date input for "From" date
2. Add date input for "To" date  
3. Filter sessions by `session_date BETWEEN from AND to`

**Validation:** Can filter sessions to specific date range

#### M3.2: Add Semester Dropdown
**Status:** Not Started
**Steps:**
1. Add dropdown: "All", "Semester 1", "Semester 2"
2. Define semester date ranges:
   - Sem 1: Aug 15 - Dec 15
   - Sem 2: Jan 10 - May 15
3. Filter sessions by semester date range

**Validation:** Selecting Semester 2 shows only Jan-May sessions

#### M3.3: Wire Filters to API
**Status:** Not Started
**Files:** 
- `dashboard_rebuild/client/src/pages/brain.tsx`
- `brain/dashboard/api_adapter.py` (sessions endpoint)
**Steps:**
1. Add query params: `?dateFrom=X&dateTo=Y&semester=2`
2. Update API to filter by these params
3. Test combined filters

---

## GOAL 4: Ingestion - Schedule to Calendar + Tasks + Dedup
**Tier:** 1 - Immediate
**Category:** Brain / Ingestion
**Location:** `dashboard_rebuild/client/src/components/IngestionTab.tsx`

### Milestones

#### M4.1: Audit Current Ingestion Flow
**Status:** Not Started
**Files:** `IngestionTab.tsx`, `brain/dashboard/api_adapter.py`
**Steps:**
1. Check what `api.scheduleEvents.createBulk()` does
2. Trace where events go (local DB only? or Google Calendar?)
3. Document current behavior

**Deliverable:** Notes on current vs desired behavior

#### M4.2: Add Google Calendar Sync on Import
**Status:** Not Started
**Files:** 
- `brain/dashboard/api_adapter.py` (schedule_events endpoint)
- `brain/dashboard/gcal.py`
**Steps:**
1. After saving to local DB, call `gcal.create_event()` for each
2. Store Google event ID in local record for tracking
3. Handle "assignment" type → create Google Task instead

#### M4.3: Add Deduplication Check
**Status:** Not Started
**Steps:**
1. Before creating event, query Google Calendar for same date + similar title
2. If match found, skip or prompt user
3. Add "already exists" indicator in import results

**Validation:** Importing same schedule twice doesn't create duplicates

#### M4.4: Add Google Tasks for Assignments
**Status:** Not Started
**Steps:**
1. If `type === "assignment"`, create Google Task with due date
2. Add to "School Tasks" list (or create if doesn't exist)
3. Store task ID in local record

---

## GOAL 5: Assignment LLM Input (Part of Goal 4)
**Merged into Goal 4** - The ingestion flow handles this via ChatGPT prompt parsing

---

## GOAL 6: Scholar → LangGraph Migration
**Tier:** 3 - Later
**Category:** Scholar / Infrastructure

### Research Required First
- [ ] Read LangGraph docs for local-first setup
- [ ] Understand current Scholar workflow (`workflows/orchestrator_loop.md`)
- [ ] Map agents to graph nodes

### Current Scholar Structure (from code review):
- `workflows/orchestrator_loop.md` - Main loop
- `workflows/agents/` - Individual agent definitions
- Outputs to `scholar/outputs/` folders

### Milestones (After Research)
- M6.1: Set up LangGraph locally
- M6.2: Create graph definition file
- M6.3: Migrate orchestrator loop to graph
- M6.4: Migrate individual agents
- M6.5: Test full run

---

## GOAL 7: LangSmith Tracing for Scholar
**Tier:** 3 - Later
**Category:** Observability

### Research Required
- [ ] LangSmith account setup
- [ ] Free tier limits
- [ ] Integration with existing OpenRouter calls

### Milestones (After Research)
- M7.1: Create LangSmith project
- M7.2: Add tracing to Scholar LLM calls
- M7.3: Define eval criteria (accuracy, relevance, actionability)
- M7.4: Build eval dataset from past runs
- M7.5: Run evals

---

## GOAL 8: RAG Upgrade - Embeddings + Retriever
**Tier:** 3 - Later
**Category:** Brain / RAG

### Research Required
- [ ] Current RAG implementation (check `brain/` for vector store)
- [ ] Embedding model options (local vs API)
- [ ] Vector store options (ChromaDB, FAISS, etc.)

### Milestones (After Research)
- M8.1: Choose embedding model
- M8.2: Set up vector store
- M8.3: Index existing content (notes, session logs)
- M8.4: Build retriever chain
- M8.5: Integrate with Tutor queries

---

## Quick Reference: What to Do First

### COMPLETED (Jan 24, 2026)
1. **Brain Chat Mode Selector** - Added mode buttons (ALL, OBSIDIAN, ANKI, METRICS) above chat input
   - Files modified: `dashboard_rebuild/client/src/pages/brain.tsx`, `dashboard_rebuild/client/src/api.ts`
   - Backend: `brain/dashboard/api_adapter.py`
2. **Anki Auto-Sync** - When mode is "ANKI", cards are auto-approved and synced to Anki immediately
   - Requires Anki desktop running with AnkiConnect plugin

### NEXT STEPS
1. **GOAL 1 M1.1** - Add API key to `brain/data/api_config.json` (5 min fix)
2. **GOAL 1 M1.2** - Set up Google OAuth if not done
3. **GOAL 3** - Date/semester filters (UI work)
4. **GOAL 4 M4.1** - Audit ingestion (understand before changing)

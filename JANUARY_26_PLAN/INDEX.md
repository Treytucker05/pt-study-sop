# JANUARY 26 PLAN - INDEX

**Date Created:** January 23, 2026
**Target Implementation:** January 26, 2026
**Last Updated:** January 24, 2026 (WRAP ingestion implementation)

---

## Documents in This Folder

### GOALS.md (NEW - Consolidated Notes)
**What it covers:**
- 8 goals extracted from dashboard saved notes
- Organized by priority tier (Immediate / Near-Term / Later)
- Each goal broken into milestones with checkboxes
- Research queue for LangChain/LangSmith

**Tier 1 (Immediate):** Fix Calendar LLM, WRAP quality, Date selector + Semester 2
**Tier 2 (Near-Term):** Class week checklist ingestion, Assignment LLM auto-populate
**Tier 3 (Later):** LangGraph migration, LangSmith tracing, RAG upgrade

---

### WRAP_INGESTION_MILESTONES.md (NEW - WRAP Ingestion Roadmap)
**What it covers:**
- WRAP ingestion milestones (DB schema, parser, Obsidian merge, Brain Chat handler, Tutor Issues API, frontend)
- Dependencies, execution order, and testing checklist

---

### WRAP_INGESTION_EXECPLAN.md (NEW - Execution Plan)
**What it covers:**
- Living ExecPlan for WRAP ingestion implementation
- Progress log, decisions, surprises, and validation steps
- Concrete commands and acceptance criteria

---

### 0. UPDATED_PLAN.md (NEW - Read This First!)
**What it covers:**
- Revised data model (modules as unit of material tracking)
- Pre-study checklist fields (files_downloaded, notebooklm_loaded)
- Schedule events table for syllabus import
- ChatGPT-assisted ingestion prompts
- Minimal viable path for tonight
- Updated build order

**Key Changes from Original:**
- Materials tracked at MODULE level, not per-LO
- Added schedule_events table for syllabus data
- ChatGPT does the parsing, Brain does bulk import
- Simplified tonight's priority to just get ingestion working

---

### 0.5 MILESTONE_INSTRUCTIONS.md (IMPLEMENTATION GUIDE)
**What it covers:**
- Complete step-by-step instructions for each milestone
- All file paths explicitly listed
- Exact code to add/modify
- Validation steps after each milestone
- Pre-flight checks before starting

**Milestones:**
1. Database Schema - Add tables to schema.ts (types) and apply DB changes in `brain/db_setup.py`
2. API Layer - Add CRUD handlers in `brain/dashboard/api_adapter.py`
3. API Client - Add methods to client/src/api.ts
4. ChatGPT Prompts - Create import prompt templates
5. Ingestion Tab UI - Build Brain page Ingestion tab

**Tonight's Minimum Viable Path:** Milestones 1-4 (2 hours)

---

### 1. PROJECT_OVERVIEW.md (383 lines)
**What it covers:**
- The complete vision (Tutor â†’ Brain â†’ Scholar loop)
- The problem we identified (material ingestion gap)
- Current state vs what's needed
- What we built (MASTER_SOP consolidation, Concepts Library)
- Complete system flow diagram
- Key principles and evidence base
- Next steps roadmap
- File locations

### 2. DASHBOARD_IMPLEMENTATION_PLAN.md (633 lines)
**What it covers:**
- Complete breakdown of all 6 current pages (Dashboard, Brain, Scholar, Tutor, Calendar, Home)
- Every feature currently on each page
- What's missing from each page
- 3 new features to build:
  1. Progress Tracking (Brain table + Dashboard widget)
  2. Session Start Flow (Dashboard card + modal)
  3. Material Ingestion (Brain tab)
- Database schema changes needed
- Task breakdown with dependencies
- Parallelizable work assignments
- Updated page layouts (wireframes)
- Files to create/modify

### 3. EXECPLAN_DASHBOARD.md (97 lines)
**What it covers:**
- Living execution plan for implementing the dashboard changes
- Progress checklist with timestamps
- Surprises & discoveries (schema location, @shared/schema alias)
- Decision log (source_lock as JSON, query param routing, etc.)
- Concrete steps with npm commands
- Validation and acceptance criteria
- Interface definitions (learning_objectives, lo_sessions, sessions.source_lock)

---

## Quick Reference

### New Database Tables Needed:
```sql
learning_objectives (id, course_id, module, lo_code, title, status, last_session_id, last_session_date, next_action, created_at, updated_at)
lo_sessions (id, lo_id, session_id, status_before, status_after, notes)
sessions.source_lock (JSON string - array of source labels)
```

### New UI Components Needed:
```
ProgressTable.tsx      â†’ Brain page (Progress tab)
ProgressWidget.tsx     â†’ Dashboard page
SessionStartCard.tsx   â†’ Dashboard page
QuickStartModal.tsx    â†’ Dashboard page
IngestionWizard.tsx    â†’ Brain page (Ingestion tab)
```

### Build Order (from EXECPLAN):
**Milestone 1:** Data model and API foundation
- Update schema.ts (types only)
- Create shared/schema.ts
- Update `brain/db_setup.py` (legacy DB)
- Add REST endpoints in `brain/dashboard/api_adapter.py`
- Update client/src/api.ts

**Milestone 2:** UI components and page integration
- Create ProgressTable, ProgressWidget, SessionStartCard, QuickStartModal, IngestionWizard
- Update brain.tsx (Progress + Ingestion tabs)
- Update dashboard.tsx (SessionStartCard + ProgressWidget)

**Milestone 3:** Tutor context and session logging integration
- Update tutor.tsx (real courses, prefilled context, LO tracking)
- Route Quick Start and Ingestion to Tutor with query params

---

## Related Files in Repo (Reference)

### Essential Reference:
- `docs/full-ui-api-audit-2026-01-22.md` â€” Complete API endpoint inventory
- `docs/contracts/wrap_schema.md` â€” WRAP required fields (source_lock is there!)
- `docs/root/PROJECT_ARCHITECTURE.md` â€” Deep architecture doc
- `docs/root/SYSTEM_INVENTORY.md` â€” Engines, frameworks, mechanisms, modes

### Helpful Context:
- `README.md` â€” System overview, milestone plans
- `CONTINUITY.md` â€” Recent changes log
- `docs/root/GUIDE_USER.md` / `docs/root/GUIDE_DEV.md` / `docs/root/GUIDE_ARCHITECTURE.md` â€” System guides

### Source Code:
- `dashboard_rebuild/` — Current dashboard codebase (frontend only)
- `dashboard_rebuild/schema.ts` — Client types schema (not used for DB migrations)
- `brain/db_setup.py` — Legacy DB schema/migrations
- `brain/dashboard/api_adapter.py` — API endpoints
- `dashboard_rebuild/client/src/pages/` — Page components

---

## Key Decisions Already Made (from EXECPLAN)

1. **Schema location:** Use `schema.ts` at dashboard_rebuild root (not server/)
2. **@shared/schema:** Create `shared/schema.ts` that re-exports from `../schema.ts`
3. **Last session context:** Most recent session for selected course, fallback to overall
4. **Tutor context passing:** Query parameters on `/tutor` (courseId, loIds, sourceLock, mode)
5. **source_lock format:** JSON string representing array of strings

---

## Validation Criteria

From EXECPLAN, the implementation is complete when:
- Dashboard shows SessionStartCard with last session context
- Dashboard shows ProgressWidget summarizing LO status by course
- Brain has Progress tab listing LOs
- Brain has Ingestion tab collecting sources and building source lock
- Tutor shows dynamic courses from DB
- Tutor displays incoming context (source lock and LOs)
- Completing a Tutor session updates LO status and last session context

API checks:
- `GET /api/learning-objectives` returns array
- `GET /api/sessions/last-context?courseId=1` returns context object


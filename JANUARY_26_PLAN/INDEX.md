# JANUARY 26 PLAN - INDEX

**Date Created:** January 23, 2026
**Target Implementation:** January 26, 2026

---

## Documents in This Folder

### 1. PROJECT_OVERVIEW.md (383 lines)
**What it covers:**
- The complete vision (Tutor → Brain → Scholar loop)
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
ProgressTable.tsx      → Brain page (Progress tab)
ProgressWidget.tsx     → Dashboard page
SessionStartCard.tsx   → Dashboard page
QuickStartModal.tsx    → Dashboard page
IngestionWizard.tsx    → Brain page (Ingestion tab)
```

### Build Order (from EXECPLAN):
**Milestone 1:** Data model and API foundation
- Update schema.ts (add tables)
- Create shared/schema.ts
- Extend server/storage.ts
- Add REST endpoints
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
- `docs/full-ui-api-audit-2026-01-22.md` — Complete API endpoint inventory
- `docs/contracts/wrap_schema.md` — WRAP required fields (source_lock is there!)
- `docs/root/PROJECT_ARCHITECTURE.md` — Deep architecture doc
- `docs/root/SYSTEM_INVENTORY.md` — Engines, frameworks, mechanisms, modes

### Helpful Context:
- `README.md` — System overview, milestone plans
- `CONTINUITY.md` — Recent changes log
- `docs/root/GUIDE_USER.md` / `docs/root/GUIDE_DEV.md` / `docs/root/GUIDE_ARCHITECTURE.md` — System guides

### Source Code:
- `dashboard_rebuild/` — Current dashboard codebase
- `dashboard_rebuild/schema.ts` — Database schema (NOT server/schema.ts!)
- `dashboard_rebuild/server/routes.ts` — API endpoints
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

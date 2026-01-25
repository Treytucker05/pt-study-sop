# Dashboard Gap Analysis Report
**Generated:** 2026-01-15 (Updated)
**Scope:** React frontend vs old Jinja dashboard; UI-to-backend connectivity

---

## Executive Summary

This report documents unused/unconnected UI elements, orphaned endpoints, and missing features in the PT Study Brain React dashboard compared to the original Jinja dashboard.

**Findings:**
- 15 UI elements with no functionality (buttons/forms not wired)
- 6 placeholder/hardcoded data displays
- 4 backend endpoints returning stub data
- 5+ orphaned backend endpoints (never called)
- Key missing features: Fast Entry ingestion, AI tutor backend, Anki sync, RAG management

---

## 1. Unconnected UI Elements

### Critical Priority (Core functionality broken)

| File:Line | Element | Issue | Evidence |
|-----------|---------|-------|----------|
| `brain/static/react/src/pages/brain.tsx:82-91` | Fast Entry textarea + INGEST_DATA button | Not wired to any API | Textarea has no state binding; button has no onClick handler |
| `brain/static/react/src/pages/tutor.tsx:30-55` | AI Tutor chat | Uses fake local responses, no AI backend | `generateTutorResponse()` returns random canned strings; no real `/api/ai/chat` call |
| `brain/static/react/src/pages/scholar.tsx:365-367` | SUBMIT_ANSWER button | Captures input but never submits | `questionAnswers` state collected but no mutation to POST answers |

### High Priority (Expected functionality missing)

| File:Line | Element | Issue | Evidence |
|-----------|---------|-------|----------|
| `brain/static/react/src/pages/brain.tsx:77-79` | COPY_PROMPT button | No onClick handler | `<Button>COPY_PROMPT</Button>` - missing clipboard logic |
| `brain/static/react/src/pages/brain.tsx:276-291` | Anki Connect panel | Entirely placeholder | "CONNECTED" badge is hardcoded; "12 CARDS PENDING" is static; SYNC_NOW has no onClick |
| `brain/static/react/src/pages/tutor.tsx:202-203` | EXPLAIN button | No onClick handler | Button renders but does nothing |
| `brain/static/react/src/pages/tutor.tsx:205-206` | QUIZ_ME button | No onClick handler | Button renders but does nothing |
| `brain/static/react/src/pages/calendar.tsx:665-674` | Create Event (Google Calendar) | Only creates local events | UI allows selecting Google calendar but `createEventMutation` only calls local API |

### Medium Priority (Display-only or placeholder data)

| File:Line | Element | Issue | Evidence |
|-----------|---------|-------|----------|
| `brain/static/react/src/pages/brain.tsx:252-273` | Mastery Tracker panel | Hardcoded data | Static array: `[{ topic: "Neuroscience", score: 92 }, ...]` |
| `brain/static/react/src/pages/tutor.tsx:140-147` | Course Select dropdown | Value not used | `defaultValue="anat"` but no onChange, selection never consumed |
| `brain/static/react/src/pages/tutor.tsx:187-197` | Active Sources panel | Hardcoded | Shows static "Gray's Anatomy Ch.4" and "Lecture_Notes_W4.pdf" |
| `brain/static/react/src/pages/scholar.tsx:276-277` | SAFE_MODE Switch | Display-only | `<Switch disabled />` - cannot be toggled |
| `brain/static/react/src/pages/scholar.tsx:281` | MULTI_AGENT Switch | Display-only | `<Switch disabled />` - cannot be toggled |
| `brain/static/react/src/pages/scholar.tsx:332-336` | Next Steps action buttons | No onClick | Conditional buttons render but have no handlers |

### Low Priority (Demo/showcase page - intentional)

| File:Line | Element | Issue | Evidence |
|-----------|---------|-------|----------|
| `brain/static/react/src/pages/home.tsx:131-145` | All action buttons | Demo-only | START GAME, CONTINUE, etc. are UI showcase |
| `brain/static/react/src/pages/home.tsx:186-189` | High Scores | Hardcoded | Static leaderboard for theme demo |
| `brain/static/react/src/pages/home.tsx:263-285` | Settings panel | Not wired | Volume slider, switches, RESET_DEFAULTS - all decorative |

---

## 2. Backend Endpoint Issues

### Stub Implementations (returning placeholder data)

| File:Line | Endpoint | Issue | Evidence |
|-----------|----------|-------|----------|
| `brain/dashboard/api_adapter.py:529` | POST `/api/tasks` | Returns stub | `return jsonify({"id": 999, "status": "mocked"})` |
| `brain/dashboard/api_adapter.py:627-632` | POST `/api/scholar/api-key` | Has TODO, returns stub | Comment indicates incomplete; returns placeholder response |
| `brain/dashboard/api_adapter.py:586` | GET `/api/scholar/status` | Simplified stub | Fixed import issues but returns minimal status (no real PID tracking) |

### Orphaned Endpoints (defined but never called by React)

| File:Line | Endpoint | Method | Notes |
|-----------|----------|--------|-------|
| `brain/dashboard/routes.py` | `/api/brain/status` | GET | No React caller found |
| `brain/dashboard/routes.py` | `/api/sync/pending` | GET | No React caller found |
| `brain/dashboard/routes.py` | `/api/sync/resolve` | POST | No React caller found |
| `brain/dashboard/routes.py` | `/api/scraper/run` | POST | No React caller found |
| `brain/dashboard/routes.py` | `/api/mastery` | GET | Brain page uses hardcoded data instead |
| `brain/dashboard/routes.py` | `/api/trends` | GET | No React caller found |
| `brain/dashboard/routes.py` | `/api/rag/index-repo` | POST | No React caller; documented as CLI-only |
| `brain/dashboard/routes.py` | `/api/rag/search` | POST | No React caller; documented as CLI-only |
| `brain/dashboard/routes.py` | `/api/gtasks/lists` | GET | No React caller; unused |
| `brain/dashboard/routes.py` | `/api/scholar/implementation-bundle` | GET | No React caller |
| `brain/dashboard/routes.py` | `/api/scholar/execute-via-ai` | POST | No React caller |
| `brain/dashboard/routes.py` | `/api/tutor/card-draft` | POST | No React caller |
| `brain/dashboard/routes.py` | `/api/resume/download` | GET | No React caller |

### Duplicate/Overlapping Routes

| Endpoint | routes.py (dashboard_bp) | api_adapter.py (adapter_bp) |
|----------|--------------------------|----------------------------|
| `/api/scholar` | Yes | Yes (proxy) |
| `/api/scholar/run` | Yes | Yes |
| `/api/scholar/status` | Yes | Yes |
| `/api/scholar/api-key` | Yes | Yes |

**Recommendation:** Consolidate Scholar routes into one blueprint to avoid confusion.

---

## 3. Missing Features (Old Dashboard vs React)

### Calendar Tab

| Feature | Old Dashboard | React Status | Gap |
|---------|---------------|--------------|-----|
| Calendar views (month/week/day) | Yes | Yes | None |
| Week selector | Yes | Yes | None |
| Study tasks panel | Yes | Yes | None |
| Google Calendar sync | Yes | Yes | None |
| Create event on Google Calendar | Yes | PARTIAL | Only creates local events despite UI allowing Google calendar selection |
| Syllabus intake form | Yes | No | Missing form to add new syllabus entries |
| ChatGPT JSON import | Yes | No | Missing feature to import syllabus from ChatGPT JSON |
| Course colors | Yes | Partial | Basic implementation exists |

### Brain Tab

| Feature | Old Dashboard | React Status | Gap |
|---------|---------------|--------------|-----|
| Session list | Yes | Yes | None |
| Session create (manual) | Yes | Yes | None |
| Session delete | Yes | Yes | None |
| Session edit | Yes | No | Missing edit modal |
| Session detail expansion | Yes | No | what_worked, what_needs_fixing, notes not shown |
| Fast Entry textarea | Yes | BROKEN | Textarea exists but INGEST_DATA button not wired |
| Copy prompt | Yes | BROKEN | Button exists but no clipboard functionality |
| Resume generation | Yes | No | Missing feature |
| Database stats | Yes | Partial | Shows basic stats |
| Topic mastery tracker | Yes | PLACEHOLDER | Hardcoded data, not fetching from `/api/mastery` |
| Ingestion sync status | Yes | No | Missing sync status panel |
| Anki Cards CRUD | Yes | PLACEHOLDER | Panel exists but entirely non-functional |

### Tutor Tab

| Feature | Old Dashboard | React Status | Gap |
|---------|---------------|--------------|-----|
| Chat interface | Yes | Yes | None |
| Mode selector (Core/Sprint/Drill) | Yes | Yes | None |
| AI responses | Yes | BROKEN | Uses fake local responses, no AI backend |
| RAG document list | Yes | PLACEHOLDER | Shows hardcoded sources |
| RAG document upload | Yes | No | Missing upload functionality |
| RAG document management | Yes | No | Missing delete/edit |
| Citations per message | Yes | No | Missing citation display |
| Study folder sync | Yes | No | Missing feature |
| YouTube/URL links | Yes | No | Missing feature |

### Scholar Tab

| Feature | Old Dashboard | React Status | Gap |
|---------|---------------|--------------|-----|
| Run Scholar button | Yes | Yes | None |
| Status bar | Yes | Yes | None |
| Proposals table | Yes | Yes | None |
| Questions panel | Yes | PARTIAL | Answer input captured but SUBMIT not wired |
| System Health | Yes | Yes | None |
| Ralph Research | Yes | Yes | None |
| Proposal Sheet | Yes | Yes | None |
| AI Digest | Yes | Yes | None |
| Saved Digests | Yes | Yes | None |
| Safe Mode toggle | Yes | DISPLAY-ONLY | Switch disabled |
| Multi-Agent toggle | Yes | DISPLAY-ONLY | Switch disabled |

---

## 4. Fixes with Priority/Rationale

### P0 - Critical (Breaks core workflow)

| Fix | Rationale | Effort |
|-----|-----------|--------|
| Wire INGEST_DATA button to parse fast entry and call `POST /api/sessions` | Core Brain workflow requires ingesting tutor output | Medium |
| Implement real AI backend for Tutor chat (or wire to existing endpoint) | Tutor page is non-functional without AI | High |
| Wire SUBMIT_ANSWER button to POST question answers | Scholar questions workflow incomplete | Low |

### P1 - High (Expected functionality)

| Fix | Rationale | Effort |
|-----|-----------|--------|
| Add COPY_PROMPT clipboard functionality | Quick win, improves UX | Low |
| Wire Anki SYNC_NOW to backend (or mark as "coming soon") | Misleading UI | Medium |
| Wire EXPLAIN and QUIZ_ME buttons | Core tutor features | Medium |
| Enable Google Calendar event creation (not just local) | UI promises this but doesn't deliver | Medium |
| Add session edit modal | Basic CRUD incomplete | Medium |

### P2 - Medium (Polish/completeness)

| Fix | Rationale | Effort |
|-----|-----------|--------|
| Fetch mastery data from `/api/mastery` instead of hardcoded | Data exists in backend | Low |
| Enable Safe Mode / Multi-Agent toggles | Display-only is confusing | Low |
| Wire Next Steps action buttons | Nice-to-have | Low |
| Add session detail expansion (what_worked, notes) | Improves visibility | Medium |
| Add RAG document management UI | Tutor feature | High |

### P3 - Low (Deferred/optional)

| Fix | Rationale | Effort |
|-----|-----------|--------|
| Consolidate duplicate Scholar routes | Technical debt | Low |
| Remove or document orphaned endpoints | Cleanup | Low |
| Syllabus intake form | Legacy feature | Medium |
| ChatGPT JSON import | Legacy feature | Medium |

---

## 5. Per-Tab Test Readiness Checklist

### Home Page
- [x] Page loads without errors
- [x] Navigation works
- [ ] N/A - Demo/showcase page, no functional requirements

### Calendar Page
- [x] Page loads without errors
- [x] Month/Week/Day views work
- [x] Navigation (prev/next/today) works
- [x] Local events CRUD works
- [x] Google Calendar events display
- [x] Google Tasks display
- [ ] **FAIL**: Create event on Google Calendar (only creates local)
- [ ] **NOT TESTED**: Syllabus intake form (missing)
- [ ] **NOT TESTED**: ChatGPT JSON import (missing)

### Brain Page
- [x] Page loads without errors
- [x] Session list displays
- [x] Manual session create works
- [x] Session delete works
- [ ] **FAIL**: Fast Entry INGEST_DATA (not wired)
- [ ] **FAIL**: COPY_PROMPT (not wired)
- [ ] **FAIL**: Session edit (missing modal)
- [ ] **FAIL**: Anki SYNC_NOW (not wired)
- [ ] **FAIL**: Mastery Tracker (hardcoded data)

### Tutor Page
- [x] Page loads without errors
- [x] Mode selector displays
- [x] Chat UI renders
- [x] User can type messages
- [ ] **FAIL**: AI responses (fake local data)
- [ ] **FAIL**: EXPLAIN button (not wired)
- [ ] **FAIL**: QUIZ_ME button (not wired)
- [ ] **FAIL**: Active Sources (hardcoded)
- [ ] **NOT TESTED**: RAG management (missing)

### Scholar Page
- [x] Page loads without errors
- [x] Status bar displays
- [x] Run Scholar button works
- [x] Proposals table displays and edits
- [x] System Health displays
- [x] Ralph panel displays
- [x] Proposal Sheet displays
- [x] AI Digest generate/display works
- [x] Saved Digests list works
- [ ] **FAIL**: SUBMIT_ANSWER (not wired)
- [ ] **FAIL**: Safe Mode toggle (disabled)
- [ ] **FAIL**: Multi-Agent toggle (disabled)
- [ ] **FAIL**: Next Steps action buttons (not wired)

---

## 6. API Consistency Issues

### Inconsistent API Patterns

| Issue | Location | Recommendation |
|-------|----------|----------------|
| Google Calendar uses raw `fetch()` | calendar.tsx:349-566 | Move to api.ts wrapper |
| Scholar endpoints defined locally | scholar.tsx | Move to api.ts wrapper |
| Missing api.ts methods | Various | Add: `api.sessions.ingest()`, `api.mastery.getAll()`, `api.anki.*` |

### Missing API Endpoints (needed for gaps)

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| POST `/api/sessions/ingest` | Parse fast entry format | P0 |
| POST `/api/ai/chat` | Real AI tutor responses | P0 |
| POST `/api/scholar/questions/:id/answer` | Submit question answers | P0 |
| POST `/api/anki/sync` | Anki synchronization | P1 |
| GET `/api/rag/documents` | RAG document list | P2 |
| POST `/api/rag/documents` | RAG document upload | P2 |

---

## 7. Legacy Gaps (from prior analysis)

These gaps were identified in the original Jinja dashboard and remain relevant:

1. **Navigation reachability gap** - Brain Database + Sync Inbox not in top nav
2. **RAG indexing/search endpoints lack UI wiring** - `/api/rag/index-repo`, `/api/rag/search`
3. **Google Tasks lists endpoint unused** - `/api/gtasks/lists`
4. **Scholar helper endpoints not exposed** - `/api/scholar/implementation-bundle`, `/api/scholar/execute-via-ai`
5. **Tutor card-draft endpoint unused** - `/api/tutor/card-draft`
6. **Resume download endpoint unused** - `/api/resume/download`
7. **Styleguide not routed** - `brain/templates/styleguide.html` has no route
8. **Notes sidebar local-only** - uses localStorage, no backend persistence

---

## Appendix: Files Analyzed

**Frontend (React):**
- `brain/static/react/src/pages/home.tsx`
- `brain/static/react/src/pages/calendar.tsx`
- `brain/static/react/src/pages/brain.tsx`
- `brain/static/react/src/pages/tutor.tsx`
- `brain/static/react/src/pages/scholar.tsx`
- `brain/static/react/src/lib/api.ts`

**Backend:**
- `brain/dashboard/routes.py`
- `brain/dashboard/api_adapter.py`
- `brain/dashboard/v3_routes.py`
- `brain/dashboard/gcal.py`
- `brain/dashboard/scholar.py`

**Reference (Old Dashboard):**
- `brain/templates/dashboard.html`
- `brain/static/js/dashboard.js`

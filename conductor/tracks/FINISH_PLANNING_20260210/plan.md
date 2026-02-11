# Implementation Plan: Finish PT Study OS

**Created:** 2026-02-10
**Goal:** Complete remaining gaps so system is ready for daily use
**Estimated Total:** 8-12 hours

---

## Executive Summary

The PT Study OS is **90% built**. All major components exist:
- Database: 24 tables, v9.4 schema
- API: 60+ endpoints with full CRUD
- Dashboard: 9 pages, all production-ready
- Scholar, Methods, Calendar, Tutor: Complete

**Remaining work** falls into 3 categories:
1. **Configuration** (30 min) - API keys, OAuth
2. **Polish** (4-6 hr) - UI filters, deduplication, sync
3. **WRAP Parser** (5 hr) - Smart ingestion with merge logic

---

## Phase 1: Configuration (30 min)

Get the system actually working end-to-end.

### Task 1.1: Calendar LLM API Key
**File:** `brain/data/api_config.json`
**Time:** 5 min
```json
{
  "openrouter_api_key": "sk-or-v1-YOUR_KEY"
}
```
**Validation:** Calendar Assistant no longer shows "No API key configured"

### Task 1.2: Google Calendar OAuth
**File:** `brain/data/api_config.json`
**Time:** 15 min
1. Get credentials from Google Cloud Console
2. Add `google_calendar.client_id` and `client_secret`
3. Click "Connect Google Calendar" in UI
4. Complete OAuth flow

**Validation:** Calendar shows "CONNECTED", events load

### Task 1.3: Obsidian Local REST API
**File:** `brain/.env`
**Time:** 10 min
1. Install Obsidian Local REST API plugin
2. Get API key from plugin settings
3. Set `OBSIDIAN_API_KEY` in `.env`

**Validation:** Brain page vault sidebar loads files

---

## Phase 2: UI Polish (4-6 hr)

From archived JANUARY_26_PLAN/GOALS.md - items marked as "Not Started".

### Task 2.1: Date Range + Semester Filters on Brain Page
**File:** `dashboard_rebuild/client/src/pages/brain.tsx`
**Time:** 1.5 hr

**Subtasks:**
- [ ] Add "From" date input
- [ ] Add "To" date input
- [ ] Add semester dropdown (All / Sem 1 / Sem 2)
- [ ] Define date ranges: Sem1=Aug15-Dec15, Sem2=Jan10-May15
- [ ] Wire to API: `?dateFrom=X&dateTo=Y`
- [ ] Update `brain/dashboard/api_adapter.py` to filter

**Validation:** Selecting Semester 2 shows only Jan-May sessions

### Task 2.2: Google Calendar Sync on Syllabus Import
**Files:** 
- `brain/dashboard/api_adapter.py` (schedule_events endpoint)
- `brain/dashboard/gcal.py`
**Time:** 2 hr

**Subtasks:**
- [ ] After saving to local DB, call `gcal.create_event()` for each
- [ ] Store Google event ID in local record
- [ ] Handle "assignment" type → create Google Task instead
- [ ] Add to "School Tasks" list

**Validation:** Importing syllabus creates Google Calendar events

### Task 2.3: Deduplication on Import
**File:** `brain/dashboard/api_adapter.py`
**Time:** 1.5 hr

**Subtasks:**
- [ ] Before creating event, query Google Calendar for same date + similar title
- [ ] If match found, skip or return warning
- [ ] Add "already exists" indicator in import results
- [ ] Show duplicate count in response

**Validation:** Importing same schedule twice doesn't create duplicates

### Task 2.4: Scholar Clustering (Remove "Coming Soon")
**File:** `dashboard_rebuild/client/src/pages/scholar.tsx`
**Time:** 1 hr

**Subtasks:**
- [ ] Remove "COMING SOON" badge from clustering tab
- [ ] Wire to existing `/api/scholar/clusters` endpoint
- [ ] Display cluster visualization

**Validation:** Scholar Analysis tab shows topic clusters

---

## Phase 3: WRAP Parser (5 hr)

From archived JANUARY_26_PLAN/WRAP_INGESTION_MILESTONES.md - the smart ingestion workflow.

### Task 3.1: WRAP Parser Module
**File:** `brain/wrap_parser.py` (NEW)
**Time:** 1 hr

```python
def parse_wrap(raw_text: str) -> dict:
    """Parse WRAP output into structured sections."""
    return {
        "section_a": {...},  # Obsidian notes
        "section_b": [...],  # Anki cards
        "section_c": {...},  # Spaced schedule
        "section_d": {...},  # JSON logs
        "tutor_issues": [...],
    }
```

**Subtasks:**
- [ ] Create `wrap_parser.py`
- [ ] Implement section detection (regex for Section A/B/C/D markers)
- [ ] Implement `extract_obsidian_notes()`
- [ ] Implement `extract_anki_cards()`
- [ ] Implement `extract_spaced_schedule()`
- [ ] Implement `extract_json_logs()`
- [ ] Implement `extract_tutor_issues()`

### Task 3.2: Obsidian Merge Logic
**File:** `brain/obsidian_merge.py` (NEW)
**Time:** 1 hr

**Subtasks:**
- [ ] Create `obsidian_merge.py`
- [ ] Implement `read_existing_note()` via Obsidian API
- [ ] Implement `diff_content()` to identify new vs existing
- [ ] Implement `merge_sections()` without duplication
- [ ] Implement `add_concept_links()` using LLM
- [ ] Implement `format_obsidian()` for callouts, bold, highlights

### Task 3.3: Brain Chat WRAP Handler
**File:** `brain/dashboard/api_adapter.py`
**Time:** 1 hr

**Subtasks:**
- [ ] Add `is_wrap_format()` detection (scoring system exists, enhance it)
- [ ] Import wrap_parser
- [ ] Import obsidian_merge
- [ ] Route WRAP input through new pipeline
- [ ] Return structured response with counts

### Task 3.4: Tutor Issues API
**File:** `brain/dashboard/api_adapter.py`
**Time:** 30 min

Note: `tutor_issues` table already exists in schema!

**Subtasks:**
- [ ] Add `GET /api/tutor-issues` (list with filters)
- [ ] Add `POST /api/tutor-issues` (create)
- [ ] Add `PATCH /api/tutor-issues/<id>` (update/resolve)
- [ ] Add `GET /api/tutor-issues/stats` (aggregation for Scholar)

### Task 3.5: Frontend WRAP Indicator
**File:** `dashboard_rebuild/client/src/pages/brain.tsx`
**Time:** 45 min

**Subtasks:**
- [ ] Add "Paste WRAP" button or auto-detect indicator
- [ ] Show processing status during WRAP ingestion
- [ ] Display results summary (cards, notes, issues counts)
- [ ] Link to Anki drafts panel
- [ ] Show success confirmation

---

## Execution Order

| # | Task | Depends On | Time | Priority |
|---|------|------------|------|----------|
| 1.1 | Calendar API Key | — | 5 min | IMMEDIATE |
| 1.2 | Google OAuth | — | 15 min | IMMEDIATE |
| 1.3 | Obsidian API | — | 10 min | IMMEDIATE |
| 2.1 | Date/Semester Filters | 1.* | 1.5 hr | HIGH |
| 2.2 | GCal Sync on Import | 1.2 | 2 hr | HIGH |
| 2.3 | Deduplication | 2.2 | 1.5 hr | HIGH |
| 2.4 | Scholar Clustering | — | 1 hr | MEDIUM |
| 3.1 | WRAP Parser | — | 1 hr | HIGH |
| 3.2 | Obsidian Merge | 3.1, 1.3 | 1 hr | HIGH |
| 3.3 | Brain Chat Handler | 3.1, 3.2 | 1 hr | HIGH |
| 3.4 | Tutor Issues API | — | 30 min | MEDIUM |
| 3.5 | Frontend WRAP | 3.3, 3.4 | 45 min | MEDIUM |

---

## Files to Create

| File | Purpose |
|------|---------|
| `brain/wrap_parser.py` | WRAP section parsing |
| `brain/obsidian_merge.py` | Smart merge logic |

## Files to Modify

| File | Changes |
|------|---------|
| `brain/data/api_config.json` | Add API keys |
| `brain/.env` | Add Obsidian API key |
| `brain/dashboard/api_adapter.py` | WRAP handler, tutor issues API, dedup |
| `brain/dashboard/gcal.py` | Sync on import |
| `dashboard_rebuild/client/src/pages/brain.tsx` | Date filters, WRAP UI |
| `dashboard_rebuild/client/src/pages/scholar.tsx` | Remove "Coming Soon" |

---

## Testing Checklist

### Phase 1 (Config)
- [ ] Calendar Assistant responds to queries
- [ ] Google Calendar events visible in Calendar page
- [ ] Vault files load in Brain sidebar

### Phase 2 (Polish)
- [ ] Date range filter works on sessions
- [ ] Semester filter shows correct date ranges
- [ ] Syllabus import creates Google events
- [ ] Duplicate import shows warning, no new events
- [ ] Scholar clusters display in Analysis tab

### Phase 3 (WRAP)
- [ ] Paste sample WRAP → sections parsed correctly
- [ ] Anki cards appear in drafts
- [ ] Obsidian note created/merged (no duplicates)
- [ ] Tutor issues logged to DB
- [ ] Session metrics stored
- [ ] Frontend shows processing status
- [ ] Scholar can query tutor issues

---

## What's NOT in This Plan (Already Done)

These features are complete and working:
- Session ingestion (basic) ✅
- SOP Explorer ✅
- Method blocks & chains ✅
- Chain execution & analytics ✅
- Google Calendar two-way sync ✅
- Google Tasks import ✅
- Scholar proposals lifecycle ✅
- Scholar digests & runs ✅
- Tutor chat & artifacts ✅
- Materials library ✅
- Dashboard study wheel & streak ✅

---

## Success Criteria

System is "finished" when:
1. All Phase 1 configs are set and validated
2. Brain page has working date/semester filters
3. Syllabus import creates Google Calendar events with dedup
4. WRAP paste workflow works end-to-end
5. Scholar shows topic clusters
6. All testing checklist items pass

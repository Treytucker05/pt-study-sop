# UI Overhaul v9.4.2 - Execution Summary

## Status: ✅ PLANS READY

### Completed by Prometheus (Planner)
- ✅ P1: Runtime bundle drift resolved (committed 8ac74c5f)
- ✅ U7: Scholar Runnable spec written
- ✅ U8: Planner CTA spec written  
- ✅ UI Pages: Dashboard/Brain/Scholar/Calendar specs written

### Plan Files Created
1. `.sisyphus/plans/ui-overhaul-v9.4.2.md` - Master plan with checklist
2. `.sisyphus/plans/u7-scholar-run.md` - Backend + Frontend implementation
3. `.sisyphus/plans/u8-planner-cta.md` - Toast notification after JSON attach
4. `.sisyphus/plans/ui-pages-overhaul.md` - Page-by-page restructuring

## What Sisyphus Will Implement

### Phase 1: Database + Backend (U7)
- Add `scholar_runs` table to `brain/db_setup.py`
- Add `run_scholar_orchestrator()` to `brain/dashboard/scholar.py`
- Add 3 endpoints to `brain/dashboard/routes.py`:
  - POST /api/scholar/run
  - GET /api/scholar/run/status
  - GET /api/scholar/run/history

### Phase 2: Frontend Features
- **U7:** Scholar page header with Run button, status, history panel
- **U8:** IngestionTab CTA toast after JSON attach
- **Dashboard:** Remove NextActions, add compact preview, Open Brain CTA
- **Brain:** Rename tabs (TODAY/THIS WEEK/TOOLS/DATA), reorganize content
- **Scholar:** Reduce 7→3 tabs, add collapsible sections, Run controls
- **Calendar:** Separate views, collapsible sidebar, floating assistant

### Phase 3: Testing & Commit
- Run `scripts/check_drift.ps1`
- Run `scripts/smoke_golden_path.ps1` (requires server)
- Commit in 2-3 clean commits
- Push to branch: `v9.4.2-ui-overhaul`

## Next Step

**Run the plan with:**
```
/start-work
```

Sisyphus (the builder) will execute these plans step by step.

## Key Decisions Locked

- Scholar is **RUNNABLE** (POST endpoint + UI button)
- Planner uses **CTA** (not auto-generate) after JSON attach
- NextActions **removed from Dashboard** (kept only on Brain)
- Tabs renamed per audit recommendations
- Runtime bundle **committed** (clean slate)

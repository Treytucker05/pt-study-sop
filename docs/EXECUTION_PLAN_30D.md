# 30-Day Execution Plan — Codebase Health

> Generated: 2026-03-08
> Goal: Reduce top pain points systematically without disrupting active feature work.

## Week 1: Frontend API Cleanup (Low Risk)

### Deliverables
1. **Extract `api.types.ts`** from `api.ts` — move all interfaces/type aliases
2. **Verify** TypeScript compilation, all tests pass
3. **Clean up stale worktrees** (3 in `.claude/worktrees/`)

### Acceptance Criteria
- `api.ts` < 1,000 lines
- `npm run build` succeeds with zero type errors
- All existing imports from `@/api` work unchanged
- No stale worktrees remain

### Dependencies
- None (frontend-only, no backend changes)

### Risks
- Low. TypeScript compiler catches missing exports instantly.

---

## Week 2: Frontend Component Extraction (Medium Risk)

### Deliverables
1. **Extract `useSSEStream` hook** from `TutorChat.tsx`
2. **Extract `MessageList` component** from `TutorChat.tsx`
3. **Extract `ArtifactPanel` component** from `TutorChat.tsx`
4. Target: `TutorChat.tsx` < 800 lines

### Acceptance Criteria
- `TutorChat.tsx` < 800 lines
- SSE streaming works identically (manual test: start tutor session, verify streaming)
- `npm run build` succeeds
- Frontend tests pass (`npm run test` in `dashboard_rebuild/`)

### Dependencies
- Week 1 complete (clean api.ts makes refactoring safer)

### Risks
- Medium. SSE streaming state management is fragile.
- Mitigation: Extract hook first, test in isolation, then extract UI components.

---

## Week 3: Backend API Split — Phase 1 (High Impact)

### Deliverables
1. **Extract `api_sessions.py`** from `api_adapter.py` — all `/sessions/*` routes
2. **Extract `api_scheduling.py`** — `/events/*`, `/schedule-events/*`, `/syllabus/*`
3. Register new blueprints in `app.py`
4. Target: `api_adapter.py` < 7,000 lines

### Acceptance Criteria
- `api_adapter.py` < 7,000 lines
- `pytest brain/tests/` passes (all existing backend tests)
- All `/sessions/*` and `/events/*` API endpoints return same responses
- No import changes needed in frontend

### Dependencies
- None (backend-only, routes stay the same)

### Risks
- High. Blueprint registration order matters. Import chains between api files.
- Mitigation: Extract one blueprint at a time. Run full test suite after each.

---

## Week 4: Backend API Split — Phase 2 + Hardening

### Deliverables
1. **Extract `api_proposals.py`** — `/proposals/*` routes
2. **Extract `api_scholar_routes.py`** — `/scholar/*` routes from adapter
3. **Remove `app.py` DEBUG route printing** (line 41)
4. Target: `api_adapter.py` < 5,000 lines

### Acceptance Criteria
- `api_adapter.py` < 5,000 lines
- `pytest brain/tests/` passes
- All API endpoints verified via existing test suite
- DEBUG output removed from app startup

### Dependencies
- Week 3 complete (pattern established for blueprint extraction)

### Risks
- Medium. Scholar routes may have cross-dependencies with adapter helpers.
- Mitigation: Extract helper functions to shared `api_helpers.py` if needed.

---

## Success Metrics (End of 30 Days)

| Metric | Before | Target |
|--------|--------|--------|
| `api.ts` lines | 2,107 | < 1,000 |
| `TutorChat.tsx` lines | 2,183 | < 800 |
| `api_adapter.py` lines | 9,953 | < 5,000 |
| New blueprint files | 0 | 4 (`api_sessions`, `api_scheduling`, `api_proposals`, `api_scholar_routes`) |
| Stale worktrees | 3 | 0 |
| Test pass rate | Current | Same or better |

## Out of Scope (This Cycle)

- `api_tutor.py` split (defer to next cycle — higher risk)
- `db_setup.py` migration extraction (needs ORM discussion first)
- `tutor_engine.py` session persistence (feature change, not refactor)
- `seed_methods.py` YAML migration (blocked on YAML schema standardization)

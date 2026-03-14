# Pain Point Triage

> Generated: 2026-03-08
> Scoring: Impact 1-5 (5=highest), Effort 1-5 (5=hardest), Risk 1-5 (5=most dangerous)
> Priority = Impact * 2 - Effort - Risk (higher is better)

| Rank | Area | File/Path | Root Cause | Impact | Effort | Risk | Priority | Recommendation |
|------|------|-----------|-----------|--------|--------|------|----------|----------------|
| 1 | Backend API | `brain/dashboard/api_adapter.py` (9,953 lines) | 212 functions in monolith; sessions, vault, obsidian, scheduling, proposals, scholar all mixed | 5 | 5 | 4 | 1 | Split into 5 domain blueprints (sessions, scheduling, proposals, scholar, obsidian) |
| 2 | Backend API | `brain/dashboard/api_tutor.py` (8,933 lines) | Tutor CRUD, SSE streaming, artifacts, chains, materials, video all in one blueprint | 5 | 4 | 4 | 2 | Extract streaming, artifacts, materials into separate modules |
| 3 | Frontend API | `dashboard_rebuild/client/src/api.ts` (2,107 lines) | 123 functions + ~1,150 lines of type defs in flat file; no domain grouping | 4 | 2 | 1 | 5 | Extract types to `api.types.ts`, then domain-split later |
| 4 | Frontend UI | `dashboard_rebuild/client/src/components/TutorChat.tsx` (2,183 lines) | God-component: chat + SSE + artifacts + scroll; useRef/useEffect chains brittle | 4 | 4 | 3 | 1 | Extract `useSSEStream` hook, `MessageList`, `ArtifactPanel` |
| 5 | Database | `brain/db_setup.py` (2,746 lines) | 42 tables + 12 migration functions as raw SQL; no ORM, no rollback | 3 | 4 | 5 | -3 | Extract migrations to versioned files; defer ORM |
| 6 | Frontend UI | `dashboard_rebuild/client/src/pages/calendar.tsx` (2,001 lines) | Calendar + event editor + Google Cal sync in single page component | 3 | 3 | 2 | 1 | Extract CalendarEventEditor, GoogleCalendarSync |
| 7 | Frontend UI | `dashboard_rebuild/client/src/pages/library.tsx` (1,854 lines) | Materials library, search, filters, upload all in one page | 3 | 3 | 2 | 1 | Extract MaterialCard, UploadDialog, FilterPanel |
| 8 | Backend | `brain/tutor_rag.py` (996 lines) | Multi-stage chunking + OCR fallback + reranker; independent failure modes | 3 | 3 | 3 | 0 | Extract PDF handling to `tutor_pdf.py`; add integration tests |
| 9 | Backend | `brain/dashboard/scholar.py` (3,091 lines) | Statistics, citation validation, anomaly flagging tightly coupled | 2 | 3 | 2 | -1 | Split stats, citations, digest into sub-modules |
| 10 | Data | `brain/data/seed_methods.py` (1,812 lines) | 49 method defs as Python dicts; must re-seed after tests | 2 | 3 | 2 | -1 | Read from existing YAML in `sop/library/` instead |
| 11 | Backend | `brain/tutor_engine.py` (799 lines) | In-memory session store (TODO); mode logic intertwined | 3 | 3 | 4 | -1 | Persist session context to DB; extract mode strategies |
| 12 | DevOps | `.claude/worktrees/` (3 stale) | Stale worktrees waste disk, pollute grep results, confuse tools | 1 | 1 | 1 | 0 | Clean up after confirming branches merged |

## V1 Selection

**Rank 3 (`api.ts` type extraction)** selected for V1 because:
- Highest priority score (5) among actionable items
- TypeScript compiler provides built-in safety net
- Zero runtime behavior change
- 54% line reduction establishes pattern for future splits
- Unblocks future domain-level api splitting

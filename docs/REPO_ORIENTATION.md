# PT Study SOP — Repository Orientation

> Generated: 2026-03-08
> Historical note: this orientation predates the Brain-home and `/tutor` shell cleanup and is preserved as historical evidence only. Current product authority lives in `docs/root/TUTOR_STUDY_BUDDY_CANON.md`, and current launch/start-panel cleanup lives in `conductor/tracks/tutor-launch-shell-realignment_20260313/`.

## Top-Level Structure

| Directory | Purpose |
|-----------|---------|
| `brain/` | Python backend: Flask API, SQLite DB, RAG engine, tutor, LLM providers |
| `dashboard_rebuild/` | React 19 + Vite 7 + Tailwind 4 frontend (arcade theme) |
| `sop/` | Pedagogy library: 75 YAML method definitions, 19 chain templates |
| `docs/` | 108 markdown files: product spec, architecture, developer guides |
| `conductor/` | Project tracking: active work log, task registry, track metadata |
| `scholar/` | Research outputs: evidence audit, methodology validation |
| `scripts/` | Utility scripts for setup, ingestion, migration |
| `llm-council/` | Multi-LLM provider coordination (Codex, Gemini, ChatGPT backend) |
| `archive/` | Historical code and designs (read-only reference) |
| `tools/` | Standalone CLI tools |

**Key root files:** `AGENTS.md` (canonical instructions), `README.md`, `pytest.ini`,
`Start_Dashboard.bat`

---

## Stack & Frameworks

### Backend (Python)

- **Flask 3.0+** — Blueprint-based API (`api_adapter`, `api_tutor`, `api_methods`)
- **SQLite3** — 42 tables, raw SQL (no ORM), manual migrations in `db_setup.py`
- **LangChain 0.3+** — RAG pipeline, prompt templates, runnable chains
- **ChromaDB 0.5+** — Vector store at `brain/data/chroma_tutor/`
- **OpenAI API** — `text-embedding-3-small` embeddings, GPT-4 completions via OpenRouter
- **Pydantic 2.5+** — Schema validation
- **PyYAML** — Method/chain YAML parsing

### Frontend (TypeScript/React)

- **React 19.2** + **Vite 7.1** (build to `brain/static/dist/`)
- **Tailwind CSS 4.1** + custom arcade retro theme (`font-arcade`, `rounded-none`)
- **Radix UI** — 30+ accessible component primitives
- **TanStack React Query 5.60** — Server state management
- **Excalidraw** — Visual whiteboard
- **React Flow** — DAG visualization
- **Recharts** — Data charting

### Testing

- **pytest + pytest-timeout** — 71 backend test files
- **Vitest + @testing-library** — 341 frontend tests

### LLM Providers

- Codex CLI (primary, ChatGPT OAuth)
- Gemini CLI (Google AI Ultra, 1M+ context)
- Direct HTTP to `chatgpt.com/backend-api` (streaming)

---

## Key Modules & Entry Points

### Python Backend

| File | Lines | Role |
|------|-------|------|
| `brain/dashboard/app.py` | ~120 | Flask app factory, blueprint registration |
| `brain/dashboard/api_adapter.py` | 9,953 | Core API: Obsidian sync, sessions, vault mgmt |
| `brain/dashboard/api_tutor.py` | 8,933 | Adaptive tutor: sessions, SSE streaming, artifacts |
| `brain/dashboard/api_methods.py` | ~400 | Method library CRUD |
| `brain/db_setup.py` | 2,746 | Schema init (42 tables) + migrations |
| `brain/tutor_engine.py` | ~1,000 | Core LLM interaction, RAG search |
| `brain/tutor_rag.py` | 1,304 | ChromaDB + reranker + chunking pipeline |
| `brain/data/seed_methods.py` | 1,812 | Seed 49 method blocks + 19 chain templates |

### Frontend

| File | Lines | Role |
|------|-------|------|
| `dashboard_rebuild/client/src/App.tsx` | ~200 | Root component, lazy routing |
| `dashboard_rebuild/client/src/api.ts` | 2,107 | 123 API client functions |
| `dashboard_rebuild/client/src/pages/tutor.tsx` | ~800 | Tutor page layout |
| `dashboard_rebuild/client/src/components/TutorChat.tsx` | 2,183 | Chat UI + SSE streaming |
| `dashboard_rebuild/client/src/pages/library.tsx` | 1,854 | Materials library |
| `dashboard_rebuild/client/src/pages/calendar.tsx` | 2,001 | Calendar + Google Calendar |

### Build/Run

```
Start_Dashboard.bat          # Start Flask (5000) + Vite dev (3000)
npm run build                # From dashboard_rebuild/, outputs to brain/static/dist/
pytest brain/tests/          # Backend test suite
npm run test                 # Frontend test suite (from dashboard_rebuild/)
```

---

## Top 10 Complexity / Pain Hotspots

### 1. `brain/dashboard/api_adapter.py` — 9,953 lines

**Why it hurts:** 212 functions in a single file. Handles ~40% of the API surface
(Obsidian sync, session routing, vault management). Every feature change risks
regression across unrelated endpoints. Has TODOs for manual task creation and API
config updates.

**Recommendation:** Split into 4-5 domain-specific blueprints (sessions, vault,
obsidian, tasks).

### 2. `brain/dashboard/api_tutor.py` — 8,933 lines

**Why it hurts:** Tutor CRUD, SSE streaming, artifact management, chain
progression, and content filtering all in one blueprint. 25 imports. SSE state is
fragile — hard to test, hard to debug.

**Recommendation:** Extract streaming into `tutor_streaming.py`, artifacts into
`tutor_artifacts.py`.

### 3. `brain/db_setup.py` — 2,746 lines

**Why it hurts:** 42 CREATE TABLE statements + 12 migration functions as raw SQL
strings. No ORM means no migration tooling, no rollback safety, and column
additions require manual PRAGMA introspection.

**Recommendation:** Consider Alembic or at least extract migration functions into
`brain/migrations/` with version tracking.

### 4. `dashboard_rebuild/client/src/components/TutorChat.tsx` — 2,183 lines

**Why it hurts:** God-component: chat rendering + SSE streaming + artifact state +
scroll management + message retry. Any tutor UI change touches this file. Multiple
useRef + useEffect chains for scroll sync are brittle.

**Recommendation:** Extract `useSSEStream` hook, `MessageList` component,
`ArtifactPanel` component.

### 5. `dashboard_rebuild/client/src/api.ts` — 2,107 lines

**Why it hurts:** 123 async functions in a flat file with no grouping. Finding
where a specific endpoint is called requires global search. Error handling
patterns are repeated but not abstracted.

**Recommendation:** Split into `api/tutor.ts`, `api/sessions.ts`, `api/vault.ts`
etc., re-export from `api/index.ts`.

### 6. `brain/tutor_rag.py` — 1,304 lines

**Why it hurts:** Multi-stage chunking pipeline (header split → recursive split),
lazy-loaded reranker with keyword fallback, garbled PDF detection with 3-signal
scoring, Docling OCR with 20-page chunk workaround for memory crashes. Each stage
has independent failure modes.

**Recommendation:** Extract PDF handling into `tutor_pdf.py`. Add integration
tests for each chunking path.

### 7. `brain/data/seed_methods.py` — 1,812 lines

**Why it hurts:** 49 method block definitions as Python dicts + 19 chain templates
+ 2 migration functions. Data and migration logic interleaved. Supports
`--migrate`, `--force` flags. Must be re-run after `pytest` (tests corrupt
method_blocks).

**Recommendation:** Move method definitions to YAML (they already exist in
`sop/library/`), have seed script read from YAML instead of inline dicts.

### 8. `brain/dashboard/scholar.py` — 3,091 lines

**Why it hurts:** Research analysis, anomaly flagging, citation validation, FSRS
scheduling, probabilistic error classification. Tightly coupled to tutor method
library and weekly digest. Few docstrings, logic-heavy functions.

**Recommendation:** Extract statistics into `scholar_stats.py`, citation logic
into `scholar_citations.py`.

### 9. `dashboard_rebuild/client/src/pages/calendar.tsx` — 2,001 lines

**Why it hurts:** Calendar rendering + event editing + Google Calendar integration
in one page component. Complex date math, drag-and-drop scheduling, and API
syncing.

**Recommendation:** Extract `CalendarEvent` editor, `GoogleCalendarSync` module.

### 10. `brain/tutor_engine.py` — ~1,000 lines

**Why it hurts:** In-memory session store not persisted for long sessions (noted
TODO). RAG search with multiple fallback strategies. Mode-specific behavior
(Core/Sprint/Drill) intertwined. Citation extraction via string parsing.

**Recommendation:** Persist session context to DB. Extract mode-specific logic
into strategy classes.

---

## Summary Metrics

| Metric | Count |
|--------|-------|
| Python files | ~674 |
| TypeScript/TSX files | ~601 |
| YAML files | ~307 |
| Database tables | 42 |
| API endpoints | ~100+ |
| Backend test files | 71 |
| Frontend tests | 341 |
| Method blocks (pedagogy) | 49 |
| Chain templates | 19 |

# Tutor Page Fix-It: Make the Flow Work

## TL;DR

> **Quick Summary**: Fix the Tutor page so the full study session flow works end-to-end — from wizard setup through chat, chain progression, artifacts, and session end. No new features; fix what's broken, make buttons work, and ensure the UI is consistent with the arcade theme.
> 
> **Deliverables**:
> - Working wizard → chat → end session lifecycle
> - Functional chain block progression with visible progress
> - Working artifact creation (notes, cards, maps) via slash commands and action buttons
> - Session restore on page refresh
> - Consistent arcade-themed UI across all Tutor components
> - Frontend test infrastructure (vitest) + tests for critical flows
> 
> **Estimated Effort**: Large (10-12 tasks, ~3-4 days)
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Task 0 (test infra) → Task 1 (validate E2E) → Task 2 (missing function fix) → Tasks 3-9 (parallel fixes) → Task 10 (integration QA)

---

## Context

### Original Request
User wants the Tutor page fully functional. It's set up and partially working, but "the whole flow of it is not quite right yet" — rules/modules aren't working correctly, UI/buttons need fixing, and the session flow has friction.

### Interview Summary
**Key Discussions**:
- **Priority**: Tutor page is #1. Everything else waits.
- **Scope**: Fix existing functionality, not add new features.
- **What "broken" means**: Can't complete workflows, UI inconsistencies, features feel half-built, navigation confusing.
- **SOP enforcement**: Exposure Check, M0 Planning, Track A/B routing are OUT OF SCOPE (those are new features, not fixes).
- **Test strategy**: TDD — tests first (vitest + testing-library).

**Research Findings**:
- Backend is solid — all 22+ Tutor API endpoints exist and are wired. No backend changes needed.
- `ensure_method_library_seeded` imported in `api_tutor.py:37` but does NOT exist in `brain/db_setup.py` (verified via grep). This will cause an ImportError that crashes the entire tutor blueprint on first request. Seed data lives in `brain/data/seed_methods.py`.
- Frontend has 7 Tutor components totaling ~4,400 lines, all fully read and analyzed.
- Two competing setup UIs (TutorWizard vs ContentFilter) create user confusion.
- Chain block progression, session timer, artifact creation, and session end flow all need validation.

### Metis Review
**Identified Gaps** (addressed):
- "Rules and modules not working" is ambiguous → scoped to: ContentFilter mode/chain selection + chain block progression. SOP enforcement is explicitly out.
- No test infrastructure exists → Task 0 sets it up.
- `ensure_method_library_seeded` missing → Task 2 validates and fixes.
- Two setup UIs (Wizard vs ContentFilter) → Task 3 clarifies the primary flow.
- Session restore reliability unknown → Task 7 validates and fixes.

---

## Work Objectives

### Core Objective
Make the Tutor page session lifecycle work end-to-end: setup → chat → progress through chain blocks → create artifacts → end session — with no dead buttons, no broken flows, and consistent UI.

### Concrete Deliverables
- `tutor.tsx` — fixed session state management, consistent setup flow
- `TutorWizard.tsx` — working 3-step wizard that reliably starts sessions
- `TutorChat.tsx` — streaming chat with working slash commands and action buttons
- `ContentFilter.tsx` — working compact mode during active session, fixed mode/chain selection
- `TutorArtifacts.tsx` — working artifact list, session info, resume/delete
- Chain block progression — visible progress bar, working advancement, timer
- Test suite — vitest + testing-library tests for critical paths
- Evidence files in `.sisyphus/evidence/` proving each fix works

### Definition of Done
- [ ] Can start a session via wizard (course → chain → start) without errors
- [ ] Can send messages and receive streamed responses in chat
- [ ] Can see chain progress and advance through blocks
- [ ] Can create artifacts via slash commands (/note, /card, /map) and action buttons
- [ ] Can end session (Ship to Brain / End Without Saving) without errors
- [ ] Can refresh page and restore active session
- [ ] All vitest tests pass: `cd dashboard_rebuild && npx vitest run`
- [ ] Build succeeds: `cd dashboard_rebuild && npm run build`
- [ ] Existing backend tests pass: `pytest brain/tests/`

### Must Have
- Working session lifecycle (start → chat → end)
- Working chain block progression with visual feedback
- Working artifact creation (at least notes and cards)
- Session restore on page refresh
- Consistent arcade theme across all Tutor components
- Test coverage for critical paths

### Must NOT Have (Guardrails)
- **G1**: No SOP M0-M6 enforcement (Exposure Check, Track A/B, Source-Lock gates). That's new feature work for a future track.
- **G2**: Do NOT merge ContentFilter + TutorWizard into one component. Fix each independently.
- **G3**: Do NOT add new backend endpoints. Backend is solid — frontend fixes only.
- **G4**: Do NOT touch non-Tutor pages (Dashboard, Brain, Calendar, Scholar, Methods, Library).
- **G5**: No glow effects, no `box-shadow`, no `rounded-md`. Sharp corners (`rounded-none`), `bg-black/40` containers, `border-primary` borders.
- **G6**: No commented-out code. Delete dead code, don't comment it.
- **G7**: No over-abstraction. Fix the specific issue, don't refactor the architecture.
- **G8**: Do NOT add features the user didn't ask for (e.g., analytics, keyboard shortcuts, markdown preview).

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO → Task 0 sets it up
- **Automated tests**: YES (TDD — red/green/refactor)
- **Framework**: vitest + @testing-library/react + jsdom
- **TDD workflow**: Each task writes failing test first → implements fix → verifies test passes

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

| Deliverable Type | Verification Tool | Method |
|------------------|-------------------|--------|
| Frontend UI | Playwright (playwright skill) | Navigate to localhost:5000/tutor, interact, assert DOM, screenshot |
| API responses | Bash (curl) | Hit localhost:5000/api/tutor/* endpoints, assert status + JSON |
| Build | Bash | `cd dashboard_rebuild && npm run build` — exit code 0 |
| Tests | Bash | `cd dashboard_rebuild && npx vitest run` — all pass |
| Backend tests | Bash | `pytest brain/tests/` — all pass |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Foundation — must complete first):
├── Task 0: Set up vitest + testing-library [quick]
└── Task 1: Validate Tutor E2E — what actually works vs. broken [deep]

Wave 1 (Critical fix — unblocks everything):
└── Task 2: Fix ensure_method_library_seeded import [quick]

Wave 2 (Core fixes — MAX PARALLEL):
├── Task 3: Fix TutorWizard → session start flow [deep]
├── Task 4: Fix ContentFilter mode/chain selection + compact mode [deep]
├── Task 5: Fix chain progress visibility + block advancement [visual-engineering]
├── Task 6: Fix TutorChat slash commands + action buttons [deep]
├── Task 7: Fix session restore on page refresh [deep]
└── Task 8: Fix session end flow (Ship to Brain / End Without Saving) [deep]

Wave 3 (Polish + integration):
├── Task 9: Fix TutorArtifacts panel + recent sessions [visual-engineering]
└── Task 10: UI consistency pass — arcade theme compliance [visual-engineering]

Wave FINAL (Verification — 4 parallel):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: Real E2E QA via Playwright [unspecified-high]
└── Task F4: Scope fidelity check [deep]

Critical Path: Task 0 → Task 1 → Task 2 → Task 3 → Task 10 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 6 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|------------|--------|------|
| 0 | — | 1-10 (test infra) | 0 |
| 1 | 0 | 2-10 (tells us what's actually broken) | 0 |
| 2 | 1 | 3-10 (if import fails, all tutor endpoints crash) | 1 |
| 3 | 2 | 8, 10 | 2 |
| 4 | 2 | 10 | 2 |
| 5 | 2 | 10 | 2 |
| 6 | 2 | 9, 10 | 2 |
| 7 | 2 | 10 | 2 |
| 8 | 3 | 10 | 2 |
| 9 | 6 | 10 | 3 |
| 10 | 3-9 | F1-F4 | 3 |
| F1-F4 | 10 | — | FINAL |

### Agent Dispatch Summary

| Wave | # Parallel | Tasks → Agent Category |
|------|------------|----------------------|
| 0 | **2** | T0 → `quick`, T1 → `deep` |
| 1 | **1** | T2 → `quick` |
| 2 | **6** | T3 → `deep`, T4 → `deep`, T5 → `visual-engineering`, T6 → `deep`, T7 → `deep`, T8 → `deep` |
| 3 | **2** | T9 → `visual-engineering`, T10 → `visual-engineering` |
| FINAL | **4** | F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep` |

---

## TODOs

- [x] 0. Set up frontend test infrastructure (vitest + testing-library)

  **What to do**:
  - Install vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom as devDependencies in dashboard_rebuild/
  - Create `dashboard_rebuild/vitest.config.ts` with jsdom environment, path aliases matching vite.config.ts
  - Create `dashboard_rebuild/client/src/test/setup.ts` with @testing-library/jest-dom imports
  - Create a smoke test `dashboard_rebuild/client/src/test/smoke.test.ts` that imports React and renders a div
  - Verify `npx vitest run` passes with 1 test
  - Add `"test": "vitest run"` script to package.json

  **Must NOT do**:
  - Do NOT install Playwright yet (that's for QA scenarios, not unit tests)
  - Do NOT write tests for actual components yet (that's tasks 3-10)
  - Do NOT modify vite.config.ts — vitest config should be separate or extend it

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-concern setup task, 3-4 files, well-documented process
  - **Skills**: [`javascript-typescript`]
    - `javascript-typescript`: Vitest is a JS/TS testing framework; need correct config patterns
  - **Skills Evaluated but Omitted**:
    - `tdd`: Not needed for infra setup, only for actual test-writing
    - `react-best-practices`: Not writing React code yet

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 1)
  - **Parallel Group**: Wave 0
  - **Blocks**: Tasks 3-10 (they need test infra to write TDD tests)
  - **Blocked By**: None — can start immediately

  **References**:

  **Pattern References**:
  - `dashboard_rebuild/vite.config.ts` — Vite config to match path aliases (`@/` → `client/src/`)
  - `dashboard_rebuild/tsconfig.json` — TypeScript paths that vitest must resolve
  - `dashboard_rebuild/package.json` — Current devDependencies and scripts

  **External References**:
  - Vitest docs: https://vitest.dev/guide/ — Setup with Vite projects
  - Testing Library React: https://testing-library.com/docs/react-testing-library/setup

  **WHY Each Reference Matters**:
  - `vite.config.ts`: Vitest must resolve the same `@/` path alias or tests will fail on import
  - `tsconfig.json`: TypeScript paths must be mirrored in vitest config
  - `package.json`: Need to know existing deps to avoid conflicts

  **Acceptance Criteria**:

  - [ ] `dashboard_rebuild/vitest.config.ts` exists with jsdom environment + path aliases
  - [ ] `dashboard_rebuild/client/src/test/setup.ts` exists with jest-dom setup
  - [ ] `dashboard_rebuild/client/src/test/smoke.test.ts` exists and passes
  - [ ] `cd dashboard_rebuild && npx vitest run` → PASS (1 test, 0 failures)
  - [ ] `cd dashboard_rebuild && npm run build` → still succeeds (no regressions)

  **QA Scenarios**:

  ```
  Scenario: Vitest runs smoke test successfully
    Tool: Bash
    Preconditions: dashboard_rebuild/ has vitest installed as devDependency
    Steps:
      1. Run `cd dashboard_rebuild && npx vitest run --reporter=verbose 2>&1`
      2. Check exit code is 0
      3. Check output contains "1 passed" or "Tests  1 passed"
    Expected Result: Exit code 0, output shows 1 test passed, 0 failed
    Failure Indicators: Non-zero exit code, "FAIL" in output, module resolution errors
    Evidence: .sisyphus/evidence/task-0-vitest-smoke.txt

  Scenario: Build still works after vitest setup
    Tool: Bash
    Preconditions: vitest config and deps added
    Steps:
      1. Run `cd dashboard_rebuild && npm run build 2>&1`
      2. Check exit code is 0
      3. Check brain/static/dist/index.html exists
    Expected Result: Exit code 0, build output in brain/static/dist/
    Failure Indicators: Non-zero exit code, missing output files, TypeScript errors
    Evidence: .sisyphus/evidence/task-0-build-check.txt
  ```

  **Commit**: YES
  - Message: `chore(tutor): set up vitest + testing-library test infrastructure`
  - Files: `dashboard_rebuild/vitest.config.ts`, `dashboard_rebuild/client/src/test/setup.ts`, `dashboard_rebuild/client/src/test/smoke.test.ts`, `dashboard_rebuild/package.json`
  - Pre-commit: `cd dashboard_rebuild && npx vitest run`

---

- [x] 1. Validate Tutor E2E — discover what's actually broken vs. working

  **What to do**:
  - Start the dashboard via `Start_Dashboard.bat` (or `python brain/dashboard_web.py`)
  - Use curl to hit every Tutor API endpoint and log responses:
    - `GET /api/tutor/config/check` — does it return without ImportError?
    - `GET /api/tutor/content-sources` — do courses exist?
    - `GET /api/tutor/chains/templates` — do template chains load? (This is the one that calls `ensure_method_library_seeded`)
    - `GET /api/tutor/blocks` — do method blocks exist?
    - `GET /api/tutor/materials` — any materials uploaded?
    - `POST /api/tutor/session` — can we create a session?
    - `POST /api/tutor/session/{id}/turn` — does SSE streaming work?
    - `POST /api/tutor/session/{id}/end` — does end session work?
    - `GET /api/tutor/sessions` — does session list work?
  - Use Playwright to navigate to localhost:5000/tutor and screenshot each state:
    - Initial load (wizard or setup screen)
    - After selecting a course
    - After selecting a chain
    - After starting a session (chat view)
    - After sending a message
    - Sidebar (artifacts, session info)
    - End session dialog
  - Document ALL findings in `.sisyphus/evidence/task-1-e2e-audit.md`:
    - What works ✅
    - What's broken ❌
    - What's partially working ⚠️
  - Update the plan based on findings (if something is already working, the corresponding task can be simplified)

  **Must NOT do**:
  - Do NOT fix anything in this task — just observe and document
  - Do NOT modify any source files
  - Do NOT skip API validation — the `ensure_method_library_seeded` issue could crash everything

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires methodical exploration, curl testing, Playwright screenshots, and detailed documentation
  - **Skills**: [`playwright`, `bug-fast`]
    - `playwright`: Need browser automation to screenshot each Tutor state
    - `bug-fast`: Systematic bug triage methodology for documenting what's broken
  - **Skills Evaluated but Omitted**:
    - `browser-automation`: Playwright skill covers this
    - `backend-development`: Not modifying backend, just testing it

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 0)
  - **Parallel Group**: Wave 0
  - **Blocks**: Tasks 2-10 (audit results inform all subsequent work)
  - **Blocked By**: None — can start immediately (dashboard must be running)

  **References**:

  **Pattern References**:
  - `brain/dashboard/api_tutor.py:1-50` — Import section, especially line 37 (`from db_setup import ... ensure_method_library_seeded`). If this import fails, the entire `/api/tutor/*` blueprint will 500.
  - `brain/dashboard/api_tutor.py` — configCheck endpoint (`/api/tutor/config/check`), search for `@tutor_bp.route("/config/check"`
  - `brain/dashboard/api_tutor.py:100-180` — POST /session endpoint for creating sessions
  - `brain/dashboard/api_tutor.py:300-500` — POST /session/{id}/turn endpoint for SSE streaming

  **API/Type References**:
  - `dashboard_rebuild/client/src/lib/api.ts` — All Tutor API function signatures: `tutorCreateSession()`, `tutorSendTurn()`, `tutorEndSession()`, `tutorGetTemplateChains()`, `tutorGetConfigCheck()`, etc.

  **External References**:
  - None needed — this is a discovery task

  **WHY Each Reference Matters**:
  - `api_tutor.py:37`: The single most critical line — if `ensure_method_library_seeded` doesn't exist, ALL tutor endpoints return 500
  - `api.ts`: Shows the exact URL paths and request shapes the frontend expects

  **Acceptance Criteria**:

  - [ ] `.sisyphus/evidence/task-1-e2e-audit.md` exists with ✅/❌/⚠️ for every Tutor endpoint and UI state
  - [ ] Every Tutor API endpoint has been curled with response logged
  - [ ] Playwright screenshots captured for each Tutor UI state
  - [ ] Screenshots saved to `.sisyphus/evidence/task-1-*.png`
  - [ ] Findings are specific enough to inform Tasks 2-10 (e.g., "POST /session returns 500 with traceback: ImportError ensure_method_library_seeded")

  **QA Scenarios**:

  ```
  Scenario: All Tutor API endpoints respond (not 500)
    Tool: Bash (curl)
    Preconditions: Dashboard running on localhost:5000
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/tutor/config/check
      2. curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/tutor/content-sources
      3. curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/tutor/chains/templates
      4. curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/tutor/blocks
      5. curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/tutor/materials
      6. curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/tutor/sessions
      7. Log each status code
    Expected Result: All return 200 (or 404 for empty lists, NOT 500)
    Failure Indicators: Any endpoint returns 500 (server error) — indicates broken import or crash
    Evidence: .sisyphus/evidence/task-1-api-status.txt

  Scenario: Tutor page loads in browser without crash
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running on localhost:5000
    Steps:
      1. Navigate to http://localhost:5000/tutor
      2. Wait for page to load (wait for selector `.font-arcade` or main content, timeout 15s)
      3. Screenshot the initial state
      4. Check console for JavaScript errors
    Expected Result: Page loads, wizard or setup UI visible, no JS console errors
    Failure Indicators: Blank page, "Failed to fetch" errors, React error boundary shown
    Evidence: .sisyphus/evidence/task-1-tutor-initial-load.png
  ```

  **Commit**: NO (discovery only — no code changes)

---

- [x] 2. Fix `ensure_method_library_seeded` — validate and fix the missing function

  **What to do**:
  - Check `brain/db_setup.py` for the function `ensure_method_library_seeded`. **Confirmed: it does NOT exist** (grep verified).
  - The fix:
    - Check `brain/data/seed_methods.py` — this is the seed data source (PEIRRO-aligned blocks + template chains). It already has a `main()` that seeds both `method_blocks` and `method_chains` tables idempotently.
    - The function should: check if `method_blocks` table has rows → if empty, call the seeding logic from `seed_methods.py` (or inline equivalent)
    - Write the function in `brain/db_setup.py` so the existing import at `api_tutor.py:37` resolves
    - Verify: `curl http://localhost:5000/api/tutor/chains/templates` returns 200 with template chain data
  - Write a test: `brain/tests/test_method_seed.py` that verifies `ensure_method_library_seeded` creates blocks in an empty DB
  - If Task 1 revealed this import already works fine (function exists somewhere grep missed), just document that and move on

  **Must NOT do**:
  - Do NOT change the seed data content (block names, categories, descriptions)
  - Do NOT add new method blocks beyond what seed_method_blocks.py defines
  - Do NOT modify api_tutor.py — fix the import source (db_setup.py)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small, focused fix — find or create one function in one file
  - **Skills**: [`python-development`]
    - `python-development`: Python function, SQLite operations, pytest test
  - **Skills Evaluated but Omitted**:
    - `backend-development`: Overkill for a single function
    - `database-design`: Not designing schema, just seeding data

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Tasks 3-10 (if this import is broken, all Tutor endpoints crash)
  - **Blocked By**: Task 1 (need to know if it's actually broken)

  **References**:

  **Pattern References**:
  - `brain/db_setup.py` — Look for existing `ensure_*` functions to follow the same pattern
  - `brain/data/seed_methods.py` — Seed data source for method blocks + template chains. Has `main()` function that seeds idempotently. Uses YAML specs in `sop/library/methods/` with hardcoded fallback.
  - `brain/dashboard/api_tutor.py:37` — The import line: `from db_setup import DB_PATH, get_connection, ensure_method_library_seeded`
  - `brain/dashboard/api_tutor.py:862-918` — The `/chains/templates` endpoint that calls `ensure_method_library_seeded()` at line 869

  **API/Type References**:
  - `method_blocks` table schema (in db_setup.py) — columns: id, name, category, description, duration_min, facilitation_prompt, etc.

  **WHY Each Reference Matters**:
  - `db_setup.py`: This is WHERE the function must live (it's imported from there at api_tutor.py:37)
  - `seed_methods.py`: This has the ACTUAL seeding logic and data (PEIRRO blocks + template chains). Reuse its approach rather than reinventing it.
  - `api_tutor.py:37`: The exact import that will fail if function doesn't exist — this crashes the entire tutor blueprint
  - `api_tutor.py:869`: The exact call site inside `get_template_chains()` — this is where `ensure_method_library_seeded()` is invoked

  **Acceptance Criteria**:

  - [ ] `ensure_method_library_seeded` function exists in `brain/db_setup.py`
  - [ ] Function seeds method_blocks table when empty
  - [ ] `curl http://localhost:5000/api/tutor/chains/templates` returns 200 with JSON array of template chains
  - [ ] `pytest brain/tests/test_method_seed.py` passes
  - [ ] `pytest brain/tests/` all pass (no regressions)

  **QA Scenarios**:

  ```
  Scenario: Template chains endpoint returns data
    Tool: Bash (curl)
    Preconditions: Dashboard running on localhost:5000, method_blocks table seeded
    Steps:
      1. curl -s http://localhost:5000/api/tutor/chains/templates
      2. Parse JSON response
      3. Assert response is array with length > 0
      4. Assert each item has "id", "name", "blocks" fields
    Expected Result: 200 OK, JSON array with 6+ template chains, each having blocks array
    Failure Indicators: 500 error, empty array, missing fields
    Evidence: .sisyphus/evidence/task-2-chains-templates.json

  Scenario: Method blocks endpoint returns seed data
    Tool: Bash (curl)
    Preconditions: Dashboard running on localhost:5000
    Steps:
      1. curl -s http://localhost:5000/api/tutor/blocks
      2. Parse JSON response
      3. Assert array length >= 18 (seed data count)
      4. Assert blocks span categories: prepare, encode, interrogate, retrieve, refine, overlearn
    Expected Result: 200 OK, 18+ blocks with PEIRRO categories represented
    Failure Indicators: 500 error, empty array, missing categories
    Evidence: .sisyphus/evidence/task-2-blocks-list.json
  ```

  **Commit**: YES
  - Message: `fix(tutor): add ensure_method_library_seeded to db_setup for method block seeding`
  - Files: `brain/db_setup.py`, `brain/tests/test_method_seed.py`
  - Pre-commit: `pytest brain/tests/`

---

- [x] 3. Fix TutorWizard → session start flow

  **What to do**:
  - Write failing tests first (TDD RED):
    - Test: Wizard renders step 0 (course selection) on mount
    - Test: Selecting a course advances to step 1 (chain selection)
    - Test: Selecting a chain advances to step 2 (start confirmation)
    - Test: Clicking "Start Session" calls `onStartSession` with correct params
    - Test: Wizard shows loading state while session is being created
  - Fix identified issues:
    - Ensure wizard step transitions work without errors
    - Ensure `onStartSession` callback in `tutor.tsx` correctly creates a session via API
    - Ensure the transition from wizard → active session view (chat) is seamless
    - Verify course list populates from `/api/tutor/content-sources`
    - Verify chain templates populate from `/api/tutor/chains/templates`
    - Handle empty states (no courses, no chains) with clear messaging
  - Make tests pass (TDD GREEN)
  - Refactor if needed

  **Must NOT do**:
  - Do NOT merge wizard into ContentFilter (G2)
  - Do NOT add Exposure Check or M0 Planning steps (G1)
  - Do NOT change the 3-step wizard structure (course → chain → start)
  - Do NOT add new API endpoints (G3)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Multi-step flow with state management, API integration, conditional rendering
  - **Skills**: [`tdd`, `react-dev`, `javascript-typescript`]
    - `tdd`: TDD workflow — write failing test, implement fix, verify pass
    - `react-dev`: React state management, hooks, conditional rendering
    - `javascript-typescript`: TypeScript strict mode, TanStack Query patterns
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: This is logic/flow, not visual design
    - `visual-engineering`: Not a styling task

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 5, 6, 7)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8 (session end depends on sessions being startable), Task 10
  - **Blocked By**: Task 2 (needs working template chains endpoint)

  **References**:

  **Pattern References**:
  - `dashboard_rebuild/client/src/components/TutorWizard.tsx:1-815` — Full wizard component. Step state managed by `wizardStep` (0/1/2). Course selection at lines ~100-200, chain selection ~200-400, start screen ~400-600.
  - `dashboard_rebuild/client/src/pages/tutor.tsx:200-280` — `handleStartSession` callback that creates the session via API and transitions to active session view. Look at how `activeSessionId` gets set.
  - `dashboard_rebuild/client/src/pages/tutor.tsx:80-120` — TanStack queries for `contentSources` and `templateChains` that feed the wizard.

  **API/Type References**:
  - `dashboard_rebuild/client/src/lib/api.ts` — `tutorCreateSession()` function signature and request/response types
  - `dashboard_rebuild/client/src/lib/api.ts` — `TutorTemplateChain`, `TutorContentSource` type definitions

  **Test References**:
  - `dashboard_rebuild/client/src/test/setup.ts` — Test setup file from Task 0

  **WHY Each Reference Matters**:
  - `TutorWizard.tsx`: The ENTIRE component to fix — step transitions, data loading, callbacks
  - `tutor.tsx:200-280`: The SESSION CREATION logic that the wizard's "Start" button triggers
  - `api.ts`: The exact API contract the wizard must satisfy

  **Acceptance Criteria**:

  - [ ] Tests exist: `dashboard_rebuild/client/src/components/__tests__/TutorWizard.test.tsx`
  - [ ] `npx vitest run TutorWizard` → PASS (5+ tests)
  - [ ] Wizard loads course list from API without errors
  - [ ] Wizard loads chain templates from API without errors
  - [ ] Step transitions (0 → 1 → 2 → start) work without state bugs
  - [ ] "Start Session" creates session and transitions to chat view
  - [ ] Empty course list shows helpful message (not blank)
  - [ ] Build succeeds: `cd dashboard_rebuild && npm run build`

  **QA Scenarios**:

  ```
  Scenario: Complete wizard flow — course → chain → start session
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running, at least 1 course exists in DB, template chains seeded
    Steps:
      1. Navigate to http://localhost:5000/tutor
      2. Wait for wizard to load (selector: text containing "Select" or "Course", timeout 10s)
      3. Screenshot initial wizard state
      4. Click on the first course card/button
      5. Wait for step 1 (chain selection) to appear
      6. Screenshot chain selection step
      7. Click on the first template chain
      8. Wait for step 2 (start confirmation) to appear
      9. Screenshot start step
      10. Click "Start Session" button (selector: button containing "Start")
      11. Wait for chat view to appear (selector: textarea or input for chat, timeout 10s)
      12. Screenshot active session view
    Expected Result: Each step transitions smoothly, chat view appears after "Start Session"
    Failure Indicators: Step doesn't advance, blank screen, console errors, "Start Session" does nothing
    Evidence: .sisyphus/evidence/task-3-wizard-flow-{step}.png

  Scenario: Wizard with no courses — empty state
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running, no courses in DB (or use a fresh DB)
    Steps:
      1. Navigate to http://localhost:5000/tutor
      2. Wait for wizard to load (timeout 10s)
      3. Screenshot the empty state
      4. Check for a helpful message (not just blank space)
    Expected Result: Message like "No courses found" or "Add courses to get started" visible
    Failure Indicators: Blank step, infinite loading spinner, console errors
    Evidence: .sisyphus/evidence/task-3-wizard-empty-state.png
  ```

  **Commit**: YES
  - Message: `fix(tutor): fix wizard step transitions and session start flow`
  - Files: `dashboard_rebuild/client/src/components/TutorWizard.tsx`, `dashboard_rebuild/client/src/pages/tutor.tsx`, `dashboard_rebuild/client/src/components/__tests__/TutorWizard.test.tsx`
  - Pre-commit: `cd dashboard_rebuild && npx vitest run`

---

- [ ] 4. Fix ContentFilter mode/chain selection + compact mode

  **What to do**:
  - Write failing tests first (TDD RED):
    - Test: ContentFilter renders all 5 modes (Core, Sprint, Quick Sprint, Light, Drill)
    - Test: Selecting a mode calls `onModeChange` with correct TutorMode value
    - Test: Chain selector shows template chains from API
    - Test: Compact mode renders inline toolbar (not full panel)
    - Test: Compact mode allows changing mode/chain during active session
  - Fix identified issues:
    - Verify mode selection persists and is sent to API correctly
    - Verify chain selection works for both template and custom chains
    - Fix compact mode layout — should be a slim toolbar, not a full panel
    - Ensure `hasActiveSession` prop correctly controls behavior
    - Verify engine selector (Codex/OpenRouter/Buster) works
    - Fix topic input — should be editable and sent with session
  - Make tests pass (TDD GREEN)

  **Must NOT do**:
  - Do NOT merge ContentFilter with TutorWizard (G2)
  - Do NOT add new modes beyond the 5 existing ones
  - Do NOT change engine selection logic (that's backend)
  - Do NOT modify the materials upload section (that's Task 9 territory if needed)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex component with multiple sub-sections, two layout modes (compact/full), API integration
  - **Skills**: [`tdd`, `react-dev`, `javascript-typescript`]
    - `tdd`: TDD workflow
    - `react-dev`: React component patterns, controlled inputs, callback props
    - `javascript-typescript`: TypeScript types for modes and chains
  - **Skills Evaluated but Omitted**:
    - `visual-engineering`: Compact mode is logic, not just styling
    - `shadcn`: ContentFilter uses custom UI, not heavily Shadcn-based

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 5, 6, 7)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 10
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `dashboard_rebuild/client/src/components/ContentFilter.tsx:1-743` — Full component. Mode selector ~lines 200-300, chain selector ~300-450, compact mode logic ~100-150 (check `compact` prop).
  - `dashboard_rebuild/client/src/pages/tutor.tsx:700-800` — Where ContentFilter is rendered with props. Look at `compact={true}` usage during active session.
  - `dashboard_rebuild/client/src/pages/tutor.tsx:50-80` — State variables: `mode`, `chainId`, `customBlockIds`, `topic`, `engine`, `webSearch`.

  **API/Type References**:
  - `dashboard_rebuild/client/src/lib/api.ts` — `TutorMode` type enum, `TutorTemplateChain` type
  - `sop/library/06-modes.md` — Mode definitions (Core=guide, Sprint=tester, etc.) for verifying labels

  **WHY Each Reference Matters**:
  - `ContentFilter.tsx`: The component being fixed — mode selector, chain selector, compact layout
  - `tutor.tsx:700-800`: How ContentFilter is mounted and what props it receives in both compact and full modes
  - `06-modes.md`: The 5 modes must match SOP definitions

  **Acceptance Criteria**:

  - [ ] Tests exist: `dashboard_rebuild/client/src/components/__tests__/ContentFilter.test.tsx`
  - [ ] `npx vitest run ContentFilter` → PASS (5+ tests)
  - [ ] All 5 modes render with correct labels
  - [ ] Mode selection triggers `onModeChange` callback
  - [ ] Chain selection works for template chains
  - [ ] Compact mode renders as slim toolbar during active session
  - [ ] Topic input is editable and value persists
  - [ ] Engine selector shows available options
  - [ ] Build succeeds

  **QA Scenarios**:

  ```
  Scenario: Mode selection works in full panel mode
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running, on /tutor page, no active session (setup view visible)
    Steps:
      1. Navigate to http://localhost:5000/tutor
      2. Look for mode selector buttons/tabs (text: "Core", "Sprint", "Quick Sprint", "Light", "Drill")
      3. Click "Sprint" mode
      4. Verify Sprint is visually selected (active state, highlighted)
      5. Screenshot the mode selection
    Expected Result: Sprint mode is selected, visually indicated, other modes deselected
    Failure Indicators: Click does nothing, multiple modes appear selected, mode labels missing
    Evidence: .sisyphus/evidence/task-4-mode-selection.png

  Scenario: Compact mode shows inline toolbar during active session
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running, active session started (complete wizard first)
    Steps:
      1. Start a session via wizard flow
      2. Look for compact ContentFilter toolbar at top of chat area
      3. Verify mode badge/selector is visible
      4. Verify chain info is visible
      5. Screenshot the compact toolbar
    Expected Result: Slim toolbar with mode, chain, topic visible — NOT a full panel
    Failure Indicators: Full panel overlays chat, toolbar missing entirely, buttons non-functional
    Evidence: .sisyphus/evidence/task-4-compact-mode.png
  ```

  **Commit**: YES
  - Message: `fix(tutor): fix ContentFilter mode/chain selection and compact mode layout`
  - Files: `dashboard_rebuild/client/src/components/ContentFilter.tsx`, `dashboard_rebuild/client/src/components/__tests__/ContentFilter.test.tsx`
  - Pre-commit: `cd dashboard_rebuild && npx vitest run`

---

- [ ] 5. Fix chain progress visibility + block advancement

  **What to do**:
  - Write failing tests first (TDD RED):
    - Test: Chain progress section renders in sidebar when session has chain blocks
    - Test: Current block is highlighted in the block list
    - Test: "Next Block" button calls `onAdvanceBlock` callback
    - Test: Block timer displays countdown when block has duration
    - Test: Progress indicator (e.g., "Block 2 of 6") updates correctly
  - Fix identified issues:
    - Make chain progress section prominent in the right sidebar (not buried)
    - Add clear visual indicator of current block (highlight, arrow, or badge)
    - Ensure "Advance to Next Block" button works and calls API
    - Fix block timer — should count down and show visual warning near expiry
    - Add progress bar or fraction display (e.g., "3/6 blocks complete")
    - Handle edge case: last block → show "Complete Chain" instead of "Next Block"
  - Make tests pass (TDD GREEN)

  **Must NOT do**:
  - Do NOT auto-advance blocks on timer expiry (just show warning)
  - Do NOT change block content or facilitation prompts
  - Do NOT add M0-M6 gates to block advancement (G1)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Progress visualization, timer UI, highlighted states — primarily visual work
  - **Skills**: [`tdd`, `react-dev`, `frontend-ui-ux`]
    - `tdd`: TDD workflow
    - `react-dev`: React state, intervals (timer), conditional rendering
    - `frontend-ui-ux`: Progress bar design, visual hierarchy for current block
  - **Skills Evaluated but Omitted**:
    - `shadcn`: Progress component is likely custom, not Shadcn

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 4, 6, 7)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 10
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `dashboard_rebuild/client/src/pages/tutor.tsx:850-1000` — Right sidebar rendering: chain progress section, block list, timer, artifacts toggle. Look for `chainBlocks`, `currentBlockIndex`, `blockTimerSeconds` usage.
  - `dashboard_rebuild/client/src/pages/tutor.tsx:320-380` — `handleAdvanceBlock` function that calls the API and updates state.
  - `dashboard_rebuild/client/src/pages/tutor.tsx:400-450` — Block timer effect (`useEffect` with `setInterval` for countdown).

  **API/Type References**:
  - `brain/dashboard/api_tutor.py:1500-1550` — POST `/session/{id}/advance-block` endpoint: what it expects and returns
  - `dashboard_rebuild/client/src/lib/api.ts` — `tutorAdvanceBlock()` function

  **WHY Each Reference Matters**:
  - `tutor.tsx:850-1000`: The EXACT JSX for the right sidebar where chain progress lives — this is what needs visual improvement
  - `tutor.tsx:320-380`: The advance-block handler that the "Next Block" button must trigger
  - `tutor.tsx:400-450`: Timer logic — need to verify interval is set up correctly

  **Acceptance Criteria**:

  - [ ] Chain progress section visible in right sidebar during active session
  - [ ] Current block clearly highlighted (different background, border, or icon)
  - [ ] "Next Block" / "Advance" button works and moves to next block
  - [ ] Block timer counts down when block has duration_min
  - [ ] Progress fraction visible (e.g., "Block 2 of 6" or progress bar)
  - [ ] Last block shows "Complete Chain" variant
  - [ ] Timer shows visual warning when < 60 seconds remain
  - [ ] Tests pass: `npx vitest run` (chain progress tests)
  - [ ] Build succeeds

  **QA Scenarios**:

  ```
  Scenario: Chain progress visible and block advancement works
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running, active session with a template chain (not freeform)
    Steps:
      1. Start session with a template chain via wizard
      2. Look for chain progress in right sidebar (selector: text matching block names or "Block 1")
      3. Screenshot the chain progress section
      4. Click "Next Block" or "Advance" button
      5. Verify the highlighted block changes (block index incremented)
      6. Screenshot after advancement
    Expected Result: Block list visible, current block highlighted, advancement changes highlight
    Failure Indicators: No chain progress section, "Next Block" does nothing, no visual change after advance
    Evidence: .sisyphus/evidence/task-5-chain-progress.png, .sisyphus/evidence/task-5-block-advance.png

  Scenario: Block timer counts down
    Tool: Playwright (playwright skill)
    Preconditions: Active session with chain, current block has duration_min > 0
    Steps:
      1. Observe timer display in sidebar (selector: text matching time format like "5:00" or "4:59")
      2. Wait 3 seconds
      3. Verify timer value has decreased
      4. Screenshot the timer
    Expected Result: Timer visibly counts down, format is readable (MM:SS or similar)
    Failure Indicators: Timer shows 0:00, timer doesn't decrease, no timer visible
    Evidence: .sisyphus/evidence/task-5-block-timer.png
  ```

  **Commit**: YES
  - Message: `fix(tutor): improve chain progress visibility and block advancement UI`
  - Files: `dashboard_rebuild/client/src/pages/tutor.tsx` (sidebar section), test file
  - Pre-commit: `cd dashboard_rebuild && npx vitest run`

---

- [ ] 6. Fix TutorChat slash commands + action buttons

  **What to do**:
  - Write failing tests first (TDD RED):
    - Test: Typing "/note" in chat input triggers note creation flow
    - Test: Typing "/card" triggers card creation flow
    - Test: Typing "/map" triggers concept map creation flow
    - Test: "Save Note" action button on a message calls artifact creation API
    - Test: "Create Card" action button calls artifact creation API
    - Test: "Send to Brain" action button works
    - Test: SSE streaming messages render incrementally (not all-at-once)
  - Fix identified issues:
    - Verify slash command detection in `TutorChat.tsx` input handler
    - Ensure action buttons (Save Note, Create Card, Send to Brain) per message actually call the API
    - Verify artifact creation response is handled (success toast, artifact added to list)
    - Fix SSE stream error handling — if stream is interrupted, show error state (not infinite loading)
    - Verify ReactMarkdown rendering of assistant messages
  - Make tests pass (TDD GREEN)

  **Must NOT do**:
  - Do NOT add new slash commands beyond /note, /card, /map
  - Do NOT change the SSE streaming protocol
  - Do NOT modify api_tutor.py (G3)
  - Do NOT add markdown preview for user input

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: SSE streaming, slash command parsing, multiple action buttons, artifact creation — complex interaction patterns
  - **Skills**: [`tdd`, `react-dev`, `javascript-typescript`]
    - `tdd`: TDD workflow
    - `react-dev`: Event handlers, SSE/EventSource, state updates during streaming
    - `javascript-typescript`: TypeScript for message types, artifact types
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: This is interaction logic, not visual design

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 4, 5, 7)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9 (artifacts panel depends on artifacts being created)
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `dashboard_rebuild/client/src/components/TutorChat.tsx:1-417` — Full chat component. Slash command detection ~lines 50-100, SSE streaming ~lines 100-200, action buttons per message ~lines 250-350, message rendering ~lines 350-417.
  - `dashboard_rebuild/client/src/pages/tutor.tsx:280-320` — `handleSendMessage` function that initiates SSE stream
  - `dashboard_rebuild/client/src/pages/tutor.tsx:350-400` — `handleCreateArtifact` function for saving notes/cards/maps

  **API/Type References**:
  - `brain/dashboard/api_tutor.py:300-500` — POST `/session/{id}/turn` SSE endpoint: event types, data format, error handling
  - `brain/dashboard/api_tutor.py:600-700` — POST `/session/{id}/artifact` endpoint: creates note/card/map
  - `dashboard_rebuild/client/src/lib/api.ts` — `TutorArtifact` type, `tutorCreateArtifact()` function

  **WHY Each Reference Matters**:
  - `TutorChat.tsx`: The entire component being fixed — slash commands, streaming, action buttons
  - `tutor.tsx:280-320`: The message send handler that TutorChat calls — this is the SSE initiation
  - `api_tutor.py:300-500`: The backend SSE protocol — need to match event types the frontend expects

  **Acceptance Criteria**:

  - [ ] Tests exist: `dashboard_rebuild/client/src/components/__tests__/TutorChat.test.tsx`
  - [ ] `npx vitest run TutorChat` → PASS (7+ tests)
  - [ ] Slash commands (/note, /card, /map) detected and trigger artifact creation
  - [ ] Action buttons per message (Save Note, Create Card, Send to Brain) work
  - [ ] SSE streaming renders messages incrementally
  - [ ] Stream interruption shows error message (not infinite loading)
  - [ ] Artifact creation shows success toast
  - [ ] Build succeeds

  **QA Scenarios**:

  ```
  Scenario: Send message and receive streamed response
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running, active tutor session
    Steps:
      1. Click chat input textarea
      2. Type "Explain the anatomy of the knee joint"
      3. Click Send button (or press Enter)
      4. Wait for assistant response to appear (timeout 30s — SSE may be slow)
      5. Verify response text appears incrementally (not blank then full)
      6. Screenshot the chat with user message and assistant response
    Expected Result: User message appears, assistant response streams in, rendered as markdown
    Failure Indicators: Send does nothing, "Failed to fetch" error, infinite loading spinner, blank response
    Evidence: .sisyphus/evidence/task-6-chat-send-receive.png

  Scenario: Slash command /note creates artifact
    Tool: Playwright (playwright skill)
    Preconditions: Active tutor session with at least one assistant response
    Steps:
      1. Type "/note This is a test note about knee anatomy" in chat input
      2. Press Enter or click Send
      3. Wait for toast notification or artifact creation confirmation (timeout 10s)
      4. Check artifacts panel for new note
      5. Screenshot
    Expected Result: Note artifact created, toast shown "Note saved" or similar, appears in artifacts list
    Failure Indicators: Message sent as regular chat (not detected as command), no artifact created, error
    Evidence: .sisyphus/evidence/task-6-slash-note.png
  ```

  **Commit**: YES
  - Message: `fix(tutor): fix chat slash commands, action buttons, and SSE error handling`
  - Files: `dashboard_rebuild/client/src/components/TutorChat.tsx`, test file
  - Pre-commit: `cd dashboard_rebuild && npx vitest run`

---

- [ ] 7. Fix session restore on page refresh

  **What to do**:
  - Write failing tests first (TDD RED):
    - Test: `tutor.tsx` reads `tutor.active_session.v1` from localStorage on mount
    - Test: If valid session ID found, fetches session data from API
    - Test: Restored session shows chat view with previous messages
    - Test: Restored session shows correct mode, chain, artifacts
    - Test: If localStorage has invalid/expired session ID, clears it and shows wizard
  - Fix identified issues:
    - Verify localStorage read is wrapped in try/catch (per AGENTS.md learning)
    - Verify session restore fetches full session with turns history
    - Verify chat messages from previous turns are rendered
    - Verify chain progress is restored to correct block
    - Handle expired/deleted session gracefully (clear localStorage, show wizard)
    - Handle corrupted localStorage data (JSON parse errors)
  - Make tests pass (TDD GREEN)

  **Must NOT do**:
  - Do NOT add cross-tab synchronization (E5 — out of scope)
  - Do NOT change the localStorage key name
  - Do NOT add IndexedDB or other storage mechanisms

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: localStorage + API fetch + state restoration + error handling — multiple integration points
  - **Skills**: [`tdd`, `react-dev`, `javascript-typescript`]
    - `tdd`: TDD workflow
    - `react-dev`: useEffect mount hooks, state initialization patterns
    - `javascript-typescript`: localStorage typing, JSON parse safety
  - **Skills Evaluated but Omitted**:
    - `react-useeffect`: Could be relevant but the fix is specific, not a general useEffect audit

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 4, 5, 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 10
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `dashboard_rebuild/client/src/pages/tutor.tsx:120-180` — Session restore logic on mount. Look for `useEffect` that reads from localStorage and calls API to fetch session.
  - `dashboard_rebuild/client/src/pages/tutor.tsx:55-75` — State initialization, localStorage key `tutor.active_session.v1`.

  **API/Type References**:
  - `brain/dashboard/api_tutor.py:150-200` — GET `/session/{id}` endpoint returns session with turns history and chain blocks
  - `dashboard_rebuild/client/src/lib/api.ts` — `TutorSessionWithTurns` type, `tutorGetSession()` function

  **Test References**:
  - AGENTS.md "localStorage in React useState Initializers" learning — MUST use try/catch + type validation

  **WHY Each Reference Matters**:
  - `tutor.tsx:120-180`: The EXACT restore logic to fix — localStorage read + API fetch + state hydration
  - `api_tutor.py:150-200`: Need to know what the restore API returns (turns, blocks, artifacts)
  - AGENTS.md learning: The project has a documented pattern for safe localStorage reads — MUST follow it

  **Acceptance Criteria**:

  - [ ] Session restore reads localStorage with try/catch and type validation
  - [ ] Valid session ID → fetches session → shows chat with previous messages
  - [ ] Invalid/expired session ID → clears localStorage → shows wizard
  - [ ] Corrupted localStorage → clears it → shows wizard (no crash)
  - [ ] Restored session has correct mode, chain progress, artifacts
  - [ ] Tests pass
  - [ ] Build succeeds

  **QA Scenarios**:

  ```
  Scenario: Page refresh restores active session
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running, active session exists
    Steps:
      1. Start a session via wizard
      2. Send a test message "Hello, testing restore"
      3. Wait for response
      4. Reload the page (page.reload())
      5. Wait for page to load (timeout 15s)
      6. Check if chat view appears (not wizard)
      7. Check if previous message "Hello, testing restore" is visible
      8. Screenshot
    Expected Result: Chat view with previous messages, not wizard. Session state preserved.
    Failure Indicators: Wizard shows (session not restored), previous messages missing, blank page
    Evidence: .sisyphus/evidence/task-7-session-restore.png

  Scenario: Invalid session ID in localStorage gracefully resets
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running
    Steps:
      1. Set invalid localStorage: page.evaluate(() => localStorage.setItem('tutor.active_session.v1', '"invalid-id-12345"'))
      2. Navigate to http://localhost:5000/tutor
      3. Wait for page to load (timeout 15s)
      4. Verify wizard/setup view appears (not chat, not error)
      5. Verify localStorage key is cleared: page.evaluate(() => localStorage.getItem('tutor.active_session.v1'))
      6. Screenshot
    Expected Result: Wizard view appears, localStorage cleared, no crash or error screen
    Failure Indicators: Error boundary shown, infinite loading, chat view with no data
    Evidence: .sisyphus/evidence/task-7-invalid-session-reset.png
  ```

  **Commit**: YES
  - Message: `fix(tutor): harden session restore with try/catch and graceful fallback`
  - Files: `dashboard_rebuild/client/src/pages/tutor.tsx`, test file
  - Pre-commit: `cd dashboard_rebuild && npx vitest run`

---

- [ ] 8. Fix session end flow (Ship to Brain / End Without Saving)

  **What to do**:
  - Write failing tests first (TDD RED):
    - Test: "End Session" button shows confirmation dialog
    - Test: "Ship to Brain" calls `tutorEndSession` API with correct params
    - Test: "End Without Saving" calls end API with skip-brain flag
    - Test: "Cancel" closes dialog and returns to chat
    - Test: After ending session, UI resets to wizard view
    - Test: After ending, localStorage session ID is cleared
  - Fix identified issues:
    - Verify `showEndConfirm` state toggles the overlay correctly
    - Verify "Ship to Brain" actually calls the API and creates a Brain session record
    - Verify "End Without Saving" marks session as completed without Brain record
    - Verify after end → activeSessionId is null → wizard shows → localStorage cleared
    - Verify the confirmation dialog is arcade-themed (not default ShadCN)
    - Handle API errors during end (show error toast, don't leave in limbo state)
  - Make tests pass (TDD GREEN)

  **Must NOT do**:
  - Do NOT add Obsidian integration here (that's in Ship to Brain on the backend)
  - Do NOT change the end session API endpoint (G3)
  - Do NOT add session analytics/summary view after ending

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Session lifecycle transition, API integration, state cleanup, confirmation dialog
  - **Skills**: [`tdd`, `react-dev`, `javascript-typescript`]
    - `tdd`: TDD workflow
    - `react-dev`: Dialog state, API mutation, state cleanup
    - `javascript-typescript`: TypeScript for end session params

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 5, 6, 7 — but needs Task 3 done since sessions must be startable)
  - **Parallel Group**: Wave 2 (can start once Task 3 confirms sessions start correctly)
  - **Blocks**: Task 10
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `dashboard_rebuild/client/src/pages/tutor.tsx:380-430` — End session handler: calls API, clears state, clears localStorage
  - `dashboard_rebuild/client/src/pages/tutor.tsx:1000-1100` — `showEndConfirm` overlay JSX: Ship to Brain button, End Without Saving button, Cancel button

  **API/Type References**:
  - `brain/dashboard/api_tutor.py:500-600` — POST `/session/{id}/end` endpoint: creates Brain `sessions` record, links `card_drafts`, returns summary
  - `dashboard_rebuild/client/src/lib/api.ts` — `tutorEndSession()` function

  **WHY Each Reference Matters**:
  - `tutor.tsx:380-430`: The end session handler — what happens when user clicks Ship to Brain
  - `tutor.tsx:1000-1100`: The confirmation dialog JSX — buttons, styling, state management
  - `api_tutor.py:500-600`: Backend behavior to verify — creates Brain record + links cards

  **Acceptance Criteria**:

  - [ ] "End Session" button shows confirmation dialog with 3 options
  - [ ] "Ship to Brain" calls API, shows success toast, resets to wizard
  - [ ] "End Without Saving" calls API, resets to wizard
  - [ ] "Cancel" closes dialog, returns to chat
  - [ ] localStorage session ID cleared after end
  - [ ] API errors show error toast (not silent failure)
  - [ ] Tests pass
  - [ ] Build succeeds

  **QA Scenarios**:

  ```
  Scenario: Ship to Brain ends session and resets to wizard
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running, active tutor session with at least 1 turn
    Steps:
      1. Click "End Session" button
      2. Wait for confirmation dialog (timeout 5s)
      3. Screenshot the confirmation dialog
      4. Click "Ship to Brain" button
      5. Wait for transition (timeout 10s)
      6. Verify wizard/setup view appears (not chat)
      7. Verify no session-related data in UI
      8. Screenshot after reset
    Expected Result: Confirmation dialog shows, "Ship to Brain" succeeds, wizard appears
    Failure Indicators: Dialog doesn't appear, "Ship to Brain" errors, still shows chat after
    Evidence: .sisyphus/evidence/task-8-end-session-dialog.png, .sisyphus/evidence/task-8-after-end.png

  Scenario: Cancel returns to chat without ending
    Tool: Playwright (playwright skill)
    Preconditions: Active session, end confirmation dialog open
    Steps:
      1. Click "End Session" to open dialog
      2. Click "Cancel" button
      3. Verify chat view is still active
      4. Verify previous messages still visible
    Expected Result: Dialog closes, chat view preserved, session still active
    Failure Indicators: Session ended despite cancel, dialog persists, chat messages lost
    Evidence: .sisyphus/evidence/task-8-cancel-end.png
  ```

  **Commit**: YES
  - Message: `fix(tutor): fix session end flow with Ship to Brain and graceful reset`
  - Files: `dashboard_rebuild/client/src/pages/tutor.tsx`, test file
  - Pre-commit: `cd dashboard_rebuild && npx vitest run`

---

- [ ] 9. Fix TutorArtifacts panel + recent sessions

  **What to do**:
  - Write failing tests first (TDD RED):
    - Test: Artifacts panel shows list of created artifacts (notes, cards, maps)
    - Test: Bulk select and delete artifacts works
    - Test: Recent sessions list shows previous sessions
    - Test: Resume session button loads the session
    - Test: Delete session button removes from list
    - Test: "Save to Obsidian" button works (or shows helpful error if Obsidian not running)
  - Fix identified issues:
    - Verify artifacts list updates when new artifact created via chat
    - Verify artifact display shows type (note/card/map), preview, timestamp
    - Verify bulk select checkbox and delete button work
    - Verify recent sessions list loads from API
    - Verify resume loads the session into chat view
    - Verify delete confirmation works (AlertDialog)
    - Handle Obsidian not running — show toast "Obsidian not connected" instead of silent failure
  - Make tests pass (TDD GREEN)

  **Must NOT do**:
  - Do NOT add artifact editing (view only)
  - Do NOT add artifact export beyond Obsidian
  - Do NOT touch TutorChat artifact creation (that's Task 6)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: List rendering, bulk selection UI, session cards, visual feedback
  - **Skills**: [`tdd`, `react-dev`, `frontend-ui-ux`]
    - `tdd`: TDD workflow
    - `react-dev`: List rendering, checkbox state, TanStack Query mutations
    - `frontend-ui-ux`: Artifact cards, session cards, bulk actions UI
  - **Skills Evaluated but Omitted**:
    - `shadcn`: AlertDialog is used but the fix is interaction logic

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 10)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 10
  - **Blocked By**: Task 6 (artifacts must be creatable before testing the panel)

  **References**:

  **Pattern References**:
  - `dashboard_rebuild/client/src/components/TutorArtifacts.tsx:1-595` — Full component. Artifact list ~lines 100-250, bulk actions ~250-350, session info ~350-450, recent sessions ~450-595.
  - `dashboard_rebuild/client/src/pages/tutor.tsx:900-950` — Where TutorArtifacts is rendered with props (artifacts array, callbacks)

  **API/Type References**:
  - `brain/dashboard/api_tutor.py:600-700` — Artifact CRUD endpoints
  - `brain/dashboard/api_tutor.py:700-750` — GET `/sessions` endpoint for recent sessions list
  - `dashboard_rebuild/client/src/lib/api.ts` — `TutorArtifact` type, `TutorSessionSummary` type

  **WHY Each Reference Matters**:
  - `TutorArtifacts.tsx`: The component being fixed — artifact list, bulk actions, recent sessions
  - `tutor.tsx:900-950`: How the component receives props — artifacts array, delete callback, resume callback

  **Acceptance Criteria**:

  - [ ] Tests exist: `dashboard_rebuild/client/src/components/__tests__/TutorArtifacts.test.tsx`
  - [ ] Artifacts list renders created notes/cards/maps with type and preview
  - [ ] Bulk select + delete works
  - [ ] Recent sessions list populates from API
  - [ ] Resume session loads it into chat
  - [ ] Delete session shows confirmation and removes from list
  - [ ] "Save to Obsidian" shows error toast if Obsidian not connected
  - [ ] Tests pass, build succeeds

  **QA Scenarios**:

  ```
  Scenario: Artifacts panel shows created artifacts
    Tool: Playwright (playwright skill)
    Preconditions: Active session with at least 1 artifact created (via /note command in Task 6)
    Steps:
      1. Look for artifacts panel in right sidebar or toggle it open
      2. Verify artifact list shows at least 1 item
      3. Check each artifact shows type badge (Note/Card/Map) and content preview
      4. Screenshot
    Expected Result: Artifact list with type badges, preview text, timestamps
    Failure Indicators: Empty list, "undefined" text, missing type indicators
    Evidence: .sisyphus/evidence/task-9-artifacts-panel.png

  Scenario: Recent sessions list loads and resume works
    Tool: Playwright (playwright skill)
    Preconditions: At least 1 completed session in DB (end a session via Task 8 first)
    Steps:
      1. On tutor page with no active session, look for "Recent Sessions" section
      2. Verify at least 1 session listed with date and topic
      3. Click "Resume" on the first session
      4. Verify chat view appears with previous messages loaded
      5. Screenshot
    Expected Result: Recent sessions listed, resume loads chat with history
    Failure Indicators: Empty list, resume does nothing, previous messages missing
    Evidence: .sisyphus/evidence/task-9-recent-sessions.png
  ```

  **Commit**: YES
  - Message: `fix(tutor): fix artifacts panel display, bulk actions, and recent sessions`
  - Files: `dashboard_rebuild/client/src/components/TutorArtifacts.tsx`, test file
  - Pre-commit: `cd dashboard_rebuild && npx vitest run`

---

- [ ] 10. UI consistency pass — arcade theme compliance across Tutor components

  **What to do**:
  - Audit ALL Tutor components for arcade theme compliance:
    - `rounded-none` everywhere (no `rounded-md`, `rounded-lg`)
    - `bg-black/40` for containers (no `bg-black/80`, no `bg-gray-*`)
    - `border-2 border-primary` for cards
    - `font-arcade` for headers, `font-terminal` for body
    - No glow effects, no `box-shadow`
    - No ShadCN default styles (`border-border`, default radius)
  - Fix any violations found
  - Ensure consistent button styles:
    - Primary: `bg-primary rounded-none font-terminal`
    - Ghost: `hover:bg-primary/10 rounded-none font-terminal`
  - Verify loading states use consistent skeleton/spinner pattern
  - Verify error states show consistent error messages (red border, error icon)
  - Write a snapshot test capturing the Tutor page markup (guards against future regressions)

  **Must NOT do**:
  - Do NOT redesign components — only fix inconsistencies
  - Do NOT touch non-Tutor pages (G4)
  - Do NOT add new animations or transitions
  - Do NOT change colors (red/black scheme is set)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: CSS audit, theme compliance, visual consistency — purely visual/styling work
  - **Skills**: [`frontend-ui-ux`, `react-dev`]
    - `frontend-ui-ux`: Design system compliance, visual audit
    - `react-dev`: Component markup patterns, className composition
  - **Skills Evaluated but Omitted**:
    - `shadcn`: We're removing ShadCN defaults, not adding them
    - `tdd`: Theme compliance is visual, not logic — snapshot test suffices

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 9)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 3-8 (all component fixes must be done first)

  **References**:

  **Pattern References**:
  - `dashboard_rebuild/README.md` — Arcade theme styling guidelines (the DO/DON'T list)
  - `dashboard_rebuild/client/src/components/TutorWizard.tsx` — Check all classNames
  - `dashboard_rebuild/client/src/components/TutorChat.tsx` — Check all classNames
  - `dashboard_rebuild/client/src/components/ContentFilter.tsx` — Check all classNames
  - `dashboard_rebuild/client/src/components/TutorArtifacts.tsx` — Check all classNames
  - `dashboard_rebuild/client/src/pages/tutor.tsx` — Check all classNames in page layout

  **External References**:
  - `dashboard_rebuild/client/src/lib/theme.ts` — Theme constants (TEXT_MUTED, TEXT_BADGE, ICON_SM, etc.)

  **WHY Each Reference Matters**:
  - `README.md`: The CANONICAL style rules — every fix must comply with these
  - Each component file: Need to grep for `rounded-md`, `bg-black/80`, `box-shadow`, `border-border`
  - `theme.ts`: Shared theme constants that should be used instead of hardcoded values

  **Acceptance Criteria**:

  - [ ] Zero instances of `rounded-md` or `rounded-lg` in Tutor components
  - [ ] Zero instances of `bg-black/80` in Tutor components
  - [ ] Zero instances of `box-shadow` or glow effects in Tutor components
  - [ ] All cards use `bg-black/40 border-2 border-primary rounded-none`
  - [ ] All buttons use `rounded-none font-terminal`
  - [ ] Headers use `font-arcade`, body text uses `font-terminal`
  - [ ] Consistent loading/error states
  - [ ] Build succeeds
  - [ ] Existing tests still pass

  **QA Scenarios**:

  ```
  Scenario: Visual consistency check — no rounded corners
    Tool: Bash (grep)
    Preconditions: All Tutor component fixes committed
    Steps:
      1. grep -rn "rounded-md\|rounded-lg\|rounded-xl\|rounded-full" dashboard_rebuild/client/src/pages/tutor.tsx dashboard_rebuild/client/src/components/TutorWizard.tsx dashboard_rebuild/client/src/components/TutorChat.tsx dashboard_rebuild/client/src/components/ContentFilter.tsx dashboard_rebuild/client/src/components/TutorArtifacts.tsx dashboard_rebuild/client/src/components/TutorChainBuilder.tsx dashboard_rebuild/client/src/components/MaterialSelector.tsx
      2. Assert zero results (or only in imported ShadCN primitives, not in component code)
    Expected Result: Zero matches for rounded corners in Tutor components
    Failure Indicators: Any match in Tutor component files (excluding shadcn/ui imports)
    Evidence: .sisyphus/evidence/task-10-rounded-audit.txt

  Scenario: Full Tutor page visual regression screenshot
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running, all Tutor fixes applied
    Steps:
      1. Navigate to http://localhost:5000/tutor
      2. Screenshot wizard view (full page)
      3. Start a session, screenshot chat view (full page)
      4. Open artifacts panel, screenshot
      5. Compare against arcade theme: red/black, sharp corners, terminal fonts
    Expected Result: Consistent arcade theme — red borders, black backgrounds, sharp corners, terminal fonts
    Failure Indicators: Rounded corners visible, gray backgrounds, wrong fonts, glow effects
    Evidence: .sisyphus/evidence/task-10-tutor-wizard-final.png, .sisyphus/evidence/task-10-tutor-chat-final.png
  ```

  **Commit**: YES
  - Message: `style(tutor): enforce arcade theme consistency across all Tutor components`
  - Files: All modified Tutor component files
  - Pre-commit: `cd dashboard_rebuild && npx vitest run && npm run build`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `cd dashboard_rebuild && npx vitest run` + `npm run build` + `pytest brain/tests/`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real E2E QA via Playwright** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration: start session → send message → create artifact → advance block → end session → restore session. Test edge cases: empty state, rapid clicks, refresh mid-stream. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 0 | `chore(tutor): set up vitest + testing-library` | vitest.config.ts, setup.ts, smoke.test.ts, package.json | `npx vitest run` |
| 1 | — (no commit, discovery only) | — | — |
| 2 | `fix(tutor): add ensure_method_library_seeded` | db_setup.py, test_method_seed.py | `pytest brain/tests/` |
| 3 | `fix(tutor): fix wizard step transitions and session start` | TutorWizard.tsx, tutor.tsx, test | `npx vitest run` |
| 4 | `fix(tutor): fix ContentFilter mode/chain + compact mode` | ContentFilter.tsx, test | `npx vitest run` |
| 5 | `fix(tutor): improve chain progress and block advancement` | tutor.tsx, test | `npx vitest run` |
| 6 | `fix(tutor): fix chat slash commands and action buttons` | TutorChat.tsx, test | `npx vitest run` |
| 7 | `fix(tutor): harden session restore with graceful fallback` | tutor.tsx, test | `npx vitest run` |
| 8 | `fix(tutor): fix session end flow with Ship to Brain` | tutor.tsx, test | `npx vitest run` |
| 9 | `fix(tutor): fix artifacts panel and recent sessions` | TutorArtifacts.tsx, test | `npx vitest run` |
| 10 | `style(tutor): enforce arcade theme across Tutor components` | All Tutor files | `npx vitest run && npm run build` |

---

## Success Criteria

### Verification Commands
```bash
# Frontend tests
cd dashboard_rebuild && npx vitest run  # Expected: all pass

# Frontend build
cd dashboard_rebuild && npm run build  # Expected: exit 0

# Backend tests
pytest brain/tests/  # Expected: all pass

# Tutor API health (with dashboard running)
curl -s http://localhost:5000/api/tutor/config/check  # Expected: 200 JSON
curl -s http://localhost:5000/api/tutor/chains/templates  # Expected: 200 JSON array
curl -s http://localhost:5000/api/tutor/content-sources  # Expected: 200 JSON
```

### Final Checklist
- [ ] All "Must Have" present (wizard, chat, chain, artifacts, session end, restore, theme)
- [ ] All "Must NOT Have" absent (no SOP enforcement, no new endpoints, no non-Tutor changes, no glow/rounded)
- [ ] All vitest tests pass
- [ ] All pytest tests pass
- [ ] Build succeeds
- [ ] Evidence files in `.sisyphus/evidence/` for every task
- [ ] All QA scenarios pass in Final Verification Wave

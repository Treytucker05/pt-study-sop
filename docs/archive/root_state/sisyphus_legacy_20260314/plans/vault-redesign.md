# Vault Redesign: Structure, Templates, CLI Migration, and Tutor Fixes

## TL;DR

> **Quick Summary**: Redesign the Obsidian vault to properly support 5 DPT courses with per-course folder hierarchies, replace North Star with "Map of Contents," migrate all vault writes from REST API to CLI, add per-block auto-write to produce study notes as sessions progress, wire LO extraction into PRIME, and fix 5 tutor bugs found during QA.
> 
> **Deliverables**:
> - Vault folder structure matching 5 courses' native division types
> - "Map of Contents" system replacing North Star (code rename, template, renderer)
> - Full CLI migration (REST API dependency removed)
> - Per-block auto-write: vault notes written on each block completion
> - LO extraction during PRIME block → DB + MOC
> - 6 new vault note templates (grouped by artifact type)
> - 5 bug fixes (materials endpoint, localStorage, greeting, REST remnants, LOs)
> - pytest tests for all new backend code
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 5 waves
> **Critical Path**: T4 (CLI health) → T7 (CLI migration + MOC) → T13/T14 (templates) → T18 (per-block auto-write) → F1-F4

---

## Context

### Original Request
User wanted to understand the tutor setup end-to-end, starting from the wizard and building out exactly what the front and back end are and do. During QA walkthrough, discovered architectural issues: half-migrated Obsidian integration (REST + CLI mix), empty learning objectives table, "North Star" concept user doesn't like, no vault note output per block, and inconsistent vault structure for 5 courses with different division types.

### Interview Summary
**Key Discussions**:
- User provided complete 5-course catalog from Blackboard via Claude web
- Each course uses different division labels: Topics (ExPhys), Weeks (EBP, Neuro), Constructs (MS1), Modules (TI)
- Movement Science 1 is deepest hierarchy (Construct → Sub-topic → files)
- "North Star" replaced with "Map of Contents" (written out, not abbreviated)
- LOs extracted during PRIME block, not pre-loaded
- Per-block vault notes auto-written on block completion
- Full CLI migration — drop REST API entirely

**Research Findings (22 agents)**:
- Obsidian Headless CLI: irrelevant (Sync-only daemon, paid subscription)
- Regular CLI v1.12.4 (Feb 2026): correct choice, 100+ commands, IPC
- obsidian_vault.py already has 25 CLI methods + `template=` in `create_note()`
- Missing CLI wrappers: daily notes, Bases, template management, file history
- 46 blocks produce 11 artifact types — templates grouped by type, not per-block
- Block progression tracked but no auto vault-write on completion
- GET materials endpoint EXISTS at line 6006 — bug is routing/URL mismatch, not missing code
- REST API callers concentrated in api_adapter.py (8 methods), imported locally in api_tutor.py for North Star only

### Metis Review
**Identified Gaps (addressed)**:
- Bug #1 re-scoped: endpoint exists, investigate actual failure path
- Per-block auto-write must be fire-and-forget (not blocking chain progression)
- Skip auto-write for blocks with null artifact_type
- Template expansion only for artifact types that produce standalone vault notes
- Frontend courses.ts should read from backend API, not hardcode hierarchy
- MOC rename is code-only — no programmatic migration of existing vault files
- Add CLI retry with backoff (Obsidian Desktop may restart mid-session)
- Add vault_courses.yaml startup validation

---

## Work Objectives

### Core Objective
Transform the tutor's Obsidian integration from a half-migrated REST/CLI mix with inconsistent vault structure into a clean CLI-only system that produces organized, per-block study notes across 5 courses with proper Map of Contents indexing and learning objective tracking.

### Concrete Deliverables
- `brain/data/vault_courses.yaml` updated with all 5 courses, their native division types, and unit names from catalog
- `GET /api/tutor/course-map` endpoint serving course hierarchy to frontend
- All Obsidian vault writes via CLI (zero REST API callers for Obsidian ops)
- `_Map of Contents.md` template + renderer replacing North Star
- 5 new block-level templates: `block_notes.md.tmpl`, `block_diagram.md.tmpl`, `block_comparison.md.tmpl`, `block_recall.md.tmpl`, `block_cards.md.tmpl`
- Template renderers in `tutor_templates.py` for each new template
- `advance_block()` auto-writes block artifact to vault (fire-and-forget)
- PRIME block extracts LOs from materials → `learning_objectives` table + MOC
- Tutor greeting message on session open
- Frontend stale localStorage fix
- GET materials endpoint fix
- pytest tests for all new/modified backend functions

### Definition of Done
- [ ] `grep -rn "from dashboard.api_adapter import.*obsidian" brain/ --include="*.py"` returns 0 matches outside api_adapter.py itself
- [ ] `grep -rn "north.star\|north_star\|NorthStar" brain/ dashboard_rebuild/ sop/templates/ --include="*.py" --include="*.ts" --include="*.tsx" --include="*.tmpl"` returns 0 matches
- [ ] `pytest brain/tests/` all pass (existing + new)
- [ ] `curl http://localhost:5000/api/tutor/course-map` returns 5 courses with unit_type fields
- [ ] Starting a session produces a greeting message in the response
- [ ] Advancing a block writes a note to vault (verified via `obsidian read`)
- [ ] `sqlite3 brain/data/pt_study.db "SELECT COUNT(*) FROM learning_objectives"` returns > 0 after a PRIME block

### Must Have
- CLI-only vault writes (no REST API)
- Map of Contents replacing North Star at every level
- Per-block vault auto-write with fire-and-forget semantics
- LO extraction during PRIME block
- All 5 courses represented in brain/data/vault_courses.yaml with correct divisions
- Tutor greeting on session open
- Tests for new backend code

### Must NOT Have (Guardrails)
- **No dynamic template engines** — templates use `str.format_map()` with `_SafeFormatDict`, NOT Jinja2/Templater
- **No pre-created folder hierarchies** — vault folders created only when a session produces output
- **No frontend tree picker** — flat dropdown reading from backend API is sufficient
- **No vault file migration** — existing North Star files stay as-is, users move them manually
- **No templates for ALL 11 artifact types** — only types that produce standalone vault notes (skip: inline notes, cards → Anki path)
- **No Obsidian plugin dependencies** — templates are Python-rendered markdown, not Obsidian Templates/Templater plugin
- **No cross-course MOC aggregation** — MOC is per-unit, not cross-course
- **No REST API removal from api_adapter.py** — functions stay for backward compat, callers migrate away
- **No blocking vault writes** — per-block auto-write is fire-and-forget, never blocks chain progression

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (pytest brain/tests/, 56 existing tests)
- **Automated tests**: Tests-after-implementation
- **Framework**: pytest
- **Pattern**: Follow existing test patterns in `brain/tests/test_obsidian_vault.py` (mock-based, no real Obsidian needed)

### QA Policy
Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend API**: Use Bash (curl) — send requests, assert status + response fields
- **CLI methods**: Use Bash (pytest) — run specific test functions
- **Template rendering**: Use Bash (python -c) — import renderer, assert output structure
- **Frontend**: Use Playwright (playwright skill) — navigate, interact, assert DOM, screenshot
- **Migration completeness**: Use Bash (grep) — verify zero REST API imports remain

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — bugs + foundation, 6 tasks):
├── Task 1: Fix GET materials endpoint routing issue [quick]
├── Task 2: Fix stale localStorage material refs [quick]
├── Task 3: Add tutor auto-greeting message [quick]
├── Task 4: Add CLI health check + retry with backoff [quick]
├── Task 5: Create GET /api/tutor/course-map endpoint [quick]
├── Task 6: Update vault_courses.yaml with full 5-course hierarchy [quick]

Wave 2 (After Wave 1 — CLI migration + vault structure, 6 tasks):
├── Task 7: Migrate North Star → Map of Contents + REST → CLI (depends: 4) [deep]
├── Task 8: Migrate remaining REST API callers to CLI (depends: 4) [unspecified-high]
├── Task 9: Add missing CLI wrappers to obsidian_vault.py (depends: 4) [unspecified-high]
├── Task 10: Update path generation for all unit_type values (depends: 6) [quick]
├── Task 11: Update frontend to read from course-map API (depends: 5) [quick]
├── Task 12: Validate + deprecate REST API Obsidian functions (depends: 7, 8) [quick]

Wave 3 (After Wave 2 — templates + features, 6 tasks):
├── Task 13: Create new vault note templates for artifact types [unspecified-high]
├── Task 14: Add template renderers to tutor_templates.py (depends: 13) [unspecified-high]
├── Task 15: Update vault_artifact_router for new operations (depends: 14) [quick]
├── Task 16: Wire LO extraction into PRIME block flow (depends: 7, 14) [deep]
├── Task 17: Add vault_write_status to advance_block response [quick]
├── Task 18: Add per-block auto-write hook to advance_block (depends: 14, 15, 17) [deep]

Wave 4 (After Wave 3 — tests + frontend, 5 tasks):
├── Task 19: pytest tests for CLI methods + retry logic [quick]
├── Task 20: pytest tests for template renderers [quick]
├── Task 21: pytest tests for path generation + course-map [quick]
├── Task 22: pytest tests for LO extraction pipeline [quick]
├── Task 23: Frontend build + vault write status display (depends: 17) [visual-engineering]

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real QA — full tutor session walkthrough (unspecified-high)
├── Task F4: Scope fidelity check (deep)

Critical Path: T4 → T7 → T14 → T18 → T23 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 6 (Waves 1, 2, 3)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1-3 | — | — | 1 |
| 4 | — | 7, 8, 9 | 1 |
| 5 | — | 11 | 1 |
| 6 | — | 10 | 1 |
| 7 | 4 | 12, 16 | 2 |
| 8 | 4 | 12 | 2 |
| 9 | 4 | — | 2 |
| 10 | 6 | — | 2 |
| 11 | 5 | — | 2 |
| 12 | 7, 8 | — | 2 |
| 13 | — | 14 | 3 |
| 14 | 13 | 15, 16, 18 | 3 |
| 15 | 14 | 18 | 3 |
| 16 | 7, 14 | — | 3 |
| 17 | — | 18, 23 | 3 |
| 18 | 14, 15, 17 | — | 3 |
| 19-22 | Wave 3 | — | 4 |
| 23 | 17 | — | 4 |
| F1-F4 | ALL | — | FINAL |

### Agent Dispatch Summary

- **Wave 1**: **6** — T1-T6 → `quick`
- **Wave 2**: **6** — T7 → `deep`, T8-T9 → `unspecified-high`, T10-T12 → `quick`
- **Wave 3**: **6** — T13-T14 → `unspecified-high`, T15 → `quick`, T16 → `deep`, T17 → `quick`, T18 → `deep`
- **Wave 4**: **5** — T19-T22 → `quick`, T23 → `visual-engineering`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

### Wave 1 — Bugs + Foundation (6 tasks, all independent)

- [x] 1. Fix Materials Endpoint — Add GET Single-Material Route

  **What to do**:
  - The materials endpoint landscape is:
    - `GET /api/tutor/materials` (list all) — EXISTS at `api_tutor.py:6006`
    - `GET /api/tutor/materials/<id>/content` — EXISTS at `api_tutor.py:6315`
    - `PUT /api/tutor/materials/<id>` — EXISTS at `api_tutor.py:6116`
    - `DELETE /api/tutor/materials/<id>` — EXISTS at `api_tutor.py:6254`
    - `GET /api/tutor/materials/<id>` — **MISSING** (returns 405 Method Not Allowed)
  - The frontend `api.ts` may be calling `GET /api/tutor/materials/<id>` to fetch a single material's metadata, which hits the PUT/DELETE-only route and returns 405
  - **Fix**: Add a `GET` handler to the existing `/materials/<int:material_id>` route (alongside PUT/DELETE) that returns material metadata from `rag_docs` table
  - Return 404 for materials that don't exist in DB
  - Also check the frontend `api.ts` to confirm which endpoint it's calling and fix any URL mismatch

  **Must NOT do**:
  - Don't change the existing PUT/DELETE handlers
  - Don't change the list endpoint response format

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5, 6)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `brain/dashboard/api_tutor.py:6006` — `list_materials()` GET list endpoint
  - `brain/dashboard/api_tutor.py:6116` — `update_material()` PUT single endpoint (add GET method here)
  - `brain/dashboard/api_tutor.py:6254` — `delete_material()` DELETE single endpoint
  - `brain/dashboard/api_tutor.py:6315` — `get_material_content()` GET content endpoint (reference for response pattern)
  - `dashboard_rebuild/client/src/api.ts` — Frontend API calls for materials (check actual URL used)

  **Acceptance Criteria**:
  - [ ] `curl -s http://localhost:5000/api/tutor/materials | python -c "import sys,json; d=json.load(sys.stdin); assert isinstance(d, (list, dict))"` succeeds (list endpoint works)
  - [ ] `curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/tutor/materials/99999` returns `404` (not `405` or `500`)

  **QA Scenarios**:
  ```
  Scenario: Happy path — list all materials
    Tool: Bash (curl)
    Preconditions: Server running on port 5000, at least 1 material in rag_docs table
    Steps:
      1. curl -s http://localhost:5000/api/tutor/materials
      2. Parse JSON response, assert it's a list or dict with materials data
      3. Assert HTTP status is 200
    Expected Result: 200 OK with materials data
    Evidence: .sisyphus/evidence/task-1-list-materials.json

  Scenario: Single material GET returns metadata
    Tool: Bash (curl)
    Preconditions: Server running, at least 1 material exists (check list endpoint for a valid ID)
    Steps:
      1. curl -s http://localhost:5000/api/tutor/materials (get a valid material ID)
      2. curl -s http://localhost:5000/api/tutor/materials/<valid_id>
      3. Assert 200 with material metadata (id, source_path, file_type, etc.)
    Expected Result: 200 OK with single material metadata
    Evidence: .sisyphus/evidence/task-1-single-material.json

  Scenario: Missing material returns 404 (not 405)
    Tool: Bash (curl)
    Preconditions: Server running, material ID 99999 does NOT exist
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/tutor/materials/99999
      2. Assert status code is 404 (not 405 Method Not Allowed)
    Expected Result: 404 Not Found
    Evidence: .sisyphus/evidence/task-1-missing-material.txt
  ```

  **Commit**: YES (groups with T2, T3)
  - Message: `fix(tutor): resolve materials endpoint, stale localStorage, and add greeting`

- [x] 2. Fix Stale localStorage Material References

  **What to do**:
  - In the tutor frontend, localStorage stores `selected_material_ids` from previous sessions
  - When materials are deleted from DB (like doc 445), frontend still references them → 500 errors
  - Add a version key to the localStorage key (e.g., `tutor.selected_material_ids.v2`)
  - On load, validate stored material IDs against the current DB list — discard invalid ones
  - Clear selected materials when `course_id` changes in the wizard

  **Must NOT do**:
  - Don't clear ALL localStorage — only the stale material keys
  - Don't add a backend call just to validate localStorage

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5, 6)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `dashboard_rebuild/client/src/pages/tutor.tsx` — Tutor page, localStorage reads
  - `dashboard_rebuild/client/src/components/` — Search for `localStorage` + `material` patterns
  - AGENTS.md "localStorage in React useState Initializers" learning — always wrap in try/catch and validate shape

  **Acceptance Criteria**:
  - [ ] Switching courses in wizard clears previously selected materials
  - [ ] Deleted material IDs in localStorage are silently discarded on page load

  **QA Scenarios**:
  ```
  Scenario: Course switch clears materials
    Tool: Playwright (playwright skill)
    Preconditions: Server running, browser at /tutor
    Steps:
      1. Navigate to http://localhost:5000/brain (then to tutor via nav)
      2. Open tutor wizard, select course "EBP", check some materials
      3. Go back, select course "MS1"
      4. Verify previously selected EBP materials are NOT checked
      5. Open browser console: localStorage.getItem("tutor.selected_material_ids.v2") — should be empty or MS1 materials only
    Expected Result: Material selection is scoped to the active course
    Evidence: .sisyphus/evidence/task-2-course-switch.png

  Scenario: Stale material IDs discarded
    Tool: Playwright (playwright skill)
    Preconditions: Server running
    Steps:
      1. In browser console: localStorage.setItem("tutor.selected_material_ids.v2", JSON.stringify([99999, 99998]))
      2. Navigate to /tutor, open wizard
      3. Verify no materials are checked (invalid IDs silently discarded)
      4. No console errors from 500 responses
    Expected Result: Invalid material IDs produce no errors
    Evidence: .sisyphus/evidence/task-2-stale-discard.png
  ```

  **Commit**: YES (groups with T1, T3)

- [x] 3. Add Tutor Auto-Greeting Message

  **What to do**:
  - When a session is created via POST /api/tutor/session, generate a greeting based on the chain's first block
  - Look up the first block in the method chain → get its `name`, `control_stage`, and `facilitation_prompt`
  - Return a `greeting` field in the session creation response
  - Greeting format: "Let's begin with [block_name] ([stage]). [first sentence of facilitation_prompt]"
  - Frontend: if `greeting` is present in session response, display it as the first assistant message

  **Must NOT do**:
  - Don't create an actual tutor turn in the DB for the greeting — it's a UI-only message
  - Don't make the greeting an LLM call — use the block's facilitation prompt directly

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5, 6)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `brain/dashboard/api_tutor.py:3255-3305` — Session creation response (add `greeting` field here)
  - `brain/data/seed_methods.py` — `generate_facilitation_prompt()` function
  - `brain/db_setup.py` — `method_blocks` table schema (name, control_stage, facilitation_prompt)
  - `dashboard_rebuild/client/src/pages/tutor.tsx` — Chat display, check for greeting in session response

  **Acceptance Criteria**:
  - [ ] `curl -s -X POST http://localhost:5000/api/tutor/session -H "Content-Type: application/json" -d '{"course_id":1,"topic":"test","method_chain_id":133}' | python -c "import sys,json; d=json.load(sys.stdin); assert d.get('greeting') and len(d['greeting']) > 20"`

  **QA Scenarios**:
  ```
  Scenario: Greeting appears in session creation response
    Tool: Bash (curl)
    Preconditions: Server running, chain 133 exists in method_chains table
    Steps:
      1. POST /api/tutor/session with method_chain_id=133, course_id=1, topic="Test Greeting"
      2. Parse JSON response
      3. Assert "greeting" field exists and is non-empty string > 20 chars
      4. Assert greeting contains the first block's name
    Expected Result: Response includes greeting with block context
    Evidence: .sisyphus/evidence/task-3-greeting-response.json

  Scenario: No greeting when no chain selected
    Tool: Bash (curl)
    Preconditions: Server running
    Steps:
      1. POST /api/tutor/session WITHOUT method_chain_id
      2. Assert "greeting" is null or absent (no block to greet with)
    Expected Result: Graceful null/absent greeting
    Evidence: .sisyphus/evidence/task-3-no-chain-greeting.json
  ```

  **Commit**: YES (groups with T1, T2)

- [x] 4. Add CLI Health Check + Retry with Backoff to ObsidianVault

  **What to do**:
  - Add retry logic to `ObsidianVault._run()`: 3 attempts with 1s/2s/4s backoff on `TimeoutExpired` or non-zero exit
  - Add `is_running()` method that calls `is_available()` and caches result for 30s
  - Add startup health check: on Flask app startup, log warning if Obsidian CLI not available
  - When CLI is unavailable, vault operations return descriptive error (not silent empty string)

  **Must NOT do**:
  - Don't block Flask startup if Obsidian isn't running
  - Don't add retry to `_eval()` (JS eval should fail fast)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5, 6)
  - **Blocks**: Tasks 7, 8, 9 (Wave 2 depends on stable CLI layer)
  - **Blocked By**: None

  **References**:
  - `brain/obsidian_vault.py:37-75` — `_run()` method (add retry here)
  - `brain/obsidian_vault.py:76-86` — `is_available()` method (extend with caching)
  - `brain/tests/test_obsidian_vault.py` — Existing tests (add retry test cases following same mock pattern)

  **Acceptance Criteria**:
  - [ ] `_run()` retries up to 3 times on timeout with increasing delay
  - [ ] `is_available()` result cached for 30 seconds
  - [ ] Flask startup logs a warning if CLI not available (not an error/crash)

  **QA Scenarios**:
  ```
  Scenario: Retry on transient timeout
    Tool: Bash (pytest)
    Preconditions: pytest available
    Steps:
      1. Run: pytest brain/tests/test_obsidian_vault.py -k "retry" -v
      2. Assert test passes (mock subprocess.run to timeout on first call, succeed on second)
    Expected Result: Test passes — retry logic works
    Evidence: .sisyphus/evidence/task-4-retry-test.txt
  ```

  **Commit**: YES (groups with T5, T6)
  - Message: `feat(vault): add CLI health check, course-map API, and full course hierarchy`

- [x] 5. Create GET /api/tutor/course-map Endpoint

  **What to do**:
  - Add `GET /api/tutor/course-map` endpoint to the tutor blueprint
  - Use `brain/course_map.py:load_course_map()` which reads `brain/data/vault_courses.yaml` and returns a `CourseMap` dataclass
  - Serialize the `CourseMap` to JSON. Response shape: `{"vault_root": "Study Notes", "courses": [{"code": "PHYT_6220", "label": "EBP", "term": "Spring 2026", "unit_type": "week", "units": [{"id": "week_01", "name": "Week 01", "topics": [...]}]}]}`
  - Note: the existing YAML uses course codes as dict keys (e.g., `PHYT_6314:`) with fields `label`, `term`, `unit_type`, `units`. Preserve this schema in the API response.
  - This replaces the need for frontend to hardcode course structure

  **Must NOT do**:
  - Don't build a full course management CRUD — this is read-only
  - Don't change the existing `courses.ts` yet (that's Task 11)
  - Don't change the YAML schema or `course_map.py` loader

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4, 6)
  - **Blocks**: Task 11 (frontend reads from this)
  - **Blocked By**: None

  **References**:
  - `brain/course_map.py:109-142` — `load_course_map()` function (returns `CourseMap` dataclass with `vault_root` and `courses` list)
  - `brain/course_map.py:18-31` — `Unit` and `Course` dataclasses (the schema: `code`, `label`, `term`, `unit_type`, `units[{id, name, topics}]`)
  - `brain/data/vault_courses.yaml` — Existing YAML config file (currently has 5 courses but from previous semesters — will be updated by Task 6)
  - `brain/dashboard/api_tutor.py:325-354` — `_study_notes_base_path()` which already imports `course_map`
  - `dashboard_rebuild/client/src/config/courses.ts:12-18` — Current hardcoded frontend config (this is what the API replaces)

  **Acceptance Criteria**:
  - [ ] `curl -s http://localhost:5000/api/tutor/course-map | python -c "import sys,json; d=json.load(sys.stdin); assert len(d['courses'])==5; assert all(c.get('unit_type') for c in d['courses'])"`

  **QA Scenarios**:
  ```
  Scenario: Course map returns all 5 courses with unit types
    Tool: Bash (curl)
    Preconditions: Server running, brain/data/vault_courses.yaml configured (updated by Task 6)
    Steps:
      1. curl -s http://localhost:5000/api/tutor/course-map
      2. Parse JSON, assert courses array has 5 entries
      3. For each course: assert code, label, unit_type fields exist
      4. Assert codes match: PHYT_6216, PHYT_6220, PHYT_6313, PHYT_6314, PHYT_6443
    Expected Result: 200 OK with complete 5-course hierarchy
    Evidence: .sisyphus/evidence/task-5-course-map.json

  Scenario: Missing YAML returns graceful fallback
    Tool: Bash (curl)
    Preconditions: Server running
    Steps:
      1. Temporarily rename brain/data/vault_courses.yaml → vault_courses.yaml.bak
      2. curl -s http://localhost:5000/api/tutor/course-map
      3. Assert response has empty courses list (load_course_map() returns CourseMap(vault_root="Study Notes") on missing file)
      4. Restore vault_courses.yaml
    Expected Result: 200 with empty courses (graceful fallback, not 500)
    Evidence: .sisyphus/evidence/task-5-missing-yaml.txt
  ```

  **Commit**: YES (groups with T4, T6)

- [x] 6. Update vault_courses.yaml with Full 5-Course Hierarchy

  **What to do**:
  - Update the EXISTING file at `brain/data/vault_courses.yaml` with the user's current 5 Spring 2026 courses from Blackboard
  - **IMPORTANT**: Follow the existing YAML schema exactly — courses are a dict keyed by course code (e.g., `PHYT_6216:`), each with `label`, `term`, `unit_type`, and `units` array where each unit has `id`, `name`, `topics`
  - Replace the old course entries (PHYT_6419, PHYT_6502 are Fall 2025 — remove them) with:
    - `PHYT_6216:` label: "Exercise Physiology", unit_type: topic, 8 topics (Intro to Ex Phys, Training Principles, Energy Expenditure, Energy Intake, Cardiovascular, Respiratory, Neuromuscular System, Immersion 1)
    - `PHYT_6220:` label: "EBP", unit_type: week, 15 weeks (Week 01 through Week 15)
    - `PHYT_6313:` (already exists) — update/verify Neuroscience ~8-9 weeks
    - `PHYT_6314:` (already exists) — update/verify Movement Science 5 constructs with sub-topics
    - `PHYT_6443:` (already exists) — update: add Immersion 1, Motor Control modules (currently only has 3)
  - Keep `vault_root: "Study Notes"` unchanged
  - Validate startup: add YAML parse check to Flask startup, log warning if malformed

  **Must NOT do**:
  - Don't change the YAML schema format — keep course codes as dict keys
  - Don't pre-create vault folders — folder creation happens when sessions produce output
  - Don't modify `brain/course_map.py` — the loader already handles this schema

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4, 5)
  - **Blocks**: Task 10 (path generation uses this)
  - **Blocked By**: None

  **References**:
  - `brain/data/vault_courses.yaml` — EXISTING file (171 lines, currently has PHYT_6314, 6313, 6443, 6502, 6419)
  - `brain/course_map.py:109-142` — `load_course_map()` which parses this YAML (expects `courses:` as dict of code→{label, term, unit_type, units})
  - `brain/course_map.py:18-31` — `Unit(id, name, topics)` and `Course(code, label, term, unit_type, units)` dataclasses
  - User's course catalog (from conversation): PHYT 6216, 6220, 6313, 6314, 6443 with full division names

  **Acceptance Criteria**:
  - [ ] YAML file parses without error via `load_course_map()`
  - [ ] Contains exactly 5 courses with codes: PHYT_6216, PHYT_6220, PHYT_6313, PHYT_6314, PHYT_6443
  - [ ] ExPhys has 8 topics, EBP has 15 weeks, Neuro has ~8-9 weeks, MS1 has 5 constructs with sub-topics, TI has 5 divisions

  **QA Scenarios**:
  ```
  Scenario: YAML parses and contains all 5 current courses
    Tool: Bash (python -c)
    Preconditions: brain/data/vault_courses.yaml updated
    Steps:
      1. python -c "from brain.course_map import load_course_map; cm=load_course_map(); codes=[c.code for c in cm.courses]; assert len(codes)==5; assert set(codes)=={'PHYT_6216','PHYT_6220','PHYT_6313','PHYT_6314','PHYT_6443'}; print('OK:', codes)"
      2. Assert no parse errors
      3. Assert each course has non-empty units list
    Expected Result: YAML valid with 5 Spring 2026 courses
    Evidence: .sisyphus/evidence/task-6-yaml-parse.txt

  Scenario: Old Fall 2025 courses removed
    Tool: Bash (python -c)
    Steps:
      1. python -c "from brain.course_map import load_course_map; cm=load_course_map(); codes=[c.code for c in cm.courses]; assert 'PHYT_6419' not in codes; assert 'PHYT_6502' not in codes; print('Old courses removed')"
    Expected Result: PHYT_6419 and PHYT_6502 are not present
    Evidence: .sisyphus/evidence/task-6-old-removed.txt
  ```

  **Commit**: YES (groups with T4, T5)

### Wave 2 — CLI Migration + Vault Structure (6 tasks)

- [x] 7. Migrate North Star → Map of Contents + REST → CLI

  **What to do**:
  - This is the biggest single task. It combines the rename AND the migration because they touch the same code.
  - In `api_tutor.py`: rename `_ensure_north_star_context()` → `_ensure_moc_context()`, `_canonical_north_star_path()` → `_canonical_moc_path()`
  - Replace all REST API calls at lines ~887, 948, 965, 997 (`obsidian_get_file`, `obsidian_save_file`) with `ObsidianVault` CLI calls
  - Use `vault.read_note()` instead of `obsidian_get_file()`, `vault.create_note()` / `vault.append_note()` instead of `obsidian_save_file()`
  - Rename template: `sop/templates/notes/north_star.md.tmpl` → `sop/templates/notes/map_of_contents.md.tmpl`
  - In `tutor_templates.py`: rename `_render_north_star_markdown` → `_render_moc_markdown`, update `render_template_artifact()` dispatch
  - Update `note_type` frontmatter from `north_star` to `map_of_contents`
  - In `tutor_tools.py`: update `save_learning_objectives` tool schema description (replace "North Star" with "Map of Contents")
  - Fire-and-forget semantics: wrap vault writes in try/except, log failures, don't block session creation

  **Must NOT do**:
  - Don't rename/move existing North Star files in the user's vault
  - Don't remove the REST API functions from api_adapter.py yet (Task 12 handles deprecation)
  - Don't change the MOC content structure — just rename and migrate the transport layer

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Touches 5+ files, requires careful refactoring across template/renderer/endpoint/tool layers
  - **Skills**: [`code-refactoring`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T8, T9, T10, T11)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 12, 16
  - **Blocked By**: Task 4 (CLI health check must be stable)

  **References**:
  - `brain/dashboard/api_tutor.py:887` — `from dashboard.api_adapter import obsidian_get_file, obsidian_save_file` (local import to remove)
  - `brain/dashboard/api_tutor.py:948,965,997` — REST API calls for North Star read/write
  - `brain/dashboard/api_tutor.py:357-360` — `_canonical_north_star_path()` (rename)
  - `brain/tutor_templates.py` — `_render_north_star_markdown` function + dispatch
  - `sop/templates/notes/north_star.md.tmpl` — Template file to rename
  - `brain/tutor_tools.py` — `save_learning_objectives` tool description
  - `brain/obsidian_vault.py` — `read_note()`, `create_note()`, `append_note()` — the CLI replacements

  **Acceptance Criteria**:
  - [ ] `grep -rn "north.star\|north_star\|NorthStar" brain/ sop/templates/ --include="*.py" --include="*.tmpl"` returns 0 matches
  - [ ] `grep -rn "from dashboard.api_adapter import.*obsidian" brain/dashboard/api_tutor.py` returns 0 matches
  - [ ] Session creation with learning_objectives writes `_Map of Contents.md` via CLI (not REST)

  **QA Scenarios**:
  ```
  Scenario: MOC created via CLI on session start
    Tool: Bash (curl)
    Preconditions: Server running, Obsidian running with CLI enabled
    Steps:
      1. POST /api/tutor/session with course_id=1, topic="Test MOC", learning_objectives=["LO-001: Test objective"]
      2. Assert response contains "north_star" or "moc" status field (renamed in response too)
      3. Run: obsidian vault="Treys School" search query="_Map of Contents" format=json
      4. Assert at least one result found
    Expected Result: MOC file written via CLI
    Evidence: .sisyphus/evidence/task-7-moc-creation.json

  Scenario: MOC creation fails gracefully when Obsidian not running
    Tool: Bash (curl)
    Preconditions: Server running, Obsidian Desktop CLOSED
    Steps:
      1. POST /api/tutor/session with course_id=1, topic="Test Graceful", learning_objectives=["LO-001: Test"]
      2. Assert response status is 200 (session created successfully)
      3. Assert vault write logged as failed but session is usable
    Expected Result: Session created even when vault write fails
    Evidence: .sisyphus/evidence/task-7-graceful-fail.json
  ```

  **Commit**: YES (groups with T8-T12)
  - Message: `refactor(vault): migrate all Obsidian writes to CLI, rename North Star to Map of Contents`

- [x] 8. Migrate Remaining REST API Callers to CLI

  **What to do**:
  - Use `ast_grep_search` or `grep` to find ALL remaining imports of `obsidian_get_file`, `obsidian_save_file`, `obsidian_create_folder`, `obsidian_delete_file` from `api_adapter.py`
  - For each caller: replace with equivalent `ObsidianVault` method call
  - Known callers: `tutor_tools.py` (lines 314, 361, 508 import api_adapter), any other files importing Obsidian REST functions
  - Pattern: `obsidian_get_file(path)` → `vault.read_note(file=path)`, `obsidian_save_file(path, content)` → `vault.create_note(name=..., content=...)` or `vault.replace_content(file=path, new_content=content)`

  **Must NOT do**:
  - Don't delete the REST functions from api_adapter.py (Task 12 deprecates them)
  - Don't touch the non-Obsidian REST functions in api_adapter.py (sessions, stats, etc.)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`code-refactoring`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T7, T9, T10, T11)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 12
  - **Blocked By**: Task 4

  **References**:
  - `brain/tutor_tools.py:314,361,508` — Imports from api_adapter
  - `brain/dashboard/api_adapter.py` — Functions to find callers of: `obsidian_get_file`, `obsidian_save_file`, `obsidian_create_folder`, `obsidian_delete_file`
  - Use `lsp_find_references` on each function to map all callers

  **Acceptance Criteria**:
  - [ ] `grep -rn "from dashboard.api_adapter import.*obsidian" brain/ --include="*.py" | grep -v "api_adapter.py"` returns 0 matches

  **QA Scenarios**:
  ```
  Scenario: Zero REST API imports remain
    Tool: Bash (grep)
    Steps:
      1. grep -rn "from dashboard.api_adapter import.*obsidian" brain/ --include="*.py" | grep -v "api_adapter.py"
      2. Assert 0 matches
    Expected Result: All callers migrated to CLI
    Evidence: .sisyphus/evidence/task-8-no-rest-imports.txt
  ```

  **Commit**: YES (groups with T7)

- [x] 9. Add Missing CLI Wrappers to obsidian_vault.py

  **What to do**:
  - Add methods for CLI commands not yet wrapped, prioritized by usefulness:
    - `daily_read()` → `obsidian daily:read format=json`
    - `daily_append(content)` → `obsidian daily:append content="..."`
    - `insert_template(file, template)` → `obsidian template:insert file="..." template="..."`
    - `get_outline(file)` → `obsidian outline file="..." format=json`
    - `read_property(file, name)` → `obsidian property:read name="..." file="..."`
  - Follow the existing `_run()` pattern for all new methods
  - Add corresponding test cases in `test_obsidian_vault.py` following existing mock pattern

  **Must NOT do**:
  - Don't add ALL 101 CLI commands — only the ones needed for this plan
  - Don't add Bases or Sync wrappers (future work)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T7, T8, T10, T11)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Task 4

  **References**:
  - `brain/obsidian_vault.py` — Existing 25 methods, `_run()` pattern
  - `brain/tests/test_obsidian_vault.py` — Existing test pattern (mock subprocess.run)
  - Obsidian CLI docs: daily:read, daily:append, template:insert, outline, property:read

  **Acceptance Criteria**:
  - [ ] `pytest brain/tests/test_obsidian_vault.py -v` passes with new test cases

  **QA Scenarios**:
  ```
  Scenario: New CLI methods pass tests
    Tool: Bash (pytest)
    Steps:
      1. pytest brain/tests/test_obsidian_vault.py -v -k "daily or template or outline or property_read"
      2. Assert all new tests pass
    Expected Result: All new methods have passing tests
    Evidence: .sisyphus/evidence/task-9-cli-methods-test.txt
  ```

  **Commit**: YES (groups with T7)

- [x] 10. Update Path Generation for All Unit Types

  **What to do**:
  - Verify `_study_notes_base_path()` handles all 5 unit_type values from vault_courses.yaml: `topic`, `week`, `construct`, `module`, `mixed`
  - For MS1 (construct type with sub-topics): ensure path resolves to `Study Notes/Movement Science 1/Construct 1 - Movement Foundations/{sub-topic}/`
  - Update `_canonical_moc_path()` (renamed from north_star) to produce `{base_path}/_Map of Contents.md`
  - Ensure deduplication logic works: if subtopic == unit name, don't nest

  **Must NOT do**:
  - Don't change the path structure for existing sessions — new sessions get new paths

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T7, T8, T9, T11)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Task 6 (vault_courses.yaml must exist)

  **References**:
  - `brain/dashboard/api_tutor.py:325-354` — `_study_notes_base_path()` function
  - `brain/data/vault_courses.yaml` — Course hierarchy with unit types (from Task 6)

  **Acceptance Criteria**:
  - [ ] Path for EBP Week 3 topic "Clinical Questions" → `Study Notes/Evidence Based Practice/Week 03/Clinical Questions`
  - [ ] Path for MS1 Construct 1 sub-topic "Connective Tissue" → `Study Notes/Movement Science 1/Construct 1 - Movement Foundations/Connective Tissue`
  - [ ] MOC path → `{base_path}/_Map of Contents.md`

  **QA Scenarios**:
  ```
  Scenario: Path generation for each course type
    Tool: Bash (python -c)
    Steps:
      1. Import _study_notes_base_path, call with each course + unit combination
      2. Assert paths match expected vault structure
    Expected Result: Correct paths for all 5 unit types
    Evidence: .sisyphus/evidence/task-10-path-gen.txt
  ```

  **Commit**: YES (groups with T7)

- [x] 11. Update Frontend to Read from Course-Map API

  **What to do**:
  - In `dashboard_rebuild/client/src/config/courses.ts`: replace hardcoded `COURSE_FOLDERS` with a fetch from `GET /api/tutor/course-map`
  - Or: keep `courses.ts` as a static fallback, but add a `useCourseMap()` hook that fetches from the API and overrides the static config
  - The wizard's course dropdown should use the API data (includes unit_type and unit names)

  **Must NOT do**:
  - Don't build a tree picker for units — flat course dropdown is sufficient
  - Don't break existing course selection if API is unavailable (use static fallback)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T7, T8, T9, T10)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Task 5 (API endpoint must exist)

  **References**:
  - `dashboard_rebuild/client/src/config/courses.ts:12-18` — Current static config
  - `dashboard_rebuild/client/src/api.ts` — API client (add course-map fetch here)
  - Task 5 response shape: `{"courses": [{"id": "ebp", "name": "EBP", "code": "PHYT 6220", "path": "...", "unit_type": "week", "units": [...]}]}`

  **Acceptance Criteria**:
  - [ ] Frontend course dropdown shows 5 courses from API (not hardcoded)
  - [ ] If API fails, falls back to static COURSE_FOLDERS

  **QA Scenarios**:
  ```
  Scenario: Course dropdown populated from API
    Tool: Playwright (playwright skill)
    Preconditions: Server running
    Steps:
      1. Navigate to tutor page
      2. Open wizard, click course dropdown
      3. Assert 5 courses visible: EBP, ExPhys, MS1, Neuro, TI
      4. Check Network tab: GET /api/tutor/course-map was called
    Expected Result: Courses loaded from API
    Evidence: .sisyphus/evidence/task-11-course-dropdown.png
  ```

  **Commit**: YES (groups with T7)

- [x] 12. Validate + Deprecate REST API Obsidian Functions

  **What to do**:
  - After Tasks 7 and 8, verify zero callers remain for Obsidian REST functions
  - Add deprecation warnings to `api_adapter.py` Obsidian functions: `obsidian_get_file`, `obsidian_save_file`, `obsidian_create_folder`, `obsidian_delete_file`
  - Add `warnings.warn("Use ObsidianVault.read_note() instead", DeprecationWarning)` at top of each
  - Do NOT delete the functions — just mark deprecated
  - Add startup validation: load vault_courses.yaml, assert it parses, log course count

  **Must NOT do**:
  - Don't delete the deprecated functions
  - Don't remove the REST API endpoints from Flask routes (other tools may use them)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (must run after T7 and T8)
  - **Parallel Group**: Sequential after T7, T8
  - **Blocks**: None
  - **Blocked By**: Tasks 7, 8

  **References**:
  - `brain/dashboard/api_adapter.py` — Obsidian REST functions to deprecate

  **Acceptance Criteria**:
  - [ ] Each Obsidian REST function has a deprecation warning
  - [ ] `pytest brain/tests/` still passes (deprecation warnings don't break tests)

  **QA Scenarios**:
  ```
  Scenario: Deprecation warnings present
    Tool: Bash (python -c)
    Steps:
      1. python -c "import warnings; warnings.simplefilter('error'); from brain.dashboard.api_adapter import obsidian_get_file" 2>&1
      2. Assert DeprecationWarning is raised
    Expected Result: Warning fires on import
    Evidence: .sisyphus/evidence/task-12-deprecation.txt
  ```

  **Commit**: YES (groups with T7)

### Wave 3 — Templates + Features (6 tasks)

- [x] 13. Create New Vault Note Templates for Artifact Types

  **What to do**:
  - Create 5 new `.md.tmpl` files in `sop/templates/notes/`:
    - `block_notes.md.tmpl` — Generic block note (covers 30+ blocks with `notes` artifact type)
    - `block_diagram.md.tmpl` — Mermaid diagram blocks (concept-map, flowchart, decision-tree)
    - `block_comparison.md.tmpl` — Comparison/side-by-side table blocks
    - `block_recall.md.tmpl` — Retrieval/recall blocks (blurt, quiz, fill-in-blank)
    - `block_cards.md.tmpl` — Anki card drafts (KWIK Hook, Seed-Lock, Anki Card Draft)
  - Each template MUST have:
    - YAML frontmatter: `note_type`, `block_id`, `block_name`, `control_stage`, `session_id`, `course`, `module`, `topic`, `started_at`, `ended_at`, `artifact_type`
    - Block header with stage badge, duration, energy
    - Artifact-specific body section
    - Footer with wikilinks to session MOC and related concepts
  - Use `{variable}` syntax (str.format_map), NOT Jinja2

  **Must NOT do**:
  - Don't create 46 individual block templates — group by artifact type
  - Don't use Jinja2 or Templater syntax — stick with `str.format_map()` + `_SafeFormatDict`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Creating 5 templates with proper frontmatter schema requires careful design
  - **Skills**: [`obsidian-markdown`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T17)
  - **Parallel Group**: Wave 3 start
  - **Blocks**: Task 14
  - **Blocked By**: None

  **References**:
  - `sop/templates/notes/session_note.md.tmpl` — Existing template (follow format pattern)
  - `sop/templates/notes/concept_note.md.tmpl` — Existing template (follow frontmatter pattern)
  - `brain/tutor_templates.py:_SafeFormatDict` — Template variable handling
  - `brain/data/seed_methods.py` — 46 blocks with `artifact_type` field for grouping

  **Acceptance Criteria**:
  - [ ] 5 new `.md.tmpl` files exist in `sop/templates/notes/`
  - [ ] Each file has valid YAML frontmatter section
  - [ ] Each uses `{variable}` syntax only

  **QA Scenarios**:
  ```
  Scenario: Templates parse and render without error
    Tool: Bash (python -c)
    Steps:
      1. For each new .tmpl file: read content, call str.format_map with _SafeFormatDict containing sample data
      2. Assert rendered output is valid markdown
      3. Assert YAML frontmatter can be parsed (check for --- delimiters)
    Expected Result: All 5 templates render successfully
    Evidence: .sisyphus/evidence/task-13-template-render.txt
  ```

  **Commit**: YES (groups with T14-T18)
  - Message: `feat(tutor): add per-block vault auto-write, LO extraction, and artifact templates`

- [x] 14. Add Template Renderers to tutor_templates.py

  **What to do**:
  - Add renderer functions in `tutor_templates.py` for each new template:
    - `_render_block_notes_markdown(payload)` — For generic block notes
    - `_render_block_diagram_markdown(payload)` — For diagram artifacts (mermaid code block)
    - `_render_block_comparison_markdown(payload)` — For comparison tables (markdown table)
    - `_render_block_recall_markdown(payload)` — For retrieval output
    - `_render_block_cards_markdown(payload)` — For Anki card drafts
  - Add a dispatcher function: `render_block_artifact(block, session_context, artifact_content)` that:
    1. Maps `block.artifact_type` → template file
    2. Builds payload from block metadata + session context + artifact content
    3. Calls `_read_template()` → `str.format_map(_SafeFormatDict(payload))`
    4. Returns rendered markdown
  - Update `render_template_artifact()` dispatch to include new template IDs

  **Must NOT do**:
  - Don't remove existing renderers (session_note, concept_note, map_of_contents, etc.)
  - Don't switch to Jinja2

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs Task 13 templates to exist)
  - **Parallel Group**: Sequential after T13
  - **Blocks**: Tasks 15, 16, 18
  - **Blocked By**: Task 13

  **References**:
  - `brain/tutor_templates.py` — All existing renderers (`_render_session_note_markdown`, etc.), `_SafeFormatDict`, `_read_template()`, `_wikilink()`, `_bullets()`
  - Task 13 template files — The .tmpl files to load

  **Acceptance Criteria**:
  - [ ] `render_block_artifact()` function exists and dispatches by artifact_type
  - [ ] All 5 new renderers produce valid markdown with frontmatter

  **QA Scenarios**:
  ```
  Scenario: Block artifact renders for each type
    Tool: Bash (python -c)
    Steps:
      1. Import render_block_artifact from tutor_templates
      2. Call with mock block data for each artifact_type: notes, concept-map, comparison-table, notes (recall), cards
      3. Assert each returns non-empty string with YAML frontmatter
    Expected Result: All artifact types render successfully
    Evidence: .sisyphus/evidence/task-14-renderers.txt
  ```

  **Commit**: YES (groups with T13)

- [x] 15. Update vault_artifact_router for New Operations

  **What to do**:
  - Add new operation type `write-block-note` to `vault_artifact_router.py`
  - This operation: takes block metadata + rendered content → calls `vault.create_note()` with appropriate path and content
  - Path resolution: `_study_notes_base_path(course, module, topic)/Blocks/{block_name}.md`
  - If note already exists (repeated block), append with section header

  **Must NOT do**:
  - Don't change existing artifact operations (create, append, prepend, etc.)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs Task 14)
  - **Blocks**: Task 18
  - **Blocked By**: Task 14

  **References**:
  - `brain/vault_artifact_router.py` — Existing `execute_vault_artifact()` dispatcher
  - `brain/obsidian_vault.py` — `create_note()`, `append_note()`

  **Acceptance Criteria**:
  - [ ] `write-block-note` operation creates a note at the correct vault path

  **QA Scenarios**:
  ```
  Scenario: Block note written to correct path
    Tool: Bash (python -c)
    Steps:
      1. Call execute_vault_artifact with op="write-block-note", block_name="Brain Dump", course="EBP", module="Week 03"
      2. Assert vault.create_note called with path containing "Evidence Based Practice/Week 03/Blocks/Brain Dump.md"
    Expected Result: Note created at correct path
    Evidence: .sisyphus/evidence/task-15-block-note-path.txt
  ```

  **Commit**: YES (groups with T13)

- [x] 16. Wire LO Extraction into PRIME Block Flow

  **What to do**:
  - During the first PRIME block, the tutor should extract learning objectives from loaded materials
  - The `save_learning_objectives` tool already exists in `tutor_tools.py` — wire it into the PRIME block's system prompt
  - In `api_tutor.py`, when processing the first turn of a PRIME block:
    - Include instruction in system prompt: "Extract learning objectives from the materials and save them using the save_learning_objectives tool"
    - The tool handler (`execute_save_learning_objectives`) already inserts into `learning_objectives` table and rebuilds MOC
  - After LOs are saved, update the MOC file with the extracted objectives

  **Must NOT do**:
  - Don't parse PDFs/slides for LOs — extraction happens via LLM reading the RAG context
  - Don't require user confirmation of LOs — auto-extract, user can edit later

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires understanding the prompt builder chain, tool invocation flow, and DB interactions
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T15, T17)
  - **Parallel Group**: Wave 3 (after T7 and T14)
  - **Blocks**: None
  - **Blocked By**: Tasks 7 (MOC must exist), 14 (template renderers must exist)

  **References**:
  - `brain/tutor_tools.py:184-210` — `save_learning_objectives` tool schema definition
  - `brain/tutor_tools.py:458-490` — `execute_save_learning_objectives()` handler (calls `save_learning_objectives_from_tool()`)
  - `brain/dashboard/api_tutor.py:1222-1347` — `save_learning_objectives_from_tool()` implementation (inserts LOs, rebuilds MOC)
  - `brain/dashboard/api_tutor.py:3799-3820` — Existing system prompt hints for `save_learning_objectives` tool invocation
  - `brain/dashboard/api_tutor.py:4310-4343` — Auto-invoke `save_learning_objectives` logic (already exists — may just need PRIME-specific triggering)
  - `brain/tutor_prompt_builder.py` — System prompt assembly (where to inject LO extraction instruction for PRIME block)
  - `brain/db_setup.py:508-525` — `learning_objectives` table schema

  **Acceptance Criteria**:
  - [ ] After a PRIME block turn, `sqlite3 brain/data/pt_study.db "SELECT COUNT(*) FROM learning_objectives WHERE course_id=1"` returns > 0
  - [ ] MOC file updated with extracted LOs

  **QA Scenarios**:
  ```
  Scenario: PRIME block extracts LOs
    Tool: Bash (curl)
    Preconditions: Server running, session created with materials loaded
    Steps:
      1. Create session with course_id=1, method_chain_id=133
      2. Send first chat message: "Let's begin"
      3. Check tutor response for save_learning_objectives tool invocation
      4. Query: sqlite3 brain/data/pt_study.db "SELECT * FROM learning_objectives WHERE course_id=1"
      5. Assert at least 1 row exists
    Expected Result: LOs extracted and saved to DB
    Evidence: .sisyphus/evidence/task-16-lo-extraction.json

  Scenario: LO extraction graceful when no objectives found
    Tool: Bash (curl)
    Preconditions: Session with materials that have no clear LOs
    Steps:
      1. Create session, send first message
      2. Assert session continues normally even if no LOs extracted
    Expected Result: No crash, session continues
    Evidence: .sisyphus/evidence/task-16-lo-graceful.json
  ```

  **Commit**: YES (groups with T13)

- [x] 17. Add vault_write_status to advance_block Response

  **What to do**:
  - In `advance_block()` endpoint response (api_tutor.py:4718), add a `vault_write_status` field
  - Values: `"success"`, `"skipped"` (no artifact_type), `"failed"` (CLI error), `"unavailable"` (Obsidian not running)
  - This field is consumed by Task 18 (auto-write) and Task 23 (frontend display)

  **Must NOT do**:
  - Don't implement the actual vault write here — that's Task 18
  - Just add the response field infrastructure

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T13, T16)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 18, 23
  - **Blocked By**: None

  **References**:
  - `brain/dashboard/api_tutor.py:4660-4718` — `advance_block()` endpoint

  **Acceptance Criteria**:
  - [ ] `advance_block()` response includes `vault_write_status` field

  **QA Scenarios**:
  ```
  Scenario: Status field present in response
    Tool: Bash (curl)
    Steps:
      1. POST /api/tutor/session/{id}/advance-block
      2. Parse JSON response
      3. Assert "vault_write_status" key exists
    Expected Result: Field present (value will be "skipped" until T18 implements writes)
    Evidence: .sisyphus/evidence/task-17-status-field.json
  ```

  **Commit**: YES (groups with T13)

- [x] 18. Add Per-Block Auto-Write Hook to advance_block

  **What to do**:
  - In `advance_block()` at api_tutor.py:4716 (after `conn.commit()`, before `_get_chain_status()`):
    1. Look up the COMPLETING block's `artifact_type` from method_blocks table
    2. If `artifact_type` is null → set `vault_write_status = "skipped"`, continue
    3. If `artifact_type` exists → gather block output from the last N tutor turns for this block
    4. Call `render_block_artifact()` (from Task 14) to render the note
    5. Call vault router `write-block-note` operation (from Task 15) to save
    6. Set `vault_write_status` based on result
  - **FIRE-AND-FORGET**: Wrap entire vault write in try/except. On failure: log warning, set status="failed", continue. NEVER block block advancement.
  - Update the MOC file with a wikilink to the new block note

  **Must NOT do**:
  - Don't block chain progression on vault write failure
  - Don't write notes for blocks with null artifact_type
  - Don't make an LLM call to generate the note — use the existing conversation turns as content

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Touches the advance_block hot path, requires careful error handling and fire-and-forget semantics
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T14, T15, T17)
  - **Parallel Group**: Sequential — last task in Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 14, 15, 17

  **References**:
  - `brain/dashboard/api_tutor.py:4660-4718` — `advance_block()` endpoint (hook point)
  - `brain/tutor_templates.py` — `render_block_artifact()` (from Task 14)
  - `brain/vault_artifact_router.py` — `write-block-note` operation (from Task 15)
  - `brain/obsidian_vault.py` — CLI methods for vault writes

  **Acceptance Criteria**:
  - [ ] Advancing a block with artifact_type writes a note to vault
  - [ ] Advancing a block with null artifact_type sets status="skipped"
  - [ ] If Obsidian is down, block still advances and status="failed"

  **QA Scenarios**:
  ```
  Scenario: Block advancement writes vault note
    Tool: Bash (curl + obsidian CLI)
    Preconditions: Server running, Obsidian running, session with chain active
    Steps:
      1. Create session, send a few chat messages
      2. POST /api/tutor/session/{id}/advance-block
      3. Parse response: assert vault_write_status == "success"
      4. Run: obsidian vault="Treys School" search query="Brain Dump" format=json
      5. Assert block note found in vault
    Expected Result: Block note written, status=success
    Evidence: .sisyphus/evidence/task-18-auto-write.json

  Scenario: Null artifact_type skips write
    Tool: Bash (curl)
    Preconditions: Block with null artifact_type
    Steps:
      1. Advance to a block with no artifact_type
      2. Assert vault_write_status == "skipped"
      3. Assert no new vault files created
    Expected Result: Write skipped cleanly
    Evidence: .sisyphus/evidence/task-18-skip-null.json

  Scenario: Obsidian down — block still advances
    Tool: Bash (curl)
    Preconditions: Server running, Obsidian Desktop CLOSED
    Steps:
      1. POST /api/tutor/session/{id}/advance-block
      2. Assert HTTP 200 (block advanced successfully)
      3. Assert vault_write_status == "failed" or "unavailable"
      4. Assert current_block_index incremented
    Expected Result: Chain progresses despite vault failure
    Evidence: .sisyphus/evidence/task-18-graceful-fail.json
  ```

  **Commit**: YES (groups with T13)

### Wave 4 — Tests + Frontend (5 tasks)

- [x] 19. pytest Tests for CLI Methods + Retry Logic

  **What to do**:
  - Add tests in `brain/tests/test_obsidian_vault.py` for:
    - Retry logic: mock subprocess.run to fail first call, succeed second → assert method returns success
    - Retry exhaustion: mock all 3 attempts to fail → assert graceful empty return
    - `is_available()` caching: call twice within 30s → assert subprocess called once
    - New CLI methods from Task 9: daily_read, daily_append, insert_template, get_outline, read_property

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T20, T21, T22)
  - **Parallel Group**: Wave 4
  - **Blocked By**: Wave 3

  **References**:
  - `brain/tests/test_obsidian_vault.py` — Existing test patterns (mock subprocess.run)
  - `brain/obsidian_vault.py` — Methods to test

  **Acceptance Criteria**:
  - [ ] `pytest brain/tests/test_obsidian_vault.py -v` all pass

  **QA Scenarios**:
  ```
  Scenario: All CLI tests pass
    Tool: Bash (pytest)
    Steps:
      1. pytest brain/tests/test_obsidian_vault.py -v
      2. Assert 0 failures
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/task-19-cli-tests.txt
  ```

  **Commit**: YES (groups with T20-T23)
  - Message: `test(vault): add tests for CLI, templates, path gen, LO pipeline + frontend build`

- [x] 20. pytest Tests for Template Renderers

  **What to do**:
  - Create `brain/tests/test_tutor_templates.py` (or add to existing) with tests for:
    - Each new renderer produces valid markdown with YAML frontmatter
    - `_SafeFormatDict` handles missing keys gracefully
    - `render_block_artifact()` dispatches correctly by artifact_type
    - MOC renderer produces correct structure (replaces old north_star test if any)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T19, T21, T22)
  - **Parallel Group**: Wave 4
  - **Blocked By**: Wave 3

  **References**:
  - `brain/tutor_templates.py` — Renderers to test
  - `sop/templates/notes/*.md.tmpl` — Template files

  **Acceptance Criteria**:
  - [ ] `pytest brain/tests/test_tutor_templates.py -v` all pass

  **QA Scenarios**:
  ```
  Scenario: Template tests pass
    Tool: Bash (pytest)
    Steps:
      1. pytest brain/tests/test_tutor_templates.py -v
      2. Assert 0 failures
    Expected Result: All template tests pass
    Evidence: .sisyphus/evidence/task-20-template-tests.txt
  ```

  **Commit**: YES (groups with T19)

- [x] 21. pytest Tests for Path Generation + Course Map

  **What to do**:
  - Test `_study_notes_base_path()` with each of the 5 courses and their unit types
  - Test `_canonical_moc_path()` produces correct `_Map of Contents.md` suffix
  - Test `GET /api/tutor/course-map` endpoint returns all 5 courses with unit_type
  - Test deduplication: subtopic == module → no nested folder

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T19, T20, T22)
  - **Parallel Group**: Wave 4
  - **Blocked By**: Wave 3

  **References**:
  - `brain/dashboard/api_tutor.py:325-354` — Path generation functions
  - `brain/data/vault_courses.yaml` — Course config

  **Acceptance Criteria**:
  - [ ] Tests cover all 5 unit types and deduplication edge case

  **QA Scenarios**:
  ```
  Scenario: Path generation tests pass
    Tool: Bash (pytest)
    Steps:
      1. pytest brain/tests/ -k "path_gen or course_map" -v
      2. Assert 0 failures
    Expected Result: All path tests pass
    Evidence: .sisyphus/evidence/task-21-path-tests.txt
  ```

  **Commit**: YES (groups with T19)

- [x] 22. pytest Tests for LO Extraction Pipeline

  **What to do**:
  - Test `execute_save_learning_objectives()` inserts rows into `learning_objectives` table
  - Test LO deduplication (same lo_code + course_id → update, not duplicate)
  - Test MOC file is updated after LO save
  - Test `lo_sessions` junction table populated

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T19, T20, T21)
  - **Parallel Group**: Wave 4
  - **Blocked By**: Wave 3

  **References**:
  - `brain/tutor_tools.py:458-490` — `execute_save_learning_objectives()` handler (the function to test)
  - `brain/dashboard/api_tutor.py:1222-1347` — `save_learning_objectives_from_tool()` (called by the handler — mock or test this for integration)
  - `brain/db_setup.py:508-525` — `learning_objectives` table schema
  - `brain/db_setup.py:537` — `lo_sessions` junction table schema

  **Acceptance Criteria**:
  - [ ] Tests verify LO insert, dedup, MOC update, and lo_sessions population

  **QA Scenarios**:
  ```
  Scenario: LO pipeline tests pass
    Tool: Bash (pytest)
    Steps:
      1. pytest brain/tests/ -k "learning_objective" -v
      2. Assert 0 failures
    Expected Result: All LO tests pass
    Evidence: .sisyphus/evidence/task-22-lo-tests.txt
  ```

  **Commit**: YES (groups with T19)

- [x] 23. Frontend Build + Vault Write Status Display

  **What to do**:
  - In the tutor chat UI: when `advance_block` response includes `vault_write_status`:
    - `"success"`: show small green "Note saved" toast or inline message
    - `"skipped"`: no message (silent)
    - `"failed"` / `"unavailable"`: show yellow "Vault note failed — Obsidian may not be running" warning
  - Run `npm run build` in `dashboard_rebuild/` to verify clean build
  - Follow existing toast/notification patterns in the codebase

  **Must NOT do**:
  - Don't add a full vault browser in the chat — just a status indicator
  - Don't block the chat flow for vault status

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Frontend UI with status display, toast notifications
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T19-T22)
  - **Parallel Group**: Wave 4
  - **Blocked By**: Task 17 (vault_write_status field must exist)

  **References**:
  - `dashboard_rebuild/client/src/pages/tutor.tsx` — Chat display
  - AGENTS.md "Persist Actions Need Visual Feedback" learning — toast + status indicator
  - `dashboard_rebuild/client/src/lib/colors.ts` — Control Plane stage colors

  **Acceptance Criteria**:
  - [ ] `cd dashboard_rebuild && npm run build` exits 0
  - [ ] Vault write success shows green indicator in chat

  **QA Scenarios**:
  ```
  Scenario: Vault status displayed in chat
    Tool: Playwright (playwright skill)
    Preconditions: Server running, session active, Obsidian running
    Steps:
      1. Navigate to active tutor session
      2. Send messages, advance block
      3. Look for vault write status indicator in chat UI
      4. Assert green "Note saved" appears for successful write
    Expected Result: Visual feedback for vault writes
    Evidence: .sisyphus/evidence/task-23-vault-status.png

  Scenario: Frontend builds cleanly
    Tool: Bash
    Preconditions: Node.js installed
    Steps:
      1. cd dashboard_rebuild && npm run build
      2. Assert exit code 0
      3. Assert brain/static/dist/index.html exists
    Expected Result: Clean build with no errors
    Evidence: .sisyphus/evidence/task-23-build.txt
  ```

  **Commit**: YES (groups with T19-T22)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` (frontend) + `pytest brain/tests/` (backend). Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names. Verify all new functions have type hints (Python) or TypeScript types.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real QA — Full Tutor Session** — `unspecified-high` (+ `playwright` skill for UI)
  Start from clean state (fresh browser, server restart). Run the complete tutor flow: wizard → session creation → verify greeting → chat → advance blocks → verify vault notes → verify MOC → verify LOs in DB → session wrap. Test with at least 2 different courses (EBP with Weeks, MS1 with Constructs). Capture screenshots and evidence.
  Output: `Scenarios [N/N pass] | Vault Notes [N found] | LOs [N extracted] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT Have" compliance. Detect cross-task contamination. Flag unaccounted changes. Verify REST API imports are zero outside api_adapter.py.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | REST Imports [N remaining] | VERDICT`

---

## Commit Strategy

| After | Message | Files | Pre-commit |
|-------|---------|-------|------------|
| T1-T3 | `fix(tutor): resolve materials endpoint, stale localStorage, and add greeting` | brain/dashboard/api_tutor.py, dashboard_rebuild/client/src/ | `pytest brain/tests/` |
| T4-T6 | `feat(vault): add CLI health check, course-map API, and full course hierarchy` | brain/obsidian_vault.py, brain/dashboard/api_tutor.py, brain/data/vault_courses.yaml | `pytest brain/tests/` |
| T7-T12 | `refactor(vault): migrate all Obsidian writes to CLI, rename North Star to Map of Contents` | brain/dashboard/api_tutor.py, brain/obsidian_vault.py, brain/tutor_templates.py, sop/templates/ | `pytest brain/tests/` |
| T13-T18 | `feat(tutor): add per-block vault auto-write, LO extraction, and artifact templates` | brain/tutor_templates.py, brain/vault_artifact_router.py, brain/dashboard/api_tutor.py, sop/templates/ | `pytest brain/tests/` |
| T19-T23 | `test(vault): add tests for CLI, templates, path gen, LO pipeline + frontend build` | brain/tests/, dashboard_rebuild/ | `pytest brain/tests/ && cd dashboard_rebuild && npm run build` |

---

## Success Criteria

### Verification Commands
```bash
# CLI migration complete (zero REST imports for Obsidian ops)
grep -rn "from dashboard.api_adapter import.*obsidian" brain/ --include="*.py" | grep -v "api_adapter.py"
# Expected: 0 matches

# North Star fully renamed
grep -rn "north.star\|north_star\|NorthStar" brain/ dashboard_rebuild/ sop/templates/ --include="*.py" --include="*.ts" --include="*.tsx" --include="*.tmpl"
# Expected: 0 matches

# All tests pass
pytest brain/tests/
# Expected: all pass

# Course map API works
curl -s http://localhost:5000/api/tutor/course-map | python -c "import sys,json; d=json.load(sys.stdin); assert len(d['courses'])==5"
# Expected: no assertion error

# Frontend builds
cd dashboard_rebuild && npm run build
# Expected: exit 0

# LO table has data after PRIME block
sqlite3 brain/data/pt_study.db "SELECT COUNT(*) FROM learning_objectives"
# Expected: > 0 (after running a session)
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Frontend builds without errors
- [ ] 5 courses in vault_courses.yaml with correct division types
- [ ] Map of Contents template renders correctly
- [ ] Per-block auto-write produces vault notes
- [ ] LO extraction populates learning_objectives table
- [ ] Tutor greeting appears on session open

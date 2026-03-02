# vault-redesign: Learnings

## [2026-03-02] Session Start

### Vault YAML
- **Path**: `brain/data/vault_courses.yaml` (NOT `brain/vault_courses.yaml`)
- **Loader**: `brain/course_map.py:load_course_map()` → returns `CourseMap(vault_root, courses)`
- **Schema**: `courses:` is a dict keyed by course code (e.g., `PHYT_6314:`)
- Each course: `{ label, term, unit_type, units: [{id, name, topics: []}] }`
- `vault_root: "Study Notes"` stays unchanged

### Materials Endpoint Routes
- `GET /api/tutor/materials` (list) — EXISTS at api_tutor.py:6006
- `GET /api/tutor/materials/<id>/content` — EXISTS at api_tutor.py:6315
- `PUT /api/tutor/materials/<id>` — EXISTS at api_tutor.py:6116
- `DELETE /api/tutor/materials/<id>` — EXISTS at api_tutor.py:6254
- `GET /api/tutor/materials/<id>` — **MISSING** (returns 405, not 404/500)
- Fix: add GET method to existing route at line ~6116

### LO Handler Call Chain
- `execute_save_learning_objectives()` → `brain/tutor_tools.py:458-490`
- Calls → `brain/dashboard/api_tutor.py:1222` → `save_learning_objectives_from_tool()`
- Auto-invoke logic already exists at `api_tutor.py:4310-4343`

### Pre-existing LSP Errors (BASELINE — not caused by our changes)
- api_tutor.py: ~9 errors (Import, type annotation issues)
- tutor_rag.py: ~7 errors (attribute access on object type)
- tutor_tools.py: ~6 errors (import resolution)
- db_setup.py: ~9 errors (None type assignment)
- selector_bridge.py: ~2 errors (import)
- These are pre-existing. Do not try to fix them unless a task explicitly requires it.

### Tutor Blueprint
- All `/api/tutor/*` routes are in `brain/dashboard/api_tutor.py` via `tutor_bp`
- Blueprint registered in Flask app factory

### Session Creation
- Session creation endpoint is POST (not GET) in api_tutor.py around line ~2967

### North Star / MOC
- Current name in code: "north_star", "NorthStar", "_canonical_north_star_path"
- Target name: "map_of_contents", "MOC", "_canonical_moc_path", "_ensure_moc_context"
- Template to rename: `sop/templates/notes/north_star.md.tmpl`

### Current vault_courses.yaml Courses (to be replaced by T6)
- PHYT_6314: Movement Science (Spring 2026) — keep but verify
- PHYT_6313: Neuroscience (Spring 2026) — keep but verify  
- PHYT_6443: Therapeutic Interventions (Spring 2026) — needs Immersion 1 + Motor Control modules
- PHYT_6502: PT Examination Skills (Fall 2025) — REMOVE
- PHYT_6419: Human Anatomy (Fall 2025) — REMOVE
- ADD: PHYT_6216 (Exercise Physiology), PHYT_6220 (EBP)

### Codebase
- Python: Flask on port 5000, SQLite at brain/data/pt_study.db
- Frontend: React+TypeScript in dashboard_rebuild/, built to brain/static/dist/
- Build: `cd dashboard_rebuild && npm run build`
- Tests: `pytest brain/tests/` (56 existing tests)
- START SERVER: Start_Dashboard.bat (NEVER npm run dev)

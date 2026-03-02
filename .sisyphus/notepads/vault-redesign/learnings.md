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

## [2026-03-02] Task 2: localStorage Material ID Validation

### Problem
- Tutor wizard stored selected material IDs in localStorage
- Stale IDs (from deleted materials) caused 500 errors when loading
- Cross-course material contamination when switching courses
- Corrupted JSON in localStorage could crash the component

### Solution (3-part fix in tutor.tsx)

1. **Versioned Storage Key** (line 84)
   - Changed from `v1` to `v2` to auto-clear stale data
   - Old v1 key is ignored on first load

2. **Improved Validation** (lines 103-106)
   - Added `parsed.every((v) => typeof v === "number")` check
   - Validates entire array before using
   - Follows AGENTS.md pattern for localStorage validation

3. **Stale ID Filtering** (lines 245-257)
   - New useEffect filters selectedMaterials against chatMaterials API response
   - Creates Set of valid IDs from API
   - Silently discards deleted material IDs
   - Only updates state if something was filtered (prevents re-renders)

4. **Course Change** (lines 236-243)
   - Already implemented: clears selectedMaterials when courseId changes
   - Prevents cross-course material contamination

### Key Pattern: localStorage Validation
```typescript
const [state, setState] = useState<T>(() => {
  try {
    const saved = localStorage.getItem("key");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.every((v) => typeof v === "number")) {
        return parsed;
      }
    }
  } catch { /* corrupted — fall through */ }
  return defaultValue;
});
```

### Behavior After Fix
- Stale v1 key ignored → fresh start
- Corrupted JSON caught by try/catch → empty array
- Deleted materials filtered out → no 500 errors
- Course switch clears materials → no cross-course leakage

### Files Modified
- `dashboard_rebuild/client/src/pages/tutor.tsx` (3 changes)

### No Backend Changes Required
- Pure frontend validation
- No API calls needed
- No database changes

## 2026-03-02 — T1/T3/T5 api_tutor.py pass

### T1 — GET /materials/<id>
- Pattern: add a separate `@tutor_bp.route(..., methods=["GET"])` + new function — Flask supports multiple decorators per URL but separate functions is cleaner
- Reuse same `COALESCE(corpus, 'materials') = 'materials'` WHERE clause from the list and PUT endpoints
- Return 404 (not 405) by doing a real SELECT — Flask's 405 only fires when the method doesn't match any registered handler
- Pop `file_path` from response dict (same convention as list endpoint) to avoid exposing internal disk paths

### T3 — greeting in create_session
- Initialize `greeting = None` alongside `first_block_name = None` (before the `if method_chain_id:` block) — this keeps scoping clean for the response dict
- `_resolve_chain_blocks` already returns `facilitation_prompt` — no extra DB query needed
- First sentence: `fp.split(". ")[0][:200]` — splits on period+space, truncates at 200 chars; wrap in try/except returning None on failure
- `greeting = None` when no chain selected (UI-only field, not a DB turn)

### T5 — GET /api/tutor/course-map
- `dataclasses.asdict()` handles nested frozen dataclasses (CourseMap → Course → Unit) cleanly in one call
- `load_course_map()` already handles YAML-missing / parse-error gracefully — outer try/except catches only import or unexpected failures
- Lazy import inside the route function: `from course_map import load_course_map` — avoids top-level import side effects
- Serialize with `dataclasses.asdict(cm)` then `jsonify(...)` — produces the exact JSON shape the spec requires

### Baseline LSP errors
- api_tutor.py has 9 pre-existing LSP errors — do not attempt to fix them; verify count stays at 9 after edits

## [2026-03-02] api_tutor.py backend changes (T1/T3/T5)

### What was already implemented (no code change needed)
- T1 (`GET /api/tutor/materials/<int:material_id>`): Fully implemented at line 6123-6160. Uses `get_connection()` with `sqlite3.Row` factory, strips `file_path` before returning, returns 404 if not found.
- T3 (greeting in session creation): Fully implemented. `greeting = None` at line 3177, extraction from `first_block.facilitation_prompt` at lines 3214-3223, included in response at line 3278. Greeting format: `"Let's begin with {name} ({stage}). {first_sentence}"`.

### What required a fix (T5)
- T5 (`GET /api/tutor/course-map`): Existed at end of file (line 6958) but had two bugs:
  1. **Wrong import**: `from course_map import load_course_map` → fails at runtime (Flask runs from project root, not brain/ dir). Fixed to `from brain.course_map import load_course_map`.
  2. **Wrong error handler**: `except Exception: return jsonify({"vault_root": ..., "courses": []}), 200` → masked real errors. Fixed to `except Exception as e: return jsonify({"error": str(e)}), 500`.

### LSP false positives accepted in this codebase
- Lazy imports of `from brain.*` inside route functions show as LSP errors (can't resolve `brain.*` statically). This is the same pattern as the pre-existing error at line 3026 (`from brain.selector_bridge import run_selector`). Runtime works correctly because Flask runs from project root with `brain/` as a package.

### Verification
- `from brain.course_map import load_course_map` → `load_course_map()` returns 5 courses, vault_root="Study Notes"
- `pytest brain/tests/test_obsidian_vault.py -q` → 32/32 passed


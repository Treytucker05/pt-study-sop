# PT Study System (Trey)

Owner: Trey.

Personal study OS that captures sessions, produces metrics and Anki-ready outputs, keeps Obsidian as the primary knowledge base, and drives improvement via Scholar research. Flask dashboard on port 5000.

Response style: straight to the point, no fluff.

Onboarding order:
1. Start with this `AGENTS.md` for project-specific rules.
2. Then read `C:\Users\treyt\.claude\CLAUDE.md` for global preferences.

## Current Plan (as of 2026-02-23)

Active execution plan: `docs/root/TUTOR_TODO.md`

Primary active workstream:
- Tutor PRIME hardening and transfer-integrity checks before broader scope expansion.

Current priority order in `TUTOR_TODO.md`:
1. PRIME method policy and knob hardening.
2. PRIME runtime chain and transfer integrity checks.
3. Completion and hardening of MP4/video workflow in normal study sessions.

Execution rule:
- Do not begin major work until the task is listed in the `Current Sprint` section of `docs/root/TUTOR_TODO.md`.
- If work is not listed there, add it to `docs/root/TUTOR_TODO.md` first, then execute.

---

## How To Run The Server (DO NOT SKIP)

**NEVER** use `npm run dev` or `vite dev` for this project.

**ALWAYS** use the batch file:
```batch
C:\pt-study-sop\Start_Dashboard.bat
```

This will:
1. Build the UI directly to `brain/static/dist/` (one step!)
2. Start Python Flask server on **port 5000**
3. Open browser to `http://127.0.0.1:5000/brain`

---

## Environment
- Repo root: C:\pt-study-sop
- Obsidian vault: C:\Users\treyt\Desktop\Treys School
- Editor: Codex CLI / Claude Code (no default GUI editor).

## Git Identity
- Name: TreyT
- Email: Treytucker05@yahoo.com

## Core Commands
Canonical run/build/test commands live in `docs/root/GUIDE_DEV.md`.

- Start dashboard: `Start_Dashboard.bat`
- Run tests: `pytest brain/tests/`
- Frontend build (direct to Flask static): see `docs/root/GUIDE_DEV.md` (required for UI changes)

---

## Quick Development Workflow

The build outputs **directly** to `brain/static/dist` — no copy/sync step needed!

### Option 1: Double-click (Easiest)
```
C:\pt-study-sop\dashboard_rebuild\build-and-sync.bat
```

### Option 2: NPM Script
```powershell
cd C:\pt-study-sop\dashboard_rebuild
npm run deploy        # Build only
npm run deploy:open   # Build + open browser
```

### Option 3: PowerShell
```powershell
cd C:\pt-study-sop\dashboard_rebuild
.\build-and-sync.ps1          # Build
.\build-and-sync.ps1 -Reload  # Build + open browser
```

---

## Key Paths
- Database: brain/data/pt_study.db
- Session logs: brain/session_logs/
- API: brain/dashboard/api_adapter.py
- Frontend source: dashboard_rebuild/
- Frontend build output: brain/static/dist/
- SOP canon: sop/library/
- Scholar outputs: scholar/outputs/
- Docs index (canonical): docs/README.md
- Architecture doc: docs/root/PROJECT_ARCHITECTURE.md
- SOP manifest: (archived — replaced by sop/library/00-overview.md file map)
- Google Calendar credentials: docs/GoogleCalendarTasksAPI.json (handle as sensitive; do not modify unless asked).
- Conductor: conductor/ (product def, tech stack, tracks, workflow)

## Project Structure

```
C:\pt-study-sop\
├── dashboard_rebuild\          # React frontend source
│   ├── client\src\             # All React components
│   ├── build-and-sync.ps1      # Build script (outputs to brain/)
│   ├── build-and-sync.bat      # Double-click version
│   └── BUILD.md                # Build instructions
├── brain\                       # Python Flask server
│   ├── static\dist\            # ★ BUILD OUTPUT GOES HERE
│   ├── dashboard_web.py        # Flask server entry
│   └── ...
├── conductor\                   # Product def, tech stack, tracks
│   ├── tracks.md               # ★ CHECK BEFORE MAJOR WORK
│   └── workflow.md
├── sop\library\                 # SOP source of truth
├── scholar\                     # Scholar research
├── Start_Dashboard.bat          # ★ USE THIS TO START SERVER
└── AGENTS.md                    # ★ THIS FILE — single source of truth
```

## System Modules
- Dashboard, Brain, Calendar (Flask): brain/
- Frontend UI: dashboard_rebuild/
- Scholar research: scholar/
- SOP definitions: sop/
- Adaptive Tutor (Built-in Native):
  - `dashboard_rebuild/client/src/pages/tutor.tsx` (Frontend UI Chat & Controls)
  - `brain/dashboard/api_tutor.py` (Flask endpoints & streaming orchestration)
  - `brain/tutor_rag.py` (Document retrieval, dual-context search)
  - `brain/tutor_chains.py` (Method chain block progression)
  - `brain/tutor_streaming.py` (SSE response formatting & citations)
- Tutor logs: brain/session_logs/

## Control Plane Architecture (CP-MSS v1.0) - CURRENT

The system now uses the **Control Plane Modular Study System** (CP-MSS v1.0):

### 6-Stage Pipeline
```
PRIME → CALIBRATE → ENCODE → REFERENCE → RETRIEVE → OVERLEARN
```

### Key Components
| Component | File | Purpose |
|-----------|------|---------|
| Constitution | `sop/library/17-control-plane.md` | Source of truth for CP-MSS v1.0 |
| Selector | `brain/selector.py` | 7 Knobs router (assessment_mode, time, energy, etc.) |
| Bridge | `brain/selector_bridge.py` | API adapter for tutor integration |
| Error Telemetry | `brain/db_setup.py` | `error_logs` table for HCWR, dominant_error |
| Chains | `sop/library/chains/C-FE-*.yaml` | Dependency-safe chains (REF before RET) |

### The Dependency Law
**No retrieval without targets.** Every RETRIEVE stage must be preceded by REFERENCE (target generation). This is enforced in all chains:
- `C-FE-STD`: Standard First Exposure (35 min)
- `C-FE-MIN`: Minimal/Low Energy (20 min)  
- `C-FE-PRO`: Procedure/Lab (45 min)

### Database Schema
- `method_blocks.control_stage`: PRIME, CALIBRATE, ENCODE, REFERENCE, RETRIEVE, OVERLEARN
- `error_logs`: Tracks error_type, stage_detected, confidence, active_knobs, fix_applied

### Frontend Support
- Control Plane colors in `dashboard_rebuild/client/src/lib/colors.ts`
- Category mapping in `dashboard_rebuild/client/src/lib/displayStage.ts`
- Type definitions in `dashboard_rebuild/client/src/api.ts`

## External Systems (from docs)
- Anki (AnkiConnect): in active use; syncs card_drafts to Anki Desktop.
- Google Calendar/Tasks: in active use; OAuth via Calendar page; config in brain/data/api_config.json.

---

## UI/UX (Retro Arcade)
- Theme: high-contrast red and black, no glow, consistent across pages.
- Typography: font-arcade headers, font-terminal body.
- Components: 2px solid red borders; semi-transparent black backgrounds.

---

## Key Files By Feature

| Feature | Source Location |
|---------|-----------------|
| Brain Page | `dashboard_rebuild/client/src/pages/brain.tsx` |
| Brain Components | `dashboard_rebuild/client/src/components/brain/` |
| BrainChat | `dashboard_rebuild/client/src/components/BrainChat/` |
| Layout/Footer | `dashboard_rebuild/client/src/components/layout.tsx` |
| Course Config | `dashboard_rebuild/client/src/config/courses.ts` |
| Error Boundaries | `dashboard_rebuild/client/src/components/ErrorBoundary.tsx` |

---

## Post-Implementation Checklist (MANDATORY after any code change)

Canonical steps: `docs/root/GUIDE_DEV.md` section "Frontend Build".

Quick summary:
1. Build: `cd dashboard_rebuild && npm run build` (outputs directly to brain/static/dist/)
2. Never use dev server. Dashboard served via Start_Dashboard.bat on port 5000.
3. Tests: `pytest brain/tests/`
4. Update active track's plan.md (task status + commit SHA).
   For non-track changes, append to `conductor/tracks/GENERAL/log.md`.
5. Update `conductor/tracks.md` if track-level status changed.

Skip step 1 for backend-only changes.

---

## Rules

1. Plan before coding for any non-trivial change.
2. dashboard_rebuild is frontend-only; API lives in brain/.
3. Only serve the dashboard via Start_Dashboard.bat on port 5000. Do not run a separate dev server or python brain/dashboard_web.py directly.
4. After frontend changes: run `npm run build` in `dashboard_rebuild` (Vite writes directly to `brain/static/dist`). (See Post-Implementation Checklist above.)
5. Check `.claude/permissions.json` before executing new shell commands.
6. After every significant change: update the active conductor track's plan.md
   (mark tasks complete, add commit SHA). For changes outside a named track,
   append a dated entry to `conductor/tracks/GENERAL/log.md`.
7. Push to remote after every change (auto).
8. After code changes, run relevant checks by default (pytest brain/tests/; frontend build already required).
9. Do not edit archive/ unless explicitly requested.
10. Do not hand-edit `brain/static/dist/`; update it via frontend build commands only.
11. No destructive commands (e.g., reset --hard, clean, rm) unless explicitly requested.
12. Auto-commit after changes; use a conventional commit message if none is provided.
13. Safe-by-default git: check status/diff before edits.
14. Check conductor/tracks.md before starting major work — active tracks take priority.
15. After every significant change, update `conductor/tracks.md` with current status/progress before finishing.
16. **Clean up after yourself.** Do not leave scratch files, temp scripts, or
    subagent output at the repo root. If you create a temporary file (tmp_*,
    extract_*, parse_*, method_*.json, *_prompt.txt, etc.), delete it before
    committing or ensure it matches a .gitignore rule. Never commit generated
    JSON blobs, one-off extraction scripts, or subagent prompt/output files.
17. Default multi-agent execution model:
   - Assign work by file ownership to minimize overlap:
     - Backend/runtime: `brain/`, `scripts/`
     - Frontend: `dashboard_rebuild/`
     - Canon/process/docs: `conductor/`, `docs/`, `sop/library/`, `obsidian/`
   - For each agent task, claim one primary artifact scope in `docs/root/TUTOR_TODO.md` before editing.
   - Keep edits non-overlapping unless the file is intentionally shared.
   - After each agent pass:
     - update `conductor/tracks/GENERAL/log.md` (or active plan)
     - update `conductor/tracks.md` if status changes
     - include a short completion note in `docs/root/TUTOR_TODO.md`.

---

## Common Mistakes To Avoid

| Mistake | Why It Fails |
|---------|--------------|
| `npm run dev` | Opens port 3000, doesn't serve Python API |
| Forgetting hard refresh | Browser shows old cached build |
| Multiple servers | Port conflicts — use `Start_Dashboard.bat` only |
| Using `category: prepare` in YAML | Legacy alias — canonical enum is `prime`. CI rejects non-canonical values. |
| Using `status: active` in YAML | Not a valid enum — use `draft`, `core`, `optional`, `validated`, or `deprecated`. |
| Windows backslash paths in CI | GitHub Actions runs Linux — use `Path.relative_to().as_posix()` for cross-platform paths. |
| Merging PR before CI is green | CI fixes on feature branch don't land on main. Cherry-pick to a fix branch if this happens. |
| Missing `prompt_keywords` in ENCODE methods | CI `test_method_cards_hardening` requires ENCODE methods to include "actively transform" keywords. |

---

## Learnings

### Project Location
The project root is `C:\pt-study-sop`. All dashboard_rebuild/ and brain/ paths are relative to this root.

### React Hooks in calendar.tsx
Never place `useSensors`, `useSensor`, or any `use*` hook inside JSX or callbacks. Always declare at the top level of `CalendarPage()`. This was a bug introduced when adding DnD to the manage calendars dialog.

### Calendar Filtering
When filtering Google events by `selectedCalendars`, always use `event.calendarId || ''` — never rely on a truthy check on `calendarId` since some events have undefined/empty calendarId and would bypass the filter.

### Build & Deploy
After frontend changes, run `npm run build` in `dashboard_rebuild/`. Vite writes directly to `brain/static/dist/`, which Flask serves. Without this step, changes won't appear in the browser. NEVER run `npm run dev` or `vite dev` — always run the build path. See Post-Implementation Checklist above.

### localStorage in React useState Initializers
When initializing state from `localStorage` with `JSON.parse`, always wrap in try/catch and validate the parsed type (e.g. `Array.isArray`). Corrupted or stale localStorage data will crash the component on mount otherwise.
```ts
const [state, setState] = useState<T>(() => {
  try {
    const saved = localStorage.getItem("key");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return new Set(parsed); // validate shape
    }
  } catch { /* corrupted — fall through */ }
  return defaultValue;
});
```

### Persist Actions Need Visual Feedback
Any button that saves state without navigating or closing a modal MUST have visual feedback: (1) a toast notification confirming the action, and (2) a status indicator (green dot = saved, red dot = unsaved changes) using a dirty state flag.

### SOP Library Is Source of Truth
The 75 original SOP files were consolidated into library files at `sop/library/` (00-14). Originals were archived to `sop/archive/`. The library is the sole source of truth for SOP content. `sop/runtime/` exists but is generated output (do not edit it directly). Do not reference `sop/src/` or `sop/examples/` (archived Jan 2026).

### Codex MCP Cannot Review Inline Diffs
Codex MCP's `ask-codex` ignores full diff/code embedded in the prompt and asks for a repo path instead. When the repo isn't reachable by Codex, do the code review manually using the standard checklist (bugs, edge cases, security, performance, type correctness).

### Tutor RAG "6 Files" Symptom Diagnosis

**Problem:** Tutor appeared to pull only ~6 files even when ~30 files were selected.
**Cause:** Usually not preloading. This is typically turn-level scope loss or relevance narrowing. If a turn payload misses `content_filter.material_ids`, retrieval falls back to low default depth and appears constrained.
**Solution:** Ensure every turn sends `content_filter.material_ids` plus `accuracy_profile`. Validate in browser Network on the `turn` request and in `retrieval_debug` (`material_ids_count`, `material_k`, `retrieved_material_unique_sources`).

### YAML Strict Validation in CI
The `sop_validate` CI job enforces strict rules on all method and chain YAML files:
- **Category enum**: Must be one of `prime`, `calibrate`, `encode`, `interrogate`, `reference`, `retrieve`, `overlearn`. Legacy aliases (`prepare`, `refine`, `review`) are rejected.
- **Status enum**: Must be one of `draft`, `core`, `optional`, `validated`, `deprecated`. Never use `active`.
- **Required fields**: Every method must have `id`, `name`, `category`, `status`, `description`, `knobs` (list), `constraints` (dict). Every chain must have `id`, `name`, `status`, `description`, `blocks` (list).
- **ENCODE prompt keywords**: Methods with `category: encode` must include "actively transform" or similar generative-processing verbs in `prompt_keywords`.
- **Golden-file export tests**: `test_export_methods.py` and `test_export_chains.py` compare runtime exports against `sop/tests/golden/`. After adding/modifying methods or chains, regenerate golden files: `python sop/tests/regen_golden.py`.

### Cross-Platform Path Handling
Python scripts that produce paths for CI comparison (e.g., `sop/scripts/export_methods.py`) must use `Path.relative_to(base).as_posix()` to emit forward-slash paths. GitHub Actions runs on Linux, so backslash Windows paths will fail diff checks. Always test path output with `as_posix()`.

### Cherry-Pick Workflow for Premature Merges
If a PR gets merged before CI fixes land (e.g., PR #116), the fix commits live on the feature branch but not on `main`. Recovery:
1. Create `fix/ci-green` from `origin/main`.
2. `git cherry-pick` the fix commits from the old branch.
3. Resolve conflicts (IDs may have changed if new methods were added on main).
4. Open a new PR (e.g., PR #117) targeting main.

### Scoped Retrieval Tuning Rule (Latency vs Breadth)

**Problem:** High per-turn latency in large selected-file scope.
**Cause:** Over-fetch in MMR candidate fetch inflated rerank pools (`candidate_k * 4`, cap 2000), then many chunks were dropped by cap.
**Solution:** Keep scoped candidate breadth policy and tune MMR fetch budget moderately:
- `mmr_fetch_k = min(max(candidate_k * 3, candidate_k + 40), 1600)` in `brain/tutor_rag.py`.
- Avoid aggressive candidate-pool cuts that reduce source breadth/confidence.

---

## Troubleshooting

Run these in browser console (F12):

```javascript
// Check viewport width
window.innerWidth

// See all fixed positioned elements
Array.from(document.querySelectorAll('.fixed')).map(e => ({
  class: e.className.slice(0, 50),
  bottom: getComputedStyle(e).bottom,
  zIndex: getComputedStyle(e).zIndex
}))
```

---

## Detailed Guidelines
- Project Workflow: conductor/workflow.md
- Conductor Tracks: conductor/tracks.md
- Parallel agent workflow: Open multiple terminals and coordinate tasks using Conductor Tracks.

*Full dev guide: `docs/root/GUIDE_DEV.md`*
*Build details: `dashboard_rebuild/BUILD.md`*

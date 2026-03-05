# PT Study System (Trey)

Owner: Trey.

Personal study OS that captures sessions, produces metrics and Anki-ready outputs, keeps Obsidian as the primary knowledge base, and drives improvement via Scholar research. Flask dashboard on port 5000.

Response style: straight to the point, no fluff.

Onboarding order:
1. Start with this `AGENTS.md` for project-specific rules.
2. Then read `C:\Users\treyt\.claude\CLAUDE.md` for global preferences.

## Current Plan (as of 2026-02-24)

Active execution plan: `docs/root/TUTOR_TODO.md`

Recently completed:
- TutorChat Speed Tiers (2026-02-24) — mode toggles, parallel RAG, model/reasoning per tier. Plan: `docs/plans/2026-02-24-tutor-chat-speed-tiers.md`

Primary active workstream:
- Tutor PRIME hardening and transfer-integrity checks before broader scope expansion.

Current priority order in `TUTOR_TODO.md`:
1. PRIME method policy and knob hardening.
2. PRIME runtime chain and transfer integrity checks.
3. Completion and hardening of MP4/video workflow in normal study sessions.

Execution rule:
- Do not begin major work until the task is listed in the `Current Sprint` section of `docs/root/TUTOR_TODO.md`.
- If work is not listed there, add it to `docs/root/TUTOR_TODO.md` first, then execute.

## Immediate Next Steps (Tutor delete hardening, 2026-03-03)

Recommended next step:
1. Add persistent delete telemetry end-to-end:
   - store structured delete events (`request_id`, outcome counts, failure reason) for recurring incident analysis.

Other next steps:
1. Run a post-restart Tutor UI smoke with a throwaway session:
   - `Artifacts -> Select all -> Delete -> Confirm`
   - verify active-session warning, no overlay deadlock, and clean return to Wizard.
2. Run a forced partial-failure scenario for bulk delete:
   - confirm the in-panel delete report shows `Requested / Deleted / Already gone / Failed` and concrete failure reasons.
3. Add an automated regression check for Tutor delete behavior:
   - verify idempotent delete response shape and active-session warning path do not regress.

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
- Tutor API: brain/dashboard/api_tutor.py (40+ endpoints, ~7200 lines)
- Frontend source: dashboard_rebuild/
- Frontend build output: brain/static/dist/
- SOP methodology: sop/library/ (**NOT study materials** — see disambiguation below)
- Study materials (uploads): brain/data/uploads/ + brain/data/chroma_tutor/ (ChromaDB vectors)
- Scholar outputs: scholar/outputs/
- Docs index (canonical): docs/README.md
- Architecture doc: docs/root/PROJECT_ARCHITECTURE.md
- SOP manifest: (archived — replaced by sop/library/00-overview.md file map)
- Google Calendar credentials: docs/GoogleCalendarTasksAPI.json (handle as sensitive; do not modify unless asked).
- Conductor: conductor/ (product def, tech stack, tracks, workflow)

## ⚠ "Library" Disambiguation (READ THIS FIRST)

Two things in this repo are called "Library." They are **completely different**:

| | SOP Library (`sop/library/`) | Library Page (`/library` route) |
|---|---|---|
| **What it is** | Study **methodology** definitions | User's **study materials** manager |
| **Contains** | 17 markdown files + 46 YAML method blocks + 15 chains defining *how the tutor teaches* | PDFs, DOCX, PPTX, slides, notes — the actual *course content* the user studies |
| **Storage** | `sop/library/` (checked into git) | `brain/data/uploads/` (disk) + `brain/data/chroma_tutor/` (ChromaDB vectors) + `rag_docs` table (SQLite) |
| **Frontend** | No dedicated page (referenced by tutor internals) | `dashboard_rebuild/client/src/pages/library.tsx` → route `/library` |
| **Who edits it** | Developers (method block YAML, chain YAML) | End user (uploads via UI, syncs from `C:\Users\treyt\OneDrive\Desktop\PT School`) |
| **Used by RAG** | No (defines tutor behavior, not retrieval content) | **Yes** — ChromaDB vectors are what the tutor retrieves during chat |

**Rule:** When someone says "library" in this repo, determine from context whether they mean:
- **SOP methodology** → `sop/library/` (how the tutor works)
- **Study materials** → `/library` page + `brain/data/` (what the user studies)

## Project Structure

```
C:\pt-study-sop\
├── dashboard_rebuild\          # React frontend source
│   ├── client\src\             # All React components
│   │   ├── pages\tutor.tsx     # Tutor chat UI
│   │   └── pages\library.tsx   # ★ Material upload/management UI (user's study files)
│   ├── build-and-sync.ps1      # Build script (outputs to brain/)
│   ├── build-and-sync.bat      # Double-click version
│   └── BUILD.md                # Build instructions
├── brain\                       # Python Flask server
│   ├── static\dist\            # ★ BUILD OUTPUT GOES HERE
│   ├── data\uploads\           # ★ Uploaded study materials (PDFs, DOCX, etc.)
│   ├── data\chroma_tutor\      # ★ ChromaDB vector store (RAG embeddings)
│   ├── dashboard_web.py        # Flask server entry
│   ├── llm_provider.py         # Codex API (ChatGPT backend) for tutor LLM
│   └── ...
├── conductor\                   # Product def, tech stack, tracks
│   ├── tracks.md               # ★ CHECK BEFORE MAJOR WORK
│   └── workflow.md
├── sop\library\                 # ★ SOP METHODOLOGY (not study materials!)
├── scholar\                     # Scholar research
├── Start_Dashboard.bat          # ★ USE THIS TO START SERVER
└── AGENTS.md                    # ★ THIS FILE — single source of truth
```

## System Modules
- Dashboard, Brain, Calendar (Flask): brain/
- Frontend UI: dashboard_rebuild/
- Scholar research: scholar/
- SOP definitions (methodology): sop/
- Adaptive Tutor (Built-in Native):
  - `dashboard_rebuild/client/src/pages/tutor.tsx` (Frontend UI Chat & Controls)
  - `dashboard_rebuild/client/src/pages/library.tsx` (Material upload/management UI)
  - `brain/dashboard/api_tutor.py` (Flask endpoints & streaming orchestration)
  - `brain/tutor_rag.py` (Document retrieval, dual-context search)
  - `brain/tutor_chains.py` (Method chain block progression)
  - `brain/tutor_streaming.py` (SSE response formatting & citations)
  - `brain/obsidian_vault.py` (Obsidian CLI wrapper for vault writes)
  - `brain/llm_provider.py` (Codex API / ChatGPT backend for LLM calls)
- Study material storage: brain/data/uploads/ (files) + brain/data/chroma_tutor/ (vectors)
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
| Library Page | `dashboard_rebuild/client/src/pages/library.tsx` |
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

### SOP Library Is Source of Truth (Methodology, Not Materials)
The 75 original SOP files were consolidated into library files at `sop/library/` (00-14). Originals were archived to `sop/archive/`. The library is the sole source of truth for SOP **methodology** content. `sop/runtime/` exists but is generated output (do not edit it directly). Do not reference `sop/src/` or `sop/examples/` (archived Jan 2026). **Do NOT confuse `sop/library/` with the `/library` page** — see "Library Disambiguation" section above.

### Codex MCP Cannot Review Inline Diffs
Codex MCP's `ask-codex` ignores full diff/code embedded in the prompt and asks for a repo path instead. When the repo isn't reachable by Codex, do the code review manually using the standard checklist (bugs, edge cases, security, performance, type correctness).

### Tutor RAG "6 Files" Symptom Diagnosis

**Problem:** Tutor appeared to pull only ~6 files even when ~30 files were selected.
**Cause:** Usually not preloading. This is typically turn-level scope loss or relevance narrowing. If a turn payload misses `content_filter.material_ids`, retrieval falls back to low default depth and appears constrained.
**Solution:** Ensure every turn sends `content_filter.material_ids` plus `accuracy_profile`. Validate in browser Network on the `turn` request and in `retrieval_debug` (`material_ids_count`, `material_k`, `retrieved_material_unique_sources`).

### Tutor Bulk Delete Overlay Deadlock

**Problem:** In Tutor chat, opening `ARTIFACTS` and running `Recent Sessions -> Select all -> Delete` could dim the screen with a translucent black overlay and leave UI interaction stuck; sessions often remained undeleted.
**Cause:** Bulk confirm in `dashboard_rebuild/client/src/components/TutorArtifacts.tsx` used a custom `AlertDialog` path that could deadlock in this panel context.
**Solution:** Use a themed in-panel confirm modal (non-portal) for bulk session/artifact actions and keep existing async handlers for deletion/end logic.

### Tutor Delete Telemetry Persistence

**Problem:** Recurrent delete failures were hard to diagnose after the fact because results lived only in transient UI state and logs.
**Cause:** No persistent audit trail tied to delete `request_id` and outcome.
**Solution:** Persist each tutor delete call to `tutor_delete_telemetry` (route, status, requested/deleted/skipped/failed counts, details JSON). Use the returned `request_id` from delete responses to correlate UI issues with DB-backed telemetry.

### Tutor Delete Best-Effort Rule

**Problem:** Strict failure on partial Obsidian cleanup blocked full session deletion and left stale sessions.
**Cause:** Session delete previously returned hard failure when expected Obsidian files were missing.
**Solution:** Treat Obsidian cleanup as best-effort for session delete:
- If DB deletion succeeds but some Obsidian files are missing, return `status=deleted_with_warnings` with `obsidian_cleanup.missing_paths`.
- Keep telemetry row in `tutor_delete_telemetry` for each delete request.

### Stale Dashboard Process Can Mask Backend Fixes

**Problem:** API behavior may appear unchanged (for example still returning `obsidian_cleanup_failed`/`409`) even after backend code updates.
**Cause:** An older `dashboard_web.py` process can remain bound to port `5000`, so the new code is not actually serving requests.
**Solution:** Before validating backend fixes, confirm the listening PID on `5000` and its recent start time. If stale, hard-stop it and relaunch via `Start_Dashboard.bat` before re-testing.

### Destructive Async UI State Rule (Tutor/Brain)

**Problem:** Repeated UI regressions around delete/edit flows caused stuck overlays, overlapping modals, and duplicate destructive actions.
**Cause:** Shared UI state across session restore + modal ownership + async delete flows without unified pending guards/reset paths.
**Solution:** Standardize destructive flow safety:
- Normalize optional payload fields (for example `material_ids`) to explicit defaults instead of conditional omission.
- Disable and guard destructive actions while mutations are pending.
- Keep modal close/reset logic in a single `finally`/`onSettled` path so partial failures do not leave dead UI state.

### Dialog Positioning Rule (Centering)

**Problem:** Modals drifted to the top/left or appeared clipped when individual screens overrode dialog position with inline `top/left/transform`.
**Cause:** Per-dialog inline positioning conflicted with shared dialog centering utility (`.dialog-center` in `dashboard_rebuild/client/src/index.css`).
**Solution:** Do not hardcode modal position on `DialogContent`/`AlertDialogContent`.
- Remove inline style overrides like `style={{ zIndex: 100005, top: \"...\", left: \"50%\", transform: \"translate(-50%, 0)\" }}`.
- Avoid ad-hoc `translate-y-0` on modal content unless intentionally offsetting.
- Let shared dialog primitives handle centering/z-index globally; only size/overflow should be customized per modal.

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

# Agent Guardrails

Purpose: preserve the detailed incident learnings, implementation guardrails, and troubleshooting snippets that were removed from root `AGENTS.md` to keep the startup canon short.

Root startup canon: `AGENTS.md`
Top-level repo truth: `README.md`

## Fast Rules

- Do not use `npm run dev` or `vite dev`. Use `Start_Dashboard.bat`.
- After frontend changes, run `npm run build` in `dashboard_rebuild/`.
- Do not confuse `sop/library/` with the `/library` materials page.
- If backend behavior looks stale, confirm the active process on port `5000`.
- Keep destructive async UI flows guarded, explicit, and single-owner.
- Let shared dialog primitives handle modal centering.

## Detailed Learnings

### Project Location

The project root is `C:\pt-study-sop`. All `dashboard_rebuild/` and `brain/` paths are relative to this root.

### React Hooks in calendar.tsx

Never place `useSensors`, `useSensor`, or any `use*` hook inside JSX or callbacks. Always declare at the top level of `CalendarPage()`. This was a bug introduced when adding DnD to the manage calendars dialog.

### Calendar Filtering

When filtering Google events by `selectedCalendars`, always use `event.calendarId || ''` — never rely on a truthy check on `calendarId` since some events have undefined/empty `calendarId` and would bypass the filter.

### Build & Deploy

After frontend changes, run `npm run build` in `dashboard_rebuild/`. Vite writes directly to `brain/static/dist/`, which Flask serves. Without this step, changes will not appear in the browser.

### localStorage in React useState Initializers

When initializing state from `localStorage` with `JSON.parse`, always wrap in `try/catch` and validate the parsed type (for example `Array.isArray`). Corrupted or stale `localStorage` data will crash the component on mount otherwise.

```ts
const [state, setState] = useState<T>(() => {
  try {
    const saved = localStorage.getItem("key");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return defaultValue;
});
```

### Persist Actions Need Visual Feedback

Any button that saves state without navigating or closing a modal must have:

1. a toast confirming the action
2. a saved/unsaved status indicator

### SOP Library Is Source of Truth (Methodology, Not Materials)

The original SOP files were consolidated into `sop/library/`. `sop/runtime/` is generated output and should not be edited directly. Do not reference archived `sop/src/` or `sop/examples/`.

### Codex MCP Cannot Review Inline Diffs

Codex MCP's `ask-codex` ignores full diff/code embedded in the prompt and asks for a repo path instead. When the repo is not reachable by Codex, do code review manually using the standard checklist: bugs, edge cases, security, performance, type correctness.

### Codex Windows Sandbox Setting

Do not change Codex Windows sandbox settings during setup cleanup unless Trey explicitly asks. In particular, do not enable or normalize `[windows] sandbox = "elevated"` as a generic best-practice fix. Trey intentionally keeps this setting the way he wants it because enabling/changing it has caused more workflow problems than it prevents.

### Tutor RAG "6 Files" Symptom Diagnosis

**Problem:** Tutor appeared to pull only ~6 files even when ~30 files were selected.  
**Cause:** Usually not preloading. If a turn payload misses `content_filter.material_ids`, retrieval falls back to a low default depth and appears constrained.  
**Solution:** Ensure every turn sends `content_filter.material_ids` plus `accuracy_profile`. Validate in browser Network on the `turn` request and in `retrieval_debug` (`material_ids_count`, `material_k`, `retrieved_material_unique_sources`).

### Tutor Bulk Delete Overlay Deadlock

**Problem:** In Tutor chat, opening `ARTIFACTS` and running `Recent Sessions -> Select all -> Delete` could dim the screen and leave UI interaction stuck.  
**Cause:** Bulk confirm in `dashboard_rebuild/client/src/components/TutorArtifacts.tsx` used a custom `AlertDialog` path that could deadlock in that panel context.  
**Solution:** Use a themed in-panel confirm modal (non-portal) for bulk session/artifact actions and keep existing async handlers for deletion/end logic.

### Tutor Delete Telemetry Persistence

**Problem:** Recurrent delete failures were hard to diagnose because results lived only in transient UI state and logs.  
**Cause:** No persistent audit trail tied to delete `request_id` and outcome.  
**Solution:** Persist each tutor delete call to `tutor_delete_telemetry` and correlate UI issues using the returned `request_id`.

### Tutor Delete Best-Effort Rule

**Problem:** Strict failure on partial Obsidian cleanup blocked full session deletion and left stale sessions.  
**Cause:** Session delete previously returned hard failure when expected Obsidian files were missing.  
**Solution:** Treat Obsidian cleanup as best-effort for session delete:

- If DB deletion succeeds but some Obsidian files are missing, return `status=deleted_with_warnings` with `obsidian_cleanup.missing_paths`.
- Keep one telemetry row in `tutor_delete_telemetry` for each delete request.

### Stale Dashboard Process Can Mask Backend Fixes

**Problem:** API behavior may appear unchanged even after backend code updates.  
**Cause:** An older `dashboard_web.py` process can remain bound to port `5000`, so the new code is not actually serving requests.  
**Solution:** Before validating backend fixes, confirm the listening PID on `5000` and its recent start time. If stale, stop it and relaunch via `Start_Dashboard.bat`.

### Live Navbar/UI Visual Pass Rule

**Problem:** Repeated navbar/header tweaks regressed because visual changes were judged from source coordinates, partial assumptions, or stale mental models instead of the full live render.  
**Cause:** Structural fixes and polish tweaks were mixed together, and the shell art, overlay/debug surface, and button anchors drifted into different coordinate systems before anyone forced a full-screen visual reset.  
**Solution:** Treat live UI polish as a screenshot-first workflow:

- Use the canonical `Start_Dashboard.bat` -> `http://127.0.0.1:5000` surface only.
- After every meaningful visual change, capture a fresh live screenshot of the whole affected area before claiming improvement.
- If the full composition looks wrong, stop nudging individual elements and do a baseline recovery pass first.
- Do not mix structural layout resets and micro-alignment polish in the same pass.
- Keep a visible build marker during iterative UI work so the rendered screenshot can be tied to the actual bundle under review.

### Tutor Pattern Button Rail Rule

Patterned Tutor row buttons should keep the animated grid/glow on a pseudo-layer and the top/bottom rails on that same stable layer. Do not rely on the main element background or `border-image` alone for the rail line, because hover-size changes can visually eat the top edge even when the row height looks correct.

If the Tutor row uses the shared `Button` primitive with `variant="ghost"`, explicitly neutralize `transform` on the Tutor-specific class for base, hover, and active states. The shared ghost variant still carries hover/active translate utilities, and those can lift the button into the strip edge even when padding looks generous.

When the Tutor tablist uses `overflow-x-auto`, the browser computes `overflow-y: auto` too. If the tablist height matches the button height exactly, the row becomes the clipping boundary and the hover state will look cropped even with `transform: none`. Leave explicit vertical slack in the row and button geometry instead of relying on font-size math alone.

### Destructive Async UI State Rule (Tutor/Brain)

**Problem:** Repeated regressions around delete/edit flows caused stuck overlays, overlapping modals, and duplicate destructive actions.  
**Cause:** Shared UI state across session restore plus async delete flows without unified pending guards/reset paths.  
**Solution:** Standardize destructive flow safety:

- Normalize optional payload fields (for example `material_ids`) to explicit defaults instead of conditional omission.
- Disable and guard destructive actions while mutations are pending.
- Keep modal close/reset logic in a single `finally` or `onSettled` path.

### Dialog Positioning Rule (Centering)

**Problem:** Modals drifted to the top/left or appeared clipped when screens overrode dialog position with inline `top/left/transform`.  
**Cause:** Per-dialog inline positioning conflicted with shared dialog centering utility (`.dialog-center` in `dashboard_rebuild/client/src/index.css`).  
**Solution:** Do not hardcode modal position on `DialogContent` or `AlertDialogContent`.

- Remove inline style overrides such as `top`, `left`, and `transform`.
- Avoid ad-hoc `translate-y-0` unless intentionally offsetting.
- Let shared dialog primitives handle centering and z-index globally.

### Scoped Retrieval Tuning Rule (Latency vs Breadth)

**Problem:** High per-turn latency in large selected-file scope.  
**Cause:** Over-fetch in MMR candidate fetch inflated rerank pools (`candidate_k * 4`, cap 2000), then many chunks were dropped by the cap.  
**Solution:** Keep scoped candidate breadth policy and tune MMR fetch budget moderately:

- `mmr_fetch_k = min(max(candidate_k * 3, candidate_k + 40), 1600)` in `brain/tutor_rag.py`
- Avoid aggressive candidate-pool cuts that reduce source breadth or confidence

### Tutor Material Viewer — PT School Paths Blocked (2026-05-20)

**Problem:** Studio Document Dock / Material Viewer showed headers and paths but PDFs were blank; `/api/tutor/materials/<id>/file` returned **403** for synced PT School files.  
**Cause:** `get_material_file()` only allowed `UPLOADS_DIR` and extracted-image roots. Synced materials store absolute OneDrive paths under `STUDY_RAG_DIR` / `PT_STUDY_RAG_DIR`, which were not in the allow-list. A stale Flask process on port `5127` could also mask the fix until restart.  
**Fix shipped:** `brain/dashboard/api_tutor_materials.py` — `_configured_material_sync_roots()` includes `config.STUDY_RAG_DIR` and env aliases; `_resolve_serveable_material_path()` strips `#chNN` fragments before disk lookup.  
**Verify:** `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5127/api/tutor/materials/<id>/file` → `200` for a known on-disk PDF. Restart dashboard + hard refresh after backend changes.

### Tutor Material Viewer — Chapter-Split Rows (2026-05-20)

**Problem:** Textbook chapter rows (`path.pdf#ch01`) tried to load a non-existent file in a PDF iframe.  
**Cause:** Chapter-split ingest uses logical `source_path` keys; content lives in `rag_docs.content`, not as separate PDF files.  
**Fix shipped:** `dashboard_rebuild/client/src/lib/materialViewer.ts` + `MaterialViewer.tsx` — detect `#chNN`, show extracted-text fallback; full PDFs still use inline iframe when the parent file exists.  
**Code follow-up (not done):** optional per-chapter PDF export or page-range viewer instead of whole-book iframe for `#ch` rows.

### Library Materials Stale After Folder/File Renames (2026-05-20)

**Problem:** Some materials open in the viewer, others 404 — often after renaming PT School folders or filenames.  
**Cause:** `rag_docs.source_path` is the identity key. Renames on disk do not update existing rows; ~half of local rows can point at missing paths until reconciled. Uploads under `brain/data/uploads/` are independent copies.  
**Operational fix:** Tutor Source Shelf → **Sync Root Folder** (full sync, not selected-files-only). Prunes missing paths and ingests new ones. Re-select materials on active sessions if material IDs changed.  
**Code follow-up (not done):**

- Material health indicator in Library / Source Shelf (on-disk exists? servable? content chars?)
- “Reconcile paths” or post-rename wizard tied to sync preview
- Surface 404/403 from `/file` in the viewer UI instead of a blank iframe
- Auto-expand filtered groups in Session Materials when search is active

### Session Materials Entry Card — Grouping UX (2026-05-20)

**Shipped (frontend):** Entry overlay groups by **Textbook** vs **folder path** (not file type); collapsible sections; Collapse/Expand All separate from Select All.  
**Files:** `studioEntryMaterials.ts`, `StudioEntryMaterialsSection.tsx`. Rebuild required (`npm run build`); macOS dashboard on port `5127`.

## Troubleshooting Snippets

Run these in browser console (F12):

```javascript
// Check viewport width
window.innerWidth

// See all fixed-positioned elements
Array.from(document.querySelectorAll('.fixed')).map(e => ({
  class: e.className.slice(0, 50),
  bottom: getComputedStyle(e).bottom,
  zIndex: getComputedStyle(e).zIndex
}))
```

## Related Docs

- Agent setup: `docs/root/AGENT_SETUP.md`
- Developer guide: `docs/root/GUIDE_DEV.md`
- Technical architecture: `docs/root/PROJECT_ARCHITECTURE.md`
- Top-level repo truth: `README.md`
- Active workboard: `docs/root/TUTOR_TODO.md`

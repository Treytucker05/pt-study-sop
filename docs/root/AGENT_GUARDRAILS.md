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

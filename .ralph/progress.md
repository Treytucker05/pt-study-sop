# Progress Log
Started: Sun Mar 29 00:04:50 CDT 2026

## Codebase Patterns
- (add reusable patterns here)

---

## [2026-03-29 00:40 CDT] - ENTRY-001: Entry card renders as viewport overlay, not canvas object
Thread: 
Run: 20260329-002728-27772 (iteration 1)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-002728-27772-iter-1.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-002728-27772-iter-1.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: `af52cb2d ENTRY-001 fix tutor entry overlay`
- Post-commit status: `.agents/ralph/agents.sh`, `.agents/ralph/config.sh`, `.agents/tasks/prd.json`, `ralph.bat` deleted, `.ralph/runs/`, `ralph-loop.bat`
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `dev-browser --timeout 60 run C:/pt-study-sop/scripts/verify-entry-bugs.js` -> FAIL (`ENTRY-001` checks passed; unrelated `ENTRY-003` panel-open assertion still fails)
  - Command: `chrome-devtools on http://127.0.0.1:5000/tutor?course_id=1&board_scope=project (entry bbox + pan + zoom + console)` -> PASS
- Files changed:
  - `dashboard_rebuild/client/src/components/studio/StudioShell.tsx`
  - `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx`
  - `.ralph/progress.md`
- What was implemented
  - Moved the empty-state entry card out of the `TransformComponent` canvas layer into a fixed viewport overlay rendered via portal.
  - Top-biased the overlay with viewport padding so the card lands in the visible upper third instead of the old canvas-center position.
  - Added a Studio shell regression test that locks the entry card to a fixed viewport overlay outside the transformed canvas layer.
- **Learnings for future iterations:**
  - A viewport overlay for `/tutor` cannot live inside the canvas wrapper if the page chrome keeps the canvas below the fold; it must be fixed to the real viewport.
  - The shared `verify-entry-bugs.js` script is currently an omnibus check for `ENTRY-001/002/003`, so story-specific work needs an isolated browser proof when later stories are still open.
  - The entry overlay must keep `data-canvas-drag-disabled="true"` so the background pan handler ignores pointer starts from the card.
---

## [2026-03-29 00:44 CDT] - ENTRY-002: Material picker shows filenames not full paths
Thread: 
Run: 20260329-003111-28082 (iteration 1)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-003111-28082-iter-1.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-003111-28082-iter-1.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: 6febddff fix: show filename-only material labels in tutor entry card
- Post-commit status: `.agents/ralph/agents.sh`, `.agents/ralph/config.sh`, `.agents/tasks/prd.json`, `dashboard_rebuild/client/src/components/studio/StudioShell.tsx`, `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx`, `ralph.bat`, `.ralph/progress.md`, `.ralph/runs/`, `ralph-loop.bat`
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorShell.test.tsx client/src/pages/__tests__/tutor.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `dev-browser --connect --timeout 60 run C:\pt-study-sop\scripts\verify-entry-bugs.js` -> FAIL (`--connect` could not attach because Chrome remote debugging is not enabled on this machine)
  - Command: `dev-browser --timeout 60 run C:\pt-study-sop\scripts\verify-entry-bugs.js` -> FAIL (shared cross-story script failed only on unrelated ENTRY-003 panel-opening check after the ENTRY-002 path-label check passed)
  - Command: `dev-browser --timeout 60 run C:\Users\treyt\.dev-browser\tmp\verify-entry-002-targeted.js` -> PASS
- Files changed:
  - dashboard_rebuild/client/src/components/TutorShell.tsx
  - dashboard_rebuild/client/src/components/__tests__/TutorShell.test.tsx
  - .ralph/progress.md
- What was implemented
  - Added a small TutorShell helper that derives the entry-card material label from the basename of `material.title` or `material.source_path`, with `Unknown material` as the empty fallback.
  - Switched the entry-card checkbox rows to render the derived filename-safe label while keeping the existing file-type badge rendering unchanged.
  - Added a focused TutorShell regression that covers Windows-path titles, empty-title fallback to `source_path`, and badge preservation.
- **Learnings for future iterations:**
  - Patterns discovered
    - The Tutor entry-card material picker is isolated enough that a focused `TutorShell` regression plus a page integration run gives strong coverage without changing route code.
  - Gotchas encountered
    - `scripts/verify-entry-bugs.js` is a shared multi-story check, so ENTRY-002 live proof needed a targeted browser script once the shared script hit the unrelated ENTRY-003 failure.
    - `dev-browser --connect` currently cannot be relied on here unless Chrome is launched with remote debugging enabled.
  - Useful context
    - The repo already had unrelated dirty files before this run, so the ENTRY-002 commit had to stay scoped to the two TutorShell files.
---

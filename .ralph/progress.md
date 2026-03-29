# Progress Log
Started: Sun Mar 29 00:04:50 CDT 2026

## Codebase Patterns
- (add reusable patterns here)

---

## [2026-03-29 02:42 CDT] - OVERLAY-002: Add material upload button to entry card
Thread: 
Run: 20260329-022021-29765 (iteration 2)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-022021-29765-iter-2.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-022021-29765-iter-2.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: e9376693 feat: add tutor entry-card upload control
- Post-commit status: `clean`
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorShell.test.tsx client/src/pages/__tests__/tutor.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `dev-browser --connect --timeout 90 run C:/Users/treyt/.dev-browser/tmp/verify-overlay-002.js` -> PASS
  - Command: `dev-browser --connect --timeout 60 run C:/pt-study-sop/scripts/verify-overlay-polish.js` -> PASS
- Files changed:
  - `dashboard_rebuild/client/src/components/TutorShell.tsx`
  - `dashboard_rebuild/client/src/components/__tests__/TutorShell.test.tsx`
  - `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks/GENERAL/log.md`
  - `.agents/tasks/prd.json`
  - `.ralph/progress.md`
- What was implemented
  - Added a dashed entry-card upload area below the course material checklist, backed by a hidden file input with the requested `PDF`, `DOCX`, `MP4`, and `PPTX` accept list.
  - Reused `handleUploadSourceShelfFiles` so entry-card uploads stay scoped to the selected course, reuse the existing `sourceShelfUploading` progress state, and auto-select newly uploaded materials after refresh.
  - Added focused TutorShell and Tutor page regressions plus live browser verification to prove the upload button exists, opens a multi-file chooser, and refreshes the checklist after upload.
- **Learnings for future iterations:**
  - Patterns discovered
    - Reusing the existing upload handler is safe for alternate entry surfaces as long as the test suite proves the invalidation path that refreshes `chatMaterials` after upload.
  - Gotchas encountered
    - The shared `verify-overlay-polish.js` script still only covers `OVERLAY-001`, so `OVERLAY-002` needed a targeted temp `dev-browser` script for live proof.
  - Useful context
    - `sourceShelfUploading` already provided a shared in-flight state for both the Source Shelf and the entry card, so the upload progress indicator did not require any new async state plumbing.
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

## [2026-03-29 01:00 CDT] - ENTRY-001: Entry card renders as viewport overlay, not canvas object
Thread: 
Run: 20260329-003111-28082 (iteration 2)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-003111-28082-iter-2.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-003111-28082-iter-2.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: `be3e8a9e fix: harden ENTRY-001 overlay verification`
- Post-commit status: `.agents/ralph/agents.sh`, `.agents/ralph/config.sh`, `.agents/tasks/prd.json`, `ralph.bat` deleted, `.ralph/runs/`, `ralph-loop.bat`
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `dev-browser --timeout 60 run C:\pt-study-sop\scripts\verify-entry-bugs.js` -> FAIL (`ENTRY-001` checks all passed; unrelated `ENTRY-003` panel-open assertion still fails)
  - Command: `powershell -Command "$output = dev-browser --timeout 60 run C:\pt-study-sop\scripts\verify-entry-bugs.js 2>&1 | Out-String; $required = @('PASS: Entry card exists','PASS: Entry card has dimensions','PASS: Entry card is outside the transformed canvas layer','PASS: Entry card Y is in the upper third of viewport','PASS: Entry card Y is NOT at canvas center (2000+)','PASS: Entry card X is centered-ish','PASS: Canvas zoom control changes','PASS: Entry card does NOT move when the canvas is zoomed','PASS: Canvas transform changes after panning','PASS: Entry card does NOT move when the canvas is panned'); $missing = $required | Where-Object { $output -notmatch [regex]::Escape($_) }; if ($missing.Count -gt 0) { Write-Error ('Missing ENTRY-001 checks: ' + ($missing -join '; ')); exit 1 }"` -> PASS
- Files changed:
  - `scripts/verify-entry-bugs.js`
  - `conductor/tracks/GENERAL/log.md`
  - `.ralph/progress.md`
- What was implemented
  - Revalidated that the live `/tutor` runtime already renders the entry card as a fixed viewport overlay outside the transformed canvas layer, with the card pinned in the visible upper third of the viewport instead of the old canvas-center position.
  - Hardened `scripts/verify-entry-bugs.js` so ENTRY-001 now measures viewport-relative geometry, scrolls to the canvas controls before interaction, and proves the entry card stays stationary while the canvas zooms and pans.
  - Recorded the ENTRY-001 verification outcome in the general conductor log so the repo history captures why the omnibus script is still red overall while this story is green.
- **Learnings for future iterations:**
  - Patterns discovered
    - For `/tutor`, viewport placement must be verified with `getBoundingClientRect()` rather than Playwright `boundingBox()` because page-space Y values become misleading once the route scroll position changes.
  - Gotchas encountered
    - The shared `verify-entry-bugs.js` script is a multi-story gate; it can legitimately exit non-zero after ENTRY-001 passes if ENTRY-003 is still open.
    - Canvas zoom/pan interactions need an explicit scroll into the Studio controls first because the live canvas sits below the initial fold on this route.
- Useful context
    - `StudioShell.tsx` already contained the real viewport-overlay implementation from the earlier fix; this iteration’s durable value was strengthening the live verification so the story’s acceptance criteria are proved directly.
---

## [2026-03-29 01:22 CDT] - ENTRY-003: Auto-center panels after Start Priming opens them
Thread: 
Run: 20260329-011356-29630 (iteration 1)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-011356-29630-iter-1.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-011356-29630-iter-1.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: 87c44d8a fix: auto-center priming preset panels after launch
- Post-commit status: `clean`
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx client/src/pages/__tests__/tutor.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `dev-browser --connect --timeout 60 run C:/pt-study-sop/scripts/verify-entry-bugs.js` -> PASS
- Files changed:
  - `dashboard_rebuild/client/src/pages/tutor.tsx`
  - `dashboard_rebuild/client/src/components/TutorShell.tsx`
  - `dashboard_rebuild/client/src/components/studio/StudioShell.tsx`
  - `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx`
  - `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks/GENERAL/log.md`
  - `.ralph/progress.md`
- What was implemented
  - Restored the entry-card `Start Priming` route so a successful workflow bootstrap opens the `priming` preset instead of leaving the Studio canvas empty.
  - Added a one-shot external focus request path into `StudioShell` that reuses `focusOpenPanels()` after a 300ms delay, which frames the freshly opened panels with viewport padding.
  - Updated the focused Studio shell and Tutor route regressions so the Start Priming path now expects the preset panels to appear immediately and the shell to auto-fit externally opened layouts.
- **Learnings for future iterations:**
  - Patterns discovered
    - External preset opens need an explicit shell-level focus request; changing `panelLayout` from a parent route is not enough to auto-frame the new layout.
  - Gotchas encountered
    - Older `/tutor` regressions still encoded the HUD-243 empty-canvas behavior, so this story required updating route expectations as well as the shell implementation.
  - Useful context
    - `focusOpenPanels()` is the right helper for Start Priming because it fits the full priming preset with padding, while `centerOpenPanels()` preserves zoom and can still clip a multi-panel preset on smaller viewports.
---

## [2026-03-29 02:30 CDT] - OVERLAY-001: Entry card gets dark backdrop and blocks canvas interaction
Thread: 
Run: 20260329-022021-29765 (iteration 1)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-022021-29765-iter-1.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-022021-29765-iter-1.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: `12a1bca1 fix: harden tutor entry overlay backdrop`
- Post-commit status: `clean`
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx client/src/pages/__tests__/tutor.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `dev-browser --connect --timeout 60 run C:/pt-study-sop/scripts/verify-overlay-polish.js` -> PASS
- Files changed:
  - `dashboard_rebuild/client/src/components/studio/StudioShell.tsx`
  - `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx`
  - `scripts/verify-overlay-polish.js`
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks/GENERAL/log.md`
  - `.agents/tasks/prd.json`
  - `.ralph/progress.md`
- What was implemented
  - Turned `studio-entry-overlay` into a real fullscreen `bg-black/70` backdrop with wheel, pointer-down, and click interception so the canvas cannot pan or zoom under the entry card.
  - Restyled `studio-entry-state` with the darker bordered `bg-black/90` / `border-primary/20` / `shadow-2xl` treatment and added focused StudioShell regressions for backdrop clicks plus wheel blocking.
  - Scoped `scripts/verify-overlay-polish.js` to `OVERLAY-001` and made it verify the live backdrop, canvas-event blocking, and entry-card text contrast on `/tutor`.
- **Learnings for future iterations:**
  - Patterns discovered
    - Because the entry card is portaled outside the transformed canvas, making the wrapper `pointer-events-auto` is what actually blocks the underlying canvas; the extra stopPropagation hooks are mainly there to keep React-tree ancestors and tests honest.
  - Gotchas encountered
    - Browser-computed colors on this route come back as a mix of `oklab(...)`, `rgb(...)`, and `rgba(...)`, so live verification needs format-agnostic alpha parsing.
    - `dev-browser` screenshots can hang while fonts settle even after all checks pass, so screenshot capture should stay best-effort instead of failing the story after green assertions.
  - Useful context
    - `dev-browser --connect` worked against the live local dashboard for this run, so the overlay verification can stay on the shared script path for follow-on entry-card stories.
---

## [2026-03-29 02:53 CDT] - OVERLAY-003: Rename Open Full Studio button and clean up Resume logic
Thread: 
Run: 20260329-022021-29765 (iteration 3)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-022021-29765-iter-3.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-022021-29765-iter-3.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: `ba5bc107 fix: clean up tutor overlay resume actions`
- Post-commit status: `clean`
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorShell.test.tsx client/src/pages/__tests__/tutor.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `dev-browser --connect --timeout 60 run C:/pt-study-sop/scripts/verify-overlay-polish.js` -> PASS
  - Command: `dev-browser --connect --timeout 60 run C:/Users/treyt/.dev-browser/tmp/verify-overlay-003-console.js` -> PASS
- Files changed:
  - `dashboard_rebuild/client/src/components/TutorShell.tsx`
  - `dashboard_rebuild/client/src/lib/tutorResumeCandidate.ts`
  - `dashboard_rebuild/client/src/components/__tests__/TutorShell.test.tsx`
  - `dashboard_rebuild/client/src/pages/tutor.tsx`
  - `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
  - `scripts/verify-overlay-polish.js`
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks/GENERAL/log.md`
  - `.ralph/progress.md`
- What was implemented
  - Renamed the entry-card secondary action from `Open Full Studio` to `Skip Setup` while preserving the existing `applyCanvasPreset("full_studio")` behavior.
  - Added a shared `resolveResumableTutorHubCandidate` helper so both the entry card and the Tutor hero only render Resume when the hub candidate is truly resumable (`can_resume` plus a non-empty `session_id`).
  - Extended the focused TutorShell and Tutor page regressions plus the live overlay verification script to lock the new label and the cleaned-up resume visibility rules.
- **Learnings for future iterations:**
  - Patterns discovered
    - The Tutor hub can return placeholder resume metadata even when no session is resumable, so UI surfaces should normalize that payload into a real candidate or `null` before using simple truthy checks.
  - Gotchas encountered
    - Existing `/tutor` page assertions still encoded the old `Open Full Studio` label and the old placeholder-resume behavior, so the story needed route-level regression updates as well as the entry-card change.
  - Useful context
    - `scripts/verify-overlay-polish.js` is now broad enough to cover both the overlay backdrop contract and the entry-card copy change, while a short `dev-browser` temp script can cheaply confirm the live route stays free of console and page errors after the build.
---

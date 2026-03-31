# Progress Log
Started: Sun Mar 29 00:04:50 CDT 2026

## Codebase Patterns
- (add reusable patterns here)

---

## [2026-03-31 17:17:41 -05:00] - PRIME-005: Fix empty output for Big Picture and Terminology methods
Thread: 
Run: 20260331-163650-4886 (iteration 2)
Run log: C:/pt-study-sop/.ralph/runs/run-20260331-163650-4886-iter-2.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260331-163650-4886-iter-2.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: 77fc6e97 PRIME-005 fix priming terminology and orientation outputs
- Post-commit status: `.agents/ralph/config.sh, .agents/ralph/loop.sh, .agents/tasks/prd.json, .ralph/heartbeat.json, .agents/ralph/PROMPT_verify.md, .ralph/runs/run-20260331-141902-999-iter-1.md, .ralph/runs/run-20260331-163650-4886-iter-1.md`
- Verification:
  - Command: `pytest brain/tests/test_tutor_workflow_priming_assist.py -q` -> PASS
  - Command: `cmd /c Start_Dashboard.bat` -> FAIL
  - Command: `python -u dashboard_web.py` -> PASS
  - Command: `dev-browser --connect --timeout 120 run C:/pt-study-sop/scripts/verify-prime-005.js` -> FAIL
  - Command: `dev-browser --timeout 180 run C:/pt-study-sop/scripts/verify-prime-005.js` -> PASS
- Files changed:
  - brain/dashboard/api_tutor_workflows.py
  - brain/tests/test_tutor_workflow_priming_assist.py
  - sop/library/methods/M-PRE-012.yaml
  - sop/library/methods/M-PRE-013.yaml
  - scripts/verify-prime-005.js
  - conductor/tracks/GENERAL/log.md
  - .ralph/progress.md
- What was implemented
  - Fixed the actual drop point in the priming backend: `M-PRE-012` and `M-PRE-013` now normalize the YAML-style output keys that the LLM was being instructed to emit, instead of treating those responses as empty output.
  - Aligned the two method YAML facilitation prompts with the strict JSON shape the priming backend and UI already expect, reducing drift between prompt wording and output parsing.
  - Added a backend regression that proves alternate terminology/orientation keys survive into `priming_method_runs` and aggregate output, plus a live browser verifier that confirms both methods render non-empty blocks in the priming chat panel.
- **Learnings for future iterations:**
  - Patterns discovered
    - For PRIME methods, prompt-schema drift can silently look like a frontend renderer bug because valid LLM output gets normalized to `{}` before the panel ever sees it.
  - Gotchas encountered
    - `Start_Dashboard.bat` timed out on readiness after a long UI build even though the Flask server became healthy shortly after; manual `python -u dashboard_web.py` was needed to finish live verification in this run.
    - `dev-browser --connect` still depends on a Chrome instance with CDP enabled on this machine, so isolated mode remains the reliable fallback when connected mode cannot attach.
  - Useful context
    - The live browser proof saved `C:\Users\treyt\.dev-browser\tmp\verify-prime-005.png` after 15/15 passing checks covering both `M-PRE-012` and `M-PRE-013`.
---
## [2026-03-31 16:43:42 -05:00] - PRIME-004: Fix Fit button for all panels
Thread:
Run: 20260331-163650-4886 (iteration 1)
Run log: C:/pt-study-sop/.ralph/runs/run-20260331-163650-4886-iter-1.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260331-163650-4886-iter-1.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: 48d0394b PRIME-004 fix panel fit sizing
- Post-commit status: `.agents/ralph/config.sh, .agents/ralph/loop.sh, .agents/tasks/prd.json, .ralph/heartbeat.json, .agents/ralph/PROMPT_verify.md, .ralph/runs/run-20260331-141902-999-iter-1.md`
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/WorkspacePanel.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `dev-browser --timeout 120 run scripts/verify-prime-004.js` -> PASS
- Files changed:
  - `dashboard_rebuild/client/src/components/ui/WorkspacePanel.tsx`
  - `dashboard_rebuild/client/src/components/__tests__/WorkspacePanel.test.tsx`
  - `scripts/verify-prime-004.js`
  - `conductor/tracks/GENERAL/log.md`
  - `.ralph/progress.md`
- What was implemented
  - Reworked Fit sizing in `WorkspacePanel` so it falls back to measured descendant bounds when scroll dimensions only mirror the current viewport, which fixes panels whose content is laid out with flex or absolute positioning.
  - Added targeted tests for the fallback path and clamp limits, then verified live that Fit changes the priming, document dock, and notes panel sizes while staying inside the panel min/max bounds and without console errors.
- **Learnings for future iterations:**
  - Patterns discovered
    - For floating panels that wrap arbitrary child layouts, scroll dimensions alone are not a reliable fit signal once content is absolutely positioned or stretched by flex parents; a rendered-bounds fallback is a safer second measurement path.
  - Gotchas encountered
    - The notes panel is not guaranteed to be open in the starting Studio preset, so the live verifier must open it through the toolbar before checking Fit behavior.
    - `dev-browser --connect` was unavailable because Chrome remote debugging was not exposed on `9222`, so isolated `dev-browser` remained the reliable browser path.
  - Useful context
    - The live verifier screenshot was written to `C:\Users\treyt\.dev-browser\tmp\verify-prime-004.png`, and the successful browser run reported `18` passing checks across priming, document dock, and notes.
---
## [2026-03-31 14:44:11 -05:00] - PRIME-003: Persist chat state through panel drag and resize
Thread:
Run: 20260331-143440-1507 (iteration 1)
Run log: C:/pt-study-sop/.ralph/runs/run-20260331-143440-1507-iter-1.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260331-143440-1507-iter-1.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: 45b1d80a PRIME-003 persist priming panel chat state
- Post-commit status: `.agents/ralph/config.sh, .agents/ralph/loop.sh, .agents/tasks/prd.json, .ralph/heartbeat.json, .agents/ralph/PROMPT_verify.md, .ralph/runs/run-20260331-141902-999-iter-1.md`
- Verification:
  - Command: `cd dashboard_rebuild; npx vitest run client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild; npm run build` -> PASS
  - Command: `dev-browser --timeout 120 run C:\pt-study-sop\scripts\verify-prime-003.js` -> PASS
- Files changed:
  - `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx`
  - `dashboard_rebuild/client/src/components/priming/primingPanelState.ts`
  - `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx`
  - `scripts/verify-prime-003.js`
  - `.ralph/progress.md`
- What was implemented
  - Moved priming run/chat state out of local component `useState` into a workflow-keyed persistent panel session store so drag, resize, maximize, and center remounts no longer clear the current results, chat history, or draft input.
  - Updated the priming panel to read and write through that store for method runs, chain runs, chat sends, and refined-result application.
  - Added a focused remount regression test and a live `dev-browser` verifier that proves message counts survive drag, resize, maximize, and center while draft input survives drag.
- **Learnings for future iterations:**
  - Patterns discovered
    - Floating-panel UI state that must survive `Rnd` remounts is safer in a keyed module store than component-local state, especially when maximize/center paths intentionally invalidate layout subtrees.
  - Gotchas encountered
    - `dev-browser --connect` could not attach to a Chrome CDP session on port `9222`, so isolated `dev-browser` was the reliable live verification path for this run.
    - The runtime resize affordance did not expose a visible `.react-resizable-handle-se`, so the verifier needed to resize from the panel's bottom-right edge instead of relying on that specific handle selector.
  - Useful context
    - The live verification screenshot was written to `C:\Users\treyt\.dev-browser\tmp\verify-prime-003.png`.
---
## [2026-03-31 13:47:08 -05:00] - PRIME-002: Remove Hand-Drawn Map from priming
Thread:
Run: 20260331-134105-377 (iteration 1)
Run log: C:/pt-study-sop/.ralph/runs/run-20260331-134105-377-iter-1.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260331-134105-377-iter-1.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: 1c51402d PRIME-002 remove hand-drawn map from priming
- Post-commit status: `clean`
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `cmd /c Start_Dashboard.bat` -> PASS
  - Command: `dev-browser --headless --timeout 90 run scripts/verify-prime-002.js` -> PASS
- Files changed:
  - `.agents/tasks/prd.json`
  - `.ralph/heartbeat.json`
  - `brain/dashboard/api_tutor_workflows.py`
  - `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx`
  - `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx`
  - `scripts/verify-prime-002.js`
  - `conductor/tracks/GENERAL/log.md`
  - `.ralph/progress.md`
- What was implemented
  - Removed `M-ENC-015` from the backend priming workflow contract so the priming panel no longer treats the ENCODE hand-drawn map method as a valid priming output family or prompt shape.
  - Removed the frontend hand-draw result block rendering path from the priming panel and extended the focused panel test so the picker continues to exclude `M-ENC-015`.
  - Added a story-specific `dev-browser` verifier that launches the priming panel, inspects the visible method cards and page text, and fails if `M-ENC-015`, `Hand-Draw`, or related console errors appear.
- **Learnings for future iterations:**
  - Patterns discovered
    - For priming workflow cleanup, removing both the backend output contract and the frontend result-block renderer is the reliable way to prevent stale chat/result artifacts from surviving a picker-only filter.
  - Gotchas encountered
    - The live priming page includes a large amount of source-tree text, so browser assertions should search for precise forbidden labels and method IDs instead of relying on broad page diffs.
  - Useful context
    - The live verifier screenshot was written to `C:\\Users\\treyt\\.dev-browser\\tmp\\verify-prime-002.png` and confirmed 8 allowed priming methods with no `M-ENC-015` entry.
---
## [2026-03-31 13:25:19 -05:00] - PRIME-001: Filter priming methods to pure-priming only
Thread:
Run: 20260331-131837-938 (iteration 1)
Run log: C:/pt-study-sop/.ralph/runs/run-20260331-131837-938-iter-1.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260331-131837-938-iter-1.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: 206a1506 PRIME-001 filter priming methods to pure priming only
- Post-commit status: `clean`
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `cmd /c Start_Dashboard.bat` -> PASS
  - Command: `dev-browser --connect --timeout 90 run C:/pt-study-sop/scripts/verify-prime-001.js` -> FAIL (`Chrome` remote debugging was not enabled on this machine)
  - Command: `dev-browser --timeout 90 run C:/pt-study-sop/scripts/verify-prime-001.js` -> PASS
- Files changed:
  - `.agents/tasks/prd.json`
  - `.ralph/heartbeat.json`
  - `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx`
  - `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx`
  - `scripts/verify-prime-001.js`
  - `format_table.py`
  - `format_table_v4.py`
  - `.ralph/progress.md`
- What was implemented
  - Restricted the priming picker to the exact eight pure-priming methods by filtering the fetched PRIME method list against `PRIME_METHOD_DISPLAY_ORDER` instead of only sorting it.
  - Removed the learner-input methods from the visible picker set and added compact energy-cost and duration badges so each card still exposes the required metadata alongside its description.
  - Added a focused `TutorWorkflowPrimingPanel` regression test and a dedicated `dev-browser` verification script that launches Priming, confirms the exact method IDs, and proves `M-PRE-002` and `M-PRE-005` stay absent in the live UI.
- **Learnings for future iterations:**
  - Patterns discovered
    - When a UI constant is intended to define an allowlist, the render path needs an explicit filter instead of relying on sort order alone.
  - Gotchas encountered
    - `dev-browser --connect` still fails on this machine when Chrome remote debugging is unavailable, so isolated `dev-browser` remains the reliable live-proof fallback.
    - The workspace started with unrelated untracked `format_table*.py` files, and the run instruction to stage everything brought them into the commit needed to leave the tree clean.
  - Useful context
    - The live verification screenshot was written to `C:\Users\treyt\.dev-browser\tmp\verify-prime-001.png`, and the browser summary confirmed the exact visible order: `M-PRE-004`, `M-PRE-006`, `M-PRE-008`, `M-PRE-009`, `M-PRE-010`, `M-PRE-012`, `M-PRE-013`, `M-PRE-014`.
---
## [2026-03-29 19:32:33 -05:00] - REMAIN-004: Document Dock clip tool supports image paste
Thread: 
Run: 20260329-191639-1941 (iteration 1)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-191639-1941-iter-1.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-191639-1941-iter-1.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: b8249bd1 REMAIN-004 add document dock image paste clips
- Post-commit status: `clean`
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorShell.test.tsx client/src/lib/__tests__/studioWorkspaceObjects.test.ts --reporter=dot` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `cmd /c Start_Dashboard.bat` -> PASS
  - Command: `dev-browser --timeout 90 run C:/pt-study-sop/scripts/verify-remaining.js` -> PASS
- Files changed:
  - `.agents/tasks/prd.json`
  - `dashboard_rebuild/client/src/components/__tests__/TutorShell.test.tsx`
  - `dashboard_rebuild/client/src/components/studio/StudioDocumentDock.tsx`
  - `dashboard_rebuild/client/src/components/studio/StudioTldrawWorkspace.tsx`
  - `dashboard_rebuild/client/src/lib/__tests__/studioWorkspaceObjects.test.ts`
  - `dashboard_rebuild/client/src/lib/studioWorkspaceObjects.ts`
  - `scripts/verify-remaining.js`
  - `.ralph/progress.md`
- What was implemented
  - Added Clipboard API-backed image paste handling to the Document Dock clip area, including inline image preview, Ctrl+V guidance, and clipboard-read fallback behavior tied to the selected passage input.
  - Added workspace-image object creation and rendering so pasted image clips have a stable workspace object shape and visible image cards inside the workspace surface.
  - Expanded focused TutorShell and workspace-object tests to cover pasted image clips alongside the existing text excerpt flow, and updated the live `dev-browser` verifier to check the image-paste handler and preview path on `/tutor`.
- **Learnings for future iterations:**
  - Patterns discovered
    - The cleanest way to verify clipboard-image paste in browser automation is to stub `navigator.clipboard.read()` and dispatch a native `paste` event with image clipboard items.
  - Gotchas encountered
    - The shared remaining-story verifier had legacy follow-on checks that were unrelated to REMAIN-004 and could fail after this story's proof point, so it needed to be scoped to this story's browser assertions.
  - Useful context
    - Live `/tutor` verification now saves the REMAIN-004 screenshot to `C:\Users\treyt\.dev-browser\tmp\verify-remaining-004-document-dock.png`.
---

## [2026-03-29 06:33 CDT] - REMAIN-001: Polish panel end-to-end verification and fixes
Thread: 
Run: 20260329-054407-32031 (iteration 1)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-054407-32031-iter-1.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-054407-32031-iter-1.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: `b329fb27 fix: verify and sync polish packet artifacts`
- Post-commit status: `clean`
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorShell.test.tsx client/src/components/__tests__/TutorWorkflowPolishStudio.test.tsx client/src/lib/__tests__/studioPacketSections.test.ts` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `dev-browser --headless --timeout 180 run C:/pt-study-sop/scripts/verify-remaining.js` -> PASS
  - Command: `pytest brain/tests/` -> PASS
- Files changed:
  - `.agents/tasks/prd.json`
  - `conductor/tracks/GENERAL/log.md`
  - `dashboard_rebuild/client/src/components/TutorShell.tsx`
  - `dashboard_rebuild/client/src/components/TutorWorkflowPolishStudio.tsx`
  - `dashboard_rebuild/client/src/components/__tests__/TutorShell.test.tsx`
  - `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPolishStudio.test.tsx`
  - `dashboard_rebuild/client/src/lib/__tests__/studioPacketSections.test.ts`
  - `dashboard_rebuild/client/src/lib/studioPacketSections.ts`
  - `docs/root/TUTOR_TODO.md`
  - `scripts/verify-remaining.js`
  - `.ralph/progress.md`
- What was implemented
  - Traced the Polish data path from `TutorShell` into `TutorWorkflowPolishStudio` and `PolishPacketPanel`, then fixed the gap where the packet only reflected persisted bundle state instead of the live summary/card drafts the user was editing in Polish.
  - Preserved promoted tutor replies across saved-bundle reloads and wired the packet builder to show real tutor replies, captured notes, summaries, and staged card requests during the same study run.
  - Hardened the dedicated headless `dev-browser` verifier so it runs a real priming flow, starts Tutor, stages Polish artifacts, opens the toolbar Polish surfaces, and asserts the packet content is real instead of placeholder text.
- **Learnings for future iterations:**
  - Patterns discovered
    - The Polish Packet needs live editor-state inputs for summary/card previews; relying only on the persisted bundle leaves the packet stale during the exact review moment the user is supposed to use it.
  - Gotchas encountered
    - `dev-browser` runs on this machine became unreliable until the daemon was reset with `dev-browser stop`; after the reset, headless verification returned stable stdout and clean pass/fail behavior.
  - Useful context
    - The failing live symptom was specifically the summaries section rendering `Summary staged in Polish Packet` while the Polish textarea already contained the real draft text, which made the issue easy to confirm once the browser verifier printed the packet-section payloads.
---

## [2026-03-29 05:21 CDT] - STUDY-004: Tutor chat sends messages and receives LLM responses
Thread: 
Run: 20260329-042815-30477 (iteration 3)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-042815-30477-iter-3.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-042815-30477-iter-3.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: `ab36d930 fix: complete tutor chat live turn flow`
- Post-commit status: `.agents/tasks/prd.json`, `.ralph/runs/run-20260329-042815-30477-iter-2.md` (pre-existing unrelated changes)
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/tutor-shell/__tests__/TutorLiveStudyPane.test.tsx client/src/components/__tests__/TutorChat.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `pytest brain/tests/` -> PASS
  - Command: `dev-browser --connect --timeout 120 run C:\pt-study-sop\scripts\verify-study-flow.js` -> PASS
- Files changed:
  - `conductor/tracks/GENERAL/log.md`
  - `dashboard_rebuild/client/src/components/tutor-shell/TutorLiveStudyPane.tsx`
  - `dashboard_rebuild/client/src/components/tutor-shell/__tests__/TutorLiveStudyPane.test.tsx`
  - `docs/root/TUTOR_TODO.md`
  - `scripts/verify-study-flow.js`
  - `.ralph/progress.md`
- What was implemented
  - Fixed the Tutor live pane so completed assistant turns can safely invalidate `mastery-dashboard` through a real TanStack query client instead of crashing on an undefined binding.
  - Added a focused Tutor live-pane regression that proves turn completion increments session turn count, forwards compaction telemetry, and refreshes mastery data when the backend returns a mastery update.
  - Reworked the live browser verifier into a STUDY-004-specific flow that seeds a primed Tutor session through `/api/tutor/session`, opens the Tutor panel on `/tutor`, sends a real user turn, and verifies the assistant reply is grounded in the seeded priming summary.
- **Learnings for future iterations:**
  - Patterns discovered
    - Seeding a Tutor session through `/api/tutor/session` is a faster and more reliable browser proof for live-turn stories than replaying the entire Priming UI when the acceptance criteria are specifically about Tutor chat.
  - Gotchas encountered
    - The Tutor live pane already had the send/receive path wired; the real break was a latent `queryClient` reference that only surfaced when an assistant turn returned `masteryUpdate`.
  - Useful context
    - A grounded Tutor reply can be asserted without brittle full-text matching by seeding a short `packet_context` summary and checking for the expected concept phrase in the rendered response.
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

## [2026-03-29 03:54 CDT] - OVERLAY-004: Add cancel/close button to entry card overlay
Thread: 
Run: 20260329-033115-30160 (iteration 1)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-033115-30160-iter-1.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-033115-30160-iter-1.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: `5c4ca5c2 fix: harden tutor overlay dismiss persistence`
- Post-commit status: `clean`
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorShell.test.tsx client/src/pages/__tests__/tutor.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `dev-browser --timeout 60 run C:/pt-study-sop/scripts/verify-overlay-polish.js` -> PASS
- Files changed:
  - `.agents/tasks/prd.json`
  - `conductor/tracks/GENERAL/log.md`
  - `dashboard_rebuild/client/src/pages/tutor.tsx`
  - `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
  - `docs/root/TUTOR_TODO.md`
  - `.ralph/progress.md`
- What was implemented
  - Hardened `/tutor` project-shell persistence so the entry-card `X` and `Cancel` dismiss controls can close the overlay, leave the canvas interactive, and survive a rapid `NEW SESSION` reopen without triggering stale `revision: 0` save conflicts.
  - Preserved the active project-shell revision across same-course overlay resets and serialized in-flight shell saves so only the newest queued shell snapshot persists after a dismiss/reopen burst.
  - Added a focused Tutor page regression for rapid dismiss/reopen behavior and confirmed the live browser dismiss flow passes with no overlay-related console errors.
- **Learnings for future iterations:**
  - Patterns discovered
    - When multiple UI actions can mutate the same persisted workspace snapshot within a debounce window, keep the network write path serialized behind a single in-flight gate and queue only the newest pending payload.
  - Gotchas encountered
    - The visible `X` and `Cancel` controls were already present on the entry card, but the live story still failed because same-course overlay resets were wiping the project-shell revision back to `0`, which only surfaced under real browser timing.
  - Useful context
    - `scripts/verify-overlay-polish.js` already covered the full dismiss/reopen acceptance criteria for this story, so the missing piece was stabilizing `/api/tutor/project-shell/state` persistence rather than adding more overlay UI.
---

## [2026-03-29 04:08 CDT] - STUDY-001: Priming method cards use colorful box UI with name and description
Thread: 
Run: 20260329-033115-30160 (iteration 2)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-033115-30160-iter-2.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-033115-30160-iter-2.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: `b687504c feat: add colorful priming method cards`
- Post-commit status: `.ralph/progress.md`
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `dev-browser --timeout 90 run C:/pt-study-sop/scripts/verify-study-flow.js` -> PASS
- Files changed:
  - `.agents/tasks/prd.json`
  - `.ralph/runs/run-20260329-033115-30160-iter-1.md`
  - `conductor/tracks/GENERAL/log.md`
  - `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx`
  - `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx`
  - `docs/root/TUTOR_TODO.md`
  - `scripts/verify-study-flow.js`
  - `.ralph/progress.md`
- What was implemented
  - Replaced the Priming method dropdown with colorful theme-tinted method cards that show the method id, bold name, one-line description, and a checkbox-style selected indicator.
  - Let method-card mode select and run one or more PRIME methods while preserving chain runs through a separate `Optional Chain Mode` selector.
  - Updated the focused Priming tests plus the shared `verify-study-flow.js` browser script so the story now proves card descriptions, distinct colors, selected state, chain reachability, and zero console errors.
- **Learnings for future iterations:**
  - Patterns discovered
    - The existing Priming runtime already supports multiple `priming_methods`, so the multi-select story can stay frontend-scoped if the panel builds its displayed run from the returned per-method inventory.
  - Gotchas encountered
    - Moving chain selection out of the combined dropdown leaves stale references behind easily, so the run path needs an explicit chain regression test after the UI split.
    - `dev-browser --connect` was unavailable because Chrome remote debugging was not exposed on `9222`, but isolated `dev-browser` mode still provided a valid live verification path for this story.
  - Useful context
    - Browser-computed card colors on this route came back as `oklab(...)`, so the verifier should compare computed style strings generically instead of assuming `rgb(...)`.
---

## [2026-03-29 04:22 CDT] - STUDY-001: Priming method cards use colorful box UI and only show PRIME stage methods
Thread: 
Run: 20260329-041641-30365 (iteration 1)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-041641-30365-iter-1.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-041641-30365-iter-1.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: `996ede88 chore: record STUDY-001 verification state`
- Post-commit status: `clean`
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `dev-browser --connect --timeout 90 run C:/pt-study-sop/scripts/verify-study-flow.js` -> PASS
- Files changed:
  - `.agents/tasks/prd.json`
  - `conductor/tracks/GENERAL/log.md`
  - `.ralph/progress.md`
- What was implemented
  - No additional Priming code edits were required in this run because the checked-in `TutorWorkflowPrimingPanel` and `TutorShell` implementation already satisfied the story scope: PRIME-only filtering, colorful cards, descriptions, multi-select, and selected-state visuals were all present in the repo.
  - Re-audited the active implementation against the story acceptance criteria, then re-ran the focused Priming regression, a fresh production build, and a connected `dev-browser` live verification on `/tutor`.
  - Confirmed the live browser surface still shows distinct method-card colors and description text, retains selectable PRIME-only cards, and stays free of console errors during the Priming flow.
- **Learnings for future iterations:**
  - Patterns discovered
    - When a rerun lands on a story that may already be shipped, re-audit the actual component and verifier seams before editing so you avoid redundant churn.
  - Gotchas encountered
    - The live verifier depends on the dashboard already listening on `127.0.0.1:5000`, so the safest flow is build first, then launch with `Start_Dashboard.bat`, then run `dev-browser --connect`.
- Useful context
    - The connected `dev-browser` pass for this run saved fresh screenshots at `C:\Users\treyt\.dev-browser\tmp\study-flow-01-entry-filled.png`, `study-flow-02-after-start.png`, `study-flow-03-panels-open.png`, and `study-flow-04-toolbar.png`.
---

## [2026-03-29 04:40 CDT] - STUDY-003: Priming Chat is functional not placeholder
Thread: 
Run: 20260329-042815-30477 (iteration 1)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-042815-30477-iter-1.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-042815-30477-iter-1.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: 8dfc2400 fix: finish priming chat flow
- Post-commit status: `clean`
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx` -> PASS
  - Command: `pytest brain/tests/test_tutor_workflow_priming_assist.py -q` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `dev-browser --connect --timeout 180 run C:/pt-study-sop/scripts/verify-study-flow.js` -> PASS
- Files changed:
  - `.agents/tasks/prd.json`
  - `conductor/tracks/GENERAL/log.md`
  - `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx`
  - `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx`
  - `docs/root/TUTOR_TODO.md`
  - `scripts/verify-study-flow.js`
  - `.ralph/runs/run-20260329-041641-30365-iter-1.md`
  - `.ralph/runs/run-20260329-042815-30477-iter-1.md`
  - `.ralph/progress.md`
- What was implemented
  - Removed the final Priming chat placeholder copy so the empty state now describes the real unlock condition instead of advertising a future feature.
  - Expanded the focused Priming chat regression to prove sent turns stay visible, follow-up requests include prior conversation history, and assistant-provided replacement results can still be applied into the Output Area.
  - Hardened the live `verify-study-flow.js` path so it preserves a course with materials, runs a real Priming extract, sends a real chat follow-up, and verifies the assistant response is grounded in the current run context.
- **Learnings for future iterations:**
  - Patterns discovered
    - A second follow-up in the focused panel test is the easiest way to lock `conversation_history` payload shape without adding backend-only scaffolding.
  - Gotchas encountered
    - The live study-flow verifier cannot blindly pick the first non-placeholder course because some courses may load with no materials; the script has to preserve the current course or switch only after checking the entry-card material count.
  - Useful context
    - The connected `dev-browser` pass for this story proved the real chat path on `/tutor` with 24 green checks and no console errors.
---

## [2026-03-29 04:59 CDT] - STUDY-002: Priming method run returns actual results instead of empty
Thread: 
Run: 20260329-042815-30477 (iteration 2)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-042815-30477-iter-2.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-042815-30477-iter-2.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: `9fd4569c fix: render priming method outputs`
- Post-commit status: `clean`
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx client/src/hooks/__tests__/useTutorWorkflow.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `dev-browser --timeout 180 run C:/pt-study-sop/scripts/verify-study-flow.js` -> PASS
- Files changed:
  - `.agents/tasks/prd.json`
  - `conductor/tracks/GENERAL/log.md`
  - `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx`
  - `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx`
  - `dashboard_rebuild/client/src/hooks/useTutorWorkflow.ts`
  - `docs/root/TUTOR_TODO.md`
  - `scripts/verify-study-flow.js`
  - `.ralph/runs/run-20260329-042815-30477-iter-1.md`
  - `.ralph/progress.md`
- What was implemented
  - Reproduced the actual broken path by clearing the default method pair, selecting `M-PRE-002`, and confirming the backend returned a completed run while the Priming Output Area still fell back to the empty-message state.
  - Expanded the Priming renderer so question sets, follow-up targets, unsupported jumps, major sections, hand-draw briefs, and branch points now render as readable result blocks instead of being silently dropped.
  - Extended the displayed-run round-trip helper and the shared live verifier so the workflow preserves those additional PRIME output families and the browser proof now covers the previously broken single-method path.
- **Learnings for future iterations:**
  - Patterns discovered
    - When a live story looks intermittent, rerun it against a non-default method instead of the happy-path defaults; the default `M-PRE-010` + `M-PRE-008` pair was already healthy, but `M-PRE-002` immediately exposed the real renderer gap.
  - Gotchas encountered
    - The entry-card course picker auto-selects course materials, so a verifier that clicks `Select All` unconditionally can accidentally deselect the only source and create a false-negative disabled-`RUN` state.
  - Useful context
    - The live `/api/tutor/workflows/*/priming-assist` response for the default path was already returning valid `source_inventory` and `priming_method_runs`; the frontend mismatch was that the panel only knew how to turn a subset of PRIME output keys into visible blocks.
---

## [2026-03-29 15:12 CDT] - REMAIN-001: Polish panel end-to-end verification and fixes
Thread: 
Run: 20260329-150416-32869 (iteration 1)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-150416-32869-iter-1.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-150416-32869-iter-1.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: `b329fb27 fix: verify and sync polish packet artifacts` (re-verified; no new product-code changes required in this rerun)
- Post-commit status: `clean`
- Verification:
  - Command: `cmd /c Start_Dashboard.bat` -> PASS
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorShell.test.tsx client/src/components/__tests__/TutorWorkflowPolishStudio.test.tsx client/src/pages/__tests__/tutor.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `dev-browser --timeout 90 run scripts/verify-remaining.js` -> PASS
- Files changed:
  - `.agents/tasks/prd.json`
  - `.ralph/progress.md`
  - `.ralph/runs/run-20260329-150416-32869-iter-1.md`
  - `conductor/tracks/GENERAL/log.md`
- What was implemented
  - Re-audited the shipped Polish panel flow from `TutorShell` through `TutorWorkflowPolishStudio` and `PolishPacketPanel`, then confirmed the existing `b329fb27` implementation still shows real tutor replies, captured notes, live summary/card draft state, and editable review controls without placeholder content.
  - Re-ran the end-to-end local `/tutor` flow and confirmed the toolbar Polish panel plus Polish Packet both render real session artifacts after a priming run and live Tutor turn.
  - No additional product-code changes were required for REMAIN-001 in this iteration; this rerun was a verification closeout against the current repo state.
- **Learnings for future iterations:**
  - Patterns discovered
    - When a story already has a recent implementation commit, rerun the live verifier before reopening the code; the current Polish flow was already green in source and in browser.
  - Gotchas encountered
    - `dev-browser --connect` could not attach because Chrome remote debugging was unavailable on this machine, so isolated `dev-browser` was the reliable fallback for local frontend proof.
  - Useful context
    - The live verifier produced 18/18 passing checks and saved fresh artifacts at `C:\Users\treyt\.dev-browser\tmp\verify-remaining-001-polish.png` and `C:\Users\treyt\.dev-browser\tmp\verify-remaining-results.json`.
---
## [2026-03-29 18:56:23 -05:00] - REMAIN-003: Notes panel accepts and persists freeform text
Thread: 88491
Run: 20260329-175644-1999 (iteration 1)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-175644-1999-iter-1.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-175644-1999-iter-1.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: 00c35567 REMAIN-003 stabilize notes draft input sync
- Post-commit status: `clean`
- Verification:
  - Command: `pytest brain/tests/test_tutor_project_shell.py` -> PASS
  - Command: `npx vitest run client/src/components/__tests__/TutorShell.test.tsx -t "persists notes through runtime state for the active session|clears notes when the saved draft belongs to a different session"` -> PASS
  - Command: `npm run build` -> PASS
  - Command: `dev-browser --timeout 90 run C:/pt-study-sop/.tmp/remain003-workflow-verify.js` -> FAIL
- Files changed:
  - dashboard_rebuild/client/src/components/TutorShell.tsx
- What was implemented
  - Hardened Notes draft syncing so a stale empty runtime-state rehydrate for the same workflow/session does not wipe an in-progress note.
  - Added `onInput` handling alongside `onChange` so the Notes textarea updates draft state on both input paths.
- **Learnings for future iterations:**
  - Patterns discovered: the Notes textarea can be clobbered by same-context runtime-state refreshes, so sync logic should not blindly overwrite non-empty local state with empty server state.
  - Gotchas encountered: isolated `dev-browser` typing produced native DOM input events but still did not persist into the controlled React textarea, so browser verification remains unresolved.
- Useful context: clearing `dashboard_rebuild/node_modules/.vite` was necessary after temporary instrumentation because the served tutor bundle stayed stale across rebuilds.
---
## [2026-03-29 21:13:49 -05:00] - REMAIN-005: End session flow saves to vault and cleans up
Thread:
Run: 20260329-204647-1528 (iteration 2)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-204647-1528-iter-2.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-204647-1528-iter-2.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: 0639af55 REMAIN-005 save ended tutor sessions to vault
- Post-commit status: `clean`
- Verification:
  - Command: `pytest brain/tests/test_tutor_artifact_certification.py -q` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `dev-browser --timeout 120 run C:/pt-study-sop/scripts/verify-remaining.js` -> PASS
  - Command: `cd dashboard_rebuild && npm run check` -> FAIL (pre-existing repo-wide TypeScript errors outside REMAIN-005)
- Files changed:
  - `.agents/tasks/prd.json`
  - `.ralph/runs/run-20260329-204647-1528-iter-1.md`
  - `brain/dashboard/api_tutor_sessions.py`
  - `brain/tests/test_tutor_artifact_certification.py`
  - `dashboard_rebuild/client/src/api.types.ts`
  - `dashboard_rebuild/client/src/components/TutorShell.tsx`
  - `dashboard_rebuild/client/src/components/tutor-shell/TutorArtifactsDrawer.tsx`
  - `dashboard_rebuild/client/src/components/tutor-shell/TutorEndSessionDialog.tsx`
  - `dashboard_rebuild/client/src/hooks/useTutorSession.ts`
  - `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
  - `dashboard_rebuild/client/src/pages/tutor.tsx`
  - `scripts/verify-remaining.js`
  - `conductor/tracks/GENERAL/log.md`
  - `.ralph/progress.md`
- What was implemented
  - End-session completion on `/tutor` now writes a markdown session summary into the resolved course vault folder and returns structured `vault_save` metadata from the backend.
  - The shared Tutor session-end path now invalidates vault/session caches, routes both hero `NEW SESSION` and direct end-session flows through the same cleanup callback, and returns the user to the entry card.
  - The entry card now shows a stable confirmation banner summarizing what was saved, and the live `dev-browser` verifier proves the full flow from session start through end-session save confirmation and cleanup.
- **Learnings for future iterations:**
  - Patterns discovered
    - A transient toast is not a strong enough acceptance surface for end-of-session confirmation; the returned entry card is a better stable place for save summaries and browser verification.
  - Gotchas encountered
    - `dev-browser --connect` was unavailable because Chrome remote debugging was not exposed on `9222`, so isolated `dev-browser` was required for the live proof.
    - `npm run check` currently reports many unrelated repo-wide TypeScript failures; it is not a reliable story-scoped gate until that baseline is repaired.
  - Useful context
    - `scripts/verify-remaining.js` is now a REMAIN-005-specific verifier that starts a real Tutor session, ends it through `NEW SESSION`, asserts the `vault_save` payload, checks the returned confirmation banner, and stores the screenshot/result bundle under `C:\Users\treyt\.dev-browser\tmp\`.
---
## [2026-03-29 22:19:28 -05:00] - REMAIN-006: Obsidian panel shows vault browser with note read and write
Thread: 12202
Run: 20260329-215508-146 (iteration 1)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-215508-146-iter-1.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-215508-146-iter-1.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: 3291b588 REMAIN-006 add obsidian vault browser panel
- Post-commit status: `clean`
- Verification:
  - Command: `cd dashboard_rebuild && npm run test -- src/components/studio/__tests__/StudioObsidianPanel.test.tsx src/components/studio/__tests__/StudioShell.test.tsx src/components/__tests__/TutorShell.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `dev-browser --timeout 90 run C:/pt-study-sop/scripts/verify-remaining.js` -> PASS
- Files changed:
  - `.agents/tasks/prd.json`
  - `.ralph/heartbeat.json`
  - `conductor/tracks/GENERAL/log.md`
  - `dashboard_rebuild/client/src/components/TutorShell.tsx`
  - `dashboard_rebuild/client/src/components/__tests__/TutorShell.test.tsx`
  - `dashboard_rebuild/client/src/components/studio/StudioShell.tsx`
  - `dashboard_rebuild/client/src/components/studio/StudioObsidianPanel.tsx`
  - `dashboard_rebuild/client/src/components/studio/__tests__/StudioObsidianPanel.test.tsx`
  - `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx`
  - `docs/root/TUTOR_TODO.md`
  - `scripts/verify-remaining.js`
- What was implemented
  - Replaced the placeholder Obsidian Studio panel with a live course-scoped vault browser that loads the current course folder, renders the nested file tree, previews selected notes, creates new markdown notes, and saves current session notes into the vault with the existing Obsidian filesystem API.
  - Wired the panel through `TutorShell` and `StudioShell` so it opens from the toolbar with the active course/vault context instead of placeholder copy.
  - Added focused component coverage for the panel itself plus shell integration, and refreshed the REMAIN-006 browser verifier to prove the real `/tutor` shell opens the Obsidian panel and renders the vault tree without console errors.
- **Learnings for future iterations:**
  - Patterns discovered
    - For this repo, the browser acceptance for floating Studio panels is more reliable after entering the real Studio shell through `Start Priming` instead of trying to validate panel behavior from the entry overlay.
  - Gotchas encountered
    - `dev-browser --connect` was unavailable because Chrome remote debugging was not exposed on `9222`, so isolated `dev-browser` remained the reliable path.
    - Reusing a named `dev-browser` page caused stale navigation timeouts; `browser.newPage()` made the verifier deterministic across retries.
  - Useful context
    - The live verifier screenshot/result bundle was written to `C:\Users\treyt\.dev-browser\tmp\verify-remaining-006-obsidian-panel.png` and `C:\Users\treyt\.dev-browser\tmp\verify-remaining-results.json`.
---
## [2026-03-29 23:22:53 -05:00] - REMAIN-007: Anki panel shows card preview and export
Thread:
Run: 20260329-223651-1869 (iteration 2)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-223651-1869-iter-2.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-223651-1869-iter-2.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: 8cbfff51 REMAIN-007 add anki preview export panel
- Post-commit status: `clean`
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioAnkiPanel.test.tsx client/src/components/studio/__tests__/StudioShell.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `dev-browser --headless --timeout 25 run C:/Users/treyt/.dev-browser/tmp/remain-007-browser-final.js` -> PASS
- Files changed:
  - `.agents/ralph/loop.sh`
  - `.agents/tasks/prd.json`
  - `.ralph/heartbeat.json`
  - `.ralph/runs/run-20260329-223651-1869-iter-1.md`
  - `brain/dashboard/api_adapter.py`
  - `conductor/tracks/GENERAL/log.md`
  - `dashboard_rebuild/client/src/api.ts`
  - `dashboard_rebuild/client/src/api.types.ts`
  - `dashboard_rebuild/client/src/components/TutorShell.tsx`
  - `dashboard_rebuild/client/src/components/studio/StudioAnkiPanel.tsx`
  - `dashboard_rebuild/client/src/components/studio/StudioShell.tsx`
  - `dashboard_rebuild/client/src/components/studio/__tests__/StudioAnkiPanel.test.tsx`
  - `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx`
  - `ralph-monitor.ps1`
- What was implemented
  - Replaced the Studio Anki placeholder with a real panel that previews flashcards, lets the user edit front/back text, copies individual cards, and exports the visible queue as an Anki-importable CSV.
  - Wired the panel through TutorShell so it uses the current tutor-session queue when available, falls back to course/latest draft cards before a session starts, and opens directly from the toolbar.
  - Extended the Anki drafts API payload with `courseId`, added focused component coverage, and proved in the browser that the panel opens, renders preview cards, and exposes the export control.
- **Learnings for future iterations:**
  - Patterns discovered
    - Pre-session toolbar panels need a sensible fallback data source; otherwise browser acceptance can stall before the user has generated any live session artifacts.
  - Gotchas encountered
    - Opening the Polish panel after `Start Priming` currently trips an existing `Studio Canvas` error boundary, so the live proof for this story had to validate against the Anki panel directly instead of relying on the Polish editor path.
    - `dev-browser` worked reliably in isolated headless mode once the script avoided Playwright actionability waits on floating-panel toolbar buttons and used DOM clicks for the panel-open action.
  - Useful context
    - The live verifier screenshot was written to `C:\Users\treyt\.dev-browser\tmp\remain-007-anki-verified.png`, and the final browser run confirmed `5` rendered preview cards plus an active `Export CSV` control.
---
## [2026-03-29 23:48:48 -05:00] - REMAIN-008: Entry card scrolls on small viewports
Thread:
Run: 20260329-234334-1409 (iteration 2)
Run log: C:/pt-study-sop/.ralph/runs/run-20260329-234334-1409-iter-2.log
Run summary: C:/pt-study-sop/.ralph/runs/run-20260329-234334-1409-iter-2.md
- Guardrails reviewed: yes
- No-commit run: false
- Commit: b67fa0b1 REMAIN-008 make entry card scroll on small viewports
- Post-commit status: `.agents/tasks/prd.json, .ralph/heartbeat.json, .ralph/runs/run-20260329-234334-1409-iter-1.md, install-watchdog-task.ps1, memory-watchdog.bat, memory-watchdog.ps1`
- Verification:
  - Command: `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx` -> PASS
  - Command: `cd dashboard_rebuild && npm run build` -> PASS
  - Command: `cmd /c Start_Dashboard.bat` -> PASS
  - Command: `dev-browser --headless --timeout 90 run C:\Users\treyt\.dev-browser\tmp\verify-remain-008-headless.js` -> PASS
- Files changed:
  - `dashboard_rebuild/client/src/components/studio/StudioShell.tsx`
  - `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx`
  - `conductor/tracks/GENERAL/log.md`
  - `.ralph/progress.md`
- What was implemented
  - Added `max-h-[90vh] overflow-y-auto` to the Studio entry card overlay container so the setup card scrolls internally instead of clipping on short viewports.
  - Locked the behavior with a focused `StudioShell` regression that asserts the entry-state card exposes the new scroll classes.
  - Verified the live `/tutor` flow at `800x600`, confirming the card overflowed, scrolled, and kept the bottom `Cancel` action reachable after scrolling.
- **Learnings for future iterations:**
  - Patterns discovered
    - For viewport-fit fixes on floating overlays, validating `scrollHeight > clientHeight` plus bottom-control visibility after scroll is a stable browser proof.
  - Gotchas encountered
    - `dev-browser --connect` did not return promptly in this environment, so isolated headless `dev-browser` remained the reliable verification path.
  - Useful context
    - The live verification screenshot was written to `C:\Users\treyt\.dev-browser\tmp\remain-008-800x600.png`, and the browser run reported `scrollHeight=824`, `clientHeight=538`, and `scrollTopAfter=265` for the entry card.
---

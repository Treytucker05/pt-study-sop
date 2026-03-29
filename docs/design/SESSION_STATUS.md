# Session Status — March 28, 2026

## Where We Are
The floating-panel Studio workspace is live on `/tutor`. Ralph loop is set up for autonomous bug fixing.
Core study loop: Source Shelf → Priming → Prime Packet → Tutor → Notes → Polish → Export

## What's Been Committed (HUD-244 through HUD-256 + Ralph setup)
- Checkpoints 1-5 of the floating-panel cutover
- Corrective passes (page-level chrome removal, toolbar positioning)
- shellMode/studioView internal state purge
- Priming Phase 1 (material/method/run/promote) + Phase 2 (chat refinement)
- Entry card with course picker, end/new session flow
- Source Shelf rebuild (folder tree with checkboxes, search, course grouping)
- Canvas drag drift fix (merged from worktree)
- HUD-247: Hero header HudButtons (New Session, Resume, Refresh) in PageScaffold actions
- HUD-248: Canvas zoom slider + per-panel size presets (Max, Fit, Center, Size dropdown)
- HUD-249: Previous Sessions accordion with filters, delete, course names
- HUD-250: Panel center top-bias, fit-to-content measurement, scroll overflow, Source Shelf contrast/folders, vault derivation
- HUD-251: Per-panel Center/Maximize now pan camera (viewport focus) instead of moving panel
- HUD-252: Accessibility ARIA fixes (MainContent tablist, form labels), metadata cleanup, mobile header
- HUD-253: App shell metadata (real title, OG tags, mobile zoom), mobile header responsive brand
- HUD-254: Killed panels (Tutor Status, Repair Candidates, Objectives, Sketch, Concept Map, Vault Graph)
- HUD-255: Unified Workspace panel with tabs (Canvas/Mind Map/Concept Map), Excalidraw removed
- HUD-256: Entry card session name input + material picker + New Session flash feedback
- Ralph loop setup: config, PRD, context, guardrails, bat launcher

## Active Bugs (in prd.json for Ralph)
- ENTRY-001: Entry card renders on canvas instead of viewport overlay
- ENTRY-002: Material labels show full file paths instead of filenames
- ENTRY-003: Panels don't auto-center after Start Priming

## Ralph Loop
- Config: `.agents/ralph/config.sh` (Codex agent, 10 iterations)
- PRD: `.agents/tasks/prd.json` (3 stories loaded)
- Context: `.agents/ralph/references/PROJECT_CONTEXT.md`
- Guardrails: `.ralph/guardrails.md` (7 known failure patterns)
- Verification: `scripts/verify-entry-bugs.js` (dev-browser interactive test)
- Launcher: `ralph.bat` (double-click to start)
- Run: `ralph build --agent=codex`

## What's Been Committed
- Checkpoints 1-5 of the floating-panel cutover
- Corrective passes (page-level chrome removal, toolbar positioning)
- shellMode/studioView internal state purge
- Priming Phase 1 (material/method/run/promote) + Phase 2 (chat refinement)
- Entry card with course picker, end/new session flow
- Source Shelf rebuild (folder tree with checkboxes, search, course grouping)
- Canvas drag drift fix (merged from worktree)
- HUD-247: Hero header HudButtons (New Session, Resume, Refresh) in PageScaffold actions
- HUD-248: Canvas zoom slider + per-panel size presets (Max, Fit, Center, Size dropdown)
- HUD-249: Previous Sessions accordion in Active Workflow header (with filters, delete, course names)
- HUD-250: Panel center top-bias, fit-to-content measurement, scroll overflow, Source Shelf contrast/folders, vault derivation fallback
- HUD-251: Per-panel Center/Maximize now pan camera (viewport focus) instead of moving panel
- HUD-252: Accessibility ARIA fixes (MainContent tablist, form labels), metadata cleanup, mobile header
- HUD-254: Panel cleanup review applied in Studio (dead panels removed, merged tools folded into surviving surfaces)
- HUD-255: Workspace now owns the tabbed Canvas / Mind Map / Concept Map surface; standalone Sketch, Concept Map, and Vault Graph panels are gone, and `@excalidraw/excalidraw` is removed

## Active Bugs
- **Panel jump after Center Windows**: After clicking "Center Windows" or any canvas transform, first drag on a panel causes it to jump. Root cause: WorkspacePanel passes `position` as controlled prop to Rnd, mismatch with canvas translate. Fix written but not yet sent to Codex.
- **"LIVE STUDY CORE" header**: This is NOT a bug — Trey wants it to stay. Do NOT delete it.
- **Entry card**: needs a session name field so sessions can be distinguished

## Panel Review (HUD-254)
The Studio panel review is now carrying explicit keep/kill/merge decisions instead of leaving the older shell-era registry intact.

### Trey's study workflow (confirmed):
1. Load materials
2. Prime them (single method or chain, then chat to refine)
3. LLM teaches and explains
4. Take notes throughout
5. Save everything, review, put back into tutor or export to Obsidian/Anki

### Panels confirmed KEEP:
1. Source Shelf — load materials (just rebuilt)
2. Document Dock — read source materials (not yet reviewed for changes)
3. Priming — run methods, refine via chat (just rebuilt)
4. Tutor — live teaching chat (working)
5. Prime Packet — shows what Tutor receives (working)
6. Notes — scratch pad (working)

### Panels KILLED:
- Tutor Status — dead duplicate status surface; Memory keeps the useful runtime compaction history
- Repair Candidates — dead duplicate repair surface; repair work now happens through Workspace/Prime Packet/Tutor flows instead
- Objectives — no standalone floating-panel value in the Studio loop

### Panels MERGED:
- Mind Map → Workspace (tldraw)
- Sketch / Concept Map / Vault Graph → Workspace (tabbed Canvas / Mind Map / Concept Map)
- Method Runner → Priming + Tutor chat

### Panels NOT YET REVIEWED:
- Polish (Trey says it IS needed — "final drawing board where notes come together before shipping to Anki and Obsidian")
- Polish Packet
- Run Config
- Memory
- Obsidian
- Anki (Trey says Anki works when booted — NOT broken)

## Next Up: HUD-247 — Hero Header Session Actions

**Goal:** Add New Session, Resume, and Refresh HudButtons to the "LIVE STUDY CORE / TUTOR" PageScaffold hero header so the user always has a visible, discoverable way to start, resume, or refresh a session — regardless of canvas state.

**Background:**
- Commit `ec1d197b` had an `actions` slot on the PageScaffold with a HudButton REFRESH button (using `BTN_OUTLINE` from `@/lib/theme`)
- The floating-panel cutover (`6f8f830f`) stripped that `actions` prop — currently PageScaffold gets `stats` but no `actions`
- `HudButton.tsx` was deleted but `BTN_PRIMARY` / `BTN_OUTLINE` in `dashboard_rebuild/client/src/lib/theme.ts` still have the checkerboard grid styling (15px lines → 10px on hover, translate-y lift, border glow expansion)

**What to build:**

1. **Restore `HudButton.tsx`** at `dashboard_rebuild/client/src/components/ui/HudButton.tsx` — thin wrapper around BTN_PRIMARY / BTN_OUTLINE from `@/lib/theme`, same as commit `26f5d1fe`

2. **Add `actions` prop to the PageScaffold render** in `dashboard_rebuild/client/src/pages/tutor.tsx` with three HudButtons:

   - **NEW SESSION** (variant="primary") — always visible; ends current session if active, clears state, returns to entry card (`showSetup=true`, `setPanelLayout([])`)
   - **RESUME** (variant="outline") — only rendered when `resumeCandidate` exists; calls `resumeFromHubCandidate(resumeCandidate)` + applies study preset
   - **REFRESH** (variant="outline") — invalidates all tutor query caches (`tutor-hub`, `tutor-sessions`, `tutor-project-shell`, `tutor-studio-restore`, `tutor-chat-materials-all-enabled`, `obsidian`); uses `RefreshCw` icon

**Files to touch:**
- `dashboard_rebuild/client/src/components/ui/HudButton.tsx` (restore)
- `dashboard_rebuild/client/src/pages/tutor.tsx` (add `actions` prop to PageScaffold)
- `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx` (add tests)

**Done when:**
- All three buttons render in the hero header with the checkerboard grid styling
- NEW SESSION ends current session and returns to entry card
- RESUME only appears when a resumable candidate exists
- REFRESH invalidates caches
- Existing targeted tests + `npm run build` pass

**Codex skill:** `build-tdd`

## Fix Queue
See `docs/design/FIX_QUEUE.md` for the full prioritized list.

## Key Design Docs in Repo
- `docs/design/STUDIO_LAYOUT_SPEC_v2.md` — canonical layout spec
- `docs/design/CORE_STUDY_LOOP.md` — the user workflow
- `docs/design/PRIMING_PANEL_CORRECTED.md` — priming panel design
- `docs/design/PANEL_AUDIT.md` — panel-by-panel audit with test results
- `docs/design/FIX_QUEUE.md` — prioritized fix queue

## Critical Instruction
The "LIVE STUDY CORE / TUTOR" header with Surface/Session/Course/Materials badges STAYS. Do not remove it.

## Tools
- dev-browser (npm global, v0.2.3) works for browser automation on this machine (PowerHouseATX)
- Chrome extension has persistent pairing issues — use dev-browser instead
- Codex skills at C:\Users\treyt\.agents\skills\ — always specify which skill to use

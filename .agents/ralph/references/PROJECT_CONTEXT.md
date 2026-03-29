# PT Study SOP — Ralph Context

## What This Project Is
A React + TypeScript + Flask web app for AI-powered physical therapy study sessions.
The `/tutor` route is the main workspace — a floating-panel infinite canvas (react-zoom-pan-pinch)
where study tools live as draggable/resizable windows (react-rnd).

## Tech Stack
- Frontend: Vite + React + TypeScript + Tailwind + shadcn/ui
- Backend: Python Flask at 127.0.0.1:5000
- Canvas: react-zoom-pan-pinch (TransformWrapper) for zoom/pan
- Panels: react-rnd for floating draggable/resizable windows
- Graphs: @xyflow/react + dagre for mind maps and concept maps
- Drawing: tldraw for freehand canvas
- Build: `cd dashboard_rebuild && npm run build`
- Tests: `cd dashboard_rebuild && npx vitest run <test-file>`
- Live app: http://127.0.0.1:5000/tutor?course_id=1&mode=studio

## Key Files
- `dashboard_rebuild/client/src/pages/tutor.tsx` — Page controller, session state, hero header
- `dashboard_rebuild/client/src/components/TutorShell.tsx` — Entry card, panel wiring, Source Shelf props
- `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` — Canvas, panel registry, presets, zoom, viewport focus
- `dashboard_rebuild/client/src/components/ui/WorkspacePanel.tsx` — Individual panel chrome (title bar, resize, collapse)
- `dashboard_rebuild/client/src/components/studio/SourceShelf.tsx` — Material/vault file browser
- `dashboard_rebuild/client/src/components/TutorTopBar.tsx` — Active Workflow header, Previous Sessions accordion
- `dashboard_rebuild/client/src/lib/theme.ts` — BTN_PRIMARY/BTN_OUTLINE checkerboard button styles
- `docs/design/SESSION_STATUS.md` — Session status and completed HUD items
- `docs/root/TUTOR_TODO.md` — Full task board

## Completed Work (HUD-244 through HUD-256)
- Floating panel studio cutover with infinite canvas
- Entry card with session name, course picker, material selector
- Hero header HudButtons (New Session, Resume, Refresh)
- Canvas zoom slider + per-panel size presets (Max, Fit, Center)
- Previous Sessions accordion with filters/delete
- Panel cleanup: killed Tutor Status, Repair Candidates, Objectives, Sketch, Concept Map, Vault Graph
- Unified Workspace panel with tabs: Canvas (tldraw) / Mind Map (ReactFlow) / Concept Map (ReactFlow)
- Source Shelf vault derivation, contrast fixes, folder UI
- Accessibility ARIA fixes, metadata, mobile header
- Excalidraw dependency removed

## Current Panel Lineup (13 panels)
Source Shelf, Document Dock, Workspace (unified), Priming, Tutor, Polish,
Prime Packet, Polish Packet, Run Config, Memory, Notes, Obsidian, Anki

## Study Workflow (what the user does)
1. Land on /tutor → see entry card → name session, pick course, select materials
2. Click Start Priming → Priming panel opens → run methods, refine via chat
3. Prime Packet shows what Tutor will receive
4. Open Tutor panel → LLM teaches based on primed context
5. Take notes in Notes panel throughout
6. Polish panel → final drawing board before shipping to Anki and Obsidian
7. End session → vault sync, method ratings, cleanup

## Browser Testing with dev-browser
Every UI change MUST be verified live. Use the verify-live skill.
```bash
dev-browser --timeout 60 run scripts/verify-<ticket>.js
```
dev-browser has full Playwright API: click, fill, type, locator, evaluate, snapshotForAI, screenshot.

## Critical Rules
- The "LIVE STUDY CORE / TUTOR" PageScaffold hero header STAYS. Never remove it.
- All styling uses the cyberpunk theme (dark bg, primary/red accents, font-mono, tracking-[0.18em])
- Panels use WorkspacePanel with title bar chrome — draggable via title bar only
- Entry card must be a viewport overlay, not a canvas object

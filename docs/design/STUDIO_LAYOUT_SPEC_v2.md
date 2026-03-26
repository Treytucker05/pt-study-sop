# Studio Layout Spec v2 — Floating Panel Workspace

## Core principle

The entire `/tutor` page is ONE workspace canvas. Every tool — Material Viewer, Priming Chat, Tutor Chat, Polish Chat, Packets, Notes, Sketching, Concept Maps — is a **floating, draggable, resizable, collapsible panel** on that canvas. You open what you need, close what you don't, and arrange panels however you want. There is no fixed grid, no page switching, no tab navigation between modes.

This is the original `WorkspaceCanvas.tsx` + `WorkspacePanel.tsx` model (react-rnd + react-zoom-pan-pinch), restored and expanded with the three assistant chat panels and the new Studio surfaces built during HUD-236.

## What this replaces

- The fixed 3-column `StudioShell.tsx` grid layout
- The `studioView` switcher (home/workspace/priming/polish/final_sync)
- The `shellMode` toggle (studio/tutor)
- `TutorTabBar.tsx` tab navigation (STUDIO/WORKSPACE/TUTOR)
- `TutorShellDeferredPanels.tsx` lazy center-swap routing
- `StudioWorkspaceHome.tsx` / `TutorStudioHome.tsx` management landing
- `TutorWorkflowLaunchHub.tsx` (workflows table, study wheel, stats — move to Home page)

## What gets restored and extended

- `WorkspacePanel.tsx` — react-rnd draggable/resizable/collapsible panel with pop-out support. This is the universal container for every tool.
- `WorkspaceCanvas.tsx` panel registry pattern — toolbar palette to spawn panels, default layouts, stagger positioning. Rebuild with the expanded panel set below.
- `react-zoom-pan-pinch` as the base canvas (zoom, pan, infinite scroll).

## Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Toolbar (top bar — always visible)                              │
│  [+ Material Viewer] [+ Priming] [+ Tutor] [+ Polish]           │
│  [+ Notes] [+ Prime Packet] [+ Polish Packet] [+ Sketch]        │
│  [+ Concept Map] [+ Objectives] [+ Vault Graph] [+ Method Run]  │
│  [Presets ▼]  [Reset]  [Zoom controls]                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐  ┌──────────────┐  ┌────────────────┐         │
│   │ Material    │  │ Priming Chat │  │ Prime Packet   │         │
│   │ Viewer      │  │              │  │                │         │
│   │ (draggable) │  │ (draggable)  │  │ (draggable)    │         │
│   │             │  │              │  │                │         │
│   └─────────────┘  └──────────────┘  └────────────────┘         │
│                                                                  │
│        ┌──────────────┐  ┌─────────────────┐                    │
│        │ Tutor Chat   │  │ Notes           │                    │
│        │              │  │                 │                    │
│        │ (draggable)  │  │ (draggable)     │                    │
│        │              │  │                 │                    │
│        └──────────────┘  └─────────────────┘                    │
│                                                                  │
│   (infinite canvas — zoom/pan with mouse/trackpad)               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Panel registry (expanded)

Every panel uses `WorkspacePanel` as its container. Each entry defines:
- type, label, icon
- defaultSize (width x height)
- allowMultiple (can you spawn more than one?)

### Source & Document panels
| Type            | Label          | Default Size | Multiple | Notes                                                       |
|-----------------|----------------|-------------|----------|-------------------------------------------------------------|
| document-dock   | Document Dock  | 520 x 520   | No       | Tabbed multi-document viewer/editor with clip-to-workspace  |
| source-shelf    | Source Shelf   | 300 x 420   | No       | Current Run / Library / Vault working surface               |

### Assistant chat panels
| Type           | Label          | Default Size | Multiple | Notes                                        |
|----------------|----------------|-------------|----------|----------------------------------------------|
| priming-chat   | Priming        | 420 x 550   | No       | Narrowly-scoped chat for material prep       |
| tutor-chat     | Tutor          | 420 x 600   | No       | Live teaching chat with behavior modes       |
| polish-chat    | Polish         | 420 x 550   | No       | Review/summarize/package chat                |

### Packet panels
| Type           | Label          | Default Size | Multiple | Notes                                        |
|----------------|----------------|-------------|----------|----------------------------------------------|
| prime-packet   | Prime Packet   | 320 x 500   | No       | Source Context + Primed Artifacts sections    |
| polish-packet  | Polish Packet  | 320 x 500   | No       | Notes + Summaries + Cards + Assets sections   |

### Study tool panels
| Type           | Label          | Default Size | Multiple | Notes                                        |
|----------------|----------------|-------------|----------|----------------------------------------------|
| notes          | Notes          | 350 x 400   | Yes      | Freeform notetaker for writing/typing        |
| objectives     | Objectives     | 350 x 400   | No       | Learning objectives checklist                |
| method-runner  | Method Runner  | 400 x 500   | Yes      | Run a study method block                     |

### Visual/drawing panels
| Type           | Label          | Default Size | Multiple | Notes                                        |
|----------------|----------------|-------------|----------|----------------------------------------------|
| tldraw-sketch  | Sketch         | 600 x 500   | No       | tldraw canvas for drawing/diagramming        |
| concept-map    | Concept Map    | 600 x 500   | No       | Structured concept map generator             |
| mind-map       | Mind Map       | 600 x 500   | No       | Mind map view                                |

### Integration panels
| Type           | Label          | Default Size | Multiple | Notes                                        |
|----------------|----------------|-------------|----------|----------------------------------------------|
| vault-graph    | Vault Graph    | 600 x 500   | No       | Obsidian vault graph view                    |
| obsidian       | Obsidian       | 400 x 500   | No       | Obsidian note reader/writer                  |
| anki           | Anki           | 350 x 400   | No       | Anki card drafts and sync                    |

### Runtime status panels
| Type              | Label             | Default Size | Multiple | Notes                                     |
|-------------------|-------------------|-------------|----------|-------------------------------------------|
| tutor-status      | Tutor Status      | 300 x 400   | No       | Adaptive strategy, context health, validation |
| repair-candidates | Repair Candidates | 300 x 350   | No       | Misconception/gap detections               |
| memory            | Memory            | 300 x 350   | No       | Capsules, compaction, history              |
| run-config        | Run Config        | 300 x 350   | No       | Priming methods, chain, tutor mode         |

## Workspace object model

The floating-panel layout does not replace the source-linked workspace object model. The workspace still needs ordinary study objects that can be clipped, moved, promoted, and referenced across panels.

### Required v1 object types

| Kind            | Source                        | Notes                                                                 |
|-----------------|-------------------------------|-----------------------------------------------------------------------|
| excerpt         | Document Dock / Material text | Provenance-linked source excerpt                                      |
| image           | Screenshot / paste / drop     | Image or screenshot object with optional source link                  |
| text-note       | Manual writing / repair flow  | Freeform note object, including repair-backed notes                   |
| diagram-sketch  | Sketch / Concept Map panels   | Visual object that represents a created diagram or sketch artifact    |
| link-reference  | Source Shelf / Vault / packet | Lightweight reference object that points back to a source or packet   |

### Object rules

- Every promotable object keeps provenance when possible.
- Excerpt, image, and reference objects must remember source identity/path anchors when available.
- Repair-backed notes are first-class workspace objects, not status-only alerts.
- The panel layout and the workspace object layer are separate concerns: dragging a panel is not the same as creating or moving a study object.
- Promoting an object into a packet does not destroy the original workspace object.


## Panel behavior rules

### Universal (all panels)
- Every panel is draggable by its title bar, resizable from corners/edges, collapsible to a chip, and closeable.
- Pop-out to a separate browser window is supported (existing `WorkspacePanel` feature).
- Collapsed panels become small floating chips showing just the panel name — click to re-expand.
- Panel position, size, and collapsed state persist through StudioRun so they survive refresh/resume.

### Chat panels (Priming, Tutor, Polish)
- Each is a narrowly-scoped conversational assistant, NOT a pure open-ended chat.
- **Priming chat**: has a **method/chain selector bar** at the top of the panel (above the chat area). You pick priming methods and priming chains here — these only affect priming scope. Below the selector bar is the chat interface that guides you through material selection, method config, and priming prep. Knows how to scope materials and run priming methods. If you ask something outside its scope, it points you to Tutor.
- **Tutor chat**: has a **chain/template selector bar** at the top of the panel (above the chat area). You pick the tutor chain/template here — this is completely independent from the priming chain and is NOT inherited from priming. Below the selector bar are the behavior mode buttons (Socratic, Evaluate, Concept Map, Teach-Back), voice dictation input, stage timer, and the existing SSE streaming chat. Replies can promote to Polish Packet. Verdicts feed Tutor Status and Repair Candidates. The panel itself owns a real **Start / Resume session** control and must never degrade into a dead-end holding state that only redirects back to Workspace.
- **Polish chat**: guides you through reviewing captured notes, summarizing, and packaging cards. If you ask a teaching question, it points you to Tutor instead of breaking.
- Each chat maintains its own conversation history independently.
- All three can be open simultaneously — they do not conflict.
- The "flow" (Prime → Tutor → Polish) is suggested but not enforced. You can open them in any order.
- Priming selector state and Tutor selector state persist independently through StudioRun. Changing one must not silently mutate the other.

### Document Dock panel
- Supports **multiple open documents as tabs**, not just one active document.
- Opens source documents in the correct surface:
  - PDF/image viewer for file sources
  - text/markdown editor for writable text sources
- Includes clip-to-workspace: select text in viewer/editor, clip creates an excerpt object.
- Excerpt objects become items that can be promoted into Prime Packet.
- The dock is the authority for full-document reading/editing. The workspace is for shaped excerpts, notes, references, and visual artifacts.

### Source Shelf panel
- Three tabs: Current Run, Library, Vault.
- All three tabs are real working surfaces, not decorative badges.
- Current Run shows currently attached materials for the live run.
- Library shows browseable study materials with attach/add actions.
- Vault shows browseable vault sources/references with attach/add actions.
- "Add to workspace" creates a workspace object (not a panel move and not a packet entry).
- Selecting source material auto-links into Prime Packet → Source Context.
- Library -> Tutor / Studio handoff must carry run context, not just route to `/tutor` generically.

### Packet panels
- Prime Packet: Source Context + Primed Artifacts sections. Accepts promoted excerpts and repair notes.
- Polish Packet: Notes + Summaries + Cards + Assets sections. Accepts promoted Tutor replies.
- Drag-to-packet and explicit promote actions work from any panel that produces promotable content.

### Status panels (Tutor Status, Repair Candidates, Memory, Run Config)
- These are Studio runtime surfaces that update in real-time during a tutor session.
- Repair Candidates panel has "Send to Workspace" actions that create note objects promotable to Prime Packet.
- Memory surfaces capsule history, compaction state, and manual rollover controls.
- Run Config is not read-only. It owns runtime defaults and controls such as Tutor ruleset attachment, compaction policy, and run-level chain/method defaults that are not local to one chat panel.
- These panels can be closed if you don't want to see them. They don't block any functionality.

### Drawing/visual panels (Sketch, Concept Map, Mind Map, Vault Graph)
- tldraw Sketch is now ONE panel, not the base canvas. It's for drawing and diagramming.
- Concept Map, Mind Map, and Vault Graph are their own panels as before.
- These panels can be used for spatial study work alongside the chat panels.

## Preset layouts

The toolbar includes a Presets dropdown with saved layouts:

| Preset       | Panels open                                              | Arrangement                    |
|--------------|----------------------------------------------------------|--------------------------------|
| Priming      | Material Viewer, Source Shelf, Priming Chat, Prime Packet | Left: viewer+shelf, Right: chat+packet |
| Study        | Material Viewer, Tutor Chat, Notes, Tutor Status          | Left: viewer, Center: chat, Right: notes+status |
| Polish       | Polish Chat, Polish Packet, Notes                        | Left: chat, Right: packet+notes |
| Full Studio  | All core panels open                                     | Spread across canvas           |
| Minimal      | Just Tutor Chat                                          | Centered, large                |

Presets are starting points — you can rearrange immediately after loading one.

## Tutor compaction and auto-save behavior

The Tutor chat panel must protect itself from context exhaustion and preserve study output automatically.

### Compaction trigger
- The context health indicator monitors **real runtime context pressure / token telemetry**, not a hard-coded assistant-message count.
- When context pressure crosses the warning threshold, the Tutor auto-compacts BEFORE the context runs out.

### What compaction does
1. **Summarize** the full conversation so far into a condensed recap (key topics covered, misconceptions identified, objectives addressed, open questions).
2. **Save the summary into Polish Packet → Notes** automatically. This is not optional — every compaction produces a Polish note so study output is never lost.
3. **Replace** the full conversation history in the Tutor's active context with the summary as the new baseline. The Tutor continues the session from the summary, not from turn 1.
4. **Create a memory capsule** containing the full pre-compaction transcript and the compressed continuation payload for later review and resume (visible in the Memory panel).

### What the user sees
- The context health indicator in the Tutor Status panel (and optionally in the Tutor chat panel header) shifts from "healthy" to "compacting."
- A brief notification: "Session compacted — summary saved to Polish Packet."
- The chat continues seamlessly. The user does not need to do anything.

### Manual rollover
- The user can also trigger compaction manually at any time via a button in the Tutor chat panel or the Memory panel.
- Manual rollover follows the same process: summarize → save to Polish → replace context → create capsule.
- The Memory panel also supports **resume from a specific capsule** so the user can deliberately restore an earlier compacted segment as the current Tutor baseline.

### Rule reinforcement on compaction
- After compaction, the critical Tutor rules (no answer leakage, provenance tagging, chunked output) are re-injected at the top of the fresh context alongside the summary and any required packet/runtime context. This prevents rule drift that accumulates over long sessions.

### Transcript preservation
- The full pre-compaction transcript is always preserved in the memory capsule. Compaction is lossy for the LLM's context but lossless for the user's record.
- The Memory panel shows capsule history so the user can review any previous segment of the conversation.
- Memory capsules are part of the real Tutor continuation model, not DB-only archival records.

## Tutor note capture and vault write behavior

- Tutor supports **exact notes** and **editable notes** as first-class outputs.
- Saving a Tutor note stores it immediately in workflow/runtime state.
- Tutor notes can still flow into Polish Packet and Final Sync, but that is not the only path.
- The user also has a direct **Save to Vault** path for captured Tutor notes without needing to complete the full Polish pipeline.
- Final Sync remains the bulk publish/closeout path; direct vault save is an earlier, narrower write action.

## Final Sync

- Not a separate view or panel. It's a **button** in the Polish Chat panel and/or the Run Config panel.
- Clicking it opens a **confirmation modal overlay** (not a new page, not a floating panel).
- The modal shows what will be published, target destinations (Obsidian, Cards, File Export), and requires explicit user confirmation.
- Nothing publishes without confirmation, even through the external API.

## Entry state (no active run)

- The canvas starts with a single centered card: course name, "Start Priming" or "Resume" button.
- No workflows table, no study wheel, no stats. Those live on the Home page (`/`).
- Once a run starts or resumes, the start card disappears and the default preset layout appears.

## Shipped surface constraints

- No third-party vendor CTA, demo watermark, or license upsell should appear inside the shipped study surface.
- No `/nav-lab`, Theme Lab, or similar dev/lab entrypoints should remain visible from the shipped study workspace.

## Non-layout cleanup dependencies

These items affect implementation quality but are not themselves layout-spec requirements:

- remove hidden legacy backend shell modes that no longer belong to the Studio/Tutor contract
- replace route keep-alive behavior that leaves inactive routes mounted with `display:none`
- fix Vault Health runtime behavior
- fix Anki due-card runtime failures
- clean up missing form `id` / `name` accessibility issues across shipped study surfaces

## What gets deleted

1. `StudioShell.tsx` — the fixed 3-column grid
2. `TutorStudioShellPane.tsx` — the StudioShell wrapper
3. `TutorShellDeferredPanels.tsx` — the lazy center-swap routing
4. `StudioWorkspaceHome.tsx` — the management landing wrapper
5. `TutorStudioHome.tsx` — the old management home with LaunchHub
6. `TutorWorkflowLaunchHub.tsx` — workflows table/study wheel (move to Home page)
7. `TutorTabBar.tsx` — tab switching (no tabs in the new model)
8. `StudioTldrawWorkspace.tsx` — tldraw as the base (becomes a panel instead)
9. `StudioTldrawWorkspaceLazy.tsx` — lazy wrapper for the above
10. `studioView` switching logic in `TutorShell.tsx`
11. `shellMode` toggle in `TutorShell.tsx`

## What gets kept and rewired

1. `WorkspacePanel.tsx` — the react-rnd panel container. Keep as-is.
2. `WorkspaceCanvas.tsx` — restore the panel registry + spawn pattern. Expand the registry to the full list above. Remove the old panel content implementations (they've been superseded).
3. `SourceShelf.tsx` — becomes content inside a WorkspacePanel and grows into a real Current Run / Library / Vault working surface.
4. `StudioDocumentDock.tsx` — remains the document authority surface, but expands into a tabbed multi-document dock/editor inside a WorkspacePanel.
5. `TutorChat.tsx` — becomes the content of the tutor-chat WorkspacePanel.
6. `TutorWorkflowPrimingPanel.tsx` — becomes the content of the priming-chat WorkspacePanel (refactor toward conversational interface over time).
7. `TutorWorkflowPolishStudio.tsx` — becomes the content of the polish-chat WorkspacePanel (same).
8. `PrimePacketPanel.tsx`, `PolishPacketPanel.tsx` — become content inside WorkspacePanels.
9. `TutorStatusPanel.tsx`, `RepairCandidatesPanel.tsx`, `MemoryPanel.tsx`, `RunConfigPanel.tsx` — become content inside WorkspacePanels.
10. `TutorWorkflowFinalSync.tsx` — becomes a modal triggered from Polish or Run Config, not a panel.
11. All `studioPacketSections.ts`, `studioWorkspaceObjects.ts`, `studioRepairCandidates.ts`, `studioTutorStatus.ts`, `studioMemoryStatus.ts` — keep as the data/runtime layer and reconcile them with the floating-panel UI instead of replacing them.
12. `useStudioRun.ts` — keep as state authority, extend to persist panel layout.
13. Voice dictation (`useChromiumDictation.ts`) — stays in Tutor chat panel.
14. Behavior override buttons (Socratic, Evaluate, etc.) — stay in Tutor chat panel.
15. `TutorEndSessionDialog.tsx` — stays, triggered from Tutor chat panel.
16. `TutorScholarStrategyPanel.tsx` — becomes content inside Run Config or its own small panel.
17. `useTutorHub.ts` and `useTutorWorkflow.ts` remain ownership seams for run/session data, but the floating-panel model requires independent Priming vs Tutor selector ownership instead of one shared implicit chain flow.

## Implementation sequence

1. Restore `WorkspaceCanvas` as the base page surface with `react-zoom-pan-pinch` and the expanded panel registry.
2. Wire each existing component as content inside `WorkspacePanel` containers.
3. Reconcile the existing Studio data/runtime layer (`useStudioRun`, packet sections, workspace objects, repair/status/memory models) with the floating-panel interaction model before expanding UI affordances.
4. Build the three chat panels (Priming, Tutor, Polish) as WorkspacePanel instances, including independent Priming vs Tutor selector ownership and in-panel Tutor start/resume controls.
5. Expand Source Shelf and Document Dock into real working surfaces (Library/Vault tabs, tabbed multi-document dock/editor).
6. Add preset layouts and toolbar spawn buttons.
7. Persist panel layout (positions, sizes, collapsed states, which panels are open) through StudioRun.
8. Convert Final Sync to a modal.
9. Replace heuristic compaction with real runtime telemetry and wire capsule-driven continuation / manual capsule resume.
10. Remove the fixed grid shell, tab bar, and view switching.
11. Move workflows table, study wheel, and stats to the Home page.

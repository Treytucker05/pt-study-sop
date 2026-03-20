# PT Study OS (runtime prompt v9.5.2)

This file is the master repo truth for `C:\pt-study-sop`.

Use it for:
- product and subsystem identity
- route meaning and ownership
- source-of-truth order
- non-negotiable operating laws

If another active doc disagrees with this file on product meaning, route ownership, or source-of-truth order, that other doc is wrong and must be corrected or removed.

## Table of Contents

- [Repo Truth Order](#repo-truth-order)
- [Core Identity](#core-identity)
- [Ownership And Routes](#ownership-and-routes)
- [Tutor Page — Complete Reference](#tutor-page--complete-reference)
  - [Product Model](#product-model)
  - [Screen Inventory (7 screens)](#screen-inventory-7-screens)
  - [Shell Infrastructure](#shell-infrastructure)
  - [Landed vs Planned — Full Status](#landed-vs-planned--full-status)
- [Locked Operating Laws](#locked-operating-laws)
- [System Overview](#system-overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Control Plane Pipeline](#control-plane-pipeline)
- [SOP Library](#sop-library)
- [Brain (Backend)](#brain-backend)
- [Dashboard (Frontend)](#dashboard-frontend)
- [Adaptive Tutor](#adaptive-tutor)
- [Scholar (Meta-Auditor)](#scholar-meta-auditor)
- [External Integrations](#external-integrations)
- [Database](#database)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Repo Layout](#repo-layout)
- [More Docs](#more-docs)

---

## Repo Truth Order

When repo sources disagree, use this order:

1. `README.md`
2. `AGENTS.md` for agent working policy only
3. `sop/library/17-control-plane.md` plus active SOP methods and chains for pedagogy and control-plane semantics
4. `docs/root/PROJECT_ARCHITECTURE.md` for runtime and technical wiring
5. `docs/root/GUIDE_DEV.md` for build, run, and test commands
6. execution-only surfaces:
   - `docs/root/TUTOR_TODO.md`
   - `docs/root/AGENT_BOARD.md`
   - `conductor/tracks.md`
   - `conductor/tracks/GENERAL/log.md`

## Core Identity

PT Study OS is a personal 3-part study system for one learner:

- **Brain** is the home surface and learner-model engine.
- **Tutor** is the live study workspace and protocol executor.
- **Scholar** is the system-facing investigation and improvement console.

The system is not a generic chatbot, not a set of equal peer pages fighting for center stage, and not an institution platform. Brain is where the learner lands. Tutor is where the learner does the work. Scholar is where the system researches friction and proposes bounded improvements.

## Ownership And Routes

| Surface | Owns | Must not own |
|--------|------|--------------|
| **Brain** | home/dashboard, learner profile, telemetry, mastery framing, support-system launch points | public study-workspace sprawl, direct pedagogy control |
| **Tutor** | workflow shell after Brain handoff, staged study execution, live workspace shell, notes/canvas/graph/table, artifacts, resume/restore, structured teaching flow | generic dashboard behavior, unbounded off-protocol teaching |
| **Scholar** | investigations, focused learner questions when blocked, findings, bounded strategy proposals, system research | live course teaching, direct Tutor control, replacing Brain home |
| **Library** | what Tutor can teach through material scope | how Tutor teaches |
| **SOP library** | how Tutor teaches through stages, methods, chains, and rules | course-content truth |

| Route | Meaning |
|------|---------|
| `/` and `/brain` | Brain home |
| `/tutor` | Tutor workflow shell after Brain handoff. Migration target: Launch, Priming, Tutor, Polish, Final Sync while preserving the current Studio/Tutor/Schedule/Publish workspace surfaces during rollout. |
| `/tutor?course_id=&session_id=&mode=&board_scope=` | Deep-link into specific project/session/mode state |
| `/scholar` | Scholar investigation console |
| `/library` | Library support system |
| `/calendar` | Calendar support system (cross-project aggregate) |
| `/mastery` | Mastery support system |
| `/methods` | Methods support system |
| `/vault-health` | Vault Health support system |

## Tutor Page — Complete Reference

> **Maintenance rule:** Any change to the Tutor page — code, API, UI, or plan — must be reflected here. This section is the single source of truth for what the Tutor page is, what it contains, and what state each piece is in.

### Product Model

Tutor is **not a setup wizard**. It is a **Brain-launched, course-backed study workspace shell**.

| Principle | Detail |
|-----------|--------|
| **Brain owns launch context** | Brain decides "what am I working on and why am I entering Tutor" — course, project context, entry point |
| **Tutor owns the staged workflow shell** | Tutor handles "now I am studying inside this workspace" — Launch, Priming, Tutor, Polish, Final Sync, plus session execution, artifacts, and resume/restore |
| **No wizard funnel** | Tutor should not force the user through a large multi-step launch wizard every time. The old TutorWizard is demoted to a thin start panel, and setup work moves into explicit downstream stages instead of one mixed launch surface. |
| **Project == Course** | In v1, every project is a thin wrapper around an existing `course_id`. No freeform projects. |
| **Bidirectional flow** | Studio preloads and organizes material → transfers to Tutor for study. Tutor sends notes and artifacts back → Studio captures and organizes them. They feed each other. |

**Workflow migration target:**
- `Launch`: routing, resume, recents, due-date and study-wheel context
- `Priming`: course selection, source ingestion, source-linked extraction, readiness gating
- `Tutor`: live teaching against a primed bundle plus session-time capture and memory compaction
- `Polish`: mandatory review, Studio organization, summarization, QA, and publish staging
- `Final Sync`: publish approved notes to Obsidian, cards to Anki, and Brain telemetry/index saves

Current shell modes remain during rollout. The staged workflow is the target execution model layered onto the existing Tutor shell rather than a second competing launch system.

**System boundary:**
- **Brain owns:** broad launch orchestration, course/project selection, pre-launch context
- **Tutor owns:** live study workspace, session execution, notes/artifacts, resume/restore, last-mile launch validation, shell mode switching
- **Library owns:** what Tutor can teach (material scope)
- **SOP owns:** how Tutor teaches (stages, methods, chains, rules)

### Screen Inventory (7 screens)

The Tutor page contains **7 distinct screens** across 1 entry gate + 4 shell modes + 1 settings modal. Every screen is listed here with its name, goal, content, and build status.

**Mode tab bar:** STUDIO | TUTOR | SCHEDULE | PUBLISH | **START** (shortcut button, pink) | **SETTINGS** (opens modal)

The START button in the tab bar is a shortcut to the Start Panel. SETTINGS opens a modal dialog, not a separate mode view.

---

#### Screen 1: START PANEL

| Field | Value |
|-------|-------|
| **Component** | `TutorStartPanel.tsx` (878 lines) |
| **When shown** | No active session. Disappears once a session starts or resumes. |
| **Goal** | Get the learner into a workspace fast. Thin launch/resume — not a wizard. |
| **Status** | LANDED |

**Content (top to bottom):**

| Section | What it shows | Interactive? |
|---------|--------------|-------------|
| **Launch Summary** | Read-only card: current course, study unit, topic, materials count, prime scope, chain name. "TUTOR START" button top-right. | TUTOR START button launches session directly |
| **Readiness Checklist** | 5 items with ✓ or ⏰: Materials, Study unit, Objective scope, Session preflight, Tutor config | No — computed from state |
| **Recent Sessions** | Active session (green border) with RESUME + DELETE buttons. Past sessions list with date, topic, duration, turn count. | Yes — click Resume or Delete |
| **Adjust Launch Options** | Collapsible section. Course dropdown, study unit selector, objective scope toggle (module_all/single_focus), focus objective picker, topic input, materials multi-select, chain mode tabs (AUTO/TEMPLATE/CUSTOM), vault folder path | Yes — full form, but collapsed by default |
| **Start New Session** | Full-width primary button. Disabled until readiness passes. | Yes — calls `createSession()` |

**Key behaviors:**
- Changing course clears materials, objectives, and topic
- Preflight validation runs on every config change
- TEMPLATE tab shows 20 chain cards (click to select/deselect)
- CUSTOM tab embeds `<TutorChainBuilder>` for composing blocks
- START button disabled if `requiresFocusObjective && !selectedObjectiveId`

---

#### Screen 2: STUDIO — L1 Class Picker

| Field | Value |
|-------|-------|
| **Component** | `StudioClassPicker.tsx` |
| **When shown** | Studio mode active, no class selected |
| **Goal** | Pick which class to work in. Top of the 3-level drill-down. |
| **Status** | LANDED |

**Content:**

| Element | Detail |
|---------|--------|
| **Course card grid** | Responsive grid of cards, one per enrolled course |
| **Each card shows** | Course code (e.g. DPT-710), course name, material count, session count, last studied date, promoted resource count, pending/captured counts, and a status badge (ACTIVE/REVIEW/READY/EMPTY) |
| **Click behavior** | Clicking a card drills into L2 for that class |
| **Auto-land** | On page load, auto-navigates to last selected class (stored in localStorage). User can click back to see L1 grid. |

---

#### Screen 3: STUDIO — L2 Class Detail

| Field | Value |
|-------|-------|
| **Component** | `StudioClassDetail.tsx` |
| **When shown** | Studio mode active, class selected, not in workspace |
| **Goal** | See everything about one class. Prepare for a study session. |
| **Status** | LANDED |

**Layout:** Breadcrumb (`Studio > Neuroscience`) + class header with LAUNCH SESSION button + 6-tab bar + tab content area.

**Tab bar: MATERIALS | OBJECTIVES | CARDS & TESTS | VAULT | CHAINS | STATS**

| Tab | Content | Data source | Goal |
|-----|---------|-------------|------|
| **MATERIALS** | List of PDFs, slides, docs, and links for the class. File icon + name + type badge. | `api.tutor.getStudioOverview(courseId)` | View/manage what Tutor can teach from |
| **OBJECTIVES** | Learning objectives grouped by study unit. Objective code + description + status badge. | `api.tutor.getStudioOverview(courseId)` | Track what needs to be learned |
| **CARDS & TESTS** | Course-scoped flashcard draft list with deck name, card type, and status badge. | `api.tutor.getStudioOverview(courseId)` + `card_drafts` | Review card output for this class without client-side deck-name heuristics |
| **VAULT** | Promoted Studio resources for the class with source/date metadata and publish-readiness context. | `api.tutor.getStudioOverview(courseId)` + `studio_items` | Review what is ready to move into Publish / Vault workflows |
| **CHAINS** | Method chain cards. Name, block count, estimated time, rating. Click to expand and see block sequence. | `api.methods.getChains()` | Pick/preview study chains before launch |
| **STATS** | Class stat cards plus recent Tutor / Studio activity. | `api.tutor.getStudioOverview(courseId)` | Track progress for this class |

**LAUNCH SESSION button:** Pinned top-right. Opens Start Panel with the selected class pre-filled.

**Navigation:** Breadcrumb back to L1. Clicking into the workspace goes to L3.

---

#### Screen 4: STUDIO — L3 Workspace

| Field | Value |
|-------|-------|
| **Component** | `TutorStudioMode.tsx` (584 lines) |
| **When shown** | Studio mode active, inside a class workspace |
| **Goal** | Review, refine, and route Studio captures while keeping source material and the workbench visible. |
| **Status** | LANDED |

**Layout:** `grid-cols-[340px_1fr]` — left sidebar + right main. Right splits into `grid-cols-[320px_1fr]` then `grid-rows-[0.75fr_1fr]`.

| Panel | Content | Interactive |
|-------|---------|------------|
| **Left sidebar — Board** | Board scope buttons (SESSION/PROJECT/OVERALL), item count stats, scrollable item list (inbox/boarded/promoted items). Click item to select. | Yes — scope switch, item select |
| **Right top-left — Summary** | Selected item detail card. Status badge. Inline edit fields, MARK BOARDED, ARCHIVE, HISTORY, and promote actions. Archived selections pin their revision history even after they fall off the active board. | Yes — edit, board, archive, history, and promote actions |
| **Right top-right — Source Viewer** | Material picker dropdown + `<MaterialViewer>` (PDF iframe, HTML5 video, or text preview) | Yes — material selection |
| **Right bottom — Workbench** | `<TutorWorkspaceSurface>` with 4 tabs: NOTES (VaultEditor + pinned notes sidebar), CANVAS (ExcalidrawCanvas), GRAPH (GraphPanel), TABLE (ComparisonTableEditor) | Yes — full editing |

**Studio pipeline:**
```
Tutor Chat generates artifacts
    ↓ (Save Note / To Studio buttons)
Capture → Studio Inbox (status: captured)
    ↓ (user edits / boards / archives in L3)
Board → Summary Board (status: boarded)
    ↓ (COPY or MOVE)
Promote → Project Board (status: promoted)
    ↓ (Publish mode)
Publish → Obsidian / Anki / Brain
```

**Board scopes:** Session Board (current session captures) → Project Board (promoted across sessions) → Overall Board (aggregated rollup of promoted items only — not a separate workspace with its own raw items).

**Persistence:** 5 normalized tables: `studio_items`, `studio_item_revisions`, `studio_boards`, `studio_board_entries`, `studio_actions` (audit trail with idempotency keys).

---

#### Screen 5: TUTOR — Live Chat

| Field | Value |
|-------|-------|
| **Component** | `TutorChat.tsx` (426 lines) + `TutorArtifacts.tsx` (1350 lines) + `ContentFilter.tsx` (394 lines) |
| **When shown** | Tutor mode active, session running |
| **Goal** | The live study session. This is where learning happens. |
| **Status** | LANDED |

**Layout:** `grid-cols-[1fr_320px]` — main chat area (left) + sidebar (right).

**Main chat area (left):**

| Section | Content |
|---------|---------|
| **Message list** | Scrollable chat history. User messages + assistant responses with SSE streaming. |
| **After each assistant message** | Verdict badge (PASS/FAIL/PARTIAL with confidence %), Teach-Back badge (accuracy/breadth/synthesis scores), Provenance badge (source citations). All expandable. |
| **Action buttons per message** | See Chat Action Buttons table below. |
| **Input bar row 1** | SOURCES button (opens slide-in panel), Accuracy dropdown (balanced/strict/coverage), Behavior mode buttons (ASK/SOCRATIC, EVALUATE, CONCEPT_MAP, TEACH-BACK) |
| **Input bar row 2** | Speed tier pills: 📚 Materials, 🗂️ Obsidian, 🎬 Gemini Vision, 🔍 Web Search, 🧠 Deep Think (each toggleable) |
| **Input bar row 3** | Text input + SEND button (or STOP button while streaming) |

**Sources panel (slide-in from left when SOURCES clicked):**
- Selected materials list
- Vault folder paths
- North star summary (module content map)
- File upload button

**Right sidebar:**
- During active chat: `<ContentFilter>` (material/chain selection, compact or full mode)
- When viewing artifacts: `<TutorArtifacts>` (artifact list + detail viewer + create/edit/delete)

**Chat action buttons (per assistant message):**

| Button | Action | Icon | Detection |
|--------|--------|------|-----------|
| **Save Note** | Instant capture as note artifact | FileText | Always shown |
| **Create Card** | Create Anki card draft from response | CreditCard | Always shown |
| **Create Map** | Generate concept map artifact | Map | Always shown |
| **Save Table** | Capture markdown table as structured artifact | Table2 | Auto-detected: only appears if response contains a markdown table |
| **Save Map** | Capture Mermaid diagram as artifact | Network | Auto-detected: only appears if response contains a Mermaid code block |
| **To Studio** | Dropdown submenu: **NOTE** (capture to inbox) or **SUMMARY** (auto-compact and capture to board) | StickyNote | Always shown |

Implementation: `MessageList.tsx` lines 298-421.

**Artifact sidebar (`TutorArtifacts.tsx`):**

| Section | Content |
|---------|---------|
| **Tab filter** | NOTE, CARD, MAP, STRUCTURED NOTES (filter artifact list by type) |
| **Artifact list** | Scrollable list with icon, title, timestamp per artifact |
| **Detail view** | Full artifact content: markdown editor for notes, card form for flashcards, mermaid viewer for maps |
| **Create form** | Type dropdown + title input + content textarea |
| **Edit/Delete** | Inline edit, delete with toast confirmation |
| **Wrap Session** | Appears at session end: summary stats (duration, turns, artifacts, objectives, chain progress) |

---

#### Screen 6: SCHEDULE — Events & Planner

| Field | Value |
|-------|-------|
| **Component** | `TutorScheduleMode.tsx` (300 lines) |
| **When shown** | Schedule mode active |
| **Goal** | See what's coming up for this class. Manage study tasks. |
| **Status** | LANDED (stub — event list works, not wired to Calendar for creation or ship-to-calendar) |

**Layout:** 2-column.

| Panel | Content | Interactive |
|-------|---------|------------|
| **Left column** | SCHEDULE MODE stats card with course name + "Local planner" or "Google Calendar" badge (top-right). Stats: PENDING EVENTS, PLANNER QUEUE, RECENT SESSIONS (each with count). Buttons: Generate Review Tasks, Toggle Source, Refresh. UPCOMING COURSE EVENTS list (max 6, sorted by due date, with type badges: EXAM/QUIZ/LECTURE/LAB). COURSE SYLLABUS section (shows course name). | Yes — generate tasks, toggle source |
| **Right column** | `<PlannerKanban>` — task board with TODO/IN PROGRESS/DONE columns | Yes — view tasks |

**Planned but not wired:**
- Ship-to-calendar: push schedule items to the cross-project Calendar page
- Syllabus import: pull syllabus-derived due dates into schedule
- Event creation from within Schedule mode (currently must use Calendar page)

---

#### Screen 7: PUBLISH — Export & Sync

| Field | Value |
|-------|-------|
| **Component** | `TutorPublishMode.tsx` (324 lines) |
| **When shown** | Publish mode active |
| **Goal** | Export session output to durable homes. Compile, review, publish. |
| **Status** | LANDED (basic — load/edit/publish works, no readiness workflow) |

**Layout:** 2-column.

| Panel | Content | Interactive |
|-------|---------|------------|
| **Top — Publish Mode card** | "PUBLISH MODE" header with connection badge (🟢 "Obsidian online" or 🔴 "Obsidian offline"). Description: "Stage a session summary or workspace note for the vault, then clear pending Anki drafts." Stats: ACTIVE SESSION (name or "No active session"), PENDING ANKI DRAFTS (count), VAULT (vault name). Buttons: Load Current Session, Reset Draft. VAULT PATH input (editable, computed default like `Tutor Studio/Exercise Physiology/Tutor Session.md`). Markdown draft textarea (large, editable). PUBLISH TO OBSIDIAN button. | Yes — load, edit, publish |
| **Middle — Anki section** | Anki connection status ("Anki not running" with Retry button, or card draft list with APPROVE/EDIT buttons + SYNC TO ANKI). | Yes — retry, approve, edit, sync |
| **Bottom — Project Resources** | "PROJECT RESOURCES" header with "0 PROMOTED" badge. Text: "Publish acts only on promoted project resources. Review the promoted set here while the publish workspace stages vault and Anki output." Empty state: "No promoted Studio resources yet. Use Studio to review captures, then copy or move the useful pieces up to the project layer." | Readiness gate — partially implemented |

**Planned but not fully built:**
- Partial-failure handling and retry for publish actions
- Brain as a publish target (not just Obsidian and Anki)
- Publish audit trail
- Note: promoted-only publish gate IS partially landed (UI shows the section, enforces "0 promoted" empty state)

#### SETTINGS Modal

| Field | Value |
|-------|-------|
| **Component** | Modal dialog inside `tutor.tsx` |
| **When shown** | Click SETTINGS in the mode tab bar. Opens as overlay, not a separate page. |
| **Goal** | Configure tutor behavior and custom instructions. |
| **Status** | LANDED |

**Content:**

| Section | What it shows | Interactive |
|---------|--------------|------------|
| **TUTOR SETTINGS** header | Modal title with X close button | Yes — close |
| **CUSTOM INSTRUCTIONS** | Large textarea with the tutor's system prompt rules (Hybrid Teaching Mode, Truthful Provenance, source citation rules, etc.) | Yes — editable |
| **Footer buttons** | RESTORE DEFAULTS (left), CANCEL + SAVE (right) | Yes — restore, cancel, save |

---

### Shell Infrastructure

| Feature | Detail | Status |
|---------|--------|--------|
| **Shell state separation** | `project_workspace_state` table (keyed by `course_id`) persists mode, board selection, viewer state. Teaching turns persist separately in `tutor_sessions`. Mode switching never mutates the teaching loop. | LANDED |
| **URL deep-linking** | Query params: `course_id`, `session_id`, `mode`, `board_scope`, `board_id`. Precedence: query params → persisted shell state → last valid course + mode fallback. Functions: `readTutorShellQuery()`, `writeTutorShellQuery()`. | LANDED |
| **Popouts** | Viewer popout (read-only, one-way sync). Current Note popout (editable after BroadcastChannel handshake, two-way sync via `popoutSync.ts`). Edit lease + heartbeat prevents silent state forks. If handshake fails, editable popout disabled. | LANDED |
| **Dictation** | Browser-native into current note via `useChromiumDictation` hook. Chromium-first best-effort. Feature-detected at runtime with unsupported/permission-denied states. No server-side transcription in v1. | LANDED (partial — voice recording works, speech-to-text incomplete) |
| **Speed tiers** | 5 toggleable pills per chat turn: Materials, Obsidian, Gemini Vision, Web Search, Deep Think. Each controls what context the LLM receives. | LANDED |
| **Behavior modes** | 4 override modes: Socratic (questioning), Evaluate (testing), Concept Map (diagram-first), Teach-Back (learner teaches back). Toggle buttons in chat input bar. | LANDED |
| **Message badges** | Verdict (PASS/FAIL/PARTIAL + confidence %), Teach-Back (accuracy/breadth/synthesis scores), Provenance (source citations). All expandable. | LANDED |

### Landed vs Planned — Full Status

| Feature | Status | Notes |
|---------|--------|-------|
| 4-mode shell (Studio/Tutor/Schedule/Publish) | LANDED | Mode switching, toolbar, URL params |
| Start Panel (thin launch/resume) | LANDED | Replaces old wizard |
| Shell state separation (`project_workspace_state`) | LANDED | `db_setup.py` line 2111 |
| URL deep-linking with query params | LANDED | `tutor.tsx` lines 105-143 |
| Studio L3 Workspace (boards + workbench) | LANDED | `TutorStudioMode.tsx` |
| Studio normalized persistence (5 tables) | LANDED | `db_setup.py` lines 2137-2275 |
| Studio capture/promote/restore API | LANDED | `api_tutor_studio.py` |
| Chat action buttons (Save Note/Card/Map/Table/To Studio) | LANDED | `MessageList.tsx` lines 298-421 |
| Verdict + Teach-Back + Provenance badges | LANDED | `MessageList.tsx` lines 14-200+ |
| Speed tier toggles (5 pills) | LANDED | `TutorChat.tsx` lines 64-70 |
| Behavior modes (4 types) | LANDED | `TutorChat.tsx` lines 72-73 |
| Popouts (viewer + current note) | LANDED | `popoutSync.ts`, `tutorWorkspacePopout.ts` |
| Dictation hook | LANDED (partial) | Voice recording works, speech-to-text incomplete |
| Studio L1 Class Picker | LANDED | `StudioClassPicker.tsx` |
| Studio L2 Class Detail (6 tabs) | LANDED | `StudioClassDetail.tsx` |
| Note compaction (SUMMARY auto-compact) | PLANNED | UI button exists in MessageList, backend not wired |
| Publish readiness workflow | PARTIAL | Project Resources section with promoted-only gate landed; partial-failure retry and Brain target not built |
| Settings modal (custom instructions) | LANDED | Modal with editable system prompt, restore defaults, save |
| Schedule ↔ Calendar wiring | PLANNED | Mode exists, not connected to Calendar for creation or ship-to-calendar |
| Source clipping with provenance | PLANNED | PDF page / video timestamp → Studio capture with file/page/time metadata |
| Brain-to-Tutor deep-link launch | PLANNED | Brain should launch directly into correct project/session/mode |
| OpenRouter direct API | PLANNED | Replace Codex CLI subprocess, -2-4s per turn |
| Cross-encoder preload | PLANNED | Background load at startup, -500ms cold start |
| Rich session restore | PLANNED | Serialize full ChatMessage (citations, verdict, toolActions) into `tutor_turns.artifacts_json` |

## Locked Operating Laws

1. Tutor is the bread-and-butter product value. Optimize the live study experience first.
2. Brain is the canonical home surface.
3. Library controls what Tutor teaches.
4. SOP controls how Tutor teaches.
5. Tutor owns the active study workspace and artifact flow.
6. Brain stays evidence-first and must not directly steer Tutor.
7. Scholar is system-facing and does not become the course-content teacher.
8. Obsidian is the durable note home.
9. Archive and old tracks are evidence, not authority.

## Tutor Defaults

- Tutor behavior is modeled as `Category -> Method -> Knob -> Chain`.
- Default operating assumption is first exposure unless the session has strong prior-mastery evidence.
- `PRIME` is non-assessment orientation and artifact setup. `TEACH` is the explanation-first stage when a chain includes it. `CALIBRATE` is where diagnostic checking begins.
- Tutor-generated Obsidian notes must include wiki links at creation time, not as deferred cleanup.
- Mind Map uses `ASCII` as the project-default representation knob unless a session explicitly overrides it.

## System Overview

Five pillars work in a continuous loop:

```
  SOP (methodology)          Brain (data store + tutor engine)
       |                          |
       v                          v
  Adaptive Tutor  --------> Session Logs + DB + ChromaDB
  (native Flask)                  |
       |                          v
  Scholar (auditor) <------- Dashboard (metrics)
       |
       v
  Proposals --> approved --> SOP updates --> method block refresh
```

| Pillar | What It Does | Location |
|--------|-------------|----------|
| **SOP** | Defines *how* learning happens (rules, methods, chains, control-plane contracts) | `sop/library/` |
| **Study Materials Library** | Defines *what* Tutor teaches by managing the learner's class materials | `/library` route + `brain/data/` |
| **Brain** | Stores sessions, telemetry, artifact metadata, indexes, and operational state | `brain/` |
| **Tutor** | Protocol-led study operator that executes the active chain against the learner's selected scope | `brain/dashboard/api_tutor.py` |
| **App Shell** | Serves the Brain, Tutor, Scholar, and support-system routes through the React frontend | `dashboard_rebuild/` |
| **Scholar** | Reads Brain outputs, researches patterns, and proposes evidence-based improvements | `scholar/` |

---

## Architecture

### High-Level Data Flow

```
+------------------+     method blocks       +------------------+
|  SOP Library     |------------------------>|  Adaptive Tutor  |
|  (17 .md files)  |     + chain defs        |  (Flask native)  |
+------------------+                        +--------+---------+
        ^                                            |
        |  proposals                    SSE streaming + vault writes
        |                                            |
+-------+----------+                       +---------v---------+
|  Scholar          |<--- session data -----|  Brain            |
|  (meta-auditor)   |                       |  Flask + SQLite   |
+------------------+                       |  + ChromaDB       |
                                           +---------+---------+
                                                     |
                                             REST API (port 5000)
                                                     |
                                           +---------v---------+
                                           |  Dashboard        |
                                           |  React + Vite     |
                                           +---+---+---+-------+
                                               |   |   |
                                   +-----------+   |   +----------+
                                   |               |              |
                              Google Cal      Anki (8765)    Obsidian
                              /Tasks API      AnkiConnect    CLI wrapper
```

### Request Flow

```
Browser (localhost:5000)
    |
    v
Flask (brain/dashboard/app.py)
    |
    +-- /api/*        --> api_adapter.py (sessions, stats, Obsidian, RAG)
    +-- /api/tutor/*  --> api_tutor.py (40+ endpoints, SSE streaming, chains)
    +-- /api/methods/* --> api_methods.py (composable methods)
    +-- /api/gcal/*   --> gcal.py (Google Calendar)
    +-- /api/scholar/* --> scholar.py (Scholar runs)
    +-- /*            --> serves brain/static/dist/ (React build)
```

---

## Quick Start

```bash
# One-click (recommended)
Start_Dashboard.bat
```

> **Note:** Vite outputs directly to `brain/static/dist/` — no copy step needed. Never use `npm run dev`, and do not start the dashboard through a direct Flask command. Use `Start_Dashboard.bat`.

### First Study Session

1. Launch the app with `Start_Dashboard.bat`.
2. Upload at least one study file on `/library`.
3. Open `/tutor`, use the Tutor start panel to choose or resume the course/material scope, and start the session.
4. Follow the active chain. Wrap writes the `Exit Ticket + Session Ledger` to Brain and, when enabled, to Obsidian and Anki.

---

## Control Plane Pipeline

### CP-MSS v2.0 (7-Stage Pipeline)

Every session follows the Control Plane learning pipeline. Stages execute in dependency order via method block chains.

```
PRIME --> TEACH --> CALIBRATE --> ENCODE --> REFERENCE --> RETRIEVE --> OVERLEARN
  |                                                                          |
  +--------------------------------------------------------------------------+
                           (spaced repetition loop)
```

**The Dependency Law:** No retrieval without targets. Every RETRIEVE stage must be preceded by REFERENCE (target generation).

### Chain Selector (7 Knobs)

The `brain/selector.py` router automatically selects the optimal chain based on 7 input variables:

| Knob | Values | Purpose |
|------|--------|---------|
| `assessment_mode` | procedure, classification, mechanism, definition, recognition | Learning goal type |
| `time_available_min` | 10-120 | Session duration budget |
| `energy` | low, medium, high | User energy level |
| `retrieval_support` | maximal, guided, minimal | Scaffolding level |
| `interleaving_level` | blocked, mixed, full | Topic mixing strategy |
| `near_miss_intensity` | low, medium, high | Adversarial lure density |
| `timed` | off, soft, hard | Time pressure setting |

### First Exposure Chains

| Chain | Duration | Use Case | Stages |
|-------|----------|----------|--------|
| `C-FE-STD` | 35 min | Standard first exposure | PRIME→TEACH→CALIBRATE→ENCODE→REFERENCE→RETRIEVE |
| `C-FE-MIN` | 20 min | Low energy / short time | PRIME→REFERENCE→RETRIEVE→OVERLEARN |
| `C-FE-PRO` | 45 min | Lab/procedure learning | PRIME→TEACH→ENCODE→REFERENCE→RETRIEVE (with fault injection) |

### Operating Modes

| Mode | AI Role | Duration | Use Case |
|------|---------|----------|----------|
| Core | Guide | 45-60 min | First-pass structured learning |
| Sprint | Tester | 30-45 min | Gap-finding via rapid-fire testing |
| Quick Sprint | Tester | 20-30 min | Time-boxed Sprint with mandatory wrap |
| Light | Guide | 10-15 min | Micro-session, single objective |
| Drill | Spotter | Variable | Deep practice on a specific weak area |

---

## SOP Library

> **Not to be confused with the `/library` page** which manages study materials (PDFs, notes, slides).
> `sop/library/` defines the **methodology** — *how* the tutor teaches. Study materials are stored in `brain/data/`.

The **SOP** (Standard Operating Procedure) defines the learning methodology. Source of truth: `sop/library/`.

For runtime wiring details and endpoint/state maps, use `docs/root/PROJECT_ARCHITECTURE.md`.

| # | File | Description |
|---|------|-------------|
| 00 | `00-overview.md` | System identity, version history, library map |
| 01 | `01-core-rules.md` | Behavioral rules: Source-Lock, Seed-Lock, No Phantom Outputs |
| 02 | `02-learning-cycle.md` | CP-MSS v2.0 operational cycle + KWIK encoding micro-loop |
| 03 | `03-frameworks.md` | H/M/Y framework series + L1-L4 depth gating |
| 04 | `04-engines.md` | Anatomy Engine (OIANA+) + Concept Engine |
| 05 | `05-session-flow.md` | Session execution flow (Exposure Check + Split-Track) |
| 06 | `06-modes.md` | Operating modes (Core, Sprint, Light, Quick Sprint, Drill) |
| 07 | `07-workload.md` | 3+2 rotational interleaving + spacing strategy |
| 08 | `08-logging.md` | Logging schema (Session Ledger, Tracker/Enhanced JSON) |
| 09 | `09-templates.md` | Exit ticket, session ledger, weekly plan/review templates |
| 10 | `10-deployment.md` | Deployment guide + Brain ingestion prompts |
| 11 | `11-examples.md` | Command reference and dialogue examples |
| 12 | `12-evidence.md` | Evidence base, research citations, NotebookLM bridge |
| 13 | `13-custom-gpt-system-instructions.md` | Legacy Custom GPT system instructions |
| 14 | `14-lo-engine.md` | Learning Objective Engine protocol pack |
| 15 | `15-method-library.md` | Composable Method Library (54 blocks + chains) |
| 17 | `17-control-plane.md` | Control Plane Constitution (CP-MSS v2.0) |

---

## Brain (Backend)

Flask API + SQLite + ChromaDB. Stores all session data, runs the adaptive tutor engine, serves the dashboard, and integrates with external services.

### Structure

```
brain/
  +-- dashboard/
  |     +-- app.py                # Flask app factory + blueprints
  |     +-- api_adapter.py        # /api/* (sessions, stats, Obsidian, RAG)
  |     +-- api_tutor.py          # /api/tutor/* (40+ endpoints, ~7200 lines)
  |     +-- api_methods.py        # /api/methods/* (composable methods)
  |     +-- gcal.py               # /api/gcal/* (Google Calendar)
  |     +-- calendar.py           # Calendar aggregation
  |     +-- calendar_assistant.py # NL calendar assistant
  |     +-- scholar.py            # /api/scholar/* (Scholar runs)
  |     +-- method_analysis.py    # Method chain analytics
  |     +-- stats.py              # Analytics helpers
  |     +-- utils.py
  +-- data/
  |     +-- pt_study.db           # SQLite database
  |     +-- api_config.json       # Google API config
  |     +-- seed_method_blocks.py # Method block seed data
  +-- session_logs/               # Markdown session logs
  +-- static/dist/                # Compiled React frontend
  +-- tutor_rag.py                # ChromaDB RAG retrieval (MMR, dual-context)
  +-- tutor_chains.py             # Method chain block progression
  +-- tutor_streaming.py          # SSE response formatting + citations
  +-- obsidian_vault.py           # Obsidian CLI wrapper (retry/cache)
  +-- selector.py                 # Control Plane chain selector (7 Knobs)
  +-- selector_bridge.py          # API bridge for selector
  +-- db_setup.py                 # Schema + migrations + error_logs helpers
  +-- config.py                   # App config
  +-- dashboard_web.py            # Flask entrypoint
  +-- tests/                      # pytest suite (916+ tests)
```

### API Endpoints (Key)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/db/health` | DB connection check |
| GET | `/api/sessions` | All sessions (with filters) |
| GET | `/api/sessions/<id>` | Single session |
| GET | `/api/sessions/stats` | Aggregate stats |
| POST | `/api/tutor/session` | Start tutor session |
| GET | `/api/tutor/session/<id>` | Load tutor session state |
| POST | `/api/tutor/session/<id>/turn` | Send a tutor turn (SSE streaming response) |
| GET | `/api/tutor/sessions` | List tutor sessions |
| GET | `/api/tutor/materials` | List Library-backed study materials |
| POST | `/api/tutor/materials/sync` | Sync configured material roots into Library |
| GET | `/api/obsidian/status` | Obsidian vault status |
| GET | `/api/obsidian/files` | List vault files |
| PUT | `/api/obsidian/file` | Save/overwrite vault file |
| GET | `/api/gcal/status` | Google Calendar auth status |
| POST | `/api/gcal/sync` | Two-way calendar sync |
| GET | `/api/methods` | Method block library |
| GET | `/api/chains` | Method chains |
| POST | `/api/scholar/run` | Run Scholar workflow |

---

## Dashboard (Frontend)

React SPA with a retro arcade theme (high-contrast red/black, terminal fonts).

### Tech Stack

- **React 19** + TypeScript 5.6
- **Vite 7** (build)
- **Tailwind CSS 4** (retro arcade theme)
- **Radix UI** + Shadcn/ui (components)
- **TanStack Query 5** (data fetching)
- **Wouter** (routing)
- **Dnd Kit** (drag-and-drop)
- **Framer Motion** (animations)

### Pages

```
localhost:5000/
  +-- /            Brain home
  +-- /brain       Brain home alias
  +-- /tutor       Tutor live workspace
  +-- /scholar     Scholar investigation console
  +-- /library     Library support system
  +-- /calendar    Calendar support system
  +-- /mastery     Mastery support system
  +-- /methods     Methods support system
  +-- /vault-health Vault Health support system
```

### Build + Deploy

```
dashboard_rebuild/          brain/static/dist/
  client/src/                     |
     |                            | Flask serves this
     | npm run build              | at localhost:5000
     v                            |
  build output writes directly --->+
```

Never use `npm run dev`. Build with `npm run build` in `dashboard_rebuild` and run via `Start_Dashboard.bat`.

---

## Adaptive Tutor

The tutor is a **native Flask application** — not a Custom GPT. It runs entirely within the Brain server with RAG-powered retrieval over ingested course materials.

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| API endpoints | `brain/dashboard/api_tutor.py` | Tutor registration/config hub plus split route imports |
| RAG retrieval | `brain/tutor_rag.py` | ChromaDB + Gemini Embedding 2 preview by default, MMR, dual-context search |
| Chain engine | `brain/tutor_chains.py` | Method block progression through CP-MSS stages |
| Streaming | `brain/tutor_streaming.py` | SSE response formatting with inline citations |
| Vault writes | `brain/obsidian_vault.py` | Fire-and-forget Obsidian CLI wrapper with retry/cache |
| Frontend | `dashboard_rebuild/client/src/pages/tutor.tsx` | Chat UI, sources drawer, Map of Contents |
| Templates | `sop/templates/notes/` | 5 block artifact templates (str.format_map) |

### How It Works

```
User selects materials + starts session
    |
    v
Selector (7 Knobs) --> picks chain (e.g., C-FE-STD)
    |
    v
Chain engine steps through method blocks:
    PRIME block --> CALIBRATE block --> ENCODE block --> ...
    |                                                    |
    |  Each block turn:                                  |
    |  1. RAG retrieval (ChromaDB, scoped to materials) |
    |  2. LLM generation (Codex API / speed tier model)   |
    |  3. SSE streaming to frontend                      |
    |  4. Fire-and-forget vault write (if artifact)      |
    |                                                    |
    v
Session wrap --> Exit Ticket + Session Ledger --> DB
```

### Speed Tiers

The tutor supports configurable speed/quality tradeoffs per turn:

| Tier | Model | Reasoning | RAG | Use Case |
|------|-------|-----------|-----|----------|
| Fast | gpt-5.3-codex-spark | None | Parallel | Quick responses, simple queries |
| Balanced | gpt-5.3-codex | Standard | Standard | Default teaching mode |
| Deep | gpt-5.3-codex | Extended | Full | Complex explanations, procedures |

---

## Scholar (Meta-Auditor)

The Scholar audits the study system itself. It reads session logs, detects friction, and proposes evidence-based improvements.

```
Session Logs + DB
       |
       v
  Scholar Pipeline
  +-- brain_reader.py       (reads Brain DB)
  +-- telemetry_snapshot.py  (snapshot metrics)
  +-- friction_alerts.py     (detect friction)
       |
       v
  Orchestrator Run
  +-- Review --> Plan --> Research --> Proposals --> Digest
       |
       v
  scholar/outputs/
    +-- review/          Run summaries
    +-- digests/         Thematic clustering
    +-- proposals/       Change RFCs (approved/rejected)
    +-- module_audits/   SOP module deep-dives
    +-- reports/         Routine audits
```

**Core rules:** One-change-only proposals. Human review required. Evidence-first.

---

## External Integrations

```
+------------------+       +------------------+       +------------------+
|  Google Calendar |       |  Anki Desktop    |       |  Obsidian        |
|  /Tasks API      |       |  (AnkiConnect)   |       |  (CLI wrapper)   |
+--------+---------+       +--------+---------+       +--------+---------+
         |                          |                          |
    OAuth 2.0                  port 8765               obsidian_vault.py
         |                          |                  (retry + cache)
+--------v---------+       +--------v---------+       +--------v---------+
|  brain/gcal.py   |       |  AnkiIntegration |       |  Vault read/     |
|  Two-way sync    |       |  card_drafts --> |       |  write + template |
|  events + tasks  |       |  Anki decks      |       |  rendering        |
+------------------+       +------------------+       +------------------+

+------------------+
|  Tutor models    |
|  (gpt-5.3-codex  |
|   + Gemini/OpenAI|
|   embeddings)    |
+--------+---------+
         |
    Codex CLI auth
    + env-backed embedding config
         |
+--------v---------+
|  Tutor LLM +     |
|  Gemini Embedding|
|  2 preview       |
|  (OpenAI fallback)|
+------------------+
```

| Integration | Purpose | Connection |
|-------------|---------|------------|
| **Google Calendar/Tasks** | Two-way sync of study events + tasks | OAuth 2.0 via `brain/gcal.py` |
| **Anki** | Sync card drafts to Anki Desktop | AnkiConnect on port 8765 |
| **Obsidian** | Vault reads/writes + template rendering | CLI wrapper (`brain/obsidian_vault.py`) |
| **Tutor model + embeddings** | Tutor LLM (`gpt-5.3-codex`) with Gemini Embedding 2 preview by default and OpenAI fallback only when configured | Codex CLI auth + `GEMINI_API_KEY` or fallback embedding env vars |

---

## Database

SQLite at `brain/data/pt_study.db`. Schema managed in `brain/db_setup.py`.

### Tables (25+ total, 16 tutor-specific)

```
+------------------+     +------------------+     +------------------+
|  sessions (90+)  |---->|  lo_sessions     |---->|  learning_       |
|  cols            |     |  (junction)      |     |  objectives      |
+------------------+     +------------------+     +------------------+
        |
        +----------->  topics           courses         course_events
        +----------->  topic_mastery    modules         study_tasks
        +----------->  tutor_turns      tutor_issues    planner_settings

+------------------+     +------------------+     +------------------+
|  card_drafts     |     |  rag_docs        |     |  ingested_files  |
|  (Anki staging)  |     |  (RAG index)     |     |  (checksums)     |
+------------------+     +------------------+     +------------------+

+------------------+     +------------------+     +------------------+
|  scholar_runs    |     |  scholar_digests |     |  scholar_         |
|                  |     |                  |     |  proposals        |
+------------------+     +------------------+     +------------------+

+------------------+     +------------------+     +------------------+
|  method_blocks   |     |  method_chains   |     |  method_ratings  |
|  (54 blocks,     |     |  (CP chain defs) |     |  (user ratings)  |
|   7 CP stages)   |     |                  |     |                  |
+------------------+     +------------------+     +------------------+

+------------------+     +------------------+     +------------------+
|  error_logs      |     |  calendar_action |     |  scraped_events  |
|  (CP telemetry)  |     |  _ledger         |     |  (staging)       |
+------------------+     +------------------+     +------------------+

+------------------+     +------------------+     +------------------+
| project_workspace|     |  studio_items    |     |  studio_item_    |
| _state           |     |  (captures,      |     |  revisions       |
| (shell state per |     |   scope, status)  |     |  (version hist)  |
|  course_id)      |     |                  |     |                  |
+------------------+     +------------------+     +------------------+

+------------------+     +------------------+     +------------------+
|  studio_boards   |     |  studio_board_   |     |  studio_actions  |
|  (session/project|     |  entries         |     |  (audit trail +  |
|   /overall scope)|     |  (item placement)|     |  idempotency)    |
+------------------+     +------------------+     +------------------+
```

### Control Plane Telemetry (error_logs)

The `error_logs` table enables deterministic routing by tracking granular item-level failures:

| Column | Purpose |
|--------|---------|
| `error_type` | Classification: Recall, Confusion, Rule, Representation, Procedure, Computation, Speed |
| `stage_detected` | Control Plane stage where error occurred (RETRIEVE, CALIBRATE, etc.) |
| `confidence` | H/M/L — Used to calculate HCWR (High-Confidence Wrong Rate) |
| `time_to_answer` | Latency in seconds — Used for speed error detection |
| `active_knobs` | JSON of active parameters — Enables A/B testing of knob effectiveness |
| `fix_applied` | Which method override was triggered (e.g., M-ENC-010) |

---

## Development

### Prerequisites

- Python 3.10+
- Node.js 18+
- SQLite 3
- Codex CLI authenticated (`codex login`) for tutor LLM
- `GEMINI_API_KEY` for the default embedding path
- Optional fallback only: `OPENAI_API_KEY` if you intentionally switch embeddings back to OpenAI

### Commands

```bash
# Start dashboard (recommended)
Start_Dashboard.bat

# Validate hermetic harness prerequisites
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Bootstrap -Profile Hermetic -Json

# Run tests (916+ tests)
pytest brain/tests/

# Build frontend (outputs directly to brain/static/dist/)
cd dashboard_rebuild && npm run build

# Run Scholar
scripts/run_scholar.bat
```

The repo-local harness contract lives in `docs/root/GUIDE_DEV.md` and
`scripts/README.md`. `powershell` is the canonical Windows example and `pwsh`
is an accepted equivalent used in CI.

### Post-Change Checklist

1. **Backend changes:** `pytest brain/tests/`
2. **Frontend changes:** `npm run build` in `dashboard_rebuild` + restart Flask
3. **SOP changes:** Update method blocks in DB if block definitions changed

---

## Troubleshooting

- **Nothing shows or the wrong server starts:** always launch with `Start_Dashboard.bat`. Do not use `npm run dev`.
- **Frontend changes do not appear:** rebuild with `cd dashboard_rebuild && npm run build`, restart the app, then hard refresh the browser.
- **Tutor shell loads stale or broken JS:** rebuild the frontend, restart Flask, and hard refresh.
- **Tutor delete/reporting feels inconsistent:** use the returned `request_id` and inspect the persisted Tutor delete telemetry for the exact failure path.
- **Bulk delete leaves the UI stuck:** rebuild, restart, hard refresh, then retry. The intended closeout flow is the themed in-panel confirm, not a stale overlay.
- **Tutor responses are slow:** disable extra toggles you do not need and verify material scope on the turn request.
- **Tutor seems to ignore selected files:** inspect the `turn` request payload and confirm `content_filter.material_ids` contains the full selection.

---

## Repo Layout

```
pt-study-sop/
+-- brain/                  # Flask backend + SQLite + ChromaDB
|   +-- dashboard/          #   API routes + app factory
|   |     +-- api_tutor.py  #   Tutor endpoints (40+, ~7200 lines)
|   +-- data/               #   Database + config
|   +-- session_logs/       #   Markdown session logs
|   +-- static/dist/        #   Compiled React frontend
|   +-- tests/              #   pytest suite (916+ tests)
|   +-- tutor_rag.py        #   ChromaDB RAG retrieval
|   +-- tutor_chains.py     #   Method chain progression
|   +-- tutor_streaming.py  #   SSE streaming + citations
|   +-- obsidian_vault.py   #   Obsidian CLI wrapper
|   +-- selector.py         #   CP chain selector (7 Knobs)
|   +-- db_setup.py         #   Schema + migrations
|   +-- dashboard_web.py    #   Flask entrypoint
+-- dashboard_rebuild/      # React frontend source
|   +-- client/src/         #   Pages, components, API client
|   +-- package.json        #   Dependencies
+-- sop/                    # Study Operating Procedure
|   +-- library/            #   Canonical SOP (17 files)
|   +-- templates/notes/    #   Block artifact templates
|   +-- runtime/            #   Generated bundles (legacy)
|   +-- tools/              #   Build + validation scripts
+-- scholar/                # Meta-auditor
|   +-- outputs/            #   Reviews, digests, proposals
|   +-- workflows/          #   Standard workflows
|   +-- brain_reader.py     #   Reads Brain DB
+-- conductor/              # Product definition + roadmap
|   +-- product.md          #   One-page PRD
|   +-- tech-stack.md       #   Tech stack
|   +-- tracks.md           #   Active tracks
|   +-- workflow.md         #   Task workflow
+-- docs/                   # System documentation
|   +-- TUTOR_ARCHITECTURE.md  # Visual tutor architecture (Mermaid)
+-- scripts/                # Automation scripts
+-- exports/                # Generated exports (spreadsheets, etc.)
+-- Start_Dashboard.bat     # One-click launcher
+-- requirements.txt        # Python dependencies
```

## More Docs

| Doc | Location |
|-----|----------|
| Docs index | `docs/README.md` |
| Tutor architecture (visual) | `docs/TUTOR_ARCHITECTURE.md` |
| Developer guide | `docs/root/GUIDE_DEV.md` |
| Architecture | `docs/root/PROJECT_ARCHITECTURE.md` |
| SOP overview | `sop/library/00-overview.md` |
| Product definition | `conductor/product.md` |
| Calendar/Tasks | `docs/calendar_tasks.md` |
| Dashboard inventory | `docs/dashboard/DASHBOARD_WINDOW_INVENTORY.md` |

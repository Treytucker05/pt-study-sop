# Plan: Tutor Functional Loop

> Source PRD: conversation-derived (grill-me session 2026-03-23)
> Release proof: Trey completes one full study session (Cardiovascular PDF) from Workspace prep → tutor chat → Polish review → Anki/Obsidian export with no errors.
> Audited: 2 independent reviews (dependency + test gate). Revised per findings.

## Architectural Decisions

- **Session API**: `POST /api/tutor/session` — accepts course_id, topic, content_filter, method_chain_id, learning_objectives
- **Turn API**: `POST /api/tutor/session/{id}/turn` — SSE stream
- **Packet storage**: `useState<PacketItem[]>` in WorkspaceStudio, serialized to markdown on Start Tutor
- **Packet serialization**: `packetSerializer.serializePacketForTutor()` → markdown injected into session
- **Feedback API**: `POST /api/brain/profile/feedback`
- **Note capture**: `usePacketCapture` hook (already built)
- **Compaction**: Reuse existing `quickCompactWorkflowMemory()` in useTutorWorkflow
- **Polish API**: `POST /api/tutor/workflows/{id}/polish-assist`
- **Anki API**: `POST /api/anki/drafts/{id}/approve`, `DELETE /api/anki/drafts/{id}`
- **Obsidian API**: `POST /api/obsidian/append`
- **LLM provider**: Google Gemini

## Constraints

- No new dependencies
- Keep existing TutorChat/SSE infrastructure
- Flask serves pre-built static files (rebuild + restart required)
- Phase 1 MUST route through workflow system to get `activeWorkflowId` (required for compaction, polish, notes)

## Out of Scope

- TLDraw, handwriting-to-text, pop-out windows, new DB tables, mobile layout

---

## Phase 1: Tracer Bullet — Start Tutor → Chat → End

**User stories**: US-001, US-002, US-007

### Tasks

| ID | Task | Depends | Gate |
|----|------|---------|------|
| T1.1 | Wire Start Tutor in WorkspaceTopBar to call `startTutorFromWorkflow()` (NOT standalone `startSession`). This ensures `activeWorkflowId` is set, which Phase 4 compaction requires. If no workflow exists, auto-create one from workspace course/topic. | — | `api.tutor.createSession` called with course_id + topic. `activeWorkflowId` is non-null. Session_id stored. |
| T1.2 | On session start, switch workspace mode to "tutor", auto-spawn TutorChatPanel with existing TutorChat as child. Pass session_id. | T1.1 | `screen.findByTestId("tutor-chat-panel")` present. TutorChat receives session_id prop. Mock TutorChat in test (SSE not unit-testable in jsdom). |
| T1.3 | Wire chain picker in TutorChatPanel header. Solo/Auto/Template/Custom modes already built — connect selected chain to session creation params. Default to "freestyle" (no chain). | T1.1 | Chain dropdown renders. Selecting a chain updates `method_chain_id` passed to createSession. |
| T1.4 | Wire End Session button to call `POST /api/tutor/session/{id}/end`. Show EndSessionModal with duration, message count, "Go to Polish" button. | T1.2 | `api.tutor.endSession` called. Modal renders with `data-testid="end-session-modal"`. Go to Polish switches mode. |

### Acceptance criteria

- [ ] Start Tutor creates session WITH workflow (activeWorkflowId is set)
- [ ] TutorChat renders in workspace panel
- [ ] Chain picker shows options, default freestyle works
- [ ] End Session shows summary modal with Go to Polish
- [ ] Build passes

---

## Phase 2: Packet Wiring

**User stories**: US-003

### Tasks

| ID | Task | Depends | Gate |
|----|------|---------|------|
| T2.0 | **Backend**: Add `packet_context` optional string param to `POST /api/tutor/session`. Inject into system prompt if present. | — | API accepts packet_context, tutor LLM receives it in context |
| T2.1 | Pass `packetItems` + `addToPacket` + `removeFromPacket` from WorkspaceStudio through WorkspaceCanvas to all panel content components. Use React context or prop drilling. | — | Each panel's Send to Packet button calls addToPacket. Item appears in PacketPanel (`data-testid="packet-item"`). |
| T2.2 | Wire MethodRunnerContent Send to Packet — replace console.log with addToPacket call | T2.1 | Run method → click Send → `data-testid="packet-item"` count increases by 1 |
| T2.3 | Wire MaterialViewerContent and NotesPanel Send to Packet | T2.1 | Material ref and note text appear as packet items |
| T2.4 | On Start Tutor, call `serializePacketForTutor(packetItems)` and pass as `packet_context` to createSession | T2.0, T2.1, P1 | `api.tutor.createSession` called with `packet_context` containing serialized markdown |
| T2.5 | Toast warning when starting tutor with empty Packet | T2.4 | `toast` called with "No materials in Packet" when packetItems is empty |

### Acceptance criteria

- [ ] All Send to Packet buttons work (Method Runner, Material Viewer, Notes)
- [ ] Packet panel shows items with correct titles
- [ ] Start Tutor passes serialized Packet to backend
- [ ] Empty Packet → toast warning, session still starts
- [ ] Build passes

---

## Phase 3: Note Capture + Feedback

**User stories**: US-004, US-005

### Tasks

| ID | Task | Depends | Gate |
|----|------|---------|------|
| T3.0 | **Backend**: Create `POST /api/tutor/session/{id}/summarize-reply` — accepts `message_text`, returns AI-summarized gist via LLM | — | Endpoint returns `{ summary: "..." }` for a given message |
| T3.1 | Add Save Gist + Save Exact + Like + Dislike buttons to each assistant message in TutorChat message renderer | P1 | `screen.getByRole("button", { name: /save exact/i })` present on each assistant message |
| T3.2 | Wire Save Exact — calls `usePacketCapture.captureExactNote()` with full message text | T3.1, P2 | Click → `addToPacket` called with `{ type: "note", title: "[Exact]...", content: fullText }` |
| T3.3 | Wire Save Gist — calls `POST /api/tutor/session/{id}/summarize-reply`, saves returned summary to Packet | T3.0, T3.1, P2 | Click → API called → `addToPacket` called with `{ type: "note", title: "[Gist]...", content: summary }` |
| T3.4 | Wire Like/Dislike — calls `POST /api/brain/profile/feedback` with session_id, message content, rating | P1 | Click Like → `api.brain.feedback` called with `{ rating: "positive", content: messageText }` |

### Acceptance criteria

- [ ] Every tutor reply shows 4 action buttons
- [ ] Save Exact adds full text to Packet
- [ ] Save Gist adds AI summary to Packet
- [ ] Like/Dislike logs to Brain feedback API
- [ ] Build passes

---

## Phase 4: Compaction & Session Lifecycle

**User stories**: US-006, US-007

### Tasks

| ID | Task | Depends | Gate |
|----|------|---------|------|
| T4.1 | Add "Summarize & Save" button to TutorChatPanel header. Wire to existing `quickCompactWorkflowMemory()` from useTutorWorkflow. Also save result to Packet via `captureCompactSummary()`. | P1, P2 | Click → `quickCompactWorkflowMemory` called → compaction note appears in Packet |
| T4.2 | Auto-trigger compaction after message count exceeds threshold (default: 20, stored in tutor settings). Show toast "Session auto-summarized". | T4.1 | After 20 mock messages, compaction fires without user action. Toast appears. |
| T4.3 | On End Session, run final compaction before showing summary modal. Enhance EndSessionModal from T1.4 with: compaction preview text, notes captured count. | T4.1, T1.4 | End session → `quickCompactWorkflowMemory` called → modal shows compaction preview + note count + Go to Polish |

### Acceptance criteria

- [ ] Manual compaction works and saves to Packet
- [ ] Auto-compaction fires at threshold
- [ ] End Session runs final compaction, modal shows full stats
- [ ] Go to Polish switches to polish mode
- [ ] Build passes

---

## Phase 5: Polish & Export

**User stories**: US-008, US-009

### Tasks

| ID | Task | Depends | Gate |
|----|------|---------|------|
| T5.1 | When workspace mode changes to "polish", auto-add FlaggedRepliesPanel, PolishAssistPanel, AnkiPanel to canvas panel instances. Existing panels stay. | P4 | Mode = "polish" → `screen.findByTestId("flagged-replies-panel")` + `polish-assist-panel` + `anki-panel` present |
| T5.2 | Wire PolishAssistPanel "Run Polish Assist" to `POST /api/tutor/workflows/{id}/polish-assist`. Display card requests, re-prime suggestions, artifact counts. | T5.1 | Click Run → `api.tutor.runPolishAssist` called → results render in panel |
| T5.3 | Wire AnkiPanel approve/reject to `POST /api/anki/drafts/{id}/approve` and `DELETE /api/anki/drafts/{id}` | T5.1 | Approve → `api.anki.approveDraft` called. Reject → `api.anki.deleteDraft` called. |
| T5.4 | Add "Export to Obsidian" button on PacketPanel. Wire to `POST /api/obsidian/append` with `serializePacketForTutor(packetItems)` | T5.1 | Click → `api.obsidian.append` called with serialized content |

### Acceptance criteria

- [ ] Polish mode auto-spawns 3 review panels
- [ ] Polish Assist runs and shows results
- [ ] Anki approve/reject works
- [ ] Obsidian export writes Packet to vault
- [ ] Build passes

---

## Phase 6: Cleanup

**User stories**: US-010, US-011

### Tasks

| ID | Task | Depends | Gate |
|----|------|---------|------|
| T6.1 | Remove old sub-tabs from studioSubTabs array in tutor.tsx. Keep only WORKSPACE. Old components stay in code. | P1 | `screen.queryByRole("tab", { name: /priming/i })` returns null. Only WORKSPACE tab present. |
| T6.2 | Set WORKSPACE as default studioView in useTutorWorkflow localStorage fallback | P1 | Fresh render → studioView = "workspace" |
| T6.3 | Collapse TEACH runtime debug panels behind "Dev Info" toggle in TutorTopBar, closed by default | — | Debug panels not visible on load. Click toggle → panels appear. |
| T6.4 | Fix remaining panel drag/resize/collapse issues found during testing | P1 | Manual verification: drag, resize, collapse all work without visual bugs |

### Acceptance criteria

- [ ] Only WORKSPACE tab visible
- [ ] Fresh load defaults to workspace
- [ ] Debug panels hidden
- [ ] Panels interact correctly
- [ ] Full loop works end-to-end

---

## Dependency Graph

```
Phase 1 (Tracer Bullet) ─────────────────────┐
  T1.1 → T1.2 → T1.4                        │
  T1.1 → T1.3                                │
                                              ▼
Phase 2 (Packet)              Phase 6 (Cleanup)
  T2.0 (backend) ──┐         T6.1 ─┐
  T2.1 ──→ T2.2    │         T6.2  ├─ all independent after P1
  T2.1 ──→ T2.3    │         T6.3  │
  T2.0+T2.1+P1 → T2.4→T2.5  T6.4 ─┘
       │
       ▼
Phase 3 (Notes)
  T3.0 (backend) ──┐
  P1 → T3.1 → T3.2 │
  T3.0+T3.1 → T3.3 │
  P1 → T3.4        │
       │
       ▼
Phase 4 (Compaction)
  P1+P2 → T4.1 → T4.2
  T4.1+T1.4 → T4.3
       │
       ▼
Phase 5 (Polish)
  P4 → T5.1 → T5.2
             → T5.3
             → T5.4
```

## Execution Waves

| Wave | Tasks | Can Parallel? |
|------|-------|--------------|
| **1** | T1.1, T2.0, T3.0, T6.3 | Yes — frontend wiring, 2 backend endpoints, and debug toggle are all independent |
| **2** | T1.2, T1.3, T2.1, T6.1, T6.2 | Yes after Wave 1 |
| **3** | T1.4, T2.2, T2.3, T3.1, T3.4, T6.4 | Yes after Wave 2 |
| **4** | T2.4, T2.5, T3.2, T3.3, T4.1 | Yes after Wave 3 |
| **5** | T4.2, T4.3 | Sequential (T4.2 depends on T4.1, T4.3 depends on both) |
| **6** | T5.1 → T5.2, T5.3, T5.4 | T5.1 first, then T5.2-T5.4 in parallel |

## Audit Findings (Resolved)

| Finding | Resolution |
|---------|------------|
| createSession has no packet_context field | Added T2.0 backend task |
| Save Gist needs new LLM endpoint | Added T3.0 backend task |
| Compaction already exists in useTutorWorkflow | T4.1 rewritten to wire existing function |
| Compaction requires activeWorkflowId | T1.1 must use startTutorFromWorkflow, not standalone startSession |
| T1.4 was redundant (original plan) | Kept but scoped to End Session only (was "full loop" before) |
| Polish panels scope underestimated | Components already built (verified on main), just need canvas wiring |
| Test gates too vague | Every gate now has specific DOM assertions or API mock names |
| T2.2/T2.3 false parallelism (shared file) | Acknowledged — use separate panel files, coordinate WorkspaceCanvas edits |

## Validation Gate

- [x] No circular dependencies
- [x] First wave truly unblocked (T1.1, T2.0, T3.0, T6.3 all independent)
- [x] Task IDs consistent (T1.1-T6.4)
- [x] Every task has concrete completion gate with named assertions
- [x] Backend prerequisites (T2.0, T3.0) identified and scheduled in Wave 1
- [x] Existing code reused where possible (compaction, Polish components, Packet hook)

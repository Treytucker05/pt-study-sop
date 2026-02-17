# Plan: Tutor Tool Calling — Obsidian, Notes, Figma

**Goal**: Give the Tutor chatbot the ability to take actions during a session — save to Obsidian, create notes, draft Anki cards, and create Figma diagrams — using OpenAI Responses API function calling.

**Owner**: Trey  
**Status**: Complete  
**Created**: 2026-02-17  
**Closed**: 2026-02-17  
**Commits**: `138e8b13` (B7 selector), `56c7079a` (B8 readout), `94baf094` (Phase 4-5 Figma + verification)

---

## Architecture Overview

```
User sends message
        |
        v
+------------------+
|  Flask /turn      |   1. Build system prompt + tool definitions
|  endpoint         |   2. Send to Codex API with tools[]
+--------+---------+
         |
         v
+------------------+
|  Codex API        |   3. Model streams text OR emits tool_call events
|  gpt-5.3-codex   |
+--------+---------+
         |
    +----+----+
    |         |
  text     tool_call
    |         |
    v         v
 SSE to    Execute tool server-side:
 browser   - save_to_obsidian()
           - create_note()
           - create_anki_card()
           - create_figma_diagram()
                |
                v
           Send tool result back to Codex API
                |
                v
           Model continues generating text
                |
                v
           SSE to browser
```

### Key Insight
The OpenAI Responses API already supports function tools. We currently only pass `web_search`. We add our custom function tools to the same `tools[]` array. When the model emits a `response.function_call_arguments.done` event, we:
1. Parse the function name + arguments
2. Execute the corresponding backend function
3. Submit the result back via a follow-up API call
4. Continue streaming the model's response

---

## Tools to Implement

### Tool 1: `save_to_obsidian`
**What**: Save or append a note to the user's Obsidian vault.  
**Backend**: Already exists — `POST /api/obsidian/append` with `{path, content}`.  
**Schema**:
```json
{
  "type": "function",
  "name": "save_to_obsidian",
  "description": "Save a study note to the user's Obsidian vault. Use for key concepts, summaries, or anything the student wants to remember.",
  "parameters": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Vault-relative path, e.g. 'Study Notes/Anatomy/Hip Joint.md'"
      },
      "content": {
        "type": "string",
        "description": "Markdown content to append to the file"
      }
    },
    "required": ["path", "content"]
  }
}
```
**Execution**: Internal HTTP call to `POST /api/obsidian/append`.  
**Effort**: Low — endpoint exists, just wire it up.

### Tool 2: `create_note`
**What**: Create a quick note on the dashboard Notes page.  
**Backend**: Already exists — `POST /api/notes` with `{title, content}`.  
**Schema**:
```json
{
  "type": "function",
  "name": "create_note",
  "description": "Create a quick note on the student's Notes page. Use for action items, reminders, or brief observations during the session.",
  "parameters": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "Short title for the note"
      },
      "content": {
        "type": "string",
        "description": "Note body text (markdown supported)"
      }
    },
    "required": ["title", "content"]
  }
}
```
**Execution**: Internal HTTP call to `POST /api/notes`.  
**Effort**: Low — endpoint exists.

### Tool 3: `create_anki_card`
**What**: Draft an Anki flashcard for later review.  
**Backend**: Already exists — `POST /api/tutor/session/<id>/artifact` with `{type: "card", front, back, tags}`.  
**Schema**:
```json
{
  "type": "function",
  "name": "create_anki_card",
  "description": "Create an Anki flashcard draft for spaced repetition review. Use when a key fact, definition, or concept should be memorized.",
  "parameters": {
    "type": "object",
    "properties": {
      "front": {
        "type": "string",
        "description": "Question or prompt side of the card"
      },
      "back": {
        "type": "string",
        "description": "Answer side of the card"
      },
      "tags": {
        "type": "string",
        "description": "Space-separated tags, e.g. 'anatomy hip-joint muscles'"
      }
    },
    "required": ["front", "back"]
  }
}
```
**Execution**: Internal call to artifact endpoint.  
**Effort**: Low — endpoint exists.

### Tool 4: `create_figma_diagram`
**What**: Create a flowchart, concept map, or diagram in Figma.  
**Backend**: NEW — requires Figma MCP integration.  
**Depends on**: `cursor-talk-to-figma-mcp` (sethdford/mcp-figma) or Figma REST API.  

**Figma MCP tools available**:
- `create_frame` — create a frame with position/size
- `create_rectangle` — create shapes
- `create_text` — create text nodes
- `set_fill_color`, `set_stroke_color` — style nodes
- `set_layout_mode` — auto-layout for flowcharts
- `create_connections` — FigJam connector lines between nodes
- `move_node`, `resize_node`, `clone_node` — layout

**Schema**:
```json
{
  "type": "function",
  "name": "create_figma_diagram",
  "description": "Create a visual diagram (flowchart, concept map, or process diagram) in Figma. Use when the student needs to visualize relationships, processes, or hierarchies.",
  "parameters": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "Diagram title"
      },
      "diagram_type": {
        "type": "string",
        "enum": ["flowchart", "concept_map", "process", "hierarchy"],
        "description": "Type of diagram to create"
      },
      "nodes": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {"type": "string"},
            "label": {"type": "string"},
            "type": {"type": "string", "enum": ["start", "end", "process", "decision", "concept"]}
          },
          "required": ["id", "label"]
        },
        "description": "Nodes/boxes in the diagram"
      },
      "edges": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "from": {"type": "string", "description": "Source node id"},
            "to": {"type": "string", "description": "Target node id"},
            "label": {"type": "string", "description": "Edge label (optional)"}
          },
          "required": ["from", "to"]
        },
        "description": "Connections between nodes"
      }
    },
    "required": ["title", "diagram_type", "nodes"]
  }
}
```
**Execution**: Python MCP client → Figma MCP server → Figma plugin.  
**Effort**: High — new integration, new dependency, layout algorithm needed.

---

## Implementation Phases

### Phase 1: Tool Calling Infrastructure (Backend)
**Files**: `brain/llm_provider.py`, `brain/dashboard/api_tutor.py`  
**Effort**: Medium  

- [x] 1.1 Define tool schemas as Python dicts in a new file `brain/tutor_tools.py`
- [x] 1.2 Update `stream_chatgpt_responses` to accept a `tools: list[dict]` parameter and include them in the API payload alongside web_search
- [x] 1.3 Update the SSE event parser to detect `response.function_call_arguments.done` events
- [x] 1.4 Implement tool execution loop: when a tool call is received, execute the function server-side and submit the result back to the API
- [x] 1.5 Update the `/turn` endpoint in `api_tutor.py` to pass tool definitions and handle the multi-turn tool flow
- [x] 1.6 Add tool call results to the SSE stream so the frontend knows a tool was used (e.g., `{"type": "tool_result", "tool": "save_to_obsidian", "success": true}`)

### Phase 2: Local Tools — Obsidian, Notes, Anki (Backend)
**Files**: `brain/tutor_tools.py`  
**Effort**: Low (endpoints already exist)

- [x] 2.1 Implement `execute_save_to_obsidian(path, content)` — calls `/api/obsidian/append` internally
- [x] 2.2 Implement `execute_create_note(title, content)` — calls `/api/notes` internally
- [x] 2.3 Implement `execute_create_anki_card(session_id, front, back, tags)` — calls artifact endpoint
- [x] 2.4 Register all three tools in the tool registry
- [x] 2.5 Update system prompt to tell the model about its tools and when to use them
- [x] 2.6 Test: send "save this to my Obsidian" in chat → verify file created in vault
- [x] 2.7 Test: send "make a flashcard for this" → verify card draft appears in Anki tab
- [x] 2.8 Backend tests pass: `pytest brain/tests/`

### Phase 3: Frontend Tool Feedback (Frontend)
**Files**: `dashboard_rebuild/client/src/components/TutorChat.tsx`, `dashboard_rebuild/client/src/pages/tutor.tsx`  
**Effort**: Medium

- [x] 3.1 Parse new SSE event types: `tool_call` (model is calling a tool) and `tool_result` (tool executed)
- [x] 3.2 Show inline tool indicators in chat: "📝 Saved to Obsidian: Hip Joint.md" or "🃏 Created Anki card"
- [x] 3.3 Show a brief loading state while tool executes (e.g., spinner with "Saving to Obsidian...")
- [x] 3.4 Add tool execution to the artifacts panel (sidebar) so user can see all tool actions in the session
- [x] 3.5 Toast notifications for tool success/failure
- [x] 3.6 Vitest tests pass: `npx vitest run`
- [x] 3.7 Build succeeds: `npm run build`

### Phase 4: Figma MCP Integration (Backend + New)
**Files**: `brain/tutor_tools.py`, `brain/figma_mcp_client.py` (new)  
**Effort**: High  
**Depends on**: Figma MCP server (sethdford/mcp-figma) installed and running

- [x] 4.1 Install Figma MCP server: using `karthiks3000/figma-mcp-server` via stdio + `pip install mcp`
- [x] 4.2 Create `brain/figma_mcp_client.py` — Python MCP client that connects to the Figma MCP server via stdio
- [x] 4.3 Implement `execute_create_figma_diagram(title, diagram_type, nodes, edges)`:
  - Create a frame for the diagram
  - Create text/rectangle nodes for each item
  - Auto-layout nodes in a grid or tree pattern based on diagram_type (flowchart, concept_map, hierarchy)
  - Create connections between nodes using edges
  - Return structured result with node count
- [x] 4.4 Register the Figma tool in the tool registry (4 tools total)
- [x] 4.5 Tests: 19 tests in `brain/tests/test_figma_tools.py` — all passing
- [x] 4.6 Handle Figma MCP connection errors gracefully (tool fails → model continues without it)

### Phase 5: Verification & Polish
- [x] 5.1 Full E2E test: start session → chat → model autonomously saves to Obsidian, creates card, makes diagram
- [x] 5.2 Verify tools don't fire when not needed (system prompt instructs model; rate limit enforced)
- [x] 5.3 Rate limiting: max 5 tool calls per turn to prevent runaway (line 811 in api_tutor.py)
- [x] 5.4 All tests pass: pytest 192/192, build clean
- [x] 5.5 Build succeeds: `npm run build` clean
- [x] 5.6 Updated system prompt with tool capabilities (AGENTS.md tool table already current)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| ChatGPT backend API doesn't support custom function tools | Blocks entire plan | Test with a simple function tool first (Phase 1.2). If blocked, fall back to prompt-based tool detection (regex on model output). |
| Figma MCP requires Figma desktop app open | Limits when Figma tools work | Make Figma tool optional — graceful degradation if MCP server not running. |
| Model over-uses tools (saves everything) | Noisy, too many Obsidian files | Tunable system prompt: "Only use tools when the student explicitly asks or when creating a study artifact." |
| Tool execution adds latency to responses | Slower chat | Tool calls are mid-stream pauses. Show loading indicator. Most tools (Obsidian, Notes) are <200ms. |
| MCP Python client complexity | Dev time | Use `mcp` Python SDK (`pip install mcp`). Well-documented. |

---

## Open Questions

1. **ChatGPT backend API function tool support**: The `/backend-api/codex/responses` endpoint may not support custom function tools the same way the public API does. Need to test in Phase 1.2 before committing to this approach. Fallback: parse model output for structured tool-call markers.

2. **Figma MCP variant**: Two options exist:
   - `sethdford/mcp-figma` (Cursor Talk To Figma) — requires Figma plugin running, uses WebSocket channel
   - `glips/figma-context-mcp` — read-only, for design-to-code, not useful here
   - Figma REST API directly — no MCP needed, but fewer capabilities
   
   **Recommendation**: Start with `sethdford/mcp-figma` since it has create/modify tools.

3. **Should tools be opt-in?** Should the user toggle tools on/off per session, or always available?

---

## Definition of Done

- [ ] Tutor can save notes to Obsidian mid-conversation when asked
- [ ] Tutor can create quick notes on the Notes page when asked  
- [ ] Tutor can draft Anki cards when asked
- [ ] Tutor can create Figma diagrams when asked (requires Figma MCP running)
- [ ] All tool actions show visual feedback in the chat UI
- [ ] All tool actions recorded in session artifacts
- [ ] No regressions: vitest 13/13, pytest 156/156, build clean

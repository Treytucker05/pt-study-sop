# PRD: AI Calendar Assistant Integration

## Introduction

Wire the existing AI Assistant UI to the Python backend, enabling natural language control over Google Calendar, Google Tasks, and academic deadlines. Users configure their OpenRouter API key via `.env` file. The assistant gets full read/write access to all Google Calendars and can create, edit, delete events and tasks through conversational commands.

## Goals

- Connect frontend CalendarAssistant chat to Python calendar_assistant.py backend
- Enable OpenRouter API integration via environment configuration
- Provide full CRUD access to all Google Calendars (read/write/delete)
- Support Google Tasks management through natural language
- Create academic deadlines from conversation
- Parse natural language scheduling (e.g., "MWF 2pm", "next Tuesday")
- Persist conversation history within session
- Handle errors gracefully with user-friendly messages

## Non-Goals

- No OAuth flow for OpenRouter (manual .env setup only)
- No per-calendar permission restrictions (all calendars accessible)
- No conversation history persistence across browser sessions
- No voice input or speech-to-text
- No automatic scheduling suggestions based on workload
- No integration with external calendars beyond Google

## User Stories

### US-001: Wire frontend chat to Python backend
**Description:** As a user, I want my chat messages to reach the Python calendar assistant so it can execute calendar operations.

**Acceptance Criteria:**
- [ ] Frontend `/api/brain/chat` routes to Python `calendar_assistant.py`
- [ ] Express server proxies requests to Flask backend
- [ ] Response streams back to frontend chat UI
- [ ] Error responses display in chat as assistant message
- [ ] Typecheck passes

### US-002: Configure OpenRouter API key
**Description:** As a developer, I need to set my OpenRouter API key so the assistant can use LLM capabilities.

**Acceptance Criteria:**
- [ ] `OPENROUTER_API_KEY` read from `brain/.env` file
- [ ] `llm_provider.py` uses OpenRouter when key is present
- [ ] Clear error message in chat if API key missing or invalid
- [ ] Document setup in README or `.env.example`
- [ ] Typecheck passes

### US-003: List calendar events via chat
**Description:** As a user, I want to ask "What's on my calendar tomorrow?" and see my events.

**Acceptance Criteria:**
- [ ] `list_events` tool queries all visible Google Calendars
- [ ] Returns events with title, time, and calendar name
- [ ] Supports date ranges ("this week", "next Monday")
- [ ] Handles empty results gracefully ("No events found")
- [ ] Typecheck passes

### US-004: Create calendar event via chat
**Description:** As a user, I want to say "Add PT study session tomorrow at 2pm for 2 hours" and have it appear on my calendar.

**Acceptance Criteria:**
- [ ] `create_event` tool creates event on primary calendar
- [ ] Parses natural language time ("tomorrow 2pm", "Friday at 3")
- [ ] Supports duration specification ("for 2 hours", "until 5pm")
- [ ] Confirms creation with event details in chat
- [ ] Event appears in calendar UI after creation
- [ ] Invalidates calendar query cache on success
- [ ] Typecheck passes

### US-005: Create events on specific calendar
**Description:** As a user, I want to specify which calendar to add events to.

**Acceptance Criteria:**
- [ ] User can say "Add workout to my Fitness calendar"
- [ ] Assistant matches calendar by name (fuzzy match)
- [ ] Falls back to primary if no match found
- [ ] Lists available calendars if ambiguous
- [ ] Typecheck passes

### US-006: Batch create recurring events
**Description:** As a user, I want to say "Schedule PT study MWF 2-4pm for the semester" and create multiple events.

**Acceptance Criteria:**
- [ ] `batch_create_events` tool handles multiple events
- [ ] Parses class schedule notation (MWF, TTh, MW)
- [ ] Supports date ranges ("for the semester", "until May 15")
- [ ] Confirms count of events created
- [ ] Typecheck passes

### US-007: Edit existing calendar event
**Description:** As a user, I want to say "Move my 2pm meeting to 3pm" and update the event.

**Acceptance Criteria:**
- [ ] Assistant finds event by title/time match
- [ ] `update_event` tool modifies event properties
- [ ] Supports changing: title, start time, end time, description
- [ ] Confirms update with before/after details
- [ ] Handles "event not found" gracefully
- [ ] Typecheck passes

### US-008: Delete calendar event via chat
**Description:** As a user, I want to say "Cancel my dentist appointment on Friday" and remove it.

**Acceptance Criteria:**
- [ ] `delete_event_by_title` finds event by title search
- [ ] Asks for confirmation before deleting
- [ ] Supports date scoping ("on Friday", "tomorrow")
- [ ] `batch_delete_events` handles multiple deletions
- [ ] Confirms deletion in chat
- [ ] Typecheck passes

### US-009: List Google Tasks via chat
**Description:** As a user, I want to ask "What tasks do I have?" and see my task lists.

**Acceptance Criteria:**
- [ ] `list_tasks` tool queries Google Tasks API
- [ ] Returns tasks grouped by list
- [ ] Shows task title, due date (if set), and status
- [ ] Typecheck passes

### US-010: Create Google Task via chat
**Description:** As a user, I want to say "Add task: Review anatomy notes, due Friday" and create it.

**Acceptance Criteria:**
- [ ] `create_task` tool creates task in specified list
- [ ] Defaults to first task list if not specified
- [ ] Parses due date from natural language
- [ ] Confirms creation with task details
- [ ] Invalidates tasks query cache on success
- [ ] Typecheck passes

### US-011: Complete/delete Google Task via chat
**Description:** As a user, I want to mark tasks complete or delete them through chat.

**Acceptance Criteria:**
- [ ] `complete_task` marks task as done
- [ ] `delete_task` removes task from list
- [ ] Finds task by title match
- [ ] Confirms action in chat
- [ ] Typecheck passes

### US-012: Create academic deadline via chat
**Description:** As a user, I want to say "Quiz in Anatomy on March 15" and add it to deadlines.

**Acceptance Criteria:**
- [ ] `create_deadline` tool inserts into `academic_deadlines` table
- [ ] Parses deadline type (assignment, quiz, exam, project)
- [ ] Extracts course name from context
- [ ] Confirms creation with deadline details
- [ ] Deadline appears in dashboard after creation
- [ ] Typecheck passes

### US-013: Conversation history within session
**Description:** As a user, I want to see my previous messages in the chat so I have context.

**Acceptance Criteria:**
- [ ] Messages persist in React state during session
- [ ] Scrollable message history
- [ ] User messages aligned right, assistant left
- [ ] Timestamps on messages (optional)
- [ ] History cleared on page refresh (by design)
- [ ] Typecheck passes

### US-014: Error handling and user feedback
**Description:** As a user, I want clear error messages when something fails.

**Acceptance Criteria:**
- [ ] API key missing: "OpenRouter API key not configured. Add OPENROUTER_API_KEY to brain/.env"
- [ ] API rate limit: "Rate limited. Please wait a moment and try again."
- [ ] Google auth expired: "Google authentication expired. Please reconnect in settings."
- [ ] Network error: "Connection failed. Check your internet and try again."
- [ ] Tool execution error: Shows specific error from backend
- [ ] Typecheck passes

### US-015: Loading states and UX polish
**Description:** As a user, I want visual feedback while the assistant is thinking.

**Acceptance Criteria:**
- [ ] "Thinking..." indicator with animated dots
- [ ] Input disabled while processing
- [ ] Send button shows loading state
- [ ] Long operations show progress ("Creating 15 events...")
- [ ] Typecheck passes

## Functional Requirements

- FR-1: Express server proxies `/api/brain/chat` POST requests to Flask `/api/calendar-assistant/chat`
- FR-2: Flask endpoint accepts `{ message: string, history?: Message[] }` and returns `{ response: string, actions?: Action[] }`
- FR-3: `calendar_assistant.py` uses OpenRouter via `llm_provider.py` with model `deepseek/deepseek-chat` or `anthropic/claude-3.5-sonnet`
- FR-4: LLM receives system prompt with available tools and current date/time context
- FR-5: Tool calls execute against Google Calendar API with full scope (`https://www.googleapis.com/auth/calendar`)
- FR-6: Tool calls execute against Google Tasks API with full scope (`https://www.googleapis.com/auth/tasks`)
- FR-7: Academic deadline creation inserts directly into SQLite `academic_deadlines` table
- FR-8: All calendar modifications invalidate React Query cache for `calendar-events` and `google-calendar`
- FR-9: All task modifications invalidate React Query cache for `google-tasks`
- FR-10: Conversation history maintained in `CalendarAssistant.tsx` component state as `Message[]`
- FR-11: Error responses from backend include `error: string` field for frontend display
- FR-12: Backend logs all tool executions to `calendar_action_log` table for audit trail

## Technical Considerations

### Backend Integration
- Proxy pattern: Express → Flask avoids CORS complexity
- Use existing `brain/dashboard/calendar_assistant.py` tool definitions
- Extend `llm_provider.py` to read `OPENROUTER_API_KEY` from environment

### Google API Scopes Required
```
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/tasks
```

### Message Format
```typescript
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface ChatRequest {
  message: string;
  history?: Message[];
}

interface ChatResponse {
  response: string;
  actions?: {
    type: 'event_created' | 'event_deleted' | 'task_created' | 'deadline_created';
    details: Record<string, unknown>;
  }[];
  error?: string;
}
```

### Tool Definitions (extend existing)
```python
TOOLS = [
    # Calendar
    "list_events",        # existing
    "create_event",       # existing
    "batch_create_events",# existing
    "update_event",       # NEW
    "delete_event_by_title", # existing
    "batch_delete_events",# existing

    # Tasks (NEW)
    "list_tasks",
    "create_task",
    "complete_task",
    "delete_task",

    # Deadlines (NEW)
    "create_deadline",
    "list_deadlines",
]
```

### Environment Configuration
```bash
# brain/.env
OPENROUTER_API_KEY=sk-or-v1-xxxxx
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google-calendar/oauth/callback
```

## Success Metrics

- User can create a calendar event in under 10 seconds via chat
- Natural language parsing succeeds >90% of common date/time formats
- Error messages are actionable (user knows what to fix)
- No regressions in existing calendar or task functionality
- All tool executions logged for debugging

## Open Questions

1. Should conversation history persist to database for cross-session recall?
2. Should we add a "suggested commands" tooltip for discoverability?
3. Should batch operations have a confirmation step before execution?
4. Should we support undo for recent actions?

## Implementation Order

1. **Phase 1: Wire the connection**
   - US-001: Frontend to backend routing
   - US-002: OpenRouter API configuration
   - US-014: Error handling

2. **Phase 2: Calendar operations**
   - US-003: List events
   - US-004: Create event
   - US-005: Specific calendar targeting
   - US-007: Edit event
   - US-008: Delete event

3. **Phase 3: Batch and scheduling**
   - US-006: Batch create with MWF notation

4. **Phase 4: Tasks integration**
   - US-009: List tasks
   - US-010: Create task
   - US-011: Complete/delete task

5. **Phase 5: Deadlines and polish**
   - US-012: Create academic deadline
   - US-013: Conversation history
   - US-015: Loading states

## File Changes Required

### New Files
- None (using existing components)

### Modified Files
- `dashboard_rebuild/server/routes.ts` - Add proxy route to Flask
- `dashboard_rebuild/client/src/components/CalendarAssistant.tsx` - Enhanced chat handling
- `dashboard_rebuild/client/src/api.ts` - Chat endpoint typing
- `brain/dashboard/calendar_assistant.py` - Add task/deadline tools
- `brain/llm_provider.py` - Ensure OpenRouter key loading
- `brain/.env` - Document required variables
- `brain/dashboard/routes.py` - Add `/api/calendar-assistant/chat` endpoint

### Dependencies
- No new npm packages required
- No new Python packages required (googleapis, openai already installed)

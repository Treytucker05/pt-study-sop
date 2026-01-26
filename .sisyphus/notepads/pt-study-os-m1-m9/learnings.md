# Learnings - PT Study OS M1-M9

## [2026-01-25T23:35] Initial Research - M1 Brain Ingestion

### Route Definitions Confirmed
- `/api/brain/ingest` route EXISTS at `brain/dashboard/api_adapter.py:4680`
- `/api/brain/chat` route EXISTS at `brain/dashboard/api_adapter.py:3864`
- Blueprint `adapter_bp` registered in `brain/dashboard/app.py:30`
- Frontend API client has correct path: `api.brain.ingest()` at `dashboard_rebuild/client/src/lib/api.ts:345`

### Test Script Structure
- Test script: `scripts/test_brain_ingest.sh`
- Tests 3 scenarios:
  1. Empty content (should return error)
  2. Non-WRAP content (should return "not valid WRAP format")
  3. Valid WRAP (should return `sessionSaved: true`)
- Uses scoring system: needs patterns like "Section A/B/C/D", "front:/back:", "WRAP" keyword
- Score >= 2 required to pass WRAP validation

### Frontend Filter Patterns Discovered
- Filter state pattern: `useState<string>("")` for filters
- Default values: empty string (no filter) or "all" (show all)
- React Query for data fetching with typed responses
- No URL parameter handling currently implemented
- Dependent queries use `enabled` option

### API Request Patterns
- Namespace-based organization: `api.sessions.getAll()`
- Generic `request<T>()` helper for type safety
- Mutation pattern with `onSuccess`/`onError` handlers
- Query invalidation after mutations

### Session Filtering Current State
- `get_sessions()` at `brain/dashboard/api_adapter.py:293`
- Currently returns ALL sessions ordered by date DESC
- No query parameter filtering implemented yet
- Returns 20+ fields including `session_date`, `session_time`, `main_topic`

### Test Files Available
- `brain/tests/test_ingest_session.py` - session ingestion tests
- `brain/tests/test_wrap_parser.py` - WRAP parsing tests
- `brain/tests/test_trends.py` - analytics tests

## [2026-01-26T00:15] UI Redesign - Brain Page

### Changes Made
- Removed Tabs component from Brain page
- Created grid layout with all sections visible at once
- Ingestion now prominently displayed at top (no longer buried in 4th tab)
- Layout: Ingestion (full-width top) → Evidence+Metrics (side-by-side) → Issues (full-width bottom)
- All functionality preserved, only layout changed

### Technical Details
- File: `dashboard_rebuild/client/src/pages/brain.tsx`
- Lines changed: +24, -31
- Removed: Tabs, TabsList, TabsTrigger, TabsContent wrappers
- Added: Section headers with font-arcade styling
- TypeScript check: ✓ Passed

### Build Note
- Frontend build must be done on Windows (esbuild WSL compatibility issue)
- User needs to run: `cd dashboard_rebuild && npm run build` in PowerShell
- Then copy `dist/public/*` to `brain/static/dist/`

### Commit
- Hash: 697b8ecb
- Message: "feat(ui): redesign Brain page - remove tabs, add grid layout with prominent Ingestion"

## [2026-01-26T00:30] WRAP Ingestion UI Added

### Changes Made
- Added dedicated WRAP Session Ingestion section to IngestionTab component
- Positioned at top (most prominent) before Material Ingestion
- Features:
  - File upload input (.md, .txt files)
  - Textarea for pasting WRAP content
  - "- OR -" divider for clarity
  - Submit button with disabled state
  - Success/error feedback with color coding

### Technical Details
- File: `dashboard_rebuild/client/src/components/IngestionTab.tsx`
- Lines changed: +110, -15
- State added: wrapContent, wrapFile, wrapStatus
- Handler: handleWrapSubmit() calls api.brain.ingest()
- Styling: border-primary, bg-primary/5, font-arcade, font-terminal
- TypeScript check: ✓ Passed

### Agent Note
- visual-engineering category FAILED (used Google direct API, modified wrong files)
- quick category SUCCEEDED (used OpenRouter, correct implementation)
- Lesson: Use quick/unspecified categories for reliable execution

### Commit
- Hash: 647d3f86
- Message: "feat(ui): add WRAP session ingestion to Ingestion tab"

## [2026-01-26T00:35] ChatGPT Prompt Helper for WRAP

### Changes Made
- Added WRAP_PROMPT constant with complete WRAP format instructions
- Added "Copy Prompt for ChatGPT" button to WRAP ingestion section
- Button positioned before file upload for logical workflow
- Helper text: "Use ChatGPT to convert your notes to WRAP format, then paste or upload below:"

### WRAP Prompt Content
Instructs ChatGPT to convert study notes into WRAP format with:
- Section A: Obsidian Notes (concepts, insights)
- Section B: Anki Cards (front:/back: format)
- Section C: Spaced Schedule (R1-R4 intervals)
- Section D: JSON Logs (topic, mode, duration, ratings)

### Technical Details
- File: `dashboard_rebuild/client/src/components/IngestionTab.tsx`
- Lines changed: +67, -19
- WRAP_PROMPT added at line 46 (after LO_PROMPT)
- Button added at line 197 (before file upload)
- Styling matches existing Schedule/LO buttons
- TypeScript check: ✓ Passed

### Commit
- Hash: 89c07d35
- Message: "feat(ui): add ChatGPT prompt helper for WRAP ingestion"

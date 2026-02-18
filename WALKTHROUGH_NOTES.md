# PT Study System - Walkthrough Notes

**Date:** 2026-02-18  
**Status:** In Progress  
**Server:** Running on http://127.0.0.1:5000  
**System Version:** CP-MSS v1.0 (Control Plane)

---

## ✅ Step 1: Server Startup - WORKING

### What We Did:
1. Killed existing Python processes
2. Ran `Start_Dashboard.bat`
3. Verified database initialization (v9.4 schema)
4. Confirmed UI build completed successfully
5. Started Flask server on port 5000

### Findings:
- ✅ Database initialized successfully at `brain/data/pt_study.db`
- ✅ **Control Plane schema active** (PRIME→CALIBRATE→ENCODE→REFERENCE→RETRIEVE→OVERLEARN)
- ✅ UI build completed (output to `brain/static/dist/`)
- ✅ Flask server started with all routes registered
- ✅ **Chain Selector loaded** (7 Knobs routing to C-FE-STD/MIN/PRO)
- ⚠️ Obsidian connection failed (expected - not running)
- ⚠️ Anki status checked (will test separately)

### Registered Routes Summary:
- **Sessions API:** 12 endpoints (GET/POST/DELETE/PATCH)
- **Calendar API:** Google Calendar integration (OAuth)
- **Tasks API:** Google Tasks integration
- **Obsidian API:** Vault file access
- **Anki API:** Card draft management
- **Scholar API:** Meta-auditor runs
- **Tutor API:** Session management
- **Methods API:** Block/chain management
- **Courses API:** Study wheel management

### Browser Console Note:
```
percentages-BXMCSKIN-BQTaMnqm.js:116 [Violation] Permissions policy violation: 
unload is not allowed in this document.
```
*This is a minor browser policy warning, not critical.*

---

## 🔄 Step 2: Dashboard Page - Testing in Progress

### Expected Features (from documentation):

#### Zone 1 - Action:
- [ ] **Study Wheel**: Shows current course, rotates after session completion
- [ ] **Add Course**: Dialog to add new courses
- [ ] **Complete Session**: Log minutes and rotate wheel
- [ ] **Streak Counter**: Day streak display

#### Zone 2 - Awareness:
- [ ] **Today's Activity**: Session count and minutes
- [ ] **Today's Focus**: Due tasks from planner queue
- [ ] **Deadlines**: Academic deadlines (assignment/quiz/exam tracking)
- [ ] **Courses Summary**: All courses with session/minute stats
- [ ] **Weakness Queue**: Topics flagged as difficult

#### Zone 3 - Planning:
- [ ] **Planner Kanban**: Task management board
- [ ] **Google Tasks**: Synced task lists

### Testing Checklist:
- [ ] Page loads without errors
- [ ] Study wheel displays correctly
- [ ] Can add a test course
- [ ] Can log a test session
- [ ] Deadlines display correctly
- [ ] Notes panel opens/closes

---

## ⏳ Step 3: Brain Page - Pending

### Expected Features:
- **Vault Sidebar**: Obsidian vault file browser
- **Main Content Area**: Canvas, editor, or viewer
- **Chat Panel**: AI tutor chat interface
- **Modes**: Vault, Data, Canvas, Import

### Testing Checklist:
- [ ] Page loads without errors
- [ ] Vault sidebar expands/collapses
- [ ] Can browse Obsidian files (if Obsidian running)
- [ ] Session ingestion interface works
- [ ] Chat panel functions

---

## ⏳ Step 4: Calendar Page - Pending

### Expected Features:
- **Google Calendar Integration**: Two-way sync
- **Local Events**: Manual event management
- **Task Integration**: Google Tasks display
- **Calendar Assistant**: Natural language scheduling

### Testing Checklist:
- [ ] Page loads without errors
- [ ] Google auth status displays
- [ ] Can connect to Google Calendar (if credentials configured)
- [ ] Local events can be created

---

## ⏳ Step 5: Scholar Page - Pending

### Expected Features:
- **Run History**: Past meta-auditor runs
- **Proposals**: System improvement suggestions
- **Lifecycle Panel**: Active proposals status
- **Research**: Evidence-based recommendations

### Testing Checklist:
- [ ] Page loads without errors
- [ ] Can view past runs
- [ ] Can view proposals
- [ ] Scholar run can be triggered (if configured)

---

## ⏳ Step 6: Tutor Page - Pending

### Expected Features:
- **SOP Explorer**: Browse SOP library
- **Chat Interface**: Interactive tutor
- **Method Blocks**: Access to method library
- **Chain Builder**: Create study method chains

### Testing Checklist:
- [ ] Page loads without errors
- [ ] SOP files are browseable
- [ ] Chat interface responsive
- [ ] Method blocks accessible

---

## ⏳ Step 7: Methods Page - Pending

### Expected Features:
- **Method Block Library**: 18 seed blocks
- **Method Chains**: 6 templates
- **Analytics**: Method usage statistics
- **Chain Builder**: Drag-and-drop chain creation

### Testing Checklist:
- [ ] Page loads without errors
- [ ] Method blocks display
- [ ] Chains display
- [ ] Can create/edit chains

---

## ⏳ Step 8: External Integrations - Pending

### Google Calendar/Tasks:
- **Status**: Not tested
- **Requirements**: OAuth credentials in `brain/data/api_config.json`
- **Test**: Connect and sync events

### Anki (AnkiConnect):
- **Status**: Not tested
- **Requirements**: Anki Desktop running with AnkiConnect plugin on port 8765
- **Test**: Sync card drafts

### Obsidian:
- **Status**: Connection failed (expected)
- **Requirements**: Obsidian running with Local REST API plugin on port 27124
- **Test**: Browse vault, append notes

### Custom GPT:
- **Status**: External - not testable here
- **Requirements**: OpenAI account, runtime bundle uploaded
- **Note**: This is your AI tutor interface

---

## Control Plane Migration (CP-MSS v1.0) - COMPLETED

### Summary of Changes
The system has been migrated from the PEIRRO taxonomy to the **Control Plane Modular Study System (CP-MSS v1.0)**:

**Old Taxonomy (PEIRRO):**
- Prepare → Encode → Interrogate → Retrieve → Refine → Overlearn

**New Taxonomy (Control Plane):**
- PRIME → CALIBRATE → ENCODE → REFERENCE → RETRIEVE → OVERLEARN

### Files Updated
1. **Database** (`brain/db_setup.py`, `brain/data/seed_methods.py`)
   - `method_blocks` table now uses `control_stage` column
   - 46 method blocks re-categorized into 6 Control Plane stages

2. **Chain Library** (`sop/library/chains/`)
   - `C-FE-STD.yaml` - Standard First Exposure (35 min)
   - `C-FE-MIN.yaml` - Minimal First Exposure (20 min)
   - `C-FE-PRO.yaml` - Procedure First Exposure (45 min)
   - All chains enforce **Dependency Law**: REF before RET

3. **Selector** (`brain/selector.py`, `brain/selector_bridge.py`)
   - 7 Knobs routing: assessment_mode, time_available_min, energy, retrieval_support, interleaving_level, near_miss_intensity, timed
   - Automatic chain selection based on user context

### Stage Mappings
| Old Category | New Stage | Block Count |
|--------------|-----------|-------------|
| prepare | PRIME | 8 |
| (new) | CALIBRATE | 4 |
| encode | ENCODE | 18 |
| interrogate | REFERENCE | 4 |
| retrieve | RETRIEVE | 9 |
| refine/overlearn | OVERLEARN | 3 |

### Error Telemetry (error_logs Table)
**NEW:** Granular error tracking for deterministic routing

| Column | Type | Purpose |
|--------|------|---------|
| `error_type` | TEXT | Recall, Confusion, Rule, Representation, Procedure, Computation, Speed |
| `stage_detected` | TEXT | CP stage where error occurred |
| `confidence` | TEXT | H/M/L (for HCWR calculation) |
| `time_to_answer` | REAL | Latency in seconds |
| `active_knobs` | TEXT | JSON of active parameters (A/B testing) |
| `fix_applied` | TEXT | Method override triggered |

**Helper Functions:**
- `log_error()` - Insert error telemetry
- `get_dominant_error()` - For selector.py input
- `get_error_stats()` - Calculate HCWR, median latency

### Key Rules
- **Dependency Law**: No retrieval without targets (REF must precede RET)
- **Low Battery Rule**: Energy=low or time<25 min → routes to C-FE-MIN
- **Error Injection**: Past errors tweak knobs (Speed→timed=hard, Confusion→near_miss_intensity=high)

---

## Known Issues / Notes

### Minor Issues:
1. **Batch file input redirection error**: The `Start_Dashboard.bat` has an issue with input redirection when starting the server in a new window. Workaround: Start server manually with `python brain/dashboard_web.py`

2. **Browser console warning**: Permissions policy violation for 'unload' - minor, doesn't affect functionality

### Working Well:
1. Database initialization and migration
2. UI build process
3. Flask server startup and route registration
4. Session resume generation (11 logs processed)

### External Dependencies Not Running:
- Obsidian (port 27124) - Connection refused (expected if not running)
- Anki (port 8765) - Not tested yet
- Google Calendar - Not tested yet (needs OAuth)

---

## Next Steps

1. Open browser to http://127.0.0.1:5000/ 
2. Test each page systematically
3. Check browser console for errors
4. Document any issues found
5. Test external integrations individually

---

## Quick Reference

### Server Status:
```
URL: http://127.0.0.1:5000
Health: RUNNING
Database: v9.4 schema
Last Build: 2026-02-18 10:36 PM
```

### Key URLs:
- Dashboard: http://127.0.0.1:5000/
- Brain: http://127.0.0.1:5000/brain
- Calendar: http://127.0.0.1:5000/calendar
- Scholar: http://127.0.0.1:5000/scholar
- Tutor: http://127.0.0.1:5000/tutor
- Methods: http://127.0.0.1:5000/methods
- Library: http://127.0.0.1:5000/library

---

*Last Updated: Step 1 Complete, proceeding to Step 2*

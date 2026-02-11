# Dashboard Window Inventory

Date: 2026-01-27
Scope: dashboard_rebuild client routes in `dashboard_rebuild/client/src/App.tsx`.
Definition: A "window" is a visible card/panel/major section within a page.

## Routes and pages
- `/` -> `dashboard_rebuild/client/src/pages/dashboard.tsx`
- `/brain` -> `dashboard_rebuild/client/src/pages/brain.tsx`
- `/calendar` -> `dashboard_rebuild/client/src/pages/calendar.tsx`
- `/scholar` -> `dashboard_rebuild/client/src/pages/scholar.tsx`
- `/tutor` -> `dashboard_rebuild/client/src/pages/tutor.tsx`
- fallback -> `dashboard_rebuild/client/src/pages/not-found.tsx`

Note: `dashboard_rebuild/client/src/pages/home.tsx` exists but is not routed in `App.tsx`.

## Page: Dashboard (/)
Source: `dashboard_rebuild/client/src/pages/dashboard.tsx`

### STUDY_WHEEL card
- Purpose: show current course rotation, log a study session, manage courses.
- UI/Components: Card with current course display, course list, add/edit/delete dialogs.
- Reads: `api.studyWheel.getCurrentCourse`, `api.courses.getActive`, `api.todaySessions.get`, `api.streak.get`.
- Writes: `api.studyWheel.completeSession`, `api.courses.create`, `api.courses.update`, `api.courses.delete`.
- Backend: `brain/dashboard/api_adapter.py` routes `/study-wheel/current`, `/study-wheel/complete-session`, `/courses`, `/courses/active`, `/sessions/today`, `/streak`.

### TODAY card
- Purpose: show today session count/minutes and streak status.
- UI/Components: Card with counts and status banner.
- Reads: `api.todaySessions.get`.
- Backend: `brain/dashboard/api_adapter.py` route `/sessions/today`.

### COURSES card
- Purpose: show per-course totals (sessions, minutes).
- UI/Components: Card list of courses with totals.
- Reads: `api.courses.getActive` (course totals are returned on course objects).
- Backend: `brain/dashboard/api_adapter.py` routes `/courses`, `/courses/active`.

### TASKS card (Google Tasks list)
- Purpose: show Google Tasks list, toggle complete, edit, create, delete.
- UI/Components: Card with list switcher, tasks list, edit dialog.
- Reads: `api.googleTasks.getLists`, `api.googleTasks.getAll`.
- Writes: `api.googleTasks.create`, `api.googleTasks.update`, `api.googleTasks.delete`, `api.academicDeadlines.create` (when adding a task to deadlines).
- Backend: `brain/dashboard/api_adapter.py` routes `/google-tasks`, `/google-tasks/lists`, `/google-tasks/<list_id>`, `/google-tasks/<list_id>/<task_id>`.

### DEADLINES card
- Purpose: track academic deadlines, filter by course, mark complete.
- UI/Components: Card with add dialog, filter select, list with toggle/delete.
- Reads: `api.academicDeadlines.getAll`, `api.courses.getActive` (for course names).
- Writes: `api.academicDeadlines.create`, `api.academicDeadlines.update`, `api.academicDeadlines.delete`, `api.academicDeadlines.toggle`.
- Backend: `brain/dashboard/api_adapter.py` routes `/academic-deadlines` and `/academic-deadlines/<id>` and `/academic-deadlines/<id>/toggle`.

### WEAKNESS_QUEUE card
- Purpose: show flagged weakness topics.
- UI/Components: Card list or empty-state card.
- Reads: `api.weaknessQueue.get`.
- Backend: `brain/dashboard/api_adapter.py` route `/weakness-queue`.

## Page: Brain (/brain)
Source: `dashboard_rebuild/client/src/pages/brain.tsx`

### KIMI K2.5 CHAT window
- Purpose: inline chat with image support for quick assistance.
- UI/Components: `dashboard_rebuild/client/src/components/BrainChat.tsx`.
- Writes: `api.brain.quickChat`.
- Backend: `brain/dashboard/api_adapter.py` route `/brain/quick-chat`.

### SYSTEM STATUS card
- Purpose: show Obsidian + Anki connectivity and counts.
- UI/Components: Card in Brain page header section.
- Reads: `api.obsidian.getStatus`, `api.anki.getStatus`, `api.anki.getDrafts`, `api.brain.getMetrics`.
- Backend: `brain/dashboard/api_adapter.py` routes `/obsidian/status`, `/anki/status`, `/brain/metrics`.

### Tabs: INGESTION
Source: `dashboard_rebuild/client/src/components/IngestionTab.tsx`
- Purpose: ingest syllabus, learning objectives, and WRAP; import modules/events into DB.
- UI/Components: Accordion sections: Syllabus Import, WRAP Import, Learning Objectives Import.
- Reads: `api.courses.getActive`, `api.modules.getByCourse`, `api.learningObjectives.getByCourse`.
- Writes: `api.syllabus.importBulk`, `api.learningObjectives.createBulk`, `api.brain.ingest`.
- Backend: `brain/dashboard/api_adapter.py` routes `/syllabus/import-bulk`, `/learning-objectives/bulk`, `/brain/ingest`.

### Tabs: DATA
Source: `dashboard_rebuild/client/src/components/DataTablesSection.tsx`
- Purpose: view/edit modules and schedule events per course.
- UI/Components: course selector, modules table, schedule events table, bulk delete dialog.
- Reads: `api.courses.getActive`, `api.modules.getByCourse`, `api.scheduleEvents.getByCourse`.
- Writes: `api.modules.update/delete/deleteMany`, `api.scheduleEvents.update/delete/deleteMany`.
- Backend: `brain/dashboard/api_adapter.py` routes `/modules`, `/modules/<id>`, `/modules/bulk-delete`, `/schedule-events`, `/schedule-events/<id>`, `/schedule-events/bulk-delete`.

### Tabs: INTEGRATIONS
Source: `dashboard_rebuild/client/src/pages/brain.tsx`

#### OBSIDIAN VAULT window
- Purpose: browse files/folders and edit file content.
- UI/Components: Obsidian file list + editor split view, quick-access course buttons.
- Reads: `api.obsidian.getFiles`, `api.obsidian.getFile`, `api.obsidian.getStatus`.
- Writes: `api.obsidian.saveFile`, `api.obsidian.append` (via WRAP sync). 
- Backend: `brain/dashboard/api_adapter.py` routes `/obsidian/files`, `/obsidian/file`, `/obsidian/status`, `/obsidian/append`.

#### ANKI INTEGRATION window
- Purpose: show Anki status, deck info, due counts, and card drafts for approval.
- UI/Components: status card, deck list, draft approvals list + dialogs.
- Reads: `api.anki.getStatus`, `api.anki.getDecks`, `api.anki.getDue`, `api.anki.getDrafts`.
- Writes: `api.anki.approveDraft`, `api.anki.deleteDraft`, `api.anki.updateDraft`, `api.anki.sync`.
- Backend: `brain/dashboard/api_adapter.py` routes `/anki/status`, `/anki/decks`, `/anki/due`, `/anki/drafts`, `/anki/drafts/<id>/approve`, `/anki/drafts/<id>`.

### Tabs: SYLLABUS VIEW
Source: `dashboard_rebuild/client/src/components/SyllabusViewTab.tsx`
- Purpose: browse per-course modules, objectives, and events grouped by week.
- UI/Components: course selector, scrollable week cards.
- Reads: direct fetch `/api/courses`, `api.modules.getByCourse`, `api.learningObjectives.getByCourse`, `api.scheduleEvents.getByCourse`.
- Backend: `brain/dashboard/api_adapter.py` routes `/courses`, `/modules`, `/learning-objectives`, `/schedule-events`.

### SESSION EVIDENCE section
Source: `dashboard_rebuild/client/src/pages/brain.tsx`
- Purpose: table of sessions with filtering, edit, and bulk delete.
- UI/Components: filters (semester/date), session table, edit dialog, delete confirmation dialog.
- Reads: direct fetch to `/api/sessions` with query params; `api.brain.getMetrics` for header counts.
- Writes: `api.sessions.update`, `api.sessions.deleteMany`.
- Backend: `brain/dashboard/api_adapter.py` routes `/sessions`, `/sessions/bulk-delete`, `/brain/metrics`.

## Page: Calendar (/calendar)
Source: `dashboard_rebuild/client/src/pages/calendar.tsx`

### MAIN CALENDAR window
- Purpose: month/week/day views for local events + Google Calendar events.
- UI/Components: view switcher, header controls, mini-calendar, legend, grid.
- Reads: `api.events.getAll`, fetch `/api/google-calendar/events` and `/api/google-calendar/calendars`, `api.google.getStatus`.
- Writes: `api.events.create/update/delete`, fetch `/api/google-calendar/events` (create/update/delete), `api.google.getAuthUrl`, `api.google.disconnect`.
- Backend: `brain/dashboard/api_adapter.py` routes `/events`, `/google-calendar/events`, `/google-calendar/calendars`, `/google/status`.

### TASKS view (Google Tasks board)
- Purpose: board-style management of Google Tasks lists and tasks.
- UI/Components: `GoogleTasksBoard` and `GoogleTasksComponents` in `dashboard_rebuild/client/src/components/GoogleTasksComponents.tsx`.
- Reads: `api.googleTasks.getLists`, `api.googleTasks.getAll`.
- Writes: `api.googleTasks.create/update/delete/move`.
- Backend: `brain/dashboard/api_adapter.py` routes `/google-tasks`, `/google-tasks/lists`, `/google-tasks/<list_id>`, `/google-tasks/<list_id>/<task_id>`, `/google-tasks/<list_id>/<task_id>/move`.

### AI_ASSIST window
- Purpose: side panel assistant that can create/update calendar events and tasks.
- UI/Components: `dashboard_rebuild/client/src/components/CalendarAssistant.tsx`.
- Reads: `api.google.getStatus` (connection), refreshes event/task queries.
- Writes: `api.calendar.assistant`.
- Backend: `brain/dashboard/api_adapter.py` routes `/calendar/assistant`, `/google/status`.

### Calendar Manage modal
- Purpose: toggle calendars visibility and manage hidden/pinned calendars.
- UI/Components: Modal in calendar page.
- Reads: fetch `/api/google-calendar/calendars`.
- Writes: persists selections to localStorage; uses no server write.

## Page: Scholar (/scholar)
Source: `dashboard_rebuild/client/src/pages/scholar.tsx`

### Tab: SUMMARY
- Purpose: summarize study health and highlight concerns, and act as the starting point for a Scholar \"run\".
- UI/Components: study health overview metrics, working/concerns cards, Scholar run strip, proposals banner, Scholar chat panel.
- Reads: `api.sessions.getAll`, `api.courses.getAll`, `api.proposals.getAll`.
- Writes: `api.scholar.chat`.
- Backend: `brain/dashboard/api_adapter.py` routes `/sessions`, `/courses`, `/proposals`, `/scholar/chat`.

### Tab: ANALYSIS
- Purpose: deep-dive review of how studying and Tutor are behaving, before making changes.
- UI/Components:
  - Tutor audit section (per-session observations, phases, impacts).
  - Recurrent issues aggregate (issues, frequencies, courses).
  - Question pipeline (open Scholar questions and data gaps).
  - Evidence review (observed data vs. research interpretation).
  - Topic clusters card with clustering trigger.
- Reads: `api.scholar.getTutorAudit`, `api.scholar.getQuestions`, `api.scholar.getFindings`, `api.scholar.getClusters`.
- Writes: `api.scholar.runClustering`.
- Backend: `brain/dashboard/api_adapter.py` routes `/scholar/tutor-audit`, `/scholar/questions`, `/scholar/findings`, `/scholar/clusters`, `/scholar/clusters/run`.

### Tab: PROPOSALS
- Purpose: manage and approve Scholar proposals (decision surface).
- UI/Components: proposals list with priority, target system badge, confidence/risk badges, status select (DRAFT/APPROVED/REJECTED/IMPLEMENTED).
- Reads: `api.proposals.getAll`.
- Writes: `api.proposals.update`.
- Backend: `brain/dashboard/api_adapter.py` routes `/proposals`, `/proposals/<id>`.

### Tab: HISTORY
- Purpose: read-only proposal history and timeline.
- UI/Components: proposal rows with ID, summary, status badge, created date.
- Reads: `api.proposals.getAll`.
- Backend: `brain/dashboard/api_adapter.py` routes `/proposals`, `/proposals/<id>`.

## Page: Tutor (/tutor)
Source: `dashboard_rebuild/client/src/pages/tutor.tsx`

### Adaptive Tutor (3-panel)
- Purpose: run an interactive study session with optional Method Chain guidance and RAG over uploaded materials.
- UI/Components:
  - Left: Content Filter (`dashboard_rebuild/client/src/components/ContentFilter.tsx`)
  - Center: Chat (`dashboard_rebuild/client/src/components/TutorChat.tsx`)
  - Right: Artifacts + resume (`dashboard_rebuild/client/src/components/TutorArtifacts.tsx`)
- Reads: `api.tutor.getContentSources`, `api.tutor.getTemplateChains`, `api.tutor.getMaterials`, `api.tutor.listSessions`.
- Writes: `api.tutor.createSession`, `api.tutor.sendTurn` (SSE), `api.tutor.advanceBlock`, `api.tutor.createArtifact`, `api.tutor.endSession`, `api.tutor.uploadMaterial`.
- Backend: `brain/dashboard/api_tutor.py` routes `/api/tutor/*` (plus `brain/tutor_rag.py`, `brain/tutor_chains.py`, `brain/tutor_streaming.py`).

## Page: Library (/library)
Source: `dashboard_rebuild/client/src/pages/library.tsx`

### Materials Library
- Purpose: upload and manage study materials used by Tutor RAG.
- UI/Components: materials table (rename, enable/disable, delete) and upload widget.
- Reads: `api.tutor.getMaterials`.
- Writes: `api.tutor.uploadMaterial`, `api.tutor.updateMaterial`, `api.tutor.deleteMaterial`.
- Backend: `brain/dashboard/api_tutor.py` routes `/api/tutor/materials/*`.

## Page: Not Found (fallback)
Source: `dashboard_rebuild/client/src/pages/not-found.tsx`

### 404 card
- Purpose: show missing-route error and guidance.
- UI/Components: single Card with title and helper text.

## Shared routing and layout
- Client routing: `dashboard_rebuild/client/src/App.tsx` and `dashboard_rebuild/client/src/components/layout.tsx`.
- Server routing: `brain/dashboard/routes.py` registers page routes and some API endpoints; `brain/dashboard/api_adapter.py` provides the main `/api/*` REST adapter.

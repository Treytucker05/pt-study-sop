# Dashboard Page Inventory (2026-01-15)

## Scope
Walkthrough of dashboard tabs and modals in `brain/templates/dashboard.html`, with evidence paths and notes on reachability. Includes `styleguide.html` as a non-routed appendix.

## Sources (evidence)
- `brain/templates/dashboard.html` (tabs, panels, modals, nav)
- `brain/static/js/dashboard.js` (JS handlers, data wiring)
- `brain/dashboard/routes.py` (API endpoints)
- `brain/templates/styleguide.html` (non-routed appendix)

## Tabs (pages)

### Overview (`tab-overview`)
Evidence: `brain/templates/dashboard.html` lines ~122-464.

Sections and components:
- Quick stats grid (sessions, uptime, rank, cards) with stat IDs like `total-sessions`, `total-time`, `avg-score`, `anki-cards`.
- Scholar Insights panel (`scholar-insights-panel`) with alerts, pending questions, recent findings, and a CTA to Scholar.
- Patterns & Insights panel (`patterns-panel`) with:
  - Mode chart canvas (`modeChart`) and legend (`mode-legend`)
  - Focus areas (`weak-topics`, `strong-topics`)
  - Retrospective lists (`what-worked`, `issues-list`, `frameworks-list`)
- Study Trends panel (`trends-panel`) with chart canvas and period selector (`trends-period`).
- Upload Log panel (`upload-panel`) with dropzone (`dropzone`) and file input (`file-input`).

Primary actions:
- Expand/Collapse All (`expandAllSections`, `collapseAllSections`)
- View All (Scholar) -> `openTab('scholar')`

### Brain (sessions) (`tab-sessions`)
Evidence: `brain/templates/dashboard.html` lines ~465-681.

Sections and components:
- Fast Entry panel (`fast-entry-panel`) with prompt selector and paste/submit flow.
- Latest Sessions panel (`sessions-panel`) with session list (view/edit/delete buttons).
- Quick Entry panel (`quick-session-panel`) for lightweight session submission.
- Session Resume panel (`resume-panel`) with `resume-box` and `btn-resume`.

Primary actions:
- Copy prompt, submit fast entry, quick session submit, resume session.

### Syllabus & Calendar (`tab-syllabus`)
Evidence: `brain/templates/dashboard.html` lines ~682-1219.

Sections and components:
- Study Calendar panel (`calendar-panel`) with calendar vs list view toggle.
- Study Tasks panel (`study-tasks-panel`) with filter and refresh.
- Syllabus Intake (MVP) panel (`syllabus-intake-panel`) with form submission.
- Syllabus via ChatGPT JSON Import (`json-import-panel`) with prompt copy + JSON import.
- Course Colors panel (`course-colors-panel`) with color controls.
- Google Calendar and Tasks controls (`btn-gcal-connect`, `btn-gcal-sync`, `btn-gtasks-sync`, `btn-gcal-disconnect`).

### Scholar Research (`tab-scholar`)
Evidence: `brain/templates/dashboard.html` lines ~1220-1779.

Sections and components:
- Scholar API Key panel (`scholar-api-panel`) with API key save/test.
- Run Scholar panel (`scholar-run-panel`) with safe mode, multi-agent, run/refresh/cancel.
- Ralph Research panel (`scholar-ralph-panel`) with refresh.
- Proposal Running Sheet panel (`scholar-proposal-sheet-panel`) with refresh + final check.
- Proposals & Questions panel (`scholar-proposals-panel`) with question actions.
- System Health & Research panel (`scholar-health-panel`).
- AI Strategic Digest panel (`scholar-digest-panel`) with generate/save.
- Saved Digests panel (`scholar-saved-digests-panel`) with view/delete.

### Tutor (`tab-tutor`)
Evidence: `brain/templates/dashboard.html` lines ~1780-1972.

Sections and components:
- Tutor Chat panel (`tutor-chat-panel`) with question input and new session.
- RAG Sources panel (`tutor-rag-panel`) with:
  - Study folder sync and selection
  - Runtime items toggles
  - Project file upload and link ingestion

### Brain Database (`tab-brain`)
Evidence: `brain/templates/dashboard.html` lines ~1973-2452.

Sections and components:
- Database Statistics panel (`brain-stats-panel`).
- Topic Mastery Overview panel (`brain-mastery-panel`).
- Ingestion Status panel (`brain-sync-panel`) with run sync controls.
- Anki Cards panel (`anki-cards-panel`) with drafts and sync/preview.
- Proposal modal triggers (`proposal-approve-btn`, `proposal-reject-btn`).

### Sync Inbox (`tab-sync`)
Evidence: `brain/templates/dashboard.html` lines ~2453-2577.

Sections and components:
- Sync header with Run Scraper + Refresh buttons.
- Sync list table for pending items.
- Notes sidebar integration (global component).

## Modals and overlays
Evidence: `brain/templates/dashboard.html` lines ~1755-2445.

- Digest viewer modal (`digest-viewer-modal`) for Scholar digests.
- Proposal modal overlay (`proposal-modal-overlay`, `proposal-modal`) for proposal review/approval.
- Event edit modal (`event-edit-modal`) for syllabus events.
- Edit session modal (`edit-session-modal`) for session edits.
- Notes sidebar (`notes-sidebar`) with localStorage save/clear.

## Navigation reachability notes
Evidence: `brain/templates/dashboard.html` top nav + legacy nav.

- Top nav includes tabs: overview, syllabus, sessions, scholar, tutor.
- `tab-brain` (Brain Database) and `tab-sync` exist but only appear in legacy nav markup (not in top nav).
- Sync and Brain Database are likely not reachable in the current top-nav UI unless legacy sidebar is enabled.

## Non-routed appendix
- `brain/templates/styleguide.html` is present but not routed in `routes.py` (no `/styleguide` endpoint). It can serve as a UI reference appendix.

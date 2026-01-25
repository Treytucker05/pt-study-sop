# Dashboard Connectivity Map (2026-01-15)

## Overview (system tie-ins)
- Session logs and quick entry feed `/api/sessions` and `/api/quick_session`, which populate dashboard stats, patterns, and trends.
- Scholar outputs feed `/api/scholar/insights`, proposal sheets, and digests used across Overview and Scholar tabs.
- Syllabus events and study tasks feed the Calendar and Study Tasks panels; edits update event endpoints.
- Tutor chat and RAG configuration rely on Tutor endpoints; optional links to card drafts and Anki sync appear in Brain Database.
- Sync pipeline (scraper + pending/resolve) is separate but feeds ingestion and may affect Brain/Overview stats.

## Connectivity by tab

### Overview (`tab-overview`)
Evidence: `brain/templates/dashboard.html` lines ~122-464; `brain/static/js/dashboard.js`; `brain/dashboard/routes.py`.

| UI action / component | JS handler | API endpoint(s) | Backend handler | Evidence |
| --- | --- | --- | --- | --- |
| Load stats + patterns + session list | `loadStats()` | `/api/stats` | `api_stats` | `dashboard.js` (~720+), `routes.py` L112 |
| Scholar insights card | `loadScholarInsights()` | `/api/scholar/insights` | `api_scholar_insights` | `dashboard.js` (~816), `routes.py` L139 |
| Trends chart + period selector | `loadTrends(days)` | `/api/trends?days=...` | `api_trends` | `dashboard.js` (~1212), `routes.py` L655 |
| Upload log dropzone | dropzone handlers | `/api/upload` | `api_upload` | `dashboard.js` (~1431), `routes.py` L1829 |

### Brain (sessions) (`tab-sessions`)
Evidence: `brain/templates/dashboard.html` lines ~465-681; `brain/static/js/dashboard.js`.

| UI action / component | JS handler | API endpoint(s) | Backend handler | Evidence |
| --- | --- | --- | --- | --- |
| Fast entry submit | `submitFastEntry()` | `/api/sessions` (POST) | `api_create_session` | `dashboard.js` (~424), `routes.py` L1997 |
| Session list (view/edit/delete) | `openEditModal()`, `deleteSession()` | `/api/sessions/<id>` (GET/PUT/DELETE) | `api_get_session`, `api_update_session`, `api_delete_session` | `dashboard.js` (~1006+), `routes.py` L2056/L2073/L2158 |
| Quick entry form | quick session submit handler | `/api/quick_session` | `api_quick_session` | `dashboard.js` (~1492), `routes.py` L1910 |
| Session resume | `btn-resume` handler | `/api/resume` | `api_resume` | `dashboard.js` (~1476), `routes.py` L1805 |

### Syllabus & Calendar (`tab-syllabus`)
Evidence: `brain/templates/dashboard.html` lines ~682-1219; `brain/static/js/dashboard.js`.

| UI action / component | JS handler | API endpoint(s) | Backend handler | Evidence |
| --- | --- | --- | --- | --- |
| Calendar view + filters | `loadCalendarData()` | `/api/calendar/data?…` | `api_calendar_data` | `dashboard.js` (~3750), `routes.py` L3363 |
| Events list + edits | `renderSyllabusList()`, edit handlers | `/api/syllabus/events`, `/api/syllabus/event/<id>` | `api_syllabus_events`, `api_update_event` | `dashboard.js` (~4211/4285), `routes.py` L3074/L3188 |
| Update event status / schedule reviews | `updateEventStatus()`, `scheduleM6Reviews()` | `/api/syllabus/event/<id>/status`, `/api/syllabus/event/<id>/schedule_reviews` | `api_update_event_status`, `api_schedule_m6_reviews` | `dashboard.js` (~4154/4179), `routes.py` L3150/L3278 |
| Study tasks | `loadStudyTasks()` | `/api/syllabus/study-tasks?filter=…` | `api_syllabus_study_tasks` | `dashboard.js` (~4814), `routes.py` L2970 |
| Syllabus intake | form submit | `/api/syllabus/import` | `api_syllabus_import` | `dashboard.js` (~2272), `routes.py` L2803 |
| JSON import | import button | `/api/syllabus/import_bulk` | `api_syllabus_import_bulk` | `dashboard.js` (~2324), `routes.py` L2849 |
| Course colors | `updateCourseColor()` | `/api/syllabus/course/<id>/color` | `api_update_course_color` | `dashboard.js` (~5181), `routes.py` L3122 |
| Google Calendar sync | `connectGoogleCalendar()`, `syncGoogleCalendar()` | `/api/gcal/auth/start`, `/api/gcal/sync`, `/api/gcal/revoke` | `gcal_auth_start`, `gcal_sync`, `gcal_revoke` | `dashboard.js` (~6622), `routes.py` L3748/L3787/L3797 |
| Google Tasks sync | `syncGoogleTasks()` | `/api/gtasks/sync` | `gtasks_sync` | `dashboard.js` (~6624), `routes.py` L3805 |

### Scholar Research (`tab-scholar`)
Evidence: `brain/templates/dashboard.html` lines ~1220-1779; `brain/static/js/dashboard.js`.

| UI action / component | JS handler | API endpoint(s) | Backend handler | Evidence |
| --- | --- | --- | --- | --- |
| API key save/test | `saveScholarApiKey()`, `testScholarApiKey()` | `/api/scholar/api-key` (GET/POST) | `api_scholar_api_key` | `dashboard.js` (~3534/3576), `routes.py` L665 |
| Run Scholar / status / cancel | `runScholar()`, `checkScholarStatus()`, `cancelScholarRun()` | `/api/scholar/run`, `/api/scholar/run/status/<id>`, `/api/scholar/run/cancel/<id>` | `api_scholar_run`, `api_scholar_run_status`, `api_scholar_cancel_run` | `dashboard.js` (~2994/3108/2968), `routes.py` L1218/L1227/L1393 |
| Open latest final | `openScholarLatestFinal()` | `/api/scholar/run/latest-final` | `api_scholar_latest_final` | `dashboard.js` (~2949), `routes.py` L1369 |
| Safe mode + multi-agent toggles | `toggleSafeMode()`, `toggleMultiAgent()` | `/api/scholar/safe-mode`, `/api/scholar/multi-agent` | `api_scholar_safe_mode`, `api_scholar_multi_agent` | `dashboard.js` (~3179/3268), `routes.py` L1436/L1466 |
| Ralph summary | `renderRalphSummary()` | `/api/scholar/ralph` | `api_scholar_ralph` | `dashboard.js` (~2719), `routes.py` L146 |
| Proposal sheet | `renderProposalSheet()` | `/api/scholar/proposal-sheet` | `api_scholar_proposal_sheet` | `dashboard.js` (~2813), `routes.py` L152 |
| Proposal sheet rebuild | refresh / final check | `/api/scholar/proposal-sheet/rebuild` | `api_scholar_proposal_sheet_rebuild` | `dashboard.js` (~2855), `routes.py` L158 |
| Proposal view + action | `viewProposalFile()`, `handleProposalAction()` | `/api/scholar/proposal/<filename>`, `/action` | `api_scholar_proposal_get`, `api_scholar_proposal_action` | `dashboard.js` (~4067/4115), `routes.py` L1508/L1637 |
| Questions + answers | `toggleAnsweredQuestions()`, `askScholarQuestion()` | `/api/scholar/questions`, `/api/scholar/questions/generate`, `/api/scholar/questions/answer`, `/api/scholar/questions/clarify` | `api_scholar_answer_questions`, `api_scholar_generate_answer`, `api_scholar_answer_single`, `api_scholar_clarify_question` | `dashboard.js` (~3467/3591/3390/5440), `routes.py` L1099/L799/L944/L716 |
| Digests (save/list/view/delete) | `saveStrategicDigest()`, `loadSavedDigests()`, `viewDigest()`, `deleteDigest()` | `/api/scholar/digest/save`, `/api/scholar/digests`, `/api/scholar/digests/<id>` | `api_scholar_save_digest`, `api_scholar_list_digests`, `api_scholar_get_digest`, `api_scholar_delete_digest` | `dashboard.js` (~6119/6152/6228/6260), `routes.py` L527/L543/L573/L613 |

### Tutor (`tab-tutor`)
Evidence: `brain/templates/dashboard.html` lines ~1780-1972; `brain/static/js/dashboard.js`.

| UI action / component | JS handler | API endpoint(s) | Backend handler | Evidence |
| --- | --- | --- | --- | --- |
| New tutor session + send question | `sendTutorQuestion()` | `/api/tutor/session/start`, `/api/tutor/session/turn` | `api_tutor_session_start`, `api_tutor_session_turn` | `dashboard.js` (~2193/2222), `routes.py` L2284/L2707 |
| Study folders sync + toggles | `loadTutorStudyFolders()`, `syncTutorStudyFolder()`, toggles | `/api/tutor/study/folders`, `/api/tutor/study/sync`, `/api/tutor/study/folders/set` | `api_tutor_list_study_folders`, `api_tutor_sync_study_folder`, `api_tutor_set_study_folder_enabled` | `dashboard.js` (~1630/1645/1661), `routes.py` L2446/L2430/L2477 |
| Runtime items | `loadTutorRuntimeItems()` | `/api/tutor/runtime/items`, `/api/tutor/runtime/items/set` | `api_tutor_list_runtime_items`, `api_tutor_set_runtime_item_enabled` | `dashboard.js` (~1710/1724), `routes.py` L2553/L2620 |
| RAG doc list / search | `renderTutorDocsList()` | `/api/tutor/rag-docs?…` | `api_tutor_list_rag_docs` | `dashboard.js` (~1813), `routes.py` L2303 |
| Project file upload | `uploadTutorProjectFile()` | `/api/tutor/project-files/upload` | `api_tutor_upload_project_file` | `dashboard.js` (~1842), `routes.py` L2368 |
| Add link doc | `addTutorLink()` | `/api/tutor/links/add` | `api_tutor_add_link_doc` | `dashboard.js` (~1868), `routes.py` L2646 |
| Study config save | `saveTutorStudyConfig()` | `/api/tutor/study/config` | `api_tutor_study_config`, `api_tutor_update_study_config` | `dashboard.js` (~1917/1952), `routes.py` L2377/L2387 |

### Brain Database (`tab-brain`)
Evidence: `brain/templates/dashboard.html` lines ~1973-2452; `brain/static/js/dashboard.js`.

| UI action / component | JS handler | API endpoint(s) | Backend handler | Evidence |
| --- | --- | --- | --- | --- |
| Brain status / mastery | `loadBrainStatus()` | `/api/brain/status`, `/api/mastery` | `api_brain_status`, `api_mastery` | `dashboard.js` (~5675/5691), `routes.py` L164/L649 |
| Ingestion sync | `runSync()` | `/api/sync/run` | `api_sync_run` | `dashboard.js` (~6409), `routes.py` L2210 |
| Card drafts list / update | `loadAnkiDrafts()`, `updateCardDraft()` | `/api/cards/drafts?…`, `/api/cards/drafts/<id>` | `api_list_card_drafts`, `api_update_card_draft` | `dashboard.js` (~5796/5866), `routes.py` L3522/L3575 |
| Create card draft | `createCardDraft()` | `/api/cards/draft` | `api_create_card_draft` | `dashboard.js` (~6009/6052), `routes.py` L3445 |
| Sync to Anki | `syncToAnki()` | `/api/cards/sync` | `api_sync_cards_to_anki` | `dashboard.js` (~5931/6058), `routes.py` L3695 |

### Sync Inbox (`tab-sync`)
Evidence: `brain/templates/dashboard.html` lines ~2453-2577; `brain/static/js/dashboard.js`.

| UI action / component | JS handler | API endpoint(s) | Backend handler | Evidence |
| --- | --- | --- | --- | --- |
| Run scraper | `runBlackboardScraper()` | `/api/scraper/run` | `api_scraper_run` | `dashboard.js` (~6638), `routes.py` L3824 |
| Load pending sync items | `loadSyncPending()` | `/api/sync/pending` | `api_sync_pending` | `dashboard.js` (~6683), `routes.py` L213 |
| Resolve item | `resolveSyncItem()` | `/api/sync/resolve` | `api_sync_resolve` | `dashboard.js` (~6744), `routes.py` L247 |
| Sync status / run / clear | `loadSyncStatus()`, `runSync()` | `/api/sync/status`, `/api/sync/run`, `/api/sync/clear-tracking` | `api_sync_status`, `api_sync_run`, `api_sync_clear_tracking` | `dashboard.js` (~6383/6409/6440), `routes.py` L2177/L2210/L2260 |

## Notes on connectivity
- Several endpoints are driven by template-string fetches (e.g., `/api/sessions/${id}`), so grep-only detection can miss them.
- External integrations (Google Calendar/Tasks, scrapers, Scholar/Tutor AI) require credentials and are marked as conditional in test readiness.

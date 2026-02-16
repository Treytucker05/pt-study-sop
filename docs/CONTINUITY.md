# CONTINUITY

## 2026-02-15 - Vault-First Mind Map + Test DB Leak Fix

### Vault-First Mind Map
- Replaced DB-driven mind map (empty `courses`/`modules`/`learning_objectives` tables) with Obsidian vault index as data source
- Courses from static `COURSE_FOLDERS` config, subfolders and notes parsed client-side from vault index paths
- Sidebar: course checkboxes with live note counts, subfolder filter, "Show Notes" toggle, updated legend (Course/Subfolder/Note)
- Double-click note nodes to open in Obsidian via `obsidian://open` URI
- "OBSIDIAN OFFLINE" banner + disabled seed when vault is disconnected
- Single file change: `dashboard_rebuild/client/src/components/MindMapView.tsx`
- No backend changes, no DB changes
- Commit: `7e768fef`

### Test DB Isolation Leak Fix
- `test_chain_runner.py` was leaking "Test SWEEP" sessions into the production database on every pytest run
- Root cause: `db_setup.py` and `chain_runner.py` use `from config import DB_PATH` (copies value at import time); the test only overrode `config.DB_PATH`, but `db_setup.DB_PATH` stayed pointed at the real DB when pytest collected other modules first
- Fix: also override `db_setup.DB_PATH` and `chain_runner.DB_PATH` at module level and in the `fresh_db` fixture
- Cleaned up 9 ghost sessions, reset `sqlite_sequence` autoincrement counter
- Commit: `16002e00`

## 2026-02-15 - Database Table Consolidation

- Merged 2 tables into `course_events`, dropped 2 dead tables (net -4 tables):
  - `academic_deadlines` → `course_events` (same data shape, mapped `completed` → `status`)
  - `scraped_events` → `course_events` (staging unified via new `source` + `approval_status` columns)
  - `wheel_config` dropped (zero active reads/writes)
  - `topics` dropped (zero active reads, 0 rows)
- Added 2 columns to `course_events`: `source TEXT DEFAULT 'manual'`, `approval_status TEXT DEFAULT 'approved'`
- Rewrote 7 API endpoints to use `course_events` (5 academic-deadline CRUD + 2 sync/staging)
- Removed cascade delete logic (no longer needed — same table)
- Updated `scrape_blackboard.py` to INSERT directly into `course_events` with `source='blackboard_scrape'`
- All migrations idempotent (safe to re-run `init_database()`)
- 6 files changed, 149 tests pass, build clean
- Commit: `3eb9b4a8`

## 2026-02-14 - Tutor Artifacts: bulk select and delete

- Added checkbox selection and bulk delete for Tutor Artifacts drawer:
  - **Recent Sessions:** per-row checkbox, top "Select all" + count badge, top "Delete" button; bulk delete calls existing `DELETE /api/tutor/session/<id>` in sequence, invalidates `tutor-sessions`, toasts success/error.
  - **Artifacts:** per-row checkbox, top "Select all" + count badge, top "Delete" button; bulk delete uses new `DELETE /api/tutor/session/<id>/artifacts` with body `{ indexes }`, persists to `tutor_sessions.artifacts_json`, and syncs local state in tutor.tsx.
- Backend: `api_tutor.delete_artifacts(session_id)` removes artifact entries by index and updates `artifacts_json`.
- Frontend: `api.tutor.deleteArtifacts(sessionId, indexes)`, `TutorArtifacts` selection state and `onDeleteArtifacts` prop; `tutor.tsx` `handleDeleteArtifacts` calls API and updates `artifacts` state.
- Single-session delete (trash + confirm) unchanged. Build and pytest passed.

## 2026-02-09 - Tutor Page Audit & Web Search Feature

- 13:15: Audited Tutor page implementation (frontend + backend).
- 13:18: Fixed TypeScript error in ContentFilter.tsx: Changed `Course` import from `@/lib/api` to `@shared/schema`.
- 13:20: Verified all 77 tests pass.
- 13:25: Built dashboard (`npm run build`) and synced to `brain/static/dist/`.
- Changes committed: `400664e1` - fix(tutor): add web search support and fix TypeScript imports.
- Features added:
  - Web search toggle for Codex provider in Tutor chat
  - URL citations extraction from ChatGPT Responses API
  - SSE streaming support for web search status updates

## 2026-02-09 - Mind Map Whiteboard (tldraw)

- MindMapView: added view-mode toggle "Force graph" | "Whiteboard". Whiteboard uses tldraw (dark theme) with "Seed from selection" to create note shapes and arrows from current Course/Module/LO graphData; previous seed shapes are cleared before re-seeding. Toolbar uses section-block/tab-sub-item tokens.

## 2026-02-09 - Brain Concept Map Freehand Mode

- Added tldraw freehand canvas as the default Concept Map mode with dark theme support and vault save to `.tldraw.json`.
- Refactored structured React Flow + Mermaid editor into separate components with a mode toggle and saved/unsaved indicator.

- 2026-01-21 18:47:42: Replaced C:\pt-study-sop\brain\data\pt_study.db with C:\Users\treyt\Downloads\pt_study.db after backup (pt_study.db.bak_20260121_184637). Counts: sessions=2, wheel_courses=5, quick_notes=4, courses=0.

- 2026-01-21 18:56:35: Rebuilt dashboard_rebuild and copied dist/public to C:\pt-study-sop\brain\static\dist to apply notes z-index/Tailwind pipeline fixes (already present in source).

- 2026-01-22 10:51:47: Moved Google Calendar OAuth credentials to env overrides in gcal config; cleared committed client_id/client_secret from GoogleCalendarTasksAPI.json and brain/data/api_config.json.

- 2026-01-22 11:03:35: Updated brain/.env from GoogleCalendarTasksAPI.json (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI).

- 2026-01-22 11:25:23: Backfilled GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in brain/.env from brain/data/gcal_token.json so auth status can resolve config.

- 2026-01-22 11:45:00: Rebuilt dashboard_rebuild (npm run build) and copied dist/public to brain/static/dist to refresh UI bundle (Manage Calendars dialog).

- 2026-01-22 11:48:39: Raised DialogContent z-index in dashboard_rebuild and rebuilt/copied dist to brain/static/dist to fix Manage modal overlay covering content.

- 2026-01-22 11:54:40: Adjusted Dialog overlay/content z-index (overlay z-40, content z-50) and rebuilt/copied dist to brain/static/dist.

- 2026-01-22 13:33:13: Replaced DialogContent positioning with standard Tailwind classes (left-1/2/top-1/2 and translate) and rebuilt/copied dist to brain/static/dist.

- 2026-01-22 13:46:41: Adjusted DialogContent centering to explicit 50% translate values and rebuilt/copied dashboard_rebuild dist to brain/static/dist.

- 2026-01-22 13:49:35: Added dialog-center utility for fixed dialog centering, updated dialog/alert-dialog classes, rebuilt dashboard_rebuild, and copied dist/public to brain/static/dist.

- 2026-01-22 13:57:08: Added max height and vertical scroll to Dialog/AlertDialog content to keep tall modals within viewport; rebuilt dashboard_rebuild and copied dist/public to brain/static/dist.

- 2026-01-22 13:58:42: Added top/bottom borders to Quick Notes sheet panel in layout and rebuilt/copied dashboard_rebuild dist to brain/static/dist.

- 2026-01-22 14:01:03: Inset Quick Notes sheet panel (inset-y-4) and set h-auto to reveal top/bottom borders; rebuilt dashboard_rebuild and copied dist/public to brain/static/dist.

- 2026-01-22 14:03:17: Adjusted Quick Notes sheet inset to 8px (inset-y-2) and rebuilt/copied dashboard_rebuild dist to brain/static/dist.

- 2026-01-22 14:04:36: Tightened Quick Notes sheet inset to 4px (inset-y-1) and rebuilt/copied dashboard_rebuild dist to brain/static/dist.

- 2026-01-22 14:06:01: Increased Quick Notes sheet inset to 12px (inset-y-3) and rebuilt/copied dashboard_rebuild dist to brain/static/dist.

- 2026-01-22 15:41:44: Added agent-browser commands to permissions.json to enable automated UI audit.

- 2026-01-22 16:58:16: Documented full UI + API audit in docs/full-ui-api-audit-2026-01-22.md (no code changes).

- 2026-01-22 17:01:00: Policy update - after each successful upgrade or change, push to GitHub.

- 2026-01-22 18:30:51: Added YAML frontmatter to Codex skills refactor-clean and tdd; normalized arrows to ASCII in refactor-clean.

- 2026-01-22 18:46:16: Synced ai-config to root/.claude, corrected pt-study-sop path references in AI instructions, added root permissions.json sync, and documented Codex/OpenCode usage.

- 2026-01-22 18:50:34: Updated AGENTS.md wording to reflect sync (not symlink) and re-synced to root/.claude.

- 2026-01-23 08:15:00: Added AI assistant Google connection status CTA in calendar panel.

- 2026-01-23 01:43:49: Updated Ralph.bat to detect existing Ralph TUI session locks and prompt to resume, force resume, or clear state before starting PRD mode.
- 2026-01-23 09:10:22: Enhanced Google Calendar auth flow to load stored OAuth token credentials, refresh expired tokens, and return re-auth required errors when tokens are missing or invalid.
- 2026-01-23 10:05:00: Expanded calendar assistant CRUD to search all calendars and added update event support with calendar/event IDs in responses.

- 2026-01-23 10:23:48: Expanded AI permissions allowlist to include broad PowerShell/cmd execution for on-demand inspection and troubleshooting.

- 2026-01-23 10:36:14: Added Ralph.bat session health check (status option + stale warning) to detect likely stuck runs.
- 2026-01-23 11:22:00: Updated calendar Google event API calls to use backend routes, refresh queries after AI edits, and normalize recurrence defaults for UI.
- 2026-01-23 12:05:00: Refreshed Calendar Assistant connection status on open, hid not-connected label when linked, and updated CTA copy to "Connect Google Calendar".

- 2026-01-23 10:25:10: Cleared stale Ralph session state by archiving .ralph-tui lock/session files and restarted Ralph TUI in a new console window.

- 2026-01-23 04:49:51: Added MASTER_SOP docs for material ingestion, session start, and progress tracking; updated MASTER_SOP index.

- 2026-01-23 04:59:11: Mirrored MASTER_SOP 05/06/07 into sop/src, added progress tracker template, and rebuilt runtime knowledge bundle.

- 2026-01-23 05:31:25: Added ExecPlan for dashboard rebuild in .agent/EXECPLAN_DASHBOARD.md.

- 2026-01-23 05:35:58: Added ExecPlans guidance to AGENTS.md and ai-config/AGENTS.md; added dashboard ExecPlan in .agent.

- 2026-01-23 05:41:48: Added .agent/context scaffold with README usage notes for scratch, plans, memory, agents, and terminals.

- 2026-01-23 15:20:32: Added DASHBOARD_IMPLEMENTATION_PLAN.md, PROJECT_OVERVIEW.md, and zclean-up/ to git tracking.

- 2026-01-23 16:01:35: Added Start_Project.bat and .agent/context tracking files (START_PROJECT.md, STATUS.md, logs, handoff template).

- 2026-01-23 16:04:19: Consolidated plan docs into JANUARY_26_PLAN/ and removed root copies; added Start_Project scaffold files.
- 2026-01-23 18:42:34: Added agent routing guidance, moved root docs into docs/root with updated references, added README files for ai-config/.claude/docs/root, and synced AGENTS/CLAUDE instructions.
- 2026-01-24 00:00:00: Correction: the agent routing/docs-root reorg entry above should be dated 2026-01-24.
- 2026-01-23 18:48:43: Added README guides for scripts/, JANUARY_26_PLAN/, and docs/ to align with folder README rule.
- 2026-01-23 18:59:11: Regenerated docs/root/ARCHITECTURE_CONTEXT.md and fixed generate_architecture_dump.ps1 to read sop/src/MASTER_PLAN_PT_STUDY.md.

- 2026-01-23 19:52:03: Renamed files in C:\Users\treyt\OneDrive\Desktop\PT School\Neuroscience\Week 1- Neuroscience Intro by prefixing 'Week 1_'.

- 2026-01-23 19:53:59: Renamed files in C:\Users\treyt\OneDrive\Desktop\PT School\Neuroscience\Week 2- Cell Properites and transmission II CNS vs PNS Intro by prefixing 'Week 2_'.

- 2026-01-23 19:54:28: Renamed files in C:\Users\treyt\OneDrive\Desktop\PT School\Neuroscience\Week 3- Spinal Cord- PNS, Spinal Cord Injury and Clinical Implications by prefixing 'Week 3_'.
- 2026-01-24 00:15:00: Completed JANUARY_26_PLAN milestones 1-6 (schema/storage/routes/api/prompts/ingestion UI), added dashboard_rebuild READMEs per AGENTS rule, created EXECPLAN_MILESTONE_INSTRUCTIONS, backed up data.db and ran db:push; npm run check still fails due to pre-existing TypeScript issues.
- 2026-01-24 00:25:00: Fixed pre-existing TypeScript issues (AcademicDeadline type, use-mobile hook re-export, scholar/brain typing fallbacks, BrainMetrics export, JSON parsing in metrics), added better-sqlite3.d.ts, reordered /api/sessions/last-context route, and made npm run dev Windows-friendly; verified npm run check passes and dev server responds to ingestion endpoints.
- 2026-01-24 00:45:00: Added Check_Dashboard.ps1 to identify whether /brain is served by dashboard_rebuild (Express/Vite) or legacy Flask dashboard via header/API probes.
- 2026-01-24 01:05:00: Added Check_Dashboard.bat to identify whether /brain is served by dashboard_rebuild (Express/Vite) or legacy Flask dashboard via header/API probes.
- 2026-01-24 01:20:00: Updated Check_Dashboard.bat to pause so output stays visible when double-clicked.
- 2026-01-24 01:30:00: Added Start_And_Check_Dashboard.bat to start the new or legacy dashboard, open /brain, then run the dashboard checker.
- 2026-01-24 01:40:00: Removed Check_Dashboard.ps1, Check_Dashboard.bat, and Start_And_Check_Dashboard.bat per request to avoid clutter.
- 2026-01-24 01:55:00: Updated Start_Dashboard.bat to start legacy dashboard on :5000 and dashboard_rebuild dev server on :5001, then open /brain in separate tabs.
- 2026-01-23 22:46:21: Updated ai-config/AGENTS.md to emphasize per-folder README requirements and re-synced AGENTS mirrors. Converted dashboard_rebuild to frontend-only (build.ts, package.json scripts, tsconfig include, README) and noted API ownership in root README. Pending removal of dashboard_rebuild/server after confirmation.
- 2026-01-23 22:46:21: Rebuilt dashboard_rebuild (npm run build) and copied dist/public to brain/static/dist to refresh the Flask-served UI.
- 2026-01-23 22:52:16: Removed C:\pt-study-sop\dashboard_rebuild\server to eliminate the 5001 Node server.
- 2026-01-24 00:34:30: Updated C:\Users\treyt\.codex\config.toml to add developer_instructions preferring swarm/subagent usage for large tasks.
- 2026-01-24 00:21:44: Added note categories (notes/planned/ideas) with note_type support in quick_notes, updated notes API + dashboard_rebuild notes panel, seeded a planned Scholar update note on first load, ran db_setup, rebuilt dashboard_rebuild and copied dist/public to brain/static/dist.
- 2026-01-24 00:26:28: Widened main dashboard layout and notes sheet, improved notes category tabs, and added optimistic reordering so dragged notes persist; rebuilt dashboard_rebuild and refreshed brain/static/dist.
- 2026-01-24 00:32:17: Added cross-category drag-and-drop for notes (Notes/Planned/Ideas), improved reordering logic with optimistic updates, and seeded planned items for LangGraph/LangChain/LangSmith; rebuilt dashboard_rebuild and refreshed brain/static/dist.
- 2026-01-24 00:36:18: Enabled drag-and-drop between notes categories with section drop zones and highlights; rebuilt dashboard_rebuild and refreshed brain/static/dist.
- 2026-01-24 00:38:24: Added HTML5 drag dataTransfer setup and dropEffect hints to enable cross-category note drops; rebuilt dashboard_rebuild and refreshed brain/static/dist.
- 2026-01-24 00:42:50: Updated notes reorder API to persist note_type and added quick_notes schema guard; removed redundant type-change PATCH on drag; rebuilt dashboard_rebuild and refreshed brain/static/dist.
- 2026-01-24 00:44:13: Moved Notes sheet close button to the left with theme styling and hid default Sheet close button; rebuilt dashboard_rebuild and refreshed brain/static/dist.

- 2026-01-24 01:10:23: Implemented WRAP ingestion end-to-end: added tutor_issues table and API endpoints, created wrap_parser + obsidian_merge modules, wired WRAP flow into brain_chat with Obsidian managed-block merge and Anki drafts, updated Brain UI with Paste WRAP + summary panel, added pages/README, and added wrap parser tests. Ran pytest, release_check, and dashboard_rebuild build (vite chunk size warning only).

- 2026-01-24 01:51:56: Fixed study-wheel session sync to session evidence (set topic + time_spent_minutes on wheel completion, improved minutes fallbacks in session serialization and brain metrics) and added Vite code-splitting (lazy-loaded pages + manualChunks) to eliminate build chunk-size warnings. Ran pytest and dashboard_rebuild build.

- 2026-01-24 01:57:59: Backfilled session minutes (time_spent_minutes from duration_minutes) via PT_BRAIN_BACKFILL_MINUTES and updated study-wheel session insert + metrics minutes fallback; added Vite route-level code-splitting/manualChunks to resolve chunk-size warning.
- 2026-01-25 12:45:16: Installed oh-my-opencode in WSL (Ubuntu) using Node 20 via nvm and ran the installer to configure Claude max20, OpenAI, Gemini, and Copilot; configs written to /home/treyt/.config/opencode/opencode.json and /home/treyt/.config/opencode/oh-my-opencode.json.

- 2026-01-25 14:40:10: Added docs/project Project Hub (INDEX, ROADMAP, CURRENT_MILESTONE, DECISIONS, STATUS, REFERENCES, README), linked entrypoints in README and docs/README, and added scripts/validate_project_hub.py.

- 2026-01-25 14:54:04: Added DOCS_INDEX.md entrypoint and linked it from README.md and docs/README.md.

- 2026-01-25 15:12:08: Added repo hygiene doc (docs/project/REPO_HYGIENE.md), hygiene audit script (scripts/audit_repo_hygiene.py), and linked quality gate in docs/project/INDEX.md.

- 2026-01-25 15:17:53: Reduced audit_repo_hygiene.py noise with ignore prefixes, warning grouping, and stricter fail scope; documented audit enforcement in docs/project/REPO_HYGIENE.md.

- 2026-01-25 15:23:51: Expanded audit_repo_hygiene.py planning-keyword ignore prefixes and updated repo hygiene exemptions.
- 2026-01-25 19:46:18: Refactored Brain page layout with KPI HUD, 75/25 grid, sticky chat, compact session table, status bar, and collapsed ingestion/integrations panels; reduced background grid opacity and added brain card utility styles.
- 2026-01-25 20:04:20: Adjusted Brain layout flow to avoid overflow (min-width guards, responsive heights, table horizontal scroll, chat sticky sizing, and flex wrap for inputs).
- 2026-01-25 20:11:14: Removed Brain LLM chat panel and chat logic for a basic, focused layout.
- 2026-01-25 20:18:16: Removed KPI HUD and derived metrics grid to keep Brain page minimal; retained session evidence and core system panels.
- 2026-01-25 20:23:47: Reordered Brain layout: System Status first, then Data Ingestion, then Integrations, followed by Session Evidence and Issues Log.
- 2026-01-25 20:28:16: Removed WRAP file upload intake; WRAP ingestion now paste-only.
- 2026-01-25 22:51:41: Updated Brain Ingestion syllabus workflow with combined JSON prompt/import, class meeting expansion to calendar events, and inline module/schedule editing+deletion in the UI.
- 2026-01-26 00:11:00: Hardened modal behavior (z-index + max-height/scroll), guarded calendar edit modals against null events, and ensured dialogs only close on explicit close to prevent black overlay without content.
- 2026-01-26 00:22:00: Documented persistent modal overlay issue and prior fix attempts in dashboard_rebuild/client/src/pages/README.md for tracking.
- 2026-01-26 00:32:00: Added modal debug HUD/logging and stricter data-backed open guards for Brain/Calendar dialogs; documented attempt in pages README.
- 2026-01-26 00:41:00: Forced dialog/alert-dialog opacity on open and added data-modal attrs for DOM tracing; documented in pages README.
- 2026-01-26 00:49:00: Raised dialog/alert-dialog z-index and forced pointer-events auto on content to prevent overlay-only lock-ups; documented in pages README.
- 2026-01-25 23:00:16: Fixed validate_sop_index.py backslash check and scoped release_check.py pytest run to brain/tests to avoid capture errors.
- 2026-01-26 00:58:00: Forced dialog/alert-dialog portals to render in document.body to prevent fixed-positioning relative to transformed ancestors; documented in pages README.
- 2026-01-26 01:07:00: Disabled modal behavior + animations for Calendar Manage dialog, added MANAGE click logging; set dialog/alert overlay pointer-events to none to prevent overlay-only locks.
- 2026-01-25 23:18:38: Added checkbox selection, select-all, and bulk delete for modules and schedule items on the Brain Ingestion page (new bulk-delete endpoints).
- 2026-01-26 01:22:00: Forced Calendar Manage dialog inline positioning + z-index to keep it in viewport; documented in pages README.
- 2026-01-25 23:24:38: Added Delete All buttons for modules and schedule items on the Brain Ingestion page.
- 2026-01-25 23:33:32: Replaced native confirm with themed AlertDialog for bulk delete on Brain Ingestion.
- 2026-01-25 23:38:27: Fixed bulk delete confirmation by persisting payload in a ref so the themed dialog executes deletes reliably.
- 2026-01-26 01:39:00: Forced Brain delete confirmation dialog inline positioning + z-index to keep it in viewport; documented in pages README.
- 2026-01-25 23:45:12: Swapped native checkboxes for themed Checkbox components in Brain Ingestion tables.
- 2026-01-25 23:49:57: Restyled bulk delete confirmation dialog in Brain Ingestion to match app theme.
- 2026-01-26 01:53:00: Applied inline positioning + z-index to remaining dialogs (Brain edit session/draft; Calendar create/edit/edit-Google) to prevent off-screen rendering.
- 2026-01-26 02:03:00: Applied inline positioning + z-index to ingestion bulk delete confirmation dialog (Schedule/Modules delete selected/all) to prevent off-screen rendering.
- 2026-01-25 23:55:24: Added error handling for bulk deletes and forced confirmation action button type to ensure delete fires.
- 2026-01-25 23:57:58: Allowed OPTIONS on bulk-delete endpoints to prevent 405 on delete requests.
- 2026-01-26 00:03:12: Added academic deadline inserts for assignment/quiz/exam during syllabus and schedule imports.
- 2026-01-26 00:16:40: Updated syllabus prompt defaults (term dates/timezone) and added JSON extraction for pasted LLM outputs.
- 2026-01-26 00:29:10: Added delivery field to schedule items, replaced Delete All with Save Selected, and removed cancel buttons.
- 2026-01-26 00:37:18: Adjusted module bulk/action buttons to Check All, Delete, Save and per-row Save/Delete only.
- 2026-01-26 00:39:55: Mirrored schedule section buttons to Check All, Delete, Save and per-row Save/Delete only.
- 2026-01-26 00:44:52: Updated docs to reference Start_Dashboard.bat instead of Run_Brain_All.bat.
- 2026-01-26 00:46:38: Updated permissions allowlist to Start_Dashboard.bat.
- 2026-01-26 14:00:09: Updated calendar manage UI to support drag-and-drop ordering, local calendar selection, and selection-only filtering; persisted calendar order/selection in localStorage.

- 2026-01-26 14:14:23: Rebuilt dashboard_rebuild and copied dist/public to brain/static/dist for calendar Manage ordering + selection-only filtering.

- 2026-01-26 15:07:33: Backed up uncommitted files to _codex_backups and reverted Brain session filter/query UI changes in dashboard_rebuild/client/src/pages/brain.tsx.
- 2026-01-26 15:10:02: Updated AGENTS.md to require a git commit after changes; synced mirrors.

- 2026-01-26 21:11:43: Rebuilt dashboard_rebuild and copied dist/public to brain/static/dist for updated Brain UI.
- 2026-01-26 22:23:50: Updated permissions allowlist to run Windows test commands (pytest, Flask, ingest script).
- 2026-01-27 12:23:23: Added dashboard window inventory documentation and dashboard docs README.
- 2026-01-27 12:55:00: Updated AGENTS.md commit-message rule to auto-generate when not provided; synced mirrors.
- 2026-01-27 22:13:13: Added Codex MCP server config and documented the Claude Code review loop workflow.
- 2026-01-27 22:55:06: Added root Claude/Codex review loop quick-start instructions.
- 2026-01-28 14:20:00: Added npx skills find to permissions allowlist.
- 2026-01-28 14:28:00: Added npx skills add to permissions allowlist.
- 2026-01-28 14:35:00: Personalized CLAUDE.md for Trey with system-specific details.
- 2026-01-28 14:44:00: Updated CLAUDE.md with Obsidian vault path for Trey.
- 2026-01-28 14:47:00: Added Trey response style preference to CLAUDE.md.
- 2026-01-28 14:50:00: Noted npm as preferred frontend package manager.
- 2026-01-28 14:54:00: Added rule to push after every change.
- 2026-01-28 14:57:00: Removed git push from permissions require_confirmation to allow auto-push.
- 2026-01-28 15:00:00: Added Trey git identity to CLAUDE.md.
- 2026-01-28 15:05:00: Set default to run relevant checks after code changes.
- 2026-01-28 15:10:00: Marked docs/README.md as canonical docs index.
- 2026-01-28 15:13:00: Marked do-not-edit rules for archive/ and brain/static/dist/.
- 2026-01-28 15:16:00: were moved, renamed, or deleted
- 2026-01-28 15:18:00: Added auto-commit rule to CLAUDE.md.
- 2026-01-28 15:21:00: Added shell preference (PowerShell default; WSL/Git Bash when required).
- 2026-01-28 15:25:00: Added editor preference (Codex/Claude Code).
- 2026-01-28 15:29:00: Added safe-by-default git rule to CLAUDE.md.
- 2026-01-28 15:33:00: Clarified dashboard launch rule (Start_Dashboard.bat only).
- 2026-01-28 15:36:00: Added Google Calendar credentials handling note.
- 2026-01-28 15:43:00: Added external systems section to CLAUDE.md.
- 2026-01-28 15:46:00: Updated Tutor note (CustomGPT only; no local launcher).
- 2026-01-28 15:48:00: Added CustomGPT name to CLAUDE.md.
- 2026-01-28 15:51:00: Marked Anki/AnkiConnect as active use.
- 2026-01-28 15:52:00: Marked Google Calendar/Tasks as active use.
- 2026-01-28 17:30:00: Added PRD for calendar month view and event management improvements.
- 2026-01-29 18:29:30: Added developer workflow discovery example and review-loop prompt to CLAUDE_CODEX_REVIEW_LOOP.md.

- 2026-01-29: Calendar page fixes - (1) selectedCalendars now persists to localStorage with SAVE button, initializes from localStorage on mount with try/catch + Array.isArray guard. (2) New LocalEventEditModal.tsx with 4-tab interface (DETAILS, TIME, TYPE, REPEAT) covering all 10 editable DB fields, replacing the old 4-field inline dialog. Updated mutation to send all fields. (3) Added Post-Implementation Checklist section to CLAUDE.md to enforce build+copy workflow.

- 2026-01-29: Added end-of-session hookify rule (.claude/hookify.end-of-session-checklist.local.md) that prompts 5-step cleanup checklist when session-ending phrases detected. Added calendar SAVE dirty/saved indicator dot and toast feedback. Captured 4 session learnings to CLAUDE.md.

- 2026-01-29: Unified local/Google event edit options, wired local event fields to DB/API, and fixed Google update/delete + metadata persistence for eventType/course/weight. Rebuilt dashboard and synced dist.

- 2026-01-29: Raised Select menu z-index to show dropdowns above calendar edit dialogs; rebuilt and synced dashboard.

- 2026-01-29: Added z-index overrides on calendar Select menus to keep dropdowns above edit dialogs; rebuilt and synced dashboard.

- 2026-01-29: Replaced timezone inputs with dropdowns (local + Google), persisting selection via local time_zone and Google extendedProperties; rebuilt and synced dashboard.

- 2026-01-29: Fixed calendar edit modal hook ordering (timezone useMemo now before null guard) to prevent black-screen crash when opening events; rebuilt and synced dashboard.
- 2026-01-29: Restored local event color rendering by applying calendarColor inline styles for all events; moved edit modals down to avoid header clipping; rebuilt and synced dashboard.
- 2026-01-29: Limited timezone dropdowns to America zones and added course dropdowns backed by study wheel courses in calendar edit modals; rebuilt and synced dashboard.
- 2026-01-29: Linked study wheel courses to canonical courses (course_id + code), updated course APIs to return canonical IDs, and wired calendar course dropdowns to store courseId/courseCode; restricted timezones to America-only; rebuilt and synced dashboard.
- 2026-01-29: Added course number input for new Study Wheel courses (no retroactive edits); wired to course create API; rebuilt and synced dashboard.
- 2026-01-29: Anchored dashboard dialogs (add/edit course, add deadline, edit task, delete course) to top offset to prevent off-screen modal overlay; rebuilt and synced dashboard.
- 2026-01-29: Added course number field to edit course dialog (Study Wheel) and update payload; render calendar edit modals only when selected events exist to avoid black-screen overlay; rebuilt and synced dashboard.
- 2026-01-29: Updated AGENTS.md with project-exploration-before-skills guidance, SwiftUI retrieval-first rule, and docs Table of Contents requirement.

- 2026-01-29: Fixed calendar edit modal crash by rendering course dropdown options as course names/ids (not raw objects) in local + Google edit modals; rebuilt and synced dashboard.
- 2026-01-29: Noted in CLAUDE.md to read AGENTS.md for agent behavior rules.

- 2026-01-29: Strengthened Calendar Sync button to refresh Google status, calendar list, and events; auto-resets calendar selection if it no longer matches current Google calendars; added sync success/failure toasts; rebuilt and synced dashboard.
- 2026-01-29: Sync now forces Google calendar selection to all current calendars and clears hidden calendars so the dashboard mirrors Google after sync; rebuilt and synced dashboard.
- 2026-01-29: Updated repo instructions (AGENTS.md, CLAUDE.md) to explicitly require reading global C:\Users\treyt\.claude\CLAUDE.md first.
- 2026-01-29: Calendar create now writes to Google when a Google calendar is selected; local events are restricted to calendarId=local, and local events enabled for Google calendars are hidden when Google is connected to prevent duplicate listings.
- 2026-01-29: Normalized Google all-day event end dates to avoid spillover, split all-day end handling for local vs Google creates, and tagged local events with google calendar IDs so Google-connected views hide duplicates; rebuilt and synced dashboard.
- 2026-01-29: Wired Calendar Sync button to call /api/gcal/sync (bidirectional), then refresh local + Google events and show sync counts in toast; rebuilt and synced dashboard.
- 2026-01-29: Fixed Google all-day date shift by parsing date-only values as local dates, added Google event GET for recurring series lookup, and display series recurrence for instances; rebuilt and synced dashboard.
- 2026-01-29: Enriched Google event list responses with master recurrence for instances so Repeat tab shows actual series pattern.
- 2026-01-30: Added Google recurring edit controls (instance vs series), delete instance/series actions, and screen-reader title/description in EventEditModal; wired instance-to-series switch in calendar page; rebuilt and synced dashboard.
- 2026-01-30: Reduced calendar edit modal height and top offset to fit the viewport (local + Google); rebuilt and synced dashboard.
- 2026-01-30: Increased calendar edit modal max height and enabled flex scroll shrink (min-h-0) so inner content fits and scrolls; rebuilt and synced dashboard.
- 2026-01-30: Widen Google edit modal (max-w override with viewport clamp) so synced event forms fit the pre-emptive
- 2026-01-30: Added sop/sop_index.v1.json manifest pointing the Tutor SOP Explorer to sop/library (source of truth).
- 2026-01-30: Rewrote sop/sop_index.v1.json without BOM to fix /api/sop/index 500.
- 2026-01-30: Added SOP runtime bundle generator/validator, golden log tests, and runtime prompt outputs for Custom GPT v9.3 (sop/runtime, sop/tools, sop/tests).
- 2026-01-30: Added ExecPlan for SOP runtime bundle build in .agent/context/plans/SOP_RUNTIME_V9_3_CUSTOM_GPT_EXECPLAN.md.
- 2026-01-30: Updated sop/library/10-deployment.md with multi-domain prefixes, UNVERIFIED summary, anki_cards encoding, and canonical source note.
- 2026-01-31: Updated M6 Wrap heading compatibility in session flow and made build_runtime_bundle wrap heading detection flexible with a wrap-found message.
- 2026-01-31: Added Lite Wrap example heading in 11-examples and made example extraction tolerant to missing headings in build_runtime_bundle.

- 2026-01-31: Added v9.4 Custom GPT system instructions to SOP library and linked in overview.
- 2026-01-31: Updated v9.4 Custom GPT system instructions with pre-test guardrail (NO-GUESS), first exposure vs review rule, and LO relabel restriction.
- 2026-01-31: Built dashboard frontend and synced brain/static/dist from dashboard_rebuild/dist/public for live deploy.

- 2026-01-31: Completed UI Overhaul v9.4.2 boulder work - all core features delivered (11 commits total):
  - Runtime bundle drift resolved (8ac74c5f)
  - Scholar runnable backend + frontend (dc97111d, ca985eec, b88e6ac0, 1d320047)
  - Planner CTA after JSON attach (93490a5b)
  - Dashboard compact preview with top 3 tasks + Open Brain button (2f05a0da, bdb5207a)
  - Brain tab reorganization: DAILY/WEEKLY/ADVANCED -> TODAY/THIS WEEK/TOOLS/DATA (990cecd1)
  - Scholar tab consolidation: 7 tabs -> 3 tabs (SUMMARY/ANALYSIS/PROPOSALS) with new ANALYSIS section (b88e6ac0, 1d320047)
  - Documentation and plan completion (07ee0e64, 55989154, e7e5e1e4, 26cbf75b)
  - Calendar view separation deferred to v9.4.3 (documented in .sisyphus/notepads/ui-overhaul-v9.4.2/calendar-deferred.md)
  - **Action required:** 4 commits need manual push (26cbf75b, 55989154, 2f05a0da, 1d320047) - git push failed due to WSL auth
- 2026-01-31: Rebuilt dashboard and re-synced brain/static/dist from dashboard_rebuild/dist/public.

- 2026-01-31: Fixed Dashboard/Scholar black screens (planner queue + clustering mutation refs); rebuilt and synced dashboard assets.

- 2026-01-31: Fixed Scholar run button payload (send JSON body) and rebuilt/synced dashboard assets.

- 2026-01-31: Wired /api/scholar/run to trigger the Codex-based orchestrator (prevents no-op runs).

- 2026-02-01: Added /api/health/db alias and DB health payload fields for smoke test.
- 2026-02-01: Removed deprecated web_search_request flag from Codex config to silence warning.
- 2026-02-01: Added agent strategy docs, prompt patterns, and sync script; aligned Claude/Codex/OpenCode configs and commands.

- 2026-02-01: Made /api/scholar/digest DB-first, added /api/scholar/proposals alias, fixed duplicate obsidian patch, and ignored scholar outputs.
- 2026-02-01: Added Custom GPT deployment pack doc and print helper script.
- 2026-02-01: Moved planning docs into tasks/ and stopped ignoring curated planning files in .gitignore.
- 2026-02-01: Refined Custom GPT deployment pack content and print script for acceptance test and run history.
- 2026-02-01: enabled auto-append prompt suffix defaults across Claude/Codex/OpenCode strategy docs and rules.

- 2026-02-01: Added LO Engine protocol pack doc, routing, and templates.
- 2026-02-03: Appended raw input notes to Obsidian study session sync for Brain chat.
- 2026-02-03: Added organize-preview flow with destination picker and raw+organized Obsidian sync for Brain ingest.

- 2026-02-05 14:30:08: Unified SOP/agent paths: updated docs/root/PROJECT_ARCHITECTURE.md, refreshed docs/root/ARCHITECTURE_CONTEXT.md, replaced AI config drift with scripts/sync_agent_config.ps1 (CI), updated Scholar allowlists/docs to sop/library + sop/runtime, and updated brain/ingest_knowledge.py to ingest from sop/runtime/knowledge_upload (legacy fallback kept). Added Conductor workflow docs + scripts/sync_portable_agent_config.ps1 wrapper for vault-based agent config.
- 2026-02-06: Synced documentation entrypoints (README, CLAUDE, GUIDE_DEV) and added CI docs sync check (scripts/check_docs_sync.py); added v9.4 log validator script.

2026-02-06 - Add root requirements.txt + fix memory.py so release_check passes; update GUIDE_DEV install steps.

2026-02-06 - Fix dashboard Brain Tools black screen by adding missing Obsidian API client methods (getConfig/getVaultIndex/getGraph) and rebuilding brain/static/dist.

## 2026-02-06 - Safer UI Sync in Start_Dashboard

- Prevent Start_Dashboard.bat from overwriting brain/static/dist with an older dashboard_rebuild/dist/public build.
- When syncing, mirror the build output (robocopy /MIR) so stale hashed assets don't linger.
- Ignore local verification screenshots (_tmp_*.png).

2026-02-06 - Added jules-sdk local smoke test (smoke.ts) and README instructions for running via tsx.

## 2026-02-06 - MCP Presets + User Troubleshooting

- Add github + memory MCP server presets to .mcp.json and .claude/mcp.json (GitHub requires GITHUB_PERSONAL_ACCESS_TOKEN).
- Document the MCP presets in docs/AI_CONFIG.md.
- Add a quick black-screen troubleshooting note to docs/root/GUIDE_USER.md.

## 2026-02-06 - Align Dashboard Build/Run Docs

- Update dashboard_rebuild and brain READMEs to match the canonical workflow: build via npm run build, sync dist/public -> brain/static/dist, run via Start_Dashboard.bat (no Vite dev server).

## 2026-02-06 - Allow Codex CLI in Repo Permissions

- Permit codex exec / codex resume in permissions.json (and .claude/permissions.json) so the codex-subagent workflow isn't blocked by the repo allowlist.

## 2026-02-06 - Fix CI Calendar Assistant Typing Import

- Import Any in brain/dashboard/calendar_assistant.py to prevent NameError during pytest collection on Ubuntu GitHub Actions.

## 2026-02-06 - Make CI Tests Self-Contained

- Add offline parsing fallback for calendar NL parsing so tests don't require OPENROUTER_API_KEY.
- Ensure db_setup.get_connection initializes the SQLite schema on first use so /api/sessions works in fresh clones/CI.

## 2026-02-08 - v9.5 Split-Track + Method Library Merge

- Merged `v9.4-backlog-implementation` into `main` (Composable Method Library: api_methods.py, method_analysis.py, methods page, 4 components, 18 tests, 15-method-library.md, updates to 14 SOP files).
- Bumped remaining `Lite Wrap v9.4` references to v9.5 in 05-session-flow.md, 10-deployment.md, 00-overview.md, and README.md.
- Added `build_custom_instructions()` to `sop/tools/build_runtime_bundle.py` - extracts code block from file 13, writes `sop/runtime/custom_instructions.md`.
- Added `13-custom-gpt-system-instructions.md` to build script required set.
- Regenerated all runtime bundles (6 knowledge files + runtime_prompt.md + custom_instructions.md) at v9.5.
- Frontend rebuilt and synced to `brain/static/dist/`.
- All 56 tests pass.

## 2026-02-08 - Brain Page Redesign + Anki Fix + Concept Map Editor

### Anki Sync Fix (Critical Bug)
- Backend `/anki/sync` now returns HTTP 500 on subprocess failure (was always 200)
- Added `logger.error()` for failed syncs in `api_adapter.py`
- Frontend `api.anki.sync` now checks `success` field and throws on failure
- Added `onError` handler with destructive toast, loading spinner on sync button
- Added inline error display with retry button when sync fails
- Added missing `deleteDraft` and `updateDraft` to `api.ts` anki client
- `AnkiIntegration` now supports `compact?: boolean` prop for embedded use

### Brain Page 3-Column Layout
- Replaced 4-tab Brain page (342 lines) with persistent 3-column workspace (107 lines)
- New files: `components/brain/useBrainWorkspace.ts`, `BrainWorkspaceTopBar.tsx`, `VaultSidebar.tsx`, `CenterColumn.tsx`, `RightColumn.tsx`, `VaultEditor.tsx`, `BrainModals.tsx`
- Left column: Vault file browser with search + course quick-nav (always visible)
- Center column: toggle EDIT (vault editor) / CHAT (BrainChat embedded mode)
- Right column: toggle MAP (ConceptMapEditor) / ANKI (compact integration)
- Top bar: compact flow status, Import/Graph modal buttons, Obsidian/Anki status badges
- Mobile: single column with bottom tab bar fallback
- Panel sizes persist via `autoSaveId="brain-workspace"` (react-resizable-panels)
- `BrainChat` now supports `embedded?: boolean` prop (fills parent height, no Card wrapper)

### Concept Map Editor (New Feature)
- Installed `@xyflow/react`, `dagre`, `@types/dagre`, `html-to-image`
- New `lib/mermaid-to-reactflow.ts`: regex-based parser for Mermaid flowchart syntax, round-trip export, dagre auto-layout
- New `components/ConceptMapEditor.tsx`: React Flow canvas with arcade-themed nodes
  - Import Mermaid code -> interactive drag-and-drop graph
  - Toolbar: add/delete nodes, auto-layout (TB/LR), export PNG, copy Mermaid, save to vault
  - Save as `.md` with Mermaid code block (Obsidian renders natively)
- Frontend rebuilt and synced to `brain/static/dist/`
- All 56 tests pass

- 2026-02-08: PEIRRO-Aligned Method Library Restructure
  - Categories renamed from ad-hoc (activate/map/encode/retrieve/connect/consolidate) to PEIRRO phases (prepare/encode/interrogate/retrieve/refine/overlearn)
  - Added `evidence` column to `method_blocks` table (research citations per block)
  - Added `migrate_method_categories()` to `db_setup.py` for existing DB migration
  - Expanded from 25 to 30 method blocks (new: Pre-Test, Self-Explanation Protocol, Variable Retrieval, Illness Script Builder, Mechanism Trace)
  - Expanded from 8 to 12 template chains (new: Dense Anatomy Intake, Pathophysiology Intake, Clinical Reasoning Intake, Quick First Exposure)
  - Reordered "First Exposure (Core)" chain: retrieval before generative encoding per Potts & Shanks (2022)
  - Added `--migrate` flag to `seed_methods.py` for category migration without data loss
  - Updated API (`api_methods.py`): evidence field in create/update
  - Updated all frontend types, colors, and filter buttons for 6 PEIRRO phases
  - Updated SOP doc (`15-method-library.md`) with full block catalog and evidence citations
  - Fixed pre-existing test isolation issue (hardcoded IDs -> dynamic IDs)
  - Frontend rebuilt and synced to `brain/static/dist/`
  - All 57 tests pass

- 2026-02-08: Method Integration Gap Fixes
  - Wired `method_chain_id` into session create/update/get in `api_adapter.py` (was DB-only, never persisted via API)
  - Added `get_method_effectiveness_summary()` and `get_method_anomalies()` to `scholar/brain_reader.py`
  - Created `scholar/weekly_digest.py` with optional methods section (top/bottom performers, anomalies)
  - Added Composable Methods row to `docs/README.md` Feature->Doc table
  - Added 3 method tables to `docs/root/PROJECT_ARCHITECTURE.md` schema section
  - Updated `MEMORY.md` counts: 34 blocks, 13 chains (was 30/12)
  - All 57 tests pass

## 2026-02-08 - SOP Library Upgrade Pipeline (YAML Source of Truth)

- Converted triple-source method library (markdown + Python dicts + SQLite) to YAML as single source of truth
- **Commit 1**: 34 method YAMLs, 13 chain YAMLs, taxonomy.yaml, version.yaml, Pydantic v2 models, conversion script
- **Commit 2**: validate_library.py (8 checks), golden test framework, baselines
- **Commit 3**: build_methods_from_yaml() in build_runtime_bundle.py, seed_methods.py reads YAML (PyYAML only), library_meta DB table
- **Commit 4**: gap_radar.py (7-category analysis), new_ticket.py (ET scaffolder), bump_version.py, RELEASELOG.md
- **Commit 5**: CI sop_validate job, sop/README.md, Phase 2 GitHub issue
- Dependencies: PyYAML in requirements.txt (runtime), Pydantic in requirements-tools.txt (tools only)
- Un-ignored brain/data/seed_methods.py in .gitignore (code file, not data)
- Generator contract preserved: exact headings for build_methods() parser
- 79 tests pass (57 brain + 22 SOP)

## 2026-02-08 - SWEEP/DEPTH Chain Runner

- Executable chain runner: orchestrates LLM calls per method block, producing Obsidian notes, Anki card drafts, and session metrics
- **Commit 1** (`9ad656e1`): `chain_runs` table in db_setup.py, SWEEP (`C-SW-001.yaml`) and DEPTH (`C-DP-001.yaml`) chain definitions, TEMPLATE_CHAINS seed entries
- **Commit 2** (`14c26696`): `chain_runner.py` (run_chain + helpers), `chain_prompts.py` (12 block prompt templates), 17 unit tests with mocked LLM
- **Commit 3** (`361d1a1f`): `api_chain_runner.py` Flask Blueprint (POST/GET chain-run endpoints), registered in app.py
- **Commit 4** (`b5c76b20`): Frontend UI - chainRun API methods + types in api.ts, Run button + ChainRunDialog + ChainRunResultDialog + run history table in methods.tsx
- **Commit 5**: Polish - full test suite (74 pass), SOP validator (34 methods, 15 chains), CONTINUITY.md update
- Architecture: One `call_llm()` per block, accumulated context feeds forward, sync execution with spinner
- Card parsing: CARD/TYPE/FRONT/BACK/TAGS line format from LLM output
- Session created with study_mode = chain name, `method_chain_id` linked
- Obsidian write via lazy-imported `obsidian_append()`, gated by `write_obsidian` option
- RRAG context capped at 2000 chars from `source_doc_ids`

## 2026-02-09 - Agent Setup Cleanup

- 02:04: Added Agents Conductor track, clarified workflow + track pointers for Claude compatibility, vendored `x-research` skill for Codex, expanded allowlists, and ignored repo-root planning artifacts/scratch. Files: `conductor/tracks/agents_setup_cleanup_20260209/`, `conductor/tracks.md`, `AGENTS.md`, `CLAUDE.md`, `.claude/AGENTS.md`, `.claude/CLAUDE.md`, `.claude/settings.local.json`, `.codex/skills/x-research/`, `.gitignore`, `permissions.json`.
- 23:46: Added persistent named worktree tooling and a Codex skill for routing parallel agents to integrate/ui/brain worktrees. Files: `scripts/agent_worktrees.ps1`, `scripts/README.md`, `.codex/skills/agent-worktrees/`.
- 02:12: Switched Tutor chat to use Codex CLI (ChatGPT login) by default (no API key), added safe JSON-mode Codex runner, and used keyword-only RAG retrieval for Codex mode. Files: `brain/llm_provider.py`, `brain/dashboard/api_tutor.py`, `brain/tutor_rag.py`, `dashboard_rebuild/client/src/pages/tutor.tsx`, `dashboard_rebuild/client/src/components/ContentFilter.tsx`, `docs/root/PROJECT_ARCHITECTURE.md`.
- 04:38: Updated Tutor Content Filter: simplified modes (Learn/Review/Quick/Light/Fix) with recommended chains + auto-pick, added OpenRouter model gating, and ensured the method library auto-seeds on startup when missing. Files: `brain/db_setup.py`, `brain/data/seed_methods.py`, `brain/dashboard/api_tutor.py`, `brain/tutor_prompt_builder.py`, `dashboard_rebuild/client/src/components/ContentFilter.tsx`, `dashboard_rebuild/client/src/api.ts`, `docs/dashboard/DASHBOARD_WINDOW_INVENTORY.md`, `docs/dashboard/TUTOR_PAGE_SOP_EXPLORER_v1.0.md`.
- 05:16: Fixed "missing/partial library" + Tutor 404 issues after updates by (1) seeding/merging the YAML method library when DB is partial (not just empty), (2) updating placeholder/test rows in-place when they match library blocks, and (3) closing existing `dashboard_web.py` processes before launch to prevent stale routes. Files: `brain/db_setup.py`, `brain/data/seed_methods.py`, `Start_Dashboard.bat`.
- 07:38: Increased readability and theme consistency: larger typography, red-tinted non-button borders, neutral inactive buttons (no red hover) on Tutor/Methods/Library pages, and a small Tutor API unavailable banner. Rebuilt dashboard and synced `dashboard_rebuild/dist/public` to `brain/static/dist`. Files: `dashboard_rebuild/client/src/components/ContentFilter.tsx`, `dashboard_rebuild/client/src/pages/methods.tsx`, `dashboard_rebuild/client/src/pages/library.tsx`, `dashboard_rebuild/client/src/pages/tutor.tsx`, `dashboard_rebuild/client/src/index.css`, `brain/static/dist/`.

## 2026-02-08 - Adaptive Tutor Learning System (Phase 1 MVP)

### What was built
- **Interactive Tutor Chat** at `/tutor` - LangChain-powered RAG chat with SSE streaming
- **3-panel layout**: Content Filter (left) | Chat Interface (center) | Artifacts Sidebar (right)
- **First Pass phase behavior**: Core/Sprint/Drill/Teaching Sprint/Diagnostic Sprint modes
- **Mid-session artifact creation**: `/note`, `/card`, `/map` slash commands create Obsidian notes, Anki card drafts, and concept maps
- **Full Brain logging**: tutor_sessions, tutor_turns, session_chains tables

### New Backend Files
- `brain/tutor_rag.py` - LangChain RAG pipeline: ChromaDB + OpenAI embeddings + keyword fallback
- `brain/tutor_chains.py` - LangChain chain definitions for First Pass phase, artifact command detection
- `brain/tutor_streaming.py` - SSE streaming adapter for LangChain chains
- `brain/dashboard/api_tutor.py` - Flask Blueprint with 10 endpoints (`/api/tutor/*`)

### New Frontend Files
- `dashboard_rebuild/client/src/components/ContentFilter.tsx` - Course/folder/mode selector
- `dashboard_rebuild/client/src/components/TutorChat.tsx` - SSE streaming chat with markdown + citations
- `dashboard_rebuild/client/src/components/TutorArtifacts.tsx` - Session artifacts sidebar
- `dashboard_rebuild/client/src/pages/tutor.tsx` - Complete rewrite from SOP viewer to Tutor Chat

### Schema Changes (`brain/db_setup.py`)
- New tables: `tutor_sessions`, `session_chains`, `rag_embeddings`
- Column migrations: `tutor_turns` (+tutor_session_id, phase, artifacts_json), `card_drafts` (+tutor_session_id)

### Dependencies Added (`requirements.txt`)
- langchain, langchain-openai, langchain-community, chromadb, tiktoken

### API Endpoints
- `POST /api/tutor/session` - Create session
- `GET /api/tutor/session/<id>` - Get session + history
- `POST /api/tutor/session/<id>/turn` - Send message (SSE stream)
- `POST /api/tutor/session/<id>/end` - End session -> Brain record
- `POST /api/tutor/session/<id>/artifact` - Create note/card/map
- `GET /api/tutor/sessions` - List sessions
- `GET /api/tutor/content-sources` - Courses + folders + doc counts
- `POST /api/tutor/chain` - Create session chain
- `GET /api/tutor/chain/<id>` - Get chain with sessions
- `POST /api/tutor/embed` - Trigger RAG embedding
- `POST /api/tutor/sync-vault` - Sync Obsidian vault into RAG

- 2026-02-09: Made Adaptive Tutor fully functional:
  - Re-seeded 34 PEIRRO method blocks + 15 template chains (seed_methods.py --force)
  - Created brain/data/seed_tutor_content.py: seeds SOP runtime bundle (7), SOP library (17), method blocks (34), method chains (15) into rag_docs (73+ total)
  - Updated vault path: PT School Semester 2 -> Treys School (CLAUDE.md + global CLAUDE.md)
  - Improved tutor_chains.py: graceful no-content mode (teaches from training knowledge), method awareness (references PEIRRO blocks/chains by name)
  - Added POST /api/tutor/sync-vault endpoint: syncs Obsidian vault -> rag_docs + auto-embeds
  - Fixed GET /api/tutor/content-sources: now includes System/SOP virtual course for null-course docs
  - Added SYNC VAULT button to ContentFilter.tsx with vault path input, toast feedback
  - Updated TutorContentSources type: course id now nullable
  - Built frontend, synced dist, all 74 tests pass

## 2026-02-10 - CSS Consistency Cleanup

- Replaced hardcoded colors with semantic theme tokens across 6 components
- Fixed font-mono usage and removed redundant padding
- Centralized color palettes and added status utilities
- Rebuilt frontend dist

## 2026-02-10 - LangGraph Deep Agent for Scholar Pipeline

- Replaced Codex CLI subprocess approach with in-process LangGraph ReAct agent
- New package: `scholar/deep_agent/` (4 files: __init__, tools, agent, prompts)
- 7 LangChain @tool wrappers: telemetry snapshot, friction alerts, weekly digest, SOP file reader, session metrics, method effectiveness, recent sessions
- Consolidated 5 specialist roles (telemetry auditor, SOP auditor, pedagogy questioner, research scout, supervisor) into single system prompt
- LLM via OpenRouter (Gemini Flash), same pattern as tutor_chains.py
- Routing priority in scholar.py: `deep_agent.enabled` > `multi_agent.enabled` > single-agent Codex
- Background thread pattern matches existing multi-agent flow (marker files, log, questions extraction, preserved questions)
- Output format: raw markdown with ## sections (What I Learned, Signals, Risks, Action Items, Warnings, Questions Needed, Research Directions, Next Run Suggestions)
- Fixed code fence wrapping: removed fenced example from prompt + added defensive `_strip_code_fences()` parser
- Tested end-to-end: ~11-20s per run, output files created correctly
- Dependencies: `langgraph>=1.0.7,<1.1` (matched to langchain 1.2.9 requirement)
- Files: `scholar/deep_agent/`, `brain/dashboard/scholar.py`, `requirements.txt`, `scholar/inputs/audit_manifest.json`
- All 77 tests pass

## 2026-02-10 - Tutor Facilitation Prompts + Chain Builder

- Added `facilitation_prompt` column to `method_blocks` table (db_setup migration)
- `seed_methods.py`: generates structured prompts from YAML block definitions (`--regenerate-prompts` flag)
- New endpoints: `GET /api/tutor/blocks`, `POST /api/tutor/blocks/chain`
- `tutor_prompt_builder.py`: injects facilitation_prompt into system prompt when available
- New `TutorChainBuilder.tsx` component: custom chain builder UI with drag-drop reorder, category picker, duration totals
- `ContentFilter.tsx`: tab toggle for Templates vs Custom chain building
- `tutor.tsx`: integrated custom chain creation flow, widened panels to 80

## 2026-02-10 - Frontend Fixes + Build

- `PlannerKanban.tsx`: fixed optimistic update rollback at correct index
- `ConceptMapFreehand.tsx`: fixed undo/redo state detection for tldraw API changes
- `ScholarLifecyclePanel/ScholarRunStatus/scholar.tsx`: migrated hardcoded colors to semantic theme tokens
- `Start_Dashboard.bat`: replaced robocopy with PowerShell build-and-sync script, added SKIP_UI_BUILD support
- Rebuilt frontend dist and synced to brain/static/dist
- Updated .gitignore: audit screenshots (audit-*.png) and temp planning files

## 2026-02-10 - Track Archived

- Archived `agents_setup_cleanup_20260209` track (all tasks complete)

## 2026-02-10 - Rich Mind Map Editor + Scholar/Tutor Fixes

### Mind Map Editor (MindMapView rewrite)
- Replaced `react-force-graph-2d` with `@xyflow/react` for full interactive editing
- New files: `MindMapNodes.tsx` (shape + image node types), `MindMapToolbar.tsx`, `MindMapDrawLayer.tsx`
- Features: 4 shapes (rectangle/circle/diamond/hexagon), inline label editing (double-click), NodeResizer, color picker (9 node + 9 edge colors), shape picker, dagre auto-layout (TB/LR), image paste from clipboard, freehand canvas draw overlay, PNG export, save to Obsidian vault as JSON
- Curriculum seed: courses → hexagon/cyan, modules → rectangle/yellow, LOs → circle/green
- Sidebar with course/module/LO filters preserved from original

### Scholar Page Fixes
- Fixed runtime TypeError: `api.scholar.getClusters` and `api.scholar.runClustering` were called but never defined — added stub resolvers returning empty clusters, added `ScholarClustersResponse` type
- Replaced "Run Clustering" button with "COMING SOON" badge (backend not yet implemented)
- Fixed Tutor Audit section: was rendering non-existent fields (`sessionDate`, `phase`, `observation`, `impact`) — now uses actual API fields (`date`, `status`, message counts, `sessionId`)

### Tutor Onboarding
- Added collapsible "Quick Start Guide" banner at top of Tutor page
- 4-column layout: Pick a Mode | Set Up a Chain | Enter a Topic | Study + Artifacts
- Explains all 5 modes, template vs custom chains, topic setup, slash commands
- Auto-shows for new users, dismissal persists in localStorage

- Build: 0 errors, 77/77 tests pass
- Commit: `bfd8031b`

## 2026-02-14 - Tutor Artifact Persistence & Cross-Feature Wiring

- **Artifact content persistence**: Note and map artifacts now store `content` in `artifacts_json` (was metadata-only). Resumed sessions restore full content instead of empty strings.
- **Card-to-Brain linking**: `card_drafts.session_id` updated to the Brain `sessions` record ID at end-session, so cards appear under the correct Brain session.
- **Notes to dashboard**: Creating a tutor note artifact also inserts into `quick_notes` with `note_type='tutor'`, making tutor notes visible in the dashboard Notes panel.
- **Obsidian export enriched**: "Save to Obsidian" now appends an Artifacts section with notes (raw content), maps (mermaid code fences), and cards (front/back).
- **Mind map → Brain bridge**: Map artifacts show a "Send to Brain" button that stores Mermaid code in localStorage and navigates to `/brain`, where the import dialog opens pre-filled.
- **Method blocks seeded**: 36 blocks with facilitation prompts via `seed_methods.py --force` + `--regenerate-prompts`.
- Files: `brain/dashboard/api_tutor.py`, `dashboard_rebuild/client/src/pages/tutor.tsx`, `dashboard_rebuild/client/src/components/TutorArtifacts.tsx`, `dashboard_rebuild/client/src/components/brain/UnifiedBrainCanvas.tsx`
- Build: 0 errors, 77/77 tests pass
- Commit: `9118c1f3`

## 2026-02-16 - Library Sync Chroma Batch-Size Overflow Fix

- Fixed tutor materials embedding to respect Chroma runtime max batch size during sync-folder embed step.
- Added adaptive backoff for batch-limit `ValueError`s (halves batch size and retries).
- Added best-effort rollback of already-inserted vector IDs on fatal mid-stream failure to avoid partial insert drift.
- Added focused unit tests for batch-size resolution, split behavior, backoff, rollback, and input validation.
- Files: `brain/tutor_rag.py`, `brain/tests/test_tutor_rag_batching.py`
- Tests: `pytest brain/tests/test_tutor_rag_batching.py -q` and `pytest brain/tests/ -q` both pass.

## 2026-02-16 - Library Page Vault-Style Layout Refresh

- Reworked `Library` page from stacked cards into a Brain-style workspace shell (`brain-workspace`) with a left folder rail and right materials pane.
- Added vault-like folder navigation from material folder paths (nested depth + folder counts), plus `All Materials` aggregate view.
- Improved materials table formatting and readability:
  - Added explicit folder column.
  - Switched to consistent panel spacing, border rhythm, and sticky header inside scroll container.
  - Scoped “select all” to current folder view.
- Fixed selection-state regressions found in review:
  - `CLEAR SELECTED` now deletes selected IDs in current view and only removes deleted IDs from selection state.
  - Prevented initial load from wiping persisted selections before materials query resolves.
  - Removed magic `__all__` sentinel collision risk by using empty-string root key.
- File: `dashboard_rebuild/client/src/pages/library.tsx`
- Verification: `dashboard_rebuild && npm run build` and `pytest brain/tests/ -q` both pass.

## 2026-02-16 - Library Folder UX + Real Course Linking

- Folder rail is now collapsible/expandable by path with chevron controls and keyboard-safe row handling.
- Collapsing a folder now collapses descendants reliably and avoids orphaned child rows.
- Added initial top-level auto-expand only once (preserves user collapse state across refreshes).
- Updated folder-path normalization:
  - Removed machine-root Desktop leakage for local absolute paths.
  - Preserved protocol/URL folder paths without over-normalizing.
- Replaced heuristic `auto-link` button with explicit linking to real active courses:
  - Added course dropdown (`api.courses.getActive`) + `LINK IN VIEW` action.
  - Linking updates selected visible materials via `api.tutor.updateMaterial(..., { course_id })`.
  - Linking now runs sequential updates for safer API behavior on large selections.
- Removed automatic post-sync auto-link pass; linking is now user-driven.
- File: `dashboard_rebuild/client/src/pages/library.tsx`
- Verification: `dashboard_rebuild && npm run build` and `pytest brain/tests/ -q` both pass.

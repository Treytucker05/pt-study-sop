# CONTINUITY\n

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

- 2026-01-22 17:01:00: Policy update — after each successful upgrade or change, push to GitHub.

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
- 2026-01-23 23:25:01: Updated JANUARY_26_PLAN docs (INDEX, UPDATED_PLAN, EXECPLAN_DASHBOARD, REFERENCE_DOCS, MILESTONE_INSTRUCTIONS) to reflect single-dashboard Flask API/DB ownership and removed Node server usage; added Agent Hygiene section to README.
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
-   2 0 2 6 - 0 1 - 2 6   1 4 : 0 0 : 0 9 :   U p d a t e d   c a l e n d a r   m a n a g e   U I   t o   s u p p o r t   d r a g - a n d - d r o p   o r d e r i n g ,   l o c a l   c a l e n d a r   s e l e c t i o n ,   a n d   s e l e c t i o n - o n l y   f i l t e r i n g ;   p e r s i s t e d   c a l e n d a r   o r d e r / s e l e c t i o n   i n   l o c a l S t o r a g e .  
 -   2 0 2 6 - 0 1 - 2 6   1 4 : 1 4 : 2 3 :   R e b u i l t   d a s h b o a r d _ r e b u i l d   a n d   c o p i e d   d i s t / p u b l i c   t o   b r a i n / s t a t i c / d i s t   f o r   c a l e n d a r   M a n a g e   o r d e r i n g   +   s e l e c t i o n - o n l y   f i l t e r i n g .  
 - 2026-01-26 15:07:33: Backed up uncommitted files to _codex_backups and reverted Brain session filter/query UI changes in dashboard_rebuild/client/src/pages/brain.tsx.
-   2 0 2 6 - 0 1 - 2 6   1 5 : 1 0 : 0 2 :   U p d a t e d   A G E N T S . m d   t o   r e q u i r e   a   g i t   c o m m i t   a f t e r   c h a n g e s ;   s y n c e d   m i r r o r s .  
 - 2026-01-26 21:11:43: Rebuilt dashboard_rebuild and copied dist/public to brain/static/dist for updated Brain UI.
- 2026-01-26 22:23:50: Updated permissions allowlist to run Windows test commands (pytest, Flask, ingest script).
\n## 2026-01-27
- Added `bash -lc` to `permissions.json` allowlist to permit WSL package install commands for jq.
\n## 2026-01-27
- Added `robocopy` to `permissions.json` allowlist for Windows build copy step.
- Rebuilt `dashboard_rebuild` and synced `dist/public` to `brain/static/dist`.
- Added README files to `brain/output` and `brain/static` per repo folder documentation rule.
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
- 2026-01-28 15:13:00: Added do-not-edit rules for archive/ and brain/static/dist/.
- 2026-01-28 15:16:00: Added no-destructive-commands rule.
- 2026-01-28 15:18:00: Added auto-commit rule to CLAUDE.md.
- 2026-01-28 15:21:00: Added shell preference (PowerShell default; WSL/Git Bash when required).
- 2026-01-28 15:25:00: Added editor preference (Codex/Claude Code).
- 2026-01-28 15:29:00: Added safe-by-default git rule to CLAUDE.md.
- 2026-01-28 15:33:00: Clarified dashboard запуск rule (Start_Dashboard.bat only).
- 2026-01-28 15:36:00: Added Google Calendar credentials handling note.
- 2026-01-28 15:43:00: Added external systems section to CLAUDE.md.
- 2026-01-28 15:46:00: Updated Tutor note (CustomGPT only; no local launcher).
- 2026-01-28 15:48:00: Added CustomGPT name to CLAUDE.md.
- 2026-01-28 15:51:00: Marked Anki/AnkiConnect as active use.
- 2026-01-28 15:52:00: Marked Google Calendar/Tasks as active use.
- 2026-01-28 17:30:00: Added PRD for calendar month view and event management improvements.
-   2 0 2 6 - 0 1 - 2 9   1 8 : 2 9 : 3 0 :   A d d e d   d e v e l o p e r   w o r k f l o w   d i s c o v e r y   e x a m p l e   a n d   r e v i e w - l o o p   p r o m p t   t o   C L A U D E _ C O D E X _ R E V I E W _ L O O P . m d .  
 
- 2026-01-29: Calendar page fixes — (1) selectedCalendars now persists to localStorage with SAVE button, initializes from localStorage on mount with try/catch + Array.isArray guard. (2) New LocalEventEditModal.tsx with 4-tab interface (DETAILS, TIME, TYPE, REPEAT) covering all 10 editable DB fields, replacing the old 4-field inline dialog. Updated mutation to send all fields. (3) Added Post-Implementation Checklist section to CLAUDE.md to enforce build+copy workflow.

- 2026-01-29: Added end-of-session hookify rule (.claude/hookify.end-of-session-checklist.local.md) that prompts 5-step cleanup checklist when session-ending phrases detected. Added calendar SAVE dirty/saved indicator dot and toast feedback. Captured 4 session learnings to CLAUDE.md.

 -   2 0 2 6 - 0 1 - 2 9 :   U n i f i e d   l o c a l / G o o g l e   e v e n t   e d i t   o p t i o n s ,   w i r e d   l o c a l   e v e n t   f i e l d s   t o   D B / A P I ,   a n d   f i x e d   G o o g l e   u p d a t e / d e l e t e   +   m e t a d a t a   p e r s i s t e n c e   f o r   e v e n t T y p e / c o u r s e / w e i g h t .   R e b u i l t   d a s h b o a r d   a n d   s y n c e d   d i s t . 
  
 
 -   2 0 2 6 - 0 1 - 2 9 :   R a i s e d   S e l e c t   m e n u   z - i n d e x   t o   s h o w   d r o p d o w n s   a b o v e   c a l e n d a r   e d i t   d i a l o g s ;   r e b u i l t   a n d   s y n c e d   d a s h b o a r d . 
  
 
 -   2 0 2 6 - 0 1 - 2 9 :   A d d e d   z - i n d e x   o v e r r i d e s   o n   c a l e n d a r   S e l e c t   m e n u s   t o   k e e p   d r o p d o w n s   a b o v e   e d i t   d i a l o g s ;   r e b u i l t   a n d   s y n c e d   d a s h b o a r d . 
  
 
 -   2 0 2 6 - 0 1 - 2 9 :   R e p l a c e d   t i m e z o n e   i n p u t s   w i t h   d r o p d o w n s   ( l o c a l   +   G o o g l e ) ,   p e r s i s t i n g   s e l e c t i o n   v i a   l o c a l   t i m e _ z o n e   a n d   G o o g l e   e x t e n d e d P r o p e r t i e s ;   r e b u i l t   a n d   s y n c e d   d a s h b o a r d . 
  
 - 2026-01-29: Fixed calendar edit modal hook ordering (timezone useMemo now before null guard) to prevent black-screen crash when opening events; rebuilt and synced dashboard.
- 2026-01-29: Restored local event color rendering by applying calendarColor inline styles for all events; moved edit modals down to avoid header clipping; rebuilt and synced dashboard.
- 2026-01-29: Limited timezone dropdowns to America zones and added course dropdowns backed by study wheel courses in calendar edit modals; rebuilt and synced dashboard.
- 2026-01-29: Linked study wheel courses to canonical courses (course_id + code), updated course APIs to return canonical IDs, and wired calendar course dropdowns to store courseId/courseCode; restricted timezones to America-only; rebuilt and synced dashboard.
- 2026-01-29: Added course number input for new Study Wheel courses (no retroactive edits); wired to course create API; rebuilt and synced dashboard.
- 2026-01-29: Anchored dashboard dialogs (add/edit course, add deadline, edit task, delete course) to top offset to prevent off-screen modal overlay; rebuilt and synced dashboard.

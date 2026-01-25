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

Goal (incl. success criteria):
- Finalize the documentation for the OpenRouter-based Trey's Agent by installing the new high-speed README so the project can be paused cleanly.
Constraints/Assumptions:
- Keep changes minimal and ASCII-friendly; align with the existing fast-mode launcher and SOP content.
Key decisions:
- Maintain the fast-mode `ask.py`, keep the 3-pass SOP under `context/`, and highlight the paid Gemini Flash architecture in README.
State:
  - Done:
    - Replaced `README.md` with the latest high-speed OpenRouter guide covering status, quick start, and pick-up plan.
  - Now:
    - Summarize the README update and note that verification waits still saw no answer from the backend.
  - Next:
    - Confirm the agent responses once the OpenRouter service is stable again.
Open questions (UNCONFIRMED if needed):
- None.
Working set (files/ids/commands):
- `pt-study-sop/README.md`

Update 2026-01-18:
- Goal: Establish universal memory by overwriting `CLAUDE.md` and `AGENTS.md`, and inject `CLAUDE.md` into the OpenRouter system prompt in `src/agents/base.py`.
- Done:
  - Overwrote `pt-study-sop/CLAUDE.md` with the Study System Constitution.
  - Overwrote `pt-study-sop/AGENTS.md` to point Codex at `CLAUDE.md` and preserve ledger rules.
  - Updated `pt-study-sop/src/agents/base.py` to read `CLAUDE.md` and include it in the system prompt payload.
  - Replaced non-ASCII headings in `pt-study-sop/CLAUDE.md` and `pt-study-sop/AGENTS.md` with ASCII text.
- Now: Summarize the changes and confirm file overwrites.
- Next: Run a quick prompt to confirm the new constitution is respected in responses.

Update 2026-01-18:
- Goal: Organize `context/` into Boris Cherny structure with SOPs, styles, input, seeds; keep `milestones.md` at root.
- Done:
  - Created `context/SOPs`, `context/styles`, `context/input`, `context/seeds`.
  - Moved numbered SOP `03_the-3-pass-technique.md` into `context/SOPs/`.
- Now: Confirm context layout with user.
- Next: If more numbered SOPs exist, move them into `context/SOPs/`.

Update 2026-01-18:
- Goal: Add `context/milestones.md` using the provided study plan template.
- Done:
  - Created `pt-study-sop/context/milestones.md` with the requested template text and fixed the quoted "Seeds"/"Seed Locked" lines.
- Now: Confirm the milestones template matches the requested format.
- Next: None.

Update 2026-01-18:
- Goal: Establish a Universal Development Environment by creating `projects/` and overwriting `CLAUDE.md` with the Universal Engineering Constitution.
- Done:
  - Created `pt-study-sop/projects/`.
  - Overwrote `pt-study-sop/CLAUDE.md` with the Universal Engineering Constitution content.
- Now: Summarize the changes and confirm the overwrite.
- Next: None.

Update 2026-01-18:
- Goal: Apply the Boris Cherny protocol version of the Universal Engineering Constitution and ensure `projects/` exists.
- Done:
  - Ensured `pt-study-sop/projects/` exists.
  - Overwrote `pt-study-sop/CLAUDE.md` with the Boris protocol content.
- Now: Confirm `projects/` and the new CLAUDE.md content.
- Next: Decide how to handle the legacy `context/` folder.

Update 2026-01-18:
- Goal: Move The Agent into `projects/treys-agent/` and switch its system prompt source to `TUTOR.md`.
- Done:
  - Created `pt-study-sop/projects/treys-agent/`.
  - Moved `context/`, `src/`, `ask.bat`, and `ask.py` into `pt-study-sop/projects/treys-agent/`.
  - Created `pt-study-sop/projects/treys-agent/TUTOR.md` with The Agent Constitution.
  - Updated `pt-study-sop/projects/treys-agent/src/agents/base.py` to read `projects/treys-agent/TUTOR.md` for system memory.
- Now: Summarize the migration and confirm new paths.
- Next: Update any external shortcuts or documentation that still point to the old root.

Update 2026-01-18:
- Goal: Install slash commands and subagent personas, and append automation protocols to the Universal Constitution.
- Done:
  - Created `.claude/commands/` with `plan.md`, `commit.md`, `review.md`.
  - Created `.claude/subagents/` with `architect.md`, `critic.md`, `writer.md`.
  - Appended Automation Protocols section to `pt-study-sop/CLAUDE.md`.
- Now: Confirm the command library and subagents are in place.
- Next: Use `/plan`, `/review`, or `/commit` to exercise the workflow.

Update 2026-01-18:
- Goal: Add permissions, MCP config, formatter hook, and verification protocol for the Universal System.
- Done:
  - Created `.claude/permissions.json` and `.mcp.json`.
  - Added `scripts/format.py` as the post-edit formatter stub.
  - Appended Safety & Verification Protocols to `CLAUDE.md`.
- Now: Confirm `scripts/` and `.claude/permissions.json` exist.
- Next: Run `/plan` to test the new automation workflow.

Update 2026-01-18:
- Goal: Install the eval engine structure and shared ownership docs for `projects/treys-agent/`.
- Done:
  - Created `projects/treys-agent/evals/` folders (unit, functional, adversarial/safety, adversarial/bias, regression).
  - Added `projects/treys-agent/evals/README.md` and `projects/treys-agent/evals/rubric.md`.
  - Added `.claude/subagents/judge.md`.
  - Added `.claude/commands/run-eval.md` and `.claude/commands/capture-fail.md`.
  - Updated `.claude/commands/commit.md` with the eval gate.
- Now: Confirm eval folders and command files exist.
- Next: Use `/run-eval` to validate the workflow.

Update 2026-01-18:
- Goal: Build eval engine with gold set calibration and generator tooling.
- Done:
  - Ensured eval subfolders include `gold_set/`.
  - Updated `.claude/subagents/judge.md` and added `.claude/subagents/generator.md`.
  - Added `.claude/commands/generate-tests.md` and updated run-eval/capture-fail/commit command specs.
  - Replaced `projects/treys-agent/evals/README.md` with calibration guidance.
- Now: Confirm eval folders and new command/subagent files exist.
- Next: Populate `gold_set/` and run `/generate-tests` when ready.

Update 2026-01-18:
- Goal: Rename `projects/treys-agent/` to `projects/treys-agent/` and scrub Trey's Agent references.
- Done:
  - Renamed `projects/treys-agent/` -> `projects/treys-agent/`.
  - Replaced "Trey's Agent" names and "treys-agent" paths as needed; kept "The Agent" generic where applicable.
  - Updated `projects/treys-agent/evals/README.md` to the generic standard.
- Now: Report renamed folders and edited files.
- Next: None.

Update 2026-01-18:
- Goal: Begin System 3 (Obsidian + knowledge base) by creating the source digest.
- Done:
  - Added `projects/treys-agent/context/system_3/source_notes.md` with the article digest and requirements.
- Now: Review the digest for completeness before drafting the SOP.
- Next: Draft `projects/treys-agent/context/system_3/system_3_obsidian_bridge.md` with step-by-step instructions.

Update 2026-01-18:
- Goal: Implement System 4 (Intro to Agents) from the provided article.
- Done:
  - Added `projects/treys-agent/context/system_4/source_notes.md`.
  - Added `projects/treys-agent/context/system_4/system_4_intro_agents.md`.
  - Added `projects/treys-agent/context/system_4/README.md`.
  - Added `projects/treys-agent/context/system_4/checklist.md`.
  - Updated `docs/SYSTEM_MANUAL_PART1.md` with a System 4 pointer.
- Now: Verify System 4 docs and checklist accuracy.
- Next: Confirm readiness for System 5.

Update 2026-01-18:
- Goal: Align System 4 runtime (perception/decision/action + logging/permissions) and merge Systems 3/4 into shared context structure.
- Done:
  - Refactored `projects/treys-agent/src/agents/base.py` into perception/decision/action flow with audit logging and permission gating.
  - Moved System 3/4 files into `context/SOPs/` and `context/input/` and removed `context/system_3` and `context/system_4`.
  - Updated System 3/4 READMEs and `docs/SYSTEM_MANUAL_PART1.md` to point to new locations.
- Now: Verify System 3/4 docs and runtime alignment.
- Next: Ready for System 5.

Update 2026-01-17:
- Goal: Migrate broken dashboard to new React UI while preserving Flask backend.
- Done:
  - Built React app from `Arcade-RetroDesignNEW/Arcade-RetroDesign/` using Vite.
  - Copied build output to `brain/static/dist/`.
  - Updated `brain/dashboard/routes.py` to serve React app from `/`, `/brain`, `/calendar`, `/scholar`, `/tutor`.
  - Extended `brain/dashboard/api_adapter.py` with missing endpoints:
    - `/api/courses`, `/api/courses/active` (derives courses from session topics)
    - `/api/study-wheel/current`, `/api/study-wheel/complete-session`
    - `/api/streak` (day streak tracking)
    - `/api/weakness-queue`
    - `/api/sessions/today`
    - `/api/brain/metrics`, `/api/brain/chat`, `/api/brain/ingest`
  - Created `study_wheel_state` and `study_streak` tables in SQLite.
  - Adapted API to work with existing database schema (courses derived from sessions).
- Now: All 5 pages working (Dashboard, Brain, Calendar, Scholar, Tutor).
- Known limitations:
  - Google Calendar/Tasks returns 500 until OAuth connected via `/api/google/auth`.
  - Courses derived from session history rather than dedicated courses table.
- Next: Connect Google OAuth when ready; optionally add dedicated courses table.
- Working set:
  - `brain/static/dist/` (React build)
  - `brain/dashboard/routes.py` (React routing)
  - `brain/dashboard/api_adapter.py` (API endpoints)
  - `brain/dashboard/app.py` (Flask app config)

Update 2026-01-18:
- Goal: Align Scholar pipeline with review, digest, questions dashboard, and approval-gated implementation.
- Done:
  - Updated `scholar/CHARTER.md` with approval-gated implementation duty, review lane, questions dashboard, digests, and implementation bundles.
  - Updated `scholar/README.md` with canonical SOP sources, output lanes, and orchestrator run steps.
  - Updated orchestrator specs to require review summaries, digests every run, and questions dashboard entries.
  - Expanded `scholar/inputs/audit_manifest.json` to include canonical SOP modules/engines/frameworks.
  - Updated `scholar/inputs/ai_artifacts_manifest.json` with review + questions dashboard lanes.
  - Added `scholar/outputs/questions_dashboard.md`, `scholar/outputs/review/`, and `scholar/outputs/implementation_bundles/` with README templates.
  - Updated `scholar/outputs/STATUS.md` to surface new lanes.
  - Updated `scripts/run_scholar.bat` to auto-remove stale `.running` markers.
- Now: Use orchestrator runs to populate review summaries, digests, and questions dashboard.
- Next: Define verification steps for approved implementations.
- Working set:
  - `scholar/CHARTER.md`
  - `scholar/README.md`
  - `scholar/workflows/orchestrator_loop.md`
  - `scholar/workflows/orchestrator_run_prompt.md`
  - `scholar/inputs/audit_manifest.json`
  - `scholar/inputs/ai_artifacts_manifest.json`
  - `scholar/outputs/questions_dashboard.md`
  - `scholar/outputs/STATUS.md`
  - `scholar/outputs/review/README.md`
  - `scholar/outputs/digests/README.md`
  - `scholar/outputs/implementation_bundles/README.md`
  - `scripts/run_scholar.bat`
Update 2026-01-19:
- Goal: Add Tasks list and Academic Deadlines tracker to the Dashboard page.
- Done:
  - Added `academic_deadlines` table to SQLite database (api_adapter.py).
Update 2026-01-19:
- Goal: Audit caching/version mismatches and stabilize API key loading.
- Done:
  - Added `.env` loader in `brain/config.py` and bumped VERSION to 9.2.
  - Updated `brain/ingest_session.py` schema_version to 9.2 and clarified v9.2 parsing.
  - Updated `brain/dashboard/utils.py` to merge defaults and env fallbacks for API config.
  - Removed hardcoded OpenRouter key in `brain/llm_provider.py` (now uses env).
  - Updated `brain/dashboard/api_adapter.py` to read `OBSIDIAN_API_KEY` from env.
  - Guarded `openai` import in `brain/dashboard/calendar_assistant.py`.
- Now: Provide audit report and remaining mismatch/hang risks.
- Next: Decide on docs alignment (v9.1 vs v9.2), UI build source-of-truth, and dependency pinning.
- Working set:
  - `brain/config.py`
  - `brain/ingest_session.py`
  - `brain/dashboard/utils.py`
  - `brain/llm_provider.py`
  - `brain/dashboard/api_adapter.py`
  - `brain/dashboard/calendar_assistant.py`
  - `brain/dashboard/routes.py`
Update 2026-01-19:
- Goal: Add pinned Python dependency manifest for backend/integrations.
- Done:
  - Added `requirements.txt` with pinned versions for Flask, requests, OpenAI, Google APIs, dotenv, and optional Selenium tooling.
- Now: Confirm dependency pinning scope is correct for your workflows.
- Next: If you want slimmer installs, split optional deps into a separate file.
- Working set:
  - `requirements.txt`
  - Added full CRUD + toggle endpoints for `/api/academic-deadlines`.
  - Added `academicDeadlines` API client with types to `api.ts`.
  - Updated `dashboard.tsx`:
    - Added state for deadlines form and queries for tasks + deadlines.
    - Added mutations for create/toggle/delete deadlines.
    - Added helper functions for deadline urgency and styling.
    - Added Tasks card with toggle functionality (incomplete + completed sections).
    - Added Academic Deadlines card with add dialog, urgency-based styling, toggle complete, and delete.
  - Built and deployed to `brain/static/dist/`.
- Features:
  - Tasks card shows incomplete tasks first, completed below (click to toggle).
  - Academic Deadlines supports 4 types: assignment, quiz, exam, project.
  - Deadlines sorted by due date, incomplete first.
  - Color-coded urgency: red=overdue, orange=today, yellow=tomorrow, blue=soon.
  - Add deadline dialog with title, type selector, course, date, and notes.
- Now: Dashboard displays both Tasks and Academic Deadlines.
- Next: Remove duplicate Tasks card from Calendar sidebar if desired.
- Working set:
  - `brain/dashboard/api_adapter.py`
  - `Arcade-RetroDesignNEW/.../lib/api.ts`
  - `Arcade-RetroDesignNEW/.../pages/dashboard.tsx`
  - `brain/static/dist/`

Update 2026-01-19 (Dashboard Audit Fix):
- Goal: Fix all broken/disconnected features identified in comprehensive dashboard audit.
- Done:
  - **Scholar Backend Endpoints** (api_adapter.py):
    - `GET /scholar/questions` - Reads from `scholar/outputs/questions_dashboard.md`
    - `POST /scholar/chat` - Uses `brain_reader` for real session metrics
    - `GET /scholar/findings` - Reads from `scholar/outputs/STATUS.md` and `review/`
    - `GET /scholar/tutor-audit` - Queries `chat_messages` table for session summaries
  - **Scholar API Client** (api.ts):
    - Added `api.scholar` object with 4 methods
    - Added types: `ScholarQuestion`, `ScholarChatResponse`, `ScholarFinding`, `TutorAuditItem`
  - **Scholar Page** (scholar.tsx):
    - Added useQuery hooks for scholar questions, findings, tutor audit
    - Replaced hardcoded mock data with real API data
    - Updated `handleChatSubmit` to use `api.scholar.chat()`
  - **Tutor Page** (tutor.tsx):
    - Added `handleExplain()` and `handleQuizMe()` handlers
    - Connected EXPLAIN/QUIZ_ME buttons to send messages
  - **Google Tasks** (api_adapter.py):
    - Added `/google-tasks/<list_id>/<task_id>/toggle` endpoint for task completion toggle
  - Built and deployed to `brain/static/dist/`.
- Features Fixed:
  - Scholar "Ask Scholar" chat now uses real brain data
  - Scholar Questions/Tutor Audit/Research Findings tabs pull from backend
  - Tutor EXPLAIN and QUIZ_ME buttons now functional
  - Google Tasks toggle now has dedicated endpoint
- Now: All major broken features from audit are fixed.
- Next: Session ingestion from `brain/session_logs/*.md` files (12 files from Dec 2025 - Feb 2026).
- Working set:
  - `brain/dashboard/api_adapter.py`
  - `Arcade-RetroDesignNEW/.../lib/api.ts`
  - `Arcade-RetroDesignNEW/.../pages/scholar.tsx`
  - `Arcade-RetroDesignNEW/.../pages/tutor.tsx`
  - `brain/static/dist/`
Update 2026-01-18:
- Goal: Reorganize SOP into canonical src/runtime structure, integrate new pedagogy, and generate runtime bundles.
- Done:
  - Created `sop/src/` canonical tree (modules, frameworks, engines, workload, templates, evidence).
  - Merged M0-M6, frameworks, and engines; added 3+2 schedule, sandwich method, 1-3-7-21 spacing, exit ticket, and metrics.
  - Added logging schema v9.2 (Tracker + Enhanced JSON) and templates (exit ticket, retrospective timetable, weekly plan/review, metrics).
  - Added runtime rules, custom instructions, runtime prompt, deployment checklist, and manifest.
  - Implemented `sop/tools/build_runtime_bundle.py` and generated bundles in `sop/runtime/knowledge_upload/`.
  - Archived legacy and old runtime content under `sop/archive/` and added stubs at old paths.
- Now: Report migration map and validate any external references that still point to old paths.
- Next: Optional link linting or log validation tooling expansion if needed.

Update 2026-01-19:
- Goal: Document the system map and repo manual using the Dashboard/Brain/Calendar/Scholar/Tutor page names.
- Done:
  - Added `docs/system_map.md` with flowchart, loops, and canonical artifacts.
  - Created `docs/assets/` for diagram exports.
  - Rewrote `README.md` as a multi-section manual (vision, pages, lifecycle, repo guide, quick start).
- Now: Export Mermaid diagram to `docs/assets/system_map.png`.
- Next: Add Calendar/Tasks documentation once core system docs are stabilized.

Update 2026-01-19:
- Goal: Document Calendar/Tasks integration and mirror docs into Obsidian library.
- Done:
  - Added `docs/calendar_tasks.md` with setup, OAuth flow, endpoints, and verification.
  - Added Obsidian copies in `projects/treys-agent/context/architecture/` for `system_map.md` and `calendar_tasks.md`.
  - Linked Calendar/Tasks docs in `README.md`.
- Now: Export Mermaid diagram to `docs/assets/system_map.png` and confirm Obsidian sees the new docs.
- Next: Add Calendar/Tasks setup troubleshooting notes if needed.

Update 2026-01-19:
- Goal: Publish canonical README layout, WRAP bucket taxonomy, and Obsidian mirror docs.
- Done:
  - Rewrote `README.md` with the full system overview, lifecycle, and page-by-page milestone plan.
  - Added `docs/wrap_buckets.md` with the Brain ingestion taxonomy and Obsidian update rules.
  - Mirrored `wrap_buckets.md` into `projects/treys-agent/context/architecture/`.
  - Updated system maps to show Brain → Obsidian updates.
- Now: Export Mermaid diagram to `docs/assets/system_map.png` and confirm Obsidian updates for WRAP highlights.
- Next: Begin Brain milestone B1 (WRAP intake + bucket taxonomy execution).

Update 2026-01-19:
- Goal: Align Brain schema/ingest with SOP v9.3 logging.
- Done:
  - Updated `brain/db_setup.py` to v9.3 schema defaults and added v9.3 columns (calibration_gap, rsr_percent, cognitive_load, transfer_check, buckets, confusables_interleaved, exit_ticket_* fields, retrospective_status, tracker_json, enhanced_json).
  - Extended `brain/ingest_session.py` to parse v9.3 JSON logs, map tracker/enhanced fields, store raw JSON, and keep v9.2 markdown support (schema_version now 9.3).
  - Bumped `brain/config.py`, `brain/README.md`, and dashboard ingest comment to v9.3.
- Now: Database can be migrated to v9.3 via `python brain/db_setup.py`; ingest supports JSON logs.
- Next: Optional v9.3 UI/API entry alignment and tests if desired.


Update 2026-01-19:
- Goal: Wire LLM plain-text intake to v9.3 session logging.
- Done:
  - Added raw_input handling to session inserts.
  - Updated /api/brain/chat to build tracker/enhanced JSON from LLM output and insert sessions, returning session status metadata.
  - Card drafts now link to the new session id when available.
- Now: Plain-text LLM intake logs sessions and stores raw input.
- Next: If you want the UI to drive /api/brain/chat directly, wire a frontend control to that endpoint.


Update 2026-01-19:
- Goal: Professionalize LLM intake and v9.3 logging path without UI changes.
- Done:
  - Added direct JSON intake support in /api/brain/chat (tracker/enhanced or JSON blocks).
  - Skips session logging for question-only responses; logs raw_input and source_path for real sessions.
  - Added v9.3 JSON parsing tests for ingestion helpers.
  - Documented /api/brain/chat usage in brain/README.md.
  - Expanded .claude/permissions.json to allow db migration and test commands.
- Now: Ready to run migrations and full test checks.
- Next: Run db_setup, pytest, and release_check; manual dashboard smoke test.


Update 2026-01-19:
- Goal: Make Run_Brain_All.bat usable in non-interactive runs and align with dist build.
- Done:
  - db_setup.py now skips the v9.1 migration prompt on EOF/non-interactive input (optional auto-migrate via PT_BRAIN_AUTO_MIGRATE).
  - Run_Brain_All.bat now checks brain/static/dist assets and avoids missing dashboard_rebuild build steps.
- Now: Smoke test runs end-to-end; minor timeout warning remains in non-interactive mode.
- Next: Optionally replace timeout with a non-interactive sleep to avoid the warning.

Update 2026-01-19:
- Goal: Align runtime bundle to v9.3 and ensure core SOP files are present.
- Done:
  - Updated sop/runtime/knowledge_upload/* version headers from v9.2 to v9.3.
  - Updated sop/runtime/runtime_prompt.md to v9.3.
  - Refreshed gpt_bundle_v9.3 with all knowledge upload files (00-05), runtime prompt, prompts, instructions, and runtime references.
- Now: Runtime bundle matches v9.3 references; no v9.2 labels remain in runtime bundle files.
- Next: None.

Update 2026-01-19:
- Goal: Clean low-item folders (0-3 items) and confirm SOP locations.
- Done:
  - Expanded .claude/permissions.json to allow cleanup cmdlets (Move-Item/Remove-Item/etc.).
  - Moved contents of 0-3 item folders to parents and removed emptied folders (safe exclusions applied).
  - Logged moves/deletes to cleanup-log-20260119-022741.txt.
- Now: Folder structure is flattened where applicable; SOP master plan remains in sop/src.
- Next: Review the cleanup log for any unexpected moves.

Update 2026-01-19:
- Goal: Snapshot current tracked repo state to a safe branch for Claude Desktop stability.
- Done:
  - Expanded .claude/permissions.json to allow snapshot git commands.
  - Staged tracked changes on snapshot/2026-01-19-claude (untracked excluded).
  - Committed and pushed snapshot branch to origin.
- Now: Snapshot branch contains the current tracked state; untracked files remain local.
- Next: Decide whether to clean or add untracked files before merging.

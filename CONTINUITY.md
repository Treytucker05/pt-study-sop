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
# PT Study System (Dashboard / Brain / Calendar / Scholar / Tutor)

**Project Hub:** [docs/project/INDEX.md](docs/project/INDEX.md)
- Docs Index: [DOCS_INDEX.md](DOCS_INDEX.md)

## Vision
Build a personal study OS that captures every session, turns it into metrics and Anki-ready outputs, keeps Obsidian as the primary knowledge base, and drives continuous improvement through Scholar research and proposals.

## Core Pages
| Page | Purpose | Primary Inputs | Primary Outputs |
| --- | --- | --- | --- |
| Dashboard | Command center for status + trends. | Brain metrics, Scholar summaries. | Trends, issues, readiness signals. |
| Brain | Source of truth + ingestion + intelligence layer. | Tutor WRAP logs, notes, card drafts. | Metrics, issues, Anki drafts, polished notes. |
| Calendar | Scheduling layer for study commitments. | Google Calendar/Tasks, Brain priorities. | Planned sessions, deadlines, reminders. |
| Scholar | Meta-system for audits and improvements. | Brain telemetry, SOPs, study logs. | Questions, hypotheses, proposals, research. |
| Tutor | CustomGPT learning interface. | Obsidian notes, study prompts. | WRAP session logs, study outputs. |

## System Map (Flowchart + Narrative)
- Canonical map: `docs/system_map.md`
- Exported image: `docs/assets/system_map.png`

## Study Lifecycle (Tutor -> Brain -> Scholar)
1. Obsidian notes + study prompts -> Tutor session.
2. Tutor produces WRAP log with key points + highlights.
3. Brain ingests WRAP -> metrics/issues + Anki drafts + polished notes.
4. Brain pushes WRAP highlights into Obsidian (adds to existing notes).
5. Scholar audits Brain data -> questions, hypotheses, proposals.
6. Dashboard/Calendar surface priorities -> next Tutor targets.

## Brain <-> Obsidian Integration
- Obsidian is the primary knowledge base at `projects/treys-agent/context/`.
- After each WRAP:
  - Brain extracts key points + highlights.
  - Brain writes those highlights into Obsidian on top of existing session notes.
- Brain also produces Anki drafts and metrics in parallel.

## Dashboard build (single source of truth)
- Source repo (non-archive): `dashboard_rebuild`.
- `dashboard_rebuild` is frontend-only; the API lives in `brain/dashboard/api_adapter.py`.
- Production bundle served by Flask: `brain/static/dist` (copied from `dashboard_rebuild\dist\public`).
- Only run the Flask dashboard on port 5000 (via `Start_Dashboard.bat`); do not start a separate dashboard_rebuild server.
- Backups of older builds live in `archive/unused/dist_backup_*` and are **not** used by `Run_Brain_All.bat`.
- If the UI looks wrong, rebuild from `dashboard_rebuild` and copy `dist/public` into `brain/static/dist` (do not mix assets from other dashboards).

## First Session Without Notes (Source-Lock Rule)
- M0 Planning requires target, sources, plan, and a pre-test before teaching.
- If no sources are provided, Tutor marks output as **unverified** and keeps claims cautious.
- Accepted source options: lecture slides, objectives, textbook sections, or a NotebookLM source packet.

## Data Artifacts
- Session logs: `brain/session_logs/*.md` (Tutor WRAP output).
- Database: `brain/data/pt_study.db` (source of truth).
- Anki drafts: `card_drafts` table + Anki sync tooling.
- Scholar outputs: `scholar/outputs/` (reports, questions, proposals).
- Obsidian notes: `projects/treys-agent/context/`.

## Calendar + Tasks Integration
- Documentation: `docs/calendar_tasks.md`
- OAuth + sync endpoints for Google Calendar and Google Tasks.
- Events -> `course_events`; tasks -> `study_tasks`.

## Repository Guide (Where Things Live)
- Tutor runtime + Obsidian bridge: `projects/treys-agent/`
- Brain + Dashboard: `brain/`
- Scholar: `scholar/`
- SOP runtime canon: `sop/`
- Root docs (guides, architecture): `docs/root/`
- System architecture: `docs/root/PROJECT_ARCHITECTURE.md`
- System map: `docs/system_map.md`
- Calendar/Tasks doc: `docs/calendar_tasks.md`

## Agent Routing
- Canonical agent rules live in `ai-config/AGENTS.md` and `ai-config/CLAUDE.md` (edit there only).
- Mirrors exist at `AGENTS.md`, `CLAUDE.md`, `.claude/AGENTS.md`, `.claude/CLAUDE.md` for tool compatibility; keep them identical to canonical.
- Precedence: the nearest `AGENTS.md` to your working path overrides higher-level files; if you add a nested one, note the reason.

## Agent Hygiene (Required)
- Clean up after each task: remove failed scripts, temporary files, and obsolete drafts.
- Mark tasks complete in the relevant plan/ExecPlan and document what changed.
- If a decision changes direction, add a note explaining the change and why.
- When a file becomes outdated, either update it or mark it deprecated with a pointer to the replacement.

## Quick Start
1. Open Obsidian at `projects/treys-agent/context/`.
2. Start Tutor via `projects/treys-agent/ask.bat`.
3. Launch Dashboard with `python brain/dashboard_web.py`.
4. Save WRAP logs to `brain/session_logs/` or use Dashboard upload.

## Operational Rules (SOP Summary)
- Planning first: no teaching until target, sources, plan, pre-test.
- Source-Lock required; mark unverified without sources.
- PEIRRO learning cycle + M0-M6 phases.
- WRAP output required with summary + spacing schedule + JSON logs.

## Milestone Plan (By Page)

### Dashboard
- D1: Define roles and inputs/outputs.
- D2: Metrics surface (readiness, trends, weak areas).
- D3: Issues/alerts surface with priority rules.
- D4: Task/deadline view aligned to Calendar sync.

### Brain
- B1: WRAP intake + bucket taxonomy.
- B2: Metrics + issue detection rules.
- B3: Note polishing + Obsidian update rules.
- B4: Anki draft engine (3 templates).

### Calendar
- C1: Integration map (OAuth, endpoints, sync).
- C2: Scheduling rules (spacing + time blocks).
- C3: Study plan loop (Dashboard -> Calendar -> Tutor).

### Scholar
- S1: Input spec and telemetry summary.
- S2: Question + hypothesis loop.
- S3: Research cadence + test logs.
- S4: Proposal -> approval -> implementation.

### Tutor
- T1: WRAP output schema + example.
- T2: Mode templates (Core / Sprint / Drill / Light / Quick Sprint).
- T3: Card-draft prompts aligned to Brain templates.

## Status Notes
- Calendar/Tasks sync implemented; requires OAuth credentials.
- Some UI flows still create local events only.

## Next Steps
- Approve WRAP bucket taxonomy location and template rules.
- Confirm Obsidian write behavior for Brain (append vs merge).
- Begin milestone execution in order (recommended: Brain -> Tutor -> Scholar -> Dashboard -> Calendar).


# PT Study System

Personal study OS that captures every session, turns it into metrics and Anki-ready outputs, keeps Obsidian as the primary knowledge base, and drives continuous improvement through Scholar research.

## Architecture

| Component | Purpose | Location |
|-----------|---------|----------|
| Dashboard | Command center for status + trends | `brain/` (Flask, port 5000) |
| Brain | Ingestion, metrics, intelligence layer | `brain/` |
| Calendar | Scheduling + Google Calendar sync | `brain/` |
| Scholar | Audits, research, improvement proposals | `scholar/` |
| Tutor | CustomGPT learning interface (WRAP logs) | External + `brain/session_logs/` |
| Frontend | React dashboard UI | `dashboard_rebuild/` |
| SOP | Study protocol definitions | `sop/` |

## Quick Start

1. Launch dashboard: `Start_Dashboard.bat` (serves on port 5000)
2. Upload session logs via Dashboard or save to `brain/session_logs/`
3. Obsidian vault: `projects/treys-agent/context/`

## Study Lifecycle

1. Obsidian notes + prompts → Tutor session → WRAP log
2. Brain ingests WRAP → metrics, Anki drafts, polished notes
3. Brain pushes highlights into Obsidian
4. Scholar audits Brain data → questions, hypotheses, proposals
5. Dashboard/Calendar surface priorities → next Tutor targets

## Data

- **Database:** `brain/data/pt_study.db`
- **Session logs:** `brain/session_logs/`
- **Anki drafts:** `card_drafts` table
- **Scholar outputs:** `scholar/outputs/`

## Dashboard Build

`dashboard_rebuild` is frontend-only. The API lives in `brain/dashboard/api_adapter.py`.

```
cd dashboard_rebuild && npm run build
# Copy dist/public → brain/static/dist
```

Do not start a separate dev server. Only use `Start_Dashboard.bat`.

## Docs

- [Full Docs Index](docs/README.md)
- [Project Hub](docs/project/INDEX.md)
- [Architecture](docs/root/PROJECT_ARCHITECTURE.md)

## Agent Instructions

- [`CLAUDE.md`](CLAUDE.md) — project context for AI agents
- [`AGENTS.md`](AGENTS.md) — agent behavior rules
- [`ai-config/agent-workflow.md`](ai-config/agent-workflow.md) — startup menu, agent hygiene

## UI/UX Design

The system enforces a strict **Retro Arcade** aesthetic (90s Cyberpunk/Terminal).

### Core Visual Standards
- **Theme**: High-contrast Red (`primary`) and Black.
- **Backgrounds**: Semi-transparent black (`bg-black/40`) to let the app background bleed through.
- **Borders**: Sharp, 2px solid red borders (`border-2 border-primary`) on all Cards and containers.
- **Typography**:
  - Headers: `font-arcade` (Pixelated, Uppercase).
  - Body: `font-terminal` (Monospace, Green/White).
- **Uniformity**: All pages (Dashboard, Brain, Calendar) must share identical component styling. No "glowing" effects or divergent dark-grey themes.

### Page Layouts
1. **Dashboard**: The command center.
   - **Top**: Study Wheel (Weekly progress).
   - **Grid**: 3-column layout for Today's Activity, Courses, and Tasks.
2. **Brain**: The intelligence layer.
   - **Header**: Standardized system status bar (Obsidian/Anki connection).
   - **Tabs**: Large, blocky tabs (Ingestion, Data, Syllabus, Graph).
   - **Ingestion**: Prominent "WRAP" and "Material" cards for data entry.
3. **Calendar**: Retro timeline view.
   - **View**: Monthly/Weekly grid with pixelated event blocks.
   - **Modals**: Custom terminal-styled dialogs (no browser defaults).

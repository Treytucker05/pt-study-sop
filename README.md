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

## Dashboard Build & Deploy

The frontend (`dashboard_rebuild/`) is a React/Vite app that compiles to static files. The Flask server (`brain/`) serves these from `brain/static/dist/`. There is no dev server — all changes require a build + copy.

### Why build?

The browser loads pre-built JS/CSS from `brain/static/dist/`. Editing `.tsx` files has **zero effect** until you build and copy. If you don't see your changes, you forgot this step.

### Steps

```bash
# 1. Build (from project root)
cd dashboard_rebuild && npm run build

# 2. Copy output to Flask static dir
cp -r dist/public/. ../brain/static/dist/

# 3. Restart Flask if it's running (or just hard-refresh browser)
```

`Start_Dashboard.bat` does step 2 automatically on launch, but **not** step 1. If you changed frontend code, always run `npm run build` first.

### Common issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Changes not visible in browser | Forgot to build or copy | Run steps 1-2 above |
| Old JS still loading | Browser cache | Hard refresh (Ctrl+Shift+R) |
| Build fails with type errors | Check `npx tsc --noEmit` | Fix TS errors in your changed files |
| `Start_Dashboard.bat` warns "build not found" | Never ran `npm run build` | Run step 1 |

### Do NOT

- Start a separate Vite dev server (`npm run dev`) — the Flask backend won't proxy to it
- Edit files in `brain/static/dist/` directly — they get overwritten on next build

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

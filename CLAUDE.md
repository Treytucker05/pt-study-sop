# PT Study System

Personal study OS: captures sessions, generates Anki cards, drives improvement via Scholar research. Flask dashboard on port 5000, Obsidian as primary knowledge base.

## Commands

- **Start dashboard:** `Start_Dashboard.bat`
- **Run tests:** `pytest brain/tests/`
- **Build frontend:** `cd dashboard_rebuild && npm run build`
- **Copy build:** copy `dashboard_rebuild/dist/public` → `brain/static/dist`

## Key Paths

- Database: `brain/data/pt_study.db`
- Session logs: `brain/session_logs/`
- API: `brain/dashboard/api_adapter.py`
- Frontend source: `dashboard_rebuild/`
- SOP canon: `sop/`
- Scholar outputs: `scholar/outputs/`
- Docs index: `DOCS_INDEX.md`

## Rules

1. Planning first — never start coding immediately.
2. `dashboard_rebuild` is frontend-only; API lives in `brain/`.
3. Only serve the Flask dashboard on port 5000 via `Start_Dashboard.bat`.
4. After frontend changes: rebuild and copy dist to `brain/static/dist`.
5. Check `permissions.json` before executing new shell commands.
6. Update `CONTINUITY.md` after every significant change (append only).

## Detailed Guidelines

- [Agent Workflow](ai-config/agent-workflow.md)

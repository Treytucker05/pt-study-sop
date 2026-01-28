# PT Study System (Trey)

Owner: Trey.

Personal study OS that captures sessions, produces metrics and Anki-ready outputs, keeps Obsidian as the primary knowledge base, and drives improvement via Scholar research. Flask dashboard on port 5000.

Response style: straight to the point, no fluff.

## Environment
- Repo root: C:\pt-study-sop
- Shell: PowerShell
- Obsidian vault: C:\Users\treyt\Desktop\PT School Semester 2

## Git Identity
- Name: TreyT
- Email: Treytucker05@yahoo.com

## Core Commands
- Start dashboard: Start_Dashboard.bat
- Run tests: pytest brain/tests/
- Build frontend: cd dashboard_rebuild && npm run build (preferred PM: npm)
- Copy build: copy dashboard_rebuild/dist/public -> brain/static/dist

## Key Paths
- Database: brain/data/pt_study.db
- Session logs: brain/session_logs/
- API: brain/dashboard/api_adapter.py
- Frontend source: dashboard_rebuild/
- Frontend build output: brain/static/dist/
- SOP canon: sop/
- Scholar outputs: scholar/outputs/
- Docs index: docs/README.md (DOCS_INDEX.md also exists)
- Architecture doc: docs/root/PROJECT_ARCHITECTURE.md
- SOP manifest: sop/sop_index.v1.json

## System Modules
- Dashboard, Brain, Calendar (Flask): brain/
- Frontend UI: dashboard_rebuild/
- Scholar research: scholar/
- SOP definitions: sop/
- Tutor logs: brain/session_logs/ (Tutor itself is external)

## UI/UX (Retro Arcade)
- Theme: high-contrast red and black, no glow, consistent across pages.
- Typography: font-arcade headers, font-terminal body.
- Components: 2px solid red borders; semi-transparent black backgrounds.

## Rules
1. Plan before coding for any non-trivial change.
2. dashboard_rebuild is frontend-only; API lives in brain/.
3. Only serve the dashboard via Start_Dashboard.bat on port 5000. Do not run a separate dev server.
4. After frontend changes: rebuild and copy dist/public -> brain/static/dist.
5. Check permissions.json before executing new shell commands.
6. Update CONTINUITY.md after every significant change (append only).
7. Push to remote after every change (auto).
8. After code changes, run relevant checks by default (pytest brain/tests/; frontend build already required).

## Detailed Guidelines
- Agent Workflow: ai-config/agent-workflow.md

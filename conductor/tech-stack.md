# Tech Stack

## Overview
This document outlines the core technologies and frameworks used in the PT Study OS project.

## Programming Languages
- **Python**: Backend logic, data processing, and API (Flask).
- **TypeScript/JavaScript**: Frontend development, including the React-based dashboard.

## Frontend Technologies
- **Framework:** React (via Vite for building)
- **UI Libraries:** Shadcn/ui (Radix UI primitives), Tailwind CSS
- **State Management/Data Fetching:** TanStack Query
- **Routing:** Wouter
- **Drag and Drop:** Dnd Kit
- **Form Management:** React Hook Form
- **Animation:** Framer Motion

## Backend Technologies
- **Framework:** Flask (Python)
- **Database Access:** Raw `sqlite3` Python module with parameterized queries (no ORM)
- **Templating:** Jinja2 (minimal usage; most UI is React)

## Database
- **Database:** SQLite (`brain/data/pt_study.db`) — sole database, no secondary DB

## Build & Deployment
- **Frontend Build:** `npm run build` in `dashboard_rebuild/`, output copied to `brain/static/dist/`
- **Serving:** Flask serves the built React app as static files on port 5000
- **No dev server:** The app is never served via `npm run dev` or `vite dev`

## Development Tools & Ecosystem
- **Version Control:** Git
- **Package Managers:** npm (frontend), pip (Python backend)
- **Build Tool:** Vite (frontend)
- **Code Editors:** Claude Code, Codex CLI
- **Knowledge Management:** Obsidian, Anki

## External Integrations
- **Google Calendar/Tasks API:** OAuth-based calendar and task management
- **OpenAI API:** LLM interactions for Scholar and study processing
- **AnkiConnect:** Syncs card drafts to Anki Desktop
- **Obsidian REST API:** Vault integration for note management

## Architecture Style
The project follows a **Monorepo** structure, housing both the Python Flask backend (`brain/`) and the React frontend (`dashboard_rebuild/`) within the same repository. Flask serves the built frontend from `brain/static/dist/`. There is no separate API server or Express layer.

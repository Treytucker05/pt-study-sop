# Tech Stack

## Overview
Core technologies and frameworks used in PT Study OS.

## Programming Languages
- **Python 3.10+**: Backend logic, API, data processing (Flask)
- **TypeScript 5.6**: Frontend (React SPA)

## Frontend
- **Framework:** React 19 (via Vite 7)
- **UI Libraries:** Shadcn/ui (Radix UI primitives), Tailwind CSS 4
- **State/Data:** TanStack Query 5
- **Routing:** Wouter
- **Drag and Drop:** Dnd Kit
- **Forms:** React Hook Form
- **Animation:** Framer Motion
- **Theme:** Retro arcade (high-contrast red/black, font-arcade headers, font-terminal body)

## Backend
- **Framework:** Flask (Python)
- **Database:** Raw `sqlite3` with parameterized queries (no ORM)
- **Tutor API:** `brain/dashboard/api_tutor.py` (~7200 lines, 40+ endpoints)
- **SSE Streaming:** Server-Sent Events for chat response streaming

## AI / ML
- **LLM Provider:** OpenAI API (gpt-5.3-codex for tutor, gpt-5.3-codex-spark for lite mode)
- **Embeddings:** OpenAI text-embedding-3-small
- **Vector Store:** ChromaDB (persisted at `brain/data/chroma_tutor/materials/`)
- **RAG Pipeline:** Similarity + MMR retrieval with material_ids scoping
- **Prompt Assembly:** 15-section system prompt builder (`brain/tutor_prompt_builder.py`)

## Database
- **Primary:** SQLite (`brain/data/pt_study.db`) — sole database
- **Vector:** ChromaDB (`brain/data/chroma_tutor/`) — embedding store
- **Tables:** 25+ total, 16 tutor-specific (tutor_sessions, tutor_turns, method_blocks, rag_docs, error_logs, etc.)

## Vault Integration
- **Obsidian CLI:** Local command-line interface via `obsidian_vault.py`
- **Retry/Backoff:** 3 attempts, 1s/2s backoff, 30s availability cache
- **Templates:** 5 block artifact templates (`sop/templates/notes/`)
- **Write Mode:** Fire-and-forget (never blocks chain progression)

## Build and Deployment
- **Frontend Build:** `npm run build` in `dashboard_rebuild/` — outputs directly to `brain/static/dist/`
- **Serving:** Flask serves the built React app as static files on port 5000
- **Launch:** `Start_Dashboard.bat` (builds frontend + starts Flask + opens browser)
- **No dev server:** Never use `npm run dev` or `vite dev`

## Development Tools
- **Version Control:** Git
- **Package Managers:** npm (frontend), pip (Python backend)
- **Build Tool:** Vite (frontend)
- **Code Editors:** Claude Code, Codex CLI
- **Knowledge Management:** Obsidian, Anki
- **Testing:** pytest (916+ tests)

## External Integrations
- **OpenAI API:** LLM + embeddings for tutor and Scholar
- **Google Calendar/Tasks API:** OAuth-based two-way sync
- **AnkiConnect:** Sync card_drafts to Anki Desktop (port 8765)
- **Obsidian CLI:** Vault read/write via local CLI (retry + cache)
- **ChromaDB:** Persisted vector store for RAG retrieval

## Architecture Style
Monorepo: Python Flask backend (`brain/`) + React frontend (`dashboard_rebuild/`) in the same repository. Flask serves the built frontend from `brain/static/dist/`. No separate API server or Express layer. Native tutor built into Flask (not an external Custom GPT).

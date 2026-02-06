# Tech Stack

## Overview
This document outlines the core technologies and frameworks used in the PT Study OS project.

## Programming Languages
- **Python**: Primarily used for the backend logic, data processing, and API (Flask).
- **TypeScript/JavaScript**: Used for the frontend development, including the React-based dashboard.

## Frontend Technologies
- **Framework:** React (via Vite for building)
- **UI Libraries:** Radix UI, Tailwind CSS, Shadcn/ui (implied by Radix usage and common patterns)
- **State Management/Data Fetching:** TanStack Query
- **Routing:** Wouter
- **Drag and Drop:** Dnd Kit
- **Form Management:** React Hook Form
- **Animation:** Framer Motion

## Backend Technologies
- **Framework:** Flask (Python)
- **Database ORM:** Drizzle ORM (used for database interactions and schema definition)
- **API Communication:** Express.js (potentially used for some aspects of the frontend build pipeline or as a local dev server intermediary)

## Database
- **Primary Database:** SQLite (`pt_study.db`)
- **Potential (Secondary) Database:** PostgreSQL (indicated by `pg` dependency, possibly for future scaling or specific integrations)

## Development Tools & Ecosystem
- **Version Control:** Git
- **Package Managers:** npm (for frontend), pip (for Python backend)
- **Build Tool:** Vite (for frontend)
- **Environment Management:** Python virtual environments
- **Code Editors:** Codex CLI / Claude Code (as per `CLAUDE.md`)
- **Knowledge Management:** Obsidian, Anki
- **External Integrations:** Google Calendar/Tasks API, OpenAI API (for LLM interactions)

## Architecture Style
The project follows a **Monorepo** structure, housing both the Python Flask backend (`brain/`) and the React frontend (`dashboard_rebuild/`) within the same repository. This setup facilitates cohesive development and deployment of tightly coupled components.

## Key Observations
- The `CLAUDE.md` file indicates a clear separation of concerns between the frontend (`dashboard_rebuild/`) and backend (`brain/`).
- The use of Drizzle ORM for both frontend and backend dependencies suggests a type-safe approach to database interactions.
- Extensive use of AI tools for content ingestion, processing, and management is a core aspect of the system.
- The project emphasizes a structured study approach, integrating various tools for learning and personal development.

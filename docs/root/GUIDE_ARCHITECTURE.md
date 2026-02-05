# PT Study System — Architecture Spec

## Purpose
A high-level architecture guide describing subsystems, integrations, and data flow.

## Core Pages
- **Tutor:** CustomGPT session runner (SOP M0–M6) → WRAP output.
- **Brain:** Source of truth DB + ingestion + metrics + Obsidian updates.
- **Dashboard:** UI surfaces metrics, issues, tasks, and trends.
- **Calendar:** Syncs Google Calendar/Tasks into Brain.
- **Scholar:** Audits logs, detects friction, proposes improvements.

## System Flow (Canonical)
See `docs/system_map.md` for the diagram and loop definitions.

## Subsystems
- **SOP Runtime:** `sop/library/` (canonical) and `sop/runtime/` (generated bundle)
- **Brain DB + APIs:** `brain/` and `brain/dashboard/`
- **Scholar Workflows:** `scholar/workflows/`
- **Obsidian Vault:** `C:\Users\treyt\Desktop\PT School Semester 2` (notes under `projects/pt-study-sop/`)

## Key Data Stores
- `brain/data/pt_study.db` (source of truth)
- `brain/session_logs/` (WRAP logs)
- `scholar/outputs/` (research + proposals)

## Integration Points
- Calendar + Tasks: `brain/dashboard/gcal.py`, documented in `docs/calendar_tasks.md`.
- Anki sync: `brain/anki_sync.py`.
- Obsidian writes: defined in `docs/contracts/obsidian_write_semantics.md`.

## Cold Start Behavior
- System must operate with zero courses/exams/notes.
- WRAP logs can create Course/Topic entities on first run.

## Architecture Invariants
- Brain is the only system that writes to the DB.
- Scholar never writes directly to Brain except through proposals.
- Obsidian writes are idempotent and append‑only by default.

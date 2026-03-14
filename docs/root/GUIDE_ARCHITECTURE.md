# PT Study System — Architecture Guide

Reference-only architecture guide.

- Product/page ownership authority: `docs/root/TUTOR_STUDY_BUDDY_CANON.md`
- Canonical runtime architecture: `sop/library/17-control-plane.md`

## Purpose

Describe subsystems, integrations, and data flow without redefining product ownership.

## Core Public Surfaces

- **Brain:** home/dashboard and learner-model engine
- **Tutor:** live study workspace and protocol executor
- **Scholar:** system-facing investigation console
- **Support pages:** Calendar, Library, Mastery, Methods, Vault Health

## System Flow (Canonical)
See `docs/TUTOR_ARCHITECTURE.md` for the diagram and loop definitions.

## Subsystems
- **SOP Runtime:** `sop/library/` (canonical) and `sop/runtime/` (generated bundle)
- **Brain DB + APIs:** `brain/` and `brain/dashboard/`
- **Scholar Workflows:** `scholar/workflows/`
- **Obsidian Vault:** `C:\Users\treyt\Desktop\Treys School` (notes under `projects/pt-study-sop/`)

## Key Data Stores
- `brain/data/pt_study.db` (operational data store)
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

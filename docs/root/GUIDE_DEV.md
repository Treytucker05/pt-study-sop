# PT Study System — Developer Guide

## Overview
This guide covers how to run the stack, update docs, and extend the system safely.

## Stack
- Backend: Python + Flask (Brain/Dashboard)
- DB: SQLite (`brain/data/pt_study.db`)
- Frontend: React build served from `brain/static/dist/`
- Knowledge base: Obsidian vault at `C:\Users\treyt\Desktop\Treys School` (notes under `projects/pt-study-sop/`)

## Run Locally
1. Install Python deps (first time): `python -m pip install -r requirements.txt`
2. Launch dashboard: `Start_Dashboard.bat`
3. Open: `http://127.0.0.1:5000`

## Frontend Build (Required For UI Changes)
The Flask app serves the built frontend from `brain/static/dist/`. Vite is configured to output directly to this folder.

If you change anything under `dashboard_rebuild/`, you must:
1. Install frontend deps (first time): `cd dashboard_rebuild; npm install`
2. Build the frontend: `cd dashboard_rebuild; npm run build`

> **Note:** No copy/sync step needed - Vite outputs directly to `brain/static/dist/`.
> Legacy reference: `dashboard_rebuild/dist/public` is no longer the active output path.

Do NOT run `npm run dev` / `vite dev`. Always use `Start_Dashboard.bat` (port 5000).

Skip this section only for backend-only changes under `brain/`.

## Configuration
- Calendar/Tasks: `brain/data/api_config.json`
- OAuth tokens: `brain/data/gcal_token.json`
- System rules: `sop/library/` (canonical)

## Contracts (Do Not Drift)
- WRAP schema: `docs/contracts/wrap_schema.md`
- IDs: `docs/contracts/ids.md`
- Metrics + issues: `docs/contracts/metrics_issues.md`
- Card drafts: `docs/contracts/card_draft_schema.md`
- Obsidian write semantics: `docs/contracts/obsidian_write_semantics.md`

## Data Flow (Developer Summary)
- Tutor WRAP logs → `brain/session_logs/`
- Brain ingestion → `brain/data/pt_study.db`
- Dashboard reads metrics via API
- Scholar reads DB + SOP, writes to `scholar/outputs/`

## Adaptive Mastery System (`brain/adaptive/`)

The adaptive mastery subsystem lives in `brain/adaptive/` with its own test suite. Key modules:
- `bkt.py` — Bayesian Knowledge Tracing with forgetting-curve decay
- `telemetry.py` — Practice event capture (attempts, hints, evaluations)
- `curriculum.py` — Concept-map curriculum gating (Locked/Available/Mastered)
- `knowledge_graph.py` — Graph RAG-lite with typed relation extraction + PCST pruning
- `metrics.py` — Per-skill mastery trajectory, hint dependence, error recurrence
- `session_config.py` — Experiment toggles (threshold, RAG mode, fading, pruning)

API blueprint: `brain/dashboard/api_mastery.py` (registered at `/api/mastery/*`).

See `docs/root/PROJECT_ARCHITECTURE.md` § 4.2 for full module map and endpoint list.

## Testing
- All tests: `pytest brain/tests/`
- Adaptive only: `pytest brain/tests/test_adaptive_*.py brain/tests/test_measurement_loop.py brain/tests/test_regression_safety.py`
- Release check: `python scripts/release_check.py`

## Docs Discipline
- User Guide: `docs/root/GUIDE_USER.md`
- Developer Guide: `docs/root/GUIDE_DEV.md`
- Architecture Spec: `docs/root/GUIDE_ARCHITECTURE.md`
- Index: `docs/README.md` (`DOCS_INDEX.md` is legacy)

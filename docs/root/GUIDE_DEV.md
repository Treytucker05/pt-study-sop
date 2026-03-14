# PT Study System — Developer Guide

Reference-only run/build/test guide.

- Top-level repo truth: `README.md`

## Overview
This guide covers how to run the stack, update docs, and extend the system safely.

## Stack
- Backend: Python + Flask (Brain + app shell APIs)
- DB: SQLite (`brain/data/pt_study.db`)
- Frontend: React build served from `brain/static/dist/`
- Knowledge base: Obsidian vault at `C:\Users\treyt\Desktop\Treys School` (notes under `projects/pt-study-sop/`)

## Run Locally
1. Install Python deps (first time): `python -m pip install -r brain/requirements.txt`
2. Launch dashboard: `Start_Dashboard.bat`
3. Open: `http://127.0.0.1:5000`

## Live Tutor Smoke
Use this when validating the real Tutor session path against the local dashboard.

1. Start the app with `Start_Dashboard.bat`.
2. Run `python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000`.
3. Do the thin browser smoke:
   - `/tutor`: verify the Tutor shell loads, the Tutor start/resume panel is reachable when no active session is restored, Studio workspace controls render (`NOTES`, `CANVAS`, `GRAPH`, `TABLE`), and the selected material viewer appears without getting stuck on `Loading...`.
   - `/methods`: verify the Method Library loads, the `LIBRARY` / `CHAINS` / `ANALYTICS` controls render, and method cards populate without getting stuck on `Loading...`.

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
- Tutor embeddings default to Gemini Embedding 2 preview via `GEMINI_API_KEY`, `TUTOR_RAG_EMBEDDING_PROVIDER=gemini`, and `TUTOR_RAG_GEMINI_EMBEDDING_MODEL=gemini-embedding-2-preview`

## Harness Commands
Use the repo-local harness commands to validate prerequisites, launch isolated app instances, and run fixture-backed harness scenarios.

Examples below use `powershell`; `pwsh` also works if installed.

- Hermetic bootstrap:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Bootstrap -Profile Hermetic -Json`
- Live bootstrap:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Bootstrap -Profile Live -Json`
- Hermetic run:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Run -Profile Hermetic -Port 5127 -DataRoot $env:TEMP\pt-harness-data -ArtifactRoot $env:TEMP\pt-harness-artifacts -NoBrowser -SkipUiBuild`
- First hermetic Tutor scenario:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Eval -Scenario tutor-hermetic-smoke -ArtifactRoot $env:TEMP\pt-harness-artifacts -Json`
- Second hermetic Tutor scenario:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Eval -Scenario tutor-hermetic-coverage-scope -ArtifactRoot $env:TEMP\pt-harness-artifacts -Json`
- Artifact bundle report:
  - `$run = Get-Content -Raw "$env:TEMP\pt-harness-artifacts\run.json" | ConvertFrom-Json`
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Report -RunId $run.run_id -ArtifactRoot $env:TEMP\pt-harness-artifacts -Json`

Current validator checks:
- Python and Node/npm availability
- `brain/.env.example`
- `dashboard_rebuild/.env.example`
- `brain/.env` for `Live`
- `brain/tests/fixtures/harness/manifest.json` for `Hermetic`

Hermetic Tutor scenario notes:
- `tutor-hermetic-smoke` seeds an isolated course + material set directly into the harness DB, then exercises Tutor materials, session create, two provider-free turn shortcuts, restore, summary, end, and delete over HTTP.
- `tutor-hermetic-coverage-scope` seeds a wider isolated course library but narrows Tutor to one selected file with the `coverage` accuracy profile, then verifies the scoped retrieval path over HTTP.
- Hermetic runs disable Obsidian note/vault retrieval through `PT_HARNESS_DISABLE_VAULT_CONTEXT=1`, so the scenario does not depend on vault state or provider credentials.
- `Report` emits `bundle.json` with git metadata, command records, scenario artifacts, and a redacted environment summary. The bundle path is stable across `powershell` and `pwsh`.

## Contracts (Do Not Drift)
- WRAP schema: `docs/contracts/wrap_schema.md`
- IDs: `docs/contracts/ids.md`
- Metrics + issues: `docs/contracts/metrics_issues.md`
- Card drafts: `docs/contracts/card_draft_schema.md`
- Obsidian write semantics: `docs/contracts/obsidian_write_semantics.md`

## Data Flow (Developer Summary)
- Tutor WRAP logs → `brain/session_logs/`
- Brain ingestion → `brain/data/pt_study.db`
- Brain/app shell reads metrics via API
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
- Developer Guide: `docs/root/GUIDE_DEV.md`
- Runtime architecture: `docs/root/PROJECT_ARCHITECTURE.md`
- Index: `docs/README.md` (`DOCS_INDEX.md` is legacy)

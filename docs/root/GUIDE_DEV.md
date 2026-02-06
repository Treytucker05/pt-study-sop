# PT Study System — Developer Guide

## Overview
This guide covers how to run the stack, update docs, and extend the system safely.

## Stack
- Backend: Python + Flask (Brain/Dashboard)
- DB: SQLite (`brain/data/pt_study.db`)
- Frontend: React build served from `brain/static/dist/`
- Knowledge base: Obsidian vault at `C:\Users\treyt\Desktop\PT School Semester 2` (notes under `projects/pt-study-sop/`)

## Run Locally
1. Install Python deps: `pip install -r requirements.txt`
2. Launch dashboard: `Start_Dashboard.bat`
3. Open: `http://127.0.0.1:5000`

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

## Testing
- Targeted: `python -m pytest brain/tests`
- Release check: `python scripts/release_check.py`

## Docs Discipline
- User Guide: `docs/root/GUIDE_USER.md`
- Developer Guide: `docs/root/GUIDE_DEV.md`
- Architecture Spec: `docs/root/GUIDE_ARCHITECTURE.md`
- Index: `docs/README.md` (`DOCS_INDEX.md` is legacy)

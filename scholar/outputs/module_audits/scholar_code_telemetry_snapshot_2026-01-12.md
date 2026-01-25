# Scholar Code Audit - telemetry_snapshot.py (2026-01-12)

## Purpose
- See module docstring for intent.

## Inputs
- Code-level inputs derived from file paths and runtime config; see `C:/Users/treyt/OneDrive/Desktop/pt-study-sop/scholar/telemetry_snapshot.py`.

## Outputs
- Writes outputs under `scholar/outputs/` when invoked (if applicable).

## Key Functions
- `_repo_root()`
- `_db_path()`
- `_table_exists()`
- `_scalar()`
- `_safe_parse_json()`
- `_count_terms()`
- `build_snapshot()`
- `main()`

## Dependencies
- `sqlite3`
- `Path`
- `json`
- `datetime`
- `brain`
- `pt_study.db`

## Risks
- Read-only expectations must be preserved; handle missing DB/files gracefully.

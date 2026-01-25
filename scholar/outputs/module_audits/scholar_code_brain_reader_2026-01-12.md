# Scholar Code Audit - brain_reader.py (2026-01-12)

## Purpose
- See module docstring for intent.

## Inputs
- Code-level inputs derived from file paths and runtime config; see `C:/Users/treyt/OneDrive/Desktop/pt-study-sop/scholar/brain_reader.py`.

## Outputs
- Writes outputs under `scholar/outputs/` when invoked (if applicable).

## Key Functions
- `get_db_path()`
- `_get_connection()`
- `_rows_to_dicts()`
- `_table_exists()`
- `_date_n_days_ago()`
- `from_row()`
- `get_recent_sessions()`
- `get_all_sessions()`
- `get_session_by_id()`
- `get_sessions_in_range()`
- `get_sessions_by_mode()`
- `get_low_understanding_sessions()`
- `get_sessions_without_wrap()`
- `get_recent_tutor_turns()`
- `get_turns_for_session()`
- `get_unverified_answers()`
- `_safe_parse_json()`
- `calculate_session_metrics()`
- `get_audit_summary()`
- `get_session_count()`
- `get_study_mode_distribution()`
- `get_average_metrics()`

## Dependencies
- `sqlite3`
- `Path`
- `json`
- `datetime`
- `brain`
- `pt_study.db`

## Risks
- Read-only expectations must be preserved; handle missing DB/files gracefully.

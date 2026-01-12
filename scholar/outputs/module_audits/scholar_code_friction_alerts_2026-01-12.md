# Scholar Code Audit - friction_alerts.py (2026-01-12)

## Purpose
- See module docstring for intent.

## Inputs
- Code-level inputs derived from file paths and runtime config; see `C:/Users/treyt/OneDrive/Desktop/pt-study-sop/scholar/friction_alerts.py`.

## Outputs
- Writes outputs under `scholar/outputs/` when invoked (if applicable).

## Key Functions
- `__post_init__()`
- `to_dict()`
- `check_unverified_ratio()`
- `check_low_citations()`
- `check_session_duration()`
- `check_understanding_level()`
- `check_no_wrap_phase()`
- `check_source_drift()`
- `check_repeated_topic_struggle()`
- `generate_alerts()`
- `get_alert_summary()`
- `print_alerts()`
- `main()`

## Dependencies
- `json`
- `datetime`
- `brain`

## Risks
- Read-only expectations must be preserved; handle missing DB/files gracefully.

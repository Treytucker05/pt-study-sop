
# Brain Dashboard Package

This directory contains the modularized Flask application for the PT Study Brain Dashboard.
System context: the tutor/session model is CP-MSS v1.0 (`PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`).

## Structure

- `__init__.py`: Package initialization.
- `app.py`: Flask application factory.
- `routes.py`: Flask Blueprint validation and route definitions.
- `stats.py`: Dashboard statistics and analytics logic.
- `scholar.py`: Scholar integration (orchestrator, questions, API).
- `syllabus.py`: Syllabus and Course Event management logic.
- `calendar.py`: Calendar data aggregation logic.
- `utils.py`: Utility functions and configuration helpers.
- `cli.py`: CLI tools (formerly `dashboard.py`).

## Usage

The application is run via the entry point `dashboard_web.py` in the `brain/` root directory:

```bash
python dashboard_web.py
```

Or via the `Start_Dashboard.bat` launcher.

Repo canonical run path: use `Start_Dashboard.bat` (port 5000).

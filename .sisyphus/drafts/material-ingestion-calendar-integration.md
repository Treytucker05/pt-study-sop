# Draft: Material Ingestion + Calendar/GTasks Integration

## Requirements (confirmed)
- Dashboard needs to work smoothly
- Material ingestion flow needs improvement
- Calendar integration required
- Google Tasks integration required

## Current State (from research)
- Material ingestion protocol exists: `sop/src/05_MATERIAL_INGESTION.md` (15-min timebox, manual process)
- Syllabus import: `brain/import_syllabus.py` (JSON-based, course events)
- Calendar sync: OAuth + endpoints exist for Google Calendar (`/api/gcal/*`)
- GTasks sync: `/api/gtasks/sync` endpoint exists
- IngestionTab.tsx: Frontend UI for syllabus/WRAP ingestion
- No automated link between material ingestion and calendar/tasks

## Technical Decisions
- TBD

## Research Findings
- Calendar CLI exists: `brain/calendar_cli.py` (add/clear events)
- Google Calendar two-way sync implemented (Primary + PT School calendars)
- `course_events` table stores syllabus events (lectures, readings, quizzes, exams)
- `study_tasks` table exists for scheduled study tasks
- Current gap: No workflow to turn ingested materials into calendar events or tasks

## Open Questions
1. What does "working smoothly" mean? (Current pain points?)
2. Material ingestion: What types of materials? (Syllabus, lecture notes, textbooks?)
3. Calendar: What should appear on calendar? (Study sessions, exams, assignments?)
4. GTasks: What task structure? (Per-module, per-topic, per-LO?)
5. Automation level: Manual paste, file upload, or auto-sync?

## Scope Boundaries
- INCLUDE: TBD
- EXCLUDE: TBD

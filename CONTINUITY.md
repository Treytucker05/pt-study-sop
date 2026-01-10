Goal (incl. success criteria):
- Enhance Syllabus page with professional UI features.
- Success criteria:
  1. Color-coded classes (each course has a distinct color).
  2. User can change/pick course colors via UI.
  3. Events can be marked complete/pending via checkboxes.
  4. Calendar integrates with M6-wrap spacing logic for study planning.
  5. Professional, polished UI design.

Constraints/Assumptions:
- Keep existing schema additive (add color column to courses).
- course_events.status already exists (pending/completed/cancelled).
- M6-wrap defines spacing: 24h -> 3 days -> 7 days -> successive relearning.
- Use ASCII and minimal diffs.
- Follow existing code patterns in routes.py and dashboard.js.

Key decisions:
- Add `color` column to courses table (hex string, nullable).
- Create default color palette for auto-assignment.
- Add PATCH /api/syllabus/course/<id>/color endpoint.
- Add PATCH /api/syllabus/event/<id>/status endpoint.
- Connect calendar to study_tasks for M6-based scheduling.

State:
  - Done:
    - Analyzed current syllabus.py, routes.py, dashboard.js.
    - Reviewed db_setup.py schema (courses, course_events, study_tasks).
    - Reviewed M6-wrap for spacing intervals.
    - Added color column migration to courses table in db_setup.py.
    - Updated fetch_all_courses_and_events to include color field.
    - Added PATCH /api/syllabus/course/<id>/color endpoint.
    - Added PATCH /api/syllabus/event/<id>/status endpoint.
    - Added POST /api/syllabus/event/<id>/schedule_reviews endpoint (M6 spacing).
    - Added GET /api/syllabus/colors/palette endpoint.
    - Updated renderSyllabusList with checkboxes, color badges, type icons, M6 button.
    - Updated calendar rendering to use course colors.
    - Added Course Color Manager UI section.
    - Added CSS for color manager, hover effects, course badges.
    - Updated loadSyllabusDashboard to populate color manager.
  - Now:
    - Ready for testing.
  - Next:
    - Test the dashboard and verify all features work.
    - Optional: Add Google Calendar integration for syncing.

Open questions (UNCONFIRMED if needed):
- None currently.

Working set (files/ids/commands):
- brain/db_setup.py (add color column)
- brain/dashboard/routes.py (add PATCH endpoints)
- brain/static/js/dashboard.js (UI updates)
- brain/templates/dashboard.html (UI updates)
- brain/static/css/dashboard.css (styling)
- sop/gpt-knowledge/M6-wrap.md (spacing intervals)

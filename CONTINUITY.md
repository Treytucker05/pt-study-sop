Goal (incl. success criteria):
- Implement 5-part Dashboard Enhancement: (1) fix duplicate course, (2) improve extraction prompt, (3) add week/day calendar views, (4) Google Calendar sync with login button, (5) UI redesign with medical color scheme.
- Success: All 5 features working, no regressions, tests pass.

Constraints/Assumptions:
- Follow AGENTS.md; update this Continuity Ledger each turn and on state changes.
- Use parallel agents where no dependencies exist.
- GCal uses OAuth2 with login button flow.
- Calendar views: Month (existing) + Week + Day (new).

Key decisions:
- Parallel execution: Agents 1, 2, 5 run simultaneously (no dependencies).
- Agents 3, 4 run after Agent 1 completes (need schema migration).
- Agent 6 runs last for integration testing.
- Calendar: Implement week/day views as new options (not 2months/3months).
- GCal: Login button triggers OAuth popup flow.

State:
  - Done:
    - Research phase complete: identified file locations, line numbers, current state.
    - Confirmed HTML has week/day options but JS needs implementation.
    - Confirmed gcal.py is stub only - needs full OAuth2 implementation.
    - **Agent 1 COMPLETE**: Database cleanup and schema migration:
      - Verified: 5 courses (no duplicate - ID 1 was already removed)
      - Added `google_synced_at` column to course_events
      - Created index `idx_course_events_google_id`
      - Updated db_setup.py with migration code for future runs
      - Backup created: pt_study.db.backup_20260110
  - Now:
    - Agents 3, 4 can proceed (schema dependencies resolved).
  - Next:
    - After Agents 2-5: Launch Agent 6 for integration testing.

Open questions (UNCONFIRMED if needed):
- None - user confirmed all 4 decisions.

Working set (files/ids/commands):
- Agent 1: brain/db_setup.py, brain/data/pt_study.db
- Agent 2: C:\Users\treyt\Downloads\School_schedule_JSON\EXTRACTION_PROMPT_TEMPLATE.md
- Agent 3: brain/templates/dashboard.html, brain/static/js/dashboard.js, brain/static/css/dashboard.css
- Agent 4: brain/dashboard/gcal.py, brain/dashboard/routes.py, brain/data/api_config.json
- Agent 5: brain/static/css/dashboard.css, brain/templates/dashboard.html
- brain/rag_notes.py (RAG implementation, new index_repo_to_rag function)
- brain/dashboard/scholar.py (generate_ai_answer with RAG context)

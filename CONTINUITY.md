Goal (incl. success criteria):
- Dashboard Enhancement Round 3: Fix 6 issues from user feedback + add new pixel art logo.
- Success: All features working, no regressions, tests pass.

Constraints/Assumptions:
- Follow AGENTS.md; update this Continuity Ledger each turn and on state changes.
- Use parallel agents where no dependencies exist.
- Week 1 of semester starts January 5, 2025.
- Color scheme: Red (#DC2626), Grey (#9CA3AF), Black (#0A0A0A), White.

Key decisions:
- Replace custom calendar rendering with embedded Google Calendar iframe option.
- Add week selector with 1/2/3/4/8/all weeks display options.
- Export modal functions to window scope for inline onclick handlers.
- Replace SVG logo with user's pixel art brain image.

State:
  - Done:
    - **Agent 1 REMOVED**: Google Calendar embed JavaScript - broken functions removed (handleCalendarSourceChange, loadGCalEmbed, setGCalEmbedUrl, initGCalEmbed, updateQuickConnectStatus, checkGCalStatusWithQuickBar, initCalendarSourceToggle)
    - **Agent 2 COMPLETE**: Calendar background CSS fixes - #calendar-grid scoped backgrounds, week/day view transparent containers
    - **Agent 3 COMPLETE**: Week selector - SEMESTER_START constant, populateWeekSelector(), getWeekStartDate(), updateWeekRangeLabel(), event listeners
    - **Agent 4 COMPLETE**: Edit button fixes - window.openEventEditModal and related functions exported to global scope, month view onclick handlers
    - **Agent 5 PARTIAL**: Logo HTML updated to use img tag, images directory created
  - Now:
    - Cleanup complete - removed broken GCal embed code, kept core OAuth functions (checkGCalStatus, connectGoogleCalendar, syncGoogleCalendar, syncGoogleTasks, disconnectGoogleCalendar)
  - Next:
    - Integration testing
    - Verify all features work in browser

Open questions (UNCONFIRMED if needed):
- User needs to manually save logo image file

Working set (files/ids/commands):
- brain/static/js/dashboard.js - All JavaScript changes applied
- brain/static/css/dashboard.css - Background CSS fixes applied
- brain/templates/dashboard.html - Calendar embed UI + week selector + logo HTML
- brain/static/images/ - Directory created, awaiting logo-brain.png

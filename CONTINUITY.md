Goal (incl. success criteria):
- Dashboard UI/UX improvements complete with collapsible sections across all tabs.
- Success criteria met: ✅ collapsible sections, ✅ session CRUD, ✅ syllabus editing, ✅ Brain tab, ✅ Scholar digest save, ✅ Tutor collapsible.

Constraints/Assumptions:
- Follow AGENTS.md and maintain this Continuity Ledger each turn.
- Spaced repetition integration deferred to separate RFC (not UI work).

Key decisions:
- Collapsible pattern: `.collapsible-section`, `.collapsible-header`, `.collapsible-content`, `toggleCollapsible()`, `initCollapsibles()`.
- Session View uses inline expand, Delete endpoint added.
- Event editing via modal with PATCH endpoint.
- New Brain tab with database stats and mastery overview.
- Scholar digest saves to `scholar/outputs/digests/`.
- Tutor layout: RAG sources, chat, answer/citations - all collapsible.
- Fast Entry now uses JSON format for reliable parsing.

State:
  - Done: All collapsible wrappers. Sessions tab renamed to "Brain" with Fast Entry. JSON prompts and parser.
  - Now: Dashboard v2.7 deployed with JSON-based Fast Entry.
  - Next: User tests Fast Entry with JSON output from tutor.

Open questions (UNCONFIRMED if needed):
- None.

Working set (files/ids/commands):
- brain/static/css/dashboard.css (collapsible CSS at lines 1098+)
- brain/static/js/dashboard.js (FAST_ENTRY_PROMPTS, parseFastEntry w/ JSON support)
- brain/templates/dashboard.html (v2.7 cache bust)
- brain/dashboard/routes.py (POST /api/sessions with created_at)

# Pages

This folder contains route-level React pages for the dashboard rebuild.

System context: tutor flows in these pages should present CP-MSS v1.0 stage language first.

- `brain.tsx`: Brain analytics, chat, ingestion, and Obsidian/Anki panels.
- `calendar.tsx`: Calendar and task management UI.
- `dashboard.tsx`: Main dashboard overview.
- `scholar.tsx`: Scholar insights and reports.
- `tutor.tsx`: Tutor session setup + chat shell; manages materials scope, vault scope, North Star context, and passes source filters to `TutorChat`.

## Persistent UI issue log (modal overlay)

Issue: Some buttons (session evidence edit/delete, calendar event edit, manage calendar) intermittently show a dark overlay or partial dim without a visible/working modal.

Attempts and results:
- 2026-01-26: Raised dialog/alert dialog z-index, added max-height + overflow scroll for content (`components/ui/dialog.tsx`, `components/ui/alert-dialog.tsx`). Intended to prevent overlay-only state and ensure modal visibility. Reported: overlay no longer full-screen, but modal still not working consistently.
- 2026-01-26: Guarded calendar edit dialogs to only open when an event exists; reset selected event on close (`pages/calendar.tsx`). Intended to prevent opening dialog with null content. Reported: issue persists.
- 2026-01-26: Adjusted Brain edit/delete dialog onOpenChange to close only when the dialog is actually closing (`pages/brain.tsx`). Intended to avoid desync between open state and content. Reported: issue persists.
- 2026-01-26: Added debug modal HUD (query `?debugModals=1`), console logging, and stricter open guards for Brain/Calendar modals; auto-closes if open state has no backing data (`pages/brain.tsx`, `pages/calendar.tsx`). Pending user verification.
- 2026-01-26: Forced dialog/alert dialog opacity for open state, added modal data attributes for DOM tracing (`components/ui/dialog.tsx`, `components/ui/alert-dialog.tsx`, `pages/brain.tsx`, `pages/calendar.tsx`). Pending user verification.
- 2026-01-26: Raised dialog/alert dialog z-index to 100005 and added pointer-events auto on content to prevent overlay-only lock-ups (`components/ui/dialog.tsx`, `components/ui/alert-dialog.tsx`). Pending user verification.
- 2026-01-26: Forced dialog/alert dialog portals to render under `document.body` to avoid fixed-positioning relative to transformed ancestors (`components/ui/dialog.tsx`, `components/ui/alert-dialog.tsx`). Pending user verification.
- 2026-01-26: Temporarily disabled modal behavior + animations for Calendar Manage dialog and added MANAGE click logging to isolate CSS/scroll-lock issues (`pages/calendar.tsx`). Pending user verification.
- 2026-01-26: Forced Calendar Manage dialog inline positioning (top/left/transform) + z-index to keep it in viewport (`pages/calendar.tsx`). Pending user verification.
- 2026-01-26: Verified fix — Calendar MANAGE dialog now opens visibly; root cause was dialog content rendering off-screen (rect.y ~823) so it appeared “nothing happens.” Forced inline positioning + z-index resolved it (`pages/calendar.tsx`). Confirmed by user.
- 2026-01-26: Forced Brain delete confirmation dialog inline positioning + z-index to prevent off-screen rendering (`pages/brain.tsx`). Pending user verification.
- 2026-01-26: Applied inline positioning + z-index to remaining dialogs (Brain edit session/draft; Calendar create/edit/edit-Google) to prevent off-screen rendering (`pages/brain.tsx`, `pages/calendar.tsx`). Pending user verification.
- 2026-01-26: Applied inline positioning + z-index to ingestion bulk delete confirmation dialog (Schedule/Modules delete selected/all) to prevent off-screen rendering (`components/IngestionTab.tsx`). Pending user verification.
- 2026-01-26: Noted recurring modal off-screen issue impacting ingestion bulk delete; fixed via inline positioning + z-index (`components/IngestionTab.tsx`). Verified by user request to track this problem.

Next steps (pending):
- Capture exact repro steps per button, plus actual behavior (empty modal vs. no modal).
- Add temporary modal debug logging to identify which dialog is opening and with what data.


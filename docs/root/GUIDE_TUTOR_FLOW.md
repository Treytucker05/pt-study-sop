# Tutor Flow Guide (Interactive Walkthrough)

Last updated: 2026-02-22

This document captures the tutor-side setup/session flow and the expected behavior as we validate the system.

## Current State (live)

- Wizard/Chat defaults:
  - If active session exists in `tutor.active_session.v1`, tutor entry defaults to chat.
  - If no active session exists, tutor entry defaults to wizard.
- Header wording:
  - “Setup” is now labeled “Wizard”.
- Recent sessions sidebar:
  - Save and delete actions are present.
  - Per-session **END** and multi-select bulk **END** actions are added and wired to session-end behavior.
- Persistence behavior:
  - Stale active-session pointers are cleared when session status is not active.

## Next Step (this pass)

- Verify header copy + default behavior still match docs after any routing/path changes.
- Capture edge-case notes from actual use (especially active-session pointer behavior after ending sessions).

---

## Current Tutor Flow (as implemented)

1. **Wizard page**
   - User selects:
     - Course
     - Topic
     - Study materials
   - User selects chain type:
     - Pre-built
     - Custom
     - Auto
   - User clicks **Start**.

2. **Chain page**
   - User confirms/adjusts chain selections.
   - User clicks **Next**.

3. **Start page**
   - Page shows:
     - Course
     - Topic
     - Materials
     - Chain
   - User clicks **Start** to create the tutor session.

4. **Chat page**
   - Tutor conversation begins.
   - Sidebar includes:
     - Artifacts
     - Recent sessions list
     - Save and delete controls

---

## Session status model

- `active` (live session)
  - Backend: `tutor_sessions.status = "active"`
  - UI: treated as **LIVE**
  - Can accept turns / messages

- `completed` (finished session)
  - Backend: set by `/api/tutor/session/<id>/end`
  - UI: treated as **DONE**
  - Ends live turn flow for that session

---

## Default entry behavior

- If `tutor.active_session.v1` exists and points to an active session:
  - Tutor header default opens **Chat** for that session.
- If there is no active session:
  - Tutor header default opens **Wizard**.
- If stored session id exists but is no longer active:
  - Key is cleared and flow returns to **Wizard**.

---

## Sidebar Recent Sessions controls

### Existing
- **SAVE**: export selected session data to Obsidian.
- **DELETE**: remove selected session(s) or one session.

### Requested updates
- Added **END** per session for active sessions.
- Added **END** for multi-select bulk action on selected active sessions.

Expected behavior:
- End an active session = mark session completed (same as single-end flow).
- End action should not hard-delete session data.
- Bulk end should only affect active sessions in the current visible recent list.

---

## Open items to implement

- [x] Add per-session END action in recent sessions list row.
- [x] Add bulk END action in recent sessions multi-select.
- [x] Validate UX copy for Wizard/Chat header label and default behavior.

---

## Notes

- Session state used across restart/resume:
  - backend endpoint: `POST /api/tutor/session/<id>/end`
  - backend endpoint: `GET /api/tutor/session/<id>`
  - backend endpoint: `DELETE /api/tutor/session/<id>`
- The system currently has only `active` vs `completed` as practical runtime states in frontend behavior.

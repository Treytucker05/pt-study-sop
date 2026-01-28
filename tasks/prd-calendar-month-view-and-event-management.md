# PRD: Calendar Month View and Event Management Improvements

## Introduction/Overview
Improve the Calendar tab month view and event management to match Google Calendar behavior while keeping the full month visible without internal scroll. Users need taller day cells, drag-and-drop calendar ordering, correct calendar filtering, accurate time-block rendering using end times, proper event type loading, and a more complete edit experience aligned with Google Calendar fields.

## Goals
- Make month view day cells exactly 2x taller while keeping the full calendar visible (page scroll allowed).
- Allow drag-and-drop ordering of calendars in the Manage tab and persist the order per user.
- Ensure only selected calendars display (fix Local-only selection showing all calendars).
- Render timed events in correct time blocks using start/end times; treat all-day only when explicitly all-day.
- Load and save event type (Synchronous or Online) reliably.
- Provide edit tabs that cover all key Google Calendar event fields, including all-day.

## User Stories

### US-001: Taller month view without internal scroll
**Description:** As a user, I want each day cell in the month view to be twice as tall so events are easier to read without adding an inner scroll.

**Acceptance Criteria:**
- [ ] Month view day cell height is exactly 2x the current height.
- [ ] Month grid stays fully visible; no internal scrollbars inside the calendar grid.
- [ ] Page-level scrolling works if the calendar exceeds viewport height.
- [ ] npm run build succeeds.
- [ ] Verify in browser using dev-browser skill.

### US-002: Reorder calendars via drag and drop
**Description:** As a user, I want to drag and drop calendars in the Manage tab so I can prioritize the most important ones first.

**Acceptance Criteria:**
- [ ] Calendars are draggable in the Manage tab list with a clear drag handle or grip.
- [ ] Dropping a calendar changes the displayed order immediately.
- [ ] Order persists per user after refresh/reload (stored in backend DB).
- [ ] Order is reflected in the calendar list and any related UI ordering.
- [ ] pytest brain/tests/ passes.
- [ ] npm run build succeeds.
- [ ] Verify in browser using dev-browser skill.

### US-003: Calendar selection filters correctly
**Description:** As a user, I want only the calendars I click to be shown so I can focus on specific schedules.

**Acceptance Criteria:**
- [ ] Each calendar entry is clickable to toggle visibility on/off.
- [ ] Selecting only Local shows only Local (no other calendars appear).
- [ ] Multiple selected calendars show only those selected.
- [ ] pytest brain/tests/ passes.
- [ ] npm run build succeeds.
- [ ] Verify in browser using dev-browser skill.

### US-004: Timed events render in correct blocks
**Description:** As a user, I want timed events to render in their correct time blocks instead of all-day rows.

**Acceptance Criteria:**
- [ ] Events with start.dateTime and end.dateTime render in the correct time block.
- [ ] Events with start.date and end.date render as all-day.
- [ ] Timed events are not treated as all-day when end times are present.
- [ ] pytest brain/tests/ passes.
- [ ] npm run build succeeds.

### US-005: Event type loads and saves (Synchronous/Online)
**Description:** As a user, I want event type to load and save correctly so Synchronous and Online events are labeled consistently.

**Acceptance Criteria:**
- [ ] Event type is shown for existing events (Synchronous or Online).
- [ ] Event type is persisted on create/edit.
- [ ] Online events are detected from Google Calendar fields (conference data or video link).
- [ ] pytest brain/tests/ passes.
- [ ] npm run build succeeds.

### US-006: Edit event tabs cover Google Calendar fields
**Description:** As a user, I want event editing to include all relevant Google Calendar fields so I can fully manage my events.

**Acceptance Criteria:**
- [ ] Edit UI includes tabs/sections that cover: title, description, location, start/end, time zone, all-day toggle, recurrence, attendees, reminders, visibility/transparency, color, and conference/meeting data.
- [ ] Fields map to Google Calendar event schema on create/update.
- [ ] All-day toggle uses start.date/end.date and timed events use start.dateTime/end.dateTime.
- [ ] pytest brain/tests/ passes.
- [ ] npm run build succeeds.
- [ ] Verify in browser using dev-browser skill.

## Functional Requirements
1. FR-1: Month view day cell height must be exactly 2x the current height.
2. FR-2: The month calendar must not scroll internally; the page should scroll if needed.
3. FR-3: Calendar list order must be user-configurable via drag-and-drop in Manage tab.
4. FR-4: Calendar order must persist per user in the backend database.
5. FR-5: Calendar visibility must reflect only selected calendars; Local-only selection shows only Local.
6. FR-6: Timed events must render using start.dateTime and end.dateTime; all-day events must render using start.date and end.date.
7. FR-7: Event type must load and save as Synchronous or Online based on Google Calendar fields.
8. FR-8: Event edit UI must expose all major Google Calendar event fields for create/update.

## Non-Goals (Out of Scope)
- No redesign of week/day views beyond fixing time-block rendering.
- No changes to external calendar providers beyond Google Calendar.
- No bulk migration or backfill of historical events beyond display correctness.

## Design Considerations
- Preserve the existing retro arcade theme (red/black, 2px borders, terminal fonts).
- Avoid introducing nested scroll containers in the month view.
- Provide a clear drag affordance for calendar ordering.
- Ensure selection affordance is obvious (selected state visible at a glance).

## Technical Considerations
- Follow Google Calendar event schema for create/update.
- Start/end are required for event creation; timed events use dateTime and all-day uses date.
- Start/end must both be timed or both be all-day.
- Conference data requires conferenceDataVersion when creating or updating online meetings.
- eventType cannot be changed after creation; treat it as read-only post-create.

## Success Metrics
- Users can view a full month without internal scrollbars.
- Calendar order changes persist across refresh.
- Local-only selection never displays non-local calendars.
- Timed events consistently render within correct time blocks.
- Edit UI supports all core Google Calendar fields without fallback to raw JSON.

## Open Questions
- For existing events without obvious online meeting fields, should type default to Synchronous or be left blank?
- Should eventType (default/outOfOffice/focusTime/etc.) be exposed in the UI or remain hidden?
- What is the default duration if an imported event is missing an end time (if any occur)?

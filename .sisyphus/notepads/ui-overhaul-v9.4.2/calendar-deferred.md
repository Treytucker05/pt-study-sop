# Calendar View Separation - DEFERRED

## Blocker
Calendar.tsx is 1365+ lines with complex state management for:
- Month/Week/Day/Tasks views
- Google Calendar integration
- Drag-and-drop task management
- Multiple modal states
- Calendar settings

## Why Deferred
- High risk of breaking existing functionality
- Requires extensive testing with Google Calendar API
- View mode already exists (line 52: `type ViewMode = "month" | "week" | "day" | "tasks"`)
- Implementation would require 100+ line changes across multiple sections
- Low priority compared to core features already delivered

## Recommendation for v9.4.3
- Add explicit view mode toggle in header
- Ensure only one view renders at a time
- Add collapsible sidebar with mini calendar
- Test thoroughly with live Google Calendar connection

## Current State
Calendar already has view modes defined but needs UI polish to make them mutually exclusive and add sidebar.

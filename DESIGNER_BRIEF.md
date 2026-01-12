# PT Study Brain - Designer Brief

## Overview

PT Study Brain is a personal study management dashboard with a **90s arcade/retro** aesthetic. The app is a single-page application with 6 main tabs (pages) accessible from a top navigation header.

---

## Global Design Elements

### Header (Always Visible)
- **Logo**: Circular brain image with "SYSTEM_LINK_STABLE" status badge (left side)
- **Title**: "TREY'S STUDY" in retro arcade font
- **Navigation**: 6 arcade-style buttons with icons and labels
- **Decorative**: Red corner accent elements ("chaos accents")
- **Mobile**: Hamburger menu that opens a slide-out navigation panel

### Visual Theme
- **Color Palette**: Dark mode with retro red (#DC2626) primary accent, cool grey secondary
- **Typography**: Orbitron (display), Space Grotesk (body), Press Start 2P (pixel accents)
- **Effects**: CRT scanlines overlay, glassmorphism cards, subtle glow effects
- **Background**: Dark with red pixel grid pattern and radial glow spots

### Common UI Patterns
- **Collapsible Sections**: `<details>` elements with terminal-style headers showing icons and labels
- **Arcade Buttons**: Dark grey with red glow on hover/active
- **Stat Cards**: Metal-styled cards with icons, labels, and values
- **Tables**: Dark theme with hover states for rows
- **Forms**: Dark inputs with subtle borders, red accent on focus
- **Status Messages**: Color-coded (green=success, red=error, yellow=warning, blue=info)

---

## Page 1: DASHBOARD (Overview)

**Purpose**: At-a-glance summary of study progress and key metrics

### Sections:

#### 1.1 Quick Stats (Always Visible)
Four stat cards in a row:
- **Sessions**: Total count with chart icon
- **Uptime**: Total study hours
- **Rank**: Average performance score (%)
- **Cards**: Anki flashcard count

#### 1.2 Scholar Insights (Collapsible)
Grid with 4 areas:
- **Alerts**: System notifications/warnings
- **Pending Proposals**: Count (clickable to Scholar tab)
- **Pending Questions**: Count (clickable to Scholar tab)
- **Recent Findings**: Bulleted list of latest discoveries

#### 1.3 Patterns & Insights (Collapsible)
Three-column layout:
- **Mode Chart**: Donut/pie chart showing Core/Sprint/Drill distribution
- **Focus Areas**: Weak topics (red) vs Strong topics (green)
- **Retrospective**: "What worked" bullet list

#### 1.4 Study Trends (Collapsible)
- **Time Range Selector**: Dropdown (7/14/30 days)
- **Performance Chart**: Line chart with Understanding (purple) and Retention (blue) trends
- **Legend**: Color key below chart

#### 1.5 Upload Log (Collapsible)
- **Drop Zone**: Drag-and-drop area for .md session log files
- **Icon**: Floppy disk (retro)
- **Status**: Upload feedback area

---

## Page 2: BRAIN (Sessions)

**Purpose**: Log and review study sessions

### Sections:

#### 2.1 Fast Entry (Collapsible)
Quick session logging from AI tutor output:
- **Prompt Dropdown**: Select format prompt to copy
- **Copy Button**: Copies prompt to clipboard
- **Prompt Preview**: Shows selected prompt text
- **Paste Area**: Large textarea for pasting tutor JSON output
- **Ingest Button**: Submits parsed session

#### 2.2 Latest Sessions (Collapsible)
Table with columns:
- **Date**: Session date
- **Mode**: Badge (Core=red, Sprint=yellow, Drill=grey)
- **Topic**: Subject studied
- **Duration**: Minutes
- **Score (U/R/S)**: Understanding/Retention/System scores (1-5 each)
- **Action**: Edit/Delete buttons

Empty state shows inbox icon with "No sessions yet" message

#### 2.3 Quick Entry (Collapsible)
Manual session entry form:
- **Row 1**: Topic*, Study Mode dropdown, Time (minutes)*
- **Row 2**: Understanding (1-5)*, Retention (1-5), System Performance (1-5)
- **Textarea**: What Worked
- **Textarea**: What Needs Fixing
- **Textarea**: Additional Notes
- **Buttons**: Save Session, Clear Form

#### 2.4 Session Resume (Collapsible)
- **Generate Button**: Creates study summary
- **Download Link**: Exports as file
- **Preview Box**: Monospace text area showing generated resume

---

## Page 3: SYLLABUS

**Purpose**: Course management, calendar, and event tracking

### Sections:

#### 3.1 Study Calendar (Collapsible, Primary)
Two view modes toggled by buttons:

**Calendar View**:
- **Filters Row**: Course dropdown, Event Type dropdown, View Range (Month/Week/Day), Refresh button
- **Navigation**: Prev/Next buttons with month/year title
- **Calendar Grid**: 7-column grid showing days with event indicators
- **Legend**: Color key (Course Event=blue, Study Session=green, Planned Repetition=purple, Exam/Quiz=red)
- **Plan Session**: Date picker, minutes input, course dropdown, Add button
- **Google Calendar Sync**: Connect button (unauthenticated) or Sync Calendar/Sync Tasks/Disconnect buttons (authenticated)

**List View**:
- **Week Selector**: Start week dropdown, Show weeks dropdown, Earlier/Later navigation
- **Filters**: Course, Event Type, Search input
- **Table**: Done checkbox, Date, Course, Type badge, Title, Weight, Details, Actions

#### 3.2 Study Tasks (Collapsible)
Readings and ongoing assignments:
- **Filter**: Active/All/Completed dropdown
- **Stats Row**: Pending (yellow), In Progress (blue), Completed (green) counts + progress bar
- **Task List**: Scrollable list of tasks with status toggles

#### 3.3 Syllabus Intake (Collapsible)
Manual course/event entry form:
- **Course Fields**: Name*, Code, Term, Instructor, Default Study Mode, Minutes per week
- **Event Fields**: Title*, Type dropdown, Date, Due Date, Weight (0-1), Details textarea
- **Button**: Save Course + Event

#### 3.4 Syllabus via ChatGPT (Collapsible)
JSON import workflow:
- **Step 1**: Readonly textarea with ChatGPT prompt template + Copy button
- **Step 2**: Paste area for JSON output + Import button

#### 3.5 Course Colors (Collapsible)
- Color swatches for each course
- Click to open color picker

---

## Page 4: SCHOLAR

**Purpose**: AI-powered system analysis and research automation

### Banner
Purple gradient banner with "SCHOLAR RESEARCH" title and subtitle

### Sections:

#### 4.1 Scholar API Key (Collapsible)
- **Status Display**: Shows if key is configured
- **Configure Form** (toggleable): Provider dropdown (OpenRouter/OpenAI), API Key input, Save/Test buttons

#### 4.2 Run Scholar (Collapsible)
**Status Cards Row**:
- Status indicator
- Safe Mode toggle
- Multi-Agent toggle with max count dropdown
- Last Updated timestamp

**Run Section** (blue accent border):
- Start Run button
- Status text
- Progress bar (animated, indeterminate)
- Action buttons: Refresh Status, Open Latest Final, Cancel Run
- Terminal window: Shows real-time output log (resizable)

#### 4.3 Proposals & Questions (Collapsible)
Three sub-sections:
- **Proposals Awaiting Review**: List of proposal cards with Accept/Reject buttons
- **Questions Needing Answers**: Text inputs for each question + Save Answers button
- **Answered Questions** (collapsed by default): History of answered questions

#### 4.4 System Health & Research (Collapsible)
**System Health**:
- Progress bar (green=documented, yellow=in progress, grey=pending)
- Stats cards: Documented, In Progress, Pending, Stale (30d+)
- Module list: Scrollable list with status indicators

**Research & Gaps** (2-column):
- Active Research Topics
- Identified Gaps
- Improvement Candidates (full width)

**Next Steps**: Actionable recommendations list

**Latest Run Summary**: Monospace text box

#### 4.5 AI Strategic Digest (Collapsible)
- Purple gradient accent
- Generate Analysis button
- Save Digest button
- Output area: Formatted AI analysis

#### 4.6 Saved Digests (Collapsible)
- Refresh button
- Digest list with timestamps
- Modal viewer for full digest content

---

## Page 5: TUTOR

**Purpose**: Interactive AI study assistant with RAG knowledge base

### Sections:

#### 5.1 Ask Tutor (Collapsible)
Chat interface:
- **Header**: "AI STUDY TUTOR" with Mode dropdown (Core/Sprint/Drill) and New Session button
- **Messages Area**: Scrollable chat bubbles (tutor=left aligned with red accent, user=right aligned)
- **Input Area**: Textarea + Send button

#### 5.2 RAG Sources (Collapsible)
Three sub-sections:

**Study RAG**:
- Folder path input with Browse button
- Save Path button
- Sync Study Folder / Refresh Folders buttons
- Folder list showing indexed materials

**Runtime RAG**:
- Refresh Runtime Items button
- Toggle list of system/engine descriptions

**YouTube / URL Links**:
- URL input field
- Link Type dropdown (youtube/other)
- Add Link button

---

## Page 6: DATABASE (Brain)

**Purpose**: Raw database view and management

### Sections:

#### 6.1 Database Statistics (Collapsible)
Status panel with:
- Sessions count
- Syllabus Events count
- RAG Documents count
- Pending Cards count
- DB Size (MB)
- Refresh button

#### 6.2 Topic Mastery Overview (Collapsible)
- Mastery breakdown by topic
- Understanding/Retention scores per topic

#### 6.3 Ingestion Status (Collapsible)
- Files Tracked count
- Valid Sessions count
- Last Sync timestamp
- Sync Now / Force Re-sync buttons

#### 6.4 Anki Cards (Collapsible)
**Connection Status**:
- Anki Status indicator (connected/disconnected)
- Sync to Anki / Refresh buttons

**Card Drafts Table**:
- Front, Back, Status badge, Course, Actions columns
- Empty state with icon

**Create New Card Form**:
- Front textarea*
- Back textarea*
- Card Type dropdown
- Deck Name input
- Course dropdown
- Add Card Draft / Clear buttons

---

## Page 7: SYNC (Sync Inbox)

**Purpose**: Review and approve incoming data from scrapers/imports

### Header
- "SYNC INBOX" title with refresh button
- Subtitle explaining purpose

### Content
- Description text
- Table with columns: Type, Course, Title, Details, Date/Due, Actions
- Action buttons per row: Approve / Ignore

---

## Modals (Overlays)

### Proposal Viewer Modal
- Header with title, metadata, close button
- Monospace content area (scrollable)
- Footer: Reject (red), Approve (green), Close buttons

### Event Edit Modal
- Title input
- Type/Status dropdowns
- Date/Due Date inputs
- Weight input
- Details textarea
- Delete (red), Cancel, Save buttons

### Edit Session Modal
- Date, Start Time, End Time
- Course, Topic, Study Mode
- Duration, Understanding, Retention
- System Performance, Emotional Check-in
- Goal, Session Summary, Wins, Friction Points textareas
- Save/Cancel buttons

### Digest Viewer Modal
- Title header with close button
- Monospace content area
- Close button footer

---

## Responsive Breakpoints

- **Desktop**: Full 4-column grids, horizontal navigation
- **Tablet (1024px)**: 2-column grids, navigation may wrap
- **Mobile (600px)**: Single column, hamburger menu, slide-out navigation panel

---

## Notes for Designer

1. **Consistency**: All pages follow the same collapsible section pattern with terminal-style headers
2. **Empty States**: Tables and lists show friendly empty states with icons and hints
3. **Loading States**: Show "Loading..." text in muted grey
4. **Interactivity**: Buttons glow red on hover, cards lift slightly on hover
5. **Forms**: Clear labels, placeholder text, asterisks for required fields
6. **Accessibility**: High contrast text, clear focus states, semantic HTML

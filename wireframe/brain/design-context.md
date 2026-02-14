# Design Context — PT Study SOP

Generated: 2026-02-14

## App Overview
Personal study OS for a DPT student. Captures study sessions, tracks courses and deadlines, produces Anki-ready outputs, runs Scholar research, and drives improvement via an adaptive tutor. Flask dashboard on port 5000 with a React frontend.

## Target Platform
Desktop / Web (responsive, but primarily desktop)

## Layout Patterns
- Root grid: `grid-rows-[auto_1fr_auto]` (header / main / footer)
- Dashboard cards: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Brain workspace: resizable panels (sidebar 20-35%, main 50-80%, chat 320px)
- Cards: `rounded-none border bg-card`, no border radius
- Section blocks: `p-3 border-b border-primary/20 flex flex-col gap-2`

## Navigation
- Top header: logo + "TREY'S STUDY SYSTEM" + 7 nav buttons (Dashboard, Brain, Calendar, Scholar, Tutor, Methods, Library)
- Mobile: hamburger toggle, md:hidden
- Notes sheet: right slide-out panel (340px-520px responsive)
- Footer: status bar with streak, time, date

## Page Types
### Dashboard
- Study Wheel (course rotation + session logging)
- Today stats row (sessions, minutes)
- Courses section (list with edit/delete)
- Deadlines section (filterable, color-coded urgency)
- Google Tasks (connect prompt or task list)
- Today's Focus (daily planner)
- Planner Board (kanban columns: READY, DROP TO START, IN PROGRESS, DRAG BACK TO QUEUE)

### Brain
- 3-panel resizable: sidebar (vault tree) | canvas/editor | chat
- Tab bar: CANVAS | EDIT | CHAT | GRAPH | TABLE | ANKI

### Calendar
- Full-width calendar grid + event modals

### Scholar
- Tabs: Summary | Questions | Findings | Proposals | Chat

### Tutor
- 3-column: ContentFilter | TutorChat | Artifacts

### Methods
- Tabs: Library | Chains | Analytics

## Interaction Patterns
- Dialogs: centered modal, `border-2 border-primary`, `bg-black`
- Sheets: right slide-out for notes
- Tabs: `.tab-bar` with `.tab-item` (font-arcade, active = bg-primary)
- Buttons: `border-[3px] border-double`, variants (default/outline/ghost/destructive)
- Forms: `bg-black/60 border-2 border-primary/40`, font-terminal
- Drag-and-drop: optimistic UI with queryClient.setQueryData
- Toast notifications for actions

## Content Hierarchy
- h1-h4: font-arcade, tracking-[3px], sizes 42/32/26/22px
- Body: font-terminal (VT323), 20px, leading-relaxed
- Labels: font-arcade text-xs text-primary
- Muted: text-muted-foreground (47% gray)

## Screenshot Observations
### dashboard-top.png (Study Wheel)
- Full-width study wheel card: course rotation list with "NEXT UP" indicator
- Current course highlighted with red border
- Edit/delete icons per course
- "+ ADD COURSE" button
- Large "COMPLETE SESSION" button (pink/red, prominent CTA)
- Clean vertical list, centered layout

### dashboard-mid.png (Stats + Courses + Tasks + Deadlines)
- 2-column layout: TODAY stats (left) + COURSES list (right)
- TODAY card: Sessions count (10), Minutes count (13), "STUDY NEUROSCIENCE" button
- COURSES card: 4 courses with edit/delete counts and day stats
- TASKS card (bottom-left): "Connect Google to see your tasks" prompt
- DEADLINES card (bottom-right): color-coded urgency (red = overdue), filterable by course
- Cards have red double-border, black backgrounds

### dashboard-bottom.png (Focus + Planner)
- TODAY'S FOCUS section: daily priority with "Open Brain" link, "+ Tasks" button
- PLANNER_BOARD: kanban with 4 columns (READY | DROP TO START | IN PROGRESS | DRAG BACK TO QUEUE)
- 1 task visible: "Study Troubleshooting"
- "Nothing in progress" placeholder in empty columns
- Board/List toggle buttons
- Lots of empty space below the board

## UX Conventions
- All elements: `rounded-none` (retro arcade, no border radius)
- Double borders (`border-[3px] border-double`) on interactive elements
- CRT effects: scanlines, phosphor flicker, glow shadows
- Color: black background, red (#CC2E48) accents, white/gray text
- Monospace font: VT323 for everything
- Cards: dark bg with red border, consistent spacing
- Status bar footer: streak count, time, date

# Runtime Bundle: 04_LOGGING_AND_TEMPLATES.md
Version: v9.2
Scope: Logging schema and templates
This is runtime; canonical source is:
- logging_schema_v9.3.md
- src\templates\exit_ticket.md
- src\templates\retrospective_timetable.md
- src\templates\study_metrics_log.md
- src\templates\weekly_plan_template.md
- src\templates\weekly_review_template.md
- src\templates\post_lecture_elaboration_prompts.md
- src\templates\intake_template.md
- src\templates\session_log_template.md
- src\templates\progress_tracker_template.md

---


## Source: logging_schema_v9.3.md

# Logging Schema v9.3 (Canonical)

## Purpose
Provide a single, consistent JSON logging format for all sessions.

---
## Formatting rules
- Valid JSON only (double quotes, commas, no comments).
- Use `YYYY-MM-DD` for dates.
- Use semicolon-separated values for list-like fields.
- No multiline strings; keep each value on one line.
- Use numbers for numeric fields (duration_min, ratings, percentages).
- Use "N/A" when a required field is unknown.

---
## Tracker JSON (required)
```json
{
  "schema_version": "9.3",
  "date": "YYYY-MM-DD",
  "topic": "Main topic",
  "mode": "Core",
  "duration_min": 45,
  "understanding": 4,
  "retention": 4,
  "calibration_gap": 10,
  "rsr_percent": 70,
  "cognitive_load": "intrinsic",
  "transfer_check": "yes",
  "anchors": "semicolon-separated",
  "what_worked": "semicolon-separated",
  "what_needs_fixing": "semicolon-separated",
  "notes": "semicolon-separated"
}
```

---
## Enhanced JSON (required)
```json
{
  "schema_version": "9.3",
  "date": "YYYY-MM-DD",
  "topic": "Main topic",
  "mode": "Core",
  "duration_min": 45,
  "understanding": 4,
  "retention": 4,
  "calibration_gap": 10,
  "rsr_percent": 70,
  "cognitive_load": "intrinsic",
  "transfer_check": "yes",
  "source_lock": "semicolon-separated",
  "plan_of_attack": "semicolon-separated",
  "frameworks_used": "semicolon-separated",
  "buckets": "semicolon-separated",
  "confusables_interleaved": "semicolon-separated",
  "anchors": "semicolon-separated",
  "anki_cards": "semicolon-separated",
  "glossary": "semicolon-separated",
  "exit_ticket_blurt": "semicolon-separated",
  "exit_ticket_muddiest": "semicolon-separated",
  "exit_ticket_next_action": "semicolon-separated",
  "retrospective_status": "semicolon-separated",
  "spaced_reviews": "R1=YYYY-MM-DD; R2=YYYY-MM-DD; R3=YYYY-MM-DD; R4=YYYY-MM-DD",
  "what_worked": "semicolon-separated",
  "what_needs_fixing": "semicolon-separated",
  "next_session": "semicolon-separated",
  "notes": "semicolon-separated"
}
```

---
## Required calculations
- calibration_gap = predicted performance (JOL) minus actual recall.
- rsr_percent = percent correct on retrieval attempts at session start.

---
## Spacing defaults (heuristic)
- R1 = +1 day
- R2 = +3 days
- R3 = +7 days
- R4 = +21 days

Adaptive adjustment:
- Red (struggled): move the next review sooner.
- Yellow (effortful success): keep standard spacing.
- Green (easy): extend the next interval.

---
## Compatibility notes
- Field names are fixed. Update downstream tools before changing keys.
- JSON must be valid; no trailing commas or multiline strings.


## Source: src\templates\exit_ticket.md

# Exit Ticket (Final 10 Minutes)

## Purpose
Close the session with recall, identify the muddiest point, and set the first action for next time.

---
## Template
- Blurt (2 minutes, notes closed):
  - [ ] Free recall summary
- Muddiest point (one concept):
  - [ ] _______________________________
- Next action hook (first action next time):
  - [ ] _______________________________


## Source: src\templates\retrospective_timetable.md

# Retrospective Timetable (1-3-7-21)

## Purpose
Track spaced retrieval using red/yellow/green status to adjust intervals.

---
## Status Rules
- Red: struggled -> review sooner
- Yellow: effortful success -> keep standard spacing
- Green: easy -> extend interval

---
## Table Template
| Item | Review 1 (+1d) | Status | Review 2 (+3d) | Status | Review 3 (+7d) | Status | Review 4 (+21d) | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [Concept] | YYYY-MM-DD | R/Y/G | YYYY-MM-DD | R/Y/G | YYYY-MM-DD | R/Y/G | YYYY-MM-DD | R/Y/G | [notes] |

---
## CSV Template (optional)
Item,Review1,Status1,Review2,Status2,Review3,Status3,Review4,Status4,Notes
"[Concept]",YYYY-MM-DD,R,YYYY-MM-DD,Y,YYYY-MM-DD,G,YYYY-MM-DD,G,"[notes]"


## Source: src\templates\study_metrics_log.md

# Study Metrics Log

## Purpose
Capture post-session metrics for calibration and system tuning.

---
## Required Metrics
- Calibration gap: difference between predicted performance and actual recall.
- Retrieval success rate (RSR): percent correct on recall attempts at session start.
- Cognitive load type: intrinsic / extraneous / germane (pick the dominant type).
- Transfer check: did you connect this session to another class? yes/no.

---
## Template
- Calibration gap: [e.g., +10 overconfident, -5 underconfident, 0 accurate]
- Retrieval success rate: [0-100%]
- Cognitive load type: [intrinsic/extraneous/germane]
- Transfer check: [yes/no]
- Notes: [short, semicolon-separated if used in JSON]


## Source: src\templates\weekly_plan_template.md

# Weekly Plan Template (3+2)

## Cluster Assignment
- Cluster A (technical):
  - [ ]
  - [ ]
  - [ ]
- Cluster B (light/reading):
  - [ ]
  - [ ]

---
## Weekly Rhythm
- Mon/Wed/Fri: Deep work on Cluster A + 15 min review of Cluster B.
- Tue/Thu/Sat: Deep work on Cluster B + 15 min review of Cluster A.
- Sun: Weekly review + metacognition.

---
## Notes
- Cross-review targets:
- Known weak anchors to revisit:


## Source: src\templates\weekly_review_template.md

# Weekly Review Template (Sunday)

## Wins
- [ ]

## Gaps / Friction
- [ ]

## Backlog (carry-forward)
- [ ]

## Load Check
- Intrinsic:
- Extraneous:
- Germane:

## Next Week Plan
- Cluster A (technical):
- Cluster B (light/reading):
- Priority topics:


## Source: src\templates\post_lecture_elaboration_prompts.md

# Post-Lecture Elaboration Prompts

Use within 24 hours of the lecture/reading. Answer from memory first, then check sources.

## Why/How Prompts
- Why does this step happen first?
- How does this structure create the observed outcome?
- What would change if one component failed?

## Compare/Contrast
- How is A different from B?
- Where do they overlap, and where do they diverge?

## Predict/Apply
- If X increases/decreases, what happens to Y?
- Given a new case, how would the mechanism change?

## Teach-Back
- Explain the concept in 3 sentences.
- Explain it to a 10-year-old (L2).

## Error Check
- What did I get wrong in the session?
- What is the corrected version?


## Source: src\templates\intake_template.md

# Session Intake Template

- Target exam/block:
- Time available:
- Topic scope:
- Materials (Source-Lock):
- Plan of attack (3-5 steps):
- Pre-test/brain dump (1-3 items):
- Mode (Core/Sprint/Light/Quick Sprint/Drill):
- Weak anchors to interleave:


## Source: src\templates\session_log_template.md

# Session Log (Optional Markdown Summary)

JSON is the canonical log format. Use this summary only if you need a human-readable recap.

---
## Session Info
- Date:
- Topic:
- Mode:
- Duration (min):

## Anchors Locked
- 

## Cards Created
- 

## Metrics
- Calibration gap:
- Retrieval success rate:
- Cognitive load type:
- Transfer check:

## Exit Ticket
- Blurt summary:
- Muddiest point:
- Next action hook:

## Next Session
-


## Source: src\templates\progress_tracker_template.md

# Progress Tracker Template

## Status legend
- Not started
- In progress
- Needs review
- Solid

## Tracker Table
```
| Module | Topic / LO | Status | Last date | Next action | Next review | Source-lock | Notes |
| ------ | ---------- | ------ | --------- | ----------- | ----------- | ----------- | ----- |
| M3     | LO 2.1: Shoulder stabilizers | In progress | YYYY-MM-DD | Drill rotator cuff actions | YYYY-MM-DD | Slides 12-18 | Missed supraspinatus action |
```

## Update cadence
- Update during Wrap (M6)
- Use the exit ticket to set "Next action"
- Set next review dates (1-3-7-21 default)

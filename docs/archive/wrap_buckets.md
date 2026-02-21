# WRAP Buckets (Brain Ingestion Taxonomy)

## Purpose
Define the canonical buckets Brain uses to sort Tutor WRAP output into metrics, issues, Anki drafts, and Obsidian updates.

## How It’s Used
- Tutor produces WRAP output (summary + JSON logs).
- Brain parses WRAP fields into the buckets below.
- Buckets drive metrics, issue detection, Anki drafting, and Obsidian updates.

## Bucket Index
| Bucket | What Goes In | Brain Output |
| --- | --- | --- |
| Session Meta | Date, duration, mode, course, topic, source-lock. | Session header + timeline.
| Learning Signals | Understanding/retention ratings, calibration gap, retrieval success. | Readiness metrics + trends.
| Knowledge Anchors | Anchors locked, weak anchors, confusables. | Issue flags + Anki draft seed list.
| Content Highlights | Key points, definitions, examples, mechanisms. | Obsidian updates + polished notes.
| Errors & Gaps | What was missed, misconceptions, off-source drift. | Issue queue + remediation targets.
| Actions & Next | Next session plan, spaced review dates, action items. | Calendar targets + dashboard priorities.
| Cards Drafted | Drafts created in WRAP (if any). | Anki draft validation + formatting.

## Required WRAP Fields (Minimum)
- `date`
- `topic`
- `mode`
- `duration_min`
- `source_lock`
- `understanding`
- `retention`
- `calibration_gap`
- `retrieval_success_rate`
- `anchors`
- `weak_anchors`
- `what_worked`
- `what_needs_fixing`
- `wrap_watchlist`
- `exit_ticket_blurt`
- `exit_ticket_muddiest`
- `next_session`

## Obsidian Update Rules
- Append WRAP highlights to the session’s Obsidian note.
- If no session note exists, create a new note with the date + topic.
- Add tags: `#wrap`, `#key-points`, `#review`.
- Link to course/topic pages when available.

## Anki Draft Rules (Template Fit)
- Q/A: one clear prompt, one answer.
- Cloze: 1–2 deletions max.
- Image/Diagram: label or structure from WRAP highlights.

## Example Mapping
- **WRAP Key Points** → Content Highlights bucket → Obsidian append.
- **Weak anchors** → Knowledge Anchors bucket → Anki draft seeds.
- **Calibration gap** → Learning Signals → Issue flag if >10.

## Mirror Note
If you keep a mirrored copy in Obsidian, put it under `projects/pt-study-sop/` (suggested: `projects/pt-study-sop/docs/wrap_buckets.md`).

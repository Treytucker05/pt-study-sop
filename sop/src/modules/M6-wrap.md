# M6: Wrap (Close and Schedule)

## Purpose
End-of-session consolidation in 2-10 minutes: recall, error capture, cards, metrics, and next-review plan. Wrap aligns with PEIRRO Refine and Overlearn.

---
## Final 10 minutes (mandatory)
1) Free recall blurt (2 minutes, notes closed).
2) Muddiest point: name the single fuzziest concept.
3) Next action hook: write the first action for next session.

Template: `sop/src/templates/exit_ticket.md`

---
## Wrap Protocol
1) Anchors review: list all hooks locked today.
2) Cards: create Anki-style cards for misses/weak anchors (required).
3) Metrics capture:
   - Calibration gap (confidence vs recall)
   - Retrieval success rate (RSR %)
   - Cognitive load type (intrinsic/extraneous/germane)
   - Transfer check (connected to another class? yes/no)
4) Spaced retrieval schedule (1-3-7-21) using active recall, not rereading.
   - Use the retrospective timetable (red/yellow/green) to adjust spacing.
   - Template: `sop/src/templates/retrospective_timetable.md`
5) Output logs per schema v9.3 (Tracker JSON + Enhanced JSON).
   - Schema: `sop/logging_schema_v9.3.md`

---
## Spaced Retrieval Defaults (heuristic)
- Review 1: +1 day
- Review 2: +3 days
- Review 3: +7 days
- Review 4: +21 days

Adjust intervals based on retrospective status:
- Red (struggled): sooner review
- Yellow (effortful success): keep standard spacing
- Green (easy): extend interval

---
## Calibration Check
- Predict your score (0-100%) on today's target.
- Answer one application question.
- Compare prediction vs actual; adjust spacing if overconfident.

---
## Exit Condition
- Exit ticket completed
- Cards captured
- Metrics logged
- Spaced reviews scheduled
- Tracker JSON + Enhanced JSON output complete

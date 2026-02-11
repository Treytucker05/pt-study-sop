# Deprecated: Logging Schema v9.2

Replaced by `sop/logging_schema_v9.3.md`. Archived copy: `sop/archive/old_templates/logging_schema_v9.2.md`.

# Logging Schema v9.2 (Canonical)

## Purpose
Provide a single, consistent logging format for all sessions. JSON is canonical; Markdown summaries are optional.

---
## Field Rules (all JSON)
- Use `YYYY-MM-DD` for dates.
- Use semicolon-separated lists for multi-item text fields.
- No newlines inside string values.
- Use numbers for numeric fields (duration_min, ratings, percentages).
- Use "N/A" when a required field is unknown.

---
## Tracker JSON (minimal)
```json
{
  "schema_version": "9.2",
  "date": "YYYY-MM-DD",
  "topic": "Main topic",
  "mode": "Core",
  "duration_min": 45,
  "understanding": 4,
  "retention": 4,
  "system_performance": 5,
  "calibration_gap": 10,
  "retrieval_success_rate": 75,
  "cognitive_load": "intrinsic",
  "transfer_check": "yes",
  "what_worked": "semicolon-separated",
  "what_needs_fixing": "semicolon-separated",
  "anchors": "semicolon-separated",
  "notes": "semicolon-separated"
}
```

Notes:
- `calibration_gap` is predicted minus actual (percentage points; negative means underconfident).
- `retrieval_success_rate` is percent correct on recall attempts (0-100).
- `cognitive_load` must be one of: intrinsic, extraneous, germane.
- `transfer_check` must be "yes" or "no".

---
## Enhanced JSON (canonical archive)
```json
{
  "schema_version": "9.2",
  "date": "YYYY-MM-DD",
  "topic": "Main topic",
  "mode": "Core",
  "duration_min": 45,
  "understanding": 4,
  "retention": 4,
  "system_performance": 5,
  "calibration_gap": 10,
  "retrieval_success_rate": 75,
  "cognitive_load": "intrinsic",
  "transfer_check": "yes",
  "source_lock": "semicolon-separated",
  "plan_of_attack": "semicolon-separated",
  "frameworks_used": "semicolon-separated",
  "buckets": "semicolon-separated",
  "anchors": "semicolon-separated",
  "anki_cards": "semicolon-separated",
  "glossary": "semicolon-separated",
  "wrap_watchlist": "semicolon-separated",
  "exit_ticket_blurt": "semicolon-separated",
  "exit_ticket_muddiest": "semicolon-separated",
  "exit_ticket_zeigarnik": "semicolon-separated",
  "retrospective_status": "semicolon-separated",
  "spaced_reviews": "Review1=YYYY-MM-DD; Review2=YYYY-MM-DD; Review3=YYYY-MM-DD; Review4=YYYY-MM-DD",
  "what_worked": "semicolon-separated",
  "what_needs_fixing": "semicolon-separated",
  "next_session": "semicolon-separated",
  "runtime_notes": "semicolon-separated",
  "notes": "semicolon-separated"
}
```

---
## Output Requirements
- Always output both Tracker JSON and Enhanced JSON at Wrap.
- Label outputs clearly as "Tracker JSON" and "Enhanced JSON".
- Use current system date for `date`.
- Do not change field names without updating this schema.

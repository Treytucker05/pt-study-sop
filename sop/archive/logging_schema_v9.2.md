# Deprecated: Logging Schema v9.2

Replaced by `sop/logging_schema_v9.3.md`.

---
## Tracker JSON (v9.2)
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

---
## Enhanced JSON (v9.2)
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
  "runtime_notes": "semicolon-separated",
  "wrap_watchlist": "semicolon-separated",
  "clinical_links": "semicolon-separated",
  "next_session": "semicolon-separated",
  "spaced_reviews": "Review1=YYYY-MM-DD; Review2=YYYY-MM-DD; Review3=YYYY-MM-DD",
  "notes": "semicolon-separated"
}
```

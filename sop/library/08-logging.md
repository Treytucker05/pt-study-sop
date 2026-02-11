# Logging Schema v9.4 (Canonical)

## Purpose

Single, consistent logging format for all study sessions. This file is the **schema reference**.

## Critical Rules

1. **No Phantom Outputs** (invariant): never invent, backfill, or hallucinate data. If a value wasn't captured, use the empty-value convention below.
2. **JSON is produced post-session** via Brain ingestion prompts (see `10-deployment.md`), NOT by the tutor at Wrap.
3. **Empty-value convention:**
   - Session Ledger (plain text at Wrap): use `NONE`
   - JSON (produced via Brain ingestion): use `"N/A"` for text fields, `null` for numeric fields

---

## Formatting Rules (JSON)

- Dates: `YYYY-MM-DD`
- Multi-item text fields: semicolon-separated
- No multiline strings; one line per value
- Numeric fields use numbers (duration_min, ratings, percentages)
- Field names are fixed; update downstream tools before changing keys

---

## Session Ledger (Produced at Wrap)

The tutor outputs this plain-text ledger at Wrap. It is the input for Brain ingestion.

```
session_date: YYYY-MM-DD
covered: [semicolon-separated list of what was actually studied]
not_covered: [semicolon-separated list of planned but not reached]
weak_anchors: [semicolon-separated list of items needing review]
artifacts_created: [semicolon-separated list — only if actually created]
timebox_min: [number — actual session duration]
method_chain: [method chain used during session (from composable method library); NONE if not used]
```

Empty fields: use `NONE` (see Critical Rules above for JSON convention).

---

## Tracker JSON (Schema Reference — produced via Brain ingestion, not at Wrap)

```json
{
  "schema_version": "9.4",
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
  "error_classification": "semicolon-separated",
  "error_severity": "semicolon-separated",
  "error_recurrence": "semicolon-separated",
  "notes": "semicolon-separated"
}
```

---

## Enhanced JSON (Schema Reference — produced via Brain ingestion, not at Wrap)

Includes all Tracker fields plus:

| Field | Format |
|-------|--------|
| `source_lock` | semicolon-separated |
| `plan_of_attack` | semicolon-separated |
| `frameworks_used` | semicolon-separated |
| `buckets` | semicolon-separated |
| `confusables_interleaved` | semicolon-separated |
| `anki_cards` | semicolon-separated |
| `glossary` | semicolon-separated |
| `exit_ticket_blurt` | semicolon-separated |
| `exit_ticket_muddiest` | semicolon-separated |
| `exit_ticket_next_action` | semicolon-separated |
| `retrospective_status` | semicolon-separated |
| `spaced_reviews` | `R1=YYYY-MM-DD; R2=YYYY-MM-DD; R3=YYYY-MM-DD; R4=YYYY-MM-DD` |
| `next_session` | semicolon-separated |
| `errors_by_type` | `careless=N; misunderstanding=N; spacing=N; transfer=N` |
| `errors_by_severity` | `minor=N; moderate=N; critical=N` |
| `error_patterns` | semicolon-separated descriptions |
| `spacing_algorithm` | `standard` or `rsr-adaptive` |
| `rsr_adaptive_adjustment` | e.g., `R2 extended +25% to 3.75d; RSR=85%` |
| `adaptive_multipliers` | e.g., `R2=1.25; R3=1.0` |

Rule: anki_cards is recorded only if cards were actually created; otherwise set to NONE (never invent cards).

---

## Metric Definitions

### Calibration Gap
Predicted performance (JOL) minus actual recall. Positive = overconfident, negative = underconfident, zero = accurate.

### RSR (Retrieval Success Rate)
Percent correct on recall attempts at session start (0-100).

### Cognitive Load Type
Dominant load during session. One of: `intrinsic` | `extraneous` | `germane`.

### Transfer Check
Did you connect this session's content to another class? `yes` | `no`.

---

## Error Classification Schema

### Enums

| Field | Values |
|-------|--------|
| Error type | `careless` &#124; `misunderstanding` &#124; `spacing` &#124; `transfer` |
| Error severity | `minor` &#124; `moderate` &#124; `critical` |

### Field Definitions

- `error_classification`: Types observed this session (e.g., `"misunderstanding; spacing"`)
- `error_severity`: Severity matching classification order (e.g., `"moderate; minor"`)
- `error_recurrence`: Count of previous sessions each error appeared (e.g., `"3; 1"`)
- `errors_by_type` (Enhanced): Aggregate counts per type
- `errors_by_severity` (Enhanced): Aggregate counts per severity
- `error_patterns` (Enhanced): Recurring error descriptions (e.g., `"origin vs insertion confusion recurring 3 sessions"`)

---

## Metrics Fill-In Template

Copy and fill after each session:

```
Calibration gap: [e.g., +10 overconfident, -5 underconfident, 0 accurate]
Retrieval success rate: [0-100%]
Cognitive load type: [intrinsic/extraneous/germane]
Transfer check: [yes/no]
Notes: [short, semicolon-separated if used in JSON]
```

---

## Output Flow

1. **At Wrap:** tutor outputs Exit Ticket + Session Ledger (plain text). Template in `09-templates.md` §4.
2. **Post-session:** Brain ingestion prompts (see `10-deployment.md`) produce JSON (Tracker + Enhanced).
3. Use current system date for the `date` field.

---

## Exit Ticket (Final 10 Minutes)

1. **Free recall blurt** (2 min, notes closed)
2. **Muddiest point** (one concept)
3. **Next action hook** (first action for next session)

---

## Dashboard Table

| Date | Topic | Mode | Duration | RSR % | Cal Gap | Load | Transfer | Muddiest | Next Action | Error Type | Severity | Recurrence |
|------|-------|------|----------|-------|---------|------|----------|----------|-------------|------------|----------|------------|
| YYYY-MM-DD | [topic] | Core/Sprint/Drill | [min] | 0-100 | +/- | I/E/G | Y/N | [concept] | [action] | [type] | [sev] | [count] |

---

## Appendix: Schema Changelog

### v9.3 → v9.4
- Wrap outputs reduced to Exit Ticket + Session Ledger only (Lite Wrap).
- JSON moved to Brain ingestion post-session.
- Added Session Ledger format.
- No Phantom Outputs invariant enforced.
- Spacing/review scheduling removed from Wrap.
- Topic prefix requirement removed.

### v9.2 → v9.3
- Removed: `system_performance`, `wrap_watchlist`, `exit_ticket_zeigarnik`, `runtime_notes`.
- Renamed: `retrieval_success_rate` → `rsr_percent`.
- Added (Tracker): `error_classification`, `error_severity`, `error_recurrence`.
- Added (Enhanced): `confusables_interleaved`, `errors_by_type`, `errors_by_severity`, `error_patterns`, `spacing_algorithm`, `rsr_adaptive_adjustment`, `adaptive_multipliers`.
- Changed: `spaced_reviews` format `Review1=` → `R1=`.

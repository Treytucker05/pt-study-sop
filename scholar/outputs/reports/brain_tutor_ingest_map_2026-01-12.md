# Brain/Tutor Ingest Map (2026-01-12)

## Data Sources (Tutor Side)
- Tutor workflow guidance and modules live in the SOP canon under `sop/gpt-knowledge/` and related modules.
- Tutor outputs are captured as study session logs using the session log template.

Evidence
- `sop/gpt-knowledge/` (Tutor runtime canon)
- `brain/session_logs/TEMPLATE.md`

## Hand-offs into Brain
- Session logs are saved to `brain/session_logs/YYYY-MM-DD_topic.md`.
- Ingestion is performed by `python brain/ingest_session.py <logfile>`, which parses fields and writes to `brain/data/pt_study.db`.

Evidence
- `brain/session_logs/TEMPLATE.md`
- `brain/ingest_session.py`
- `brain/data/pt_study.db`

## How Scholar Uses Brain Data
- The Scholar runbook instructs audits to read recent session logs from `brain/session_logs/` to find friction patterns and gaps.
- These audits feed gap analyses, dossiers, and research notes.

Evidence
- `scholar/workflows/orchestrator_run_prompt.md`
- `scholar/outputs/orchestrator_runs/`

## Gaps / Missing Instrumentation
- Ingestion is manual; there is no automated watcher that ingests new session logs.
- Scholar depends on recent session logs; missing/stale logs reduce audit quality.

Evidence
- `brain/ingest_session.py`
- `scholar/outputs/gap_analysis/gap_analysis_missing_recent_session_logs_2026-01-10.md`

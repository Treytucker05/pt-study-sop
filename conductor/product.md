# Product Definition (PT Study OS)

PT Study OS is a local-first, single-user study system that turns each study session into structured evidence (WRAP logs) and a continuous improvement loop:

Tutor (Custom GPT) -> WRAP output -> Brain ingests + stores -> Dashboard surfaces metrics/issues -> Scholar audits + proposes improvements -> you accept/edit/deny -> repeat.

## Key components

- Tutor: Runs the tutoring session (external: Custom GPT). Outputs WRAP.
- Brain: Source-of-truth SQLite DB + ingestion + metrics + artifact generation.
- Dashboard: Flask-served UI for ingest, metrics, issues, proposals.
- Scholar: Manual-run auditor that proposes improvements based on evidence.
- Calendar/Tasks: Downstream projection of Brain state into Google Calendar/Tasks (preview-first).

## Canonical docs

- PRD: `docs/prd/PT_STUDY_OS_PRD_v1.0.md`
- Architecture: `docs/root/PROJECT_ARCHITECTURE.md`
- Docs index: `docs/README.md`


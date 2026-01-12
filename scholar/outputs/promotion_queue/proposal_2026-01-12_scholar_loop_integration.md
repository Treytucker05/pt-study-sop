# Scholar Loop Integration Proposal Pack (2026-01-12)

NOTE: Proposals require manual approval when safe_mode is enabled.

## Proposal ID: SLIP-001
Summary: Add mastery counter to session log template and ingestion pipeline.
Rationale: Successive relearning requires tracking repeated successful recall across sessions.
Expected Benefits: Better retention tracking and targeted review planning.
Risks: Template changes may affect ingestion compatibility.
Required Changes (paths):
- `brain/session_logs/TEMPLATE.md`
- `brain/ingest_session.py`
- `brain/db_setup.py`

## Proposal ID: SLIP-002
Summary: Add interleaved planning check to M0 planning.
Rationale: Interleaving improves discrimination and transfer; current planning is siloed.
Expected Benefits: More robust retrieval and transfer across topics.
Risks: Adds friction to planning flow.
Required Changes (paths):
- `sop/gpt-knowledge/M0-planning.md`
- `sop/MASTER_PLAN_PT_STUDY.md`

## Proposal ID: SLIP-003
Summary: Auto-save digests (or enforce save step) to ensure plan updates are always generated.
Rationale: Digest generation does not persist by default, so plan updates may never happen.
Expected Benefits: Consistent plan_update and proposal_seed artifacts per digest.
Risks: Adds automatic file writes; needs guardrails.
Required Changes (paths):
- `brain/dashboard/routes.py`
- `brain/dashboard/scholar.py`
- `scholar/workflows/orchestrator_run_prompt.md`

## Proposal ID: SLIP-004
Summary: Add data freshness warnings to health and digest outputs.
Rationale: Reports may be based on stale session logs without an explicit warning.
Expected Benefits: Higher trust in outputs and clearer audit limitations.
Risks: Requires accurate timestamps from ingestion.
Required Changes (paths):
- `brain/dashboard/scholar.py`
- `scholar/outputs/reports/system_health_*.md` (template guidance)

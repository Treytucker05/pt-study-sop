# System Health Schema (2026-01-12)

## Purpose
- Provide a consistent, evidence-linked health summary for each core system in the Scholar loop.

## Systems to Cover
- Brain
- Tutor
- Scholar
- Dashboard/Loop
- Telemetry/Data

## Required Subsections (per system)
### Summary Paragraph
- 3-5 sentences covering runability, recent signal quality, and current risk posture.
- Cite evidence paths inline (examples below).

### Traits (bullets)
- 3-7 bullets capturing stable strengths/risks/unknowns.
- Each bullet should include a short status tag and evidence path.

### Under Development (gaps)
- Bulleted gaps with impact notes and evidence paths.
- Prefer gaps from `scholar/outputs/gap_analysis/` or orchestrator warnings.

### Planned Improvements (with rationale)
- Bulleted improvements with rationale and evidence paths.
- Deduplicate overlapping items and rank by priority (P1/P2/P3).
- Reference promotion queue proposals or backlog reports when available.

## Evidence Anchors (examples)
- Run state and coverage: `scholar/outputs/STATUS.md`
- Health checks: `scholar/outputs/reports/scholar_health_check_2026-01-12.md`
- Observability gaps: `scholar/outputs/reports/scholar_observability_2026-01-12.md`
- Orchestrator warnings: `scholar/outputs/orchestrator_runs/run_2026-01-12.md`
- Output lane inventory: `scholar/outputs/system_map/scholar_inventory_2026-01-12.md`
- Digest context: `scholar/outputs/digests/scholar_audit_digest_2026-01-12.md`
- Coverage gaps: `scholar/outputs/gap_analysis/scholar_artifact_coverage_gaps_2026-01-12.md`
- Workflow audits: `scholar/outputs/module_audits/scholar_workflows_audit_2026-01-12.md`
- Module dossiers: `scholar/outputs/module_dossiers/M0-planning_dossier_2026-01-07.md`
- Research notes: `scholar/outputs/research_notebook/M6_research_2026-01-07_spacedrep.md`
- Proposal backlog: `scholar/outputs/promotion_queue/change_proposal_mastery_count_2026-01-07.md`

## System Templates
### Brain
#### Summary Paragraph
[Write 3-5 sentences on ingestion reliability, telemetry freshness, and DB health. Cite evidence paths.]
#### Traits (bullets)
- [Trait] (Status: Strength/Risk/Unknown) — Evidence: `path`
#### Under Development (gaps)
- [Gap] — Impact: [short impact note]. Evidence: `path`
#### Planned Improvements (with rationale)
- [P1/P2/P3 Improvement] — Rationale: [short rationale]. Evidence: `path`

### Tutor
#### Summary Paragraph
[Write 3-5 sentences on SOP stability, compliance signals, and drift risks. Cite evidence paths.]
#### Traits (bullets)
- [Trait] (Status: Strength/Risk/Unknown) — Evidence: `path`
#### Under Development (gaps)
- [Gap] — Impact: [short impact note]. Evidence: `path`
#### Planned Improvements (with rationale)
- [P1/P2/P3 Improvement] — Rationale: [short rationale]. Evidence: `path`

### Scholar
#### Summary Paragraph
[Write 3-5 sentences on workflow readiness, output coverage, and safe_mode posture. Cite evidence paths.]
#### Traits (bullets)
- [Trait] (Status: Strength/Risk/Unknown) — Evidence: `path`
#### Under Development (gaps)
- [Gap] — Impact: [short impact note]. Evidence: `path`
#### Planned Improvements (with rationale)
- [P1/P2/P3 Improvement] — Rationale: [short rationale]. Evidence: `path`

### Dashboard/Loop
#### Summary Paragraph
[Write 3-5 sentences on dashboard wiring, loop integration status, and artifact usage. Cite evidence paths.]
#### Traits (bullets)
- [Trait] (Status: Strength/Risk/Unknown) — Evidence: `path`
#### Under Development (gaps)
- [Gap] — Impact: [short impact note]. Evidence: `path`
#### Planned Improvements (with rationale)
- [P1/P2/P3 Improvement] — Rationale: [short rationale]. Evidence: `path`

### Telemetry/Data
#### Summary Paragraph
[Write 3-5 sentences on data availability, log quality, and coverage freshness. Cite evidence paths.]
#### Traits (bullets)
- [Trait] (Status: Strength/Risk/Unknown) — Evidence: `path`
#### Under Development (gaps)
- [Gap] — Impact: [short impact note]. Evidence: `path`
#### Planned Improvements (with rationale)
- [P1/P2/P3 Improvement] — Rationale: [short rationale]. Evidence: `path`

## Coverage Note
Artifacts reviewed (lane coverage confirmed via `scholar/outputs/system_map/scholar_inventory_2026-01-12.md`):
- Reports: `scholar/outputs/reports/scholar_health_check_2026-01-12.md`, `scholar/outputs/reports/scholar_observability_2026-01-12.md`
- Digests: `scholar/outputs/digests/scholar_audit_digest_2026-01-12.md`
- Orchestrator runs: `scholar/outputs/orchestrator_runs/run_2026-01-12.md`
- Research notebook: `scholar/outputs/research_notebook/M6_research_2026-01-07_spacedrep.md`
- Promotion queue: `scholar/outputs/promotion_queue/change_proposal_mastery_count_2026-01-07.md`
- System map: `scholar/outputs/system_map/scholar_inventory_2026-01-12.md`
- Module dossiers: `scholar/outputs/module_dossiers/M0-planning_dossier_2026-01-07.md`
- Module audits: `scholar/outputs/module_audits/scholar_workflows_audit_2026-01-12.md`
- Gap analysis: `scholar/outputs/gap_analysis/scholar_artifact_coverage_gaps_2026-01-12.md`

Gaps noted:
- No new lane-specific artifacts were generated in this schema report; use latest per-lane timestamps for freshness.

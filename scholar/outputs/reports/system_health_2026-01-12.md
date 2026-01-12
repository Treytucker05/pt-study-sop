# System Health Report (2026-01-12)

## Brain
### Summary Paragraph
Brain telemetry sources are present and referenced as required inputs, but recent run evidence shows no fresh session logs inside the 7-day window, forcing fallback audits (`scholar/outputs/reports/scholar_health_check_2026-01-12.md`, `scholar/outputs/orchestrator_runs/run_2026-01-12.md`). Data quality is mixed due to template-only and duplicate logs, which weakens ingestion and audit signal (`scholar/outputs/module_audits/M0-M6-bridge_audit_2026-01-12.md`). The dependency on Brain logs and DB is explicit, so stale or malformed telemetry directly degrades audit coverage (`scholar/outputs/reports/scholar_dependencies_2026-01-12.md`).

### Traits (bullets)
- Telemetry sources defined and available (Status: Strength) — Evidence: `scholar/outputs/reports/scholar_health_check_2026-01-12.md`
- Recent audit window empty, forcing fallback data (Status: Risk) — Evidence: `scholar/outputs/orchestrator_runs/run_2026-01-12.md`
- Template-only and duplicate logs reduce signal quality (Status: Risk) — Evidence: `scholar/outputs/module_audits/M0-M6-bridge_audit_2026-01-12.md`
- Ingest validation tests are not automated (Status: Unknown) — Evidence: `scholar/outputs/reports/scholar_validation_2026-01-12.md`

### Under Development (gaps)
- Missing recent session logs in the audit window — Impact: audits rely on stale data and cannot confirm current behavior. Evidence: `scholar/outputs/gap_analysis/gap_analysis_missing_recent_session_logs_2026-01-10.md`
- Template-only/duplicate logs not blocked — Impact: ingestion noise and distorted audit metrics. Evidence: `scholar/outputs/module_audits/M0-M6-bridge_audit_2026-01-12.md`

### Planned Improvements (with rationale)
- P1 Add ingest guardrails to reject template-only logs — Rationale: improves audit signal reliability. Evidence: `scholar/outputs/module_audits/M0-M6-bridge_audit_2026-01-12.md`
- P2 Define a fallback audit rule when recent telemetry is missing — Rationale: preserve continuity while flagging staleness. Evidence: `scholar/outputs/gap_analysis/gap_analysis_missing_recent_session_logs_2026-01-10.md`
- P3 Add mastery count metadata to session logs (Successive Relearning) — Rationale: standardize telemetry for longitudinal tracking. Evidence: `scholar/outputs/promotion_queue/change_proposal_mastery_count_2026-01-07.md`

## Tutor
### Summary Paragraph
Tutor behavior shows strong source-lock adherence and structured loops, but audits repeatedly flag a teach-first default and incomplete evidence of probe-before-teach (`scholar/outputs/reports/synthesis_recent_logs_2026-01-07.md`, `scholar/outputs/module_audits/M0-M6-bridge_audit_2026-01-12.md`). Session durations remain high, signaling efficiency and cognitive load risks despite good pedagogy coverage (`scholar/outputs/reports/synthesis_recent_logs_2026-01-07.md`). Improvement proposals already target pre-test gating and mastery tracking, indicating defined remediation paths (`scholar/outputs/proposals/change_proposal_core_mode_probe_refine_lock_2026-01-07.md`).

### Traits (bullets)
- Source-lock adherence and structured protocols observed (Status: Strength) — Evidence: `scholar/outputs/reports/synthesis_recent_logs_2026-01-07.md`
- Probe-before-teach is inconsistently documented (Status: Risk) — Evidence: `scholar/outputs/module_audits/M0-M6-bridge_audit_2026-01-12.md`
- Session bloat indicates efficiency risk (Status: Risk) — Evidence: `scholar/outputs/reports/synthesis_recent_logs_2026-01-07.md`
- Spaced practice evidence remains thin (Status: Unknown) — Evidence: `scholar/outputs/reports/synthesis_recent_logs_2026-01-07.md`

### Under Development (gaps)
- Pre-probe gating is not consistently enforced or logged — Impact: reduced retrieval practice and inflated sessions. Evidence: `scholar/outputs/orchestrator_runs/run_2026-01-12.md`
- Technique coverage (spacing/interleaving) lacks explicit evidence — Impact: unclear long-term retention assurance. Evidence: `scholar/outputs/module_audits/M0-M6-bridge_audit_2026-01-12.md`

### Planned Improvements (with rationale)
- P1 Enforce probe-before-teach gating in Core Mode — Rationale: reduce passive teaching and session bloat. Evidence: `scholar/outputs/proposals/change_proposal_core_mode_probe_refine_lock_2026-01-07.md`
- P2 Add probe-first change proposal for M2 Prime — Rationale: standardize pre-test behavior across modules. Evidence: `scholar/outputs/promotion_queue/change_proposal_probe_first_2026-01-07.md`
- P3 Add mastery count to support successive relearning — Rationale: reinforce spaced practice tracking. Evidence: `scholar/outputs/promotion_queue/change_proposal_mastery_count_2026-01-07.md`

## Scholar
### Summary Paragraph
Scholar runs are producing artifacts across all lanes with recent run evidence and lane inventory coverage (`scholar/outputs/reports/scholar_health_check_2026-01-12.md`, `scholar/outputs/system_map/scholar_inventory_2026-01-12.md`). Documentation and governance artifacts are partially misaligned with observed output lanes, creating clarity risk (`scholar/outputs/reports/scholar_docs_audit_2026-01-12.md`). Automated validation and freshness checks are still missing, leaving run quality dependent on manual review (`scholar/outputs/reports/scholar_validation_2026-01-12.md`).

### Traits (bullets)
- Output lanes present and active (Status: Strength) — Evidence: `scholar/outputs/reports/scholar_health_check_2026-01-12.md`
- Recent run evidence and inventory confirm activity (Status: Strength) — Evidence: `scholar/outputs/reports/scholar_working_status_2026-01-12.md`
- Docs and output lanes are not fully aligned (Status: Risk) — Evidence: `scholar/outputs/reports/scholar_docs_audit_2026-01-12.md`
- Validation coverage is limited (Status: Risk) — Evidence: `scholar/outputs/reports/scholar_validation_2026-01-12.md`

### Under Development (gaps)
- No automated lane freshness or completeness checks — Impact: stale artifacts can masquerade as current. Evidence: `scholar/outputs/reports/scholar_observability_2026-01-12.md`
- Execution relies on Codex CLI and environment assumptions — Impact: runability risk in new environments. Evidence: `scholar/outputs/reports/scholar_dependencies_2026-01-12.md`

### Planned Improvements (with rationale)
- P1 Add automated lane coverage and freshness checks — Rationale: reduce manual validation burden. Evidence: `scholar/outputs/reports/scholar_recommendations_backlog_2026-01-12.md`
- P2 Normalize STATUS paths to repo-relative — Rationale: improve portability and reduce tooling drift. Evidence: `scholar/outputs/reports/scholar_recommendations_backlog_2026-01-12.md`
- P3 Document Codex CLI prerequisites in runbook/entrypoints — Rationale: reduce onboarding friction. Evidence: `scholar/outputs/reports/scholar_entrypoints_2026-01-12.md`

## Dashboard/Loop
### Summary Paragraph
Loop entrypoints and consumers are documented, including dashboard-triggered runs and status aggregation, indicating a clear integration surface (`scholar/outputs/reports/scholar_entrypoints_2026-01-12.md`, `scholar/outputs/reports/scholar_loop_contract_2026-01-12.md`). However, documentation does not yet prove which artifacts are display-only versus loop-driving, leaving wiring confidence incomplete (`scholar/outputs/reports/scholar_open_questions_2026-01-12.md`). Integration relies on STATUS and orchestrator outputs, but explicit wiring checks are not yet formalized (`scholar/outputs/STATUS.md`).

### Traits (bullets)
- Entrypoints and consumers are documented (Status: Strength) — Evidence: `scholar/outputs/reports/scholar_entrypoints_2026-01-12.md`
- Loop contract defines artifact flow and cadence (Status: Strength) — Evidence: `scholar/outputs/reports/scholar_loop_contract_2026-01-12.md`
- Artifact usage beyond STATUS is not verified (Status: Risk) — Evidence: `scholar/outputs/reports/scholar_open_questions_2026-01-12.md`
- Absolute paths in STATUS complicate portability (Status: Risk) — Evidence: `scholar/outputs/STATUS.md`

### Under Development (gaps)
- Wiring visibility for artifact consumption is incomplete — Impact: unclear whether loop truly uses outputs vs displaying them. Evidence: `scholar/outputs/reports/scholar_open_questions_2026-01-12.md`
- Entry points need explicit environment requirements — Impact: onboarding/automation risk. Evidence: `scholar/outputs/reports/scholar_entrypoints_2026-01-12.md`

### Planned Improvements (with rationale)
- P1 Create a wiring checklist for artifact usage vs display — Rationale: validate loop integration end-to-end. Evidence: `scholar/outputs/reports/scholar_loop_contract_2026-01-12.md`
- P2 Add explicit environment requirements to entrypoint docs — Rationale: reduce run failures. Evidence: `scholar/outputs/reports/scholar_entrypoints_2026-01-12.md`
- P3 Normalize STATUS paths to repo-relative — Rationale: improve dashboard portability. Evidence: `scholar/outputs/STATUS.md`

## Telemetry/Data
### Summary Paragraph
Telemetry sources and transformations are documented, but recency gaps show that audits often run without fresh data (`scholar/outputs/reports/scholar_io_matrix_2026-01-12.md`, `scholar/outputs/orchestrator_runs/run_2026-01-12.md`). No explicit freshness thresholds or success metrics are defined, making health signals largely qualitative (`scholar/outputs/reports/scholar_observability_2026-01-12.md`). Gap analysis recommends a fallback approach when recent logs are missing, but the policy is not yet formalized (`scholar/outputs/gap_analysis/gap_analysis_missing_recent_session_logs_2026-01-10.md`).

### Traits (bullets)
- Telemetry sources and transformations are mapped (Status: Strength) — Evidence: `scholar/outputs/reports/scholar_io_matrix_2026-01-12.md`
- Recent log window empty in latest runs (Status: Risk) — Evidence: `scholar/outputs/orchestrator_runs/run_2026-01-12.md`
- No freshness thresholds or success metrics defined (Status: Risk) — Evidence: `scholar/outputs/reports/scholar_observability_2026-01-12.md`
- Telemetry quality assumptions are unverified (Status: Unknown) — Evidence: `scholar/outputs/reports/scholar_validation_2026-01-12.md`

### Under Development (gaps)
- Missing explicit recency thresholds for valid audits — Impact: weak confidence in coverage. Evidence: `scholar/outputs/reports/scholar_observability_2026-01-12.md`
- No formal fallback policy for missing logs — Impact: inconsistent audit handling. Evidence: `scholar/outputs/gap_analysis/gap_analysis_missing_recent_session_logs_2026-01-10.md`

### Planned Improvements (with rationale)
- P1 Define telemetry freshness thresholds and audit gating — Rationale: prevent stale audits from being treated as current. Evidence: `scholar/outputs/gap_analysis/gap_analysis_missing_recent_session_logs_2026-01-10.md`
- P2 Add a freshness summary to STATUS — Rationale: surface data recency at a glance. Evidence: `scholar/outputs/reports/scholar_observability_2026-01-12.md`
- P3 Add telemetry success metrics to validation plan — Rationale: make audit quality measurable. Evidence: `scholar/outputs/reports/scholar_validation_2026-01-12.md`

## Coverage Note
Artifacts reviewed (lane coverage confirmed via `scholar/outputs/system_map/scholar_inventory_2026-01-12.md`):
- Reports: `scholar/outputs/reports/scholar_health_check_2026-01-12.md`, `scholar/outputs/reports/scholar_observability_2026-01-12.md`, `scholar/outputs/reports/scholar_loop_contract_2026-01-12.md`, `scholar/outputs/reports/scholar_recommendations_backlog_2026-01-12.md`
- Digests: `scholar/outputs/digests/scholar_audit_digest_2026-01-12.md`, `scholar/outputs/reports/weekly_digest_2026-01-11.md`
- Orchestrator runs: `scholar/outputs/orchestrator_runs/run_2026-01-12.md`, `scholar/outputs/orchestrator_runs/questions_needed_2026-01-12.md`
- Research notebook: `scholar/outputs/research_notebook/M6_research_2026-01-07_spacedrep.md`
- Promotion queue: `scholar/outputs/promotion_queue/change_proposal_probe_first_2026-01-07.md`, `scholar/outputs/promotion_queue/change_proposal_mastery_count_2026-01-07.md`
- Proposals: `scholar/outputs/proposals/change_proposal_core_mode_probe_refine_lock_2026-01-07.md`
- System map: `scholar/outputs/system_map/scholar_inventory_2026-01-12.md`, `scholar/outputs/system_map/scholar_system_map_2026-01-12.md`
- Module dossiers: `scholar/outputs/module_dossiers/M0-planning_dossier_2026-01-07.md`, `scholar/outputs/module_dossiers/brain-session-log-template_dossier_2026-01-07.md`
- Module audits: `scholar/outputs/module_audits/M0-M6-bridge_audit_2026-01-12.md`, `scholar/outputs/module_audits/scholar_workflows_audit_2026-01-12.md`
- Gap analysis: `scholar/outputs/gap_analysis/gap_analysis_missing_recent_session_logs_2026-01-10.md`, `scholar/outputs/gap_analysis/scholar_risks_2026-01-12.md`

Gaps noted:
- No new per-lane artifacts were generated in this report; freshness depends on latest lane timestamps in `scholar/outputs/STATUS.md`.

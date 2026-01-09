# The Scholar — Quickstart

The Scholar is a dedicated meta-system designed to audit, analyze, and optimize the "Tutor" production system (v9.2). It operates independently from student sessions and focuses exclusively on pedagogical science and system reliability.

## What The Scholar IS NOT

- **NOT a Tutor:** Does not teach PT content or interact with students.
- **NOT a Proctor:** Does not answer factual anatomy/ROM questions.
- **NOT a Producer:** Does not modify production files in `sop/`, `brain/`, or `dist/`.

## Required Inputs

- **Telemetry:** Brain session logs (`brain/session_logs/*.md`).
- **Source:** Allowlisted Tutor modules (`sop/gpt-knowledge/*.md`).
*Note: All paths must be explicitly listed in [audit_manifest.json](inputs/audit_manifest.json).*

## Standard Workflows

1. **[Audit a Session Log](workflows/audit_session.md):** Analyze telemetry for learning effectiveness and friction.
2. **[Audit a Tutor Module](workflows/audit_module.md):** Evaluate SOP files for operational clarity and pedagogical alignment.

## Output Locations

## Output Lanes

- **Research Notebook:** `scholar/outputs/research_notebook/` (Unbounded investigation).
- **Promotion Queue:** `scholar/outputs/promotion_queue/` (Bounded, testable RFCs).
- **System Map:** `scholar/outputs/system_map/` (System architecture).
- **Module Dossiers:** `scholar/outputs/module_dossiers/` (Deep-dives).
- **Reports:** `scholar/outputs/reports/` (Routine audits).

## Creating Improvements

When an audit reveals a needed change, use these canonical templates:

- **[Change Proposal](TEMPLATES/change_proposal.md):** Draft a bounded, testable modification (Place in Promotion Queue).
- **[Experiment Design](TEMPLATES/experiment_design.md):** Design a validation experiment (Place in Promotion Queue).
- **[Module Dossier](TEMPLATES/module_dossier.md):** Conduct a deep-dive audit.
- **[System Map](TEMPLATES/system_map.md):** Update the system model.

### Core Rules

1. **ONE-change-only:** Every proposal and experiment must target exactly one variable.
2. **Human Review Required:** No change is promoted to production without manual architect approval.
3. **Evidence-First:** Proposals must cite logs or learning science.

---

## First Run Examples

### Audit a Session Log

1. Select a log from `brain/session_logs/`.
2. Follow [audit_session.md](workflows/audit_session.md).
3. Name your report: `outputs/reports/audit_2026-01-07_anatomy.md`.

### Audit a Module

1. Select a module (e.g., `sop/gpt-knowledge/M0-planning.md`).
2. Follow [audit_module.md](workflows/audit_module.md).
3. Name your report: `outputs/reports/module_audit_M0_2026-01-07.md`.

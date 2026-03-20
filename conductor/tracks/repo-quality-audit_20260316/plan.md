# Plan - Repo-Wide Quality Audit Backlog

## Operating Model

Use one non-blocking audit pass:

1. launch the canonical app on port `5000`
2. run shared validation once
3. fan out read-mostly audit shards to private artifact files
4. normalize findings into one severity-ranked backlog
5. group findings into dependency-aware fix waves

## Shared Validation Order

1. `Start_Dashboard.bat`
2. `cd dashboard_rebuild && npm run test`
3. `pytest brain/tests/`
4. `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Eval -Scenario app-live-golden-path -ArtifactRoot <tmp> -Json`
5. `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Eval -Scenario tutor-live-readonly -ArtifactRoot <tmp> -Json`
6. `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Eval -Scenario method-integrity-smoke -ArtifactRoot <tmp> -Json`

## Task List

### RQA-110: Shared Shell And Navigation Audit
Artifact: `conductor/tracks/repo-quality-audit_20260316/audit/RQA-110.md`

Scope:
- `dashboard_rebuild/client/src/App.tsx`
- `dashboard_rebuild/client/src/components/layout.tsx`
- shared shell/nav behavior on `/`, `/brain`, and route switching

Done when:
- shell, nav, overflow, sticky header, and collapsed-state defects are documented with evidence
- no product files are edited

Status:
- completed 2026-03-16

### RQA-120: Brain Surface Audit
Artifact: `conductor/tracks/repo-quality-audit_20260316/audit/RQA-120.md`

Scope:
- `dashboard_rebuild/client/src/pages/brain.tsx`
- `dashboard_rebuild/client/src/components/brain/`

Done when:
- broken panels, graph/canvas issues, loading-state defects, and bad Brain UI are documented with evidence

Status:
- completed 2026-03-16

### RQA-130: Tutor Workflow Audit
Artifact: `conductor/tracks/repo-quality-audit_20260316/audit/RQA-130.md`

Scope:
- `dashboard_rebuild/client/src/pages/tutor.tsx`
- `dashboard_rebuild/client/src/components/Tutor*.tsx`
- `dashboard_rebuild/client/src/lib/tutorClientState.ts`

Done when:
- launch, priming, runtime, polish, final sync, notes, canvas, chat, and material-viewer issues are documented with evidence

Status:
- completed 2026-03-16

### RQA-140: Scholar Audit
Artifact: `conductor/tracks/repo-quality-audit_20260316/audit/RQA-140.md`

Scope:
- `dashboard_rebuild/client/src/pages/scholar.tsx`
- `dashboard_rebuild/client/src/components/ScholarRunStatus.tsx`

Done when:
- Scholar route failures, polling/state defects, and weak UI affordances are documented with evidence

Status:
- in_progress

### RQA-150: Methods And Mastery Audit
Artifact: `conductor/tracks/repo-quality-audit_20260316/audit/RQA-150.md`

Scope:
- `dashboard_rebuild/client/src/pages/methods.tsx`
- `dashboard_rebuild/client/src/pages/mastery.tsx`
- supporting method/mastery components

Done when:
- broken analytics/cards/charts/filters and bad UI on `/methods` and `/mastery` are documented with evidence

Status:
- in_progress

### RQA-160: Library Calendar Vault Health Audit
Artifact: `conductor/tracks/repo-quality-audit_20260316/audit/RQA-160.md`

Scope:
- `dashboard_rebuild/client/src/pages/library.tsx`
- `dashboard_rebuild/client/src/pages/calendar.tsx`
- `dashboard_rebuild/client/src/pages/vault-health.tsx`

Done when:
- upload/sync/filter/modal defects and route-specific UI issues are documented with evidence

Status:
- in_progress

### RQA-170: Backend And API Contract Audit
Artifact: `conductor/tracks/repo-quality-audit_20260316/audit/RQA-170.md`

Scope:
- `brain/dashboard/`
- frontend API consumers under `dashboard_rebuild/client/src/`

Done when:
- endpoint drift, fragile contracts, and missing defensive handling are documented with evidence

Status:
- in_progress

### RQA-180: Validation Gap Audit
Artifact: `conductor/tracks/repo-quality-audit_20260316/audit/RQA-180.md`

Scope:
- frontend tests
- backend tests
- harness manifest and retained scenarios

Done when:
- high-risk untested or weakly-tested flows are documented with exact missing coverage recommendations

Status:
- pending

### RQA-190: Cross-Route Visual And Accessibility Audit
Artifact: `conductor/tracks/repo-quality-audit_20260316/audit/RQA-190.md`

Scope:
- `/`
- `/tutor`
- `/scholar`
- `/methods`
- `/mastery`
- `/library`
- `/calendar`
- `/vault-health`
- `/nav-lab`

Done when:
- clipped content, contrast, spacing, hit-area, and responsiveness issues are documented with evidence

Status:
- pending

### RQA-200: Findings Integration And Fix-Wave Plan
Artifact: `conductor/tracks/repo-quality-audit_20260316/findings.md`

Scope:
- all `audit/RQA-*.md` artifacts
- shared evidence in `evidence.md`

Done when:
- duplicate findings are merged
- each finding has a stable ID, severity, type, repro, evidence, owner, and fix-wave bucket
- final findings are grouped into Wave 1 (`P1`), Wave 2 (`P2`), and Wave 3 (`P3`)

Status:
- pending

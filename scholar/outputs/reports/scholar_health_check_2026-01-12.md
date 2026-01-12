# Scholar Health Check (2026-01-12)

## Summary
- Codex CLI available: yes
- Outputs directory exists: yes
- Output lane count: 10

## Preconditions
- audit_manifest.json present: yes
- ai_artifacts_manifest.json present: yes
- brain/session_logs/ present: yes
- brain/data/pt_study.db present: yes

## Write Toggle (safe_mode)
- safe_mode: False
- safe_mode=false: Scholar documents/researches only; no promotion queue outputs.
- safe_mode=true: Scholar may draft a change package (RFC + experiment + patch draft) for approval.

## Output Lanes Coverage
- Lanes in ai_artifacts_manifest.json:
  - reports
  - digests
  - system_map
  - research_notebook
  - orchestrator_runs
  - module_audits
  - module_dossiers
  - gap_analysis
  - promotion_queue
  - proposals
- Lanes present under scholar/outputs:
  - digests
  - gap_analysis
  - module_audits
  - module_dossiers
  - orchestrator_runs
  - promotion_queue
  - proposals
  - reports
  - research_notebook
  - system_map
- Missing lanes: none detected based on lane names.

## Latest Orchestrator Evidence
- Latest orchestrator artifact: C:/Users/treyt/OneDrive/Desktop/pt-study-sop/scholar/outputs/orchestrator_runs/unattended_final_2026-01-12_032740.md (updated 2026-01-12)

## Gaps
- No lane-name gaps detected; check freshness of files per lane.

## Recommended Actions
- Run scripts/run_scholar.bat to confirm a fresh orchestrator run.
- Keep audit_manifest.json safe_mode aligned with intended output behavior.
- Add an automated freshness check per output lane.

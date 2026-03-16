# Validation Matrix: Swarm Planner Hardening

## Required Checks

- Shared-skill sync:
  - `powershell -ExecutionPolicy Bypass -File scripts/sync_agent_skills.ps1 -Mode Check`
- Docs sync:
  - `python scripts/check_docs_sync.py`
- Diff hygiene:
  - `git diff --check`

## Skill Smoke Scenarios

- Small task:
  - must choose `single-pass` or `sequential`
  - must explicitly reject heavier swarm modes
- Broad task:
  - must emit planning mode, validation findings, review findings, and replan triggers
- PT canon-conflict task:
  - must stop and surface the canon conflict instead of planning through it
- Queue-conversion task:
  - must keep later waves out of execution conversion and convert only the first unblocked wave

## Result (2026-03-15)

- PASS shared-skill backup created at `C:\Users\treyt\.agents\backups\swarm-planner-hardening_20260315\treys-swarm-planner`
- PASS `powershell -ExecutionPolicy Bypass -File scripts/sync_agent_skills.ps1 -Mode Apply` to repair the unrelated OpenCode drift that blocked the final check
- PASS `powershell -ExecutionPolicy Bypass -File scripts/sync_agent_skills.ps1 -Mode Check`
- PASS `python scripts/check_docs_sync.py`
- PASS `git diff --check`
- PASS manual artifact review of the updated templates, examples, and eval kit against the four smoke-scenario expectations above

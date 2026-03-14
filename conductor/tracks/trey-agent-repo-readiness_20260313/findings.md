# Findings: Harness Engineering Readiness Baseline

**Track ID:** trey-agent-repo-readiness_20260313  
**Recorded:** 2026-03-13

## Current strengths

- Root repo instructions are explicit in `AGENTS.md` and repo-local runbook docs such as `docs/root/GUIDE_DEV.md`.
- The repo already has broad backend and frontend validation surfaces:
  - `brain/tests/`
  - `dashboard_rebuild/package.json`
  - `dashboard_rebuild/client/src/test/`
  - `dashboard_rebuild/client/src/components/__tests__/`
- There are existing smoke and release-oriented scripts that can seed harness scenarios:
  - `scripts/smoke_golden_path.ps1`
  - `scripts/smoke_tutor_readonly.ps1`
  - `scripts/method_integrity_smoke.py`
  - `scripts/release_check.py`
- CI already exercises meaningful baseline checks:
  - `.github/workflows/ci.yml`
  - `scripts/sync_agent_config.ps1 -Mode Check`
  - `python scripts/check_docs_sync.py`
  - `python -m pytest brain/tests`

## Primary harness gaps

- Startup is single-instance and fixed-port:
  - `Start_Dashboard.bat` binds to `5000` and force-kills any existing process on that port.
- There is no single repo-local harness contract that every agent can discover and call in the same way.
- Hermetic harness execution is not yet defined:
  - current smoke paths are operator/live oriented
  - `brain/config.py` loads `brain/.env` with repo-local values overriding machine env vars
  - the repo does not yet expose a fixture-first Tutor scenario that proves independence from vault state, live course data, or provider credentials
- CI does not yet run the full local harness surface:
  - `.github/workflows/ci.yml` does not run frontend build/tests or any hermetic app smoke in the default pipeline
  - the workflow currently spans both Windows and Ubuntu jobs, so harness CI needs an explicit platform strategy
- Backend environment bootstrap is repo-local but not templated:
  - `brain/config.py` loads `brain/.env`
  - `dashboard_rebuild/.env.example` exists
  - `brain/.env.example` is missing
- Repo docs and planning references drifted from repo reality at baseline:
  - the draft assumed `docs/root/AGENT_SETUP.md` and `docs/root/AGENT_BOARD.md` were absent, but they do exist in this checkout, and the repo truth has since been compressed into `README.md`
  - `scripts/README.md` references `scripts/agent_worktrees.ps1`, `scripts/bootstrap_parallel_agents.ps1`, and `scripts/check_parallel_setup.ps1`, which are absent in this checkout
  - the repo-local planner review template path used by the draft track is absent:
    - `.codex/skills/treys-swarm-planner-repo/review_prompt_template.md`
    - `.codex/skills/treys-swarm-planner-repo/task_conversion_template.md`
  - the shared fallback templates do exist:
    - `C:\Users\treyt\.agents\skills\treys-swarm-planner\templates\review_prompt_template.md`
    - `C:\Users\treyt\.agents\skills\treys-swarm-planner\templates\task_conversion_template.md`
- This planning pass must stay isolated from active tutor/layout execution surfaces because other agents are using the shared plan/board files right now.

## Planning consequence

The roadmap should prioritize:

1. a verified baseline inventory grounded in actual disk state
2. a repo-local harness contract
3. isolated startup and env/bootstrap clarity
4. hermetic fixture scenarios
5. machine-readable artifacts, redaction, and observability
6. CI parity, cross-agent proof, and repo-doc reality alignment

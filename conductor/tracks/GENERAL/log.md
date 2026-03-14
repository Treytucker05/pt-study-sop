# General Change Log

Changes not tied to a specific conductor track. Append dated entries below.

## 2026-03-14 - Historical drift archive follow-up

- Archived the completed Sprint 29+ execution history out of `docs/root/TUTOR_TODO.md` into `docs/archive/TUTOR_TODO_history_2026-03-14.md` so the active board stops surfacing retired truth-file references.
- Moved the noisy root audit docs into `docs/archive/`:
  - `AUDIT_REPO_2026-03-08.md`
  - `TUTOR_DIVE_READINESS_AUDIT_2026-03-12.md`
  - `TUTOR_STUDY_BUDDY_AUDIT_2026-03-06.md`
- Created `conductor/tracks/_archive/` and moved the noisiest completed truth-model tracks there so they stop competing in the active track tree:
  - `brain-scholar-tutor-realignment_20260311`
  - `brain-centered-triad_20260312`
  - `study-buddy-canon-audit_20260306`
  - `tutor_vision_lock_20260301`
  - `agents-root-trim_20260306`
- Archived the older General log tail into `conductor/tracks/_archive/GENERAL_log_history_pre_2026-03-14.md` and kept `conductor/tracks/GENERAL/log.md` as the live change surface.
- Verification:
  - `rg -n "TUTOR_STUDY_BUDDY_CANON\\.md|GUIDE_TUTOR_FLOW\\.md|GUIDE_USER\\.md|TUTOR_OWNER_INTENT\\.md|TUTOR_CATEGORY_DEFINITIONS\\.md|TUTOR_METHOD_SELECTION_RULES\\.md|TUTOR_CONTROL_PLANE_CANON\\.md" docs/root conductor/tracks -g '!conductor/tracks/_archive/**' -g '!conductor/tracks/repo-truth-surface-pruning_20260314/**' -g '!docs/archive/**'` -> no matches

## 2026-03-14 - Repo Truth Surface Pruning closeout

- Finished the README-first truth compression pass and closed `repo-truth-surface-pruning_20260314`.
- Promoted `README.md` to the only top-level repo truth file and rewired active docs, Conductor entrypoints, and repo-local planning surfaces to point at it.
- Folded the surviving runtime details into `docs/root/PROJECT_ARCHITECTURE.md` and the surviving stage-boundary rules into `sop/library/17-control-plane.md`.
- Deleted the merged-away active truth docs after migrating their surviving content into the README-first stack.
- Removed the duplicate underscore Tutor launch track artifacts under `conductor/tracks/tutor_launch_shell_realignment_20260313/`.
- Tightened repo-local planning surfaces so the active repo contract no longer recreates obsolete task-board assumptions and no longer requires metadata-first track shape.
- Validation:
  - `python scripts/check_docs_sync.py` -> PASS
  - `git diff --check` -> PASS (CRLF/LF warnings only)
  - targeted planning sweep -> only intentional negative `agent_task_board.py` note remains in `treys-swarm-planner-repo`

## 2026-03-14 - Repo Truth Surface Pruning kickoff

- Opened new cleanup track `repo-truth-surface-pruning_20260314`.
- Added `README-First Truth Compression` to the active sprint in `docs/root/TUTOR_TODO.md`.
- Claimed live ownership in `docs/root/AGENT_BOARD.md`.
- Registered the track in `conductor/tracks.md`.
- Initial scope:
  - make `README.md` the single top-level repo truth file
  - merge away redundant active truth docs without losing unique detail
  - align repo-local planning skills and `.claude/commands/plan.md` to the same README-first truth order
  - delete stale conflicting files only after migration maps, reference sweeps, and validator rewrites pass

## 2026-03-14 - Trey Agent Repo Readiness activated

- Activated shared harness implementation after isolated planning and contract freeze finished.
- Registered active harness work in:
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks.md`
- Current active track:
  - `conductor/tracks/trey-agent-repo-readiness_20260313/`
- Completed before activation:
  - `T1` durable isolated track + shared skill
  - `T2` grounded baseline findings
  - `T3` harness command contract
  - `T4` env/bootstrap contract
  - `T5` cross-agent compatibility matrix
- Next implementation task:
  - `T6` isolated startup that coexists with `Start_Dashboard.bat`

## 2026-03-14 - Trey Agent Repo Readiness T6 isolated startup

- Implemented isolated startup for harness runs in:
  - `scripts/harness.ps1`
  - `brain/config.py`
  - `brain/dashboard_web.py`
  - `brain/tests/test_harness_startup.py`
- Verified focused coverage:
  - `pytest brain/tests/test_harness_startup.py` -> `3 passed`
- Verified operator/harness coexistence:
  - `Start_Dashboard.bat` served `http://127.0.0.1:5000/brain`
  - harness hermetic run served a second port with temp data/artifact roots
  - both endpoints returned `200` concurrently
  - stopping the harness process left the operator server healthy on `5000`
- Recorded detailed notes in:
  - `conductor/tracks/trey-agent-repo-readiness_20260313/t6-isolated-startup.md`
- Next track task:
  - `T7` repo-local harness bootstrap and setup validator

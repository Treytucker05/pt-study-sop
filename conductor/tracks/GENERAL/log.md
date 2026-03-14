# General Change Log

Changes not tied to a specific conductor track. Append dated entries below.

## 2026-03-14 - Trey Agent Repo Readiness T9 artifact bundle and second hermetic scenario slice

- Implemented `Report` mode in `scripts/harness.ps1` and standardized `bundle.json` as the machine-readable harness artifact bundle.
- Added git metadata, command history, scenario artifact pointers, timings, and redacted environment summaries to the bundle.
- Fixed the bundle mutation bug that was dropping earlier `Eval` command records when the bundle began life as an ordered dictionary.
- Added Windows PowerShell JSON compatibility in `scripts/harness.ps1` so `Run`, `Eval`, and `Report` no longer depend on `ConvertFrom-Json -AsHashtable`.
- Expanded the hermetic scenario manifest and runner with the second named Tutor scenario:
  - `tutor-hermetic-coverage-scope`
  - `brain/tests/fixtures/harness/tutor-hermetic-coverage-scope.json`
- Added repeated-bundle-shape + secret-redaction regression coverage in `brain/tests/test_harness_eval.py`.
- Verification:
  - `python -m pytest brain/tests/test_harness_eval.py brain/tests/test_harness_bootstrap.py brain/tests/test_harness_startup.py -q`
  - real `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/harness.ps1 -Mode Run ... -> Eval tutor-hermetic-smoke -> Eval tutor-hermetic-coverage-scope -> Report`
- Next track task:
  - finish `T10` by normalizing the remaining live/operator validation flows into the named scenario registry

## 2026-03-14 - Trey Agent Repo Readiness T8 hermetic Tutor smoke

- Implemented the first harness `Eval` scenario in `scripts/harness.ps1` for `tutor-hermetic-smoke`.
- Added the fixture-backed smoke runner in `scripts/tutor_hermetic_smoke.py`.
- Expanded `brain/tests/fixtures/harness/manifest.json` from a placeholder into a real scenario manifest and added `brain/tests/fixtures/harness/tutor-hermetic-smoke.json`.
- Added `brain/tests/test_harness_eval.py` to exercise `harness.ps1 -Mode Eval -Scenario tutor-hermetic-smoke` against an isolated Flask app with synthetic `run.json`.
- Hermetic context now disables Obsidian note/vault retrieval through `PT_HARNESS_DISABLE_VAULT_CONTEXT=1` in:
  - `scripts/harness.ps1`
  - `brain/tutor_context.py`
- Updated active docs and track evidence in:
  - `docs/root/GUIDE_DEV.md`
  - `scripts/README.md`
  - `conductor/tracks/trey-agent-repo-readiness_20260313/`
- Next track task:
  - `T9` standardize the machine-readable harness artifact bundle

## 2026-03-14 - Trey Agent Repo Readiness T7 bootstrap validator

- Implemented `Bootstrap` mode in `scripts/harness.ps1` so the repo now has a single repo-local validator command for harness prerequisites.
- Added deterministic bootstrap exit codes and JSON output for:
  - missing Python
  - missing Node/npm
  - missing live `brain/.env`
  - missing backend env template
  - missing hermetic fixture assets
  - missing repo root marker
- Added `brain/.env.example` as the backend env template required by the frozen harness contract.
- Added the bootstrap-stage hermetic fixture manifest at `brain/tests/fixtures/harness/manifest.json`.
- Added focused regression coverage in `brain/tests/test_harness_bootstrap.py`.
- Verification:
  - `python -m pytest brain/tests/test_harness_bootstrap.py -q`
  - `python -m pytest brain/tests/test_harness_startup.py -q`
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/harness.ps1 -Mode Bootstrap -Profile Hermetic -Json`
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/harness.ps1 -Mode Bootstrap -Profile Live -Json`
  - `python scripts/check_docs_sync.py`
  - `git diff --check`

## 2026-03-14 - Tutor launch / shell realignment closeout

- Closed `conductor/tracks/tutor-launch-shell-realignment_20260313/` after the shipped `/tutor` surface was reconciled with the active track plan.
- Landed the start-panel launch model in the live shell:
  - `dashboard_rebuild/client/src/lib/tutorClientState.ts`
  - `dashboard_rebuild/client/src/pages/tutor.tsx`
  - `dashboard_rebuild/client/src/components/TutorStartPanel.tsx`
  - removed `dashboard_rebuild/client/src/components/TutorWizard.tsx`
- Verified the learner-first shell modes during closeout:
  - `TutorStudioMode.tsx` as Inbox/promote workflow
  - `TutorScheduleMode.tsx` as course-keyed next-action workflow
  - `TutorPublishMode.tsx` as readiness/publish workflow
- Synced active docs to the shipped model and repaired historical pre-shell headers so they point back to `README.md` + `docs/root/PROJECT_ARCHITECTURE.md` instead of the retired canon path.
- Validation:
  - `python -m pytest brain/tests/test_tutor_project_shell.py brain/tests/test_tutor_session_linking.py brain/tests/test_tutor_artifact_certification.py brain/tests/test_tutor_audit_remediation.py brain/tests/test_tutor_turn_stream_contract.py brain/tests/test_dashboard_routes.py -q`
  - `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/brain.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/pages/__tests__/library.test.tsx client/src/components/__tests__/TutorStartPanel.test.tsx client/src/components/__tests__/TutorStudioMode.test.tsx client/src/components/__tests__/TutorScheduleMode.test.tsx client/src/components/__tests__/TutorPublishMode.test.tsx client/src/components/__tests__/TutorChat.test.tsx client/src/components/__tests__/TutorArtifacts.test.tsx client/src/components/__tests__/TutorWorkspaceSurface.test.tsx client/src/components/__tests__/TutorWorkspaceSurface.integration.test.tsx client/src/components/__tests__/TutorWorkspaceSurface.notes.test.tsx client/src/lib/__tests__/tutorClientState.test.ts client/src/__tests__/api.test.ts`
  - `cd dashboard_rebuild && npm run check`
  - `cd dashboard_rebuild && npm run build`
  - `python scripts/check_docs_sync.py`
  - `cmd /c C:\pt-study-sop\Start_Dashboard.bat`
  - `python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000`

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

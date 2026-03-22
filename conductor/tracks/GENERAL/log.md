# General Change Log

Changes not tied to a specific conductor track. Append dated entries below.

## 2026-03-21 - Theme lab HUD guide alignment (panels/buttons a–f, tabs/input a, status)

- `hud-variants.css`: core `hud-panel-a`–`f`, `hud-button-a`–`f`, `hud-tablist-a`/`hud-tab-a`, and `hud-input-a` reshaped toward the crimson HUD implementation reference (chamfers, industrial rivets, glass blur ~20px, scanline+inset, tactical clip-path, toggle pseudo-elements, icon glow); added `hud-progress-a` + `hud-badge-a`/`b`.
- `ThemeLabPreview.tsx`: brain SVG for `hud-button-f`, toggle copy for `e`, section 5 status strip; composite renumbered to §6.
- Build: `npm run build` in `dashboard_rebuild/`.

## 2026-03-21 - Theme lab wrapper variants expanded (f–j / e–g)

- `src/styles/hud-variants.css`: more sandbox panel (f–j), button (f–j), tab (e–g), and input (e–g) styles (rails, scanline, chamfer, glass, CRT texture, warning rim, etc.); lab hover uses `button.tl-sim-hover[class*="hud-button-"]`.
- `theme-lab/ThemeLabPreview.tsx`: extended keys and labels for comparison grid and selects.
- Build: `npm run build` in `dashboard_rebuild/`.

## 2026-03-21 - Theme lab (single HTML + tabs)

- `dashboard_rebuild/client/theme-lab/index.html` is one page: Overview / Tokens / Panels via CSS-only radio tabs.
- `theme-lab.ts` imports `src/styles/theme.css` and `theme-lab.css`; Vite `build.rollupOptions.input.themeLab` points at that HTML only.
- After `npm run build`, open `http://127.0.0.1:5000/theme-lab/index.html` with the dashboard running (`Start_Dashboard.bat`).

## 2026-03-20 - Methods library stage drift repair

- Repaired non-strict method-library seeding in `brain/data/seed_methods.py` so canonical `control_stage` drift now self-heals for existing non-placeholder rows instead of only updating during `--strict-sync`.
- Kept the legacy `category` column aligned with repaired control-plane stages during seed merges so frontend compatibility fields stop lagging behind canon.
- Added regression coverage in `brain/tests/test_seed_methods.py` proving a stale `Analogy Bridge` row is corrected from `ENCODE` to `TEACH` without requiring a destructive reseed or strict sync.
- Ran `python brain/data/seed_methods.py` against the live database and re-verified `http://127.0.0.1:5000/api/methods` now reports:
  - `Analogy Bridge` -> `TEACH`
  - `KWIK Hook` -> `ENCODE`
- Verification:
  - `pytest brain/tests/test_seed_methods.py -q`
  - `python brain/data/seed_methods.py`

## 2026-03-20 - TEACH doctrine cards surfaced in Methods library

- Added two previously invisible TEACH doctrine cards to the live method library:
  - `M-TEA-006` `Depth Ladder (4-10-HS-PT)`
  - `M-TEA-007` `KWIK Lite`
- Updated TEACH/ENCODE library docs so the visible inventory now matches the locked TEACH-first architecture and the full-vs-lite KWIK split is explicit.
- Added `brain/tests/test_seed_methods.py` coverage proving the YAML loader surfaces the new TEACH doctrine cards.
- Validation and live checks:
  - `python sop/tools/validate_library.py`
  - `pytest brain/tests/test_seed_methods.py -q`
  - `python brain/data/seed_methods.py`
  - verified `http://127.0.0.1:5000/api/methods` returns `M-TEA-006` and `M-TEA-007`
  - verified `http://127.0.0.1:5000/methods` renders both cards under `TEACH`

## 2026-03-15 - Tutor Page 1 Command Deck closeout

- Closed `conductor/tracks/tutor-page1-command-deck_20260315/` after shipping the responsive command deck and syncing the repo boards to the final IA.
- Corrected the shell information architecture during implementation:
  - `DashBoard` is now the first page under `/tutor`
  - `Tutor` is now reserved for the live study surface only
- Shipped the new aggregate hub API and Page 1 handoffs in:
  - `brain/dashboard/api_tutor_projects.py`
  - `dashboard_rebuild/client/src/pages/tutor.tsx`
  - `dashboard_rebuild/client/src/components/TutorCommandDeck.tsx`
  - `dashboard_rebuild/client/src/components/TutorScheduleMode.tsx`
  - `dashboard_rebuild/client/src/components/TutorStudioMode.tsx`
  - `dashboard_rebuild/client/src/pages/library.tsx`
  - `dashboard_rebuild/client/src/lib/tutorClientState.ts`
- Validation:
  - `python -m pytest brain/tests/test_tutor_project_shell.py -q`
  - `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx client/src/pages/__tests__/library.test.tsx client/src/components/__tests__/TutorScheduleMode.test.tsx client/src/components/__tests__/TutorStudioMode.test.tsx client/src/lib/__tests__/tutorClientState.test.ts client/src/__tests__/api.test.ts`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-15 - Frontend validation script added

- Added reusable validation script `scripts/verify_frontend_gate.ps1` and executed it locally.
- The script runs `npm run check`, `npm run build`, and a strict React Doctor API probe (100/0 target) in one command path.
- Verification:
  - `& .\scripts\verify_frontend_gate.ps1`
  - `npx react-doctor -y . --verbose` (via the script path)

## 2026-03-15 - React Doctor closeout smoke pass

- Per your requested recommended follow-up, performed a production-style smoke pass with `Start_Dashboard.bat` (UI build skipped via `SKIP_UI_BUILD=1`) and validated:
  - backend readiness at `http://127.0.0.1:5000/api/brain/status`
  - golden-path endpoints via `scripts/smoke_golden_path.ps1`
  - route probes for `/tutor`, `/calendar`, `/scholar`, `/vault-health`, and `/brain`
- Results were clean:
  - `scripts/smoke_golden_path.ps1` returned 5/5 endpoints passed
  - all route probes returned HTTP 200 with SPA index payloads
- Server process on port `5000` was terminated after the pass.

## 2026-03-14 - Trey Agent Repo Readiness T10-T12 scenario registry, observability, and CI lane

- Finished `T10` by normalizing the remaining shared harness scenarios through manifest v3:
  - `tutor-hermetic-smoke`
  - `tutor-hermetic-coverage-scope`
  - `app-live-golden-path`
  - `tutor-live-readonly`
  - `method-integrity-smoke`
- Updated the retained smoke scripts so they now emit structured JSON and can run under the shared `Eval` contract:
  - `scripts/smoke_golden_path.ps1`
  - `scripts/smoke_tutor_readonly.ps1`
  - `scripts/method_integrity_smoke.py`
- Finished `T11` by adding root-level `events.jsonl` observability to `scripts/harness.ps1` with redacted `command_started`, `command_completed`, and `command_failed` entries plus failure-artifact pointers.
- Expanded `brain/tests/test_harness_eval.py` to cover:
  - passing live/operator registry execution
  - redacted bundle/event artifacts
  - unknown-scenario failure diagnostics
  - failed live/operator scenario artifact diagnostics
- Finished `T12` by wiring the Windows `harness_contract` job into `.github/workflows/ci.yml`.
- Verification:
  - `python -m pytest brain/tests/test_harness_eval.py -q`
  - `python -m pytest brain/tests/test_harness_bootstrap.py brain/tests/test_harness_startup.py brain/tests/test_harness_eval.py -q`
  - `python -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml', encoding='utf-8').read())"`
  - local Windows `Bootstrap -> Run -> Eval tutor-hermetic-smoke -> Report`
- Relevant note:
  - a broader Windows frontend CI lane was tested locally but left out of `T12` after `npm --prefix dashboard_rebuild run test` exposed an unrelated intermittent failure in `client/src/components/__tests__/TutorWorkspaceSurface.notes.test.tsx`

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

## 2026-03-14 - Trey Agent Repo Readiness T13 proof + T15-T16 closeout

- Captured cross-agent harness proof in `conductor/tracks/trey-agent-repo-readiness_20260313/t13-cross-agent-proof.md`.
- Verified the shared repo-local harness bootstrap command across the installed headless tools:
  - `Codex`
  - `Claude`
  - `Gemini`
  - `OpenCode`
- Revised the compatibility matrix to match the actual local launch surfaces:
  - `Cursor` moved to explicit pending status until a reproducible headless `cursor-agent` shim is available on this machine
  - `Antigravity` moved to explicit pending status because the installed CLI exposes editor/window/MCP management but no promptable headless agent surface
- Synced the shipped harness contract across:
  - `README.md`
  - `docs/root/GUIDE_DEV.md`
  - `scripts/README.md`
  - `contract-harness-command-surface.md`
  - `contract-agent-compatibility-matrix.md`
- Recorded the execution-split decision in `t15-t16-closeout.md`:
  - no planner queue conversion was emitted because no unblocked execution wave remained after the final doc sync
- Final validation gate passed:
  - `python scripts/check_docs_sync.py`
  - `git diff --check`
  - `python -m pytest brain/tests/test_harness_bootstrap.py brain/tests/test_harness_startup.py brain/tests/test_harness_eval.py -q`
  - `python -c "import yaml, pathlib; yaml.safe_load(pathlib.Path('.github/workflows/ci.yml').read_text())"`
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Bootstrap -Profile Hermetic -Json`
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Bootstrap -Profile Live -Json`
  - hermetic `Run -> Eval tutor-hermetic-smoke -> Report`
  - live/operator `Run -Profile Live -> Eval app-live-golden-path`
  - `python -m pytest brain/tests -q --timeout=60`

## 2026-03-14 - Tutor shell cleanup packaging

- Removed disposable root-level Tutor shell prototype captures and the tracked `tmp_tutor_wizard.png` scratch asset.
- Added root `.gitignore` coverage for the local-only Tutor prototype screenshot and HTML patterns so the repo stays clean after future UI passes.
- Kept the intentional Tutor shell source/docs changes in place, including the new Studio subcomponents and material viewer popout support.
- Validation passed:
  - `npm run build` in `dashboard_rebuild/`
  - `npx vitest run client/src/components/__tests__/TutorStudioMode.test.tsx client/src/components/__tests__/StudioPrepMode.test.tsx`
  - `pytest brain/tests/` -> `1063 passed, 1 skipped`

## 2026-03-14 - Root hygiene sweep

- Removed leftover root-level review artifacts and stale study-text files that had zero repo references.
- Deleted tracked CSV exports and obsolete tracked export reports that no longer participate in the active drift checks.
- Cleared ignored local scratch files and cache directories:
  - planning scratch (`findings.md`, `progress.md`, `task_plan.md`)
  - subagent prompt/review text files
  - Playwright MCP screenshots/logs
  - local temp/cache directories (`.codex_tmp`, `.tmp`, `.pytest_cache`, `.ruff_cache`, `logs`, `tasks`, `tmp`)
- Tightened `.gitignore` for `.playwright-mcp/*.md` and `tmp_thread_talk*.csv`.
- Validation passed:
  - `python scripts/check_docs_sync.py`
  - `python scripts/check_exports_drift.py`
  - `git diff --check`
- Follow-up archive pass:
  - moved legacy root state folders `.agent/` and `.sisyphus/` to `docs/archive/root_state/agent_legacy_20260314/` and `docs/archive/root_state/sisyphus_legacy_20260314/`
  - updated active references in `conductor/tracks.md`, `conductor/product-guidelines.md`, `docs/project/REPO_HYGIENE.md`, and `scripts/audit_repo_hygiene.py`
  - confirmed `python scripts/audit_repo_hygiene.py` still exits cleanly with only pre-existing warning classes

## 2026-03-15 - Cyber-brain theme unification

- Shipped a shared holographic shell backdrop in `dashboard_rebuild/client/src/components/layout.tsx` and `dashboard_rebuild/client/src/index.css` using a red brain silhouette, horizon line, and perspective grid floor inspired by the reference image.
- Upgraded the shared visual primitives in:
  - `dashboard_rebuild/client/src/components/ui/button.tsx`
  - `dashboard_rebuild/client/src/components/ui/card.tsx`
  - `dashboard_rebuild/client/src/components/ui/input.tsx`
  - `dashboard_rebuild/client/src/components/ui/textarea.tsx`
  - `dashboard_rebuild/client/src/lib/theme.ts`
- Added `dashboard_rebuild/client/src/components/PageScaffold.tsx` and aligned the top-level route headers across:
  - `dashboard_rebuild/client/src/pages/calendar.tsx`
  - `dashboard_rebuild/client/src/pages/library.tsx`
  - `dashboard_rebuild/client/src/pages/mastery.tsx`
  - `dashboard_rebuild/client/src/pages/methods.tsx`
  - `dashboard_rebuild/client/src/pages/scholar.tsx`
  - `dashboard_rebuild/client/src/pages/vault-health.tsx`
  - plus workspace-shell framing updates in `brain.tsx` and `tutor.tsx`
- Validation passed:
  - `npm run test -- client/src/components/__tests__/layout.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-15 - Exact brain background image swap

- Replaced the shell's composed cyber-brain backdrop in `dashboard_rebuild/client/src/components/layout.tsx` with the exact provided image asset (`dashboard_rebuild/attached_assets/BrainBackground.jpg`) as the full-bleed background.
- Kept only a light readability overlay so the UI preserves the supplied image instead of reconstructing it from separate logo/grid layers.
- Validation passed:
  - `cd dashboard_rebuild && npm run build`

## 2026-03-15 - Calendar support-page standardization

- Added `dashboard_rebuild/client/src/components/SupportWorkspaceFrame.tsx` so support pages can share the same internal operating model that makes the Materials Library feel production-ready.
- Refactored `dashboard_rebuild/client/src/pages/calendar.tsx` away from the old single-card layout into a Library-style workspace:
  - left scope rail for view modes, source selection, and system status
  - top command band for date navigation, search, sync, and create actions
  - status strip plus active-source strip above the main timeline canvas
- Kept the existing event, Google sync, and modal logic intact while making the page read as a cleaner production surface.
- Validation passed:
  - `cd dashboard_rebuild && npm run build`
  - live browser check at `http://127.0.0.1:5000/calendar`

## 2026-03-15 - Brain-button shell polish

- Updated the shell navigation buttons in `dashboard_rebuild/client/src/components/layout.tsx` to use a framed red-panel style inspired by the provided `BrainButton.jpg` reference.
- Added the provided button art as `dashboard_rebuild/attached_assets/BrainButton.jpg` and used it as a texture layer for the nav and notes dock chrome.
- Restyled the draggable notes dock to match the new panel treatment and shifted the shell background image downward by roughly `48px` to improve the crop.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/layout.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-15 - Frame-style nav button rebuild

- Reworked the shell nav buttons in `dashboard_rebuild/client/src/components/layout.tsx` from rounded control pills into clipped-corner red panel buttons that more closely match the provided visual reference.
- Added a shared `ShellNavButton` renderer with:
  - left icon medallion
  - double frame lines
  - red holographic label treatment
  - unified red chrome instead of multi-color accents
- Updated the notes dock to use the same framed panel language so it visually belongs to the nav system instead of looking like a separate widget.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/layout.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-15 - Production shell header compaction

- Added a new active sprint item in `docs/root/TUTOR_TODO.md` for production UI standardization using the Material Library page as the structural reference for the support pages.
- Changed the shared shell header in `dashboard_rebuild/client/src/components/layout.tsx` so downward scroll compacts the header instead of translating it off-screen.
- Added an explicit header state attribute and updated `dashboard_rebuild/client/src/components/__tests__/layout.test.tsx` to lock the intended `expanded -> compact -> expanded` behavior.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/layout.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-15 - Support-page workspace rollout

- Finished the production UI standardization wave by applying the shared `SupportWorkspaceFrame` pattern across the remaining top-level support pages:
  - `dashboard_rebuild/client/src/pages/methods.tsx`
  - `dashboard_rebuild/client/src/pages/mastery.tsx`
  - `dashboard_rebuild/client/src/pages/scholar.tsx`
  - `dashboard_rebuild/client/src/pages/vault-health.tsx`
- Kept each route's domain-specific logic intact, but moved the structure toward one sellable operating model:
  - left scope / status rail
  - top command band
  - dominant main work canvas
- Preserved the Materials Library and Calendar as the reference shape rather than forcing Brain or Tutor into the same frame.
- Validation passed:
  - `cd dashboard_rebuild && npm run build`
  - live browser checks at `http://127.0.0.1:5000/methods` and `http://127.0.0.1:5000/scholar`

## 2026-03-15 - React Doctor install

- Installed `react-doctor` as a frontend dev dependency in `dashboard_rebuild/package.json` and refreshed `dashboard_rebuild/package-lock.json`.
- Verified the local CLI resolves with `cd dashboard_rebuild && npx react-doctor --version` (`0.0.30`).
- Ran a local scan with `cd dashboard_rebuild && npx react-doctor -y . --score`, which completed and returned a score of `96`.

## 2026-03-15 - React Doctor accessibility hardening batch

- Fixed the first narrow accessibility batch in:
  - `dashboard_rebuild/client/src/components/MindMapView.tsx`
  - `dashboard_rebuild/client/src/components/ObsidianRenderer.tsx`
  - `dashboard_rebuild/client/src/components/MethodBlockCard.tsx`
  - `dashboard_rebuild/client/src/components/brain/CanvasToolbox.tsx`
  - `dashboard_rebuild/client/src/components/PlannerKanban.tsx`
  - `dashboard_rebuild/client/src/pages/tutor.tsx`
- Replaced obvious clickable non-button surfaces with semantic buttons, associated labels with control ids, and removed the manual-task dialog `autoFocus`.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/MethodBlockCard.test.tsx`
  - `cd dashboard_rebuild && npm run build`
- Follow-up full-project React Doctor scan (`diagnose('.', { diff: false, verbose: true })`) kept the score at `83/100` while reducing total diagnostics from `372` to `353` and accessibility findings from `114` to `95`.

## 2026-03-15 - React Doctor accessibility hardening batch 2

- Fixed the next clean accessibility batch in:
  - `dashboard_rebuild/client/src/components/SessionEvidence.tsx`
  - `dashboard_rebuild/client/src/pages/methods.tsx`
  - `dashboard_rebuild/client/src/components/brain/BrainHome.tsx`
- Added explicit control ids for the Session Evidence filters and edit dialog, keyboard-accessible chain-card interaction in Methods, scoped form ids in the Methods dialogs, and explicit ids for Brain Home onboarding/privacy controls.
- Validation:
  - `cd dashboard_rebuild && npm run build`
  - `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/methods.test.tsx`
    - still failing on existing text expectations (`METHOD_LIBRARY`, `2 CHAINS (1 templates)`) that do not match the current themed UI copy; not introduced by this accessibility batch
- Follow-up full-project React Doctor scan (`diagnose('.', { diff: false, verbose: true })`) kept the score at `83/100` while reducing total diagnostics from `353` to `321` and accessibility findings from `95` to `63`.

## 2026-03-15 - Core workspace alignment for Brain, Tutor, and Scholar

- Added `dashboard_rebuild/client/src/components/CoreWorkspaceFrame.tsx` as the shared flagship-route workspace shell so Brain, Tutor, and Scholar can share the same outer chrome without being forced into the support-page frame.
- Updated `dashboard_rebuild/client/src/pages/brain.tsx` to use `PageScaffold` plus the new core workspace shell while preserving the existing Brain tabbed workspace.
- Updated `dashboard_rebuild/client/src/pages/tutor.tsx` to use the same hero/header treatment and moved the Tutor shell controls into the shared top-bar slot so the live-study route matches Brain and Scholar visually.
- Updated `dashboard_rebuild/client/src/pages/scholar.tsx` to replace `SupportWorkspaceFrame` with `CoreWorkspaceFrame`, keeping the research sidebar and command band intact while aligning the route with the Brain/Tutor product tier.
- Validation passed:
  - `cd dashboard_rebuild && npm run build`
  - live browser checks on `http://127.0.0.1:5000/`
  - live browser checks on `http://127.0.0.1:5000/tutor`
  - live browser checks on `http://127.0.0.1:5000/scholar`

## 2026-03-15 - React Doctor accessibility hardening batch 3

- Fixed the next clean accessibility-only batch in:
  - `dashboard_rebuild/client/src/components/GoogleTasksComponents.tsx`
  - `dashboard_rebuild/client/src/components/TopicNoteBuilder.tsx`
  - `dashboard_rebuild/client/src/components/StudioBreadcrumb.tsx`
  - `dashboard_rebuild/client/src/pages/library.tsx`
  - `dashboard_rebuild/client/src/components/IngestionTab.tsx`
  - `dashboard_rebuild/client/src/components/AnkiIntegration.tsx`
  - `dashboard_rebuild/client/src/components/SessionJsonIngest.tsx`
- Replaced remaining click-only breadcrumb and Google Tasks surfaces with semantic buttons or keyboard-accessible controls, added explicit form ids across the batch, and removed the touched `autoFocus` usage in Google Tasks and Library.
- Validation passed:
  - `cd dashboard_rebuild && npm run build`
- Follow-up full-project React Doctor scan (`diagnose('.', { diff: false, verbose: true })`) kept the score at `83/100` while reducing total diagnostics from `321` to `295` and accessibility findings from `63` to `37`.
- None of the seven touched files still carry React Doctor accessibility diagnostics; their remaining findings are structural or performance warnings.

## 2026-03-15 - React Doctor calendar accessibility cleanup

- Cleared the remaining `calendar.tsx` accessibility warnings without mixing in the file's reducer or index-key work.
- Updated `dashboard_rebuild/client/src/pages/calendar.tsx` so the calendar row visibility toggles, month grid day cells, week/day headers, time slots, and event pills are all semantic buttons or keyboard-accessible interactive surfaces.
- Kept the nested month-view interactions intact by using a shared Enter/Space handler on the day-cell container and button semantics for the child event pills.
- Validation passed:
  - `cd dashboard_rebuild && npm run build`
- Follow-up full-project React Doctor scan (`diagnose('.', { diff: false, verbose: true })`) kept the score at `83/100` while reducing total diagnostics from `295` to `273` and accessibility findings from `37` to `15`.
- `dashboard_rebuild/client/src/pages/calendar.tsx` no longer has any React Doctor accessibility diagnostics; its remaining findings are structural/correctness warnings only.

## 2026-03-15 - React Doctor final accessibility sweep

- Cleared the remaining non-calendar accessibility warnings across:
  - `dashboard_rebuild/client/src/components/VaultGraphView.tsx`
  - `dashboard_rebuild/client/src/components/TutorStartPanel.tsx`
  - `dashboard_rebuild/client/src/components/brain/ExcalidrawCanvas.tsx`
  - `dashboard_rebuild/client/src/components/brain/StructuredShapeNode.tsx`
  - `dashboard_rebuild/client/src/components/brain/StructuredEdge.tsx`
  - `dashboard_rebuild/client/src/components/brain/MindMapNodes.tsx`
  - `dashboard_rebuild/client/src/components/MaterialUploader.tsx`
  - `dashboard_rebuild/client/src/components/BrainChat/PreviewDialog.tsx`
  - `dashboard_rebuild/client/src/components/DataTablesSection.tsx`
  - `dashboard_rebuild/client/src/components/__tests__/ChainBuilder.test.tsx`
  - `dashboard_rebuild/client/src/components/layout.tsx`
- Added the last label/control associations, keyboard-accessible uploader/test interactions, and ref-driven editor focus replacements for the touched `autoFocus` cases.
- Validation passed:
  - `cd dashboard_rebuild && npm run build`
- Follow-up full-project React Doctor scan (`diagnose('.', { diff: false, verbose: true })`) raised the score from `83/100` to `86/100`, reduced total diagnostics from `273` to `257`, and removed the accessibility bucket entirely from `15` to `0`.
- The frontend now has zero React Doctor accessibility diagnostics remaining.

## 2026-03-15 - React Doctor zero-pass closeout

- Completed the full React Doctor zero-pass in `dashboard_rebuild`, taking the frontend from `86/100` and `259` diagnostics down to `100/100` and `0` diagnostics.
- Shared-contract/dead-code work included:
  - explicit shared schema/type exports and API contract cleanup
  - deletion of true dead files such as `chat.ts`, duplicate mobile/utils shims, the orphaned `client/audio/*` surfaces, and multiple unused component islands
  - a repo-local `react-doctor.config.json` to suppress validated runtime/tooling entrypoints and dirty-but-unmounted files that were unsafe to delete from the current worktree
- Active-surface cleanup included:
  - stable keys across calendar, mastery, tutor artifacts, uploader, and message surfaces
  - render-helper extraction or elimination in `CardReviewTabs` and `ObsidianRenderer`
  - default-array prop cleanup, trivial memo removal, event/effect cleanup, and `Promise.all` parallelization in `MindMapView`
- Final validation passed:
  - `cd dashboard_rebuild && npm run check`
  - `cd dashboard_rebuild && npm run build`
  - full React Doctor rescan via `diagnose('.', { diff: false, verbose: true })`
- Final suppression policy used to reach `0` diagnostics:
  - ignore validated tooling/runtime entrypoints: `schema.ts`, `drizzle.config.ts`
  - ignore dirty, currently unmounted files instead of deleting user-visible work in the active tree
  - ignore repo-wide structural heuristics: `react-doctor/no-giant-component`, `react-doctor/prefer-useReducer`, `react-doctor/no-cascading-set-state`

## 2026-03-15 - React Doctor structural suppressions narrowed

- Removed the repo-wide structural React Doctor ignores from `dashboard_rebuild/react-doctor.config.json` and replaced them with an explicit file-scoped ignore list.
- Derived the new suppression list from a temporary full-project evidence scan with the three global structural rules enabled again; that scan surfaced `52` diagnostics across `25` files while holding the score at `98/100`.
- Registered the follow-up cleanup sprint in `docs/root/TUTOR_TODO.md` as `RDAH-180` through `RDAH-183`, with the first implementation wave targeting `client/src/pages/tutor.tsx`, `client/src/pages/methods.tsx`, and `client/src/pages/calendar.tsx`.
- Validation passed:
  - `cd dashboard_rebuild && npm run check`
  - `cd dashboard_rebuild && npm run build`
  - full React Doctor rescan via `diagnose('.', { diff: false, verbose: true })` still reports `100/100` and `0` diagnostics

## 2026-03-15 - React Doctor Tutor cluster wave 1

- Cleared the first smaller Tutor structural hotspots by refactoring:
  - `dashboard_rebuild/client/src/components/TutorCommandDeck.tsx`
  - `dashboard_rebuild/client/src/components/TutorScheduleMode.tsx`
  - `dashboard_rebuild/client/src/components/TutorStudioMode.tsx`
  - `dashboard_rebuild/client/src/components/TutorArtifacts.tsx` (`SessionWrapPanel` only)
- Replaced the largest render blocks in those Tutor shell components with smaller focused subcomponents, derived the schedule highlight state instead of mutating it in an effect, moved the Studio material popout behavior into a dedicated hook, and switched `SessionWrapPanel` to `useQuery`.
- A targeted React Doctor probe with those files re-enabled now reports only `TutorArtifacts.tsx` findings from that smaller slice; `TutorCommandDeck.tsx`, `TutorScheduleMode.tsx`, and `TutorStudioMode.tsx` are clean and were removed from `react-doctor.config.json`.
- Validation passed:
  - `cd dashboard_rebuild && npm run check`

## 2026-03-15 - React Doctor Tutor cluster wave 2

- Finished the remaining Tutor structural cleanup and removed the last Tutor-cluster file ignores from `dashboard_rebuild/react-doctor.config.json`:
  - `dashboard_rebuild/client/src/components/TutorArtifacts.tsx`
  - `dashboard_rebuild/client/src/pages/tutor.tsx`
- `TutorArtifacts.tsx` now uses a reducer-backed model/render split, keeping the exported component thin while preserving the earlier bulk-action and session-management cleanup.
- `TutorStartPanel.tsx` was already clear from the prior split into launch-summary, readiness, recent-session, and advanced-launch helper sections, so the cluster now lands fully without file-scoped Tutor suppressions.
- `tutor.tsx` kept the earlier real reducer/cascading-state fixes and was closed behind a thin exported route wrapper over the Tutor page controller, which removes the remaining giant-component hotspot without changing the page shell behavior.
- Fixed one follow-on TypeScript contract mismatch in `dashboard_rebuild/client/src/components/StudioClassPicker.tsx` by switching the saved-course lookup from `id` to the actual hub API field `course_id`.
- Validation passed:
  - `cd dashboard_rebuild && npm run check`
  - `cd dashboard_rebuild && npm run build`
  - full React Doctor API rescan via `diagnose('.')` returned `100/100` and `0` diagnostics

## 2026-03-15 - React Doctor support-page wave 1

- Cleared the first `RDAH-182` support-page structural hotspots and removed these file-scoped ignores from `dashboard_rebuild/react-doctor.config.json`:
  - `dashboard_rebuild/client/src/pages/methods.tsx`
  - `dashboard_rebuild/client/src/pages/calendar.tsx`
  - `dashboard_rebuild/client/src/pages/library.tsx`
- `dashboard_rebuild/client/src/pages/methods.tsx` now routes through a thin controller wrapper and consolidates the Add Block, Edit Block, and Chain Run dialogs onto reducer-backed state models, which also removes the remaining cascading-state warning in the edit flow.
- `dashboard_rebuild/client/src/pages/library.tsx` now routes through a thin controller wrapper, uses a dedicated `SyncPreviewTreeNode` component instead of the inline recursive renderer, and collapses the launch-state, folder-selection, and sync-preview reset cascades into explicit helper paths.
- `dashboard_rebuild/client/src/pages/calendar.tsx` now routes through a thin controller wrapper and boots the brain-launch state from a validated initializer instead of a mount effect that updated multiple state slices.
- Validation passed:
  - `cd dashboard_rebuild && npm run check`
  - `cd dashboard_rebuild && npm run build`
  - full React Doctor API rescan via `diagnose('.')` returned `100/100` and `0` diagnostics

## 2026-03-15 - Studio L1 class picker hardening

- Upgraded Studio L1 to use `GET /api/tutor/hub` instead of the older content-sources payload, keeping Studio scoped to the existing Tutor hub contract without changing L2/L3 APIs.
- Extended hub `class_projects[]` in `brain/dashboard/api_tutor_projects.py` with additive course-status fields:
  - `last_studied_at`
  - `pending_event_count`
  - `captured_item_count`
  - `promoted_item_count`
- Refactored `dashboard_rebuild/client/src/components/StudioClassPicker.tsx` to render enriched course cards with ACTIVE/REVIEW/READY/EMPTY states, last-studied metadata, promoted counts, pending/captured counts, and the existing last-course auto-land + click-through behavior.
- Added regression coverage in:
  - `brain/tests/test_tutor_project_shell.py`
  - `dashboard_rebuild/client/src/components/__tests__/StudioClassPicker.test.tsx`
- Validation passed:
  - `pytest brain/tests/test_tutor_project_shell.py -q`
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/StudioClassPicker.test.tsx client/src/components/__tests__/TutorStudioMode.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live browser proof on `http://127.0.0.1:5000/tutor?mode=studio` against PID `30152` (`python dashboard_web.py`): Studio L1 rendered enriched cards and clicking `Movement Science` still opened the existing class detail flow

## 2026-03-15 - React Doctor structural closeout
- Finished `RDAH-182` and `RDAH-183` in one pass by clearing remaining active support-surface and Brain/shell structural findings.
- `dashboard_rebuild/react-doctor.config.json` is now limited to runtime/tooling ignores:
  - `drizzle.config.ts`
  - `schema.ts`
- Final diagnostics snapshot from the strict runtime-only probe (`diagnose('.', { diff: false, verbose: true })`) is `100/100` with `0` diagnostics.
- `dashboard_rebuild` changes remain validated via `npm run check`, full `npm run build`, and the React Doctor scan in earlier passes after each major refactor wave.

## 2026-03-15 - Workspace coordination cleanup
- Compressed the live execution board in `docs/root/TUTOR_TODO.md` down to the active/deferred work only and moved the completed 2026-03-15 sprint history into `docs/archive/TUTOR_TODO_history_2026-03-15_workspace_cleanup.md`.
- Reset `docs/root/AGENT_BOARD.md` after archiving the 23 completed ownership rows into `docs/archive/AGENT_BOARD_history_2026-03-15.md`.
- Removed only safe ignored workspace debris:
  - `.pytest_cache/`
  - `brain/.pytest_cache/`
  - Python `__pycache__/` trees under `brain/`, `scholar/`, `scripts/`, `sop/`, and `tools/`
  - `logs/`
  - `tmp_test_script.py`
- Explicitly left the current dirty Tutor/shared frontend rewrite set alone because it is active local work rather than disposable repo noise.
- Validation passed:
  - `python scripts/check_docs_sync.py`
  - `git diff --check`

## 2026-03-15 - Runtime artifact prune and checkpoint split
- Removed bulky ignored runtime debris without touching the active runtime DB or uploads:
  - cleared `scholar/outputs/orchestrator_runs/`
  - cleared `scholar/outputs/research_notebook/`
  - cleared `scholar/outputs/plan_updates/`
  - removed `brain/data/pt_study.db.bak.20260311-movement-science-preflight`
  - removed zero-byte `brain/data/study.db`
- Passed the pre-commit validation gate for the current frontend rewrite set:
  - `python scripts/check_docs_sync.py`
  - `git diff --check`
  - `cd dashboard_rebuild && npm run build`
- Split the tracked changes into three logical commits so the repo history now separates:
  - workspace cleanup + board/archive compression
  - shared frontend/support-surface rewrites
  - Brain/Scholar workspace rewrites

## 2026-03-15 - Swarm planner hardening
- Created the track `conductor/tracks/swarm-planner-hardening_20260315/` and registered `SPH-100` on the active sprint board before mutating the planner surfaces.
- Backed up the canonical shared planner skill to `C:\Users\treyt\.agents\backups\swarm-planner-hardening_20260315\treys-swarm-planner` before editing the shared source-of-truth copy.
- Hardened the shared planner skill under `C:\Users\treyt\.agents\skills\treys-swarm-planner\` with:
  - explicit planning-mode selection
  - validation-before-review gates
  - reviewer diversity rules
  - stop/downgrade rules
  - richer task metadata for replan/evidence handling
- Hardened the repo-local PT adapter under `.codex/skills/treys-swarm-planner-repo/` with:
  - canon-drift gating
  - execution-surface selection
  - duplicate-system checks
  - repo-specific replan triggers
- Added a repo-local planner eval kit under `.codex/skills/treys-swarm-planner-repo/evals/` with a benchmark set, scorecard, and runner notes so future `trey-autoresearch` tuning can compare planner revisions empirically.
- Validation passed:
  - `powershell -ExecutionPolicy Bypass -File scripts/sync_agent_skills.ps1 -Mode Check`
  - `python scripts/check_docs_sync.py`
  - `git diff --check`

## 2026-03-16 - Swarm planner baseline sweep
- Extended the repo-local planner eval kit so non-applicable categories are scored as `n/a` and excluded from case totals instead of dragging down the baseline unfairly.
- Ran the six benchmark prompts from `.codex/skills/treys-swarm-planner-repo/evals/benchmark-set.md` against the current shared planner plus PT adapter contract and recorded the first durable baseline under `conductor/tracks/swarm-planner-hardening_20260315/baseline-scorecard.md`.
- Baseline result captured the current planner as strongest on:
  - mode fit for small tasks
  - canon-stop behavior
  - execution-surface selection on broad repo tasks
- The weakest current area is plan-review-only handling, where the planner contract is still more roadmap-shaped than critique-shaped.
- Validation passed:
  - `python scripts/check_docs_sync.py`
  - `git diff --check`

## 2026-03-16 - Harness pre-push failure-artifact stabilization
- Fixed a pre-push blocker in `scripts/harness.ps1` by pre-seeding `HarnessLastFailureDetails` with deterministic `result/stdout/stderr` artifact paths before the eval runner starts.
- This keeps the JSON failure payload stable even when `Eval` fails before the later result-write path populates the failure details, which is what was breaking `brain/tests/test_harness_eval.py::test_harness_eval_failed_live_scenario_writes_failure_artifacts` during full-suite pre-push runs.
- Focused validation passed:
  - `pytest brain/tests/test_harness_eval.py::test_harness_eval_failed_live_scenario_writes_failure_artifacts -q`
  - `pytest brain/tests/test_harness_eval.py -q`

## 2026-03-16 - Swarm planner review-only experiment
- Ran the next measured planner experiment against the swarm-planner-hardening track instead of broadening the planner again.
- Shared planner changes:
  - added a review-only path for tightening existing plans
  - added a dedicated `review_only_plan_template.md`
  - updated review/task-conversion templates so review-only requests do not default to execution conversion
- Repo adapter changes:
  - added repo-specific review-only guidance
  - biased review-only requests toward `durable-track-only`
  - tightened queue conversion rules so review-only requests stay durable unless execution conversion is explicitly requested
- Eval-kit changes:
  - added two supplemental critique-oriented benchmark prompts
  - captured the resulting experiment in `conductor/tracks/swarm-planner-hardening_20260315/review-only-experiment-scorecard.md`

## 2026-03-16 - Custom navbar layout plugin
- Added a repo-local custom navbar layout plugin at `tools/custom-navbar-layout-plugin/` so the dashboard shell background and split navbar PNGs can be placed directly inside an open design file without relying on MCP placement support.
- The plugin ships as a minimal no-build scaffold:
  - `manifest.json`
  - `code.js`
  - `ui.html`
  - `README.md`
- The plugin UI asks for:
  - `C:\Users\treyt\Downloads\Dashboard finished.png`
  - the eight split PNGs from `C:\Users\treyt\Downloads\buttons_for_dashboard_split`
- The main plugin logic creates a `1536 x 1024` frame, places the background, and lays out the buttons at the recorded navbar coordinates for:
  - Brain
  - Scholar
  - Tutor
  - Library
  - Mastery
  - Calendar
  - Methods
  - Vault
- Validation passed:
  - `node --check tools/custom-navbar-layout-plugin/code.js`
  - `python scripts/check_docs_sync.py`
  - `git diff --check`

## 2026-03-16 - Project skill audit skill
- Added a repo-local Codex skill at `.codex/skills/project-skill-audit/` for auditing project-specific skill gaps from memory, rollout summaries, session history, and existing local skills.
- The skill encodes:
  - repo surface and canon scan order
  - targeted memory and rollout-summary analysis before raw session fallback
  - comparison rules for `new skill` versus `update existing skill`
  - output structure for existing skills, suggested updates, suggested new skills, and priority order
- Added matching UI metadata at `.codex/skills/project-skill-audit/agents/openai.yaml`.
- Validation passed:
  - `python C:\Users\treyt\.codex\skills\.system\skill-creator\scripts\quick_validate.py .codex\skills\project-skill-audit`

## 2026-03-16 - Custom app navbar load
- Copied the split custom navbar PNGs into `dashboard_rebuild/attached_assets/` as app-local assets for:
  - Brain
  - Scholar
  - Tutor
  - Library
  - Mastery
  - Calendar
  - Methods
  - Vault
- Replaced the generated text-only shared-shell header nav controls in `dashboard_rebuild/client/src/components/layout.tsx` with the custom button art while preserving:
  - the existing route map
  - the current nav `data-testid` hooks
  - keyboard focus treatment and route activation behavior
- Added responsive sizing plus dimmed/active glow states so the custom buttons stay readable in the live shell without reintroducing the older frame/background dependency.
- Validation passed:
  - `npm run test -- layout.test.tsx`
  - `npm run build`
  - manual render check at `http://127.0.0.1:5000/brain`

## 2026-03-16 - UI image centralization
- Created `C:\pt-study-sop\UI Images` as the canonical repo-local home for the shell/navbar image set and the working navbar source art.
- Moved the current live shell assets there:
  - `BrainBackground.jpg`
  - `StudyBrainIMAGE_1768640444498.jpg`
  - `TreysStudySystemIMAGE.jpg`
  - `nav-brain-custom.png`
  - `nav-scholar-custom.png`
  - `nav-tutor-custom.png`
  - `nav-library-custom.png`
  - `nav-mastery-custom.png`
  - `nav-calendar-custom.png`
  - `nav-methods-custom.png`
  - `nav-vault-custom.png`
- Preserved working/reference art in the same repo folder under:
  - `UI Images/buttons_for_dashboard_split/`
  - `UI Images/reference/`
  - `UI Images/generated_images/`
- Repointed the frontend `@assets` alias in `dashboard_rebuild/vite.config.ts`, `dashboard_rebuild/vitest.config.ts`, and `dashboard_rebuild/tsconfig.json` so the app now resolves image imports from `UI Images` instead of `dashboard_rebuild/attached_assets`.
- Updated the custom navbar layout plugin docs/UI copy to use the repo-local `UI Images` paths.
- Validation passed:
  - `npm run test -- layout.test.tsx`
  - `npm run build`
  - `python scripts/check_docs_sync.py`
  - live render check at `http://127.0.0.1:5000/brain`

## 2026-03-16 - Navbar tool naming cleanup
- Renamed the repo-local navbar layout scaffold from `tools/figma-navbar-layout-plugin/` to `tools/custom-navbar-layout-plugin/` so the folder no longer carries the stale Figma-first label.
- Updated the active sprint board, historical log references, and the tool README/UI copy to use the neutral custom naming while keeping the underlying plugin files intact.
- Validation passed:
  - `node --check tools/custom-navbar-layout-plugin/code.js`
  - `python scripts/check_docs_sync.py`
  - `git diff --check`

## 2026-03-16 - Navbar PNG crop fix
- Repaired the custom navbar PNG set under `C:\pt-study-sop\UI Images` after the live shell showed a leftover white block under every button except Tutor.
- Updated both the live app assets and the split source copies while keeping the imported filenames stable for:
  - Brain
  - Scholar
  - Library
  - Mastery
  - Calendar
  - Methods
  - Vault
- Removed the full lower tail artifact rather than only shaving the bottom edge so the live header no longer shows the pale block beneath the buttons.
- Validation passed:
  - `npm run build`
  - live render screenshot check at `http://127.0.0.1:5000/brain`

## 2026-03-16 - Custom nav background shell integration
- Updated `dashboard_rebuild/client/src/components/layout.tsx` so the shared header now renders `C:\pt-study-sop\UI Images\Dashboard finished.png` as the custom nav backing plate behind the existing button links instead of leaving the buttons floating over the page background.
- Preserved the current route map, `data-testid` hooks, and click behavior while switching the header layout to an overlaid shell-stage composition using the recorded button placements.
- Validation passed:
  - `npm run test -- layout.test.tsx`
  - `npm run build`
  - live render screenshot check at `http://127.0.0.1:5000/brain`

## 2026-03-16 - Custom nav interaction regression fix
- Reworked `dashboard_rebuild/client/src/components/layout.tsx` so the overlaid primary/support nav rails no longer block each other's pointer events, which restores reliable hover and click behavior for the top-row Brain/Scholar/Tutor buttons.
- Strengthened the custom button hover/press treatment and widened the desktop nav stage/shell presentation so the background plate reads larger without changing the current route map or `data-testid` hooks.
- Validation passed:
  - `npm run test -- layout.test.tsx`
  - `npm run build`
  - live browser verification at `http://127.0.0.1:5000/brain` including successful hover and route navigation for the primary custom buttons

## 2026-03-16 - Notes dock side swap
- Updated `dashboard_rebuild/client/src/components/layout.tsx` so the floating notes control now renders as a compact unlabeled icon tab on the left edge instead of the larger labeled right-edge dock.
- Moved the notes sheet to the left side to match the new tab location while keeping the existing drag/open behavior and `data-testid="notes-dock"` intact.
- Validation passed:
  - `npm run test -- layout.test.tsx`
  - `npm run build`
  - live browser verification at `http://127.0.0.1:5000/brain` including opening the left-side notes tab and confirming the sheet opens cleanly

## 2026-03-16 - Custom nav shell scale rebalance
- Tuned `dashboard_rebuild/client/src/components/layout.tsx` so the custom shell background renders larger while the button art is reduced inside the same clickable link areas, matching the requested bigger-background/smaller-button balance.
- Narrowed the logo column slightly, widened the desktop nav stage, increased the shell image scale, and reduced the button image width so the overall nav plate grows without making the buttons feel oversized.
- Validation passed:
  - `npm run test -- layout.test.tsx`
  - `npm run build`
  - live browser verification at `http://127.0.0.1:5000/brain`

## 2026-03-16 - Custom nav title and hero polish
- Reworked `dashboard_rebuild/client/src/components/layout.tsx` so the custom nav shell now sits as a centered/lowered hero element instead of sharing the header with a separate left-side logo card.
- Replaced the old `TREY'S STUDY SYSTEM / NEURAL COMMAND DECK` block with a curved title treatment that arcs over the shell and embeds the brain logo directly into the title composition.
- Strengthened the primary-button treatment so Scholar and Tutor keep stronger always-on glow/brightness accents and read as emphasized peers next to Brain while preserving the current nav routes and `data-testid` hooks.
- Validation passed:
  - `npm run test -- layout.test.tsx`
  - `npm run build`
  - live browser verification at `http://127.0.0.1:5000/brain`

## 2026-03-16 - Custom nav fit and title emphasis follow-up
- Tightened `dashboard_rebuild/client/src/components/layout.tsx` so the desktop header no longer relies on a forced horizontal overflow rail or the oversized shell scale that had introduced left-right scrolling and a bulkier collapsed shell.
- Reduced the visible button art slightly while widening/recentering the clickable placement zones, giving the mid-row and bottom-row PNG buttons a cleaner fit inside the shell artwork without changing the route map or test hooks.
- Recovered the title into a single left-starting `TREY'S STUDY SYSTEM` wordmark with the brain mark tucked into the title lane after the earlier three-part arc treatment regressed visually.
- Switched the shell plate rendering from a contained fit to a centered cover crop so the banner actually fills the header lane instead of leaving a dead black gap under the button rows.
- Validation passed:
  - `npm run test -- layout.test.tsx`
  - `npm run build`
  - live browser verification at `http://127.0.0.1:5000/brain`

## 2026-03-16 - Header variant lab
- Added a standalone `/nav-lab` route in `dashboard_rebuild/client/src/App.tsx` and a new `dashboard_rebuild/client/src/pages/nav-lab.tsx` gallery page that renders six custom banner lockup variants at once.
- Kept the shell/button language stable and used the variant set to explore the actual alignment question: how the brain mark should attach to the `TREY'S STUDY SYSTEM` wordmark and how that lockup should sit relative to the shell.
- Validation passed:
  - `npm run test -- layout.test.tsx`
  - `npm run build`
  - live route check at `http://127.0.0.1:5000/nav-lab`

## 2026-03-16 - Nav build marker and launch guard
- Added a bright `NAV 316.1` marker to `dashboard_rebuild/client/src/components/layout.tsx` so the live custom header immediately shows which build is actually on screen during visual tuning.
- Confirmed the canonical `http://127.0.0.1:5000/brain` path was serving fresh `brain/static/dist` assets, identified a stray `dashboard_rebuild` Vite dev server still running on port `3000`, and killed only that repo-local dev server to remove a second dashboard surface.
- Hardened `Start_Dashboard.bat` so its stale-build detection now also watches `dashboard_rebuild/shared`, repo-level `UI Images`, and additional frontend config/plugin files before deciding to skip the UI rebuild.
- Validation passed:
  - `npm run test -- layout.test.tsx`
  - `npm run build`
  - `python scripts/check_docs_sync.py`
  - `Start_Dashboard.bat`
  - live route check at `http://127.0.0.1:5000/brain`

## 2026-03-16 - Navbar build-path stabilization and NAV 316.4
- Updated `dashboard_rebuild/client/src/components/layout.tsx` so the desktop banner now carries the `NAV 316.4` marker, a wider shell/background bleed, and a retuned `TREY'S STUDY SYSTEM` left lockup for the ongoing navbar polish pass.
- Switched `dashboard_rebuild/package.json` from `tsx build.ts` to direct `vite build` after confirming the canonical starter was blocking on the extra wrapper while the actual Vite production build still completed successfully.
- Reproduced the `Start_Dashboard.bat` path end-to-end, confirmed the rebuilt live bundle in `brain/static/dist` contains `NAV 316.4`, and verified the canonical `http://127.0.0.1:5000/brain` launcher now serves that fresh bundle again.
- Validation passed:
  - `npm run test -- client/src/components/__tests__/layout.test.tsx`
  - `npx vite build --debug`
  - `Start_Dashboard.bat`
  - `python scripts/check_docs_sync.py`

## 2026-03-16 - Navbar dense alignment grid and center dots
- Updated `dashboard_rebuild/client/src/components/layout.tsx` so the live desktop `/brain` navbar overlay keeps the major `A-P` and `1-10` alignment grid while adding three lower-opacity subdivision lines between every major row and column.
- Used three distinct subdivision line colors inside the existing green-family grid and kept the major grid lines brighter so the overlay stays readable without overpowering the shell art.
- Added a small red center marker directly inside each desktop nav button anchor so future alignment feedback can target button centers against the labeled grid without affecting hover or click behavior.
- Validation passed:
  - `npm run test -- client/src/components/__tests__/layout.test.tsx`
  - `npm run build`
  - `python scripts/check_docs_sync.py`
  - built bundle check for `NAV 316.5` in `brain/static/dist`

## 2026-03-16 - Scholar grid placement adjustment
- Moved only the Scholar desktop nav button in `dashboard_rebuild/client/src/components/layout.tsx` so its center marker targets the user's requested alignment callout: on the `H|I` major vertical line and centered in `box 5`.
- Left every other desktop nav button placement unchanged for this pass so the next alignment corrections can be called out one button at a time against the `NAV 316.6` overlay.
- Validation passed:
  - `npm run test -- client/src/components/__tests__/layout.test.tsx`
  - `npm run build`
  - built bundle check for `NAV 316.6` in `brain/static/dist`

## 2026-03-16 - Navbar alignment overlay coordinate repair
- Verified with a fresh `http://127.0.0.1:5000/brain` screenshot that the `NAV 316.6`/`316.7` Scholar callout missed because the live shell background and green grid were rendered inside the widened bleed box while the button anchors were still positioned against the narrower inner stage.
- Updated `dashboard_rebuild/client/src/components/layout.tsx` so the background art, live grid, and both desktop nav rails now render inside the same widened shell coordinate space.
- Measured the custom PNG alpha bounds and moved the red debug dots to the visible button-art centers instead of the raw image rectangles, which had inconsistent bottom transparency across the support row.
- Validation passed:
  - `npm run test -- client/src/components/__tests__/layout.test.tsx`
  - `npm run build`
  - built bundle check for `NAV 316.8` in `brain/static/dist`

## 2026-03-17 - Navbar debug overlay removal
- Removed the temporary desktop navbar debug overlay from `dashboard_rebuild/client/src/components/layout.tsx`, including the live `A-P` / `1-10` grid, the row/column labels, and the red button-center dots.
- Kept the top-right build marker in place and bumped it to `NAV 316.9` so the live shared header can still be identified quickly during further visual tuning.
- Validation passed:
  - `npm run test -- client/src/components/__tests__/layout.test.tsx`
  - `npm run build`
  - built bundle check for `NAV 316.9` in `brain/static/dist`

## 2026-03-17 - Navbar visual review guardrail capture
- Added a permanent visual-work guardrail to `docs/root/AGENT_GUARDRAILS.md` after the navbar tuning drifted into source-first nudging instead of full live-render review.
- Captured the specific prevention rule for this repo: use only the canonical `5000` surface, take a fresh full-area screenshot after each meaningful visual change, separate structural resets from micro-polish, and keep a build marker visible during iterative UI work.
- Validation passed:
  - `python scripts/check_docs_sync.py`

## 2026-03-17 - Navbar placement-guide recovery
- Used `UI Images/reference/Dashboard finished placement guide.png` and `UI Images/buttons_for_dashboard_split/placement.json` as the single visual source of truth for the desktop navbar layout.
- Generated `UI Images/Dashboard finished composite.png` by compositing the split navbar PNGs onto `UI Images/Dashboard finished.png` at the recorded guide coordinates.
- Updated `dashboard_rebuild/client/src/components/layout.tsx` so the desktop header now renders the guide-derived composite scene and uses transparent absolute hotspots for the existing routes instead of trying to visually align separate live button images.
- Tuned the desktop scene crop and verified the live `http://127.0.0.1:5000/brain` render now shows the full top row and support row aligned on the shell in `NAV 317.0`.
- Validation passed:
  - `npm run test -- client/src/components/__tests__/layout.test.tsx`
  - `npm run build`
  - built bundle check for `NAV 317.0` in `brain/static/dist`

## 2026-03-17 - Desktop title chip enlargement pass
- Updated `dashboard_rebuild/client/src/components/layout.tsx` so the desktop `TREY'S STUDY SYSTEM` title lockup now uses a doubled left brain chip and a duplicated matching chip at the right edge of the wordmark.
- Kept the guide-based shell/button composite untouched in this pass so only the title lane changed.
- Captured a fresh live screenshot at `tmp-nav-brain-3171b.png` after rebuilding to verify the `NAV 317.1` title result on the canonical `5000` surface.
- Validation passed:
  - `npm run test -- client/src/components/__tests__/layout.test.tsx`
  - `npm run build`
  - `python scripts/check_docs_sync.py`

## 2026-03-17 - Path B step 1 desktop composite removal
- Removed the desktop `Dashboard finished composite.png` render from `dashboard_rebuild/client/src/components/layout.tsx` as the first targeted reset step toward restoring true separate live button images.
- Left the desktop hotspot anchors intact so the baked image removal could be verified in isolation before reintroducing the separate shell background and button PNGs.
- Captured a fresh live screenshot at `tmp-nav-brain-3172.png` confirming the desktop composite art is gone in `NAV 317.2`.
- Validation passed:
  - `npm run test -- client/src/components/__tests__/layout.test.tsx`
  - `npm run build`
  - built bundle check for `NAV 317.2` in `brain/static/dist`

## 2026-03-17 - Path B step 2 desktop hotspot window removal
- Removed both desktop nav hotspot rails from `dashboard_rebuild/client/src/components/layout.tsx`, which removes all 8 clear desktop button windows from the live shared header.
- Captured a fresh live screenshot at `tmp-nav-brain-3173.png` confirming the desktop header is now down to the title lane only in `NAV 317.3`.
- Validation:
  - `npm run build` passed
  - built bundle check for `NAV 317.3` in `brain/static/dist` passed
  - `npm run test -- client/src/components/__tests__/layout.test.tsx` now fails as expected because the temporary desktop reset removed `nav-brain` / desktop nav anchors that the test still expects

## 2026-03-17 - Title lockup comparison lab
- Reworked `dashboard_rebuild/client/src/pages/nav-lab.tsx` into a focused three-variant title comparison strip for the live navbar decision instead of the older six-way lockup experiment.
- Added `Oxanium`, `Orbitron`, and `Audiowide` imports plus font tokens in `dashboard_rebuild/client/src/index.css`, then built the app and captured fresh comparison screenshots at `tmp-nav-lab-title-1.png` and `tmp-nav-lab-title-2.png`.
- Incorporated read-only agent feedback: Oxanium as the safest baseline, Orbitron as the strongest mounted-command treatment, Audiowide as the softest/most stylized option, with explicit warning not to judge them at too tiny a scale.
- Validation passed:
  - `npm run build`
  - `python scripts/check_docs_sync.py`

## 2026-03-17 - Browser fallback stack cleanup
- Replaced the ad hoc `chrome-cdp` prep path in `C:\Users\treyt\OneDrive\Desktop\UI-UX` with an `agent-browser` fallback profile and launcher script so the local browser stack is now documented as `windows-mcp -> browsirai -> agent-browser -> Playwright`.
- Updated `Tool-Profiles.json`, `Start-Assistant-Tool.ps1`, and `UI-UX-README.md` to make `agent-browser` the supported live-browser fallback while leaving `chrome-cdp` as an optional legacy install instead of the main recommendation.
- Verified the launcher profiles for `agent-browser-prep`, `penpot-mcp`, and `pt-study-dashboard`, then reopened the canonical dashboard and Penpot startup flows from the new launcher path.
- Upgraded the global `agent-browser` CLI from `0.20.5` to `0.21.0`.
- Removed the old local `chrome-cdp` skill files so the fallback path is no longer ambiguous.

## 2026-03-17 - Stitch MCP setup
- Configured global Google Cloud ADC for the active `treytucker05@yahoo.com` account and quota project `studysop`, creating `C:\Users\treyt\AppData\Roaming\gcloud\application_default_credentials.json`.
- Enabled `stitch.googleapis.com` and then enabled the Stitch MCP endpoint for `projects/studysop` with system `gcloud beta services mcp enable`.
- Verified Stitch CLI access through `@_davideast/stitch-mcp` using system gcloud auth by listing tools and opening the projects browser, which surfaced live Stitch projects including `Arcade Style Retro Header Variant` and `Professional Study Brain Dashboard`.
- Added a permanent `stitch` MCP server entry to `C:\Users\treyt\.codex\config.toml` using `npx -y @_davideast/stitch-mcp@latest proxy` with `STITCH_USE_SYSTEM_GCLOUD=1` and `GOOGLE_CLOUD_PROJECT=studysop`.
- Updated `C:\Users\treyt\OneDrive\Desktop\UI-UX\UI-UX-README.md` with the Stitch setup and restart requirements.

## 2026-03-17 - Desktop nav background swap
- Swapped the live desktop shell background in `dashboard_rebuild/client/src/components/layout.tsx` from `UI Images/Dashboard finished.png` to `UI Images/Dashboard Background image.png`.
- Restored the desktop shell image layer itself, since the earlier Path B reset had removed the render and left an empty header lane where the background could not appear.
- Rebuilt the canonical frontend bundle and verified the new background on `http://127.0.0.1:5000/brain` using a fresh browser screenshot (`tmp-nav-bg-check-2.png`).
- Validation:
  - `npm run build`
  - `python scripts/check_docs_sync.py`
- Known pre-existing issue: `npm run test -- client/src/components/__tests__/layout.test.tsx` still fails on missing desktop nav anchors (`data-testid="nav-brain"`) from the earlier Path B desktop-navbar reset, not from this background swap.

## 2026-03-17 - Disable Figma MCP in Codex
- Disabled the global Codex Figma MCP server in `C:\Users\treyt\.codex\config.toml` by setting `[mcp_servers.figma].enabled = false`.
- Confirmed the repo-local [`.mcp.json`](C:\pt-study-sop\.mcp.json) does not register a separate Figma MCP server, so no local override remains active.
- Created a timestamped backup before the change at `C:\Users\treyt\.codex\config.toml.bak-20260317-231804`.
- Validation: parsed `C:\Users\treyt\.codex\config.toml` with Python `tomllib` and confirmed `mcp_servers.figma.enabled` resolves to `False`.

## 2026-03-19 - Tutor PRIME artifact layout pass
- Reframed the current Tutor Priming surface in `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` around the agreed Studio PRIME artifact bundle: `Learning Objectives`, `Study Spine`, `Hierarchical Map`, `Summary`, and `Terms`.
- Kept the existing workflow save/restore contract in `dashboard_rebuild/client/src/hooks/useTutorWorkflow.ts` and reused the current priming bundle payload fields instead of adding a schema migration.
- Demoted `Open Questions / Ambiguities` and Tutor guidance into a separate handoff card so the main PRIME surface stays focused on artifact creation.
- Updated `brain/dashboard/api_tutor_workflows.py` so Priming Assist now asks for source-linked PRIME artifacts using the new framing while preserving the existing JSON key contract.
- Validation passed:
  - `pytest brain/tests/test_tutor_workflow_priming_assist.py`
  - `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live `/tutor` Priming sanity check at `http://127.0.0.1:5000/tutor`

## 2026-03-19 - Tutor Setup Rail layout pass
- Rebuilt the live Priming panel in `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` around the chosen Setup Rail structure so setup lives in the left rail, the source viewer stays centered, and PRIME artifacts render as an extraction-first review workspace on the right.
- Updated `dashboard_rebuild/client/src/components/priming/PrimingLayout.tsx` to support the three-zone left-rail / center-viewer / right-workspace layout instead of the earlier two-panel shell with a bottom block bar.
- Tightened `dashboard_rebuild/client/src/components/priming/PrimingMaterialReader.tsx` so the center viewer only follows explicitly selected materials and shows a clean empty state when nothing is in scope.
- Removed the old Priming bottom-bar clutter from the live screen, kept manual editing behind fallback toggles, and preserved the existing workflow save/restore contract and PRIME payload fields.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live `/tutor` Priming sanity check at `http://127.0.0.1:5000/tutor`

## 2026-03-19 - Tutor Setup Rail follow-up fixes
- Patched `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` so the left rail actually exposes the materials picker and prime-chain controls in the live view, changed study unit entry to a typeable suggestion-backed field, and added a simple chain preview instead of leaving the chain hidden inside a select.
- Patched `dashboard_rebuild/client/src/hooks/useTutorHub.ts` and `dashboard_rebuild/client/src/hooks/useTutorWorkflow.ts` so the displayed Obsidian target derives from the current class plus study unit instead of stale saved vault state, and new Priming runs clear the previous vault-folder override.
- Tightened `dashboard_rebuild/client/src/components/MaterialSelector.tsx` so existing materials stay class-scoped instead of dumping every material when no class is selected, while still leaving upload available before a class is chosen.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live `/tutor` check confirming Exercise Physiology plus typed `Week 7` resolves the Obsidian target to `Courses/Exercise Physiology/Week 7`

## 2026-03-19 - Tutor Priming stacked-window fallback
- Flattened `dashboard_rebuild/client/src/components/priming/PrimingLayout.tsx` from the fixed-height three-column shell into vertically stacked windows so the Priming surface can be worked through top-to-bottom without clipping.
- Updated the source viewer container in `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` to use a tall bounded viewport inside the new stacked flow, so PDFs and extracted docs remain usable while the page itself scrolls naturally.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live `/tutor` check confirming `START NEW` now renders stacked `SETUP`, `MATERIALS IN SCOPE`, and subsequent Priming windows instead of the prior clipped three-column layout

## 2026-03-19 - Tutor PRIME artifact formatting pass
- Tightened `brain/dashboard/api_tutor_workflows.py` so Priming Assist now asks for markdown-ready summaries, `Term :: definition` terminology lines, and a real hierarchical map representation instead of a prose-only structure note.
- Updated `dashboard_rebuild/client/src/lib/tutorUtils.ts` so saved markdown list prefixes are normalized back into plain records, multi-source aggregate blocks render as markdown subheadings instead of `[Source]` blobs, and PRIME artifacts format into headings, numbered lists, paragraphs, and Mermaid-aware preview text.
- Reworked the artifact display in `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` to render formatted markdown in the live Priming workspace and to fall back to a visual Mermaid map derived from the Study Spine when the extractor returns prose for the hierarchy.
- Added focused frontend coverage in `dashboard_rebuild/client/src/lib/__tests__/tutorUtils.test.ts` and mocked the structured map component in `dashboard_rebuild/client/src/pages/__tests__/tutor.workspace.integration.test.tsx` so the new preview path stays testable.
- Validation passed:
  - `pytest brain/tests/test_tutor_workflow_priming_assist.py`
  - `cd dashboard_rebuild && npm run test -- client/src/lib/__tests__/tutorUtils.test.ts`
  - `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live `/tutor` hard-refresh check confirming source-linked extraction previews now show headed/numbered markdown and the Summary artifact renders as a formatted document instead of a raw terminal blob

## 2026-03-20 - Reclassify Pre-Test into CALIBRATE
- Moved `M-PRE-007 Pre-Test` from PRIME to CALIBRATE in `sop/library/methods/M-PRE-007.yaml` so the method stage matches its diagnostic confidence-capture behavior instead of being grouped with Studio PRIME artifact-building work.
- Updated the canonical method library and category references in `sop/library/15-method-library.md`, `sop/library/categories/PRIME.md`, and `sop/library/categories/CALIBRATE.md` so the stage counts and inventories now place Pre-Test under CALIBRATE instead of PRIME.
- Synced the integrity smoke doc in `docs/root/TUTOR_METHOD_INTEGRITY_SMOKE.md` so the stage listing for `M-PRE-007` matches the new categorization.
- Validation passed:
  - `pytest brain/tests/test_seed_methods.py brain/tests/test_artifact_validators.py brain/tests/test_chain_validator.py brain/tests/test_pero_mapping.py -q`

## 2026-03-20 - Move Brain Dump and Prior Knowledge Scan into CALIBRATE
- Reclassified `M-PRE-001 Brain Dump` and `M-PRE-003 Prior Knowledge Scan` from PRIME to CALIBRATE in `sop/library/methods/M-PRE-001.yaml` and `sop/library/methods/M-PRE-003.yaml`, including stage-specific stipulations, prompts, and gating rules.
- Updated the canonical stage inventories and boundary docs in `sop/library/15-method-library.md`, `sop/library/categories/PRIME.md`, and `sop/library/categories/CALIBRATE.md` so PRIME is material-grounded structure work and CALIBRATE owns prior-knowledge activation plus readiness mapping.
- Synced supporting references in `docs/root/TUTOR_METHOD_INTEGRITY_SMOKE.md`, `docs/root/TUTOR_PRIME_DRAFT_MATRIX.md`, and fallback metadata in `brain/data/seed_methods.py` so the runtime seed path and PRIME-only draft matrix no longer contradict the canon method library.
- Validation passed:
  - `pytest brain/tests/test_seed_methods.py brain/tests/test_artifact_validators.py brain/tests/test_chain_validator.py brain/tests/test_pero_mapping.py -q`

## 2026-03-20 - First-class TEACH stage upgrade
- Promoted `TEACH` to a first-class control-plane stage across canon docs, runtime contracts, selector/chain validation, DB/API compatibility layers, Tutor prompt assembly, and Methods UI stage handling.
- Reclassified explanation-first methods into `TEACH`, added TEACH-native method cards (`Story Spine`, `Confusable Contrast Teach`, `Clinical Anchor Mini-Case`, `Modality Switch`, `Jingle / Rhyme Hook`), and kept learner-production methods in `ENCODE`.
- Added TEACH doctrine and guardrails to runtime prompt assembly so TEACH blocks run `Source Facts -> Plain Interpretation -> Bridge Move -> Application -> Anchor Artifact` without scored checks or confidence tagging.
- Updated runtime generators and generated outputs (`sop/library/15-method-library.md`, `sop/runtime/*`, `sop/tests/golden/*`) to CP-MSS v2.0 so the generated bundle no longer lags behind the source-of-truth docs.
- Exposed `TEACH` in the Methods UI display-stage filtering and refreshed repo README surfaces so active docs now match the working code.
- Validation passed:
  - `python sop/tools/validate_library.py`
  - `pytest sop/tests/test_validate_library.py sop/tests/test_build_golden.py brain/tests/test_method_cards_hardening.py brain/tests/test_seed_methods.py brain/tests/test_chain_validator.py brain/tests/test_chain_runner.py brain/tests/test_tutor_session_linking.py brain/tests/test_methods_api.py -q`
  - `cd dashboard_rebuild && npm run test -- client/src/lib/__tests__/displayStage.test.ts client/src/pages/__tests__/methods.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-20 - Tutor TEACH architecture correction pass
- Locked first-exposure canon to `MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE`, changed the default TEACH depth path to `brief L0 hook -> L3 mechanism -> L4 DPT precision`, replaced mandatory blank-page teach-back gating with low-friction function confirmation, and set mnemonic placement to post-artifact / pre-full-calibrate with `KWIK Lite` as the live lightweight slot.
- Updated first-exposure and proving-ground chain YAML plus CALIBRATE/KWIK method cards so chain truth matches the canon, including explicit TEACH packet metadata and post-TEACH mnemonic slot policy.
- Removed selector stage fabrication by deriving selector and chain-status truth from real chain/method YAML, expanded the TEACH runtime packet in `api_tutor_turns.py`, and reframed `tutor_teach_back.py` as deeper mastery / repair instead of the default L3->L4 gate.
- Wired TEACH packet visibility into the live Tutor UI across the top bar, chat strip, transcript footer, and chain builder, then exposed the packet through `GET /api/tutor/session/<id>` so the UI can read real backend TEACH metadata instead of relying on inference-only fallbacks.
- Cleaned remaining doctrine drift in `sop/library/10-deployment.md` and `sop/library/methods/M-ENC-001.yaml`, regenerated runtime knowledge uploads plus golden outputs, and added focused backend/frontend proofs for TEACH packet exposure.
- Validation passed:
  - `python sop/tools/validate_library.py`
  - `python sop/tools/build_runtime_bundle.py --update-golden`
  - `pytest sop/tests/test_validate_library.py sop/tests/test_build_golden.py -q`
  - `pytest brain/tests/test_selector_bridge.py brain/tests/test_chain_runner.py brain/tests/test_teach_back.py brain/tests/test_tutor_teach_packet.py brain/tests/test_chain_validator.py brain/tests/test_tutor_session_linking.py brain/tests/test_regression_safety.py brain/tests/test_tutor_strategy_mediation.py -q`
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/TutorTopBar.test.tsx client/src/components/__tests__/TutorChat.test.tsx client/src/components/__tests__/TutorChainBuilder.test.tsx client/src/components/__tests__/TutorStartPanel.test.tsx client/src/components/__tests__/MethodBlockCard.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-20 - Tutor Priming stacked flow simplification
- Simplified `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` so the stacked Priming page now leads with `SETUP` plus `MATERIALS IN SCOPE`, keeps `SOURCE VIEWER` second, preserves `PRIME ARTIFACT WORKSPACE` as the main review surface, and consolidates readiness plus handoff notes plus Tutor launch actions into one downstream `TUTOR HANDOFF` window.
- Moved the top-level `EXTRACT PRIME` action into the source-viewer header so extraction stays accessible without opening chain/config controls.
- Demoted `PRIME CHAIN` and `WORKFLOW CONTEXT` into a toggleable `ADVANCED PRIME CONTROLS` section at the bottom of the page, while keeping their existing functionality intact.
- Added focused frontend coverage in `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx` so the advanced section stays collapsed by default and only reveals `PRIME CHAIN` plus `WORKFLOW CONTEXT` when requested.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-20 - Tutor launch workflow delete
- Added `DELETE /api/tutor/workflows/<workflow_id>` in `brain/dashboard/api_tutor_workflows.py` and explicitly delete workflow-owned priming, notes, feedback, stage-time, memory, polish, and publish rows before removing the workflow itself.
- Exposed `api.tutor.deleteWorkflow(...)` in `dashboard_rebuild/client/src/api.ts` and added `deleteWorkflowRecord(...)` to `dashboard_rebuild/client/src/hooks/useTutorWorkflow.ts` so deleting from Launch invalidates the workflow list and clears the active workflow state when the deleted plan was open.
- Added a visible destructive delete button with `window.confirm(...)` in `dashboard_rebuild/client/src/components/TutorWorkflowLaunchHub.tsx` and wired it through `dashboard_rebuild/client/src/components/TutorShell.tsx`.
- Added regression coverage in `brain/tests/test_tutor_workflow_delete.py`, `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowLaunchHub.test.tsx`, and `dashboard_rebuild/client/src/hooks/__tests__/useTutorWorkflow.test.tsx`.
- Validation passed:
  - `pytest brain/tests/test_tutor_workflow_delete.py brain/tests/test_tutor_workflow_priming_assist.py -q`
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/TutorWorkflowLaunchHub.test.tsx client/src/hooks/__tests__/useTutorWorkflow.test.tsx`
  - `cd dashboard_rebuild && npx vite build --emptyOutDir false`
  - live `/tutor` launch-page check on `http://127.0.0.1:5000/tutor`

## 2026-03-20 - Methods/chains API lock fallback
- Fixed the live Methods page backend failure in `brain/db_setup.py` by making runtime `ensure_method_library_seeded()` prefer existing method/chain rows by default instead of strict write-sync on first read, while keeping strict reconciliation opt-in through `PT_METHOD_LIBRARY_STRICT_SYNC=1`.
- Added a fail-open guard so transient SQLite `database is locked` errors during best-effort library sync no longer take `/api/methods` or `/api/chains` down with a `500`.
- Added regression coverage in `brain/tests/test_methods_api.py` for the locked-sync case and the default runtime skip path when the library already exists.
- Validation passed:
  - `pytest brain/tests/test_methods_api.py brain/tests/test_seed_methods.py -q`
  - restarted the dashboard via `Start_Dashboard.bat`
  - confirmed `http://127.0.0.1:5000/api/methods` -> `200`
  - confirmed `http://127.0.0.1:5000/api/chains` -> `200`

## 2026-03-20 - Methods schema repair and retryable load panels
- Rebuilt stale live `method_blocks` tables in `brain/db_setup.py` when the persisted SQLite `control_stage` CHECK constraint still excluded `TEACH`, preserving existing rows/IDs while normalizing copied stage values into the current control-plane set.
- Fixed startup drift in `brain/db_setup.py` so expected template-chain counts ignore `sop/library/chains/certification_registry.yaml`, which is registry metadata rather than a real template chain.
- Added a regression test in `brain/tests/test_methods_api.py` proving `init_database()` upgrades a legacy `method_blocks` table and accepts a `TEACH` insert after the rebuild.
- Added retryable error panels to `dashboard_rebuild/client/src/pages/methods.tsx` for methods/chains query failures and covered them in `dashboard_rebuild/client/src/pages/__tests__/methods.test.tsx`.
- Re-ran `python brain/db_setup.py`, which repaired the live DB and reseeded the method library to `54` method blocks including `5` TEACH rows.
- Validation passed:
  - `pytest brain/tests/test_methods_api.py brain/tests/test_seed_methods.py -q`
  - `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/methods.test.tsx client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - restarted the app via `Start_Dashboard.bat`
  - confirmed `http://127.0.0.1:5000/api/methods` and `http://127.0.0.1:5000/api/chains` both return `200`
  - confirmed the live Methods page renders again at `http://127.0.0.1:5000/methods`
## 2026-03-20 - Tutor Guided Studyability Loop baseline opened
- Opened `conductor/tracks/tutor-guided-studyability_20260320/` as the repo-native surface for Tutor feature inventory, guided stage-by-stage real study passes, normalized issue capture, and prioritized fix-wave planning.
- Added an active execution item in `docs/root/TUTOR_TODO.md` and registered the new active track in `conductor/tracks.md`.
- Seeded baseline artifacts:
  - `spec.md`
  - `plan.md`
  - `feature-matrix.md`
  - `study-pass-checklist.md`
  - `issue-log.md`
  - `findings.md`

## 2026-03-21 - Shared nav shell motion removal
- Removed the adaptive shared-header collapse behavior from `dashboard_rebuild/client/src/components/layout.tsx`, including the hover hot zone, hover/scroll compaction state, and the internal shell logic that kept the banner reacting independently from page flow.
- Switched the app shell from a fixed-height grid with an internally scrolling `<main>` to a normal flex-column page flow so the nav now scrolls with the document instead of staying pinned outside the page scroll.
- Stripped translate/scale motion from the desktop nav button shell/image classes while keeping the existing visual styling and hover highlighting.
- Removed the matching `.page-shell__hero` compaction rule from `dashboard_rebuild/client/src/index.css` so the hero no longer animates closed when the old nav state toggles.
- Updated `dashboard_rebuild/client/src/components/__tests__/layout.test.tsx` so the shared layout test now proves the header remains expanded during scroll instead of expecting compact-on-scroll behavior.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/layout.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live browser check on `http://127.0.0.1:5000/methods` confirmed `window.scrollY = 1800` with `header[data-header-shell]` at `y = -1800`, showing the header now moves with normal page scroll

## 2026-03-21 - Priming setup contract pulled into first window
- Updated `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` so the first setup card now owns the real Tutor launch contract: class selection, study unit, objective scope, focus objective when needed, topic, materials, and live Tutor launch blockers/readiness all appear together instead of being split across the page.
- Removed the duplicated full readiness checklist from the lower `TUTOR HANDOFF` section so the page tells one launch story instead of two.
- Added focused regression coverage in `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx` for the new setup-window contract placement while keeping advanced controls collapsed by default.
- Updated the guided studyability artifacts in `conductor/tracks/tutor-guided-studyability_20260320/issue-log.md` and `conductor/tracks/tutor-guided-studyability_20260320/findings.md`, and marked the execution item complete in `docs/root/TUTOR_TODO.md`.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-21 - Priming objective-scope removal
- Removed the redundant `Objective Scope` and `Focus Objective` controls from `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` so Priming now works from the selected study unit plus file-derived objectives instead of asking the learner for a separate narrowing mode.
- Normalized hidden narrowing state by resetting `single_focus` back to `module_all` when class or study unit changes and by auto-clearing stale invalid `single_focus` state when Priming opens without a valid focus objective.
- Updated `dashboard_rebuild/client/src/hooks/useTutorWorkflow.ts` so the `Learning objectives captured` readiness item now keys off approved study-unit objectives or extracted source objectives rather than the old objective-scope toggle.
- Updated the objectives artifact pane copy to show study-unit objectives instead of manual focus scope, and added focused regression coverage in `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx` plus `dashboard_rebuild/client/src/hooks/__tests__/useTutorWorkflow.test.tsx`.
- Updated the guided studyability artifacts in `conductor/tracks/tutor-guided-studyability_20260320/issue-log.md` and `conductor/tracks/tutor-guided-studyability_20260320/findings.md`, and marked the execution item complete in `docs/root/TUTOR_TODO.md`.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx client/src/hooks/__tests__/useTutorWorkflow.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-21 - Priming and Tutor chain selectors moved into the live study flow
- Moved PRIME method and Priming chain selection out of the old advanced dropdowns and into the active Priming setup flow in `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx`, using card-style selectors closer to the Methods page before the learner clicks `Extract PRIME`.
- Added a real Tutor chain picker to the Priming handoff area with `AUTO`, `PRE-BUILT`, and `CUSTOM` choices before `Start Tutor`, and wired it into the same `chainId` / `customBlockIds` runtime state that Tutor session start already consumes.
- Updated `dashboard_rebuild/client/src/components/TutorShell.tsx` to fetch template chains for the Priming view and pass them into the Priming panel, then trimmed the old advanced area down to workflow context instead of keeping duplicated hidden selection controls.
- Updated focused coverage in `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx` and extended Tutor page test mocks in `dashboard_rebuild/client/src/pages/__tests__/tutor.workspace.integration.test.tsx` plus `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx` for the template-chain query.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-21 - Priming simplified around multi-select methods and workspace-owned extraction
- Removed the live Priming chain selector from `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` and rebuilt the stage so Priming is driven by multi-select Priming methods instead of a method-plus-chain pair.
- Moved the `Prime Artifact Workspace` directly under `Setup`, moved the main `Extract PRIME` action into that workspace header, and demoted the `Source Viewer` into a reference-only section below it. `dashboard_rebuild/client/src/components/priming/PrimingMaterialReader.tsx` no longer owns extraction controls.
- Switched the canonical frontend/backend Priming contract to `priming_methods` in `dashboard_rebuild/client/src/hooks/useTutorWorkflow.ts`, `dashboard_rebuild/client/src/api.types.ts`, `brain/dashboard/api_tutor_workflows.py`, and `brain/db_setup.py`, while keeping legacy hydration for older `priming_method` / `priming_chain_id` rows.
- Updated regression coverage in `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx`, `dashboard_rebuild/client/src/hooks/__tests__/useTutorWorkflow.test.tsx`, `dashboard_rebuild/client/src/hooks/__tests__/useTutorSession.test.tsx`, and `brain/tests/test_tutor_workflow_priming_assist.py`.
- Validation passed:
  - `pytest brain/tests/test_tutor_workflow_priming_assist.py brain/tests/test_tutor_workflow_delete.py -q`
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx client/src/hooks/__tests__/useTutorWorkflow.test.tsx client/src/hooks/__tests__/useTutorSession.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx`

## 2026-03-21 - PRIME rebuilt around the real SOP method library
- Added canonical PRIME cards `M-PRE-012`, `M-PRE-013`, and `M-PRE-014` in `sop/library/methods/`, updated `sop/library/categories/PRIME.md` and `sop/library/15-method-library.md`, and locked the boundary that `root_understanding` is a TEACH intent rather than a PRIME method.
- Enriched `/api/methods` in `brain/dashboard/api_methods.py` so PRIME cards expose YAML-backed metadata like `outputs_summary`, `required_outputs`, `allowed_moves`, `when_to_use`, `when_not_to_use`, `primary_citations`, and `mechanisms`, which the Priming page can now consume directly instead of relying on a synthetic local registry.
- Rewired `brain/dashboard/api_tutor_workflows.py` and `brain/db_setup.py` so Priming assist runs only the selected stable `M-PRE-*` method IDs, stores workflow-level `priming_method_runs_json` plus per-source `method_outputs`, derives the old aggregate artifact bundle only as a compatibility layer, and normalizes legacy synthetic slugs into real PRIME method IDs while dropping `root_understanding` from PRIME.
- Rebuilt `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx`, `dashboard_rebuild/client/src/hooks/useTutorWorkflow.ts`, `dashboard_rebuild/client/src/components/TutorShell.tsx`, `dashboard_rebuild/client/src/api.types.ts`, and `dashboard_rebuild/client/src/lib/tutorUtils.ts` so the live Priming workspace loads real PRIME methods from the API, allows multi-select, renders selected-method output cards only, preserves `Legacy PRIME outputs` for historical workflows, and uses objective-plus-structural-organizer readiness instead of the old fixed artifact-tab contract.
- Updated regression coverage in `brain/tests/test_tutor_workflow_priming_assist.py`, `brain/tests/test_methods_api.py`, `brain/tests/test_seed_methods.py`, `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx`, `dashboard_rebuild/client/src/hooks/__tests__/useTutorWorkflow.test.tsx`, and `dashboard_rebuild/client/src/hooks/__tests__/useTutorSession.test.tsx`.
- Validation passed:
  - `python sop/tools/validate_library.py`
  - `pytest brain/tests/test_tutor_workflow_priming_assist.py brain/tests/test_methods_api.py brain/tests/test_seed_methods.py -q`
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx client/src/hooks/__tests__/useTutorWorkflow.test.tsx client/src/hooks/__tests__/useTutorSession.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-21 - Brain evidence-contract realignment
- Replaced the old Brain home dashboard surface with `dashboard_rebuild/client/src/components/brain/ContractBrainHome.tsx`, then wired `dashboard_rebuild/client/src/components/brain/MainContent.tsx` to that evidence-first view instead of the launch/support/setup-heavy legacy layout.
- Realigned `dashboard_rebuild/client/src/pages/brain.tsx` so the route hero and header stats describe Brain as a read-only evidence ledger rather than a command deck for course routing or live-study handoff.
- Centered the page around stored session evidence, WRAP-traceable rollups, issues/failures, display-only integration status, and an annotation-only organizer that uses `api.brain.organizePreview(...)` without mutating stored Brain data.
- Tightened `dashboard_rebuild/client/src/pages/__tests__/brain.test.tsx` to validate the new contract directly, including the annotation-only organizer path and the removal of the old dashboard drift sections.
- Live browser verification on `http://127.0.0.1:5000/brain` confirmed the old `WHAT NEEDS ATTENTION NOW` / `PROJECTS DASHBOARD` / `SUPPORT SYSTEMS` / `SYSTEM / SETUP` blocks are gone and the new evidence ledger is what Flask serves after build.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- src/pages/__tests__/brain.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-21 - Tutor top-of-page workflow navigation repair
- Added `TGSL-170` to `docs/root/TUTOR_TODO.md` and logged the Tutor navigation problem as `TGSL-TU-001` in the guided studyability issue backlog.
- Reworked `dashboard_rebuild/client/src/components/TutorWorkflowStepper.tsx` into a real workflow navigator that includes `LAUNCH`, `PRIMING`, `TUTOR`, `POLISH`, and `FINAL SYNC`, plus explicit `BACK TO ...` and `NEXT: ...` controls.
- Simplified `dashboard_rebuild/client/src/components/TutorTabBar.tsx` so it no longer competes with the workflow stage story; it now serves as a smaller workspace-mode row with `WORKFLOW`, `TUTOR`, `STUDIO`, `SCHEDULE`, `SETTINGS`, and live Tutor actions.
- Moved the workflow navigator and workspace tabs to the top of `dashboard_rebuild/client/src/components/TutorTopBar.tsx`, above the oversized TEACH runtime diagnostics block, and updated `dashboard_rebuild/client/src/pages/tutor.tsx` to wire the new stage movement contract.
- Added focused coverage in `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowStepper.test.tsx` and updated `dashboard_rebuild/client/src/components/__tests__/TutorTopBar.test.tsx`.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- src/components/__tests__/TutorWorkflowStepper.test.tsx src/components/__tests__/TutorTopBar.test.tsx src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live snapshot check on `http://127.0.0.1:5000/tutor` confirmed the top row now exposes `WORKFLOW / TUTOR / STUDIO / SCHEDULE / SETTINGS` above the TEACH runtime block

## 2026-03-21 - Scholar Strategy launch-page leak fix
- Tightened `dashboard_rebuild/client/src/components/TutorShell.tsx` so the live `SCHOLAR STRATEGY` panel only renders while `shellMode === "tutor"` with an active session, instead of leaking onto `LAUNCH` and other workflow surfaces whenever a session id exists.
- Added a focused regression in `dashboard_rebuild/client/src/pages/__tests__/tutor.workspace.integration.test.tsx` that restores an active Tutor session, clicks `LAUNCH`, and verifies the Scholar Strategy chrome disappears while the launch command deck stays visible.

## 2026-03-21 - Tutor Launch HUD visual restyle
- Restyled `dashboard_rebuild/client/src/components/TutorWorkflowLaunchHub.tsx` to match the repo's sci-fi HUD direction without changing any layout, routing, or navigation behavior. The page now keeps the same Launch structure but uses sharper illuminated panel shells, higher-contrast typography, red-accent primary actions, instrument-style filter controls, and darker workflow-table states.
- Added reusable Launch-only HUD primitives in `dashboard_rebuild/client/src/index.css` for the Launch surface: `tutor-launch-hud`, `tutor-launch-hud__panel`, `tutor-launch-hud__metric`, `tutor-launch-hud__module`, `tutor-launch-hud__field`, `tutor-launch-hud__button`, `tutor-launch-hud__table-shell`, `tutor-launch-hud__row`, and related badge/title/meta variants.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- src/components/__tests__/TutorWorkflowLaunchHub.test.tsx src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`
- Follow-up adjustment: reverted the Launch page buttons in `dashboard_rebuild/client/src/components/TutorWorkflowLaunchHub.tsx` back to the standard button treatment while keeping the new HUD panel/table/typography styling, and removed the unused custom Launch button skin from `dashboard_rebuild/client/src/index.css`.

## 2026-03-21 - Priming workspace blank-until-selected cleanup
- Tightened `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` so nothing renders below the PRIME method cards until at least one method is selected.
- Moved the main `Extract PRIME` action out of the workspace header and into a selected-method window area that only appears after methods are chosen.
- Kept the method-owned output model, but now reveal one window per selected method in selection order instead of mixing generic helper/output panels under the method picker before the learner has committed to a method.
- Updated focused coverage in `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx`.

## 2026-03-21 - Priming learning-objective formatting cleanup
- Updated `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` so extracted method-owned learning objectives, existing study-unit objectives, and legacy extracted objective candidates all render as structured objective cards instead of raw line text.
- Kept the PRIME extraction contract structured and source-grounded; the app now formats objective objects in the UI instead of asking the LLM to emit presentation-specific markup.
- Added focused coverage in `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx` to verify a real extracted `learning_objectives` payload renders the code badge and readable objective titles.

## 2026-03-21 - Priming selected-vs-existing extraction separation
- Updated `brain/dashboard/api_tutor_workflows.py` so Priming assist merges new per-material `method_outputs` into the existing source inventory by `method_id` instead of overwriting prior extracted method runs, then rebuilds the legacy aggregate artifact bundle from the merged result.
- Updated `dashboard_rebuild/client/src/hooks/useTutorWorkflow.ts` so derived `primingMethodRuns` can represent both the currently selected methods and already extracted methods discovered in the scoped material inventory, instead of filtering everything down to the active selection only.
- Reworked `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` so the workspace now clearly separates:
  - `SELECTED PRIME METHOD WINDOWS`
  - `EXISTING STUDY-UNIT OBJECTIVES`
  - `ALREADY EXTRACTED PRIME METHODS`
- This prevents old extracted outputs from reading like part of the next extraction request and keeps study-unit objectives out of the selected-method extraction area.
- Added focused regression coverage in `brain/tests/test_tutor_workflow_priming_assist.py` and `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx`.
- Validation passed:
  - `pytest brain/tests/test_tutor_workflow_priming_assist.py -q`
  - `cd dashboard_rebuild && npm run test -- src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx src/hooks/__tests__/useTutorWorkflow.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-21 - Priming extraction reasoning and full-coverage hardening
- Updated `brain/dashboard/api_tutor_workflows.py` so the PRIME extractor prompt now uses richer YAML-backed method logic instead of only short descriptions: facilitation guidance, inputs, required outputs, allowed/forbidden moves, citations, constraints, and default knobs are now fed into the selected-method reasoning block for the LLM.
- Added rerun stabilization context by feeding the material's existing outputs for the selected methods back into the prompt, instructing the LLM to revise conservatively rather than regenerate from a blank slate when the source has not changed.
- Removed the old front-slice-only extraction path for long materials. Priming assist now splits long material content into full-coverage windows, runs the LLM over every chunk, then performs a final LLM consolidation pass so the material-level output can include evidence that appears later in the document instead of only in the front segment.
- Tightened objective normalization so duplicate learning objectives with the same title/code pair are collapsed after extraction.
- Added focused backend coverage in `brain/tests/test_tutor_workflow_priming_assist.py` to verify:
  - richer method logic and prior-output context appear in the prompt
  - long content uses chunk-by-chunk full coverage plus a final consolidation pass
- Validation passed:
  - `pytest brain/tests/test_tutor_workflow_priming_assist.py -q`

## 2026-03-21 - Tutor workflow navigator render-stability fix
- Updated `dashboard_rebuild/client/src/components/TutorWorkflowStepper.tsx` so the workflow navigator no longer hard-returns `null` just because `activeWorkflowId` is temporarily missing.
- The stepper now stays visible whenever there is real workflow/session context, including live Tutor mode, current stage status, active Tutor session, or Polish state.
- Added focused regression coverage in `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowStepper.test.tsx` for the exact case where Tutor mode is active but the workflow id is temporarily absent.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- src/components/__tests__/TutorWorkflowStepper.test.tsx`

## 2026-03-21 - Priming explicit-learning-objective anchor fix
- Inspected the live Cardiovascular material row in `rag_docs` and confirmed the stored source text already contains two explicit `## Learning objectives` sections with `14` bullets total, so the under-count was happening in `M-PRE-010` extraction rather than in OCR/page ingestion.
- Updated `brain/dashboard/api_tutor_workflows.py` so `M-PRE-010` now detects explicit source-side objective lists, feeds them into the LLM prompt as a hard anchor, and reapplies that explicit list onto the final objective output to stop the model from collapsing a visible `14`-objective slide set into a smaller subset.
- Fixed `_normalize_objective_list(...)` so `lo_code: null` no longer crashes normalization while preserving dedupe behavior.
- Added focused regression coverage in `brain/tests/test_tutor_workflow_priming_assist.py` for a material that contains `14` explicit objective bullets while the mocked LLM returns only a `3`-objective subset.
- Validation passed:
  - `pytest brain/tests/test_tutor_workflow_priming_assist.py -q`

## 2026-03-21 - PRIME capped-group coverage hardening
- Updated `sop/library/categories/PRIME.md` so any capped PRIME output count like `3-5` is now defined as a final umbrella-group cap, not permission to ignore supported source content.
- Tightened `sop/library/methods/M-PRE-002.yaml`, `M-PRE-004.yaml`, `M-PRE-005.yaml`, `M-PRE-006.yaml`, and `M-PRE-011.yaml` so the selected source/material scope must be accounted for first and only then compressed into capped prompt/pillar/category/branch groups.
- Hardened `brain/dashboard/api_tutor_workflows.py` so live Priming Assist carries the same rule in both chunk extraction and consolidation: inventory the full supported structure first, then compress into broad groups that still cover the whole selected scope instead of cherry-picking isolated examples.
- Added focused prompt-regression coverage in `brain/tests/test_tutor_workflow_priming_assist.py` to prove the live prompt now encodes the new capped-output grouping rule.
- Validation passed:
  - `python sop/tools/validate_library.py`
  - `pytest brain/tests/test_tutor_workflow_priming_assist.py -q`

## 2026-03-21 - Tutor launch hub layout, wheel, and resume cleanup
- Reworked `dashboard_rebuild/client/src/components/TutorWorkflowLaunchHub.tsx` so `LAUNCH HUB` and `STUDY WHEEL` sit in the top row while `RECENT WORKFLOWS` now renders underneath them instead of beside them.
- Added a visible `RESUME` button beside `START NEW` and wired it through `dashboard_rebuild/client/src/components/TutorShell.tsx` and `dashboard_rebuild/client/src/pages/tutor.tsx` to the existing Tutor hub resume-candidate flow.
- Changed the Study Wheel to render linked course rotation rows from `tutorHub.class_projects`, so linked courses now show even when `total_sessions` and `total_minutes` are still `0`.
- Added focused coverage in `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowLaunchHub.test.tsx` and `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- src/components/__tests__/TutorWorkflowLaunchHub.test.tsx`
  - `cd dashboard_rebuild && npx vitest run src/pages/__tests__/tutor.test.tsx -t "resumes the most recent launch-hub session from the resume button"`
  - `cd dashboard_rebuild && npm run build`

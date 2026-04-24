# General Change Log

Changes not tied to a specific conductor track. Append dated entries below.

## 2026-04-01 - KWIK Hook aligned to literal word-sound -> meaning -> link flow

- Rewrote `sop/library/methods/M-ENC-001.yaml` so full `KWIK Hook` now literally walks through `Word Sound -> Real Meaning -> Meaning Picture -> Link -> Personalize -> Lock`, which matches the mnemonic flow Trey wants to use during study.
- Updated `sop/library/categories/ENCODE.md` and `sop/library/13-custom-gpt-system-instructions.md` so the ENCODE reference and runtime instruction source now describe the same full-KWIK sequence.
- Regenerated the generated method/runtime surfaces and goldens in:
  - `sop/library/15-method-library.md`
  - `sop/runtime/knowledge_upload/06_METHODS.md`
  - `sop/runtime/custom_instructions.md`
  - `sop/tests/golden/15-method-library.golden.md`
  - `sop/tests/golden/06_METHODS.golden.md`
- Added a focused YAML regression in `brain/tests/test_seed_methods.py`, then updated `sop/library/templates/session_log_template.yaml` so the new KWIK logging fields (`sound_cue`, `meaning_link_confirmed`) validate cleanly.
- Ran `python brain/data/seed_methods.py --strict-sync` so the live `method_blocks` table and facilitation prompts now reflect the rewritten KWIK flow instead of the older DB-cached metadata.
- Validation:
  - `python sop/tools/build_runtime_bundle.py --update-golden`
  - `pytest brain/tests/test_seed_methods.py -q`
  - `python sop/tools/validate_library.py`
  - `python brain/data/seed_methods.py --strict-sync`

## 2026-04-01 - SOP depth ladder aligned to literal 4-10-HS-PT teaching

- Rewrote `sop/library/methods/M-TEA-006.yaml` so `Depth Ladder (4-10-HS-PT)` now literally explains the same concept in four passes: `4-year-old -> 10-year-old -> high-school -> PT/DPT`, followed by a low-friction rung check instead of the older hook/mechanism/fallback contract.
- Updated `sop/library/categories/TEACH.md` so the TEACH category rules and sample prompt explicitly call out the literal ladder behavior when `M-TEA-006` is selected.
- Regenerated the generated method-library surfaces and goldens in:
  - `sop/library/15-method-library.md`
  - `sop/runtime/knowledge_upload/06_METHODS.md`
  - `sop/tests/golden/15-method-library.golden.md`
  - `sop/tests/golden/06_METHODS.golden.md`
- Ran `python brain/data/seed_methods.py --strict-sync` so the live `method_blocks` table and regenerated facilitation prompts now reflect the rewritten ladder contract instead of the older DB-cached metadata.
- Added a focused YAML regression in `brain/tests/test_seed_methods.py` to lock the rung order and prompt contract.
- Validation:
  - `python sop/tools/build_runtime_bundle.py --update-golden`
  - `pytest brain/tests/test_seed_methods.py -q`
  - `python sop/tools/validate_library.py`
  - `python brain/data/seed_methods.py --strict-sync`

## 2026-04-01 - SOP naming and inventory surface refresh

- Refreshed the readable SOP surfaces so chain and method IDs decode in plain English instead of assuming repo shorthand familiarity.
- Updated `README.md` to fix stale method-library counts and stale first-exposure stage summaries, and added a compact ID legend.
- Updated `sop/library/15-method-library.md` with a current “how to read IDs” section plus the runtime rule that `control_stage` beats older historical prefixes when they differ, normalized the chain headings to live IDs, and added the 4 previously missing chain entries so the readable doc now covers all `20` chains.
- Updated `sop/tools/export_method_chain_inventory.py` so regenerated inventory artifacts carry decoded ID fields and a naming legend automatically.
- Validation:
  - `python sop/tools/export_method_chain_inventory.py`
  - `git diff --check`

## 2026-04-01 - Starter chain renamed to stand out

- Kept the starter chain ID `C-FE-STD` stable and renamed its display name to `Trey's Favorite: Start Here` so Trey has one obvious default chain to begin with.
- Updated the active naming surfaces in:
  - `sop/library/chains/C-FE-STD.yaml`
  - `brain/selector.py`
  - `README.md`
  - `sop/library/15-method-library.md`
  - `sop/tools/build_runtime_bundle.py`
  - `sop/runtime/knowledge_upload/06_METHODS.md`
  - `sop/tests/golden/15-method-library.golden.md`
  - `sop/tests/golden/06_METHODS.golden.md`
  - `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx`
- Rebuilt the runtime bundle/goldens and refreshed the inventory export so future regenerations preserve the standout starter-chain name.
- Validation:
  - `python sop/tools/build_runtime_bundle.py --update-golden`
  - `python sop/tools/export_method_chain_inventory.py`
  - `pytest brain/tests/test_selector_bridge.py -q`
  - `pytest sop/tests/test_build_golden.py -q`
  - `npx vitest run client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx`

## 2026-04-01 - SOP chain repair and revalidation

- Repaired control-plane validator/spec drift in `brain/chain_validator.py` so the locked first-exposure opening `MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE` is valid only for the explicit `Micro Precheck` opening step plus a later full calibrate stage.
- Added focused regression coverage in `brain/tests/test_chain_validator.py` for the allowed opening handshake and for the two edge cases that must still fail.
- Repaired genuine ordering drift in:
  - `sop/library/chains/C-DP-001.yaml`
  - `sop/library/chains/C-TRY-001.yaml`
  - `sop/library/chains/C-TRY-002.yaml`
- Regenerated `exports/sop_inventory/` and confirmed the refreshed inventory now reports all `20` chains as control-plane valid.
- Validation:
  - `pytest brain/tests/test_chain_validator.py -q`
  - `pytest brain/tests/test_selector_bridge.py -q`
  - `python sop/tools/validate_library.py`
  - `python sop/tools/export_method_chain_inventory.py`

## 2026-03-29 - OVERLAY-001 entry overlay hardening

- Added a real fullscreen entry overlay backdrop in `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` so the empty Tutor Studio entry card now dims the canvas and intercepts wheel/click input instead of letting the canvas react underneath.
- Hardened the live verification path in `scripts/verify-overlay-polish.js` so it checks the shipped overlay backdrop, wheel blocking, outside-click blocking, and text contrast directly against `/tutor`.
- Validation:
  - `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx client/src/pages/__tests__/tutor.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `dev-browser --connect --timeout 60 run C:\pt-study-sop\scripts\verify-overlay-polish.js`

## 2026-03-22 - Studio layout playground added

- Added `docs/design/studio-playground.html` by retargeting the existing page-builder engine to the current Studio module set.
- The playground now exposes the main Studio parts as draggable/resizable cards, with presets for `Studio Map`, `Workflow First`, `Workspace First`, `Compact Stack`, and `Blank`.
- The prompt output updates live from the current card arrangement and can be copied back into Claude.

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

## 2026-03-25 - Studio floating-panel spec tightening

- Updated `docs/design/STUDIO_LAYOUT_SPEC_v2.md` to tighten the floating-panel Studio contract before implementation planning.
- Added missing product/runtime requirements that belong in the spec:
  - real `Source Shelf` Library/Vault working surfaces
  - tabbed `Document Dock`
  - explicit workspace object model requirements
  - in-panel Tutor start/resume expectations
  - independent Priming vs Tutor selector ownership
  - real compaction/runtime requirements, including capsule resume and rule reinforcement
  - direct Tutor note -> vault write expectation
  - shipped-surface constraints for vendor/dev clutter
- Added a short `Non-layout cleanup dependencies` section so layout planning stays separate from unrelated runtime cleanup bugs.
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
- Confirmed the repo-local [`.mcp.json`](C:\pt-study-sop.mcp.json) does not register a separate Figma MCP server, so no local override remains active.
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
- Tightened `sop/library/methods/M-PRE-002.yaml`, `M-PRE-004.yaml`, `M-PRE-005.yaml`, `M-PRE-006.yaml`, and `M-ENC-015.yaml` so the selected source/material scope must be accounted for first and only then compressed into capped prompt/pillar/category/branch groups.
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

## 2026-03-21 - Page-level HUD primitive migration for Brain, Tutor, and Not Found

- Fixed the shared `HudPanel` and `HudButton` primitives in `dashboard_rebuild/client/src/components/ui/` so the new page-surface components build and can be reused by route-level shells.
- Wrapped `dashboard_rebuild/client/src/pages/brain.tsx` in `HudPanel` and removed the route-local `bg-black/25` frame fills so Brain uses the shared HUD surface instead of its own page-level glass styling.
- Rebuilt `dashboard_rebuild/client/src/pages/not-found.tsx` on `HudPanel` plus shared theme tokens, replacing the hand-built border/background card with the shared page-surface treatment.
- Swapped the Tutor hero refresh action in `dashboard_rebuild/client/src/pages/tutor.tsx` from the generic shell `Button` to `HudButton` so the route-level page action now uses the Phase 1 HUD primitive.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- src/pages/__tests__/brain.test.tsx src/pages/__tests__/tutor.test.tsx src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-21 - HUD primitive regression coverage for Brain, Tutor, and Not Found

- Added stable `data-ui` / `data-hud-variant` selectors to `dashboard_rebuild/client/src/components/ui/HudPanel.tsx` and `dashboard_rebuild/client/src/components/ui/HudButton.tsx` so page-level primitive adoption can be asserted directly instead of inferred from route-local class names.
- Extended `dashboard_rebuild/client/src/pages/__tests__/brain.test.tsx` and `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx` to verify Brain still renders a `HudPanel` shell and Tutor still uses the shared `HudButton` for the hero refresh action.
- Added `dashboard_rebuild/client/src/pages/__tests__/not-found.test.tsx` so the 404 route is covered by the same page-level HUD primitive adoption checks.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- src/pages/__tests__/brain.test.tsx src/pages/__tests__/tutor.test.tsx src/pages/__tests__/tutor.workspace.integration.test.tsx src/pages/__tests__/not-found.test.tsx`

## 2026-03-21 - TutorArchitect Launch/Priming hardening wave

- Fixed the first-save Priming bundle insert path in `brain/dashboard/api_tutor_workflows.py`, mirrored Priming course/topic/study-unit context back onto workflow rows, and added `brain/tests/test_tutor_workflow_priming_assist.py` coverage so broken or early drafts stay identifiable in Launch instead of collapsing into empty context rows.
- Hardened `dashboard_rebuild/client/src/components/TutorWorkflowLaunchHub.tsx` so Study Wheel rendering no longer dereferences missing hub data, thin workflow rows now show safer fallback labels plus a precise updated timestamp, and regression coverage was extended in `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowLaunchHub.test.tsx`.
- Reworked `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx`, `dashboard_rebuild/client/src/components/priming/PrimingLayout.tsx`, `dashboard_rebuild/client/src/components/priming/PrimingMaterialReader.tsx`, and `dashboard_rebuild/client/src/components/MethodBlockCard.tsx` so `Setup` is scope-only again, `Materials` gets a dedicated full-width reader with pop-out support, method cards are larger with whole-card selection styling, the handoff owns the real Tutor launch contract, and method outputs render more of the structured payload instead of silently dropping non-summary fields.
- Added timer-checkpoint hardening in `dashboard_rebuild/client/src/hooks/useTutorSession.ts` and `dashboard_rebuild/client/src/hooks/useTutorWorkflow.ts` so manual workflow saves log stage-time slices without nullifying the running Tutor timer; added focused hook coverage in `dashboard_rebuild/client/src/hooks/__tests__/useTutorSession.test.tsx` and `dashboard_rebuild/client/src/hooks/__tests__/useTutorWorkflow.test.tsx`.
- Added send-time `@path` parsing in `dashboard_rebuild/client/src/components/useSSEStream.ts` so typed path references are preserved in the visible message while being forwarded as `content_filter.reference_targets`; added regression coverage in `dashboard_rebuild/client/src/components/__tests__/TutorChat.test.tsx`.
- Synced the learner findings into repo execution docs by updating `docs/root/TUTOR_TODO.md`, `conductor/tracks/tutor-guided-studyability_20260320/issue-log.md`, and `conductor/tracks/tutor-guided-studyability_20260320/findings.md`.
- Validation passed:
  - `pytest brain/tests/test_tutor_workflow_priming_assist.py -q`
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/TutorWorkflowLaunchHub.test.tsx client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx client/src/hooks/__tests__/useTutorSession.test.tsx client/src/hooks/__tests__/useTutorWorkflow.test.tsx client/src/components/__tests__/TutorChat.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-22 - SWARM-101 HUD migration for Scholar, Library, and Methods

- Migrated `dashboard_rebuild/client/src/pages/scholar.tsx` from route-local panel shells to shared `HudPanel` surfaces, remapped its legacy Scholar panel constants onto shared theme tokens, and moved the page refresh / action controls onto `HudButton`.
- Migrated the main route chrome in `dashboard_rebuild/client/src/pages/library.tsx` to `HudPanel` / `HudButton`, including the sidebar shell, ingest/sync panels, Tutor queue controls, table shell, and the remaining destructive cleanup actions.
- Tightened `dashboard_rebuild/client/src/pages/methods.tsx` so the workspace sidebar, stage filter, chain snapshot, chain detail actions, and dialog actions now use the shared HUD primitives instead of route-local shadcn buttons or bespoke panel shells.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- src/pages/__tests__/scholar.test.tsx src/pages/__tests__/library.test.tsx src/pages/__tests__/methods.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-22 - Keep-alive page hero sync fix

- Updated `dashboard_rebuild/client/src/components/PageScaffold.tsx` so each mounted scaffold watches `wouter` location changes, checks whether its own route shell is currently hidden by the keep-alive wrapper, and only then claims the shared `page-hero-portal`.
- This fixes the stale-header bug where switching away from a previously visited page could leave that page's hero title and subtitle mounted above the next route because the old page stayed mounted under `display: none`.
- Added `dashboard_rebuild/client/src/components/__tests__/PageScaffold.test.tsx` to cover `Brain -> Method Library -> Brain` hero switching plus the no-visible-scaffold case where the portal should clear.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- src/components/__tests__/PageScaffold.test.tsx src/components/__tests__/layout.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - Live smoke via `Start_Dashboard.bat` on `http://127.0.0.1:5000`: `Brain -> Methods -> Brain` now updates the visible hero heading/subtitle on each route change.

## 2026-03-22 - Shared glass surface pass

- Moved the page hero, hero actions, and hero stat cards onto translucent glass styling in `PageScaffold` so the backdrop art reads through the shared route header.
- Softened the shared workspace shells and extended the same glass treatment to `Library`, `Methods`, and `Scholar` route panels.
- Validation passed:
  - `cd dashboard_rebuild && npm run build`
  - `Start_Dashboard.bat`
  - Live browser screenshots on `/tutor`, `/library`, `/methods`, and `/scholar`

## 2026-03-22 - Tutor patterned button rail layering fix

- Split the Tutor patterned nav button visuals into a stable rail layer plus an animated pseudo-layer so hover-size changes no longer hide the top edge.
- Kept the small vertical padding buffer on the Tutor row buttons so the animated label has room to grow without crowding the rail line.
- Added a guardrail note in `docs/root/AGENT_GUARDRAILS.md` so the pseudo-layer approach is the remembered default for future Tutor patterned buttons.
- Validation passed:
  - `cd dashboard_rebuild && npm run build`
  - Live hover screenshot of the Tutor nav strip from `http://127.0.0.1:5000/tutor`

## 2026-03-22 - Tutor patterned button hover pin fix

- Found the remaining hover clipping cause: the Tutor row uses the shared `Button` primitive with `variant="ghost"`, and that shared variant still applies hover/active translate utilities.
- Neutralized `transform` on the Tutor-specific patterned button class for base, hover, and active states, tightened the hover font bump slightly, and kept the row-specific line-height pinned so the button stays inside the strip during hover.
- Extended the Tutor button guardrail in `docs/root/AGENT_GUARDRAILS.md` to call out the shared ghost-variant translate leak explicitly.
- Validation passed:
  - `cd dashboard_rebuild && npm run build`
  - Live hover screenshot of the Tutor nav strip from `http://127.0.0.1:5000/tutor`

## 2026-03-22 - Tutor tablist clipping geometry fix

- Verified in live Chrome DevTools that the Tutor tablist (`[data-testid="workspace-tab-bar"]`) and hovered tab button were sharing the same top edge and effective height, while the tablist computed `overflow-y: auto` because of `overflow-x-auto`.
- Reduced the Tutor patterned button minimum height/padding in `dashboard_rebuild/client/src/components/TutorTabBar.tsx` and added row-level vertical padding so the tablist is now taller than the hovered button instead of acting as the clip boundary.
- Extended `docs/root/AGENT_GUARDRAILS.md` with the geometry rule: leave explicit vertical slack when using horizontally scrollable tab rows because `overflow-x-auto` can still clip hover growth vertically.
- Validation passed:
  - `cd dashboard_rebuild && npm run build`
  - Live Chrome DevTools inspection on `http://127.0.0.1:5000/tutor`: tablist `paddingTop=4px`, `paddingBottom=4px`, hovered button height `70px`, tablist height `77.99px`, slack `top≈2px`, `bottom≈6px`

## 2026-03-22 - Repo permission surface minimization

- Reduced repo-local `permissions.json` to the minimum policy surface by clearing the legacy `allow_execution` list and leaving only the explicit destructive confirmation for `del`.
- Mirrored the same minimal policy into `.claude/permissions.json` so the repo-local Claude compatibility file stays aligned with root policy.
- Left `.claude/settings.local.json` unchanged because it was already in the minimal `bypassPermissions` state with `allow: []`.
- Validation passed:
  - `permissions.json` and `.claude/permissions.json` both parse as valid JSON
  - the two files now have the same content (`git diff --no-index` produced no diff)

## 2026-03-22 - Calendar debug surface cleanup

- Removed the dead `debugModals` diagnostic surface from `dashboard_rebuild/client/src/pages/calendar.tsx`, including the query-param debug flag, modal state overlay, and debug-only console logging.
- Deleted the tracked scratch audit scripts `.tmp_tutor_audit.mjs` and `.tmp_tutor_audit.cjs`; they were unreferenced repo-root leftovers from an earlier Tutor audit pass.
- Validation passed:
  - `rg -n "debugModals|ModalDebug|tmp_tutor_audit" C:\pt-study-sop` returned no matches
  - `cd dashboard_rebuild && npm run build`

## 2026-03-22 - Screenshot utility consolidation

- Consolidated the root Playwright screenshot utilities into `screenshot.mjs` by keeping the better full-height viewport logic and removing the redundant `screenshot-full.mjs` and `screenshot-calendar.mjs` variants.
- Verified the deleted variants were not referenced elsewhere in the repo and were only introduced as one-off snapshot helpers in the `snapshot current workspace` commit.
- Validation passed:
  - `node --check C:\pt-study-sop\screenshot.mjs`
  - `rg -n "screenshot-full\.mjs|screenshot-calendar\.mjs" C:\pt-study-sop` returned no matches

## 2026-03-22 - Screenshot output folder cleanup

- Repointed `screenshot.mjs` to write generated route captures into `docs/screenshots/routes/` instead of creating a repo-root `screenshots/` dump folder.
- Moved the tracked root screenshot PNGs into `docs/screenshots/routes/` so the repo home no longer carries those captures.
- Added a `.gitignore` guardrail for the legacy root `screenshots/` folder to keep future screenshot dumps out of the repo home.

## 2026-03-23 - Git hook execution hardening

- Fixed the repo's managed hook installer so shell hooks are written with LF line endings instead of CRLF, which was breaking `#!/bin/sh` execution under Git Bash on Windows.
- Hardened the generated `pre-commit` and `pre-push` hook bodies to resolve `pwsh.exe` and `python.exe` explicitly before falling back, avoiding Git Bash permission errors on bare `pwsh` and `python`.
- Reinstalled the managed hooks in this clone and verified `pre-commit` now executes successfully from Git Bash.
- Validation passed:
  - `pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\install_agent_guard_hooks.ps1 -Action install`
  - `bash -lc .git/hooks/pre-commit`

## 2026-03-23 - Skill sync preservation for Codex-only local skills

- Installed the full current `mattpocock/skills` catalog into the shared global skill store under `C:\Users\treyt\.agents\skills`.
- While syncing the new skills into agent roots, found that `scripts/sync_agent_skills.ps1` treated several Codex-only local skills as drift and removed them from `C:\Users\treyt\.codex\skills`.
- Restored the removed Codex-only skills from the backup created by the sync script and expanded the `codex` `LocalOnlyNames` allowlist so future syncs preserve those local-only directories.
- Validation passed:
  - `npx skills add mattpocock/skills -g --all -y`
  - `pwsh -NoProfile -ExecutionPolicy Bypass -File C:\pt-study-sop\scripts\sync_agent_skills.ps1 -Mode Apply`
  - `pwsh -NoProfile -ExecutionPolicy Bypass -File C:\pt-study-sop\scripts\sync_agent_skills.ps1 -Mode Check`

## 2026-03-25 - Global dev-browser install and shared skill projection

- Installed `dev-browser@0.2.3` globally with `npm i -g dev-browser`.
- Used `dev-browser install-skill` to add the embedded `dev-browser` skill into `C:\Users\treyt\.agents\skills` and `C:\Users\treyt\.claude\skills`.
- Promoted `dev-browser` out of the Codex local-only allowlist so `scripts/sync_agent_skills.ps1` can project it into every supported agent root.
- Synced the shared skill topology, which relinked Codex and Claude to the canonical shared `dev-browser` skill and linked the skill into Cursor, OpenCode, Gemini, Antigravity, and Kimi.
- Validation passed:
  - `dev-browser --help`
  - `pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync_agent_config.ps1 -Mode Check`
  - `pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync_agent_skills.ps1 -Mode Apply`
  - `pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync_agent_skills.ps1 -Mode Check`
  - `dev-browser install`
  - `dev-browser status`
  - `dev-browser browsers`

## 2026-03-26 - Floating-panel Studio corrective shell alignment

- Corrected the `/tutor` Studio surface after the first floating-panel cutover landed as the old stage-switching architecture wrapped in draggable panels.
- Reworked `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` into the actual spec model: toolbar-spawned floating panels, preset layouts, zoomable canvas, and empty entry state.
- Removed the visible stage navigation and STUDIO/TUTOR tab switching from the Tutor shell/page surface in `dashboard_rebuild/client/src/components/TutorShell.tsx`, `dashboard_rebuild/client/src/components/TutorTopBar.tsx`, and `dashboard_rebuild/client/src/pages/tutor.tsx`.
- Fixed the live-session restore path so explicit session restores and in-panel Tutor starts open the study preset instead of falling back to the empty entry card.
- Hardened the page test environment with shared browser polyfills in `dashboard_rebuild/client/src/test/setup.ts` and narrowed page-level workspace mocks so the corrective UI contract is tested independently of tldraw internals.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorShell.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-26 - Floating-panel Studio UX interaction fixes

- Tightened the transformed canvas interaction model in `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` so zoom only responds to `Ctrl + mouse wheel` and the current zoom scale is fed into each `WorkspacePanel` instance.
- Updated `dashboard_rebuild/client/src/components/ui/WorkspacePanel.tsx` to forward `scale` into `react-rnd`, add stricter `min-w-0` / `min-h-0` containment, and clip panel bodies so long text and embedded content stay inside the panel bounds.
- Increased the default and preset panel dimensions for the core study surfaces in `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` so Document Dock, Workspace, Tutor, Tutor Status, Memory, and packet panels open large enough for real material without immediate manual resize.
- Added focused regression coverage in `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx` and `dashboard_rebuild/client/src/components/__tests__/WorkspacePanel.test.tsx`.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx client/src/components/__tests__/WorkspacePanel.test.tsx client/src/components/__tests__/TutorShell.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `dev-browser --headless --timeout 30 run <wheel-check script>`
  - `dev-browser --headless --timeout 20 run <memory-panel drag script>`

## 2026-03-26 - Floating-panel canvas centering follow-up

- Finished the remaining `/tutor` window-centering behavior after the first UX pass still let the page land in the middle of panel content.
- Kept the standard Tutor page flow intact and instead changed `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` so panel recentering scrolls the page to the canvas and top-anchors the focused panel layout.
- Hooked preset changes into the same focus path so newly applied layouts land in-frame automatically.
- Added regression coverage in `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx` for the canvas scroll-into-view behavior.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx client/src/components/__tests__/TutorChat.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx client/src/components/__tests__/layout.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live browser check on `http://127.0.0.1:5000/tutor` confirmed the page now lands on the canvas with visible panel title bars

## 2026-03-26 - Floating-panel top-left tiling

- Replaced the staggered floating-window placement in `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` with a tiled layout rule that starts in the top-left, fills left-to-right, and wraps to a new row from the left edge when the working width is full.
- Applied the same tiling rule to default preset creation, preset-button layout replacement, and toolbar-spawned panels so all new windows follow the same placement model.
- Added focused tiling coverage in `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx`.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live browser verification confirmed the default study window set now opens in top-left rows instead of scattered positions

## 2026-03-26 - Floating-window selection, grouping, and canvas hand-pan

- Extended `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` so panels can be selected from their title bars, grouped and ungrouped from the toolbar, and moved together using shared drag deltas.
- Added `groupId` persistence support in `dashboard_rebuild/client/src/lib/studioPanelLayout.ts` and protected restored layouts from future group-id collisions by reseeding the local group counter from existing saved group ids.
- Updated `dashboard_rebuild/client/src/components/ui/WorkspacePanel.tsx` with selected/grouped window chrome, grouped title badges, and live `onDrag` position updates so multi-window moves track during the drag instead of only on drop.
- Switched the floating canvas panning model to plain background mouse drag while leaving zoom on `Ctrl + wheel`.
- Added focused regression coverage in `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx` for panning config, group/ungroup behavior, and linked panel movement.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live browser verification on `http://127.0.0.1:5000/tutor` confirmed hand-pan cursor classes, selected-count updates, and grouped panel badges on the active selection

## 2026-03-26 - Background-only canvas pan

- Removed dependency on `react-zoom-pan-pinch` mouse panning for the Studio canvas and replaced it with explicit `pointerdown` / `pointermove` / `pointerup` handling on the empty canvas surface in `dashboard_rebuild/client/src/components/studio/StudioShell.tsx`.
- The new interaction starts only when the pointer begins outside `.workspace-panel-root`, so window drags stay window-local and only empty canvas grabs move the viewport.
- Tracked drag state explicitly for the `grab` / `grabbing` cursor and wrapped pointer capture calls so non-real pointer environments do not throw during tests or browser tooling.
- Added focused regression coverage in `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx` to prove empty-canvas drags call `setTransform` while panel title drags do not.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-26 - Tutor route legacy chrome removal

- Removed the remaining page-level Tutor hero and inline runtime strip from `dashboard_rebuild/client/src/pages/tutor.tsx` by dropping the `PageScaffold` wrapper and removing `TutorTopBar` from the `CoreWorkspaceFrame`.
- Kept the route shell minimal so the floating toolbar and canvas own the page surface instead of the old `Live Study Core` / `ACTIVE WORKFLOW` content.
- Updated `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx` to assert the new route contract: no page hero, no page-level refresh button, no inline teach runtime, and no legacy Brain handoff banner outside the canvas.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/pages/__tests__/tutor.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live `dev-browser` verification on `http://127.0.0.1:5000/tutor` confirmed the nav leads directly into the floating toolbar/canvas stack

## 2026-03-26 - Panel contract completion before Checkpoint 3

- Added the missing `Mind Map` registry entry and toolbar button in `dashboard_rebuild/client/src/components/studio/StudioShell.tsx`, then mounted the real `MindMapView` from `dashboard_rebuild/client/src/components/TutorShell.tsx`.
- Wired the real Priming floating panel with a persisted Priming-owned selector bar:
  - `primingMethodIds`, `primingChainId`, and `primingCustomBlockIds` now persist through StudioRun/frontend API types/backend project-shell serialization
  - Priming selector changes no longer mutate Tutor selector state
- Wired the Tutor floating panel with:
  - Tutor-owned chain/template selector bar
  - existing behavior override buttons in-panel
  - voice dictation from `useChromiumDictation.ts`
  - the existing chat/runtime flow below the selector bar
- Added the centered entry-state card and fixed two real route/browser races:
  - project-shell hydration no longer overwrites a user-opened preset with an empty saved panel layout in `dashboard_rebuild/client/src/pages/tutor.tsx`
  - the canvas no longer captures `pointerdown` from the entry-state card, so `Start Priming` works in the real browser instead of only in tests
- Added/updated regression coverage in:
  - `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx`
  - `dashboard_rebuild/client/src/components/__tests__/TutorShell.test.tsx`
  - `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx client/src/components/__tests__/TutorShell.test.tsx client/src/pages/__tests__/tutor.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live `dev-browser` verification on `http://127.0.0.1:5000/tutor` produced:
    - entry-state screenshot + DOM: `C:\\Users\\treyt\\.dev-browser\\tmp\\tutor-entry-force.png`, `C:\\Users\\treyt\\.dev-browser\\tmp\\tutor-entry-force-dom.html`
    - `Start Priming` screenshot + DOM: `C:\\Users\\treyt\\.dev-browser\\tmp\\tutor-entry-start-priming.png`, `C:\\Users\\treyt\\.dev-browser\\tmp\\tutor-entry-start-priming-dom.html`
    - live panel wiring screenshot + DOM: `C:\\Users\\treyt\\.dev-browser\\tmp\\tutor-panel-wiring.png`, `C:\\Users\\treyt\\.dev-browser\\tmp\\tutor-panel-wiring-dom.html`
  - live selector independence check:
    - Priming set to `template:158` left Tutor at `auto`
    - Tutor set to `template:160` left Priming at `template:158`

## 2026-03-26 - Legacy shell/view compatibility purge before Checkpoint 3

- Removed the remaining `shellMode` / `studioView` compatibility state from the live Tutor runtime path so Checkpoint 3 cannot couple back to the old stage-switching architecture.
- `dashboard_rebuild/client/src/hooks/useStudioRun.ts` now persists only real Tutor shell query state (`course_id`, `session_id`, `board_scope`, `board_id`) and no longer owns a synthetic shell mode.
- `dashboard_rebuild/client/src/hooks/useTutorWorkflow.ts` no longer accepts shell mode setters, no longer stores `studioView`, and no longer routes workflow actions through hidden view transitions.
- `dashboard_rebuild/client/src/hooks/useTutorSession.ts` no longer accepts or mutates shell/view compatibility state; restore/start/resume now operate strictly on actual session/runtime state.
- `dashboard_rebuild/client/src/pages/tutor.tsx` no longer restores, persists, or branches on `shellMode`, `studioView`, or project-shell `last_mode`. Query `mode=` is now inert compatibility input rather than live runtime state.
- Updated the affected hook/page regressions so they assert the new single-canvas restore model instead of the deleted compatibility contract.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/hooks/__tests__/useStudioRun.test.tsx client/src/hooks/__tests__/useTutorWorkflow.test.tsx client/src/hooks/__tests__/useTutorSession.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/components/__tests__/TutorShell.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-26 - Checkpoint 3 revalidation after legacy shell/view purge

- Revalidated the already-landed Checkpoint 3 surface/runtime work after the shell/view purge instead of re-implementing it:
  - `Source Shelf` still exposes real `Current Run`, `Library`, and `Vault` working surfaces.
  - `Document Dock` multi-document behavior remains green through the routed Tutor workspace tests.
  - `Run Config` remains a live control surface with Tutor-owned selector controls and runtime-rule controls.
  - `Library -> Tutor` handoff still lands in the floating Studio shell with run context intact.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorShell.test.tsx client/src/pages/__tests__/library.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/hooks/__tests__/useTutorSession.test.tsx client/src/hooks/__tests__/useTutorWorkflow.test.tsx`
  - `cd dashboard_rebuild && npm run build`
- Live `dev-browser` verification passed:
  - tutor surface capture: `C:\\Users\\treyt\\.dev-browser\\tmp\\checkpoint3-tutor-panels-current.png`, `C:\\Users\\treyt\\.dev-browser\\tmp\\checkpoint3-tutor-panels-current-dom.html`
  - library handoff capture: `C:\\Users\\treyt\\.dev-browser\\tmp\\checkpoint3-library-handoff.png`, `C:\\Users\\treyt\\.dev-browser\\tmp\\checkpoint3-library-handoff-dom.html`

## 2026-03-26 - Checkpoint 4A telemetry-driven compaction runtime

- Removed the old heuristic compaction-pressure model from the live Tutor shell and replaced it with backend telemetry plus an explicit `Awaiting telemetry` fallback when no completed turn has reported live context usage yet.
- Replaced the hard-coded 20-assistant-message auto-compaction trigger in `dashboard_rebuild/client/src/components/TutorChat.tsx` with telemetry-driven auto-compaction keyed off backend `pressureLevel: high`.
- Added explicit regression coverage proving the active memory capsule becomes the next-turn Tutor context after compaction instead of merely being stored in project/runtime state.
- Added explicit rule reinforcement after compaction/resume by carrying merged `session_rules` through Tutor session start and live turn requests; active capsule `rule_snapshot_text` is now reattached as first-class session rules instead of relying only on summary text embedded in the capsule context blob.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/lib/__tests__/studioTutorStatus.test.ts client/src/lib/__tests__/studioMemoryStatus.test.ts client/src/components/__tests__/TutorChat.test.tsx client/src/hooks/__tests__/useTutorSession.test.tsx client/src/components/__tests__/TutorShell.test.tsx`
  - `pytest brain/tests/test_tutor_turn_stream_contract.py brain/tests/test_tutor_session_linking.py -q`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-26 - Checkpoint 4B capsule resume and direct Tutor vault save revalidation

- Revalidated the already-landed Checkpoint 4B behavior after committing 4A; no additional implementation change was required.
- Capsule resume remains wired through `MemoryPanel` -> `TutorShell` -> StudioRun `activeMemoryCapsuleId`, and the public Tutor shell test still proves users can activate a specific capsule from the Memory panel.
- Direct Tutor note -> vault save remains wired through `useTutorWorkflow.saveWorkflowNoteToVault(...)` and the Tutor panel save buttons, without routing through Polish.
- Direct vault-save runtime state remains persisted in StudioRun and projected into Tutor Status as `Saving to vault`, `Saved to vault`, or `Vault save failed`.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorShell.test.tsx client/src/hooks/__tests__/useTutorWorkflow.test.tsx client/src/hooks/__tests__/useStudioRun.test.tsx client/src/lib/__tests__/studioTutorStatus.test.ts`
  - `cd dashboard_rebuild && npm run build`
  - live `dev-browser` verification on `http://127.0.0.1:5000/tutor` produced `C:\\Users\\treyt\\.dev-browser\\tmp\\checkpoint4b-tutor.png` and `C:\\Users\\treyt\\.dev-browser\\tmp\\checkpoint4b-tutor-dom.txt`

## 2026-03-26 - Checkpoint 5 shipped-surface cleanup and release gate

- Revalidated the shipped-route contract and applied one remaining live cleanup:
  - Brain home still owns the workflow hub widgets.
  - `/tutor` still excludes those widgets and the old stage/tab chrome.
  - `library.tsx` no longer writes `mode=studio` into fresh Tutor handoff URLs.
  - `api.types.ts` now limits `TutorShellMode` to `studio | tutor`, matching the backend contract.
- The remaining Checkpoint 5 cleanup surfaces stayed green without further implementation:
  - App router still unmounts prior routes instead of hiding them with `display:none`.
  - `/nav-lab` remains unshipped.
  - Theme Lab remains absent from shipped routes.
  - the `tldraw` vendor CTA remains stripped from the workspace surface.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/pages/__tests__/library.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/pages/__tests__/brain.test.tsx client/src/components/__tests__/layout.test.tsx`
  - `pytest brain/tests/test_tutor_project_shell.py -q`
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorShell.test.tsx client/src/pages/__tests__/brain.test.tsx client/src/components/__tests__/layout.test.tsx`
  - `pytest brain/tests/`
  - `cd dashboard_rebuild && npm run build`
  - live `dev-browser` smoke on `http://127.0.0.1:5000/tutor` produced `C:\\Users\\treyt\\.dev-browser\\tmp\\checkpoint5-tutor.png` and `C:\\Users\\treyt\\.dev-browser\\tmp\\checkpoint5-tutor-dom.txt`

## 2026-03-26 - Removed legacy Tutor managed-note auto-writes

- Traced the legacy managed-section note writer in `brain/dashboard/api_tutor_vault.py`, where helper functions were building and patching the `_Map of Contents.md` and `Learning Objectives & To Do.md` notes.
- Confirmed the trigger path is internal repo code, not an Obsidian plugin:
  - frontend Tutor preflight in `dashboard_rebuild/client/src/hooks/useTutorSession.ts` auto-sends `vault_folder` during Tutor preflight/session start
  - backend preflight/session linking in `brain/dashboard/api_tutor_vault.py` and `brain/dashboard/api_tutor_sessions.py` calls `_ensure_moc_context(...)`, which writes those pages
- Removed the managed-section writer helpers entirely, made `_ensure_moc_context(...)` pure context derivation, removed sync-only preflight/session fields, and dropped the temporary launcher kill switch because the writer no longer exists.
- Added regression coverage in `brain/tests/test_tutor_obsidian_io.py` proving Tutor context derivation no longer writes managed Obsidian notes.
- Validation passed:
  - `pytest brain/tests/test_tutor_obsidian_io.py brain/tests/test_tutor_session_linking.py brain/tests/test_tutor_audit_remediation.py -q`

## 2026-03-26 - Restored live floating-panel drag in Tutor workspace

- Ran a real browser-driven regression on `http://127.0.0.1:5000/tutor` after the user reported that panels still could not be moved.
- Confirmed the failure live before the fix: a `dev-browser` header drag on a visible floating panel produced `deltaLeft: 0` and `deltaTop: 0`, proving the panel was not moving.
- Root cause was the panel layer swallowing its own mouse/pointer events in `WorkspacePanel.tsx` even though the canvas drag guard in `StudioShell.tsx` already ignores anything inside `.workspace-panel-root`.
- Kept the deferred title-bar selection update in `StudioShell.tsx` and removed the redundant event swallowing from the panel title/body in `WorkspacePanel.tsx`, allowing `react-rnd` to receive the real drag start again.
- Replaced the old propagation-blocking unit regression with a direct title-bar selection callback regression in `dashboard_rebuild/client/src/components/__tests__/WorkspacePanel.test.tsx`, and updated the grouped-selection Studio shell test to wait for the deferred selection state.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx client/src/components/__tests__/WorkspacePanel.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live `dev-browser` drag verification on `http://127.0.0.1:5000/tutor` now produced a non-zero panel move delta and saved `C:\\Users\\treyt\\.dev-browser\\tmp\\tutor-live-drag-postfix.png`

## 2026-03-26 - Restored Tutor panel top header and fixed locked window remounting

- Followed up on the user's report that the Tutor panel header was missing and the windows still felt locked in place.
- Found the deeper drag bug in `dashboard_rebuild/client/src/components/studio/StudioShell.tsx`: each `WorkspacePanel` key included `x`, `y`, `width`, `height`, and `collapsed`, which caused the panel to remount on every drag tick and kill live dragging mid-gesture.
- Switched `WorkspacePanel` to a stable `key={layoutItem.id}`, added a regression proving the Tutor panel DOM node survives a position update, and kept the deferred title-bar selection handling intact.
- Restored the visible Tutor runtime header by moving `TutorTeachRuntimeStrip` back to the top of `TutorChat.tsx` instead of hiding it inside the collapsed Dev Info block.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx client/src/components/__tests__/WorkspacePanel.test.tsx client/src/components/__tests__/TutorChat.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live `dev-browser` verification on `http://127.0.0.1:5000/tutor` confirmed:
    - Tutor runtime strip visible inside the Tutor panel
    - Tutor panel drag moved by `deltaLeft: 160`, `deltaTop: 60`
    - live Tutor textarea accepted typed input
  - browser artifact: `C:\\Users\\treyt\\.dev-browser\\tmp\\tutor-header-drag-verify.png`

## 2026-03-26 - Stabilized drag-start selection and restored the Tutor hero banner inside the panel

- Followed up on the user's report that grabbing one panel still made the window set drop away from the top and that the Tutor banner matching the old page hero styling was still missing.
- Updated `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` so drag-start uses a synchronous `selectedPanelIdsRef` instead of waiting for deferred React state, which prevents the first drag frame from reading stale multi-select state.
- Kept canvas background deselection in sync with the same ref so panel drags and background pans do not fight over old selection membership.
- Added a real in-panel Tutor hero banner in `dashboard_rebuild/client/src/components/tutor-shell/TutorLiveStudyPane.tsx` using the existing page hero styling language, with course/study context, live session/material/turn stats, and a refresh action.
- Added a Tutor-shell regression in `dashboard_rebuild/client/src/components/__tests__/TutorShell.test.tsx` that proves the Tutor hero renders inside the floating Tutor panel.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx client/src/components/__tests__/WorkspacePanel.test.tsx client/src/components/__tests__/TutorChat.test.tsx client/src/components/__tests__/TutorShell.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live `dev-browser` verification on `http://127.0.0.1:5000/tutor` confirmed:
    - `tutor-panel-hero` is visible inside the Tutor panel
    - browser artifacts saved to `C:\\Users\\treyt\\.dev-browser\\tmp\\tutor-panel-hero-drag.png`, `C:\\Users\\treyt\\.dev-browser\\tmp\\tutor-panel-hero-drag-dom.html`, and `C:\\Users\\treyt\\.dev-browser\\tmp\\tutor-panel-hero-dispatch.png`

## 2026-03-26 - Removed automatic viewport recentering on panel moves and moved Tutor hero above the panel body

- Followed up on the user's report that the viewport recenters itself whenever a panel is moved and that the Tutor hero had been inserted too far down into the panel body.
- Removed the old one-time auto-focus layout effect from `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` so the canvas no longer recenters itself on ordinary layout updates; only explicit actions like presets, reset, and `Center Windows` can move the viewport now.
- Moved the Tutor hero/header above the selector bar by passing the selector bar into `TutorLiveStudyPane` as `headerContent`, so the hero now sits at the top of the Tutor window instead of inside the chat body.
- Added a Studio shell regression proving panel position updates do not call the canvas transform recenter path, and tightened the Tutor shell regression to assert the hero appears before the selector bar.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx client/src/components/__tests__/TutorShell.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live `dev-browser` verification on `http://127.0.0.1:5000/tutor` confirmed:
    - the Tutor hero appears before the selector bar in DOM order
    - browser artifacts saved to `C:\\Users\\treyt\\.dev-browser\\tmp\\tutor-hero-top-order.png` and `C:\\Users\\treyt\\.dev-browser\\tmp\\tutor-hero-top-order-dom.html`

## 2026-03-26 - Restored the Tutor bar to the route shell below the hero and above the workspace

- Moved the canonical Tutor header back to the route shell by mounting `TutorTopBar` through `CoreWorkspaceFrame.topBar` in `dashboard_rebuild/client/src/pages/tutor.tsx`.
- Removed the guard that only mounted the route-level bar for live session or workflow state so `/tutor` always shows the Tutor bar in the shell.
- Updated `dashboard_rebuild/client/src/components/TutorTopBar.tsx` to render a default `READY` route-level strip when there is no active session yet, while still promoting `LIVE SESSION` when Tutor is running.
- Kept the floating Tutor panel panel-local by removing the duplicate in-panel hero/header from `dashboard_rebuild/client/src/components/tutor-shell/TutorLiveStudyPane.tsx` and leaving only the selector bar plus chat controls inside the panel.
- Tightened `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx` and `dashboard_rebuild/client/src/components/__tests__/TutorShell.test.tsx` so the route-level Tutor bar stays above `studio-toolbar` and the floating Tutor panel never regrows a duplicate header.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/pages/__tests__/tutor.test.tsx client/src/components/__tests__/TutorShell.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live `dev-browser` verification on `http://127.0.0.1:5000/tutor` confirmed:
    - `.brain-workspace__top-bar` is present
    - the Tutor bar sits above `studio-toolbar`
    - no `tutor-panel-hero` exists inside the floating Tutor panel
    - browser artifacts saved to `C:\\Users\\treyt\\.dev-browser\\tmp\\tutor-topbar-route.png` and `C:\\Users\\treyt\\.dev-browser\\tmp\\tutor-topbar-route-dom.json`

## 2026-03-26 - Updated global Codex CLI to 0.117.0

- Checked the active install path and confirmed the machine was resolving `@openai/codex@0.116.0` from `C:\\Users\\treyt\\AppData\\Roaming\\npm\\codex.ps1`.
- Verified the latest published stable package was `0.117.0` and upgraded with `npm install -g @openai/codex@0.117.0`.
- Post-update validation passed:
  - `codex --version` returned `codex-cli 0.117.0`
  - `npm -g list @openai/codex --depth=0` returned `@openai/codex@0.117.0`
- Windows npm left the staged cleanup directory `C:\\Users\\treyt\\AppData\\Roaming\\npm\\node_modules\\@openai\\.codex-9LiMfdh1` because the old `codex.exe` was locked during cleanup, but the active install upgraded successfully.

## 2026-03-26 - Restored Tutor route hero and matched its header height to Brain and Scholar

- Restored the `/tutor` route-level `PageScaffold` hero with Tutor-specific copy and stats so the route once again shows the same top shell family as Brain and Scholar without reintroducing Brain-specific widgets.
- Added an optional `heroClassName` override to `dashboard_rebuild/client/src/components/PageScaffold.tsx` and used it in `dashboard_rebuild/client/src/pages/tutor.tsx` to pin the Tutor hero to the same minimum height as the Brain and Scholar headers.
- Updated `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx` so the Tutor route now asserts the restored hero shell is present instead of expecting it to be absent.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/PageScaffold.test.tsx client/src/pages/__tests__/tutor.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `agent-browser` verification after rebuild confirmed:
    - `/tutor` hero height: `243px`
    - `/scholar` hero height: `243.03125px`

## 2026-03-26 - Replaced the floating Priming wizard with the Phase 1 tool panel

- Replaced the old five-step Priming wizard in `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` with a single tool panel that shows loaded-material chips, a grouped method/chain dropdown, one `RUN` action, a formatted output area, and the Phase 2 chat placeholder.
- Removed `dashboard_rebuild/client/src/components/priming/PrimingLayout.tsx`, rewired `dashboard_rebuild/client/src/components/TutorShell.tsx` so Priming owns its own selector UI, and kept result promotion flowing into both Prime Packet and Workspace.
- Extended `dashboard_rebuild/client/src/lib/studioWorkspaceObjects.ts` so promoted Priming result blocks persist as workspace text notes with `priming_result` provenance.
- Fixed floating-panel overflow by making panel bodies scroll internally in `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` and `dashboard_rebuild/client/src/components/ui/WorkspacePanel.tsx`.
- Fixed live execution by teaching `dashboard_rebuild/client/src/hooks/useTutorWorkflow.ts` to lazily bootstrap a Priming workflow when `RUN` executes without an active workflow id, and by having the entry-card `Start Priming` action in `dashboard_rebuild/client/src/components/TutorShell.tsx` open that workflow instead of only changing layout.
- Updated Tutor tests to cover the new panel shape and bootstrap behavior in:
  - `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx`
  - `dashboard_rebuild/client/src/components/__tests__/TutorShell.test.tsx`
  - `dashboard_rebuild/client/src/hooks/__tests__/useTutorWorkflow.test.tsx`
  - `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- client/src/hooks/__tests__/useTutorWorkflow.test.tsx client/src/components/__tests__/TutorShell.test.tsx client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx client/src/pages/__tests__/tutor.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live `agent-browser` verification on `http://127.0.0.1:5000/tutor?course_id=1&mode=studio` confirmed:
    - the Priming panel mounted with `Cardiovascular` loaded
    - `Learning Objectives Primer` returned one formatted objectives result block
    - `Send to Prime Packet` promoted the result into the Prime Packet panel
  - `dev-browser` verification confirmed:
    - loading state was observed during `RUN`
    - screenshot artifacts saved to `C:\\Users\\treyt\\.dev-browser\\tmp\\priming-phase1-panel.png` and `C:\\Users\\treyt\\.dev-browser\\tmp\\priming-phase1-prime-packet.png`

## 2026-03-27 - Added a fresh-session reset path so Tutor can start Priming on a different course

- Added a route-level Tutor session action in `dashboard_rebuild/client/src/components/TutorTopBar.tsx` and `dashboard_rebuild/client/src/pages/tutor.tsx` that exposes `End Session` while a backend session is live and `New Session` otherwise.
- Taught `/tutor` to explicitly end the current backend session, suppress stale project-shell restore, clear local Studio workspace state, and return the user to the centered entry card instead of reopening the old course workspace.
- Expanded the entry card in `dashboard_rebuild/client/src/components/TutorShell.tsx` with a course dropdown and a fresh `Start Priming` path that creates a new workflow, opens the Priming preset, and seeds Source Shelf with the selected course's materials.
- Added course-scoped material loading helpers in `dashboard_rebuild/client/src/hooks/useTutorHub.ts` and workflow bootstrap overrides in `dashboard_rebuild/client/src/hooks/useTutorWorkflow.ts` so Priming starts cleanly against the newly selected course.
- Updated Tutor regressions in:
  - `dashboard_rebuild/client/src/components/__tests__/TutorTopBar.test.tsx`
  - `dashboard_rebuild/client/src/components/__tests__/TutorShell.test.tsx`
  - `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/TutorTopBar.test.tsx client/src/components/__tests__/TutorShell.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/hooks/__tests__/useTutorWorkflow.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live `dev-browser` verification on `http://127.0.0.1:5000/tutor?course_id=1&mode=studio` confirmed:
    - `End Session` returned the route to the entry card
    - selecting course `Neuroscience` and clicking `Start Priming` opened the Priming panel
    - Source Shelf loaded `17 materials in run` for the new course
    - screenshot artifact saved to `C:\\Users\\treyt\\.dev-browser\\tmp\\tutor-new-session-priming.png`

## 2026-03-27 - Added Phase 2 Priming refinement chat inside the floating Priming panel

- Replaced the disabled Priming chat placeholder in `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` with a real chat composer and persistent conversation thread that unlock after a successful `RUN`, clear on the next `RUN`, and surface `Apply changes` when a Priming assistant turn returns revised results.
- Added shared Priming refinement types in `dashboard_rebuild/client/src/api.types.ts`, the frontend API client in `dashboard_rebuild/client/src/api.ts`, and the apply-back-to-output wiring in `dashboard_rebuild/client/src/hooks/useTutorWorkflow.ts` so refined method results can replace the current output area without leaving the floating panel.
- Added a new stateless backend endpoint in `brain/dashboard/api_tutor_workflows.py` at `POST /api/tutor/priming-assist` that accepts the user message, loaded material ids, current extraction results, and prior Priming chat turns, then calls the LLM with the source material plus extraction output as context.
- Added regression coverage in:
  - `brain/tests/test_tutor_workflow_priming_assist.py`
  - `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx`
  - `dashboard_rebuild/client/src/__tests__/api.test.ts`
- Validation passed:
  - `pytest C:/pt-study-sop/brain/tests/test_tutor_workflow_priming_assist.py -q`
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx client/src/__tests__/api.test.ts client/src/components/__tests__/TutorShell.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/hooks/__tests__/useTutorWorkflow.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live `dev-browser` verification confirmed:
    - `New Session` opened the entry card
    - `Start Priming` reopened the Priming preset with `Cardiovascular` loaded
    - `Learning Objectives Primer` produced results and unlocked chat
    - `Expand on objective 3 with more detail about the physiology` returned an assistant response that explicitly referenced objective 3
    - screenshot artifact saved to `C:\\Users\\treyt\\.dev-browser\\tmp\\priming-phase2-chat-verified.png`
- Live-server note:
  - the first browser verification attempts were still hitting an older Python listener on port `5000` (PID `6448`) even after `Start_Dashboard.bat` launched a new process; killing the stale listener allowed the new `POST /api/tutor/priming-assist` route to respond correctly with `400 message is required` on direct probe and then pass the live UI gate

## 2026-03-27 - Started Tutor Studio on an empty canvas and added a clear-canvas toolbar action

- Updated `dashboard_rebuild/client/src/components/TutorShell.tsx` and `dashboard_rebuild/client/src/pages/tutor.tsx` so `Start Priming` and routed session restore can land on an intentionally empty Studio canvas instead of auto-opening the old Priming or Study preset.
- Updated `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` with a `Clear Canvas` toolbar action plus an explicit `autoSeedDefaultPreset` gate so the Tutor route can preserve an empty canvas until the user opens the panels they want.
- Scoped the clear action to canvas-local state by resetting open panel layout, workspace draft objects, document dock tabs, viewer state, and scratch notes without ending the active study workflow.
- Updated regression coverage in:
  - `dashboard_rebuild/client/src/components/__tests__/TutorShell.test.tsx`
  - `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/TutorShell.test.tsx`
  - `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live local browser verification on `http://127.0.0.1:5000/tutor?course_id=1&mode=studio` confirmed:
    - `New Session` returned to the entry card
    - `Start Priming` opened an empty canvas with only the toolbar visible
    - manually opened panels closed cleanly through `Clear Canvas` without returning to setup state

## 2026-03-28 - Added Tutor hero session actions and Studio zoom/size controls

- Updated `dashboard_rebuild/client/src/pages/tutor.tsx`, `dashboard_rebuild/client/src/components/ui/HudButton.tsx`, and `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx` so `/tutor` restores the `LIVE STUDY CORE / TUTOR` hero actions with `NEW SESSION`, conditional `RESUME`, and `REFRESH`, using the checkerboard HUD button treatment and the existing query-invalidation fan-out.
- Updated `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` with a shared zoom control cluster that keeps `Zoom out`, `Zoom in`, the `0.45-1.8` range slider, and the live percentage label synchronized through `onTransformed`.
- Updated `dashboard_rebuild/client/src/components/ui/WorkspacePanel.tsx` with title-bar `Max`, `Fit`, and `Size` controls plus preset choices for `Small 360x400`, `Medium 560x640`, `Large 840x760`, and `Wide 1100x500`, all wired back into the shared Studio panel-layout state.
- Updated regression coverage in:
  - `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
  - `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx`
  - `dashboard_rebuild/client/src/components/__tests__/WorkspacePanel.test.tsx`
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/pages/__tests__/tutor.test.tsx`
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/WorkspacePanel.test.tsx client/src/components/studio/__tests__/StudioShell.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-28 - Enriched the Tutor previous-sessions accordion

- Expanded `dashboard_rebuild/client/src/components/TutorTopBar.tsx` so the `PREVIOUS SESSIONS` accordion now includes compact search, course, and status filters that stay local to the component and preserve the existing Tutor strip/meta-chip styling.
- Enriched each previous-session row with course label, phase badge, completed-session ended-at metadata, and a confirmed delete control that stops propagation so removing a session does not also resume it.
- Updated `dashboard_rebuild/client/src/pages/tutor.tsx` to derive course options from Tutor content sources, pass a course-id-to-name map into `TutorTopBar`, and delete sessions through `api.tutor.deleteSession(sessionId)` followed by `["tutor-sessions"]` cache invalidation.
- Updated regression coverage in:
  - `dashboard_rebuild/client/src/components/__tests__/TutorTopBar.test.tsx`
  - `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorTopBar.test.tsx client/src/pages/__tests__/tutor.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-28 - Added the Tutor previous-sessions accordion

- Updated `dashboard_rebuild/client/src/components/TutorTopBar.tsx` so the `ACTIVE WORKFLOW` strip keeps its existing badges while replacing the obsolete inline session button with a right-aligned `PREVIOUS SESSIONS` accordion toggle.
- The accordion renders up to 20 most-recent sessions using the existing Tutor strip/meta-chip styling, including topic fallback (`Freeform`), status badge, turn count, and started-at metadata, and routes row clicks through the shared resume callback.
- Updated `dashboard_rebuild/client/src/pages/tutor.tsx` and `dashboard_rebuild/client/src/hooks/useTutorHub.ts` so the shared `["tutor-sessions"]` query consistently fetches `api.tutor.listSessions({ limit: 20 })`, avoiding the old `limit: 10` collision and feeding the accordion from the page-level `/tutor` wiring.
- Updated regression coverage in:
  - `dashboard_rebuild/client/src/components/__tests__/TutorTopBar.test.tsx`
  - `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorTopBar.test.tsx client/src/pages/__tests__/tutor.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-27 - Made Center Windows preserve the current canvas zoom

- Updated `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` to split viewport actions into two paths:
  - `Center Windows` now recenters the open panel layout using the current canvas transform scale instead of refitting the layout to the default zoom
  - `Reset canvas view` still uses the fit-to-layout reset behavior when the user wants the standard framing back
- Updated `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx` with stateful zoom-pan mock coverage so Studio shell regressions now verify:
  - zooming in before `Center Windows` preserves the active scale
  - `Reset canvas view` still restores the fitted scale
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- client/src/components/studio/__tests__/StudioShell.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live browser verification on `http://127.0.0.1:5000/tutor?course_id=1&mode=studio` confirmed:
    - zooming the canvas changed the transform to `scale(1.8)`
    - clicking `Center Windows` kept the transform at `scale(1.8)` while updating only the translate offsets
    - clicking `Reset canvas view` returned the canvas to the standard fitted `scale(0.6)`

## 2026-03-27 - Stopped ordinary /tutor startup from reopening the saved floating panel layout

- Updated `dashboard_rebuild/client/src/pages/tutor.tsx` so project-shell hydration no longer reapplies `workspace_state.panel_layout` into an empty Tutor canvas on ordinary `/tutor` load.
- Kept the rest of the project-shell hydration behavior intact, including document tabs, active document tab id, viewer state, runtime state, packet promotions, and selector persistence.
- Updated `/tutor` regressions in `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx` so saved project-shell document tabs still hydrate while the route returns to the centered entry state instead of auto-opening the previous floating windows.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.test.tsx client/src/components/__tests__/TutorShell.test.tsx client/src/components/studio/__tests__/StudioShell.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live browser verification on `http://127.0.0.1:5000/tutor?course_id=1&mode=studio` confirmed:
    - manually opening `Source Shelf` and `Workspace` from the entry state persisted the layout
    - reloading `/tutor` returned to `0` open panels with the entry card visible instead of reopening those windows

## 2026-03-27 - Fixed transformed Studio panel drag drift

- Removed the expanded-panel `onDrag` position commits in `dashboard_rebuild/client/src/components/ui/WorkspacePanel.tsx` so floating windows only commit their controlled position on `onDragStop`, matching the already-stable collapsed-chip path.
- Added `event.stopPropagation()` to the title-bar selection handler in `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` so panel-originated pointer events never bubble into the canvas drag path.
- Kept grouped drag behavior on the existing `applyStudioShellPanelPositionUpdate(...)` delta path, which now applies one batch update from the drag-stop final anchor position instead of a stream of transformed drag-frame updates.
- Updated regression coverage in:
  - `dashboard_rebuild/client/src/components/__tests__/WorkspacePanel.test.tsx`
  - `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx`
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/WorkspacePanel.test.tsx client/src/components/studio/__tests__/StudioShell.test.tsx client/src/components/__tests__/TutorShell.test.tsx client/src/pages/__tests__/tutor.test.tsx client/src/pages/__tests__/tutor.workspace.integration.test.tsx client/src/components/__tests__/WorkspaceCanvas.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - live `dev-browser` verification on `http://127.0.0.1:5000/tutor` confirmed:
    - after `Apply Study preset`, zooming in, and panning the canvas background, 20 rapid title-bar drags on `Memory` changed only the `memory` panel position while `document_dock`, `workspace`, `tutor_chat`, and `tutor_status` stayed fixed
    - a follow-up grouped drag on `Tutor` + `Memory` moved both selected panels by the same delta while the unselected panels stayed fixed
    - screenshot artifact saved to `C:\\Users\\treyt\\.dev-browser\\tmp\\studio-drag-drift-check.png`

## 2026-03-28 - Cleared the remaining Tutor Studio panel and Source Shelf regressions

- Kept the higher upper-viewport anchor in `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` so per-panel `Center` and `Maximize` stay aligned with the top-biased Studio recenter framing instead of falling back to dead-center placement.
- Preserved the real fit-to-content path in `dashboard_rebuild/client/src/components/ui/WorkspacePanel.tsx` by temporarily removing clipping constraints during measurement, while keeping the panel body padded inside the scroll container so long content scrolls vertically.
- Finished the Source Shelf polish pass in `dashboard_rebuild/client/src/components/studio/SourceShelf.tsx`:
  - folder rows now read like tree branches with native button semantics
  - dark-surface filter/action/detail text contrast is brighter
  - vault listings still recurse from a derived folder into the unified tree
- Extended course-to-vault derivation through:
  - `dashboard_rebuild/client/src/hooks/useTutorHub.ts`
  - `dashboard_rebuild/client/src/components/TutorShell.tsx`
  - `dashboard_rebuild/client/src/api.types.ts`
  so the shelf can derive course vault folders from `TutorContentSources` metadata or Tutor hub fallback context even when `courseLabel` is blank.
- Added regression coverage in:
  - `dashboard_rebuild/client/src/components/studio/__tests__/SourceShelf.test.tsx`
  - `dashboard_rebuild/client/src/hooks/__tests__/useTutorHub.test.ts`
  - `dashboard_rebuild/client/src/components/__tests__/TutorShell.test.tsx`
  - the existing `WorkspacePanel` / `StudioShell` panel suites
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/WorkspacePanel.test.tsx client/src/components/studio/__tests__/StudioShell.test.tsx`
  - `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/SourceShelf.test.tsx`
  - `cd dashboard_rebuild && npx vitest run client/src/hooks/__tests__/useTutorHub.test.ts client/src/components/__tests__/TutorShell.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-28 - Switched per-panel Center and Maximize to camera panning

- Replaced the old `buildCenteredPanelPosition(...)` layout-mutation path in `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` with `centerViewportOnPanel(...)`, which builds a single-panel layout and reuses `buildStudioShellViewportCenter(...)` to pan the Studio camera with the current canvas scale.
- Changed the per-panel `Maximize` action to keep the panel's stored position intact while resizing to `1200x900`, then pan the viewport to that new frame instead of rewriting the panel coordinates.
- Updated `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx` so the focused regression now proves:
  - `Center` does not enqueue a layout update
  - `Maximize` updates only the panel size in layout state
  - both actions drive the viewport transform through `setTransform(...)`
- Added live browser proof at `scripts/verify-center-fix.js` and ran `dev-browser --timeout 120 run C:\\pt-study-sop\\scripts\\verify-center-fix.js`, which saved:
  - `C:\\Users\\treyt\\.dev-browser\\tmp\\before-center.png`
  - `C:\\Users\\treyt\\.dev-browser\\tmp\\after-center.png`
  - `C:\\Users\\treyt\\.dev-browser\\tmp\\after-maximize.png`
  - `C:\\Users\\treyt\\.dev-browser\\tmp\\after-center-windows.png`
  with the panel holding a `57px` top offset inside the Studio canvas after `Center`, `Maximize`, and `Center Windows`.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx`
  - `cd dashboard_rebuild && npm run build`

## 2026-03-28 - Fixed Lighthouse accessibility violations in Brain and Tutor controls

- Moved the Obsidian/Anki connection status chip group in `dashboard_rebuild/client/src/components/brain/MainContent.tsx` out of the `tablist` so the tab container now contains only tab elements while keeping the same visual flex layout.
- Added explicit accessible names in `dashboard_rebuild/client/src/components/TutorWorkflowLaunchHub.tsx` for:
  - the workflow search input
  - the course filter select
  - the stage filter select
  - the status filter select
- Added explicit accessible names in `dashboard_rebuild/client/src/components/brain/ContractBrainHome.tsx` for the course hint input, annotation notes textarea, and attachment file picker in the Brain annotation panel.
- Validation passed:
  - `cd dashboard_rebuild && npm run build`

## 2026-03-28 - Removed dead Tutor Studio panels and folded merged tools into surviving surfaces

- Removed the dead floating-panel registry entries from `dashboard_rebuild/client/src/components/studio/StudioShell.tsx`:
  - `Tutor Status`
  - `Repair Candidates`
  - `Objectives`
  - standalone `Mind Map`
  - standalone `Method Runner`
- Updated Studio presets and seed defaults so those five panels no longer appear in the toolbar, preset layouts, or restoration flow, and added inline HUD-254 merge comments where `Mind Map` and `Method Runner` used to live.
- Stripped the dead Tutor shell wiring in `dashboard_rebuild/client/src/components/TutorShell.tsx` and the stale adapter props in `dashboard_rebuild/client/src/components/tutor-shell/TutorStudioShellPane.tsx`.
- Deleted obsolete frontend-only panel/model files:
  - `dashboard_rebuild/client/src/components/studio/TutorStatusPanel.tsx`
  - `dashboard_rebuild/client/src/components/studio/RepairCandidatesPanel.tsx`
  - `dashboard_rebuild/client/src/lib/studioTutorStatus.ts`
  - `dashboard_rebuild/client/src/lib/studioRepairCandidates.ts`
- Moved the shared context-health helper into `dashboard_rebuild/client/src/lib/studioMemoryStatus.ts` and narrowed `dashboard_rebuild/client/src/lib/studioWorkspaceObjects.ts` to a local repair-note shape so the deleted models no longer gate runtime or tests.
- Updated the focused panel and shell coverage in:
  - `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx`
  - `dashboard_rebuild/client/src/components/__tests__/TutorShell.test.tsx`
  - `dashboard_rebuild/client/src/lib/__tests__/studioMemoryStatus.test.ts`
  - `dashboard_rebuild/client/src/lib/__tests__/studioPacketSections.test.ts`
- Added the live verification script at `scripts/verify-panel-cleanup.js`.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx client/src/components/__tests__/TutorShell.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `dev-browser --timeout 90 run C:\\pt-study-sop\\scripts\\verify-panel-cleanup.js`

## 2026-03-28 - Source Shelf blank panel fix

- Root-caused the blank `Source Shelf` surface to the `react-rnd` wrapper in `dashboard_rebuild/client/src/components/ui/WorkspacePanel.tsx`: the outer panel was rendering as a block container, so the `flex-1` panel body collapsed to `0px` and hid the shelf content off-screen.
- Forced expanded workspace panels to render as a flex column via inline `display: flex` and `flexDirection: column` on the `Rnd` wrapper so the body fills the panel height again.
- Added a regression in `dashboard_rebuild/client/src/components/__tests__/WorkspacePanel.test.tsx` to assert the expanded panel wrapper keeps the flex-column layout.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/WorkspacePanel.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - Live browser verification on `http://127.0.0.1:5000/tutor?board_scope=project&course_id=1` confirmed `Source Shelf` now renders visible cards and the unified source tree instead of a blank body.

## 2026-03-28 - HUD-255 unified Study Canvas workspace

- Removed the standalone `Sketch`, `Concept Map`, and `Vault Graph` Studio panel definitions from `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` and left the HUD-255 merge note on the surviving `Workspace` panel.
- Added `dashboard_rebuild/client/src/components/studio/StudioWorkspaceUnified.tsx` so the `Workspace` panel owns one internal tab strip for:
  - `Canvas` → `StudioTldrawWorkspace`
  - `Mind Map` → `MindMapView`
  - `Concept Map` → `ConceptMapStructured`
- Updated `dashboard_rebuild/client/src/components/TutorShell.tsx` to mount the unified workspace wrapper, pass through the existing tldraw props, and pin the workspace surface to the panel body so the live browser panel keeps full height.
- Removed the unused `@excalidraw/excalidraw` dependency, deleted the dead Excalidraw-only test/template files, stripped dead CSS, and removed the Excalidraw mock seams from the Tutor/workspace tests while keeping the legacy Tutor workspace canvas compatibility component dependency-free.
- Added the live verification script at `scripts/verify-unified-workspace.js`.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx client/src/components/__tests__/TutorShell.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `dev-browser --timeout 90 run C:\\pt-study-sop\\scripts\\verify-unified-workspace.js`

## 2026-03-28 - HUD-256 Tutor entry-card session setup

- Upgraded the Tutor Studio entry card in `dashboard_rebuild/client/src/components/TutorShell.tsx` into a full session-setup form with:
  - a `Session Name` field
  - the existing course picker
  - a course-scoped material checklist with `Select All` / `Deselect All`
  - a live `X of Y materials selected` summary
- Wired `dashboard_rebuild/client/src/pages/tutor.tsx` so the entry-card session name now feeds `handleStartPrimingFromEntry` and reaches `workflow.createWorkflowAndOpenPriming(...)` as the workflow `topic`.
- Changed the priming bootstrap logic to preserve manual material selection from the entry card and only auto-select all course materials when the user has not manually touched the picker.
- Added the ready-state UX for the hero `NEW SESSION` action: when the user is already on the empty setup card, the card flashes with a temporary ring and shows `Ready — fill in session details and click Start Priming` instead of doing a destructive reset.
- Extended the focused coverage in:
  - `dashboard_rebuild/client/src/components/__tests__/TutorShell.test.tsx`
  - `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
- Added the live verification script at `scripts/verify-entry-card.js`.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorShell.test.tsx client/src/pages/__tests__/tutor.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `dev-browser --timeout 90 run C:\\pt-study-sop\\scripts\\verify-entry-card.js`

## 2026-03-29 - ENTRY-001 viewport overlay verification hardening

- Revalidated the Tutor Studio entry card against the live `/tutor` route and confirmed the runtime already renders it as a fixed viewport overlay outside the transformed canvas layer.
- Strengthened `scripts/verify-entry-bugs.js` so ENTRY-001 now measures viewport-relative geometry with `getBoundingClientRect()`, scrolls to the canvas controls before interaction, and explicitly proves the entry card stays pinned while the canvas zooms and pans.
- Live validation result:
  - `dev-browser --timeout 60 run C:\\pt-study-sop\\scripts\\verify-entry-bugs.js` now passes every ENTRY-001 assertion and still fails only on the unrelated open ENTRY-003 panel-centering check.

## 2026-03-29 - ENTRY-003 priming preset auto-focus

- Updated `dashboard_rebuild/client/src/pages/tutor.tsx` so the entry-card `Start Priming` path opens the `priming` preset immediately after workflow creation succeeds instead of leaving the Studio canvas empty.
- Added a one-shot external focus request in `dashboard_rebuild/client/src/components/TutorShell.tsx` and `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` so the newly opened preset auto-fits after a 300ms delay using the existing padded viewport-focus helper.
- Extended the focused regression coverage in:
  - `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx`
  - `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx client/src/pages/__tests__/tutor.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `dev-browser --connect --timeout 60 run C:\\pt-study-sop\\scripts\\verify-entry-bugs.js`

## 2026-03-29 - OVERLAY-002 entry-card course uploads

- Added a new entry-card upload affordance in `dashboard_rebuild/client/src/components/TutorShell.tsx` directly below the session material checklist, reusing `handleUploadSourceShelfFiles` so uploads stay scoped to the selected course and still auto-select the uploaded material IDs for the current run.
- Used the existing `sourceShelfUploading` state to drive the entry-card uploading copy and status line, and limited the entry-card picker to the requested `.pdf,.docx,.mp4,.pptx` accept list.
- Extended the focused regression coverage in:
  - `dashboard_rebuild/client/src/components/__tests__/TutorShell.test.tsx`
  - `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorShell.test.tsx client/src/pages/__tests__/tutor.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `dev-browser --connect --timeout 90 run C:\\Users\\treyt\\.dev-browser\\tmp\\verify-overlay-002.js`
  - `dev-browser --connect --timeout 60 run C:\\pt-study-sop\\scripts\\verify-overlay-polish.js`

## 2026-03-29 - OVERLAY-003 skip-setup label and resumable-session gating

- Added `dashboard_rebuild/client/src/lib/tutorResumeCandidate.ts` and used it in both `dashboard_rebuild/client/src/components/TutorShell.tsx` and `dashboard_rebuild/client/src/pages/tutor.tsx` so Resume only renders when the hub candidate is actually resumable (`can_resume` plus a non-empty `session_id`).
- Renamed the entry-card secondary action from `Open Full Studio` to `Skip Setup` while preserving the existing `applyCanvasPreset("full_studio")` behavior.
- Extended the focused regression coverage in:
  - `dashboard_rebuild/client/src/components/__tests__/TutorShell.test.tsx`
  - `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
- Updated `scripts/verify-overlay-polish.js` so the live overlay verification also proves the new `Skip Setup` label and the removal of the legacy copy.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorShell.test.tsx client/src/pages/__tests__/tutor.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `dev-browser --connect --timeout 60 run C:\\pt-study-sop\\scripts\\verify-overlay-polish.js`
  - `dev-browser --connect --timeout 60 run C:\\Users\\treyt\\.dev-browser\\tmp\\verify-overlay-003-console.js`

## 2026-03-29 - OVERLAY-004 entry-card dismiss/reopen persistence hardening

- Kept the entry-card `X` and `Cancel` dismiss path on the existing `dashboard_rebuild/client/src/components/TutorShell.tsx` surface and fixed the controller path in `dashboard_rebuild/client/src/pages/tutor.tsx` so dismissing and reopening the setup overlay no longer races project-shell saves with a stale revision.
- Preserved the current project-shell revision across same-course overlay resets and serialized in-flight `/api/tutor/project-shell/state` saves so rapid dismiss/reopen bursts only persist the latest queued shell snapshot after the active request completes.
- Extended the focused regression coverage in:
  - `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorShell.test.tsx client/src/pages/__tests__/tutor.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `dev-browser --timeout 60 run C:\\pt-study-sop\\scripts\\verify-overlay-polish.js`

## 2026-03-29 - STUDY-001 priming method cards

- Replaced the Priming method dropdown in `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` with colorful, theme-tinted method cards that show the method id, bold name, one-line description, and a checkbox-style selected indicator.
- Preserved chain runs by moving them into a dedicated `Optional Chain Mode` selector while method-card mode now supports selecting and running one or more PRIME methods through the existing Priming Assist workflow.
- Extended the focused regression coverage in:
  - `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx`
  - `scripts/verify-study-flow.js`
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `dev-browser --timeout 90 run C:\\pt-study-sop\\scripts\\verify-study-flow.js`

## 2026-03-29 - STUDY-001 verification rerun

- Re-audited the existing `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` and `dashboard_rebuild/client/src/components/TutorShell.tsx` seams for run `20260329-041641-30365` and confirmed the shipped implementation already matches the story scope without additional code edits.
- Re-verified the current repo state with the focused Priming regression, a fresh production build, and a connected `dev-browser` live pass on `http://127.0.0.1:5000/tutor?course_id=1&mode=studio`.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `dev-browser --connect --timeout 90 run C:\\pt-study-sop\\scripts\\verify-study-flow.js`

## 2026-03-29 - STUDY-003 priming chat live verification closeout

- Removed the last `"coming soon"` Priming chat empty-state copy in `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` so the live panel now advertises the real unlock condition instead of a placeholder.
- Extended `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx` so the focused regression proves sent user turns stay visible, backend refinement follow-ups receive prior `conversation_history`, and returned replacement results can still be applied into the output area.
- Hardened `scripts/verify-study-flow.js` so the live browser path preserves a course with materials, force-selects materials if needed, runs a real Priming extract, sends a follow-up through Priming chat, checks that the assistant reply is grounded in the current result context, and still fails on console errors.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx`
  - `pytest brain/tests/test_tutor_workflow_priming_assist.py -q`
  - `cd dashboard_rebuild && npm run build`
  - `dev-browser --connect --timeout 180 run C:\\pt-study-sop\\scripts\\verify-study-flow.js`

## 2026-03-29 - STUDY-004 Tutor chat live-turn hardening

- Fixed the Tutor live pane in `dashboard_rebuild/client/src/components/tutor-shell/TutorLiveStudyPane.tsx` so mastery-bearing assistant turns can invalidate `mastery-dashboard` through a real TanStack query client instead of crashing on an undefined local binding.
- Added `dashboard_rebuild/client/src/components/tutor-shell/__tests__/TutorLiveStudyPane.test.tsx` to lock the Tutor turn-complete path and prove the pane increments turn count, forwards compaction telemetry, and refreshes mastery data when the backend returns a mastery update.
- Replaced `scripts/verify-study-flow.js` with a STUDY-004-specific browser verifier that seeds a primed Tutor session through `/api/tutor/session`, opens the Tutor panel on `/tutor`, sends a live message, and proves the assistant reply is grounded in the seeded priming summary without console errors.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/tutor-shell/__tests__/TutorLiveStudyPane.test.tsx client/src/components/__tests__/TutorChat.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `pytest brain/tests/`
  - `dev-browser --connect --timeout 120 run C:\\pt-study-sop\\scripts\\verify-study-flow.js`

## 2026-03-29 - STUDY-002 priming method output rendering

- Reproduced the live empty-output fallback on `/tutor` by clearing the default method pair, selecting `M-PRE-002`, and confirming the backend completed the run while the Output Area still showed `"This run completed, but no study artifacts were returned for the selected output format."`
- Expanded `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` so the Priming renderer now turns previously dropped PRIME payload families into readable blocks, including question sets, major sections, follow-up targets, unsupported jumps, hand-draw briefs, and branch points.
- Extended `dashboard_rebuild/client/src/hooks/useTutorWorkflow.ts` so applying refined Priming results preserves those additional PRIME output families when a displayed run is written back into workflow state.
- Added a focused `M-PRE-002` regression in `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx` and updated `scripts/verify-study-flow.js` to clear the defaults, run `M-PRE-002`, and prove the live Output Area shows content plus an enabled Priming chat path instead of the empty fallback.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx client/src/hooks/__tests__/useTutorWorkflow.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `dev-browser --timeout 180 run C:\\pt-study-sop\\scripts\\verify-study-flow.js`

## 2026-03-29 - REMAIN-001 Polish panel end-to-end verification and fixes

- Patched `dashboard_rebuild/client/src/components/TutorShell.tsx`, `dashboard_rebuild/client/src/components/TutorWorkflowPolishStudio.tsx`, and `dashboard_rebuild/client/src/lib/studioPacketSections.ts` so the toolbar-opened Polish Packet mirrors the live summary/card draft state from the Polish editor instead of waiting for a persisted bundle refresh, while still rebuilding promoted tutor replies from saved polish bundle metadata.
- Added focused regressions in `dashboard_rebuild/client/src/components/__tests__/TutorShell.test.tsx`, `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPolishStudio.test.tsx`, and `dashboard_rebuild/client/src/lib/__tests__/studioPacketSections.test.ts` to lock the promoted-reply restore path plus the live packet summary/card preview path.
- Hardened `scripts/verify-remaining.js` into a headless Polish verifier that runs a real priming session, starts Tutor, sends a grounded tutor prompt, opens the Polish and Polish Packet panels, and proves tutor replies, notes, summary text, card requests, editability, and packet content render without console errors.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorShell.test.tsx client/src/components/__tests__/TutorWorkflowPolishStudio.test.tsx client/src/lib/__tests__/studioPacketSections.test.ts`
  - `cd dashboard_rebuild && npm run build`
  - `dev-browser --headless --timeout 180 run C:\\pt-study-sop\\scripts\\verify-remaining.js`
  - `pytest brain/tests/`

## 2026-03-29 - REMAIN-001 verification rerun closeout

- Re-audited the shipped REMAIN-001 data flow across `dashboard_rebuild/client/src/components/TutorShell.tsx`, `dashboard_rebuild/client/src/components/TutorWorkflowPolishStudio.tsx`, and `dashboard_rebuild/client/src/lib/studioPacketSections.ts` and confirmed the existing `b329fb27 fix: verify and sync polish packet artifacts` implementation already satisfies the story without further product-code edits.
- Re-validated the live `/tutor` flow after launching with `Start_Dashboard.bat`: the toolbar-opened Polish panel and Polish Packet both rendered real tutor replies, captured notes, summary draft text, and staged card requests after a priming run plus live Tutor turn, and the summary field remained editable.
- Validation passed:
  - `cmd /c Start_Dashboard.bat`
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorShell.test.tsx client/src/components/__tests__/TutorWorkflowPolishStudio.test.tsx client/src/pages/__tests__/tutor.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `dev-browser --timeout 90 run C:\\pt-study-sop\\scripts\\verify-remaining.js`

## 2026-03-29 - REMAIN-005 end-session vault save and cleanup

- Extended `brain/dashboard/api_tutor_sessions.py` so ending a Tutor session now renders and writes a markdown session-end summary into the course vault folder, returns structured `vault_save` metadata, and preserves the existing completion summary payload.
- Updated `dashboard_rebuild/client/src/pages/tutor.tsx`, `dashboard_rebuild/client/src/hooks/useTutorSession.ts`, and `dashboard_rebuild/client/src/components/TutorShell.tsx` so both the hero `NEW SESSION` end flow and direct shared session-end paths reuse the same cleanup callback, show a stable save confirmation, and return the user to the entry card with the saved summary message visible.
- Replaced `scripts/verify-remaining.js` with a REMAIN-005-specific live verifier that starts a real Tutor session on `/tutor`, ends it through `NEW SESSION`, asserts the vault-save response, checks the returned entry-card confirmation banner, and fails on console errors.
- Validation passed:
  - `pytest brain/tests/test_tutor_artifact_certification.py -q`
  - `cd dashboard_rebuild && npm run build`
  - `dev-browser --timeout 120 run C:\\pt-study-sop\\scripts\\verify-remaining.js`
- Validation note:
  - `cd dashboard_rebuild && npm run check` still fails on existing repo-wide TypeScript issues outside REMAIN-005; no new build-blocking type regression from this story was introduced.

## 2026-03-29 - REMAIN-006 Obsidian panel vault browser

- Wired `dashboard_rebuild/client/src/components/studio/StudioObsidianPanel.tsx` into the Studio shell so the Obsidian toolbar panel now scopes itself to the active course vault folder, renders the folder tree, previews selected notes, creates markdown notes, and saves current notes into a `Session Notes` folder.
- Updated `dashboard_rebuild/client/src/components/TutorShell.tsx` and `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` so the panel receives the live course/vault context and opens from the Studio toolbar instead of the old placeholder.
- Added focused regressions in `dashboard_rebuild/client/src/components/studio/__tests__/StudioObsidianPanel.test.tsx`, `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx`, and `dashboard_rebuild/client/src/components/__tests__/TutorShell.test.tsx`, and refreshed `scripts/verify-remaining.js` into a REMAIN-006 browser verifier for the Obsidian panel shell flow.
- Validation passed:
  - `cd dashboard_rebuild && npm run test -- src/components/studio/__tests__/StudioObsidianPanel.test.tsx src/components/studio/__tests__/StudioShell.test.tsx src/components/__tests__/TutorShell.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `dev-browser --timeout 90 run C:\\pt-study-sop\\scripts\\verify-remaining.js`

## 2026-03-29 - REMAIN-007 Anki panel preview and export

- Added `dashboard_rebuild/client/src/components/studio/StudioAnkiPanel.tsx` and wired it through `dashboard_rebuild/client/src/components/TutorShell.tsx` plus `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` so the Studio toolbar opens a real Anki panel instead of placeholder copy.
- The panel now shows editable front/back card previews, exports the current queue as CSV, supports per-card clipboard copy, scopes to the active tutor session when present, and falls back to the latest available draft cards before a session starts so the toolbar surface stays useful from the setup state.
- Extended `brain/dashboard/api_adapter.py`, `dashboard_rebuild/client/src/api.types.ts`, and `dashboard_rebuild/client/src/api.ts` so draft-card payloads include `courseId` for the pre-session fallback path, and added focused regressions in `dashboard_rebuild/client/src/components/studio/__tests__/StudioAnkiPanel.test.tsx` plus `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx`.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioAnkiPanel.test.tsx client/src/components/studio/__tests__/StudioShell.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `dev-browser --headless --timeout 25 run C:\\Users\\treyt\\.dev-browser\\tmp\\remain-007-browser-final.js`

## 2026-03-29 - REMAIN-008 Entry card small-viewport scrolling

- Updated `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` so the viewport-fixed entry overlay card now uses `max-h-[90vh] overflow-y-auto`, letting the setup form scroll internally on short displays instead of clipping below the fold.
- Added a focused regression in `dashboard_rebuild/client/src/components/studio/__tests__/StudioShell.test.tsx` that asserts the entry-state container keeps the new height cap and vertical overflow classes.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/studio/__tests__/StudioShell.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `cmd /c Start_Dashboard.bat`
  - `dev-browser --headless --timeout 90 run C:\\Users\\treyt\\.dev-browser\\tmp\\verify-remain-008-headless.js`

## 2026-03-31 - PRIME-002 remove hand-drawn map from priming

- Removed the `M-ENC-015` hand-drawn map contract from `brain/dashboard/api_tutor_workflows.py`, including the priming output-family/key maps, normalization path, and method prompt contract, so priming no longer advertises or parses that ENCODE-only method.
- Removed the frontend hand-draw result rendering path from `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` and extended the existing picker regression in `dashboard_rebuild/client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx` so `M-ENC-015` stays excluded from the priming picker.
- Added `scripts/verify-prime-002.js` and validated the live priming panel without hand-draw labels or console errors.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/TutorWorkflowPrimingPanel.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `cmd /c Start_Dashboard.bat`
  - `dev-browser --headless --timeout 90 run scripts/verify-prime-002.js`

## 2026-03-31 - PRIME-004 fix Fit button sizing

- Updated `dashboard_rebuild/client/src/components/ui/WorkspacePanel.tsx` so Fit first uses the existing scroll-based measurement and then falls back to measuring rendered descendant bounds when the content behaves like a fixed-size flex/absolute layout instead of natural document flow.
- Added focused regressions in `dashboard_rebuild/client/src/components/__tests__/WorkspacePanel.test.tsx` covering the descendant-bounds fallback plus the min/max clamp behavior, and added `scripts/verify-prime-004.js` for live Studio verification.
- Validation passed:
  - `cd dashboard_rebuild && npx vitest run client/src/components/__tests__/WorkspacePanel.test.tsx`
  - `cd dashboard_rebuild && npm run build`
  - `dev-browser --timeout 120 run scripts/verify-prime-004.js`

## 2026-03-31 - PRIME-005 fix empty terminology and big-picture priming outputs

- Updated `brain/dashboard/api_tutor_workflows.py` so `M-PRE-012` and `M-PRE-013` now normalize both the backend's canonical output keys and the YAML-prompt vocabulary (`TerminologySet`, `AbbreviationMap`, `ComponentDefinitionList`, `NorthStarSentence`, `OrientationSummary`, `MajorSectionList`) into the existing priming UI fields instead of dropping them as empty results.
- Tightened `sop/library/methods/M-PRE-012.yaml` and `sop/library/methods/M-PRE-013.yaml` so their facilitation prompts now ask for the strict JSON shape the priming backend and panel already render (`terminology`, `summary`, `major_sections`).
- Added a focused backend regression in `brain/tests/test_tutor_workflow_priming_assist.py` plus a live verifier in `scripts/verify-prime-005.js` that proves `M-PRE-012` returns at least three term-definition cards and `M-PRE-013` returns a non-empty orientation summary and major-sections block in the priming panel.
- Validation passed:
  - `pytest brain/tests/test_tutor_workflow_priming_assist.py -q`
  - `python -u dashboard_web.py`
  - `dev-browser --timeout 180 run C:\\pt-study-sop\\scripts\\verify-prime-005.js`

## 2026-04-01 - SOP inventory export for live study testing

- Added `sop/tools/export_method_chain_inventory.py` to export the canonical YAML method and chain library directly from `sop/library/methods/` and `sop/library/chains/`.
- Generated reusable artifacts under `exports/sop_inventory/`:
  - `method_chain_inventory.md`
  - `method_chain_inventory.json`
  - `methods.csv`
  - `chains.csv`
- Included chain-level control-plane validation in the exported inventory so live testing can start from the structurally valid chains and explicitly avoid the current invalid draft chains until they are repaired.
- Current snapshot:
  - methods: `59` total (`47` validated, `3` core, `9` draft)
  - chains: `20` total (`13` control-plane valid, `7` control-plane invalid)
- Validation passed:
  - `python sop/tools/export_method_chain_inventory.py`
  - `python sop/tools/validate_library.py`

## 2026-04-03 - SOP method-gap additions for worked-example fading and embodied encoding

- Added `sop/library/methods/M-TEA-008.yaml` (`Worked Example -> Completion Fade`) so TEACH now has an explicit model-once-then-fade card for novice first exposure instead of leaving worked examples only in archived SOP notes.
- Added `sop/library/methods/M-ENC-016.yaml` (`Embodied Walkthrough`) so ENCODE now includes a safe movement / map-back method for sequence, spatial, and anatomy-heavy material without turning the block into graded technique coaching.
- Updated `sop/library/categories/TEACH.md` and `sop/library/categories/ENCODE.md`, regenerated `sop/library/15-method-library.md`, `sop/runtime/knowledge_upload/06_METHODS.md`, and the matching SOP goldens, and added focused doctrine regressions in `brain/tests/test_seed_methods.py`.
- Validation passed:
  - `python sop/tools/build_runtime_bundle.py --update-golden`
  - `python sop/tools/validate_library.py`
  - `python brain/data/seed_methods.py --strict-sync`
  - `pytest -q -p no:cacheprovider brain/tests/test_seed_methods.py -k "load_from_yaml_includes_visible_teach_doctrine_cards or worked_example_fade_yaml_models_once_before_fading or embodied_walkthrough_yaml_requires_safe_movement_and_map_back"`

## 2026-04-04 - Restore browser command allowlist for dev-browser and agent-browser

- Restored repo-level browser automation command allowlists in `permissions.json` and `.claude/permissions.json` after they had been reduced to an empty `allow_execution` list.
- Added the shared `dev-browser` and `agent-browser` command prefixes and common subcommands back to the allowlist so repeated browser-tool confirmation prompts stop recurring for normal browser-debug workflows.

## 2026-04-04 - Official ChatGPT desktop app verification and relaunch

- Verified the official Windows package `OpenAI.ChatGPT-Desktop_1.2026.43.0_x64__2p2nqsd0c76g0` launches correctly from its packaged app entrypoint and creates a live `ChatGPT.exe` window from `C:\Program Files\WindowsApps\OpenAI.ChatGPT-Desktop_1.2026.43.0_x64__2p2nqsd0c76g0\app\ChatGPT.exe`.
- Instrumented the app with Electron remote debugging and attached Playwright over CDP, confirming the real profile loads `https://chatgpt.com/?window_style=main_view`, reaches `document.readyState = "complete"`, and renders the normal ChatGPT home UI in renderer screenshots.
- Confirmed the previous stale-wrapper root cause was specific to the legacy `lencx` desktop app; the official OpenAI app does not show the injected-script fault and is using its own separate profile under `C:\Users\treyt\AppData\Local\Packages\OpenAI.ChatGPT-Desktop_2p2nqsd0c76g0`.

## 2026-04-12 - Shared `research:last30days` skill cleanup

- Rewrote the shared `C:\Users\treyt\.agents\skills\research-last30days\SKILL.md` to remove stale Claude-specific path/tool instructions and document the canonical shared-skill path plus current flags like `--refresh`.
- Patched the runtime to support cached report reuse, added a real `--refresh` flag, and made console/file output UTF-8-safe on Windows so compact output no longer crashes on narrow console encodings.
- Realigned fixtures and tests with the current xAI alias (`grok-4-1-fast`), added cache round-trip coverage, and confirmed the skill test suite passes end to end.
- Updated repo inventory references so the shared skill catalog and sync script both account for the canonical folder name `research-last30days` while preserving the legacy `last30days` naming surface.

## 2026-04-16 - INV-TUTOR-TRACE-001 tutor flow trace

- Traced the current Tutor pipeline end to end for the user: `Priming/PRIME -> Tutor -> Polish -> Final Sync`, with concrete file anchors across the frontend workflow hooks and backend tutor/workflow/session routes.
- Confirmed the current contract split: Studio `Priming` persists a workflow-scoped `tutor_priming_bundles` record, but live Tutor session creation still starts from `preflight -> create_session` using the selected scope and then patches the parent workflow to `tutor`.
- Confirmed the current post-Tutor persistence path: live Tutor writes `tutor_sessions`, `tutor_turns`, artifacts, captured notes, feedback, timing, and memory capsules; Polish writes `tutor_polish_bundles`; Final Sync writes Obsidian/Anki results plus `tutor_publish_results`.
- Noted current implementation drift worth remembering for future fixes: Final Sync redundantly updates workflow status after backend publish-result creation, the Brain publish toggle is effectively always on, and some Obsidian writes already happen at Tutor end before Final Sync.

## 2026-04-17 - Shared Yoga Book writing-mode skill and self-improve compatibility repair

- Added shared skill `C:\Users\treyt\.agents\skills\yoga-book-writing-mode` with hardware-specific scripts to disable and restore bottom-screen touch on Trey's Lenovo Yoga Book 9i (`82YQ`) while leaving pen input enabled.
- Restored the missing shared path `C:\Users\treyt\.agents\skills\self-improve\SKILL.md` as a compatibility alias that points legacy instructions back to the authoritative shared lifecycle protocol in `system-improve`.
- Updated `C:\Users\treyt\.codex\AGENTS.md` to prefer `~/.agents/skills/system-improve/SKILL.md` and ran `scripts/sync_agent_skills.ps1` in both `Apply` and `Check` modes so the new shared skills project into Codex and the other supported roots.

## 2026-04-20 - Codex Windows trust-path normalization workaround

- Added explicit trusted-project entries for `C:\pt-study-sop` and `c:\pt-study-sop` to `C:\Users\treyt\.codex\config.toml` alongside the existing `C:/pt-study-sop` key so Codex project-local config loading does not miss on Windows path-format drift.
- Verified the updated global config still parses as valid TOML and confirmed the repo-local `.codex/config.toml` remains minimal (`sandbox_mode = "danger-full-access"`), so trusting the project now enables that local override instead of leaving it disabled.

## 2026-04-21 - AGENTS reply-format clarification

- Updated the root `AGENTS.md` reply rules to require short concise replies by default, small structured output, and explicit one-step-at-a-time instructions unless the user asks for the full sequence.
- Added a concrete output-request rule so future troubleshooting replies specify the exact command to run, the exact machine or shell to run it in, and the exact output to send back.

## 2026-04-21 - Cross-machine SSH folder split for desktop and work laptop

- Reorganized `C:\Users\treyt\OneDrive\Desktop\SSH laptop to Desktop` into machine-specific subfolders: `Home Desktop` and `Work Laptop`.
- Moved the existing home-desktop SSH launchers and Taildrive shortcuts into `Home Desktop`, added a machine-specific README there, and added a new `Work Laptop Shell (SSH).bat` plus README documenting the work-laptop route and the Windows administrator authorized-keys path required for key auth.
- Rewrote the root `README_FOR_AGENTS.md` in that folder so future agents know which subfolder to use and what each one contains.

## 2026-04-21 - Three-machine SSH routes and mirrored launchers

- Added an alias-based work-laptop launcher (`Work Laptop Shell (Alias).bat`) in the shared `SSH laptop to Desktop` folder and updated `PowerHouseATX` SSH config so `ssh home-desktop` and `ssh work-laptop` both resolve locally.
- Configured the home desktop and work laptop with machine-local SSH configs so they can reach the other machines by alias, then fixed the Windows OpenSSH ACL issues on the desktop key/config files so those aliases actually work.
- Added the work-laptop public key to the desktop and `PowerHouseATX` administrator authorized-keys files, preserving the shared `PowerHouseATX`/desktop key on the work laptop, so work-laptop -> desktop and work-laptop -> `PowerHouseATX` are key-based.
- Verified all four cross-machine routes: desktop -> `PowerHouseATX`, desktop -> work laptop, work laptop -> `PowerHouseATX`, and work laptop -> home desktop.

## 2026-04-22 - Tutor full-audit Track A (P0 correctness + security) — TDD remediation landed

- Executed strict Red-Green TDD against the 2026-04-22 Tutor audit report for TUTOR-AUDIT-P0-001. Every bug below has a dedicated failing-first regression test that now passes.
- Backend fixes:
  - `brain/dashboard/api_tutor_turns.py` — B3: pre-initialized `adaptive_conn = None` + finally-block guard so a `build_context` throw cannot surface as `UnboundLocalError`; B2/B6: turn persistence and accuracy-log insert failures now log at WARNING instead of silently swallowing.
  - `brain/dashboard/api_tutor_materials.py` — SEC1/B1: added `_allowed_material_roots()` + `_path_is_inside_allowed_roots()` with lazy resolution so `get_material_file` refuses paths outside `UPLOADS_DIR` / `EXTRACTED_IMAGES_ROOT` even when the DB row claims otherwise.
  - `brain/dashboard/api_tutor_accuracy.py` — B9: non-numeric `limit` now returns 400 instead of 500.
  - `brain/llm_provider.py` — B5: `stream_chatgpt_responses` now dedupes tool_call emission across `response.function_call_arguments.done` and `response.completed`.
  - `brain/db_setup.py` — S1: removed stale `REFERENCES topics(id)` FK from `tutor_turns` DDL and moved the `idx_tutor_turns_tutor_session_id` index creation after the `ALTER TABLE ... ADD COLUMN tutor_session_id` migration so fresh DBs get a clean schema.
- Frontend fixes:
  - `dashboard_rebuild/client/src/components/useSSEStream.ts` — F2: added an unmount cleanup effect that aborts the in-flight `AbortController`.
  - `dashboard_rebuild/client/src/components/tutor-shell/TutorEndSessionDialog.tsx` — F4: added `role="dialog"` + `aria-modal` + `aria-labelledby` and an `isEnding` guard so rapid double-clicks on END SESSION only fire `endSession` once.
- New regression suites: `brain/tests/test_tutor_audit_p0_remediation.py` (B3/B2/B6/B5/SEC1/B9/S1/R1), `dashboard_rebuild/client/src/components/__tests__/useSSEStream.unmount.test.tsx` (F2), `dashboard_rebuild/client/src/components/tutor-shell/__tests__/TutorEndSessionDialog.a11y.test.tsx` (F4).
- Validation: `python -m pytest brain/tests/test_tutor_audit_p0_remediation.py brain/tests/test_tutor_turn_stream_contract.py brain/tests/test_tutor_verdict.py brain/tests/test_teach_back.py brain/tests/test_tutor_project_shell.py -q` => 69 passed. `npx vitest run useSSEStream.unmount.test.tsx TutorEndSessionDialog.a11y.test.tsx TutorChat.test.tsx` => 21 passed.
- Deferred to Track B (not in P0 scope): F1 `sessionRef` live-read refactor, F3 `TutorErrorBoundary` wrap, B4 tool-round terminal function_call_output, B7 note-branch swallow, B8 session-list `limit` normalization, B10 `embed_status` conn leak, B11 `content_filter_json` parse logging. `client/src/components/__tests__/TutorShell.test.tsx "stale Tutor session id"` case is pre-existing red on `main` (crashes inside `sessionMaterialBundle.ts:225` — `input.artifacts` undefined); confirmed by stash-and-rerun and tracked for a separate track.

## 2026-04-22 - Tutor full-audit Track B (P1 reliability + FE polish) — TDD remediation landed

- Closed out every item that Track A deferred from the 2026-04-22 Tutor audit. Same strict Red-Green TDD flow; each bug has a dedicated regression test that failed first and now passes.
- Backend fixes:
  - `brain/dashboard/api_tutor_sessions.py` — B8: `list_sessions` now rejects non-numeric `limit` with HTTP 400 and clamps legal values to `[1, 200]`, so a bad cast (Flask's default `type=int` returns `None`) cannot disable the SQL `LIMIT` clause.
  - `brain/dashboard/api_tutor.py` — B10: `embed_status` route body extracted into `_embed_status_body(conn)` and the public route now wraps the helper in `try / finally` so the SQLite handle is always closed, even when a mid-route `SELECT` / PRAGMA raises.
  - `brain/dashboard/api_tutor_turns.py` — B11: new `_parse_content_filter_json()` helper logs at WARNING (with session id) when `content_filter_json` is corrupt/non-dict, replacing the silent `except (JSONDecodeError, TypeError): pass`. B4: tool-round cap (`MAX_TOOL_ROUNDS` promoted to a module-level constant) now emits a terminal `tool_result` SSE and appends a synthetic `function_call_output` for every `tool_call` in the capping round before yielding `tool_limit_reached`, so the OpenAI Responses API pairing invariant holds on the next user turn.
  - `brain/dashboard/api_tutor_artifacts.py` — B7: note-branch `INSERT INTO quick_notes` failure now logs at WARNING with `exc_info` and flags the response with `status="persist_failed"` + `persist_error` so clients can detect drift instead of receiving a happy-path reply with no row.
- Frontend fixes:
  - `dashboard_rebuild/client/src/lib/tutorSessionBridge.ts` + `dashboard_rebuild/client/src/pages/tutor.tsx` — F1: introduced `createLiveSessionBridge()` — a stable-identity object whose property reads forward live to `sessionRef.current`. `tutor.tsx` now passes this bridge into `useTutorWorkflow` so workflow-triggered session actions always hit the current `useTutorSession` return value, eliminating stale-closure drift from the default stub that `useMemo` locked in on initial render.
  - `dashboard_rebuild/client/src/components/TutorShell.tsx` — F3: wrapped `tutorStudioContent` in a dedicated `TutorErrorBoundary fallbackLabel="Tutor live study"` so a Tutor-only crash (including the known `sessionMaterialBundle` crash) no longer takes down Priming / Polish / Workspace panels that share the outer `Studio Canvas` boundary.
- New regression suites:
  - `brain/tests/test_tutor_audit_track_b.py` — B4/B7/B8/B10/B11.
  - `dashboard_rebuild/client/src/lib/__tests__/tutorSessionBridge.test.ts` — F1 live-read semantics.
  - `dashboard_rebuild/client/src/components/__tests__/TutorShell.f3.nested-boundary.test.tsx` — F3 structural assertion that `tutorStudioContent` owns its own Tutor-labelled boundary.
- Validation: `python -m pytest brain/tests/test_tutor_audit_p0_remediation.py brain/tests/test_tutor_audit_track_b.py brain/tests/test_tutor_turn_stream_contract.py brain/tests/test_tutor_verdict.py brain/tests/test_teach_back.py brain/tests/test_tutor_project_shell.py -q` => 75 passed. `npx vitest run useSSEStream.unmount.test.tsx TutorEndSessionDialog.a11y.test.tsx TutorChat.test.tsx TutorShell.f3.nested-boundary.test.tsx tutorSessionBridge.test.ts` => 25 passed.
- Out-of-scope / follow-up: the pre-existing `TutorShell.test.tsx "stale Tutor session id"` red case on `main` (crashes in `lib/sessionMaterialBundle.ts:225` when `input.artifacts` is undefined) is still open as a separate TutorShell-hardening task; the new F3 inner boundary would contain that crash in the live app but does not fix the bundle normalization bug itself.

## 2026-04-22 - sessionMaterialBundle defensive normalization (TutorShell stale-session red closed)

- Fixed the `lib/sessionMaterialBundle.ts:225` `TypeError: Cannot read properties of undefined (reading 'map')` crash that had been the sole red in `TutorShell.test.tsx "stale Tutor session id"` on `main` both before and during the 2026-04-22 Tutor audit.
- `buildSessionMaterialBundle()` now coerces every iterable field (`sourceInventory`, `primingMethodRuns`, `artifacts`, `capturedNotes`, `primePacket`, `polishPacket`) to `[]` at the top of the function when a caller hands in an object with typed-as-required arrays missing. Pre-fix a partial input from `useTutorSessionMaterialBundle` (e.g. during a stale `activeSessionId` render) tore down the entire Tutor subtree; post-fix it degrades into an empty, not-ready bundle.
- Added TDD regression `dashboard_rebuild/client/src/lib/__tests__/sessionMaterialBundle.test.ts > "does not crash when optional iterable fields arrive as undefined"`. Verified via `git stash`/rerun that the 5 other `TutorShell.test.tsx` Prime/Polish Packet reds are pre-existing on `main` and unrelated to this change (different `StudioTldrawWorkspace` crash inside `editor.getCurrentPageShapeIds()`), so they stay tracked as separate follow-up tasks.
- Validation: `python -m pytest brain/tests/test_tutor_audit_p0_remediation.py brain/tests/test_tutor_audit_track_b.py brain/tests/test_tutor_turn_stream_contract.py brain/tests/test_tutor_verdict.py brain/tests/test_teach_back.py brain/tests/test_tutor_project_shell.py -q` => 75 passed. `npx vitest run client/src/lib/__tests__/sessionMaterialBundle.test.ts client/src/components/__tests__/TutorShell.test.tsx -t "stale Tutor session id"` => `TutorShell "stale Tutor session id"` green alongside the new bundle regression.

## 2026-04-22 - Tutor audit Pass 2 scoped (TUTOR-AUDIT-P2-001 queued)

- Scoped a third Tutor audit pass focused on performance, observability, resource hygiene, index coverage, and frontend render cost. Report filed at `docs/root/TUTOR_AUDIT_P2.md` with explicit `P2-PERF-*`, `P2-OBS-*`, `P2-RES-*`, `P2-IDX-*`, and `P2-FE-*` findings plus a 5-wave execution plan.
- Queued as `TUTOR-AUDIT-P2-001` in `docs/root/TUTOR_TODO.md` alongside Tracks A and B (both marked complete and linked back to commit `b745477d`).
- Grounding signals used for the scope: `rg` counts of `conn = get_connection()`, `except ...: pass`, and `_LOG.*` across `brain/dashboard/api_tutor*.py`; `CREATE INDEX IF NOT EXISTS` inventory in `brain/db_setup.py`; timing-primitive usage in `api_tutor_turns.py`. All confirmed at the time of scoping; no code changes landed yet.
- Also verified that the live dashboard running on port 5000 (PID 28596, started 12:49 PM) is pre-fix - `GET /api/tutor/sessions?limit=abc` currently returns HTTP 200 instead of the Track B HTTP 400. Leaving the user's running dashboard intact; the restart via `Start_Dashboard.bat` will pick up the new code when the user is ready.

## 2026-04-22 - Studio Canvas UX hardening: Fit measurement, Tidy reset, Center button, pan bounds, hero meta grid

- dashboard_rebuild/client/src/components/ui/WorkspacePanel.tsx — measureFitContentSize now scopes a temporary `<style id=""workspace-panel-fit-measuring-style"">` sheet via the `data-workspace-panel-fit-measuring` attribute so descendant `.truncate` / `.overflow-hidden` elements report their natural (unclipped) `scrollWidth` + `getBoundingClientRect` during Fit. Fixes the regression where `Fit` on Source Shelf resized the panel to the already-ellipsised filename width. Attribute is cleared in the `finally` block so normal truncation resumes immediately after measurement.
- dashboard_rebuild/client/src/components/studio/StudioShell.tsx:
  - Added centerOpenPanels callback + dedicated `Center` toolbar button (Crosshair icon) next to `Tidy Up`. `Center` uses `buildStudioShellViewportCenter` to pan the viewport onto the panel-cluster centroid at the current zoom (no rescale). Distinct from `Fit to View` / `fitOpenPanels`.
  - `Tidy Up` now resets each panel's size to `PRESET_LAYOUT_DEFAULTS[normalizePanelKey(item.panel)].defaultSize` before calling `tilePanelLayout`. Previously wide/Fit-expanded panels produced ragged rows; Tidy is now a true reset.
  - `TransformWrapper` props: `limitToBounds={false}`, `centerOnInit={false}`, `centerZoomedOut={false}`. The default `limitToBounds: true` clamped `positionX >= 0` so the canvas only panned one direction (`scrolls right but not left, left is cut off`). Disabling unblocks two-way panning via the existing custom pointer-drag path.
  - Imported `Crosshair` from `lucide-react` alongside the existing icon set.
- dashboard_rebuild/client/src/index.css:
  - `.page-shell__meta` switched from `display: flex; flex-direction: column` to `display: grid` with `grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr))` and `grid-auto-rows: minmax(44px, auto)`. `.page-shell__stat-grid` and `.page-shell__actions` now use `display: contents` so stat tiles and action buttons flatten into the single meta grid.
  - `.page-shell__actions > *` gained `width: 100%; min-width: 0;` so hero actions stretch cleanly into their grid cell without breaking the existing border/glow chrome.
  - Net effect: Tutor hero `NEW SESSION` and `REFRESH` fill the empty stat-row slots next to `MATERIALS` instead of wrapping onto a new row. Same benefit is automatically inherited by every other page that uses `PageScaffold` (library / calendar / methods / scholar / brain / vault-health / mastery).
- docs/root/TUTOR_TODO.md — logged as `STUDIO-CANVAS-UX-001` in the Active Sprint, with full scope, validation notes, and recommended next-step pickup list.

Validation:
- `dashboard_rebuild> npm run build` — green (`brain/static/dist/` regenerated).
- Vitest deferred — local `vitest` run has been hanging the workstation; the paired unit tests queued for STUDIO-CANVAS-UX-001 are called out in the TUTOR_TODO entry under `Recommended next steps`.

Recommended next steps:
1. Manual/browser verify after `Start_Dashboard.bat` restart (Source Shelf Fit fits full filenames; Tidy Up resets sizes then tiles cleanly; Center pans without zoom change; canvas drags both directions; hero NEW SESSION/REFRESH sit on the stat row).
2. Author Vitest for: (a) `measureFitContentSize` vs `truncate` descendants, (b) `Tidy Up` normalizing to `PRESET_LAYOUT_DEFAULTS`, (c) `PageScaffold` emitting stats + actions as siblings in one grid parent.
3. Resume `TUTOR-AUDIT-P2-001` (remains the next major backlog item).
4. Confirm `TutorShell.test.tsx "stale Tutor session id"` red-on-main regression; if still present, open a dedicated TutorShell-hardening task.

## 2026-04-24 - Codex setup alignment check

- Reviewed current Codex setup against official OpenAI Codex docs for config layering, AGENTS.md instruction discovery, approvals/sandboxing, and best-practice workflow setup.
- Confirmed the repo is aligned on the important structure: project policy stays in root `AGENTS.md`, runtime/model/tool settings stay in `C:\Users\treyt\.codex\config.toml`, repo-local `.codex/config.toml` is trusted and intentionally minimal, and `AGENTS.md` is below the default 32 KiB project-doc limit.
- Fixed the one validation drift found during setup checks: `scripts/sync_agent_skills.ps1` now preserves `codex-primary-runtime` as Codex-local plugin/runtime material instead of reporting it as an unexpected extra skill.
- Validation: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync_agent_config.ps1 -Mode Check` => PASS. `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync_agent_skills.ps1 -Mode Check` => PASS.
- Tradeoff noted: this repo still uses `sandbox_mode = "danger-full-access"` for speed/autonomy. That matches the user's current operating model but is less restrictive than OpenAI's safer default `workspace-write` posture.

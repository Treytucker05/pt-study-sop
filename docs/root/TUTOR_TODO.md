# Tutor TODO (Execution Tracker)

Date: 2026-03-13
Owner: Trey
Authority: execution-only sprint and backlog tracker. Top-level repo truth lives only in `README.md`.
Purpose: keep implementation work ordered, visible, and tied to tests and verification gates without redefining the product.

- Top-level repo truth: `README.md`
- Supporting technical/runtime docs: `docs/root/PROJECT_ARCHITECTURE.md`, `docs/root/GUIDE_DEV.md`
- Conductor execution registry: `conductor/tracks.md`

## Current Board (In-Progress)

- Canonical execution order: `PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`
- [x] Scholar/Tutor contract alignment hardening (2026-03-04):
  - Added deterministic Scholar question lifecycle persistence + answer endpoint.
  - Added explicit Scholar proposal approve/reject endpoints.
  - Aligned Scholar status/history API compatibility and frontend API usage.
- Execution references:
  - `README.md` (master repo truth)
  - `docs/root/TUTOR_TODO.md` (active execution board)
  - `conductor/tracks.md` (track registry / archival)
- Historical archive: older completed sprint history now lives in `docs/archive/TUTOR_TODO_history_2026-03-14.md`.
- Historical note: if any archived wording conflicts with the canon, the canon wins.
- Launch-model note: the active Tutor direction is Brain-owned launch plus the `/tutor` shell with `DashBoard` as the first page and `Tutor` reserved for live study. Older `start-panel` or `wizard` wording below is historical execution language unless explicitly re-opened by a new active sprint.

## Active Sprint 2026-03-13

### Sprint: Cyber-Brain Theme Unification (2026-03-15)
- [x] CBTU-100. Unify the shared shell and top-level support pages under a responsive cyber-brain visual system inspired by the red holographic brain reference.
  - Track: `conductor/tracks/cyber-brain-theme-unification_20260315/`
  - Scope:
    - `dashboard_rebuild/client/src/index.css`
    - `dashboard_rebuild/client/src/components/layout.tsx`
    - `dashboard_rebuild/client/src/components/ui/button.tsx`
    - `dashboard_rebuild/client/src/components/ui/card.tsx`
    - `dashboard_rebuild/client/src/lib/theme.ts`
    - `dashboard_rebuild/client/src/pages/brain.tsx`
    - `dashboard_rebuild/client/src/pages/scholar.tsx`
    - `dashboard_rebuild/client/src/pages/tutor.tsx`
    - `dashboard_rebuild/client/src/pages/library.tsx`
    - `dashboard_rebuild/client/src/pages/calendar.tsx`
    - `dashboard_rebuild/client/src/pages/mastery.tsx`
    - `dashboard_rebuild/client/src/pages/methods.tsx`
    - `dashboard_rebuild/client/src/pages/vault-health.tsx`
    - targeted layout/frontend tests
  - Done when:
    - the shared shell/background carries the cyber-brain grid/hologram look
    - page headers and content frames use one consistent responsive visual system
    - top-level support pages visually align with the same theme instead of ad-hoc layouts
    - the nav/header still behaves correctly and required frontend validation passes
  - Completed 2026-03-15: shipped the holographic shell backdrop, upgraded shared panel/button/input primitives, added a reusable `PageScaffold`, aligned Brain/Tutor workspaces plus the Calendar/Library/Mastery/Methods/Scholar/Vault Health route headers to the same responsive theme, and passed `npm run test -- client/src/components/__tests__/layout.test.tsx` plus `cd dashboard_rebuild && npm run build`.

### Sprint: Production UI Standardization (2026-03-15)
- [ ] PUI-100. Standardize the sellable product shell and support-page layout system around the Material Library operating model, starting with a compact-on-scroll header and reusable page-structure rules.
  - Scope:
    - `dashboard_rebuild/client/src/components/layout.tsx`
    - `dashboard_rebuild/client/src/components/__tests__/layout.test.tsx`
    - `dashboard_rebuild/client/src/components/SupportWorkspaceFrame.tsx`
    - `dashboard_rebuild/client/src/pages/library.tsx`
    - `dashboard_rebuild/client/src/pages/calendar.tsx`
    - `dashboard_rebuild/client/src/pages/methods.tsx`
    - `dashboard_rebuild/client/src/pages/mastery.tsx`
    - `dashboard_rebuild/client/src/pages/scholar.tsx`
    - `dashboard_rebuild/client/src/pages/vault-health.tsx`
    - shared shell/page CSS as needed
  - Done when:
    - the header compacts instead of disappearing on downward scroll
    - the Library page is the explicit structural reference for the top-level support pages
    - reusable layout rules are clear enough that support pages converge toward one production-ready operating model
    - required frontend validation passes
  - Progress 2026-03-15:
    - compact-on-scroll header is shipped
    - Calendar now uses a Library-style support workspace with a scope rail, command band, status strip, and main timeline canvas via `SupportWorkspaceFrame`
    - remaining standardization targets are `methods`, `mastery`, `scholar`, and `vault-health`

### Sprint: Tutor Page 1 Command Deck (2026-03-15)
- [x] TPCD-100. Ship the responsive `DashBoard` command deck as the first Tutor shell page and wire its CTAs into the existing Tutor, Schedule, Studio, and Library surfaces.
  - Track: `conductor/tracks/tutor-page1-command-deck_20260315/`
  - Scope:
    - `brain/dashboard/api_tutor_projects.py`
    - `brain/tests/test_tutor_project_shell.py`
    - `dashboard_rebuild/client/src/pages/tutor.tsx`
    - `dashboard_rebuild/client/src/components/TutorCommandDeck.tsx`
    - `dashboard_rebuild/client/src/components/TutorScheduleMode.tsx`
    - `dashboard_rebuild/client/src/components/TutorStudioMode.tsx`
    - `dashboard_rebuild/client/src/pages/library.tsx`
    - `dashboard_rebuild/client/src/lib/tutorClientState.ts`
    - `dashboard_rebuild/client/src/api.ts`
    - `dashboard_rebuild/client/src/api.types.ts`
    - targeted Tutor frontend/backend tests
  - Done when:
    - `/api/tutor/hub` aggregates resume, deadlines, class cards, and study-wheel state
    - `DashBoard` becomes the responsive command deck first page
    - `Tutor` is live-study only
    - `Open Project` lands in Studio L2
    - Schedule CTAs focus the right event/course
    - `Load Materials` opens Library with course-scoped intake preselected
    - required build/tests pass and the track is closed
  - Completed 2026-03-15: `/tutor` now lands on `DashBoard`; `Tutor` is the live study surface only; `/api/tutor/hub` backs the command deck; `Open Project` lands in Studio L2; schedule CTAs focus the intended course/event; `Load Materials` routes to Library with course-scoped intake preselected; `python -m pytest brain/tests/test_tutor_project_shell.py -q`, the targeted Tutor/frontend vitest matrix, and `cd dashboard_rebuild && npm run build` all passed.

### Sprint: Root Hygiene Sweep (2026-03-14)
- [x] RHS-210. Remove leftover root-level scratch files, caches, and stale review artifacts that no longer belong in the active repo workspace.
  - Scope: ignored scratch outputs, temp caches, root-level review/prompts, duplicate leftover data exports, and any tracked leftovers proven unused by repo search.
  - Done when: obvious junk is removed, tracked deletions are reference-checked first, validation stays green, and the cleanup is logged and pushed.
  - Completed 2026-03-14: removed root review artifacts, obsolete study-text leftovers, stale CSV exports, Playwright snapshot debris, ignored local scratch files/directories, and unused tracked export reports; archived legacy `.agent/` and `.sisyphus/` root state under `docs/archive/root_state/`; passed `python scripts/check_docs_sync.py`, `python scripts/check_exports_drift.py`, `python scripts/audit_repo_hygiene.py`, and `git diff --check`.

### Sprint: Tutor Shell Cleanup Packaging (2026-03-14)
- [x] TSC-200. Remove transient design artifacts, keep only intentional Tutor shell source changes, and package the repo for push.
  - Scope: repo-root screenshots/prototypes, active Tutor shell frontend files under `dashboard_rebuild/`, `README.md` sync, validation, and push prep.
  - Done when: disposable artifacts are gone, the remaining source/docs changes build and test cleanly, the work is logged, and `main` is pushed.
  - Completed 2026-03-14: removed root prototype captures, added ignore coverage for the scratch pattern, kept the intentional Tutor shell source additions intact, and passed `npm run build`, `npx vitest run client/src/components/__tests__/TutorStudioMode.test.tsx client/src/components/__tests__/StudioPrepMode.test.tsx`, and `pytest brain/tests/`.

### Sprint: README-First Truth Compression (2026-03-14)
- [x] RTC-001. Compress repo truth surfaces down to the minimum active set and make `README.md` the only top-level repo truth file.
  - `conductor/tracks/repo-truth-surface-pruning_20260314/`
  - `README.md`
  - `AGENTS.md`
  - `docs/root/GUIDE_DEV.md`
  - `docs/root/PROJECT_ARCHITECTURE.md`
  - `docs/root/TUTOR_TODO.md`
  - `docs/root/AGENT_BOARD.md`
  - `conductor/tracks.md`
  - `conductor/tracks/GENERAL/log.md`
  - `.claude/commands/plan.md`
  - `.codex/skills/`
  - `scripts/check_docs_sync.py`
  - current truth-like support docs under `docs/root/`
  - duplicate stale Tutor launch track artifacts
  - Done when: `README.md` is the master truth file, redundant active truth docs are merged away, repo-local planning surfaces all point at the same surviving truth stack, and destructive deletes only happen after reference sweeps and validator updates pass.
- [x] Wave A: durable track bootstrap and migration map
  - create the Conductor track with `spec.md`, `plan.md`, `findings.md`, `review.md`, and `index.md`
  - register the track in `conductor/tracks.md`
  - claim the work in `docs/root/AGENT_BOARD.md`
  - build the keep/merge/delete matrix and source-section to destination-section migration map before any deletes
- [x] Wave B: README-first canon promotion and doc compression
  - fold the surviving Study Buddy canon and owner contract into `README.md`
  - compress runtime/reference guidance into `docs/root/PROJECT_ARCHITECTURE.md`
  - keep `docs/root/GUIDE_DEV.md` command-only and make all surviving docs point to the new README-first truth order
- [x] Wave C: planning surface alignment
  - update repo-local planning skills and `.claude/commands/plan.md` to use the README-first truth stack
  - remove repo-local assumptions that `scripts/agent_task_board.py` or required `metadata.json` are part of the active planning contract
- [x] Wave D: destructive cleanup and drift enforcement
  - delete merged-away support docs and the duplicate underscore Tutor launch track only after active references are cleared
  - update validators and grep gates so the minimal surviving topology stays enforced
- [x] Validation
  - `python scripts/check_docs_sync.py`
  - `git diff --check`
  - repo-wide `rg` sweeps for deleted paths, stale planner assumptions, and the duplicate Tutor launch track path
  - Completed 2026-03-14: `README.md` is now the single top-level repo truth file, redundant active truth docs were deleted, the duplicate underscore Tutor launch track was removed, and the README-first validator/planning contract passed.
- [x] RTC-010. Archive historical drift surfaces so retired truth files stop surfacing in active repo searches.
  - `docs/root/TUTOR_TODO.md`
  - `docs/archive/`
  - `conductor/tracks/_archive/`
  - completed historical tracks and root audit docs that still point at deleted truth files
  - Done when: the active `TUTOR_TODO.md` no longer carries deep completed-history noise, historical root audit docs live under `docs/archive/`, and the noisiest completed tracks that still point at retired truth files are moved under `conductor/tracks/_archive/`.
  - Completed 2026-03-14: moved the completed Sprint 29+ history tail into `docs/archive/TUTOR_TODO_history_2026-03-14.md`, moved the root audit docs into `docs/archive/`, moved the noisiest completed truth-model tracks into `conductor/tracks/_archive/`, and reduced active grep results for retired truth files to zero across `docs/root` plus non-archived `conductor/tracks`.

### Sprint: Branch Reconciliation To Main
- [x] BRM-100. Reconcile the active feature line, pending side branches, and local harness work into verified `main`.
  - Integration workspace: `C:\pt-study-sop-worktrees\integrate`
  - Required inputs: `feature/tutor-wiring-simplification`, `main`, `fix/ci-green`, `claude/happy-hugle`, and the local harness/readiness commit now preserved on the feature branch
  - Done when: all required branches are merged with conflicts resolved, targeted validation passes, and `main` is pushed
- [x] BRM-110. Clean merged local branches and reconcile unrelated worktrees after the `main` push.
  - Scope: root checkout branch alignment, stale merged branches, stale worktrees, and any remaining dirty unrelated worktrees that must be pushed, relocated, or deliberately retained
  - Done when: merged stale branches/worktrees are cleaned up, unresolved dirty unrelated state is either pushed or explicitly preserved, and the root checkout is aligned to `main`
  - Completed 2026-03-14: merged the remaining remote-only audit branch into `main`, cleaned the unrelated nested `tools/chrome-devtools-mcp` dependency drift instead of pushing it upstream, and removed the stale merged worktrees/branches after aligning the root checkout

### Sprint: Trey Agent Repo Readiness
- [x] TAR-010. Freeze the harness command, env/bootstrap, and agent compatibility contracts.
  - Isolated contract artifacts live in `conductor/tracks/trey-agent-repo-readiness_20260313/`.
  - `T1` through `T5` are complete in the track plan.
- [x] TAR-100. Implement isolated harness startup that can coexist with `Start_Dashboard.bat`.
  - Track task: `T6`
  - Shipped: `scripts/harness.ps1`, harness-aware path overrides in `brain/config.py`, and host/port overrides in `brain/dashboard_web.py`
  - Verification: `pytest brain/tests/test_harness_startup.py`, manual operator launch on `5000`, manual harness launch on a second port with temp data/artifact roots, and concurrent `200` responses from both servers
- [x] TAR-110. Add harness bootstrap/validator and backend env templating.
  - Track tasks: `T7`, `T14`
  - Completed 2026-03-14: `T7` shipped `scripts/harness.ps1 -Mode Bootstrap`, `brain/.env.example`, `brain/tests/fixtures/harness/manifest.json`, and `brain/tests/test_harness_bootstrap.py`; `T14` then synced `README.md`, `docs/root/GUIDE_DEV.md`, `scripts/README.md`, and the track contracts to the shipped harness command and proof model.
- [x] TAR-120. Build the first hermetic Tutor fixture scenario and finish the named-scenario registry pass.
  - Track tasks: `T8`, `T10`
  - Partial 2026-03-14: `T8` is complete via `scripts/tutor_hermetic_smoke.py`, `scripts/harness.ps1 -Mode Eval -Scenario tutor-hermetic-smoke`, `brain/tests/fixtures/harness/tutor-hermetic-smoke.json`, and `brain/tests/test_harness_eval.py`.
  - Additional 2026-03-14: `T10` is complete via `tutor-hermetic-coverage-scope`, manifest v3, live/operator scenario registration for `app-live-golden-path`, `tutor-live-readonly`, and `method-integrity-smoke`, plus structured smoke-script JSON outputs and expanded `brain/tests/test_harness_eval.py` coverage.
- [x] TAR-130. Add harness artifacts, observability, CI lane, and cross-agent proof.
  - Track tasks: `T9`, `T11`, `T12`, `T13`, `T15`, `T16`
  - Partial 2026-03-14: `T9` is complete via `bundle.json`, `Report` mode, command records, git metadata, redacted environment summaries, repeated-bundle-shape regression coverage, and Windows PowerShell JSON compatibility in `scripts/harness.ps1`.
  - Additional 2026-03-14: `T11` is complete via root `events.jsonl`, redacted `command_started` / `command_completed` / `command_failed` entries, and failure-artifact diagnostics in `scripts/harness.ps1` plus induced-failure coverage in `brain/tests/test_harness_eval.py`.
  - Additional 2026-03-14: `T12` is complete via the Windows `harness_contract` job in `.github/workflows/ci.yml` and local proof of the exact `Bootstrap -> Run -> Eval tutor-hermetic-smoke -> Report` lane commands.
  - Additional 2026-03-14: `T13` captured headless cross-agent proof for `Codex`, `Claude`, `Gemini`, and `OpenCode`, and moved `Cursor` plus `Antigravity` to explicit pending status until stronger local launch proof exists.
  - Additional 2026-03-14: `T15` recorded that no planner queue conversion was needed because no unblocked execution wave remained after the final doc sync.
  - Completed 2026-03-14: `T16` passed docs sync, CI YAML parse, focused harness tests, direct `Bootstrap` for `Hermetic` and `Live`, hermetic `Run -> Eval tutor-hermetic-smoke -> Report`, live/operator `Run -Profile Live -> Eval app-live-golden-path`, and the full backend suite.

### Sprint 31: Tutor Launch / Shell Realignment Cleanup (2026-03-13)
- [x] Claim scope: create the durable track, make the Brain launch + `/tutor` shell + thin Tutor start/resume model the only active planning path, and explicitly demote wizard-era plans/docs to historical status.
  - `conductor/tracks/tutor-launch-shell-realignment_20260313/`
  - `conductor/tracks.md`
  - `docs/root/TUTOR_TODO.md`
  - `docs/root/AGENT_BOARD.md`
  - `conductor/tracks/GENERAL/log.md`
  - stale/synced Tutor planning and doc surfaces listed in the track plan
- [x] Wave A: durable track bootstrap and active-board registration
  - create `spec.md`, `plan.md`, `findings.md`, `validation-matrix.md`, `review.md`, and `index.md`
  - register the track in `conductor/tracks.md`
  - claim the work in `docs/root/AGENT_BOARD.md`
- [x] Wave B: stale planning/doc sync
  - sync forward active Tutor planning artifacts that still present the wizard as current
  - mark pre-shell docs historical instead of letting them compete in repo search
- [x] Wave C: launch-state authority and Tutor start-panel refactor
  - replace wizard-era startup authority with shell-context precedence
  - replace `TutorWizard` with a thin `TutorStartPanel`
- [x] Wave D: shell UX cleanup and active-doc rewrite
  - make Studio, Schedule, and Publish learner-first
  - rewrite active docs to the Brain launch + `/tutor` shell + start-panel model
- [x] Validation
  - see `conductor/tracks/tutor-launch-shell-realignment_20260313/validation-matrix.md`
  - Completed 2026-03-14: launch precedence now lives in `dashboard_rebuild/client/src/lib/tutorClientState.ts`, `/tutor` renders `TutorStartPanel`, Studio/Schedule/Publish match the shell model, historical pre-shell docs point back to `README.md`, and the integrated backend/frontend/live validation gate passed.

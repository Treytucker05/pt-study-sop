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
- Launch-model note: the active Tutor direction is Brain-owned launch plus the `/tutor` shell with a thin Tutor start/resume surface. Older `wizard` wording below is historical execution language unless explicitly re-opened by a new active sprint.

## Active Sprint 2026-03-13

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
- [ ] TAR-110. Add harness bootstrap/validator and backend env templating.
  - Track tasks: `T7`, `T14`
  - Partial 2026-03-14: `T7` is complete via `scripts/harness.ps1 -Mode Bootstrap`, `brain/.env.example`, `brain/tests/fixtures/harness/manifest.json`, and `brain/tests/test_harness_bootstrap.py`.
  - Remaining scope: `T14` still needs the broader harness-doc rewrite after later harness tasks land.
- [ ] TAR-120. Build the first hermetic Tutor fixture scenario.
  - Track tasks: `T8`, `T10`
- [ ] TAR-130. Add harness artifacts, observability, CI lane, and cross-agent proof.
  - Track tasks: `T9`, `T11`, `T12`, `T13`, `T15`, `T16`

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

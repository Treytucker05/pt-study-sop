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
- Execution references:
  - `README.md` (master repo truth)
  - `docs/root/TUTOR_TODO.md` (active execution board)
  - `conductor/tracks.md` (track registry / archival)
- Historical archive: older completed sprint history now lives in:
  - `docs/archive/TUTOR_TODO_history_2026-03-14.md`
  - `docs/archive/TUTOR_TODO_history_2026-03-15_workspace_cleanup.md`
- Historical note: if any archived wording conflicts with the canon, the canon wins.
- Launch-model note: the active Tutor direction is Brain-owned launch plus the `/tutor` shell with `DashBoard` as the first page and `Tutor` reserved for live study.

## Active Sprint 2026-03-15

- Active execution note: the current dirty frontend Tutor/shared-page rewrite set is intentionally left in place during this cleanup pass. Treat those source edits as in-progress local work, not workspace noise.
- Historical note: detailed implementation evidence still lives in the linked Conductor tracks plus `conductor/tracks/GENERAL/log.md`.

### Sprint: Swarm Planner Baseline Sweep (2026-03-16)
- [x] SPH-110. Run the new planner eval kit against the benchmark prompts and record a durable baseline scorecard for future `trey-autoresearch` tuning.
  - Scope:
    - `.codex/skills/treys-swarm-planner-repo/evals/`
    - `conductor/tracks/swarm-planner-hardening_20260315/`
    - `docs/root/TUTOR_TODO.md`
    - `conductor/tracks.md`
    - `conductor/tracks/GENERAL/log.md`
  - Done when:
    - the eval kit defines how to handle non-applicable scorecard categories
    - the six benchmark prompts are scored against the current planner skill pair
    - a durable baseline artifact exists in the swarm-planner-hardening track
    - `python scripts/check_docs_sync.py` and `git diff --check` pass
  - Completed 2026-03-16: added explicit `n/a` score handling to the eval kit, scored all six benchmark prompts, stored a baseline scorecard plus summary in the existing swarm-planner-hardening track, and re-ran docs/diff validation.

### Sprint: Swarm Planner Hardening (2026-03-15)
- [x] SPH-100. Harden the shared swarm planner and the PT repo adapter so they choose the right orchestration mode, separate validation from review, and gain an autoresearch-style tuning loop.
  - Scope:
    - `C:\Users\treyt\.agents\skills\treys-swarm-planner\`
    - `.codex/skills/treys-swarm-planner-repo/`
    - `docs/root/TUTOR_TODO.md`
    - `conductor/tracks.md`
    - `conductor/tracks/swarm-planner-hardening_20260315/`
    - `conductor/tracks/GENERAL/log.md`
    - `scripts/sync_agent_skills.ps1` validation only
  - Done when:
    - a new Conductor track captures the hardening spec, plan, review, validation, and evidence
    - the shared planner adds planning-mode selection, validation gates, reviewer diversity, stop rules, and replan metadata
    - the PT adapter adds canon-drift gating, execution-surface selection, duplicate-system checks, and repo-specific replan triggers
    - a repo-local eval kit exists for future `trey-autoresearch` tuning loops
    - `powershell -ExecutionPolicy Bypass -File scripts/sync_agent_skills.ps1 -Mode Check`, `python scripts/check_docs_sync.py`, and `git diff --check` pass
  - Completed 2026-03-15: backed up the canonical shared planner skill, hardened both planner skills/templates/examples, added a repo-local eval kit plus benchmark scorecard, stored before/after planner evidence in a new Conductor track, and re-ran the shared-skill sync checks to confirm consumer roots still point at the canonical upstream.

### Sprint: Workspace Coordination Cleanup (2026-03-15)
- [x] WCC-100. Reduce active workspace noise without touching the in-progress Tutor/shared frontend rewrites.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `docs/root/AGENT_BOARD.md`
    - `docs/archive/TUTOR_TODO_history_2026-03-15_workspace_cleanup.md`
    - `docs/archive/AGENT_BOARD_history_2026-03-15.md`
    - `conductor/tracks/GENERAL/log.md`
    - safe ignored caches, logs, and scratch artifacts only
  - Done when:
    - completed sprint history is archived out of the live execution board
    - the live agent board is reset after archiving all-done ownership rows
    - only safe ignored caches/logs/scratch artifacts are removed while active Tutor/page rewrites remain untouched
    - `python scripts/check_docs_sync.py` and `git diff --check` pass
  - Completed 2026-03-15: archived completed sprint and agent-board history, reset the live execution/coordination surfaces to the current active state, and removed safe ignored caches/logs/scratch files without touching the active Tutor/shared frontend rewrite set.
- [x] WCC-110. Remove bulky ignored runtime debris and checkpoint the current tracked frontend rewrite set into logical commits.
  - Scope:
    - ignored local-only outputs under `scholar/outputs/`
    - stale local database backups under `brain/data/`
    - the current tracked rewrite set under `dashboard_rebuild/`
    - `docs/root/TUTOR_TODO.md`
    - `conductor/tracks/GENERAL/log.md`
  - Done when:
    - old ignored Scholar run artifacts and stale DB backups are removed without touching the active runtime DB or uploads
    - the current tracked source changes are split into 2-3 logical commits instead of one monolithic checkpoint
    - `python scripts/check_docs_sync.py`, `git diff --check`, and `cd dashboard_rebuild && npm run build` pass before the commits are finalized
  - Completed 2026-03-15: cleared the old Scholar run artifacts under `orchestrator_runs`, `research_notebook`, and `plan_updates`, removed the stale `pt_study.db` backup plus the zero-byte `study.db`, passed docs sync / diff check / production build, and checkpointed the tracked frontend rewrite set into three logical commits instead of one monolithic snapshot.

### Sprint: Shell Control System Rollout (2026-03-15)
- [ ] SCSR-100. Carry the new command-deck nav language through the rest of the shared control surfaces so flagship routes and support frames use one premium control system instead of mixed button/tab treatments.
  - Scope:
    - `dashboard_rebuild/client/src/components/layout.tsx`
    - `dashboard_rebuild/client/src/components/PageScaffold.tsx`
    - `dashboard_rebuild/client/src/components/CoreWorkspaceFrame.tsx`
    - `dashboard_rebuild/client/src/components/SupportWorkspaceFrame.tsx`
    - `dashboard_rebuild/client/src/components/brain/MainContent.tsx`
    - `dashboard_rebuild/client/src/components/ui/tabs.tsx`
    - `dashboard_rebuild/client/src/components/shell/controlStyles.ts`
    - `dashboard_rebuild/client/src/pages/brain.tsx`
    - `dashboard_rebuild/client/src/pages/scholar.tsx`
    - `dashboard_rebuild/client/src/pages/tutor.tsx`
    - targeted layout/frontend tests
  - Deferred note: intentionally not touched in the workspace cleanup pass because the related Tutor/shared frontend files are under active local rework in the dirty worktree.
  - Done when:
    - shared tabs, control rails, command bands, and chips read as one command-deck system
    - Brain, Tutor, and Scholar use the same control language for top bars and internal tab/select surfaces
    - support-page command bands inherit the new shell treatment through shared wrappers
    - the notes surface matches the refreshed shell control system
    - `npm run test -- client/src/components/__tests__/layout.test.tsx` and `cd dashboard_rebuild && npm run build` pass

### Sprint: UI Production System (2026-03-16)
- [x] UPS-100. Define the durable UI production system so the app can move from theme experiments into one sellable shell/page hierarchy with code-driven interaction over decorative rail art.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `conductor/tracks.md`
    - `conductor/tracks/ui-production-system_20260316/`
    - planning references only from the current shell/page wrappers and route hierarchy
  - Done when:
    - a durable Conductor track exists for the UI production system
    - the track locks flagship/support/utility hierarchy and the “interactive code over decorative shell” rule
    - phased rollout covers shared shell, flagship pages, support pages, shared controls, and responsive QA
    - the plan explicitly avoids blind collision with the active Tutor workflow dirty set
    - `python scripts/check_docs_sync.py` and `git diff --check` pass
  - Completed 2026-03-16: opened the UI Production System track, locked the tier hierarchy and asset contract, and recorded a phased rollout plus validation matrix for future implementation waves.

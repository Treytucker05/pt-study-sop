# Tutor TODO (Execution Tracker)

Date: 2026-03-13
Owner: Trey
Authority: execution-only sprint and backlog tracker. Top-level repo truth lives only in `README.md`.
Purpose: keep implementation work ordered, visible, and tied to tests and verification gates without redefining the product.

- Top-level repo truth: `README.md`
- Supporting technical/runtime docs: `docs/root/PROJECT_ARCHITECTURE.md`, `docs/root/GUIDE_DEV.md`
- Conductor execution registry: `conductor/tracks.md`

## Current Board (In-Progress)

- Canonical execution order: `PRIME -> TEACH -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`
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

### Sprint: Repo-Wide Quality Audit Backlog (2026-03-16)
- [ ] RQA-100. Run a non-blocking repo-wide audit against the current dirty workspace, split the app into parallel subsystem review shards, collect hard evidence for broken flows and bad UI, and consolidate the result into one severity-ranked fix backlog plus fix-wave plan.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `docs/root/AGENT_BOARD.md`
    - `conductor/tracks.md`
    - `conductor/tracks/repo-quality-audit_20260316/`
    - read-only inspection of `dashboard_rebuild/client/src/`, `brain/dashboard/`, `brain/tests/fixtures/harness/`, and the live app at `http://127.0.0.1:5000`
  - Done when:
    - the audit track contains `spec.md`, `plan.md`, `evidence.md`, `findings.md`, and per-shard audit artifacts
    - the swarm covers shell/nav, Brain, Tutor, Scholar, Methods/Mastery, Library/Calendar/Vault Health, backend/API contracts, validation gaps, and cross-route visual/accessibility quality
    - every finding is normalized with severity, type, repro, evidence, owning scope, and fix-wave bucket
    - the final backlog groups issues into Wave 1 (`P1`), Wave 2 (`P2`), and Wave 3 (`P3`) remediation passes

### Sprint: Tutor Prime Artifact Layout Pass (2026-03-19)
- [x] TCH-100. Introduce a first-class `TEACH` control stage across Tutor runtime, method library, and UI so teaching-first chains can explain unfamiliar material before `CALIBRATE`.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `README.md`
    - `sop/library/`
    - `brain/`
    - `dashboard_rebuild/`
    - `conductor/tracks/GENERAL/log.md`
  - Done when:
    - canonical stage order becomes `PRIME -> TEACH -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`
    - `control_stage` enums, DB/runtime validators, method cards, chains, and Tutor UI all accept and display `TEACH`
    - explanation-first methods are reclassified into `TEACH`, learner-production methods remain in `ENCODE`, and TEACH-native method cards exist for the missing teaching moves
    - Tutor prompt assembly can build a `teach_packet` / `teach_context` runtime layer for TEACH blocks
    - targeted backend/frontend tests and the production frontend build pass
  - Completed 2026-03-20 via `TSCU-100`: promoted TEACH to first-class stage across canon docs, SOP/runtime generators, backend/runtime validators, prompt assembly, chain validation, Methods UI stage filters, and generated runtime bundles while preserving compatibility for chains that omit TEACH.
- [x] TPAL-100. Reframe the current Tutor Priming surface around the agreed Studio PRIME artifact bundle without changing the underlying workflow save/restore contract.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx`
    - `dashboard_rebuild/client/src/hooks/useTutorWorkflow.ts`
    - `brain/dashboard/api_tutor_workflows.py`
    - `brain/tests/test_tutor_workflow_priming_assist.py`
    - `conductor/tracks/GENERAL/log.md`
  - Done when:
    - the main PRIME editor surface centers the agreed artifact bundle: `Learning Objectives`, `Study Spine`, `Hierarchical Map`, `Summary`, and `Terms`
    - the old `gaps` / `recommended strategy` fields move out of the main artifact bundle into secondary Tutor handoff notes
    - source-linked Priming Assist output labels align with the new artifact framing closely enough for live workflow testing
    - existing workflow save/restore remains compatible without a priming bundle schema migration
    - targeted validation covers the priming assist backend test, the relevant Tutor frontend tests, and a production frontend build
  - Completed 2026-03-19: reshaped the current Priming panel around `Learning Objectives`, `Study Spine`, `Hierarchical Map`, `Summary`, and `Terms`, demoted open questions plus handoff guidance into a secondary Tutor handoff card, retuned the Priming Assist prompt and source-linked output labels to match the new PRIME framing, kept the existing priming bundle storage contract intact, passed `pytest brain/tests/test_tutor_workflow_priming_assist.py`, passed `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.workspace.integration.test.tsx`, passed `cd dashboard_rebuild && npm run build`, and confirmed the live Priming surface at `http://127.0.0.1:5000/tutor`.
- [x] TPAL-110. Replace the current Priming stacked-card/form layout with the chosen Setup Rail structure so setup controls, source viewing, and PRIME artifact review each have their own stable workspace.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `dashboard_rebuild/client/src/components/priming/PrimingLayout.tsx`
    - `dashboard_rebuild/client/src/components/priming/PrimingMaterialReader.tsx`
    - `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx`
    - `conductor/tracks/GENERAL/log.md`
  - Done when:
    - all setup pickers live in a dedicated left rail
    - the center column is a tall source viewer instead of a squeezed mixed workspace
    - the right column is an extraction-first PRIME artifact workspace, not a stack of manual authoring forms
    - the old below-the-fold picker clutter no longer dominates the Priming screen
    - targeted validation covers a relevant Tutor frontend test, a production frontend build, and a live `/tutor` Priming check
  - Completed 2026-03-19: converted the Priming screen to the chosen Setup Rail layout by moving all setup and chain controls into a dedicated left rail, keeping the source viewer as the center workspace, turning the right side into an extraction-first PRIME artifact review stack with manual edits hidden behind fallback toggles, removing the old bottom block bar from the live Priming layout, restoring the missing left-rail materials picker plus chain preview, changing study unit entry to a typeable field with suggestions, fixing stale Obsidian target derivation so it follows the current class plus study unit instead of old saved state, passing `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.workspace.integration.test.tsx`, passing `cd dashboard_rebuild && npm run build`, and confirming the live `/tutor` Priming screen now renders as the three-zone Setup Rail workspace.
- [x] TPAL-120. Improve PRIME artifact readability so extracted summaries, objectives, terms, and maps render as structured study outputs instead of raw text blobs.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `brain/dashboard/api_tutor_workflows.py`
    - `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx`
    - `dashboard_rebuild/client/src/lib/tutorUtils.ts`
    - `dashboard_rebuild/client/src/pages/__tests__/tutor.workspace.integration.test.tsx`
    - `conductor/tracks/GENERAL/log.md`
  - Done when:
    - Priming Assist prompt guidance asks for structured markdown-ready summaries and term lines plus a real hierarchical map representation
    - the PRIME artifact workspace renders numbered lists, headers, paragraphs, and code/map blocks instead of raw newline-joined text
    - hierarchical map output can render a Mermaid map when the extractor returns one, with a readable fallback for non-Mermaid structure notes
    - source-linked previews are compact but still visibly structured
    - targeted validation covers the priming assist backend test or relevant Tutor frontend test, a production frontend build, and a live `/tutor` Priming extraction check
  - Completed 2026-03-19: tightened `brain/dashboard/api_tutor_workflows.py` so Priming Assist asks for markdown-ready summaries, definition-style term lines, and a true hierarchical map representation; updated `dashboard_rebuild/client/src/lib/tutorUtils.ts` to normalize markdown list prefixes on save, promote multi-source aggregate blocks into markdown subheadings, and format PRIME artifacts into headed lists/paragraphs plus Mermaid-aware previews; updated `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx` so the artifact workspace renders formatted markdown instead of raw terminal blobs and falls back to a visual Mermaid map derived from the Study Spine when the extractor returns prose for the hierarchy; added targeted frontend coverage in `dashboard_rebuild/client/src/lib/__tests__/tutorUtils.test.ts`; passed `pytest brain/tests/test_tutor_workflow_priming_assist.py`, passed `cd dashboard_rebuild && npm run test -- client/src/lib/__tests__/tutorUtils.test.ts`, passed `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.workspace.integration.test.tsx`, passed `cd dashboard_rebuild && npm run build`, and confirmed on the live `/tutor` Priming flow after a hard refresh that source-linked extraction previews now show numbered/headed markdown and the Summary artifact renders as a formatted document instead of a raw text blob.

### Sprint: TEACH Stage Control-Plane Upgrade (2026-03-20)
- [x] TSCU-100. Introduce `TEACH` as a first-class control-plane stage in Tutor runtime, method contracts, and stage-facing UI while preserving compatibility for chains that do not include TEACH.
  - Scope:
    - `README.md`
    - `sop/library/`
    - `sop/tools/`
    - `brain/`
    - `dashboard_rebuild/client/src/`
    - `brain/tests/`
    - `sop/tests/`
    - `conductor/tracks/GENERAL/log.md`
  - Done when:
    - canonical stage order is upgraded to `PRIME -> TEACH -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`
    - `control_stage` accepts `TEACH` across method cards, DB/runtime validation, APIs, and frontend stage types
    - TEACH-specific doctrine and prompt assembly exist so Tutor can run explanation-first blocks with `Source Facts -> Plain Interpretation -> Bridge Move -> Application -> Anchor Artifact`
    - explanation-first methods are reclassified into TEACH, learner-production methods remain in ENCODE, and the new TEACH-native cards exist
    - chain validation and Tutor UI surfaces treat TEACH as first-class, while chains without TEACH continue to load and run
  - Completed 2026-03-20: upgraded canon stage order to `PRIME -> TEACH -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`, added `TEACH` to DB/runtime/API/frontend stage contracts, built TEACH prompt assembly and non-assessment guardrails, reclassified explanation-first methods into TEACH, added five TEACH-native method cards, updated chain validation plus selector policy to CP-MSS v2.0, exposed TEACH in Methods UI filtering and badges, regenerated `sop/runtime/*` plus golden outputs, and passed validator, backend, frontend, and production build verification.
    - targeted validation covers SOP validators/tests, backend runtime/tests, relevant Tutor frontend tests, and a production frontend build

### Sprint: Custom Navbar Layout Plugin (2026-03-16)
- [x] FNP-100. Create a minimal custom navbar layout plugin that imports the dashboard shell background plus the split navbar button PNGs and lays them out automatically in the open design file.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `tools/custom-navbar-layout-plugin/`
    - `conductor/tracks/GENERAL/log.md`
  - Done when:
    - a repo-local custom plugin scaffold exists with manifest, plugin code, UI, and usage docs
    - the plugin accepts the dashboard background image plus the split button PNG set from local disk
    - the plugin creates a `1536 x 1024` navbar assembly frame and places the assets at the recorded coordinates
    - the plugin can be run from the Figma desktop app in development mode without requiring MCP placement support
    - validation covers plugin file syntax and docs references
  - Completed 2026-03-16: added a repo-local custom navbar layout plugin under `tools/custom-navbar-layout-plugin/` with a local file-picker UI, fixed navbar placement coordinates, and import/run docs for the Figma desktop app; validated `manifest.json`, passed `node --check tools/custom-navbar-layout-plugin/code.js`, passed `python scripts/check_docs_sync.py`, and passed `git diff --check` with only pre-existing CRLF warnings in unrelated dirty files.

### Sprint: Custom App Navbar Load (2026-03-16)
- [x] CAN-100. Replace the shared app shell's generated text nav controls with Trey's custom PNG navbar buttons while preserving the existing route map and nav test hooks.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `dashboard_rebuild/attached_assets/`
    - `dashboard_rebuild/client/src/components/layout.tsx`
    - `dashboard_rebuild/client/src/components/__tests__/layout.test.tsx`
    - `conductor/tracks/GENERAL/log.md`
  - Done when:
    - the split navbar PNGs live in the app asset folder
    - the shared layout header renders the custom primary and support buttons for the existing routes
    - active/hover styling keeps the buttons readable without changing route behavior or test IDs
    - targeted layout tests pass and the frontend production build succeeds
  - Completed 2026-03-16: copied the split navbar PNGs into `dashboard_rebuild/attached_assets/`, rewired `layout.tsx` to render the custom primary/support button art against the existing route map, preserved the existing nav test hooks, passed `npm run test -- layout.test.tsx`, passed `npm run build`, and verified the navbar in the live dashboard shell at `http://127.0.0.1:5000/brain`.

### Sprint: UI Image Centralization (2026-03-16)
- [x] UIC-100. Move the current shell/navbar image set plus the working navbar source art into `C:\pt-study-sop\UI Images` and repoint the frontend asset alias so the live app reads from one canonical repo-local image home.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `UI Images/`
    - `dashboard_rebuild/vite.config.ts`
    - `dashboard_rebuild/vitest.config.ts`
    - `dashboard_rebuild/tsconfig.json`
    - `tools/custom-navbar-layout-plugin/README.md`
    - `tools/custom-navbar-layout-plugin/ui.html`
    - `conductor/tracks/GENERAL/log.md`
  - Done when:
    - the live shell image files and working navbar source/reference PNGs live under `C:\pt-study-sop\UI Images`
    - the frontend `@assets` alias resolves against `UI Images` instead of `dashboard_rebuild/attached_assets`
    - the custom navbar layout plugin docs point at the new repo-local image paths
    - targeted frontend validation still passes after the move
  - Completed 2026-03-16: centralized the current shell/navbar assets plus the navbar working/source images under `C:\pt-study-sop\UI Images`, moved non-live art into `reference/` and `generated_images/`, repointed the frontend `@assets` alias in Vite/Vitest/TypeScript to the new repo-level folder, updated the custom navbar layout plugin docs to reference `UI Images`, passed `npm run test -- layout.test.tsx`, passed `npm run build`, passed `python scripts/check_docs_sync.py`, and re-verified the live navbar render at `http://127.0.0.1:5000/brain`.

### Sprint: Navbar Tool Naming Cleanup (2026-03-16)
- [x] NTNC-100. Rename the old repo-local navbar layout scaffold so it uses neutral `custom` naming instead of the stale `figma` folder label while preserving the existing files and references.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `tools/custom-navbar-layout-plugin/`
    - `conductor/tracks/GENERAL/log.md`
  - Done when:
    - the repo-local navbar layout scaffold folder uses a neutral `custom` name
    - docs/log references tied to that folder use the new name
    - lightweight validation still passes after the rename
  - Completed 2026-03-16: renamed `tools/figma-navbar-layout-plugin/` to `tools/custom-navbar-layout-plugin/`, updated the nearby sprint/log/doc references to use the neutral custom naming, passed `node --check tools/custom-navbar-layout-plugin/code.js`, passed `python scripts/check_docs_sync.py`, and passed `git diff --check` with only existing CRLF warnings.

### Sprint: Navbar PNG Crop Fix (2026-03-16)
- [x] NPCF-100. Re-crop the live custom navbar PNGs so the white block artifact under the lower glow is removed without changing the route wiring or asset names the app imports.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `UI Images/`
    - `conductor/tracks/GENERAL/log.md`
  - Done when:
    - the affected `nav-*-custom.png` files no longer show the white block under the buttons
    - the existing asset filenames stay stable for the live app import path
    - the frontend bundle is rebuilt and the live navbar is visually rechecked
  - Completed 2026-03-16: repaired the affected live/source navbar PNGs under `C:\pt-study-sop\UI Images` by removing the leftover lower tail artifact from every custom button except Tutor, kept the existing asset filenames stable, rebuilt the frontend bundle with `npm run build`, and re-verified the live navbar visually at `http://127.0.0.1:5000/brain`.

### Sprint: Custom Nav Background Shell Integration (2026-03-16)
- [x] CNBS-100. Load the custom navbar backing plate from `C:\pt-study-sop\UI Images\Dashboard finished.png` into the shared header and align the existing button links over it without changing the route map or nav test hooks.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `dashboard_rebuild/client/src/components/layout.tsx`
    - `conductor/tracks/GENERAL/log.md`
  - Done when:
    - the shared header renders the custom shell background plate behind the navbar buttons
    - the current button links stay wired to the same routes and test IDs
    - the frontend bundle is rebuilt and the live navbar is visually rechecked
  - Completed 2026-03-16: imported `C:\pt-study-sop\UI Images\Dashboard finished.png` into the shared header, rendered it as the cropped custom nav backing plate behind the existing button links, preserved the current route wiring and nav test hooks, passed `npm run test -- layout.test.tsx`, passed `npm run build`, and re-verified the live navbar visually at `http://127.0.0.1:5000/brain`.

### Sprint: Custom Nav Interaction Regression Fix (2026-03-16)
- [x] CNIR-100. Rework the custom shared-header nav shell so the primary buttons regain clear hover/click behavior and the shell background plate renders larger without changing the route map or nav test hooks.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `dashboard_rebuild/client/src/components/layout.tsx`
    - `conductor/tracks/GENERAL/log.md`
  - Done when:
    - the Brain/Scholar/Tutor buttons have reliable, obvious clickable hit areas again
    - the shared header shell background renders larger while keeping the current custom art stack
    - the route wiring and nav test IDs stay stable
    - the frontend bundle is rebuilt and the live navbar is rechecked
  - Completed 2026-03-16: updated the shared header shell composition so the primary and support rail wrapper layers no longer steal pointer events from one another, strengthened the link/image hover-press motion for the custom nav buttons, widened the desktop nav stage and shell presentation, passed `npm run test -- layout.test.tsx`, passed `npm run build`, and re-verified live hover/click navigation plus the larger shell render at `http://127.0.0.1:5000/brain`.

### Sprint: Notes Dock Side Swap (2026-03-16)
- [x] NDSS-100. Move the floating notes tab to the left edge, shrink it into a compact unlabeled icon tab, and align the notes sheet behavior with the new side without changing the existing notes interactions or test hook.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `dashboard_rebuild/client/src/components/layout.tsx`
    - `conductor/tracks/GENERAL/log.md`
  - Done when:
    - the floating notes dock renders on the left edge as a smaller tab
    - the dock keeps the existing open/drag behavior and `data-testid`
    - the notes sheet opens from the left side so the interaction feels coherent
    - the frontend bundle is rebuilt and the shell is rechecked
  - Completed 2026-03-16: moved the floating notes dock to the left edge as a smaller unlabeled icon tab, switched the notes sheet to open from the left side for a consistent interaction, kept the existing drag/open behavior plus `data-testid="notes-dock"`, passed `npm run test -- layout.test.tsx`, passed `npm run build`, and re-verified the live shell plus notes panel at `http://127.0.0.1:5000/brain`.

### Sprint: Custom Nav Title And Hero Polish (2026-03-16)
- [x] CNTH-100. Recompose the shared header so the custom nav shell sits lower and centered, the title arcs over the shell with the brain mark integrated into it, the subtitle is removed, and the Scholar/Tutor buttons carry stronger visual emphasis without changing the route map or nav test hooks.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `dashboard_rebuild/client/src/components/layout.tsx`
    - `conductor/tracks/GENERAL/log.md`
  - Done when:
    - the custom shell is centered and visually lowered in the shared header
    - `TREY'S STUDY SYSTEM` renders as a curved title over the shell with the brain logo embedded
    - `NEURAL COMMAND DECK` is removed
    - Scholar and Tutor have stronger always-on standout treatments while preserving the current nav behavior
    - the frontend bundle is rebuilt and the live header is rechecked
  - Completed 2026-03-16: rewired the header composition so the nav shell is centered and lowered as a single hero element, replaced the old left-side logo block with a curved `TREY'S STUDY SYSTEM` title that embeds the brain logo, removed the `NEURAL COMMAND DECK` subtitle, strengthened the primary Scholar/Tutor glow treatment while keeping the current route map and test hooks stable, passed `npm run test -- layout.test.tsx`, passed `npm run build`, and re-verified the live shell at `http://127.0.0.1:5000/brain`.

### Sprint: Custom Nav Fit And Title Emphasis (2026-03-16)
- [x] CNFE-100. Tighten the custom header footprint so it no longer causes horizontal overflow, restore the compact roof behavior on scroll, push `TREY'S STUDY SYSTEM` into a larger high-attention title above the shell, and realign the primary/support button widths so the plate and PNG art feel intentionally fitted.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `dashboard_rebuild/client/src/components/layout.tsx`
    - `conductor/tracks/GENERAL/log.md`
  - Done when:
    - the shared header no longer introduces left-right overflow
    - the title sits above the shell, reads much larger, and visually starts near the left brain side instead of a small centered arc
    - the shell footprint is reduced enough that the sticky header feels flush again when collapsed
    - the middle and lower nav buttons are widened/recentered so they sit cleaner inside the shell artwork
    - the frontend bundle is rebuilt and the live header is rechecked
  - Completed 2026-03-16: reduced the header footprint by removing the forced desktop overflow wrapper and oversized shell scale, kept the shell centered while shrinking the button art slightly, retuned the primary/support placement widths for a cleaner fit, rebuilt the title into a single left-starting `TREY'S STUDY SYSTEM` wordmark with the brain mark tucked into the title lane, and switched the shell plate render to a centered cover crop so the banner fills the header without leaving a dead black gap underneath.
  - Validation: `npm run test -- layout.test.tsx`; `npm run build`; live header recheck at `http://127.0.0.1:5000/brain`.

### Sprint: Header Variant Lab (2026-03-16)
- [x] HVL-100. Create a dedicated comparison page with 5-6 custom nav/banner alignment variants so the title/logo/shell composition can be chosen visually in one pass instead of repeatedly rewriting the live header.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `dashboard_rebuild/client/src/App.tsx`
    - `dashboard_rebuild/client/src/pages/nav-lab.tsx`
    - `conductor/tracks/GENERAL/log.md`
  - Done when:
    - a new route exists for a standalone nav/banner variant gallery
    - the page renders at least five distinct title/logo/shell lockup variants using the existing custom nav assets
    - the variants are labeled clearly enough to compare and choose
    - the frontend bundle is rebuilt and the page is visually rechecked in the browser
  - Completed 2026-03-16: added a standalone `/nav-lab` route with six title/logo/shell lockup variants built from the current custom nav assets, focused the exploration on logo placement and title alignment instead of repeated live-header rewrites, rebuilt the frontend, and rechecked the gallery structure in the browser.
  - Validation: `npm run test -- layout.test.tsx`; `npm run build`; live route check at `http://127.0.0.1:5000/nav-lab`.

### Sprint: Nav Build Marker And Launch Guard (2026-03-16)
- [x] NBLG-100. Add an unmistakable nav build marker to the live header and harden the canonical launcher so repo-level UI asset/config changes trigger a rebuild instead of silently reopening stale dist output.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `Start_Dashboard.bat`
    - `dashboard_rebuild/client/src/components/layout.tsx`
    - `conductor/tracks/GENERAL/log.md`
  - Done when:
    - the live custom nav shows a bright build marker in the top-right corner for quick visual verification
    - the canonical startup path tracks `dashboard_rebuild/shared`, repo-level `UI Images`, and key frontend config/plugin files in its stale-build detection
    - the stray `dashboard_rebuild` Vite dev server path is identified and removed during debugging so `5000` is the only active dashboard surface for this repo
    - validation confirms the live `5000` dashboard shows the new marker after startup
  - Completed 2026-03-16: added bright `NAV 316.1` marker rendering to the shared header in `dashboard_rebuild/client/src/components/layout.tsx`, expanded `Start_Dashboard.bat` stale-build detection to include `dashboard_rebuild/shared`, repo-level `UI Images`, and additional frontend config/plugin files, killed the stray `dashboard_rebuild` Vite dev server on port `3000`, rebuilt the frontend, reran the canonical launcher, and re-verified the live `5000` dashboard shows the marker at `http://127.0.0.1:5000/brain`.
  - Validation: `npm run test -- layout.test.tsx`; `npm run build`; `python scripts/check_docs_sync.py`; `Start_Dashboard.bat`; live route check at `http://127.0.0.1:5000/brain`.

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

### Sprint: Tutor Workflow Redesign (2026-03-16)
- [x] TWR-100. Introduce the staged Tutor workflow foundation so `/tutor` can evolve from one mixed start/runtime surface into `Launch -> Priming -> Tutor -> Polish -> Final Sync` without duplicating existing Tutor, Studio, materials, card, or planner systems.
  - Scope:
    - `README.md`
    - `docs/root/PROJECT_ARCHITECTURE.md`
    - `docs/root/TUTOR_TODO.md`
    - `conductor/tracks.md`
    - `conductor/tracks/tutor-workflow-redesign_20260316/`
    - `brain/db_setup.py`
    - `brain/dashboard/api_tutor.py`
    - `brain/dashboard/api_tutor_workflows.py`
    - `dashboard_rebuild/client/src/api.ts`
    - `dashboard_rebuild/client/src/api.types.ts`
  - Done when:
    - canon docs reflect Brain-owned launch plus Tutor-owned staged workflow execution
    - a durable Conductor track exists for the redesign
    - workflow, priming, memory capsule, Polish, publish, note-capture, timer, and feedback schema foundations exist on top of current Tutor primitives
    - Tutor exposes workflow APIs without inventing a duplicate launch/session/task system
    - frontend client types and methods exist for the new workflow surface
  - Validation note: completed on 2026-03-16 with `cd dashboard_rebuild && npm run build`, `pytest brain/tests/`, `python -m pytest brain/tests/test_harness_eval.py::test_harness_eval_runs_live_golden_path_from_registry -q -s`, and `python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000`

### Sprint: Tutor Workflow Depth Pass (2026-03-16)
- [x] TDP-000. Finish the original post-redesign Tutor depth work in one execution train by deepening Priming extraction, richer Polish/Final Sync artifact publishing, and Brain workflow analytics beyond the completed staged shell backbone.
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `conductor/tracks.md`
    - `conductor/tracks/tutor-workflow-depth-pass_20260316/`
    - `dashboard_rebuild/client/src/components/TutorWorkflowPrimingPanel.tsx`
    - `dashboard_rebuild/client/src/components/TutorWorkflowPolishStudio.tsx`
    - `dashboard_rebuild/client/src/components/TutorWorkflowFinalSync.tsx`
    - `dashboard_rebuild/client/src/components/brain/BrainHome.tsx`
    - `dashboard_rebuild/client/src/pages/tutor.tsx`
    - `brain/dashboard/api_tutor_workflows.py`
    - related workflow types/tests/validation surfaces
  - Done when:
    - a durable Conductor track exists for the depth pass and the sprint item is active
    - a baseline scorecard captures current source-link coverage, extraction automation coverage, publish artifact coverage, and analytics coverage
    - Priming supports source-linked extraction objects and source-level rerun/assist depth on top of the current bundle model
    - Polish / Final Sync can classify and carry at least one richer Studio artifact class in addition to notes/summaries/cards
    - Brain exposes enriched workflow analytics and learner-archetype evidence on top of the richer workflow data
    - `cd dashboard_rebuild && npm run build`, `pytest brain/tests/`, `python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000`, and an enriched manual workflow checklist all pass before closeout
  - Execution note:
    - run as one continuous execution pass after track bootstrap; do not reopen the closed Tutor Workflow Redesign track
  - Completed 2026-03-16: captured the depth baseline and metric contract, added source-linked Priming Assist with per-source rerun/write-back, promoted richer Studio artifact packages through Polish/Final Sync, expanded Brain workflow intelligence with source-link/re-prime/artifact/snapshot signals, passed `cd dashboard_rebuild && npm run build`, passed `pytest brain/tests/`, passed `python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000`, and passed a live enriched workflow proof on the restarted dashboard.

### Sprint: Tutor UI Stabilization Loop (2026-03-16)
- [x] TUSL-100. Run a repeatable live-page stabilization loop over Brain handoff, Tutor shell transitions, and adjacent study surfaces until critical navigation, hydration, and shell-state regressions are cleared and the same audit passes twice in a row.
  - Track:
    - `conductor/tracks/tutor-ui-stabilization-loop_20260316/`
  - Scope:
    - `docs/root/TUTOR_TODO.md`
    - `conductor/tracks.md`
    - `conductor/tracks/tutor-ui-stabilization-loop_20260316/`
    - `dashboard_rebuild/client/src/lib/tutorClientState.ts`
    - `dashboard_rebuild/client/src/pages/tutor.tsx`
    - any targeted Tutor shell support files needed by the active iteration
  - Done when:
    - a durable baseline scorecard and repeatable audit checklist exist for the stabilization loop
    - the first live issue wave fixes stage-scroll retention, stale Brain -> Tutor auto-resume, and live Tutor chrome bleed on Launch/dashboard
    - every iteration re-audits the same route set and checkpoints only after issue severity or counts improve
    - the loop can stop once there are `0` P1 issues, `0` P2 issues, all critical flows pass, and that result holds for two consecutive audits
  - Iteration 1 targets:
    - stage switches preserve scroll position and land mid-page
    - Brain -> Tutor handoff restores stale live session state instead of a clean launch shell
    - Launch/dashboard surfaces still render live Tutor chrome when an active session exists
  - Completed 2026-03-16:
    - created the stabilization-loop track, baseline scorecard, and repeatable audit checklist
    - fixed Tutor shell-state initialization, Brain handoff resume suppression, tutor-only chrome gating, and stage transition scroll reset
    - passed `python scripts/check_docs_sync.py`
    - passed `cd dashboard_rebuild && npm run build`
    - passed 10 consecutive browser-tool audits over Brain -> Tutor Launch -> Priming -> Final Sync -> Polish -> Methods with no failures

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
- [x] UPS-110. Run the first theme-compliance implementation wave so the live shell and highest-drift route internals actually match the locked Neural Command Deck system.
  - Scope:
    - `dashboard_rebuild/client/src/components/layout.tsx`
    - `dashboard_rebuild/client/src/index.css`
    - `dashboard_rebuild/client/src/lib/theme.ts`
    - `dashboard_rebuild/client/src/components/MessageList.tsx`
    - `dashboard_rebuild/client/src/components/TutorArtifacts.tsx`
    - `dashboard_rebuild/client/src/components/MaterialSelector.tsx`
    - `dashboard_rebuild/client/src/pages/vault-health.tsx`
    - `conductor/tracks/ui-production-system_20260316/plan.md`
    - `docs/root/TUTOR_TODO.md`
  - Done when:
    - the shell background is quieter than the header chrome
    - the brand/header copy matches the locked theme language
    - the highest-drift blue/violet route internals are remapped to the locked crimson/info/warn/support palette
    - the updated shell/components still build cleanly
    - `cd dashboard_rebuild && npm run build` passes
  - Completed 2026-03-16: quieted the shell/background intensity, aligned the brand copy to the Neural Command Deck language, remapped the highest-drift Tutor/Vault blue-violet surfaces to the locked crimson/info palette, passed `npm run test -- client/src/components/__tests__/layout.test.tsx`, and passed `cd dashboard_rebuild && npm run build`.

### Sprint Note: Navbar build-path stabilization (2026-03-16)
- [x] Locked the canonical navbar review path back to `Start_Dashboard.bat` + `http://127.0.0.1:5000/brain` after repeated false “reverts” from stale/parallel frontend surfaces.
  - Updated `dashboard_rebuild/package.json` so `npm run build` now calls `vite build` directly instead of the slower `tsx build.ts` wrapper.
  - Verified a fresh production build completes and writes the live Flask bundle back into `brain/static/dist/`.
  - Confirmed the built desktop navbar bundle contains `NAV 316.4` and `TREY'S STUDY SYSTEM`, then relaunched successfully through `Start_Dashboard.bat`.
- [x] Added a denser desktop alignment overlay for navbar polish on the live `/brain` header.
  - Kept the major `A-P` and `1-10` grid labels intact.
  - Added three lower-opacity subdivision lines between every major row and column with distinct line colors.
  - Added a small red center dot on each desktop nav button so button alignment can be called against grid intersections.
  - Confirmed the fresh production bundle contains `NAV 316.5`.
- [x] Repaired the live navbar alignment overlay so future coordinate callouts map to the real shell instead of a mismatched debug surface.
  - Verified from a live `5000` screenshot that `NAV 316.6`/`316.7` were misleading because the widened shell background and grid were rendered in one coordinate box while the clickable button anchors still used the narrower inner stage.
  - Moved the desktop button anchors into the same widened shell box as the background art and overlay grid.
  - Repositioned the red debug dots to the visible button-art centers instead of the raw PNG rectangles after measuring the remaining transparent padding in the custom button assets.
  - Confirmed the fresh production bundle contains `NAV 316.8`.
- [x] Removed the temporary desktop navbar debug overlay after the alignment pass.
  - Removed the live `A-P` / `1-10` grid, row-column labels, and red center dots from the desktop shared header.
  - Kept the build marker so the live header can still be verified quickly during follow-up visual work.
  - Confirmed the fresh production bundle contains `NAV 316.9`.
- [x] Rebased the desktop navbar against the saved placement guide and switched the live shell to a guide-derived composite scene.
  - Used `UI Images/reference/Dashboard finished placement guide.png` plus `UI Images/buttons_for_dashboard_split/placement.json` as the single placement source of truth.
  - Generated `UI Images/Dashboard finished composite.png` so the shell and button art render as one aligned desktop scene.
  - Replaced the drifting multi-image desktop header render with the composite scene plus transparent route hotspots, then tuned the crop window until the live `5000` header matched the guide composition.
  - Confirmed the fresh production bundle contains `NAV 317.0`.
- [x] Enlarged the desktop title lockup chips for the next live review pass.
  - Doubled the left brain chip size in the `TREY'S STUDY SYSTEM` lockup and added a matching chip at the right end of the wordmark.
  - Kept the shell/background composition untouched so this pass isolates the title-lane change only.
  - Confirmed the fresh production bundle contains `NAV 317.1`.
- [x] Removed the baked desktop composite scene as the first Path B reset step.
  - Deleted the desktop `Dashboard finished composite.png` render from the shared header while leaving the live desktop hotspot layer in place.
  - Confirmed the canonical `5000` build now shows the title plus hotspot scaffolding only in `NAV 317.2`, which proves the baked desktop picture is gone before the shell/background is restored.
- [x] Removed the desktop transparent hotspot windows as the second Path B reset step.
  - Deleted both desktop nav hotspot rails from the shared header render, which removed all 8 desktop clear button windows from the live navbar scaffold.
  - Confirmed the canonical `5000` build now shows only the title lane with no desktop shell/button placeholder windows in `NAV 317.3`.
- [x] Added a dedicated title lockup lab for the next navbar decision.
  - Reworked `/nav-lab` into a three-variant title comparison focused on bookend brain chips plus `Oxanium`, `Orbitron`, and `Audiowide`.
  - Added those three fonts to the frontend theme tokens and verified the lab builds cleanly into the canonical `5000` app.
- [x] Cleaned up the local browser-tool fallback order so live browser work stops drifting across overlapping CDP tools.
  - Promoted `browsirai` as the primary live-Chrome MCP and `agent-browser` as the CLI fallback, with `Playwright` reserved for isolated reproducible runs and `windows-mcp` for native desktop control.
  - Updated the `UI-UX` launcher/docs to use `agent-browser` prep instead of the older `chrome-cdp` fallback naming, and verified the `penpot-mcp`, `pt-study-dashboard`, and `agent-browser-prep` launcher profiles all resolve correctly.
  - Relaunched the canonical dashboard and Penpot startup profiles through the cleaned-up launcher flow.
  - Upgraded the installed `agent-browser` CLI to `0.21.0` and removed the old local `chrome-cdp` skill files from the active fallback path.
- [x] Set up Stitch MCP for higher-fidelity UI exploration beyond Penpot layout-only work.
  - Configured global Google Cloud ADC for the active `treytucker05@yahoo.com` account with quota project `studysop`.
  - Enabled `stitch.googleapis.com` and the Stitch MCP endpoint for `projects/studysop`.
  - Verified Stitch CLI access with system gcloud auth by listing tools and opening the live Stitch project browser.
  - Added a permanent `stitch` MCP server entry to `C:\Users\treyt\.codex\config.toml`; Codex restart is required before the `stitch` tools appear in-chat.

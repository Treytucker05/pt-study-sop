# Implementation Plan: Brain-Centered Triad Reframe

**Track ID:** brain-centered-triad_20260312  
**Spec:** [./spec.md](./spec.md)  
**Created:** 2026-03-12  
**Status:** [x] Complete, implemented, and verified

## Overview

This track does not start by coding pages. It starts by freezing the end goal, then works backward into the smallest feasible implementation slices. The reframe is only implementation-ready when each slice is small enough to execute with named tests, build checks, and manual gates.

## Execution Contract

- No implementation task starts until the end goal and ownership map for its slice are frozen.
- No task is allowed to stay broad; if it cannot fit in one focused coding session, split it again.
- No task moves forward without named tests or deterministic verification.
- No next task begins until the previous task is green and recorded in the plan.
- If a task touches both backend and frontend but cannot be verified end to end, split it into separate slices.

## Phase 0: End-State Freeze

Freeze the corrected product shape before any more implementation work changes the repo.

### Tasks

- [x] T-000: Publish the corrected end-state product map for Brain, Scholar, Tutor, Dashboard, Library, Vault, Mastery, and Calendar.
- [x] T-001: Publish the locked learnings from the repo audit and owner review in a durable decision record.
- [x] T-002: Publish the unresolved product questions and the order they should be answered.
- [x] T-003: Mark which assumptions from `brain-scholar-tutor-realignment_20260311` are kept, corrected, or superseded.

### Verification

- [x] The end-state map answers page ownership, data ownership, and handoff direction without contradiction.

## Phase 1: Reverse Roadmap + Feasibility Pass

Take the frozen end goal and decompose it into work that is actually executable.

### Tasks

- [x] T-100: Work backward from the frozen end goal into implementation slices no larger than 1-2 days of work.
- [x] T-101: Name the exact surfaces each slice changes: routes, APIs, docs, state, and subordinate pages.
- [x] T-102: Add a feasibility review for every slice: dependency, rollback story, likely touched files, and risk.
- [x] T-103: Split or reject any slice that is too large, too vague, or lacks a clear owner.

### Verification

- [x] Every slice is small, feasible, and independently understandable before coding starts.

## Phase 2: Test Gates + Execution Order

Attach the exact gates that must pass before work is allowed to move forward.

### Tasks

- [x] T-200: For every slice, name the tests or verification commands that must fail/pass to prove the work.
- [x] T-201: Add a no-skip gate: no next slice begins until the previous slice is green and recorded.
- [x] T-202: Freeze the dependency order so the first implementation work starts with the highest-leverage, lowest-ambiguity slice.
- [x] T-203: Define the standing regression suite that must stay green between slices (`pytest brain/tests/`, frontend build, and targeted UI/API tests as applicable).

### Verification

- [x] Each slice has an explicit red/green/verify path and a blocked-by list.

## Phase 3: Brain Home + Ownership Reframe

Lock Brain as the home surface and supporting-system owner before touching implementation.

### Tasks

- [x] T-300: Freeze the Brain-home contract: `/dashboard` merges into `/brain`, and Brain becomes the home surface.
- [x] T-301: Freeze Brain's top-of-page order: urgent queue, next actions, learner state, stats bands, and lower drill-downs.
- [x] T-302: Freeze Brain ownership rules for Library, Vault / Vault Health, Mastery, and Calendar as subordinate surfaces.
- [x] T-303: Freeze which current dashboard widgets are kept, moved, rewritten, or deleted.

### Verification

- [x] No Brain/dashboard ambiguity remains, and every support page has a clear Brain relationship before implementation begins.

## Phase 4: Tutor Work Surface Reframe

Lock Tutor as the only live study workspace and artifact-generation surface.

### Tasks

- [x] T-400: Freeze Tutor as the only live study-workspace surface for notes, artifacts, canvas, graph tools, and session execution.
- [x] T-401: Freeze the Brain-owned Library -> Tutor handoff contract for content loading and session scope.
- [x] T-402: Freeze Tutor write-back behavior into Brain-owned analytics and the Brain-owned vault.
- [x] T-403: Remove overlapping ownership between Brain and Tutor for active workspace behavior.

### Verification

- [x] The ownership boundary between Brain and Tutor is explicit and leaves no duplicated artifact/workspace responsibilities.

## Phase 5: Scholar System Research Reframe

Lock Scholar as the system investigator and proposal engine, not a parallel teaching or evidence-home surface.

### Tasks

- [x] T-500: Freeze Scholar as a system-facing, non-teaching investigation console and proposal ledger.
- [x] T-501: Freeze Scholar question ownership, target-based approval rules, and mirror-back behavior into Brain/Tutor.
- [x] T-502: Freeze Brain analytics -> Scholar investigation handoff for Tutor/session quality, Library, and Vault signals.
- [x] T-503: Freeze the Scholar pause/resume model and the Obsidian-backed investigation notes/task page contract.

### Verification

- [x] Scholar's authority, boundaries, performance model, and investigation-notes contract are clear enough to implement without inventing policy mid-task.

## Phase 6: First Executable Slices

Finish the planning work by picking the first real implementation steps and their gates.

### Tasks

- [x] T-600: Pick the first three implementation slices in order, smallest/highest-leverage first.
- [x] T-601: Attach exact test files, build commands, and manual smoke steps to each of those first three slices.
- [x] T-602: Confirm each of the first three slices is doable without reopening the whole architecture.
- [x] T-603: Mark the track implementation-ready only after those first three slices are greenlit.

### Verification

- [x] The next implementation session can start on Task 1 without further architecture discovery.

## Tonight Cut Line

Tonight's implementation target is the first coherent one-student triad wave, not the entire end-state product:

1. Shell/route merge: Brain becomes the obvious home and Dashboard stops being a peer page.
2. Brain home top section: install the Tutor-first attention queue, learner-state framing, and split stats bands.
3. Product framing cleanup: align Tutor, Scholar, and support-page language so the app clearly reads as one personal study program.

Anything deeper than those three steps is out of tonight scope unless all three slices are green.

## Implementation Update: 2026-03-12

- [x] Slice 1 shipped.
  - `/` and `/brain` now load Brain.
  - Dashboard route/file retired from the live frontend shell.
  - Nav now groups Library, Mastery, Calendar, Methods, and Vault under support systems.
- [x] Slice 2 shipped.
  - Brain now has a dedicated home mode with the attention queue, split stats bands, lower drill-downs, and explicit Tutor/Profile entry points.
  - Legacy Brain tools remain available behind the Home tab and explicit open actions.
- [x] Slice 3 shipped.
  - Scholar is framed as the system-facing investigation console.
  - Tutor is framed as the default live study workspace.
  - Library, Mastery, Methods, and Vault Health now read as support systems around the triad.

### Validation Snapshot

- [x] `npm run check`
- [x] `npm run test`
- [x] `npm run build`
- [x] Live smoke on `http://127.0.0.1:5000` after `Start_Dashboard.bat`

### Closeout

- [x] Follow-up mastery/API repair shipped.
- [x] Gemini Embedding 2 preview is now the live default embedding model when a Gemini key is present.
- [x] Shell alias/mobile-nav/hidden-page polling regressions were tightened after the first wave.

## Detailed Execution Backlog

This is the next concrete implementation queue after the first triad wave shipped. The order matters. No task starts until the dependency tasks above it are green.

### Phase 7: Shell Stabilization + Header Repair

#### T-700: Repair the broken desktop header/nav layout

- **Status:** done
- **Depends on:** []
- **Files:** `dashboard_rebuild/client/src/components/layout.tsx`
- **Definition of done:** the left brand block is fully visible, the nav no longer clips on standard desktop widths, and grouped labels (`CORE LOOP`, `SUPPORT SYSTEMS`) are readable and intentional.
- **Automated checks:** `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/brain.test.tsx`
- **Manual checks:** Start app with `cmd /c Start_Dashboard.bat`, open `http://127.0.0.1:5000/`, confirm brand and nav are fully visible at `1280x720` and `1440x900`.

#### T-701: Add resilient responsive behavior for the shell header

- **Status:** done
- **Depends on:** [T-700]
- **Files:** `dashboard_rebuild/client/src/components/layout.tsx`
- **Definition of done:** desktop, tablet, and mobile widths all preserve readable navigation through explicit layout behavior (wrap/condense/collapse) and no clipping.
- **Automated checks:** `cd dashboard_rebuild && npm run check`
- **Manual checks:** Start app with `cmd /c Start_Dashboard.bat`, verify header behavior at `1366x768`, `1024x768`, and `768x1024`.

#### T-702: Add regression tests for shell routing and nav framing

- **Status:** done
- **Depends on:** [T-700, T-701]
- **Files:** `dashboard_rebuild/client/src/pages/__tests__/brain.test.tsx`
- **Definition of done:** tests cover `/` and `/brain`, Brain active-nav state, grouped support navigation, and Tutor-first shell framing.
- **Automated checks:** `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/brain.test.tsx`
- **Manual checks:** Start app with `cmd /c Start_Dashboard.bat`, open `/`, `/brain`, `/tutor`, `/scholar` and verify nav grouping and active state.

#### T-703: Harden Brain home persistence and bad localStorage recovery

- **Status:** done
- **Depends on:** [T-702]
- **Files:** `dashboard_rebuild/client/src/components/brain/useBrainWorkspace.ts`, `dashboard_rebuild/client/src/pages/brain.tsx`
- **Definition of done:** `home` is the safe default on fresh load, invalid stored state cannot strand the user in a broken mode, and legacy mode return works.
- **Automated checks:** `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/brain.test.tsx`
- **Manual checks:** Start app with `cmd /c Start_Dashboard.bat`, corrupt `brain-main-mode` in localStorage and confirm `/brain` opens on `home`.

#### T-704: Remove remaining live Dashboard-era references from the frontend shell

- **Status:** done
- **Depends on:** [T-703]
- **Files:** `dashboard_rebuild/client/src/App.tsx`, `dashboard_rebuild/client/src/components/layout.tsx`, `dashboard_rebuild/client/src/pages/*`
- **Definition of done:** there are no visible `Dashboard` peer labels, dead imports, or stale route assumptions in the live app shell.
- **Automated checks:** `rg -n "Dashboard|/dashboard" dashboard_rebuild/client/src`, `cd dashboard_rebuild && npm run check`
- **Manual checks:** Start app with `cmd /c Start_Dashboard.bat` and confirm shell has no peer Dashboard nav route as a primary surface.

### Phase 8: Brain Home Completion + Data Repair

#### T-800: Diagnose and fix the live `/api/mastery/dashboard` 500

- **Status:** done
- **Depends on:** [T-704]
- **Files:** `brain/dashboard/api_mastery.py`, related mastery helpers/tests under `brain/tests/`
- **Definition of done:** the live backend returns a successful response against the current local data set and no longer forces the Brain home mastery fallback.
- **Automated checks:** `pytest brain/tests/ -k mastery -q`
- **Manual checks:** with backend running, call `GET http://127.0.0.1:5000/api/mastery/dashboard` and verify status `200`.

#### T-801: Replace Brain home mastery fallback with real mastered/live state rendering

- **Status:** done
- **Depends on:** [T-800]
- **Files:** `dashboard_rebuild/client/src/components/brain/BrainHome.tsx`
- **Definition of done:** the mastery card shows real current counts and communicates loading/error state clearly without collapsing the layout.
- **Automated checks:** `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/brain.test.tsx`
- **Manual checks:** open `/brain` and confirm the mastery card updates from live payload.

#### T-802: Harden the Brain attention queue ordering and dedupe rules

- **Status:** done
- **Depends on:** [T-801]
- **Files:** `dashboard_rebuild/client/src/components/brain/BrainHome.tsx`
- **Definition of done:** academic deadlines, planner items, Tutor risk, Brain next-best action, weaknesses, and Scholar blockers appear in the intended order with no duplicate/conflicting top actions.
- **Automated checks:** `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/brain.test.tsx`
- **Manual checks:** populate mixed scenario and verify queue order + dedupe rules visually.

#### T-803: Make Brain queue actions carry the right destination context

- **Status:** done
- **Depends on:** [T-802]
- **Files:** `dashboard_rebuild/client/src/components/brain/BrainHome.tsx`, `dashboard_rebuild/client/src/pages/tutor.tsx`
- **Definition of done:** queue actions that open Tutor, Calendar, or Scholar land in the correct surface with the expected intent and without ambiguous generic routing.
- **Automated checks:** `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.test.tsx`
- **Manual checks:** run through each queue CTA and confirm route/context.

#### T-804: Refine Brain home section hierarchy and spacing

- **Status:** done
- **Depends on:** [T-803]
- **Files:** `dashboard_rebuild/client/src/components/brain/BrainHome.tsx`
- **Definition of done:** the top queue reads first, stats read second, and lower sections feel clearly subordinate instead of visually competing with the top actions.
- **Automated checks:** `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/brain.test.tsx`, `cd dashboard_rebuild && npm run build`
- **Manual checks:** open `/brain` and verify visual hierarchy in one viewport.

#### T-805: Tighten the course breakdown and study-rotation sections

- **Status:** done
- **Depends on:** [T-804]
- **Files:** `dashboard_rebuild/client/src/components/brain/BrainHome.tsx`
- **Definition of done:** course cards and the current study-rotation view give clear next actions instead of just status text.
- **Automated checks:** `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/brain.test.tsx`
- **Manual checks:** open `/brain` and verify each card has a practical next action.

#### T-806: Demote System / Setup controls without hiding them

- **Status:** done
- **Depends on:** [T-805]
- **Files:** `dashboard_rebuild/client/src/components/brain/BrainHome.tsx`
- **Definition of done:** onboarding and data-rights controls remain available and are visibly secondary.
- **Automated checks:** `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/brain.test.tsx`
- **Manual checks:** open `/brain` and confirm study actions are primary with setup as secondary.

### Phase 9: Triad Hierarchy Cleanup

#### T-900: Make Brain-to-Tutor handoff feel intentional

- **Status:** done
- **Depends on:** [T-806]
- **Files:** `dashboard_rebuild/client/src/components/brain/BrainHome.tsx`, `dashboard_rebuild/client/src/pages/tutor.tsx`
- **Definition of done:** the primary Brain CTA and the top study-risk queue items consistently point into Tutor as the live execution surface.
- **Automated checks:** `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.test.tsx`
- **Manual checks:** manual browser smoke from `/brain` to `/tutor` with queue CTA.

#### T-901: Clean up Tutor copy and top-of-page framing

- **Status:** done
- **Depends on:** [T-900]
- **Files:** `dashboard_rebuild/client/src/pages/tutor.tsx`
- **Definition of done:** Tutor reads as the default live study workspace, while still preserving library handoff, active-session restore, and artifact/structured-note behavior.
- **Automated checks:** `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.test.tsx`
- **Manual checks:** open `/tutor` and confirm top messaging aligns to immediate study execution.

#### T-902: Finish the Scholar investigation-console recenter

- **Status:** done
- **Depends on:** [T-901]
- **Files:** `dashboard_rebuild/client/src/pages/scholar.tsx`, `dashboard_rebuild/client/src/pages/__tests__/scholar.test.tsx`
- **Definition of done:** Scholar consistently reads as the system-facing investigation console and no longer feels like a second learner-facing study workspace.
- **Automated checks:** `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/scholar.test.tsx`
- **Manual checks:** open `/scholar` and confirm framing remains investigation-centered.

#### T-903: Add mirrored-reference treatment for Scholar items shown in Brain/Tutor

- **Status:** done
- **Depends on:** [T-902]
- **Files:** `dashboard_rebuild/client/src/components/brain/BrainHome.tsx`, `dashboard_rebuild/client/src/pages/tutor.tsx`
- **Definition of done:** any Scholar-derived item shown outside Scholar is obviously a reference card with a link back, not a second management surface.
- **Automated checks:** `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/brain.test.tsx`
- **Manual checks:** identify a Scholar-derived item in Brain/Tutor and confirm link back to `/scholar`.

#### T-904: Reframe Library, Mastery, Calendar, Methods, and Vault Health as support systems

- **Status:** done
- **Depends on:** [T-903]
- **Files:** `dashboard_rebuild/client/src/pages/library.tsx`, `dashboard_rebuild/client/src/pages/mastery.tsx`, `dashboard_rebuild/client/src/pages/calendar.tsx`, `dashboard_rebuild/client/src/pages/methods.tsx`, `dashboard_rebuild/client/src/pages/vault-health.tsx`
- **Definition of done:** each support page header and primary CTA reads as subordinate to Brain, Scholar, or Tutor instead of as a peer product.
- **Automated checks:** `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/library.test.tsx client/src/pages/__tests__/mastery.test.tsx`, `cd dashboard_rebuild && npm run build`
- **Improvement note:** add targeted support-page regression coverage for Calendar / Methods / Vault Health if those routes get another substantial framing pass.
- **Manual checks:** run through all five support routes and confirm support-first language.

### Phase 10: Regression + Canon Closeout

#### T-1000: Run the full frontend verification suite after the stabilization wave

- **Status:** done
- **Depends on:** [T-904]
- **Files:** `dashboard_rebuild/client/src/**`
- **Definition of done:** the entire frontend test suite, type check, and production build are green after the stabilization work.
- **Automated checks:** `cd dashboard_rebuild && npm run check`, `cd dashboard_rebuild && npm run test`, `cd dashboard_rebuild && npm run build`
- **Manual checks:** spot-check navigation and main pages with running app.

#### T-1001: Re-run live app smoke on the Brain / Scholar / Tutor triad

- **Status:** done
- **Depends on:** [T-1000]
- **Files:** live app only
- **Definition of done:** `/`, `/brain`, `/tutor`, `/scholar`, and the support pages all load with the corrected hierarchy and no header/nav regressions.
- **Automated checks:** `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/brain.test.tsx`, `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.test.tsx`, `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/scholar.test.tsx`
- **Manual checks:** `cmd /c Start_Dashboard.bat`, manual browser smoke on `http://127.0.0.1:5000`.

#### T-1002: Sync canon/docs to the shipped interface architecture

- **Status:** done
- **Depends on:** [T-1001]
- **Files:** `docs/root/TUTOR_STUDY_BUDDY_CANON.md`, `docs/root/PROJECT_ARCHITECTURE.md`, `docs/root/TUTOR_TODO.md`, `conductor/tracks/brain-centered-triad_20260312/*`
- **Definition of done:** docs describe Brain as home, Tutor as live workspace, Scholar as investigation console, and no longer narrate Dashboard as a peer page.
- **Automated checks:** `git diff --check`, `rg -n "Dashboard|/dashboard" docs/root/TUTOR_STUDY_BUDDY_CANON.md docs/root/PROJECT_ARCHITECTURE.md docs/root/GUIDE_USER.md conductor/tracks/brain-centered-triad_20260312`
- **Manual checks:** manual doc review in all four files.

### Phase 11: Gemini Embedding Migration Hardening

#### T-1100: Lock Gemini-first embedding provider behavior

- **Status:** done
- **Depends on:** []
- **Files:** `brain/tutor_rag.py`, `brain/dashboard/api_tutor.py`, `brain/db_setup.py`, `brain/tests/test_tutor_rag_embedding_provider.py`
- **Definition of done:** Tutor RAG resolves to Gemini by default when a Gemini key is present, preserves OpenAI fallback when Gemini is unavailable, and reports provider/model truthfully through the API.
- **Automated checks:** `pytest brain/tests/test_tutor_rag_embedding_provider.py brain/tests/test_gemini_provider_failover.py -q`
- **Manual checks:** inspect `GET http://127.0.0.1:5000/api/tutor/embed/status` and confirm the returned provider/model match the live environment.

#### T-1101: Verify provider-scoped collection and re-embed behavior

- **Status:** done
- **Depends on:** [T-1100]
- **Files:** `brain/tutor_rag.py`, `brain/data/chroma_tutor/`, `brain/tests/test_tutor_rag_batching.py`, related Tutor RAG tests
- **Definition of done:** Gemini and OpenAI embeddings do not collide in the same Chroma collection, and existing materials can be re-embedded without corrupting prior state.
- **Automated checks:** `pytest brain/tests/test_tutor_rag_batching.py brain/tests/test_tutor_rag_embedding_provider.py -q`
- **Manual checks:** trigger an embed run and verify the collection name includes provider/model scoping.

#### T-1102: Surface embedding provider/model in the user workflow

- **Status:** done
- **Depends on:** [T-1100]
- **Files:** `dashboard_rebuild/client/src/api.types.ts`, `dashboard_rebuild/client/src/__tests__/api.test.ts`, Tutor/Library-facing UI components that expose embedding status
- **Definition of done:** the active embedding provider/model is visible in a user-facing status surface instead of only existing in API payloads.
- **Automated checks:** `cd dashboard_rebuild && npm run test -- client/src/__tests__/api.test.ts client/src/pages/__tests__/library.test.tsx`
- **Manual checks:** open the relevant Tutor or Library status surface and confirm Gemini/OpenAI selection is readable.

#### T-1103: Update configuration docs for Gemini-first embeddings

- **Status:** done
- **Depends on:** [T-1100]
- **Files:** `docs/root/GUIDE_USER.md`, `docs/root/GUIDE_DEV.md`, `docs/root/PROJECT_ARCHITECTURE.md`
- **Definition of done:** docs no longer describe embeddings as OpenAI-only and instead explain Gemini-first behavior, fallback rules, and required environment variables.
- **Automated checks:** `git diff --check`, `rg -n "GEMINI_API_KEY|TUTOR_RAG_EMBEDDING_PROVIDER|text-embedding-004|OPENAI_API_KEY" docs/root/GUIDE_USER.md docs/root/GUIDE_DEV.md docs/root/PROJECT_ARCHITECTURE.md`
- **Manual checks:** review the setup docs and confirm a new local machine could be configured correctly.

#### T-1104: Run live embed smoke and failure-path verification

- **Status:** done
- **Depends on:** [T-1101, T-1102, T-1103]
- **Files:** live app only
- **Definition of done:** a live embed run succeeds with Gemini selected, status endpoints stay truthful, and a missing-key or provider error fails clearly without corrupting state.
- **Automated checks:** `pytest brain/tests/ -k \"tutor_rag or gemini_provider_failover\" -q`
- **Manual checks:** `cmd /c Start_Dashboard.bat`, then exercise `GET /api/tutor/embed/status` and `POST /api/tutor/embed`.

## First Three Executable Slices

### Slice 1: Shell + Route Collapse

- **Goal:** make Brain the home surface, remove Dashboard as a peer shell destination, and make Tutor the most obvious primary action from the shell.
- **Surfaces:** `dashboard_rebuild/client/src/App.tsx`, `dashboard_rebuild/client/src/components/layout.tsx`, `dashboard_rebuild/client/src/pages/brain.tsx`, `dashboard_rebuild/client/src/pages/dashboard.tsx`
- **Likely work:** route alias/redirect behavior, nav cleanup, shell copy cleanup, temporary dashboard-to-brain handoff strategy, obvious Tutor CTA/entry path from the home shell.
- **Rollback:** revert shell/route edits without touching Tutor or support-page internals.
- **Risks:** broken route assumptions, stale links, duplicated home rendering.
- **Pass gates:**
  - `npm run build` in `dashboard_rebuild/`
  - manual browser smoke for `/`, `/brain`, `/tutor`, and primary nav on `http://127.0.0.1:5000`

### Slice 2: Brain Home Composition

- **Goal:** replace Brain's tool-first opening with the operational home surface that points into the next best Tutor move.
- **Surfaces:** `dashboard_rebuild/client/src/pages/brain.tsx`, new/updated Brain home components, selective reuse from `dashboard_rebuild/client/src/pages/dashboard.tsx`
- **Likely work:** top attention queue, reasons + actions, Tutor-first next moves, split stats bands, lower-page section order.
- **Rollback:** remove the new Brain home layer and restore the previous opening state.
- **Risks:** over-coupling to old Dashboard queries, rendering too much at once, mixing home and workspace states.
- **Pass gates:**
  - `npm run build` in `dashboard_rebuild/`
  - manual browser smoke for Brain home layout and top actions

### Slice 3: Tutor-Centered Framing Cleanup

- **Goal:** make Tutor read as the bread-and-butter live engine, Scholar read as the investigation layer, and support pages read as utilities around the triad.
- **Surfaces:** `dashboard_rebuild/client/src/pages/tutor.tsx`, `dashboard_rebuild/client/src/pages/scholar.tsx`, `dashboard_rebuild/client/src/pages/library.tsx`, `dashboard_rebuild/client/src/pages/mastery.tsx`, `dashboard_rebuild/client/src/pages/calendar.tsx`, `dashboard_rebuild/client/src/pages/vault-health.tsx`, `dashboard_rebuild/client/src/pages/methods.tsx`
- **Likely work:** titles, helper copy, visible ownership framing, mirrored-reference wording, support-page de-emphasis, Tutor-first language cleanup.
- **Rollback:** revert page-copy and framing changes without affecting runtime behavior.
- **Risks:** cosmetic-only work that fails to improve IA, drift between docs and page labels, overextending the slice beyond tonight.
- **Pass gates:**
  - `npm run build` in `dashboard_rebuild/`
  - manual browser smoke for Tutor, Scholar, and support-page labels/navigation

## Standing Regression Suite

- `npm run build` in `dashboard_rebuild/` after every slice
- `pytest brain/tests/` before ending the night if any backend files change
- manual browser smoke on `http://127.0.0.1:5000` after every UI slice
- no next slice starts until the previous slice is green and recorded

## Final Verification

- [x] Locked learnings documented
- [x] Open questions documented
- [x] End goal frozen before coding
- [x] Reverse-built, small-slice plan published
- [x] Every slice had a pass gate before the next slice
- [x] `pytest brain/tests/ -q`
- [x] `cd dashboard_rebuild && npm run check`
- [x] `cd dashboard_rebuild && npm run test`
- [x] `cd dashboard_rebuild && npm run build`
- [x] Live smoke on `http://127.0.0.1:5000` for Brain / Scholar / Tutor + support routes
- [x] Live smoke on `GET /api/mastery/dashboard`, `GET /api/tutor/embed/status`, and `POST /api/tutor/embed`

## Follow-On Improvements Captured

- Migrate deprecated LangChain `Chroma` usage to `langchain_chroma`.
- Add per-document embed failure telemetry so skipped files surface an explicit reason in the UI/API.

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._

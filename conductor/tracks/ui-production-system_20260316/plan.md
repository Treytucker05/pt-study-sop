# Plan: UI Production System

## Execution surface

- Selected: `durable-track-only`
- Why: this work is cross-route, cross-component, visually architectural, and should survive multiple implementation waves without forcing premature queue conversion.
- Rejected:
  - `markdown-only-no-queue`: too broad and too important to leave as an ephemeral note.
  - `track-plus-wave-queue`: premature while the active Tutor workflow redesign and local dirty rewrite set are still moving.

## Final goal

Ship a production-ready UI system that makes the app feel like one premium study OS:

- one shell hierarchy
- one flagship workspace language
- one support-page operating model
- one control system across nav, tabs, chips, and command bars
- one asset strategy where art is decorative and interaction remains code-driven

## Constraints and assumptions

- Product truth remains in `README.md`; this track does not redefine route ownership.
- The active dirty Tutor/shared-page rewrite set remains in place and must be treated as in-progress local work.
- `Brain` remains the home route and top-level brand surface.
- `Tutor` remains the live study workspace and is already under broader workflow redesign.
- Existing shared wrappers are the leverage point:
  - `dashboard_rebuild/client/src/components/layout.tsx`
  - `dashboard_rebuild/client/src/components/PageScaffold.tsx`
  - `dashboard_rebuild/client/src/components/CoreWorkspaceFrame.tsx`
  - `dashboard_rebuild/client/src/components/SupportWorkspaceFrame.tsx`
- Generated imagery will be used as transparent rail/dock chassis only.

## Files and surfaces touched

- Shared shell and primitives
  - `dashboard_rebuild/client/src/components/layout.tsx`
  - `dashboard_rebuild/client/src/components/PageScaffold.tsx`
  - `dashboard_rebuild/client/src/components/CoreWorkspaceFrame.tsx`
  - `dashboard_rebuild/client/src/components/SupportWorkspaceFrame.tsx`
  - `dashboard_rebuild/client/src/components/shell/controlStyles.ts`
  - `dashboard_rebuild/client/src/components/ui/button.tsx`
  - `dashboard_rebuild/client/src/components/ui/tabs.tsx`
  - `dashboard_rebuild/client/src/index.css`
- Flagship routes
  - `dashboard_rebuild/client/src/pages/brain.tsx`
  - `dashboard_rebuild/client/src/pages/scholar.tsx`
  - `dashboard_rebuild/client/src/pages/tutor.tsx`
  - `dashboard_rebuild/client/src/components/brain/MainContent.tsx`
- Support routes
  - `dashboard_rebuild/client/src/pages/library.tsx`
  - `dashboard_rebuild/client/src/pages/calendar.tsx`
  - `dashboard_rebuild/client/src/pages/methods.tsx`
  - `dashboard_rebuild/client/src/pages/mastery.tsx`
  - `dashboard_rebuild/client/src/pages/vault-health.tsx`
- Decorative shell assets
  - `dashboard_rebuild/attached_assets/` or the active frontend asset path selected during implementation

## Dependency graph

`tier hierarchy + asset strategy -> shared shell contract -> flagship workspace contract + support-page contract -> shared controls + data surfaces -> route-level adoption -> responsive/perf/accessibility QA`

## Phases

### Phase 0: Lock the UI production system

- Open this durable track and keep the hierarchy explicit.
- Record the flagship/support/utility tier split.
- Record the “interactive code over decorative shell” rule so future implementation does not collapse into static mockups.

### Phase 1: Rebuild the shared shell around the tier hierarchy

- Finalize the shell contract in `layout.tsx`.
- Quiet the header background.
- Keep the brand block, primary triad rail, secondary support rail, and notes dock as separate components.
- Make the generated art decorative only and keep live labels, active state, focus state, and hit areas in code.
- Keep the compact-on-scroll behavior minimal and low-jank.

### Phase 2: Normalize the flagship tier

- Apply one shared workspace language across Brain, Scholar, and Tutor.
- Use `PageScaffold` + `CoreWorkspaceFrame` consistently.
- Standardize:
  - top bars
  - command strips
  - internal tab/chip language
  - panel density
  - flagship HUD treatment

### Phase 3: Normalize the support tier

- Keep Library as the reference operating model.
- Standardize `SupportWorkspaceFrame` so Calendar, Methods, Mastery, and Vault read like the same subsystem family.
- Preserve each page’s content model while normalizing:
  - left rail behavior
  - command band pattern
  - main canvas structure
  - secondary actions and data toolbars

### Phase 4: Finish the shared control system

- Unify button, tab, chip, and command-band treatments through shared primitives.
- Add a consistent active/hover/focus model.
- Make flagship controls more authoritative than support controls.
- Keep notes aligned with the secondary utility language.

### Phase 5: Data surface and readability pass

- Standardize tables, list rows, filters, and status pills.
- Reduce visual competition between background art and working surfaces.
- Ensure page bodies read as premium tools, not just chrome around generic cards.

### Phase 6: Responsive, accessibility, and motion polish

- Audit mobile/tablet behavior across all top-level routes.
- Keep 44x44 target minimums.
- Eliminate horizontal overflow.
- Keep motion purposeful and low-jank:
  - minimal shell compaction
  - local hover/active glow
  - no repeated scroll-trigger churn

## Validation gates

- Docs / planning
  - `python scripts/check_docs_sync.py`
  - `git diff --check`
- Shared shell / control implementation waves
  - `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/layout.test.tsx`
  - targeted route tests as affected
  - `cd dashboard_rebuild && npm run build`
- Integrated route verification
  - live browser smoke on Brain, Scholar, Tutor, Library, Calendar, Methods, Mastery, Vault
  - mobile-width and tablet-width visual checks

## First unblocked wave

1. Lock the durable track and shared hierarchy.
2. Finalize the asset contract for:
   - primary triad rail
   - support rail
   - notes dock
3. Execute the shared shell wave only:
   - `layout.tsx`
   - `PageScaffold.tsx`
   - `CoreWorkspaceFrame.tsx`
   - `SupportWorkspaceFrame.tsx`
   - shared control primitives

## Conductor vs planner split

- Conductor owns:
  - durable spec
  - phase ordering
  - rollout contract
  - validation matrix
- Planner queue deferred:
  - do not create wave tasks yet
  - first wave queue conversion should wait until the asset pack is finalized and the Tutor workflow dirty set is stable

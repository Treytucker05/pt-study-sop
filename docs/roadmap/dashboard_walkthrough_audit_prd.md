# Dashboard Page Walkthrough & Connectivity Audit PRD

## Summary
Document every dashboard tab and modal, map UI sections and actions to the JS functions and API handlers they rely on, identify unused or unconnected elements, and assess test readiness with proposed fixes.

## Goals
- Walk through each dashboard tab (overview, sessions, syllabus, scholar, tutor, brain, sync) and document visible sections and actions.
- Include modals/overlays and note non-routed pages that still affect the UI system (e.g., styleguide).
- Map UI elements -> JS functions -> API endpoints -> backend handlers.
- Identify gaps (unused UI, missing endpoints, broken flows) and propose fixes.
- Produce a test-readiness checklist per tab with evidence.

## Non-Goals
- Implement fixes or refactors.
- Change schemas or introduce new features.
- Validate external services beyond identifying integration points.

## Scope
In:
- `brain/templates/dashboard.html` tabs and embedded components.
- Modals/overlays invoked by dashboard JS.
- `brain/static/js/dashboard.js` event handlers and data flows.
- `brain/dashboard/routes.py` API endpoints and handlers.
- `brain/templates/styleguide.html` as a non-routed reference appendix.

Out:
- Code changes.
- New UI components.

## Deliverables
- `scholar/outputs/reports/dashboard_page_inventory_2026-01-15.md`
- `scholar/outputs/reports/dashboard_connectivity_map_2026-01-15.md`
- `scholar/outputs/reports/dashboard_gap_analysis_2026-01-15.md`

## Acceptance Criteria
- Each tab and modal is documented with its sections, actions, and evidence paths.
- Connectivity map links UI -> JS -> API -> backend handler for each action.
- Gap analysis lists missing/unused elements with proposed fixes and priority.
- Test-readiness checklist marks each tab as ready/blocked/unknown with evidence.
- Outputs are stored in `scholar/outputs/reports/` with repo-relative paths.

## Constraints
- Documentation/audit only; no code changes.
- Use existing repo sources for evidence.

## Risks / Unknowns
- Some flows may depend on external services (Google APIs, scrapers); mark as UNCONFIRMED if not verifiable locally.

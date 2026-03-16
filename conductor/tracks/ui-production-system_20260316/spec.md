# Specification: UI Production System

> Track artifact. Product/ownership authority lives only in `README.md`.
> This spec records the execution contract for this track; it does not replace the canon.

**Track ID:** ui-production-system_20260316
**Type:** roadmap
**Created:** 2026-03-16
**Status:** Active

## Summary

Evolve the current cyber-brain shell into a sellable UI production system with one clear hierarchy:

- flagship tier: `Brain`, `Scholar`, `Tutor`
- support tier: `Library`, `Mastery`, `Calendar`, `Methods`, `Vault`
- utility tier: `Notes`

The app should read as one premium study operating system rather than a collection of individually themed pages. Generated art is allowed as decorative rail/chassis material, but navigation meaning, page hierarchy, state, and responsiveness remain code-driven.

## Goal

Leave the repo with one current UI story and one current implementation path:

- the shared shell communicates a clear flagship-vs-support hierarchy
- Brain, Scholar, and Tutor feel like one product tier with the same premium workspace language
- support pages follow one consistent operating model instead of route-by-route layout drift
- the navbar, command bands, tabs, chips, and data surfaces use one coherent control system
- background art supports readability instead of competing with the header and working canvas

## Locked decisions

- Generated imagery is decorative shell only:
  - no baked text
  - no baked icons
  - no baked active/focus/hover states
- `Brain`, `Scholar`, and `Tutor` remain the dominant primary destinations.
- `Library`, `Mastery`, `Calendar`, `Methods`, and `Vault` remain the quieter support tier.
- `Notes` remains a separate utility dock, not a peer destination.
- The brand block, primary rail, secondary rail, and notes dock are independent components, not one giant clickable illustration.
- Build on the existing shared wrappers (`layout.tsx`, `PageScaffold`, `CoreWorkspaceFrame`, `SupportWorkspaceFrame`) instead of inventing another shell system.
- Keep the background darker and quieter than the header so the control rails carry the visual weight.
- Use the repo breakpoint system (`sm`, `md`, `lg`, `xl`) with mobile-first layout rules and no horizontal overflow regressions.
- Preserve route ownership and product model from `README.md`.

## Must ship

- A durable shell contract for:
  - brand block
  - primary triad rail
  - secondary support rail
  - notes dock
- A flagship workspace contract for:
  - Brain
  - Scholar
  - Tutor
- A support-page contract for:
  - Library
  - Mastery
  - Calendar
  - Methods
  - Vault
- Shared control primitives for:
  - tabs
  - chips
  - command buttons
  - command bands
  - status/HUD pills
  - tables and list toolbars
- Responsive and motion rules that keep the header fast, readable, and touch-safe.

## Acceptance criteria

- [ ] One repo-backed UI system spec and rollout plan exists for the shell plus page tiers.
- [ ] The plan explicitly defines flagship, support, and utility hierarchy.
- [ ] The plan defines which existing shared components must own the shell and page-system work.
- [ ] The plan defines how generated rail assets are used without collapsing interaction into images.
- [ ] The plan includes mobile-first and accessibility guardrails for every major shell surface.
- [ ] The plan stages implementation so it does not collide blindly with the active Tutor workflow redesign.

## Out of scope

- Rebuilding every route in one execution wave
- Converting the entire UI into image assets
- Replacing route ownership or workflow ownership already defined in `README.md`
- Shipping final polished art assets in this planning track

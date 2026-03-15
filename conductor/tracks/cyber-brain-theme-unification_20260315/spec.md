# Specification: Cyber-Brain Theme Unification

**Track ID:** cyber-brain-theme-unification_20260315  
**Created:** 2026-03-15  
**Status:** Complete

## Goal

Make the app feel like one high-tech study cockpit by unifying the shared shell, page frames, and top-level page layouts around a red holographic brain aesthetic: black space, glowing grid floor, circuit traces, and smoother premium panel depth.

## Must Ship

- A shared shell/background treatment that evokes the red holographic brain reference without breaking readability.
- Consistent responsive page scaffolding across Brain, Tutor, Scholar, Library, Calendar, Mastery, Methods, and Vault Health.
- Shared visual primitives for:
  - page headers
  - frame/module surfaces
  - cards
  - buttons
  - supporting HUD/status elements
- No horizontal overflow regressions on mobile/tablet.

## Constraints

- Keep the current route ownership and product model from `README.md`.
- Preserve existing page functionality and interactions.
- Stay within the project’s Tailwind breakpoint system (`sm`, `md`, `lg`, `xl`).
- Use the existing dark/arcade foundation as the base rather than introducing a conflicting second theme.

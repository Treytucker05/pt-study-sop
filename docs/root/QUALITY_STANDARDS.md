# Quality Standards — @GitGuardian Review Checklist

> Baseline established 2026-03-21. All PRs and agent work must pass these checks.

## Build Health

| Check | Command | Status |
|-------|---------|--------|
| Vite build | `npx vite build` | PASS |
| TypeScript | `npx tsc --noEmit` | PASS (pre-existing non-blocking errors in TutorChat, TutorWorkflowPrimingPanel, TutorWorkflowStepper — none in new code) |
| Tests | `npx vitest run` | PASS |

## Code Cleanliness

| Rule | Current State |
|------|---------------|
| No `console.log` in production code | CLEAN (0 found) |
| No `TODO` / `FIXME` / `HACK` / `XXX` | CLEAN (0 found) |
| No commented-out code blocks | CLEAN (1 benign comment in layout.tsx) |

## Theme Consistency

| Rule | Current State | Action |
|------|---------------|--------|
| No hardcoded Tailwind colors in components (`bg-red-500`, `text-green-400`, etc.) | 20 violations in `EventEditModal.tsx`, `LocalEventEditModal.tsx`, `layout.tsx` | Migrate to design tokens |
| All interactive buttons use `HudButton` or shadcn `Button` | 4 raw `<button>` elements in `ChainBuilder.tsx`, `RatingDialog.tsx`, `StudioBreadcrumb.tsx` | Wrap in `HudButton` |
| Color values come from CSS variables or `@/lib/theme` tokens | Most compliant | Ongoing |

## Naming & Structure

| Rule |
|------|
| One component per file |
| Files under 300 lines (split if larger) |
| PascalCase for components/types, camelCase for functions/variables |
| Named exports over default (except page components) |
| Imports grouped: external, internal (`@/`), relative |

## Final Review Gate (for @GitGuardian)

Before approving any commit:

1. `npx vite build` passes
2. `npx vitest run` passes
3. No new `console.log` statements
4. No new hardcoded color strings — use tokens from `@/lib/theme`
5. New buttons use `HudButton` or shadcn `Button`, not raw `<button>`
6. No dead/unused imports or exports
7. Files touched stay under 300 lines where possible

## Known Technical Debt

| Item | Location | Priority |
|------|----------|----------|
| Hardcoded green/red colors | `EventEditModal.tsx`, `LocalEventEditModal.tsx` | Medium |
| Raw `<button>` elements | `ChainBuilder.tsx`, `RatingDialog.tsx`, `StudioBreadcrumb.tsx` | Low |
| Pre-existing TS errors | `TutorChat.tsx:183`, `TutorWorkflowPrimingPanel.tsx:242,416,417,1150`, `TutorWorkflowStepper.tsx:4,60,80` | Low |

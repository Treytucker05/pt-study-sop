# Findings: UI Production System

## Repo-grounded audit

- The route hierarchy is already correct in canon:
  - `Brain`, `Scholar`, and `Tutor` are the flagship tier.
  - `Library`, `Mastery`, `Calendar`, `Methods`, and `Vault` are the support tier.
- The right leverage points already exist:
  - `layout.tsx` owns the shell and global header contract.
  - `PageScaffold.tsx` owns the page hero/header pattern.
  - `CoreWorkspaceFrame.tsx` owns flagship workspace framing.
  - `SupportWorkspaceFrame.tsx` owns support-page layout.
- The current visual weakness is not a missing theme. It is inconsistent hierarchy:
  - the navbar and shell chrome have personality
  - some page interiors still read like generic cards inside a premium shell
  - flagship and support routes do not yet communicate different importance strongly enough

## UI/UX research takeaways from the bookmark sweep

- The strongest external signals all converged on system design over one-off polish:
  - design systems and repeatable primitives beat route-by-route styling
  - Figma/design workflow matters most when it preserves editable systems, not static mocks
  - micro-detail polish matters at the control level
  - high-end design quality comes from hierarchy, restraint, and consistency more than from visual noise
- The most useful inspiration buckets were:
  - clean design-system thinking (`shadcn`, Figma kits, component-first workflows)
  - premium visual polish and micro-detail references
  - agent-assisted design workflows that keep code and design aligned

## Product-level conclusions

- The app should be treated as a premium study operating system, not a set of themed pages.
- The generated navbar explorations were valuable, but they confirmed the right production rule:
  - interactive code over decorative shell
- The strongest shell architecture is:
  - brand block
  - primary triad rail for `Brain / Scholar / Tutor`
  - secondary support rail for `Library / Mastery / Calendar / Methods / Vault`
  - separate `Notes` dock
- The background should support the rails and working surfaces, not compete with them.

## Implementation implications

- Generated art should ship only as transparent rail/dock chassis.
- Labels, icons, active state, focus state, hover state, and hit areas stay in React/CSS.
- The next implementation wave should start in the shared shell and wrappers, not by restyling individual routes in isolation.
- `Library` remains the best structural reference for the support tier.
- `Brain`, `Scholar`, and `Tutor` should share one flagship workspace grammar while preserving their different workflows.

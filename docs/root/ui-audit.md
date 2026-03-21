# UI audit — repeated patterns → HUD wrapper mapping

**Scope:** Current implemented frontend under `dashboard_rebuild/client/src/` as of this audit.
**Stitch:** Visual target only; not all Stitch artifacts live in-repo.
**Out of scope:** No layout rewrites, no new styling applied here—mapping only.

---

## 1. Summary

The codebase mixes **three parallel styling lanes**:

1. **shadcn/ui** — `Card`, `Button`, `Badge`, `Input`, `Textarea`, `Tabs`, `Progress` (see `components/ui/*`).
2. **Arcade “Neural Command Deck” tokens** — `lib/theme.ts` (`INPUT_BASE`, `SELECT_BASE`, `BTN_*`, `TEXT_*`, `CARD_BORDER`), plus `components/shell/controlStyles.ts` (`controlToggleButton`, `CONTROL_DECK*`, `CONTROL_CHIP`, etc.).
3. **Ad hoc panel strips** — repeated `border border-primary/15|20|30 bg-black/30|35|45 p-*` `div`s in Tutor and Brain flows.

Future HUD wrappers should **converge visual skin** across these lanes without changing **flex/grid structure** or **component trees**.

---

## 2. Panels / cards / content containers

| File path | Component / area | Current structure | Repeats / similar | Visual role | Future wrapper |
|-----------|------------------|-------------------|-------------------|-------------|----------------|
| `client/src/components/ui/card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardContent` | `app-panel rounded-[1.35rem] border border-primary/30 bg-black/45 … backdrop-blur-sm` + header slots | Used across Brain, Tutor, Scholar, Calendar, Library, Planner, Anki, etc. (see §2a) | Primary elevated surface for titled content | **hud-panel** (+ optional header/body subparts aligned with existing Card slots) |
| `client/src/index.css` | `.brain-card`, `.brain-card-strong` | `bg-black/40`, double `border-primary` pixel frame | Brain / legacy surfaces | Heavy-framed panel | **hud-panel** variant (or keep class name, delegate skin to tokenized border/glow) |
| `client/src/index.css` | `.app-workspace-shell` | Large workspace frame + `::before` wash | `CoreWorkspaceFrame.tsx`, `SupportWorkspaceFrame.tsx`, `pages/library.tsx` | Full-workspace chrome | **hud-panel** at **shell** scale (or dedicated `hud-workspace-shell` if you split shell vs card) |
| `client/src/components/PageScaffold.tsx` | `PageScaffold` | `page-shell__hero`, `page-shell__header`, `page-shell__content`, `page-shell__dipline` SVG | Standard pages using scaffold | Page hero + content well | **hud-panel** / shell **accent** only on inner cards; hero strip is its own pattern—do not flatten into one wrapper without design sign-off |
| `client/src/components/shell/controlStyles.ts` | `CONTROL_DECK`, `CONTROL_DECK_SECTION`, `CONTROL_DECK_INSET` | Long Tailwind gradient/border/shadow strings | `TutorCommandDeck.tsx` and related deck UI | Glass “command deck” module | **hud-panel** variants (`--quiet`, `--inset`, deck-specific) |
| `client/src/components/TutorShell.tsx` | Studio flow chrome | `border border-primary/15 bg-black/25 p-3` wrapper around studio sub-tabs | Single instance; **pattern** repeats elsewhere | Section chrome / nested command strip | **hud-panel** `--quiet` or **hud-status-bar** parent |
| `client/src/components/TutorWorkflowPrimingPanel.tsx` | Checklist / scope blocks | `border border-primary/15 bg-black/30 p-3`, `border … bg-black/35 p-4`, fixed-height bordered viewers | Many similar blocks in same file | Nested content wells, checklist rows | **hud-panel** nested / **hud-panel** `--inset` |
| `client/src/components/TutorWorkflowFinalSync.tsx` | Card grids, preview wells | `border border-primary/20 bg-black/30 p-2` repeated for Anki/publish previews | Same file, many cells | Dense read-only tiles | **hud-panel** compact / **hud-badge** adjacent |
| `client/src/components/MaterialViewer.tsx` | Viewer chrome | `border border-primary/15 bg-black/25`, inner `border … bg-black/30` | Tutor studio / material flows | Document shell + metadata chips row | **hud-panel** + **hud-badge** |
| `client/src/components/SourcesPanel.tsx` | List sections | `border border-primary/20|30 p-2` stacks | Same file, multiple sections | Source buckets | **hud-panel** |
| `client/src/components/brain/ActionItemRow.tsx` | Row container | `border border-primary/15 bg-black/30 p-4` + responsive flex | Brain action lists | Row card | **hud-panel** horizontal layout preserved |
| `client/src/components/TutorTopBar.tsx` | `RUNTIME_CARD_BASE` | `rounded-none border-2 border-primary/20 bg-black/45 p-3` on runtime field cards | Reused for each `RuntimeValue` | Telemetry / field readout tile | **hud-panel** `--inset` or small **hud-metric** (if you add wrapper beyond this audit list) |

### §2a — Files importing `Card` from `@/components/ui/card`

`NextActions.tsx`, `TutorEmptyState.tsx`, `TutorCommandDeck.tsx`, `TutorWorkflowFinalSync.tsx`, `TutorStartPanel.tsx`, `SyllabusViewTab.tsx`, `TutorWorkflowPolishStudio.tsx`, `TutorWorkflowPrimingPanel.tsx`, `CalendarAssistant.tsx`, `brain/BrainHome.tsx`, `TutorStudioHome.tsx`, `TutorShell.tsx`, `brain/LearnerProfilePanel.tsx`, `pages/scholar.tsx`, `TutorScheduleMode.tsx`, `TutorWorkflowLaunchHub.tsx`, `TutorStudioMode.tsx`, `ScholarRunStatus.tsx`, `AnkiIntegration.tsx`, `TutorWorkflowRuntimePanel.tsx`, `PlannerKanban.tsx`, `TutorPublishMode.tsx`, `brain/ContractBrainHome.tsx`.

---

## 3. Buttons / action controls

| File path | Component / area | Current structure | Repeats / similar | Visual role | Future wrapper |
|-----------|------------------|-------------------|-------------------|-------------|----------------|
| `client/src/components/ui/button.tsx` | `Button` | `cva` variants: `default`, `outline`, `ghost`, `destructive`, `shell`; arcade font, rounded `[1rem]`, gradient fills | **Very wide** use across app | Primary CTA, outline, destructive, special shell | **hud-button** variants: primary, ghost, danger, quiet—**map to existing `variant` prop** |
| `client/src/components/shell/controlStyles.ts` | `controlToggleButton()` | Dynamic border/gradient/shadow; `font-arcade`, `rounded-[1rem]`, active glow | `TutorTabBar.tsx`, `TutorShell.tsx` (studio tabs), `layout.tsx`, `brain/MainContent.tsx`, `TutorTopBar.tsx` | Segmented / toggle / tab-like controls | **hud-tab** (when acting as tab) or **hud-button** `--ghost` + pressed state |
| `client/src/lib/theme.ts` | `BTN_PRIMARY`, `BTN_OUTLINE`, `BTN_TOOLBAR`, `BTN_TOOLBAR_ACTIVE` | Full string constants | Tutor + legacy panels | Full-width or toolbar actions | **hud-button** (consolidate with `Button` or wrap native `button`) |
| `client/src/components/StudioPrepMode.tsx` | CTA buttons | `rounded-none border-2 border-primary … font-arcade text-[10px]` | Empty / chain states | High-contrast arcade CTA | **hud-button** variant (pixel/double-border style) |
| `client/src/components/ContentFilter.tsx` | Filter toggles | `h-9 … rounded-none border-2 font-arcade text-xs` | Session/material filter bar | Compact toggles | **hud-button** compact or **hud-tab** |

---

## 4. Tabs / navigation / segmented controls

| File path | Component / area | Current structure | Repeats / similar | Visual role | Future wrapper |
|-----------|------------------|-------------------|-------------------|-------------|----------------|
| `client/src/components/TutorTabBar.tsx` | Surface tabs | `Button role="tab"` + `controlToggleButton(shellMode === …)` | Tutor shell only | Launch / Tutor / Studio / Schedule / Settings | **hud-tab** + `hud-tablist` |
| `client/src/components/TutorShell.tsx` | Studio sub-flow | `Button role="tab"` + `controlToggleButton(workflow.studioView === …)` | Studio section | Workbench / Priming / Polish / Final Sync | **hud-tab** + `hud-tablist` |
| `client/src/components/layout.tsx` | Category / filter toggles | `controlToggleButton(activeTab === …)` on `Button` | Main app layout nav | Category rail | **hud-tab** (secondary emphasis) |
| `client/src/components/brain/MainContent.tsx` | Brain sub-nav | `controlToggleButton(isActive)` | Brain home | Content mode switch | **hud-tab** |
| `client/src/pages/scholar.tsx` | Scholar sections | Radix `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | Scholar page | Standard tabbed page | **hud-tab** on triggers; **hud-panel** on content |
| `client/src/components/CardReviewTabs.tsx` | Card review | Radix `Tabs` family | Card review flow | Tabbed editor | **hud-tab** |

---

## 5. Inputs / textareas / field wrappers

| File path | Component / area | Current structure | Repeats / similar | Visual role | Future wrapper |
|-----------|------------------|-------------------|-------------------|-------------|----------------|
| `client/src/lib/theme.ts` | `INPUT_BASE`, `SELECT_BASE` | `w-full bg-black/60 border-2 border-primary/40 … font-terminal text-lg` | `TutorWorkflowLaunchHub.tsx`, `TutorWorkflowPrimingPanel.tsx`, `TutorWorkflowRuntimePanel.tsx` (via theme), `TutorChat.tsx`, etc. | Standard form fields | **hud-input** / **hud-select** (select not in your list—map `SELECT_BASE` to same family) |
| `client/src/lib/tutorUtils.ts` | (exports) | Re-exports or parallel `INPUT_BASE` usage in `TutorShell.tsx` | Tutor settings / shell fields | Same as theme inputs | **hud-input** (shared token base) |
| `client/src/components/TutorWorkflowRuntimePanel.tsx` | Runtime editors | `INPUT_BASE` + `min-h-[92px] resize-y` for multiline | Same file, many blocks | Config / prompt blocks | **hud-textarea** |
| `client/src/components/ui/input.tsx` | shadcn `Input` | Component-level styling | Calendar, methods, modals, Brain contract, etc. | Form fields outside Tutor theme constants | **hud-input** (skin `Input` via `className` or wrapper) |
| `client/src/components/ui/textarea.tsx` | shadcn `Textarea` | Component-level styling | Shell, studio, scholar, modals | Long text | **hud-textarea** |
| `client/src/components/TutorWorkflowPrimingPanel.tsx` | Labels + fields | `TEXT_SECTION_LABEL` + `INPUT_BASE` / `SELECT_BASE` | Priming workflow | Labeled dense forms | **hud-input** + label slot (optional `hud-field-label` in theme-lab vocabulary) |

---

## 6. Status elements / badges / progress / telemetry strips

| File path | Component / area | Current structure | Repeats / similar | Visual role | Future wrapper |
|-----------|------------------|-------------------|-------------------|-------------|----------------|
| `client/src/components/ui/badge.tsx` | `Badge` | shadcn badge + project overrides | Tutor, Brain, Scholar, Library, Launch hub, etc. | Stage, count, mode | **hud-badge** (+ variants) |
| `client/src/components/TutorWorkflowLaunchHub.tsx` | `stageBadgeColor()` | Inline `className` gradients per workflow stage—not always `Badge` | Launch hub rows | Stage emphasis | **hud-badge** variants (`priming`, `tutor`, …) |
| `client/src/components/TutorTopBar.tsx` | `runtimeBadgeClasses`, `RUNTIME_STATUS_STYLES` | `rounded-none … font-arcade text-[10px]` | Runtime deck | Teach-runtime state | **hud-badge** |
| `client/src/components/shell/controlStyles.ts` | `CONTROL_CHIP` | Pill chip with border + gradient | Top bar / deck | Compact status chip | **hud-badge** or **hud-status-bar** segment |
| `client/src/components/PageScaffold.tsx` | `page-shell__stat` | Stat blocks with tone classes (`--info`, `--warn`, …) | Pages using scaffold | Hero metrics | **hud-badge** / small **hud-panel** row—**do not change grid of stats** |
| `client/src/components/TutorTopBar.tsx` | Workflow context row | `Badge` + `font-terminal` strips (read-only workflow context) | Below main nav in Tutor | Telemetry / context strip | **hud-status-bar** |
| `client/src/components/ui/progress.tsx` | `Progress` | Radix-based indicator | **hud-progress** target | |
| `client/src/components/ScholarRunStatus.tsx` | Run progress | `<Progress value={…} />` inside `Card` | Scholar investigation | Long-running job meter | **hud-progress** |

**Note:** Many “progress” UIs are **numeric** (timer, block count) without `Progress`—they belong in **hud-status-bar** or small **hud-badge**, not necessarily `hud-progress`.

---

## 7. Missing compared to Stitch target

Stitch exports are not in this repo; this section lists **gaps relative to a typical Stitch “HUD dashboard” brief** and the **theme-lab** reference (`hud-theme.css` / `hud-components.css`) you already have.

| Gap | Evidence in current app | Notes |
|-----|-------------------------|--------|
| **One coherent panel language** | `Card` + `CONTROL_DECK*` + raw `border-primary/xx bg-black/yy` divs coexist | Stitch usually implies one rim/lighting system; you have three parallel dialects. |
| **Unified segmented control** | Radix `Tabs` (Scholar) vs `Button`+`controlToggleButton` (Tutor, layout) | Same *role*, different primitives—visual unification is the main Stitch gap. |
| **Dedicated status / telemetry strip** | Partial: `TutorTopBar` context row, `page-shell__stat`, scattered chips | No single `hud-status-bar` applied app-wide. |
| **Progress as first-class pattern** | `Progress` only clearly in `ScholarRunStatus.tsx` | Tutor uses timers/counts but not always a bar; Stitch mockups often show a linear “session” meter. |
| **Bottom action bar** | Actions often inline in cards or footers | Stitch study flows often show a fixed bottom command row—implementation varies by screen. |
| **Typography ramp for HUD labels** | Split: `font-arcade` vs `font-terminal` vs shadcn defaults | Readable, but not yet one **tokenized** label/body scale for “technical compact” everywhere. |

---

## 8. Do not touch layout utilities

When applying **hud-*** wrappers, **preserve** these categories of structure (change only surface classes or a wrapping div’s **skin**, not its **layout** contract):

- **Flexbox / grid:** `flex`, `flex-1`, `min-h-0`, `min-w-0`, `grid`, `grid-cols-*`, `items-*`, `justify-*`.
- **Spacing:** `gap-*`, `space-y-*`, `space-x-*`, padding/margin **magnitude** unless you are explicitly normalizing spacing in a later token pass (even then, prefer token equivalence over reordering).
- **Responsive behavior:** `sm:`, `md:`, `lg:`, `xl:` breakpoints; `overflow-x-auto`, `overflow-hidden` on shells.
- **Sizing:** `w-full`, `max-w-*`, `min-h-[70vh]`, fixed heights on known viewers (e.g. priming PDF height) unless product asks to change them.
- **Page / shell ordering:** `PageScaffold` hero → content order; `TutorShell` mode panels; route-level section order.
- **Semantic structure:** `role="tab"`, `aria-selected`, `aria-labelledby` wiring—keep; only swap classes.
- **Portal / overlay targets:** `PageScaffold` portal container, dialog positioning—do not “HUD wrap” in a way that breaks stacking context without testing.

---

## 9. Suggested wrapper mapping (quick reference)

| Wrapper | Primary current sources to converge |
|---------|-------------------------------------|
| **hud-panel** | `Card`, `CONTROL_DECK*`, `border-primary/… bg-black/…` wells, `RUNTIME_CARD_BASE` |
| **hud-button** | `Button` (`button.tsx`), `BTN_*`, remaining raw `button` classes |
| **hud-tab** | `controlToggleButton` + `role="tab"`, Radix `TabsTrigger` |
| **hud-input** | `INPUT_BASE`, shadcn `Input` |
| **hud-textarea** | `Textarea`, multiline `INPUT_BASE` patterns |
| **hud-badge** | `Badge`, `stageBadgeColor`, `runtimeBadgeClasses`, `CONTROL_CHIP` (if small) |
| **hud-progress** | `Progress` (Scholar); optional new bars where product wants linear meters |
| **hud-status-bar** | `TutorTopBar` context row, thin multi-segment strips, optional footer queues |

---

*End of audit — wrappers not applied; layout unchanged.*

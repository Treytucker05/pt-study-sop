# Neural Command Deck — UI Primitives

Reference for the shared primitives in `dashboard_rebuild/client/src/components/ui/`.
Authoritative tokens live in `../../index.css` and `../../lib/theme.ts` (see
[`/DESIGN.md`](../../../../../DESIGN.md)). This document is descriptive — code wins on conflict.

## Token layer (added during design-system remediation)

`index.css` `:root` defines two tiers (plain custom properties, no Tailwind
utilities generated):

- **Tier 1 — target scales** (`--ds-radius-*`, `--ds-elev-*`, `--ds-accent-rgb`,
  …): the canonical design-system values. **Use these in new code.**
- **Tier 2 — bridge tokens** (`--ds-r-100`, `--ds-accent-a18`, `--ds-scrim-a12`,
  …): exact current values, referenced via `rounded-[var(--ds-r-100)]` etc.
  **Transitional** — they exist so repeated literals were deduped without any
  pixel change. Phase 5 (reviewed visual change) collapses them onto Tier 1.

Do not introduce new raw `rounded-[1rem]` / `bg-[rgba(...)]` literals; reference
a token. Opacity-modified colors (`text-[#hex]/60`) are a known exception still
pending (Tailwind opacity differs between hex and `var()`); see DESIGN.md
"Deferred Visual Changes".

## Primitives

Most primitives wrap **Radix UI**, which supplies roles/ARIA/focus management at
runtime (so a static grep for `aria-`/`role=` under-reports actual a11y — the
coverage is largely correct via Radix).

| Component | Kind | Variants | States | A11y source | Known gaps (→ Phase 5) |
|-----------|------|----------|--------|-------------|------------------------|
| `Button` (`button.tsx`) | cva | `default` `outline` `ghost` `destructive` `shell`; sizes `default` `sm` `icon` | hover, active, `disabled:opacity-50`, focus-visible ring | native `<button>` | **`destructive` ≈ `default`** (not visually distinct — a11y/clarity bug); no `loading` state; colors are inline literals |
| `HudButton` (`HudButton.tsx`) | wrapper | `primary` `outline` (wraps `theme.ts` `BTN_PRIMARY/OUTLINE`) | focus-visible ring, active | native `<button>` | **Actively used in library/tutor/scholar/methods** (NOT dead — earlier audit erratum). Overlaps `Button`; consolidation is a visual change |
| `HudPanel` (`HudPanel.tsx`) | wrapper | `a` `b` (wraps `CARD_BORDER*`) | — | `<div>` | 10 usages; fine |
| `Badge` (`badge.tsx`) | cva | `default` `secondary` `destructive` `outline` | — | `<div>` | `rounded-none border-double` geometry conflicts with the rounded system; leftover `@replit`/`crt-hover` |
| `Input` (`input.tsx`) | native | — | focus-visible, `disabled` | native `<input>` | colors inline (gradient/shadow literals) |
| `Textarea` (`textarea.tsx`) | native | — | focus, `disabled` | native | uses `--ds-r-100` ✓ |
| `Checkbox` (`checkbox.tsx`) | Radix | — | focus-visible, `disabled`, `data-[state=checked]` | Radix (`role=checkbox`, `aria-checked`) | `rounded-sm` (= `0px`, broken radius token) |
| `Switch` (`switch.tsx`) | Radix | — | focus-visible, `disabled`, `data-[state]` | Radix (`role=switch`) | `rounded-none` vs rounded system |
| `Select` (`select.tsx`) | Radix | — | focus ring, `disabled`, scroll buttons | Radix (combobox/listbox) | `rounded-none` |
| `Dialog` (`dialog.tsx`) | Radix | — | open/close animations | Radix (`role=dialog`, modal, focus trap; `sr-only` Close ✓) | `rounded-none`; `bg-black/90` |
| `Tabs` (`tabs.tsx`) | Radix | — | hover, `data-[state=active]`, focus-visible | Radix (tablist/tab/tabpanel) | uses `--ds-r-100` ✓ |
| `Table` `Toast`/`Toaster` `Tooltip` `AlertDialog` `Sheet` `RadioGroup` `ScrollArea` `Collapsible` `Progress` `Skeleton` `Label` `Card` | Radix / native | see source | per Radix | Radix where applicable | mixed `rounded-none`; document per-need |

## Conventions

- **Fonts:** `font-arcade` (Press Start 2P) for titles/buttons; `font-terminal`
  (VT323) for body/inputs. Do not introduce other display fonts (Orbitron/
  Audiowide cleanup is a Phase 5 item).
- **Focus:** keep the `focus-visible:ring-*` pattern; do not remove it.
- **Status colors:** use `STATUS_SUCCESS/WARNING/INFO/URGENT/ERROR` from
  `theme.ts`, not raw `text-green-*` etc.
- **New radii/shadows/colors:** reference Tier-1 tokens; never add new arbitrary
  literals.

## Known a11y follow-ups (reviewed, not auto-applied)

These need design review (some affect visuals) and are tracked in DESIGN.md
"Deferred Visual Changes":

- `Button` `destructive` must be visually distinguishable from `default`.
- Icon-only `Button size="icon"` usages should be audited for `aria-label`.
- `Badge` geometry should join the rounded radius scale.

# Design System — TREY'S STUDY SYSTEM

> Retro 90s arcade terminal theme. Locked Feb 2026.

## Theme: Layered Dark + CRT Flicker

Visual identity: dark layered surfaces, toned-down arcade red accent, VT323 terminal font everywhere, pixel double borders, CRT phosphor glow on interaction.

---

## Colors (Layered Dark)

| Token | Hex | HSL | Usage |
|-------|-----|-----|-------|
| `--background` | `#080808` | `0 0% 3%` | Page background |
| `--card` / surface-1 | `#121212` | `0 0% 7%` | Cards, panels |
| `--secondary` / surface-2 | `#1A1A1A` | `0 0% 10%` | Nested surfaces |
| `--muted` / surface-3 | `#222222` | `0 0% 13%` | Subtle backgrounds |
| `--border` | `#2A2A2A` | `0 0% 16%` | Default borders (neutral gray) |
| `--primary` (accent) | `#CC2E48` | `350 63% 49%` | Buttons, links, active states |
| `--foreground` | `#EEEEEE` | `0 0% 93%` | Primary text |
| `--muted-foreground` | `#777777` | `0 0% 47%` | Secondary text |
| text-muted | `#555555` | `0 0% 33%` | Dim labels, placeholders |
| accent-muted | `rgba(204,46,72,0.10)` | — | Hover backgrounds |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--destructive` | `0 72% 51%` | Delete, error actions |
| `--success` | `142 76% 36%` | Confirmation, positive |
| `--warning` | `43 96% 56%` | Caution states |
| `--info` | `217 91% 60%` | Informational |

---

## Typography (VT323 Full Terminal)

Both `--font-arcade` and `--font-terminal` resolve to `'VT323', monospace`.

| Element | Size | Weight | Spacing | Transform |
|---------|------|--------|---------|-----------|
| H1 | 42px | 400 | 3px | uppercase |
| H2 | 32px | 400 | 3px | uppercase |
| H3 | 26px | 400 | 3px | uppercase |
| H4 | 22px | 400 | 3px | uppercase |
| Body | 20px | 400 | — | — |
| Small | 18px | 400 | — | — |
| Caption/Label | 14px | 400 | 3px | uppercase |

### Rules
- VT323 is single-weight (400). Bold/semibold classes have no visual effect.
- All headings are uppercase with `text-shadow: 2px 2px 0px rgba(0,0,0,0.5)`.
- Form elements (`button`, `input`, `textarea`, `select`) force `font-family: var(--font-terminal) !important`.

---

## Spacing (Tight)

| Token | Value | Usage |
|-------|-------|-------|
| Header height | 48px | Top nav bar |
| Header padding | 0 12px | Header inner |
| Nav gap | 2px | Between nav buttons |
| Nav padding | 4px 8px | Inside nav buttons |
| Button padding | 5px 14px | Default buttons |
| Button sm | 3px 10px | Small buttons |
| Button lg | 8px 20px | Large buttons |
| Input padding | 7px 10px | Text inputs, selects |
| Card padding | 14px | Card inner |
| Grid gap | 10px | Between grid items |
| Section gap | 28px | Between sections |
| Main content | px-3 md:px-6 py-3 | Page wrapper |

---

## Borders (Pixel Double)

| Token | Value |
|-------|-------|
| Border width | 3px |
| Border style | double |
| Border radius | 0px (everywhere) |
| Accent border | 4px (header bottom, directional accents) |

### Tailwind Classes
- Cards/containers: `border-[3px] border-double border-primary`
- Secondary cards: `border-[3px] border-double border-secondary`
- Buttons: `border-[3px] border-double` (in CVA base)
- Directional accents: `border-b-4`, `border-l-4` (kept as solid, not double)
- Never use `rounded-md`, `rounded-lg`, `rounded-xl`. Use `rounded-none`.
- `rounded-full` is OK for small indicator dots only.

---

## Interactive States (CRT Flicker)

### Hover
- Background: `rgba(204, 46, 72, 0.1)`
- Border: accent color
- Text: accent color (red shift)
- Shadow: `0 0 6px rgba(204,46,72,0.3), inset 0 0 6px rgba(204,46,72,0.1)`
- Transform: none

### Active (Click)
- Transform: `translateY(1px)`
- Shadow: `0 0 15px rgba(204,46,72,0.5)`
- Brightness: `1.1` (flash brighter)

### Focus
- Shadow: `0 0 0 2px hsl(350 63% 49%), 0 0 8px rgba(204,46,72,0.3)`
- No outline

### Disabled
- Opacity: `0.25`

### Card Hover
- Border: accent color
- Shadow: `0 0 8px rgba(204,46,72,0.2), inset 0 0 8px rgba(204,46,72,0.05)`

### Transition
- Speed: `0.12s ease`

### CSS Utility
Apply `crt-hover` class to any interactive element for the full CRT Flicker effect (hover glow, active press, focus ring).

---

## CSS Custom Properties (index.css `:root`)

```css
/* Pixel Double borders */
--ds-border-width: 3px;
--ds-border-style: double;

/* CRT Flicker state tokens */
--ds-transition: 0.12s;
--ds-hover-shadow: 0 0 6px rgba(204, 46, 72, 0.3), inset 0 0 6px rgba(204, 46, 72, 0.1);
--ds-active-shadow: 0 0 15px rgba(204, 46, 72, 0.5);
--ds-focus-shadow: 0 0 0 2px hsl(350 63% 49%), 0 0 8px rgba(204, 46, 72, 0.3);
--ds-card-hover-shadow: 0 0 8px rgba(204, 46, 72, 0.2), inset 0 0 8px rgba(204, 46, 72, 0.05);
```

---

## Component Patterns

### Buttons (`button.tsx`)
- Base: `border-[3px] border-double crt-hover disabled:opacity-25`
- Variants: default (primary bg), secondary, outline, ghost, destructive, link
- Sizes: default (14px/5px pad), sm (10px/3px), lg (20px/8px), icon (36x36)

### Badges (`badge.tsx`)
- Base: `border-[3px] border-double rounded-none crt-hover`
- Variants: default, secondary, destructive, outline

### Cards
- Standard: `border-[3px] border-double border-primary bg-black/40`
- Secondary: `border-[3px] border-double border-secondary`
- Brain cards: `.brain-card` utility (same border, uses CSS custom prop)

### Nav Buttons (`.nav-btn`)
- Uses `--ds-border-width` and `--ds-border-style` via CSS
- Active: `bg-primary text-primary-foreground border-primary`
- Hover: border + text turn accent, CRT glow shadow

### Tabs (`.tab-item`)
- Active: `bg-primary text-primary-foreground` with inset bottom shadow
- Inactive: `text-muted-foreground hover:text-foreground`

---

## Files Reference

| File | What it controls |
|------|------------------|
| `dashboard_rebuild/client/src/index.css` | All tokens, utilities, base styles |
| `dashboard_rebuild/client/src/components/ui/button.tsx` | Button CVA variants |
| `dashboard_rebuild/client/src/components/ui/badge.tsx` | Badge CVA variants |
| `dashboard_rebuild/client/src/components/layout.tsx` | Header, nav, main wrapper |
| `color-compare.html` | Interactive token reference (all locked) |

---

## Layers (Status)

| Layer | Status | Description |
|-------|--------|-------------|
| 1. Foundation | **DONE** | Colors, type, spacing, borders, states |
| 2. Polish | TODO | Micro-animations, transitions, skeleton loading |
| 3. Personality | TODO | CRT scanlines, background texture, particle effects |

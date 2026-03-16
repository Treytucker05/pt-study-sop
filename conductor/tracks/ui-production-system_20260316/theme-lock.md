# Theme Lock: UI Production System

> Theme authority for the `ui-production-system_20260316` track.
> This document freezes the visual system so future shell/page work stops drifting.

## Theme name

**Neural Command Deck**

This is a premium black-and-crimson study operating system with a cybernetic control-room feel.

It is:

- dark
- metallic
- high-contrast
- precise
- premium
- slightly theatrical at the shell level

It is not:

- playful arcade clutter
- neon overload
- generic SaaS
- glassmorphism
- blue sci-fi
- purple AI gradient UI

## Image-derived design principles

Using the attached image set as reference, the lock is:

1. **Flagship first**
   - `Brain`, `Scholar`, and `Tutor` are the hero destinations.
   - They get the strongest framing, largest controls, and brightest red energy.

2. **Support tier stays quieter**
   - `Library`, `Mastery`, `Calendar`, `Methods`, and `Vault` still feel premium, but they do not compete with the flagship tier.

3. **The shell carries the drama**
   - Rails, frames, and header chrome can be bold.
   - Working surfaces and content areas must stay calmer and more readable.

4. **Background is atmospheric, not dominant**
   - The holographic brain/grid image is inspiration for mood and backdrop treatment, not a literal full-strength wallpaper under content.

5. **Real interface over poster render**
   - The strongest references are the ones with a clear hierarchy and bay structure.
   - The weakest references are the ones that look like a rendered mockup rather than an interactive app.

## Visual hierarchy

### Tier 1: Flagship

- `Brain`
- `Scholar`
- `Tutor`

Rules:

- largest nav controls
- strongest edge glow
- highest text contrast
- most dimensional shell treatment
- main command rail placement

### Tier 2: Support

- `Library`
- `Mastery`
- `Calendar`
- `Methods`
- `Vault`

Rules:

- slimmer rail
- flatter beveling
- dimmer glow
- smaller labels
- never equal visual weight to Tier 1

### Tier 3: Utility

- `Notes`
- local utility controls
- route-local inspectors/docks

Rules:

- independent from destination hierarchy
- quiet by default
- can brighten when opened, but should not read like a primary route

## Color lock

### Core palette

- **Obsidian black:** `#07070A`
  - page base
  - deep shadows
  - main negative space
- **Carbon black:** `#111317`
  - panel bodies
  - main content surfaces
- **Gunmetal crimson:** `#241419`
  - secondary shell metal
  - dark rails and frames
- **Burgundy alloy:** `#4A2029`
  - rail framing
  - elevated shell bevels
- **Signal crimson:** `#D63A4E`
  - primary accent
  - active rails
  - current route emphasis
- **Laser red:** `#FF5A6E`
  - hover/energy line
  - focused edge light
- **Ember highlight:** `#FF8F9A`
  - top-line glow
  - highlight stroke
- **Warm white:** `#F5E8EA`
  - primary text
- **Muted rose gray:** `#B59AA0`
  - secondary text
- **Dim steel:** `#6D6166`
  - tertiary labels

### Semantic palette

- **Info:** muted cyan only in tiny doses
  - `#6FB7D8`
- **Success:** subdued green
  - `#6FBE8A`
- **Warn:** amber
  - `#D7A35A`
- **Danger:** use `Signal crimson`, do not introduce a second danger red

### Hard rules

- No purple gradients.
- No blue as a shell color.
- No white page backgrounds.
- No route-specific color themes.
- Red is the system accent. Other semantic colors are support-only.

## Surface lock

### Surface classes

1. **Shell**
   - nav rails
   - top bars
   - command decks
   - dock chrome
   - strongest beveling, edge light, and metallic depth

2. **Frame**
   - page hero
   - workspace wrappers
   - large route containers
   - moderate depth, restrained glow

3. **Module**
   - cards
   - list containers
   - inspectors
   - dialog bodies
   - dark, readable, lower drama

4. **HUD**
   - pills
   - badges
   - metrics
   - tiny status labels
   - smallest and brightest accents

### Surface rules

- Strongest red glow belongs to `Shell`, not to content cards.
- `Frame` surfaces may have one glow edge and one internal line, not stacked effects everywhere.
- `Module` surfaces should read as professional tools, not mini neon billboards.
- No page should invent a fifth visual surface family.

## Background lock

### Approved background behavior

- dark vignette
- faint circuit traces
- soft horizon or grid hints
- optional subdued holographic brain silhouette
- low-contrast atmospheric glow

### Forbidden background behavior

- bright full-screen hero art directly under working content
- readable illustration details fighting with page text
- route-specific background swaps that change the app’s mood

### Background intensity rule

- The header may be dramatic.
- The content background must stay at least **40% quieter** than the header chrome.

## Typography lock

### Role split

- **Display / shell labels:** arcade-tech or terminal-tech display font already in the app vocabulary
- **Body / content text:** clean readable sans-serif

### Rules

- Tier 1 nav labels: uppercase, tracked, short, bright
- Tier 2 nav labels: uppercase, smaller, dimmer
- Hero titles: bold but not glowing like nav buttons
- Data text and paragraph text: crisp and calm, not stylized

### Forbidden typography behavior

- using decorative techno display fonts for long-form content
- overspacing body copy
- mixing multiple different display styles across routes

## Navigation lock

### Structure

- left brand block
- centered primary triad rail
- secondary support rail
- separate notes dock

### Asset rule

Generated art may be used for:

- primary rail chassis
- support rail chassis
- notes dock chassis

Generated art may not be used for:

- text labels
- active states
- hover states
- focus states
- hit areas

### Layout rule

- equal widths within each tier
- no uneven support buttons
- no dead empty bay in the nav
- no hamburger for primary information scent

## Motion lock

### Allowed motion

- compact-on-scroll header
- local hover brightening
- subtle press-down feedback
- dock slide/pop
- staggered page entrance when it helps orientation

### Timing

- hover: `140ms - 180ms`
- active/press: `90ms - 140ms`
- shell compact/expand: `180ms - 240ms`
- drawers/docks: `220ms - 300ms`

### Forbidden motion

- repeated scroll-trigger toggling
- floating, bouncy, toy-like motion
- large ambient pulsing across entire pages

## Flagship page lock

Pages:

- `Brain`
- `Scholar`
- `Tutor`

Rules:

- share one common workspace grammar
- top bar reads as command deck
- main work area gets the most breathing room
- side rails are subordinate
- strongest route-level shell treatment belongs here

## Support page lock

Pages:

- `Library`
- `Mastery`
- `Calendar`
- `Methods`
- `Vault`

Rules:

- `Library` is the structural reference
- left rail + command band + main work canvas
- quieter than flagship pages
- same surface and control vocabulary, lower drama

## Anti-drift rules

Before any future UI work ships, check:

- Does this new surface use the locked palette?
- Does it respect flagship vs support hierarchy?
- Is the strongest glow on shell elements instead of content?
- Is the background quieter than the controls?
- Is the route using an approved surface family?
- Is the new control using shared primitives instead of one-off styling?

If any answer is “no”, the work is drifting and should be corrected before shipping.

## Immediate implementation implications

The next shell wave should:

- reduce background intensity behind the header and page body
- keep the primary rail visually dominant
- demote support controls slightly
- keep `Notes` separate and quieter
- normalize page interiors so modules stop competing with shell chrome

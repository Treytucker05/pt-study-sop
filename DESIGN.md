# Design System: PT Study OS

## Active Site Source Map

This is the current source map for the React dashboard. Edit source files only; built files under `brain/static/dist/` are generated output.

### App Shell

* `dashboard_rebuild/client/src/main.tsx` — React entrypoint; imports `App` and the active global stylesheet.
* `dashboard_rebuild/client/src/App.tsx` — route table; maps `/library` to `dashboard_rebuild/client/src/pages/library.tsx`.
* `dashboard_rebuild/client/src/components/layout.tsx` — global cockpit shell, top navigation, support nav image placement, notes dock, and the `page-hero-portal` that page heroes render into.
* `dashboard_rebuild/client/src/components/PageScaffold.tsx` — shared page hero, title/subtitle/stat rail, and content wrapper used by Library and the other support pages.

### Active Styling

* `dashboard_rebuild/client/src/index.css` — active global CSS, Tailwind theme tokens, base font scale, `page-shell` styling, `brain-workspace` frame styling, and responsive shell behavior.
* `dashboard_rebuild/client/src/lib/theme.ts` — shared Tailwind class tokens for typography, inputs, buttons, panels, icons, and semantic status colors.
* `dashboard_rebuild/client/src/lib/utils.ts` — `cn()` class merge helper used across the UI.
* `dashboard_rebuild/client/src/components/ui/HudPanel.tsx` — shared HUD panel primitive; pulls border/panel classes from `theme.ts`.
* `dashboard_rebuild/client/src/components/ui/HudButton.tsx` — shared HUD button primitive; pulls primary/outline button classes from `theme.ts`.
* `dashboard_rebuild/client/src/components/ui/badge.tsx`, `dashboard_rebuild/client/src/components/ui/checkbox.tsx`, and `dashboard_rebuild/client/src/components/ui/dialog.tsx` — shared UI primitives used by Library rows, file selection, and modals.

### Library Page

* `dashboard_rebuild/client/src/pages/library.tsx` — main Library controller and page design. This file owns the visible `/library` layout: folder/course rail, Semester Intake preview/apply, upload, folder sync, material table, Tutor handoff queue, cleanup controls, add-course modal, and material preview modal.
* `dashboard_rebuild/client/src/components/MaterialUploader.tsx` — direct file-upload dropzone embedded inside Library.
* `dashboard_rebuild/client/src/lib/tutorClientState.ts` — local/session storage handoff state between Library and Tutor.
* `dashboard_rebuild/client/src/api.ts` — frontend API client for courses, semester intake, Tutor material upload/list/update/delete/re-extract/content, folder sync preview/apply/status, embed status, and Tutor handoff data.
* `dashboard_rebuild/client/src/lib/api.ts` — compatibility re-export of `src/api.ts`.
* `dashboard_rebuild/client/src/api.types.ts` — generated/central frontend API type surface used by Tutor and Library contracts.
* `shared/schema.ts` — shared course/material schema types consumed by the frontend.

### Library Backend

* `brain/dashboard/api_semester_intake.py` — `/api/semester-intake/preview` and `/api/semester-intake/apply`; classifies the PT School folder and applies selected course/material intake.
* `brain/dashboard/api_tutor_materials.py` — `/api/tutor/materials/*`; upload, list, update, delete, content preview, folder sync preview/apply/status, extracted assets, video processing, and embed linkage.
* `brain/dashboard/api_adapter.py` — `/api/courses/*`; course list/create/update/archive/unarchive/delete used by the Library course rail and forms.
* `brain/dashboard/api_tutor.py` — Tutor blueprint registration hub that wires material routes into the app.
* `brain/dashboard/app.py` and `brain/dashboard/routes.py` — Flask app/React catch-all wiring that serves `/library` from the built frontend.

### Tests That Protect Library

* `dashboard_rebuild/client/src/pages/__tests__/library.test.tsx` — primary Library UI/unit coverage.
* `dashboard_rebuild/client/src/pages/__tests__/tutor.workspace.integration.test.tsx` and `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx` — protect Library-to-Tutor handoff behavior.
* `brain/tests/test_semester_intake.py` — backend Semester Intake classification/apply behavior.
* `brain/tests/test_tutor_material_pipeline_certification.py` — backend material sync/embed pipeline behavior.

### Reference / Not Active By Default

* `dashboard_rebuild/client/src/styles/theme.css`, `dashboard_rebuild/client/src/styles/hud-theme.css`, `dashboard_rebuild/client/src/styles/hud-components.css`, `dashboard_rebuild/client/src/styles/hud-variants.css`, and `dashboard_rebuild/client/src/styles/hud-wrappers.css` are currently theme-lab/reference styles unless imported by the main app.
* `dashboard_rebuild/client/theme-lab/*` is a design playground, not the live `/library` page.
* `docs/stitch-designs/*`, `docs/design/*`, and `wireframe/*` are visual references and prototypes.

## Library Design Direction

Library is the study-material operations page. It should answer three questions in order:

1. What course am I organizing?
2. What files were found and what do they mean?
3. What is selected and ready to send to Tutor?

The Library page should be course-first and file-explicit. Folder scans are review/classification steps, not permission to load every file. Course names should be primary; PHYT/course codes are secondary metadata only.

Preferred flow:

1. Pick or scan a source.
2. Review courses and file classifications.
3. Select only the files to load.
4. Apply selected files.
5. Confirm material readiness.
6. Hand selected material to Tutor.

Visual direction for Library: keep the PT Study cockpit identity, but use calmer operations hierarchy than the live Tutor surface. Red is an accent and active-state signal, not the whole page. Use graphite/black surfaces, muted crimson structure, teal/green for ready, amber for missing/review, and blue/cyan for sync/information.

Avoid:

* Redundant panels that repeat the same readiness signal.
* Hidden bulk actions that look like the normal next step.
* Course-code-first labels when the learner needs course names.
* Loading folder contents without an explicit file selection step.
* Editing `brain/static/dist/` directly.

## Philosophy & Metadata
*   **Project:** PT Study OS
*   **Theme:** Premium Cyberpunk / High-Fidelity Sci-Fi Cockpit.
*   **Philosophy:** The interface should feel like a high-end, tactile operating system from a sci-fi universe. We are moving away from plain, flat boxes and annoying CRT "flickers" toward deep, layered glassmorphism, intense neon glows, and smooth physical motion. Every window, button, and panel must feel custom-built, mirroring the intense "touch" and polish of the main navigation bar.
*   **Target:** Web (React/Vite SPA).

## Tokens

### Colors & Lighting (The Cockpit Vibe)
*   **Backgrounds:** Deep, abyssal blacks and dark charcoals, heavily layered with subtle radial gradients (e.g., `rgba(20, 0, 4, 0.72)`) to create depth.
*   **Primary Accent (Neon Crimson):** A vibrant, glowing red/crimson (e.g., `hsl(350, 63%, 49%)` or specific `rgba(255, 74, 74, x)` values for shadows). Used for active states, borders, and heavy text shadows.
*   **Secondary Accent (Emerald/Cyan):** Used sparingly for "system ready" status indicators, secondary badges, or "GO" commands (e.g., `emerald-300`).
*   **Glassmorphism:** Heavy use of `backdrop-blur` mixed with dark, translucent gradients (e.g., `bg-black/40` to `bg-black/95`) to create frosted glass panels.

### Typography
*   **Header & Core UI (Arcade):** `'Press Start 2P'` (`font-arcade`). Used strictly for primary system titles, major buttons, and high-level navigation. Must be uppercase, widely tracked (letter-spacing), and often accompanied by a subtle neon text-shadow.
*   **Data & Body (Terminal):** `'VT323'` (`font-terminal`). Used for readouts, secondary copy, input fields, and standard data display. Should remain highly legible.
*   *Note: If readability suffers in large blocks of text, use a clean, modern monospace like `JetBrains Mono` or `Oxanium` as a fallback, but the primary aesthetic is terminal/arcade.*

### Borders & Geometry
*   **The "Custom" Feel:** Avoid plain, sharp 0px boxes.
*   **Radii:** Use custom, deliberate border-radii. For example, rounded outer shells (e.g., `rounded-[1.4rem]`) paired with sharp inner elements, or specific clipped corners to simulate physical hardware.
*   **Borders:** Utilize layered borders (e.g., `border border-red-500/28` or `border-double` for specific terminal windows). Use CSS `::before` and `::after` pseudo-elements to create inner bezels or glowing frames, just like the Notes Dock.

### Motion & Interaction (No Flicker)
*   **No CRT Flicker:** Remove harsh, instantaneous flashing or scanning animations.
*   **Tactile Hover States:** Hovering interactive elements should trigger smooth, pronounced shifts in `brightness`, `saturate`, and `drop-shadow`. (e.g., scaling up to `1.025`, translating Y slightly, and blooming a colored shadow).
*   **Fluid Physics:** Use smooth `ease-out` or spring curves for opening panels, expanding sheets, or revealing the main workspace. It should feel like heavy, expensive machinery locking into place.

## Component Rules

### Windows & Panels (The "App Shell")
*   Instead of standard cards, panels should look like hardware displays. 
*   They must include a dark, semi-transparent background (`bg-black/40`), a subtle border (`border-primary/30`), and an inner shadow to simulate physical depth. 
*   Headers of these panels should use `font-arcade` and include structural lines or "kickers" (e.g., `CONTROL_KICKER` style) to denote system sections.

### Buttons & Controls
*   **Primary Actions:** Must mimic the navigation items—when hovered, they shouldn't just change background color; they should illuminate. Use combinations of `scale`, `brightness`, and intense `box-shadow` or `drop-shadow`.
*   **Toggle/Secondary Buttons:** Should look like physical membrane switches. Dark backgrounds that light up with a specific colored border/glow when active.
*   **Inputs/Textareas:** Dark, recessed areas (e.g., `bg-black/45`) with soft borders that transition to a sharp, glowing primary border on focus.

### Navigation & Docks
*   The main desktop nav is the benchmark: layered imagery, absolute positioning for complex overlapping (like the Brain logos), and intense hover states.
*   Side docks (like the Quick Notes handle) should use complex CSS gradients and pseudo-elements to look like physical, metallic, or glass pull-tabs extending from the edge of the screen.

## Execution Directives for AI Agents
When generating or modifying UI components for this project:
1.  **Do not default to standard Tailwind minimalism.** Do not use plain white backgrounds, gray borders, or standard Inter font.
2.  **Inspect the Layout:** Always refer to the CSS techniques used in `layout.tsx` (like the `navShellLinkClass` or the `notesDock` button) to understand how to build complex, layered interactive elements.
3.  **Layer Effects:** Use multiple box-shadows (inset and outset) to create depth. Use radial gradients to create localized lighting effects behind components.

# Design System: PT Study OS

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
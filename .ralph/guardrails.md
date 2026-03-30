# Guardrails — PT Study SOP

## Signs (Patterns That Cause Failures)

### SIGN-001: Entry card positioned on canvas instead of viewport
Pattern: Rendering the entry card inside TransformComponent makes it a canvas object at (2000,2000).
Fix: Entry card must render OUTSIDE TransformComponent as a viewport overlay.

### SIGN-002: Material paths shown instead of filenames
Pattern: Using material.source_path directly as a label shows full Windows paths.
Fix: Always extract filename: `path.split(/[\\/]/).pop()` or use `material.title`.

### SIGN-003: Panels not visible after preset load
Pattern: Opening a preset layout doesn't auto-center the viewport on the new panels.
Fix: Call focusOpenPanels() or centerOpenPanels() with a ~300ms delay after layout changes.

### SIGN-004: Panel content not scrolling
Pattern: Panel body overflow-hidden without inner scroll container clips content.
Fix: Panel body uses overflow-hidden for border radius, inner content div uses overflow-y-auto.

### SIGN-005: Center button moves panel instead of panning camera
Pattern: Per-panel center repositions the panel on the canvas instead of panning the viewport.
Fix: Use buildStudioShellViewportCenter with a single-panel layout to pan the camera.

### SIGN-006: Low contrast text on dark backgrounds
Pattern: Using text-primary/60 or text-foreground/50 makes text nearly invisible.
Fix: Minimum opacity for readable text is /75 for secondary, /90 for primary content, text-white for labels.

### SIGN-007: Folders rendered as card-style buttons in Source Shelf
Pattern: Folder rows with rounded borders and bg look like clickable cards.
Fix: Folders use border-l-2 accent bar style, leaves keep card style.

## Quality Gates (Run Before Every Commit)
1. `cd dashboard_rebuild && npm run build` — must pass
2. `cd dashboard_rebuild && npx vitest run <changed-test-files>` — must pass
3. `dev-browser --timeout 60 run scripts/verify-<ticket>.js` — must pass with all checks green
4. No console errors on the live page (check with dev-browser evaluate)

## Do Not
- Remove the "LIVE STUDY CORE / TUTOR" hero header
- Use Excalidraw (removed from project)
- Put the entry card inside TransformComponent
- Show full file paths as labels
- Skip browser verification for UI changes
- Commit with failing tests or build errors
- Retry page.fill() or page.type() on React inputs more than twice -- switch to page.evaluate() with native event dispatching
- Retry the same failing browser verification more than 3 times -- report what is broken and let the next iteration handle it
- Read entire large files (500+ lines) into context -- use head/tail/grep to find relevant sections
- Use `browser.newPage()` in verify scripts -- always use `browser.getPage("named-context")` to reuse the daemon's browser instead of spawning new headless instances that leak memory
- Leave dev-browser pages open after verification -- always call `await page.close()` at the end of every verify script (before the final results log)

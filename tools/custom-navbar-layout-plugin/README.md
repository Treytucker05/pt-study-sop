# PT Study Custom Navbar Layout Plugin

Minimal custom navbar layout plugin that places the PT Study dashboard shell background plus the split navbar button PNGs into a `1536 x 1024` frame at fixed coordinates so the CP-MSS / Control Plane command-deck shell can be reviewed and iterated outside the live app.

## Files

- `manifest.json`: plugin manifest
- `code.js`: main-thread plugin logic
- `ui.html`: file picker UI shown inside the plugin

## What it does

1. asks for the dashboard shell background image
2. asks for the eight split button PNGs
3. creates a new frame named `PT Study Navbar Layout ...`
4. places the background image at `0,0` inside the frame
5. places the buttons at the recorded coordinates from the placement mockup

## Expected local inputs

- background: `C:\pt-study-sop\UI Images\Dashboard finished.png`
- buttons folder: `C:\pt-study-sop\UI Images\buttons_for_dashboard_split`

Expected button file names:

- `brain.png`
- `scholar.png`
- `tutor.png`
- `library.png`
- `mastery.png`
- `calendar.png`
- `methods.png`
- `vault.png`

## Run in Figma Desktop

1. Open the Figma desktop app.
2. Open the target design file where the navbar should be placed.
3. Go to `Plugins` -> `Development` -> `Import plugin from manifest...`
4. Pick [`manifest.json`](/C:/pt-study-sop/tools/custom-navbar-layout-plugin/manifest.json)
5. Run `PT Study Navbar Layout` from `Plugins` -> `Development`
6. Select the background PNG.
7. Select all eight split button PNGs.
8. Click `Build Navbar Frame`.

The plugin will create the frame and focus the viewport on it.

## Notes

- This plugin is intentionally local and minimal. It does not depend on MCP placement support.
- It uses the Figma Plugin API with a local HTML UI because the Figma REST API and current MCP tool surface are not sufficient for arbitrary node placement in the design file.

# Brain Static Assets

Static files served by Flask (`brain/dashboard_web.py`).
These assets power a CP-MSS v1.0-aligned dashboard runtime.

Key paths
- `dist/`: built React dashboard assets served by Flask.

Build/deploy
- From `dashboard_rebuild`: `npm run build` (writes directly to `brain/static/dist`).
- Launch via `Start_Dashboard.bat` to serve the current bundle on port 5000.

# Brain Static Assets

Static files served by Flask (`brain/dashboard_web.py`).

Key paths
- dist/: built React dashboard assets (copied from `dashboard_rebuild/dist/public`).

Build/deploy
- From `dashboard_rebuild`: `npm run build`
- Then copy: `robocopy dist\public ..\brain\static\dist /E` (or equivalent).

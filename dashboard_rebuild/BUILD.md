# Dashboard Build & Sync

## Quick Build (copy-paste this)

```powershell
cd C:\pt-study-sop\dashboard_rebuild
npm install
npm run build
robocopy dist\public ..\brain\static\dist /MIR
```

Then run the dashboard via: `Start_Dashboard.bat`

## Why This Process

- The UI builds to `dashboard_rebuild/dist/public/`.
- Flask serves the canonical build from `brain/static/dist/`.
- After any frontend change, build and mirror-copy `dist/public` into `brain/static/dist`.

## IMPORTANT

- The repo's canonical run path is `Start_Dashboard.bat` (port 5000). Do not run `npm run dev` / `vite dev` for this project.
- Canonical developer workflow lives in `docs/root/GUIDE_DEV.md`.

## Common Mistakes

- **Stale `index.html`**: If you see old UI after building, the `index.html` is referencing old JS hashes. Delete `brain/static/dist/` entirely and re-copy from `dist/public/`.
- **Cache**: Hard refresh browser with `Ctrl+Shift+R` after deploying.
- **Source files**: All React source is in `dashboard_rebuild/client/src/`, NOT in `brain/`.

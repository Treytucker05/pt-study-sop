# Dashboard Build & Deploy

## Quick Build (copy-paste this)

```powershell
cd C:\pt-study-sop\dashboard_rebuild
npx vite build
Remove-Item -Recurse -Force ..\brain\static\dist
Copy-Item -Recurse dist\public ..\brain\static\dist
```

Then restart Flask: `python app.py` in `brain/`

## Why This Process

- Vite builds to `dashboard_rebuild/dist/public/` (configured in `vite.config.ts` line 35)
- Flask serves from `brain/static/dist/` (configured in `brain/dashboard/routes.py` line 123)
- You must copy the build output to Flask's static dir after every build
- **Do NOT use `--outDir ../brain/static/dist`** with vite build - it creates JS files but doesn't update `index.html` hash references correctly

## Dev Server (hot reload, no build needed)

```powershell
cd C:\pt-study-sop\dashboard_rebuild
npx vite dev --port 3000
```

Dev server proxies `/api` requests to Flask on port 5000 (see `vite.config.ts` line 51-54).

## Common Mistakes

- **Stale `index.html`**: If you see old UI after building, the `index.html` is referencing old JS hashes. Delete `brain/static/dist/` entirely and re-copy from `dist/public/`.
- **Cache**: Hard refresh browser with `Ctrl+Shift+R` after deploying.
- **Source files**: All React source is in `dashboard_rebuild/client/src/`, NOT in `brain/`.

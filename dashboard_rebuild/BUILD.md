# Dashboard Build

## Quick Build (One Step!)

The build now outputs **directly** to `brain/static/dist` - no sync needed!

### Option 1: Double-click
```
build-and-sync.bat
```

### Option 2: NPM Script
```powershell
cd C:\pt-study-sop\dashboard_rebuild
npm run deploy        # Build only
npm run deploy:open   # Build + open browser
```

### Option 3: PowerShell
```powershell
cd C:\pt-study-sop\dashboard_rebuild
.\build-and-sync.ps1          # Build
.\build-and-sync.ps1 -Reload  # Build + open browser
```

---

## What Changed?

**Before:** Build → `dist/public` → Copy → `brain/static/dist`

**Now:** Build → `brain/static/dist` (direct!)

The Vite config now outputs directly to the Flask server's static folder.

---

## IMPORTANT

- The repo's canonical run path is `Start_Dashboard.bat` (port 5000)
- Do not run `npm run dev` / `vite dev` for this project
- After building, hard refresh browser with `Ctrl+Shift+R`

---

## Troubleshooting

- **Stale files**: Delete `brain/static/dist/` and rebuild
- **Cache issues**: Hard refresh with `Ctrl+Shift+R`
- **Build errors**: Check that `Start_Dashboard.bat` isn't running (port conflict)

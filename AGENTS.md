# Agent Guidelines - PT Study SOP

## ⚠️ CRITICAL - Read This First

### How To Run The Server (DO NOT SKIP)

**NEVER** use `npm run dev` or `vite dev` for this project.

**ALWAYS** use the batch file:
```batch
C:\pt-study-sop\Start_Dashboard.bat
```

This will:
1. Build the UI: `dashboard_rebuild/dist/public/` → `brain/static/dist/`
2. Start Python Flask server on **port 5000**
3. Open browser to `http://127.0.0.1:5000/brain`

### After Any Code Changes

If you modify React files in `dashboard_rebuild/client/src/`:

```powershell
cd C:\pt-study-sop\dashboard_rebuild
npm run build
robocopy dist\public ..\brain\static\dist /MIR
```

Then refresh browser (Ctrl+Shift+R to clear cache).

---

## Project Structure

```
C:\pt-study-sop\
├── dashboard_rebuild\          # React frontend source
│   ├── client\src\             # All React components
│   ├── dist\public\            # Build output (temporary)
│   └── BUILD.md                # Detailed build instructions
├── brain\                       # Python Flask server + static files
│   ├── static\dist\            # ★ CANONICAL BUILD - served on port 5000
│   ├── dashboard_web.py        # Flask server entry point
│   └── ...
├── Start_Dashboard.bat         # ★ USE THIS TO START
└── docs\                       # Project documentation
```

---

## Common Mistakes To Avoid

| Mistake | Why It Fails |
|---------|--------------|
| `npm run dev` | Opens port 3000, doesn't serve Python API |
| Building to wrong folder | Changes go to `dist/public` but Flask serves `brain/static/dist` |
| Not clearing cache | Browser shows old build even after updates |
| Multiple servers | Port conflicts, confusing which server has latest build |

---

## Quick Reference

```powershell
# Build and deploy
npm run build
robocopy dist\public ..\brain\static\dist /MIR

# Start server
..\Start_Dashboard.bat

# Check what's running
tasklist | findstr python
tasklist | findstr node
```

---

## Key Files By Feature

| Feature | Source Location |
|---------|-----------------|
| Brain Page | `dashboard_rebuild/client/src/pages/brain.tsx` |
| Brain Components | `dashboard_rebuild/client/src/components/brain/` |
| BrainChat | `dashboard_rebuild/client/src/components/BrainChat/` |
| Layout/Footer | `dashboard_rebuild/client/src/components/layout.tsx` |
| Course Config | `dashboard_rebuild/client/src/config/courses.ts` |
| Error Boundaries | `dashboard_rebuild/client/src/components/ErrorBoundary.tsx` |

---

*Read the full guide: `docs/root/GUIDE_DEV.md`*
*Build details: `dashboard_rebuild/BUILD.md`*

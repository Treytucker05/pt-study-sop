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

Then **hard refresh** browser (Ctrl+Shift+R) or add cache buster:
```
http://127.0.0.1:5000/brain?t=123
```

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

# Clear browser cache
# Press Ctrl+Shift+R in browser
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

## Mobile vs Desktop Layout

The Brain page has two layouts:

**Desktop (≥1024px):** Two resizable panels (Vault sidebar + Main content)

**Mobile (<1024px):** Single column with bottom tab bar (Vault/Content buttons)

The mobile tab bar uses `lg:hidden` class - it only appears when viewport is < 1024px.

**Current positioning:**
- Brain container: `bottom-[48px]` (48px from bottom to clear footer)
- Mobile nav: Inside container at bottom
- Footer: `z-20`, Brain container: `z-30` (appears above footer)

---

## Troubleshooting Commands

Run these in browser console (F12):

```javascript
// Check viewport width
window.innerWidth

// Check if mobile view should be active
window.innerWidth < 1024

// See all fixed positioned elements
Array.from(document.querySelectorAll('.fixed')).map(e => ({
  class: e.className.slice(0, 50),
  bottom: getComputedStyle(e).bottom,
  zIndex: getComputedStyle(e).zIndex
}))

// Check if mobile nav buttons exist
document.querySelectorAll('nav[aria-label="Mobile navigation"] button')
```

---

*Read the full guide: `docs/root/GUIDE_DEV.md`*
*Build details: `dashboard_rebuild/BUILD.md`*

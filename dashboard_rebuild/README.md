# Dashboard Rebuild

Source for the PT Study dashboard UI (frontend only). The API is served by Flask in `brain/dashboard/api_adapter.py` against `brain/data/pt_study.db`.
Canonical system context: tutor/session behavior is governed by CP-MSS v1.0 (`PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`).

## Entry points
- `schema.ts` - shared types for client data contracts.
- `client/src/App.tsx` - UI router.
- `client/src/pages/brain.tsx` - Brain page (includes Ingestion tab).
- Build output: `brain/static/dist` (written directly by the build pipeline).

## Common commands
- `npm run dev` - start Vite dev server (DO NOT use in this repo; use `Start_Dashboard.bat`).
- `npm run check` - typecheck (not required for builds; there are known failures).
- `npm run build` - production build (writes directly to `brain/static/dist`).

## Notes
- The Express server was removed; do not run a separate dashboard server.
- Production bundle is served by Flask from `brain/static/dist` (see `docs/root/GUIDE_DEV.md` for canonical build/run steps).

## Styling Guidelines (Arcade Theme)

All new components must adhere to the **Retro Arcade** design system.

### Standard Component classes
| Component | Required Classes |
|-----------|------------------|
| **Card** | `bg-black/40 border-2 border-primary rounded-none` |
| **Header** | `border-b border-primary/50` |
| **Title** | `font-arcade text-sm` |
| **Input/Select** | `bg-black border border-secondary rounded-none font-terminal` |
| **Button** | `rounded-none font-terminal` (Primary: `bg-primary`, Ghost: `hover:bg-primary/10`) |

### Do's and Don'ts
- ✅ **DO**: Use `rounded-none` everywhere. Sharp corners only.
- ✅ **DO**: Use `bg-black/40` for main content containers to maintain transparency.
- ❌ **DON'T**: Use "glowing" text effects or `box-shadows`.
- ❌ **DON'T**: Use the default ShadCN `rounded-md` or `border-border`.
- ❌ **DON'T**: Create custom dark-grey cards (`bg-black/80`). always use the standard transparent black.

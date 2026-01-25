# Dashboard Rebuild

Source for the PT Study dashboard UI (frontend only). The API is served by Flask in `brain/dashboard/api_adapter.py` against `brain/data/pt_study.db`.

## Entry points
- `schema.ts` - shared types for client data contracts.
- `client/src/App.tsx` - UI router.
- `client/src/pages/brain.tsx` - Brain page (includes Ingestion tab).
- Build output: `dist/public` (copied to `brain/static/dist`).

## Common commands
- `npm run dev` - start Vite dev server (UI only).
- `npm run check` - typecheck.
- `npm run build` - production build (dist/public).

## Notes
- The Express server was removed; do not run a separate dashboard server.
- Production bundle is copied to `brain/static/dist` by repo scripts.

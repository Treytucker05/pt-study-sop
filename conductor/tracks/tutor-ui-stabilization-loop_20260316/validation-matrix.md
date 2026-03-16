# Validation Matrix - Tutor UI Stabilization Loop

## Route set

1. `/brain`
2. `/tutor`
3. Tutor `Launch`
4. Tutor `Priming`
5. Tutor `Tutor`
6. Tutor `Polish`
7. Tutor `Final Sync`
8. `/methods`

## Critical checks

### Brain -> Tutor
- `Open Tutor` lands in a clean Tutor shell when no explicit resume is requested
- no stale live-session shell chrome appears on Launch/dashboard

### Launch
- page lands at top-of-page
- workflow table remains usable

### Priming
- page lands at top-of-page
- workflow scope remains intact

### Tutor
- tutor-only shell chrome appears in Tutor session view

### Polish
- page lands at top-of-page
- no cross-stage shell bleed from stale launch/session state

### Final Sync
- page lands at top-of-page
- primary closeout controls are visible without manual scroll correction

### Methods
- page still loads and remains usable after Tutor shell changes

## Command checks

1. `python scripts/check_docs_sync.py`
2. `cd dashboard_rebuild && npm run build`

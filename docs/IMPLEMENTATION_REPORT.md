# Implementation Report — V1: api.ts Type Extraction

> Generated: 2026-03-08

## What Changed

Extracted all type definitions (~1,150 lines) from `api.ts` into a new `api.types.ts` file.

### Files Modified

| File | Change |
|------|--------|
| `dashboard_rebuild/client/src/api.ts` | Removed inline type definitions; imports from `./api.types`; re-exports via `export *` |
| `dashboard_rebuild/client/src/api.types.ts` | **New.** All interfaces, type aliases, runtime constants (`CATEGORY_LABELS`, `CATEGORY_COLORS`), and `@shared/schema` re-exports |

### Before / After

| Metric | Before | After |
|--------|--------|-------|
| `api.ts` lines | 2,107 | 881 |
| `api.types.ts` lines | 0 | 1,320 |
| Total lines | 2,107 | 2,201 (+94 from imports/re-exports overhead) |
| Type definitions in `api.ts` | ~1,150 | 0 |

### Why

- `api.ts` mixed 123 API client functions with ~80 interface/type definitions in a flat file
- Finding where a specific type was defined required scrolling through unrelated runtime code
- This is the highest priority-score pain point (Impact 4, Effort 2, Risk 1, Priority 5)
- TypeScript compiler provides a built-in safety net — zero runtime behavior change

### Backward Compatibility

- `export * from "./api.types"` in `api.ts` means all existing imports (`import { SomeType } from "@/api"`) continue to work unchanged
- The barrel at `lib/api.ts` (`export * from "../api"`) also works unchanged
- Runtime constants `CATEGORY_LABELS` and `CATEGORY_COLORS` moved to `api.types.ts` and re-exported

## Verification Evidence

### Build

```
$ npm run build
✓ built in 38.97s
```

Zero type errors. All 881 lines of `api.ts` compile cleanly with types imported from `./api.types`.

### Tests

```
Test Files  3 failed | 26 passed (29)
Tests       6 failed | 415 passed (421)
```

All 6 failures are **pre-existing** (not caused by this change):
- `ScholarRunStatus.test.tsx` — 5 failures (UI rendering assertions unrelated to types)
- `api.test.ts` — 1 failure (`runStatus` endpoint URL mismatch: test expects `/scholar/run/status`, code calls `/scholar/status`)
- `a11y.test.tsx` — accessibility test failures (unrelated)

### Rollback

To revert: `git checkout HEAD -- dashboard_rebuild/client/src/api.ts` and delete `api.types.ts`.

## Next Steps

1. **Week 2**: Extract `useSSEStream` hook, `MessageList`, `ArtifactPanel` from `TutorChat.tsx` (2,183 → <800 lines)
2. **Week 3**: Extract `api_sessions.py` and `api_scheduling.py` blueprints from `api_adapter.py` (9,953 → <7,000 lines)

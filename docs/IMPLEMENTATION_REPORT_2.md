# Implementation Report — V2: TutorChat.tsx Component Extraction

> Generated: 2026-03-08

## What Changed

Extracted `TutorChat.tsx` (2,183 lines) into 5 focused modules totaling 2,332 lines (+149 from import/export overhead). TutorChat.tsx is now a 378-line orchestrator.

### Files Modified / Created

| File | Change | Lines |
|------|--------|-------|
| `components/TutorChat.tsx` | **Rewritten.** Thin orchestrator importing extracted modules | 378 |
| `components/TutorChat.types.ts` | **New.** All shared types, interfaces, pure helper functions, constants | 351 |
| `components/useSSEStream.ts` | **New.** Custom hook: SSE streaming, message state, session reset, artifact detection | 434 |
| `components/MessageList.tsx` | **New.** `forwardRef` message list with verdict/provenance badges, action buttons, citations | 407 |
| `components/SourcesPanel.tsx` | **New.** Sources overlay: vault tree, material selection, MoC tab, vault CRUD callbacks | 762 |

### Before / After

| Metric | Before | After |
|--------|--------|-------|
| `TutorChat.tsx` lines | 2,183 | 378 |
| Total lines (all modules) | 2,183 | 2,332 (+149) |
| Extracted modules | 0 | 4 |
| Target (<800 lines) | No | Yes (378) |

### What Moved Where

| Concern | From | To |
|---------|------|----|
| `ChatMessage`, `ToolAction`, `ChainBlock`, `TutorChatProps`, artifact types | TutorChat.tsx inline | `TutorChat.types.ts` |
| `normalizeArtifactType`, `parseArtifactCommand`, `detectMarkdownTable`, `detectMermaidBlock` | TutorChat.tsx inline | `TutorChat.types.ts` |
| `summarizeProvenance`, `summarizeConfidence`, `isNoteLikeSource` | TutorChat.tsx inline | `TutorChat.types.ts` |
| `TOOL_LABELS`, `TOOL_ICONS` | TutorChat.tsx inline | `TutorChat.types.ts` |
| SSE fetch + streaming + message state + session reset effect | TutorChat.tsx body | `useSSEStream.ts` |
| Message rendering, VerdictBadge, TeachBackBadge, ProvenanceBadge, action buttons | TutorChat.tsx JSX | `MessageList.tsx` |
| Sources overlay panel, vault tree, vault CRUD callbacks, material checkboxes, MoC tab | TutorChat.tsx JSX + callbacks | `SourcesPanel.tsx` |

### Design Decisions

1. **SourcesPanel replaces planned ArtifactPanel**: The execution plan referenced "ArtifactPanel" but TutorChat.tsx has no artifact panel (artifacts render in `TutorArtifacts.tsx`). The actual large extractable section was the sources overlay (~350 lines JSX + 180 lines vault CRUD).

2. **Vault CRUD ownership**: Vault callbacks (create folder, create note, rename, delete, save) moved into `SourcesPanel` since it owns all vault-related internal state. `selectedVaultPaths` remains a controlled prop from TutorChat (needed by `useSSEStream` for content_filter).

3. **Hook interface**: `useSSEStream` receives `onBehaviorOverrideReset` callback rather than owning `behaviorOverride` state, keeping state ownership clear.

### Backward Compatibility

- `TutorChat` is still a named export from `components/TutorChat`
- `ChainBlock` type re-exported: `export type { ChainBlock } from "./TutorChat.types"`
- All existing test imports (`@/components/TutorChat`) resolve unchanged
- No prop contract changes — `TutorChatProps` interface identical

## Verification Evidence

### Build

```
$ npm run build
✓ built in ~39s
```

Zero type errors. All 5 modules compile cleanly.

### Tests

```
Test Files  3 failed | 26 passed (29)
Tests       6 failed | 415 passed (421)
```

Identical to pre-refactor baseline. All 6 failures are **pre-existing** (same as V1 report):
- `ScholarRunStatus.test.tsx` — 5 failures
- `api.test.ts` — 1 failure
- `a11y.test.tsx` — accessibility test failures

Zero regressions introduced.

### Rollback

To revert: restore `TutorChat.tsx` from `TutorChat.original.tsx` (kept as backup) and delete the 4 new files.

## Next Steps

1. **Week 3**: Extract `api_sessions.py` and `api_scheduling.py` blueprints from `api_adapter.py` (9,953 → <7,000 lines)
2. **SourcesPanel.tsx** at 762 lines exceeds 300-line guideline — candidate for further split (vault tree + vault CRUD into sub-module)

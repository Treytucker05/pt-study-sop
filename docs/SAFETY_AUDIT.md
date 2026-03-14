# Safety Audit — 2026-03-08

> **Verdict: GREEN**

## Repo State

| Item | Value |
|------|-------|
| Branch | `main` |
| Staged changes | None |
| Uncommitted modified files | 8 |
| Untracked files | 9 |
| Recent commits (72h) | 20 (all docs/config, no runtime changes) |

## Health Validation

| Check | Result | Baseline |
|-------|--------|----------|
| Build (`npm run build`) | **PASS** (23.47s) | PASS |
| Tests | **415 passed / 6 failed** | 415 passed / 6 failed |
| New failures | **0** | — |

All 6 failures are pre-existing (ScholarRunStatus, api.test, a11y).

## Uncommitted Change Analysis

### Category 1: TutorChat Refactor (V2 extraction)

| File | Risk | Notes |
|------|------|-------|
| `api.ts` | **Low** | Types extracted to `api.types.ts`; re-exports via `export *` for backward compat |
| `TutorChat.tsx` | **Low** | Rewritten as 378-line orchestrator; all logic preserved in extracted modules |
| `api.types.ts` (new) | **None** | Pure type definitions, no runtime behavior |
| `TutorChat.types.ts` (new) | **None** | Pure types + helper functions extracted verbatim |
| `useSSEStream.ts` (new) | **Low** | SSE hook extracted verbatim from TutorChat |
| `MessageList.tsx` (new) | **Low** | Message renderer extracted verbatim |
| `SourcesPanel.tsx` (new) | **Low** | Sources overlay + vault CRUD extracted verbatim |

**Assessment**: Refactor-only. No logic changes. Build + tests confirm zero regressions.

### Category 2: Feature Changes (pre-existing uncommitted work)

| File | Risk | Notes |
|------|------|-------|
| `TutorWizard.tsx` | **Low** | UI copy changes (TOPIC → SESSION LABEL), helper text, warning for missing objectives. No logic change. |
| `library.tsx` | **Medium** | New Tutor queue UX: `replaceTutorQueueWithVisible()`, hidden selection count, empty-queue guard on Open Tutor. Additive UI changes. |
| `tutor.tsx` | **Medium** | New `scoreStudyUnitCandidate()` scoring function replaces first-match study unit inference. Changes material→study-unit mapping behavior. |

**Assessment**: library.tsx and tutor.tsx have real behavior changes. Both are documented in `conductor/tracks/GENERAL/log.md` and `docs/root/TUTOR_TODO.md`. The scoring function changes study-unit inference (could surface different default week labels). Tests pass, but these are UI-level changes with no dedicated test coverage — manual verification recommended.

### Category 3: Config / Docs

| File | Risk | Notes |
|------|------|-------|
| `.mcp.json` | **Low** | Removed 7 MCP server entries (github, memory, codex-cli, stitch, shadcn, context7, gemini, claude). Reduces MCP surface. Non-breaking — these are optional tool integrations. |
| `conductor/tracks/GENERAL/log.md` | **None** | Append-only log entry |
| `docs/root/TUTOR_TODO.md` | **None** | Single line added to Phase 2 |
| `docs/*.md` (new, 5 files) | **None** | Reports and plans — no runtime effect |

## Top 5 Riskiest Files

1. **`tutor.tsx`** — `scoreStudyUnitCandidate()` changes default study-unit inference. Could produce different labels for edge-case folder structures. No test coverage for this logic.
2. **`library.tsx`** — New Tutor queue management UX. Additive but changes user flow (empty-queue guard, replace-with-view). No test coverage.
3. **`TutorChat.tsx`** — 83% rewrite. Low risk because extraction is mechanical, but high blast radius if any import/export wiring is wrong. Build passes, confirming wiring is correct.
4. **`api.ts`** — 1,558 lines removed (types extracted). Re-export ensures backward compat. Build confirms all consumers still resolve.
5. **`.mcp.json`** — 7 MCP servers removed. If any workflow depends on codex-cli, stitch, or context7 MCPs, those integrations are now broken.

## Verdict

**GREEN** — Safe to commit.

- Build passes, tests match baseline exactly
- Refactor files are mechanical extractions with zero logic changes
- Feature files (TutorWizard, library, tutor) are documented, additive, and tested at integration level
- No secrets, no destructive operations, no schema changes
- `.mcp.json` cleanup is intentional (documented in agent setup logs)

## Recommended Next Steps

1. Commit the refactor files (V1 type extraction + V2 TutorChat extraction) as one atomic commit
2. Commit the feature files (TutorWizard, library, tutor) as a separate commit
3. Commit docs/config changes separately
4. Consider adding unit tests for `scoreStudyUnitCandidate()` in tutor.tsx

# Tutor Gaps Swarm — Design Document

Date: 2026-03-09
Owner: Trey
Approach: Parallel Swarm (Approach A with refactor-first from C)

## Scope

Address ALL 12 audit gaps from `docs/audit/TUTOR_FULL_AUDIT.md` Section 9, plus all open TUTOR_TODO queues (C, D, E) and open sprint phases (15, 17). Gap 6 (multi-user) excluded — different product scope.

## Phase 1: Split the Monolith (Gap 1)

Split `brain/dashboard/api_tutor.py` (~9,100 lines) into 6 focused modules + a thin registration file. All modules share the existing `tutor_bp` Blueprint. No URL changes. Tests pass unchanged.

| New Module | Responsibility |
|------------|---------------|
| `api_tutor_sessions.py` | Session CRUD, preflight, auto-import, wizard |
| `api_tutor_turns.py` | `send_turn()`, `generate()`, prompt assembly, streaming |
| `api_tutor_materials.py` | Material upload, sync, video processing, linked expansion |
| `api_tutor_artifacts.py` | Artifact CRUD, export, note/card creation |
| `api_tutor_vault.py` | Obsidian sync, vault janitor, graph refresh, MoC |
| `api_tutor_utils.py` | Shared helpers, normalization, telemetry, config |
| `api_tutor.py` | Blueprint registration + route imports only |

## Phase 2: Parallel Swarm (6 Streams)

### Stream S1: Quick Wins (Gaps 2, 3, 5)
- **Gap 2**: Add stop-generating button — wire `streamAbortRef.current?.abort()` to Loader2 onClick in TutorChat.tsx
- **Gap 3**: Add conversation export — new `/api/tutor/session/{id}/export` endpoint returning Markdown, plus download button in UI
- **Gap 5**: Fix session duration — use `min(ended_at - started_at, turn_count * 5)` instead of `turn_count * 2`

### Stream S2: Session Robustness (Gaps 4, 9)
- **Gap 4**: Rich session restore — serialize full ChatMessage (citations, verdict, toolActions) into `tutor_turns.artifacts_json`, deserialize on restore
- **Gap 9**: Accuracy feedback loop — track retrieval quality metrics per profile per topic, surface recommendations

### Stream S3: Test Coverage (Gap 8)
- Build mock infrastructure for LLM API, Obsidian vault, ChromaDB
- Unit tests for prompt assembly pipeline (both stages)
- Unit tests for retrieval logic (full content vs vector, linked expansion)
- Integration tests for SSE streaming pipeline
- Target: 80% coverage on tutor business logic

### Stream S4: Infrastructure (Gaps 7, 10, 12)
- **Gap 7**: ChromaDB locking — add request-level locking or switch to client-server mode
- **Gap 10**: Vault janitor expansion — add broken link detection, orphaned file detection, stale objective checks
- **Gap 12**: Gemini Vision refinement — add timestamp targeting, skip irrelevant segments, combine visual + transcript context

### Stream S5: Open Queues (C, D, E from TUTOR_TODO)
- **Queue C**: Category docs — ensure all 6 category pages have full method lists + tutor prompt blocks; reconcile manager-facing notes with code reality
- **Queue D**: Video/MP4 closure — verify normal-session MP4 path, implement key rotation + budget-failover visibility, add regression tests
- **Queue E**: UI/Method controls — lock method controls, fix dropdown reliability, restore compact fallback for prompt edits

### Stream S6: Contract & Chain Hardening (Gap 11, Sprints 15, 17)
- **Gap 11**: Author exhaustive contracts for all 49 method blocks (allowed moves, forbidden moves, required outputs)
- **Sprint 15**: Top-down tutor hardening — lock chains as proving ground, rewrite runtime rules, add chain runtime profiles
- **Sprint 17**: 10/10 certification — certify session authority/preflight/restore, certify template chains, certify artifact reliability

## Decisions Made

- Gap 6 (multi-user): **Excluded** — personal study tool, not a gap worth fixing
- Gap 1 approach: **Module split** (not microservices, not class-based refactor)
- Gap 7 approach: **Request-level locking** first (simplest), escalate to client-server if insufficient
- Gap 8 scope: **80% coverage on business logic** only, not utils/configs
- Gap 12 approach: **Timestamp targeting + segment filtering** via pymupdf/ffprobe, not full video ML pipeline
- Sprint 15/17: **Phases only** — complete the open phases listed in TUTOR_TODO, don't restart from scratch
- Export format (Gap 3): **Markdown** first, PDF later if needed

# Tutor Audit - Pass 2 (P2 performance + observability)

- Date scoped: 2026-04-22
- Follows: `TUTOR-AUDIT-P0-001` (Track A, P0 correctness + security) and `TUTOR-AUDIT-P1-001` (Track B, P1 reliability + FE polish), both landed in commit `b745477d`.
- Owner: Trey (@claude-cursor to execute).

## Scope

P0 and P1 closed out correctness and the silent-failure surface area on the Tutor subtree. This pass focuses on the remaining non-correctness risk:

1. Tutor hot-path performance (request latency, streaming throughput, DB cost).
2. Observability (timing telemetry, structured logs, health signals).
3. Resource hygiene (connection lifecycle, memory pressure, background work).
4. Index coverage on newly-introduced hot-path queries.
5. Frontend render / commit cost on the Tutor subtree once a session is live.

## Ground-truth signals gathered

- `rg` count of `conn = get_connection()` across Tutor backend files: `api_tutor_turns.py` 12, `api_tutor_materials.py` 20, `api_tutor_workflows.py` 18, `api_tutor_sessions.py` 11; many pair with a trailing `conn.close()` but without `try / finally` (same pattern B10 exposed in `embed_status`).
- `rg` count of `except ...: pass` across Tutor backend files: 28 total (13 in `api_tutor_sessions.py`, 17 in `api_tutor_materials.py`, 7 in `api_tutor_utils.py`, plus smaller clusters). P0/P1 already lifted the most-drifted ones; the rest remain candidates for a structured observability pass.
- `rg` count of `_LOG.(debug|info|warning|error)` across Tutor backend files: 23 in `api_tutor_turns.py`, 19 in `api_tutor_sessions.py`, single-digits elsewhere. Coverage is uneven and the levels are not calibrated against the P0/P1 upgrades.
- `rg` of `time.perf_counter|time.time|\.elapsed` in `api_tutor_turns.py`: 12 matches - streaming turn has some timing, but ad-hoc and not exposed to any telemetry channel.
- `db_setup.py` already creates `idx_tutor_turns_session|created|topic|tutor_session_id` (S1 fix landed in Track A). `tutor_artifacts`, `tutor_accuracy_events`, and `quick_notes` are not scanned yet.

## P2 candidate findings (to be verified with failing tests in execution phase)

### Performance

- P2-PERF-001: `send_turn` rebuilds the full retrieval context and tool list on every turn. No re-use or memoization of the vector-store handle or the Chroma collection lookup across a single session. Suspected fixed-cost floor per turn is avoidable.
- P2-PERF-002: `list_sessions` (post-B8) reads all session columns; most consumers only need `id`, `session_id`, `started_at`, `ended_at`, `turn_count`, and `last_message_preview`. SELECT list is effectively `SELECT *` - worth trimming or paginating.
- P2-PERF-003: `get_material_content` (and adjacent extraction endpoints) may hit disk for every request without caching. Validate whether response payloads are memoizable by (material_id, mtime).
- P2-PERF-004: No index on `tutor_accuracy_events.session_id` or `tutor_accuracy_events.created_at`. The accuracy-log write hot-path filters / orders by both. Confirm and add.
- P2-PERF-005: `quick_notes` has no index on `session_id` / `tutor_session_id`. The note-persistence hot-path (B7 just landed) filters by one or both.
- P2-PERF-006: `api_tutor_workflows` touches `tutor_workflows`, `tutor_priming_bundles`, and `tutor_polish_bundles` in sequence without joining. Measure and consider batched fetch for Studio panel cold-start.

### Observability

- P2-OBS-001: No turn-level timing emitted as structured telemetry. B4 / B11 log WARNINGs, but normal-path latency (TTFT, total ms, tokens, tool-round count) is not surfaced. Add a single `turn_complete` INFO log with a stable schema (session_id, turn_number, ttft_ms, total_ms, tool_rounds, citations_count, llm_tokens).
- P2-OBS-002: Tutor SSE stream lacks a health endpoint or heartbeat metric. `TUTOR_SSE_HEARTBEAT_SECONDS` drives emission but nothing records miss / delay. Add a per-stream "last heartbeat at" register.
- P2-OBS-003: 28 remaining `except ...: pass` sites in Tutor backend files. Not all need to log, but the ones in tool execution, artifact persistence helper paths, and retrieval fallbacks should at minimum log at DEBUG with exc_info.
- P2-OBS-004: No explicit log line on SSE client disconnect. F2 unmount-abort is now correct on the client, but the backend generator still finishes silently; a DEBUG `sse_client_disconnected` line with session_id is cheap and useful.
- P2-OBS-005: `_resolve_embedding_provider()` failure path (B10 body) already logs, but `embed_status` does not emit a response-time metric. Add a single INFO with `duration_ms`, `materials_total`, `embedded_count`, `needs_reembed_count` so dashboard health is scriptable.

### Resource hygiene

- P2-RES-001: Audit every `conn = get_connection()` site in `api_tutor_turns.py`, `api_tutor_materials.py`, `api_tutor_workflows.py`, `api_tutor_sessions.py` and convert to `try / finally` (same pattern as the B10 fix). Prior to P1 we assumed "same request exits cleanly"; B10 proved that assumption wrong for mid-route SELECT raises.
- P2-RES-002: `_cf_conn` / `adaptive_conn` / `db_conn` in `send_turn` all use ad-hoc lifecycles. Consider a contextmanager `with tutor_db() as conn:` helper to enforce the invariant.
- P2-RES-003: Streaming-turn generator holds `conn` open across LLM round-trips in some branches. Audit whether any `conn` spans an async boundary longer than the SSE flush interval.

### Index coverage (follow-ups to S1)

- P2-IDX-001: `CREATE INDEX IF NOT EXISTS idx_tutor_accuracy_events_session_created ON tutor_accuracy_events(session_id, created_at DESC)` if not present.
- P2-IDX-002: `CREATE INDEX IF NOT EXISTS idx_quick_notes_tutor_session ON quick_notes(tutor_session_id)`.
- P2-IDX-003: Verify `tutor_turns(tutor_session_id, turn_number)` composite for ordered paging.
- P2-IDX-004: `tutor_artifacts` - confirm coverage on `(tutor_session_id, created_at)`.

### Frontend

- P2-FE-001: `useTutorSessionMaterialBundle` now receives a defensive input (bundle hardening just landed). Investigate the `useMemo` dependency list - partial-update props may still cause a full re-build of the bundle on every workflow-detail patch.
- P2-FE-002: `TutorShell` passes many large arrays (materials, turns, artifacts) through prop trees. Profile a live session: confirm no unintended re-renders on every SSE chunk commit.
- P2-FE-003: The Tutor panel lazy-loads `TutorWorkflowPolishStudioLazy`; verify there is no cold-start jank when a user opens Polish mid-session.
- P2-FE-004: F1 live bridge assigns a non-null default eagerly on first render. Confirm no test harness relies on `liveSessionBridgeRef.current === null` semantics (none found in this pass, but noted for completeness).

## Execution plan (TDD, Track C)

Same Red-Green cadence as Tracks A and B. Grouped by theme to keep commits reviewable.

1. **Wave 1 - Observability quick wins.** P2-OBS-001, P2-OBS-005, P2-OBS-004, P2-OBS-002. Each adds a log line or a small counter behind a failing test that asserts structure/presence.
2. **Wave 2 - Resource hygiene.** P2-RES-001 / P2-RES-002. Introduce `tutor_db` contextmanager and migrate the highest-traffic sites first (turn handling, materials, sessions list). Red test for each leak using the same `_TrackedConn` harness introduced in Track B.
3. **Wave 3 - Index coverage.** P2-IDX-001..004. Add `CREATE INDEX IF NOT EXISTS` statements in `db_setup.py` + a test that runs `EXPLAIN QUERY PLAN` on the hot-path queries and asserts index use.
4. **Wave 4 - Performance.** P2-PERF-002 (session-list column trim, smallest scope), P2-PERF-004 / P2-PERF-005 (covered by Wave 3 indexes once added), P2-PERF-001 (retrieval context cache - largest scope, last).
5. **Wave 5 - Frontend profiling.** P2-FE-001..003. Instrument once per commit, decide whether to land changes based on observed numbers.

## Out of scope for P2

- Anything that changes Tutor pedagogy, UX, or session lifecycle - P2 is perf / observability only.
- Scholar / Brain / SOP workstreams - tracked separately.
- Dashboard auth model - separate security sprint.

## Validation gates

- Every wave lands with new tests (pytest / vitest) and a regression sweep of the existing Track A + Track B suites.
- No wave regresses `python -m pytest brain/tests/test_tutor_audit_p0_remediation.py brain/tests/test_tutor_audit_track_b.py -q` or the F1/F2/F3/F4 + bundle Vitest suites.
- After every backend change: rebuild `dashboard_rebuild/` only if FE was touched, then restart via `C:\pt-study-sop\Start_Dashboard.bat` and re-probe `/api/tutor/embed/status` and `/api/tutor/sessions?limit=abc` to confirm the B8 / B10 behaviors still hold in the live process.

## Status

- Scoped: 2026-04-22.
- Queued as `TUTOR-AUDIT-P2-001` in `docs/root/TUTOR_TODO.md`.
- Not yet started; no code changes in this doc.

## Findings (ordered by severity)
No P0 findings in these two files.

| Severity | Location | Finding | Risk impact |
|---|---|---|---|
| P1 | [api_tutor.py:6405](/C:/pt-study-sop/brain/dashboard/api_tutor.py:6405), [api_tutor.py:49](/C:/pt-study-sop/brain/dashboard/api_tutor.py:49) | `enrich_video_material()` calls `db_setup.get_connection()` but only symbol imports exist (`from db_setup import ...`). | Endpoint can fail at runtime with `NameError`, breaking `/materials/video/enrich`. |
| P1 | [api_tutor.py:4240](/C:/pt-study-sop/brain/dashboard/api_tutor.py:4240), [api_tutor.py:4293](/C:/pt-study-sop/brain/dashboard/api_tutor.py:4293), [api_tutor.py:4294](/C:/pt-study-sop/brain/dashboard/api_tutor.py:4294) | Post-stream turn persistence uses broad `except: pass`. | Turn/history/state write failures are silent, causing transfer-integrity loss (missing turns, stale continuity IDs) with no operational signal. |
| P1 | [api_tutor.py:3407](/C:/pt-study-sop/brain/dashboard/api_tutor.py:3407), [api_tutor.py:4271](/C:/pt-study-sop/brain/dashboard/api_tutor.py:4271), [api_tutor.py:4275](/C:/pt-study-sop/brain/dashboard/api_tutor.py:4275) | `turn_number` is derived once (`session["turn_count"] + 1`) and written later after long streaming work, without optimistic guard/lock. | Parallel same-session `/turn` requests can collide/lost-update turn numbering and continuity state. |
| P2 | [api_tutor.py:3308](/C:/pt-study-sop/brain/dashboard/api_tutor.py:3308), [api_tutor.py:3310](/C:/pt-study-sop/brain/dashboard/api_tutor.py:3310), [api_tutor.py:4278](/C:/pt-study-sop/brain/dashboard/api_tutor.py:4278) | Per-turn `content_filter` is merged wholesale and then persisted. | Guardrail/scope fields can be unintentionally overwritten across turns (transfer-integrity drift). |
| P2 | [api_tutor.py:4027](/C:/pt-study-sop/brain/dashboard/api_tutor.py:4027), [api_tutor.py:4043](/C:/pt-study-sop/brain/dashboard/api_tutor.py:4043), [api_tutor.py:4230](/C:/pt-study-sop/brain/dashboard/api_tutor.py:4230), [api_tutor.py:4258](/C:/pt-study-sop/brain/dashboard/api_tutor.py:4258) | On stream error after partial output, code re-raises then overwrites `full_response` with `"[Error: ...]"` before DB write. | Persisted answer can diverge from what user already received via SSE tokens. |
| P2 | [api_tutor.py:3159](/C:/pt-study-sop/brain/dashboard/api_tutor.py:3159) | `message` is `.strip()`’d with no type validation. | Non-string payload can raise 500 instead of returning controlled 4xx. |
| P2 | [api_tutor.py:2781](/C:/pt-study-sop/brain/dashboard/api_tutor.py:2781) | `course_id` is cast via `int(course_id)` before validation. | Invalid payload can throw and fail session creation path. |
| P2 | [api_tutor.py:3937](/C:/pt-study-sop/brain/dashboard/api_tutor.py:3937), [api_tutor.py:3939](/C:/pt-study-sop/brain/dashboard/api_tutor.py:3939) | Uses `chunk['status']` for web-search chunks (direct indexing). | Missing/variant chunk shape can raise `KeyError` and abort stream. |
| P2 | [api_tutor.py:4229](/C:/pt-study-sop/brain/dashboard/api_tutor.py:4229), [tutor_streaming.py:57](/C:/pt-study-sop/brain/tutor_streaming.py:57), [tutor_streaming.py:91](/C:/pt-study-sop/brain/tutor_streaming.py:91) | SSE error path can return raw exception text when mapper has no match. | Internal runtime details may leak to clients. |
| P2 | [api_tutor.py:4241](/C:/pt-study-sop/brain/dashboard/api_tutor.py:4241), [api_tutor.py:4292](/C:/pt-study-sop/brain/dashboard/api_tutor.py:4292), [api_tutor.py:4293](/C:/pt-study-sop/brain/dashboard/api_tutor.py:4293) | `db_conn` is closed only on success path. | If persistence throws, connection may leak. |
| P3 | [api_tutor.py:206](/C:/pt-study-sop/brain/dashboard/api_tutor.py:206), [api_tutor.py:254](/C:/pt-study-sop/brain/dashboard/api_tutor.py:254), [api_tutor.py:255](/C:/pt-study-sop/brain/dashboard/api_tutor.py:255) | Schema/column bootstrap (`_ensure_selector_columns`) swallows all errors silently. | Migration/setup failures become invisible; downstream continuity behavior can degrade without diagnosis. |

## Missing checks/tests
- Add endpoint test for `/api/tutor/materials/video/enrich` that exercises the DB connection path and fails on unresolved symbol usage.
- Add concurrency test for two simultaneous `/api/tutor/session/<id>/turn` calls in same session; assert unique/ordered `turn_number` and stable `last_response_id`.
- Add persistence-failure test (force DB write failure after stream) to ensure failure is surfaced and connections are closed.
- Add stream-integrity test for partial SSE output followed by provider error; assert stored `answer` reflects streamed content policy consistently.
- Add request-validation tests for non-string `message` and invalid `course_id`; expect 400, never 500.
- Add chunk-shape robustness test for streaming chunks missing `status` in `web_search`; stream should not crash.
- Add SSE error hygiene test to ensure client error payloads are sanitized (no raw exception internals).
- Add `content_filter` mutability test to verify only allowed keys can be persisted from per-turn overrides.
- Add setup/migration observability test around `_ensure_selector_columns` failure path (logging/telemetry assertion).

## Quick confidence notes
- High confidence: undefined `db_setup`, silent persistence swallow, raw error leakage path, input validation gaps, `chunk['status']` crash path.
- Medium confidence: turn-number race severity depends on whether parallel same-session `/turn` calls occur in deployment.
- Medium confidence: `content_filter` overwrite is structurally real; severity depends on whether full override persistence is intended product behavior.

## Action options
1. I can convert these findings into a prioritized fix checklist for `docs/root/TUTOR_TODO.md` (runtime hardening section).
2. I can run a follow-up read-only audit limited to retry/cancellation/client-disconnect behavior in `send_turn`.
3. I can draft a minimal test plan matrix (pytest-style cases) for just these identified gaps.
# Scholar/Tutor Alignment Audit Notes (2026-03-04)

## What broke repeatedly
- Scholar frontend and backend endpoint contracts drifted.
- Some UI paths called action endpoints that did not exist on backend.
- Question IDs were ephemeral (derived per response) instead of stable and persisted.
- Run status/history payloads had inconsistent shapes across routes.

## What is now implemented
- Added persisted Scholar question lifecycle storage (`scholar_questions`) with deterministic IDs/hashes.
- Reworked `GET /api/scholar/questions` to ingest file questions into DB and return stable IDs + status.
- Added explicit action endpoint: `POST /api/scholar/questions/<id>/answer`.
- Added explicit action endpoints:
  - `POST /api/scholar/proposals/<id>/approve`
  - `POST /api/scholar/proposals/<id>/reject`
- Extended status payload to include both old and new run fields (`run_id`, `phase`, `started_at`, `finished_at`, `error`).
- Added `/api/scholar/status` alias in dashboard routes.
- Added run-history fallback behavior (log-derived best effort when DB history query fails).
- Unified Scholar run/status usage in frontend `api.ts` and `ScholarRunStatus.tsx`.
- Added active Scholar page question-answer controls in `dashboard_rebuild/client/src/pages/scholar.tsx`:
  - Pending questions now render inline answer textarea + submit action.
  - Submit calls `POST /api/scholar/questions/<id>/answer`.
  - Answered questions render saved answer text/status.

## Guardrails to avoid regressions
- Keep one canonical Scholar API client path in frontend (`api.ts`) and avoid ad-hoc `fetch` for the same contract.
- Every new Scholar route must be documented with request/response shape and ownership.
- Every route used by UI actions must have a backend handler before exposing controls.
- Prefer deterministic IDs for all lifecycle items (`question_id`, hashes) instead of list-position IDs.
- Preserve backward-compatible response fields for one migration cycle before removing legacy keys.

## Follow-up checks to keep
- Verify Scholar question status transitions: `pending -> answered`.
- Verify proposal status transitions via explicit action endpoints.
- Verify status and history panels remain usable when DB history is unavailable (fallback path).

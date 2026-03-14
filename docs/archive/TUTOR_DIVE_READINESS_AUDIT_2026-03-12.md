# Tutor Dive Readiness Audit

Date: 2026-03-12
Owner: Trey
Scope: confirm what still needs to be hardened before the next Tutor-focused implementation wave starts.

Historical note:
- this audit describes the pre-shell, wizard-led Tutor readiness surface and is preserved as historical evidence only
- current product authority lives in `docs/root/TUTOR_STUDY_BUDDY_CANON.md`
- current launch/start-panel cleanup lives in `conductor/tracks/tutor-launch-shell-realignment_20260313/`

## Decision Summary

- Keep `gemini-embedding-2-preview` as the intended default embedding model for now.
- Do not reopen the Brain / Scholar / Tutor shell recenter work unless a new defect is found.
- Treat the next Tutor wave as blocked on runtime truthfulness, session-contract hardening, and route/docs cleanup listed below.

## Confirmed Findings

### P1 blockers

1. Tutor start eligibility is weaker than the certified preflight contract.
   - `dashboard_rebuild/client/src/pages/tutor.tsx`
   - `dashboard_rebuild/client/src/components/TutorWizard.tsx`
   - `startSession()` blocks only on `blockers.length > 0`, while the page and wizard both model readiness through richer preflight state.

2. Brain handoff can be silently overridden by stale active-session restore.
   - `dashboard_rebuild/client/src/pages/tutor.tsx`
   - Tutor reads Brain handoff state first, then restores `tutor.active_session.v1` and exits early if the old session is still active.

3. Tutor retrieval/runtime truth is still too soft for deeper work.
   - `brain/requirements.txt`
   - `brain/tutor_rag.py`
   - The live embed pipeline depends on LangChain/Chroma pieces that are not declared in `brain/requirements.txt`.
   - The Gemini path still relies on the deprecated `langchain_community.vectorstores.Chroma` adapter.
   - Skip logic trusts SQLite embedding rows without verifying that the vectors still exist in the active Chroma collection.

4. Session create and preflight lifecycle contracts still have backend holes.
   - `brain/dashboard/api_tutor_sessions.py`
   - `brain/dashboard/api_tutor_utils.py`
   - Malformed numeric payloads can still escape as `500`s.
   - `preflight_id` bundles are process-local, replayable, and not time-bound.

5. Artifact endpoints still allow post-end mutation.
   - `brain/dashboard/api_tutor_artifacts.py`
   - Ended sessions can still be finalized, graph-synced, or artifact-mutated because those routes only verify session existence.

6. Direct browser loads for support pages are not server-routed by Flask.
   - `brain/dashboard/routes.py`
   - `/library`, `/mastery`, `/methods`, and `/vault-health` rely on client routing only, even though current user docs tell people to open those paths directly.

### P2 hardening items

7. Embed failure visibility is still too aggregate.
   - `brain/tutor_rag.py`
   - `brain/dashboard/api_tutor.py`
   - Operators can see counts, but not which document failed, why it failed, or whether Chroma was actually verified.

8. Video enrichment status still exposes key-source names, and the app still has a config write path for API keys.
   - `dashboard_rebuild/client/src/components/MaterialSelector.tsx`
   - `brain/video_enrich_api.py`
   - `brain/dashboard/routes.py`

9. Tutor delete warning behavior is not covered end to end.
   - `brain/dashboard/api_tutor_sessions.py`
   - The API already supports `deleted_with_warnings`, but that branch still needs explicit regression coverage and clearer operator visibility.

10. Active docs still contain stale route, launch, and embedding statements that will slow the next Tutor wave.
   - `dashboard_rebuild/README.md`
   - `docs/REPO_ORIENTATION.md`
   - `docs/dashboard/DASHBOARD_WINDOW_INVENTORY.md`
   - `docs/TUTOR_ARCHITECTURE.md`
   - `docs/root/GUIDE_USER.md`

11. The shell-route regression path still emits non-blocking React `act(...)` warnings.
   - `dashboard_rebuild/client/src/pages/__tests__/brain.test.tsx`

## Old Backlog Items Not Carried Forward

- No task is opened to switch away from Gemini Embedding 2. The owner explicitly wants Gemini Embedding 2, so the hardening work assumes that model stays in place unless runtime access proves otherwise.
- No task is reopened for the retired Dashboard / root-route collapse. That work is already shipped; only the missing direct-load Flask routes for support pages remain relevant.
- No task is opened for the deferred Scholar proposal ledger in this pre-Tutor wave.

## Pre-Tutor Hardening Backlog

### Wave A: Retrieval truth first

1. `T-1230` Lock the Tutor retrieval runtime contract.
   - Files: `brain/requirements.txt`, `brain/dashboard/api_tutor.py`, `docs/root/GUIDE_DEV.md`
   - Definition of done: the declared Python dependency set matches the live Tutor retrieval path, and the embed status surface reports dependency/runtime health for the active provider/model.
   - Gate: `pytest brain/tests/test_tutor_embed_status_api.py -q`

2. `T-1231` Migrate the vectorstore path off deprecated `langchain_community.vectorstores.Chroma`.
   - Files: `brain/tutor_rag.py`, `brain/requirements.txt`
   - Definition of done: Tutor uses `langchain_chroma`, and the Gemini path no longer depends on OpenAI-only imports to initialize the vectorstore.
   - Gate: `pytest brain/tests/test_tutor_rag_embedding_provider.py -q`

3. `T-1232` Verify provider/model/dimension/index truth before skipping re-embed.
   - Files: `brain/tutor_rag.py`, `brain/dashboard/api_tutor.py`, `brain/db_setup.py`
   - Definition of done: if SQLite rows exist but the active Chroma collection is missing or mismatched, the document is marked stale and forced through re-embed instead of being skipped.
   - Gate: `pytest brain/tests/test_tutor_rag_embedding_provider.py brain/tests/test_tutor_embed_status_api.py -q`

4. `T-1233` Add per-document embed telemetry and failure visibility.
   - Files: `brain/tutor_rag.py`, `brain/dashboard/api_tutor.py`, `dashboard_rebuild/client/src/pages/library.tsx`, `dashboard_rebuild/client/src/pages/__tests__/library.test.tsx`
   - Definition of done: users can see the last embed status, failure reason, attempt timestamp, and active embedding dimension/provider/model for each material or for the surfaced failures list.
   - Gate: `pytest brain/tests/test_tutor_embed_status_api.py -q`
   - Gate: `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/library.test.tsx`

5. `T-1234` Remove config secret writes and sanitize enrichment configuration messaging.
   - Files: `brain/dashboard/routes.py`, `brain/dashboard/utils.py`, `brain/video_enrich_api.py`, `dashboard_rebuild/client/src/components/MaterialSelector.tsx`
   - Definition of done: API keys are sourced only from env or `brain/.env`, and the UI reports simple configured/not-configured status without exposing key-source chains.
   - Gate: `pytest brain/tests/test_video_enrich_api.py -q`
   - Gate: `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/library.test.tsx`

### Wave B: Tutor session contract hardening

6. `T-1240` Make Tutor start require a green preflight, not just zero blockers.
   - Files: `dashboard_rebuild/client/src/pages/tutor.tsx`, `dashboard_rebuild/client/src/components/TutorWizard.tsx`
   - Definition of done: the Start action is disabled or rejected whenever preflight is absent, still loading, `ok === false`, or otherwise not certified ready.
   - Gate: `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/TutorWizard.test.tsx client/src/pages/__tests__/tutor.test.tsx`

7. `T-1241` Resolve Brain handoff versus stale active-session restore intentionally.
   - Files: `dashboard_rebuild/client/src/pages/tutor.tsx`, `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
   - Definition of done: Tutor has one explicit precedence rule for Brain launch versus active-session resume, and the UI reflects that choice instead of silently restoring.
   - Gate: `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.test.tsx`

8. `T-1242` Centralize the resume-session transition.
   - Files: `dashboard_rebuild/client/src/pages/tutor.tsx`, `dashboard_rebuild/client/src/components/TutorArtifacts.tsx`, `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
   - Definition of done: every resume path applies the same state transition, including hiding setup, restoring artifacts, and rehydrating the active session consistently.
   - Gate: `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.test.tsx`

9. `T-1243` Prove restored sessions preserve scoped material IDs into the first resumed turn.
   - Files: `dashboard_rebuild/client/src/pages/tutor.tsx`, `dashboard_rebuild/client/src/components/TutorChat.tsx`, `dashboard_rebuild/client/src/components/__tests__/TutorChat.test.tsx`, `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`
   - Definition of done: a restored session resumes with the same selected material IDs and sends them on the first turn after restore.
   - Gate: `cd dashboard_rebuild && npm run test -- client/src/components/__tests__/TutorChat.test.tsx client/src/pages/__tests__/tutor.test.tsx`

### Wave C: Backend lifecycle hardening

10. `T-1250` Validate numeric session-create inputs and return stable `400` contract errors.
   - Files: `brain/dashboard/api_tutor_sessions.py`, `brain/tests/test_tutor_session_linking.py`
   - Definition of done: malformed `course_id`, `time_available`, and similar numeric inputs return stable validation errors instead of `500`s.
   - Gate: `pytest brain/tests/test_tutor_session_linking.py -q`

11. `T-1251` Harden preflight bundle lifecycle.
   - Files: `brain/dashboard/api_tutor_utils.py`, `brain/dashboard/api_tutor_sessions.py`, `brain/tests/test_tutor_session_linking.py`
   - Definition of done: preflight bundles have TTL, one-time-use semantics, and request-shape binding strong enough to reject stale or replayed launch attempts.
   - Gate: `pytest brain/tests/test_tutor_session_linking.py -q`

12. `T-1252` Enforce post-end session lifecycle rules for artifact endpoints.
   - Files: `brain/dashboard/api_tutor_artifacts.py`, `brain/tests/test_tutor_artifact_certification.py`, `brain/tests/test_tutor_session_linking.py`
   - Definition of done: ended sessions cannot be artifact-mutated unless the endpoint is explicitly whitelisted and documented.
   - Gate: `pytest brain/tests/test_tutor_artifact_certification.py brain/tests/test_tutor_session_linking.py -q`

13. `T-1253` Cover and surface the `deleted_with_warnings` delete path.
   - Files: `brain/dashboard/api_tutor_sessions.py`, `brain/tests/test_tutor_audit_remediation.py`
   - Definition of done: the delete warning branch is regression-tested, and operator-visible status makes it clear when DB cleanup succeeded but vault cleanup was partial.
   - Gate: `pytest brain/tests/test_tutor_audit_remediation.py -q`

### Wave D: Shell, docs, and regression hygiene

14. `T-1260` Add direct Flask app-shell routes for live support pages.
   - Files: `brain/dashboard/routes.py`, `brain/tests/`
   - Definition of done: direct `GET /library`, `GET /mastery`, `GET /methods`, and `GET /vault-health` all return the React app shell.
   - Gate: `pytest brain/tests/test_dashboard_routes.py -q`

15. `T-1261` Clean the active docs and mark stale surfaces as historical.
   - Files: `dashboard_rebuild/README.md`, `dashboard_rebuild/client/src/pages/README.md`, `docs/root/GUIDE_USER.md`, `docs/REPO_ORIENTATION.md`, `docs/dashboard/DASHBOARD_WINDOW_INVENTORY.md`, `docs/TUTOR_ARCHITECTURE.md`
   - Definition of done: active docs reflect the real shell, launch path, and Gemini embedding contract; stale docs that still surface in repo search are clearly marked historical or outdated.
   - Gate: `rg -n "dashboard\\.tsx|Vite dev|text-embedding-3-small" C:/pt-study-sop/docs C:/pt-study-sop/dashboard_rebuild/README.md C:/pt-study-sop/dashboard_rebuild/client/src/pages/README.md`
   - Gate: `git diff --check`

16. `T-1262` Remove the shell-route `act(...)` warnings from the frontend regression path.
   - Files: `dashboard_rebuild/client/src/pages/__tests__/brain.test.tsx`, related test helpers/mocks
   - Definition of done: the targeted shell-route test path runs cleanly without new React `act(...)` warnings.
   - Gate: `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/brain.test.tsx`

17. `T-1263` Run the final pre-Tutor readiness sweep.
   - Definition of done: targeted backend/frontend gates are green, the full build still passes, and live smoke verifies the critical Tutor lifecycle plus support-page direct loads.
   - Gate: `pytest brain/tests/test_tutor_session_linking.py brain/tests/test_tutor_artifact_certification.py brain/tests/test_tutor_audit_remediation.py brain/tests/test_tutor_rag_embedding_provider.py brain/tests/test_tutor_embed_status_api.py -q`
   - Gate: `cd dashboard_rebuild && npm run test -- client/src/pages/__tests__/tutor.test.tsx client/src/pages/__tests__/library.test.tsx client/src/pages/__tests__/brain.test.tsx client/src/components/__tests__/TutorWizard.test.tsx client/src/components/__tests__/TutorChat.test.tsx`
   - Gate: `cd dashboard_rebuild && npm run check`
   - Gate: `cd dashboard_rebuild && npm run build`
   - Gate: live `Start_Dashboard.bat` smoke for:
     - `/`, `/brain`, `/tutor`, `/library`, `/mastery`, `/methods`, `/vault-health`
     - `preflight -> create -> restore -> end -> post-end artifact mutation attempt -> delete`

## Start Condition For The Next Tutor Wave

Do not begin the next Tutor feature implementation wave until Wave A through Wave D are complete and `T-1263` is green.

# Implement Progress Tracking, Session Start, and Ingestion Flow in the Dashboard Rebuild

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries, Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.

This plan must be maintained in accordance with `C:/pt-study-sop/.agent/PLANS.md`. All paths in this plan are relative to `C:/pt-study-sop/dashboard_rebuild` unless explicitly noted.

## Purpose / Big Picture

After this change, a user can open the Dashboard and immediately see where they left off, what learning objectives are in progress, and a quick path to start a session. They can prepare material in a guided ingestion flow, launch the Tutor with prefilled context (course, learning objectives, source lock, mode), and have their session update progress automatically. You can see it working by running the app, completing a Quick Start into Tutor, and observing that Progress and Last Session context update after the session log.

## Progress

- [x] (2026-01-23 05:31 local) Reviewed DASHBOARD_IMPLEMENTATION_PLAN.md and current dashboard_rebuild server/client layout to identify touchpoints.
- [ ] (2026-01-23 05:31 local) Define final data shapes for learning objectives, session context, and source lock in this plan.
- [ ] (2026-01-23 05:31 local) Implement schema, storage, and routes for learning objectives and last session context.
- [ ] (2026-01-23 05:31 local) Implement UI components and integrate into Dashboard and Brain pages.
- [ ] (2026-01-23 05:31 local) Implement Tutor context intake and session logging integration.
- [ ] (2026-01-23 05:31 local) Validate end-to-end flow and update Outcomes & Retrospective.

## Surprises & Discoveries

Observation: The implementation plan references `server/schema.ts`, but this repo uses `schema.ts` at the dashboard_rebuild root. Evidence: `schema.ts` exists at repo root and `server` imports from `../schema`.

Observation: Client imports `@shared/schema`, but there is no `shared/` directory. Evidence: `tsconfig.json` maps `@shared/*` to `./shared/*` and `dashboard_rebuild/shared` does not exist.

## Decision Log

Decision: Create `shared/schema.ts` that re-exports from `../schema.ts` to satisfy `@shared/schema` imports. Rationale: Minimal change that matches the existing alias and avoids rewiring client imports. Date/Author: 2026-01-23, Codex.

Decision: Define last session context as the most recent session for the selected course, with a fallback to the most recent session overall if no course is selected. Rationale: Dashboard and Tutor flows are course-centric; course-scoped context matches expected behavior. Date/Author: 2026-01-23, Codex.

Decision: Pass Quick Start and Ingestion context to Tutor via query parameters on `/tutor` (courseId, loIds, sourceLock, mode). Rationale: Wouter routing already handles page navigation and query params are explicit and easy to debug. Date/Author: 2026-01-23, Codex.

Decision: Store `sessions.source_lock` as a JSON string representing an array of strings (each string is a source label like "Slides 12-25"). Rationale: SQLite text fields are already used for JSON in sessions and this keeps the schema simple and consistent. Date/Author: 2026-01-23, Codex.

## Outcomes & Retrospective

No outcomes yet. Update this section after each milestone to summarize what was achieved, remaining gaps, and lessons learned.

## Context and Orientation

The dashboard_rebuild app is a Vite + React client paired with an Express server. The server starts in `server/index.ts`, registers routes in `server/routes.ts`, and uses `server/storage.ts` for data access. Storage uses SQLite with Drizzle via `server/db.ts` and the schema defined in `schema.ts` at the repo root. The database file is referenced by `DATABASE_URL` and the repo includes `data.db`.

The client lives in `client/src/`. API access is centralized in `client/src/api.ts`, which is used by pages via React Query. The main pages are `client/src/pages/dashboard.tsx`, `client/src/pages/brain.tsx`, and `client/src/pages/tutor.tsx`. Routing is defined in `client/src/App.tsx` using wouter.

Definitions used in this plan: Learning objective (LO) is a row that represents a specific course objective, with status indicating learning progress. Source lock is the list of concrete sources used for a session (slide ranges, page ranges, timestamps). Last session context is a compact summary of the most recent session, including course, topic, LOs, and next action.

## Plan of Work

Milestone 1: Data model and API foundation. Update `schema.ts` to add `learning_objectives`, `lo_sessions`, and `sessions.source_lock`. Create `shared/schema.ts` to satisfy `@shared/schema`. Extend `server/storage.ts` with CRUD for learning objectives, queries for last session context, and creation of lo_sessions records. Add REST endpoints in `server/routes.ts` for learning objectives and last session context, plus a route to create lo_sessions records. Update `client/src/api.ts` to include typed calls for these endpoints. This milestone is done when the endpoints respond with valid JSON and empty states render without errors.

Milestone 2: UI components and page integration. Create `client/src/components/ProgressTable.tsx` for a full LO table with status editing and next action updates. Create `ProgressWidget.tsx` for per-course summary counts. Create `SessionStartCard.tsx` to show last session context and entry buttons. Create `QuickStartModal.tsx` that collects course, target LOs, mode, and source lock, then navigates to Tutor. Create `IngestionWizard.tsx` for the Brain Ingestion tab that collects sources, builds a source lock list, and routes to Tutor. Update `client/src/pages/brain.tsx` to add new Progress and Ingestion tabs. Update `client/src/pages/dashboard.tsx` to render the SessionStartCard and ProgressWidget. This milestone is done when the new UI sections render and pull data from the new endpoints without runtime errors.

Milestone 3: Tutor context and session logging integration. Update `client/src/pages/tutor.tsx` to use real course data from the API, accept prefilled context (course, LO list, source lock), display that context, and log sessions with LO tracking through the new API. Update the Dashboard and Brain flows to route to Tutor with context from Quick Start and Ingestion using query parameters. This milestone is done when a complete flow updates learning objective status and the last session context after a Tutor session.

## Concrete Steps

From `C:/pt-study-sop/dashboard_rebuild`, ensure dependencies and environment are ready. Use the existing `.env` or set `DATABASE_URL` to `file:./data.db` if Drizzle requires the `file:` prefix.

    npm install

Apply schema changes:

    npm run db:push

Typecheck:

    npm run check

Run the app (single server that serves API and client on port 5000):

    npm run dev

Open `http://localhost:5000/` and verify the new UI sections render.

## Validation and Acceptance

Acceptance is based on observable behavior. The Dashboard shows a Session Start card with last session context and a Progress widget summarizing LO status by course. The Brain page has Progress and Ingestion tabs, with Progress listing LOs and Ingestion collecting sources and building a source lock list. The Tutor page shows dynamic courses and displays incoming context (source lock and LOs). Completing and logging a Tutor session updates LO status and last session context.

API checks can be performed with a browser or curl. For example, `GET /api/learning-objectives` returns an array and `GET /api/sessions/last-context?courseId=1` returns a context object.

## Idempotence and Recovery

`npm run db:push` is safe to re-run, but back up `data.db` before schema changes. If a migration fails, restore `data.db` from the backup and re-run. UI-only changes are safe to re-run without data resets.

## Artifacts and Notes

Capture brief evidence in this file: a short JSON example of a learning objective, a sample last session context response, and a note that the Progress tab renders rows and Quick Start routes to Tutor with prefilled context. Remember to add a plan change note at the bottom of this ExecPlan whenever it is revised.

## Interfaces and Dependencies

The `learning_objectives` table must include id, course_id, module, lo_code, title, status, last_session_id, last_session_date, next_action, created_at, and updated_at. The `lo_sessions` table must include lo_id, session_id, status_before, status_after, and notes. The `sessions.source_lock` column stores a JSON string representing an array of source labels.

Add endpoints in `server/routes.ts` for learning objectives at `/api/learning-objectives` and `/api/learning-objectives/:id`, for last session context at `/api/sessions/last-context` with optional courseId query param, and for LO session records at `/api/lo-sessions`. Keep `client/src/api.ts` in sync with these endpoints and response shapes.

Plan change note: Initial ExecPlan created on 2026-01-23 to translate DASHBOARD_IMPLEMENTATION_PLAN.md into an executable plan.

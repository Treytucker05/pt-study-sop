# API Contract Reference

Source of truth for the Flask backend ↔ React frontend API surface.
Both sides have contract tests that verify these shapes:
- Backend: `brain/tests/test_api_contracts.py` (47 tests)
- Frontend: `dashboard_rebuild/client/src/test/api-contracts.test.ts` (56 tests)

---

## Sessions (`api.sessions`)

| Method | URL | Request Body | Response | Status |
|--------|-----|-------------|----------|--------|
| GET | `/api/sessions` | — | `Session[]` | 200 |
| GET | `/api/sessions/stats` | — | `{ total, avgErrors, totalCards }` | 200 |
| GET | `/api/sessions/today` | — | `Session[]` | 200 |
| GET | `/api/sessions/:id` | — | `Session` (with turns) | 200 |
| POST | `/api/sessions` | `{ mode, topic?, minutes?, ... }` | `{ id, topic, date, mode, ... }` | 201 |
| PATCH | `/api/sessions/:id` | `Partial<Session>` | `{ id, updated: true }` | 200 |
| DELETE | `/api/sessions/:id` | — | `{ deleted: true }` | 200 |
| POST | `/api/sessions/bulk-delete` | `{ ids: number[] }` | `{ deleted: N }` | 200 |

## Courses (`api.courses`)

| Method | URL | Request Body | Response | Status |
|--------|-----|-------------|----------|--------|
| GET | `/api/courses` | — | `Course[]` | 200 |
| GET | `/api/courses/active` | — | `Course[]` | 200 |
| GET | `/api/courses/:id` | — | `Course` | 200 |
| POST | `/api/courses` | `{ name, code?, semester? }` | `{ id, ... }` | 201 |
| PATCH | `/api/courses/:id` | `Partial<Course>` | `{ id, updated: true }` | 200 |
| DELETE | `/api/courses/:id` | — | — | 204 |

## Methods (`api.methods`)

| Method | URL | Request Body | Response | Status |
|--------|-----|-------------|----------|--------|
| GET | `/api/methods[?category=X]` | — | `MethodBlock[]` | 200 |
| GET | `/api/methods/:id` | — | `MethodBlock` | 200 |
| POST | `/api/methods` | `{ name, category, default_duration_min, energy_cost, tags, evidence? }` | `{ id, name }` | 201 |
| PUT | `/api/methods/:id` | `MethodBlock` (full) | `{ id, updated: true }` | 200 |
| DELETE | `/api/methods/:id` | — | — | 204 |
| POST | `/api/methods/:id/rate` | `{ effectiveness, engagement, session_id?, notes?, context? }` | `{ id, rated: true }` | 201 |
| GET | `/api/methods/analytics` | — | `{ block_stats[], chain_stats[], recent_ratings[] }` | 200 |

### MethodBlock shape
```
{ id, name, category, description, default_duration_min,
  energy_cost, best_stage, tags: string[], evidence, created_at }
```

### MethodAnalyticsResponse shape
```
{ block_stats: [{ id, name, category, usage_count, avg_effectiveness, avg_engagement }],
  chain_stats: [{ id, name, is_template, usage_count, avg_effectiveness, avg_engagement }],
  recent_ratings: [{ id, method_block_id, chain_id, effectiveness, engagement, notes, context, rated_at, method_name, chain_name }] }
```

## Chains (`api.chains`)

| Method | URL | Request Body | Response | Status |
|--------|-----|-------------|----------|--------|
| GET | `/api/chains[?template=0\|1]` | — | `MethodChain[]` | 200 |
| GET | `/api/chains/:id` | — | `MethodChainExpanded` (with blocks[]) | 200 |
| POST | `/api/chains` | `{ name, block_ids[], context_tags, is_template, description? }` | `{ id, name }` | 201 |
| PUT | `/api/chains/:id` | `MethodChain` | `{ id, updated: true }` | 200 |
| DELETE | `/api/chains/:id` | — | — | 204 |
| POST | `/api/chains/:id/rate` | `{ effectiveness, engagement, ... }` | `{ id, rated: true }` | 201 |

## Planner (`api.planner`)

| Method | URL | Request Body | Response | Status |
|--------|-----|-------------|----------|--------|
| GET | `/api/planner/queue` | — | `PlannerTask[]` | 200 |
| GET | `/api/planner/settings` | — | `Record<string, unknown>` | 200 |
| PUT | `/api/planner/settings` | `Record<string, unknown>` | `{ updated: true }` | 200 |
| POST | `/api/planner/tasks` | `PlannerTaskCreate` | `{ id, ... }` | 201 |
| POST | `/api/planner/generate` | — | `{ generated, tasks: [...] }` | 200 |
| PATCH | `/api/planner/tasks/:id` | `PlannerTaskUpdate` | `{ id, updated: true }` | 200 |

### PlannerTask shape
```
{ id, course_id, topic_id, course_event_id, scheduled_date,
  planned_minutes, status, actual_session_id, notes, created_at,
  updated_at, source, priority, review_number, anchor_text, course_name }
```

## Brain (`api.brain`)

| Method | URL | Request Body | Response | Status |
|--------|-----|-------------|----------|--------|
| GET | `/api/brain/metrics` | — | Complex metrics object | 200 |
| POST | `/api/brain/organize-preview` | `{ rawNotes, course? }` | `{ preview: [...] }` | 200 |
| POST | `/api/brain/chat` | `{ message, mode?, ... }` | SSE stream | 200 |
| POST | `/api/brain/quick-chat` | `{ messages: {role,content}[] }` | SSE stream | 200 |

## Academic Deadlines (`api.academicDeadlines`)

| Method | URL | Request Body | Response | Status |
|--------|-----|-------------|----------|--------|
| GET | `/api/academic-deadlines` | — | `AcademicDeadline[]` | 200 |
| POST | `/api/academic-deadlines` | `{ title, course, dueDate, type }` | `{ id, ... }` | 201 |
| PATCH | `/api/academic-deadlines/:id` | `Partial<AcademicDeadline>` | `{ id, updated: true }` | 200 |
| DELETE | `/api/academic-deadlines/:id` | — | — | 204 |
| POST | `/api/academic-deadlines/:id/toggle` | — | `{ id, completed: bool }` | 200 |

**Note**: Backend uses camelCase `dueDate` in request body (not `due_date`).

## Data Explorer (`api.data`)

| Method | URL | Request Body | Response | Status |
|--------|-----|-------------|----------|--------|
| GET | `/api/data/tables` | — | `string[]` | 200 |
| GET | `/api/data/tables/:name` | — | `{ table, columns[], row_count }` | 200 |
| GET | `/api/data/tables/:name/rows?limit=N&offset=N` | — | `{ rows[], total, limit, offset }` | 200 |
| PATCH | `/api/data/tables/:name/rows/:rowid` | `Record<string, unknown>` | `{ updated: true, rowid }` | 200 |
| DELETE | `/api/data/tables/:name/rows/:rowid` | — | `{ deleted: true, rowid }` | 200 |
| POST | `/api/data/tables/:name/rows/bulk-delete` | `{ ids: number[] }` | `{ deleted: N }` | 200 |

## Notes (`api.notes`)

| Method | URL | Request Body | Response | Status |
|--------|-----|-------------|----------|--------|
| GET | `/api/notes` | — | `Note[]` | 200 |
| POST | `/api/notes` | `{ title, content }` | `{ id, ... }` | 201 |
| PATCH | `/api/notes/:id` | `Partial<Note>` | `{ id, updated: true }` | 200 |
| DELETE | `/api/notes/:id` | — | — | 200 |
| POST | `/api/notes/reorder` | `{ notes: { id, position }[] }` | `{ updated: N }` | 200 |

## Streak & Study Wheel

| Method | URL | Request Body | Response | Status |
|--------|-----|-------------|----------|--------|
| GET | `/api/streak` | — | `{ currentStreak, longestStreak, lastStudyDate }` | 200 |
| GET | `/api/study-wheel/current` | — | `{ currentCourse }` | 200 |
| POST | `/api/study-wheel/complete-session` | `{ courseId, minutes, mode? }` | `{ session, nextCourse }` | 200 |

## Scholar (`api.scholar`)

| Method | URL | Request Body | Response | Status |
|--------|-----|-------------|----------|--------|
| GET | `/api/scholar/status` | — | `{ running, last_run?, status?, progress?, current_step?, errors? }` | 200 |
| POST | `/api/scholar/run` | `{ triggered_by?, mode? }` | `{ status, session_id, ... }` | 200 |
| GET | `/api/scholar/questions` | — | `ScholarQuestion[]` | 200 |
| POST | `/api/scholar/chat` | `{ message }` | `ScholarChatResponse` | 200 |
| GET | `/api/scholar/findings` | — | `ScholarFinding[]` | 200 |
| GET | `/api/scholar/clusters` | — | `ScholarClustersResponse` | 200 |
| POST | `/api/scholar/clusters` | — | `ScholarClustersResponse` | 200 |

---

## Known Issues

1. **Empty session create returns 500**: `POST /api/sessions` with `{}` body returns 500 on subsequent calls (first call succeeds). Frontend always provides `mode`+`topic`, so non-critical.

2. **Delete status code inconsistency**: Some DELETE endpoints return 200, others 204. Frontend handles both (api.ts returns `undefined` for 204).

3. **Direct fetch bypasses**: Several components use raw `fetch()` instead of `api.*`:
   - `TutorChat.tsx` → `POST /api/tutor/session/:id/turn` (SSE streaming — intentional)
   - `BrainChat/index.tsx` → `POST /api/brain/quick-chat` (SSE streaming — intentional)
   - `ScholarRunStatus.tsx` → `GET /api/scholar/status`, `POST /api/scholar/run`
   - `SyllabusViewTab.tsx` → `GET /api/courses` (duplicates `api.courses.getAll()`)
   - `calendar.tsx` → Full Google Calendar CRUD via raw fetch
   - `ScholarLifecyclePanel.tsx` → Scholar questions/proposals with approve/reject

4. **Google Tasks URL ambiguity**: `/api/google-tasks/<id>` can match either a task ID or a list ID depending on whether called via the old or new API pattern.

5. **Duplicate route registrations**: `/api/scholar/run` exists in both `adapter_bp` and `dashboard_bp`. First-registered (`adapter_bp`) wins.

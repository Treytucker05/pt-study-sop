# Implementation Plan: Course-Keyed Tutor Shell + Studio Foundation

**Track ID:** course-keyed-tutor-shell_20260313  
**Spec:** [./spec.md](./spec.md)  
**Created:** 2026-03-13  
**Status:** Complete

## Overview

This track is implementation-heavy and cross-subsystem. The full roadmap stays here. Only the first unblocked wave should be converted into planner-backed execution tasks if queue execution is needed later.

## Phase 0: Track and workboard bootstrap

### Tasks

- [x] T0: Create/update the durable track artifacts and register the track in `conductor/tracks.md`.
- [x] T0.1: Add the work to the active sprint in `docs/root/TUTOR_TODO.md`.

### Verification

- [x] Track folder exists and is linked from `conductor/tracks.md`.
- [x] `docs/root/TUTOR_TODO.md` lists the active scope.

## Phase 1: Backend shell foundation

### Tasks

- [x] T1: Add `project_workspace_state` keyed by `course_id`.
- [x] T2: Add normalized Studio foundation tables:
  - `studio_items`
  - `studio_item_revisions`
  - `studio_boards`
  - `studio_board_entries`
  - `studio_actions`
- [x] T3: Add a Tutor shell summary endpoint keyed by `course_id`.
- [x] T4: Add a Tutor workspace-state persistence endpoint keyed by `course_id`.
- [x] T5: Register the new Tutor project-shell and Studio foundation modules without changing current session/turn/artifact routes.

### Verification

- [x] `pytest brain/tests/test_tutor_project_shell.py -q`
- [x] `pytest brain/tests/test_tutor_session_linking.py brain/tests/test_dashboard_routes.py -q`

### Progress notes

- 2026-03-13: Landed the first backend implementation wave:
  - course-keyed `project_workspace_state`
  - normalized Studio foundation tables
  - `GET /api/tutor/project-shell`
  - `PUT /api/tutor/project-shell/state`
  - `POST /api/tutor/studio/capture`
  - `GET /api/tutor/studio/restore`
  - `POST /api/tutor/studio/promote`
  - targeted backend certification coverage in `brain/tests/test_tutor_project_shell.py`
  - frontend API contract wiring in `dashboard_rebuild/client/src/api.ts` and `api.types.ts`
  - frontend API wrapper regression coverage in `dashboard_rebuild/client/src/__tests__/api.test.ts`

## Phase 2: Brain launch and `/tutor` shell UI — COMPLETE

- Brain Projects Dashboard renders course-backed projects and deep-links `/tutor` (18 tests)
- `/tutor` shell reads `course_id`, `session_id`, `mode`, `board_scope`, `board_id` from query params (14 tests)
- Mode tabs: Studio | Tutor | Schedule | Publish
- Session start chooser, restore/refresh fallback, handoff from Brain

## Phase 3: Studio boards and capture flows — COMPLETE

- TutorStudioMode: Inbox, board scopes (session/project/overall), item states (2 tests)
- Capture flows: To Studio -> Note / Summary Board from MessageList (2 tests in TutorChat)
- Copy/Move promotion dialog wired through studio/promote API

## Phase 4: Viewer stack and dictation — COMPLETE

- MaterialViewer: PDF via pdfjs-dist, DOCX via docx-preview, MP4 via HTML5 video (4 tests)
- Chromium-first dictation via useChromiumDictation (2 happy-path + 5 failure-path tests)
- Dictation integrated into TutorWorkspaceSurface notes tab (2 integration tests)

## Phase 5: Schedule and Publish modes — COMPLETE

- TutorScheduleMode: course-scoped schedule, syllabus review, ship-to-calendar (3 tests)
- TutorPublishMode: session load, Obsidian publish, Anki handoff (5 tests including failure paths)
- SyllabusViewTab: course selector, locked-course header (4 tests)

## Phase 6: Popouts, failure-path hardening, and live release proof — COMPLETE

- popoutSync: BroadcastChannel transport, edit handshake, viewer/note hello (4 happy-path + 5 failure-path tests)
- Failure-path coverage: publish failure, session load failure, Obsidian offline, SSE malformed chunks, dictation permission denied/unsupported/network error
- Live smoke script: `scripts/live_tutor_smoke.py` (full-circle: Brain -> session -> capture -> promote -> schedule -> publish -> end -> delete)

### Codex review status

- First review: 3 gaps found and fixed
  - T6: restore_studio_items project-scope filter bug (IS NOT NULL → IS NULL)
  - T1-T3: migration proof test added
  - T9: board_scope/board_id query param test added
- Re-review: **APPROVED** — promote nulls tutor_session_id (copy+move), cross-session test added

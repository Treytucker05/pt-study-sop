# Conductor Workflow

Execution-only workflow for this repo.

- Top-level repo truth lives in `README.md`.
- Active execution priority lives in `docs/root/TUTOR_TODO.md`.
- Conductor files exist to sequence work, record status, and preserve implementation history.

## Operating Rules

1. Pull the next viable task from `docs/root/TUTOR_TODO.md`.
2. Treat Conductor plans and track docs as execution evidence, not product truth.
3. Add or tighten a failing automated check before implementation whenever the task changes code or docs-governance behavior.
4. Keep task scopes small, test-gated, and easy to audit.
5. If a track doc conflicts with the canon, fix the track doc or archive it.

## Task Execution Loop

1. Choose the next unblocked task from `docs/root/TUTOR_TODO.md`.
2. Mark it in progress in the active execution surface when appropriate.
3. Add or update the test, assertion, or docs-sync gate that should fail before the fix.
4. Implement the minimum change needed to pass.
5. Run the task gate plus any nearby regression coverage.
6. Record the outcome in the execution board and any relevant track log.

## Required Quality Gates

Before marking a task complete, verify the relevant subset of:

- backend tests: `pytest brain/tests/`
- frontend checks: `cd dashboard_rebuild && npm run check`
- frontend tests: `cd dashboard_rebuild && npm run test`
- frontend build: `cd dashboard_rebuild && npm run build`
- docs governance: `python scripts/check_docs_sync.py`
- whitespace/patch hygiene: `git diff --check`

## Manual Verification Rule

When a task changes user-visible behavior, add a short manual smoke note to the active execution board or track log describing:

- how to launch the app
- what path or interaction to verify
- what result should be visible

## Not Allowed Here

- Declaring product ownership
- Declaring route hierarchy
- Freezing Brain / Scholar / Tutor roles
- Acting as a second source of truth

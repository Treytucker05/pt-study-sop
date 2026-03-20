# Repo-Wide Quality Audit Backlog

Opened: 2026-03-16
Status: active
Track ID: `repo-quality-audit_20260316`

## Objective

Run a non-blocking repo-wide audit against the current dirty workspace, split the app into parallel subsystem review shards, and consolidate hard evidence for broken functionality, contract drift, and bad UI into one severity-ranked backlog plus a fix-wave plan.

## Baseline

- Audit target: current dirty workspace
- Route and subsystem truth: `README.md`
- Launch truth: `Start_Dashboard.bat` on `http://127.0.0.1:5000`
- Existing closed audit context: `conductor/tracks/tutor-ui-stabilization-loop_20260316/`

## Product Finish Condition

- every planned audit shard completes with an artifact in `audit/`
- the final backlog in `findings.md` contains normalized issues only
- every issue includes repro, evidence, severity, likely owner, and fix-wave bucket
- the final backlog distinguishes `P1`, `P2`, and `P3` work clearly enough to execute in later waves without re-triage

## Audited Surfaces

- shared shell and navigation
- Brain
- Tutor
- Scholar
- Methods
- Mastery
- Library
- Calendar
- Vault Health
- backend/API contract integrity
- current automated validation and harness coverage
- cross-route visual and accessibility quality

## Severity Rubric

- `P1`: broken route, crash, blocker, unusable control, lost state, or invalid data contract on a critical flow
- `P2`: incorrect behavior, major UX impairment, misleading state, or high-friction visual defect without full flow failure
- `P3`: polish, consistency, accessibility, spacing, or low-risk affordance cleanup

## Evidence Rules

- functional issues need a failing command, browser repro, trace, or API evidence
- UI issues need a screenshot or browser snapshot reference plus affected route/component context
- test-gap issues must name the missing or weak validation surface precisely

## Swarm Rule

This audit uses parallel `sparky` workers but avoids shared-file contention:

- workers may inspect code, run read-only checks, and browse the live app
- workers may write only their own artifact under `audit/`
- the orchestrator alone updates shared status, backlog, and integration artifacts
- no worker edits product code, commits, or launches alternate dev servers

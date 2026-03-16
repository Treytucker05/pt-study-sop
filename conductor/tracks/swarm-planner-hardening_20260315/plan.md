# Implementation Plan: Swarm Planner Hardening

**Track ID:** swarm-planner-hardening_20260315  
**Spec:** [./spec.md](./spec.md)  
**Created:** 2026-03-15  
**Status:** Complete

## Goal

Make the shared and repo-local swarm planner skills mode-aware, validation-first, and benchmarkable without changing the underlying planner runtime model.

## Phase 0: Bootstrap

- [x] `SPH-001` Register the work in:
  - `docs/root/TUTOR_TODO.md`
  - `conductor/tracks.md`
  - `conductor/tracks/swarm-planner-hardening_20260315/`
- [x] `SPH-010` Back up the canonical shared planner skill before mutation.

## Phase 1: Shared planner contract

- [x] `SPH-100` Update the shared planner skill contract with planning-mode selection, downgrade/escalation rules, validation gates, reviewer diversity, and stop rules.
- [x] `SPH-110` Extend shared references/examples/templates with the new required fields:
  - `parallel_safety_class`
  - `blocked_reason`
  - `replan_trigger`
  - `expected_evidence`

## Phase 2: PT repo adapter

- [x] `SPH-200` Add canon-drift gating, execution-surface selection, duplicate-system checks, and repo-specific replan triggers to the PT adapter skill and references.
- [x] `SPH-210` Update repo review/task-conversion templates so validation and queue/track decisions are explicit and auditable.

## Phase 3: Eval kit and evidence

- [x] `SPH-300` Add a repo-local eval kit under `.codex/skills/treys-swarm-planner-repo/evals/`.
- [x] `SPH-310` Record benchmark prompts plus before/after evidence in the track artifacts.

## Phase 4: Validation and closeout

- [x] `SPH-900` Run validation, log the outcome, and close the track.

## Dependency Graph

`SPH-001 -> SPH-010 -> SPH-100 -> SPH-110 -> SPH-200 -> SPH-210 -> SPH-300 -> SPH-310 -> SPH-900`

## First Unblocked Wave

- `SPH-001`
- `SPH-010`
- `SPH-100`
- `SPH-110`

## Progress Notes

- 2026-03-15: Created the track, registered the sprint item, and backed up the canonical shared planner skill before mutation.
- 2026-03-15: Landed the shared planner hardening across the skill contract, examples, references, and templates.
- 2026-03-15: Landed the PT adapter hardening and added the repo-local planner eval kit with benchmark prompts and a scoring rubric.
- 2026-03-15: Re-ran shared-skill sync checks, docs sync, and diff hygiene checks before closing the track.
- 2026-03-16: Added explicit `n/a` scoring semantics to the eval kit and recorded the first six-case baseline scorecard for future planner tuning.
- 2026-03-16: Ran the next measured experiment by adding a review-only planner path, extending the benchmark set with two critique cases, and recording the resulting score improvement against the original six-case baseline.

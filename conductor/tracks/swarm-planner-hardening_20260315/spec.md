# Specification: Swarm Planner Hardening

> Track artifact. Project policy still lives in `AGENTS.md`.
> Shared reusable skill authority still lives outside the repo in `C:\Users\treyt\.agents\skills`.

**Track ID:** swarm-planner-hardening_20260315  
**Type:** infra  
**Created:** 2026-03-15  
**Status:** Complete

## Summary

Harden the shared swarm planner and the PT repo adapter so they choose the right orchestration pattern, validate executable correctness before qualitative review, and expose an autoresearch-style tuning loop with reusable benchmark artifacts.

## Goal

Ship a planner contract that is simpler on small tasks, more observable on large tasks, and easier to tune empirically over time without inventing a new runtime or queue system.

## Locked decisions

- `C:\Users\treyt\.agents\skills` stays the single source of truth for shared reusable skills.
- `.codex/skills/treys-swarm-planner-repo/` stays repo-local and PT-specific.
- `trey-autoresearch` remains unchanged; this track only borrows its benchmark-and-checkpoint loop.
- Planner hardening is prompt/template/reference work only; no new execution service or queue backend is added.
- Future tuning should use the new eval kit instead of freeform prompt tweaks.

## Acceptance Criteria

- [x] A new Conductor track and active sprint item exist before planner skill edits continue.
- [x] The shared planner requires planning-mode selection, validation gates, reviewer diversity, stop rules, and task-level replan metadata.
- [x] The PT repo adapter adds canon-drift gating, execution-surface selection, duplicate-system checks, and repo-specific replan triggers.
- [x] A repo-local eval kit exists with six PT-realistic benchmark cases, a scorecard, and usage instructions.
- [x] Shared-skill sync validation, docs sync, and diff hygiene checks pass after the edits.

## Out Of Scope

- Editing `trey-autoresearch`.
- Introducing a new queue runtime, DB schema, or planner API.
- Converting existing tracks or historical plan artifacts to the new format.

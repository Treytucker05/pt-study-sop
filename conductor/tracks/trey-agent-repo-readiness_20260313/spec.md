# Specification: Harness Engineering Readiness

**Track ID:** trey-agent-repo-readiness_20260313  
**Created:** 2026-03-13  
**Status:** Active

## Goal

Make `C:\pt-study-sop` confidently harness-ready for repo-native agent execution by adding a shared harness contract, isolated startup, deterministic validation scenarios, machine-readable run artifacts, CI parity, and cross-agent compatibility across Claude, Codex, Gemini, Cursor, OpenCode, Antigravity, and other shell-driven tools in the current ecosystem.

## End-State

The repo is considered harness-ready when:

- agents can discover the harness contract from repo-local docs and commands
- the app can boot in an isolated run without killing another active instance
- at least one hermetic Tutor scenario can run without operator-local data
- harness runs emit machine-readable artifacts that another agent can inspect
- CI exercises the same core harness surfaces local agents are expected to use
- docs match repo reality for startup, test, and multi-agent workflows

## Constraints

- Root `AGENTS.md` is the operative instruction surface for this planning pass.
- `Start_Dashboard.bat` must remain the canonical operator launch path for manual use.
- Existing backend/frontend tests, smoke scripts, and report-style checks should be reused where possible rather than replaced.
- The harness contract must be repo-local first and tool-specific second.
- No duplicate task/board system should be introduced alongside Conductor and existing repo execution surfaces.
- This planning pass must not mutate active tutor/layout coordination files while other agents are using them.

## Observed repo drift relevant to this track

- The session instructions reference `docs/root/AGENT_SETUP.md`, `docs/root/TUTOR_STUDY_BUDDY_CANON.md`, and `docs/root/AGENT_BOARD.md`, but those files are absent in the current checkout.
- `scripts/README.md` references several parallel-agent/worktree scripts that are also absent in the current checkout.
- The repo-local planner review/conversion template paths cited by the first draft are absent in this checkout, so the track must use the shared fallback templates under `C:\Users\treyt\.agents\skills\treys-swarm-planner\templates\`.

These mismatches are part of the harness-readiness problem and must be handled in the roadmap instead of being assumed solved.

## Out Of Scope

- Full implementation of the entire harness roadmap in this planning pass.
- Replacing current Tutor product behavior outside what the harness contract requires.
- Deleting live/operator smoke paths.
- Building one-off harnesses that only work for a single agent tool.

## Assumptions

- Supported agents can all run repo-local shell commands even if their home-directory setup differs.
- The current repo already has enough test/smoke/reporting surface to serve as the initial harness substrate.
- Queue conversion should wait until the durable plan is accepted and the first execution wave is explicit.

## Key Surfaces

- `AGENTS.md`
- `docs/root/GUIDE_DEV.md`
- `docs/root/TUTOR_TODO.md`
- `docs/root/TUTOR_TRUTH_PATH.md`
- `Start_Dashboard.bat`
- `scripts/`
- `.github/workflows/ci.yml`
- `brain/tests/`
- `dashboard_rebuild/`
- `C:\Users\treyt\.agents\skills\trey-agent-repo-readiness\`

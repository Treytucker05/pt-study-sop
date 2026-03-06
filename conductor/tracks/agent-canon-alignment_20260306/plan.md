# Implementation Plan: Agent Canon Alignment and Subagent Reliability

**Track ID:** agent-canon-alignment_20260306
**Spec:** [./spec.md](./spec.md)
**Created:** 2026-03-06
**Status:** [x] Complete

## Phase 0: Track And Bootstrap Setup

- [x] Task 0.1: Create the new Conductor track folder and baseline files.
- [x] Task 0.2: Register the track in `conductor/tracks.md` as the active workstream.
- [x] Task 0.3: Add a new item under the `Active Sprint` section of `docs/root/TUTOR_TODO.md`.
- [x] Task 0.4: Append a kickoff entry to `conductor/tracks/GENERAL/log.md`.
- [x] Task 0.5: Capture rollback targets for every home-directory file that will be edited.

## Phase 1: Live Surface Audit And Precedence Contract

- [x] Task 1.1: Inventory exact live repo/global instruction surfaces and exclude backups, sessions, caches, history, and worktree copies.
- [x] Task 1.2: Define the final precedence contract for repo canon, repo shims, repo agents, global defaults, and global agents.
- [x] Task 1.3: Verify tool capability for modular references/import-style composition before assuming shared module loading semantics.

## Phase 2: Codex Bootstrap Repair

- [x] Task 2.1: Fix the Codex subagent mismatch so spawned workers no longer fail on `reasoning.summary`.
- [x] Task 2.2: Validate the fix by spawning at least one Codex subagent successfully.
- [x] Task 2.3: Audit `C:\Users\treyt\.codex\rules\default.rules` and classify it as active global-only or project-relevant.

## Phase 3: Repo Canon And Command Normalization

- [x] Task 3.1: Rewrite root `AGENTS.md` into the approved concise canon structure.
- [x] Task 3.2: Normalize repo compatibility shims (`CLAUDE.md`, `.claude/AGENTS.md`, `.claude/CLAUDE.md`) so they carry no drifting project policy.
- [x] Task 3.3: Normalize repo `.claude/agents/*` to the strict inheritance template.
- [x] Task 3.4: Update repo `.claude/commands/*` to use exact agent IDs and match the normalized repo agent catalog.

## Phase 4: Global Claude And Codex Alignment

- [x] Task 4.1: Normalize global `C:\Users\treyt\.claude\CLAUDE.md` and approved `~/.claude/rules/*` files to defer cleanly to repo canon.
- [x] Task 4.2: Normalize global `~/.claude/agents/*` to the same inheritance skeleton while preserving their role names.
- [x] Task 4.3: Update `C:\Users\treyt\.codex\AGENTS.md` so it clearly defers to repo canon when present.
- [x] Task 4.4: Touch `C:\Users\treyt\.codex\config.toml` only if the schema/support audit proves an additional change is required beyond Task 2.1.

## Phase 5: Walkthrough, Validation, And Close-Out

- [x] Task 5.1: Write `docs/root/AGENT_SETUP.md` with exact resolution order, file map, and safe extension workflow.
- [x] Task 5.2: Run cross-tool smoke checks:
  - repo Claude
  - repo Codex
  - outside-repo Claude
  - outside-repo Codex
  - spawned Codex subagent
- [x] Task 5.3: Run `scripts/sync_agent_config.ps1` validation.
- [x] Task 5.4: Perform a final code-review subagent pass on touched files.
- [x] Task 5.5: Update `docs/root/TUTOR_TODO.md`, `conductor/tracks/GENERAL/log.md`, and `conductor/tracks.md` with final status and commit SHA.

## Subagent Execution Map

- **Docs/process worker**
  - `docs/root/TUTOR_TODO.md`
  - `docs/root/AGENT_SETUP.md`
  - `conductor/tracks.md`
  - `conductor/tracks/GENERAL/log.md`
  - track files
- **Repo agent worker**
  - `AGENTS.md`
  - `CLAUDE.md`
  - `.claude/AGENTS.md`
  - `.claude/CLAUDE.md`
  - `.claude/agents/*`
  - `.claude/commands/*`
- **Global config worker**
  - `C:\Users\treyt\.claude\CLAUDE.md`
  - `C:\Users\treyt\.claude\rules\*`
  - `C:\Users\treyt\.claude\agents\*`
  - `C:\Users\treyt\.codex\AGENTS.md`
  - `C:\Users\treyt\.codex\config.toml`
  - `C:\Users\treyt\.codex\agents\*.toml`
- **Validation/review worker**
  - smoke checks
  - drift validation
  - final review

## Verification Gates

- [x] Codex subagent startup succeeds without `unsupported_parameter: reasoning.summary`.
- [x] Root `AGENTS.md` is the only repo project canon.
- [x] Repo/global Claude agents all contain the standard inheritance header and only role-specific delta beneath it.
- [x] Repo command files reference existing repo agent IDs.
- [x] `docs/root/AGENT_SETUP.md` explains the final setup end-to-end.
- [x] `scripts/sync_agent_config.ps1` passes after the cleanup.

## Verification Summary

- Repo-local Codex role smoke:
  - spawned `explorer` role returned `explorer-ok`
  - spawned `worker` role returned `worker-ok`
- Outside-repo Codex smoke:
  - `codex exec --skip-git-repo-check "Reply with exactly: codex-outside-ok"` -> `codex-outside-ok`
- Outside-repo Claude smoke:
  - `claude -p --output-format text --permission-mode bypassPermissions "Reply with exactly: claude-outside-ok"` -> `claude-outside-ok`
- Repo validation:
  - `scripts/sync_agent_config.ps1 -Mode Check` -> exit code `0`
  - repo/global agent inheritance headers validated across `.claude/agents/*` and `C:\Users\treyt\.claude\agents\*`
  - `.claude/permissions.json` resynced to byte-match root `permissions.json`
- Review:
  - final review subagent attempts hung and were interrupted
  - manual review over the touched config/doc surfaces found no correctness issues after the final validation pass

## Close-Out Notes

- Completed on 2026-03-06.
- Closing commit: `5c7c81d4`
- `C:\Users\treyt\.codex\rules\default.rules` was classified as an active global permissions surface, not a project policy file.
- Root `AGENTS.md` now defines precedence, nested/module override behavior, and repo-local-vs-global collision handling explicitly.

---

_Generated by Conductor Plan._

# Cross-Agent Compatibility Matrix

**Track ID:** trey-agent-repo-readiness_20260313  
**Task:** `T5`  
**Status:** Frozen matrix, runtime proof deferred to `T13`

## Purpose

Freeze the supported-agent contract for the harness so implementation can target one repo-native workflow instead of tool-specific branches.

## Shared repo-local command surface

All supported tools are expected to call the same repo-local harness entrypoint:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode <Bootstrap|Run|Eval|Report> ...
```

Repo-local instructions remain the authority surface. Home-directory glue is secondary.

## Tiers

- `Tier 1`: expected in the first proof pass once harness implementation exists
- `Tier 2`: present on the machine, but deferred until repo-local proof or wiring is stronger

## Matrix

| Tool | Home root present | Repo-local command surface | Required glue today | Shared skill projection | Tier | Notes |
|------|-------------------|----------------------------|---------------------|-------------------------|------|-------|
| Claude | yes | `pwsh -File .\scripts\harness.ps1 ...` | repo root + PowerShell | yes, `C:\Users\treyt\.claude\skills\trey-agent-repo-readiness` | `Tier 1` | primary supported shell-driven tool |
| Codex | yes | `pwsh -File .\scripts\harness.ps1 ...` | repo root + PowerShell | yes, `C:\Users\treyt\.codex\skills\trey-agent-repo-readiness` | `Tier 1` | primary supported shell-driven tool |
| Cursor | yes | `pwsh -File .\scripts\harness.ps1 ...` | repo root + PowerShell | yes, `C:\Users\treyt\.cursor\skills\trey-agent-repo-readiness` | `Tier 1` | command contract must not depend on Cursor-only UX |
| Gemini | yes | `pwsh -File .\scripts\harness.ps1 ...` | repo root + PowerShell | yes, `C:\Users\treyt\.gemini\skills\trey-agent-repo-readiness` | `Tier 1` | shared skill projection confirmed |
| Antigravity | yes | `pwsh -File .\scripts\harness.ps1 ...` | repo root + PowerShell | yes, `C:\Users\treyt\.antigravity\skills\trey-agent-repo-readiness` | `Tier 1` | shared skill projection confirmed |
| OpenCode | yes | `pwsh -File .\scripts\harness.ps1 ...` | repo root + PowerShell | not yet projected under the renamed skill | `Tier 1` | command contract still applies because harness is repo-local and shell-driven |
| Kimi | yes | `pwsh -File .\scripts\harness.ps1 ...` | repo root + PowerShell | not proved in this pass | `Tier 2` | keep pending until repo-local proof is captured |
| Conduit | yes | `pwsh -File .\scripts\harness.ps1 ...` | repo root + PowerShell | not proved in this pass | `Tier 2` | keep pending until repo-local proof is captured |

## Rules frozen by this matrix

- no tool gets a private harness command surface
- the harness must be invocable from a repo shell without relying on tool-private UI actions
- shared skill projection is helpful but not required for harness correctness if the repo-local command surface is stable
- `Tier 1` proof must be stored later as artifacts or transcripts in `T13`
- `Tier 2` tools are not blockers for the first implementation wave

## Verification record

`T5` is considered complete when this contract remains true:

- each row names the same repo-local command surface
- each row states the required glue explicitly
- the matrix distinguishes first-pass blockers from deferred tools
- the matrix does not assume repo-local proof that was not actually gathered in this planning pass

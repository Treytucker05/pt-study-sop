# Cross-Agent Compatibility Matrix

**Track ID:** trey-agent-repo-readiness_20260313  
**Task:** `T5`  
**Status:** Revised after `T13` runtime proof

## Purpose

Freeze the supported-agent contract for the harness so implementation can target one repo-native workflow instead of tool-specific branches.

## Shared repo-local command surface

All supported tools are expected to call the same repo-local harness entrypoint:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode <Bootstrap|Run|Eval|Report> ...
```

Accepted equivalent:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode <Bootstrap|Run|Eval|Report> ...
```

Repo-local instructions remain the authority surface. Home-directory glue is secondary.

## Tiers

- `Tier 1`: headless proof captured in `T13`
- `Tier 2`: present on the machine, but deferred until repo-local proof or wiring is stronger

## Matrix

| Tool | Home root present | Repo-local command surface | Required glue today | Shared skill projection | Tier | Notes |
|------|-------------------|----------------------------|---------------------|-------------------------|------|-------|
| Claude | yes | `powershell -File .\scripts\harness.ps1 ...` or `pwsh -File .\scripts\harness.ps1 ...` | repo root + PowerShell | yes, `C:\Users\treyt\.claude\skills\trey-agent-repo-readiness` | `Tier 1` | headless proof captured in `t13-cross-agent-proof.md`; returned the `pwsh` equivalent |
| Codex | yes | `powershell -File .\scripts\harness.ps1 ...` or `pwsh -File .\scripts\harness.ps1 ...` | repo root + PowerShell | yes, `C:\Users\treyt\.codex\skills\trey-agent-repo-readiness` | `Tier 1` | headless proof captured in `t13-cross-agent-proof.md` |
| Gemini | yes | `powershell -File .\scripts\harness.ps1 ...` or `pwsh -File .\scripts\harness.ps1 ...` | repo root + PowerShell | yes, `C:\Users\treyt\.gemini\skills\trey-agent-repo-readiness` | `Tier 1` | headless proof captured in `t13-cross-agent-proof.md` |
| OpenCode | yes | `powershell -File .\scripts\harness.ps1 ...` or `pwsh -File .\scripts\harness.ps1 ...` | repo root + PowerShell | not yet projected under the renamed skill | `Tier 1` | headless proof captured in `t13-cross-agent-proof.md` |
| Cursor | yes | same repo-local harness command after agent launch | repo root + PowerShell + editor-hosted agent surface | yes, `C:\Users\treyt\.cursor\skills\trey-agent-repo-readiness` | `Tier 2` | local CLI exposes `cursor agent`, but a reproducible headless `cursor-agent` shim was not available on `PATH` during `T13` |
| Antigravity | yes | same repo-local harness command after app launch | repo root + PowerShell + GUI/editor-hosted surface | yes, `C:\Users\treyt\.antigravity\skills\trey-agent-repo-readiness` | `Tier 2` | installed CLI exposes editor/window/MCP operations only; no promptable headless agent surface was captured during `T13` |
| Kimi | yes | `powershell -File .\scripts\harness.ps1 ...` or `pwsh -File .\scripts\harness.ps1 ...` | repo root + PowerShell | not proved in this pass | `Tier 2` | keep pending until repo-local proof is captured |
| Conduit | yes | `powershell -File .\scripts\harness.ps1 ...` or `pwsh -File .\scripts\harness.ps1 ...` | repo root + PowerShell | not proved in this pass | `Tier 2` | keep pending until repo-local proof is captured |

## Rules frozen by this matrix

- no tool gets a private harness command surface
- the harness must be invocable from a repo shell without relying on tool-private UI actions
- shared skill projection is helpful but not required for harness correctness if the repo-local command surface is stable
- `Tier 1` proof is stored in `t13-cross-agent-proof.md`
- `Tier 2` tools are not blockers for the first implementation wave

## Verification record

`T5` is considered complete when this contract remains true:

- each row names the same repo-local command surface
- each row states the required glue explicitly
- the matrix distinguishes first-pass blockers from deferred tools
- the matrix does not assume repo-local proof that was not actually gathered in this planning pass

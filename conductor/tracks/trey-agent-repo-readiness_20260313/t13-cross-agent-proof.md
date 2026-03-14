# T13 Cross-Agent Harness Proof

**Track ID:** trey-agent-repo-readiness_20260313  
**Task:** `T13`  
**Status:** Complete

## Goal

Prove which installed agent tools on this machine can reliably identify and use
the same repo-local harness surface without introducing tool-private commands.

## Shared command under proof

Canonical Windows form:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Bootstrap -Profile Hermetic -Json
```

Accepted equivalent:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Bootstrap -Profile Hermetic -Json
```

## Prompt used for headless tools

```text
Using only repo-local truth in C:\pt-study-sop, return strict JSON with keys
tool, hermetic_bootstrap_command, basis. hermetic_bootstrap_command must be the
exact repo-local command to validate hermetic harness prerequisites. basis must
be a short array naming the repo files you relied on.
```

## Proof results

| Tool | Proof class | Invocation / evidence | Result |
|------|-------------|-----------------------|--------|
| Codex | headless CLI prompt | `codex exec -C C:\pt-study-sop --sandbox read-only ...` | returned `powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\harness.ps1 -Mode Bootstrap -Profile Hermetic -Json` with basis `docs/root/GUIDE_DEV.md`, `scripts/README.md`, `scripts/harness.ps1` |
| Claude | headless CLI prompt | `claude -p --model sonnet --output-format json ...` | returned the same surface in `pwsh` form with basis `scripts/harness.ps1`, `brain/tests/test_harness_bootstrap.py`, `conductor/tracks/trey-agent-repo-readiness_20260313/contract-harness-command-surface.md`, `brain/tests/fixtures/harness/manifest.json` |
| Gemini | headless CLI prompt | `gemini -m gemini-2.5-flash -p ... --output-format json` | returned `powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\harness.ps1 -Mode Bootstrap -Profile Hermetic -Json` with basis `AGENTS.md`, `docs/root/GUIDE_DEV.md`, `scripts/harness.ps1` |
| OpenCode | headless CLI prompt | `opencode run --format json ...` | returned `powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\harness.ps1 -Mode Bootstrap -Profile Hermetic -Json` with basis `docs/root/GUIDE_DEV.md`, `AGENTS.md`, `README.md` |
| Cursor | editor-hosted terminal agent, headless proof pending | local `cursor --help` shows `agent` as a terminal entrypoint; official Cursor docs expose `cursor-agent "your prompt here"` | the current machine does not expose a reproducible `cursor-agent` shim on `PATH`, so no comparable headless transcript was captured in this pass |
| Antigravity | GUI/editor CLI only, headless proof pending | local `antigravity --help` only exposes window/editor management, extension management, and MCP configuration | no promptable terminal agent or chat subcommand was exposed by the installed CLI, so no comparable headless transcript was captured in this pass |

## Stored transcript excerpts

Codex:

```json
{"tool":"scripts/harness.ps1","hermetic_bootstrap_command":"powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\harness.ps1 -Mode Bootstrap -Profile Hermetic -Json","basis":["docs/root/GUIDE_DEV.md","scripts/README.md","scripts/harness.ps1"]}
```

Claude:

```json
{"tool":"pwsh","hermetic_bootstrap_command":"pwsh -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\harness.ps1 -Mode Bootstrap -Profile Hermetic -Json","basis":["scripts/harness.ps1","brain/tests/test_harness_bootstrap.py","conductor/tracks/trey-agent-repo-readiness_20260313/contract-harness-command-surface.md","brain/tests/fixtures/harness/manifest.json"]}
```

Gemini:

```json
{"tool":"run_shell_command","hermetic_bootstrap_command":"powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\harness.ps1 -Mode Bootstrap -Profile Hermetic -Json","basis":["AGENTS.md","docs/root/GUIDE_DEV.md","scripts/harness.ps1"]}
```

OpenCode:

```json
{"tool":"scripts/harness.ps1","hermetic_bootstrap_command":"powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\harness.ps1 -Mode Bootstrap -Profile Hermetic -Json","basis":["docs/root/GUIDE_DEV.md","AGENTS.md","README.md"]}
```

Cursor launcher evidence:

- local CLI help: `cursor --help` -> `agent        Start the Cursor agent in your terminal.`
- official docs: `https://docs.cursor.com/en/cli/command-line`

Antigravity launcher evidence:

- local CLI help: `antigravity --help` -> no promptable agent/chat subcommand, only editor/window/MCP management plus `chat` is absent

## Decision

- `Tier 1` headless proof now covers: `Codex`, `Claude`, `Gemini`, `OpenCode`
- `Tier 2` pending proof now covers: `Cursor`, `Antigravity`, `Kimi`, `Conduit`

This is a correction to the earlier frozen matrix, not a regression in the repo
contract. The shared repo-local harness surface is stable; the remaining gap is
tool-launch reproducibility on this machine.

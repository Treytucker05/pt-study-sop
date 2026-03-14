# Security Audit

**Track ID:** agent-ecosystem-hygiene_20260313  
**Recorded:** 2026-03-13

## Scan Scope

Audited config and fallback surfaces:

- `C:\Users\treyt\.agents\README.md`
- `C:\Users\treyt\.claude\CLAUDE.md`
- `C:\Users\treyt\.claude\rules\agents.md`
- `C:\Users\treyt\.codex\AGENTS.md`
- `C:\Users\treyt\.codex\config.toml`
- `C:\Users\treyt\.cursor\mcp.json`
- `C:\Users\treyt\.gemini\GEMINI.md`
- `C:\Users\treyt\.gemini\settings.json`
- `C:\Users\treyt\.gemini\antigravity\mcp_config.json`
- `C:\Users\treyt\.antigravity\argv.json`
- `C:\Users\treyt\.kimi\config.toml`
- `C:\Users\treyt\.conduit\config.toml`

## Redacted Findings

- `C:\Users\treyt\.gemini\antigravity\mcp_config.json`
  - line `10`: `GITHUB_PERSONAL_ACCESS_TOKEN` stored inline
  - line `44`: `OBSIDIAN_API_KEY` stored inline
- No other in-scope config or fallback file contained a non-empty plaintext secret field under the audit regex.

## Chosen Injection Path

- Move `GITHUB_PERSONAL_ACCESS_TOKEN` to a user-scoped environment variable.
- Move `OBSIDIAN_API_KEY` to a user-scoped environment variable.
- Keep `OBSIDIAN_HOST` and `OBSIDIAN_PORT` inline because they are not secrets.
- Remove the inline secret fields from `C:\Users\treyt\.gemini\antigravity\mcp_config.json` so the launcher must rely on inherited environment instead of file-stored credentials.

## Rationale

- This preserves the existing MCP server names and command paths.
- It removes plaintext credentials from the config file without introducing another plaintext secrets file.
- It is the least invasive option available locally without changing the Antigravity/Gemini MCP contract.
- The launcher likely needs a restart after the environment-variable change so new child processes inherit the updated values.

## Relevant Notes

- A user-scoped `GITHUB_PERSONAL_ACCESS_TOKEN` already existed with a different stored length than the inline config value; to preserve the currently working config behavior, the file-backed value should replace the stale user-env value during the patch step.
- The rollback bundle intentionally contains a pre-patch copy of `mcp_config.json`; that backup remains sensitive until the exposed credentials are rotated.

## Post-Patch Verification

- User-scoped environment variables now exist for:
  - `GITHUB_PERSONAL_ACCESS_TOKEN`
  - `OBSIDIAN_API_KEY`
- Post-patch redacted secret scan over the same config/fallback scope returned `0` findings.
- Patched `C:\Users\treyt\.gemini\antigravity\mcp_config.json` now keeps:
  - `github.env = {}`
  - `obsidian.env = { OBSIDIAN_HOST, OBSIDIAN_PORT }`
- Smoke checks:
  - GitHub MCP command startup with env-backed token: passed (`GitHub MCP Server running on stdio`)
  - Obsidian MCP command startup on the quarantined embedded config: failed with `Usage: mcp-obsidian <vault-directory>`

Interpretation:

- The secret-removal patch itself succeeded.
- The Obsidian startup failure is a separate legacy-command-contract issue inside the quarantined embedded subtree, not proof that the env-based secret injection failed for the supported active surfaces.

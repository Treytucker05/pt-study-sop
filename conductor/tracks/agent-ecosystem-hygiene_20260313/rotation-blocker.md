# Rotation Blocker

**Track ID:** agent-ecosystem-hygiene_20260313  
**Recorded:** 2026-03-13

## Status

- Plaintext credentials were removed from the in-scope active/legacy config file that stored them.
- The exposed credentials themselves are still presumed compromised until they are rotated.
- Rotation could not be completed automatically from this environment because it requires operator access to GitHub token management and the Obsidian API-key issuance flow.

## Affected Credentials

- GitHub personal access token previously stored in `C:\Users\treyt\.gemini\antigravity\mcp_config.json`
- Obsidian API key previously stored in `C:\Users\treyt\.gemini\antigravity\mcp_config.json`

## Required Operator Actions

1. Revoke or rotate the exposed GitHub personal access token.
2. Generate a fresh Obsidian API key for the local Obsidian MCP workflow.
3. Update the user-scoped environment variables:
   - `GITHUB_PERSONAL_ACCESS_TOKEN`
   - `OBSIDIAN_API_KEY`
4. Restart any Gemini / Antigravity processes that launch MCP servers so they inherit the updated environment.
5. Decide whether to keep or delete the pre-patch backup copy of `mcp_config.json` under `C:\Users\treyt\.agents\backups\agent-ecosystem-hygiene_20260313\config-files\.gemini\antigravity\`.

## Verification After Rotation

- Re-run the redacted config scan and confirm it still returns `0` findings.
- Re-run the GitHub MCP startup smoke and confirm it still starts on stdio.
- If the embedded Obsidian path will ever be reactivated, fix its command contract first because the current legacy config fails with `Usage: mcp-obsidian <vault-directory>`.

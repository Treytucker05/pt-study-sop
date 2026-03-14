# Gemini Embedded Quarantine

**Track ID:** agent-ecosystem-hygiene_20260313  
**Recorded:** 2026-03-13

## Quarantined Roots

- `C:\Users\treyt\.gemini\antigravity\skills`
- `C:\Users\treyt\.gemini\antigravity\global_skills`

## Execution Result

- The repaired `scripts/sync_agent_skills.ps1` targets only the supported active projection set:
  - `C:\Users\treyt\.claude\skills`
  - `C:\Users\treyt\.codex\skills`
  - `C:\Users\treyt\.cursor\skills`
  - `C:\Users\treyt\.opencode\skills`
  - `C:\Users\treyt\.gemini\skills`
  - `C:\Users\treyt\.antigravity\skills`
- The embedded Gemini Antigravity roots were intentionally excluded from the supported-root `DryRun`, `Apply`, and `Check` sequence.
- The supported-root broken-junction scan was also limited to the six supported active roots above and passed with `0` broken junctions in each root.

## Why This Counts As Execution

- The embedded roots are no longer part of the active sync contract.
- They are no longer part of the active health gate for shared-skill projections.
- They were captured in the rollback bundle before any supported-root mutation, so they can be revisited later without losing state.

## Remaining Follow-Up

- `C:\Users\treyt\.gemini\antigravity\mcp_config.json` remains in scope for the security phase because it contains plaintext credentials.
- If future runtime proof shows the embedded roots are actively consumed, they need a separate normalization track rather than being silently folded back into the supported mirror.

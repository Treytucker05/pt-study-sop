# Decision Record: Supported Topology Freeze

**Track ID:** agent-ecosystem-hygiene_20260313  
**Recorded:** 2026-03-13

## Decision

Use `C:\Users\treyt\.agents\skills` as the single canonical shared-skill upstream and treat the following roots as the supported active projection set that should mirror the canonical catalog, while preserving documented tool-local exceptions:

- `C:\Users\treyt\.claude\skills`
- `C:\Users\treyt\.codex\skills`
- `C:\Users\treyt\.cursor\skills`
- `C:\Users\treyt\.opencode\skills`
- `C:\Users\treyt\.gemini\skills`
- `C:\Users\treyt\.antigravity\skills`

## Preserved Local Exceptions

- Claude local roots:
  - `C:\Users\treyt\.claude\skills\continuous-learning`
  - `C:\Users\treyt\.claude\skills\learned`
- Codex local roots:
  - `C:\Users\treyt\.codex\skills\.system`
  - `C:\Users\treyt\.codex\skills\agent-skills`
  - `C:\Users\treyt\.codex\skills\dev-browser`
- Cursor local root:
  - `C:\Users\treyt\.cursor\skills-cursor`
- OpenCode local roots:
  - `C:\Users\treyt\.opencode\skills\agent-strategy`
  - `C:\Users\treyt\.opencode\skills\ensure-agent-workflow`

These roots are preserved as tool-local surfaces and are not part of the shared projection mirror set.

## Config-Only Tools

- `C:\Users\treyt\.kimi\config.toml`
- `C:\Users\treyt\.conduit\config.toml`

These tools stay out of shared-skill sync because runtime evidence showed no supported `skills` or `agents` roots for either one.

## Quarantined Legacy Surface

- `C:\Users\treyt\.gemini\antigravity\skills`
- `C:\Users\treyt\.gemini\antigravity\global_skills`

Rationale:

- the embedded subtree points outward to standalone `.antigravity` and `.claude` paths
- no direct runtime proof was found that Gemini's main extension manifests load those embedded skill roots
- the embedded roots carry a high broken-link rate and should not be folded into the supported mirror until active usage is proven

## Policy Consequences

- Shared-skill sync must target the supported projection set above and preserve the documented local exceptions.
- `scripts/sync_agent_skills.ps1` must stop treating Kimi as a skill consumer and must stop treating `C:\Users\treyt\.cursor\skills-cursor` as a shared projection root.
- `scripts/sync_agent_skills.ps1` must include Gemini and OpenCode as supported projection roots.
- Supported projection roots should converge toward the full canonical catalog, not a stale subset.
- Antigravity and Gemini main roots should be repaired against the canonical upstream instead of carrying legacy names indefinitely.

## Fallback / Config Surfaces That Remain In Scope

- `C:\Users\treyt\.claude\CLAUDE.md`
- `C:\Users\treyt\.claude\rules\agents.md`
- `C:\Users\treyt\.codex\AGENTS.md`
- `C:\Users\treyt\.codex\config.toml`
- `C:\Users\treyt\.cursor\mcp.json`
- `C:\Users\treyt\.gemini\GEMINI.md`
- `C:\Users\treyt\.gemini\settings.json`
- `C:\Users\treyt\.gemini\antigravity\mcp_config.json`
- `C:\Users\treyt\.kimi\config.toml`
- `C:\Users\treyt\.conduit\config.toml`

`GEMINI.md` stays in scope because installed Gemini extensions explicitly declare it as their `contextFileName`.

## Review Checklist

- [x] decision matrix cross-checked against `evidence.md`
- [x] supported active roots listed explicitly
- [x] local exceptions listed explicitly
- [x] config-only tools excluded explicitly
- [x] Gemini embedded subtree disposition recorded explicitly
- [x] sync-script target consequences recorded explicitly

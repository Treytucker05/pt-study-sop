# Skills Inventory

Date: 2026-03-25
Purpose: document the current shared-skill topology after the `agent-ecosystem-hygiene_20260313` repair pass and the shared `dev-browser` promotion.

## 1. Canonical Upstream

- Canonical shared root: `C:\Users\treyt\.agents\skills`
- Current upstream shape:
  - `35` directories total
  - `33` valid shared skill packages with `SKILL.md`
  - `2` malformed non-package directories:
    - `artifacts-builder`
    - `ui-ux-pro-max`

Rule:

- Only directories with `SKILL.md` count as valid shared skill packages for projection/sync.
- Do not delete or archive shared upstream entries blindly; repair projection drift first and review upstream cleanup separately.

## 2. Supported Projection Roots

These roots are the supported active shared-skill consumers and should mirror the valid canonical packages while preserving their documented local exceptions.

| Root | Current State | Local Exceptions |
|---|---|---|
| `C:\Users\treyt\.codex\skills` | `33` shared junctions, `0` broken | see `scripts/sync_agent_skills.ps1` `LocalOnlyNames.codex`; `dev-browser` is now shared |
| `C:\Users\treyt\.claude\skills` | `33` shared junctions, `0` broken | `continuous-learning`, `learned` |
| `C:\Users\treyt\.cursor\skills` | `33` shared junctions, `0` broken | none in this root; Cursor-local skills live in `C:\Users\treyt\.cursor\skills-cursor` |
| `C:\Users\treyt\.opencode\skills` | `33` shared junctions, `0` broken | `agent-strategy`, `ensure-agent-workflow` |
| `C:\Users\treyt\.gemini\skills` | `33` shared junctions, `0` broken | none |
| `C:\Users\treyt\.antigravity\skills` | `33` shared junctions, `0` broken | none |
| `C:\Users\treyt\.kimi\skills` | `33` shared junctions, `0` broken | none |

## 3. Tool-Local And Non-Projection Surfaces

Shared-skill sync does **not** own these surfaces:

- `C:\Users\treyt\.cursor\skills-cursor`
  - Cursor-local skill packages:
    - `create-rule`
    - `create-skill`
    - `create-subagent`
    - `migrate-to-skills`
    - `update-cursor-settings`
- `C:\Users\treyt\.kimi`
  - config-only
  - no supported `skills` or `agents` root on this machine
- `C:\Users\treyt\.conduit`
  - config-only
  - no supported `skills` or `agents` root on this machine

## 4. Quarantined Legacy Surface

These paths are intentionally excluded from the active shared-skill mirror and health gate:

- `C:\Users\treyt\.gemini\antigravity\skills`
- `C:\Users\treyt\.gemini\antigravity\global_skills`

Reason:

- no direct runtime proof was found that Gemini's main extension manifests load them as active first-class shared-skill roots
- the embedded subtree points outward to standalone `.antigravity` / `.claude` paths
- the subtree carries high broken-link drift and needs a separate reactivation decision if it is ever brought back

## 5. Config / Fallback Surfaces In Scope

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

Security note:

- `C:\Users\treyt\.gemini\antigravity\mcp_config.json` no longer stores plaintext secrets inline.
- Credential rotation is still required and tracked in `conductor/tracks/agent-ecosystem-hygiene_20260313/rotation-blocker.md`.

## 6. Sync And Validation Workflow

Primary sync commands:

- `powershell -ExecutionPolicy Bypass -File scripts/sync_agent_skills.ps1 -Mode DryRun`
- `powershell -ExecutionPolicy Bypass -File scripts/sync_agent_skills.ps1 -Mode Apply`
- `powershell -ExecutionPolicy Bypass -File scripts/sync_agent_skills.ps1 -Mode Check`

Fixture harness:

- `powershell -ExecutionPolicy Bypass -File scripts/test_sync_agent_skills_fixture.ps1`

Expected post-sync validation state:

- every supported projection root listed in section 2 shows `0` broken junctions
- documented local exceptions remain in place, and shared `dev-browser` projects into every supported root
- Kimi and Conduit stay out of shared-skill sync
- the Gemini embedded Antigravity subtree stays out of the supported health gate

## 7. Guardrails

- Treat `C:\Users\treyt\.agents\skills` as the shared upstream until a new canonical source is explicitly adopted.
- Preserve the documented local exceptions when repairing shared projections.
- Do not silently promote local-only tool packages into the shared upstream.
- Shared `dev-browser` is no longer a Codex-only local exception; keep it in the canonical shared root.
- Do not reactivate the embedded Gemini Antigravity skill roots without fresh runtime proof.

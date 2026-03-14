# Evidence: Agent Ecosystem Hygiene

**Track ID:** agent-ecosystem-hygiene_20260313  
**Captured:** 2026-03-13

## Canonical Upstream

- Canonical shared-skill root: `C:\Users\treyt\.agents\skills`
- Current canonical skill count: `83`
- Declared shared-skill contract source: `C:\Users\treyt\.agents\README.md`

## Tool Matrix

| Tool | Skill Surface | Agent / Config Surface | Health | Evidence Notes |
|---|---|---|---|---|
| Claude | `C:\Users\treyt\.claude\skills` | `C:\Users\treyt\.claude\agents\` (9 files), `C:\Users\treyt\.claude\CLAUDE.md`, `C:\Users\treyt\.claude\rules\agents.md` | `84` entries, `82` shared junctions, `0` broken | Healthy shared consumer with two Claude-local directories: `continuous-learning`, `learned`. Missing canonical `treys-swarm-planner`. |
| Codex | `C:\Users\treyt\.codex\skills` | `C:\Users\treyt\.codex\agents\` (3 TOMLs), `C:\Users\treyt\.codex\AGENTS.md`, `C:\Users\treyt\.codex\config.toml` | `85` entries, `82` shared junctions, `0` broken | Healthy shared consumer with local exceptions `.system`, `agent-skills`, `dev-browser`. Missing canonical `treys-swarm-planner`. |
| Cursor | `C:\Users\treyt\.cursor\skills` plus `C:\Users\treyt\.cursor\skills-cursor` | `C:\Users\treyt\.cursor\mcp.json` | `80` shared junctions, `0` broken; `5` Cursor-local skills | Healthy projection root, but missing canonical `artifacts-builder`, `treys-swarm-planner`, and `ui-ux-pro-max`. Cursor is an active shared-skill consumer even though the shared README omits it. |
| OpenCode | `C:\Users\treyt\.opencode\skills` | home contains `package.json`, `package-lock.json`, `bun.lock`, `node_modules` | `21` entries, `19` shared junctions, `0` broken | Active skill root with two OpenCode-local directories: `agent-strategy`, `ensure-agent-workflow`. Missing `64` canonical shared skills relative to `.agents\\skills`. |
| Antigravity | `C:\Users\treyt\.antigravity\skills` | `C:\Users\treyt\.antigravity\argv.json`, external extension root under `C:\Users\treyt\.antigravity\extensions\` | `122` junctions, `41` broken | Active root is heavily drifted. Missing canonical `trey-autoresearch` and `treys-swarm-planner`, while carrying `41` legacy names no longer present upstream. |
| Kimi | no `skills` or `agents` dir found | `C:\Users\treyt\.kimi\config.toml` | config-only | `config.toml` defines model/provider/search/MCP settings and no shared-skill surface. |
| Conduit | no `skills` or `agents` dir found | `C:\Users\treyt\.conduit\config.toml` | config-only | Conduit home contains `config.toml`, `conduit.db`, and `logs`; no shared-skill projection found. |
| Gemini | `C:\Users\treyt\.gemini\skills` | `C:\Users\treyt\.gemini\GEMINI.md`, `C:\Users\treyt\.gemini\settings.json`, embedded subtree under `C:\Users\treyt\.gemini\antigravity\` | `21` junctions, `21` broken | Active Gemini skill root is a stale legacy projection rather than a canonical mirror. Gemini gets a dedicated section below. |

## Name-Level Drift Against Canonical Upstream

- Claude missing canonical names: `treys-swarm-planner`
- Codex missing canonical names: `treys-swarm-planner`
- Cursor missing canonical names: `artifacts-builder`, `treys-swarm-planner`, `ui-ux-pro-max`
- OpenCode missing canonical names: `64` total; keeps only a small subset of the canonical shared catalog plus two local directories
- Antigravity missing canonical names: `trey-autoresearch`, `treys-swarm-planner`
- Antigravity extra legacy names: `41` total, including `agent-claude-code`, `agent-langgraph`, `agent-md-refactor`, `agents-md`, `orchestrating-swarms`, `create-rule`, `create-subagent`, `update-cursor-settings`
- Gemini missing canonical names: effectively the full current shared catalog; its `21` entries are all legacy names no longer present upstream

## Gemini-Specific Proof

### Main Gemini surfaces

- `C:\Users\treyt\.gemini\skills`
  - exists
  - `21` junctions
  - `21` broken targets
  - current names are a legacy subset such as `agent-strategy`, `draw-io`, `jira`, `mui`, `web-to-markdown`
- `C:\Users\treyt\.gemini\GEMINI.md`
  - exists
  - file length `0`
- `C:\Users\treyt\.gemini\settings.json`
  - exists
  - configured Gemini settings surface

### `GEMINI.md` consumption proof

- `C:\Users\treyt\.gemini\extensions\conductor\gemini-extension.json` declares `"contextFileName": "GEMINI.md"`.
- `C:\Users\treyt\.gemini\extensions\maestro\gemini-extension.json` also declares `"contextFileName": "GEMINI.md"`.
- The installed Maestro docs repeatedly describe `GEMINI.md` as the orchestrator context.

Conclusion:

- `GEMINI.md` is an actively consumed surface and cannot be treated as dead weight.
- The current empty file is therefore a real mismatch, not harmless clutter.

### Embedded Antigravity subtree

- `C:\Users\treyt\.gemini\antigravity\skills`
  - `8` junctions
  - `1` broken target: `orchestrating-swarms`
- `C:\Users\treyt\.gemini\antigravity\global_skills`
  - `50` junctions
  - `30` broken targets
- `C:\Users\treyt\.gemini\antigravity\mcp_config.json`
  - references external filesystem roots under `C:\Users\treyt\.claude` and `C:\Users\treyt\.antigravity`
  - points its `pencil` server command at `C:\Users\treyt\.antigravity\extensions\...`
  - contains inline `GITHUB_PERSONAL_ACCESS_TOKEN` and `OBSIDIAN_API_KEY` values in plaintext

### Embedded subtree interpretation

- The embedded MCP config points outward to the standalone Antigravity and Claude homes rather than to `C:\Users\treyt\.gemini\antigravity\skills` or `global_skills`.
- No direct Gemini extension manifest or settings proof was found that the main Gemini CLI loads the embedded `skills` or `global_skills` directories as active first-class roots.
- The embedded skill roots still exist and are traversable, but the available runtime proof supports treating them as a separate embedded/legacy Antigravity bundle rather than part of Gemini's main active shared-skill surface.

## Drift In Shared Docs And Sync Automation

- `C:\Users\treyt\.agents\README.md`
  - still lists Claude, Codex, OpenCode, Antigravity, and Gemini as consumers
  - omits Cursor even though Cursor has a healthy shared-skill projection
  - documents OpenCode at `~/.config/opencode/skills/{name}`, but the active Windows path is `C:\Users\treyt\.opencode\skills\{name}`
- `scripts/sync_agent_skills.ps1`
  - currently targets Codex, Claude, Kimi, Cursor, `skills-cursor`, and Antigravity
  - omits Gemini and OpenCode
  - assumes `C:\Users\treyt\.kimi\skills` exists even though Kimi is config-only on this machine

## Evidence Review Checklist

- [x] Claude reviewed
- [x] Codex reviewed
- [x] Cursor reviewed
- [x] OpenCode reviewed
- [x] Antigravity reviewed
- [x] Kimi reviewed
- [x] Conduit reviewed
- [x] Gemini main root reviewed
- [x] Gemini embedded subtree reviewed
- [x] `GEMINI.md` consumption proof captured
- [x] shared README drift captured
- [x] sync-script drift captured

## Relevant Notes

- `git diff --check` on the already-dirty `conductor/tracks/GENERAL/log.md` currently reports pre-existing whitespace issues outside this track's new kickoff block; that repo hygiene issue is separate from the topology evidence collected here.

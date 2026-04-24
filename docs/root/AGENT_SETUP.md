# Agent Setup

## Purpose

This repo uses one project canon plus thin compatibility layers.
All LLM tools should treat `C:\pt-study-sop\AGENTS.md` as the master project instruction file when this repo is active.
All repo-local product/system truth should be taken from `C:\pt-study-sop\README.md`.

- Project canon: `C:\pt-study-sop\AGENTS.md`
- Repo compatibility files: `CLAUDE.md`, `.claude/AGENTS.md`, `.claude/CLAUDE.md`
- Repo-local Claude agents: `.claude/agents/*`
- Repo-local Claude commands: `.claude/commands/*`
- Global Claude defaults: `C:\Users\treyt\.claude\CLAUDE.md`, `C:\Users\treyt\.claude\rules\*`, `C:\Users\treyt\.claude\agents\*`
- Global Codex defaults: `C:\Users\treyt\.codex\AGENTS.md`, `C:\Users\treyt\.codex\config.toml`, `C:\Users\treyt\.codex\agents\*.toml`, `C:\Users\treyt\.codex\rules\default.rules`
- Global Gemini defaults: `C:\Users\treyt\.gemini\GEMINI.md`, `C:\Users\treyt\.gemini\settings.json`
- Global Hermes defaults: `C:\Users\treyt\.hermes\config.yaml`, `C:\Users\treyt\.hermes\SOUL.md`
- Multi-agent coordination board: `docs/root/AGENT_BOARD.md`

## Coordination Surfaces

- `README.md`: top-level repo truth
- `docs/root/TUTOR_TODO.md`: active sprint and scope-claim board
- `docs/root/AGENT_BOARD.md`: live multi-agent ownership and handoff surface
- `docs/root/SKILLS_INVENTORY.md`: grouped view of the shared skill ecosystem and cleanup buckets
- `conductor/tracks.md`: active/completed track registry
- `conductor/tracks/GENERAL/log.md`: chronological audit trail

## Shared Skill Topology (2026-03-13)

Canonical shared upstream:

- `C:\Users\treyt\.agents\skills`

Supported active projection roots:

- `C:\Users\treyt\.codex\skills`
- `C:\Users\treyt\.claude\skills`
- `C:\Users\treyt\.cursor\skills`
- `C:\Users\treyt\.opencode\skills`
- `C:\Users\treyt\.gemini\skills`
- `C:\Users\treyt\.antigravity\skills`
- `C:\Users\treyt\.kimi\skills`
- `C:\Users\treyt\.hermes\skills`

Documented local exceptions:

- Codex: see `scripts/sync_agent_skills.ps1` `LocalOnlyNames.codex` for the current local-only allowlist; `dev-browser` is now a shared skill projected from `C:\Users\treyt\.agents\skills`; `codex-primary-runtime` is preserved as Codex-local plugin/runtime material
- Claude: `continuous-learning`, `learned`
- Cursor: `C:\Users\treyt\.cursor\skills-cursor`
- OpenCode: `agent-strategy`, `ensure-agent-workflow`
- Hermes: 113 bundled skills preserved as local-only; see `scripts/sync_agent_skills.ps1` `LocalOnlyNames.hermes` for the full allowlist

Excluded from shared-skill sync:
- `C:\Users\treyt\.conduit` (config-only)
- `C:\Users\treyt\.gemini\antigravity\skills`
- `C:\Users\treyt\.gemini\antigravity\global_skills`

Validation commands for this topology:

- `powershell -ExecutionPolicy Bypass -File scripts/sync_agent_skills.ps1 -Mode Check`
- `powershell -ExecutionPolicy Bypass -File scripts/test_sync_agent_skills_fixture.ps1`

## Resolution Order

### 1. Project canon always wins

If the active repo has a root `AGENTS.md`, use that file as the only project-specific policy source.

### 2. Nested/module `AGENTS.md` files are scoped overrides

If a subdirectory later gets its own `AGENTS.md`, it overrides repo-root instructions only for files inside that subtree. It still sits above home-directory defaults because it is repo-local canon.

### 3. Repo compatibility files only point back to canon

`CLAUDE.md`, `.claude/AGENTS.md`, and `.claude/CLAUDE.md` exist for tool compatibility only. They should never become separate policy sources.

### 4. Repo-local agents apply role-specific delta only

Files under `.claude/agents/*` are allowed to define role behavior, but they must first read root `AGENTS.md` and only add a narrow role-specific delta.

### 5. Global defaults are cross-project only

`C:\Users\treyt\.claude\*`, `C:\Users\treyt\.codex\*`, `C:\Users\treyt\.gemini\*`, and `C:\Users\treyt\.hermes\*` are reusable defaults. They must defer to the repo canon whenever this project is active.

When those fallback defaults do apply, they should still start from user intent first: find the best way to accomplish what the user wants, present tradeoffs without substituting agent preference, and avoid assuming the user is unaware of the tradeoffs they are choosing.

### 6. Repo-local agents beat global agents

If a repo-local agent name overlaps with a global agent name, the repo-local one is the active definition for this project.

## Exact Search Order

1. Active repo root `AGENTS.md`
2. Nearest nested/module `AGENTS.md` that applies to the current file or task scope
3. Repo compatibility files only when a tool requires them (`CLAUDE.md`, `.claude/AGENTS.md`, `.claude/CLAUDE.md`)
4. Explicitly invoked repo-local agents under `.claude/agents/*`
5. Tool-specific global defaults only as fallback/runtime surfaces (`C:\Users\treyt\.claude\CLAUDE.md`, `C:\Users\treyt\.claude\rules\*`, `C:\Users\treyt\.codex\AGENTS.md`, `C:\Users\treyt\.codex\config.toml`, `C:\Users\treyt\.gemini\GEMINI.md`, `C:\Users\treyt\.gemini\settings.json`, `C:\Users\treyt\.hermes\config.yaml`, `C:\Users\treyt\.hermes\SOUL.md`)
6. Global reusable agents (`C:\Users\treyt\.claude\agents\*`)

Rule:

- If root `AGENTS.md` exists, do not treat home-directory Claude/Codex instruction files as additional project canon.
- Global tool files may still supply fallback or runtime defaults, but project instruction authority stays at repo root.

Collision rule:

- Match by frontmatter `name` first.
- If frontmatter is absent, fall back to filename.
- If repo-local and global agents still collide, the repo-local agent wins.

## Current Shape

| Surface | Purpose | Allowed to contain project policy? |
|---|---|---|
| `AGENTS.md` | Project canon | Yes |
| nested/module `AGENTS.md` | Scoped repo canon override | Yes, but only for that subtree |
| `CLAUDE.md` | Repo compatibility entrypoint | No |
| `.claude/AGENTS.md` / `.claude/CLAUDE.md` | Tool shims | No |
| `.claude/agents/*` | Repo-local role deltas | Only role-specific delta after reading canon |
| `.claude/commands/*` | Command aliases/workflows | No independent policy |
| `C:\Users\treyt\.claude\CLAUDE.md` | Global Claude defaults | No |
| `C:\Users\treyt\.claude\rules\*` | Global reusable rules | No |
| `C:\Users\treyt\.claude\agents\*` | Global reusable roles | No |
| `C:\Users\treyt\.codex\AGENTS.md` | Global Codex defaults | No |
| `C:\Users\treyt\.codex\agents\*.toml` | Codex role runtime settings | No policy text |
| `C:\Users\treyt\.codex\rules\default.rules` | Global Codex permission/rule surface | No project policy |
| `C:\Users\treyt\.gemini\GEMINI.md` | Global Gemini defaults | No |
| `C:\Users\treyt\.gemini\settings.json` | Gemini runtime settings | No project policy |
| `C:\Users\treyt\.hermes\config.yaml` | Global Hermes defaults | No |
| `C:\Users\treyt\.hermes\SOUL.md` | Hermes agent identity/personality | No project policy |

## Safe Change Rules

### Add or change project policy

Edit `AGENTS.md` first. Then update compatibility files only if their pointer text must change.

### Add a repo-local Claude role

1. Add the file under `.claude/agents/`.
2. Keep the frontmatter name stable.
3. Start with an inheritance header that says the agent must read root `AGENTS.md` first.
4. Only include the role-specific delta after that.

### Add a global reusable Claude role

1. Add the file under `C:\Users\treyt\.claude\agents\`.
2. Keep the shared precedence contract in `C:\Users\treyt\.claude\rules\agents.md`.
3. Use a short note in the agent file that points to the repo canon first and treats the file as role delta only.
4. Keep it cross-project and reusable.
5. Do not add PT Study-specific rules there.

Recommended pattern:

```md
Apply the active repo's `AGENTS.md` and shared inheritance rules in `~/.claude/rules/agents.md` first.
Use this file only as the role-specific delta; if a repo-local same-role agent exists, that local agent wins.
```

### Optimize global Claude rule reuse

- Put the full shared precedence explanation in `C:\Users\treyt\.claude\rules\agents.md`.
- Keep global agent files short and role-specific.
- If you notice the same policy paragraph repeated across multiple global agents, move it back into the shared rule file instead of copying it again.

### Change Codex role behavior

1. Put project policy in repo `AGENTS.md`, not in TOML or global markdown.
2. Use `C:\Users\treyt\.codex\config.toml` only for runtime/model/tool settings.
3. Use `C:\Users\treyt\.codex\agents\*.toml` only for role-specific runtime settings.
4. Keep `C:\Users\treyt\.codex\AGENTS.md` thin and precedence-focused so it does not become a second behavior surface.

## Bootstrap Fix Applied On 2026-03-06

The Codex role files `awaiter.toml`, `explorer.toml`, and `worker.toml` were using `gpt-5.3-codex-spark` while global Codex config enabled `model_reasoning_summary = "concise"`. Spawned workers failed because that model path rejected `reasoning.summary`.

Current fix:

- align those role files to `gpt-5.4`
- keep role-specific reasoning effort
- set `model_reasoning_summary = "none"` in each role file

This keeps subagents stable without moving project policy into TOML.

## Codex Windows Sandbox Preference

Do not enable, normalize, or "fix" the Codex Windows elevated sandbox setting during setup audits or config cleanup unless Trey explicitly asks for that change. Trey intentionally keeps the Windows sandbox behavior where he wants it; changing it has historically caused more problems than it prevents.

Allowed setup-audit behavior:

- Report the current `C:\Users\treyt\.codex\config.toml` Windows sandbox setting if relevant.
- Explain the tradeoff if asked.
- Do not edit `[windows] sandbox` or related sandbox mode settings as a best-practice cleanup.

## Outside-Claude Home-Directory Systems

Inventory result on this machine:

- `C:\Users\treyt\.codex`
  - Has one global defaults file: `AGENTS.md`
  - Has runtime role configs in `agents\*.toml`
  - Does **not** have a repeated markdown agent catalog like Claude, so there was no equivalent compression pass to apply there
- `C:\Users\treyt\.gemini`
  - Has an actively consumed global fallback file: `GEMINI.md`
  - Has runtime settings in `settings.json`
  - Has a supported shared-skill projection root at `skills\`
  - Carries an embedded `antigravity\{skills,global_skills}` subtree that is quarantined and excluded from the active shared-skill mirror
- `C:\Users\treyt\.cursor`
  - Exposes a supported shared-skill projection root at `skills\`
  - Exposes a Cursor-local skill root at `skills-cursor\`
  - No comparable home-directory agent-role markdown catalog was found for this cleanup
- `C:\Users\treyt\.opencode`
  - Exposes a supported shared-skill projection root at `skills\`
  - Keeps `agent-strategy` and `ensure-agent-workflow` as local-only skill directories
- `C:\Users\treyt\.antigravity`
  - Exposes a supported shared-skill projection root at `skills\`
  - Does not expose a reusable markdown agent-role catalog on this machine
- `C:\Users\treyt\.conduit`
  - Uses `config.toml`, not an agent-role markdown catalog
- `C:\Users\treyt\.kimi`
  - Has config in `config.toml` and `kimi.json`
  - Has a supported shared-skill projection root at `skills\`
  - Has one agent: `agents\self-improve`
- `C:\Users\treyt\.hermes`
  - Has primary config in `config.yaml` and secrets in `.env`
  - Has agent identity/personality in `SOUL.md`
  - Has a supported shared-skill projection root at `skills\`
  - Has 113 bundled local-only skills preserved alongside shared projections
  - Has MCP server config inline in `config.yaml` under `mcp_servers`
  - Uses `agent: "hermes"` as identity in shared stores

Practical rule:

- Apply the shared-rule compression pattern to systems that have many per-agent markdown files with duplicated inheritance boilerplate.
- Keep project policy in repo `AGENTS.md`.
- Keep Codex runtime/model/tool settings in `C:\Users\treyt\.codex\config.toml` and role TOMLs.
- Keep global markdown files thin and precedence-oriented so they do not compete with repo canon.

## Validation Checklist

After any agent-config change:

1. Run `pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync_agent_config.ps1 -Mode Check`
2. Run `pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync_agent_skills.ps1 -Mode Check` if the change touched shared-skill topology
3. Verify repo shims still point to root `AGENTS.md`
4. Verify repo command files reference valid repo-local agent IDs
5. Verify `.claude/permissions.json` still matches root `permissions.json` if that compatibility file is present
6. Spawn one Codex subagent and one Claude role path if the change touched those systems
7. Update `docs/root/TUTOR_TODO.md`, `conductor/tracks/GENERAL/log.md`, and `conductor/tracks.md`

## Multi-Agent Rule

If two or more agents are running at the same time:

1. claim the work in `docs/root/TUTOR_TODO.md`
2. record live ownership in `docs/root/AGENT_BOARD.md`
3. use `conductor/tracks/GENERAL/log.md` for dated behavior-changing notes

Default triad for this repo:

- `codex-implement` owns writable implementation scope
- `claude-review` stays read-only and returns findings/review notes
- `gemini-research` stays read-only and returns research/comparison artifacts

## Best-Practice Basis

- Claude Code project memory and imports: prefer a small project canon plus reusable supporting files when tool support is verified.
- Claude Code subagents: keep agents narrow, reusable, and project-aware; project-local agents should override broader user-level defaults.
- Codex config: keep project policy in project docs (`AGENTS.md`) and use role TOMLs for runtime/model behavior only.

Sources:

- https://code.claude.com/docs/en/memory
- https://docs.anthropic.com/en/docs/claude-code/sub-agents
- https://developers.openai.com/codex/config-schema.json

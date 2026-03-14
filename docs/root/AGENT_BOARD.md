# Agent Board

Purpose: one shared repo-native coordination surface for multiple agents working in parallel.

Use this file when 2+ agents are active on separate tasks or file scopes.

## Default 3-Agent Setup

Use this default split when running Claude, Gemini, and Codex in parallel:

- `codex-implement`
  - primary writer
  - owns code/doc edits for the claimed file scope
- `claude-review`
  - read-only reviewer
  - returns findings, risks, and validation gaps
- `gemini-research`
  - read-only researcher
  - gathers external patterns, docs, and broad-context comparisons

Default rule:

- one writable scope has one active owner
- `claude-review` and `gemini-research` stay read-only unless ownership is explicitly handed off

## What This Board Is For

This board answers:

- who owns which active task
- what file scope they are allowed to touch
- whether they are blocked
- where their artifacts/results live
- what the next agent should do at handoff

## What This Board Is Not

- It does **not** replace `docs/root/TUTOR_TODO.md`.
  - `TUTOR_TODO.md` is the active sprint/work board.
- It does **not** replace `conductor/tracks.md`.
  - `conductor/tracks.md` is the portfolio/track registry.
- It does **not** replace git history.
  - Commits remain the source of truth for actual code/document changes.

## Use Order

When multiple agents are involved:

1. Track-level work and scope claims live in `docs/root/TUTOR_TODO.md`.
2. This file is used for live coordination and handoffs.
3. Track completion and audit history live in `conductor/tracks/GENERAL/log.md`.

## Status Vocabulary

Use only these values in the live table:

- `todo`
- `in_progress`
- `blocked`
- `review`
- `done`

## Live Board

| Agent | Task ID / Goal | File Scope | Status | Blocked On | Artifacts / Results | Next Handoff |
|---|---|---|---|---|---|---|
| `codex-implement` | `AEH-001` normalize the multi-CLI agent/skill topology and config hygiene stack | `conductor/tracks/agent-ecosystem-hygiene_20260313/`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks.md`, `conductor/tracks/GENERAL/log.md`, `docs/root/SKILLS_INVENTORY.md`, `docs/root/AGENT_SETUP.md`, `scripts/sync_agent_skills.ps1`, `C:\Users\treyt\.agents\README.md`, and supported active home roots under `C:\Users\treyt\.*` | `done` | none | evidence in `conductor/tracks/agent-ecosystem-hygiene_20260313/evidence.md`; topology freeze in `conductor/tracks/agent-ecosystem-hygiene_20260313/decision-record.md`; rollback bundle in `conductor/tracks/agent-ecosystem-hygiene_20260313/rollback.md`; fixture PASS from `scripts/test_sync_agent_skills_fixture.ps1`; supported-root apply/checks PASS; quarantine record in `conductor/tracks/agent-ecosystem-hygiene_20260313/quarantine.md`; secret audit + blocker docs in `security-audit.md` and `rotation-blocker.md`; docs/final validation PASS | operator should rotate the exposed GitHub and Obsidian credentials, update the user env vars, and restart Gemini/Antigravity before relying on the legacy embedded MCP path again |
| `codex-implement` | `CERT-002` implement Obsidian-backed Tutor week-page sync in preflight | `brain/dashboard/api_tutor.py`, `brain/tutor_templates.py`, `dashboard_rebuild/client/src/api.ts`, `dashboard_rebuild/client/src/components/TutorWizard.tsx`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks/GENERAL/log.md` | `done` | none | page-sync patch landed; Wizard step 3 now shows readiness; live Week 8 preflight blocks correctly on real Obsidian transport failure instead of false success | next handoff should fix the local Obsidian installer/CLI path so the live Week 8 preflight can complete and session start can proceed |
| `rawls-explorer` | `CERT-002-research` inspect current MOC sync/preflight helpers and nearby tests | read-only on `brain/dashboard/api_tutor.py`, `brain/tutor_templates.py`, `brain/tests/` | `done` | none | returned exact edit points, current overwrite-vs-merge behavior, and likely test targets | none |
| `codex-implement` | `CERT-000` launch Tutor 10/10 certification program | `conductor/tracks/tutor-10-certification_20260307/`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks.md`, `conductor/tracks/GENERAL/log.md`, `sop/library/chains/certification_registry.yaml`, `brain/data/seed_methods.py`, `brain/dashboard/api_tutor.py`, `dashboard_rebuild/client/src/api.ts`, `brain/tests/test_seed_methods.py`, `brain/tests/test_tutor_session_linking.py` | `done` | none | certification runner refreshed to `ready`; session restore matrix landed; session-authority restore path is now backed by create/get/restore regression coverage | none |
| `codex-implement` | `VLOCK-001` close Tutor Vision Lock and freeze the reusable contract package | `conductor/tracks/tutor_vision_lock_20260301/`, `brain/tutor_prompt_builder.py`, `brain/tests/test_chain_runner.py`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks.md` | `done` | none | vision-lock package landed with owner vision, notes model, gap matrix, validation gate, closeout, and the explicit `No Answer Leakage` / `No Phantom Outputs` prompt rules; automated gate `64 passed`; live Tutor smoke passed | close out `neuroscience-exam-intake_20260307`, then harden note/map artifact ownership as a new Tutor cleanup slice |
| `codex-implement` | `NEURO-001` close the Week 7 neuroscience intake proof track | `conductor/tracks/neuroscience-exam-intake_20260307/`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks.md`, `conductor/tracks/GENERAL/log.md` | `done` | none | track metadata synced to complete; Week 7 intake proof is now recorded as superseded by the certified preflight flow and locked Tutor contract package | harden note/map artifact ownership into a true session-owned cleanup contract without regressing the live Tutor baseline |
| `codex-implement` | `SK-001` create repo-local strategic architect skill | `.codex/skills/personal-strategic-architect/`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks/GENERAL/log.md` | `done` | none | skill created + `sync_agent_config.ps1 -Mode Check` PASS | none - skill is ready for activation |
| `halley-explorer` | `SK-001-research` inspect local skill conventions and placement | read-only on `.codex/skills/` and docs | `done` | none | recommended repo-local `.codex/skills/personal-strategic-architect` + single-file start | codex writes skill and validates |
| `parfit-review` | `SK-001-review` review new skill for fidelity and conventions | read-only on `.codex/skills/personal-strategic-architect/` and docs | `done` | none | no material findings; one low-severity note on literal quote-mark fidelity in the activation payload | none |
| `codex-implement` | `AGENT-003` simplify instruction hierarchy so root `AGENTS.md` is master across tools | `AGENTS.md`, `docs/root/AGENT_SETUP.md`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks/GENERAL/log.md`, `C:\Users\treyt\.codex\config.toml`, `C:\Users\treyt\.codex\AGENTS.md`, `C:\Users\treyt\.claude\CLAUDE.md` | `done` | none | repo canon now explicitly owns project instructions; global Codex `developer_instructions` removed; global Codex/Claude markdown files trimmed to fallback-only notes | none |
| `parfit-explorer` | `AGENT-003-research` inventory instruction surfaces and redundancy | read-only on repo/global instruction files | `done` | none | returned minimal hierarchy recommendation: repo `AGENTS.md` master, thin global fallbacks, runtime settings separated from policy | none |

## Row Rules

- `Agent`: stable nickname or tool/role label
  - recommended format: `tool-role`
  - examples: `codex-implement`, `claude-review`, `gemini-research`
- `Task ID / Goal`: one short stable identifier plus the task summary
- `File Scope`: explicit write scope, not vague domain labels
- `Status`: must use the allowed vocabulary above
- `Blocked On`: use `none` if not blocked
- `Artifacts / Results`: path, branch, diff summary, log file, or commit SHA
- `Next Handoff`: one sentence telling the next agent what to do

## Handoff Rules

When an agent finishes a pass:

1. Update its board row.
2. Add the artifact path, result path, or commit SHA.
3. Set `Next Handoff` to the exact next action.
4. If the work changed behavior, also append a dated note to `conductor/tracks/GENERAL/log.md`.

## Handoff Template

Use this block when the table row is not enough:

```md
### Handoff
- Agent: `agent-name`
- Task: `A-### short-name`
- Scope: `path/or/paths`
- Status: `done|blocked|review`
- What changed:
  - short bullet
  - short bullet
- Validation:
  - command -> result
- Next handoff:
  - exact next step
```

## Ownership Rules

- One writable file scope should have one active owner at a time.
- If two agents need the same file, one must be `review`/read-only until ownership is handed off.
- Review agents should prefer findings and validation artifacts over direct overlapping edits.

## Default Role Split

- `codex-implement`
  - writes code/docs
  - runs implementation-side validation
- `claude-review`
  - reviews the current diff or artifact output
  - reports findings with file/line references when possible
- `gemini-research`
  - gathers external references, comparisons, or broad-context synthesis
  - should not own the same writable scope as `codex-implement`

## Recommended Workflow

```text
TUTOR_TODO claim
   ->
AGENT_BOARD live ownership row
   ->
codex implementation + claude review + gemini research
   ->
GENERAL log entry if behavior changed
   ->
commit SHA / final handoff
```

## Related Docs

- Root canon: `AGENTS.md`
- Agent setup and precedence: `docs/root/AGENT_SETUP.md`
- Active sprint board: `docs/root/TUTOR_TODO.md`
- Track registry: `conductor/tracks.md`
- Change log: `conductor/tracks/GENERAL/log.md`

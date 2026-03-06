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
| `codex-implement` | `A-001` tighten Tutor delete UX | `dashboard_rebuild/client/src/components/TutorArtifacts.tsx` | `in_progress` | none | branch diff + local test results | hand off to `claude-review` after UI tests |
| `claude-review` | `A-001-review` review Tutor delete UX | read-only on same scope | `review` | waits for `codex-implement` | findings markdown | return file:line findings only |
| `gemini-research` | `A-001-research` compare delete UX/API patterns | docs-only / no repo writes | `todo` | none | research summary | hand recommendations back to `codex-implement` |

Delete example rows when using the board for real work.

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

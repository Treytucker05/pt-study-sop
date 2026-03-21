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

Current state: rolling repo-quality-audit swarm active with orchestrator-owned shared files and private per-shard artifact scopes.

Historical rows archived to `docs/archive/AGENT_BOARD_history_2026-03-15.md`.

| Agent | Task ID / Goal | File Scope | Status | Blocked On | Artifacts / Results | Next Handoff |
|---|---|---|---|---|---|---|
| `codex-search-sop` | `MTH-SEARCH-001` scan canonical SOP methods for mind-map, ASCII graph, and priming-style patterns | read-only: `sop/library/`, `sop/templates/`, method/prompt docs | `done` | `none` | canonical hits confirmed in `M-PRE-004`, `M-PRE-005`, `M-PRE-009`, `M-PRE-010`, `M-PRE-011`, plus `15-method-library.md` / `categories/PRIME.md` | orchestrator to report canonical method shortlist first |
| `codex-search-docs` | `MTH-SEARCH-001` scan repo docs and notes for diagram/priming references tied to Tutor methods | read-only: `docs/`, `README.md`, `scholar/`, `conductor/` | `done` | `none` | supporting hits confirmed in `README.md`, `docs/root/TUTOR_PRIME_DRAFT_MATRIX.md`, `docs/root/VISION_PPFW.md`, and Priming UI docs/logs | orchestrator to separate canon from supporting/adjoining docs |
| `codex-search-wide` | `MTH-SEARCH-001` run broad repo text search for mind map, concept map, ASCII, graph, diagram, and priming terms | read-only: whole repo text search | `done` | `none` | broad grep isolated real pedagogy hits and filtered false positives like Mermaid architecture, Graph RAG, and frontend graph tooling | orchestrator to ignore non-pedagogy graph matches |
| `sparky-rqa-110` | `RQA-110` shared shell and nav audit | write: `conductor/tracks/repo-quality-audit_20260316/audit/RQA-110.md`; read: `dashboard_rebuild/client/src/App.tsx`, `dashboard_rebuild/client/src/components/layout.tsx` | `done` | `none` | `RQA-110.md` with 2 `P2` findings on route normalization and scroll-reset gaps | orchestrator to merge findings into the consolidated backlog |
| `sparky-rqa-120` | `RQA-120` Brain surface audit | write: `conductor/tracks/repo-quality-audit_20260316/audit/RQA-120.md`; read: `dashboard_rebuild/client/src/pages/brain.tsx`, `dashboard_rebuild/client/src/components/brain/` | `done` | `none` | `RQA-120.md` with 2 `P2` findings and 1 `P3` finding on Brain command/edit behavior | orchestrator to merge findings into the consolidated backlog |
| `sparky-rqa-130` | `RQA-130` Tutor workflow audit | write: `conductor/tracks/repo-quality-audit_20260316/audit/RQA-130.md`; read: `dashboard_rebuild/client/src/pages/tutor.tsx`, Tutor components, `dashboard_rebuild/client/src/lib/tutorClientState.ts` | `in_progress` | `none` | artifact pending | finish Tutor audit and return normalized findings only in the shard artifact |
| `sparky-rqa-140` | `RQA-140` Scholar audit | write: `conductor/tracks/repo-quality-audit_20260316/audit/RQA-140.md`; read: `dashboard_rebuild/client/src/pages/scholar.tsx`, Scholar route support components | `in_progress` | `none` | artifact pending | finish Scholar audit and return normalized findings only in the shard artifact |
| `sparky-rqa-150` | `RQA-150` Methods and Mastery audit | write: `conductor/tracks/repo-quality-audit_20260316/audit/RQA-150.md`; read: `dashboard_rebuild/client/src/pages/methods.tsx`, `dashboard_rebuild/client/src/pages/mastery.tsx`, related components | `done` | `none` | `RQA-150.md` with 2 `P2` findings on Methods failure UX and Mastery stale diagnostics | orchestrator to merge findings into the consolidated backlog |
| `sparky-rqa-160` | `RQA-160` Library, Calendar, and Vault Health audit | write: `conductor/tracks/repo-quality-audit_20260316/audit/RQA-160.md`; read: `dashboard_rebuild/client/src/pages/library.tsx`, `dashboard_rebuild/client/src/pages/calendar.tsx`, `dashboard_rebuild/client/src/pages/vault-health.tsx` | `in_progress` | `none` | artifact pending | finish support-route audit and return normalized findings only in the shard artifact |
| `sparky-rqa-170` | `RQA-170` backend and API contract audit | write: `conductor/tracks/repo-quality-audit_20260316/audit/RQA-170.md`; read: `brain/dashboard/`, frontend API consumers | `in_progress` | `none` | artifact pending | finish backend/API contract audit and return normalized findings only in the shard artifact |

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

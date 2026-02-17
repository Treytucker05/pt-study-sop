# Repo Hygiene

## Canonical locations
- `docs/` for PRD, specs, and contracts.
- `workstreams/` for active execution notes.

## Disallowed patterns
- Files or folders containing: `moved`, `old`, `backup`, `copy`, `final_final`.
- Stub "moved to ..." README files or placeholders.

## Audit enforcement
- Planning-keyword warnings ignore `.agent/`, `.sisyphus/`, `archive/`.
- Disallowed-name patterns are fatal only in `docs/project/`, `docs/prd/`, and `conductor/tracks/`.

## Hygiene audit exemptions
- Planning-keyword warnings ignore generated/bundled dirs: `scholar/outputs/`, `scholar/knowledge/`, `sop/runtime/`, `docs/logs/`, `archive/`.
- Governance docs remain in scope: `AGENTS.md`, `CLAUDE.md`, `conductor/tracks.md`, `conductor/tracks/GENERAL/log.md`, `docs/prd/`, `conductor/tracks/`.

## Workstream closeout rules
- Each workstream ends with `FINAL.md`.
- Limit to 10 or fewer markdown files in the workstream.
- Optional `archive.zip` for artifacts.

## Prefer deletion over stubbing
- Update links to the new canonical location rather than leaving placeholders.
- Remove obsolete docs when they are superseded.

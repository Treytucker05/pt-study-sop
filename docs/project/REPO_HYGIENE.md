# Repo Hygiene

## Canonical locations
- `docs/` for PRD, specs, and contracts.
- `workstreams/` for active execution notes.

## Disallowed patterns
- Files or folders containing: `moved`, `old`, `backup`, `copy`, `final_final`.
- Stub "moved to ..." README files or placeholders.

## Audit enforcement
- Planning-keyword warnings ignore `.agent/` and `JANUARY_26_PLAN/`.
- Disallowed-name patterns are fatal only in `docs/project/`, `docs/prd/`, and `workstreams/`.

## Hygiene audit exemptions
- Planning-keyword warnings ignore generated/bundled dirs: `scholar/outputs/`, `scholar/knowledge/`, `gpt_bundle_v9.3/`, `sop/runtime/`, `docs/logs/`.
- Governance docs remain in scope: `AGENTS.md`, `CLAUDE.md`, `CONTINUITY.md`, `docs/project/`, `docs/prd/`, `workstreams/`.

## Workstream closeout rules
- Each workstream ends with `FINAL.md`.
- Limit to 10 or fewer markdown files in the workstream.
- Optional `archive.zip` for artifacts.

## Prefer deletion over stubbing
- Update links to the new canonical location rather than leaving placeholders.
- Remove obsolete docs when they are superseded.

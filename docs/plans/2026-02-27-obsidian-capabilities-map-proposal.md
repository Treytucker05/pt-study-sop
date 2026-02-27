# Obsidian Capabilities Map Proposal (2026-02-27)

## Goal
Make Obsidian the deterministic system of record for Tutor note browse/read/write, with explicit wiki-link and cleanup guarantees.

## Confirmed Wiring
- Vault browser tree in Tutor UI uses direct API calls: `/api/obsidian/files`.
- In-turn Obsidian actions use tool calls and are gated by `mode.obsidian`.
- `list_obsidian_paths` schema expects `folder`.
- Historical prompt text used `path` and could cause tool-arg drift.

## Changes Implemented
1. Tool arg compatibility hardening
- `list_obsidian_paths` now maps legacy `path` argument to `folder`.
- Adds `used_legacy_path_arg` in tool result for telemetry.

2. Deterministic live-vault listing shortcut
- For vault/folder-structure questions, Tutor turn now calls `obsidian_list_files` directly.
- Bypasses LLM generation for these browse requests.
- On API failure, response explicitly states live vault is unavailable and no inferred/cached tree is used.

3. Prompt contract fix
- North Star missing-file instructions now use `list_obsidian_paths(folder="")`.

4. UI failure visibility
- Nested folder fetch failures now render inline in vault tree.

## Obsidian Official Guidance Applied
- Internal links should auto-update; keep one canonical link format.
- Use Properties + Search operators for deterministic retrieval.
- Templates should define note structure.
- Plugin security is trust-based (community plugins are not sandboxed).
- Backlinks/outgoing links/aliases are first-class for graph integrity.

## Capability Folder Structure (Vault)
- `Study System/Tutor Capabilities/01-Can-Read.md`
- `Study System/Tutor Capabilities/02-Can-Write.md`
- `Study System/Tutor Capabilities/03-Wikilink-Rules.md`
- `Study System/Tutor Capabilities/04-Preview-Apply-Workflow.md`
- `Study System/Tutor Capabilities/05-Vault-Cleanup-Policy.md`
- `Study System/Tutor Capabilities/99-Troubleshooting.md`

## Remaining Work
- Optional UI surfacing for janitor job progress polling (`/api/tutor/janitor/jobs/<job_id>`).
- Expand backend integration test run for mode-flags suite once `flask` is available in this shell.

## Validation
- `python -m py_compile brain/tutor_tools.py brain/dashboard/api_tutor.py` passed.
- `pytest brain/tests/test_tutor_obsidian_tools.py -q` passed.
- Frontend build passed.
- Full targeted backend suite blocked in current shell due missing `flask` package.

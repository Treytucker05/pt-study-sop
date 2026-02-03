# Obsidian Write Semantics (Brain → Obsidian)

## Default Behavior (Safe)
- Append a `## Study Session - HH:MM` block to a session note.
- Include summary, concepts, strengths, areas to review, and notes extracted by Brain.
- If an organized markdown preview is provided, append it under `### Organized Notes` with its title.
- If raw input is provided, append a `### Full Notes (Raw)` section with the original text.
- Never rewrite user-authored content.
- Each block is keyed by `session_id` for idempotency.

## Managed Sections (Optional)
Brain may update only within managed blocks:
```
<!-- BRAIN_MANAGED_START -->
...
<!-- BRAIN_MANAGED_END -->
```
Outside these markers, Brain never edits.

## Duplicate Handling
- If a block for `session_id` exists, Brain skips writing.
- If user edits inside a managed block, Brain overwrites only that block.

## Note Targets (Configurable)
- Daily log note
- Course log note
- Topic note
- Hybrid (daily append + optional topic merge)

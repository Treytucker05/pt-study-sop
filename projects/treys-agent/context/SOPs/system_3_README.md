# System 3: Obsidian Knowledge Base (Integration)

## Role in the 5-Part System
- System 1 (OS): Defines behavior via `CLAUDE.md` and slash commands.
- System 2 (Defense): Evals and review gates under `projects/treys-agent/evals/`.
- System 3 (Knowledge Base): Durable notes in Obsidian-readable Markdown.

## Where It Lives
- `projects/treys-agent/context/SOPs/`
- `projects/treys-agent/context/input/`
- Linked into Obsidian via `scripts/connect_to_obsidian.py`.

## How It Meshes
- Uses System 1 rules to structure commands and planning.
- Uses System 2 gates to enforce quality before changes ship.
- Feeds System 4/5 by providing structured, linked source material.

## What It Produces
- SOP docs, checklists, and curated knowledge notes.
- Linked notes that keep the Obsidian graph connected.

## Referenced SOP
- `SOPs/system_3_obsidian_bridge.md`

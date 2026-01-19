# System 3: Obsidian Knowledge Base Bridge (SOP)

## Purpose
Create a single, Obsidian-readable knowledge base that can be referenced by
Codex CLI, Claude Code, and OpenCode while preserving the Universal System rules.

## What This System Adds
- A clear memory hierarchy (global rules, project rules, user notes).
- A curator workflow to promote task notes into durable documentation.
- A consistent Obsidian graph structure with connected notes.
- Step-by-step CLI usage across tools, with known limitations.

## Inputs and Sources
- Source article: "Building a Knowledge Base with Claude Code and Obsidian"
  (https://blog.acascais.com/building-a-knowledge-base-with-claude-code-and-obsidian/)
- Universal OS rules: `CLAUDE.md`
- Project rules: `projects/treys-agent/TUTOR.md`
- Knowledge base: `projects/treys-agent/context/`

## Memory Hierarchy (Local Implementation)
1. Global rules: `CLAUDE.md` (root constitution)
2. Project rules: `projects/treys-agent/TUTOR.md`
3. Knowledge base: `projects/treys-agent/context/` (Obsidian-linked)

## CLAUDE.md Hierarchy (Source Article)
- Enterprise policy: `/etc/claude-code/CLAUDE.md` (Linux, if present)
- Project memory: `./CLAUDE.md` or `./.claude/CLAUDE.md`
- User memory: `$HOME/.claude/CLAUDE.md`
Note: behavior guidance lives in CLAUDE.md files. Tool configuration
(MCP, permissions) lives in settings.json files with a similar hierarchy.

## Step-by-Step: Obsidian Link
1. Run `python scripts/connect_to_obsidian.py`.
2. Accept the default vault path (or provide a new one).
3. In Obsidian, open `Dev_Projects/treys-agent`.
4. Confirm you can see:
   - `context/`
   - `context/SOPs/`
   - `context/playground.md`

## Step-by-Step: Claude Code Usage
1. Open the repo folder (this project).
2. Start with `/plan` and follow the blueprint gate.
3. Use `/review` for multi-persona critiques.
4. Use `/commit` only after evals are green.
5. Store durable docs under `projects/treys-agent/context/`.

## Custom Slash Commands (How They Work)
- Commands are prompt files stored under `.claude/commands/`.
- They can live in `$HOME/.claude/commands/` (global) or `./.claude/commands/` (project).
- You can pass arguments and reference them with `$ARGUMENTS`.
  Example: `/git_diff_review only staged files` -> `$ARGUMENTS` = "only staged files".

## Namespacing and Folders
Use folders to avoid collisions and separate contexts.

Example structure:
```
commands/
|-- docs
|   `-- review.md
|-- git
|   `-- review.md
|-- my_awesome_command.md
`-- user
    `-- context.md
```

## Agents (Subagents) in Claude Code
- The docs call them "subagents," but the command is `/agents`.
- Each agent has its own system prompt, purpose, allowed tools, and its own context window.
- Agents are defined as Markdown in `.claude/agents/` (project first, then home).
- Create/edit via `/agents` or by editing the file directly.
- Claude may call an agent proactively based on its description.

## Task Notes and Knowledge Curator
- Task notes capture progress, key details, and decisions.
- Notes exist to provide context to Claude later; you can load them on demand.
- The author does not review task notes (they are "for Claude's use only").
- Use a curator pass to promote task notes into durable docs.

## /user:context vs /resume
- `/user:context <keywords>` loads matching notes and summarizes key points.
- `/resume` loads the full prior thread (same folder), which can be too heavy.

## Knowledge Base Curator Flow (Review-Then-Write)
- Use a review-knowledge slash command to trigger the knowledge-base curator.
- Curator reads task notes and proposes a plan for what to write or modify.
- You review and approve the plan before any writing happens.
- After approval, curator writes/updates docs; you review and request edits.
- Only after review does the change get committed.

## Obsidian Integration (Mermaid + Graph View)
- Obsidian renders Mermaid diagrams from plain Markdown.
- Example flow can be expressed as a Mermaid graph in docs.
- Graph view shows linked and missing nodes; missing nodes are prompts to write new docs.
- Curator should consider and preserve links so the graph stays connected.

## Step-by-Step: Codex CLI Usage
1. Run Codex from the repo root so it can read `CLAUDE.md`.
2. Use prompts that reference docs in `projects/treys-agent/context/`.
3. If you want shared rules across tools, create a shared folder and
   symlink it into both `~/.claude` and `~/.codex` (optional).
4. Limitations:
   - Codex CLI does not support custom slash commands or subagents.
   - Context search runs on each prompt; no toggle to skip.

## Codex CLI Bridge (Shared Config + Limitations)
- Move `CLAUDE.md`, `commands/`, and `agents/` into a shared folder.
- Symlink that folder into both `$HOME/.claude` and `$HOME/.codex`.
- This unifies instructions but not capabilities.
- Codex limitations:
  - No custom subagents.
  - No custom slash commands (only built-ins like `/model`).
  - Context search always runs on each prompt; no toggle to disable.
- Workaround (WIP): use CLI helper scripts to inject command prompts.
  These are brittle and may change.

## Step-by-Step: OpenCode Usage
1. Open the repo root in OpenCode.
2. Confirm it can read `CLAUDE.md` and `projects/treys-agent/TUTOR.md`.
3. Keep notes in `projects/treys-agent/context/` for Obsidian visibility.
4. If slash commands are unsupported, use the doc steps directly.

## Curator Workflow (Promote Knowledge)
1. Capture task notes during work (short, factual notes).
2. Use a curator pass to promote notes into durable docs:
   - Merge duplicates.
   - Add links to related notes.
   - Keep the graph connected.
3. Review and approve before committing changes.

## Graph Hygiene Rules
- Always add at least one link to an existing note.
- Use descriptive filenames (no spaces required).
- Keep SOPs in `context/SOPs/` and source notes in `context/input/`.

## Decision: Commands for System 3
Add new slash commands only if explicitly required by the source article.
Otherwise, document the steps in this SOP.

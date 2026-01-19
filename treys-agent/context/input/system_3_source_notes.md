# System 3 Source Notes (Article Digest)

Source: "Building a Knowledge Base with Claude Code and Obsidian" (Oct 6, 2025)
Link: https://blog.acascais.com/building-a-knowledge-base-with-claude-code-and-obsidian/

## Core Ideas
- Use CLAUDE.md files as memory/instructions with a hierarchy (enterprise, project, user).
- Keep custom slash commands as prompt files under `.claude/commands/`.
- Use agents (subagents) defined in `.claude/agents/` (or via `/agents`) with their own system prompts and context windows.
- Capture task notes to preserve context for future sessions.
- Use a knowledge base curator flow to promote task notes into durable docs.
- Use Obsidian to visualize and navigate Markdown knowledge (including Mermaid graphs).
- Bridge Claude Code and Codex CLI by symlinking shared config files.

## CLAUDE.md Hierarchy (from article)
1. Enterprise policy: `/etc/claude-code/CLAUDE.md` (Linux)
2. Project memory: `./CLAUDE.md` or `./.claude/CLAUDE.md`
3. User memory: `$HOME/.claude/CLAUDE.md`
Note: Configuration (MCP, permissions) lives in settings.json, not CLAUDE.md.

## Custom Slash Commands
- Commands are prompt files; use them to standardize repeated instructions.
- Commands can accept arguments and reference them with `$ARGUMENTS`.
- Namespacing via folders (e.g., `commands/user/context.md`) avoids conflicts.
- Example: `/user:context` to load topic notes.

## Agents (Subagents)
- Defined as markdown in `.claude/agents/`.
- Each agent has its own system prompt, purpose, tools, and context window.
- Invoked via `/agents` or by name.

## Task Notes + Context Recall
- Task notes capture progress, decisions, and important details.
- Notes provide context for future sessions (start with relevant notes loaded).
- The author does not review task notes; they are for Claude's internal context.
- `/user:context` loads topic notes and summarizes key points.
- This is different from `/resume` (which loads the full thread).

## Knowledge Base Curator Flow
- Use a review-knowledge command to move task notes into durable docs.
- Curator agent proposes a plan, waits for approval, then writes/updates docs.
- User reviews and requests edits before commit.

## Obsidian Integration
- Obsidian reads Markdown directly.
- Mermaid diagrams render workflow visuals.
- Graph view shows linked docs and missing nodes (placeholders).
- Curator should consider links so the graph stays connected.

## Codex CLI Bridge
- Move CLAUDE.md, commands, and agents to a shared folder.
- Symlink that folder into both `$HOME/.claude` and `$HOME/.codex`.
- Benefit: shared instructions across Claude Code and Codex CLI.
- Limitation: Codex CLI does not support custom slash commands or subagents.
- Workaround: replace slash commands with CLI helper scripts (WIP).
- Codex searches context on each prompt; no toggle to skip.

## Explicit Limitations (Codex CLI)
- No custom subagents (only shared instructions).
- No custom slash commands (only built-ins like `/model`).
- Context search always runs on each prompt.
- Parity gaps: shared prompts do not guarantee shared capabilities.
- Helper scripts are brittle and may change.

## Actionable Requirements for System 3
- Document CLAUDE.md hierarchy and file locations.
- Define a task-notes and context-recall workflow.
- Provide a curator flow with approval gates.
- Provide Obsidian usage notes (Mermaid, graph).
- Provide Codex CLI bridge guidance + limitations.
- Keep configuration single-source where possible.

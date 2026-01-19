---
name: agent-claude-code
description: Beginner workflow for Claude Code custom slash commands. Use when the user wants reusable commands in Claude Code.
---

# Claude Code custom commands (beginner)

## Where commands live
- Project scope: `.claude/commands/`
- Personal scope: `~/.claude/commands/`

## How it works
- Each Markdown file becomes a `/command`.
- The filename (without `.md`) is the command name.
- Include frontmatter with a `description` field.

## Rookie steps
1) Create `~/.claude/commands/my-command.md`.
2) Add frontmatter and your prompt.
3) Run `/help` in Claude Code to see it.

## Example
```md
---
description: Do a quick code review
---
Review the changed files and list the highest risk issues.
```


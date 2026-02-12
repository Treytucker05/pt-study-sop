---
name: ensure-agent-workflow
description: Ensure global agent instruction files include the standard '# Workflow' block; update idempotently and report a unified diff.
---

# Ensure Agent Workflow

## Purpose
Ensure global instruction files for Claude and Codex contain the standard "# Workflow" block. Update idempotently without duplicates and preserve existing content/formatting.

## Target files
- Claude: ~/.claude/CLAUDE.md (Windows: %USERPROFILE%\\.claude\\CLAUDE.md)
- Codex: ~/.codex/AGENTS.md (Windows: %USERPROFILE%\\.codex\\AGENTS.md)

## Procedure
1) Detect OS and resolve home directory (~).
2) For each target file:
   - If missing, create it.
   - If a "# Workflow" header exists, ensure the exact lines in the block below appear under it (ignore minor whitespace differences). Insert only missing lines, in the same order, without duplicating existing lines.
   - If no "# Workflow" header exists, append the full block to the end of the file, preceded by a blank line.
   - Preserve all unrelated content and formatting.

## Block to ensure
```text
# Workflow
- For any multi-step work: create and maintain the Task list; complete tasks one-by-one.
- Delegate:
  - Exploration/searching to a read-only subagent when possible
  - Test running to a test-runner subagent
  - Final review to code-reviewer subagent
- Prefer background subagents for long-running tasks; summarize results back in the main thread.
```

## Output
For each file:
- Absolute path edited/created
- Unified diff against the original file
- Final "# Workflow" section as it exists after update

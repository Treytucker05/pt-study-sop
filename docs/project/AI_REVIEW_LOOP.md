# AI Review Loop Workflow

This workflow uses Claude Code for implementation and Codex (via MCP) for review.

## MCP setup (project scoped)
- MCP server name: codex-cli
- Command: npx -y @cexll/codex-mcp-server
- Config file: ai-config/mcp.json (synced to .claude/mcp.json and .mcp.json)

## Review loop phases
1. Implement in Claude Code.
2. Run Codex review via MCP (focus: bugs, edge cases, security, performance, tests).
3. Apply fixes.
4. Optional final review.

## One-shot prompt (Claude Code)
```
TASK: <describe what you want built>

WORKFLOW:
1) Implement the task fully.
2) Call Codex via MCP to review the changes.
3) Fix issues raised by Codex.
4) If Codex found significant issues, request one more review.

FOCUS AREAS:
- Bugs
- Edge cases
- Security concerns
- Performance risks
- Missing tests
```

## Codex review request prompt
```
Review the changes I just made. Prioritize any bugs, edge cases, security concerns,
performance issues, and missing tests. Return your findings as:

1) Critical issues
2) Major issues
3) Minor issues
4) Missing tests
5) Suggested fixes
```

## Usage notes
- In Claude Code, run /mcp to confirm codex-cli is enabled.
- If the MCP server fails to start, run the command in a terminal to refresh the install.
- Keep fixes small and re-run the review if changes are substantial.

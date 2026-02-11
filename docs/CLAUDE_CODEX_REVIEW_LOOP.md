# Claude/Codex Review Loop (Quick Start)

Use this when you want to run a review loop without outside help.

## 1) Verify Codex MCP is available
In Claude Code, run `/mcp` and confirm `codex-cli` is enabled. If it is disabled, enable it in the /mcp panel.

## 2) Implement (Claude Code)
Paste this prompt into Claude Code:

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

## 3) Review request (Codex via MCP)
If you need a direct review request, paste this into Claude Code:

```
Use the codex-cli MCP tool to review my changes. Use the git diff from the last commit.
Prioritize bugs, edge cases, security concerns, performance issues, and missing tests.
Return findings as:
1) Critical issues
2) Major issues
3) Minor issues
4) Missing tests
5) Suggested fixes
```

## 4) Fix + optional re-review
- Apply fixes in Claude Code.
- If there were critical/major issues, ask Codex for a final pass using the same review request.

## Troubleshooting
- If `codex-cli` does not start, run this once in a terminal to refresh install:
  `npx -y @cexll/codex-mcp-server`

## Stop condition
- No critical/major issues remaining and any required tests pass.

## Example: Developer Workflow Discovery (Codex + Claude Code)
Query: `/last30days how do I use Codex with Claude Code on same app to make it better`

Research Output:

Developers are combining Claude Code and Codex through MCP integration and custom plugins. The most successful workflow involves using Claude Code as the primary "brain" for planning and implementation, while calling Codex for code review and verification. The "review loop" pattern (Claude builds -> Codex reviews -> Claude implements feedback) has emerged as the dominant strategy.

Key patterns discovered:
- MCP Integration - Add Codex as an MCP server inside Claude Code
- Review Loop Workflow - Claude implements, Codex reviews, Claude fixes
- Task Division - Claude for planning/coding, Codex for review/debugging
- Single Interface - Call Codex without leaving Claude Code

Then asked: "how do I build a review loop workflow"

Generated Workflow:

Step 1: Add Codex as MCP Server

```
claude mcp add codex-cli -- npx -y codex-mcp-server
```

Step 2: The Review Loop Pattern

Phase 1 - Claude Implements
> Build [feature/fix] following [requirements]

Phase 2 - Codex Reviews
> Ask Codex to review the changes I just made. Look for bugs,
> edge cases, performance issues, security concerns.

Phase 3 - Claude Fixes
> Implement the feedback from Codex's review

Phase 4 - Final Verification (optional)
> Ask Codex for a final review of the fixes

Step 3: One-Shot Review Loop Prompt

```
Complete this task, then run a review loop:

TASK: [describe what you want built]

WORKFLOW:
1. Implement the task fully
2. When done, call Codex via MCP to review your changes
3. Parse Codex's feedback and fix any issues it identifies
4. If Codex found significant issues, request one more review

Focus areas for Codex review: bugs, edge cases, security, performance
```

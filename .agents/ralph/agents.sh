#!/usr/bin/env bash
# Default agent command templates (used by loop.sh and CLI).

# Codex Spark - fast, cheap, good for simple UI fixes
AGENT_CODEX_SPARK_CMD="codex exec --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check -c model=gpt-5.3-codex-spark -c model_reasoning_effort=low -"

# Codex standard - medium complexity features
AGENT_CODEX_CMD="codex exec --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check -c model_reasoning_effort=medium -"

# Codex interactive
AGENT_CODEX_INTERACTIVE_CMD="codex --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check {prompt}"

# Claude Code - hard features, complex reasoning
AGENT_CLAUDE_CMD="claude -p --dangerously-skip-permissions \"\$(cat {prompt})\""
AGENT_CLAUDE_INTERACTIVE_CMD="claude --dangerously-skip-permissions {prompt}"

# Gemini CLI - fresh perspective, good for getting unstuck
AGENT_GEMINI_CMD="gemini --yolo -"
AGENT_GEMINI_INTERACTIVE_CMD="gemini --yolo {prompt}"

# Others
AGENT_DROID_CMD="droid exec --skip-permissions-unsafe -f {prompt}"
AGENT_DROID_INTERACTIVE_CMD="droid --skip-permissions-unsafe {prompt}"
AGENT_OPENCODE_CMD="opencode run \"\$(cat {prompt})\""
AGENT_OPENCODE_INTERACTIVE_CMD="opencode --prompt {prompt}"

DEFAULT_AGENT="codex"

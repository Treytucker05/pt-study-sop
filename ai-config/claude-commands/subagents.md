---
description: "Use subagents to offload research/tests/review and keep the main context clean."
---

# Subagents

Use `use subagents` on multi-step tasks.

Delegate:
- Exploration/searching to a read-only subagent.
- Test running to a test-runner subagent.
- Final review to a code-reviewer subagent.

Return: each subagent responds with concise bullets and file paths.

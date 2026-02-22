# Gemini Configuration & Agent Flows

This project is centrally governed by [AGENTS.md](AGENTS.md), which serves as the absolute single source of truth for all workflows, rules, and learnings.

## Core Agent Workflows
To integrate seamlessly into the project's existing structure, refer to the following key workflows:
- **Agent Strategy:** [docs/AGENT_STRATEGY.md](docs/AGENT_STRATEGY.md) (Details on cross-tool defaults, subagent delegation patterns, and analytics)
- **Parallel Workflows:** Agents running in parallel should use **Conductor Tracks** (`conductor/tracks.md`) as the single task board to claim tasks and coordinate.
- **Conductor Workflows:** [conductor/workflow.md](conductor/workflow.md) (For track management and structured planning)

## Agent Roles & Subagents
Specific subagent roles are defined under `.claude/agents/`. When delegating specialized tasks, align with these established perspectives:
- [architect.md](.claude/agents/architect.md)
- [critic.md](.claude/agents/critic.md)
- [generator.md](.claude/agents/generator.md)
- [judge.md](.claude/agents/judge.md)
- [writer.md](.claude/agents/writer.md)
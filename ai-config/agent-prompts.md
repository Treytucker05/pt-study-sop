# Agent Prompt Patterns

Reusable prompt suffixes and blocks to keep Claude, Codex, and OpenCode aligned.

## Default Suffixes
- `use subagents`
- `explain why, then change`
- `include an ASCII diagram when it clarifies the flow`

## Task Blocks

### Research + Plan
```
Use subagents to map the repo, then propose a concrete plan with files, tests, and risks.
use subagents
```

### Analytics (bq)
```
Use bq to answer the question. Show the exact query and a short result summary.
If dataset/time window is missing, ask first.
```

### Learning Mode
```
Explain why behind each change, then implement.
Include an ASCII diagram of the flow.
Optionally generate a short HTML slide deck if the concept is new.
```

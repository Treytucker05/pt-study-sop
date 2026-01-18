---
name: agent-crewai
description: Beginner workflow for CrewAI (Python + YAML + CLI). Use when the user wants to build crews with YAML agents and tasks.
---

# CrewAI (beginner)

## Install
Follow the CrewAI installation guide, then verify the CLI is available.

## Create a crew
```bash
crewai create crew <name>
cd <name>
```

## Configure
- Edit `agents.yaml` and `tasks.yaml`.
- Variables like `{topic}` are filled in by `main.py`.

## Run
```bash
crewai run
```

## Notes
- After creating a crew, you can also run `crewai install` to install dependencies.
- CLI also supports `create flow`, `train`, and `replay`.


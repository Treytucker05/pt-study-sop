---
name: agent-llamaindex
description: Beginner workflow for LlamaIndex agents (Python). Use when the user wants FunctionAgent or ReActAgent with tools.
---

# LlamaIndex (beginner)

## Install (Python)
```bash
pip install llama-index python-dotenv
```

## Rookie steps
1) Set `OPENAI_API_KEY` in your environment or a `.env` file.
2) Define a small tool (a Python function).
3) Build a `FunctionAgent` or `ReActAgent` with that tool.
4) Invoke the agent with a simple prompt.

## When to choose
- You want Python agents with tool calling and RAG integrations.


#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Debug LLM processing of WRAP."""

import json
import sys
import os

# Add brain to path
brain_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, brain_dir)

from llm_provider import call_llm

wrap = """## A) Obsidian Notes Pack (Markdown)

### 2026-01-24 - Test - Core - 10 min

## B) Anki Cards

**1**

* Front: Test question one
* Back: Test answer one
* Tags: test
* Source: test

**2**

* Front: Test question two
* Back: Test answer two
* Tags: test
* Source: test

## C) Spaced Retrieval Schedule

**R1:** 2026-01-25

## D) JSON Logs

```json
{"date": "2026-01-24", "topic": "Test", "mode": "Core", "duration_min": 10}
```
"""

system_prompt = """You are a study assistant. Extract anki_cards from this input.

If the input contains "## B) Anki Cards" with "* Front:" and "* Back:", extract ALL cards.

Return JSON:
{
    "is_conversation": false,
    "summary": "brief summary",
    "course": "General",
    "anki_cards": [
        {"front": "question", "back": "answer", "tags": "tag1,tag2", "card_type": "basic"}
    ]
}
"""

print("Calling LLM...")
result = call_llm(
    system_prompt=system_prompt,
    user_prompt=f"Process this:\n\n{wrap}",
    provider="codex",
    timeout=45
)

print(f"Success: {result.get('success')}")
print(f"Error: {result.get('error')}")
print(f"Content: {result.get('content', '')[:500]}")
